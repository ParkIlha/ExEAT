# ExEAT — 외식 트렌드 EXIT 타이밍 진단 도구

> **"이 메뉴, 지금 들여도 괜찮은 타이밍일까?"**
>
> 소상공인을 위한 데이터 기반 외식 트렌드 진단 서비스.  
> 트렌드 메뉴를 따라 들였다가 재고만 남긴 외식업 사장님들을 위해 만들었습니다.

---

## 🎯 프로젝트 개요

ExEAT은 **EXIT + EAT**의 합성어로, 외식 트렌드의 **진입 타이밍과 EXIT 타이밍**을 데이터로 진단해주는 도구입니다.

음식점·분식·디저트·주점 등 **모든 외식업 업종**을 대상으로, 네이버 DataLab 검색 트렌드(52주)를 주 데이터 소스로 사용하고, 구글 트렌드를 교차 검증에 활용하며, Gemini AI가 사용자 업종·지역·계절성까지 고려한 종합 진단 리포트를 생성합니다.

---

## ✨ 주요 기능

### 📊 데이터 소스 (우선순위 순)

| 데이터 소스 | 역할 | 비고 |
|---|---|---|
| 네이버 DataLab | 52주 검색 관심도 — 본질 분류(TREND/STEADY) 기준 | 주 데이터 소스 |
| 구글 트렌드 | 12주 방향성 교차 검증 | 실패 시 폴백 |
| 합성(synthetic) 시계열 | 완전 오프라인 데모 폴백 | 최후 수단 |

### 🔬 2축 수명주기 분류 (v2 알고리즘)

52주 장기 데이터와 12주 단기 데이터를 각각 분석해 두 개의 축으로 분류합니다.

**Nature 축 (본질: 트렌드냐 스테디냐)**

| 값 | 기준 |
|---|---|
| `TREND` | 정점/평균 비율 ≥ 2.0 (폭발적 트렌드 이력) |
| `STEADY` | 그 외 — 장기적으로 안정된 메뉴 |

**Cycle 축 (현재 위치)**

| 값 | 적용 대상 | 설명 |
|---|---|---|
| `EMERGING` | TREND | 초기 상승 |
| `RISING` | TREND | 확산기 |
| `PEAK` | TREND | 정점 과열 |
| `DECLINING` | TREND | 하락 추세 |
| `FADED` | TREND | 소멸 (정점 대비 50%+ 하락) |
| `SATURATED` | STEADY | 포화 시장 |
| `GROWING` | STEADY | 안정 성장 |
| `STABLE` | STEADY | 변동 없는 정체 |

### 🤖 AI 비용 최적화 (skipAI)

- 알고리즘 신뢰도가 높은 케이스(`DECLINING`, `FADED`, `GROWING` 등)는 **Gemini 호출 없이 자동 reasoning**으로 처리
- 경계 케이스(`PEAK` 등) 또는 사용자 프로필이 있는 경우에만 Gemini 호출
- AI 응답도 인메모리 캐시 + 파일 기반 일일 캐시(24h)로 중복 호출 방지

### 🌸 계절성 감지

52주 데이터에서 연간 계절 패턴을 자동 탐지합니다.

- `isSeasonal`: 계절 메뉴 여부
- `peakMonth`: 검색 피크 월
- `seasonPhase`: `peak` / `approaching` / `offseason`
- 계절 메뉴가 비수기(오프시즌)에서 `STOP`으로 오분류되는 걸 방지 — `WAIT`으로 보정 후 AI 재평가

### 🧠 AI 진단 (Gemini 2.5 Flash)

- 사용자 업종(음식점/분식/디저트/주점 등) + 지역 맞춤 분석
- 현재 월/시즌 컨텍스트 주입 (계절 메뉴 오판 방지)
- `dataInsight` / `marketContext` / `actionPlan` / `worstCase` / `alternatives`

### 💰 손익분기 시뮬레이터

- 단가·원가·일 판매량·고정비 입력
- EXIT 전까지 주차별 누적 수익 시뮬레이션
- 분석 결과 → plan 탭에서 바로 접근 가능

### 🗺️ 지역 적합도 분석

- 시/도별 인구 데이터 기반 상권 분석
- 연령대별 소비 패턴 매칭

---

## 🧮 알고리즘 상세

### 1) 입력 데이터 특성

네이버 DataLab `ratio`는 **조회 기간 내 최댓값을 100으로 정규화한 상대값**입니다.  
키워드 간 절대 비교가 아닌, 동일 키워드의 시간 흐름(상승/하락/정점) 파악에 최적화되어 있습니다.

### 2) 핵심 지표 계산

- **EWMA 평활화**: `pandas.ewm(span=4)` 로 노이즈 제거
- **기울기(slope)**: `scipy.stats.linregress` 선형회귀 기울기 + R²
- **모멘텀**: 최근 2주 기울기 평균 − 이전 2주 기울기 평균 (가속/감속)
- **변동성(volatility)**: 최근 8주 표준편차
- **정점 하락률(peakDecay)**: `(peak - current) / peak`
- **변곡점(inflectionWeek)**: 기울기 부호가 마지막으로 바뀐 주차

### 3) Stage 판별 (rising / peak / declining / stable)

`delta(최근 4주 - 이전 4주 평균)`와 최근 기울기를 조합:

- **rising**: delta ≥ +6 이고 기울기 양수
- **declining**: delta ≤ −6
- **peak**: 현재값이 정점의 80% 이상 (정점 근처 과열)
- **stable**: 위 조건에 해당하지 않는 완만한 정체

### 4) EXIT 시점 추정 (exitWeek)

하락기에서 최근 하락 속도를 이용, 현재 수준의 50%까지 떨어지는 데 걸리는 주 수를 근사합니다.

### 5) 위험도(riskScore) 0~100

| 요소 | 가중치 | 설명 |
|---|---|---|
| peakDecay | 40% | 정점 대비 얼마나 꺾였나 |
| delta | 25% | 최근 4주 평균 변화량 |
| momentum | 20% | 하락 가속 여부 |
| volatility | 15% | 들쭉날쭉할수록 위험 |

---

## 🛠 기술 스택

| 영역 | 기술 |
|---|---|
| **Frontend** | React 18 + Vite + TypeScript |
| **UI/UX** | Tailwind CSS v4 + shadcn/ui + Fluent Design |
| **애니메이션** | framer-motion |
| **상태관리** | Zustand + persist (localStorage) |
| **차트** | Recharts (ComposedChart) |
| **Backend** | Python 3.11 + Flask |
| **AI** | Google Gemini 2.5 Flash (google-genai SDK) |
| **분석 모델** | scipy (선형회귀) + pandas (EWMA) |
| **트렌드 데이터** | 네이버 DataLab API (52주) |
| **교차 검증** | Google Trends (pytrends, 12주) |
| **캐시** | 파일 기반 일일 캐시 + 인메모리 캐시 |
| **DB** | SQLite (사용자/이력/프로필) |

---

## 🚀 실행 방법

### 1. 저장소 클론

```bash
git clone https://github.com/ParkIlha/ExEAT
cd ExEAT
```

### 2. 환경변수 설정

```bash
cp backend/.env.example backend/.env
```

`backend/.env` 파일에 다음 값 입력:

```env
FLASK_PORT=5001
FLASK_ENV=development
JWT_SECRET=<로그인 토큰 서명 키>
GEMINI_API_KEY=<Google AI Studio 발급 (AIzaSy...)>
GOOGLE_CLIENT_ID=<Google OAuth Web Client ID>
```

`frontend/.env` 파일 (Google 로그인 사용 시):

```env
VITE_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
```

> **Gemini API 키**: https://aistudio.google.com/apikey  
> **Google OAuth Client ID**: Google Cloud Console → OAuth Client(Web) 생성 → `http://localhost:5173` Origin 등록

### 3. 백엔드 실행

```bash
cd backend
pip install -r requirements.txt
python app.py
# → http://localhost:5001
```

### 4. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## 📡 API 명세

### `POST /api/ask`
메인 분석 엔드포인트.

**Request**
```json
{
  "keyword": "두바이초콜릿",
  "userProfile": {
    "businessType": "restaurant",
    "region": "서울"
  }
}
```

**Response 주요 필드**
```json
{
  "keyword": "두바이초콜릿",
  "verdict": "STOP",
  "nature": "TREND",
  "cycle": "FADED",
  "stage": "declining",
  "riskScore": 78,
  "itemType": "fading",
  "exitWeek": 3,
  "isSeasonal": false,
  "skipAI": true,
  "confidence": 0.9,
  "dataSource": "naver_datalab",
  "forecast": [{"week": 1, "ratio": 52.1}],
  "signalDivergence": {"type": "neutral", "signalsUp": 0},
  "dataInsight": "...",
  "marketContext": "...",
  "actionPlan": {
    "immediate": ["..."],
    "shortterm": ["..."],
    "midterm": ["..."],
    "worstCase": "...",
    "alternatives": ["..."]
  },
  "aiProvider": "algorithm"
}
```

### `GET /api/trend?keyword=탕후루`
12주 검색량 시계열 조회

### `GET /api/trending`
현재 뜨는 외식 키워드 Top N (1시간 캐시)

### `POST /api/region/analyze`
지역 인구 데이터 기반 적합도 분석

### `POST /api/simulate`
손익분기 시뮬레이션

### `PATCH /api/auth/profile`
사용자 지역·업종 저장 (Bearer 토큰 필요)

```json
{ "region": "서울", "businessType": "restaurant" }
```

---

## 📁 프로젝트 구조

```
ExEAT/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── routes/
│   │   ├── ask.py          # 메인 분석 API (캐시 + skipAI + 폴백)
│   │   ├── auth.py         # 로그인/회원가입/프로필 + 이력
│   │   ├── trend.py
│   │   ├── region.py
│   │   ├── simulate.py
│   │   ├── trending.py     # 트렌딩 키워드 (1시간 캐시)
│   │   └── cache_admin.py  # 캐시 초기화
│   ├── services/
│   │   ├── lifecycle.py        # 2축 수명주기 분류 + 계절성 감지
│   │   ├── ai.py               # Gemini 분석 (다중 모델 폴백 + 캐시)
│   │   ├── naver.py            # 네이버 DataLab API (12주/52주)
│   │   ├── google_trend.py     # pytrends 연동 (교차 검증용)
│   │   ├── cache.py            # 파일 기반 일일 캐시
│   │   ├── auth_service.py     # SQLite 사용자/이력/프로필
│   │   ├── synthetic_trend.py  # 오프라인 합성 시계열
│   │   ├── region.py
│   │   └── trending.py
│   └── data/
│       ├── population.json     # 지역별 인구 통계
│       └── cache/              # 파일 캐시 (.gitignore)
│
└── frontend/
    ├── src/
    │   ├── App.tsx              # 라우터 + 헤더/푸터
    │   ├── store/
    │   │   ├── analysis.ts      # Zustand + persist (결과 캐시 + userProfile)
    │   │   └── auth.ts          # 토큰 + 프로필 동기화 + 이력
    │   ├── pages/
    │   │   ├── Home.tsx         # 히어로 + 온보딩 + 트렌딩
    │   │   ├── Result.tsx       # 진단 리포트 (data/ai/plan 탭)
    │   │   └── Simulate.tsx     # 손익분기 시뮬레이터
    │   └── components/
    │       ├── OnboardingModal.tsx  # 업종·지역 선택 (첫 방문 시)
    │       ├── TrendChart.tsx
    │       ├── TrendingSection.tsx
    │       ├── LoginModal.tsx
    │       ├── HistoryMenu.tsx
    │       └── CountUp.tsx
    └── public/
        └── logo.png
```

---

## 🎨 디자인 시스템

**Fluent Design** 기반의 데이터 진단 UI

- **배경**: `#FAFAF7` (오프화이트)
- **GO**: `#2D7A4F` (초록 + glow)
- **WAIT**: `#C9883A` (주황 + glow)
- **STOP**: `#C13B3B` (빨강 + glow)
- **카드**: Acrylic (frosted glass) + 4단계 elevation shadow
- **폰트**: Pretendard (한글) + JetBrains Mono (숫자)
- **애니메이션**: framer-motion + Fluent ease curve

---

## 📌 개발 현황

| 기능 | 상태 |
|---|---|
| 네이버 DataLab 검색 트렌드 (52주) | ✅ |
| 구글 트렌드 교차 검증 | ✅ (가능한 경우) |
| 오프라인(합성) 시계열 폴백 | ✅ |
| 2축 수명주기 분류 (TREND/STEADY × Cycle) | ✅ |
| 계절성 자동 감지 | ✅ |
| AI 비용 최적화 (skipAI) | ✅ |
| 파일 기반 일일 캐시 | ✅ |
| 위험도 분석 (riskScore) | ✅ |
| 신호 교차 분석 (거품 경보) | ✅ |
| Gemini AI 진단 리포트 | ✅ |
| 손익분기 시뮬레이터 | ✅ (Result → plan 탭에서 접근) |
| 지역 적합도 분석 | ✅ |
| 트렌딩 키워드 | ✅ |
| 사용자 온보딩 (업종·지역 선택) | ✅ |
| 분석 시 userProfile 자동 주입 | ✅ |
| 사용자 프로필 DB 저장/복원 | ✅ |
| 로그인/회원가입 (이메일) | ✅ |
| Google Sign-In | ✅ |
| 분석 이력 저장/조회 (SQLite) | ✅ |
| 캐시 초기화 (서버 + 로컬) | ✅ |
| Fluent Design UI | ✅ |

---

## 🧭 핸드오프 (현재 상태 & 남은 과제)

### 현재 상태 (2026-05-09)

- **알고리즘**: `lifecycle.py` v2 — 52주 장기 + 12주 단기 2축 분류, 계절성 감지, skipAI 최적화
- **데이터**: 네이버 DataLab(주) → 구글 트렌드(폴백) → 합성 시계열(최후)
- **AI**: Gemini 2.5 Flash, 고신뢰도 케이스는 AI 미호출 (비용 절감)
- **캐시**: 파일 일일 캐시(24h) + 인메모리 캐시 (중복 분석 방지)
- **사용자**: 온보딩(업종/지역) → Zustand + SQLite 동기화, 분석 시 AI 컨텍스트에 자동 주입
- **UX**: 시뮬레이터는 홈/NAV에서 제거, 분석 결과 plan 탭에서 CTA로 접근

### 실행 최소 환경변수

`backend/.env`:
```env
FLASK_PORT=5001
JWT_SECRET=change-me-in-production
GEMINI_API_KEY=AIzaSy...
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
```

`frontend/.env`:
```env
VITE_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
```

### 트러블슈팅

| 증상 | 확인 사항 |
|---|---|
| 백엔드 포트 충돌 | `lsof -nP -iTCP:5001 -sTCP:LISTEN` |
| Google 로그인 안 됨 | `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` 누락 또는 콘솔 Origin 미등록 |
| 캐시로 인한 오래된 결과 | 푸터 "로컬·서버 캐시 초기화" 버튼 클릭 |

### 남은 과제 (우선순위)

- **P0**: 배포 환경 Google Sign-In HTTPS 설정
- **P1**: 이력 관리 (삭제/핀/검색), 일일 분석 한도
- **P2**: 번들 최적화 (code-splitting), API latency 로깅

---

## 📜 라이선스

MIT
