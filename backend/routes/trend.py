"""
/api/trend 라우터

키워드를 받아서 네이버 DataLab 12주치 검색량을 반환한다.
"""

import requests
from flask import Blueprint, request, jsonify

from services.naver import fetch_trend

trend_bp = Blueprint("trend", __name__)


@trend_bp.route("/trend", methods=["POST"])
def get_trend():
    data = request.get_json(silent=True) or {}
    keyword = (data.get("keyword") or "").strip()

    if not keyword:
        return jsonify({"error": "keyword 가 필요합니다."}), 400

    try:
        result = fetch_trend(keyword)
        return jsonify(result)

    except ValueError as e:
        # 환경변수 누락 등 설정 오류
        return jsonify({"error": str(e)}), 500

    except requests.HTTPError as e:
        # 네이버 API 가 4xx/5xx 응답
        status = e.response.status_code if e.response is not None else None
        return jsonify({
            "error": "네이버 API 호출 실패",
            "status": status,
            "detail": e.response.text if e.response is not None else str(e),
        }), 502

    except requests.RequestException as e:
        # 네트워크 오류 / 타임아웃
        return jsonify({
            "error": "네트워크 오류",
            "detail": str(e),
        }), 502
