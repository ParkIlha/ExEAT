# 🏗 ExEAT 시스템 설계도

> 시스템 구조 + 각 컴포넌트의 현재 구현 상태.
> 새 기능을 추가하거나 구조를 변경할 때 이 문서를 업데이트한다.

---

## 🎯 핵심 가치 명제

> "지금 이 트렌드 메뉴를 카페에 도입해도 될까?" 라는
> 카페 사장님의 질문에, 데이터와 AI로 **EXIT 타이밍**을 알려주는 진단 도구.

---

## 🔭 시스템 아키텍처

```
┌──────────────────────────────────────────────────┐
│  [브라우저 - React + Vite + shadcn/ui]            │
│   ├─ AskBox        (F9 메인 진입점)               │
│   ├─ TrendChart    (F3 그래프 + 평균 패턴)        │
│   ├─ VerdictCard   (F1, F2 판정)                  │
│   ├─ RegionPanel   (F4 지역 적합도)               │
│   ├─ Simulator     (F6 손익분기)                  │
│   └─ CaseLibrary   (F7 과거 사례)                 │
└────────────────┬─────────────────────────────────┘
                 │ HTTP (localhost:5001)
                 ▼
┌──────────────────────────────────────────────────┐
│  [Flask 서버 - Python]                            │
│   ├─ GET  /api/health    ← 헬스체크 🟢            │
│   ├─ POST /api/trend     ← DataLab 그래프 🟡      │
│   ├─ POST /api/ask       ← 메인 통합 분석 ⚪      │
│   ├─ POST /api/region    ← 지역 적합도 ⚪         │
│   ├─ POST /api/simulate  ← 손익분기 계산 ⚪       │
│   └─ GET  /api/cases     ← 정적 케이스 DB ⚪      │
└──────┬──────────┬─────────────┬─────────────────┘
       ▼          ▼             ▼
  네이버 DataLab  Claude API   주민등록 CSV
   (검색 트렌드)  (AI 추론)    (지역 인구)
```

---

## 📂 폴더 구조 (현재 상태)

```
ExEAT/
├── README.md                    🟢
├── .gitignore                   🟢
├── .env.example                 🟢
├── .env                         (사용자 로컬에만, git 제외)
│
├── backend/
│   ├── app.py                   🟡 STEP 2/3 — Blueprint 등록
│   ├── requirements.txt         🟡 STEP 2/3 — Flask, flask-cors, dotenv, requests
│   ├── routes/
│   │   ├── __init__.py          🟢
│   │   ├── health.py            🟢 STEP 2 — /api/health
│   │   ├── trend.py             🟡 STEP 3 — /api/trend
│   │   ├── ask.py               ⚪ F9 (예정)
│   │   ├── region.py            ⚪ F4 (예정)
│   │   ├── simulate.py          ⚪ F6 (예정)
│   │   └── cases.py             ⚪ F7 (예정)
│   ├── services/
│   │   ├── __init__.py          🟡 STEP 3
│   │   ├── naver.py             🟡 STEP 3 — DataLab fetch_trend()
│   │   ├── claude.py            ⚪ Claude 클라이언트 (예정)
│   │   └── lifecycle.py         ⚪ 수명주기 알고리즘 (예정)
│   └── data/
│       ├── cases.json           ⚪ F7 (예정)
│       └── population.csv       ⚪ F4 (예정)
│
├── frontend/                    ⚪ STEP 4 부터
│   ├── vite.config.ts           🟡 `/api` → `http://localhost:5001` 프록시
│   └── src/
│       └── App.tsx              🟡 Health 확인 + Trend 호출(임시 UI)
│
└── docs/
    ├── ARCHITECTURE.md          🟢 (이 문서)
    ├── PROGRESS.md              🟢
    ├── HANDOFF.md               🟢
    └── 문제정의서.md             ⚪
```

상태 표기: 🟢 완료 (사용자 검증) / 🟡 코드 제공됨 / ⚪ 대기

---

## 🔌 API 명세

| 메서드 | 경로 | 입력 | 출력 | 담당 기능 | 상태 |
|---|---|---|---|---|---|
| GET | `/api/health` | - | `{ok, service, message}` | 헬스체크 | 🟢 |
| POST | `/api/trend` | `{keyword}` | `{keyword, startDate, endDate, weeks: [{period, ratio}]}` | F1, F3 (raw 데이터) | 🟡 |
| POST | `/api/ask` | `{question, location?}` | 통합 분석 객체 | F9 | ⚪ |
| POST | `/api/region` | `{address, keyword}` | `{score, residentAges, consumerAges}` | F4 | ⚪ |
| POST | `/api/simulate` | `{unitCost, price, dailySales, exitWeek}` | `{breakEvenWeek, profit}` | F6 | ⚪ |
| GET | `/api/cases?pattern=X` | - | 과거 사례 배열 | F7 | ⚪ |

> `/api/trend` 는 STEP 3 에서는 raw 데이터만 반환. STEP 6 에서 수명주기 단계(`stage`) + EXIT 시점(`exitWeek`) 판별 로직이 추가될 예정.

---

## 🌐 외부 API 호출 명세

### 네이버 DataLab 검색어 트렌드
- **엔드포인트**: `POST https://openapi.naver.com/v1/datalab/search`
- **인증**: `X-Naver-Client-Id`, `X-Naver-Client-Secret` 헤더
- **요청 바디**:
  ```json
  {
    "startDate": "2024-MM-DD",
    "endDate":   "2024-MM-DD",
    "timeUnit":  "week",
    "keywordGroups": [
      {"groupName": "키워드", "keywords": ["키워드"]}
    ]
  }
  ```
- **응답**: `results[0].data` 배열에 `{period, ratio}` 형태로 시계열
- **주의**: ratio 는 **상대값** (기간 내 최댓값 = 100 으로 정규화)

---

## 🔄 데이터 흐름 (메인 시나리오, 최종 목표)

```
사용자: "지금 두쫀쿠 들어가도 될까요?" + 가게 위치 입력
           ↓
[POST /api/ask]
     │
     ├─→ /api/trend     (DataLab 12주치 검색량) 🟡
     ├─→ /api/region    (지역 인구 + 소비 연령)
     ├─→ /api/cases     (유사 패턴 과거 사례)
     │
     ▼ 모두 모아서
   Claude API에 통합 프롬프트 던짐
     ▼
   {decision, stage, exitWeek, regionScore, similarCases, reasoning, alternatives}
           ↓
프론트가 결과를 컴포넌트에 분배 렌더링
```

---

## 🎨 UI 설계 (모바일 적응형)

| 영역 | 모바일 (~768px) | 데스크톱 (≥1024px) |
|---|---|---|
| 헤더 | 풀폭 | 풀폭 |
| AskBox (F9) | 풀폭 | 좌측 컬럼 (40%) |
| 결과 카드들 | 세로 스택 | 우측 컬럼 (60%) |

**디자인 톤** (잠정 B안):
- 배경: `#FAFAF7` 오프화이트
- 본문: `#1A1A1A`
- GO: `#2D7A4F` / WAIT: `#C9883A` / STOP: `#C13B3B`
- 헤딩/본문: Pretendard
- 숫자/그래프 라벨: JetBrains Mono

---

## 🧠 핵심 알고리즘: 수명주기 단계 판별 (STEP 6 예정)

12주치 시계열에서:
1. 이동평균(4주) 으로 노이즈 제거
2. 1차 미분 → 추세 (상승/하락)
3. 2차 미분 → 변곡점 탐지
4. 단계 분류 (도입기 / 성장기 / 정점 / 쇠퇴기)
5. EXIT 시점 추정 (50% 하락 예상 시점)

---

## ⚠️ 알려진 제약

- 네이버 DataLab은 **상대값(0~100)** 만 제공 → 절대 검색량 비교 어려움
- 12주 시계열로 추세 방향성 위주 해석
- F7 케이스 라이브러리는 **수기 큐레이션**
- macOS 5000 포트 AirPlay 충돌 → **5001 사용**
- 해커톤 데모는 **localhost** 시연 (배포 후순위)
