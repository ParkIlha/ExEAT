# 📊 ExEAT 개발 진행도

> **롤링 룰**: STEP 완료 시 상세 섹션 삭제 → 테이블 비고에만 남김. 현재 STEP + "바로 다음에 할 것" 섹션만 유지.

---

## 🎯 현재 위치

**핵심 7개 기능 중 6개 완료** (F1, F2, F3, F6, F7, F9). 다음은 **STEP 11 UI 마감** 또는 **BACKLOG 우선순위 1 (쇼핑인사이트)** 둘 중 하나.

---

## 📋 전체 STEP 목록

| STEP | 내용 | 상태 | 비고 |
|---|---|---|---|
| 0 | 기획 | 🟢 | 7개 기능, 화이트 미니멀 톤 |
| 1 | GitHub 레포 | 🟢 | https://github.com/ParkIlha/ExEAT |
| 2 | Flask 골격 + `/api/health` | 🟢 | 5001 포트 |
| 3 | 네이버 DataLab `/api/trend` | 🟢 | 12주 시계열 |
| 4 | React + Vite + Tailwind + shadcn | 🟢 | 디자인 토큰 + 레이아웃 |
| 5 | TrendChart (recharts) | 🟢 | AreaChart + 4주평균선 + 단계 색상 |
| 6 | 수명주기 lifecycle.py | 🟢 | rising/peak/declining/stable + exitWeek |
| 7 | 과거 케이스 라이브러리 | 🟢 | 6개 사례 (대만카스테라/탕후루 등) |
| 8 | 지역 인구 데이터 (F4) | ⚪ | population.csv + region.py |
| 9 | Claude API `/api/ask` | 🟢 | claude-opus-4-5 통합 판정 |
| 10 | 손익분기 시뮬레이터 | 🟢 | Simulator + 누적수익 그래프 |
| 11 | UI 마감 + 모바일 반응형 | ⚪ | |
| 12 | README 실행 방법 | ⚪ | |
| 13 | 최종 push + 제출 | ⚪ | |

---

## 🔑 환경변수 상태

| 변수 | 상태 |
|---|---|
| `FLASK_PORT` | ✅ 5001 |
| `NAVER_CLIENT_ID` | ✅ |
| `NAVER_CLIENT_SECRET` | ✅ |
| `ANTHROPIC_API_KEY` | ✅ (`/api/ask` 동작용) |

---

## 📂 현재 백엔드/프론트엔드 구조

```
backend/
├── app.py                 # Blueprint 등록 (health/trend/ask/cases/simulate)
├── routes/
│   ├── health.py          # GET  /api/health
│   ├── trend.py           # POST /api/trend       (DataLab + lifecycle)
│   ├── ask.py             # POST /api/ask         (DataLab + lifecycle + Claude) ← F9 메인
│   ├── cases.py           # GET  /api/cases       (?pattern= 필터)
│   └── simulate.py        # POST /api/simulate    (손익분기)
├── services/
│   ├── naver.py           # DataLab 클라이언트
│   ├── lifecycle.py       # 단계 판별 (4주 이동평균 + 1차 미분)
│   └── claude.py          # Anthropic SDK
└── data/
    └── cases.json         # 6개 과거 사례

frontend/src/
├── App.tsx                # 헤더 + AskBox + VerdictCard + Simulator + CaseLibrary + TrendChart
├── index.css              # ExEAT 디자인 토큰 + shadcn 변수
└── components/
    ├── TrendChart.tsx     # recharts AreaChart
    ├── CaseLibrary.tsx    # 아코디언 사례 목록
    ├── Simulator.tsx      # 손익분기 입력 + 그래프
    └── ui/                # shadcn (Button, Card, Input, Badge, Separator)
```

---

## ⚡ 바로 다음에 할 것 (새 Claude는 여기서 시작)

**둘 중 하나 선택. 사용자에게 어디부터 갈지 물어봐.**

### 옵션 A — STEP 11: UI 마감 + 모바일 반응형
1. 모바일(~480px) / 태블릿(481~768px) / 데스크톱(769px+) 3단계 반응형
2. 카드 그림자/간격/타이포 세부 조정
3. 로딩 스켈레톤 (shadcn `skeleton` 추가)
4. 에러 토스트 (shadcn `sonner` 추가)
5. 헤더 로고 처리 (텍스트만? 심볼?)

### 옵션 B — BACKLOG 1순위: 네이버 쇼핑인사이트 API 추가
- **왜**: 검색량 외에 "구매 직전 시그널" 추가로 데이터 신뢰도 ↑
- **구현**:
  1. `services/naver.py`에 `fetch_shopping_trend(keyword, category)` 추가
  2. `routes/ask.py`에서 trend + shopping 동시 호출 → Claude에 함께 전달
  3. `App.tsx`에 "쇼핑 트렌드" 라인 추가 (TrendChart 두 번째 라인)
- 30~60분 예상

### 옵션 C — STEP 8 (F4 지역 적합도)
- 행정안전부 주민등록 CSV 다운로드 → `backend/data/population.csv`
- `services/region.py` 작성 (지역 코드 → 연령 분포)
- `routes/region.py` `/api/region` 엔드포인트
- `App.tsx`에 RegionPanel 카드 추가

---

## 🎨 디자인 토큰 (변경 시 `frontend/src/index.css` 수정)

```
배경:  #FAFAF7
본문:  #1A1A1A
GO:    #2D7A4F  /  GO bg:    #EAF4EF
WAIT:  #C9883A  /  WAIT bg:  #FDF3E7
STOP:  #C13B3B  /  STOP bg:  #FAEAEA
폰트:  Pretendard (본문) + JetBrains Mono (숫자/라벨)
```
