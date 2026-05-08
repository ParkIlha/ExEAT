# 📊 ExEAT 개발 진행도

> **롤링 업데이트 규칙**: STEP 완료 시 이전 STEP 상세 섹션은 삭제하고, 현재 STEP 섹션 1개만 남긴다.
> 새 Claude는 이 파일을 읽자마자 "바로 다음에 할 것" 섹션만 보고 질문 없이 코딩 시작한다.

---

## 🎯 현재 위치

**STEP 9 완료 / STEP 7 진행 예정** — 과거 케이스 라이브러리 (`data/cases.json`)

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
| 6 | 수명주기 단계 판별 로직 (`services/lifecycle.py`) | 🟢 | 4주 이동평균 + 1차미분 → rising/peak/declining/stable |
| 7 | 과거 케이스 라이브러리 (`data/cases.json`) | ⚪ | F7 |
| 8 | 지역 인구 데이터 (`data/population.csv`) | ⚪ | F4 |
| 9 | Claude API 연동 — `/api/ask` 통합 분석 | 🟢 | claude-opus-4-5, 판정+근거 200자 이내 |
| 10 | 손익분기 시뮬레이터 — `/api/simulate` | ⚪ | F6 |
| 11 | UI 디자인 마감 + 모바일 반응형 | ⚪ | |
| 12 | README 실행 방법 작성 | ⚪ | |
| 13 | 최종 git push + 제출 | ⚪ | |

---

## 🔑 환경변수 발급 상태

| 변수 | 상태 | 비고 |
|---|---|---|
| `FLASK_PORT` | ✅ 5001 | 5000은 macOS AirPlay 충돌 |
| `NAVER_CLIENT_ID` | ✅ 입력 완료 | |
| `NAVER_CLIENT_SECRET` | ✅ 입력 완료 | |
| `ANTHROPIC_API_KEY` | ⚠ 입력 필요 | `backend/.env`에 추가해야 `/api/ask` 동작 |

---

## 🚧 미해결 결정 사항

- [ ] 디자인 톤 최종 확정 (B안: 화이트 미니멀 잠정)
- [ ] 서비스명 ExEAT 로고/타이포 처리

---

## 🔄 현재 STEP 9 완료 — Claude AI 통합 분석

**완료된 것 (STEP 6 + 9)**:
- `backend/services/lifecycle.py` — 4주 이동평균 + 1차 미분으로 단계 판별
- `backend/services/claude.py` — Anthropic SDK, claude-opus-4-5, 200자 이내 판정
- `backend/routes/ask.py` — `/api/ask` = trend + lifecycle + Claude 통합 응답
- `backend/routes/trend.py` — `/api/trend`에도 lifecycle 필드 포함
- `frontend/src/App.tsx` — `/api/ask` 사용, AI reasoning 섹션 표시

**⚠ 실행 전 필수**: `backend/.env`에 `ANTHROPIC_API_KEY` 추가

---

## ⚡ 바로 다음에 할 것 (새 Claude는 여기서 바로 시작)

**지금 해야 할 작업: STEP 7 — 과거 케이스 라이브러리**

1. `backend/data/cases.json` 생성 — 대만카스테라, 흑당버블티 등 5~7개 사례
   - 스키마: `[{ id, name, pattern, peakYear, status, summary, keywords }]`
   - pattern: `"sudden_rise_fall"` / `"gradual_decline"` / `"steady"` / `"seasonal"`
2. `backend/routes/cases.py` — `GET /api/cases` + `GET /api/cases?pattern=X`
3. `backend/app.py` — `cases_bp` 등록
4. `frontend/src/components/CaseLibrary.tsx` — 유사 패턴 사례 카드 목록
5. `frontend/src/App.tsx` — 분석 후 `pattern` 기반으로 유사 사례 자동 표시
6. 완료 후 STEP 10 (손익분기 시뮬레이터) 진행

**실행 방법**:
```bash
# 터미널 1 (백엔드)
cd backend && FLASK_PORT=5001 FLASK_ENV=development python app.py

# 터미널 2 (프론트)
cd frontend && npm run dev
```
