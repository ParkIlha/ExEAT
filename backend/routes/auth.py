"""
/api/auth — 회원가입 · 로그인 · 내 정보
/api/history — 분석한 메뉴 이력 (Bearer 토큰)
"""

from flask import Blueprint, request, jsonify

from services.auth_service import (
    register_user,
    login_user,
    make_token,
    verify_token,
    get_user_email,
    record_history,
    list_history,
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
