"""
AI 분석 서비스 — 구조화된 진단 + 액션 플랜

응답 형식: JSON (verdict, summary, immediate, shortterm, midterm, worstCase, alternatives)
폴백: API 키 없으면 알고리즘 기반 폴백 응답

우선순위: Claude API → Gemini API → 알고리즘 폴백
"""

import os
import json
import re
import anthropic

_SYSTEM = """
너는 외식/먹을거리 트렌드 분석가다.
네이버 검색 트렌드 + 수명주기 분석 데이터를 보고
소상공인(식당/카페/디저트가게)에게 **구체적이고 실행 가능한** 진입 전략을 제시한다.

답변 규칙:
- 반드시 아래 JSON 형식을 그대로 따른다 (다른 설명 없이 JSON만 출력)
- 모든 필드는 한국어
- 추상적인 말("신중히", "검토하라") 금지. 숫자·기간·구체 행동 포함
- 같은 STOP 판정이라도 메뉴별로 다른 조언이 나와야 함
- 카페에 한정하지 말고 식당·디저트가게·푸드트럭 등 외식업 전반 대상

출력 JSON 스키마:
{
  "verdict": "GO" | "WAIT" | "STOP",
  "summary": "1줄 진단 (40자 이내, 핵심 수치 포함)",
  "immediate": ["이번 주 / 1주 안에 할 일 2~3개, 각 30자 이내"],
  "shortterm": ["1개월 안에 할 일 2~3개"],
  "midterm":   ["3개월 안에 할 일 2~3개"],
  "worstCase": "최악 시나리오 1줄 (얼마나 나빠질 수 있는지 수치 포함)",
  "alternatives": ["대안 메뉴 1~3개 (이 메뉴 STOP 시 고려할 만한 대체)"]
}
""".strip()


def _build_prompt(keyword: str, lifecycle: dict, weeks: list[dict], shopping: list[dict] | None = None) -> str:
    stage_kr = {
        "rising":   "상승기",
        "peak":     "정점",
        "declining":"하락기",
        "stable":   "안정기",
    }.get(lifecycle.get("stage", ""), "알 수 없음")

    forecast = lifecycle.get("forecast", [])
    forecast_str = ", ".join(f"{f['week']}주후 {f['ratio']}" for f in forecast) if forecast else "—"

    shopping_str = ""
    if shopping:
        last3 = shopping[-3:]
        shopping_str = "\n쇼핑 클릭 트렌드 (최근 3주): " + ", ".join(f"{s['period']}: {s['ratio']}" for s in last3)

    return f"""
[메뉴] {keyword}

[현재 상태]
- 단계: {stage_kr} ({lifecycle.get('stage')})
- 알고리즘 판정: {lifecycle.get('verdict')}
- 위험도: {lifecycle.get('riskScore')}/100

[수치]
- 최근 4주 평균 검색량: {lifecycle.get('avgRecent')} (이전 4주: {lifecycle.get('avgPrev')}, 변화: {round(lifecycle.get('avgRecent', 0) - lifecycle.get('avgPrev', 0), 1)})
- 최고점: {lifecycle.get('peakRatio')} → 현재: {lifecycle.get('currentRatio')} (정점 대비 {round(lifecycle.get('peakDecay', 0) * 100)}% 하락)
- 모멘텀(가속도): {lifecycle.get('momentum')} ({"가속 상승" if lifecycle.get('momentum', 0) > 0.5 else "가속 하락" if lifecycle.get('momentum', 0) < -0.5 else "안정"})
- 변동성: {lifecycle.get('volatility')} ({"매우 불안정" if lifecycle.get('volatility', 0) > 20 else "안정"})
- 변곡점: {lifecycle.get('inflectionWeek')}주차에 추세 전환
- EXIT 예상: {lifecycle.get('exitWeek')}주 후 검색량 50% 이하

[4주 예측]
{forecast_str}

[최근 6주 실제 트렌드]
{chr(10).join(f"  {w['period']}: {w['ratio']}" for w in weeks[-6:])}{shopping_str}

위 데이터로 외식업 사장에게 **구체적인 진입 전략**을 JSON으로만 응답해.
""".strip()


# ─── 응답 파싱 ───────────────────────────────────────────────────────────────

def _extract_json(text: str) -> dict | None:
    """LLM 응답에서 JSON 블록만 추출."""
    text = text.strip()

    # ```json ... ``` 코드블록 제거
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence:
        text = fence.group(1)

    # 첫 { 부터 마지막 } 까지 절단
    start = text.find("{")
    end   = text.rfind("}")
    if start < 0 or end < 0:
        return None
    try:
        return json.loads(text[start : end + 1])
    except json.JSONDecodeError:
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
        "verdict":     verdict,
        "summary":     str(parsed.get("summary", "")).strip(),
        "immediate":   _str_list(parsed.get("immediate")),
        "shortterm":   _str_list(parsed.get("shortterm")),
        "midterm":     _str_list(parsed.get("midterm")),
        "worstCase":   str(parsed.get("worstCase", "")).strip(),
        "alternatives": _str_list(parsed.get("alternatives")),
        "exitWeek":    lifecycle.get("exitWeek"),
        "reasoning":   str(parsed.get("summary", "")).strip(),  # 후위 호환
    }


# ─── 백엔드별 호출 ───────────────────────────────────────────────────────────

def _ask_claude(prompt: str, lifecycle: dict) -> dict:
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=900,
        system=_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )
    text = message.content[0].text.strip()
    parsed = _extract_json(text)
    if not parsed:
        raise ValueError("Claude JSON parse failed")
    return _normalize_response(parsed, lifecycle)


def _ask_gemini(prompt: str, lifecycle: dict) -> dict:
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction=_SYSTEM,
    )
    response = model.generate_content(prompt)
    text = response.text.strip()
    parsed = _extract_json(text)
    if not parsed:
        raise ValueError("Gemini JSON parse failed")
    return _normalize_response(parsed, lifecycle)


def ask_claude(keyword: str, lifecycle: dict, weeks: list[dict], shopping: list[dict] | None = None) -> dict:
    """Claude → Gemini → 알고리즘 폴백 순으로 자동 선택."""
    prompt = _build_prompt(keyword, lifecycle, weeks, shopping)

    claude_key = os.getenv("ANTHROPIC_API_KEY", "")
    gemini_key = os.getenv("GEMINI_API_KEY", "")

    if claude_key and not claude_key.startswith("여기에"):
        try:
            return _ask_claude(prompt, lifecycle)
        except Exception as e:
            print(f"[claude] failed: {e}")

    if gemini_key and not gemini_key.startswith("여기에"):
        try:
            return _ask_gemini(prompt, lifecycle)
        except Exception as e:
            print(f"[gemini] failed: {e}")

    return _fallback_verdict(keyword, lifecycle)


# ─── 알고리즘 폴백 ──────────────────────────────────────────────────────────

def _fallback_verdict(keyword: str, lifecycle: dict) -> dict:
    verdict = lifecycle.get("verdict", "WAIT")
    stage   = lifecycle.get("stage", "stable")
    exit_w  = lifecycle.get("exitWeek")
    peak    = lifecycle.get("peakRatio", 0)
    current = lifecycle.get("currentRatio", 0)
    avg_r   = lifecycle.get("avgRecent", 0)
    avg_p   = lifecycle.get("avgPrev", 0)
    decay   = lifecycle.get("peakDecay", 0)
    risk    = lifecycle.get("riskScore", 50)

    decay_pct = round(decay * 100)

    if verdict == "GO":
        summary    = f"검색량 +{round(avg_r - avg_p)}pt 상승 중, 위험도 {risk}/100"
        immediate  = [
            f"{keyword} 재료 발주 시작 (시범 운영 기준 1~2주분)",
            "메뉴판/SNS에 추가 공지 준비",
            "원가율 30~35% 이내 단가 확정",
        ]
        shortterm  = [
            "주력 메뉴 진입 후 일판매 30~50개 목표",
            "후기 키워드("+keyword+" 리뷰) 모니터링 시작",
        ]
        midterm    = [
            "정점 도달 신호 감지 시 즉시 발주량 50% 축소",
            "대체 메뉴 후보 2~3개 사전 리서치",
        ]
        worst_case = "정점 진입 후 4~6주 내 매출 30% 감소 가능, 재고 폐기 리스크 주의"
        alt        = []
    elif verdict == "STOP":
        summary    = f"정점 대비 {decay_pct}% 하락, 위험도 {risk}/100"
        immediate  = [
            f"{keyword} 신규 재료 발주 즉시 중단",
            "보유 재고 1~2주 내 소진 계획 수립",
            "프로모션/할인으로 빠른 재고 회전",
        ]
        shortterm  = [
            f"메뉴판에서 {keyword} 단계적 제거 (4주 안)",
            "고객 이탈 방지용 신메뉴 1개 도입",
        ]
        midterm    = [
            "트렌드 의존도 높은 메뉴 비중 30% 이하로 조정",
            "안정기 메뉴(아메리카노/아이스라떼류) 주력 강화",
        ]
        worst_case = f"6주 후 {keyword} 검색량 현재의 50% 이하, 재고 폐기 비용 + 매출 공백"
        alt        = ["크로플", "베이글", "티라미수"]
    else:
        summary    = f"안정기 진입, 변화 둔화 ({avg_r}↔{avg_p}), 위험도 {risk}/100"
        immediate  = [
            "현재 메뉴 유지하되 발주량 증가 보류",
            "주간 검색량 변화 추적 (3주 연속 ±5pt)",
        ]
        shortterm  = [
            "원가율/마진 재점검",
            "경쟁 메뉴 동향 파악 후 진입 결정",
        ]
        midterm    = [
            "차별화 포인트(시그니처 변형) 1개 추가 검토",
            "수익성 개선 못하면 6개월 내 메뉴 교체",
        ]
        worst_case = "방향성 없이 평형 상태 지속, 신규 고객 유입 정체"
        alt        = []

    return {
        "verdict":      verdict,
        "summary":      summary,
        "immediate":    immediate,
        "shortterm":    shortterm,
        "midterm":      midterm,
        "worstCase":    worst_case,
        "alternatives": alt,
        "exitWeek":     exit_w,
        "reasoning":    summary,
    }
