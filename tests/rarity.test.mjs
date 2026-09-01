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
