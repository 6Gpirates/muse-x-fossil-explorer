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
