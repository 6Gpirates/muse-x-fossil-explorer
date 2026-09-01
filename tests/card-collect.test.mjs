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
