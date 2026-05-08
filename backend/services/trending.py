"""
요즘 뜨는 메뉴 분석 서비스

후보 키워드를 일괄 트렌드 분석 후 상승률 순으로 정렬한다.
인메모리 캐시(1시간) — 첫 호출만 느리고 이후는 즉시 응답.
"""

import time
from services.naver import fetch_trend
from services.lifecycle import analyze_lifecycle

# 후보 키워드 (외식 트렌드 메뉴, 다양한 카테고리 균형)
CANDIDATES = [
    # 디저트
    "두바이초콜릿", "탕후루", "약과", "크룽지", "카이막", "티라미수",
    # 식음료
    "마라탕", "양꼬치", "쌀국수", "하이볼", "흑당버블티",
    # 베이커리
    "베이글", "크로플", "도넛", "스모어",
]

_CACHE: dict = {"ts": 0.0, "data": []}
_TTL = 60 * 60   # 1시간


def get_trending(top_n: int = 5, force: bool = False) -> list[dict]:
    """후보 키워드 분석 후 상승률 순 정렬, 상위 top_n 반환."""
    if not force and _CACHE["data"] and time.time() - _CACHE["ts"] < _TTL:
        return _CACHE["data"][:top_n]

    results: list[dict] = []
    for kw in CANDIDATES:
        try:
            trend = fetch_trend(kw, weeks=8)
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
