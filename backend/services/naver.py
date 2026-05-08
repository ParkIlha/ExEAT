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


def fetch_trend(keyword: str, weeks: int = 12) -> dict:
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
    client_id = os.getenv("NAVER_CLIENT_ID")
    client_secret = os.getenv("NAVER_CLIENT_SECRET")

    if not client_id or not client_secret:
        raise ValueError(
            "NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다. "
            "backend/.env 파일을 확인하세요."
        )

    end_date = date.today()
    start_date = end_date - timedelta(weeks=weeks)

    headers = {
        "X-Naver-Client-Id": client_id,
        "X-Naver-Client-Secret": client_secret,
        "Content-Type": "application/json",
    }

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
