# 역설계 확인 필요 항목 (Plan 2 = 뮤즈엑스 병합 단계에서 실물 대조)

Plan 1(핵심 모듈)은 뮤즈엑스 라이브 사이트(`muse-x-two.vercel.app`)에서 역설계한
블록 규격에 맞춰 구현했다. 아래는 **아직 실물로 확인 못 한 가정**이다. 병합 전에
총괄자 저장소의 실제 소스와 대조하고, 필요하면 블록 코드를 조정한다.

## 확정해야 할 것

| # | 항목 | Plan 1의 가정 | 확인/조정 방법 |
|---|---|---|---|
| RE-1 | `blocks.js` 등록 문법 | 핸들러 객체를 `export const drawHabitat = {...}` 로 내보내고 `BLOCKS['draw.habitat'] = drawHabitat` 로 등록 | 실제 `app/src/blocks.js` 확인 → `integration/blocks-js.merge.json` 확정 |
| RE-2 | `render()` 동기/비동기 | `dating.sim`·`card.collect` 의 `render` 는 `async`. 플랫폼이 `await` 하는지 불명 | 플랫폼 렌더 루프 확인. 동기만 지원하면 `render` 를 동기로 바꾸고 콘텐츠를 미리 로드 |
| RE-3 | 콘텐츠 파일 로딩 | `fossil-data.js` 가 `fetch(new URL('../content/fossil-explorer.json', import.meta.url))`. Node 에선 `file:` 미지원이라 테스트가 `globalThis.fetch` 를 스텁 | 플랫폼의 콘텐츠 로딩 관례 확인. 프로그램 JSON 에 인라인해야 하면 `block.pool`/`block.problems` 인라인 경로가 이미 있음 |
| RE-4 | **학생/모둠 식별자 (`ctx`)** | `card.collect` 의 "운" 시드 키 = `ctx.studentKey ?? ctx.student?.id ?? ctx.groupKey ?? block.luckKeyPrefix ?? 'anon'` (fallback 체인). **이게 틀리면 반 전체가 같은 등급 뽑기가 됨 (원래 Critical 버그였음)** | 플랫폼 `ctx` 가 학생/모둠 신원을 어떤 필드로 주는지 확인 → `card-collect-block.js` `_open` 의 `who` 계산 수정 |
| RE-5 | 블록 간 값 조회 | `card.collect` 가 `ctx.getValue(ref)` → 없으면 `get(ref)` (state 키 == 블록 id 가정) | 플랫폼이 `ctx.summaryOf`/`ctx.getValue`/직접 `get` 중 무엇을 주는지 확인 → `readRef()` 수정 |
| RE-6 | `quiz` 블록 value 구조 | `signalRatio('quizscore', v)` 가 `{correct,total}` 우선, 없으면 `{answers}` 키 수로 0.6. `quizPassed(v, count)` 가 `answers` 키 수 ≥ count | 플랫폼 `quiz` 블록이 저장하는 value 확인 → `signalRatio`/`quizPassed` 수정 |
| RE-7 | `capture.sketch` value 의 획 수 | `signalRatio('strokes', v)` 가 `v.strokes.length` 또는 `v.strokeCount` | 플랫폼 `capture.sketch` value 확인. 좌표 배열이면 그 길이로 |
| RE-8 | `input.table` value 구조 | `v.rows` 객체 안에 `{키: 문자열}`. 문자열 값만 "채워짐"으로 카운트(숫자·중첩 무시) | 플랫폼 `input.table` value 확인 → `signalRatio('fields'/'rows', ...)` 수정 |
| RE-9 | `quiz` 문항 주입 방식 | 프로그램 JSON 의 `quiz` 블록에 `questions` 배열을 **인라인**함(`questionsRef` 는 플랫폼이 못 읽어서 폐기) | 플랫폼이 콘텐츠 참조를 지원하면 참조로 되돌려도 됨. 현재는 인라인이 안전 |
| RE-10 | 프로그램 파일 발견 | `app/programs/p6-fossil-explorer.json` 을 놓고 `index.json` 에 항목 추가하면 됨 (`ready:true`) | 별도 라우팅/레지스트리 갱신이 필요한지 확인 |
| RE-11 | `deliverable.collect` + 커스텀 블록 | `card.collect` 는 `summary.kind:'image'`, `draw.habitat`·`dating.sim` 은 `'table'` | 내보내기(PDF/CSV)가 커스텀 블록 summary 를 어떻게 처리하는지 확인 |
| RE-12 | `advance.requires` 스코프 | 스텝(activity) 단위로 가정 | 실제 스코프 확인 |

## 병합 시 하지 말 것

- `app/src/state.js` 를 플랫폼에 복사하지 말 것 — 개발/데모 전용. 플랫폼 `state.js` 사용.
- `app/demo.html` / `app/src/demo.js` — 데모 전용, 병합 안 함.
- `app/content/fossil-explorer.json` 의 `datingProblems` 값 — **선생님 원본**. 임의 수정 금지.
  (지질시대 라벨 2건은 2026-09-02 선생님 승인 하에 과학적으로 정정 완료:
  5,700 BP → 홀로세 / 75,000 BP → 후기 플라이스토세. 150,000 BP 는 중기 플라이스토세로 유지(정확).
  나머지 원본 값은 그대로.)

## Plan 1 에서 이미 처리한 리뷰 지적 (기록용)

- card.collect `_renderCard` Stored-XSS → `createElement`+`textContent`+속성 대입으로 재작성 완료.
- draw.habitat / dating.sim 의 `innerHTML` 템플릿 → `createElement` 로 전환 (신뢰 데이터지만 카테고리 종결).
- 가챠 운 값 상수 버그(RE-4) → fallback 체인 + TODO 로 "명시적 미결"化.
- `realismPrompt` 미배선 → s5-01 에 `realism-guide` text 블록으로 인라인.
- clamp01 중복 → `rarity.js` 에서 export.
