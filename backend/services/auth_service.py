"""
회원 인증 + 분석 이력 (SQLite)

토큰: itsdangerous URLSafeTimedSerializer (별도 JWT 패키지 불필요)
"""

from __future__ import annotations

import os
import re
import sqlite3
import time
import secrets

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
              created_at REAL NOT NULL,
              region TEXT,
              business_type TEXT
            );
            CREATE TABLE IF NOT EXISTS oauth_identities (
              provider TEXT NOT NULL,
              provider_user_id TEXT NOT NULL,
              user_id INTEGER NOT NULL,
              created_at REAL NOT NULL,
              PRIMARY KEY (provider, provider_user_id),
              FOREIGN KEY(user_id) REFERENCES users(id)
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
    _migrate_db()


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


def make_oauth_state(next_url: str | None) -> str:
    """OAuth callback에 사용할 signed state (10분 유효)."""
    return URLSafeTimedSerializer(_secret(), salt="exeat-oauth-state").dumps(
        {"next": (next_url or "").strip()[:400]}
    )


def verify_oauth_state(state: str | None, max_age_sec: int = 600) -> str:
    if not state:
        return ""
    try:
        data = URLSafeTimedSerializer(_secret(), salt="exeat-oauth-state").loads(
            state, max_age=max_age_sec
        )
        return str(data.get("next") or "")
    except Exception:
        return ""


def _find_user_by_email(email: str) -> int | None:
    em = (email or "").strip().lower()
    if not em:
        return None
    with _conn() as db:
        row = db.execute("SELECT id FROM users WHERE email = ?", (em,)).fetchone()
    return int(row["id"]) if row else None


def _create_user(email: str) -> int:
    em = (email or "").strip().lower()
    now = time.time()
    # 소셜 로그인 계정은 패스워드를 사용하지 않지만, 스키마 제약으로 hash는 필요
    pw_hash = generate_password_hash(secrets.token_urlsafe(24))
    with _conn() as db:
        cur = db.execute(
            "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
            (em, pw_hash, now),
        )
        return int(cur.lastrowid)


def upsert_oauth_user(provider: str, provider_user_id: str, email: str | None) -> int:
    """
    provider + provider_user_id 로 유저를 찾거나 생성한다.
    이메일이 있으면 기존 이메일 계정과 매칭해 연결한다.
    """
    provider = (provider or "").strip().lower()
    pid = (provider_user_id or "").strip()
    if not provider or not pid:
        raise ValueError("provider/provider_user_id required")

    with _conn() as db:
        row = db.execute(
            "SELECT user_id FROM oauth_identities WHERE provider = ? AND provider_user_id = ?",
            (provider, pid),
        ).fetchone()
        if row:
            return int(row["user_id"])

    em = (email or "").strip().lower()
    if em and not _EMAIL_RE.match(em):
        em = ""
    if not em:
        em = f"{provider}_{pid}@oauth.local"

    uid = _find_user_by_email(em)
    if not uid:
        uid = _create_user(em)

    with _conn() as db:
        db.execute(
            "INSERT OR IGNORE INTO oauth_identities (provider, provider_user_id, user_id, created_at) VALUES (?, ?, ?, ?)",
            (provider, pid, uid, time.time()),
        )
    return uid


def _migrate_db() -> None:
    """기존 DB에 누락된 컬럼을 안전하게 추가한다."""
    with _conn() as db:
        for col, col_type in [("region", "TEXT"), ("business_type", "TEXT")]:
            try:
                db.execute(f"ALTER TABLE users ADD COLUMN {col} {col_type}")
            except Exception:
                pass  # 이미 존재하면 무시


def get_user_profile(user_id: int) -> dict:
    with _conn() as db:
        row = db.execute(
            "SELECT email, region, business_type FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    if not row:
        return {}
    return {
        "email": row["email"],
        "region": row["region"],
        "businessType": row["business_type"],
    }


def update_user_profile(user_id: int, region: str | None, business_type: str | None) -> None:
    with _conn() as db:
        db.execute(
            "UPDATE users SET region = ?, business_type = ? WHERE id = ?",
            (region, business_type, user_id),
        )


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
