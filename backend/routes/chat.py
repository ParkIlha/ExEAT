"""
POST /api/chat
분석 결과를 컨텍스트로 Gemini에게 추가 질문을 보내는 엔드포인트.
"""

from __future__ import annotations
import os
from flask import Blueprint, request, jsonify

chat_bp = Blueprint("chat", __name__)

_CHAT_SYSTEM = """
너는 10년 경력의 외식업 창업 컨설턴트다. 트렌드 분석뿐 아니라 재료비·창업 비용·마진·마케팅·메뉴 전략에 관한 실전 지식을 보유하고 있다.

사용자는 특정 메뉴의 트렌드 분석 결과를 보고 있으며, 창업이나 운영에 관한 추가 질문을 한다.

답변 원칙:
- **항상 구체적인 수치와 함께 답변한다.** 재료비, 마진율, 비용 등 수치가 필요하면 업계 평균값을 직접 제시한다.
- 분석 컨텍스트 데이터가 있으면 활용하되, 없는 정보는 일반 외식업 지식으로 자신 있게 답한다. "데이터에 없다"며 회피하지 않는다.
- 한국 외식업 기준으로 답변한다 (원화 기준, 한국 시장 상황).
- 3~5문장으로 핵심만 명확하게. 마지막에 실천 가능한 조언 한 줄을 덧붙인다.
- 불확실한 내용은 "업계 평균 기준으로는" 또는 "일반적으로는" 으로 시작한다.
- 사장님 입장에서 바로 쓸 수 있는 실용적 정보를 준다.
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

        _CHAT_MODELS = [
            "models/gemini-3.0-flash",
            "models/gemini-2.5-flash",
            "gemini-2.5-flash",
        ]
        answer = ""
        for model_name in _CHAT_MODELS:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=_CHAT_SYSTEM,
                        temperature=0.7,
                        max_output_tokens=1500,
                    ),
                )
                answer = (response.text or "").strip()
                if answer:
                    break
            except Exception as model_err:
                print(f"[chat] {model_name} 실패: {model_err}")
                continue

        if not answer:
            raise ValueError("모든 모델에서 빈 응답")

        return jsonify({"answer": answer})

    except Exception as e:
        print(f"[chat] Gemini 실패: {e}")
        return jsonify({"error": "답변 생성에 실패했습니다. 잠시 후 다시 시도해주세요."}), 500
