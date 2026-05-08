"""
회원 인증 + 분석 이력 (SQLite)

토큰: itsdangerous URLSafeTimedSerializer (별도 JWT 패키지 불필요)
"""

from __future__ import annotations

import os
import re
import sqlite3
import time

from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from werkzeug.security import generate_password_hash, check_password_hash

_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "exeat.db")

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _secret() -> str:
    return os.getenv("JWT_SECRET") or os.getenv("FLASK_SECRET_KEY") or "exeat-dev-change-me"


def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(_secret(), salt="exeat-auth")


def _conn() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(_DB_PATH), exist_ok=True)
    c = sqlite3.connect(_DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def init_db() -> None:
    with _conn() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              email TEXT UNIQUE NOT NULL COLLATE NOCASE,
              password_hash TEXT NOT NULL,
              created_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS query_history (
              user_id INTEGER NOT NULL,
              keyword TEXT NOT NULL,
              verdict TEXT,
              updated_at REAL NOT NULL,
              PRIMARY KEY (user_id, keyword),
              FOREIGN KEY(user_id) REFERENCES users(id)
            );
            """
        )


def register_user(email: str, password: str) -> tuple[int | None, str | None]:
    email = (email or "").strip().lower()
    if not _EMAIL_RE.match(email):
        return None, "올바른 이메일 형식이 아닙니다."
    if len(password or "") < 6:
        return None, "비밀번호는 6자 이상이어야 합니다."
    pw_hash = generate_password_hash(password)
    now = time.time()
    try:
        with _conn() as db:
            cur = db.execute(
                "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
                (email, pw_hash, now),
            )
            uid = cur.lastrowid
        return int(uid), None
    except sqlite3.IntegrityError:
        return None, "이미 가입된 이메일입니다."


def login_user(email: str, password: str) -> tuple[int | None, str | None]:
    email = (email or "").strip().lower()
    with _conn() as db:
        row = db.execute(
            "SELECT id, password_hash FROM users WHERE email = ?", (email,)
        ).fetchone()
    if not row or not check_password_hash(row["password_hash"], password):
        return None, "이메일 또는 비밀번호가 올바르지 않습니다."
    return int(row["id"]), None


def make_token(user_id: int) -> str:
    return _serializer().dumps({"uid": user_id})


def verify_token(token: str | None) -> int | None:
    if not token:
        return None
    try:
        data = _serializer().loads(token, max_age=60 * 60 * 24 * 90)
        return int(data["uid"])
    except (BadSignature, SignatureExpired, KeyError, TypeError):
        return None


def get_user_email(user_id: int) -> str | None:
    with _conn() as db:
        row = db.execute("SELECT email FROM users WHERE id = ?", (user_id,)).fetchone()
    return row["email"] if row else None


def record_history(user_id: int, keyword: str, verdict: str | None) -> None:
    kw = (keyword or "").strip()
    if not kw:
        return
    now = time.time()
    v = (verdict or "")[:8]
    with _conn() as db:
        db.execute(
            """
            INSERT INTO query_history (user_id, keyword, verdict, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, keyword) DO UPDATE SET
              verdict = excluded.verdict,
              updated_at = excluded.updated_at
            """,
            (user_id, kw, v, now),
        )


def list_history(user_id: int, limit: int = 50) -> list[dict]:
    with _conn() as db:
        rows = db.execute(
            """
            SELECT keyword, verdict, updated_at FROM query_history
            WHERE user_id = ?
            ORDER BY updated_at DESC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()
    return [
        {"keyword": r["keyword"], "verdict": r["verdict"], "at": int(r["updated_at"])}
        for r in rows
    ]
