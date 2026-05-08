"""
외부 데이터 소스 없이도 데모/개발이 막히지 않도록
키워드 기반의 "가짜 시계열"을 생성한다.

- 완전 랜덤이 아니라 keyword를 seed로 사용 → 같은 키워드는 항상 같은 곡선
- 0~100 범위 유지
- 분석 알고리즘(lifecycle.py)이 동작하는 최소 입력을 제공
"""

from __future__ import annotations

import hashlib
import math
from datetime import date, timedelta


def synthetic_weeks(keyword: str, weeks: int = 12) -> list[dict]:
    kw = (keyword or "").strip()
    if not kw:
        return []

    # keyword → deterministic seed
    h = hashlib.sha256(kw.encode("utf-8")).hexdigest()
    seed = int(h[:8], 16)

    # 기본 형태 선택 (상승/정점/하락/안정)
    shape = seed % 4
    base = 35 + (seed % 25)  # 35~59
    amp = 18 + (seed % 20)   # 18~37

    # 최근 12주 날짜 (week 단위)
    end = date.today()
    start = end - timedelta(weeks=weeks)
    periods = [(start + timedelta(weeks=i)).isoformat() for i in range(weeks)]

    values: list[float] = []
    for i in range(weeks):
        t = i / max(1, weeks - 1)

        # 곡선 기본형
        if shape == 0:       # rising
            y = base + amp * (t ** 1.3)
        elif shape == 1:     # peak
            y = base + amp * (1 - (2 * t - 1) ** 2)  # parabola peak at center
        elif shape == 2:     # declining
            y = base + amp * ((1 - t) ** 1.2)
        else:                # stable
            y = base + amp * 0.15 * math.sin(2 * math.pi * t)

        # 미세 노이즈 (deterministic)
        noise = ((seed >> (i % 16)) & 0xF) / 15.0  # 0~1
        y = y + (noise - 0.5) * 6.0

        values.append(float(y))

    # 0~100 범위로 정규화 (최대=100, 최소=0 근사)
    mx = max(values) if values else 1.0
    mn = min(values) if values else 0.0
    span = (mx - mn) or 1.0
    norm = [max(0.0, min(100.0, (v - mn) / span * 100.0)) for v in values]

    return [{"period": periods[i], "ratio": round(norm[i], 1)} for i in range(weeks)]

