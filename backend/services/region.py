"""
지역 인구 분석 서비스 (F4)

행정안전부 주민등록 인구통계 기반 정적 데이터.
키워드 단계(stage)와 지역 인구 구조를 결합해 적합도를 판정한다.

판정 로직:
- 트렌드 상승/정점 키워드 → 20~30대 비율 높은 지역 적합 (트렌드 소비층)
- 트렌드 하락/안정 키워드  → 40~50대 비율 높은 지역이 상대적으로 안정 (충성 소비층)
- 유동인구 높은 지역 추가 점수 (floating=high +10)
"""

import json
import os

_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "population.json")

_cache: dict | None = None


def _load() -> dict:
    global _cache
    if _cache is None:
        with open(_DATA_PATH, encoding="utf-8") as f:
            _cache = json.load(f)
    return _cache


def get_regions() -> list[dict]:
    """전체 지역 목록 반환."""
    return _load()["regions"]


def analyze_region(region_code: str, stage: str) -> dict:
    """
    지역 코드 + 트렌드 단계로 적합도를 분석한다.

    Args:
        region_code: 행정구역 코드 (예: "11680" = 강남구, "41" = 경기도)
        stage: 트렌드 단계 ("rising" | "peak" | "declining" | "stable")

    Returns:
        {
          "region": str,
          "score": int (0~100),
          "verdict": "적합" | "보통" | "부적합",
          "reason": str,
          "age": dict,
          "total": int
        }
    """
    regions = _load()["regions"]
    region = next((r for r in regions if r["code"] == region_code), None)

    if not region:
        return {"error": f"지역 코드를 찾을 수 없습니다: {region_code}"}

    age = region["age"]
    young = age.get("10s", 0) + age.get("20s", 0) + age.get("30s", 0)
    mid   = age.get("40s", 0) + age.get("50s", 0)
    senior = age.get("60s+", 0)
    floating_bonus = {"high": 10, "medium": 5, "low": 0}.get(region.get("floating", "low"), 0)

    if stage in ("rising", "peak"):
        # 트렌드 민감층(10~30대)이 많을수록 점수 높음
        base = young
        reason_tpl = "20~30대 비중 {young}% — 트렌드 민감 소비층 {verdict_str}. 유동인구 {fl}."
    else:
        # declining/stable: 40~50대 안정 소비층 + 유동인구 중요
        base = mid + floating_bonus // 2
        reason_tpl = "40~50대 비중 {mid}% — 안정 소비층 {verdict_str}. 유동인구 {fl}."

    score = min(100, int(base + floating_bonus))

    if score >= 60:
        verdict = "적합"
        verdict_str = "풍부"
    elif score >= 40:
        verdict = "보통"
        verdict_str = "보통"
    else:
        verdict = "부적합"
        verdict_str = "부족"

    fl_label = {"high": "많음", "medium": "보통", "low": "적음"}.get(region.get("floating", "low"), "보통")

    reason = reason_tpl.format(
        young=young, mid=mid, verdict_str=verdict_str, fl=fl_label
    )

    return {
        "region": region["name"],
        "total":  region["total"],
        "score":  score,
        "verdict": verdict,
        "reason": reason,
        "age":    age,
        "floating": region.get("floating", "medium"),
    }
