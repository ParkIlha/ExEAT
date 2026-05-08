"""
/api/ask 라우터

키워드를 받아 트렌드 데이터 + 수명주기 분석 + AI 종합 판정을 반환한다.
데이터 소스: 네이버 DataLab(검색량) + 쇼핑인사이트 + 블로그 버즈 + 뉴스 + 구글 트렌드
"""

import concurrent.futures
import threading
import requests
from flask import Blueprint, request, jsonify

from services.google_trend import fetch_google_trend, compute_google_direction
from services.lifecycle import analyze_lifecycle
from services.ai import ask_ai
from services.synthetic_trend import synthetic_weeks

ask_bp = Blueprint("ask", __name__)

# ─── 데모 안전망: 인기 키워드 사전 캐시 ─────────────────────────────────
_DEMO_KEYWORDS = ["우베", "흑임자라떼", "크로플", "마라탕", "치킨"]
_result_cache: dict[str, dict] = {}
_cache_lock = threading.Lock()


def clear_ask_caches() -> None:
    """분석 결과 인메모리 캐시 비우기."""
    with _cache_lock:
        _result_cache.clear()


def _build_result(keyword: str) -> dict | None:
    """단일 키워드 전체 분석 결과를 반환. 캐싱 대상."""
    try:
        google_weeks = fetch_google_trend(keyword, weeks=12) or []
        google_dir   = compute_google_direction(google_weeks)
        lifecycle    = analyze_lifecycle(google_weeks)
        divergence     = _compute_signal_divergence(
            lifecycle.get("stage", "stable"), [],
            None, None, google_dir,
        )
        ai_result = ask_ai(
            keyword, lifecycle, google_weeks,
            shopping=None,
            blog=None, news=None, google_dir=google_dir,
        )
        resp = {
            "keyword": keyword,
            "weeks":     google_weeks,
            **lifecycle,
            "verdict":       ai_result["verdict"],
            "summary":       ai_result["summary"],
            "reasoning":     ai_result["reasoning"],
            "dataInsight":   ai_result.get("dataInsight", ""),
            "marketContext": ai_result.get("marketContext", ""),
            "aiProvider":    ai_result.get("aiProvider", "unknown"),
            "signalDivergence": divergence,
            "actionPlan": {
                "immediate":    ai_result["immediate"],
                "shortterm":    ai_result["shortterm"],
                "midterm":      ai_result["midterm"],
                "worstCase":    ai_result["worstCase"],
                "alternatives": ai_result["alternatives"],
            },
        }
        if google_weeks:
            resp["googleWeeks"] = google_weeks
        return resp
    except Exception as e:
        print(f"[warm] '{keyword}' 캐시 실패: {e}")
        return None


def _warm_cache(keywords: list[str]) -> None:
    """백그라운드 스레드에서 키워드 목록을 순차 캐싱."""
    for kw in keywords:
        with _cache_lock:
            if kw in _result_cache:
                continue
        print(f"[warm] '{kw}' 사전 캐싱 시작...")
        result = _build_result(kw)
        if result:
            with _cache_lock:
                _result_cache[kw] = result
            print(f"[warm] '{kw}' 캐시 완료")


@ask_bp.route("/warm", methods=["POST"])
def warm():
    """프론트엔드가 앱 시작 시 호출하는 사전 캐시 엔드포인트."""
    data = request.get_json(silent=True) or {}
    keywords = data.get("keywords", _DEMO_KEYWORDS)
    if not isinstance(keywords, list):
        keywords = _DEMO_KEYWORDS
    keywords = [k for k in keywords if isinstance(k, str) and k.strip()][:10]

    cached    = [k for k in keywords if k in _result_cache]
    to_fetch  = [k for k in keywords if k not in _result_cache]

    if to_fetch:
        t = threading.Thread(target=_warm_cache, args=(to_fetch,), daemon=True)
        t.start()

    return jsonify({
        "status": "started",
        "cached": cached,
        "fetching": to_fetch,
    })


@ask_bp.route("/warm/status", methods=["GET"])
def warm_status():
    from services.ai import _ai_cache, _AI_CACHE_TTL
    import time
    with _cache_lock:
        data_keys = list(_result_cache.keys())
    ai_keys = [k for k, (_, ts) in _ai_cache.items() if (time.time() - ts) < _AI_CACHE_TTL]
    return jsonify({
        "dataCached": data_keys,
        "aiCached": ai_keys,
        "dataCount": len(data_keys),
        "aiCount": len(ai_keys),
    })


def _compute_signal_divergence(
    naver_stage: str,
    shopping: list,
    blog: dict | None,
    news: dict | None,
    google_dir: str,
) -> dict:
    """
    4개 신호의 방향성을 비교해 거품 경보 / 실수요 확인 / 미디어 드리븐 등을 판별.
    """
    signals_up = 0
    signals_down = 0
    signals_total = 1  # naver DataLab은 항상 있음

    # 쇼핑 신호
    if shopping:
        recent_shop = sum(s["ratio"] for s in shopping[-4:]) / 4
        prev_shop = sum(s["ratio"] for s in shopping[-8:-4]) / 4 if len(shopping) >= 8 else recent_shop
        shop_delta = recent_shop - prev_shop
        signals_total += 1
        if shop_delta >= 3:
            signals_up += 1
        elif shop_delta <= -3:
            signals_down += 1

    # 블로그 신호
    blog_level = blog.get("buzzLevel") if blog else None
    if blog:
        signals_total += 1
        if blog_level == "high":
            signals_up += 1
        elif blog_level == "low":
            signals_down += 1

    # 구글 트렌드 신호
    if google_dir != "unknown":
        signals_total += 1
        if google_dir == "rising":
            signals_up += 1
        elif google_dir == "declining":
            signals_down += 1

    # DataLab 자체 방향
    if naver_stage == "rising":
        signals_up += 1
    elif naver_stage == "declining":
        signals_down += 1

    # 판별 로직
    divergence_type = "neutral"
    if naver_stage in ("rising", "peak") and signals_down >= 2:
        divergence_type = "bubble"       # 검색↑ 실수요↓ → 거품 경보
    elif naver_stage == "rising" and signals_up >= 2:
        divergence_type = "confirmed"    # 모든 신호 일치 → 실수요 확인
    elif naver_stage == "declining" and blog_level in ("high", "medium"):
        divergence_type = "loyal"        # 검색↓ but 블로그↑ → 충성층 존재
    elif news and news.get("mediaLevel") == "high" and blog_level == "low":
        divergence_type = "media_driven" # 뉴스↑ but UGC↓ → 미디어만 주목

    return {
        "type": divergence_type,
        "signalsUp": signals_up,
        "signalsDown": signals_down,
        "signalsTotal": signals_total,
    }


@ask_bp.route("/ask", methods=["POST"])
def ask():
    data = request.get_json(silent=True) or {}
    keyword     = (data.get("keyword") or "").strip()
    user_profile = data.get("userProfile")  # {"businessType": "cafe", "region": "서울"}

    if not keyword:
        return jsonify({"error": "keyword 가 필요합니다."}), 400

    # 캐시 히트 (데모 키워드 사전 로드된 경우)
    # 단, AI 결과가 있는 경우만 캐시 사용 (알고리즘만인 경우 AI 재호출)
    with _cache_lock:
        if keyword in _result_cache:
            cached = _result_cache[keyword]
            provider = cached.get("aiProvider", "")
            if "algorithm" not in provider:
                print(f"[ask] '{keyword}' 캐시 히트 (AI 포함)")
                result = dict(cached)
                result["fromCache"] = True
                return jsonify(result)
            else:
                print(f"[ask] '{keyword}' 캐시 있지만 알고리즘 전용 → AI 재분석")

    try:
        # 1. Google Trends (메인)
        google_weeks = fetch_google_trend(keyword, weeks=12) or []
        data_source = "google_trends"
        if not google_weeks:
            google_weeks = synthetic_weeks(keyword, weeks=12)
            data_source = "synthetic"

        google_dir = compute_google_direction(google_weeks)

        # 2. 수명주기 + 심층 분석
        lifecycle = analyze_lifecycle(google_weeks)

        # 3. 신호 교차 분석 (네이버 계열 제거)
        divergence = _compute_signal_divergence(
            lifecycle.get("stage", "stable"),
            [],
            None,
            None,
            google_dir,
        )

        # 4. AI 액션 플랜 (구글 시계열 + lifecycle 전달)
        ai_result = ask_ai(
            keyword, lifecycle, google_weeks,
            shopping=None,
            blog=None,
            news=None,
            google_dir=google_dir,
            user_profile=user_profile,
        )

        resp = {
            "keyword":       keyword,
            "weeks":         google_weeks,
            **lifecycle,
            "dataSource":    data_source,
            "verdict":       ai_result["verdict"],
            "summary":       ai_result["summary"],
            "reasoning":     ai_result["reasoning"],
            "dataInsight":   ai_result.get("dataInsight", ""),
            "marketContext": ai_result.get("marketContext", ""),
            "aiProvider":    ai_result.get("aiProvider", "unknown"),
            "signalDivergence": divergence,
            "actionPlan": {
                "immediate":    ai_result["immediate"],
                "shortterm":    ai_result["shortterm"],
                "midterm":      ai_result["midterm"],
                "worstCase":    ai_result["worstCase"],
                "alternatives": ai_result["alternatives"],
            },
        }

        resp["googleWeeks"] = google_weeks

        # AI 결과 포함 시 캐시 업데이트 (다음 호출은 즉시 응답)
        if "gemini" in resp.get("aiProvider", "") and not user_profile:
            with _cache_lock:
                _result_cache[keyword] = resp

        return jsonify(resp)

    except ValueError as e:
        return jsonify({"error": str(e)}), 500

    except Exception as e:
        return jsonify({"error": "서버 오류", "detail": str(e)}), 500
