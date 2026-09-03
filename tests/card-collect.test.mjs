import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cardCollect, signalRatio, quizPassed, taxonomyLine } from '../app/src/card-collect-block.js';
import { computeRarity } from '../app/src/rarity.js';
import { makeCtx } from './helpers/mock-ctx.mjs';

const CONTENT = JSON.parse(
  await readFile(new URL('../app/content/fossil-explorer.json', import.meta.url), 'utf8'),
);
// loadFossilData 는 fetch 로 콘텐츠를 읽는다 (Node 에서 file: fetch 불가) → 스텁.
globalThis.fetch = async () => ({ ok: true, json: async () => CONTENT });

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

test('quizPassed: 응답이 하나라도 있으면 통과 (expectedCount 없음)', () => {
  assert.equal(quizPassed(null), false);
  assert.equal(quizPassed({ answers: {} }), false);
  assert.equal(quizPassed({ answers: { f1: 2 } }), true);
});

test('quizPassed: expectedCount 지정 시 모든 질문 응답 확인', () => {
  const answers2of3 = { answers: { f1: 0, f2: 1 } };
  const answers3of3 = { answers: { f1: 0, f2: 1, f3: 2 } };
  assert.equal(quizPassed(answers2of3, 3), false); // 2개 < 3개
  assert.equal(quizPassed(answers2of3, 2), true);  // 2개 >= 2개
  assert.equal(quizPassed(answers3of3, 3), true);  // 3개 >= 3개
  assert.equal(quizPassed(answers3of3, 2), true);  // 3개 >= 2개
  assert.equal(quizPassed(null, 1), false);        // null은 항상 false
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

test('summary: 미완료면 null (M2 스냅샷 가드 포함)', () => {
  assert.equal(cardCollect.summary({ id: 'c' }, null), null);
  // snapshot 이 없어도 터지지 않는다
  const s = cardCollect.summary({ id: 'c', label: 'x' }, { openedAt: 'x', stars: 2, name: '노멀' });
  assert.equal(s.kind, 'image');
});

test('C1: 행운 굴림이 who(학생/그룹 식별자)에 따라 달라진다 — 상수가 아니다', () => {
  const { tiers, luckWeight } = CONTENT.rarity;
  // _open 의 키 구성(who + "::" + block.id)을 그대로 흉내
  const rollFor = (who, id) =>
    computeRarity({ parts: [], luckKey: who + '::' + id, luckWeight, tiers }).luckRoll;
  const sampleKeys = ['card-collect', 'card', 'grp-1', 'grp-2', 'stu-42'];
  const differs = sampleKeys.some((id) => rollFor('a', id) !== rollFor('b', id));
  assert.ok(differs, 'who 가 바뀌어도 모든 표본에서 luckRoll 이 동일 → 가챠 무작위성 없음');
});

test('_open: 형제 블록 값으로 카드 값 산출 (I4)', async () => {
  const block = {
    id: 'card-collect', rarityRef: 'rarity',
    imageRef: 'ai-image', infoRef: 'card-info', quizRef: 'final-quiz',
    signals: [
      { ref: 'sketch', kind: 'strokes', weight: 20, full: 36 },
      { ref: 'bio-intro', kind: 'textlen', weight: 15, full: 120 },
      { ref: 'card-info', kind: 'fields', weight: 15 },
      { ref: 'common-traits', kind: 'rows', weight: 10 },
      { ref: 'final-quiz', kind: 'quizscore', weight: 10 },
    ],
  };
  const values = {
    sketch: { strokes: new Array(30).fill([0, 0]) },
    'bio-intro': { text: 'x'.repeat(120) },
    'card-info': { rows: { 이름: '가', 타입: '물', 서식지: '심해', '특수 능력': 'a', 약점: 'b' } },
    'common-traits': { rows: { a: 'x', b: 'y', c: 'z', d: 'w', e: 'v' } },
    'final-quiz': { correct: 5, total: 5 },
    'ai-image': { url: 'data:img' },
  };
  const ctx = makeCtx({ getValue: (ref) => values[ref] ?? null });
  const v = await cardCollect._open(block, ctx);
  assert.ok(v.openedAt);
  assert.ok(v.stars >= 1 && v.stars <= 5);
  assert.ok(v.detailScore >= 0 && v.detailScore <= 70);
  assert.ok(v.total <= 100);
  assert.equal(v.snapshot.name, '가');
});

test('taxonomyLine: 계~과의 한국어명만 › 로 잇는다', () => {
  const ranks = {
    kingdom: '동물계 Animalia', phylum: '척삭동물문 Chordata', class: '포유강 Mammalia',
    order: '장비목 Proboscidea', family: '매머드과 Elephantidae',
    genus: 'Coelodonta', species: 'Coelodonta nivalis',
  };
  assert.equal(taxonomyLine(ranks), '동물계 › 척삭동물문 › 포유강 › 장비목 › 매머드과');
  assert.equal(taxonomyLine(null), '');
  assert.equal(taxonomyLine({}), '');
});

test('_open: taxonomyRef 있으면 snapshot 에 학명·분류 한 줄이 실린다', async () => {
  const block = {
    id: 'card-collect', rarityRef: 'rarity',
    imageRef: 'ai-image', infoRef: 'card-info', quizRef: 'final-quiz', taxonomyRef: 'taxonomy',
    signals: [{ ref: 'card-info', kind: 'fields', weight: 10 }],
  };
  const values = {
    'card-info': { rows: { 이름: '눈털코뿔소' } },
    'ai-image': { url: 'data:img' },
    taxonomy: {
      scientificName: 'Coelodonta nivalis',
      taxonomy: { kingdom: '동물계 Animalia', phylum: '척삭동물문 Chordata', class: '포유강 Mammalia', order: '기제목 Perissodactyla', family: '코뿔소과 Rhinocerotidae' },
    },
  };
  const ctx = makeCtx({ getValue: (ref) => values[ref] ?? null });
  const v = await cardCollect._open(block, ctx);
  assert.equal(v.snapshot.scientificName, 'Coelodonta nivalis');
  assert.equal(v.snapshot.taxonomyLine, '동물계 › 척삭동물문 › 포유강 › 기제목 › 코뿔소과');
});

test('_open: taxonomyRef 없으면 학명·분류는 빈 문자열', async () => {
  const block = {
    id: 'card-collect', rarityRef: 'rarity',
    imageRef: 'ai-image', infoRef: 'card-info', quizRef: 'final-quiz',
    signals: [{ ref: 'card-info', kind: 'fields', weight: 10 }],
  };
  const ctx = makeCtx({ getValue: (ref) => ({ 'card-info': { rows: { 이름: '가' } }, 'ai-image': { url: 'd' } }[ref] ?? null) });
  const v = await cardCollect._open(block, ctx);
  assert.equal(v.snapshot.scientificName, '');
  assert.equal(v.snapshot.taxonomyLine, '');
});
