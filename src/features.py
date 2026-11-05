from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin


SOURCE_TO_MODEL_COLUMNS = {
    "Age": "age",
    "Income": "income",
    "LoanAmount": "loan_amount",
    "CreditScore": "credit_score",
    "MonthsEmployed": "months_employed",
    "NumCreditLines": "num_credit_lines",
    "InterestRate": "interest_rate",
    "LoanTerm": "loan_term",
    "DTIRatio": "dti_ratio",
    "Education": "education",
    "EmploymentType": "employment_type",
    "MaritalStatus": "marital_status",
    "HasMortgage": "has_mortgage",
    "HasDependents": "has_dependents",
    "LoanPurpose": "loan_purpose",
    "HasCoSigner": "has_co_signer",
    "Default": "default",
}

NUMERIC_FEATURES = [
    "age",
    "income",
    "loan_amount",
    "credit_score",
    "months_employed",
    "num_credit_lines",
    "loan_term",
    "dti_ratio",
]
CATEGORICAL_FEATURES = [
    "education",
    "employment_type",
    "marital_status",
    "has_mortgage",
    "has_dependents",
    "loan_purpose",
    "has_co_signer",
]
DOMAIN_NUMERIC_FEATURES = [
    "loan_to_annual_income",
    "employment_years",
    "monthly_installment_to_income_ratio",
    "debt_capacity_ratio",
]
FEATURE_COLUMNS = NUMERIC_FEATURES + CATEGORICAL_FEATURES
TARGET_COLUMNS = ["default", "interest_rate"]
REQUIRED_COLUMNS = set(FEATURE_COLUMNS + TARGET_COLUMNS)


class LoanDomainFeatures(BaseEstimator, TransformerMixin):
    """Add interpretable loan burden and employment-tenure ratios."""

    def fit(self, x: pd.DataFrame, y: pd.Series | None = None) -> LoanDomainFeatures:
        missing = sorted(set(FEATURE_COLUMNS).difference(x.columns))
        if missing:
            raise ValueError(f"Feature input is missing columns: {', '.join(missing)}")
        self.feature_names_in_ = np.asarray(x.columns, dtype=object)
        return self

    def transform(self, x: pd.DataFrame) -> pd.DataFrame:
        result = x.copy()
        income = pd.to_numeric(result["income"], errors="coerce")
        amount = pd.to_numeric(result["loan_amount"], errors="coerce")
        term = pd.to_numeric(result["loan_term"], errors="coerce")
        result["loan_to_annual_income"] = amount.div(income.where(income > 0))
        result["employment_years"] = (
            pd.to_numeric(result["months_employed"], errors="coerce") / 12
        )
        monthly_installment = amount.div(term.where(term > 0))
        monthly_income = income / 12
        result["monthly_installment_to_income_ratio"] = monthly_installment.div(
            monthly_income.where(monthly_income > 0)
        )
        result["debt_capacity_ratio"] = 1 - pd.to_numeric(
            result["dti_ratio"], errors="coerce"
        )
        return result

    def get_feature_names_out(
        self, input_features: list[str] | np.ndarray | None = None
    ) -> np.ndarray:
        names = self.feature_names_in_ if input_features is None else input_features
        return np.asarray(list(names) + DOMAIN_NUMERIC_FEATURES, dtype=object)


def load_clean_dataset(path: Path) -> pd.DataFrame:
    """Load Loan_default.csv, normalize headers/strings, and exclude its row identifier."""
    if not path.is_file():
        raise FileNotFoundError(f"Dataset not found: {path.resolve()}")

    frame = pd.read_csv(path)
    frame.columns = frame.columns.str.strip()
    frame = frame.rename(columns=SOURCE_TO_MODEL_COLUMNS)
    missing = sorted(REQUIRED_COLUMNS.difference(frame.columns))
    if missing:
        raise ValueError(f"{path.name} is missing required columns: {', '.join(missing)}")

    for column in frame.select_dtypes(include=["object", "string"]).columns:
        frame[column] = frame[column].map(
            lambda value: value.strip() if isinstance(value, str) else value
        )

    frame = frame.loc[:, FEATURE_COLUMNS + TARGET_COLUMNS].copy()
    frame["default"] = pd.to_numeric(frame["default"], errors="raise").astype("int8")
    frame["interest_rate"] = pd.to_numeric(frame["interest_rate"], errors="raise")
    labels = set(frame["default"].dropna().unique())
    if labels != {0, 1}:
        raise ValueError(f"Expected binary default labels 0 and 1, found {sorted(labels)}")
    if frame["interest_rate"].isna().any():
        raise ValueError("InterestRate contains missing values and cannot be used as a regression target.")
    return frame


def split_features_and_targets(
    frame: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.Series, pd.Series]:
    """Return pre-decision features and the default/rate targets without target leakage."""
    missing = sorted(set(FEATURE_COLUMNS + TARGET_COLUMNS).difference(frame.columns))
    if missing:
        raise ValueError(f"Processed dataset is missing columns: {', '.join(missing)}")
    x = frame.loc[:, FEATURE_COLUMNS]
    return x, frame["default"], frame["interest_rate"]
