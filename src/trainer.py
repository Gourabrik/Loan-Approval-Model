from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import optuna
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.calibration import CalibratedClassifierCV
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBClassifier, XGBRegressor

from src.explainer import create_and_save_explainers
from src.features import (
    CATEGORICAL_FEATURES,
    DOMAIN_NUMERIC_FEATURES,
    FEATURE_COLUMNS,
    NUMERIC_FEATURES,
    LoanDomainFeatures,
    load_clean_dataset,
)

ROOT = Path(__file__).resolve().parents[1]
RANDOM_STATE = 42
DISCLAIMER = (
    "Educational demonstration only. Outputs estimate patterns in historical data; "
    "they are not loan approvals, credit decisions, or recommended lending rates."
)


def make_preprocessor() -> ColumnTransformer:
    numeric = Pipeline([("imputer", SimpleImputer(strategy="median"))])
    categorical = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    return ColumnTransformer(
        [
            ("numeric", numeric, NUMERIC_FEATURES + DOMAIN_NUMERIC_FEATURES),
            ("categorical", categorical, CATEGORICAL_FEATURES),
        ],
        remainder="drop",
    )


def make_pipeline(
    task: str, params: dict[str, Any], positive_weight: float
) -> Pipeline:
    params = dict(params)
    class_weight = params.pop("scale_pos_weight", positive_weight)
    if task == "default":
        model = XGBClassifier(
            **params,
            objective="binary:logistic",
            eval_metric="logloss",
            scale_pos_weight=class_weight,
            tree_method="hist",
            n_jobs=max(1, min(4, os.cpu_count() or 1)),
            random_state=RANDOM_STATE,
        )
    elif task == "interest_rate":
        model = XGBRegressor(
            **params,
            objective="reg:squarederror",
            eval_metric="mae",
            tree_method="hist",
            n_jobs=max(1, min(4, os.cpu_count() or 1)),
            random_state=RANDOM_STATE,
        )
    else:
        raise ValueError(f"Unknown training task: {task}")
    return Pipeline(
        [
            ("domain_features", LoanDomainFeatures()),
            ("preprocessor", make_preprocessor()),
            ("model", model),
        ]
    )


def suggest_parameters(trial: optuna.Trial) -> dict[str, Any]:
    params = {
        "n_estimators": trial.suggest_int("n_estimators", 100, 350),
        "max_depth": trial.suggest_int("max_depth", 3, 8),
        "learning_rate": trial.suggest_float("learning_rate", 0.02, 0.2, log=True),
        "subsample": trial.suggest_float("subsample", 0.7, 1.0),
        "colsample_bytree": trial.suggest_float("colsample_bytree", 0.7, 1.0),
        "min_child_weight": trial.suggest_float("min_child_weight", 1.0, 10.0),
        "reg_lambda": trial.suggest_float("reg_lambda", 0.1, 10.0, log=True),
    }
    if trial.study.study_name == "default-xgboost":
        # Tune the imbalance correction instead of always forcing a 1:1 class
        # balance, which can inflate probabilities and hurt calibration.
        params["scale_pos_weight"] = trial.suggest_float(
            "scale_pos_weight", 0.5, 8.0, log=True
        )
    return params


def tune_model(
    task: str,
    x_train: pd.DataFrame,
    y_train: pd.Series,
    trials: int,
    random_state: int,
) -> tuple[dict[str, Any], float, float]:
    stratify = y_train if task == "default" else None
    x_fit, x_valid, y_fit, y_valid = train_test_split(
        x_train,
        y_train,
        test_size=0.2,
        random_state=random_state,
        stratify=stratify,
    )
    positive_weight = float((y_fit == 0).sum() / max((y_fit == 1).sum(), 1))

    def objective(trial: optuna.Trial) -> float:
        pipeline = make_pipeline(task, suggest_parameters(trial), positive_weight)
        pipeline.fit(x_fit, y_fit)
        if task == "default":
            probability = pipeline.predict_proba(x_valid)[:, 1]
            return float(average_precision_score(y_valid, probability))
        prediction = pipeline.predict(x_valid)
        return float(mean_absolute_error(y_valid, prediction))

    direction = "maximize" if task == "default" else "minimize"
    study = optuna.create_study(
        direction=direction,
        sampler=optuna.samplers.TPESampler(seed=random_state),
        study_name=f"{task}-xgboost",
    )
    study.optimize(objective, n_trials=trials, n_jobs=1, show_progress_bar=False)
    if task == "default":
        baseline_value = float(
            average_precision_score(
                y_valid, np.full(len(y_valid), float(y_fit.mean()))
            )
        )
    else:
        baseline_value = float(
            mean_absolute_error(
                y_valid, np.full(len(y_valid), float(y_fit.mean()))
            )
        )
    return study.best_params, float(study.best_value), baseline_value


def evaluate_models(
    classifier: Pipeline,
    probability_model: Any,
    regressor: Pipeline,
    x_test: pd.DataFrame,
    y_default_train: pd.Series,
    y_rate_train: pd.Series,
    y_default: pd.Series,
    y_rate: pd.Series,
) -> dict[str, dict[str, float]]:
    default_probability = probability_model.predict_proba(x_test)[:, 1]
    rate_prediction = regressor.predict(x_test)
    baseline_default_probability = np.full(
        len(y_default), float(y_default_train.mean())
    )
    baseline_rate_prediction = np.full(len(y_rate), float(y_rate_train.mean()))
    return {
        "default_classifier": {
            "roc_auc": float(roc_auc_score(y_default, default_probability)),
            "average_precision": float(average_precision_score(y_default, default_probability)),
            "brier_score": float(brier_score_loss(y_default, default_probability)),
        },
        "default_classifier_baseline": {
            "roc_auc": 0.5,
            "average_precision": float(average_precision_score(y_default, baseline_default_probability)),
            "brier_score": float(
                brier_score_loss(y_default, baseline_default_probability)
            ),
        },
        "interest_rate_regressor": {
            "mae_percentage_points": float(mean_absolute_error(y_rate, rate_prediction)),
            "rmse_percentage_points": float(
                np.sqrt(mean_squared_error(y_rate, rate_prediction))
            ),
            "r2": float(r2_score(y_rate, rate_prediction)),
        },
        "interest_rate_baseline": {
            "mae_percentage_points": float(
                mean_absolute_error(y_rate, baseline_rate_prediction)
            ),
            "rmse_percentage_points": float(
                np.sqrt(mean_squared_error(y_rate, baseline_rate_prediction))
            ),
            "r2": float(r2_score(y_rate, baseline_rate_prediction)),
        },
    }


def _save_joblib(value: Any, path: Path) -> None:
    temporary_path = path.with_suffix(path.suffix + ".tmp")
    joblib.dump(value, temporary_path)
    temporary_path.replace(path)


def train_models(
    dataset_path: Path = ROOT / "data" / "raw" / "Loan_default.csv",
    processed_dir: Path = ROOT / "data" / "processed",
    artifact_dir: Path = ROOT / "artifacts",
    trials: int = 10,
    test_size: float = 0.2,
    random_state: int = RANDOM_STATE,
) -> dict[str, Any]:
    if trials < 1:
        raise ValueError("trials must be at least 1")
    if not 0 < test_size < 0.5:
        raise ValueError("test_size must be greater than 0 and less than 0.5")

    frame = load_clean_dataset(dataset_path)
    train_frame, test_frame = train_test_split(
        frame,
        test_size=test_size,
        random_state=random_state,
        stratify=frame["default"],
    )
    processed_dir.mkdir(parents=True, exist_ok=True)
    artifact_dir.mkdir(parents=True, exist_ok=True)
    train_frame.to_csv(processed_dir / "train.csv", index=False)
    test_frame.to_csv(processed_dir / "test.csv", index=False)

    x_train = train_frame.loc[:, FEATURE_COLUMNS]
    x_test = test_frame.loc[:, FEATURE_COLUMNS]
    y_default_train = train_frame["default"]
    y_rate_train = train_frame["interest_rate"]
    y_default_test = test_frame["default"]
    y_rate_test = test_frame["interest_rate"]

    optuna.logging.set_verbosity(optuna.logging.WARNING)
    classifier_params, classifier_validation_ap, _ = tune_model(
        "default", x_train, y_default_train, trials, random_state
    )
    (
        regressor_params,
        regressor_validation_mae,
        regressor_validation_baseline_mae,
    ) = tune_model(
        "interest_rate", x_train, y_rate_train, trials, random_state
    )
    positive_weight = float(
        (y_default_train == 0).sum() / max((y_default_train == 1).sum(), 1)
    )
    classifier = make_pipeline("default", classifier_params, positive_weight)
    regressor = make_pipeline("interest_rate", regressor_params, positive_weight)
    classifier.fit(x_train, y_default_train)
    probability_model = CalibratedClassifierCV(
        estimator=make_pipeline("default", classifier_params, positive_weight),
        method="sigmoid",
        cv=3,
        ensemble=False,
        n_jobs=1,
    )
    probability_model.fit(x_train, y_default_train)
    regressor.fit(x_train, y_rate_train)

    metrics = evaluate_models(
        classifier,
        probability_model,
        regressor,
        x_test,
        y_default_train,
        y_rate_train,
        y_default_test,
        y_rate_test,
    )
    trained_at = datetime.now(timezone.utc).isoformat()
    common_metadata = {
        "feature_columns": FEATURE_COLUMNS,
        "trained_at_utc": trained_at,
        "source_dataset": dataset_path.name,
        "disclaimer": DISCLAIMER,
    }
    _save_joblib(
        {
            **common_metadata,
            "target": "default",
            "pipeline": classifier,
            "probability_model": probability_model,
            "best_params": classifier_params,
            "validation_average_precision": classifier_validation_ap,
            "metrics": metrics["default_classifier"],
            "baseline_metrics": metrics["default_classifier_baseline"],
        },
        artifact_dir / "classifier_pipe.joblib",
    )
    _save_joblib(
        {
            **common_metadata,
            "target": "interest_rate",
            "pipeline": regressor,
            "best_params": regressor_params,
            "validation_mae_percentage_points": regressor_validation_mae,
            "validation_baseline_mae_percentage_points": regressor_validation_baseline_mae,
            "metrics": metrics["interest_rate_regressor"],
            "baseline_metrics": metrics["interest_rate_baseline"],
        },
        artifact_dir / "regressor_pipe.joblib",
    )
    create_and_save_explainers(
        classifier=classifier,
        regressor=regressor,
        background=x_train.sample(
            n=min(100, len(x_train)), random_state=random_state
        ),
        explanation_sample=x_train.sample(
            n=min(256, len(x_train)), random_state=random_state + 1
        ),
        artifact_dir=artifact_dir,
    )

    report = {
        "source_dataset": str(dataset_path.resolve()),
        "train_rows": len(train_frame),
        "test_rows": len(test_frame),
        "trials_per_model": trials,
        "random_state": random_state,
        "metrics": metrics,
        "best_params": {
            "default_classifier": classifier_params,
            "interest_rate_regressor": regressor_params,
        },
        "disclaimer": DISCLAIMER,
    }
    metrics_path = artifact_dir / "training_metrics.json"
    temporary_metrics_path = metrics_path.with_suffix(".json.tmp")
    temporary_metrics_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    temporary_metrics_path.replace(metrics_path)
    print(json.dumps(report, indent=2))
    print(f"Saved train/test splits to {processed_dir.resolve()}")
    print(f"Saved model and SHAP artifacts to {artifact_dir.resolve()}")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train default-risk and historical interest-rate models."
    )
    parser.add_argument(
        "--dataset",
        type=Path,
        default=ROOT / "data" / "raw" / "Loan_default.csv",
    )
    parser.add_argument(
        "--processed-dir", type=Path, default=ROOT / "data" / "processed"
    )
    parser.add_argument("--artifact-dir", type=Path, default=ROOT / "artifacts")
    parser.add_argument("--trials", type=int, default=20)
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--random-state", type=int, default=RANDOM_STATE)
    arguments = parser.parse_args()
    train_models(
        dataset_path=arguments.dataset,
        processed_dir=arguments.processed_dir,
        artifact_dir=arguments.artifact_dir,
        trials=arguments.trials,
        test_size=arguments.test_size,
        random_state=arguments.random_state,
    )


if __name__ == "__main__":
    main()
