"""
네이버 DataLab 검색어 트렌드 API 클라이언트

문서: https://developers.naver.com/docs/serviceapi/datalab/search/search.md

특이사항:
- 응답의 ratio 는 절대값이 아니라 '기간 내 최댓값을 100 으로 정규화한 상대값'.
- 즉 두 키워드를 비교하려면 keywordGroups 에 함께 넣어야 함.
- 시계열 단위는 date / week / month 중 선택.
"""

import os
from datetime import date, timedelta

import requests

NAVER_API_URL = "https://openapi.naver.com/v1/datalab/search"
NAVER_SHOPPING_URL = "https://openapi.naver.com/v1/datalab/shopping/categories/keywords"
NAVER_BLOG_URL = "https://openapi.naver.com/v1/search/blog.json"
NAVER_NEWS_URL = "https://openapi.naver.com/v1/search/news.json"


def _get_headers() -> dict:
    client_id = os.getenv("NAVER_CLIENT_ID")
    client_secret = os.getenv("NAVER_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise ValueError(
            "NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다. "
            "backend/.env 파일을 확인하세요."
        )
    return {
        "X-Naver-Client-Id": client_id,
        "X-Naver-Client-Secret": client_secret,
        "Content-Type": "application/json",
    }


def fetch_trend(keyword: str, weeks: int = 26) -> dict:
    """
    단일 키워드의 검색량 트렌드를 조회한다.

    Args:
        keyword: 검색할 키워드 (예: "두바이초콜릿")
        weeks: 조회할 주 수 (기본 12주)

    Returns:
        {
            "keyword": str,
            "startDate": "YYYY-MM-DD",
            "endDate":   "YYYY-MM-DD",
            "weeks": [
                {"period": "YYYY-MM-DD", "ratio": float},
                ...
            ]
        }

    Raises:
        ValueError:        환경변수 누락
        requests.HTTPError: API 응답 오류 (401, 403, 5xx 등)
    """
    end_date = date.today()
    start_date = end_date - timedelta(weeks=weeks)

    headers = _get_headers()

    body = {
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "timeUnit": "week",
        "keywordGroups": [
            {
                "groupName": keyword,
                "keywords": [keyword],
            }
        ],
    }

    response = requests.post(NAVER_API_URL, headers=headers, json=body, timeout=10)
    response.raise_for_status()

    payload = response.json()

    # 결과 가공: 프론트엔드(Recharts)에서 바로 쓸 수 있게 평탄화
    results = payload.get("results", [])
    raw_data = results[0].get("data", []) if results else []

    return {
        "keyword": keyword,
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "weeks": [
            {"period": item["period"], "ratio": item["ratio"]}
            for item in raw_data
        ],
    }


def fetch_shopping_trend(keyword: str, weeks: int = 26) -> list:
    """
    네이버 쇼핑인사이트 키워드 클릭 트렌드를 조회한다.
    검색량(DataLab)과 달리 '구매 직전 시그널'(쇼핑 탭 클릭수)을 반영.

    Returns:
        [{"period": "YYYY-MM-DD", "ratio": float}, ...]
        실패 시 빈 리스트 반환 (부가 데이터라 메인 흐름에 영향 없어야 함)
    """
    try:
        end_date = date.today()
        start_date = end_date - timedelta(weeks=weeks)

        headers = _get_headers()

        body = {
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "timeUnit": "week",
            "category": "50000000",  # 식품 카테고리
            "keyword": [{"name": keyword, "param": [keyword]}],
        }

        response = requests.post(NAVER_SHOPPING_URL, headers=headers, json=body, timeout=10)
        response.raise_for_status()

        payload = response.json()
        results = payload.get("results", [])
        raw_data = results[0].get("data", []) if results else []

        if not raw_data:
            return []

        # 최대값 기준 100으로 정규화 (검색량과 동일 스케일)
        max_ratio = max(item.get("ratio", 0) for item in raw_data) or 1
        return [
            {
                "period": item["period"],
                "ratio": round(item.get("ratio", 0) / max_ratio * 100, 1),
            }
            for item in raw_data
        ]
    except Exception:
        return []


def fetch_long_range(keyword: str) -> list[dict]:
    """
    52주 주간 검색량 트렌드. lifecycle 본질 분류(nature: TREND/STEADY)용.
    실패 시 빈 리스트 반환 → analyze_lifecycle이 12주로 폴백.

    Returns:
        [{"period": "YYYY-MM-DD", "ratio": float}, ...]
    """
    try:
        end_date   = date.today()
        start_date = end_date - timedelta(weeks=52)

        headers = _get_headers()
        body = {
            "startDate": start_date.isoformat(),
            "endDate":   end_date.isoformat(),
            "timeUnit":  "week",
            "keywordGroups": [
                {"groupName": keyword, "keywords": [keyword]}
            ],
        }

        response = requests.post(NAVER_API_URL, headers=headers, json=body, timeout=10)
        response.raise_for_status()

        payload  = response.json()
        results  = payload.get("results", [])
        raw_data = results[0].get("data", []) if results else []

        return [
            {"period": item["period"], "ratio": float(item["ratio"])}
            for item in raw_data
        ]
    except Exception as e:
        print(f"[naver.fetch_long_range] failed: {e}")
        return []


def fetch_blog_count(keyword: str) -> dict | None:
    """
    네이버 블로그 검색 결과 수를 반환한다.
    '실제로 먹고 글 쓰는 사람 수' — UGC 버즈 지표.

    Returns:
        {"total": int, "buzzLevel": "high"|"medium"|"low"}
        실패 시 None
    """
    try:
        headers = {
            "X-Naver-Client-Id": os.getenv("NAVER_CLIENT_ID"),
            "X-Naver-Client-Secret": os.getenv("NAVER_CLIENT_SECRET"),
        }
        params = {"query": keyword, "display": 1, "sort": "date"}
        response = requests.get(NAVER_BLOG_URL, headers=headers, params=params, timeout=8)
        response.raise_for_status()
        total = response.json().get("total", 0)

        if total >= 50000:
            buzz = "high"
        elif total >= 10000:
            buzz = "medium"
        else:
            buzz = "low"

        return {"total": total, "buzzLevel": buzz}
    except Exception:
        return None


def fetch_news_count(keyword: str) -> dict | None:
    """
    네이버 뉴스 검색 결과 수를 반환한다.
    미디어 노출 수준 — 보통 트렌드보다 선행하거나 후행.

    Returns:
        {"total": int, "mediaLevel": "high"|"medium"|"low"}
        실패 시 None
    """
    try:
        headers = {
            "X-Naver-Client-Id": os.getenv("NAVER_CLIENT_ID"),
            "X-Naver-Client-Secret": os.getenv("NAVER_CLIENT_SECRET"),
        }
        params = {"query": keyword, "display": 1, "sort": "date"}
        response = requests.get(NAVER_NEWS_URL, headers=headers, params=params, timeout=8)
        response.raise_for_status()
        total = response.json().get("total", 0)

        if total >= 5000:
            level = "high"
        elif total >= 1000:
            level = "medium"
        else:
            level = "low"

        return {"total": total, "mediaLevel": level}
    except Exception:
        return None
