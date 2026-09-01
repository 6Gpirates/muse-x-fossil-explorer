import { drawHabitat } from './draw-habitat-block.js';
import { datingSim } from './dating-sim-block.js';
import { cardCollect } from './card-collect-block.js';
import { get, set } from './state.js';
import { loadFossilData } from './fossil-data.js';

// 재사용 블록(플랫폼 제공)은 데모에서 간단 스텁으로 대체
function stubInput(block) {
  const wrap = document.createElement('div');
  const ta = document.createElement('textarea');
  ta.rows = 2; ta.style.width = '100%';
  ta.value = (get(block.id) && get(block.id).text) || '';
  ta.addEventListener('input', () => set(block.id, { text: ta.value }));
  wrap.append(ta);
  return wrap;
}
function stubSketch(block) {
  const wrap = document.createElement('div');
  const btn = document.createElement('button');
  btn.className = 'fx-btn'; btn.textContent = '가짜 획 10개 추가';
  btn.onclick = () => {
    const v = get(block.id) || { strokes: [] };
    v.strokes.push(...new Array(10).fill([0, 0]));
    set(block.id, v);
    btn.textContent = `획 ${v.strokes.length}개`;
  };
  wrap.append(btn);
  return wrap;
}
function stubQuiz(block, data) {
  const wrap = document.createElement('div');
  const qs = data.finalQuiz;
  const v = get(block.id) || { answers: {}, correct: 0, total: qs.length };
  qs.forEach((q) => {
    const b = document.createElement('button');
    b.className = 'fx-btn'; b.style.margin = '2px';
    b.textContent = q.q.slice(0, 12) + '… → 정답 찍기';
    b.onclick = () => {
      v.answers[q.key] = q.answer;
      v.correct = Object.entries(v.answers).filter(([k, a]) => qs.find((x) => x.key === k).answer === a).length;
      set(block.id, v);
      b.textContent = '✓ ' + b.textContent;
    };
    wrap.append(b);
  });
  return wrap;
}

const ctx = {
  refreshFooter: () => renderAll(),
  getValue: (ref) => get(ref),
  assembledPrompt: () => '',
  summaryOf: () => null,
  peers: () => [], publishPeer() {}, onTeardown() {}, checklist: () => [],
};

// 데모용 6세션 블록 목록 (프로그램 JSON과 동일한 id 사용)
const STEPS = [
  { id: 'bio-intro', kind: 'stub-input', label: '생물 이름·소개' },
  { id: 'sketch', kind: 'stub-sketch', label: '손그림' },
  { id: 'card-info', kind: 'stub-input', label: '카드 정보(이름 등)' },
  { id: 'common-traits', kind: 'stub-input', label: '공통 속성표' },
  { id: 'draw-habitat', kind: 'draw', label: '서식 환경 뽑기', poolRef: 'habitats' },
  { id: 'dating-sim', kind: 'dating', label: '방사성 연대 측정', problemsRef: 'datingProblems', tableRef: 'halfLifeTable' },
  { id: 'final-quiz', kind: 'stub-quiz', label: '종합 퀴즈' },
  {
    id: 'card-collect', kind: 'card', label: '생물 카드 개봉',
    imageRef: 'ai-image', infoRef: 'card-info', quizRef: 'final-quiz', rarityRef: 'rarity',
    signals: [
      { ref: 'sketch', kind: 'strokes', weight: 20, full: 36 },
      { ref: 'bio-intro', kind: 'textlen', weight: 15, full: 120 },
      { ref: 'card-info', kind: 'fields', weight: 15 },
      { ref: 'common-traits', kind: 'rows', weight: 10 },
      { ref: 'final-quiz', kind: 'quizscore', weight: 10 },
    ],
  },
];

let DATA;
const mount = document.getElementById('mount');

async function renderAll() {
  DATA = DATA || (await loadFossilData());
  // ai-image 가짜 값 하나 넣어두기(업로드 블록 대체)
  if (!get('ai-image')) set('ai-image', { url: 'https://placehold.co/400x300?text=AI+image' });
  mount.innerHTML = '';
  for (const step of STEPS) {
    const box = document.createElement('div');
    box.className = 'demo-step';
    const h = document.createElement('h2');
    h.textContent = step.label;
    box.append(h);

    let body;
    if (step.kind === 'draw') body = drawHabitat.render(step, ctx);
    else if (step.kind === 'dating') body = await datingSim.render(step, ctx);
    else if (step.kind === 'card') body = await cardCollect.render(step, ctx);
    else if (step.kind === 'stub-input') body = stubInput(step);
    else if (step.kind === 'stub-sketch') body = stubSketch(step);
    else if (step.kind === 'stub-quiz') body = stubQuiz(step, DATA);
    box.append(body);

    // 핸들러 블록은 미완료 사유 + 요약 표시
    const handler = { draw: drawHabitat, dating: datingSim, card: cardCollect }[step.kind];
    if (handler) {
      const value = get(step.id);
      if (!handler.complete(step, value, ctx)) {
        const m = document.createElement('div');
        m.className = 'demo-missing';
        m.textContent = '미완료: ' + handler.missing(step, value, ctx);
        box.append(m);
      } else {
        const sm = document.createElement('div');
        sm.className = 'demo-summary';
        sm.textContent = JSON.stringify(handler.summary(step, value, ctx), null, 2);
        box.append(sm);
      }
    }
    mount.append(box);
  }
}

renderAll();
