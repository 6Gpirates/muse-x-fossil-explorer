# 화석 탐구 수업 — 핵심 모듈 구현 계획 (Plan 1 / 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 뮤즈엑스 학습 플랫폼용 화석 탐구 수업의 새 블록 3개(`draw.habitat`, `dating.sim`, `card.collect`), 등급 계산 라이브러리, 콘텐츠 데이터, 수업 프로그램 JSON, 단독 데모 페이지를 만든다.

**Architecture:** 순수 ES 모듈. 각 블록은 뮤즈엑스 블록 규격(`render/complete/missing/summary` 4함수)을 구현하는 핸들러 객체를 `export` 한다. 상태는 플랫폼의 `./state.js`(`get/set/shrink`)를 통해 저장하되, 단독 개발·테스트용으로 동일 인터페이스의 로컬 `state.js`를 함께 둔다(병합 시 플랫폼 것 유지). 등급 계산은 DOM·상태와 무관한 순수 함수 라이브러리 `rarity.js`로 분리해 `node --test`로 검증한다. 블록의 `complete/missing/summary`는 값(value)만으로 동작하도록 설계해 콘텐츠 파일 로딩에 의존하지 않는다(뽑은 결과의 전체 객체를 value에 저장).

**Tech Stack:** Node.js 22.4+, 런타임 의존성 0개, 테스트는 내장 `node:test`, 데모는 정적 HTML + `python -m http.server`.

**Spec:** `docs/superpowers/specs/2026-09-02-fossil-explorer-design.md` (2026-09-02 승인)

## Global Constraints

- Node.js 22.4+ 기준. 프로덕션 런타임 의존성 **0개**(테스트·개발 도구만 허용).
- 모든 소스는 ES 모듈(`.js` / `.mjs`, `import`/`export`).
- 블록 핸들러는 반드시 `render(block, ctx)`, `complete(block, value, ctx)`, `missing(block, value, ctx)`, `summary(block, value, ctx)` 4개를 노출한다.
- `summary()` 반환의 `kind`는 `'table'` | `'image'` | `null` 중 하나여야 한다.
- 상태 접근은 `import { get, set, shrink } from './state.js'` 로만 한다. 블록이 `localStorage`를 직접 만지지 않는다.
- `app/src/state.js` 는 **개발/데모 전용**이다. 병합 산출물에 포함하지 않으며 MERGE-CHECKLIST에 "플랫폼 원본 유지"로 명시한다(Plan 2).
- 커밋 메시지 말미에 두 줄 첨부:
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` / `Claude-Session: https://claude.ai/code/session_01GQzD5w6PaGrZk8nRVwDUPT`
- 저장소 루트: `X:\myclaude\R01-교사(Teacher)\D02-과학수업설계(Science Class Design)\P01-화석AI수업(Fossil AI Lesson)\` (이미 `git init` 완료, 브랜치 `main`).
- 한글 UI 문구는 스펙에 적힌 그대로 사용한다. 예: 미완료 문구 `"서식 환경을 아직 뽑지 않았습니다."`

---

## File Structure

| 파일 | 책임 |
|---|---|
| `package.json` | 메타·테스트 스크립트(`node --test`). 런타임 의존성 없음 |
| `app/src/state.js` | 개발/데모용 상태 셔틀. `get/set/shrink`. 브라우저=localStorage, Node=Map |
| `app/src/rarity.js` | 등급 계산 순수 함수(`fnv1a`, `seededUnit`, `luckRoll`, `detailScore`, `pickTier`, `computeRarity`). DOM·상태 무관 |
| `app/src/fossil-data.js` | 콘텐츠 번들(`fossil-explorer.json`) 1회 로드 캐시. `loadFossilData()` |
| `app/content/fossil-explorer.json` | 서식환경 11·연대문제 5·반감기표·카드타입·퀴즈·등급구간·극실사프롬프트 |
| `app/src/draw-habitat-block.js` | `draw.habitat` 핸들러 + 뽑기 UI |
| `app/src/dating-sim-block.js` | `dating.sim` 핸들러 + 6×6 입자그리드 + 채점 |
| `app/src/card-collect-block.js` | `card.collect` 핸들러 + 퀴즈 게이트 + 개봉 + 카드 렌더 |
| `app/src/fossil-explorer.css` | 뽑기 연출, 홀로그램·포일 등급 시각, 카드 레이아웃 |
| `app/programs/p6-fossil-explorer.json` | 수업 흐름(6세션) 프로그램 정의 |
| `app/demo.html` | 3블록 + 재사용 블록 스텁으로 6세션 수동 시연 |
| `tests/rarity.test.mjs` | 등급 계산 경계값·결정성 |
| `tests/draw-habitat.test.mjs` | `complete/missing/summary` |
| `tests/dating-sim.test.mjs` | 채점 로직·`complete/summary` |
| `tests/card-collect.test.mjs` | 신호 추출·게이트·`complete/missing/summary` |
| `tests/program-json.test.mjs` | 프로그램 JSON 구조·참조 무결성 |
| `tests/helpers/mock-ctx.mjs` | 테스트용 가짜 `ctx` |

Plan 2(별도 문서)에서 다룸: `integration/*.merge.json`, `MERGE-CHECKLIST.md`, `merge-manifest.json`, `docs/MERGE-GUIDE.md`, `docs/REVERSE-ENGINEERING-NOTES.md`, `docs/DESIGN.md`.

---

## Task 1: 스캐폴드 + 등급 라이브러리 (해시·운)

**Files:**
- Create: `package.json`
- Create: `app/src/state.js`
- Create: `app/src/rarity.js`
- Create: `tests/helpers/mock-ctx.mjs`
- Test: `tests/rarity.test.mjs`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `state.js`: `get(id) -> any|null`, `set(id, value) -> void`, `shrink(dataURL) -> Promise<string>`
  - `rarity.js`: `fnv1a(str) -> uint32`, `seededUnit(str) -> number [0,1)`, `luckRoll(key, weight) -> int [0,weight]`
  - `tests/helpers/mock-ctx.mjs`: `makeCtx(overrides?) -> ctx` (아래 정의)

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "muse-x-fossil-explorer",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "MuseX 학습 플랫폼 — 화석으로 알아보는 생물 탐구 (신규 프로그램 모듈)",
  "engines": { "node": ">=22.4" },
  "scripts": {
    "test": "node --test tests/",
    "serve": "python -m http.server 8000 --directory ."
  }
}
```

- [ ] **Step 2: app/src/state.js 작성 (개발/데모용)**

```js
// 개발·데모 전용 상태 셔틀. 병합 시 플랫폼의 state.js가 이 파일을 대신한다.
// 인터페이스: get(id), set(id, value), shrink(dataURL)
const KEY = (id) => 'mx:' + id;
const mem = new Map();

const backing =
  (typeof localStorage !== 'undefined')
    ? localStorage
    : {
        getItem: (k) => (mem.has(k) ? mem.get(k) : null),
        setItem: (k, v) => { mem.set(k, v); },
        removeItem: (k) => { mem.delete(k); },
      };

export function get(id) {
  try {
    const raw = backing.getItem(KEY(id));
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function set(id, value) {
  try {
    backing.setItem(KEY(id), JSON.stringify(value));
  } catch {
    /* 저장 실패는 무시(플랫폼도 낙관적 저장) */
  }
}

// 데모에서는 압축 없이 그대로 통과. 플랫폼 shrink가 실제 압축을 담당한다.
export function shrink(dataURL) {
  return Promise.resolve(dataURL);
}

// 테스트 편의
export function _clear() {
  mem.clear();
  try { if (typeof localStorage !== 'undefined') localStorage.clear(); } catch {}
}
```

- [ ] **Step 3: tests/rarity.test.mjs 작성 (실패하는 테스트)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fnv1a, seededUnit, luckRoll } from '../app/src/rarity.js';

test('fnv1a: 결정적이며 32비트 부호없는 정수', () => {
  assert.equal(fnv1a('abc'), fnv1a('abc'));
  assert.notEqual(fnv1a('abc'), fnv1a('abd'));
  const h = fnv1a('학생-42card-collect');
  assert.ok(Number.isInteger(h) && h >= 0 && h <= 0xffffffff);
});

test('seededUnit: [0,1) 범위, 결정적', () => {
  for (const s of ['', 'a', '홍길동', 'group-3::card-collect']) {
    const u = seededUnit(s);
    assert.ok(u >= 0 && u < 1, `${s} -> ${u}`);
    assert.equal(u, seededUnit(s));
  }
});

test('luckRoll: [0,weight] 정수, 결정적', () => {
  assert.equal(luckRoll('k', 30), luckRoll('k', 30));
  for (const k of ['a', 'b', 'c', 'd', 'e', '희망']) {
    const r = luckRoll(k, 30);
    assert.ok(Number.isInteger(r) && r >= 0 && r <= 30, `${k} -> ${r}`);
  }
});
```

- [ ] **Step 4: 테스트 실패 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '../app/src/rarity.js'`

- [ ] **Step 5: app/src/rarity.js 작성 (해시·운 부분만)**

```js
// 등급 계산 순수 함수. DOM·상태와 무관. node --test로 검증한다.

/** FNV-1a 32비트 해시 → uint32 */
export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 문자열 → [0,1) 결정적 실수 */
export function seededUnit(str) {
  return fnv1a(String(str)) / 0x100000000;
}

/** key → [0, weight] 결정적 정수 (가챠 "운") */
export function luckRoll(key, weight) {
  return Math.round(seededUnit(String(key)) * weight);
}
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npm test`
Expected: PASS (3 tests)

- [ ] **Step 7: tests/helpers/mock-ctx.mjs 작성**

```js
// 테스트용 가짜 ctx. 블록의 complete/missing/summary가 기대하는 최소 표면만 제공.
export function makeCtx(overrides = {}) {
  return {
    refreshFooter() {},
    assembledPrompt() { return ''; },
    summaryOf() { return null; },
    peers() { return []; },
    publishPeer() {},
    onTeardown() {},
    checklist() { return []; },
    ...overrides,
  };
}
```

- [ ] **Step 8: 커밋**

```bash
git add package.json app/src/state.js app/src/rarity.js tests/
git commit -m "feat: 스캐폴드 + rarity 해시·운 함수

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GQzD5w6PaGrZk8nRVwDUPT"
```

---

## Task 2: 등급 라이브러리 — 점수·구간·종합

**Files:**
- Modify: `app/src/rarity.js` (함수 추가)
- Test: `tests/rarity.test.mjs` (테스트 추가)

**Interfaces:**
- Consumes: `fnv1a`, `seededUnit`, `luckRoll` (Task 1)
- Produces:
  - `detailScore(parts) -> number` — `parts: Array<{weight:number, ratio:number}>`, `Σ weight*clamp(ratio,0,1)` 반올림
  - `pickTier(total, tiers) -> tier` — `tiers: Array<{min,stars,name,class}>`, `total >= min` 인 최고 등급
  - `computeRarity({parts, luckKey, luckWeight, tiers}) -> {detailScore, luckRoll, total, stars, name, class}` — `total = min(100, detailScore + luckRoll)`

- [ ] **Step 1: 실패하는 테스트 추가 (tests/rarity.test.mjs 하단)**

```js
import { detailScore, pickTier, computeRarity } from '../app/src/rarity.js';

const TIERS = [
  { min: 0,  stars: 1, name: '노멀',     class: 'rar-normal' },
  { min: 41, stars: 2, name: '언커먼',   class: 'rar-uncommon' },
  { min: 61, stars: 3, name: '레어',     class: 'rar-rare' },
  { min: 79, stars: 4, name: '슈퍼레어', class: 'rar-superrare' },
  { min: 93, stars: 5, name: '레전더리', class: 'rar-legendary' },
];

test('detailScore: 가중합, 클램프, 반올림', () => {
  assert.equal(detailScore([{ weight: 20, ratio: 1 }, { weight: 15, ratio: 0 }]), 20);
  assert.equal(detailScore([{ weight: 20, ratio: 0.5 }]), 10);
  assert.equal(detailScore([{ weight: 10, ratio: 5 }]), 10);   // ratio>1 클램프
  assert.equal(detailScore([{ weight: 10, ratio: -3 }]), 0);   // ratio<0 클램프
  assert.equal(detailScore([{ weight: 10, ratio: NaN }]), 0);  // 비수 클램프
  // 스펙 신호 가중치 합 = 70
  assert.equal(
    detailScore([
      { weight: 20, ratio: 1 }, { weight: 15, ratio: 1 }, { weight: 15, ratio: 1 },
      { weight: 10, ratio: 1 }, { weight: 10, ratio: 1 },
    ]),
    70,
  );
});

test('pickTier: 경계값', () => {
  const s = (n) => pickTier(n, TIERS).stars;
  assert.equal(s(0), 1);  assert.equal(s(40), 1);
  assert.equal(s(41), 2); assert.equal(s(60), 2);
  assert.equal(s(61), 3); assert.equal(s(78), 3);
  assert.equal(s(79), 4); assert.equal(s(92), 4);
  assert.equal(s(93), 5); assert.equal(s(100), 5);
});

test('computeRarity: total 100 상한, 결정적, 필드 완비', () => {
  const args = { parts: [{ weight: 70, ratio: 1 }], luckKey: 's1::card', luckWeight: 30, tiers: TIERS };
  const a = computeRarity(args);
  const b = computeRarity(args);
  assert.deepEqual(a, b);
  assert.equal(a.detailScore, 70);
  assert.ok(a.total <= 100);
  assert.ok(a.stars >= 1 && a.stars <= 5);
  assert.equal(typeof a.class, 'string');
});

test('computeRarity: 저노력+저운 → 노멀 근처', () => {
  const r = computeRarity({ parts: [{ weight: 70, ratio: 0.15 }], luckKey: 'zzz-low', luckWeight: 30, tiers: TIERS });
  assert.equal(r.total, 11 + r.luckRoll); // detailScore = round(70*0.15)=11 (10.5→11 은 round 규칙상 확인)
  assert.ok(r.stars <= 2);
});
```

> 주의: `round(70*0.15)=round(10.5)=11` (JS `Math.round`는 절반을 위로). 테스트가 이 규칙에 의존한다.

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test`
Expected: FAIL — `detailScore is not a function`

- [ ] **Step 3: app/src/rarity.js 에 함수 추가**

```js
function clamp01(x) {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** parts: Array<{weight, ratio}> → 반올림된 가중합 */
export function detailScore(parts) {
  const raw = parts.reduce((sum, p) => sum + p.weight * clamp01(p.ratio), 0);
  return Math.round(raw);
}

/** tiers(오름차순 min) 중 total 이상인 최고 등급 */
export function pickTier(total, tiers) {
  let chosen = tiers[0];
  for (const t of tiers) if (total >= t.min) chosen = t;
  return chosen;
}

/** 실력 + 운 → 등급 */
export function computeRarity({ parts, luckKey, luckWeight, tiers }) {
  const d = detailScore(parts);
  const l = luckRoll(luckKey, luckWeight);
  const total = Math.min(100, d + l);
  const tier = pickTier(total, tiers);
  return {
    detailScore: d,
    luckRoll: l,
    total,
    stars: tier.stars,
    name: tier.name,
    class: tier.class,
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS (7 tests 누적)

- [ ] **Step 5: 커밋**

```bash
git add app/src/rarity.js tests/rarity.test.mjs
git commit -m "feat: rarity 점수·구간·종합 계산

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GQzD5w6PaGrZk8nRVwDUPT"
```

---

## Task 3: 콘텐츠 데이터 파일 + 로더

**Files:**
- Create: `app/content/fossil-explorer.json`
- Create: `app/src/fossil-data.js`
- Test: `tests/content.test.mjs`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `fossil-data.js`: `loadFossilData(baseUrl?) -> Promise<object>` (캐시됨), `_resetCache() -> void`
  - 콘텐츠 스키마: `{ meta, habitats[11], datingProblems[5], halfLifeTable[5], cardTypes[], midQuiz[], finalQuiz[], rarity:{luckWeight, tiers[5]}, realismPrompt }`

- [ ] **Step 1: app/content/fossil-explorer.json 작성**

선생님 원본 `HABITATS`(11) / `DATING_PROBLEMS`(5) 값을 그대로 옮긴다. 퀴즈는 초안(교사 검수 대상).

```json
{
  "meta": { "id": "p6-fossil-explorer", "title": "화석으로 알아보는 생물 탐구", "version": "0.1.0" },

  "habitats": [
    { "korName": "열대우림", "engName": "(Jungle / Rainforest)", "desc": "고온다습한 기후, 하늘을 가리는 울창한 밀림과 풍부한 생물 다양성을 자랑합니다.", "icon": "🌴" },
    { "korName": "사막", "engName": "(Desert)", "desc": "극심한 건조와 뙤약볕, 거센 일교차를 견뎌야 하는 광활한 모래 및 암석 지형입니다.", "icon": "🏜️" },
    { "korName": "툰드라 / 극지방", "engName": "(Tundra / Polar)", "desc": "땅속 깊이 얼어붙은 영구동토층과 극한의 블리자드, 거대한 빙하와 설원이 펼쳐집니다.", "icon": "❄️" },
    { "korName": "온대 낙엽활엽수림", "engName": "(Temperate Forest)", "desc": "사계절의 변화가 뚜렷하며, 가을철 붉은 낙엽과 비옥한 토양, 온화한 기후가 특징입니다.", "icon": "🍂" },
    { "korName": "타이가 / 침엽수림", "engName": "(Taiga / Boreal Forest)", "desc": "혹독하게 긴 겨울을 견디는 가문비나무·잣나무 등 끝없는 침엽수림이 장관을 이룹니다.", "icon": "🌲" },
    { "korName": "사바나 / 열대 초원", "engName": "(Savanna)", "desc": "긴 건기와 짧고 강렬한 우기가 교차하며, 드넓은 황금빛 풀밭과 관목이 펼쳐집니다.", "icon": "🦁" },
    { "korName": "스텝 / 온대 초원", "engName": "(Steppe / Prairie)", "desc": "나무가 거의 자라지 않는 건조한 대평원으로, 끝없이 이어지는 키 작은 풀밭입니다.", "icon": "🌾" },
    { "korName": "산악 / 고산 지대", "engName": "(Alpine / Mountain)", "desc": "희박한 산소와 가파른 암벽, 고도에 따라 급격히 변화하는 독특한 식생대를 품고 있습니다.", "icon": "🏔️" },
    { "korName": "습지 / 맹그로브", "engName": "(Wetlands / Mangrove)", "desc": "담수와 해수가 교차하는 풍요로운 늪지로, 진흙 갯벌과 수많은 수생 생물의 요람입니다.", "icon": "🐊" },
    { "korName": "해양 / 산호초", "engName": "(Marine / Coral Reef)", "desc": "햇빛이 투명하게 비치는 얕은 바닷속, 화려한 산호 군락과 생명력 넘치는 수중 생태계입니다.", "icon": "🪸" },
    { "korName": "심해", "engName": "(Deep Ocean)", "desc": "빛이 닿지 않는 암흑과 상상을 초월하는 초고압, 극한의 저온 및 열수구가 공존하는 미지의 세계입니다.", "icon": "🐙" }
  ],

  "datingProblems": [
    { "element": "탄소-14 (¹⁴C) → 질소-14 (¹⁴N)", "halfLifeText": "약 5,700년", "halfLifeVal": 5700, "ratioText": "1 : 1 (모원소 50% 잔여)", "parentPercent": 50, "halfLifeCount": 1, "unit": "년", "correctAnswer": 5700, "displayAge": "약 5,700년 전", "era": "신생대 제4기 (후기 플라이스토세)", "explanation": "모원소와 자원소의 비가 1:1이므로 반감기가 1회(50%) 경과했습니다. 따라서 5,700년 × 1 = 5,700년 전입니다." },
    { "element": "토륨-230 (²³⁰Th) 계열", "halfLifeText": "약 7만 5천 년 (75,000년)", "halfLifeVal": 75000, "ratioText": "1 : 1 (모원소 50% 잔여)", "parentPercent": 50, "halfLifeCount": 1, "unit": "년", "correctAnswer": 75000, "displayAge": "약 75,000년 전 (7만 5천 년 전)", "era": "신생대 제4기 (중기 플라이스토세)", "explanation": "모원소와 자원소의 비가 1:1이므로 반감기가 1회 경과했습니다. 따라서 75,000년 × 1 = 75,000년 전입니다." },
    { "element": "토륨-230 (²³⁰Th) 계열", "halfLifeText": "약 7만 5천 년 (75,000년)", "halfLifeVal": 75000, "ratioText": "1 : 3 (모원소 25% 잔여)", "parentPercent": 25, "halfLifeCount": 2, "unit": "년", "correctAnswer": 150000, "displayAge": "약 150,000년 전 (15만 년 전)", "era": "신생대 제4기 (중기 플라이스토세)", "explanation": "모원소:자원소 비가 1:3으로 모원소가 전체의 1/4(25%) 남아있어 반감기가 2회 경과했습니다. 따라서 75,000년 × 2 = 150,000년 전입니다." },
    { "element": "우라늄-235 (²³⁵U) → 납-207 (²⁰⁷Pb)", "halfLifeText": "약 7억 년", "halfLifeVal": 7, "ratioText": "1 : 3 (모원소 25% 잔여)", "parentPercent": 25, "halfLifeCount": 2, "unit": "억 년", "correctAnswer": 14, "displayAge": "약 14억 년 전", "era": "선캄브리아 시대 (중원생대 후기)", "explanation": "모원소:자원소 비가 1:3으로 모원소가 1/4(25%) 남아있어 반감기가 2회 경과했습니다. 따라서 7억 년 × 2 = 14억 년 전입니다." },
    { "element": "우라늄-238 (²³⁸U) → 납-206 (²⁰⁶Pb)", "halfLifeText": "약 45억 년 (약 44억 7천만 년)", "halfLifeVal": 45, "ratioText": "1 : 1 (모원소 50% 잔여)", "parentPercent": 50, "halfLifeCount": 1, "unit": "억 년", "correctAnswer": 45, "displayAge": "약 45억 년 전", "era": "선캄브리아 시대 (명왕누대 지구 형성기)", "explanation": "모원소와 자원소 비가 1:1로 반감기가 1회 경과했습니다. 따라서 45억 년 × 1 = 45억 년 전으로 지구 탄생 초기입니다." }
  ],

  "halfLifeTable": [
    { "label": "탄소-14 (¹⁴C)",   "value": "약 5,700년" },
    { "label": "토륨-230 (²³⁰Th)", "value": "약 7만 5천 년" },
    { "label": "우라늄-235 (²³⁵U)", "value": "약 7억 년" },
    { "label": "칼륨-40 (⁴⁰K)",    "value": "약 13억 년" },
    { "label": "우라늄-238 (²³⁸U)", "value": "약 45억 년" }
  ],

  "cardTypes": ["불꽃", "물", "풀", "바위", "얼음", "전기", "비행", "독", "땅", "벌레", "고스트", "노멀"],

  "midQuiz": [
    { "key": "m1", "q": "사막에 사는 동물에게 가장 흔히 나타나는 적응은?", "choices": ["몸에 물을 저장하거나 물 손실을 줄이는 구조", "넓고 얇은 잎", "두꺼운 지방층과 흰 털", "발광 기관"], "answer": 0, "why": "사막은 극도로 건조해 수분 보존이 생존의 핵심입니다." },
    { "key": "m2", "q": "같은 서식 환경의 계통이 다른 생물들이 비슷한 생김새를 갖게 되는 현상은?", "choices": ["수렴 진화", "돌연변이", "공생", "먹이 사슬"], "answer": 0, "why": "비슷한 환경 압력이 계통이 달라도 유사한 형질을 만듭니다(수렴 진화)." }
  ],

  "finalQuiz": [
    { "key": "f1", "q": "화석만으로는 알기 어려운 정보는?", "choices": ["뼈의 크기와 형태", "이빨 모양", "피부색과 울음소리", "골격의 연결 구조"], "answer": 2, "why": "연조직·색·소리는 대개 화석에 남지 않아 추정만 가능합니다." },
    { "key": "f2", "q": "지질 시대를 오래된 것부터 순서대로 놓으면?", "choices": ["선캄브리아 시대 – 고생대 – 중생대 – 신생대", "고생대 – 선캄브리아 시대 – 중생대 – 신생대", "신생대 – 중생대 – 고생대 – 선캄브리아 시대", "중생대 – 고생대 – 신생대 – 선캄브리아 시대"], "answer": 0, "why": "선캄브리아 → 고생대 → 중생대 → 신생대 순입니다." },
    { "key": "f3", "q": "방사성 동위원소로 암석의 나이를 재는 원리는?", "choices": ["모원소가 일정한 비율로 자원소로 붕괴하는 시간(반감기)을 이용", "화석의 개수를 센다", "지층의 색을 비교한다", "암석의 무게를 잰다"], "answer": 0, "why": "반감기가 일정하므로 모원소:자원소 비로 경과 시간을 계산합니다." },
    { "key": "f4", "q": "모원소와 자원소의 비가 1:3이면 반감기가 몇 번 지났나?", "choices": ["1번", "2번", "3번", "4번"], "answer": 1, "why": "1:3은 모원소가 1/4(25%) 남은 것 → 반감기 2회 경과입니다." },
    { "key": "f5", "q": "어떤 생물이 특정 환경에 '적응했다'는 말의 뜻으로 가장 알맞은 것은?", "choices": ["생존·번식에 유리한 형질이 여러 세대에 걸쳐 늘어났다", "한 개체가 살면서 몸을 바꿨다", "환경이 생물에 맞게 변했다", "우연히 그렇게 생겼다"], "answer": 0, "why": "적응은 자연선택으로 유리한 형질의 빈도가 높아지는 집단 수준의 변화입니다." }
  ],

  "rarity": {
    "luckWeight": 30,
    "tiers": [
      { "min": 0,  "stars": 1, "name": "노멀",     "class": "rar-normal" },
      { "min": 41, "stars": 2, "name": "언커먼",   "class": "rar-uncommon" },
      { "min": 61, "stars": 3, "name": "레어",     "class": "rar-rare" },
      { "min": 79, "stars": 4, "name": "슈퍼레어", "class": "rar-superrare" },
      { "min": 93, "stars": 5, "name": "레전더리", "class": "rar-legendary" }
    ]
  },

  "realismPrompt": "[내가 복원한 동물에 대한 설명]\n(여기에 붙여넣으세요. 서식지를 꼭 입력하세요.)\n\n[역할 및 작업 지시]\n당신은 세계 최고의 고생물 복원 전문 아티스트이자 내셔널지오그래픽 야생동물 전문 사진작가입니다. 제가 첨부한 손그림 스케치는 가상의 시공간 환경에 적응하여 진화한 생물의 복원도입니다. 이 스케치의 외형, 형태, 신체 비율, 포즈를 100% 그대로 유지하면서, 현실에 실존하는 생명체처럼 보이는 '극실사 야생동물 다큐멘터리 사진(National Geographic 8K wildlife photograph)'으로 렌더링해주세요.\n\n[생물 및 환경 정보]\n1. 원본 모티브 생물/화석: (예: 삼엽충 / 매머드 / 고대 산호 등)\n2. 진화하여 살아가는 서식 환경: (예: 툰드라 / 심해 / 열대우림 / 사막 등)\n3. 생존 연대 및 주요 적응 특징: (예: 약 5,700년 전 후기 플라이스토세 빙하기 적응 - 두꺼운 흰색 방한 털과 지방층, 눈보라를 견디는 억센 발톱)\n\n[필수 구현 렌더링 스타일]\n- 해부학적 일관성: 첨부된 스케치의 실루엣, 눈·코·입의 위치, 다리/지느러미/껍질의 형태적 특징을 임의로 왜곡하거나 생략하지 말고 그대로 반영할 것.\n- 피부 및 표면 질감: 서식 환경에 맞게 (털/비늘/외골격/점막/가죽) 질감을 모공과 주름, 미세한 잔털 수준까지 극도로 정밀하게 표현할 것.\n- 카메라 및 촬영 구도: Sony a1 풀프레임 카메라와 400mm f/2.8 망원 렌즈로 실제 야생 현장에서 포착한 듯한 얕은 심도와 역동적인 구도.\n- 조명 및 색감: 서식지 환경의 자연광을 자연스럽게 투영.\n- 사실적인 환경 상호작용: 발 밑의 흙먼지, 물방울, 털에 묻은 서리, 바위의 이끼 등 주변 서식지 환경과의 상호작용을 극대화할 것.\n\n[절대 금지 사항]\n- 만화, 일러스트, 애니메이션, 3D 카툰, CG 게임 그래픽 느낌 금지.\n- 인공적이거나 플라스틱 같은 매끄러운 질감 금지.\n- 스케치에 없는 불필요한 날개나 추가 사지를 마음대로 덧붙이지 말 것.\n- 텍스트, 워터마크, UI 요소, 카드 프레임 생성 금지. 오직 순수한 야생동물 사진만 출력할 것."
}
```

- [ ] **Step 2: app/src/fossil-data.js 작성**

```js
// 콘텐츠 번들을 1회 로드해 캐시한다.
let _cache = null;

export async function loadFossilData(baseUrl) {
  if (_cache) return _cache;
  const url = new URL('../content/fossil-explorer.json', baseUrl || import.meta.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error('fossil-explorer.json 로드 실패: ' + res.status);
  _cache = await res.json();
  return _cache;
}

export function _resetCache() {
  _cache = null;
}
```

- [ ] **Step 3: tests/content.test.mjs 작성 (실패하는 테스트)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const data = JSON.parse(
  await readFile(new URL('../app/content/fossil-explorer.json', import.meta.url), 'utf8'),
);

test('habitats 11개, 필수 필드', () => {
  assert.equal(data.habitats.length, 11);
  for (const h of data.habitats) {
    for (const k of ['korName', 'engName', 'desc', 'icon']) {
      assert.ok(h[k] && typeof h[k] === 'string', `${k} 누락: ${JSON.stringify(h)}`);
    }
  }
});

test('datingProblems 5개, 정답·해설·시대 구비', () => {
  assert.equal(data.datingProblems.length, 5);
  for (const p of data.datingProblems) {
    assert.equal(typeof p.correctAnswer, 'number');
    assert.ok(p.parentPercent > 0 && p.parentPercent <= 100);
    assert.ok(p.explanation && p.era && p.displayAge && p.unit);
  }
});

test('halfLifeTable 5행, rarity tiers 5단계 오름차순', () => {
  assert.equal(data.halfLifeTable.length, 5);
  const mins = data.rarity.tiers.map((t) => t.min);
  assert.deepEqual(mins, [...mins].sort((a, b) => a - b));
  assert.equal(data.rarity.tiers.length, 5);
  assert.equal(data.rarity.luckWeight, 30);
});

test('퀴즈: answer 인덱스가 choices 범위 안', () => {
  for (const q of [...data.midQuiz, ...data.finalQuiz]) {
    assert.ok(q.answer >= 0 && q.answer < q.choices.length, `${q.key} answer 범위 밖`);
    assert.ok(q.key && q.q && q.why);
  }
});

test('realismPrompt 존재', () => {
  assert.ok(typeof data.realismPrompt === 'string' && data.realismPrompt.length > 200);
});
```

- [ ] **Step 4: 테스트 실행**

Run: `npm test`
Expected: PASS (content.test.mjs 5 tests). JSON 문법 오류가 있으면 여기서 실패 → 수정.

- [ ] **Step 5: 커밋**

```bash
git add app/content/fossil-explorer.json app/src/fossil-data.js tests/content.test.mjs
git commit -m "feat: 콘텐츠 데이터(서식환경11·연대문제5·퀴즈·등급) + 로더

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GQzD5w6PaGrZk8nRVwDUPT"
```

---

## Task 4: `draw.habitat` 블록

**Files:**
- Create: `app/src/draw-habitat-block.js`
- Test: `tests/draw-habitat.test.mjs`

**Interfaces:**
- Consumes: `state.js` `get`/`set` (Task 1), `fossil-data.js` `loadFossilData` (Task 3), `makeCtx` (Task 1)
- Produces:
  - `export const drawHabitat` — 핸들러 객체
  - value 형태: `{ habitat: {korName, engName, desc, icon}, index: number, drawnAt: string }`

- [ ] **Step 1: tests/draw-habitat.test.mjs 작성 (실패하는 테스트)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawHabitat } from '../app/src/draw-habitat-block.js';
import { makeCtx } from './helpers/mock-ctx.mjs';

const H = { korName: '심해', engName: '(Deep Ocean)', desc: '빛이 닿지 않는…', icon: '🐙' };
const block = { id: 'draw-habitat', label: '서식 환경 뽑기', poolRef: 'habitats' };
const ctx = makeCtx();

test('complete: value 없으면 false, 뽑았으면 true', () => {
  assert.equal(drawHabitat.complete(block, null, ctx), false);
  assert.equal(drawHabitat.complete(block, { habitat: H, index: 10, drawnAt: 'x' }, ctx), true);
  assert.equal(drawHabitat.complete(block, { index: 3 }, ctx), false); // habitat 누락
});

test('missing: 스펙 문구 그대로', () => {
  assert.equal(drawHabitat.missing(block, null, ctx), '서식 환경을 아직 뽑지 않았습니다.');
});

test('summary: table 형식, 뽑힌 환경/설명 행', () => {
  const s = drawHabitat.summary(block, { habitat: H, index: 10, drawnAt: 'x' }, ctx);
  assert.equal(s.kind, 'table');
  assert.equal(s.label, '서식 환경 뽑기');
  assert.deepEqual(s.rows[0], ['뽑힌 서식 환경', '심해 (Deep Ocean)']);
  assert.equal(s.rows[1][0], '환경 설명');
});

test('summary: 미완료면 null', () => {
  assert.equal(drawHabitat.summary(block, null, ctx), null);
});

test('핸들러는 4개 함수를 노출', () => {
  for (const fn of ['render', 'complete', 'missing', 'summary']) {
    assert.equal(typeof drawHabitat[fn], 'function');
  }
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test tests/draw-habitat.test.mjs`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: app/src/draw-habitat-block.js 작성**

```js
import { get, set } from './state.js';
import { loadFossilData } from './fossil-data.js';

const MISSING = '서식 환경을 아직 뽑지 않았습니다.';

async function resolvePool(block) {
  if (Array.isArray(block.pool)) return block.pool;
  const data = await loadFossilData();
  return data[block.poolRef || 'habitats'];
}

function resultCard(h) {
  const el = document.createElement('div');
  el.className = 'fx-habitat-card';
  el.innerHTML = `
    <div class="fx-habitat-icon">${h.icon}</div>
    <div class="fx-habitat-tag">Assigned Habitat</div>
    <h3 class="fx-habitat-name">${h.korName}</h3>
    <div class="fx-habitat-eng">${h.engName}</div>
    <p class="fx-habitat-desc">${h.desc}</p>`;
  return el;
}

export const drawHabitat = {
  render(block, ctx) {
    const root = document.createElement('div');
    root.className = 'fx-draw-habitat';
    const existing = get(block.id);

    if (existing && existing.habitat) {
      root.appendChild(resultCard(existing.habitat));
      return root;
    }

    const machine = document.createElement('div');
    machine.className = 'fx-gacha-machine';
    machine.textContent = '🎰';

    const status = document.createElement('div');
    status.className = 'fx-gacha-status';
    status.textContent = '서식 환경을 뽑을 준비가 되었습니다!';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fx-btn fx-btn-draw';
    btn.textContent = '서식 환경 뽑기!';

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      machine.classList.add('fx-shake');
      status.textContent = '머신이 차원을 탐색 중입니다...';
      const pool = await resolvePool(block);
      const index = Math.floor(Math.random() * pool.length);
      const habitat = pool[index];
      await new Promise((r) => setTimeout(r, 1500)); // 셔플 연출
      set(block.id, { habitat, index, drawnAt: new Date().toISOString() });
      root.innerHTML = '';
      const card = resultCard(habitat);
      card.classList.add('fx-reveal');
      root.appendChild(card);
      ctx.refreshFooter();
    });

    root.append(machine, status, btn);
    return root;
  },

  complete(block, value) {
    return !!value && !!value.habitat && typeof value.index === 'number';
  },

  missing() {
    return MISSING;
  },

  summary(block, value) {
    if (!this.complete(block, value)) return null;
    const h = value.habitat;
    return {
      kind: 'table',
      label: block.label,
      rows: [
        ['뽑힌 서식 환경', `${h.korName} ${h.engName}`],
        ['환경 설명', h.desc],
      ],
    };
  },
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test tests/draw-habitat.test.mjs`
Expected: PASS (5 tests). `render`는 DOM 필요 → 여기서는 미검증(Task 8 데모에서 확인).

- [ ] **Step 5: 커밋**

```bash
git add app/src/draw-habitat-block.js tests/draw-habitat.test.mjs
git commit -m "feat: draw.habitat 블록 (서식환경 뽑기·잠금)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GQzD5w6PaGrZk8nRVwDUPT"
```

---

## Task 5: `dating.sim` 블록

**Files:**
- Create: `app/src/dating-sim-block.js`
- Test: `tests/dating-sim.test.mjs`

**Interfaces:**
- Consumes: `state.js`, `fossil-data.js`
- Produces:
  - `export const datingSim` — 핸들러 객체
  - `export function gradeAnswer(raw, correctAnswer) -> boolean` — 입력 정규화 + 비교 (테스트용 분리)
  - value 형태: `{ problem: {...}, problemIndex: number, answer: string, correct: boolean, submittedAt: string }`

- [ ] **Step 1: tests/dating-sim.test.mjs 작성 (실패하는 테스트)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datingSim, gradeAnswer } from '../app/src/dating-sim-block.js';
import { makeCtx } from './helpers/mock-ctx.mjs';

const P = {
  element: '탄소-14 (¹⁴C) → 질소-14 (¹⁴N)', ratioText: '1 : 1 (모원소 50% 잔여)',
  parentPercent: 50, unit: '년', correctAnswer: 5700, displayAge: '약 5,700년 전',
  era: '신생대 제4기 (후기 플라이스토세)', explanation: '…',
};
const block = { id: 'dating-sim', label: '방사성 연대 측정', problemsRef: 'datingProblems' };
const ctx = makeCtx();

test('gradeAnswer: 콤마·공백·단위 텍스트 허용', () => {
  assert.equal(gradeAnswer('5700', 5700), true);
  assert.equal(gradeAnswer('5,700', 5700), true);
  assert.equal(gradeAnswer(' 5700 년 ', 5700), true);
  assert.equal(gradeAnswer('5800', 5700), false);
  assert.equal(gradeAnswer('', 5700), false);
  assert.equal(gradeAnswer('abc', 5700), false);
  assert.equal(gradeAnswer('14', 14), true); // 억 년 문제
});

test('complete: answer 제출되면 true (오답도 완료)', () => {
  assert.equal(datingSim.complete(block, null, ctx), false);
  assert.equal(datingSim.complete(block, { problem: P, problemIndex: 0, answer: '9999', correct: false, submittedAt: 'x' }, ctx), true);
});

test('missing: 스펙 문구', () => {
  assert.equal(datingSim.missing(block, null, ctx), '연대 측정값을 아직 제출하지 않았습니다.');
});

test('summary: table, 원소·비·정답연대·시대·학생답(정오)', () => {
  const s = datingSim.summary(block, { problem: P, problemIndex: 0, answer: '5700', correct: true, submittedAt: 'x' }, ctx);
  assert.equal(s.kind, 'table');
  const flat = Object.fromEntries(s.rows);
  assert.equal(flat['분석 원소'], P.element);
  assert.equal(flat['측정 연대(정답)'], P.displayAge);
  assert.equal(flat['지질 시대'], P.era);
  assert.equal(flat['학생 답'], '5700 (정답)');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test tests/dating-sim.test.mjs`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: app/src/dating-sim-block.js 작성**

```js
import { get, set } from './state.js';
import { loadFossilData } from './fossil-data.js';

const MISSING = '연대 측정값을 아직 제출하지 않았습니다.';

/** 입력 문자열을 숫자로 정규화해 정답과 비교 */
export function gradeAnswer(raw, correctAnswer) {
  if (raw == null) return false;
  const cleaned = String(raw).replace(/[^0-9.]/g, '');
  if (cleaned === '') return false;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n === correctAnswer;
}

async function resolveProblems(block) {
  if (Array.isArray(block.problems)) return block.problems;
  const data = await loadFossilData();
  return data[block.problemsRef || 'datingProblems'];
}

function particleGrid(parentPercent) {
  const total = 36;
  const parentCount = Math.round((parentPercent / 100) * total);
  const wrap = document.createElement('div');
  wrap.className = 'fx-atom-grid';
  for (let i = 0; i < total; i++) {
    const a = document.createElement('div');
    a.className = 'fx-atom ' + (i < parentCount ? 'fx-atom-parent' : 'fx-atom-daughter');
    wrap.appendChild(a);
  }
  const label = document.createElement('div');
  label.className = 'fx-atom-legend';
  label.textContent = `모원소 ${parentCount}개 · 자원소 ${total - parentCount}개`;
  const box = document.createElement('div');
  box.append(label, wrap);
  return box;
}

function refTable(rows) {
  const t = document.createElement('table');
  t.className = 'fx-halflife-table';
  t.innerHTML =
    '<caption>반감기 참고 표</caption>' +
    rows.map((r) => `<tr><td>${r.label}</td><td>${r.value}</td></tr>`).join('');
  return t;
}

export const datingSim = {
  async render(block, ctx) {
    const root = document.createElement('div');
    root.className = 'fx-dating-sim';
    const data = await loadFossilData();
    const problems = await resolveProblems(block);

    let value = get(block.id);
    if (!value) {
      const problemIndex = Math.floor(Math.random() * problems.length);
      value = { problem: problems[problemIndex], problemIndex };
      set(block.id, value); // 재방문 시 동일 문제
    }
    const p = value.problem;

    root.appendChild(particleGrid(p.parentPercent));
    root.appendChild(refTable(data[block.tableRef || 'halfLifeTable']));

    const elName = document.createElement('h4');
    elName.className = 'fx-sim-element';
    elName.textContent = p.element;
    root.appendChild(elName);

    if (value.answer !== undefined) {
      const done = document.createElement('div');
      done.className = 'fx-sim-result ' + (value.correct ? 'is-correct' : 'is-wrong');
      done.innerHTML = `
        <p>${value.correct ? '정답입니다!' : '아쉽게도 오답입니다.'}</p>
        <p><b>측정 연대:</b> ${p.displayAge}</p>
        <p><b>지질 시대:</b> ${p.era}</p>
        <p class="fx-sim-explain">${p.explanation}</p>`;
      root.appendChild(done);
      return root;
    }

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'fx-sim-input';
    input.placeholder = `숫자만 입력 (단위: ${p.unit})`;

    const submit = document.createElement('button');
    submit.type = 'button';
    submit.className = 'fx-btn';
    submit.textContent = '측정 결과 제출';
    submit.addEventListener('click', () => {
      const raw = input.value.trim();
      if (!raw) { input.focus(); return; }
      const correct = gradeAnswer(raw, p.correctAnswer);
      set(block.id, { ...value, answer: raw, correct, submittedAt: new Date().toISOString() });
      ctx.refreshFooter();
      root.replaceWith(this.render(block, ctx)); // 결과 화면으로 갱신 (async 반환 주의는 데모에서 처리)
    });

    root.append(input, submit);
    return root;
  },

  complete(block, value) {
    return !!value && value.answer !== undefined;
  },

  missing() {
    return MISSING;
  },

  summary(block, value) {
    if (!this.complete(block, value)) return null;
    const p = value.problem;
    return {
      kind: 'table',
      label: block.label,
      rows: [
        ['분석 원소', p.element],
        ['모:자 비', p.ratioText],
        ['측정 연대(정답)', p.displayAge],
        ['지질 시대', p.era],
        ['학생 답', `${value.answer} (${value.correct ? '정답' : '오답'})`],
      ],
    };
  },
};
```

> `render`가 `async`인 점과 재렌더 처리는 Task 8 데모 하네스에서 `await` 로 감싸 해결한다. 실제 플랫폼의 `render` 동기/비동기 규약은 Plan 2의 역설계 확인 항목.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test tests/dating-sim.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add app/src/dating-sim-block.js tests/dating-sim.test.mjs
git commit -m "feat: dating.sim 블록 (방사성 연대 측정·채점)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GQzD5w6PaGrZk8nRVwDUPT"
```

---

## Task 6: `card.collect` 블록 (등급 시스템)

**Files:**
- Create: `app/src/card-collect-block.js`
- Test: `tests/card-collect.test.mjs`

**Interfaces:**
- Consumes: `state.js` `get`, `rarity.js` `computeRarity` (Task 2), `fossil-data.js`
- Produces:
  - `export const cardCollect` — 핸들러 객체
  - `export function signalRatio(kind, raw, full) -> number [0,1]` — 사이드카 값에서 비율 추출(방어적)
  - `export function quizPassed(quizValue) -> boolean`
  - value 형태: `{ rarity, stars, name, class, detailScore, luckRoll, total, openedAt, snapshot: {name,type,habitat,ability,weakness,image} }`

- [ ] **Step 1: tests/card-collect.test.mjs 작성 (실패하는 테스트)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardCollect, signalRatio, quizPassed } from '../app/src/card-collect-block.js';
import { makeCtx } from './helpers/mock-ctx.mjs';

test('signalRatio: strokes (배열 길이 또는 strokeCount)', () => {
  assert.equal(signalRatio('strokes', { strokes: new Array(18) }, 36), 0.5);
  assert.equal(signalRatio('strokes', { strokeCount: 36 }, 36), 1);
  assert.equal(signalRatio('strokes', null, 36), 0);
});

test('signalRatio: textlen (문자열 또는 {text})', () => {
  assert.equal(signalRatio('textlen', 'a'.repeat(60), 120), 0.5);
  assert.equal(signalRatio('textlen', { text: 'a'.repeat(120) }, 120), 1);
  assert.equal(signalRatio('textlen', { text: '   ' }, 120), 0);
});

test('signalRatio: fields/rows (채워진 비율)', () => {
  assert.equal(signalRatio('fields', { rows: { a: 'x', b: '', c: 'y', d: '' } }, null), 0.5);
  assert.equal(signalRatio('rows', { a: 'x', b: 'y' }, null), 1);
});

test('signalRatio: quizscore (correct/total 우선, 없으면 응답여부 0.6)', () => {
  assert.equal(signalRatio('quizscore', { correct: 4, total: 5 }, null), 0.8);
  assert.equal(signalRatio('quizscore', { answers: { f1: 0, f2: 1 } }, null), 0.6);
  assert.equal(signalRatio('quizscore', null, null), 0);
});

test('quizPassed: 응답이 하나라도 있으면 통과', () => {
  assert.equal(quizPassed(null), false);
  assert.equal(quizPassed({ answers: {} }), false);
  assert.equal(quizPassed({ answers: { f1: 2 } }), true);
});

test('complete: openedAt 있어야 true', () => {
  const block = { id: 'card-collect' };
  assert.equal(cardCollect.complete(block, null), false);
  assert.equal(cardCollect.complete(block, { openedAt: null }), false);
  assert.equal(cardCollect.complete(block, { openedAt: 'x', stars: 3 }), true);
});

test('missing: 퀴즈 전/후 문구 구분', () => {
  const block = { id: 'card-collect', quizRef: 'final-quiz' };
  const ctxNoQuiz = makeCtx({ getValue: () => null });
  const ctxQuiz = makeCtx({ getValue: () => ({ answers: { f1: 0 } }) });
  assert.equal(cardCollect.missing(block, null, ctxNoQuiz), '퀴즈를 먼저 완료하세요.');
  assert.equal(cardCollect.missing(block, null, ctxQuiz), '카드를 개봉하세요.');
});

test('summary: image, 이름·별·등급 캡션', () => {
  const block = { id: 'card-collect', label: '생물 카드 개봉' };
  const v = { openedAt: 'x', stars: 4, name: '슈퍼레어', snapshot: { name: '눈보라늑대', image: 'data:img' } };
  const s = cardCollect.summary(block, v);
  assert.equal(s.kind, 'image');
  assert.equal(s.src, 'data:img');
  assert.equal(s.caption, '눈보라늑대 · 4★ 슈퍼레어');
});
```

> `makeCtx` 를 확장한다: `getValue(ref)` 를 옵션으로 받도록 Task 1의 헬퍼에 추가(아래 Step 3에서 함께 수정).

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test tests/card-collect.test.mjs`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: tests/helpers/mock-ctx.mjs 에 getValue 추가**

```js
export function makeCtx(overrides = {}) {
  return {
    refreshFooter() {},
    assembledPrompt() { return ''; },
    summaryOf() { return null; },
    getValue() { return null; },   // 블록 간 값 조회 (역설계 확인 대상 — Plan 2)
    peers() { return []; },
    publishPeer() {},
    onTeardown() {},
    checklist() { return []; },
    ...overrides,
  };
}
```

- [ ] **Step 4: app/src/card-collect-block.js 작성**

```js
import { get } from './state.js';
import { computeRarity } from './rarity.js';
import { loadFossilData } from './fossil-data.js';

const MISSING_QUIZ = '퀴즈를 먼저 완료하세요.';
const MISSING_OPEN = '카드를 개봉하세요.';

// 사이드카 블록 값 → 신호 비율 [0,1]. 플랫폼 value 형태가 불확실하므로 방어적으로 처리.
export function signalRatio(kind, raw, full) {
  if (raw == null) return 0;
  switch (kind) {
    case 'strokes': {
      const n = Array.isArray(raw.strokes)
        ? raw.strokes.length
        : (typeof raw.strokeCount === 'number' ? raw.strokeCount : 0);
      return full ? clamp01(n / full) : 0;
    }
    case 'textlen': {
      const s = typeof raw === 'string' ? raw : (raw.text || raw.value || '');
      return full ? clamp01(s.trim().length / full) : 0;
    }
    case 'fields':
    case 'rows': {
      const obj = raw.rows || raw.fields || raw;
      const vals = Object.values(obj).filter((v) => typeof v === 'string');
      if (!vals.length) return 0;
      return vals.filter((v) => v.trim().length > 0).length / vals.length;
    }
    case 'quizscore': {
      if (typeof raw.correct === 'number' && typeof raw.total === 'number' && raw.total > 0) {
        return clamp01(raw.correct / raw.total);
      }
      const ans = raw.answers || raw;
      return ans && Object.keys(ans).length ? 0.6 : 0; // 점수 못 읽으면 응답만으로 0.6
    }
    default:
      return 0;
  }
}

export function quizPassed(quizValue) {
  if (!quizValue) return false;
  const ans = quizValue.answers || quizValue;
  return !!ans && Object.keys(ans).length > 0;
}

function clamp01(x) {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function readRef(ctx, ref) {
  // 우선 ctx.getValue(ref), 없으면 상태 저장소에서 직접 (state 키 == 블록 id 가정)
  if (typeof ctx.getValue === 'function') {
    const v = ctx.getValue(ref);
    if (v != null) return v;
  }
  return get(ref);
}

function starString(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

export const cardCollect = {
  async render(block, ctx) {
    const root = document.createElement('div');
    root.className = 'fx-card-collect';
    const value = get(block.id);

    if (value && value.openedAt) {
      root.appendChild(await this._renderCard(block, value));
      return root;
    }

    const quizValue = readRef(ctx, block.quizRef);
    if (!quizPassed(quizValue)) {
      const lock = document.createElement('p');
      lock.className = 'fx-card-lock';
      lock.textContent = MISSING_QUIZ;
      root.appendChild(lock);
      return root;
    }

    const hint = document.createElement('p');
    hint.className = 'fx-card-hint';
    hint.textContent = '생물을 더 정성껏 다듬을수록 높은 등급이 나옵니다.';

    const back = document.createElement('div');
    back.className = 'fx-card-back';
    back.textContent = '?';

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'fx-btn fx-btn-open';
    open.textContent = '카드 개봉';
    open.addEventListener('click', async () => {
      open.disabled = true;
      const opened = await this._open(block, ctx);
      root.innerHTML = '';
      const card = await this._renderCard(block, opened);
      card.classList.add('fx-reveal');
      root.appendChild(card);
      ctx.refreshFooter();
    });

    root.append(hint, back, open);
    return root;
  },

  async _open(block, ctx) {
    const data = await loadFossilData();
    const rar = data[block.rarityRef || 'rarity'];
    const parts = block.signals.map((sig) => ({
      weight: sig.weight,
      ratio: signalRatio(sig.kind, readRef(ctx, sig.ref), sig.full),
    }));
    const luckKey = (block.luckKeyPrefix || 'card') + '::' + block.id;
    const result = computeRarity({ parts, luckKey, luckWeight: rar.luckWeight, tiers: rar.tiers });

    const info = readRef(ctx, block.infoRef) || {};
    const infoRows = info.rows || info.fields || info;
    const image = readRef(ctx, block.imageRef);
    const snapshot = {
      name: infoRows['이름'] || infoRows.name || '이름 없음',
      type: infoRows['타입'] || infoRows.type || '',
      habitat: infoRows['서식지'] || infoRows.habitat || '',
      ability: infoRows['특수 능력'] || infoRows.ability || '',
      weakness: infoRows['약점'] || infoRows.weakness || '',
      image: (image && (image.url || image.dataURL || image)) || '',
    };

    const value = {
      rarity: result.class, stars: result.stars, name: result.name, class: result.class,
      detailScore: result.detailScore, luckRoll: result.luckRoll, total: result.total,
      openedAt: new Date().toISOString(), snapshot,
    };
    set(block.id, value);
    return value;
  },

  async _renderCard(block, value) {
    const s = value.snapshot;
    const card = document.createElement('div');
    card.className = `fx-card ${value.class}`;
    card.innerHTML = `
      <div class="fx-card-foil"></div>
      <div class="fx-card-stars">${starString(value.stars)} <span>${value.name}</span></div>
      <div class="fx-card-img">${s.image ? `<img src="${s.image}" alt="${s.name}">` : ''}</div>
      <div class="fx-card-name">${s.name}</div>
      <div class="fx-card-meta">
        <span>타입 ${s.type}</span><span>서식지 ${s.habitat}</span>
      </div>
      <div class="fx-card-ability"><b>특수 능력</b> ${s.ability}</div>
      <div class="fx-card-weak"><b>약점</b> ${s.weakness}</div>`;
    return card;
  },

  complete(block, value) {
    return !!value && !!value.openedAt;
  },

  missing(block, value, ctx) {
    if (value && value.openedAt) return '';
    const quizValue = readRef(ctx, block.quizRef);
    return quizPassed(quizValue) ? MISSING_OPEN : MISSING_QUIZ;
  },

  summary(block, value) {
    if (!this.complete(block, value)) return null;
    return {
      kind: 'image',
      label: block.label,
      src: value.snapshot.image,
      caption: `${value.snapshot.name} · ${value.stars}★ ${value.name}`,
    };
  },
};
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `node --test tests/card-collect.test.mjs`
Expected: PASS (8 tests)

- [ ] **Step 6: 전체 테스트 재확인**

Run: `npm test`
Expected: PASS (누적 ~27 tests)

- [ ] **Step 7: 커밋**

```bash
git add app/src/card-collect-block.js tests/card-collect.test.mjs tests/helpers/mock-ctx.mjs
git commit -m "feat: card.collect 블록 (5등급 수집 카드·퀴즈 게이트)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GQzD5w6PaGrZk8nRVwDUPT"
```

---

## Task 7: 스타일시트 (뽑기 연출 · 홀로그램 등급)

**Files:**
- Create: `app/src/fossil-explorer.css`

**Interfaces:**
- Consumes: 블록들이 생성하는 클래스명 (`fx-*`, `rar-*`)
- Produces: 시각 스타일. JS 계약 없음. Task 8 데모에서 육안 검증.

- [ ] **Step 1: app/src/fossil-explorer.css 작성**

핵심 요구:
- `.fx-gacha-machine.fx-shake` — 흔들림 `@keyframes`(선생님 `intense-shake` 차용: 0.12s infinite)
- `.fx-reveal` — 등장 애니메이션(scale + opacity)
- `.fx-atom-grid` — `display:grid; grid-template-columns:repeat(6,1fr); gap:6px`
- `.fx-atom-parent` — 청록 방사형 그라데이션 / `.fx-atom-daughter` — 보라
- `.fx-card` — 세로 카드(가로세로비 5:7), `position:relative`, `overflow:hidden`
- `.fx-card-foil` — `position:absolute; inset:0; pointer-events:none`
- 등급별:
  - `.rar-normal` — 무광 단색 테두리, `.fx-card-foil { display:none }`
  - `.rar-uncommon` — 은색 그라데이션 테두리
  - `.rar-rare .fx-card-foil` — 테두리 홀로그램 `conic-gradient` + `@keyframes fx-holo-spin` 6s
  - `.rar-superrare .fx-card-foil` — 카드 전체 `conic-gradient` + `mix-blend-mode:color-dodge; opacity:.5`
  - `.rar-legendary .fx-card-foil` — 무지개 `conic-gradient` 회전 + `.fx-card::after` 반짝이 입자(radial-gradient 다중 배경 + `@keyframes fx-sparkle`), `.fx-card-stars` 앞에 `LEGENDARY` 배너
- 다크/라이트 모두에서 읽히도록 카드 배경은 명시적 색 지정
- 외부 폰트·이미지 로드 금지(전부 CSS 그라데이션)

```css
/* app/src/fossil-explorer.css — 발췌. 아래 골격을 채운다. */
.fx-draw-habitat, .fx-dating-sim, .fx-card-collect { font: inherit; }

.fx-gacha-machine { font-size: 4rem; text-align: center; }
@keyframes fx-shake {
  0%,100% { transform: translate(0,0) rotate(0); }
  25% { transform: translate(-4px,3px) rotate(-3deg); }
  75% { transform: translate(4px,-3px) rotate(3deg); }
}
.fx-shake { animation: fx-shake .12s infinite; }

@keyframes fx-reveal-in { from { opacity:0; transform: scale(.8); } to { opacity:1; transform: scale(1); } }
.fx-reveal { animation: fx-reveal-in .35s ease-out; }

.fx-atom-grid { display:grid; grid-template-columns: repeat(6,1fr); gap:6px; max-width:260px; }
.fx-atom { aspect-ratio:1; border-radius:50%; }
.fx-atom-parent   { background: radial-gradient(circle at 35% 35%, #a5f3fc, #0891b2); }
.fx-atom-daughter { background: radial-gradient(circle at 35% 35%, #e9d5ff, #7e22ce); }

.fx-card {
  position:relative; overflow:hidden; aspect-ratio:5/7; max-width:320px;
  border-radius:16px; padding:14px; background:#0f172a; color:#f1f5f9;
  border:3px solid #334155;
}
.fx-card-foil { position:absolute; inset:0; pointer-events:none; }
.fx-card-stars { position:relative; font-weight:800; letter-spacing:2px; }

.rar-normal   { border-color:#475569; }
.rar-uncommon { border-color:#cbd5e1; border-image: linear-gradient(135deg,#94a3b8,#e2e8f0,#94a3b8) 1; }

@keyframes fx-holo-spin { to { transform: rotate(1turn); } }
.rar-rare .fx-card-foil {
  background: conic-gradient(from 0deg, #f0f,#0ff,#ff0,#0f0,#f0f);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude; padding:3px;
  animation: fx-holo-spin 6s linear infinite; opacity:.7;
}
.rar-superrare .fx-card-foil {
  background: conic-gradient(from 0deg, #f0f,#0ff,#ff0,#0f0,#f0f);
  mix-blend-mode: color-dodge; opacity:.45; animation: fx-holo-spin 8s linear infinite;
}
@keyframes fx-sparkle { 0%,100%{opacity:.3} 50%{opacity:1} }
.rar-legendary { border-color:#fbbf24; }
.rar-legendary .fx-card-foil {
  background: conic-gradient(from 0deg,#ff004c,#ffb800,#7cff00,#00e5ff,#c400ff,#ff004c);
  mix-blend-mode: color-dodge; opacity:.5; animation: fx-holo-spin 5s linear infinite;
}
.rar-legendary::after {
  content:""; position:absolute; inset:0; pointer-events:none;
  background:
    radial-gradient(2px 2px at 20% 30%, #fff, transparent),
    radial-gradient(2px 2px at 70% 60%, #fff, transparent),
    radial-gradient(1px 1px at 45% 80%, #fff, transparent);
  animation: fx-sparkle 1.8s ease-in-out infinite;
}
.rar-legendary .fx-card-stars::before {
  content:"LEGENDARY"; display:block; font-size:.7rem; color:#fbbf24;
}
```

- [ ] **Step 2: 커밋**

```bash
git add app/src/fossil-explorer.css
git commit -m "feat: 스타일 (뽑기 연출·홀로그램 5등급 카드)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GQzD5w6PaGrZk8nRVwDUPT"
```

---

## Task 8: 단독 데모 페이지

**Files:**
- Create: `app/demo.html`
- Create: `app/src/demo.js`

**Interfaces:**
- Consumes: 3개 블록 핸들러, `state.js` `_clear`, `fossil-data.js`
- Produces: 브라우저에서 6세션을 수동으로 밟아볼 수 있는 페이지. 자동 테스트 아님.

- [ ] **Step 1: app/demo.html 작성**

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>화석 탐구 수업 — 블록 데모</title>
  <link rel="stylesheet" href="./src/fossil-explorer.css" />
  <style>
    body { font: 15px/1.6 system-ui, sans-serif; max-width: 720px; margin: 0 auto; padding: 24px; }
    .demo-step { border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin: 16px 0; }
    .demo-step h2 { margin: 0 0 4px; font-size: 1rem; }
    .demo-missing { color: #b91c1c; font-size: .85rem; }
    .demo-summary { background: #f1f5f9; border-radius: 8px; padding: 8px; font-size: .8rem; white-space: pre-wrap; }
    button.demo-reset { margin-bottom: 16px; }
    .fx-btn { padding: 10px 16px; border-radius: 10px; border: 0; background: #4f46e5; color: #fff; cursor: pointer; }
  </style>
</head>
<body>
  <h1>화석 탐구 수업 — 블록 데모</h1>
  <button class="demo-reset" onclick="localStorage.clear(); location.reload()">상태 초기화</button>
  <div id="mount"></div>
  <script type="module" src="./src/demo.js"></script>
</body>
</html>
```

- [ ] **Step 2: app/src/demo.js 작성**

```js
import { drawHabitat } from './draw-habitat-block.js';
import { datingSim } from './dating-sim-block.js';
import { cardCollect } from './card-collect-block.js';
import { get, set } from './state.js';
import { loadFossilData } from './fossil-data.js';

// 재사용 블록(플랫폼 제공)은 데모에서 간단 스텁으로 대체
function stubInput(block) {
  const wrap = document.createElement('div');
  const ta = document.createElement('textarea');
  ta.rows = 2; ta.style.width = '100%';
  ta.value = (get(block.id) && get(block.id).text) || '';
  ta.addEventListener('input', () => set(block.id, { text: ta.value }));
  wrap.append(ta);
  return wrap;
}
function stubSketch(block) {
  const wrap = document.createElement('div');
  const btn = document.createElement('button');
  btn.className = 'fx-btn'; btn.textContent = '가짜 획 10개 추가';
  btn.onclick = () => {
    const v = get(block.id) || { strokes: [] };
    v.strokes.push(...new Array(10).fill([0, 0]));
    set(block.id, v);
    btn.textContent = `획 ${v.strokes.length}개`;
  };
  wrap.append(btn);
  return wrap;
}
function stubQuiz(block, data) {
  const wrap = document.createElement('div');
  const qs = data.finalQuiz;
  const v = get(block.id) || { answers: {}, correct: 0, total: qs.length };
  qs.forEach((q) => {
    const b = document.createElement('button');
    b.className = 'fx-btn'; b.style.margin = '2px';
    b.textContent = q.q.slice(0, 12) + '… → 정답 찍기';
    b.onclick = () => {
      v.answers[q.key] = q.answer;
      v.correct = Object.entries(v.answers).filter(([k, a]) => qs.find((x) => x.key === k).answer === a).length;
      set(block.id, v);
      b.textContent = '✓ ' + b.textContent;
    };
    wrap.append(b);
  });
  return wrap;
}

const ctx = {
  refreshFooter: () => renderAll(),
  getValue: (ref) => get(ref),
  assembledPrompt: () => '',
  summaryOf: () => null,
  peers: () => [], publishPeer() {}, onTeardown() {}, checklist: () => [],
};

// 데모용 6세션 블록 목록 (프로그램 JSON과 동일한 id 사용)
const STEPS = [
  { id: 'bio-intro', kind: 'stub-input', label: '생물 이름·소개' },
  { id: 'sketch', kind: 'stub-sketch', label: '손그림' },
  { id: 'card-info', kind: 'stub-input', label: '카드 정보(이름 등)' },
  { id: 'common-traits', kind: 'stub-input', label: '공통 속성표' },
  { id: 'draw-habitat', kind: 'draw', label: '서식 환경 뽑기', poolRef: 'habitats' },
  { id: 'dating-sim', kind: 'dating', label: '방사성 연대 측정', problemsRef: 'datingProblems', tableRef: 'halfLifeTable' },
  { id: 'final-quiz', kind: 'stub-quiz', label: '종합 퀴즈' },
  {
    id: 'card-collect', kind: 'card', label: '생물 카드 개봉',
    imageRef: 'ai-image', infoRef: 'card-info', quizRef: 'final-quiz', rarityRef: 'rarity',
    signals: [
      { ref: 'sketch', kind: 'strokes', weight: 20, full: 36 },
      { ref: 'bio-intro', kind: 'textlen', weight: 15, full: 120 },
      { ref: 'card-info', kind: 'fields', weight: 15 },
      { ref: 'common-traits', kind: 'rows', weight: 10 },
      { ref: 'final-quiz', kind: 'quizscore', weight: 10 },
    ],
  },
];

let DATA;
const mount = document.getElementById('mount');

async function renderAll() {
  DATA = DATA || (await loadFossilData());
  // ai-image 가짜 값 하나 넣어두기(업로드 블록 대체)
  if (!get('ai-image')) set('ai-image', { url: 'https://placehold.co/400x300?text=AI+image' });
  mount.innerHTML = '';
  for (const step of STEPS) {
    const box = document.createElement('div');
    box.className = 'demo-step';
    const h = document.createElement('h2');
    h.textContent = step.label;
    box.append(h);

    let body;
    if (step.kind === 'draw') body = drawHabitat.render(step, ctx);
    else if (step.kind === 'dating') body = await datingSim.render(step, ctx);
    else if (step.kind === 'card') body = await cardCollect.render(step, ctx);
    else if (step.kind === 'stub-input') body = stubInput(step);
    else if (step.kind === 'stub-sketch') body = stubSketch(step);
    else if (step.kind === 'stub-quiz') body = stubQuiz(step, DATA);
    box.append(body);

    // 핸들러 블록은 미완료 사유 + 요약 표시
    const handler = { draw: drawHabitat, dating: datingSim, card: cardCollect }[step.kind];
    if (handler) {
      const value = get(step.id);
      if (!handler.complete(step, value, ctx)) {
        const m = document.createElement('div');
        m.className = 'demo-missing';
        m.textContent = '미완료: ' + handler.missing(step, value, ctx);
        box.append(m);
      } else {
        const sm = document.createElement('div');
        sm.className = 'demo-summary';
        sm.textContent = JSON.stringify(handler.summary(step, value, ctx), null, 2);
        box.append(sm);
      }
    }
    mount.append(box);
  }
}

renderAll();
```

- [ ] **Step 3: 데모 수동 검증**

Run: `npm run serve` 후 브라우저에서 `http://localhost:8000/app/demo.html`

체크리스트(육안):
- [ ] "서식 환경 뽑기!" 클릭 → 흔들림 연출 후 환경 카드, 새로고침해도 유지
- [ ] 연대 측정: 36칸 그리드가 모원소 비율대로 색 구분, 정답 입력 시 해설+시대 표시, 새로고침해도 같은 문제
- [ ] 종합 퀴즈 스텁에서 정답 몇 개 찍기 → 카드 블록의 "미완료: 카드를 개봉하세요."로 바뀜
- [ ] 손그림 획 늘리기 / 소개글 길게 / 카드정보 채우기 정도에 따라 개봉 등급이 달라짐
- [ ] 개봉된 카드에 별·등급별 홀로그램 효과, 새로고침해도 등급 불변
- [ ] "상태 초기화" 후 처음부터 다시 가능

- [ ] **Step 4: 커밋**

```bash
git add app/demo.html app/src/demo.js
git commit -m "feat: 단독 데모 페이지 (6세션 수동 시연)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GQzD5w6PaGrZk8nRVwDUPT"
```

---

## Task 9: 수업 프로그램 JSON

**Files:**
- Create: `app/programs/p6-fossil-explorer.json`
- Test: `tests/program-json.test.mjs`

**Interfaces:**
- Consumes: 블록 타입 문자열, 콘텐츠 참조 키
- Produces: 스펙 5장의 6세션 흐름을 담은 프로그램 정의. 재사용 블록은 플랫폼 타입 사용, 신규 3종은 `draw.habitat` / `dating.sim` / `card.collect`.

- [ ] **Step 1: app/programs/p6-fossil-explorer.json 작성**

스펙 5장 표를 그대로 옮긴다. 골격:

```json
{
  "id": "p6-fossil-explorer",
  "version": "0.1.0",
  "_note": "화석으로 알아보는 생물 탐구. 신규 블록 draw.habitat / dating.sim / card.collect 필요. 번호·index 위치는 총괄자 확정 대상.",
  "title": "화석으로 알아보는 생물 탐구",
  "subtitle": "화석 채집 → 환경·연대 뽑기 → 조사 → 상상해 그리기 → AI 실사화 → 수집 카드",
  "gradeBand": "middle",
  "hall": "자연사관 · 화석 전시",
  "aiType": "image",
  "estimatedMinutes": 180,
  "groupMode": "solo-or-pair",
  "sessions": [
    {
      "id": "s1", "no": 1, "title": "화석을 채집하다", "tagline": "과학관에서 내 화석을 고른다",
      "steps": [
        { "id": "s1-01", "phase": "collect", "title": "내 화석 사진",
          "blocks": [
            { "type": "text", "tone": "plain", "body": "국립중앙과학관을 돌아보며 마음에 드는 화석을 사진으로 찍어 올리세요." },
            { "type": "capture.photo", "id": "fossil-photo", "label": "내 화석", "groups": [{ "key": "fossil", "label": "내 화석", "min": 1 }] },
            { "type": "input.short", "id": "fossil-note", "label": "이 화석을 어디서 봤나요? 첫인상은?" }
          ],
          "advance": { "requires": ["fossil-photo"] } }
      ]
    },
    {
      "id": "s2", "no": 2, "title": "환경과 연대를 뽑다", "tagline": "무작위 환경 + 방사성 연대 측정",
      "steps": [
        { "id": "s2-01", "phase": "draw", "title": "서식 환경 뽑기",
          "blocks": [
            { "type": "text", "tone": "plain", "body": "무작위로 배정받은 환경과 시대에 이 생물이 적응해 살았다고 상상합니다." },
            { "type": "draw.habitat", "id": "draw-habitat", "label": "서식 환경 뽑기", "poolRef": "habitats" }
          ],
          "advance": { "requires": ["draw-habitat"] } },
        { "id": "s2-02", "phase": "dating", "title": "방사성 연대 측정",
          "blocks": [
            { "type": "dating.sim", "id": "dating-sim", "label": "방사성 연대 측정", "problemsRef": "datingProblems", "tableRef": "halfLifeTable" }
          ],
          "advance": { "requires": ["dating-sim"] } }
      ]
    },
    {
      "id": "s3", "no": 3, "title": "환경을 조사하다", "tagline": "이 환경 생물들의 공통점",
      "steps": [
        { "id": "s3-01", "phase": "research", "title": "환경 조사",
          "blocks": [
            { "type": "text", "tone": "plain", "body": "믿을 수 있는 자료로 이 환경을 조사하세요. 출처를 함께 적습니다." },
            { "type": "input.long", "id": "env-research", "label": "이 서식 환경은 어떤 곳인가 (기후·지형·특징)", "min": 80 }
          ],
          "advance": { "requires": ["env-research"] } },
        { "id": "s3-02", "phase": "research", "title": "공통 속성",
          "blocks": [
            { "type": "input.table", "id": "common-traits", "label": "이 환경 생물들의 공통 속성",
              "rows": [
                { "key": "body", "label": "몸의 구조" }, { "key": "food", "label": "먹이·에너지" },
                { "key": "move", "label": "이동 방법" }, { "key": "temp", "label": "체온·수분 유지" },
                { "key": "repro", "label": "번식·생존 전략" }
              ] },
            { "type": "quiz", "id": "mid-quiz", "label": "환경 적응 개념 확인", "questionsRef": "midQuiz" }
          ],
          "advance": { "requires": ["common-traits"] } }
      ]
    },
    {
      "id": "s4", "no": 4, "title": "생물을 상상해 그리다", "tagline": "공통 속성을 반영한 손그림",
      "steps": [
        { "id": "s4-01", "phase": "create", "title": "손그림",
          "blocks": [
            { "type": "text", "tone": "plain", "body": "조사한 공통 속성이 드러나도록 이 환경·시대에 살 법한 생물을 그리세요." },
            { "type": "capture.sketch", "id": "sketch", "label": "내 생물 그리기", "ratio": "4:3", "minStrokes": 12,
              "guide": "몸의 구조 / 먹이 / 이동 / 체온·수분 / 번식 특징이 보이게" },
            { "type": "input.short", "id": "bio-intro", "label": "생물 이름 + 한 줄 소개" }
          ],
          "advance": { "requires": ["sketch", "bio-intro"] } },
        { "id": "s4-02", "phase": "create", "title": "카드 정보",
          "blocks": [
            { "type": "input.table", "id": "card-info", "label": "카드에 넣을 정보",
              "rows": [
                { "key": "name", "label": "이름" }, { "key": "type", "label": "타입" },
                { "key": "habitat", "label": "서식지" }, { "key": "ability", "label": "특수 능력" },
                { "key": "weakness", "label": "약점" }
              ] }
          ],
          "advance": { "requires": ["card-info"] } }
      ]
    },
    {
      "id": "s5", "no": 5, "title": "AI로 되살리다", "tagline": "손그림 → 극실사 사진",
      "steps": [
        { "id": "s5-01", "phase": "ai", "title": "프롬프트 만들기",
          "blocks": [
            { "type": "ai.prompt", "id": "realism-prompt", "label": "극실사 프롬프트", "join": "\n",
              "fields": [
                { "key": "desc", "label": "내가 복원한 생물 설명", "placeholder": "생김새·크기·특징" },
                { "key": "habitat", "label": "서식 환경", "placeholder": "뽑은 환경" },
                { "key": "era", "label": "생존 연대·적응 특징", "placeholder": "연대 + 적응 포인트" }
              ] },
            { "type": "ai.launch", "id": "realism-launch", "label": "이미지 도구 열기", "promptRef": "realism-prompt", "url": "", "tool": "(교사 지정)" }
          ],
          "advance": { "requires": [] } },
        { "id": "s5-02", "phase": "ai", "title": "결과 이미지",
          "blocks": [
            { "type": "ai.collect", "id": "ai-image", "label": "완성 이미지 업로드", "accept": ["file", "url"], "promptRef": "realism-prompt" },
            { "type": "compare", "id": "sketch-vs-ai", "label": "손그림 ↔ 실사 비교",
              "left": { "label": "손그림", "ref": "sketch" }, "right": { "label": "AI 실사", "ref": "ai-image" },
              "checks": [
                { "key": "silhouette", "label": "실루엣이 유지됐나" },
                { "key": "ratio", "label": "신체 비율이 맞나" },
                { "key": "traits", "label": "적응 특징이 반영됐나" }
              ],
              "note": { "label": "느낀 점", "hint": "무엇이 잘/덜 반영됐는지" } }
          ],
          "advance": { "requires": ["ai-image"] } }
      ]
    },
    {
      "id": "s6", "no": 6, "title": "카드를 획득하다", "tagline": "퀴즈 통과 → 카드 개봉",
      "steps": [
        { "id": "s6-01", "phase": "quiz", "title": "종합 퀴즈",
          "blocks": [
            { "type": "text", "tone": "plain", "body": "퀴즈를 통과하면 나만의 생물 카드를 개봉합니다." },
            { "type": "quiz", "id": "final-quiz", "label": "생물·환경·지질시대 종합 퀴즈", "questionsRef": "finalQuiz" }
          ],
          "advance": { "requires": ["final-quiz"] } },
        { "id": "s6-02", "phase": "collect", "title": "카드 개봉",
          "blocks": [
            { "type": "card.collect", "id": "card-collect", "label": "생물 카드 개봉",
              "imageRef": "ai-image", "infoRef": "card-info", "quizRef": "final-quiz", "rarityRef": "rarity",
              "signals": [
                { "ref": "sketch", "kind": "strokes", "weight": 20, "full": 36 },
                { "ref": "bio-intro", "kind": "textlen", "weight": 15, "full": 120 },
                { "ref": "card-info", "kind": "fields", "weight": 15 },
                { "ref": "common-traits", "kind": "rows", "weight": 10 },
                { "ref": "final-quiz", "kind": "quizscore", "weight": 10 }
              ] },
            { "type": "submit", "id": "final-submit", "label": "최종 제출" }
          ],
          "advance": { "requires": ["final-quiz", "card-collect"] } }
      ]
    }
  ],
  "deliverable": {
    "collect": ["fossil-photo", "draw-habitat", "dating-sim", "env-research", "common-traits", "sketch", "card-info", "ai-image", "sketch-vs-ai", "final-quiz", "card-collect"],
    "export": ["pdf", "zip", "csv"]
  }
}
```

- [ ] **Step 2: tests/program-json.test.mjs 작성 (실패하는 테스트)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const prog = JSON.parse(await readFile(new URL('../app/programs/p6-fossil-explorer.json', import.meta.url), 'utf8'));

function allBlocks() {
  return prog.sessions.flatMap((s) => s.steps.flatMap((st) => st.blocks));
}

test('세션 6개, 각 세션 no 오름차순', () => {
  assert.equal(prog.sessions.length, 6);
  assert.deepEqual(prog.sessions.map((s) => s.no), [1, 2, 3, 4, 5, 6]);
});

test('신규 블록 3종이 모두 사용됨', () => {
  const types = new Set(allBlocks().map((b) => b.type));
  for (const t of ['draw.habitat', 'dating.sim', 'card.collect']) assert.ok(types.has(t), `${t} 없음`);
});

test('advance.requires 가 참조하는 id 가 실제 블록으로 존재', () => {
  const ids = new Set(allBlocks().filter((b) => b.id).map((b) => b.id));
  for (const s of prog.sessions) {
    for (const st of s.steps) {
      for (const req of st.advance.requires) {
        assert.ok(ids.has(req), `advance.requires 의 ${req} 가 블록에 없음`);
      }
    }
  }
});

test('deliverable.collect 의 모든 id 가 블록으로 존재', () => {
  const ids = new Set(allBlocks().filter((b) => b.id).map((b) => b.id));
  for (const id of prog.deliverable.collect) assert.ok(ids.has(id), `deliverable ${id} 없음`);
});

test('card.collect 의 참조(ref) 대상이 모두 존재', () => {
  const ids = new Set(allBlocks().filter((b) => b.id).map((b) => b.id));
  const card = allBlocks().find((b) => b.type === 'card.collect');
  for (const r of [card.imageRef, card.infoRef, card.quizRef]) assert.ok(ids.has(r), `${r} 없음`);
  for (const sig of card.signals) assert.ok(ids.has(sig.ref), `signal ref ${sig.ref} 없음`);
  assert.equal(card.signals.reduce((s, x) => s + x.weight, 0), 70);
});

test('블록 id 중복 없음', () => {
  const ids = allBlocks().filter((b) => b.id).map((b) => b.id);
  assert.equal(ids.length, new Set(ids).size);
});
```

- [ ] **Step 3: 테스트 실행 & 수정**

Run: `node --test tests/program-json.test.mjs`
Expected: 처음엔 참조 불일치로 FAIL 가능 → JSON의 id/ref 를 맞춰 PASS.

- [ ] **Step 4: 전체 테스트**

Run: `npm test`
Expected: PASS (누적 ~33 tests)

- [ ] **Step 5: 커밋**

```bash
git add app/programs/p6-fossil-explorer.json tests/program-json.test.mjs
git commit -m "feat: 수업 프로그램 JSON (6세션 흐름) + 무결성 테스트

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GQzD5w6PaGrZk8nRVwDUPT"
```

---

## Task 10: README + 데모 안내

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: 없음
- Produces: 저장소 소개, 로컬 실행법, Plan 2(병합) 예고.

- [ ] **Step 1: README.md 작성**

```markdown
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
```

- [ ] **Step 2: 커밋**

```bash
git add README.md
git commit -m "docs: README (구성·실행법·병합 예고)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GQzD5w6PaGrZk8nRVwDUPT"
```

---

## 최종 검증

- [ ] `npm test` — 전부 통과
- [ ] `npm run serve` → `app/demo.html` 6세션 수동 체크리스트(Task 8 Step 3) 통과
- [ ] `git log --oneline` — Task별 커밋 존재
- [ ] `git status` — 클린

---

## Plan 2 예고 (별도 문서: `2026-09-02-fossil-explorer-integration.md`)

Plan 1 완료 후 실물 `muse-x-two.vercel.app` 소스와 대조하여 작성:

1. `integration/blocks-js.merge.json` — 블록 3종을 `app/src/blocks.js` 에 등록(import / registry entry)
2. `integration/programs-index.merge.json` — `app/programs/index.json` 에 p6 항목 append + `ready:true`
3. `integration/p6-program-file.add.json` — 프로그램 파일 추가 지시
4. `integration/README.md`, `MERGE-CHECKLIST.md`, `merge-manifest.json` (SHA-256)
5. `docs/MERGE-GUIDE.md`, `docs/REVERSE-ENGINEERING-NOTES.md`, `docs/DESIGN.md`
6. 역설계 확인 항목(스펙 12장) 실측 후 블록 코드 조정:
   - `blocks.js` 등록 문법 / `render` 동기·비동기 규약
   - `capture.sketch` value 의 획 수 노출 여부 → `signalRatio('strokes', …)` 조정
   - `ctx` 의 블록 간 값 조회 API (`getValue`? `summaryOf`?) → `readRef()` 조정
   - `quiz` value 구조 → `signalRatio('quizscore', …)`, `quizPassed()` 조정
   - 콘텐츠 파일 fetch 경로 / `questionsRef` 인라인 필요 여부
7. GitHub `github.com/6Gpirates/muse-x-fossil-explorer` 로 push, 총괄자에게 병합 요청

---

## Self-Review (작성자 체크)

**스펙 커버리지:**
- 스펙 5장 6세션 흐름 → Task 9 프로그램 JSON ✔
- 스펙 6.1 draw.habitat → Task 4 ✔
- 스펙 6.2 dating.sim → Task 5 ✔
- 스펙 6.3 card.collect + 등급 → Task 2(rarity) + Task 6 ✔
- 스펙 7장 콘텐츠 JSON → Task 3 ✔
- 스펙 8장 저장소 구조 → Task 1·10, 나머지(integration/·merge docs) → **Plan 2** (의도적 분리)
- 스펙 9장 Apps Script 이식 → Task 3(데이터)·4·5(로직) ✔
- 스펙 11장 테스트 계획 → 각 Task의 테스트 + 최종 검증 ✔
- 스펙 12장 역설계 미확인 → Plan 2 예고에 명시 ✔
- 스펙 13장 Phase 2 → 범위 밖(명시) ✔

**플레이스홀더 스캔:** 없음. 모든 코드 스텝에 실제 코드. `url:""`(ai.launch)는 교사가 채우는 설정값이라 의도적 공란 — 주석으로 표기.

**타입 일관성:**
- value 형태: draw.habitat `{habitat,index,drawnAt}` / dating.sim `{problem,problemIndex,answer,correct,submittedAt}` / card.collect `{...,openedAt,snapshot}` — Task 정의와 테스트·프로그램 JSON 참조 일치 ✔
- `computeRarity` 반환 필드(`detailScore,luckRoll,total,stars,name,class`) → card.collect `_open` 에서 그대로 사용 ✔
- `signalRatio(kind, raw, full)` 시그니처 → Task 6 테스트·`_open` 일치 ✔
- 프로그램 JSON `card.collect.signals[].ref` ↔ 다른 블록 `id` → Task 9 테스트가 강제 ✔
