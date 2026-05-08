# ExEAT — 외식 트렌드 EXIT 타이밍 진단 도구

> **"이 메뉴, 지금 들여도 괜찮은 타이밍일까?"**
>
> 소상공인을 위한 데이터 기반 외식 트렌드 진단 서비스.  
> 트렌드 메뉴를 따라 들였다가 재고만 남긴 카페·식당 사장님들을 위해 만들었습니다.

---

## 🎯 프로젝트 개요

ExEAT은 **EXIT + EAT**의 합성어로, 외식 트렌드의 **진입 타이밍과 EXIT 타이밍**을 데이터로 진단해주는 도구입니다.

네이버 DataLab 검색 트렌드, 쇼핑인사이트, 블로그/뉴스 버즈, 구글 트렌드를 교차 분석하고 Gemini AI가 종합 진단 리포트를 생성합니다.

---

## ✨ 주요 기능

### 📊 멀티 소스 데이터 분석
| 데이터 소스 | 측정 지표 |
|---|---|
| 네이버 DataLab | 12주 검색 관심도 (0~100 정규화) |
| 네이버 쇼핑인사이트 | 구매 직전 클릭 시그널 |
| 네이버 블로그 | UGC 버즈 (실제 소비 근거) |
| 네이버 뉴스 | 미디어 노출 수준 |
| 구글 트렌드 | 글로벌 관심도 교차 검증 |

### 🔬 수명주기 심층 분석
- **단계 판별**: rising / peak / declining / stable
- **모멘텀**: 최근 가속도 (상승/하락 빠르기)
- **변동성**: 표준편차 기반 안정성 지표
- **변곡점 감지**: 추세가 꺾인 주차 자동 탐지
- **4주 예측**: Facebook Prophet 기반 시계열 예측 (실패 시 Holt‑Winters → 선형회귀 폴백)
- **종합 위험도**: 0~100 스코어 (decay·delta·momentum·volatility 가중합)

---

## 🧮 그래프(시계열) 분석 알고리즘은 어떻게 작동하나요?

ExEAT의 “그래프 분석”은 **네이버 DataLab 주간 검색 관심도 시계열(week → ratio)** 을 입력으로 받아, 짧은 12~26주 데이터에서도 **추세 전환과 과열/침체를 빠르게 포착**하도록 설계되어 있습니다.

### 1) 입력 데이터의 특성 (중요)
- 네이버 DataLab의 `ratio`는 **절대 검색량이 아니라, 조회 기간 내 최댓값을 100으로 정규화한 상대값**입니다.  
  즉 **키워드 간 절대 비교**가 아니라, **동일 키워드의 시간 흐름(상승/하락/정점)** 을 보는 데 최적화돼 있습니다.

### 2) 노이즈 완화 (4주 이동평균)
- 원본 `ratio`는 주간 변동이 크기 때문에, `window=4`의 **이동평균**으로 한 번 평활화한 뒤 파생 지표를 계산합니다.

### 3) 핵심 지표 계산
- **최근 변화량 \(delta\)**: \(\text{avg(last 4w)} - \text{avg(prev 4w)}\)  
- **기울기(derivative)**: 이동평균의 주간 차분(상승/하락 방향)
- **모멘텀(momentum)**: 최근 2주 기울기 평균 − 이전 2주 기울기 평균 (가속/감속)
- **변동성(volatility)**: 최근 8주(없으면 전체)의 표준편차
- **정점 하락률(peakDecay)**: \((\text{peak} - \text{current}) / \text{peak}\)
- **변곡점(inflectionWeek)**: 기울기 부호가 마지막으로 바뀐 주차(상승→하락 / 하락→상승)

### 4) Stage 판별 (rising / peak / declining / stable)
`delta`와 최근 기울기를 조합해 단계를 나눕니다.
- **rising**: 최근 4주 평균이 뚜렷하게 상승(기본 임계값 \(+6\))이고 기울기도 양(+)  
- **declining**: 최근 4주 평균이 뚜렷하게 하락(기본 임계값 \(-6\))  
- **peak**: 현재값이 정점의 80% 이상(정점 근처 횡보/과열 구간)  
- **stable**: 위 조건에 해당하지 않는 완만한 정체

### 5) GO / WAIT / STOP (알고리즘 1차 판정)
- rising → **GO**
- peak/stable → **WAIT**
- declining → **STOP**

> 실제 사용자에게 보여주는 최종 verdict는, 위 지표를 기반으로 **Gemini가 해석·전략화**한 결과(또는 AI 미사용 시 알고리즘 폴백)를 사용합니다.

### 6) EXIT 시점 추정 (exitWeek)
- 하락기(`declining`)에서 최근 하락 속도를 이용해, **현재 수준의 50%까지 떨어지는 데 걸리는 주 수**를 근사합니다.  
  \(weeklyDrop \approx |recentDeriv|\) (또는 \( |delta|/4 \))

### 7) 4주 예측 (forecast)
- 기본은 **Facebook Prophet**으로 변동점(changepoint)을 감지해 다음 4주를 예측합니다.  
- 실패(모듈/환경/데이터 문제) 시 **Holt‑Winters(추세 반영 지수평활) → 선형회귀**로 자동 폴백합니다.

### 8) 위험도(riskScore) 0~100
아래 요소를 가중합하고, stage에 따라 가산/감산합니다.
- **peakDecay(40%)**: 정점 대비 얼마나 꺾였나
- **delta(25%)**: 최근 4주 평균 변화량(하락일수록 위험 증가)
- **momentum(20%)**: 하락 가속(음수)일수록 위험 증가
- **volatility(15%)**: 들쭉날쭉할수록 위험 증가

### 9) 메뉴 유형(itemType) 분류 (단계와 별개 축)
stage와 별개로, 평균 수준/변동계수/가속/하락률을 조합해 예: `trending`, `steady_saturated`, `steady_emerging`, `steady_safe`, `classic`, `seasonal`, `niche`, `stable` 등을 분류합니다.  
이 분류는 AI 프롬프트 톤과 액션 플랜의 방향(선점 vs 차별화 vs 재고 소진)을 크게 바꿉니다.

### 🏷️ 메뉴 유형 분류 (7종)
| 유형 | 설명 |
|---|---|
| trending | 폭발적 상승 중인 뜨는 메뉴 |
| classic | 장기 안정 + 충성 수요 |
| seasonal | 계절성 큰 메뉴 |
| growing | 점진적 우상향 |
| fading | 정점 대비 50%+ 하락, 한물감 |
| niche | 소규모 충성층 틈새 |
| stable | 방향성 없는 정체 |

### 🤖 신호 교차 분석 (거품 경보)
- **실수요 확인**: 검색·쇼핑·블로그 모두 상승 일치
- **거품 경보**: 검색↑ 인데 쇼핑·UGC 낮음
- **충성층 존재**: 검색↓ 인데 블로그 콘텐츠 활발
- **미디어 주도**: 뉴스↑ 인데 실 소비 UGC 적음

### 🧠 AI 진단 (Gemini 2.5 Flash)
- 사용자 업종(카페/식당/분식 등) + 지역 맞춤 분석
- `dataInsight`: 수치 기반 핵심 인사이트
- `marketContext`: 시장 맥락 + 계절성 + 경쟁 분석
- `actionPlan`: 즉시/1개월/3개월 액션 플랜
- `worstCase`: 최악 시나리오
- `alternatives`: 대체 메뉴 추천

### 💰 손익분기 시뮬레이터
- 단가·원가·일 판매량·고정비 입력
- EXIT 전까지 주차별 누적 수익 시뮬레이션

### 🗺️ 지역 적합도 분석
- 시/도별 인구 데이터 기반 상권 분석
- 연령대별 소비 패턴 매칭

---

## 🛠 기술 스택

| 영역 | 기술 |
|---|---|
| **Frontend** | React 18 + Vite + TypeScript |
| **UI/UX** | Tailwind CSS v4 + shadcn/ui + Fluent Design |
| **애니메이션** | framer-motion + CSS transitions |
| **상태관리** | Zustand + persist (localStorage) |
| **차트** | Recharts (ComposedChart) |
| **Backend** | Python 3.11 + Flask |
| **AI** | Google Gemini 2.5 Flash (google-genai SDK) |
| **예측 모델** | Facebook Prophet + Holt-Winters (statsmodels) |
| **트렌드 데이터** | 네이버 DataLab + 쇼핑인사이트 API |
| **소셜 데이터** | 네이버 블로그/뉴스 검색 API |
| **글로벌 데이터** | Google Trends (pytrends) |

---

## 🚀 실행 방법

### 1. 사전 준비

```bash
# 저장소 클론
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

> **Gemini API 키 발급**: https://aistudio.google.com/apikey
>
> **Google OAuth Client ID 발급**: Google Cloud Console → OAuth Client(Web) 생성 후, `http://localhost:5173`를 Origin으로 등록

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
    "businessType": "cafe",
    "region": "서울"
  }
}
```

**Response**
```json
{
  "keyword": "두바이초콜릿",
  "verdict": "GO",
  "stage": "rising",
  "riskScore": 28,
  "itemType": "trending",
  "exitWeek": 8,
  "forecast": [{"week": 1, "ratio": 92.1}, ...],
  "signalDivergence": { "type": "confirmed", "signalsUp": 3 },
  "blogData": { "total": 84000, "buzzLevel": "high" },
  "newsData": { "total": 2100, "mediaLevel": "medium" },
  "googleWeeks": [...],
  "dataInsight": "...",
  "marketContext": "...",
  "actionPlan": {
    "immediate": ["..."],
    "shortterm": ["..."],
    "midterm": ["..."],
    "worstCase": "...",
    "alternatives": ["..."]
  },
  "aiProvider": "gemini"
}
```

### `GET /api/trend?keyword=탕후루`
12주 검색량 시계열 조회

### `GET /api/trending`
현재 뜨는 외식 키워드 Top N (1시간 캐시)

### `POST /api/region`
지역 인구 데이터 기반 적합도 분석

### `POST /api/simulate`
손익분기 시뮬레이션

---

## 📁 프로젝트 구조

```
ExEAT/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── routes/
│   │   ├── ask.py          # 메인 분석 API (병렬 데이터 수집)
│   │   ├── trend.py
│   │   ├── region.py
│   │   ├── simulate.py
│   │   └── trending.py     # 트렌딩 키워드 (1시간 캐시)
│   │   ├── auth.py         # 로그인/회원가입 + 내 정보 + 분석 이력
│   │   └── cache_admin.py  # 서버 인메모리 캐시 초기화
│   ├── services/
│   │   ├── google_trend.py # pytrends 연동
│   │   ├── lifecycle.py    # Prophet 예측 + 수명주기 분석
│   │   ├── ai.py           # Gemini AI 분석 (다중 모델 폴백 + 캐시)
│   │   ├── auth_service.py # SQLite 사용자/이력 저장 + 토큰 발급
│   │   ├── synthetic_trend.py # 오프라인 데모용 합성 시계열
│   │   ├── region.py
│   │   └── trending.py
│   └── data/
│       └── population.json # 지역별 인구 통계
│
└── frontend/
    ├── src/
    │   ├── App.tsx          # 라우터 + 헤더/푸터
    │   ├── index.css        # Fluent Design 토큰 + shadcn 통합
    │   ├── store/
    │   │   ├── analysis.ts  # Zustand + persist (로컬 캐시)
    │   │   └── auth.ts      # 로그인 토큰 + 분석 이력
    │   ├── pages/
    │   │   ├── Home.tsx     # 히어로 + 트렌딩 섹션
    │   │   ├── Result.tsx   # 진단 리포트 (11개 섹션)
    │   │   └── Simulate.tsx # 손익분기 시뮬레이터
    │   └── components/
    │       ├── TrendChart.tsx      # 검색·쇼핑·구글·예측 4중 라인
    │       ├── TrendingSection.tsx
    │       ├── LoginModal.tsx      # 로그인/회원가입 모달
    │       ├── HistoryMenu.tsx     # 내 분석(이력) 드롭다운
    │       ├── Simulator.tsx
    │       ├── CountUp.tsx
    │       └── OnboardingModal.tsx # 업종·지역 온보딩
    └── public/
        └── logo.png         # ExEAT 브랜드 로고
```

---

## 🎨 디자인 시스템

**Fluent Design** 기반의 데이터 진단 UI

- **배경**: `#FAFAF7` (오프화이트)
- **본문**: `#1A1A1A`
- **GO**: `#2D7A4F` (초록 + glow)
- **WAIT**: `#C9883A` (주황 + glow)
- **STOP**: `#C13B3B` (빨강 + glow)
- **카드**: Acrylic (frosted glass) + 4단계 elevation shadow
- **폰트**: Pretendard (한글) + JetBrains Mono (숫자/코드)
- **애니메이션**: framer-motion + Fluent ease curve

---

## 📌 개발 현황

| 기능 | 상태 |
|---|---|
| 네이버 DataLab 검색 트렌드 | ❌ (제거) |
| 네이버 쇼핑인사이트 | ❌ (제거) |
| 네이버 블로그/뉴스 버즈 | ❌ (제거) |
| 구글 트렌드 교차 검증 | ✅ (가능하면 사용) |
| 구글 트렌드 불가 시 오프라인(합성) 시계열 폴백 | ✅ |
| Prophet 4주 예측 | ✅ |
| 수명주기 + 위험도 분석 | ✅ |
| 메뉴 유형 7종 분류 | ✅ |
| 신호 교차 분석 (거품 경보) | ✅ |
| Gemini AI 진단 리포트 | ✅ |
| 손익분기 시뮬레이터 | ✅ |
| 지역 적합도 분석 | ✅ |
| 트렌딩 키워드 | ✅ |
| 사용자 업종·지역 맞춤 | ✅ |
| Fluent Design UI | ✅ |
| 로그인/회원가입 (이메일) | ✅ |
| 로그인 (Google Sign‑In) | ✅ |
| 내 분석(이력) 저장/조회 (SQLite) | ✅ |
| 캐시 초기화 (서버 + 로컬) | ✅ |

---

## 🧭 현재 진행상황 & 다음 해야 할 일 (handoff)

다른 AI/사람이 이어서 작업할 수 있도록, **현재 구현 상태와 남은 과제**를 한 곳에 정리합니다.

### 현재 상태 (2026-05-09 기준)
- **Backend**: Flask API 정상 동작
  - `/api/ask`, `/api/trend`는 **네이버 제거** 상태
  - 데이터 소스는 **Google Trends(가능하면)** 사용, 불가 시 **합성(synthetic) 시계열로 폴백**하여 “검색이 막히지 않게” 처리
- **Frontend**: Vite + React + shadcn/ui 구성, 헤더에서 **회원가입/로그인**, 로그인 후 **내 분석(이력)** 드롭다운 제공
- **Auth/DB**: SQLite(`backend/data/exeat.db`) 사용
  - 이메일 로그인/회원가입
  - Google Sign‑In: 프론트에서 받은 `credential(id_token)`을 `/api/auth/google`로 보내 토큰 발급
  - 분석 후 로그인 상태면 `/api/history`에 키워드/판정 저장 (캐시 히트여도 저장)

### 실행에 필요한 환경변수 (최소)
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

### 구글 로그인 콘솔 설정 (로컬 개발)
- Google Cloud Console에서 OAuth Client(Web) 생성
- **Authorized JavaScript origins**에 `http://localhost:5173` 추가
- 발급된 Client ID를 위 `.env` 두 곳에 동일하게 입력

### 남은 과제(우선순위)
- **P0**
  - 배포 환경에서 Google Sign‑In 도메인/Origin/HTTPS 설정 반영
  - `pytrends`가 막힐 때도 유저가 혼란스럽지 않도록 UI에 `source=synthetic` 배지/설명 표시
- **P1**
  - 이력 관리: 내 분석에서 “삭제/핀/검색” 기능
  - 유료 전환 대비: 일일 한도/결제 플랜 설계(로그인 계정 기준)
- **P2**
  - 성능: 번들 크기(code-splitting), 결과 페이지 초기 로딩 최적화
  - 관측: API latency/error 로깅(간단한 metrics)

### 트러블슈팅 (자주 막히는 것)
- **검색/분석이 아예 안 됨**: 백엔드 포트(5001) 충돌 여부 확인  
  `lsof -nP -iTCP:5001 -sTCP:LISTEN`
- **구글 로그인 버튼이 작동 안 함**: `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` 누락 또는 콘솔 Origin 미등록

---

## 📜 라이선스

MIT
