"""
Claude API 클라이언트

트렌드 데이터 + 수명주기 분석 결과를 종합해
카페 창업자에게 GO/WAIT/STOP 판정과 근거를 제공한다.
"""

import os
import anthropic

_SYSTEM = """
너는 카페 창업 컨설턴트 AI다.
네이버 DataLab 검색 트렌드 데이터와 수명주기 분석 결과를 바탕으로
카페 소상공인에게 **트렌드 재료/메뉴의 진입 타이밍**을 진단해준다.

답변 규칙:
- 판정(GO/WAIT/STOP)과 핵심 근거를 먼저, 부가 설명을 이어서
- 전문용어 없이 카페 사장님이 바로 이해할 수 있는 말투
- 수치(검색량, 주차)는 구체적으로 언급
- 마크다운 헤딩(#) 금지, 줄바꿈은 자유롭게
- 200자 이내로 간결하게
""".strip()


def ask_claude(keyword: str, lifecycle: dict, weeks: list[dict]) -> dict:
    """
    Args:
        keyword:   검색 키워드 (예: "두바이초콜릿")
        lifecycle: analyze_lifecycle() 반환값
        weeks:     [{"period": str, "ratio": float}, ...]

    Returns:
        {
            "verdict":   "GO" | "WAIT" | "STOP",
            "reasoning": str,
            "exitWeek":  int | None,
        }
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError(
            "ANTHROPIC_API_KEY 환경변수가 없습니다. backend/.env를 확인하세요."
        )

    stage_kr = {
        "rising":   "상승기",
        "peak":     "정점",
        "declining":"하락기",
        "stable":   "안정기",
    }.get(lifecycle.get("stage", ""), "알 수 없음")

    prompt = f"""
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

    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=400,
        system=_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip()

    # 첫 줄에서 verdict 파싱
    first_line = text.split("\n")[0].upper()
    if "[GO]" in first_line:
        verdict = "GO"
    elif "[STOP]" in first_line:
        verdict = "STOP"
    else:
        verdict = lifecycle.get("verdict", "WAIT")

    return {
        "verdict":   verdict,
        "reasoning": text,
        "exitWeek":  lifecycle.get("exitWeek"),
    }
