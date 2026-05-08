"""
/api/ask 라우터

키워드를 받아 트렌드 데이터 + 수명주기 분석 + Claude AI 종합 판정을 반환한다.
F9 메인 진입점.
"""

import requests
from flask import Blueprint, request, jsonify

from services.naver import fetch_trend
from services.lifecycle import analyze_lifecycle
from services.claude import ask_claude

ask_bp = Blueprint("ask", __name__)


@ask_bp.route("/ask", methods=["POST"])
def ask():
    data = request.get_json(silent=True) or {}
    keyword = (data.get("keyword") or "").strip()

    if not keyword:
        return jsonify({"error": "keyword 가 필요합니다."}), 400

    try:
        # 1. 네이버 DataLab 트렌드
        trend = fetch_trend(keyword)

        # 2. 수명주기 분석
        lifecycle = analyze_lifecycle(trend["weeks"])

        # 3. Claude AI 종합 판정
        ai_result = ask_claude(keyword, lifecycle, trend["weeks"])

        return jsonify({
            "keyword":   keyword,
            "startDate": trend["startDate"],
            "endDate":   trend["endDate"],
            "weeks":     trend["weeks"],
            **lifecycle,
            "reasoning": ai_result["reasoning"],
            "verdict":   ai_result["verdict"],   # AI 판정으로 override
        })

    except ValueError as e:
        return jsonify({"error": str(e)}), 500

    except requests.HTTPError as e:
        status = e.response.status_code if e.response is not None else None
        return jsonify({
            "error": "네이버 API 호출 실패",
            "status": status,
            "detail": e.response.text if e.response is not None else str(e),
        }), 502

    except requests.RequestException as e:
        return jsonify({"error": "네트워크 오류", "detail": str(e)}), 502

    except Exception as e:
        return jsonify({"error": "서버 오류", "detail": str(e)}), 500
