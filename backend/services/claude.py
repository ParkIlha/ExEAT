"""
AI 판정 서비스

우선순위: Claude API → Gemini API → 알고리즘 폴백
환경변수에 있는 키에 따라 자동 선택.
"""

import os
import anthropic

_SYSTEM = """
너는 카페 창업 컨설턴트 AI다.
네이버 DataLab 검색 트렌드 데이터와 수명주기 분석 결과를 바탕으로
카페 소상공인에게 트렌드 재료/메뉴의 진입 타이밍을 진단해준다.

답변 규칙:
- 판정(GO/WAIT/STOP)과 핵심 근거를 먼저, 부가 설명을 이어서
- 전문용어 없이 카페 사장님이 바로 이해할 수 있는 말투
- 수치(검색량, 주차)는 구체적으로 언급
- 마크다운 헤딩(#) 금지, 줄바꿈은 자유롭게
- 200자 이내로 간결하게
""".strip()


def _build_prompt(keyword: str, lifecycle: dict, weeks: list[dict]) -> str:
    stage_kr = {
        "rising":   "상승기",
        "peak":     "정점",
        "declining":"하락기",
        "stable":   "안정기",
    }.get(lifecycle.get("stage", ""), "알 수 없음")

    return f"""
키워드: {keyword}
현재 단계: {stage_kr} ({lifecycle.get('stage')})
판정 (알고리즘): {lifecycle.get('verdict')}
최근 4주 평균 검색량: {lifecycle.get('avgRecent')} (이전 4주: {lifecycle.get('avgPrev')})
최고점 검색량: {lifecycle.get('peakRatio')} (현재: {lifecycle.get('currentRatio')})
하락 시 EXIT 예상: {lifecycle.get('exitWeek')}주 후 (50% 이하 예상)

최근 6주 트렌드:
{chr(10).join(f"  {w['period']}: {w['ratio']}" for w in weeks[-6:])}

위 데이터를 바탕으로 카페 창업자에게 진입 판정과 이유를 설명해줘.
판정은 반드시 첫 줄에 [GO] / [WAIT] / [STOP] 중 하나로 시작해.
""".strip()


def _parse_verdict(text: str, fallback: str) -> str:
    first = text.split("\n")[0].upper()
    if "[GO]" in first:
        return "GO"
    if "[STOP]" in first:
        return "STOP"
    if "[WAIT]" in first:
        return "WAIT"
    return fallback


def _ask_claude(prompt: str, lifecycle: dict) -> dict:
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=400,
        system=_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )
    text = message.content[0].text.strip()
    return {
        "verdict":   _parse_verdict(text, lifecycle.get("verdict", "WAIT")),
        "reasoning": text,
        "exitWeek":  lifecycle.get("exitWeek"),
    }


def _ask_gemini(prompt: str, lifecycle: dict) -> dict:
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction=_SYSTEM,
    )
    response = model.generate_content(prompt)
    text = response.text.strip()
    return {
        "verdict":   _parse_verdict(text, lifecycle.get("verdict", "WAIT")),
        "reasoning": text,
        "exitWeek":  lifecycle.get("exitWeek"),
    }


def ask_claude(keyword: str, lifecycle: dict, weeks: list[dict]) -> dict:
    """
    Claude → Gemini → 알고리즘 순으로 자동 선택.
    """
    prompt = _build_prompt(keyword, lifecycle, weeks)

    claude_key = os.getenv("ANTHROPIC_API_KEY", "")
    gemini_key = os.getenv("GEMINI_API_KEY", "")

    # Claude 시도
    if claude_key and not claude_key.startswith("여기에"):
        try:
            return _ask_claude(prompt, lifecycle)
        except Exception:
            pass

    # Gemini 시도
    if gemini_key and not gemini_key.startswith("여기에"):
        try:
            return _ask_gemini(prompt, lifecycle)
        except Exception:
            pass

    # 알고리즘 폴백
    return _fallback_verdict(lifecycle)


def _fallback_verdict(lifecycle: dict) -> dict:
    """AI 없이 알고리즘 판정만으로 응답."""
    verdict = lifecycle.get("verdict", "WAIT")
    stage   = lifecycle.get("stage", "stable")
    exit_w  = lifecycle.get("exitWeek")
    peak    = lifecycle.get("peakRatio", 0)
    current = lifecycle.get("currentRatio", 0)
    avg_r   = lifecycle.get("avgRecent", 0)
    avg_p   = lifecycle.get("avgPrev", 0)

    stage_kr = {"rising": "상승기", "peak": "정점", "declining": "하락기", "stable": "안정기"}.get(stage, stage)

    if verdict == "GO":
        reasoning = (
            f"[GO] 현재 {stage_kr}입니다.\n"
            f"최근 4주 평균 검색량({avg_r})이 이전 4주({avg_p})보다 높아 상승세가 확인됩니다. "
            f"지금 도입하면 경쟁자보다 먼저 수요를 확보할 수 있습니다."
        )
    elif verdict == "STOP":
        reasoning = (
            f"[STOP] 현재 {stage_kr}입니다.\n"
            f"검색량이 최고점({peak}) 대비 현재 {current}로 크게 하락했습니다. "
            + (f"약 {exit_w}주 후 50% 이하로 떨어질 것으로 예상됩니다. " if exit_w else "")
            + "신규 재료 주문을 중단하고 재고 소진 계획을 먼저 세우세요."
        )
    else:
        reasoning = (
            f"[WAIT] 현재 {stage_kr}입니다.\n"
            f"최근 4주 평균({avg_r})과 이전 4주({avg_p})가 비슷한 수준입니다. "
            f"트렌드가 안정된 상태로, 수익성과 경쟁 상황을 먼저 검토한 뒤 결정하세요."
        )

    return {
        "verdict":   verdict,
        "reasoning": reasoning,
        "exitWeek":  exit_w,
    }
