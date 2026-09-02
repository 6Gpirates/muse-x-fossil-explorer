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

function isoRow(kind, name, desc, count) {
  const row = document.createElement('div');
  row.className = 'fx-iso-row';
  const sw = document.createElement('span');
  sw.className = 'fx-iso-swatch fx-atom-' + kind;
  const txt = document.createElement('div');
  txt.className = 'fx-iso-text';
  const head = document.createElement('div');
  const b = document.createElement('b');
  b.textContent = name;
  const cnt = document.createElement('span');
  cnt.className = 'fx-iso-count';
  cnt.textContent = ' ' + count + '개';
  head.append(b, cnt);
  const d = document.createElement('div');
  d.className = 'fx-iso-desc';
  d.textContent = desc;
  txt.append(head, d);
  row.append(sw, txt);
  return row;
}

function particleGrid(parentPercent) {
  const total = 36;
  const parentCount = Math.round((parentPercent / 100) * total);

  const panel = document.createElement('div');
  panel.className = 'fx-iso-panel';

  const title = document.createElement('p');
  title.className = 'fx-iso-title';
  title.textContent = '화석 속 원소 비율';
  panel.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'fx-atom-grid';
  for (let i = 0; i < total; i++) {
    const a = document.createElement('div');
    a.className = 'fx-atom ' + (i < parentCount ? 'fx-atom-parent' : 'fx-atom-daughter');
    grid.appendChild(a);
  }
  panel.appendChild(grid);

  const legend = document.createElement('div');
  legend.className = 'fx-iso-legend';
  legend.appendChild(isoRow('parent', '모원소', '아직 붕괴하지 않고 남아 있는 원래 원소', parentCount));
  legend.appendChild(isoRow('daughter', '자원소', '모원소가 붕괴하며 새로 생겨난 원소', total - parentCount));
  panel.appendChild(legend);

  return panel;
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

    const form = document.createElement('div');
    form.className = 'fx-sim-form';

    const label = document.createElement('label');
    label.className = 'fx-sim-inputlabel';
    label.textContent = `측정한 연대를 "${p.unit}" 단위의 숫자로 입력하세요`;

    const field = document.createElement('div');
    field.className = 'fx-sim-field';
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.className = 'fx-sim-input';
    input.placeholder = '숫자만';
    input.setAttribute('aria-label', `측정 연대 (${p.unit})`);
    const unitTag = document.createElement('span');
    unitTag.className = 'fx-sim-unit';
    unitTag.textContent = p.unit;
    field.append(input, unitTag);

    const submit = document.createElement('button');
    submit.type = 'button';
    submit.className = 'fx-btn fx-sim-submit';
    submit.textContent = '측정 결과 제출';
    const doSubmit = () => {
      const raw = input.value.trim();
      if (!raw) { input.focus(); return; }
      const correct = gradeAnswer(raw, p.correctAnswer);
      const updatedValue = { ...value, answer: raw, correct, submittedAt: new Date().toISOString() };
      set(block.id, updatedValue);
      ctx.refreshFooter();
      root.innerHTML = '';
      root.appendChild(resultView(p, updatedValue));
    };
    submit.addEventListener('click', doSubmit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSubmit(); });

    form.append(label, field, submit);
    root.append(form);
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
