import tempfile
import unittest
from pathlib import Path

import pandas as pd
from pydantic import ValidationError

from api.main import interest_rate_model_status
from src.features import (
    FEATURE_COLUMNS,
    LoanDomainFeatures,
    load_clean_dataset,
    split_features_and_targets,
)
from src.schema import LoanApplication
from src.trainer import make_preprocessor


class ModelPipelineTests(unittest.TestCase):
    def test_cleaner_normalizes_source_and_excludes_identifier(self) -> None:
        source = pd.DataFrame(
            [
                {
                    "LoanID": "row-1",
                    "Age": 35,
                    "Income": 75000,
                    "LoanAmount": 25000,
                    "CreditScore": 680,
                    "MonthsEmployed": 36,
                    "NumCreditLines": 3,
                    "InterestRate": 8.5,
                    "LoanTerm": 36,
                    "DTIRatio": 0.35,
                    "Education": " Bachelor's ",
                    "EmploymentType": " Full-time ",
                    "MaritalStatus": "Single",
                    "HasMortgage": "No",
                    "HasDependents": "No",
                    "LoanPurpose": "Auto",
                    "HasCoSigner": "No",
                    "Default": 0,
                },
                {
                    "LoanID": "row-2",
                    "Age": 42,
                    "Income": 64000,
                    "LoanAmount": 30000,
                    "CreditScore": 610,
                    "MonthsEmployed": 18,
                    "NumCreditLines": 4,
                    "InterestRate": 11.0,
                    "LoanTerm": 48,
                    "DTIRatio": 0.45,
                    "Education": "Master's",
                    "EmploymentType": "Self-employed",
                    "MaritalStatus": "Married",
                    "HasMortgage": "Yes",
                    "HasDependents": "Yes",
                    "LoanPurpose": "Business",
                    "HasCoSigner": "No",
                    "Default": 1,
                },
            ]
        )
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "loans.csv"
            source.to_csv(path, index=False)
            cleaned = load_clean_dataset(path)

        self.assertEqual(list(cleaned.columns), FEATURE_COLUMNS + ["default", "interest_rate"])
        self.assertNotIn("loan_id", cleaned.columns)
        self.assertEqual(cleaned.loc[0, "education"], "Bachelor's")
        x, y_default, y_rate = split_features_and_targets(cleaned)
        self.assertEqual(list(x.columns), FEATURE_COLUMNS)
        self.assertEqual(y_default.tolist(), [0, 1])
        self.assertEqual(y_rate.tolist(), [8.5, 11.0])

    def test_preprocessor_accepts_categorical_and_numeric_features(self) -> None:
        inputs = pd.DataFrame(
            [
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
                    "has_co_signer": "No",
                },
                {
                    "age": 42,
                    "income": 64000,
                    "loan_amount": 30000,
                    "credit_score": 610,
                    "months_employed": 18,
                    "num_credit_lines": 4,
                    "loan_term": 48,
                    "dti_ratio": 0.45,
                    "education": "Master's",
                    "employment_type": "Self-employed",
                    "marital_status": "Married",
                    "has_mortgage": "Yes",
                    "has_dependents": "Yes",
                    "loan_purpose": "Business",
                    "has_co_signer": "No",
                },
            ]
        )
        domain_features = LoanDomainFeatures().fit_transform(inputs)
        transformed = make_preprocessor().fit_transform(domain_features)
        self.assertEqual(transformed.shape[0], 2)
        self.assertGreater(transformed.shape[1], len(inputs.columns))
        self.assertAlmostEqual(domain_features.loc[0, "loan_to_annual_income"], 1 / 3)

    def test_request_schema_rejects_out_of_range_credit_score(self) -> None:
        payload = {
            "age": 35,
            "income": 75000,
            "loan_amount": 25000,
            "credit_score": 1000,
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
            "has_co_signer": "No",
        }
        with self.assertRaises(ValidationError):
            LoanApplication.model_validate(payload)

    def test_rate_endpoint_status_requires_beating_baseline_mae(self) -> None:
        bundle = {
            "validation_mae_percentage_points": 5.8,
            "validation_baseline_mae_percentage_points": 5.7,
        }
        self.assertEqual(
            interest_rate_model_status(bundle), "does_not_beat_baseline"
        )
        bundle["validation_mae_percentage_points"] = 5.6
        self.assertEqual(interest_rate_model_status(bundle), "beats_baseline")


if __name__ == "__main__":
    unittest.main()
