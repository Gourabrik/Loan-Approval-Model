import asyncio

from fastapi import APIRouter

from app.database import save_assessment
from app.schemas import LoanApplication, PredictionResponse
from app.services.risk_engine import assess

router = APIRouter(prefix="/api/v1", tags=["predictions"])


@router.post("/predict", response_model=PredictionResponse)
async def predict(application: LoanApplication) -> PredictionResponse:
    # Deliberately simulates KYC/bureau latency. No real identity or financial API is called.
    await asyncio.sleep(1.2)
    result = assess(application)
    application_id = save_assessment(
        application.name, application.pan, application.amount,
        result["credit_score"], result["probability_of_default"], result["decision"],
    )
    return PredictionResponse(
        application_id=application_id,
        kyc_status="verified",
        bureau="Nexora Sandbox Bureau",
        disclaimer="Demo output based on synthetic data and mock KYC. Not a real lending decision.",
        **result,
    )
