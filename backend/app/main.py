from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import initialize_database
from app.routers.predict import router as prediction_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="Nexora Loan Pricing API",
    version="1.0.0",
    description="Local, mock-only API for the AI Risk-Based Loan Pricing Engine demo.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(prediction_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "mode": "mock-local"}
