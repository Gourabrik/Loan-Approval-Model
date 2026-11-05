from typing import Literal

from pydantic import BaseModel, Field, field_validator


class LoanApplication(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    pan: str = Field(min_length=10, max_length=10, pattern=r"^[A-Za-z]{5}[0-9]{4}[A-Za-z]$")
    role: str = Field(min_length=2, max_length=100)
    age: int = Field(ge=21, le=65)
    salary: float = Field(gt=0, le=1_000_000)
    amount: float = Field(gt=0, le=10_000_000)
    tenure: int = Field(ge=12, le=72)
    existingEmi: float = Field(ge=0, le=1_000_000)
    mitigation: Literal["none", "assets", "co"] = "none"
    coApplicantSalary: float = Field(default=0, ge=0, le=1_000_000)

    @field_validator("pan")
    @classmethod
    def normalize_pan(cls, value: str) -> str:
        return value.upper()


class ShapFeature(BaseModel):
    name: str
    value: float
    fill: str


class PredictionResponse(BaseModel):
    application_id: int
    kyc_status: Literal["verified"]
    bureau: str
    model_source: Literal["rule-based-demo", "xgboost-joblib"]
    credit_score: int
    probability_of_default: float
    debt_to_income_ratio: float
    loan_to_income_ratio: float
    decision: Literal["approve", "mitigate", "reject"]
    shap_features: list[ShapFeature]
    disclaimer: str
