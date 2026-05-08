# 📊 ExEAT 개발 진행도

> **롤링 룰**: STEP 완료 시 상세 섹션 삭제 → 테이블 비고에만 남김.

---

## 🎯 현재 위치

**전체 기능 완성 + UI/AI 고도화 완료.** 제출 가능 상태.

---

## 📋 전체 STEP 목록

| STEP | 내용 | 상태 | 비고 |
|---|---|---|---|
| 0 | 기획 | 🟢 | 7개 기능, 화이트 미니멀 톤 |
| 1 | GitHub 레포 | 🟢 | https://github.com/ParkIlha/ExEAT |
| 2 | Flask 골격 + `/api/health` | 🟢 | 5001 포트 |
| 3 | 네이버 DataLab `/api/trend` | 🟢 | 12주 시계열 |
| 4 | React + Vite + Tailwind + shadcn | 🟢 | 디자인 토큰 + 레이아웃 |
| 5 | TrendChart (recharts) | 🟢 | ComposedChart + 검색/쇼핑 이중라인 + 예측선 + 변곡점 |
| 6 | 수명주기 lifecycle.py | 🟢 | momentum/volatility/riskScore/itemType/forecast 포함 |
| 7 | ~~과거 케이스 라이브러리~~ | 🔴 | 삭제됨 (사용자 요청) |
| 8 | 지역 인구 데이터 (F4) | 🟢 | population.json + region.py + RegionPanel |
| 9 | AI API `/api/ask` | 🟢 | Gemini 전용 + 알고리즘 폴백, dataInsight/marketContext/actionPlan |
| 10 | 손익분기 시뮬레이터 | 🟢 | Simulator + Zustand persist |
| 11 | UI 마감 + 모바일 반응형 | 🟢 | skeleton·sonner·framer-motion·CountUp·Toss-like |
| B1 | 쇼핑인사이트 API | 🟢 | fetch_shopping_trend + TrendChart 이중라인 |
| B2 | Zustand 상태관리 | 🟢 | useAnalysis store + persist (30분 TTL 캐시) |
| B3 | react-router-dom 멀티페이지 | 🟢 | / + /result/:keyword + /simulate |
| B4 | 트렌딩 아이템 API | 🟢 | /api/trending + 1시간 메모리 캐시 + TrendingSection |
| B5 | itemType 분류 | 🟢 | trending/classic/seasonal/growing/fading/niche/stable |
| 12 | README 실행 방법 | 🟢 | API 명세·구조·.env.example 포함 |
| 13 | 최종 push + 제출 | 🟢 | main 브랜치 push 완료 |

---

## 🔑 환경변수 상태

| 변수 | 상태 |
|---|---|
| `FLASK_PORT` | ✅ 5001 |
| `NAVER_CLIENT_ID` | ✅ |
| `NAVER_CLIENT_SECRET` | ✅ |
| `GEMINI_API_KEY` | ✅ (Claude 제거, Gemini 전용) |

---

## 📂 최종 구조

```
backend/
├── app.py
├── routes/         health / trend / ask / simulate / region / trending
├── services/       naver / lifecycle / claude(=ai) / region / trending
└── data/           population.json

frontend/src/
├── App.tsx                (react-router + framer-motion 페이지전환)
├── index.css
├── store/
│   └── analysis.ts        (Zustand + persist)
├── pages/
│   ├── Home.tsx           (히어로 + TrendingSection)
│   ├── Result.tsx         (진단 리포트 + CountUp + 섹션 애니메이션)
│   └── Simulate.tsx
└── components/
    ├── TrendChart.tsx      (검색 + 쇼핑 + 예측선 + 변곡점)
    ├── TrendingSection.tsx (트렌딩 키워드 목록)
    ├── CountUp.tsx
    ├── Simulator.tsx
    ├── RegionPanel.tsx
    └── ui/                 skeleton / sonner / button / card / ...
```

---

## ⚡ 다음 작업 없음 — 제출 완료 상태
