import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawHabitat } from '../app/src/draw-habitat-block.js';
import { datingSim } from '../app/src/dating-sim-block.js';
import { cardCollect } from '../app/src/card-collect-block.js';

const handlers = { drawHabitat, datingSim, cardCollect };

test('신규 블록 3종이 render/complete/missing/summary 를 함수로 노출', () => {
  for (const [name, h] of Object.entries(handlers)) {
    for (const fn of ['render', 'complete', 'missing', 'summary']) {
      assert.equal(typeof h[fn], 'function', `${name}.${fn} 가 함수가 아님`);
    }
  }
});

test('summary(block, null) 은 모든 핸들러에서 null', () => {
  assert.equal(drawHabitat.summary({ id: 'd', label: 'x' }, null), null);
  assert.equal(datingSim.summary({ id: 's', label: 'x' }, null), null);
  assert.equal(cardCollect.summary({ id: 'c', label: 'x' }, null), null);
});

test('대표 완료값 → summary().kind ∈ {table, image}', () => {
  const dh = drawHabitat.summary(
    { id: 'd', label: 'x' },
    { habitat: { korName: '심해', engName: '(Deep Ocean)', desc: 'd' }, index: 1, drawnAt: 'x' },
  );
  const ds = datingSim.summary(
    { id: 's', label: 'x' },
    { problem: { element: 'e', ratioText: 'r', displayAge: 'a', era: 'er' }, problemIndex: 0, answer: '1', correct: true, submittedAt: 'x' },
  );
  const cc = cardCollect.summary(
    { id: 'c', label: 'x' },
    { openedAt: 'x', stars: 3, name: '레어', snapshot: { name: '가', image: 'data:img' } },
  );
  assert.equal(dh.kind, 'table');
  assert.equal(ds.kind, 'table');
  assert.equal(cc.kind, 'image');
  for (const k of [dh.kind, ds.kind, cc.kind]) {
    assert.ok(['table', 'image'].includes(k), `예상 밖 kind: ${k}`);
  }
});
