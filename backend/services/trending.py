"""
요즘 뜨는 메뉴 분석 서비스

후보 키워드를 일괄 트렌드 분석 후 상승률 순으로 정렬한다.
인메모리 캐시(1시간) — 첫 호출만 느리고 이후는 즉시 응답.
"""

import time
from services.naver import fetch_trend
from services.lifecycle import analyze_lifecycle

# 후보 키워드 (2025~2026 외식 트렌드 메뉴 기준)
CANDIDATES = [
    # 2025~2026 상승 트렌드
    "우베",  "흑임자라떼", "말차", "타르트", "크룽지",
    # 안착 중인 스테디 (steady_emerging/safe 검증용)
    "크로플", "베이글", "도넛", "마라탕", "로제파스타",
    # 클래식·포화 스테디 (steady_saturated 검증용)
    "치킨", "떡볶이", "삼겹살",
    # 지켜볼 것들
    "마라샹궈", "하이볼", "파스타", "흑당버블티",
]

_CACHE: dict = {"ts": 0.0, "data": []}
_TTL = 60 * 60   # 1시간


def clear_trending_cache() -> None:
    _CACHE["data"] = []
    _CACHE["ts"] = 0.0


def get_trending(top_n: int = 5, force: bool = False) -> list[dict]:
    """후보 키워드 분석 후 상승률 순 정렬, 상위 top_n 반환."""
    if not force and _CACHE["data"] and time.time() - _CACHE["ts"] < _TTL:
        return _CACHE["data"][:top_n]

    results: list[dict] = []
    for kw in CANDIDATES:
        try:
            trend = fetch_trend(kw, weeks=12)
            lc = analyze_lifecycle(trend["weeks"])
            delta = lc.get("avgRecent", 0) - lc.get("avgPrev", 0)
            results.append({
                "keyword":   kw,
                "delta":     round(delta, 1),
                "current":   lc.get("currentRatio", 0),
                "peak":      lc.get("peakRatio", 0),
                "stage":     lc.get("stage", "stable"),
                "itemType":  lc.get("itemType", "stable"),
                "verdict":   lc.get("verdict", "WAIT"),
                "riskScore": lc.get("riskScore", 50),
            })
        except Exception as e:
            print(f"[trending] {kw} skipped: {e}")
            continue

    # 상승률 우선, 동일 시 현재 검색량
    results.sort(key=lambda x: (x["delta"], x["current"]), reverse=True)

    _CACHE["ts"] = time.time()
    _CACHE["data"] = results
    return results[:top_n]
