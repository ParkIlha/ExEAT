# 📊 ExEAT 개발 진행도

> **롤링 업데이트 규칙**: STEP 완료 시 이전 STEP 상세 섹션은 삭제하고, 현재 STEP 섹션 1개만 남긴다.
> 새 Claude는 이 파일을 읽자마자 "바로 다음에 할 것" 섹션만 보고 질문 없이 코딩 시작한다.

---

## 🎯 현재 위치

**STEP 5 완료 / STEP 6 대기** — 수명주기 단계 판별 로직 (`services/lifecycle.py`)

---

## 📋 전체 STEP 목록

| STEP | 내용 | 상태 | 비고 |
|---|---|---|---|
| 0 | 기획 — 문제정의 + 기능 명세 + 설계도 v2 합의 | 🟢 | 카페 창업자 타겟 / 7개 기능 |
| 1 | GitHub 레포 초기화 | 🟢 | https://github.com/ParkIlha/ExEAT |
| 2 | Flask 백엔드 기본 골격 — `/api/health` | 🟢 | 5001 포트 / `routes/health.py` |
| 3 | 네이버 DataLab API 연동 — `/api/trend` | 🟡 | 코드 완료. `.env`에 NAVER 키 입력 후 curl 확인 대기 |
| 4 | React + Vite + Tailwind + shadcn/ui 프론트 골격 | 🟢 | Tailwind v4 + 디자인 토큰 + AskBox/VerdictCard/TrendChart 자리 완료 |
| 5 | TrendChart 컴포넌트 — 그래프 시각화 | 🟢 | recharts AreaChart + 4주 평균 기준선 |
| 6 | 수명주기 단계 판별 로직 (`services/lifecycle.py`) | ⚪ | F1, F3 핵심 |
| 7 | 과거 케이스 라이브러리 (`data/cases.json`) | ⚪ | F7 |
| 8 | 지역 인구 데이터 (`data/population.csv`) | ⚪ | F4 |
| 9 | Claude API 연동 — `/api/ask` 통합 분석 | ⚪ | F9 |
| 10 | 손익분기 시뮬레이터 — `/api/simulate` | ⚪ | F6 |
| 11 | UI 디자인 마감 + 모바일 반응형 | ⚪ | |
| 12 | README 실행 방법 작성 | ⚪ | |
| 13 | 최종 git push + 제출 | ⚪ | |

---

## 🔑 환경변수 발급 상태

| 변수 | 상태 | 비고 |
|---|---|---|
| `FLASK_PORT` | ✅ 5001 | 5000은 macOS AirPlay 충돌 |
| `NAVER_CLIENT_ID` | ⚠ 입력 대기 | `backend/.env`에 입력 필요 |
| `NAVER_CLIENT_SECRET` | ⚠ 재발급 + 입력 대기 | 이전 채팅에서 노출됨 — 재발급 필수 |
| `ANTHROPIC_API_KEY` | ❓ 미확인 | STEP 9부터 필요 |

---

## 🚧 미해결 결정 사항

- [ ] 디자인 톤 최종 확정 (B안: 화이트 미니멀 잠정)
- [ ] 서비스명 ExEAT 로고/타이포 처리

---

## 🔄 현재 STEP 5 — TrendChart

**완료된 것**:
- `frontend/src/components/TrendChart.tsx` — recharts AreaChart
  - x축 주차 라벨, y축 0~100 고정, 그라디언트 fill
  - 4주 이동평균 기준선 (ReferenceLine)
  - STEP 6 연동 대비 `stage` prop 자리 (rising/peak/declining/stable → 선 색상 변경)
  - 커스텀 툴팁
- `App.tsx` 임시 바 차트 → `<TrendChart />` 교체

**디자인 토큰 (ARCHITECTURE.md에서)**:
```
배경:  #FAFAF7
본문:  #1A1A1A
GO:    #2D7A4F
WAIT:  #C9883A
STOP:  #C13B3B
폰트:  Pretendard (본문) + JetBrains Mono (숫자/라벨)
```

---

## ⚡ 바로 다음에 할 것 (새 Claude는 여기서 바로 시작)

**지금 해야 할 작업: STEP 3 최종 검증 + STEP 5 TrendChart(recharts)**

**지금 해야 할 작업: STEP 6 — 수명주기 단계 판별 로직**

1. `backend/services/lifecycle.py` 생성
   - 입력: `weeks: list[dict]` (period, ratio)
   - 처리: 4주 이동평균 → 1차 미분(추세) → 2차 미분(변곡점) → 단계 분류
   - 출력: `{ stage, exitWeek, peakWeek, currentRatio }`
   - stage: `"rising"` / `"peak"` / `"declining"` / `"stable"`
2. `backend/routes/trend.py` — `/api/trend` 응답에 `stage`, `exitWeek` 필드 추가
3. `frontend/src/App.tsx` — `stage`를 `<TrendChart stage={...} />`에 전달
4. `frontend/src/App.tsx` — `<VerdictCard>`에 GO/WAIT/STOP 판정 연결
   - rising → GO, peak → WAIT, declining → STOP, stable → WAIT
5. 검증: "두바이초콜릿" 입력 → 그래프 선 색상이 단계에 맞게 변경되면 완료
6. 완료 후 STEP 7 (과거 케이스 라이브러리) 진행

**실행 방법**:
```bash
# 터미널 1 (백엔드)
cd backend && FLASK_PORT=5001 FLASK_ENV=development python app.py

# 터미널 2 (프론트)
cd frontend && npm run dev
```
