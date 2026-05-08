"""
/api/trending — 요즘 뜨는 메뉴 Top N
"""

from flask import Blueprint, request, jsonify
from services.trending import get_trending

trending_bp = Blueprint("trending", __name__)


@trending_bp.route("/trending", methods=["GET"])
def trending():
    try:
        top  = int(request.args.get("top", 5))
        data = get_trending(top_n=top)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
