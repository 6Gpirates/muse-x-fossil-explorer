import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { datingSim, gradeAnswer } from '../app/src/dating-sim-block.js';
import { makeCtx } from './helpers/mock-ctx.mjs';

const CONTENT = JSON.parse(
  await readFile(new URL('../app/content/fossil-explorer.json', import.meta.url), 'utf8'),
);

const P = {
  element: '탄소-14 (¹⁴C) → 질소-14 (¹⁴N)', ratioText: '1 : 1 (모원소 50% 잔여)',
  parentPercent: 50, unit: '년', correctAnswer: 5700, displayAge: '약 5,700년 전',
  era: '신생대 제4기 (후기 플라이스토세)', explanation: '…',
};
const block = { id: 'dating-sim', label: '방사성 연대 측정', problemsRef: 'datingProblems' };
const ctx = makeCtx();

test('gradeAnswer: 실제 5문제 전부 정답/콤마형/오답 채점 (I4)', () => {
  assert.equal(CONTENT.datingProblems.length, 5);
  for (const p of CONTENT.datingProblems) {
    assert.equal(gradeAnswer(String(p.correctAnswer), p.correctAnswer), true);
    assert.equal(gradeAnswer(p.correctAnswer.toLocaleString('en-US'), p.correctAnswer), true);
    assert.equal(gradeAnswer(String(p.correctAnswer + 1), p.correctAnswer), false);
  }
});

test('gradeAnswer: 콤마·공백·단위 텍스트 허용', () => {
  assert.equal(gradeAnswer('5700', 5700), true);
  assert.equal(gradeAnswer('5,700', 5700), true);
  assert.equal(gradeAnswer(' 5700 년 ', 5700), true);
  assert.equal(gradeAnswer('5800', 5700), false);
  assert.equal(gradeAnswer('', 5700), false);
  assert.equal(gradeAnswer('abc', 5700), false);
  assert.equal(gradeAnswer('14', 14), true); // 억 년 문제
});

test('complete: answer 제출되면 true (오답도 완료)', () => {
  assert.equal(datingSim.complete(block, null, ctx), false);
  assert.equal(datingSim.complete(block, { problem: P, problemIndex: 0, answer: '9999', correct: false, submittedAt: 'x' }, ctx), true);
});

test('missing: 스펙 문구', () => {
  assert.equal(datingSim.missing(block, null, ctx), '연대 측정값을 아직 제출하지 않았습니다.');
});

test('summary: table, 원소·비·정답연대·시대·학생답(정오)', () => {
  const s = datingSim.summary(block, { problem: P, problemIndex: 0, answer: '5700', correct: true, submittedAt: 'x' }, ctx);
  assert.equal(s.kind, 'table');
  const flat = Object.fromEntries(s.rows);
  assert.equal(flat['분석 원소'], P.element);
  assert.equal(flat['측정 연대(정답)'], P.displayAge);
  assert.equal(flat['지질 시대'], P.era);
  assert.equal(flat['학생 답'], '5700 (정답)');
});
