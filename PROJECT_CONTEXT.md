# Project Context: Loan Risk and Historical Rate Modeling

## How to use this document

Use this as the initial context when asking Claude to explain, debug, or extend this repository. It describes the repository as currently structured, including an important distinction between its model-backed API and a separate mock backend. Treat the source code as authoritative when behavior differs from documentation or this summary.

## Project in one paragraph

This repository combines an educational machine-learning pipeline with a React web application. The main pipeline trains two XGBoost models on a public historical loan dataset: a calibrated classifier estimates the dataset's binary `Default` label, and a regressor estimates the historical `InterestRate`. It also creates SHAP explainability artifacts. A FastAPI service loads those artifacts to provide predictions, explanations, model metrics, and illustrative repayment scenarios. A React/Vite frontend presents a guided assessment workflow. This is not an actual loan-approval system: the data has no approval target, the UI's workflow stages do not approve or deny a real application, and the historical rate estimate is not a recommended rate.

## Critical architecture distinction

There are two different FastAPI applications in the repository:

1. **Main, model-backed application:** [`api/main.py`](./api/main.py) exposes the trained-model API. The Vite proxy in [`frontend/vite.config.js`](./frontend/vite.config.js) routes the frontend's root-level calls (such as `/health`, `/workflow/analyze`, and `/model-info`) to this service on `127.0.0.1:8000`. The documented startup command runs `uvicorn api.main:app`.
2. **Separate mock application:** [`backend/app/main.py`](./backend/app/main.py) exposes a mock-local API under `/api/v1`, with a different request/response schema. It simulates KYC delay and uses deterministic scoring rules, optionally trying to load a different model artifact. Its prediction route writes a record to SQLite. The current frontend does not call this `/api/v1/predict` route; its form fields and API calls are for the model-backed application instead.

Do not treat these APIs as interchangeable or describe the mock backend as the service the current UI uses. If a task asks to consolidate or switch between them, first establish the intended target and reconcile the schemas and behavior explicitly.

## Intended user experience

The React app in [`frontend/src/App.jsx`](./frontend/src/App.jsx) is branded Apsara Finance and guides a user through:

- Entering a financial profile and loan details.
- Viewing a historical default-probability estimate and feature contributions.
- Considering an optional risk-trigger / additional-context branch.
- Comparing repayment scenarios across terms and a user-selected APR.
- Viewing a workflow summary, keeping local browser history, and downloading an individual insight PDF.

The frontend's model request includes only the 15 model input fields listed in its `apiFields` array. The displayed applicant name and bank-balance details are not sent to the model API. Bank balance is used by the browser for reserve/repayment comparisons, not as a trained-model feature. The frontend stores up to 50 assessment records in browser `localStorage` under `apsara-assessment-history`; this data can include financial profile, bank-balance, workflow, and repayment information. The API-backed model workflow itself is documented as ephemeral and does not persist applicant profiles.

The repayment calculator uses a **user-selected scenario APR** (initially 10%), annual income, loan amount, term, and budget target. It is separate from the model's estimated historical interest rate. Do not silently substitute one for the other or present either as an offer.

## Machine-learning pipeline

### Data and targets

The raw dataset is [`data/raw/Loan_default.csv`](./data/raw/Loan_default.csv). [`src/features.py`](./src/features.py) strips header/value whitespace, maps source column names to normalized snake_case, excludes the source row identifier by selecting only declared model columns, and validates required columns and binary default labels. It does not overwrite the raw file.

The pipeline uses these 15 input columns:

- Numeric: `age`, `income`, `loan_amount`, `credit_score`, `months_employed`, `num_credit_lines`, `loan_term`, `dti_ratio`.
- Categorical: `education`, `employment_type`, `marital_status`, `has_mortgage`, `has_dependents`, `loan_purpose`, `has_co_signer`.

The two targets are `default` (binary 0/1) and `interest_rate` (numeric historical percentage points). `interest_rate` and `default` are targets, not input features. Preserve this separation to avoid target leakage.

### Feature engineering and preprocessing

[`LoanDomainFeatures`](./src/features.py) adds four derived values:

- `loan_to_annual_income` = loan amount / annual income.
- `employment_years` = months employed / 12.
- `monthly_installment_to_income_ratio` = (loan amount / loan term) / (annual income / 12). This is a simple ratio, not an amortized payment calculation.
- `debt_capacity_ratio` = 1 - DTI ratio.

The scikit-learn pipelines in [`src/trainer.py`](./src/trainer.py) apply median imputation to numeric fields, most-frequent imputation and one-hot encoding to categorical fields (unknown categories are ignored), followed by an XGBoost estimator. The classifier uses binary logistic output and tunes a class-imbalance weight; the regressor uses squared-error training.

### Training and evaluation

[`src/trainer.py`](./src/trainer.py) loads and cleans the raw dataset, makes a reproducible 80/20 train/test split stratified by `default` (unless configured otherwise), tunes each model with Optuna on a validation subset carved from the training split, fits the final pipelines, and calibrates the classifier with sigmoid calibration and three-fold cross-validation. The classifier tuning objective is validation average precision; the rate model objective is validation MAE.

Final reported metrics use the held-out test split and include simple constant-baseline comparisons. Classifier metrics are ROC-AUC, average precision, and Brier score. Rate-regression metrics are MAE and RMSE in percentage points plus R-squared. A model metric is descriptive, not evidence that the model is fair, current, calibrated for a different population, or fit for lending decisions.

The CLI default is 20 Optuna trials per model (`--trials`); the README's example explicitly passes `--trials 20`. The Python function `train_models()` has a separate default of 10 trials when called directly without that argument.

### SHAP

[`src/explainer.py`](./src/explainer.py) builds tree explainers for both models, saves explainer artifacts, and computes global mean-absolute-SHAP summaries from training samples. The local explanation endpoint returns classifier contributions in **default log-odds** and rate-model contributions in **percentage points**. These are model attributions, not causal explanations or recommendations. The classifier's standalone pipeline artifact and its calibrated probability model are distinct; inference prefers the calibrated probability model for the probability output.

### Training outputs

Training writes cleaned splits under `data/processed/` and artifacts under `artifacts/`:

- `classifier_pipe.joblib`
- `regressor_pipe.joblib`
- `shap_explainer.joblib`
- `global_shap_importance.joblib`
- `training_metrics.json`

The raw data is excluded from Git by [`.gitignore`](./.gitignore); processed CSVs are excluded too. Joblib artifacts are Python/version-sensitive and must be treated as trusted local files.

## Model-backed API

The application in [`api/main.py`](./api/main.py) loads the model and SHAP artifacts during FastAPI startup. Missing or malformed required artifacts prevent startup; retrain the models first. Its routes are:

- `GET /health` — reports service/model source health.
- `POST /predict` — returns calibrated default probability, a historical rate estimate when the rate model passes its validation-baseline check (otherwise `null`), status, and disclaimer.
- `POST /explain` — returns local SHAP contributions for both model outputs.
- `POST /workflow/analyze` — combines model prediction and explanation with simulated workflow-stage metadata; it does not make an approval decision or persist the application.
- `POST /workflow/repayment-options` — calculates arithmetic EMI alternatives from the caller's scenario assumptions; it does not recommend a plan.
- `GET /model-info` — provides dataset/training metadata, held-out metrics and baselines, rate-model status, and global SHAP summaries.

The model request schema and ranges are defined in [`src/schema.py`](./src/schema.py). Extra fields are forbidden. The standard example profile is in [`README.md`](./README.md). CORS is permissive in `api/main.py`; do not assume production-grade deployment security from that setting.

The rate endpoint's `beats_baseline` status compares the rate model's **validation MAE** with a train-mean validation baseline stored in the regressor artifact. When it does not beat that baseline, the endpoint deliberately returns no rate estimate.

## Separate mock backend

The separate [`backend/`](./backend/) tree defines another FastAPI application. [`backend/app/schemas.py`](./backend/app/schemas.py) requires a name, PAN-shaped identifier, role, salary, loan amount, tenure, existing EMI, mitigation choice, and optional co-applicant salary. [`backend/app/services/risk_engine.py`](./backend/app/services/risk_engine.py) derives ratios and applies deterministic rules, with an optional attempt to load `backend/industrial_loan_model.joblib`. Its generated feature cards are illustrative rather than SHAP outputs from the main model. The route waits to simulate external checks but calls no real KYC or bureau service. [`backend/app/database.py`](./backend/app/database.py) stores mock assessments in `backend/loan_pricing.db`, retaining only the PAN's final four characters.

This backend should be considered a separate mock/legacy path unless a task explicitly says otherwise. It is not the model-backed prediction pipeline documented in the root README, and its `approve`/`mitigate`/`reject` output must not be confused with the main classifier's default probability. The optional model lookup resolves to a root-level `industrial_loan_model.joblib`, not to the trained artifacts in `artifacts/`.

## Frontend and local running

The frontend is React with Vite, plain JSX, Lucide icons, Recharts dependency, and a large custom stylesheet in [`frontend/src/index.css`](./frontend/src/index.css). Its package scripts are `npm run dev`, `npm run build`, and `npm run preview`. `VITE_API_BASE` can override the API base; otherwise requests are relative and use Vite's development proxy.

The documented model-backed local workflow (Windows PowerShell, from the repository root) is:

1. Create a Python 3.11+ virtual environment and install root [`requirements.txt`](./requirements.txt).
2. Train with `python -m src.trainer --trials 20` (use the environment's Python executable).
3. Start the model API with `uvicorn api.main:app --reload`.
4. Start the frontend from `frontend/` with `npm install` if dependencies are not installed, then `npm run dev`.
5. Open the Vite URL and the API docs at `http://127.0.0.1:8000/docs`.

The root [`Dockerfile`](./Dockerfile) packages the model-backed `api.main:app` service and expects pre-existing artifacts. It does not package or serve the React frontend.

Root [`requirements.txt`](./requirements.txt) contains the ML, API, and training dependencies. `requirements-training.txt` is a smaller notebook/training-oriented list. The separate backend has its own [`backend/requirements.txt`](./backend/requirements.txt).

## Tests and notebooks

[`tests/test_model_pipeline.py`](./tests/test_model_pipeline.py) has focused `unittest` coverage for data normalization/identifier exclusion and target separation, derived feature/preprocessor behavior, request validation, and rate-model baseline gating. Run it from the repository root with `python -m unittest discover -s tests`.

[`notebooks/01_eda_and_stats.ipynb`](./notebooks/01_eda_and_stats.ipynb) is for exploratory data/statistical analysis; [`notebooks/02_shap_analysis.ipynb`](./notebooks/02_shap_analysis.ipynb) is for SHAP experiments. Their saved outputs currently include old `ModuleNotFoundError: pandas` failures, so rerun them with the documented environment before relying on notebook outputs.

## Limitations and responsible-use constraints

- The dataset labels historical default and interest rate, **not loan approval**. The principal model-backed app predicts default probability; it does not decide eligibility.
- This is an educational example using public historical data. It has not been validated for current populations, lending policy, calibration, fairness, explainability sufficiency, or regulatory requirements.
- Do not use its outputs to approve, deny, price, or otherwise make real credit decisions. Do not represent a historical rate prediction or scenario APR as a fair/recommended/contractual rate.
- The main model API is designed to be stateless, but the browser history feature persists assessment data in local storage. Do not enter real personal or sensitive applicant data.
- The separate mock backend does persist a subset of its inputs and synthesizes decision-like outputs; it is not a production lending system either.

## Guidance for future work

Before changing code, identify which API is in scope and trace the relevant data from UI form through request schema, endpoint, model/service, and displayed response. Prefer the root `api/` + `src/` pipeline for changes to trained-model behavior and the `backend/` tree only when the mock API is explicitly in scope. Keep request/response schemas, tests, documentation, and UI behavior aligned. Preserve the educational disclaimers, target/input separation, and non-decision-making semantics. Do not claim a behavior is implemented merely because it appears in UI copy or a notebook; verify the active execution path.
