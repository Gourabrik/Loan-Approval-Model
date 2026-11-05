# Loan Risk and Historical Rate Modeling

This repository contains a training pipeline and a FastAPI service; the steps below do not require the frontend.

## What the models predict

Both models use `data/raw/Loan_default.csv` and the same stratified train/test split:

- The XGBoost classifier estimates the dataset's `Default` label probability.
- The XGBoost regressor estimates the historical `InterestRate` in percentage points.
- Both pipelines also derive loan-to-income, employment-years, monthly-installment-to-income, and debt-capacity features.
- Optuna searches model hyperparameters using a validation subset of the training data. The held-out test split is used for final metrics.
- SHAP artifacts provide local feature contributions and global feature-importance summaries.
- The metrics report includes constant-baseline comparisons, so check that the models outperform a simple baseline before interpreting outputs.

This dataset does not label loan approvals. The classifier is a default-risk model, not an approval model. The rate estimate reflects historical patterns; it is not a recommended or fair rate for a real applicant.

## Run locally on Windows

Run these commands from the repository root in PowerShell. Use Python 3.11 or newer.

1. Create a virtual environment and install dependencies:

   ```powershell
   py -3.11 -m venv .venv
   .\.venv\Scripts\python.exe -m pip install --upgrade pip
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   ```

2. Train the models, create cleaned train/test splits, and save model/SHAP artifacts:

   ```powershell
   .\.venv\Scripts\python.exe -m src.trainer --trials 10
   ```

   The command reads the immutable `data/raw/Loan_default.csv`, writes `data/processed/train.csv` and `data/processed/test.csv`, and creates:

   - `artifacts/classifier_pipe.joblib`
   - `artifacts/regressor_pipe.joblib`
   - `artifacts/shap_explainer.joblib`
   - `artifacts/global_shap_importance.joblib`
   - `artifacts/training_metrics.json`

   Use `--trials` to change the number of Optuna trials per model. The default is 10; more trials take longer.

3. Start the API:

   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn api.main:app --reload
   ```

4. Open `http://127.0.0.1:8000/docs`. Try `POST /predict` with this example:

   ```json
   {
     "age": 35,
     "income": 75000,
     "loan_amount": 25000,
     "credit_score": 680,
     "months_employed": 36,
     "num_credit_lines": 3,
     "loan_term": 36,
     "dti_ratio": 0.35,
     "education": "Bachelor's",
     "employment_type": "Full-time",
     "marital_status": "Single",
     "has_mortgage": "No",
     "has_dependents": "No",
     "loan_purpose": "Auto",
     "has_co_signer": "No"
   }
   ```

   `POST /predict` reports whether the rate model beats a train-mean baseline; it returns a `null` rate estimate if it does not. `POST /explain` returns SHAP contributions for the same input. `GET /model-info` returns held-out metrics and global SHAP feature summaries; `GET /health` checks that the models loaded.

## Docker

Train the models first so the files in `artifacts/` exist, then from the repository root:

```powershell
docker build -t loan-risk-api .
docker run --rm -p 8000:8000 loan-risk-api
```

## Data processing and notebooks

`data/raw/` holds the original CSVs. The trainer reads `Loan_default.csv` directly and does not modify the source. It creates the model's cleaned train/test splits under `data/processed/`. The two notebooks provide exploratory analysis and SHAP experiments; select the virtual environment above as the notebook kernel.

## Limitations and responsible use

This is an educational example using a public historical dataset. It has not been validated for current populations, lending policy, calibration, fairness, or regulatory requirements. Predictions and SHAP values must not be used to approve, deny, price, or otherwise make real credit decisions. Do not send personal or sensitive applicant data to this demo service.
