import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "loan_pricing.db"


def connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def initialize_database() -> None:
    with connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS loan_assessments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                applicant_name TEXT NOT NULL,
                pan_last_four TEXT NOT NULL,
                requested_amount REAL NOT NULL,
                credit_score INTEGER NOT NULL,
                probability_of_default REAL NOT NULL,
                decision TEXT NOT NULL
            )
            """
        )


def save_assessment(name: str, pan: str, amount: float, score: int, pd: float, decision: str) -> int:
    with connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO loan_assessments
            (applicant_name, pan_last_four, requested_amount, credit_score, probability_of_default, decision)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (name, pan[-4:], amount, score, pd, decision),
        )
        return int(cursor.lastrowid)
