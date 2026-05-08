"""
/api/cases 라우터

과거 트렌드 케이스 라이브러리를 제공한다.
GET /api/cases           — 전체 목록
GET /api/cases?pattern=X — 패턴 필터
"""

import json
import os
from flask import Blueprint, request, jsonify

cases_bp = Blueprint("cases", __name__)

_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "cases.json")


def _load_cases() -> list[dict]:
    with open(_DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


@cases_bp.route("/cases", methods=["GET"])
def get_cases():
    pattern = (request.args.get("pattern") or "").strip().lower()

    try:
        cases = _load_cases()
    except FileNotFoundError:
        return jsonify({"error": "케이스 데이터를 찾을 수 없습니다."}), 500

    if pattern:
        cases = [c for c in cases if c.get("pattern", "").lower() == pattern]

    return jsonify(cases)
