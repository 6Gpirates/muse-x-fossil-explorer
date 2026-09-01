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

test('datingProblems: 정답 = 반감기값 × 반감기횟수, 모원소%↔반감기횟수 (I4)', () => {
  for (const p of data.datingProblems) {
    assert.equal(p.correctAnswer, p.halfLifeVal * p.halfLifeCount,
      `${p.element}: correctAnswer 불일치`);
    assert.equal(p.parentPercent === 50, p.halfLifeCount === 1,
      `${p.element}: 50% ⟺ 반감기 1회`);
    assert.equal(p.parentPercent === 25, p.halfLifeCount === 2,
      `${p.element}: 25% ⟺ 반감기 2회`);
  }
});

test('realismPrompt 존재', () => {
  assert.ok(typeof data.realismPrompt === 'string' && data.realismPrompt.length > 200);
});
