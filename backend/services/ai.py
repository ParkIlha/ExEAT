"""
AI 분석 서비스 — Gemini 기반 구조화 진단 + 액션 플랜

응답 형식: JSON (verdict, summary, immediate, shortterm, midterm, worstCase, alternatives)
폴백 체인: Gemini 2.5 Flash → 2.0 Flash → 2.0 Flash Lite → 알고리즘
캐시: 동일 keyword + stage + itemType 24시간 인메모리 캐시
"""

import os
import json
import re
import time

# ─── AI 결과 인메모리 캐시 (24시간 TTL) ─────────────────────────────────────
# 같은 keyword + stage + itemType → 동일 AI 응답 재사용
_ai_cache: dict[str, tuple[dict, float]] = {}
_AI_CACHE_TTL = 60 * 60 * 24  # 24시간


def _cache_key(keyword: str, lifecycle: dict) -> str:
    return f"{keyword}:{lifecycle.get('stage')}:{lifecycle.get('itemType')}"


def _get_ai_cache(key: str) -> dict | None:
    entry = _ai_cache.get(key)
    if entry and (time.time() - entry[1]) < _AI_CACHE_TTL:
        return dict(entry[0])
    return None


def _set_ai_cache(key: str, result: dict) -> None:
    _ai_cache[key] = (dict(result), time.time())


def clear_ai_response_cache() -> None:
    """Gemini 응답 인메모리 캐시 비우기."""
    global _ai_cache
    _ai_cache.clear()


_SYSTEM = """
너는 외식/먹을거리 트렌드 분석가다.
네이버 검색 트렌드 + 수명주기 분석 + 메뉴 분류 데이터를 보고
소상공인(식당/카페/디저트가게/푸드트럭)에게 **데이터 근거 기반의 깊이 있는 분석**과
**구체적이고 실행 가능한** 진입 전략을 제시한다.

답변 규칙:
- 반드시 아래 JSON 형식을 그대로 따른다 (다른 설명 없이 JSON만 출력)
- 모든 필드는 한국어, 추상적인 말("신중히", "검토하라") 금지
- 모든 분석에 **수치(주차/퍼센트/검색량)**를 명시적으로 포함
- 같은 verdict라도 메뉴별/itemType별로 **다른 톤·다른 조언**이 나와야 함
- itemType 별 톤:
  · trending(폭발 상승): "선점하되 출구 전략" 강조
  · classic(클래식): "수익성·차별화" 강조 (트렌드 무관)
  · seasonal: "시기적 진입·재고 관리" 강조
  · growing: "조기 진입 + 모니터링" 강조
  · fading: "재고 소진·대체 전략" 강조
  · niche: "충성 고객 확보" 강조
  · steady_saturated: "포화 시장 경고 + 강력한 차별화 필수" 강조 (단순 진입은 위험)
  · steady_safe: "차별화 포인트 1개로 안정 수요 공략" 강조
  · steady_emerging: "유행 이후 안착 메뉴, 시그니처화 전략" 강조

출력 JSON 스키마:
{
  "verdict": "GO" | "WAIT" | "STOP",
  "summary": "1줄 진단 (40자 이내, 수치 1개 이상 포함)",
  "dataInsight": "데이터에서 보이는 핵심 인사이트 (2~3줄). 모멘텀/변곡점/예측값/정점하락률 같은 구체 수치 활용.",
  "marketContext": "시장 맥락 1~2줄 — 계절성·경쟁·구매 시그널·유사 패턴 메뉴 등",
  "immediate":  ["이번 주 / 1주 안에 할 일 2~3개, 각 30~50자"],
  "shortterm":  ["1개월 안에 할 일 2~3개"],
  "midterm":    ["3개월 안에 할 일 2~3개"],
  "worstCase":  "최악 시나리오 1줄 (수치/기간 포함)",
  "alternatives": ["대안 메뉴 1~3개 (이 메뉴 부적합 시 고려할 만한 대체, 한 단어씩)"]
}
""".strip()


def _build_prompt(
    keyword: str,
    lifecycle: dict,
    weeks: list[dict],
    shopping: list[dict] | None = None,
    blog: dict | None = None,
    news: dict | None = None,
    google_dir: str | None = None,
    user_profile: dict | None = None,
) -> str:
    stage_kr = {
        "rising":   "상승기",
        "peak":     "정점",
        "declining":"하락기",
        "stable":   "안정기",
    }.get(lifecycle.get("stage", ""), "알 수 없음")

    item_type_kr = {
        "trending":          "폭발적 상승 (요즘 뜨는 메뉴)",
        "classic":           "클래식 (오래 안정 + 충성 수요)",
        "seasonal":          "계절성 (변동성 큼)",
        "growing":           "점진 상승 (안정적 우상향)",
        "fading":            "한물감 (정점 대비 큰 하락)",
        "niche":             "틈새 (검색량 작지만 안정)",
        "steady_saturated":  "스테디·시장포화 (치킨·커피 수준, 경쟁 매우 치열)",
        "steady_safe":       "스테디·진입가능 (안정 수요, 차별화 여지 있음)",
        "steady_emerging":   "스테디·안착 (유행 후 자리잡은 메뉴, 베이글·크로플 등)",
        "stable":            "정체",
    }.get(lifecycle.get("itemType", "stable"), "정체")

    forecast = lifecycle.get("forecast", [])
    forecast_str = ", ".join(f"{f['week']}주후 {f['ratio']}" for f in forecast) if forecast else "—"

    shopping_str = ""
    if shopping:
        last3 = shopping[-3:]
        shopping_avg = sum(s.get("ratio", 0) for s in shopping[-4:]) / max(1, len(shopping[-4:]))
        shopping_str = (
            f"\n[쇼핑 클릭 트렌드 (최근 3주)]\n"
            + ", ".join(f"{s['period']}: {s['ratio']}" for s in last3)
            + f"\n쇼핑 4주 평균: {round(shopping_avg, 1)}"
        )

    # 블로그/뉴스/구글 시그널 섹션
    signal_parts = []
    if blog:
        blog_label = {"high": "높음(5만건+)", "medium": "중간(1~5만건)", "low": "낮음(1만건 미만)"}.get(blog.get("buzzLevel", ""), "")
        signal_parts.append(f"- 블로그 포스팅: {blog.get('total', 0):,}건 [{blog_label}] — UGC 버즈 (실제 소비 근거)")
    if news:
        news_label = {"high": "높음(5천건+)", "medium": "중간(1~5천건)", "low": "낮음(1천건 미만)"}.get(news.get("mediaLevel", ""), "")
        signal_parts.append(f"- 뉴스 기사: {news.get('total', 0):,}건 [{news_label}] — 미디어 노출")
    if google_dir:
        dir_kr = {"rising": "상승 중", "declining": "하락 중", "stable": "안정", "unknown": "데이터 없음"}.get(google_dir, google_dir)
        signal_parts.append(f"- 구글 트렌드 (한국): {dir_kr} — 네이버 대비 교차 검증")

    signal_str = "\n[소셜/미디어 신호]\n" + "\n".join(signal_parts) if signal_parts else ""

    # 신호 불일치 감지 메시지
    divergence_hint = ""
    if blog and blog.get("buzzLevel") == "low" and lifecycle.get("stage") in ("rising", "peak"):
        divergence_hint = "\n⚠️ 경고: 검색량은 높지만 블로그 UGC가 낮음 → 거품 가능성 검토 필요"
    elif blog and blog.get("buzzLevel") == "high" and lifecycle.get("stage") == "declining":
        divergence_hint = "\n💡 참고: 검색량 하락 중이지만 블로그 콘텐츠는 많음 → 충성 소비층 존재 가능"
    elif news and news.get("mediaLevel") == "high" and (not blog or blog.get("buzzLevel") == "low"):
        divergence_hint = "\n⚠️ 경고: 뉴스 노출은 많지만 UGC가 적음 → 미디어 과대 포장 가능성"

    BUSINESS_TYPE_KR = {
        "cafe": "카페·디저트 업종",
        "restaurant": "일반 식당 (한식·중식·일식 등)",
        "fastfood": "분식·패스트푸드",
        "bakery": "베이커리·제과점",
        "foodtruck": "푸드트럭·포장마차",
        "other": "기타 외식업",
    }
    user_ctx = ""
    if user_profile:
        btype = BUSINESS_TYPE_KR.get(user_profile.get("businessType", ""), "외식업")
        region = user_profile.get("region", "")
        user_ctx = f"\n[사업자 정보]\n- 업종: {btype}\n- 지역: {region} 상권\n※ 위 업종과 지역에 특화된 조언을 해줄 것. 예) 카페라면 디저트 메뉴 마진·좌석 회전율, 서울이면 상권 경쟁 강도 언급 등."

    # 현재 월/계절 컨텍스트 (계절성 메뉴 오판 방지)
    from datetime import date as _date
    _m = _date.today().month
    _season = (
        "봄 (3~5월, 나들이·야외 수요 증가)" if _m in (3, 4, 5) else
        "여름 (6~8월, 냉음료·빙수·아이스 수요 급증)" if _m in (6, 7, 8) else
        "가을 (9~11월, 따뜻한 음료·구황작물 수요)" if _m in (9, 10, 11) else
        "겨울 (12~2월, 붕어빵·호떡·핫초코 등 온열 수요)"
    )
    season_ctx = f"\n[현재 시점] {_date.today().strftime('%Y년 %m월')} — {_season}\n※ 계절성 메뉴(빙수·팥빙수·아이스·딸기 등)는 현재 계절 수요 흐름을 반드시 반영할 것."

    # 최근 4주 요약만 포함 (raw 전체 데이터 제거 → 토큰 절감)
    recent_summary = ", ".join(
        f"{w['period']}: {w['ratio']}" for w in weeks[-4:]
    ) if weeks else "—"

    return f"""[메뉴] {keyword}

[단계·분류]
단계={stage_kr} | 유형={item_type_kr} | 판정={lifecycle.get('verdict')} | 위험도={lifecycle.get('riskScore')}/100{f" | 포화도={lifecycle.get('saturationScore')}/100 ({lifecycle.get('differentiationDifficulty','보통')})" if lifecycle.get('saturationScore') is not None else ""}

[핵심 수치]
평균={lifecycle.get('avgAll')} | 최근4주={lifecycle.get('avgRecent')} | 이전4주={lifecycle.get('avgPrev')} | 변화={round(lifecycle.get('avgRecent',0)-lifecycle.get('avgPrev',0),1)}pt
최고점={lifecycle.get('peakRatio')} → 현재={lifecycle.get('currentRatio')} (정점대비{round(lifecycle.get('peakDecay',0)*100)}%↓) | 모멘텀={lifecycle.get('momentum')} | 변동성={lifecycle.get('volatility')}
변곡점={lifecycle.get('inflectionWeek')}주차 | EXIT={lifecycle.get('exitWeek')}주 후 | 4주예측={forecast_str}
최근4주실측: {recent_summary}{shopping_str}{signal_str}{divergence_hint}{season_ctx}
{user_ctx}
위 데이터로 JSON만 응답. dataInsight는 수치 근거 포함, marketContext는 신호 불일치 여부와 계절성 여부, alternatives는 fading/stop 시 필수.""".strip()


# ─── 응답 파싱 ───────────────────────────────────────────────────────────────

def _extract_json(text: str) -> dict | None:
    """LLM 응답에서 JSON 블록만 추출. 코드 펜스·마크다운 모두 처리."""
    text = text.strip()

    # 방법 1: 첫 { 부터 마지막 } 까지 슬라이싱 (가장 범용적)
    start = text.find("{")
    end   = text.rfind("}")
    if start < 0 or end < 0:
        return None

    candidate = text[start : end + 1]
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        pass

    # 방법 2: ```json ... ``` 블록 추출 후 재시도
    fence = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if fence:
        inner = fence.group(1).strip()
        s2 = inner.find("{")
        e2 = inner.rfind("}")
        if s2 >= 0 and e2 >= 0:
            try:
                return json.loads(inner[s2 : e2 + 1])
            except json.JSONDecodeError:
                pass

    return None


def _normalize_response(parsed: dict, lifecycle: dict) -> dict:
    """LLM 응답 정규화 + 누락 필드 보완."""
    verdict_raw = (parsed.get("verdict") or "").upper()
    verdict = verdict_raw if verdict_raw in ("GO", "WAIT", "STOP") else lifecycle.get("verdict", "WAIT")

    def _str_list(val) -> list[str]:
        if isinstance(val, list):
            return [str(x).strip() for x in val if str(x).strip()]
        if isinstance(val, str):
            return [val.strip()] if val.strip() else []
        return []

    return {
        "verdict":       verdict,
        "summary":       str(parsed.get("summary", "")).strip(),
        "dataInsight":   str(parsed.get("dataInsight", "")).strip(),
        "marketContext": str(parsed.get("marketContext", "")).strip(),
        "immediate":     _str_list(parsed.get("immediate")),
        "shortterm":     _str_list(parsed.get("shortterm")),
        "midterm":       _str_list(parsed.get("midterm")),
        "worstCase":     str(parsed.get("worstCase", "")).strip(),
        "alternatives":  _str_list(parsed.get("alternatives")),
        "exitWeek":      lifecycle.get("exitWeek"),
        "reasoning":     str(parsed.get("summary", "")).strip(),
    }


# ─── 백엔드별 호출 ───────────────────────────────────────────────────────────

def _ask_gemini(prompt: str, lifecycle: dict) -> dict:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    # 모델 우선순위: 할당량 여유 있는 순서로 시도
    _MODELS = [
        "models/gemini-2.5-flash",
        "models/gemini-2.0-flash",
        "models/gemini-2.0-flash-lite",
    ]
    last_err: Exception = RuntimeError("no model tried")

    for model_name in _MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=_SYSTEM,
                    temperature=0.7,
                    max_output_tokens=2048,
                ),
            )
            # 토큰 한도로 잘린 경우 감지
            if response.candidates:
                reason = response.candidates[0].finish_reason
                reason_str = reason.name if hasattr(reason, "name") else str(reason)
                if reason_str == "MAX_TOKENS":
                    raise ValueError(f"응답이 토큰 한도로 잘림 ({model_name})")

            text = response.text.strip()
            parsed = _extract_json(text)
            if not parsed:
                raise ValueError(f"JSON parse failed. Raw: {text[:200]}")
            print(f"[gemini] {model_name} 성공")
            return _normalize_response(parsed, lifecycle)
        except Exception as e:
            print(f"[gemini] {model_name} 실패: {str(e)[:120]}")
            last_err = e
            continue

    raise last_err


def ask_ai(
    keyword: str,
    lifecycle: dict,
    weeks: list[dict],
    shopping: list[dict] | None = None,
    blog: dict | None = None,
    news: dict | None = None,
    google_dir: str | None = None,
    user_profile: dict | None = None,
    skip_ai: bool = False,
) -> dict:
    """Gemini → 알고리즘 폴백 순으로 자동 선택.

    Args:
        skip_ai: True 이면 AI 호출을 건너뛰고 알고리즘 결과만 반환.
                 warm 캐시 등 비용 절감용.
    """
    # 알고리즘 강제 모드 (warm 캐시 등)
    if skip_ai:
        result = _fallback_verdict(keyword, lifecycle)
        result["aiProvider"] = "algorithm"
        return result

    # ── 캐시 확인 (user_profile 없는 일반 조회만 캐시) ────────────────────────
    cache_key = _cache_key(keyword, lifecycle)
    if not user_profile:
        cached = _get_ai_cache(cache_key)
        if cached:
            cached["aiProvider"] = cached.get("aiProvider", "gemini") + " (cached)"
            print(f"[ai] '{keyword}' 캐시 히트")
            return cached

    prompt = _build_prompt(keyword, lifecycle, weeks, shopping, blog, news, google_dir, user_profile)
    gemini_key = os.getenv("GEMINI_API_KEY", "")

    if gemini_key and gemini_key.startswith("AIzaSy") and len(gemini_key) > 30:
        try:
            result = _ask_gemini(prompt, lifecycle)
            result["aiProvider"] = "gemini"
            print(f"[ai] '{keyword}' → gemini 성공")
            # user_profile 없는 경우만 캐시 저장 (개인화 응답은 저장 안 함)
            if not user_profile:
                _set_ai_cache(cache_key, result)
            return result
        except Exception as e:
            print(f"[gemini] failed for '{keyword}': {str(e)[:120]}")

    print(f"[ai] '{keyword}' → 알고리즘 폴백")
    result = _fallback_verdict(keyword, lifecycle)
    result["aiProvider"] = "algorithm"
    return result


# ─── 알고리즘 폴백 ──────────────────────────────────────────────────────────

def _fallback_verdict(keyword: str, lifecycle: dict) -> dict:
    verdict   = lifecycle.get("verdict", "WAIT")
    stage     = lifecycle.get("stage", "stable")
    item_type = lifecycle.get("itemType", "stable")
    exit_w    = lifecycle.get("exitWeek")
    avg_r     = lifecycle.get("avgRecent", 0)
    avg_p     = lifecycle.get("avgPrev", 0)
    decay     = lifecycle.get("peakDecay", 0)
    risk      = lifecycle.get("riskScore", 50)
    momentum  = lifecycle.get("momentum", 0)
    inflection = lifecycle.get("inflectionWeek")

    decay_pct = round(decay * 100)
    delta = round(avg_r - avg_p, 1)

    # ── 메뉴 본질에 따른 데이터 인사이트 ───────────────────────────────────
    insight_parts = []
    if item_type == "trending":
        insight_parts.append(f"폭발적 상승 중인 트렌딩 메뉴 (모멘텀 {momentum}).")
    elif item_type == "classic":
        insight_parts.append("12주 동안 변동성이 작아 충성 수요가 안정적.")
    elif item_type == "fading":
        insight_parts.append(f"정점 대비 {decay_pct}% 하락한 한물간 메뉴.")
    elif item_type == "growing":
        insight_parts.append(f"점진적 우상향 (+{delta}pt 변화).")
    elif item_type == "seasonal":
        insight_parts.append("변동성이 매우 큰 계절성 메뉴 가능성.")
    elif item_type == "niche":
        insight_parts.append("검색량은 작지만 안정적인 틈새 메뉴.")
    else:
        insight_parts.append(f"방향성 약한 정체 구간 (4주 변화 {delta}pt).")
    if inflection:
        insight_parts.append(f"{inflection}주차에서 추세 전환 발생.")
    data_insight = " ".join(insight_parts)

    # ── 시장 맥락 ─────────────────────────────────────────────────────────
    if stage == "rising":
        market_ctx = "검색량 가속 상승. 경쟁 진입이 빨라질 가능성 높음."
    elif stage == "declining":
        market_ctx = "검색량 둔화 + 경쟁자도 점차 이탈 단계. 재고 회전 우선."
    elif stage == "peak":
        market_ctx = "정점 부근. 추가 상승 여력 제한적, 진입 시 출구 전략 필수."
    else:
        market_ctx = "큰 변동 없음. 유사 메뉴 대비 차별화 포인트 확보가 관건."

    # ── 액션 플랜 (verdict + itemType 조합) ───────────────────────────────
    if verdict == "GO":
        if item_type == "trending":
            summary = f"폭발 상승 +{delta}pt, 위험도 {risk}/100"
            immediate = [
                f"{keyword} 시범 발주 1~2주분 (소량 시작)",
                "SNS 홍보 + 후기 모니터링 즉시 시작",
                "원가율 30~35% 마지노선으로 단가 확정",
            ]
            shortterm = [
                f"일 판매 30~50개 목표, 4주 후 정점 신호 모니터링",
                "정점 도달 시 즉시 발주량 50% 축소 룰 사전 설정",
            ]
            midterm = [
                "EXIT 신호(검색량 정점 대비 -20%) 시 신메뉴 도입 시작",
                "트렌드 메뉴 비중 매출의 30% 이하 유지",
            ]
            worst_case = f"6~8주 내 정점 도달 후 4주 안에 매출 40% 감소 가능, 재고 폐기 리스크"
            alt = []
        else:
            summary = f"안정적 상승 +{delta}pt, 위험도 {risk}/100"
            immediate = [
                f"{keyword} 도입 결정, 1주분 시범 발주",
                "단가/원가율 검증 (마진 60% 이상 목표)",
            ]
            shortterm = [
                "주간 검색량 추이 추적 (정점 신호 감지)",
                "고객 후기 키워드 분석",
            ]
            midterm = [
                "수익성 안정화 후 메뉴판 정식 등록",
                "유사 카테고리 보조 메뉴 1개 추가",
            ]
            worst_case = "10주 후에도 매출 기여 미미할 경우 메뉴 교체 검토"
            alt = []
    elif verdict == "STOP":
        if item_type == "fading":
            summary = f"정점 대비 {decay_pct}% 하락, 한물간 메뉴"
            immediate = [
                f"{keyword} 신규 재료 발주 즉시 중단",
                "재고 1~2주 내 소진 (할인 또는 메뉴 묶음)",
                "메뉴판에서 노출 비중 단계적 축소",
            ]
            shortterm = [
                f"4주 안에 {keyword} 메뉴 완전 제거",
                "신메뉴 1개 도입으로 매출 공백 최소화",
            ]
            midterm = [
                "트렌드 의존 메뉴 비중 30% 이하로 재조정",
                "클래식·시그니처 메뉴 마진 강화",
            ]
            worst_case = f"6주 후 검색량 현재의 50% 이하, 재고 폐기 비용 + 매출 공백 동시 발생"
            alt = ["베이글", "약과", "티라미수"]
        else:
            summary = f"하락 -{abs(delta)}pt, 위험도 {risk}/100"
            immediate = [
                f"{keyword} 신규 발주 중단",
                "보유 재고 2주 내 소진 계획",
            ]
            shortterm = [
                f"메뉴판에서 {keyword} 단계적 제거 (4주)",
                "대체 메뉴 후보 2~3개 사전 검토",
            ]
            midterm = [
                "안정기·클래식 메뉴 주력 강화",
                "트렌드 메뉴 의존도 30% 이하 조정",
            ]
            worst_case = f"6주 후 {keyword} 검색량 50% 이하, 재고 폐기 손실 발생 가능"
            alt = ["크로플", "베이글", "티라미수"]
    else:  # WAIT
        if item_type == "classic":
            summary = f"클래식 안정 메뉴, 위험도 {risk}/100"
            immediate = [
                "트렌드 무관, 수익성 점검에 집중",
                "원가율 재계산 (마진 65% 이상 목표)",
            ]
            shortterm = [
                "차별화 시그니처 변형 1개 추가 검토",
                "고정 고객 충성도 강화 프로모션",
            ]
            midterm = [
                "장기 안정 메뉴로 메뉴판 핵심 포지션 유지",
                "원재료 단가 인상 대응 계획 수립",
            ]
            worst_case = "원가 인상으로 마진 압박 발생 가능, 가격 조정 검토 필요"
            alt = []
        else:
            summary = f"정체 구간, 변화 둔화 ({avg_r}↔{avg_p}), 위험도 {risk}/100"
            immediate = [
                "현재 메뉴 유지, 신규 발주 보류",
                "주간 검색량 변화 추적 (3주 연속 ±5pt 시 재판정)",
            ]
            shortterm = [
                "원가율 재점검 + 마진 개선 여지 탐색",
                "경쟁 메뉴 동향 파악 후 진입 결정",
            ]
            midterm = [
                "수익성 개선 없으면 6개월 내 메뉴 교체",
                "차별화 포인트(시그니처) 1개 검토",
            ]
            worst_case = "방향성 없이 평형 지속, 신규 고객 유입 정체"
            alt = []

    return {
        "verdict":       verdict,
        "summary":       summary,
        "dataInsight":   data_insight,
        "marketContext": market_ctx,
        "immediate":     immediate,
        "shortterm":     shortterm,
        "midterm":       midterm,
        "worstCase":     worst_case,
        "alternatives":  alt,
        "exitWeek":      exit_w,
        "reasoning":     summary,
    }
