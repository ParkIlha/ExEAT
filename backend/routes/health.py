"""
헬스체크 라우터

서버가 살아있는지 확인하는 단순 엔드포인트.
"""

from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "ok": True,
        "service": "ExEAT API",
        "message": "유행이 끝나는 순간을 봅니다."
    })
