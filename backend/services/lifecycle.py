"""
수명주기 단계 판별 알고리즘

12주 검색량 시계열을 분석해 트렌드 단계(상승/정점/하락/안정)와
GO/WAIT/STOP 판정을 내린다.
"""


def _moving_avg(values: list[float], window: int = 4) -> list[float]:
    result = []
    for i in range(len(values)):
        start = max(0, i - window + 1)
        result.append(sum(values[start : i + 1]) / (i - start + 1))
    return result


def analyze_lifecycle(weeks: list[dict]) -> dict:
    """
    Args:
        weeks: [{"period": "YYYY-MM-DD", "ratio": float}, ...]

    Returns:
        {
            "stage":        "rising" | "peak" | "declining" | "stable",
            "verdict":      "GO" | "WAIT" | "STOP",
            "exitWeek":     int | None,   # declining 시 현재 대비 -50% 예상 주수
            "peakWeek":     int,          # 최고점 인덱스 (0-based)
            "peakRatio":    float,
            "currentRatio": float,
            "avgRecent":    float,        # 최근 4주 평균
            "avgPrev":      float,        # 이전 4주 평균
        }
    """
    if not weeks:
        return _empty_result()

    ratios = [float(w.get("ratio", 0)) for w in weeks]
    n = len(ratios)

    if n < 4:
        return _simple_result(ratios)

    smoothed = _moving_avg(ratios, 4)

    # ── 추세 지표 ──────────────────────────────────────────────────────────────
    recent_avg = sum(ratios[-4:]) / 4
    prev_avg   = sum(ratios[-8:-4]) / 4 if n >= 8 else sum(ratios[:max(1, n - 4)]) / max(1, n - 4)
    delta      = recent_avg - prev_avg   # 양수 = 상승, 음수 = 하락

    derivs       = [smoothed[i] - smoothed[i - 1] for i in range(1, len(smoothed))]
    recent_deriv = sum(derivs[-4:]) / 4 if len(derivs) >= 4 else (derivs[-1] if derivs else 0.0)

    peak_idx   = ratios.index(max(ratios))
    peak_ratio = ratios[peak_idx]
    current    = ratios[-1]

    # ── 단계 분류 ──────────────────────────────────────────────────────────────
    RISE_TH  =  6.0   # 4주 평균이 6pt 이상 올라야 "상승기"
    FALL_TH  = -6.0   # 4주 평균이 6pt 이상 떨어져야 "하락기"
    PEAK_TH  =  0.80  # 최고점의 80% 이상이면 "정점 구간"

    if delta >= RISE_TH and recent_deriv >= 0:
        stage, verdict = "rising", "GO"
    elif delta <= FALL_TH:
        stage, verdict = "declining", "STOP"
    elif current >= peak_ratio * PEAK_TH:
        stage, verdict = "peak", "WAIT"
    else:
        stage, verdict = "stable", "WAIT"

    # ── EXIT 시점 추정 ─────────────────────────────────────────────────────────
    exit_week = None
    if stage == "declining" and current > 0:
        weekly_drop = abs(recent_deriv) if recent_deriv < 0 else abs(delta) / 4
        if weekly_drop > 0:
            target = current * 0.5          # 현재의 절반으로 떨어지는 시점
            exit_week = max(1, round((current - target) / weekly_drop))

    return {
        "stage":        stage,
        "verdict":      verdict,
        "exitWeek":     exit_week,
        "peakWeek":     peak_idx,
        "peakRatio":    round(peak_ratio, 1),
        "currentRatio": round(current, 1),
        "avgRecent":    round(recent_avg, 1),
        "avgPrev":      round(prev_avg, 1),
    }


def _empty_result() -> dict:
    return {
        "stage": "stable", "verdict": "WAIT",
        "exitWeek": None, "peakWeek": 0,
        "peakRatio": 0.0, "currentRatio": 0.0,
        "avgRecent": 0.0, "avgPrev": 0.0,
    }


def _simple_result(ratios: list[float]) -> dict:
    peak_idx = ratios.index(max(ratios))
    return {
        "stage": "stable", "verdict": "WAIT",
        "exitWeek": None, "peakWeek": peak_idx,
        "peakRatio": round(max(ratios), 1),
        "currentRatio": round(ratios[-1], 1),
        "avgRecent": round(sum(ratios) / len(ratios), 1),
        "avgPrev": round(sum(ratios) / len(ratios), 1),
    }
