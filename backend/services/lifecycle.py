"""
수명주기 단계 판별 + 심층 트렌드 분석

12주 검색량 시계열에서 단순 단계 판정을 넘어
- 모멘텀(가속도)
- 변동성(VOLATILITY)
- 변곡점(추세 전환 주차)
- 4주 예측(선형회귀)
- 종합 위험도 0~100
까지 산출한다.
"""

from __future__ import annotations
import math


# ─── 보조 함수 ───────────────────────────────────────────────────────────────

def _moving_avg(values: list[float], window: int = 4) -> list[float]:
    result = []
    for i in range(len(values)):
        start = max(0, i - window + 1)
        result.append(sum(values[start : i + 1]) / (i - start + 1))
    return result


def _stdev(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    return math.sqrt(sum((v - mean) ** 2 for v in values) / (len(values) - 1))


def _linreg_forecast(values: list[float], steps: int = 4) -> list[float]:
    """단순 최소제곱 선형회귀로 다음 steps 주차 예측."""
    n = len(values)
    if n < 2:
        return [values[-1] if values else 0.0] * steps

    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = sum(values) / n
    num = sum((xs[i] - mean_x) * (values[i] - mean_y) for i in range(n))
    den = sum((xs[i] - mean_x) ** 2 for i in range(n))
    slope = num / den if den else 0.0
    intercept = mean_y - slope * mean_x

    return [
        max(0.0, intercept + slope * (n + i))
        for i in range(steps)
    ]


def _detect_inflection(smoothed: list[float]) -> int | None:
    """
    추세 전환점(변곡점)을 찾는다.
    1차 도함수 부호가 마지막으로 바뀐 인덱스 반환.
    """
    if len(smoothed) < 4:
        return None
    derivs = [smoothed[i] - smoothed[i - 1] for i in range(1, len(smoothed))]
    last_change = None
    for i in range(1, len(derivs)):
        if (derivs[i - 1] > 0 and derivs[i] < 0) or (derivs[i - 1] < 0 and derivs[i] > 0):
            last_change = i + 1
    return last_change


def _classify_item_type(
    ratios: list[float],
    stage: str,
    peak_decay: float,
    volatility: float,
    momentum: float,
    delta: float,
) -> str:
    """
    메뉴 본질 분류 (stage와 별개의 차원).

    - trending: 폭발적 상승 (변동성 크고 단기 가속 상승)
    - classic:  오래 안정 + 평균 검색량 높음 (충성 수요)
    - seasonal: 큰 변동성 + 주기적 패턴
    - growing:  점진적 상승
    - fading:   정점 대비 큰 하락 (저물어가는)
    - niche:    검색량 낮고 안정 (틈새)
    - stable:   기본값 (분류 불가)
    """
    if not ratios:
        return "stable"

    avg_all = sum(ratios) / len(ratios)
    cv = volatility / avg_all if avg_all > 0 else 0.0  # 변동계수

    # 폭발적 상승: 큰 변동 + 가속 + 4주 평균이 크게 올랐음
    if delta >= 8 and momentum >= 0.5 and cv >= 0.30:
        return "trending"

    # 한물감: 정점 대비 50% 이상 하락
    if peak_decay >= 0.5:
        return "fading"

    # 클래식: 평균 검색량 충분 + 변동성 매우 낮음
    if avg_all >= 35 and cv < 0.18 and abs(delta) < 5:
        return "classic"

    # 계절성: 매우 큰 변동성 (주기 검출은 12주로 제한적이라 CV 기반)
    if cv >= 0.55:
        return "seasonal"

    # 점진 상승
    if stage == "rising" or (delta >= 3 and momentum >= 0):
        return "growing"

    # 틈새: 검색량 낮고 안정
    if avg_all < 20 and cv < 0.30:
        return "niche"

    return "stable"


def _risk_score(
    stage: str,
    delta: float,
    peak_decay: float,
    volatility: float,
    momentum: float,
) -> int:
    """
    0(매우 안전) ~ 100(매우 위험) 종합 위험도.
    - peak_decay: 정점 대비 현재 하락률 (0~1) → 비중 40
    - delta:      최근 4주 vs 이전 4주 변화량       → 비중 25
    - momentum:   최근 가속도 (음수=악화)            → 비중 20
    - volatility: 변동성                              → 비중 15
    """
    decay_pts = max(0.0, min(1.0, peak_decay)) * 40.0
    delta_pts = max(0.0, min(20.0, -delta)) / 20.0 * 25.0
    momentum_pts = max(0.0, min(10.0, -momentum)) / 10.0 * 20.0
    volatility_pts = max(0.0, min(30.0, volatility)) / 30.0 * 15.0

    score = decay_pts + delta_pts + momentum_pts + volatility_pts

    # 단계별 가산/감산
    if stage == "rising":
        score *= 0.4
    elif stage == "stable":
        score *= 0.7
    elif stage == "peak":
        score = max(score, 35.0)
    elif stage == "declining":
        score = max(score, 50.0)

    return max(0, min(100, round(score)))


# ─── 메인 ────────────────────────────────────────────────────────────────────

def analyze_lifecycle(weeks: list[dict]) -> dict:
    """
    Returns:
        기존 필드 + 다음 신규 필드:
        - momentum:        최근 4주 가속도 (양수=상승가속, 음수=하락가속)
        - volatility:      표준편차 (이상치/안정성 지표)
        - peakDecay:       정점 대비 현재 하락률 (0.0~1.0)
        - inflectionWeek:  마지막 추세 전환 주차 (없으면 None)
        - forecast:        다음 4주 예측 [{week: int, ratio: float}, ...]
        - riskScore:       0~100 종합 위험도
    """
    if not weeks:
        return _empty_result()

    ratios = [float(w.get("ratio", 0)) for w in weeks]
    n = len(ratios)

    if n < 4:
        return _simple_result(ratios)

    smoothed = _moving_avg(ratios, 4)

    # 기본 지표
    recent_avg = sum(ratios[-4:]) / 4
    prev_avg   = sum(ratios[-8:-4]) / 4 if n >= 8 else sum(ratios[:max(1, n - 4)]) / max(1, n - 4)
    delta      = recent_avg - prev_avg

    derivs       = [smoothed[i] - smoothed[i - 1] for i in range(1, len(smoothed))]
    recent_deriv = sum(derivs[-4:]) / 4 if len(derivs) >= 4 else (derivs[-1] if derivs else 0.0)

    # 모멘텀(가속도): 최근 2주 derivs 변화
    if len(derivs) >= 4:
        recent2 = sum(derivs[-2:]) / 2
        prev2   = sum(derivs[-4:-2]) / 2
        momentum = recent2 - prev2
    else:
        momentum = 0.0

    volatility = _stdev(ratios[-8:]) if n >= 8 else _stdev(ratios)

    peak_idx   = ratios.index(max(ratios))
    peak_ratio = ratios[peak_idx]
    current    = ratios[-1]
    peak_decay = (peak_ratio - current) / peak_ratio if peak_ratio > 0 else 0.0

    # 단계 분류
    RISE_TH = 6.0
    FALL_TH = -6.0
    PEAK_TH = 0.80

    if delta >= RISE_TH and recent_deriv >= 0:
        stage, verdict = "rising", "GO"
    elif delta <= FALL_TH:
        stage, verdict = "declining", "STOP"
    elif current >= peak_ratio * PEAK_TH:
        stage, verdict = "peak", "WAIT"
    else:
        stage, verdict = "stable", "WAIT"

    # EXIT 시점 추정
    exit_week = None
    if stage == "declining" and current > 0:
        weekly_drop = abs(recent_deriv) if recent_deriv < 0 else abs(delta) / 4
        if weekly_drop > 0:
            target = current * 0.5
            exit_week = max(1, round((current - target) / weekly_drop))

    # 변곡점, 예측, 위험도, itemType
    inflection = _detect_inflection(smoothed)
    forecast_values = _linreg_forecast(ratios[-8:] if n >= 8 else ratios, steps=4)
    forecast = [
        {"week": i + 1, "ratio": round(v, 1)}
        for i, v in enumerate(forecast_values)
    ]
    risk = _risk_score(stage, delta, peak_decay, volatility, momentum)
    item_type = _classify_item_type(ratios, stage, peak_decay, volatility, momentum, delta)

    return {
        "stage":          stage,
        "verdict":        verdict,
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
        "avgAll":         round(sum(ratios) / len(ratios), 1),
    }


def _empty_result() -> dict:
    return {
        "stage": "stable", "verdict": "WAIT",
        "exitWeek": None, "peakWeek": 0,
        "peakRatio": 0.0, "currentRatio": 0.0,
        "avgRecent": 0.0, "avgPrev": 0.0,
        "momentum": 0.0, "volatility": 0.0, "peakDecay": 0.0,
        "inflectionWeek": None, "forecast": [], "riskScore": 0,
        "itemType": "stable", "avgAll": 0.0,
    }


def _simple_result(ratios: list[float]) -> dict:
    peak_idx = ratios.index(max(ratios))
    avg = sum(ratios) / len(ratios)
    return {
        "stage": "stable", "verdict": "WAIT",
        "exitWeek": None, "peakWeek": peak_idx,
        "peakRatio": round(max(ratios), 1),
        "currentRatio": round(ratios[-1], 1),
        "avgRecent": round(avg, 1),
        "avgPrev":   round(avg, 1),
        "momentum": 0.0, "volatility": 0.0, "peakDecay": 0.0,
        "inflectionWeek": None,
        "forecast": [{"week": i + 1, "ratio": round(ratios[-1], 1)} for i in range(4)],
        "riskScore": 50,
        "itemType": "stable",
        "avgAll": round(avg, 1),
    }
