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
- **4주 예측**: Facebook Prophet 기반 시계열 예측
- **종합 위험도**: 0~100 스코어 (decay·delta·momentum·volatility 가중합)

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

NAVER_CLIENT_ID=<네이버 개발자 센터 발급>
NAVER_CLIENT_SECRET=<네이버 개발자 센터 발급>
GEMINI_API_KEY=<Google AI Studio 발급 (AIzaSy...)>
```

> **네이버 API 키 발급**: https://developers.naver.com  
> 필요 서비스: `데이터랩(검색어트렌드)`, `쇼핑인사이트`, `검색(블로그/뉴스)`
>
> **Gemini API 키 발급**: https://aistudio.google.com/apikey

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
│   ├── services/
│   │   ├── naver.py        # DataLab + 쇼핑 + 블로그 + 뉴스 API
│   │   ├── google_trend.py # pytrends 연동
│   │   ├── lifecycle.py    # Prophet 예측 + 수명주기 분석
│   │   ├── claude.py       # Gemini AI 분석 (다중 모델 폴백)
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
    │   │   └── analysis.ts  # Zustand + persist (30분 캐시)
    │   ├── pages/
    │   │   ├── Home.tsx     # 히어로 + 트렌딩 섹션
    │   │   ├── Result.tsx   # 진단 리포트 (11개 섹션)
    │   │   └── Simulate.tsx # 손익분기 시뮬레이터
    │   └── components/
    │       ├── TrendChart.tsx      # 검색·쇼핑·구글·예측 4중 라인
    │       ├── TrendingSection.tsx
    │       ├── RegionPanel.tsx
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
| 네이버 DataLab 검색 트렌드 | ✅ |
| 네이버 쇼핑인사이트 | ✅ |
| 네이버 블로그/뉴스 버즈 | ✅ |
| 구글 트렌드 교차 검증 | ✅ |
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

---

## 📜 라이선스

MIT
