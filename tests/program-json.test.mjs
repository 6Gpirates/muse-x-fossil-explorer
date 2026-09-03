import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const prog = JSON.parse(await readFile(new URL('../app/programs/p6-fossil-explorer.json', import.meta.url), 'utf8'));

function allBlocks() {
  return prog.sessions.flatMap((s) => s.steps.flatMap((st) => st.blocks));
}

test('세션 7개, 각 세션 no 오름차순', () => {
  assert.equal(prog.sessions.length, 7);
  assert.deepEqual(prog.sessions.map((s) => s.no), [1, 2, 3, 4, 5, 6, 7]);
});

test('세션 6 = AI 분류 분석: taxonomy.ai 블록이 ai-image 를 참조', () => {
  const tax = allBlocks().find((b) => b.type === 'taxonomy.ai');
  assert.ok(tax, 'taxonomy.ai 블록 없음');
  const ids = new Set(allBlocks().filter((b) => b.id).map((b) => b.id));
  assert.ok(ids.has(tax.imageRef), `taxonomy.ai imageRef ${tax.imageRef} 가 블록에 없음`);
  assert.ok(ids.has(tax.nameRef), `taxonomy.ai nameRef ${tax.nameRef} 가 블록에 없음`);
  // 분류 단계는 AI 실사(세션 5) 뒤, 카드(마지막 세션) 앞
  const order = prog.sessions.flatMap((s) => s.steps.flatMap((st) => st.blocks.map((b) => b.type)));
  assert.ok(order.indexOf('taxonomy.ai') > order.indexOf('ai.collect'));
  assert.ok(order.indexOf('taxonomy.ai') < order.indexOf('card.collect'));
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
  if (card.taxonomyRef) assert.ok(ids.has(card.taxonomyRef), `taxonomyRef ${card.taxonomyRef} 없음`);
  for (const sig of card.signals) assert.ok(ids.has(sig.ref), `signal ref ${sig.ref} 없음`);
  assert.equal(card.signals.reduce((s, x) => s + x.weight, 0), 70);
});

test('블록 id 중복 없음', () => {
  const ids = allBlocks().filter((b) => b.id).map((b) => b.id);
  assert.equal(ids.length, new Set(ids).size);
});

test('I1: s5-01 에 고정 극실사 프롬프트 본문(text 블록)이 존재', () => {
  const s501 = prog.sessions.flatMap((s) => s.steps).find((st) => st.id === 's5-01');
  const hit = s501.blocks.some(
    (b) => typeof b.body === 'string'
      && (b.body.includes('극실사') || b.body.includes('National Geographic')),
  );
  assert.ok(hit, 's5-01 에 극실사 프롬프트 본문 text 블록이 없음');
  // 딜리버러블/게이트에 추가하지 않았는지 확인 (text 는 산출물이 아님)
  assert.ok(!prog.deliverable.collect.includes('realism-guide'));
});

test('I2: quiz 블록은 인라인 questions 배열을 갖고 questionsRef 는 없다', () => {
  const quizzes = allBlocks().filter((b) => b.type === 'quiz');
  assert.ok(quizzes.length >= 2);
  for (const q of quizzes) {
    assert.ok(!('questionsRef' in q), `${q.id} 에 questionsRef 잔존`);
    assert.ok(Array.isArray(q.questions) && q.questions.length > 0, `${q.id} questions 비어있음`);
    for (const item of q.questions) {
      assert.ok(Number.isInteger(item.answer), `${q.id} answer 정수 아님`);
      assert.ok(item.answer >= 0 && item.answer < item.choices.length, `${q.id} answer 범위 밖`);
    }
  }
});

test('final-quiz 블록과 card.collect 존재, quizCount 양수', () => {
  const fq = allBlocks().find((b) => b.id === 'final-quiz');
  const card = allBlocks().find((b) => b.type === 'card.collect');
  assert.ok(fq && fq.type === 'quiz');
  assert.ok(card && Number.isInteger(card.quizCount) && card.quizCount > 0);
});
