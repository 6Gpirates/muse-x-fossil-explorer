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

test('card.collect 의 quizCount 가 콘텐츠 finalQuiz 길이와 일치', async () => {
  const content = JSON.parse(
    await readFile(new URL('../app/content/fossil-explorer.json', import.meta.url), 'utf8'),
  );
  const card = allBlocks().find((b) => b.type === 'card.collect');
  assert.equal(card.quizCount, content.finalQuiz.length);
});
