"""
/api/region 라우터 (F4 지역 적합도)

GET  /api/region/list           → 전체 지역 코드·이름 목록
POST /api/region/analyze        → 지역 + 트렌드 단계로 적합도 판정
"""

from flask import Blueprint, request, jsonify
from services.region import get_regions, analyze_region

region_bp = Blueprint("region", __name__)


@region_bp.route("/region/list", methods=["GET"])
def region_list():
    regions = get_regions()
    return jsonify([{"code": r["code"], "name": r["name"]} for r in regions])


@region_bp.route("/region/analyze", methods=["POST"])
def region_analyze():
    data = request.get_json(silent=True) or {}
    code  = (data.get("regionCode") or "").strip()
    stage = (data.get("stage") or "stable").strip()

    if not code:
        return jsonify({"error": "regionCode 가 필요합니다."}), 400

    result = analyze_region(code, stage)
    if "error" in result:
        return jsonify(result), 404

    return jsonify(result)
