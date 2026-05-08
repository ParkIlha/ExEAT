"""
POST /api/chat
분석 결과를 컨텍스트로 Gemini에게 추가 질문을 보내는 엔드포인트.
"""

from __future__ import annotations
import os
from flask import Blueprint, request, jsonify

chat_bp = Blueprint("chat", __name__)

_CHAT_SYSTEM = """
너는 외식업 트렌드 전문 컨설턴트다.
사용자가 특정 메뉴의 분석 결과를 보고 추가로 궁금한 것을 질문하면,
아래 분석 데이터를 바탕으로 **명확하고 실용적인 답변**을 제공한다.

답변 규칙:
- 한국어로 답변
- 3~6문장 이내로 핵심만 간결하게
- 데이터 근거가 있으면 활용하고, 없으면 일반적인 외식업 지식으로 보완
- 추측이나 불확실한 내용은 "~로 판단됩니다", "~가능성이 있습니다" 로 표현
- 사장님 입장에서 실질적으로 도움이 되는 조언 위주
""".strip()


def _build_chat_prompt(keyword: str, context: dict, question: str) -> str:
    verdict   = context.get("verdict", "WAIT")
    nature    = context.get("nature", "")
    cycle     = context.get("cycle", "")
    stage     = context.get("stage", "stable")
    risk      = context.get("riskScore", 50)
    item_type = context.get("itemType", "stable")
    exit_week = context.get("exitWeek")
    is_seasonal = context.get("isSeasonal", False)
    season_phase = context.get("seasonPhase", "")
    startup_cost = context.get("startupCost", "")

    ctx_lines = [
        f"메뉴: {keyword}",
        f"판정: {verdict}  |  분류: {nature}/{cycle}  |  단계: {stage}",
        f"유형: {item_type}  |  위험도: {risk}/100",
    ]
    if exit_week:
        ctx_lines.append(f"EXIT 예상: {exit_week}주 후")
    if is_seasonal:
        ctx_lines.append(f"계절성 메뉴 (현재 위치: {season_phase})")
    if startup_cost:
        cost_kr = {"low": "낮음 (100만원 이하)", "medium": "보통 (100~500만원)", "high": "높음 (500만원+)"}.get(startup_cost, startup_cost)
        ctx_lines.append(f"초기 창업 비용: {cost_kr}")

    summary = context.get("summary", "")
    if summary:
        ctx_lines.append(f"한줄 진단: {summary}")

    return "\n".join(ctx_lines) + f"\n\n사용자 질문: {question}"


@chat_bp.route("/chat", methods=["POST"])
def chat():
    body = request.get_json(silent=True) or {}
    keyword  = (body.get("keyword") or "").strip()
    question = (body.get("question") or "").strip()
    context  = body.get("context") or {}

    if not keyword or not question:
        return jsonify({"error": "keyword와 question이 필요합니다."}), 400

    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if not (gemini_key and gemini_key.startswith("AIzaSy") and len(gemini_key) > 30):
        return jsonify({"answer": "AI 연결이 설정되지 않았습니다. GEMINI_API_KEY를 확인해주세요."}), 200

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=gemini_key)
        prompt = _build_chat_prompt(keyword, context, question)

        response = client.models.generate_content(
            model="models/gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=_CHAT_SYSTEM,
                temperature=0.6,
                max_output_tokens=1024,
            ),
        )
        answer = (response.text or "").strip()
        if not answer:
            raise ValueError("빈 응답")

        return jsonify({"answer": answer})

    except Exception as e:
        print(f"[chat] Gemini 실패: {e}")
        return jsonify({"error": "답변 생성에 실패했습니다. 잠시 후 다시 시도해주세요."}), 500
