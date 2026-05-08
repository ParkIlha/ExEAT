"""
요즘 뜨는 메뉴 분석 서비스

후보 키워드를 일괄 트렌드 분석 후 상승률 순으로 정렬한다.
인메모리 캐시(1시간) — 첫 호출만 느리고 이후는 즉시 응답.
"""

import time
from services.google_trend import fetch_google_trend
from services.lifecycle import analyze_lifecycle
from services.synthetic_trend import synthetic_weeks

try:
    from services.keyword_samples import TRENDING_ITEMS as _STATIC_TRENDING
except ImportError:
    _STATIC_TRENDING = None

# 후보 키워드 (2025~2026 외식 트렌드 메뉴 기준, 50개)
CANDIDATES = [
    # 여름 시즌 상승 (5~8월 GO 유력)
    "빙수", "망고빙수", "팥빙수", "딸기빙수",
    "냉면", "물냉면", "콜드브루", "레모네이드",
    "복숭아아이스티", "스무디", "아사이볼",
    # 2025~2026 신흥 트렌드
    "두바이초콜릿", "크룽지", "흑임자라떼", "말차라떼",
    "수제버거", "스시버거", "타르트", "마들렌", "휘낭시에",
    "바스크치즈케이크", "얼그레이라떼", "우베라떼",
    # 성장 중인 안착 메뉴
    "크로플", "소금빵", "베이글", "도넛", "마카롱",
    "하이볼", "감바스", "로제파스타", "크림파스타",
    "닭강정", "닭갈비",
    # 스테디·포화 검증용
    "치킨", "떡볶이", "마라탕", "삼겹살", "순대",
    "라면", "비빔밥", "삼계탕", "족발",
    # 관찰 대상
    "마라샹궈", "탕후루", "흑당버블티",
    "말차케이크", "찹쌀도넛", "크레이프",
]

# 계절성 키워드 — 현재 시즌(5~8월)에 보너스 부여
_SEASONAL_BOOST = {
    "빙수", "망고빙수", "팥빙수", "딸기빙수",
    "냉면", "물냉면", "콜드브루", "레모네이드",
    "복숭아아이스티", "스무디", "아사이볼",
}

_CACHE: dict = {"ts": 0.0, "data": []}
_TTL = 60 * 60   # 1시간


def clear_trending_cache() -> None:
    _CACHE["data"] = []
    _CACHE["ts"] = 0.0


def get_trending(top_n: int = 5, force: bool = False) -> list[dict]:
    """후보 키워드 분석 후 상승률 순 정렬, 상위 top_n 반환."""
    if _STATIC_TRENDING:
        return _STATIC_TRENDING[:top_n]

    if not force and _CACHE["data"] and time.time() - _CACHE["ts"] < _TTL:
        return _CACHE["data"][:top_n]

    results: list[dict] = []
    for kw in CANDIDATES:
        try:
            weeks = fetch_google_trend(kw, weeks=12)
            if not weeks:
                weeks = synthetic_weeks(kw, weeks=12)
            lc = analyze_lifecycle(weeks)
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

    # 상승률 + 계절 보너스 + GO 우선 정렬
    def _trend_score(x: dict) -> float:
        score = x["delta"] * 2 + x["current"] * 0.1
        if x["keyword"] in _SEASONAL_BOOST:
            score += 15
        if x["verdict"] == "GO":
            score += 30
        elif x["verdict"] == "WAIT":
            score += 5
        return score

    results.sort(key=_trend_score, reverse=True)

    _CACHE["ts"] = time.time()
    _CACHE["data"] = results
    return results[:top_n]
