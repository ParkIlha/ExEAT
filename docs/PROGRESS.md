# 📊 ExEAT 개발 진행도

> **롤링 업데이트 규칙**: STEP 완료 시 이전 STEP 상세 섹션은 삭제하고, 현재 STEP 섹션 1개만 남긴다.
> 새 Claude는 이 파일을 읽자마자 "바로 다음에 할 것" 섹션만 보고 질문 없이 코딩 시작한다.

---

## 🎯 현재 위치

**STEP 4 완료 / STEP 5 대기** — TrendChart (recharts) 실구현 예정

---

## 📋 전체 STEP 목록

| STEP | 내용 | 상태 | 비고 |
|---|---|---|---|
| 0 | 기획 — 문제정의 + 기능 명세 + 설계도 v2 합의 | 🟢 | 카페 창업자 타겟 / 7개 기능 |
| 1 | GitHub 레포 초기화 | 🟢 | https://github.com/ParkIlha/ExEAT |
| 2 | Flask 백엔드 기본 골격 — `/api/health` | 🟢 | 5001 포트 / `routes/health.py` |
| 3 | 네이버 DataLab API 연동 — `/api/trend` | 🟡 | 코드 완료. `.env`에 NAVER 키 입력 후 curl 확인 대기 |
| 4 | React + Vite + Tailwind + shadcn/ui 프론트 골격 | 🟢 | Tailwind v4 + 디자인 토큰 + AskBox/VerdictCard/TrendChart 자리 완료 |
| 5 | TrendChart 컴포넌트 — 그래프 시각화 | ⚪ | recharts |
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

## 🔄 현재 STEP 4 — 프론트엔드 골격

**완료된 것**:
- `frontend/` Vite + React + TypeScript 스캐폴딩 완료
- `vite.config.ts`에 `/api` → `http://localhost:5001` 프록시 설정
- `App.tsx` 임시 화면 (Health 확인 + Trend 호출 UI)

**완료된 것 (전부)**:
- Tailwind CSS v4 (`@tailwindcss/vite`) 설치 + `vite.config.ts` 적용
- 디자인 토큰 (`#FAFAF7`, Pretendard, JetBrains Mono 등) `index.css`에 `@theme` 블록으로 정의
- `App.tsx` → 실제 ExEAT 레이아웃 (헤더 / AskBox / VerdictCard placeholder / TrendChart 임시 바 차트 / 푸터)
- `http://127.0.0.1:5173` 실행 + 백엔드 health 연결 확인

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

**선행 — STEP 3 검증** (아직 안 됐으면):
1. `backend/.env`에 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` 입력
2. 백엔드 서버 (재)시작: `cd backend && FLASK_PORT=5001 FLASK_ENV=development python app.py`
3. 프론트 (`http://127.0.0.1:5173`)에서 키워드 입력 → "분석하기" 클릭 → 임시 바 차트 뜨면 STEP 3 완료

**STEP 5 — TrendChart (recharts)**:
1. `cd frontend && npm install recharts`
2. `frontend/src/components/TrendChart.tsx` 생성
   - recharts `AreaChart` 사용
   - x축: `period` (주 단위), y축: `ratio` (0~100)
   - GO/WAIT/STOP 구간을 `ReferenceArea`로 색깔 음영 표시 (STEP 6에 맞춰 자리만 잡음)
3. `App.tsx`의 임시 바 차트 → `<TrendChart />` 교체
4. 검증 후 STEP 6 (수명주기 단계 판별 로직) 진행

**실행 방법**:
```bash
# 터미널 1 (백엔드)
cd backend && FLASK_PORT=5001 FLASK_ENV=development python app.py

# 터미널 2 (프론트)
cd frontend && npm run dev
```
