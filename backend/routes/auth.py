"""
/api/auth — 회원가입 · 로그인 · 내 정보
/api/history — 분석한 메뉴 이력 (Bearer 토큰)
OAuth: Google 로그인 → 우리 토큰 발급
"""

import os
from flask import Blueprint, request, jsonify

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from services.auth_service import (
    register_user,
    login_user,
    make_token,
    verify_token,
    get_user_email,
    record_history,
    list_history,
    upsert_oauth_user,
)

auth_bp = Blueprint("auth", __name__)


def _bearer_user_id() -> int | None:
    h = request.headers.get("Authorization", "")
    if not h.startswith("Bearer "):
        return None
    return verify_token(h[7:].strip())


@auth_bp.route("/auth/register", methods=["POST"])
def register():
    body = request.get_json(silent=True) or {}
    email = body.get("email", "")
    password = body.get("password", "")
    uid, err = register_user(email, password)
    if err:
        return jsonify({"error": err}), 400
    token = make_token(uid)
    em = get_user_email(uid)
    return jsonify({"token": token, "user": {"id": uid, "email": em}})


@auth_bp.route("/auth/login", methods=["POST"])
def login():
    body = request.get_json(silent=True) or {}
    uid, err = login_user(body.get("email", ""), body.get("password", ""))
    if err:
        return jsonify({"error": err}), 401
    token = make_token(uid)
    em = get_user_email(uid)
    return jsonify({"token": token, "user": {"id": uid, "email": em}})


@auth_bp.route("/auth/me", methods=["GET"])
def me():
    uid = _bearer_user_id()
    if not uid:
        return jsonify({"error": "로그인이 필요합니다."}), 401
    em = get_user_email(uid)
    return jsonify({"user": {"id": uid, "email": em}})


@auth_bp.route("/history", methods=["GET"])
def history_get():
    uid = _bearer_user_id()
    if not uid:
        return jsonify({"error": "로그인이 필요합니다."}), 401
    items = list_history(uid)
    return jsonify({"items": items})


@auth_bp.route("/history", methods=["POST"])
def history_post():
    uid = _bearer_user_id()
    if not uid:
        return jsonify({"error": "로그인이 필요합니다."}), 401
    body = request.get_json(silent=True) or {}
    kw = (body.get("keyword") or "").strip()
    if not kw:
        return jsonify({"error": "keyword 가 필요합니다."}), 400
    verdict = body.get("verdict")
    record_history(uid, kw, str(verdict) if verdict else None)
    return jsonify({"ok": True})

# ─── Google Sign-In (ID token) ───────────────────────────────────────────────

@auth_bp.route("/auth/google", methods=["POST"])
def google_login():
    """
    Frontend에서 Google Identity Services로 받은 ID token(jwt)을 검증하고
    ExEAT 토큰(Bearer)으로 교환한다.

    body: { "credential": "<google id token>" }
    """
    body = request.get_json(silent=True) or {}
    credential = (body.get("credential") or "").strip()
    if not credential:
        return jsonify({"error": "credential 이 필요합니다."}), 400

    aud = os.getenv("GOOGLE_CLIENT_ID") or ""
    if not aud:
        return jsonify({"error": "GOOGLE_CLIENT_ID 가 설정되지 않았습니다."}), 500

    try:
        info = google_id_token.verify_oauth2_token(
            credential, google_requests.Request(), audience=aud
        )
    except Exception:
        return jsonify({"error": "구글 토큰 검증에 실패했습니다."}), 401

    sub = str(info.get("sub") or "")
    email = str(info.get("email") or "").strip().lower()
    if not sub:
        return jsonify({"error": "구글 사용자 식별자(sub)가 없습니다."}), 401

    uid = upsert_oauth_user("google", sub, email or None)
    token = make_token(uid)
    em = get_user_email(uid)
    return jsonify({"token": token, "user": {"id": uid, "email": em}})
