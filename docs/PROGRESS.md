# 📊 ExEAT 개발 진행도

> **롤링 룰**: STEP 완료 시 상세 섹션 삭제 → 테이블 비고에만 남김.

---

## 🎯 현재 위치

**전체 기능 완성. STEP 0~13 모두 완료.** 제출 가능 상태.

---

## 📋 전체 STEP 목록

| STEP | 내용 | 상태 | 비고 |
|---|---|---|---|
| 0 | 기획 | 🟢 | 7개 기능, 화이트 미니멀 톤 |
| 1 | GitHub 레포 | 🟢 | https://github.com/ParkIlha/ExEAT |
| 2 | Flask 골격 + `/api/health` | 🟢 | 5001 포트 |
| 3 | 네이버 DataLab `/api/trend` | 🟢 | 12주 시계열 |
| 4 | React + Vite + Tailwind + shadcn | 🟢 | 디자인 토큰 + 레이아웃 |
| 5 | TrendChart (recharts) | 🟢 | AreaChart + 4주평균선 + 단계 색상 |
| 6 | 수명주기 lifecycle.py | 🟢 | rising/peak/declining/stable + exitWeek |
| 7 | 과거 케이스 라이브러리 | 🟢 | 6개 사례 (대만카스테라/탕후루 등) |
| 8 | 지역 인구 데이터 (F4) | 🟢 | population.json + region.py + RegionPanel |
| 9 | Claude API `/api/ask` | 🟢 | claude-opus-4-5 통합 판정 |
| 10 | 손익분기 시뮬레이터 | 🟢 | Simulator + 누적수익 그래프 |
| 11 | UI 마감 + 모바일 반응형 | 🟢 | skeleton·sonner·예시키워드·반응형 |
| B1 | 쇼핑인사이트 API | 🟢 | fetch_shopping_trend + TrendChart 이중라인 |
| 12 | README 실행 방법 | 🟢 | API 명세·구조·.env.example 포함 |
| 13 | 최종 push + 제출 | 🟢 | main 브랜치 push 완료 |

---

## 🔑 환경변수 상태

| 변수 | 상태 |
|---|---|
| `FLASK_PORT` | ✅ 5001 |
| `NAVER_CLIENT_ID` | ✅ |
| `NAVER_CLIENT_SECRET` | ✅ |
| `ANTHROPIC_API_KEY` | ✅ |

---

## 📂 최종 구조

```
backend/
├── app.py
├── routes/         health / trend / ask / cases / simulate / region
├── services/       naver / lifecycle / claude / region
└── data/           cases.json / population.json

frontend/src/
├── App.tsx
├── index.css
└── components/
    ├── TrendChart.tsx     (검색량 + 쇼핑클릭 이중라인)
    ├── CaseLibrary.tsx
    ├── Simulator.tsx
    ├── RegionPanel.tsx    ← NEW
    └── ui/                skeleton / sonner / button / card / ...
```

---

## ⚡ 다음 작업 없음 — 제출 완료 상태
