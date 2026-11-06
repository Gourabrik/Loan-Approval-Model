from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Literal
from uuid import uuid4

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from src.explainer import explain_application
from src.schema import (
    ExplanationResponse,
    LoanApplication,
    PredictionResponse,
    RepaymentOptionsRequest,
    RepaymentOptionsResponse,
    WorkflowAnalysisResponse,
)
from src.trainer import DISCLAIMER

ROOT = Path(__file__).resolve().parents[1]
ARTIFACT_DIR = ROOT / "artifacts"
ARTIFACT_PATHS = {
    "classifier": ARTIFACT_DIR / "classifier_pipe.joblib",
    "regressor": ARTIFACT_DIR / "regressor_pipe.joblib",
    "explainer": ARTIFACT_DIR / "shap_explainer.joblib",
    "global_importance": ARTIFACT_DIR / "global_shap_importance.joblib",
}


def interest_rate_model_status(
    regressor_bundle: dict[str, Any],
) -> Literal["beats_baseline", "does_not_beat_baseline"]:
    model_mae = regressor_bundle["validation_mae_percentage_points"]
    baseline_mae = regressor_bundle["validation_baseline_mae_percentage_points"]
    return "beats_baseline" if model_mae < baseline_mae else "does_not_beat_baseline"


def load_artifacts() -> dict[str, Any]:
    missing = [path for path in ARTIFACT_PATHS.values() if not path.is_file()]
    if missing:
        paths = ", ".join(str(path) for path in missing)
        raise FileNotFoundError(
            f"Model artifacts are missing: {paths}. Train them first with "
            "'python -m src.trainer'."
        )
    classifier = joblib.load(ARTIFACT_PATHS["classifier"])
    regressor = joblib.load(ARTIFACT_PATHS["regressor"])
    explainer = joblib.load(ARTIFACT_PATHS["explainer"])
    global_importance = joblib.load(ARTIFACT_PATHS["global_importance"])
    for label, bundle in (("classifier", classifier), ("regressor", regressor)):
        if not isinstance(bundle, dict) or "pipeline" not in bundle:
            raise RuntimeError(f"The {label} artifact has an invalid format.")
    if not isinstance(explainer, dict) or not {
        "classifier",
        "regressor",
        "classifier_feature_names",
        "regressor_feature_names",
    }.issubset(explainer):
        raise RuntimeError("The SHAP artifact has an invalid format.")
    return {
        "classifier": classifier,
        "regressor": regressor,
        "explainer": explainer,
        "global_importance": global_importance,
    }


@asynccontextmanager
async def lifespan(application: FastAPI):
    application.state.models = load_artifacts()
    yield


app = FastAPI(
    title="Apsara Finance | Credit Risk API",
    version="1.0.0",
    description=(
        "Educational API for default-risk estimates and historical interest-rate "
        "patterns. It does not make approval decisions or recommend rates."
    ),
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health(request: Request) -> dict[str, str]:
    return {
        "status": "ok",
        "model_source": request.app.state.models["classifier"]["source_dataset"],
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict(
    application: LoanApplication, request: Request
) -> PredictionResponse:
    models = request.app.state.models
    classifier_bundle = models["classifier"]
    regressor_bundle = models["regressor"]
    row = pd.DataFrame(
        [application.model_dump()],
        columns=classifier_bundle["feature_columns"],
    )
    classifier = classifier_bundle["pipeline"]
    positive_class_indices = np.flatnonzero(classifier.classes_ == 1)
    if len(positive_class_indices) != 1:
        raise RuntimeError("The classifier artifact does not contain the expected positive class.")
    default_probability = float(
        classifier.predict_proba(row)[0, int(positive_class_indices[0])]
    )
    rate_status = interest_rate_model_status(regressor_bundle)
    estimated_rate = (
        float(regressor_bundle["pipeline"].predict(row)[0])
        if rate_status == "beats_baseline"
        else None
    )
    return PredictionResponse(
        default_probability=default_probability,
        estimated_interest_rate_pct=estimated_rate,
        interest_rate_model_status=rate_status,
        disclaimer=DISCLAIMER,
    )


@app.post("/explain", response_model=ExplanationResponse)
async def explain(
    application: LoanApplication, request: Request
) -> ExplanationResponse:
    models = request.app.state.models
    values = explain_application(
        application.model_dump(),
        models["classifier"],
        models["regressor"],
        models["explainer"],
    )
    values["interest_rate_model_status"] = interest_rate_model_status(
        models["regressor"]
    )
    values["disclaimer"] = DISCLAIMER
    return ExplanationResponse(**values)


@app.post("/workflow/analyze", response_model=WorkflowAnalysisResponse)
async def analyze_workflow(
    application: LoanApplication, request: Request
) -> WorkflowAnalysisResponse:
    """Run the real model analysis and return the remaining demo workflow stages.

    Workflow state is intentionally ephemeral: no applicant data is persisted,
    no eligibility decision is made, and offer/completion stages are simulations.
    """
    prediction = await predict(application, request)
    explanation = await explain(application, request)
    return WorkflowAnalysisResponse(
        workflow_id=str(uuid4()),
        prediction=prediction,
        explanation=explanation,
        stages=[
            {"id": "application", "label": "Application profile", "status": "complete"},
            {"id": "analysis", "label": "Model risk analysis", "status": "complete"},
            {"id": "review", "label": "Human review and safeguards", "status": "awaiting_human_review"},
            {"id": "offer", "label": "Offer scenario", "status": "simulation_only"},
            {"id": "completion", "label": "Completion simulation", "status": "simulation_only"},
        ],
    )


@app.post("/workflow/repayment-options", response_model=RepaymentOptionsResponse)
async def repayment_options(
    scenario: RepaymentOptionsRequest,
) -> RepaymentOptionsResponse:
    """Calculate illustrative EMI scenarios from user-selected assumptions.

    These are arithmetic comparisons only. The endpoint does not recommend a
    plan, evaluate eligibility, or persist financial inputs.
    """
    monthly_rate = scenario.scenario_apr_pct / 1200
    terms = sorted({12, 24, 36, 48, 60, 84, 120, scenario.term_months})
    terms = [term for term in terms if term <= 120]
    plans = [
        {
            "id": f"emi-{term}",
            "label": f"{term}-month EMI",
            "term_months": term,
            "monthly_payment": round(
                scenario.loan_amount / term
                if monthly_rate == 0
                else scenario.loan_amount
                * monthly_rate
                * (1 + monthly_rate) ** term
                / ((1 + monthly_rate) ** term - 1),
                2,
            ),
            "total_payment": 0,
            "total_interest": 0,
        }
        for term in terms
    ]
    for plan in plans:
        plan["total_payment"] = round(plan["monthly_payment"] * plan["term_months"], 2)
        plan["total_interest"] = round(plan["total_payment"] - scenario.loan_amount, 2)
    plans.insert(
        0,
        {
            "id": "one-time",
            "label": "One-time payment",
            "term_months": 0,
            "monthly_payment": round(scenario.loan_amount, 2),
            "total_payment": round(scenario.loan_amount, 2),
            "total_interest": 0,
        },
    )
    return RepaymentOptionsResponse(
        monthly_income=round(scenario.annual_income / 12, 2),
        budget_target_pct=scenario.budget_target_pct,
        plans=plans,
    )


@app.get("/model-info")
async def model_info(request: Request) -> dict[str, Any]:
    models = request.app.state.models
    return {
        "source_dataset": models["classifier"]["source_dataset"],
        "trained_at_utc": models["classifier"]["trained_at_utc"],
        "metrics": {
            "default_classifier": {
                "model": models["classifier"]["metrics"],
                "baseline": models["classifier"]["baseline_metrics"],
            },
            "interest_rate_regressor": {
                "model": models["regressor"]["metrics"],
                "baseline": models["regressor"]["baseline_metrics"],
            },
        },
        "interest_rate_model_status": interest_rate_model_status(
            models["regressor"]
        ),
        "top_global_shap_features": models["global_importance"],
        "disclaimer": DISCLAIMER,
    }
