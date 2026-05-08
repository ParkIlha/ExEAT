"""
GET /api/recommendations
알고리즘(lifecycle)을 통과한 추천 메뉴 Top 5 반환.

- 서버 시작 시 백그라운드에서 후보 키워드 분석
- 파일 캐시 활용 (기존 ask.py 캐시와 공유)
- 결과는 인메모리에 6시간 유지
"""

from __future__ import annotations

import threading
import time
from flask import Blueprint, jsonify

from services import cache as file_cache
from services.naver import fetch_trend as fetch_naver_trend, fetch_long_range
from services.google_trend import fetch_google_trend, compute_google_direction
from services.lifecycle import analyze_lifecycle
from services.synthetic_trend import synthetic_weeks

try:
    from services.keyword_samples import RECOMMENDED_ITEMS as _STATIC_RECOMMENDED
except ImportError:
    _STATIC_RECOMMENDED = None

recommendations_bp = Blueprint("recommendations", __name__)

# ── 후보 키워드 풀 (50개) ─────────────────────────────────────────────────────
KEYWORD_POOL = [
    # 여름 시즌 (5~8월 GO 유력)
    "빙수", "망고빙수", "팥빙수", "딸기빙수", "아사이볼",
    "냉면", "물냉면", "콜드브루", "레모네이드", "복숭아아이스티",
    # 음료·카페
    "흑임자라떼", "말차라떼", "우베라떼", "얼그레이라떼", "스무디",
    # 디저트·베이커리
    "크로플", "소금빵", "마카롱", "휘낭시에", "바스크치즈케이크",
    "타르트", "마들렌", "크룽지", "찹쌀도넛", "크레이프",
    # 2025~2026 트렌드
    "두바이초콜릿", "수제버거", "스시버거", "닭강정", "닭갈비",
    # 푸드·식사
    "마라탕", "로제파스타", "크림파스타", "감바스", "한우타코야키",
    # 스낵·길거리
    "떡볶이", "핫도그", "타코야키", "붕어빵", "순대",
    # 주류·안주
    "하이볼", "하이볼안주", "이자카야",
    # 클래식 스테디
    "치킨", "삼겹살", "라면", "비빔밥", "삼계탕",
]

# 현재 시즌(5~8월) 계절 키워드
_SEASONAL_KEYWORDS = {
    "빙수", "망고빙수", "팥빙수", "딸기빙수", "아사이볼",
    "냉면", "물냉면", "콜드브루", "레모네이드", "복숭아아이스티", "스무디",
}

# ── 인메모리 결과 캐시 (6시간) ────────────────────────────────────────────────
_CACHE_TTL = 6 * 3600
_cache: dict = {"items": [], "updated_at": 0.0}
_lock = threading.Lock()


def _analyze_one(keyword: str) -> dict | None:
    """단일 키워드 lifecycle 분석. 파일 캐시 우선 사용."""
    cached = file_cache.load(keyword)
    if cached:
        return cached

    try:
        try:
            naver_result = fetch_naver_trend(keyword, weeks=52)
            weeks = naver_result.get("weeks", []) if isinstance(naver_result, dict) else []
        except Exception:
            weeks = []

        if not weeks:
            weeks = fetch_google_trend(keyword, weeks=12) or []
        if not weeks:
            weeks = synthetic_weeks(keyword, weeks=12)

        naver_long = fetch_long_range(keyword) or None
        if not naver_long and len(weeks) >= 20:
            naver_long = weeks

        lc = analyze_lifecycle(weeks, naver_long)
        google_dir = compute_google_direction(fetch_google_trend(keyword, weeks=12) or [])

        result = {
            "keyword":   keyword,
            "verdict":   lc.get("verdict", "WAIT"),
            "nature":    lc.get("nature", "STEADY"),
            "cycle":     lc.get("cycle", "STABLE"),
            "stage":     lc.get("stage", "stable"),
            "itemType":  lc.get("itemType", "stable"),
            "riskScore": lc.get("riskScore", 50),
            "confidence": lc.get("confidence", 0.5),
            "isSeasonal": lc.get("isSeasonal", False),
            "seasonPhase": lc.get("seasonPhase", ""),
            "currentRatio": lc.get("currentRatio", 0),
            "peakDecay":    lc.get("peakDecay", 0),
        }
        file_cache.save(keyword, {**result, "weeks": weeks})
        return result
    except Exception as e:
        print(f"[recommendations] '{keyword}' 분석 실패: {e}")
        return None


def _score(item: dict) -> float:
    """추천 순위 점수. 높을수록 우선."""
    verdict      = item.get("verdict", "WAIT")
    cycle        = item.get("cycle", "STABLE")
    conf         = item.get("confidence", 0.5)
    risk         = item.get("riskScore", 50)
    is_seasonal  = item.get("isSeasonal", False)
    season_phase = item.get("seasonPhase", "")
    keyword      = item.get("keyword", "")

    base = {"GO": 100, "WAIT": 40, "STOP": 0}.get(verdict, 0)
    cycle_bonus = {"RISING": 20, "EMERGING": 15, "GROWING": 10}.get(cycle, 0)

    # 계절 보너스 — 현재 시즌 진입/정점 메뉴 우선
    season_bonus = 0
    if keyword in _SEASONAL_KEYWORDS:
        season_bonus += 25
    if is_seasonal and season_phase in ("entering", "peak"):
        season_bonus += 15

    return base + cycle_bonus + conf * 20 - risk * 0.3 + season_bonus


def _refresh() -> None:
    """후보 키워드 전체 분석 후 인메모리 캐시 갱신."""
    print(f"[recommendations] 백그라운드 분석 시작 ({len(KEYWORD_POOL)}개)…")
    results = []
    for kw in KEYWORD_POOL:
        r = _analyze_one(kw)
        if r:
            results.append(r)
        time.sleep(0.4)  # rate limit 방지

    # GO 우선, 점수 기준 정렬
    ranked = sorted(results, key=_score, reverse=True)

    with _lock:
        _cache["items"] = ranked
        _cache["updated_at"] = time.time()
    print(f"[recommendations] 분석 완료 — {len(ranked)}개 결과 저장")


def start_background_refresh() -> None:
    """서버 시작 시 백그라운드 스레드로 분석 시작."""
    t = threading.Thread(target=_refresh, daemon=True, name="rec-refresh")
    t.start()


# ── 엔드포인트 ────────────────────────────────────────────────────────────────

@recommendations_bp.route("/recommendations", methods=["GET"])
def get_recommendations():
    if _STATIC_RECOMMENDED:
        return jsonify({
            "items": _STATIC_RECOMMENDED[:5],
            "ready": True,
            "updatedAt": int(time.time()),
        })

    with _lock:
        items = list(_cache["items"])
        updated_at = _cache["updated_at"]
        ready = len(items) > 0

    if not ready:
        return jsonify({"items": [], "ready": False})

    go_items   = [i for i in items if i.get("verdict") == "GO"][:5]
    wait_items = [i for i in items if i.get("verdict") == "WAIT"]

    top5 = go_items
    if len(top5) < 5:
        top5 += wait_items[:5 - len(top5)]

    return jsonify({
        "items": top5,
        "ready": True,
        "updatedAt": int(updated_at),
    })
