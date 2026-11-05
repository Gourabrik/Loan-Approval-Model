from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class LoanApplication(BaseModel):
    model_config = ConfigDict(extra="forbid")

    age: int = Field(ge=18, le=100)
    income: float = Field(gt=0)
    loan_amount: float = Field(gt=0)
    credit_score: int = Field(ge=300, le=850)
    months_employed: int = Field(ge=0, le=720)
    num_credit_lines: int = Field(ge=0, le=100)
    loan_term: int = Field(gt=0, le=120)
    dti_ratio: float = Field(ge=0, le=5)
    education: Literal["Bachelor's", "High School", "Master's", "PhD"]
    employment_type: Literal["Full-time", "Part-time", "Self-employed", "Unemployed"]
    marital_status: Literal["Divorced", "Married", "Single"]
    has_mortgage: Literal["Yes", "No"]
    has_dependents: Literal["Yes", "No"]
    loan_purpose: Literal["Auto", "Business", "Education", "Home", "Other"]
    has_co_signer: Literal["Yes", "No"]


class PredictionResponse(BaseModel):
    default_probability: float = Field(ge=0, le=1)
    estimated_interest_rate_pct: float | None
    interest_rate_model_status: Literal["beats_baseline", "does_not_beat_baseline"]
    disclaimer: str


class FeatureContribution(BaseModel):
    feature: str
    contribution: float


class ExplanationResponse(BaseModel):
    default_log_odds_base_value: float
    default_log_odds_contributions: list[FeatureContribution]
    interest_rate_base_value_pct: float
    interest_rate_contributions_pct: list[FeatureContribution]
    interest_rate_model_status: Literal["beats_baseline", "does_not_beat_baseline"]
    disclaimer: str
