import { get, set } from './state.js';
import { loadFossilData } from './fossil-data.js';

const MISSING = '연대 측정값을 아직 제출하지 않았습니다.';

/** 입력 문자열을 숫자로 정규화해 정답과 비교 */
export function gradeAnswer(raw, correctAnswer) {
  if (raw == null) return false;
  const cleaned = String(raw).replace(/[^0-9.]/g, '');
  if (cleaned === '') return false;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n === correctAnswer;
}

async function resolveProblems(block) {
  if (Array.isArray(block.problems)) return block.problems;
  const data = await loadFossilData();
  return data[block.problemsRef || 'datingProblems'];
}

function particleGrid(parentPercent) {
  const total = 36;
  const parentCount = Math.round((parentPercent / 100) * total);
  const wrap = document.createElement('div');
  wrap.className = 'fx-atom-grid';
  for (let i = 0; i < total; i++) {
    const a = document.createElement('div');
    a.className = 'fx-atom ' + (i < parentCount ? 'fx-atom-parent' : 'fx-atom-daughter');
    wrap.appendChild(a);
  }
  const label = document.createElement('div');
  label.className = 'fx-atom-legend';
  label.textContent = `모원소 ${parentCount}개 · 자원소 ${total - parentCount}개`;
  const box = document.createElement('div');
  box.append(label, wrap);
  return box;
}

function refTable(rows) {
  const t = document.createElement('table');
  t.className = 'fx-halflife-table';
  const caption = document.createElement('caption');
  caption.textContent = '반감기 참고 표';
  t.appendChild(caption);
  for (const r of rows) {
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    td1.textContent = r.label;
    const td2 = document.createElement('td');
    td2.textContent = r.value;
    tr.append(td1, td2);
    t.appendChild(tr);
  }
  return t;
}

function labelled(labelText, valueText) {
  const p = document.createElement('p');
  const b = document.createElement('b');
  b.textContent = labelText;
  p.append(b, document.createTextNode(' ' + valueText));
  return p;
}

function resultView(problem, value) {
  const done = document.createElement('div');
  done.className = 'fx-sim-result ' + (value.correct ? 'is-correct' : 'is-wrong');

  const verdict = document.createElement('p');
  verdict.textContent = value.correct ? '정답입니다!' : '아쉽게도 오답입니다.';

  const explain = document.createElement('p');
  explain.className = 'fx-sim-explain';
  explain.textContent = problem.explanation;

  done.append(
    verdict,
    labelled('측정 연대:', problem.displayAge),
    labelled('지질 시대:', problem.era),
    explain,
  );
  return done;
}

export const datingSim = {
  async render(block, ctx) {
    const root = document.createElement('div');
    root.className = 'fx-dating-sim';
    const data = await loadFossilData();
    const problems = await resolveProblems(block);

    let value = get(block.id);
    if (!value) {
      const problemIndex = Math.floor(Math.random() * problems.length);
      value = { problem: problems[problemIndex], problemIndex };
      set(block.id, value); // 재방문 시 동일 문제
    }
    const p = value.problem;

    root.appendChild(particleGrid(p.parentPercent));
    root.appendChild(refTable(data[block.tableRef || 'halfLifeTable']));

    const elName = document.createElement('h4');
    elName.className = 'fx-sim-element';
    elName.textContent = p.element;
    root.appendChild(elName);

    if (value.answer !== undefined) {
      root.appendChild(resultView(p, value));
      return root;
    }

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'fx-sim-input';
    input.placeholder = `숫자만 입력 (단위: ${p.unit})`;

    const submit = document.createElement('button');
    submit.type = 'button';
    submit.className = 'fx-btn';
    submit.textContent = '측정 결과 제출';
    submit.addEventListener('click', () => {
      const raw = input.value.trim();
      if (!raw) { input.focus(); return; }
      const correct = gradeAnswer(raw, p.correctAnswer);
      const updatedValue = { ...value, answer: raw, correct, submittedAt: new Date().toISOString() };
      set(block.id, updatedValue);
      ctx.refreshFooter();
      root.innerHTML = '';
      root.appendChild(resultView(p, updatedValue));
    });

    root.append(input, submit);
    return root;
  },

  complete(block, value) {
    return !!value && value.answer !== undefined;
  },

  missing() {
    return MISSING;
  },

  summary(block, value) {
    if (!this.complete(block, value)) return null;
    const p = value.problem;
    return {
      kind: 'table',
      label: block.label,
      rows: [
        ['분석 원소', p.element],
        ['모:자 비', p.ratioText],
        ['측정 연대(정답)', p.displayAge],
        ['지질 시대', p.era],
        ['학생 답', `${value.answer} (${value.correct ? '정답' : '오답'})`],
      ],
    };
  },
};
