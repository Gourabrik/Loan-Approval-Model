"""Transparent demo scoring. Replace with governed model serving before production."""
from pathlib import Path
from typing import Any

import joblib

from app.schemas import LoanApplication

MODEL_PATH = Path(__file__).resolve().parents[3] / "industrial_loan_model.joblib"
ANNUAL_RATE = 0.095


def _payment(amount: float, tenure: int) -> float:
    monthly_rate = ANNUAL_RATE / 12
    return amount * monthly_rate * ((1 + monthly_rate) ** tenure) / (((1 + monthly_rate) ** tenure) - 1)


def _joblib_score(application: LoanApplication, dti: float, lti: float) -> float | None:
    """Use the optional exported notebook artifact when present and compatible."""
    if not MODEL_PATH.exists():
        return None
    try:
        artifact: Any = joblib.load(MODEL_PATH)
        model = artifact["model"] if isinstance(artifact, dict) else artifact
        row = [[
            application.age, application.salary, application.amount, application.tenure,
            680, application.existingEmi, dti, lti,
        ]]
        return float(model.predict_proba(row)[0][1])
    except Exception:
        return None


def assess(application: LoanApplication) -> dict[str, Any]:
    applicant_income = application.salary + (application.coApplicantSalary if application.mitigation == "co" else 0)
    emi = _payment(application.amount, application.tenure)
    dti = (emi + application.existingEmi) / applicant_income
    lti = application.amount / (applicant_income * 12)
    model_probability = _joblib_score(application, dti, lti)

    # Deterministic fallback keeps local startup dependency-free after API install.
    score = round(785 - dti * 175 - lti * 32 + (8 if 28 <= application.age <= 55 else -4))
    if application.mitigation == "assets":
        score += 24
    score = max(300, min(900, score))
    pd = 3.1 + dti * 29 + lti * 3.5 + (4 if score < 650 else 0)
    if application.mitigation == "assets":
        pd -= 4.0
    if model_probability is not None:
        # Notebook's approve likelihood is converted to default probability.
        pd = (pd + (1 - model_probability) * 100) / 2
    pd = round(max(2.5, min(32, pd)), 1)

    decision = "approve" if score > 700 and pd < 10 else "mitigate" if score >= 600 else "reject"
    return {
        "credit_score": score,
        "probability_of_default": pd,
        "debt_to_income_ratio": round(dti, 4),
        "loan_to_income_ratio": round(lti, 4),
        "decision": decision,
        "model_source": "xgboost-joblib" if model_probability is not None else "rule-based-demo",
        "shap_features": [
            {"name": "High debt-to-income", "value": round(max(.03, dti * .35), 2), "fill": "#f97316"},
            {"name": "Credit history baseline", "value": -0.08, "fill": "#14b8a6"},
            {"name": "Income stability", "value": round(-min(.09, application.salary / 180000), 2), "fill": "#60a5fa"},
        ],
    }
