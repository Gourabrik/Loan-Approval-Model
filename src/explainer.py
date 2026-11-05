from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline


def _dense(values: Any) -> np.ndarray:
    if hasattr(values, "toarray"):
        values = values.toarray()
    return np.asarray(values)


def _save_joblib(value: Any, path: Path) -> None:
    temporary_path = path.with_suffix(path.suffix + ".tmp")
    joblib.dump(value, temporary_path)
    temporary_path.replace(path)


def _shap_values(explainer: Any, features: np.ndarray) -> tuple[np.ndarray, float]:
    result = explainer(features)
    values = np.asarray(result.values)
    base_values = np.asarray(result.base_values)
    if values.ndim == 3:
        values = values[..., 1]
    if base_values.ndim > 1 and base_values.shape[-1] > 1:
        base_values = base_values[..., 1]
    return values, float(base_values.reshape(-1)[0])


def create_and_save_explainers(
    classifier: Pipeline,
    regressor: Pipeline,
    background: pd.DataFrame,
    explanation_sample: pd.DataFrame,
    artifact_dir: Path,
) -> dict[str, list[dict[str, float | str]]]:
    import shap

    classifier_preprocessor = classifier.named_steps["preprocessor"]
    regressor_preprocessor = regressor.named_steps["preprocessor"]
    classifier_background = _dense(classifier[:-1].transform(background))
    regressor_background = _dense(regressor[:-1].transform(background))
    classifier_features = _dense(classifier[:-1].transform(explanation_sample))
    regressor_features = _dense(regressor[:-1].transform(explanation_sample))

    classifier_explainer = shap.TreeExplainer(
        classifier.named_steps["model"], data=classifier_background
    )
    regressor_explainer = shap.TreeExplainer(
        regressor.named_steps["model"], data=regressor_background
    )
    classifier_values, _ = _shap_values(
        classifier_explainer, classifier_features
    )
    regressor_values, _ = _shap_values(regressor_explainer, regressor_features)

    classifier_names = classifier_preprocessor.get_feature_names_out().tolist()
    regressor_names = regressor_preprocessor.get_feature_names_out().tolist()
    classifier_importance = np.mean(np.abs(classifier_values), axis=0)
    regressor_importance = np.mean(np.abs(regressor_values), axis=0)
    summary = {
        "default_classifier": [
            {"feature": classifier_names[index], "mean_abs_shap": float(value)}
            for index, value in sorted(
                enumerate(classifier_importance), key=lambda item: item[1], reverse=True
            )[:20]
        ],
        "interest_rate_regressor": [
            {"feature": regressor_names[index], "mean_abs_shap": float(value)}
            for index, value in sorted(
                enumerate(regressor_importance), key=lambda item: item[1], reverse=True
            )[:20]
        ],
    }
    _save_joblib(
        {
            "classifier": classifier_explainer,
            "regressor": regressor_explainer,
            "classifier_feature_names": classifier_names,
            "regressor_feature_names": regressor_names,
        },
        artifact_dir / "shap_explainer.joblib",
    )
    _save_joblib(summary, artifact_dir / "global_shap_importance.joblib")
    return summary


def explain_application(
    application: dict[str, Any],
    classifier_bundle: dict[str, Any],
    regressor_bundle: dict[str, Any],
    explainer_bundle: dict[str, Any],
) -> dict[str, Any]:
    """Return local tree SHAP contributions for default log-odds and rate percentage points."""
    row = pd.DataFrame([application], columns=classifier_bundle["feature_columns"])
    classifier_preprocessor = classifier_bundle["pipeline"].named_steps["preprocessor"]
    regressor_preprocessor = regressor_bundle["pipeline"].named_steps["preprocessor"]
    classifier_row = _dense(classifier_bundle["pipeline"][:-1].transform(row))
    regressor_row = _dense(regressor_bundle["pipeline"][:-1].transform(row))
    classifier_values, classifier_base = _shap_values(
        explainer_bundle["classifier"], classifier_row
    )
    regressor_values, regressor_base = _shap_values(
        explainer_bundle["regressor"], regressor_row
    )

    def contributions(
        values: np.ndarray, names: list[str]
    ) -> list[dict[str, float | str]]:
        return [
            {"feature": names[index], "contribution": float(value)}
            for index, value in sorted(
                enumerate(values[0]), key=lambda item: abs(item[1]), reverse=True
            )
        ]

    return {
        "default_log_odds_base_value": classifier_base,
        "default_log_odds_contributions": contributions(
            classifier_values, explainer_bundle["classifier_feature_names"]
        ),
        "interest_rate_base_value_pct": regressor_base,
        "interest_rate_contributions_pct": contributions(
            regressor_values, explainer_bundle["regressor_feature_names"]
        ),
    }
