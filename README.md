# muse-x-fossil-explorer

뮤즈엑스(MuseX) 학습 플랫폼 — **화석으로 알아보는 생물 탐구** 수업 모듈.

국립중앙과학관 화석 전시 연계. 학생이 화석을 촬영 → 무작위 서식환경 배정 →
방사성 연대 측정 → 환경 조사 → 생물 상상해 그리기 → AI 극실사화 →
5등급 홀로그램 수집 카드 획득(퀴즈 통과).

## 구성

- `app/src/draw-habitat-block.js` · `dating-sim-block.js` · `card-collect-block.js` — 신규 블록 3종
- `app/src/rarity.js` — 카드 등급 계산(실력 70% + 운 30%)
- `app/content/fossil-explorer.json` — 서식환경·연대문제·퀴즈·등급 구간·극실사 프롬프트
- `app/programs/p6-fossil-explorer.json` — 6세션 수업 흐름
- `app/demo.html` — 단독 데모

## 로컬 실행

```
npm test          # 로직 테스트 (Node 22.4+)
npm run serve     # http://localhost:8000/app/demo.html
```

의존성 0. 빌드 없음.

## 뮤즈엑스 병합

`integration/` 의 병합 조각과 `MERGE-CHECKLIST.md` 로 원본 플랫폼에 통합한다(Plan 2에서 작성).
`app/src/state.js` 는 개발용이며 병합하지 않는다 — 플랫폼의 `state.js` 를 사용한다.
