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
                 │ HTTP (localhost:5000)
                 ▼
┌──────────────────────────────────────────────────┐
│  [Flask 서버 - Python]                            │
│   ├─ POST /api/ask       ← 메인 통합 분석         │
│   ├─ POST /api/trend     ← DataLab 그래프         │
│   ├─ POST /api/region    ← 지역 적합도            │
│   ├─ POST /api/simulate  ← 손익분기 계산          │
│   └─ GET  /api/cases     ← 정적 케이스 DB         │
└──────┬──────────┬─────────────┬─────────────────┘
       ▼          ▼             ▼
  네이버 DataLab  Claude API   주민등록 CSV
   (검색 트렌드)  (AI 추론)    (지역 인구)
```

---

## 📂 폴더 구조 (목표)

```
ExEAT/
├── README.md                    🟢
├── .gitignore                   🟢
├── .env.example                 🟢
├── .env                         (git 제외, 사용자 로컬에만)
│
├── backend/
│   ├── app.py                   ⚪ Flask 진입점
│   ├── requirements.txt         ⚪
│   ├── routes/
│   │   ├── ask.py               ⚪ F9
│   │   ├── trend.py             ⚪ F1, F3
│   │   ├── region.py            ⚪ F4
│   │   ├── simulate.py          ⚪ F6
│   │   └── cases.py             ⚪ F7
│   ├── services/
│   │   ├── naver.py             ⚪ DataLab 클라이언트
│   │   ├── claude.py            ⚪ Claude 클라이언트
│   │   └── lifecycle.py         ⚪ 수명주기 알고리즘
│   └── data/
│       ├── cases.json           ⚪ F7 정적 데이터
│       └── population.csv       ⚪ F4 행정구역 인구
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx              ⚪
│   │   ├── main.jsx             ⚪
│   │   ├── components/
│   │   │   ├── AskBox.jsx       ⚪
│   │   │   ├── TrendChart.jsx   ⚪
│   │   │   ├── VerdictCard.jsx  ⚪
│   │   │   ├── RegionPanel.jsx  ⚪
│   │   │   ├── Simulator.jsx    ⚪
│   │   │   └── CaseLibrary.jsx  ⚪
│   │   ├── api/
│   │   │   └── client.js        ⚪
│   │   └── styles/
│   │       └── theme.css        ⚪
│   ├── package.json             ⚪
│   └── vite.config.js           ⚪
│
└── docs/
    ├── ARCHITECTURE.md          🟢 (이 문서)
    ├── PROGRESS.md              🟢
    ├── HANDOFF.md               🟢
    └── 문제정의서.md             ⚪
```

상태 표기: 🟢 완료 / 🟡 진행 중 / ⚪ 대기

---

## 🔌 API 명세

| 메서드 | 경로 | 입력 | 출력 | 담당 기능 | 상태 |
|---|---|---|---|---|---|
| POST | `/api/ask` | `{question, location?}` | 통합 분석 객체 | F9 (F1~F4, F7 호출) | ⚪ |
| POST | `/api/trend` | `{keyword}` | `{weeks, values, stage, exitWeek}` | F1, F3 | ⚪ |
| POST | `/api/region` | `{address, keyword}` | `{score, residentAges, consumerAges, comment}` | F4 | ⚪ |
| POST | `/api/simulate` | `{unitCost, price, dailySales, exitWeek}` | `{breakEvenWeek, profit, riskLevel}` | F6 | ⚪ |
| GET | `/api/cases?pattern=X` | - | 과거 사례 배열 | F7 | ⚪ |
| GET | `/api/health` | - | `{ok: true}` | 헬스체크 | ⚪ |

---

## 🔄 데이터 흐름 (메인 시나리오)

```
사용자: "지금 두쫀쿠 들어가도 될까요?" + 가게 위치 입력
           ↓
[POST /api/ask]
     │
     ├─→ /api/trend     (DataLab 12주치 검색량)
     ├─→ /api/region    (지역 인구 + 소비 연령)
     ├─→ /api/cases     (유사 패턴 과거 사례)
     │
     ▼ 모두 모아서
   Claude API에 통합 프롬프트 던짐
     ▼
   {
     decision: "WAIT",
     stage: "정점",
     exitWeek: 2.3,
     regionScore: 35,
     similarCases: [대만카스테라, ...],
     reasoning: "...",
     alternatives: [...]
   }
           ↓
프론트가 결과를 컴포넌트에 분배 렌더링
           ↓
사용자가 Simulator에 발주량/단가 입력 → 손익분기 계산
```

---

## 🎨 UI 설계 (모바일 적응형)

**한 페이지 SPA**, 위에서 아래로 흐름:

| 영역 | 모바일 (~768px) | 데스크톱 (≥1024px) |
|---|---|---|
| 헤더 | 풀폭 | 풀폭 |
| AskBox (F9) | 풀폭 | 좌측 컬럼 (40%) |
| 결과 카드들 | 세로 스택 | 우측 컬럼 (60%) |

**디자인 톤** (잠정 B안):
- 배경: `#FAFAF7` 오프화이트
- 본문: `#1A1A1A`
- GO: `#2D7A4F`(녹) / WAIT: `#C9883A`(주황) / STOP: `#C13B3B`(적)
- 헤딩: Pretendard Bold
- 본문: Pretendard Regular
- 숫자/그래프 라벨: JetBrains Mono

---

## 🧠 핵심 알고리즘: 수명주기 단계 판별

DataLab에서 받은 12주치 검색량 시계열을 입력으로:

1. **이동평균 (4주 윈도우)** 으로 노이즈 제거
2. **1차 미분** 으로 상승/하락 추세 판정
3. **2차 미분** 으로 변곡점 탐지
4. 단계 분류:
   - 도입기: 검색량 낮고 상승 중
   - 성장기: 1차 미분 양 + 큰 값
   - 정점: 1차 미분 부호 전환 직전/직후
   - 쇠퇴기: 1차 미분 음 + 지속

5. **EXIT 시점 예측**: 현재 기울기 + 과거 유사 패턴으로 50% 하락 시점 추정

> 자세한 구현은 `backend/services/lifecycle.py` (예정)

---

## ⚠️ 알려진 제약 / 리스크

- 네이버 DataLab은 **상대값(0~100)** 만 제공 → 절대 검색량 추정 어려움
- 데이터 점이 적어 (최대 12주) 정확도보다 **추세 방향성** 위주로 해석
- F7 케이스 라이브러리는 **수기 큐레이션** 데이터 (실시간 학습 X)
- 해커톤 데모는 **localhost** 시연 — 배포는 후순위

---

## 🔗 외부 의존성

| 서비스 | 용도 | 키 필요 | 무료 여부 |
|---|---|---|---|
| 네이버 DataLab | 검색어 트렌드 12주치 | ✅ | ✅ |
| Anthropic Claude | AI 추론 / 통합 분석 | ✅ | ❌ (유료) |
| 행정안전부 인구통계 | 행정동 거주 인구 | ❌ (CSV) | ✅ |
