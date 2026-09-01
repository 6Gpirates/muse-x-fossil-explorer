# 화석 탐구 수업 (muse-x-fossil-explorer) — 설계 문서

- 작성일: 2026-09-02
- 작성: 교사(이상욱) + Claude
- 상태: **검토 대기** (사용자 리뷰 후 구현 계획 작성으로 진행)

---

## 1. 한 줄 요약

국립중앙과학관 화석 탐구 수업을, 학습 플랫폼 **뮤즈엑스(MuzeX)** 에 그대로 끼울 수 있는
**수업 프로그램 파일 1개 + 새 블록 3개 + 병합 키트**로 구현한다.

## 2. 배경

### 2.1 뮤즈엑스 플랫폼
- 국립중앙과학관 연계 과학 수업용 웹 학습 플랫폼. 순수 HTML/JS, 프레임워크 없음, Vercel 배포.
  라이브: `muse-x-two.vercel.app`
- 총괄자: **Feynman520**. 조원들이 각자 수업 모듈을 만들고 총괄자가 원본에 병합한다.
- 수업은 **블록(block)** 조립 방식. 블록 = 학생 화면의 한 단위(안내글, 표 입력, 그리기, 퀴즈 등).
- 현재 프로그램 5종이 모두 구현 완료(`app/programs/index.json` 기준 전부 `ready: true`):
  1. `p1-scientist-chatbot` — 과학관에서 만나는 AI 과학자 (중등, 대화형 LLM)
  2. `p2-dinosaur-restore` — 화석에서 AI까지 (초등 5~6, 공룡 복원 + Teachable Machine ML 분류)
  3. `p3-biodiversity` — 한반도 생물 다양성 디지털 큐레이션 (중등, 멀티모달)
  4. `p4-plant-detective` — 티처블 머신 식물 탐정단 (중등, ML)
  5. `p5-human-evolution` — AI로 체험하는 인류의 진화 (고등, 생성형 + 윤리)
- **이 수업은 6번째 신규 프로그램이다.** p2와 소재(화석)만 겹치고 대상·내용은 완전히 다르다(2.3).

### 2.2 병합 방식 (총괄자 = Feynman 저장소 `muse-x-scientist-persona-chatbot` 규칙)
- 원본 파일을 통째로 덮어쓰지 않는다. `integration/` 폴더에 **부분 병합 조각(merge fragment)** 만 담는다.
- `MERGE-CHECKLIST.md` + `merge-manifest.json`(SHA-256 체크섬, 병합 시 재계산) 동봉.
- 조각 형식:
  `{ schemaVersion, target, action: "semantic-merge", operations: [ … ], nonOperations: [ … ] }`
- `operations[]` 예: `{ id, match:{sessionId,activityId}, operation:"prepend-unique-by-id"|"append-unique",
  collection:"blocks"|"advance.requires"|"deliverable.collect", fragment|value }`

### 2.3 p2와의 차이 (왜 별도 프로그램인가)

| 항목 | p2-dinosaur-restore | 이 수업 (잠정 p6) |
|---|---|---|
| 대상 | 초등 5~6 | 중·고 (방사성 연대 측정 포함) |
| 소재 | 공룡 (지정) | 학생이 과학관에서 직접 촬영한 임의의 화석 |
| 핵심 활동 | 복원도 + Teachable Machine ML 분류 | 서식환경 뽑기 + 방사성 연대 측정 + AI 실사화 + 수집 카드 |
| 게임 요소 | 없음 | 가챠 뽑기, 5등급 홀로그램 수집 카드 |

## 3. 대상과 범위

- 대상: 중학교~고등학교 (방사성 연대 측정 난이도 기준). 초등 고학년은 축소 버전 가능(Phase 2).
- **Phase 1 (이번 구현):** 5~9장 전체 — 수업 흐름 6세션, 새 블록 3개, 병합 키트, 단독 데모 페이지.
- **Phase 2 (다음):** 학급 갤러리 블록(`gallery.wall`), 유료 이미지 API 자동 생성(선택), 초등 축소 모드.
- 범위 밖: 자체 서버/DB(뮤즈엑스 것 사용), 구글 스프레드시트 연동(제거), 학생 계정 관리(뮤즈엑스 것 사용).

## 4. 뮤즈엑스 블록 규격 (역설계 결과 — 실물 대조는 12장)

각 블록 타입은 핸들러 객체이며 4개 함수를 구현한다:

- `render(block, ctx) -> HTMLElement`
- `complete(block, value, ctx) -> boolean`
- `missing(block, value, ctx) -> string` — 미완료 사유 문구
- `summary(block, value, ctx) -> { kind, label, ... } | null` — `null` 이면 포트폴리오 비수집(안내·도구용)

`summary.kind` 는 `'table'`(행 목록) / `'image'`(사진·그림) / `null` 로 정규화된다.

상태 저장: `import { get, set, shrink } from './state.js'`
- `get(blockId)` / `set(blockId, value)` — 입력마다 즉시 로컬 저장(낙관적)
- `shrink(dataURL)` — 이미지 압축

`ctx` 제공 메서드: `refreshFooter()`, `assembledPrompt(ref)`, `summaryOf(ref)`, `peers(block)`,
`publishPeer()`, `onTeardown(fn)`, `checklist()`

프로그램 JSON 구조:

```
{ id, version, _note, title, subtitle, gradeBand, hall, aiType, estimatedMinutes, groupMode,
  sessions: [
    { id, no, title, tagline,
      steps: [
        { id, phase, title, intro?,
          blocks: [ { type, id, label|title, meta?, …type별 필드 } ],
          advance: { requires: [ blockId ] } }
      ] }
  ],
  deliverable: { collect: [ blockId ], export: ["pdf","zip","csv"] } }
```

프로그램 등록: `app/programs/index.json` 의 `programs[]` 에 항목 추가 + `ready: true`.

### 4.1 재사용하는 기존 블록
`text`, `media`, `capture.photo`, `input.short`, `input.long`, `input.table`,
`capture.sketch`, `ai.prompt`, `ai.launch`, `ai.collect`, `compare`, `quiz`, `submit`
(설정 필드는 부록 A)

## 5. 수업 흐름 — `app/programs/p6-fossil-explorer.json`

프로그램 메타: `id: "p6-fossil-explorer"`, `title: "화석으로 알아보는 생물 탐구"`,
`gradeBand: "middle"`, `hall: "자연사관 · 화석 전시"`, `aiType: "image"`, `groupMode: "solo-or-pair"`.

> 번호(`p6`)와 `index.json` 삽입 위치는 **잠정**. 최종은 총괄자 결정.

### 세션 1 — 화석을 채집하다
| step | 블록 | 내용 |
|---|---|---|
| s1-01 | `text` | 활동 안내 |
| s1-01 | `capture.photo` | 과학관에서 찍은 화석 사진 업로드. `groups: [{key:"fossil", label:"내 화석", min:1}]` |
| s1-01 | `input.short` | 이 화석을 어디서 봤나 / 첫인상 |
| `advance.requires: ["fossil-photo"]` |

### 세션 2 — 환경과 연대를 뽑다
| step | 블록 | 내용 |
|---|---|---|
| s2-01 | `text` | "무작위로 배정받은 환경과 시대에 이 생물이 적응해 살았다고 상상합니다" |
| s2-01 | **`draw.habitat`** | 서식환경 무작위 뽑기 → 잠금 |
| s2-02 | **`dating.sim`** | 방사성 연대 측정 문제 풀이 → 연대 + 지질시대 확정 |
| `advance.requires: ["draw-habitat", "dating-sim"]` |

### 세션 3 — 환경을 조사하다
| step | 블록 | 내용 |
|---|---|---|
| s3-01 | `text` | 조사 안내 + 신뢰할 수 있는 자료 기준 |
| s3-01 | `input.long` | 이 서식 환경은 어떤 곳인가 (기후·지형·특징), 최소 80자 |
| s3-02 | `input.table` | 이 환경 생물들의 공통 속성. rows: 몸의 구조 / 먹이·에너지 / 이동 방법 / 체온·수분 유지 / 번식·생존 전략 |
| s3-02 | `quiz` | 환경 적응 개념 중간 확인 (2~3문항, `midQuiz`) |
| `advance.requires: ["env-research", "common-traits"]` |

### 세션 4 — 생물을 상상해 그리다
| step | 블록 | 내용 |
|---|---|---|
| s4-01 | `text` | "조사한 공통 속성이 드러나도록 그리세요" |
| s4-01 | `capture.sketch` | 손그림. `minStrokes: 12`, `ratio: "4:3"`, `guide`: 적응 특징 체크리스트 |
| s4-01 | `input.short` | 생물 이름 + 한 줄 소개 (id: `bio-intro`) |
| s4-02 | `input.table` | 카드 정보(id: `card-info`). rows: 이름 / 타입 / 서식지 / 특수 능력 / 약점 |
| `advance.requires: ["sketch", "card-info"]` |

### 세션 5 — AI로 되살리다
| step | 블록 | 내용 |
|---|---|---|
| s5-01 | `ai.prompt` | 실사화 프롬프트 조립. fields: 생물 설명 / 서식 환경 / 생존 연대·적응 특징. 고정 본문 = `realismPrompt`(부록 B) |
| s5-01 | `ai.launch` | 이미지 생성 도구 열기 + 프롬프트 자동 복사. `tool`·`url` = 교사/총괄자 지정(기본: 무료 도구) |
| s5-02 | `ai.collect` | 완성 이미지 업로드(id: `ai-image`). `accept: ["file","url"]` |
| s5-02 | `compare` | 손그림 ↔ 실사. `left.ref:"sketch"`, `right.ref:"ai-image"`, checks: 실루엣/비율/특징 반영 여부 |
| `advance.requires: ["ai-image"]` |

### 세션 6 — 카드를 획득하다
| step | 블록 | 내용 |
|---|---|---|
| s6-01 | `text` | "퀴즈를 통과하면 나만의 생물 카드를 개봉합니다" |
| s6-01 | `quiz` | 종합 퀴즈(id: `final-quiz`, 5문항, `finalQuiz`). 통과 = 전 문항 응답(점수는 등급에 반영) |
| s6-02 | **`card.collect`** | 실사 이미지 + 카드 정보 + 퀴즈 결과 → 5등급 수집 카드 개봉 |
| s6-02 | `submit` | 최종 제출 |
| `advance.requires: ["final-quiz", "card-collect"]` |

`deliverable.collect`:
`["fossil-photo","draw-habitat","dating-sim","env-research","common-traits","sketch","card-info","ai-image","compare","final-quiz","card-collect"]`

## 6. 새 블록 상세 설계

### 6.1 `draw.habitat` — 서식환경 뽑기

설정(프로그램 JSON):
```json
{ "type": "draw.habitat", "id": "draw-habitat", "label": "서식 환경 뽑기", "poolRef": "habitats" }
```
`poolRef` = 콘텐츠 JSON(`fossil-explorer.json`)의 키. 인라인 `pool` 도 허용.

- **value:** `{ index: number, drawnAt: ISOstring }`
- **render:**
  - value 없음 → 뽑기 머신 UI(아이콘 + "서식 환경 뽑기!" 버튼). 클릭 → 셔플 애니메이션(~1.5s) →
    `index = Math.floor(Math.random() * pool.length)` → `set()` → 결과 카드. (선생님 `startGacha` 연출 이식:
    흔들림·플래시·confetti)
  - value 있음 → 결과 카드만(잠금): 아이콘 / 국문명 / 영문명 / 설명
- **complete:** `!!value`
- **missing:** `"서식 환경을 아직 뽑지 않았습니다."`
- **summary:** `{ kind:'table', label, rows:[['뽑힌 서식 환경', `${h.korName} ${h.engName}`], ['환경 설명', h.desc]] }`
- **이식:** 선생님 `HABITATS`(11개) → 콘텐츠 JSON `habitats`. `drawHabitat()` → 위 render.

### 6.2 `dating.sim` — 방사성 연대 측정

설정:
```json
{ "type": "dating.sim", "id": "dating-sim", "label": "방사성 연대 측정",
  "problemsRef": "datingProblems", "tableRef": "halfLifeTable" }
```

- **value:** `{ problemIndex, answer, correct, submittedAt }`.
  문제는 첫 렌더 시 무작위 선택 후 즉시 `set({problemIndex})` 로 고정(재방문 시 동일 문제).
- **render:**
  - 36칸(6×6) 입자 그리드 — `parentPercent` 비율로 모원소/자원소 색 구분 (선생님 `renderAtomGrid6x6` 이식)
  - 모원소·자원소 **개수만** 라벨 (퍼센트 비표기 — 선생님 의도 유지)
  - 반감기 참고표 (콘텐츠 JSON `halfLifeTable`, 5행. 실제 문제에 안 쓰이는 칼륨-40 포함 = 의도된 오답 유도)
  - 분석 원소명, 연대 입력창(숫자), 단위 접미사
  - 제출 → `parseFloat(입력.replace(/[^0-9.]/g,'')) === problem.correctAnswer` → `set()`, 잠금,
    해설 + 지질시대 표시. 콤마 허용. 오답도 완료 처리(1회 제출), 정답 여부는 기록.
- **complete:** `!!value && value.answer !== undefined`
- **missing:** `"연대 측정값을 아직 제출하지 않았습니다."`
- **summary:** `{ kind:'table', label, rows:[['분석 원소', p.element],['모:자 비', p.ratioText],
  ['측정 연대(정답)', p.displayAge],['지질 시대', p.era],['학생 답', `${value.answer} (${value.correct?'정답':'오답'})`]] }`
- **이식:** 선생님 `DATING_PROBLEMS`(5문제) → `datingProblems`. 반감기표 → `halfLifeTable`. 채점·그리드 로직 이식.

### 6.3 `card.collect` — 수집 카드 (5등급)

설정:
```json
{ "type": "card.collect", "id": "card-collect", "label": "생물 카드 개봉",
  "imageRef": "ai-image", "infoRef": "card-info", "quizRef": "final-quiz",
  "signals": [
    { "ref": "sketch",        "kind": "strokes",   "weight": 20, "full": 36 },
    { "ref": "bio-intro",     "kind": "textlen",   "weight": 15, "full": 120 },
    { "ref": "card-info",     "kind": "fields",    "weight": 15 },
    { "ref": "common-traits", "kind": "rows",      "weight": 10 },
    { "ref": "final-quiz",    "kind": "quizscore", "weight": 10 }
  ],
  "luckWeight": 30, "rarityRef": "rarity" }
```

- **게이트:** `quizRef` 블록이 `complete` 아니면 개봉 버튼 비활성 + `"먼저 퀴즈를 완료하세요."`
- **개봉 흐름:**
  1. 개봉 전: 카드 뒷면 + "카드 개봉" 버튼 + 안내("생물을 더 정성껏 다듬을수록 높은 등급이 나옵니다").
  2. 개봉 클릭:
     - `detailScore` (0~70) = Σ signal 점수
       - `strokes`:   `clamp(strokeCount / full, 0, 1) * weight`
       - `textlen`:   `clamp(len / full, 0, 1) * weight`
       - `fields`:    `(채워진 칸 / 전체 칸) * weight`
       - `rows`:      `(채워진 행 / 전체 행) * weight`
       - `quizscore`: `(정답 수 / 전체) * weight`
     - `luckRoll` (0~30) = `seededRand(studentKey + blockId) * 30` 정수. `seededRand` = FNV-1a 해시 → 0~1
     - `total = round(detailScore + luckRoll)` (0~100)
     - `rarity` = `tiers` 중 `total >= min` 인 최고 등급
     - `set({ rarity, stars, detailScore, luckRoll, total, openedAt,
       snapshot:{name,type,habitat,ability,weakness,image} })`, 잠금
  3. 개봉 후: 카드 렌더 — 실사 이미지 + 카드 정보 + 별 + 등급별 CSS 클래스. 5★은 반짝이 입자 애니메이션.
- **등급 구간 (`rarity.tiers`, 콘텐츠 JSON):**

  | total | ★ | 이름 | CSS 클래스 / 시각 |
  |---|---|---|---|
  | 0–40 | 1 | 노멀 | `rar-normal` 무광 단색 |
  | 41–60 | 2 | 언커먼 | `rar-uncommon` 은색 메탈 테두리 |
  | 61–78 | 3 | 레어 | `rar-rare` 홀로그램 테두리 |
  | 79–92 | 4 | 슈퍼레어 | `rar-superrare` 전체 홀로 포일 |
  | 93–100 | 5 | 레전더리 | `rar-legendary` 무지개 포일 + 반짝이 + 전용 프레임 + 배너 |

  홀로그램/포일 = 순수 CSS(`conic-gradient`, `mix-blend-mode`, `@keyframes`). 이미지 파일 없음.
  실력 최대 70 + 운 평균 15 ≈ 85(슈퍼레어). 레전더리는 실력·운 둘 다 높아야 도달.
- **complete:** `!!value && !!value.openedAt`
- **missing:** 퀴즈 전 → `"퀴즈를 먼저 완료하세요."` / 퀴즈 후 개봉 전 → `"카드를 개봉하세요."`
- **summary:** `{ kind:'image', label, src: value.snapshot.image,
  caption: `${value.snapshot.name} · ${value.stars}★ ${등급명}` }`

**설계 결정 (검토 요망):**
- 퀴즈는 "전 문항 응답"이면 통과(오답 감점 없이 개봉 가능), 점수는 등급에 10점만 반영 → 잠금 좌절 방지.
  "만점 요구"로 바꿀 수 있음.
- 개봉 1회 고정. 개봉 전 다듬기 유도.

## 7. 콘텐츠 데이터 파일 — `app/content/fossil-explorer.json`

```json
{
  "meta": { "id": "p6-fossil-explorer", "title": "화석으로 알아보는 생물 탐구", "version": "0.1.0" },
  "habitats":       [ /* 선생님 HABITATS 11개 그대로 — 부록 C */ ],
  "datingProblems": [ /* 선생님 DATING_PROBLEMS 5개 그대로 — 부록 D */ ],
  "halfLifeTable": [
    { "label": "탄소-14 (¹⁴C)",   "value": "약 5,700년" },
    { "label": "토륨-230 (²³⁰Th)", "value": "약 7만 5천 년" },
    { "label": "우라늄-235 (²³⁵U)", "value": "약 7억 년" },
    { "label": "칼륨-40 (⁴⁰K)",    "value": "약 13억 년" },
    { "label": "우라늄-238 (²³⁸U)", "value": "약 45억 년" }
  ],
  "cardTypes": ["불꽃","물","풀","바위","얼음","전기","비행","독","땅","벌레","고스트","노멀"],
  "midQuiz":   [ /* 세션3 중간 퀴즈 2~3문항: {key,q,choices,answer,why} */ ],
  "finalQuiz": [ /* 세션6 종합 퀴즈 5문항 */ ],
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
  "realismPrompt": "/* 부록 B: 선생님 제공 극실사 프롬프트 본문 */"
}
```

퀴즈 문항은 Claude가 초안 작성 → 교사 검수. (화석 증거로 알 수 있는 것/없는 것, 지질시대 순서,
환경별 적응 특징 등)

## 8. 저장소 구조 & 병합 키트

```
muse-x-fossil-explorer/
├─ app/
│  ├─ content/fossil-explorer.json
│  ├─ programs/p6-fossil-explorer.json         (신규 프로그램 — 전체 파일)
│  ├─ src/
│  │  ├─ draw-habitat-block.js
│  │  ├─ dating-sim-block.js
│  │  ├─ card-collect-block.js
│  │  ├─ rarity.js                             (등급 계산 순수 함수 — 단위 테스트 대상)
│  │  └─ fossil-explorer.css                   (홀로그램·포일·뽑기 연출)
│  └─ demo.html                                (3블록 단독 구동 데모, 목 ctx/state)
├─ integration/
│  ├─ blocks-js.merge.json                     (블록 3종 등록: import / factory / registry)
│  ├─ programs-index.merge.json                (index.json 에 p6 항목 append + ready:true)
│  ├─ p6-program-file.add.json                 (p6-fossil-explorer.json 파일 추가 지시)
│  └─ README.md
├─ docs/
│  ├─ DESIGN.md                                (이 문서 요약본)
│  ├─ MERGE-GUIDE.md
│  └─ REVERSE-ENGINEERING-NOTES.md             (역설계 규격 + 검증 필요 항목)
├─ tests/
│  ├─ rarity.test.mjs                          (등급 계산 경계값)
│  ├─ dating.test.mjs                          (채점 로직)
│  └─ blocks-contract.test.mjs                 (4함수 규격 준수)
├─ MERGE-CHECKLIST.md
├─ merge-manifest.json                         (SHA-256 체크섬, 병합 시 재계산)
├─ package.json                                (런타임 의존성 0, 테스트만)
└─ README.md
```

병합 조각은 Feynman 저장소 형식 그대로:
`{ schemaVersion, target, action:"semantic-merge", operations, nonOperations }`.

## 9. 기존 Apps Script → 새 구조 매핑

| 기존 (Apps Script / index.html) | 새 위치 |
|---|---|
| `HABITATS` 배열 | `content/fossil-explorer.json` → `habitats` |
| `drawHabitat()` | `draw-habitat-block.js` render 뽑기 로직 |
| `startGacha()` 연출(흔들림/플래시/confetti) | `fossil-explorer.css` + `draw-habitat-block.js` |
| `DATING_PROBLEMS` 배열 | `content/fossil-explorer.json` → `datingProblems` |
| `renderAtomGrid6x6()` | `dating-sim-block.js` |
| `submitDatingAnswer()` 채점 | `dating-sim-block.js` |
| 반감기 참고표 (index.html) | `content/fossil-explorer.json` → `halfLifeTable` |
| `SPREADSHEET_ID`, `submitFinalResult()`, 학번/이름 입력 | **삭제** — 뮤즈엑스 상태·포트폴리오·학생관리로 대체 |
| 극실사 프롬프트 (선생님 제공) | `content/fossil-explorer.json` → `realismPrompt`, `ai.prompt` 블록 |

## 10. 저장소 위치 / git / GitHub

- 워크스페이스 경로: `R01-교사(Teacher)/D02-과학수업설계(Science Class Design)/P01-화석AI수업(Fossil AI Lesson)/`
- 이 폴더에서 `git init` (사용자 승인 완료: "저장소 알아서 하시고").
- 원격: GitHub 선생님 계정에 `muse-x-fossil-explorer` (공개). **계정 핸들 확인 필요** (Padlet은 `gmaestro74`).
- 새 폴더마다 미니 CLAUDE.md 생성. 워크스페이스 구조지도 재생성.

## 11. 테스트 계획

- `rarity.js`: 경계값(40/41, 60/61, 78/79, 92/93), `detailScore` 상한 70, `luckRoll` 결정성(같은 입력 → 같은 값).
- `dating-sim`: 5문제 채점, 콤마·단위 입력 정규화, 재방문 시 문제 고정.
- `draw-habitat`: 잠금 후 불변, `summary` 형식.
- 블록 규격: 3블록 모두 `render/complete/missing/summary` 존재, `summary.kind ∈ {table, image, null}`.
- `demo.html`: 목 ctx/state 로 6세션 수동 시연.
- 런타임 의존성 0 — `node --test` 로 실행.

## 12. 역설계 미확인 항목 (구현 중 실물 대조 필수)

1. `blocks.js` 의 정확한 import / factory / registry 위치와 문법 → 실제 파일 확인 후 `blocks-js.merge.json` 확정.
2. 프로그램 파일 자동 발견 여부 — `index.json` 등록만으로 되는지, 별도 라우팅 필요한지.
3. `capture.sketch` value 가 실제로 획(stroke) 수를 노출하는지 → 아니면 좌표 배열 길이로 대체.
4. `ctx.summaryOf(ref)` 및 블록 간 완료 상태 조회의 정확한 API.
5. `quiz` 블록 value 구조(정답 수를 어떻게 읽는지).
6. `deliverable.collect` 에 커스텀 블록 id 추가 시 내보내기(PDF/CSV)의 `summary.kind` 처리 방식.
7. 프로그램 JSON `advance.requires` 스코프(스텝 단위 vs 활동 단위).

→ `docs/REVERSE-ENGINEERING-NOTES.md` 에 확인 결과 기록. 확인 불가 시 총괄자에게 질의.

## 13. Phase 2 메모
- `gallery.wall` — 반 전체 카드 벽(패들렛 대체). `ctx.peers()` 활용.
- 유료 이미지 API 자동 생성 (`ai.generate` 블록) — 비용 사전 고지·동의 후.
- 초등 축소 모드 — 연대 측정을 "화석 vs 현생" 2지선다로.

---

## 부록 A — 재사용 블록 설정 필드 (역설계)

| 블록 | 읽는 필드 |
|---|---|
| `quiz` | `questions[{key,q,choices,answer,why}]`, `label`. 첫 선택 후 잠금, 즉시 채점·해설 |
| `capture.sketch` | `label`, `ratio`, `guide`, `minStrokes`, `meta`. 좌표 0~1 정규화, 제출 시 JPEG |
| `ai.prompt` | `fields[{key,label,placeholder,en}]`, `meta`, `label`, `join`. `assemble()` 공개 |
| `ai.launch` | `tool`, `howto`, `promptRef`, `url`, `returnTo`. 프롬프트 클립보드 복사 + 외부 URL 열기 |
| `ai.collect` | `label`, `accept:['file','url']`, `promptRef`. 이미지 `shrink()` |
| `input.table` | `rows[{key,label,hint,long}]`, `label`, `meta`. `long` 행은 자동 확장 textarea |
| `capture.photo` | `groups[{key,label,min}]`, `label`. 즉시 `shrink()` |
| `compare` | `checks[{key,label}]`, `left/right{label,ref}`, `note{label,hint}`, `label`, `meta` |
| `input.choice` | `options[{key,label}]`, `pick`, `label`, `meta`. 우선순위 정렬 |
| `rubric.self` | `items[{key,label}]`, `scale{max,low,high}`, `label`, `meta` |

## 부록 B — 극실사 프롬프트 본문 (선생님 제공, `realismPrompt`)

```
[내가 복원한 동물에 대한 설명]
(여기에 붙여넣으세요. 서식지를 꼭 입력하세요.)

[역할 및 작업 지시]
당신은 세계 최고의 고생물 복원 전문 아티스트이자 내셔널지오그래픽 야생동물 전문 사진작가입니다.
제가 첨부한 손그림 스케치는 가상의 시공간 환경에 적응하여 진화한 생물의 복원도입니다.
이 스케치의 외형, 형태, 신체 비율, 포즈를 100% 그대로 유지하면서, 현실에 실존하는 생명체처럼
보이는 '극실사 야생동물 다큐멘터리 사진(National Geographic 8K wildlife photograph)'으로
렌더링해주세요.

[생물 및 환경 정보]
1. 원본 모티브 생물/화석: [예: 삼엽충 / 매머드 / 고대 산호 등]
2. 진화하여 살아가는 서식 환경: [예: 툰드라 / 심해 / 열대우림 / 사막 등]
3. 생존 연대 및 주요 적응 특징: [예: 약 5,700년 전 후기 플라이스토세 빙하기 적응 - 두꺼운 흰색
   방한 털과 지방층, 눈보라를 견디는 억센 발톱]

[필수 구현 렌더링 스타일]
- 해부학적 일관성: 첨부된 스케치의 실루엣, 눈·코·입의 위치, 다리/지느러미/껍질의 형태적 특징을
  임의로 왜곡하거나 생략하지 말고 그대로 반영할 것.
- 피부 및 표면 질감: 서식 환경에 맞게 [털/비늘/외골격/점막/가죽] 질감을 모공과 주름, 미세한 잔털
  수준까지 극도로 정밀하게 표현할 것.
- 카메라 및 촬영 구도: Sony α1 풀프레임 카메라와 400mm f/2.8 망원 렌즈로 실제 야생 현장에서
  포착한 듯한 얕은 심도(Out-of-focus background bokeh)와 역동적인 구도.
- 조명 및 색감: 서식지 환경의 자연광(예: 툰드라의 차가운 설원 반사광, 열대우림의 나뭇잎 사이로
  내리쬐는 햇살 틴들 현상 등)을 자연스럽게 투영.
- 사실적인 환경 상호작용: 발 밑의 흙먼지, 물방울, 털에 묻은 서리, 바위의 이끼 등 주변 서식지
  환경과의 상호작용을 극대화할 것.

[절대 금지 사항 (Negative Constraints)]
- 만화, 일러스트, 애니메이션, 3D 카툰, CG 게임 그래픽 느낌 금지.
- 인공적이거나 플라스틱 같은 매끄러운 질감 금지.
- 스케치에 없는 불필요한 날개나 추가 사지를 마음대로 덧붙이지 말 것.
- 텍스트, 워터마크, UI 요소, 카드 프레임 생성 금지. 오직 순수한 야생동물 사진만 출력할 것.
```

## 부록 C — HABITATS (선생님 원본, 11개)

`{ korName, engName, desc, icon }` 형식. 원본 Apps Script 값 그대로 이식:
열대우림🌴 / 사막🏜️ / 툰드라·극지방❄️ / 온대 낙엽활엽수림🍂 / 타이가·침엽수림🌲 /
사바나·열대 초원🦁 / 스텝·온대 초원🌾 / 산악·고산 지대🏔️ / 습지·맹그로브🐊 /
해양·산호초🪸 / 심해🐙

## 부록 D — DATING_PROBLEMS (선생님 원본, 5개)

`{ element, halfLifeText, halfLifeVal, ratioText, parentPercent, halfLifeCount, unit,
correctAnswer, displayAge, era, explanation }` 형식. 원본 값 그대로 이식:
1. ¹⁴C→¹⁴N, 1:1, 50% → 5,700년 전 (신생대 제4기 후기 플라이스토세)
2. ²³⁰Th 계열, 1:1, 50% → 75,000년 전 (신생대 제4기 중기 플라이스토세)
3. ²³⁰Th 계열, 1:3, 25% → 150,000년 전 (신생대 제4기 중기 플라이스토세)
4. ²³⁵U→²⁰⁷Pb, 1:3, 25% → 14억 년 전 (선캄브리아 중원생대 후기)
5. ²³⁸U→²⁰⁶Pb, 1:1, 50% → 45억 년 전 (선캄브리아 명왕누대 지구 형성기)
