"""
/api/trend 라우터

키워드를 받아서 Google Trends 12주치 관심도 + 수명주기 분석을 반환한다.
"""

from flask import Blueprint, request, jsonify

from services.google_trend import fetch_google_trend
from services.lifecycle import analyze_lifecycle
from services.synthetic_trend import synthetic_weeks

trend_bp = Blueprint("trend", __name__)


@trend_bp.route("/trend", methods=["POST"])
def get_trend():
    data = request.get_json(silent=True) or {}
    keyword = (data.get("keyword") or "").strip()

    if not keyword:
        return jsonify({"error": "keyword 가 필요합니다."}), 400

    try:
        weeks = fetch_google_trend(keyword, weeks=12)
        source = "google_trends"
        if not weeks:
            weeks = synthetic_weeks(keyword, weeks=12)
            source = "synthetic"

        lifecycle = analyze_lifecycle(weeks)
        return jsonify({
            "keyword": keyword,
            "source": source,
            "weeks": weeks,
            **lifecycle,
        })

    except ValueError as e:
        # 환경변수 누락 등 설정 오류
        return jsonify({"error": str(e)}), 500

    except Exception as e:
        return jsonify({"error": "구글 트렌드 호출 실패", "detail": str(e)}), 502
