"""
POST /api/cache/clear — 서버 인메모리 캐시 전부 비우기 (개발·데모용)
"""

from flask import Blueprint, jsonify

from routes.ask import clear_ask_caches
from services.ai import clear_ai_response_cache
from services.trending import clear_trending_cache

cache_admin_bp = Blueprint("cache_admin", __name__)


@cache_admin_bp.route("/cache/clear", methods=["POST"])
def cache_clear():
    clear_ask_caches()
    clear_ai_response_cache()
    clear_trending_cache()
    return jsonify({"ok": True, "cleared": ["ask_result", "ai_response", "trending"]})
