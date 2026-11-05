# AI Risk-Based Loan Pricing Engine

Local full-stack demo: React/Vite + Tailwind frontend, FastAPI/Pydantic API, SQLite decision log, offline Jupyter/XGBoost training workflow, and mock KYC/bureau responses.

## Run locally

1. Create a Python virtual environment and install the API dependencies:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r backend/requirements.txt
   ```

2. Start the backend:

   ```powershell
   uvicorn app.main:app --app-dir backend --reload --port 8000
   ```

3. In a second terminal, run the React app:

   ```powershell
   npm install
   npm run dev
   ```

Visit `http://127.0.0.1:5173`. The Vite proxy forwards `/api/v1/predict` to FastAPI. API docs are at `http://127.0.0.1:8000/docs`.

## Model training

Open `notebooks/loan_model_training.ipynb` in Jupyter. It creates synthetic data and may export `industrial_loan_model.joblib`. If that artifact is placed in the project root, the API will try to use it; otherwise it uses its transparent, deterministic demo scorer.

## Important

This is a synthetic-data demonstration. Mock identity checks, generated scores, and model outputs must not be used for real lending or any other high-impact decision. A production system would require legal/compliance review, privacy controls, representative data, validation, bias/fairness testing, monitoring, security hardening, auditability, and qualified human oversight.
