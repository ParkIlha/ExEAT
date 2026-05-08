# 🔁 다음 Claude 인수인계 가이드

> 너는 이전 Claude를 이어받는 Claude다.
> 이 문서를 가장 먼저 읽고, **첫 답변에서 인수받았다고 한 줄로 알리고 바로 다음 작업 진행**해라.

---

## 0. 즉시 시작용 1줄 인사 (그대로 출력해도 됨)

> "ExEAT 인수했어. STEP 6/7/9/10 완료된 상태고, 다음은 [BACKLOG.md 우선순위 1~3] 또는 [STEP 11 UI 마감] 차례야. 어디부터 갈까?"

---

## 1. 1분 컨텍스트

- **프로젝트**: ExEAT — 카페 트렌드 EXIT 타이밍 진단 도구
- **GitHub**: https://github.com/ParkIlha/ExEAT (사용자 ParkIlha)
- **목적**: 해커톤 제출 (대중문화의 구조적 문제)
- **타겟**: 카페 창업 소상공인
- **핵심 가치**: 진입이 아닌 **EXIT 타이밍** 알려주는 진단 도구

---

## 2. 읽는 순서 (이거만 읽으면 충분)

1. `docs/HANDOFF.md` — (이 문서) 워크플로우, 합의사항
2. `docs/PROGRESS.md` — 어디까지 됐고 다음 뭐 할지 ★ 가장 중요
3. `docs/BACKLOG.md` — 떠오른 아이디어 풀
4. `docs/ARCHITECTURE.md` — 시스템 설계도, API 명세

---

## 3. 사용자 워크플로우 (반드시 지킬 것)

### A. 코드 작성 방식
- 사용자(일하)는 직접 코딩 안 함. **너가 다 쓴다**
- 파일은 워크스페이스에 직접 수정/생성 (StrReplace, Write 등 사용)
- 사용자는 로컬에서 결과를 브라우저로 확인하고 피드백만 줌

### B. 단계별 진행 + 즉시 푸시
- 한 STEP 끝나면 **자동으로 git commit + push**해라 (사용자가 매번 시키지 않아도 됨)
- 커밋 메시지 형식: `feat: STEP N — 한 줄 요약\n\n불릿 상세`
- 문서 (PROGRESS.md, BACKLOG.md, ARCHITECTURE.md) 업데이트도 같은 커밋에 포함

### C. PROGRESS.md 롤링 업데이트 규칙 (context 비대화 방지)
- **STEP 완료 시 해당 STEP 상세 섹션은 삭제**한다
- STEP 목록 테이블의 비고 칸에 한 줄로 압축
- 현재 STEP 섹션 1개 + "바로 다음에 할 것" 섹션 1개만 유지
- 새 Claude가 PROGRESS.md를 읽자마자 질문 없이 코딩 시작 가능해야 함

### D. 환경변수
- API 키는 `backend/.env`에만. git에 안 올림 (`.gitignore` 처리됨)
- 채팅이나 코드에 키 하드코딩 절대 금지

### E. 톤
- 친근한 반말
- 직설적, 솔직한 피드백 — "이거 별로야" 솔직히 말해도 됨
- 과한 설명 X, 핵심 + 행동 + 다음 확인질문 구조

---

## 4. 합의된 기술 스택 (변경 금지)

| 영역 | 스택 |
|---|---|
| Backend | Python + Flask (port 5001, 5000은 macOS AirPlay 충돌) |
| Frontend | React + Vite + TypeScript + Tailwind v4 + shadcn/ui |
| 차트 | recharts |
| 트렌드 데이터 | 네이버 DataLab |
| AI | Anthropic Claude (`claude-opus-4-5`) |
| 인구 데이터 | 행정안전부 주민등록 (CSV) |

---

## 5. 합의된 기능 7개 (F1, F2, F3, F4, F6, F7, F9)

> F5, F8은 **명시적으로 제외**됨. 다시 추가하지 말 것.

| ID | 이름 | 상태 |
|---|---|---|
| F1 | EXIT 타이밍 + 악성 재고 방지 | ✅ lifecycle.py + exitWeek |
| F2 | GO/WAIT/STOP 진입 판단 | ✅ Claude 통합 판정 |
| F3 | 트렌드 그래프 + 평균 패턴 | ✅ TrendChart |
| F4 | 지역 적합도 | ⏸ STEP 8 (대기) |
| F6 | 손익분기 시뮬레이터 | ✅ Simulator |
| F7 | 과거 케이스 라이브러리 | ✅ CaseLibrary (6개 사례) |
| F9 | 자유 질문 박스 | ✅ AskBox + /api/ask |

---

## 6. 디자인 (이미 적용됨, 수정 시 유지)

- **톤**: 화이트 미니멀, 진단서 느낌
- **배경**: `#FAFAF7`, **본문**: `#1A1A1A`
- **GO**: `#2D7A4F`, **WAIT**: `#C9883A`, **STOP**: `#C13B3B`
- **폰트**: Pretendard (본문) + JetBrains Mono (숫자/라벨)
- shadcn/ui Button/Card/Input/Badge/Separator 사용 중
- 토큰은 `frontend/src/index.css` `@theme` 블록에 정의

---

## 7. 현재 상태 한눈에 (자세한 건 PROGRESS.md)

✅ STEP 0~10 중 8개 완료. **STEP 8 (지역 인구), STEP 11 (UI 마감), STEP 12~13 (README+제출) 만 남음**.

추가 데이터 보강 후보는 **BACKLOG.md** 상단에 우선순위로 정리됨 — 사용자가 여유 있을 때 1번(쇼핑인사이트)부터 채택.

---

## 8. 사용자 자주 하는 패턴

- "이거 좀 별로 아니야?" — 의심이 아니라 검증 중. 솔직한 답 원함
- "다른 방법 있어?" — 현재 방향 재고하자는 신호
- "흔한 거 아니야?" — 차별점을 말로 정리해달라는 요청
- "너로 다 개발할거야" — 코드 직접 짜라는 뜻

---

## 9. 자주 쓰는 명령어 (사용자 노트북에서)

```bash
# 백엔드
cd backend && FLASK_PORT=5001 FLASK_ENV=development python app.py

# 프론트
cd frontend && npm run dev
# → http://localhost:5173
```

`backend/.env` 필요 변수: `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `ANTHROPIC_API_KEY`, `FLASK_PORT=5001`

---

## 10. 문맥 비대화 방지 룰

- 매 STEP 후 **반드시 PROGRESS.md의 완료된 STEP 상세 섹션 삭제**
- 새로운 아이디어는 PROGRESS.md가 아닌 **BACKLOG.md에 적기**
- 채팅이 70% 넘어가면 **이 HANDOFF 문서 갱신** + 사용자에게 "다음 채팅으로 넘어가는 게 좋겠다" 제안
