# 📊 ExEAT 개발 진행도

> 매 단계 완료 시 이 문서를 업데이트한다.
> 다음 Claude로 갈아탈 때, 이 문서를 가장 먼저 읽힌다.

---

## 🎯 현재 위치

**STEP 1 진행 중** — GitHub 레포 초기 설정

마지막 업데이트: 2025년 해커톤 1일차

---

## 📋 전체 STEP 목록

상태 표기:
- 🟢 완료
- 🟡 진행 중
- ⚪ 대기

| STEP | 내용 | 상태 | 비고 |
|---|---|---|---|
| 0 | 기획 — 문제정의 + 기능 명세 + 설계도 v2 합의 | 🟢 | 카페 창업자 타겟 / 7개 기능 확정 |
| 1 | GitHub 레포 초기화 (README, .gitignore, .env.example, docs/) | 🟡 | 진행 중 |
| 2 | Flask 백엔드 기본 골격 — `/api/health` 엔드포인트로 동작 확인 | ⚪ | |
| 3 | 네이버 DataLab API 연동 — `/api/trend` 구현 + Postman 테스트 | ⚪ | NAVER_CLIENT_ID/SECRET 필요 |
| 4 | React + Vite + shadcn/ui 프론트엔드 골격 | ⚪ | |
| 5 | TrendChart 컴포넌트 — DataLab 데이터 그래프 시각화 | ⚪ | recharts 사용 예정 |
| 6 | 수명주기 단계 판별 로직 (`utils/lifecycle.py`) | ⚪ | F1, F3 핵심 |
| 7 | 과거 케이스 라이브러리 (`data/cases.json` + `/api/cases`) | ⚪ | F7 정적 데이터 |
| 8 | 지역 인구 데이터 (`data/population.csv` + `/api/region`) | ⚪ | F4 |
| 9 | Claude API 연동 — `/api/ask` 통합 분석 | ⚪ | F9 메인 진입점 |
| 10 | 손익분기 시뮬레이터 — `/api/simulate` + Simulator 컴포넌트 | ⚪ | F6 |
| 11 | UI 디자인 마감 + 모바일 반응형 | ⚪ | shadcn/ui 진단서 톤 |
| 12 | README 실행 방법 작성 + 시연 시나리오 정리 | ⚪ | |
| 13 | 최종 git push + 제출 | ⚪ | |

---

## 🔑 환경변수 발급 상태

| 변수 | 상태 | 비고 |
|---|---|---|
| `NAVER_CLIENT_ID` | ✅ 발급됨 | 사용자 보유 |
| `NAVER_CLIENT_SECRET` | ⚠ 재발급 필요 | 이전 채팅에서 노출됨 |
| `ANTHROPIC_API_KEY` | ❓ 미확인 | 사용자 확인 필요 |

---

## 🚧 미해결 결정 사항

- [ ] chadcn/ui 영감 인터랙션 5개 중 어떤 거 채택할지 (그래프 자동 재생, STOP 진동, 슬라이더 실시간, EXIT 카운트다운, 케이스 묘비 호버)
- [ ] 디자인 톤 최종 확정 (B안: 화이트 미니멀 / 진단서 느낌 잠정 채택)
- [ ] 서비스명 ExEAT 로고/타이포 처리

---

## 📝 직전 단계에서 합의된 내용

- 프로젝트명: **ExEAT**
- 워크플로우: A안 (Claude가 파일 만들고 사용자가 다운로드해서 로컬에 배치)
- 개발 방식: 한 단계씩 구현 → 사용자가 로컬에서 결과 확인 → 다음 단계
- UI 라이브러리: shadcn/ui (chadcn-ui 컨셉은 영감만 활용)
- 깃허브: https://github.com/ParkIlha/ExEAT
