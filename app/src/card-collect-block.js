import { get, set } from './state.js';
import { computeRarity, clamp01 } from './rarity.js';
import { loadFossilData } from './fossil-data.js';

const MISSING_QUIZ = '퀴즈를 먼저 완료하세요.';
const MISSING_OPEN = '카드를 개봉하세요.';

// 사이드카 블록 값 → 신호 비율 [0,1]. 플랫폼 value 형태가 불확실하므로 방어적으로 처리.
export function signalRatio(kind, raw, full) {
  if (raw == null) return 0;
  switch (kind) {
    case 'strokes': {
      const n = Array.isArray(raw.strokes)
        ? raw.strokes.length
        : (typeof raw.strokeCount === 'number' ? raw.strokeCount : 0);
      return full ? clamp01(n / full) : 0;
    }
    case 'textlen': {
      const s = typeof raw === 'string' ? raw : (raw.text || raw.value || '');
      return full ? clamp01(s.trim().length / full) : 0;
    }
    case 'fields':
    case 'rows': {
      const obj = raw.rows || raw.fields || raw;
      const vals = Object.values(obj).filter((v) => typeof v === 'string');
      if (!vals.length) return 0;
      return vals.filter((v) => v.trim().length > 0).length / vals.length;
    }
    case 'quizscore': {
      if (typeof raw.correct === 'number' && typeof raw.total === 'number' && raw.total > 0) {
        return clamp01(raw.correct / raw.total);
      }
      const ans = raw.answers || raw;
      return ans && Object.keys(ans).length ? 0.6 : 0; // 점수 못 읽으면 응답만으로 0.6
    }
    default:
      return 0;
  }
}

export function quizPassed(quizValue, expectedCount) {
  if (!quizValue) return false;
  const ans = quizValue.answers || quizValue;
  if (!ans) return false;
  const count = Object.keys(ans).length;
  if (typeof expectedCount === 'number' && expectedCount > 0) {
    return count >= expectedCount;
  }
  return count > 0;
}

function readRef(ctx, ref) {
  // 우선 ctx.getValue(ref), 없으면 상태 저장소에서 직접 (state 키 == 블록 id 가정)
  if (typeof ctx.getValue === 'function') {
    const v = ctx.getValue(ref);
    if (v != null) return v;
  }
  return get(ref);
}

function starString(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

export const cardCollect = {
  async render(block, ctx) {
    const root = document.createElement('div');
    root.className = 'fx-card-collect';
    const value = get(block.id);

    if (value && value.openedAt) {
      root.appendChild(await this._renderCard(block, value));
      return root;
    }

    const quizValue = readRef(ctx, block.quizRef);
    if (!quizPassed(quizValue, block.quizCount)) {
      const lock = document.createElement('p');
      lock.className = 'fx-card-lock';
      lock.textContent = MISSING_QUIZ;
      root.appendChild(lock);
      return root;
    }

    const hint = document.createElement('p');
    hint.className = 'fx-card-hint';
    hint.textContent = '생물을 더 정성껏 다듬을수록 높은 등급이 나옵니다.';

    const back = document.createElement('div');
    back.className = 'fx-card-back';
    back.textContent = '?';

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'fx-btn fx-btn-open';
    open.textContent = '카드 개봉';
    open.addEventListener('click', async () => {
      open.disabled = true;
      const opened = await this._open(block, ctx);
      root.innerHTML = '';
      const card = await this._renderCard(block, opened);
      card.classList.add('fx-reveal');
      root.appendChild(card);
      ctx.refreshFooter();
    });

    root.append(hint, back, open);
    return root;
  },

  async _open(block, ctx) {
    const data = await loadFossilData();
    const rar = data[block.rarityRef || 'rarity'];
    const sigs = block.signals || [];
    const parts = sigs.map((sig) => ({
      weight: sig.weight,
      ratio: signalRatio(sig.kind, readRef(ctx, sig.ref), sig.full),
    }));
    // TODO(Plan 2): confirm which ctx field carries per-student/group identity on the real MuseX platform
    const who = ctx.studentKey ?? ctx.student?.id ?? ctx.groupKey ?? block.luckKeyPrefix ?? 'anon';
    const luckKey = who + '::' + block.id;
    const result = computeRarity({ parts, luckKey, luckWeight: rar.luckWeight, tiers: rar.tiers });

    const info = readRef(ctx, block.infoRef) || {};
    const infoRows = info.rows || info.fields || info;
    const image = readRef(ctx, block.imageRef);
    const snapshot = {
      name: infoRows['이름'] || infoRows.name || '이름 없음',
      type: infoRows['타입'] || infoRows.type || '',
      habitat: infoRows['서식지'] || infoRows.habitat || '',
      ability: infoRows['특수 능력'] || infoRows.ability || '',
      weakness: infoRows['약점'] || infoRows.weakness || '',
      image: (image && (image.url || image.dataURL || image)) || '',
    };

    const value = {
      rarity: result.class, stars: result.stars, name: result.name, class: result.class,
      detailScore: result.detailScore, luckRoll: result.luckRoll, total: result.total,
      openedAt: new Date().toISOString(), snapshot,
    };
    set(block.id, value);
    return value;
  },

  async _renderCard(block, value) {
    const s = value.snapshot;
    const card = document.createElement('div');
    card.className = `fx-card ${value.class}`;

    const foil = document.createElement('div');
    foil.className = 'fx-card-foil';
    card.appendChild(foil);

    const starsDiv = document.createElement('div');
    starsDiv.className = 'fx-card-stars';
    starsDiv.textContent = starString(value.stars) + ' ';
    const raritySpan = document.createElement('span');
    raritySpan.textContent = value.name;
    starsDiv.appendChild(raritySpan);
    card.appendChild(starsDiv);

    const imgDiv = document.createElement('div');
    imgDiv.className = 'fx-card-img';
    if (s.image) {
      const img = document.createElement('img');
      img.src = s.image;
      img.alt = s.name;
      imgDiv.appendChild(img);
    }
    card.appendChild(imgDiv);

    const nameDiv = document.createElement('div');
    nameDiv.className = 'fx-card-name';
    nameDiv.textContent = s.name;
    card.appendChild(nameDiv);

    const metaDiv = document.createElement('div');
    metaDiv.className = 'fx-card-meta';
    const typeSpan = document.createElement('span');
    typeSpan.textContent = '타입 ' + s.type;
    metaDiv.appendChild(typeSpan);
    const habitatSpan = document.createElement('span');
    habitatSpan.textContent = '서식지 ' + s.habitat;
    metaDiv.appendChild(habitatSpan);
    card.appendChild(metaDiv);

    const abilityDiv = document.createElement('div');
    abilityDiv.className = 'fx-card-ability';
    const abilityBold = document.createElement('b');
    abilityBold.textContent = '특수 능력';
    abilityDiv.appendChild(abilityBold);
    abilityDiv.appendChild(document.createTextNode(' ' + s.ability));
    card.appendChild(abilityDiv);

    const weakDiv = document.createElement('div');
    weakDiv.className = 'fx-card-weak';
    const weakBold = document.createElement('b');
    weakBold.textContent = '약점';
    weakDiv.appendChild(weakBold);
    weakDiv.appendChild(document.createTextNode(' ' + s.weakness));
    card.appendChild(weakDiv);

    return card;
  },

  complete(block, value) {
    return !!value && !!value.openedAt;
  },

  missing(block, value, ctx) {
    if (value && value.openedAt) return '';
    const quizValue = readRef(ctx, block.quizRef);
    return quizPassed(quizValue, block.quizCount) ? MISSING_OPEN : MISSING_QUIZ;
  },

  summary(block, value) {
    if (!this.complete(block, value)) return null;
    const s = value.snapshot || {};
    return {
      kind: 'image',
      label: block.label,
      src: s.image,
      caption: `${s.name} · ${value.stars}★ ${value.name}`,
    };
  },
};
