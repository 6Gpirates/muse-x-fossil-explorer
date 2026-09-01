import { get, set } from './state.js';
import { loadFossilData } from './fossil-data.js';

const MISSING = '서식 환경을 아직 뽑지 않았습니다.';

async function resolvePool(block) {
  if (Array.isArray(block.pool)) return block.pool;
  const data = await loadFossilData();
  return data[block.poolRef || 'habitats'];
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function resultCard(h) {
  const card = document.createElement('div');
  card.className = 'fx-habitat-card';
  card.append(
    el('div', 'fx-habitat-icon', h.icon),
    el('div', 'fx-habitat-tag', 'Assigned Habitat'),
    el('h3', 'fx-habitat-name', h.korName),
    el('div', 'fx-habitat-eng', h.engName),
    el('p', 'fx-habitat-desc', h.desc),
  );
  return card;
}

export const drawHabitat = {
  render(block, ctx) {
    const root = document.createElement('div');
    root.className = 'fx-draw-habitat';
    const existing = get(block.id);

    if (existing && existing.habitat) {
      root.appendChild(resultCard(existing.habitat));
      return root;
    }

    const machine = document.createElement('div');
    machine.className = 'fx-gacha-machine';
    machine.textContent = '🎰';

    const status = document.createElement('div');
    status.className = 'fx-gacha-status';
    status.textContent = '서식 환경을 뽑을 준비가 되었습니다!';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fx-btn fx-btn-draw';
    btn.textContent = '서식 환경 뽑기!';

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      machine.classList.add('fx-shake');
      status.textContent = '머신이 차원을 탐색 중입니다...';
      const pool = await resolvePool(block);
      const index = Math.floor(Math.random() * pool.length);
      const habitat = pool[index];
      await new Promise((r) => setTimeout(r, 1500)); // 셔플 연출
      set(block.id, { habitat, index, drawnAt: new Date().toISOString() });
      root.innerHTML = '';
      const card = resultCard(habitat);
      card.classList.add('fx-reveal');
      root.appendChild(card);
      ctx.refreshFooter();
    });

    root.append(machine, status, btn);
    return root;
  },

  complete(block, value) {
    return !!value && !!value.habitat && typeof value.index === 'number';
  },

  missing() {
    return MISSING;
  },

  summary(block, value) {
    if (!this.complete(block, value)) return null;
    const h = value.habitat;
    return {
      kind: 'table',
      label: block.label,
      rows: [
        ['뽑힌 서식 환경', `${h.korName} ${h.engName}`],
        ['환경 설명', h.desc],
      ],
    };
  },
};
