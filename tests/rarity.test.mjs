import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fnv1a, seededUnit, luckRoll, detailScore, pickTier, computeRarity } from '../app/src/rarity.js';

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
