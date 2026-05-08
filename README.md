# ExEAT 🚪

> **EX**it + **EAT**. 카페 트렌드의 EXIT 타이밍을 알려주는 AI 진단서.

[![GitHub](https://img.shields.io/badge/GitHub-ParkIlha%2FExEAT-181717?logo=github)](https://github.com/ParkIlha/ExEAT)

## 🎯 무엇을 해결하는가

숏폼·알고리즘이 유행 수명을 2~6주로 단축시킨 시대.
프랜차이즈 본사·창업 컨설턴트는 "지금 뜨는 아이템"만 권하고,
자영업 유튜브는 성공 사례만 다룬다.

**"지금 두쫀쿠 들어가도 될까요?"** 물어볼 수 있는 중립적인 곳이 없었다.

ExEAT은 트렌드의 **EXIT 타이밍**을 알려주는, 카페 사장님을 위한 AI 진단서다.

## ✨ 주요 기능

| ID | 기능 | 설명 |
|---|---|---|
| F1 | EXIT 타이밍 + 악성 재고 방지 | 수명주기 단계 판별, 발주 안전선 계산 |
| F2 | 트렌드 재료 진입 판단 | GO / WAIT / STOP 점수 |
| F3 | 트렌드 그래프 + 평균 패턴 비교 | 스테디형 vs 급락형 패턴 매칭 |
| F4 | 지역 적합도 분석 | 거주 연령대 vs 트렌드 소비 연령대 매칭 |
| F6 | 손익분기 시뮬레이터 | 손익분기 시점 vs EXIT 시점 비교 |
| F7 | 과거 트렌드 케이스 라이브러리 | 대만카스테라·흑당버블티 등 사례 비교 |
| F9 | 자유 질문 박스 | "지금 흑임자 라떼 출시할까?" 통합 분석 |

## 🛠 기술 스택

- **Frontend**: React + Vite + Tailwind + shadcn/ui
- **Backend**: Python / Flask
- **Data**: 네이버 DataLab API (검색어 트렌드)
- **AI**: Anthropic Claude API
- **인구 통계**: 행정안전부 주민등록 인구통계

## 📁 프로젝트 구조

```
ExEAT/
├── backend/      ← Flask 서버
├── frontend/     ← React 앱
└── docs/         ← 설계도, 진행도, 인수인계 문서
    ├── ARCHITECTURE.md   현재 시스템 설계
    ├── PROGRESS.md       개발 진행도
    └── HANDOFF.md        다음 작업자(또는 다음 Claude)용 인수인계
```

## 🚀 실행 방법

추후 작성 예정. (개발 단계 진행 중)

## 📊 개발 진행도

자세한 진행 상태는 [docs/PROGRESS.md](./docs/PROGRESS.md) 참고.

## 📜 라이선스

해커톤 제출용 프로젝트. 주제: 대중문화의 구조적 문제.
