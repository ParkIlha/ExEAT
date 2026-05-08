"""
/api/ask 라우터

키워드를 받아 트렌드 데이터 + 수명주기 분석 + Claude AI 종합 판정을 반환한다.
F9 메인 진입점.
"""

import requests
from flask import Blueprint, request, jsonify

from services.naver import fetch_trend, fetch_shopping_trend
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
        # 1. 네이버 DataLab 트렌드 + 쇼핑인사이트
        trend = fetch_trend(keyword)
        shopping_weeks = fetch_shopping_trend(keyword)  # 실패 시 [] 반환

        # 2. 수명주기 + 심층 분석 (모멘텀/변동성/예측/위험도)
        lifecycle = analyze_lifecycle(trend["weeks"])

        # 3. AI 액션 플랜 생성
        ai_result = ask_claude(keyword, lifecycle, trend["weeks"], shopping_weeks or None)

        resp = {
            "keyword":       keyword,
            "startDate":     trend["startDate"],
            "endDate":       trend["endDate"],
            "weeks":         trend["weeks"],
            **lifecycle,
            "verdict":       ai_result["verdict"],
            "summary":       ai_result["summary"],
            "reasoning":     ai_result["reasoning"],
            "dataInsight":   ai_result.get("dataInsight", ""),
            "marketContext": ai_result.get("marketContext", ""),
            "actionPlan": {
                "immediate":    ai_result["immediate"],
                "shortterm":    ai_result["shortterm"],
                "midterm":      ai_result["midterm"],
                "worstCase":    ai_result["worstCase"],
                "alternatives": ai_result["alternatives"],
            },
        }
        if shopping_weeks:
            resp["shoppingWeeks"] = shopping_weeks

        return jsonify(resp)

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
