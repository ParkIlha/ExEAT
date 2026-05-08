"""
/api/ask 라우터

키워드를 받아 트렌드 데이터 + 수명주기 분석 + AI 종합 판정을 반환한다.
데이터 소스: Google Trends(12주 메인) + 네이버 DataLab(52주 본질 분류용)
캐시: 파일 기반 일일 캐시(24h) + 인메모리 캐시(데모 warm용)
"""

import threading
from flask import Blueprint, request, jsonify

from services import cache as file_cache
from services.google_trend import fetch_google_trend, compute_google_direction
from services.naver import fetch_trend as fetch_naver_trend, fetch_long_range
from services.lifecycle import analyze_lifecycle
from services.ai import ask_ai
from services.synthetic_trend import synthetic_weeks

ask_bp = Blueprint("ask", __name__)

# ─── 데모 안전망: 인기 키워드 사전 인메모리 캐시 ────────────────────────────
_DEMO_KEYWORDS = ["우베", "흑임자라떼", "크로플", "마라탕", "치킨"]
_result_cache: dict[str, dict] = {}
_cache_lock = threading.Lock()


def clear_ask_caches() -> None:
    """분석 결과 인메모리 캐시 비우기."""
    with _cache_lock:
        _result_cache.clear()


def _auto_reasoning(result: dict) -> str:
    """skipAI=True일 때 알고리즘만으로 reasoning 자동 생성."""
    nature    = result["nature"]
    cycle     = result["cycle"]
    decay_pct = round(result["peakDecay"] * 100)
    avg       = result["avgAll"]
    r2        = result["rSquared"]

    templates = {
        ("TREND", "EMERGING"):
            f"검색량이 빠르게 상승 중이며 평균 검색량({avg})은 아직 낮아 "
            f"트렌드 초입 단계로 판단됩니다. 진입 타이밍 양호.",
        ("TREND", "RISING"):
            f"12주 우상향 추세, 통계적 신뢰도(R²) {r2}. "
            f"트렌드 확산기 진입 구간으로 판단됩니다.",
        ("TREND", "DECLINING"):
            f"정점 대비 {decay_pct}% 하락. 추세 반전이 진행 중이며 "
            f"검색 관심도가 빠르게 빠지고 있습니다.",
        ("TREND", "FADED"):
            f"정점 대비 {decay_pct}% 하락한 끝물 메뉴입니다. "
            f"신규 진입 시 회수 가능성이 매우 낮습니다.",
        ("STEADY", "SATURATED"):
            f"1년 평균 검색량 {avg}, 변동성 낮은 포화 시장입니다. "
            f"신규 진입 시 차별화 전략이 필수입니다.",
        ("STEADY", "GROWING"):
            f"꾸준한 우상향 추세를 보이는 안정 성장 메뉴입니다. "
            f"위험도 낮은 진입 구간.",
        ("STEADY", "STABLE"):
            f"변동 적고 안정적인 메뉴입니다. "
            f"트렌드 사이클과 무관하게 운영 가능합니다.",
    }
    return templates.get((nature, cycle), "분석 결과를 검토하세요.")


def _build_result(keyword: str) -> dict | None:
    """단일 키워드 전체 분석 결과를 반환. warm 캐싱 대상."""
    try:
        google_weeks = fetch_google_trend(keyword, weeks=12) or []
        google_dir   = compute_google_direction(google_weeks)
        lifecycle    = analyze_lifecycle(google_weeks)
        divergence   = _compute_signal_divergence(
            lifecycle.get("stage", "stable"), [],
            None, None, google_dir,
        )
        ai_result = ask_ai(
            keyword, lifecycle, google_weeks,
            shopping=None,
            blog=None, news=None, google_dir=google_dir,
            skip_ai=True,  # warm 캐시는 Gemini 호출 안 함 (비용 절감)
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
    """사전 캐시 엔드포인트 — 비활성화 (사용자 검색 시에만 캐시)."""
    return jsonify({"status": "disabled", "cached": [], "fetching": []})


@ask_bp.route("/warm/status", methods=["GET"])
def warm_status():
    from services.ai import _ai_cache, _AI_CACHE_TTL
    import time
    with _cache_lock:
        data_keys = list(_result_cache.keys())
    ai_keys = [k for k, (_, ts) in _ai_cache.items() if (time.time() - ts) < _AI_CACHE_TTL]
    return jsonify({
        "dataCached":  data_keys,
        "aiCached":    ai_keys,
        "dataCount":   len(data_keys),
        "aiCount":     len(ai_keys),
    })


def _compute_signal_divergence(
    naver_stage: str,
    shopping: list,
    blog: dict | None,
    news: dict | None,
    google_dir: str,
) -> dict:
    """4개 신호의 방향성을 비교해 거품 경보 / 실수요 확인 / 미디어 드리븐 등을 판별."""
    signals_up    = 0
    signals_down  = 0
    signals_total = 1  # naver DataLab 항상 있음

    if shopping:
        recent_shop = sum(s["ratio"] for s in shopping[-4:]) / 4
        prev_shop   = sum(s["ratio"] for s in shopping[-8:-4]) / 4 if len(shopping) >= 8 else recent_shop
        shop_delta  = recent_shop - prev_shop
        signals_total += 1
        if shop_delta >= 3:
            signals_up += 1
        elif shop_delta <= -3:
            signals_down += 1

    blog_level = blog.get("buzzLevel") if blog else None
    if blog:
        signals_total += 1
        if blog_level == "high":
            signals_up += 1
        elif blog_level == "low":
            signals_down += 1

    if google_dir != "unknown":
        signals_total += 1
        if google_dir == "rising":
            signals_up += 1
        elif google_dir == "declining":
            signals_down += 1

    if naver_stage == "rising":
        signals_up += 1
    elif naver_stage == "declining":
        signals_down += 1

    divergence_type = "neutral"
    if naver_stage in ("rising", "peak") and signals_down >= 2:
        divergence_type = "bubble"
    elif naver_stage == "rising" and signals_up >= 2:
        divergence_type = "confirmed"
    elif naver_stage == "declining" and blog_level in ("high", "medium"):
        divergence_type = "loyal"
    elif news and news.get("mediaLevel") == "high" and blog_level == "low":
        divergence_type = "media_driven"

    return {
        "type":         divergence_type,
        "signalsUp":    signals_up,
        "signalsDown":  signals_down,
        "signalsTotal": signals_total,
    }


@ask_bp.route("/ask", methods=["POST"])
def ask():
    data         = request.get_json(silent=True) or {}
    keyword      = (data.get("keyword") or "").strip()
    user_profile = data.get("userProfile")

    if not keyword:
        return jsonify({"error": "keyword 가 필요합니다."}), 400

    # ── 1. 파일 캐시 확인 (24h TTL, user_profile 없는 일반 조회만) ────────────
    if not user_profile:
        cached = file_cache.load(keyword)
        if cached:
            cached["fromCache"] = True
            print(f"[ask] '{keyword}' 파일캐시 히트")
            return jsonify(cached)

    # ── 2. 인메모리 캐시 확인 (데모 warm 결과) ───────────────────────────────
    with _cache_lock:
        if keyword in _result_cache:
            mem_cached = _result_cache[keyword]
            provider   = mem_cached.get("aiProvider", "")
            if "algorithm" not in provider:
                print(f"[ask] '{keyword}' 인메모리 캐시 히트 (AI 포함)")
                result = dict(mem_cached)
                result["fromCache"] = True
                return jsonify(result)

    try:
        # ── 3. 네이버 DataLab 26주 (메인 시계열) ─────────────────────────────
        try:
            naver_result = fetch_naver_trend(keyword, weeks=26)
            main_weeks   = naver_result.get("weeks", []) if isinstance(naver_result, dict) else []
        except Exception as naver_err:
            print(f"[ask] 네이버 fetch_trend 실패: {naver_err}")
            main_weeks = []
        data_source  = "naver_datalab" if main_weeks else ""

        if not main_weeks:
            # 폴백 1: 구글 트렌드
            main_weeks  = fetch_google_trend(keyword, weeks=12) or []
            data_source = "google_trends"

        if not main_weeks:
            # 폴백 2: 합성 데이터 (완전 오프라인 데모용)
            main_weeks  = synthetic_weeks(keyword, weeks=12)
            data_source = "synthetic"

        print(f"[ask] '{keyword}' 데이터 소스: {data_source} ({len(main_weeks)}주)")

        # 구글 트렌드 방향성은 교차 검증용으로만 (실패 시 unknown)
        google_weeks_cross = fetch_google_trend(keyword, weeks=12) or []
        google_dir = compute_google_direction(google_weeks_cross)

        # ── 4. 네이버 DataLab 52주 (본질 분류용, 실패 시 26주로 폴백) ────────
        naver_long = fetch_long_range(keyword) or None
        if not naver_long and len(main_weeks) >= 20:
            naver_long = main_weeks  # 26주 데이터를 장기 분류에 활용

        # ── 5. 수명주기 분석 ─────────────────────────────────────────────
        lifecycle = analyze_lifecycle(main_weeks, naver_long)

        # ── 6. 신호 교차 분석 ─────────────────────────────────────────────
        divergence = _compute_signal_divergence(
            lifecycle.get("stage", "stable"),
            [], None, None, google_dir,
        )

        # ── 7. AI 스킵 분기 ───────────────────────────────────────────────
        if lifecycle.get("skipAI") and not user_profile:
            # 명확한 케이스 → 알고리즘 + 자동 reasoning (Gemini 호출 안 함)
            ai_result = ask_ai(
                keyword, lifecycle, main_weeks,
                shopping=None, blog=None, news=None,
                google_dir=google_dir,
                skip_ai=True,
            )
            ai_result["reasoning"] = _auto_reasoning(lifecycle)
            print(f"[ask] '{keyword}' skipAI=True → 알고리즘 처리")
        else:
            # 경계 케이스(PEAK 등) → Gemini 호출
            ai_result = ask_ai(
                keyword, lifecycle, main_weeks,
                shopping=None, blog=None, news=None,
                google_dir=google_dir,
                user_profile=user_profile,
            )
            print(f"[ask] '{keyword}' skipAI=False → AI 처리 ({ai_result.get('aiProvider')})")

        resp = {
            "keyword":      keyword,
            "weeks":        main_weeks,
            **lifecycle,
            "dataSource":       data_source,
            "verdict":          ai_result["verdict"],
            "summary":          ai_result["summary"],
            "reasoning":        ai_result["reasoning"],
            "dataInsight":      ai_result.get("dataInsight", ""),
            "marketContext":    ai_result.get("marketContext", ""),
            "aiProvider":       ai_result.get("aiProvider", "unknown"),
            "signalDivergence": divergence,
            "fromCache":        False,
            "actionPlan": {
                "immediate":    ai_result["immediate"],
                "shortterm":    ai_result["shortterm"],
                "midterm":      ai_result["midterm"],
                "worstCase":    ai_result["worstCase"],
                "alternatives": ai_result["alternatives"],
            },
        }
        if google_weeks_cross:
            resp["googleWeeks"] = google_weeks_cross

        # ── 8. 파일 캐시 저장 (user_profile 없는 경우만) ───────────────────
        if not user_profile:
            file_cache.save(keyword, resp)
            # 인메모리도 갱신 (Gemini 결과인 경우)
            if "gemini" in resp.get("aiProvider", ""):
                with _cache_lock:
                    _result_cache[keyword] = resp

        return jsonify(resp)

    except ValueError as e:
        return jsonify({"error": str(e)}), 500

    except Exception as e:
        return jsonify({"error": "서버 오류", "detail": str(e)}), 500
