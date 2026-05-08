"""
/api/simulate 라우터

손익분기 시뮬레이터: 재료 단가, 판매가, 일 판매량, EXIT 예상 시점을 받아
손익분기 주차와 누적 수익 곡선을 반환한다.
"""

from flask import Blueprint, request, jsonify

simulate_bp = Blueprint("simulate", __name__)


@simulate_bp.route("/simulate", methods=["POST"])
def simulate():
    data = request.get_json(silent=True) or {}

    try:
        unit_cost    = float(data["unitCost"])    # 재료비 + 소모품 (건당, 원)
        price        = float(data["price"])       # 판매가 (원)
        daily_sales  = float(data["dailySales"])  # 일 평균 판매량 (개)
        exit_week    = int(data.get("exitWeek") or 0)  # 하락 시작 예상 주차 (0 = 미입력)
        fixed_cost   = float(data.get("fixedCost") or 0)  # 추가 고정비 (재료 구매 등)
    except (KeyError, TypeError, ValueError) as e:
        return jsonify({"error": f"입력값 오류: {e}"}), 400

    if price <= unit_cost:
        return jsonify({"error": "판매가가 재료비보다 낮습니다."}), 400

    margin_per   = price - unit_cost          # 건당 마진 (원)
    daily_profit = margin_per * daily_sales   # 일 마진
    weekly_profit = daily_profit * 7          # 주 마진

    # 손익분기 주차 (고정비 회수 기준)
    # 초기 투자금 = fixedCost (없으면 0 → 1주차부터 수익)
    if weekly_profit <= 0:
        break_even_week = None
    elif fixed_cost <= 0:
        break_even_week = 1
    else:
        import math
        break_even_week = math.ceil(fixed_cost / weekly_profit)

    # 주차별 누적 수익 (최대 26주)
    max_weeks = max(26, (exit_week or 0) + 8)
    weekly_data = []
    cumulative = -fixed_cost  # 초기 투자금 차감

    for week in range(1, max_weeks + 1):
        cumulative += weekly_profit
        weekly_data.append({
            "week":       week,
            "cumulative": round(cumulative),
            "profit":     round(weekly_profit),
        })

    return jsonify({
        "marginPer":      round(margin_per),
        "weeklyProfit":   round(weekly_profit),
        "breakEvenWeek":  break_even_week,
        "exitWeek":       exit_week or None,
        "weeks":          weekly_data,
        # EXIT 전까지 벌 수 있는 누적 수익
        "profitBeforeExit": (
            round(weekly_data[exit_week - 1]["cumulative"])
            if exit_week and exit_week <= len(weekly_data)
            else None
        ),
    })
