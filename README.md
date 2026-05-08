# ExEAT — 카페 트렌드 EXIT 타이밍 진단 도구

> **"지금 이 메뉴, 카페에 넣어도 될까요?"**
> 
> 진입 타이밍이 아닌 **EXIT 타이밍**을 알려주는 소상공인용 진단 도구.  
> 대만카스테라·탕후루·두바이초콜릿... 트렌드 메뉴를 따라 창업했다가 재고만 남긴 경험, 이제 데이터로 막습니다.

---

## 핵심 기능

| 기능 | 설명 |
|---|---|
| **F1 EXIT 타이밍** | 검색량 50% 이하 도달 예상 주차 자동 계산 |
| **F2 GO/WAIT/STOP 판정** | Claude AI + 수명주기 알고리즘 통합 판정 |
| **F3 트렌드 그래프** | 최근 12주 검색량 + 쇼핑클릭 이중 라인 |
| **F4 지역 적합도** | 행정안전부 인구 데이터 기반 지역별 도입 적합도 |
| **F6 손익분기 시뮬레이터** | 재료비·판매가·판매량 → EXIT 전 예상 수익 계산 |
| **F7 과거 케이스 라이브러리** | 대만카스테라·탕후루 등 6개 실패 사례 패턴 분석 |
| **F9 자유 질문** | 키워드 입력 → AI 종합 분석 리포트 |

---

## 기술 스택

| 영역 | 스택 |
|---|---|
| Backend | Python 3.11 + Flask 3 (port 5001) |
| Frontend | React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui |
| 차트 | recharts |
| 트렌드 데이터 | 네이버 DataLab + 쇼핑인사이트 API |
| AI 판정 | Anthropic Claude (claude-opus-4-5) |
| 인구 데이터 | 행정안전부 주민등록 인구통계 (2024) |

---

## 실행 방법

### 1. 환경변수 설정

```bash
cp backend/.env.example backend/.env
```

`backend/.env` 에 아래 값을 채워넣으세요:

```env
FLASK_PORT=5001
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
ANTHROPIC_API_KEY=your_anthropic_api_key
```

> 네이버 API 키 발급: https://developers.naver.com/apps/  
> Anthropic API 키 발급: https://console.anthropic.com/

### 2. 백엔드 실행

```bash
cd backend
pip install -r requirements.txt
python app.py
# → http://localhost:5001
```

### 3. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## API 명세

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/health` | 서버 상태 확인 |
| POST | `/api/ask` | 키워드 → 트렌드 + AI 판정 (메인) |
| POST | `/api/trend` | 키워드 → 트렌드 데이터만 |
| GET | `/api/cases` | 과거 케이스 목록 (`?pattern=` 필터) |
| POST | `/api/simulate` | 손익분기 시뮬레이션 |
| GET | `/api/region/list` | 지역 목록 |
| POST | `/api/region/analyze` | 지역 + 트렌드 단계 → 적합도 |

### POST `/api/ask` 요청/응답 예시

```json
// Request
{ "keyword": "두바이초콜릿" }

// Response
{
  "keyword": "두바이초콜릿",
  "startDate": "2025-02-07",
  "endDate": "2025-05-07",
  "weeks": [{ "period": "2025-02-10", "ratio": 85 }, ...],
  "shoppingWeeks": [{ "period": "2025-02-10", "ratio": 72 }, ...],
  "stage": "declining",
  "verdict": "STOP",
  "exitWeek": 3,
  "peakWeek": 2,
  "reasoning": "검색량이 정점 대비 40% 하락..."
}
```

---

## 프로젝트 구조

```
ExEAT/
├── backend/
│   ├── app.py                 # Flask 진입점
│   ├── routes/
│   │   ├── health.py          # GET  /api/health
│   │   ├── trend.py           # POST /api/trend
│   │   ├── ask.py             # POST /api/ask  ← 메인
│   │   ├── cases.py           # GET  /api/cases
│   │   ├── simulate.py        # POST /api/simulate
│   │   └── region.py          # GET/POST /api/region/*
│   ├── services/
│   │   ├── naver.py           # DataLab + 쇼핑인사이트 클라이언트
│   │   ├── lifecycle.py       # 수명주기 분석 (4주 이동평균)
│   │   ├── claude.py          # Anthropic SDK 래퍼
│   │   └── region.py          # 지역 인구 분석
│   └── data/
│       ├── cases.json         # 과거 사례 6개
│       └── population.json    # 행안부 인구 데이터
└── frontend/
    └── src/
        ├── App.tsx
        └── components/
            ├── TrendChart.tsx     # recharts AreaChart (검색량 + 쇼핑)
            ├── CaseLibrary.tsx    # 과거 사례 아코디언
            ├── Simulator.tsx      # 손익분기 입력 + 그래프
            └── RegionPanel.tsx    # 지역 적합도 패널
```

---

## 디자인 원칙

- **화이트 미니멀, 진단서 느낌** — 감성이 아닌 데이터를 전면에
- **GO(#2D7A4F) / WAIT(#C9883A) / STOP(#C13B3B)** — 신호등 색채 시스템
- Pretendard (본문) + JetBrains Mono (숫자/라벨) 타이포그래피

---

## 팀

해커톤 제출 프로젝트 — 대중문화의 구조적 문제 트랙  
GitHub: https://github.com/ParkIlha/ExEAT
