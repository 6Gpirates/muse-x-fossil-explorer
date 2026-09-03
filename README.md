# muse-x-fossil-explorer

뮤즈엑스(MuseX) 학습 플랫폼 — **화석으로 알아보는 생물 탐구** 수업 모듈.

국립중앙과학관 화석 전시 연계. 7세션 흐름: 학생이 화석을 촬영 → 무작위 서식환경 배정 →
방사성 연대 측정 → 환경·지질시대 조사 → 생물 상상해 그리기 → AI 극실사화 →
AI 분류 분석(린네 7단계 + 라틴어 학명) → 5등급 홀로그램 수집 카드 획득(퀴즈 통과).

---

## ▶ 이 수업의 전체 모습 = `app/preview.html`

7세션 전 과정을 한 페이지에서 직접 해볼 수 있는 **검토용 수업 시안**입니다.
표지에서 학번·이름·소속학교를 입력하고, 사진·손그림을 올리고, 글을 쓰고, 퀴즈를 풀면
AI 실사화·AI 분류가 실제로 동작하고 마지막에 5등급 수집 카드가 만들어집니다.

```
npm run serve     # http://localhost:8000/app/preview.html  ← 여기를 여세요
```

`npm run serve` 는 Python 3 필요 (`python -m http.server`). Python이 없으면 `npx http-server .` 등 다른 정적 서버를 써도 됩니다.
AI 기능(실사화·분류)은 `app/src/preview.local.js` 에 Gemini API 키가 있어야 동작합니다(저장소에는 없음 — `.gitignore`). 키가 없으면 프롬프트 복사 방식으로 진행됩니다.

## 구성

- `app/preview.html` · `app/src/preview.js` — **검토용 수업 시안 (전 과정 인터랙티브)**
- `app/src/draw-habitat-block.js` · `dating-sim-block.js` · `card-collect-block.js` — 신규 블록 3종 (플랫폼에 병합되는 핸들러)
- `app/src/rarity.js` — 카드 등급 계산(실력 70% + 운 30%)
- `app/content/fossil-explorer.json` — 서식환경·연대문제·퀴즈·등급 구간·극실사 프롬프트
- `app/programs/p6-fossil-explorer.json` — 7세션 수업 흐름 (세션 6 = `taxonomy.ai` AI 분류 분석)
- `docs/superpowers/specs/2026-09-02-fossil-explorer-design.md` — 설계 문서

```
npm test          # 로직 테스트 (Node 22.4+)
```

의존성 0. 빌드 없음.

## 뮤즈엑스 병합

`integration/` 의 병합 조각과 `MERGE-CHECKLIST.md` 로 원본 플랫폼에 통합한다(Plan 2에서 작성).
`app/src/state.js` 는 개발용이며 병합하지 않는다 — 플랫폼의 `state.js` 를 사용한다.
