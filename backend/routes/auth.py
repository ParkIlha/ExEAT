"""
/api/auth — 회원가입 · 로그인 · 내 정보
/api/history — 분석한 메뉴 이력 (Bearer 토큰)
OAuth: 카카오/네이버 로그인 → 우리 토큰 발급
"""

import os
import secrets
import urllib.parse

import requests
from flask import Blueprint, request, jsonify, redirect

from services.auth_service import (
    register_user,
    login_user,
    make_token,
    verify_token,
    get_user_email,
    record_history,
    list_history,
    make_oauth_state,
    verify_oauth_state,
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


def _frontend_url() -> str:
    return os.getenv("FRONTEND_URL") or "http://localhost:5173"


def _redirect_with_token(token: str, email: str | None, next_url: str | None) -> str:
    base = (next_url or "").strip() or (f"{_frontend_url()}/auth/callback")
    p = urllib.parse.urlparse(base)
    q = urllib.parse.parse_qs(p.query)
    q["token"] = [token]
    if email:
        q["email"] = [email]
    new_q = urllib.parse.urlencode(q, doseq=True)
    return urllib.parse.urlunparse((p.scheme, p.netloc, p.path, p.params, new_q, p.fragment))


# ─── Kakao OAuth ─────────────────────────────────────────────────────────────

@auth_bp.route("/auth/kakao/start", methods=["GET"])
def kakao_start():
    client_id = os.getenv("KAKAO_CLIENT_ID") or ""
    if not client_id:
        return jsonify({"error": "KAKAO_CLIENT_ID 가 설정되지 않았습니다."}), 500
    next_url = request.args.get("next")
    state = make_oauth_state(next_url)
    redirect_uri = f"{request.host_url.rstrip('/')}/api/auth/kakao/callback"
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "state": state,
        # 이메일은 앱 설정의 동의항목에 따라 내려오며, scope로 요청 가능
        "scope": "account_email",
    }
    url = "https://kauth.kakao.com/oauth/authorize?" + urllib.parse.urlencode(params)
    return redirect(url)


@auth_bp.route("/auth/kakao/callback", methods=["GET"])
def kakao_callback():
    code = request.args.get("code")
    state = request.args.get("state")
    next_url = verify_oauth_state(state)
    if not code:
        return redirect(f"{next_url or (_frontend_url() + '/auth/callback')}?error=oauth")

    client_id = os.getenv("KAKAO_CLIENT_ID") or ""
    client_secret = os.getenv("KAKAO_CLIENT_SECRET") or ""
    redirect_uri = f"{request.host_url.rstrip('/')}/api/auth/kakao/callback"

    token_resp = requests.post(
        "https://kauth.kakao.com/oauth/token",
        headers={"Content-Type": "application/x-www-form-urlencoded;charset=utf-8"},
        data={
            "grant_type": "authorization_code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "code": code,
            **({"client_secret": client_secret} if client_secret else {}),
        },
        timeout=10,
    )
    token_resp.raise_for_status()
    access_token = token_resp.json().get("access_token")

    me_resp = requests.get(
        "https://kapi.kakao.com/v2/user/me",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    me_resp.raise_for_status()
    me = me_resp.json()

    kakao_id = str(me.get("id") or "")
    kakao_email = ""
    acc = me.get("kakao_account") or {}
    if isinstance(acc, dict):
        kakao_email = str(acc.get("email") or "").strip().lower()

    uid = upsert_oauth_user("kakao", kakao_id, kakao_email or None)
    token = make_token(uid)
    em = get_user_email(uid)
    return redirect(_redirect_with_token(token, em, next_url))


# ─── Naver OAuth ─────────────────────────────────────────────────────────────

@auth_bp.route("/auth/naver/start", methods=["GET"])
def naver_start():
    client_id = os.getenv("NAVER_OAUTH_CLIENT_ID") or ""
    if not client_id:
        return jsonify({"error": "NAVER_OAUTH_CLIENT_ID 가 설정되지 않았습니다."}), 500
    next_url = request.args.get("next")
    state = make_oauth_state(next_url)
    redirect_uri = f"{request.host_url.rstrip('/')}/api/auth/naver/callback"
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "state": state,
    }
    url = "https://nid.naver.com/oauth2.0/authorize?" + urllib.parse.urlencode(params)
    return redirect(url)


@auth_bp.route("/auth/naver/callback", methods=["GET"])
def naver_callback():
    code = request.args.get("code")
    state = request.args.get("state")
    next_url = verify_oauth_state(state)
    if not code:
        return redirect(f"{next_url or (_frontend_url() + '/auth/callback')}?error=oauth")

    client_id = os.getenv("NAVER_OAUTH_CLIENT_ID") or ""
    client_secret = os.getenv("NAVER_OAUTH_CLIENT_SECRET") or ""
    redirect_uri = f"{request.host_url.rstrip('/')}/api/auth/naver/callback"

    token_resp = requests.get(
        "https://nid.naver.com/oauth2.0/token",
        params={
            "grant_type": "authorization_code",
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "state": state,
            "redirect_uri": redirect_uri,
        },
        timeout=10,
    )
    token_resp.raise_for_status()
    access_token = token_resp.json().get("access_token")

    me_resp = requests.get(
        "https://openapi.naver.com/v1/nid/me",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    me_resp.raise_for_status()
    payload = me_resp.json()
    resp = payload.get("response") or {}
    naver_id = str(resp.get("id") or "")
    naver_email = str(resp.get("email") or "").strip().lower()

    uid = upsert_oauth_user("naver", naver_id, naver_email or None)
    token = make_token(uid)
    em = get_user_email(uid)
    return redirect(_redirect_with_token(token, em, next_url))
