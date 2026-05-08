"""
수명주기 단계 판별 + 심층 트렌드 분석 (v2)

두 축 분류:
- nature: TREND / STEADY (52주 peak/avg 비율 기반)
- cycle:  EMERGING / RISING / PEAK / DECLINING / FADED (TREND)
          SATURATED / GROWING / STABLE (STEADY)

기존 출력 필드 100% 유지 + 신규 필드
(nature, cycle, confidence, skipAI, rSquared, slope, peakToAvg).
"""

from __future__ import annotations
import numpy as np
import pandas as pd
from scipy import stats


# ─── Verdict 매핑 테이블 ─────────────────────────────────────────────────────
# verdict:       UI 호환값 (GO / WAIT / STOP — 프론트엔드 VERDICT_CONFIG 키)
# verdictDetail: 세부 판정 (CAUTION / VIABLE 등 신규 개념은 여기에)
_VERDICT_MAP: dict[tuple[str, str], tuple[str, str, float]] = {
    # (nature, cycle) → (verdict_ui, verdict_detail, confidence)
    ("TREND",  "EMERGING"):   ("GO",   "GO",      0.85),
    ("TREND",  "RISING"):     ("GO",   "GO",      0.85),
    ("TREND",  "PEAK"):       ("WAIT", "WAIT",    0.50),
    ("TREND",  "DECLINING"):  ("STOP", "STOP",    0.85),
    ("TREND",  "FADED"):      ("STOP", "STOP",    0.95),
    ("STEADY", "SATURATED"):  ("WAIT", "CAUTION", 0.85),  # 포화시장 → WAIT (진입 신중)
    ("STEADY", "GROWING"):    ("GO",   "VIABLE",  0.75),  # 안정 성장 → GO
    ("STEADY", "STABLE"):     ("WAIT", "VIABLE",  0.70),  # 안정 → WAIT (특별히 지금 들어갈 이유 없음)
}

# UI 호환용 매핑
_STAGE_MAP: dict[str, str] = {
    "EMERGING":  "rising",
    "RISING":    "rising",
    "PEAK":      "peak",
    "DECLINING": "declining",
    "FADED":     "declining",
    "SATURATED": "stable",
    "GROWING":   "rising",
    "STABLE":    "stable",
}
_ITEM_TYPE_MAP: dict[tuple[str, str], str] = {
    ("TREND",  "EMERGING"):   "trending",
    ("TREND",  "RISING"):     "trending",
    ("TREND",  "PEAK"):       "trending",
    ("TREND",  "DECLINING"):  "fading",
    ("TREND",  "FADED"):      "fading",
    ("STEADY", "SATURATED"):  "steady_saturated",
    ("STEADY", "GROWING"):    "steady_emerging",
    ("STEADY", "STABLE"):     "steady_safe",
}


def _detect_seasonal(
    ratios_l: list[float],
    weeks_long: list[dict] | None,
) -> dict | None:
    """
    연간 계절성 패턴 감지 (최소 40주 필요).
    (max-min)/mean > 1.5 이면 계절성 메뉴로 분류.

    Returns:
        {"isSeasonal": True, "peakMonth": int, "seasonPhase": str, "seasonStrength": float}
        or None
    """
    if len(ratios_l) < 40 or not weeks_long:
        return None

    arr_l   = np.array(ratios_l)
    avg_l   = float(np.mean(arr_l))
    if avg_l <= 0:
        return None

    strength = (float(np.max(arr_l)) - float(np.min(arr_l))) / avg_l
    if strength < 1.5:
        return None

    peak_idx = int(np.argmax(arr_l))
    peak_period = weeks_long[peak_idx].get("period", "") if peak_idx < len(weeks_long) else ""
    try:
        peak_month = int(peak_period.split("-")[1])
    except Exception:
        return None

    from datetime import date as _d
    cur = _d.today().month
    diff = min(abs(cur - peak_month), 12 - abs(cur - peak_month))

    if diff == 0:
        phase = "peak_season"
    elif diff <= 2:
        phase = "pre_season"
    elif diff <= 4:
        phase = "approaching"
    else:
        phase = "off_season"

    return {
        "isSeasonal":    True,
        "peakMonth":     peak_month,
        "seasonPhase":   phase,
        "seasonStrength": round(strength, 2),
    }


def _find_inflection(smoothed: list[float]) -> int | None:
    """1차 도함수 부호가 마지막으로 바뀐 인덱스."""
    if len(smoothed) < 4:
        return None
    derivs = np.diff(smoothed)
    sign_changes = np.where(np.diff(np.sign(derivs)) != 0)[0]
    return int(sign_changes[-1] + 2) if len(sign_changes) > 0 else None


def _compute_risk(
    nature: str, cycle: str,
    peak_decay: float, momentum: float, volatility: float,
) -> int:
    """0(안전) ~ 100(위험)."""
    base = {
        "FADED":     90,
        "DECLINING": 70,
        "PEAK":      55,
        "RISING":    25,
        "EMERGING":  15,
        "SATURATED": 60,
        "GROWING":   30,
        "STABLE":    35,
    }.get(cycle, 50)

    base += max(0, min(20, -momentum * 4))
    base += max(0, min(15, volatility * 0.5))
    if nature == "STEADY":
        base = min(base, 70)

    return max(0, min(100, round(base)))


def analyze_lifecycle(
    weeks_short: list[dict],
    weeks_long: list[dict] | None = None,
) -> dict:
    """
    Args:
        weeks_short: 12주 [{period, ratio}, ...] (필수)
        weeks_long:  52주 [{period, ratio}, ...] (선택, 본질 분류용)

    Returns:
        기존 필드(stage, verdict, exitWeek, peakWeek, peakRatio, currentRatio,
        avgRecent, avgPrev, momentum, volatility, peakDecay, inflectionWeek,
        forecast, riskScore, itemType, avgAll) + 신규 필드
        (nature, cycle, confidence, skipAI, rSquared, slope, peakToAvg)
    """
    if not weeks_short:
        return _empty_result()

    ratios_s = [float(w.get("ratio", 0)) for w in weeks_short]
    ratios_l = (
        [float(w.get("ratio", 0)) for w in weeks_long]
        if weeks_long else ratios_s
    )

    if len(ratios_s) < 4:
        return _simple_result(ratios_s)

    # ─── 1. 본질 분류 (장기) ────────────────────────────────────────────────
    avg_long  = sum(ratios_l) / len(ratios_l) if ratios_l else 0.0
    peak_long = max(ratios_l) if ratios_l else 0.0
    peak_to_avg = peak_long / avg_long if avg_long > 0 else 1.0

    nature = "TREND" if peak_to_avg >= 2.0 else "STEADY"

    # ─── 2. 단기 지표 (12주) ───────────────────────────────────────────────
    arr = np.array(ratios_s, dtype=float)
    n   = len(arr)

    lr        = stats.linregress(np.arange(n), arr)
    slope     = float(lr.slope)
    r_squared = float(lr.rvalue ** 2)

    smoothed = pd.Series(arr).ewm(span=4, adjust=False).mean().tolist()

    derivs = np.diff(smoothed).tolist()
    if len(derivs) >= 4:
        momentum = (sum(derivs[-2:]) / 2) - (sum(derivs[-4:-2]) / 2)
    else:
        momentum = 0.0

    volatility = float(np.std(arr[-8:], ddof=1)) if n >= 8 else float(np.std(arr, ddof=1))

    peak_idx   = int(np.argmax(arr))
    peak_ratio = float(arr[peak_idx])
    current    = float(arr[-1])
    peak_decay = (peak_ratio - current) / peak_ratio if peak_ratio > 0 else 0.0

    avg_short  = float(np.mean(arr))
    cv         = volatility / avg_short if avg_short > 0 else 0.0
    recent_avg = float(np.mean(arr[-4:]))
    prev_avg   = (
        float(np.mean(arr[-8:-4])) if n >= 8
        else float(np.mean(arr[:max(1, n - 4)]))
    )

    # ─── 3. 사이클 위치 ─────────────────────────────────────────────────────
    if nature == "TREND":
        if peak_decay >= 0.6:
            cycle = "FADED"
        elif peak_decay >= 0.3:
            cycle = "DECLINING"
        elif current >= peak_ratio * 0.85 and momentum <= 0:
            cycle = "PEAK"
        elif slope > 0 and r_squared > 0.5 and avg_short < 30:
            cycle = "EMERGING"
        elif slope > 0 and r_squared > 0.4:
            cycle = "RISING"
        else:
            cycle = "PEAK"
    else:  # STEADY
        if avg_short >= 55 and cv < 0.35:
            cycle = "SATURATED"
        elif slope > 0 and 30 <= avg_short < 60 and peak_decay < 0.5:
            cycle = "GROWING"
        else:
            cycle = "STABLE"

    # ─── 4. Verdict & confidence ───────────────────────────────────────────
    verdict, verdict_detail, confidence = _VERDICT_MAP.get(
        (nature, cycle), ("WAIT", "WAIT", 0.5)
    )
    if nature == "TREND" and r_squared < 0.3:
        confidence *= 0.8
    skip_ai = confidence >= 0.8

    # ─── 5. 예측 (EWMA 마지막값 + slope 외삽) ───────────────────────────────
    last_smooth = smoothed[-1]
    forecast = [
        {"week": i + 1, "ratio": round(max(0.0, last_smooth + slope * (i + 1)), 1)}
        for i in range(4)
    ]

    # ─── 6. EXIT 추정 ───────────────────────────────────────────────────────
    exit_week = None
    if cycle in ("DECLINING", "FADED") and current > 0 and slope < 0:
        weekly_drop = abs(slope)
        if weekly_drop > 0:
            target    = current * 0.5
            exit_week = max(1, round((current - target) / weekly_drop))

    # ─── 7. 변곡점 / 위험도 / 매핑 ─────────────────────────────────────────
    inflection = _find_inflection(smoothed)
    risk       = _compute_risk(nature, cycle, peak_decay, momentum, volatility)
    item_type  = _ITEM_TYPE_MAP.get((nature, cycle), "stable")
    stage      = _STAGE_MAP.get(cycle, "stable")

    # ─── 8. 계절성 감지 ─────────────────────────────────────────────────────
    seasonal = _detect_seasonal(ratios_l, weeks_long)
    if seasonal:
        phase = seasonal["seasonPhase"]
        # 계절성 메뉴가 시즌 접근 중인데 STOP으로 찍혔다면 AI에게 재판단 맡김
        if phase in ("pre_season", "approaching") and cycle in ("FADED", "DECLINING"):
            verdict        = "WAIT"
            verdict_detail = "SEASONAL_WAIT"
            confidence     = 0.5
            skip_ai        = False  # Gemini가 계절 맥락으로 최종 판단
        item_type = "seasonal"

    return {
        # 기존 필드 (UI 호환 — verdict는 반드시 GO/WAIT/STOP)
        "stage":          stage,
        "verdict":        verdict,
        "verdictDetail":  verdict_detail,  # 신규: CAUTION/VIABLE 등 세부 판정
        "exitWeek":       exit_week,
        "peakWeek":       peak_idx,
        "peakRatio":      round(peak_ratio, 1),
        "currentRatio":   round(current, 1),
        "avgRecent":      round(recent_avg, 1),
        "avgPrev":        round(prev_avg, 1),
        "momentum":       round(momentum, 2),
        "volatility":     round(volatility, 2),
        "peakDecay":      round(peak_decay, 3),
        "inflectionWeek": inflection,
        "forecast":       forecast,
        "riskScore":      risk,
        "itemType":       item_type,
        "avgAll":         round(avg_short, 1),
        # 신규 필드
        "nature":         nature,
        "cycle":          cycle,
        "confidence":     round(confidence, 2),
        "skipAI":         skip_ai,
        "rSquared":       round(r_squared, 3),
        "slope":          round(slope, 3),
        "peakToAvg":      round(peak_to_avg, 2),
        # 계절성
        "isSeasonal":     seasonal["isSeasonal"] if seasonal else False,
        "seasonPhase":    seasonal["seasonPhase"] if seasonal else None,
        "peakMonth":      seasonal["peakMonth"] if seasonal else None,
    }


def _empty_result() -> dict:
    return {
        "stage": "stable", "verdict": "WAIT", "verdictDetail": "WAIT",
        "exitWeek": None, "peakWeek": 0,
        "peakRatio": 0.0, "currentRatio": 0.0,
        "avgRecent": 0.0, "avgPrev": 0.0,
        "momentum": 0.0, "volatility": 0.0, "peakDecay": 0.0,
        "inflectionWeek": None, "forecast": [], "riskScore": 0,
        "itemType": "stable", "avgAll": 0.0,
        "nature": "STEADY", "cycle": "STABLE",
        "confidence": 0.0, "skipAI": False,
        "rSquared": 0.0, "slope": 0.0, "peakToAvg": 1.0,
    }


def _simple_result(ratios: list[float]) -> dict:
    peak_idx = ratios.index(max(ratios))
    avg = sum(ratios) / len(ratios)
    return {
        "stage": "stable", "verdict": "WAIT", "verdictDetail": "WAIT",
        "exitWeek": None, "peakWeek": peak_idx,
        "peakRatio": round(max(ratios), 1),
        "currentRatio": round(ratios[-1], 1),
        "avgRecent": round(avg, 1), "avgPrev": round(avg, 1),
        "momentum": 0.0, "volatility": 0.0, "peakDecay": 0.0,
        "inflectionWeek": None,
        "forecast": [
            {"week": i + 1, "ratio": round(ratios[-1], 1)} for i in range(4)
        ],
        "riskScore": 50, "itemType": "stable", "avgAll": round(avg, 1),
        "nature": "STEADY", "cycle": "STABLE",
        "confidence": 0.5, "skipAI": False,
        "rSquared": 0.0, "slope": 0.0, "peakToAvg": 1.0,
    }
