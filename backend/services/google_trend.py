"""
Google Trends 서비스 (pytrends)

네이버 DataLab과 교차 검증용.
- 한국(KR) 기준 최근 90일 주간 데이터
- 0~100 정규화된 관심도 반환
"""

from __future__ import annotations


def fetch_google_trend(keyword: str, weeks: int = 12) -> list[dict]:
    """
    Google Trends 주간 시계열을 반환한다.

    Returns:
        [{"period": "YYYY-MM-DD", "ratio": float}, ...]
        실패 시 빈 리스트 반환 (부가 데이터)
    """
    try:
        from pytrends.request import TrendReq

        pytrends = TrendReq(hl="ko", tz=540, timeout=(10, 25), retries=1, backoff_factor=0.5)
        pytrends.build_payload(
            [keyword],
            cat=0,
            timeframe="today 3-m",  # 최근 약 12주
            geo="KR",
        )
        df = pytrends.interest_over_time()

        if df is None or df.empty or keyword not in df.columns:
            return []

        result = []
        for ts, row in df.iterrows():
            result.append({
                "period": ts.strftime("%Y-%m-%d"),
                "ratio": float(row[keyword]),
            })

        return result[-weeks:]

    except Exception as e:
        print(f"[google_trend] failed for '{keyword}': {e}")
        return []


def compute_google_direction(google_weeks: list[dict]) -> str:
    """
    구글 트렌드 최근 방향성 요약.
    Returns: "rising" | "declining" | "stable" | "unknown"
    """
    if len(google_weeks) < 4:
        return "unknown"

    recent = sum(w["ratio"] for w in google_weeks[-4:]) / 4
    prev = sum(w["ratio"] for w in google_weeks[-8:-4]) / 4 if len(google_weeks) >= 8 else recent

    delta = recent - prev
    if delta >= 5:
        return "rising"
    elif delta <= -5:
        return "declining"
    return "stable"
