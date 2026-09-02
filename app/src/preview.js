/* app/src/preview.js
   "화석으로 알아보는 생물 탐구" 검토용 시안.
   프로그램 정의(p6-fossil-explorer.json)를 읽어 6세션 수업 전체를 한 페이지로 펼친다.
   - 신규 블록 3종(draw.habitat / dating.sim / card.collect)은 실제 핸들러로 동작.
   - 플랫폼 담당 블록(사진·글·표·퀴즈·AI)은 "이렇게 생겼다"가 보이는 시안용 목업.
   검토용이므로 라우팅·저장·인증은 없다. */

import { drawHabitat } from './draw-habitat-block.js';
import { datingSim } from './dating-sim-block.js';
import { cardCollect } from './card-collect-block.js';
import { get, set, _clear } from './state.js';
import { loadFossilData } from './fossil-data.js';

const CUSTOM = {
  'draw.habitat': drawHabitat,
  'dating.sim': datingSim,
  'card.collect': cardCollect,
};

function placeholderImg(labelText, bg, fg) {
  return 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">`
    + `<rect width="400" height="300" fill="${bg}"/>`
    + `<text x="200" y="150" font-family="sans-serif" font-size="20" fill="${fg}" `
    + `text-anchor="middle" dominant-baseline="middle">${labelText}</text></svg>`,
  );
}
const PLACEHOLDER_IMG = placeholderImg('AI 실사 이미지 (예시)', '#334155', '#e2e8f0');
const PLACEHOLDER_PHOTO = placeholderImg('화석 사진 (예시)', '#57534e', '#f5f5f4');
const PLACEHOLDER_SKETCH = placeholderImg('학생 손그림 (예시)', '#f5f5f4', '#78716c');

/* ── 가상 동급생 5명 (공유의 장·친구 카드·도감북용) ──────────
   실제 여러 기기 동기화가 아니라, 혼자서도 협업 기능을 체험하도록 미리 만든 학생들. */
const TIER_CLASS = ['rar-normal', 'rar-uncommon', 'rar-rare', 'rar-superrare', 'rar-legendary'];
const TIER_NAME = ['노멀', '언커먼', '레어', '슈퍼레어', '레전더리'];

const SAMPLE_PEERS = [
  {
    id: 'p1', name: '김하늘', habitat: '심해', color: '#0b2447',
    creatureName: '빛등아귀', stars: 4, envGrade: 5,
    creatureDesc: '빛이 닿지 않는 심해에 사는 육식 어류. 등에 달린 발광 돌기로 먹이를 유인하고, 젤리 같은 몸으로 높은 수압을 견딘다. 거의 움직이지 않고 매복해 에너지를 아끼며, 큰 입으로 자기 몸집만 한 먹이도 삼킨다.',
    cardInfo: { type: '어둠', habitat: '심해', ability: '발광 유인', weakness: '수면의 빛' },
    traits: { body: '젤리질 몸·큰 입', food: '매복 사냥', move: '거의 정지, 지느러미 미세 조절', temp: '저수온에 적응한 대사', repro: '알을 물기둥에 띄워 산란' },
  },
  {
    id: 'p2', name: '박도윤', habitat: '사막', color: '#7c4a13',
    creatureName: '모래숨거북', stars: 3, envGrade: 3,
    creatureDesc: '한낮의 열기를 피해 모래 속에 몸을 묻고, 밤에 나와 이슬과 다육식물을 먹는다. 두꺼운 등딱지와 각질 피부로 수분 손실을 막고, 오줌을 거의 누지 않아 물을 아낀다.',
    cardInfo: { type: '땅', habitat: '사막', ability: '모래 잠복', weakness: '장마' },
    traits: { body: '두꺼운 등딱지·각질 피부', food: '다육식물·이슬', move: '느린 보행, 모래 파기', temp: '낮에 굴속, 밤에 활동', repro: '모래에 알을 묻어 부화' },
  },
  {
    id: 'p3', name: '이서아', habitat: '열대우림', color: '#14532d',
    creatureName: '잎무늬표범', stars: 5, envGrade: 5,
    creatureDesc: '나무 위에서 대부분을 보내는 육식동물. 잎맥 무늬 털로 완벽하게 위장하고, 긴 꼬리로 균형을 잡으며 가지 사이를 도약한다. 습한 더위에 적응해 얇은 털과 넓은 발바닥을 가졌다.',
    cardInfo: { type: '풀', habitat: '열대우림', ability: '잎 위장', weakness: '건기' },
    traits: { body: '잎맥 무늬 털·긴 꼬리', food: '나무 위 소형 포유류', move: '가지 도약·활공', temp: '얇은 털로 발열 억제', repro: '나무 구멍에 새끼를 숨김' },
  },
  {
    id: 'p4', name: '최지호', habitat: '툰드라 / 극지방', color: '#1e3a5f',
    creatureName: '흰털뿔사슴', stars: 2, envGrade: 2,
    creatureDesc: '두꺼운 흰 털과 지방층으로 눈보라를 견디는 초식동물. 넓은 발굽으로 눈 위를 걷고, 뿔로 눈을 파헤쳐 이끼를 먹는다.',
    cardInfo: { type: '얼음', habitat: '툰드라', ability: '방한', weakness: '해빙기' },
    traits: { body: '흰 겉털·두꺼운 지방', food: '이끼·지의류', move: '넓은 발굽 보행', temp: '털·지방 단열', repro: '봄 출산, 무리 보호' },
  },
  {
    id: 'p5', name: '정하은', habitat: '습지 / 맹그로브', color: '#3f3d1e',
    creatureName: '진흙물떼새악어', stars: 3, envGrade: 4,
    creatureDesc: '담수와 해수가 섞이는 갯벌에 산다. 넓적한 부리로 진흙 속 게와 조개를 파먹고, 물갈퀴 발로 진창을 걷는다. 콧구멍이 머리 위에 있어 몸을 숨긴 채 숨을 쉰다.',
    cardInfo: { type: '물', habitat: '맹그로브 습지', ability: '진흙 잠복', weakness: '갯벌 매립' },
    traits: { body: '넓적 부리·물갈퀴 발', food: '게·조개', move: '진창 보행·짧은 수영', temp: '갯벌 그늘 이용', repro: '갈대밭에 둥지' },
  },
];

function peerCardImg(p) {
  return placeholderImg(p.creatureName, p.color, '#ffffff');
}

// 나 + 동급생 5명. "나"는 현재 진행 상태에서 계산.
function myStars() {
  const c = get('card-collect');
  return c && typeof c.stars === 'number' ? c.stars : null;
}
function myProgressFrac() {
  const total = stepList().length;
  let done = 0;
  for (const { step } of stepList()) {
    const req = (step.advance && step.advance.requires) || [];
    if (req.length && req.every((id) => blockDone(id))) done += 1;
    else if (!req.length) done += 1;
  }
  return total ? done / total : 0;
}
function myProfile() {
  const info = (get('card-info') || {}).rows || {};
  return {
    id: 'me', name: '나 (이 화면)',
    habitat: myHabitatName() || '환경 미정',
    creatureName: (get('bio-name') || {}).text || info.name || '이름 미정',
    creatureDesc: (get('bio-desc') || {}).text || '',
    cardInfo: { type: info.type || '', habitat: info.habitat || '', ability: info.ability || '', weakness: info.weakness || '' },
    envGrade: (get('env-research') || {}).correct,
    traits: (get('common-traits') || {}).rows || {},
    sketch: (get('sketch') || {}).image,
    aiImage: (get('ai-image') || {}).url,
    stars: myStars(),
    progress: myProgressFrac(),
    isMe: true,
  };
}
function peerProfile(p) {
  return {
    ...p,
    progress: 1,
    aiImage: peerCardImg(p),
    sketch: null,
  };
}
function allStudents() {
  return [myProfile(), ...SAMPLE_PEERS.map(peerProfile)];
}

const ctx = {
  refreshFooter: () => render(),
  getValue: (ref) => get(ref),
  studentKey: 'preview-teacher',
  assembledPrompt: () => '',
  summaryOf: () => null,
  peers: () => [],
  publishPeer() {},
  onTeardown() {},
  checklist: () => [],
};

let PROG;

/* ── DOM 헬퍼 ───────────────────────────────────────────── */
function h(tag, props, ...kids) {
  const n = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('data-')) n.setAttribute(k, v);
      else n[k] = v;
    }
  }
  for (const kid of kids.flat()) {
    if (kid == null) continue;
    n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return n;
}

function allBlocks() {
  return PROG.sessions.flatMap((s) => s.steps.flatMap((st) => st.blocks));
}
function blockLabel(id) {
  const b = allBlocks().find((x) => x.id === id);
  return b ? (b.label || b.title || id) : id;
}

/* ── 공통: 상태 병합 ────────────────────────────────────── */
function patch(id, obj) {
  set(id, { ...(get(id) || {}), ...obj });
}

/* ── 공통: 이미지 업로드(자동 축소 후 dataURL 저장) ──────── */
function downscale(file, maxDim = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('파일을 읽지 못했습니다'));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('이미지 형식이 아닙니다'));
      img.onload = () => {
        const s = Math.min(1, maxDim / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        try { resolve(c.toDataURL('image/jpeg', quality)); }
        catch (e) { reject(e); }
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

// targetId 에 buildPatch(dataURL, file) 결과를 병합 저장한다. 저장이 실제로 됐는지 확인.
function imgUploader(currentUrl, targetId, buildPatch, icon = '🖼️') {
  const box = h('div', { class: 'pv-upl' });
  if (currentUrl) box.append(h('img', { class: 'pv-upl-img', src: currentUrl, alt: '' }));
  const input = h('input', { type: 'file', accept: 'image/*' });
  const status = h('span', { class: 'pv-upl-status' });
  input.addEventListener('change', async () => {
    const f = input.files && input.files[0];
    if (!f) return;
    status.textContent = '처리 중…';
    try {
      const url = await downscale(f);
      const before = get(targetId);
      patch(targetId, buildPatch(url, f));
      const after = get(targetId) || {};
      const savedUrl = after.url || after.image;
      if (savedUrl !== url) {
        set(targetId, before); // 되돌리기
        status.textContent = '저장 공간이 꽉 찼습니다. 다른 이미지를 지우거나 더 작은 파일을 올려주세요.';
        return;
      }
      await render();
    } catch (e) {
      status.textContent = '이미지를 넣지 못했습니다: ' + (e && e.message ? e.message : e);
    }
  });
  box.append(
    h('label', { class: 'pv-upl-btn' }, currentUrl ? '다른 이미지로 바꾸기' : `${icon} 이미지 올리기`, input),
    status,
  );
  return box;
}

/* ── 텍스트/표 입력 (입력 중 재렌더 안 함 → 포커스 유지) ── */
function textField(block, long) {
  const st = get(block.id) || {};
  const el = h(long ? 'textarea' : 'input', { class: 'pv-field', placeholder: '여기에 입력' });
  el.value = st.text || '';
  const counter = h('span', { class: 'pv-counter' });
  const min = block.min || 0;
  const paint = () => {
    counter.textContent = `${el.value.length}자` + (min ? ` (최소 ${min}자)` : '');
    counter.classList.toggle('is-short', min > 0 && el.value.trim().length < min);
  };
  el.addEventListener('input', () => { patch(block.id, { text: el.value }); paint(); updateProgress(); });
  paint();
  return h('div', null, el, counter);
}

function tableField(block) {
  const tbl = h('table', { class: 'pv-table' });
  for (const r of block.rows || []) {
    const inp = h('input', { type: 'text', placeholder: '입력' });
    inp.value = ((get(block.id) || {}).rows || {})[r.key] || '';
    inp.addEventListener('input', () => {
      const cur = get(block.id) || {};
      set(block.id, { ...cur, rows: { ...(cur.rows || {}), [r.key]: inp.value } });
      updateProgress();
    });
    tbl.append(h('tr', null, h('th', { text: r.label }), h('td', null, inp)));
  }
  return tbl;
}

/* ── 환경 서술 AI 채점 (카드 성급 요인) ─────────────────── */
function myHabitatName() {
  const hab = get('draw-habitat');
  return (hab && hab.habitat && hab.habitat.korName) || '';
}

function envGrader(block) {
  const wrap = h('div', { class: 'pv-aiwrap' });
  const st = get(block.id) || {};
  const status = h('p', { class: 'pv-upl-status' });
  const graded = typeof st.correct === 'number';

  if (graded) {
    wrap.append(
      h('p', { class: 'pv-quiz-score', text: `AI 채점 ${st.correct} / ${st.total}점` }),
      st.feedback ? h('p', { class: 'pv-prose', text: '피드백 · ' + st.feedback }) : null,
    );
    const redo = h('button', { class: 'pv-quiz-reveal-btn', type: 'button', text: '다시 채점' });
    redo.addEventListener('click', () => { patch(block.id, { correct: undefined, total: undefined, feedback: undefined }); render(); });
    wrap.append(redo);
    return wrap;
  }

  const btn = h('button', { class: 'pv-btn-mock', type: 'button', text: 'AI 채점 받기' });
  btn.addEventListener('click', async () => {
    const text = ((get(block.id) || {}).text || '').trim();
    if (text.length < 100) { status.textContent = '100자 이상 쓴 뒤 채점받으세요.'; return; }
    if (!aiConfig()) { status.textContent = 'AI 채점이 설정되지 않았습니다.'; return; }
    btn.disabled = true;
    status.textContent = '채점 중…';
    try {
      const r = await generateText(
        `아래는 중학생이 '${myHabitatName() || '어떤'}' 서식 환경을 조사해 쓴 글이다. `
        + '기후·지형·식생·그 환경 생물의 특징을 얼마나 정확하고 충실하게 담았는지 0~5점(정수)으로 채점하라. '
        + '엄격하게, 하지만 중학생 수준을 감안해서. 한국어 한 문장 피드백도 달아라.\n'
        + `JSON만 출력: {"score": 정수, "feedback": "문장"}\n\n글:\n${text}`,
        true,
      );
      const score = Math.max(0, Math.min(5, Math.round(Number(r.score) || 0)));
      patch(block.id, { correct: score, total: 5, feedback: String(r.feedback || '') });
      updateProgress();
      await render();
    } catch (e) {
      status.textContent = '채점 실패: ' + (e && e.message ? e.message : e);
      btn.disabled = false;
    }
  });
  wrap.append(
    h('p', { class: 'pv-prose', text: 'AI가 조사 글을 채점합니다. 이 점수는 마지막 카드 등급에 반영됩니다. (텍스트 채점, 비용 매우 적음)' }),
    btn, status,
  );
  return wrap;
}

/* ── 카드 정보 AI 다듬기 ────────────────────────────────── */
function cardInfoPolish(block) {
  const wrap = h('div', { class: 'pv-aiwrap' });
  const status = h('p', { class: 'pv-upl-status' });
  const btn = h('button', { class: 'pv-btn-mock', type: 'button', text: 'AI로 표현 다듬기 · 빈칸 채우기' });
  btn.addEventListener('click', async () => {
    if (!aiConfig()) { status.textContent = 'AI가 설정되지 않았습니다.'; return; }
    btn.disabled = true;
    status.textContent = '다듬는 중…';
    try {
      const rows = (get(block.id) || {}).rows || {};
      const desc = (get('bio-desc') || {}).text || (get('bio-name') || {}).text || '';
      const r = await generateText(
        '학생이 만든 가상 생물 카드 정보를 게임 카드에 어울리는 정제된 한국어 표현으로 다듬어라. '
        + '내용·의미는 유지하고 표현만 매끄럽게. 비어 있는 항목은 아래 생물 설명을 참고해 새로 지어라. '
        + '각 항목은 12자 이내로 짧게.\n'
        + `JSON만 출력: {"name":"","type":"","habitat":"","ability":"","weakness":""}\n\n`
        + `생물 설명: ${desc}\n`
        + `현재 값: 이름=${rows.name || ''} / 타입=${rows.type || ''} / 서식지=${rows.habitat || ''} / 특수능력=${rows.ability || ''} / 약점=${rows.weakness || ''}`,
        true,
      );
      const next = {
        name: r.name || rows.name || '',
        type: r.type || rows.type || '',
        habitat: r.habitat || rows.habitat || '',
        ability: r.ability || rows.ability || '',
        weakness: r.weakness || rows.weakness || '',
      };
      patch(block.id, { rows: next, polished: true });
      updateProgress();
      await render();
    } catch (e) {
      status.textContent = '실패: ' + (e && e.message ? e.message : e);
      btn.disabled = false;
    }
  });
  wrap.append(
    h('p', { class: 'pv-prose', text: '학생이 막 쓴 표현을 카드용으로 다듬고, 빈칸은 AI가 채웁니다. (텍스트, 비용 매우 적음)' }),
    btn, status,
  );
  if ((get(block.id) || {}).polished) wrap.append(h('p', { class: 'pv-upl-status', text: '✓ AI가 다듬은 상태입니다. 표에서 직접 더 고칠 수 있습니다.' }));
  return wrap;
}

/* ── 극실사 프롬프트: 앞 단계 활동에서 자동 조립 ───────────
   교사 지정 템플릿 + 학생이 앞서 만든 설명/환경/연대를 채운다. */
const REALISM_TEMPLATE =
  '당신은 세계 최고의 고생물 복원 아티스트이자 내셔널지오그래픽 야생동물 사진작가입니다. '
  + '첨부한 손그림은 가상의 시공간 환경에 적응해 진화한 생물의 복원도입니다. '
  + '스케치의 외형·형태·신체 비율·포즈를 그대로 유지하면서, 실존하는 생명체처럼 보이는 '
  + "극실사 야생동물 다큐멘터리 사진(National Geographic 8K wildlife photograph)으로 렌더링하세요.\n"
  + '- 서식 환경에 맞는 질감(털/비늘/외골격/가죽)을 모공·주름 수준까지 정밀하게.\n'
  + '- 400mm 망원 렌즈로 야생 현장에서 포착한 듯한 얕은 심도와 자연광.\n'
  + '- 만화/일러스트/CG 느낌 금지, 텍스트·워터마크·카드 프레임 금지, 순수한 야생동물 사진만.';

function autoRealismInfo() {
  const desc = (get('bio-desc') || {}).text || (get('bio-name') || {}).text || '';
  const hab = get('draw-habitat');
  const dat = get('dating-sim');
  return {
    desc: desc,
    habitat: (hab && hab.habitat && hab.habitat.korName) || '',
    era: (dat && dat.problem && dat.problem.era) || '',
  };
}

function buildRealismPrompt() {
  const info = autoRealismInfo();
  return REALISM_TEMPLATE + '\n\n[생물 및 환경 정보]\n'
    + `1. 생물 설명: ${info.desc || '(설명 없음)'}\n`
    + `2. 서식 환경: ${info.habitat || '(환경 미정)'}\n`
    + `3. 생존 연대·적응 특징: ${info.era || '(연대 미정)'}`;
}

function copyText(str, statusEl) {
  const done = () => { if (statusEl) statusEl.textContent = '복사됐습니다. AI 이미지 도구에 붙여넣으세요.'; };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(str).then(done).catch(() => {
      if (statusEl) statusEl.textContent = '복사 실패 — 아래 상자에서 직접 선택해 복사하세요.';
    });
  } else if (statusEl) {
    statusEl.textContent = '아래 상자에서 직접 선택해 복사하세요.';
  }
}

/* ── AI 이미지 생성 (제미나이) ──────────────────────────────
   키는 preview.local.js(gitignore) 의 window.PREVIEW_AI 에서만 읽는다. */
function aiConfig() {
  const c = (typeof window !== 'undefined' && window.PREVIEW_AI) || null;
  return c && c.geminiKey ? c : null;
}

async function generateAiImage(promptText, sketchDataUrl) {
  const cfg = aiConfig();
  if (!cfg) throw new Error('AI 키가 설정되지 않았습니다');
  const model = cfg.model || 'gemini-2.5-flash-image';
  const parts = [{ text: promptText }];
  // 래스터 이미지(jpeg/png/webp)만 첨부 — SVG 자리표시자 등은 건너뜀
  if (sketchDataUrl && /^data:image\/(jpeg|jpg|png|webp);base64,/.test(sketchDataUrl)) {
    const [head, b64] = sketchDataUrl.split(',');
    const mime = (head.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
    parts.push({ inlineData: { mimeType: mime, data: b64 } });
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cfg.geminiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }] }),
  });
  if (!res.ok) {
    let msg = res.status + '';
    try { const j = await res.json(); msg = (j.error && j.error.message) || msg; } catch { /* noop */ }
    throw new Error(msg);
  }
  const data = await res.json();
  const outParts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
  const imgPart = outParts.find((p) => p.inlineData && p.inlineData.data);
  if (!imgPart) {
    const textPart = outParts.find((p) => p.text);
    throw new Error(textPart ? '이미지 대신 텍스트가 왔습니다: ' + textPart.text.slice(0, 120) : '이미지를 받지 못했습니다');
  }
  const raw = `data:${imgPart.inlineData.mimeType || 'image/png'};base64,${imgPart.inlineData.data}`;
  // 저장 용량을 위해 축소
  const blob = await (await fetch(raw)).blob();
  const file = new File([blob], 'ai.png', { type: blob.type });
  return downscale(file, 1024, 0.85);
}

// 제미나이 텍스트 호출 (채점·퀴즈 생성·표현 다듬기). JSON 응답을 원하면 wantJson=true.
async function generateText(promptText, wantJson) {
  const cfg = aiConfig();
  if (!cfg) throw new Error('AI 키가 설정되지 않았습니다');
  const model = cfg.textModel || 'gemini-2.5-flash';
  const body = { contents: [{ parts: [{ text: promptText }] }] };
  if (wantJson) body.generationConfig = { responseMimeType: 'application/json' };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cfg.geminiKey)}`;
  const res = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = res.status + '';
    try { const j = await res.json(); msg = (j.error && j.error.message) || msg; } catch { /* noop */ }
    throw new Error(msg);
  }
  const data = await res.json();
  const parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
  const text = parts.map((p) => p.text || '').join('').trim();
  if (!text) throw new Error('빈 응답');
  if (wantJson) {
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    return JSON.parse(cleaned);
  }
  return text;
}

/* ── 플랫폼 담당 블록 (여기서는 실제로 동작하게) ─────────── */
function mockBlock(block) {
  const wrap = h('div', { class: 'pv-block' });
  const label = block.label || block.title;
  const st = get(block.id);

  switch (block.type) {
    case 'text':
      if ((block.body || '').length > 400) {
        wrap.append(
          h('p', { class: 'pv-block-label' }, '제시문 · AI 프롬프트 안내'),
          h('div', { class: 'pv-prompt-box', text: block.body }),
        );
      } else {
        wrap.append(h('p', { class: 'pv-prose', text: block.body || '' }));
      }
      return wrap;

    case 'capture.photo':
      wrap.append(h('p', { class: 'pv-block-label' }, label || '사진 올리기'));
      wrap.append(imgUploader(st && st.url, block.id, (url, f) => ({ url, name: f.name }), '📷'));
      return wrap;

    case 'input.short':
      wrap.append(h('p', { class: 'pv-block-label' }, label || ''), textField(block, false));
      return wrap;

    case 'input.long':
      wrap.append(h('p', { class: 'pv-block-label' }, label || ''), textField(block, true));
      if (block.id === 'env-research') wrap.append(envGrader(block));
      return wrap;

    case 'input.table':
      wrap.append(h('p', { class: 'pv-block-label' }, label || '표 입력'), tableField(block));
      if (block.id === 'card-info') wrap.append(cardInfoPolish(block));
      return wrap;

    case 'quiz': {
      // 세션 6 종합 퀴즈 = 친구 카드 도감. 실제 퀴즈는 공유의 장에서 카드별로.
      if (block.id === 'final-quiz') {
        wrap.append(h('p', { class: 'pv-block-label' }, label || '친구 카드 도감'));
        const dex = dexState();
        const owned = (dex.owned || []).length;
        wrap.append(h('p', { class: 'pv-prose', text:
          '친구들이 만든 생물 카드를 살펴보고, 각 카드마다 나오는 과학 퀴즈에서 3개 이상 맞히면 그 카드를 도감북에 넣을 수 있습니다.' }));
        const grid = h('div', { class: 'pv-share-grid' });
        for (const p of SAMPLE_PEERS.map(peerProfile)) {
          const got = (dex.owned || []).includes(p.id);
          const cell = h('div', { class: 'pv-share-cell' });
          cell.append(creatureCardEl(p, { onClick: () => { SHARE_VIEW = p.id; render(); } }));
          cell.append(h('p', { class: 'pv-share-pct', text: got ? '✓ 획득함' : `${p.name} — 눌러서 퀴즈` }));
          grid.append(cell);
        }
        wrap.append(grid);
        wrap.append(h('p', { class: 'pv-quiz-score', text: `획득한 친구 카드: ${owned}개` }));
        const openBtn = h('button', { class: 'pv-btn-mock', type: 'button', text: '👥 공유의 장에서 풀기' });
        openBtn.addEventListener('click', () => { SHARE_VIEW = 'class'; render(); });
        wrap.append(openBtn);
        return wrap;
      }

      wrap.append(h('p', { class: 'pv-block-label' }, label || '퀴즈'));
      const cur = get(block.id) || {};
      const status = h('p', { class: 'pv-upl-status' });
      const isEnvQuiz = block.id === 'mid-quiz';

      // 환경 퀴즈는 뽑은 환경 + 내 조사 내용으로 그때그때 생성한다.
      if (isEnvQuiz) {
        const genBtn = h('button', { class: 'pv-btn-mock', type: 'button', text: cur.questions ? '문제 새로 생성' : '환경 퀴즈 생성' });
        genBtn.addEventListener('click', async () => {
          if (!aiConfig()) { status.textContent = 'AI가 설정되지 않았습니다.'; return; }
          genBtn.disabled = true;
          status.textContent = '문제 만드는 중…';
          try {
            const research = (get('env-research') || {}).text || '';
            const traits = Object.values((get('common-traits') || {}).rows || {}).filter(Boolean).join(', ');
            const qs = await generateText(
              `중학교 과학 수업이다. 학생이 '${myHabitatName() || '어떤'}' 서식 환경을 배정받았다. `
              + '이 환경에 대한 4지선다 퀴즈 4문제를 만들어라. '
              + '학생이 쓴 조사 내용을 그대로 되묻지 말고, 그 내용에서 유추해 풀 수 있는 문제로. '
              + '기후·지형·식생·그 환경 생물의 적응을 다룬다. 너무 쉽지도 어렵지도 않게.\n'
              + 'JSON 배열만 출력: [{"q":"질문","choices":["","","",""],"answer":정답인덱스(0~3),"why":"해설"}]\n\n'
              + `학생 조사 내용: ${research}\n학생이 정리한 공통 속성: ${traits}`,
              true,
            );
            const clean = (Array.isArray(qs) ? qs : []).slice(0, 5).map((q, i) => ({
              key: 'e' + i, q: String(q.q || ''), choices: (q.choices || []).map(String).slice(0, 5),
              answer: Math.max(0, Math.min((q.choices || []).length - 1, Number(q.answer) || 0)),
              why: String(q.why || ''),
            })).filter((q) => q.q && q.choices.length >= 3);
            if (!clean.length) throw new Error('문제를 만들지 못했습니다');
            set(block.id, { questions: clean, answers: {} });
            await render();
          } catch (e) {
            status.textContent = '생성 실패: ' + (e && e.message ? e.message : e);
            genBtn.disabled = false;
          }
        });
        wrap.append(genBtn, status);
        if (!cur.questions) {
          wrap.append(h('p', { class: 'pv-prose', text: '내가 뽑은 환경과 조사 내용을 바탕으로 문제가 생성됩니다.' }));
          return wrap;
        }
        status.textContent = '';
      }

      const questions = cur.questions || block.questions || [];
      const picks = { ...(cur.answers || {}) };
      const graded = typeof cur.correct === 'number';
      const box = h('div', { class: 'pv-quiz' + (graded ? ' reveal' : '') });
      questions.forEach((q, qi) => {
        const qEl = h('div', { class: 'pv-quiz-q' }, h('p', { text: `${qi + 1}. ${q.q}` }));
        q.choices.forEach((c, ci) => {
          const isPick = picks[q.key] === ci;
          const cls = 'pv-quiz-opt'
            + (graded && ci === q.answer ? ' is-correct' : '')
            + (graded && isPick && ci !== q.answer ? ' is-wrong' : '');
          const radio = h('input', {
            type: 'radio', name: block.id + '-' + q.key, checked: isPick, disabled: graded,
          });
          radio.addEventListener('change', () => { picks[q.key] = ci; });
          qEl.append(h('label', { class: cls }, radio, h('span', { text: c })));
        });
        if (graded) qEl.append(h('p', { class: 'pv-quiz-why', text: '해설 · ' + q.why }));
        box.append(qEl);
      });
      wrap.append(box);

      if (graded) {
        wrap.append(h('p', { class: 'pv-quiz-score', text: `${cur.correct} / ${cur.total} 정답` }));
        const redo = h('button', { class: 'pv-quiz-reveal-btn', type: 'button', text: '다시 풀기' });
        redo.addEventListener('click', () => { patch(block.id, { answers: {}, correct: undefined, total: undefined }); render(); });
        wrap.append(redo);
      } else {
        const grade = h('button', { class: 'pv-btn-mock', type: 'button', text: '채점하기' });
        grade.addEventListener('click', () => {
          const answered = questions.filter((q) => picks[q.key] !== undefined);
          if (answered.length < questions.length) {
            status.textContent = `아직 ${questions.length - answered.length}문항이 남았습니다.`;
            return;
          }
          let correct = 0;
          const answers = {};
          questions.forEach((q) => { answers[q.key] = picks[q.key]; if (picks[q.key] === q.answer) correct++; });
          patch(block.id, { answers, correct, total: questions.length });
          updateProgress();
          render();
        });
        wrap.append(grade, status);
      }
      return wrap;
    }

    case 'capture.sketch': {
      wrap.append(h('p', { class: 'pv-block-label' }, label || '내 생물 그리기'));
      if (block.guide) wrap.append(h('p', { class: 'pv-prose', text: '안내 · ' + block.guide }));
      wrap.append(h('p', { class: 'pv-prose', text:
        '종이·태블릿·그림 앱 어디에 그려도 좋습니다. 반드시 색을 칠해 완성한 뒤, 그 그림을 이미지로 올리세요.' }));
      // 카드 등급 신호(kind:strokes)가 읽히도록 strokes 배열을 함께 저장한다.
      wrap.append(imgUploader(st && st.image, block.id, (image) => ({ image, strokes: new Array(36).fill(0) }), '🎨'));
      return wrap;
    }

    case 'ai.prompt': {
      // 학생이 입력하지 않는다 — 앞 단계 활동에서 자동으로 채워진 정보만 보여준다.
      wrap.append(h('p', { class: 'pv-block-label' }, label || '생성에 쓰이는 정보 (자동)'));
      const info = autoRealismInfo();
      const val = { desc: info.desc, habitat: info.habitat, era: info.era };
      const tbl = h('table', { class: 'pv-table' });
      (block.fields || []).forEach((fd) => {
        tbl.append(h('tr', null,
          h('th', { text: fd.label }),
          h('td', { text: val[fd.key] || '— (앞 단계에서 자동 반영)' })));
      });
      wrap.append(tbl);
      return wrap;
    }

    case 'ai.launch': {
      wrap.append(h('p', { class: 'pv-block-label' }, label || 'AI 이미지 생성'));
      const status = h('p', { class: 'pv-upl-status' });

      if (aiConfig()) {
        const sketch = get('sketch');
        const already = (get('ai-image') || {}).url;
        const gen = h('button', { class: 'pv-btn-mock', type: 'button', text: already ? '다시 생성하기' : 'AI 이미지 생성하기' });
        gen.addEventListener('click', async () => {
          gen.disabled = true;
          status.textContent = '생성 중입니다… (10~20초 걸립니다)';
          try {
            const url = await generateAiImage(buildRealismPrompt(), sketch && sketch.image);
            const before = get('ai-image');
            set('ai-image', { url, source: 'gemini' });
            if (!(get('ai-image') || {}).url) {
              set('ai-image', before);
              status.textContent = '저장 공간이 꽉 찼습니다. "빈 수업으로 보기"로 비우고 다시 시도하세요.';
              gen.disabled = false;
              return;
            }
            await render();
          } catch (e) {
            status.textContent = '생성 실패: ' + (e && e.message ? e.message : e);
            gen.disabled = false;
          }
        });
        wrap.append(gen, status);
        const cur = get('ai-image');
        if (cur && cur.url) {
          wrap.append(h('figure', { class: 'pv-ai-shot' },
            h('img', { src: cur.url, alt: '생성된 이미지' }),
            h('figcaption', { text: '생성된 이미지 — 다음 단계에서 카드에 사용됩니다' })));
        }
        wrap.append(h('p', { class: 'pv-caution', text:
          '이 버튼은 누를 때마다 이미지가 새로 만들어지며 비용이 발생합니다. '
          + '앞 단계 내용을 충분히 다듬은 뒤 신중하게 눌러 주세요.' }));
      } else {
        wrap.append(h('p', { class: 'pv-prose', text: 'AI 이미지 생성이 설정되지 않았습니다. 세션 5-2에서 완성 이미지를 직접 올릴 수 있습니다.' }));
      }
      return wrap;
    }

    case 'ai.collect':
      wrap.append(h('p', { class: 'pv-block-label' }, label || 'AI 이미지'));
      if ((get('ai-image') || {}).source === 'gemini') {
        wrap.append(h('p', { class: 'pv-prose', text: '앞 단계에서 생성한 이미지입니다. 다른 이미지로 바꾸려면 아래에서 올리세요.' }));
      } else {
        wrap.append(h('p', { class: 'pv-prose', text: 'AI로 만든 극실사 이미지를 올리세요.' }));
      }
      wrap.append(imgUploader((get('ai-image') || {}).url, 'ai-image', (url) => ({ url }), '🖼️'));
      return wrap;

    case 'compare': {
      wrap.append(h('p', { class: 'pv-block-label' }, label || '손그림 ↔ AI 실사 비교'));
      const sk = get('sketch');
      const ai = get('ai-image');
      const fig = (cap, url) => h('figure', { class: 'pv-cmp-fig' },
        url ? h('img', { src: url, alt: cap }) : h('div', { class: 'pv-ph', text: cap + ' 없음' }),
        h('figcaption', { text: cap }));
      wrap.append(h('div', { class: 'pv-compare' },
        fig(block.left.label, sk && sk.image), fig(block.right.label, ai && ai.url)));

      const cur = get(block.id) || {};
      const checkWrap = h('div', { class: 'pv-checks' });
      (block.checks || []).forEach((c) => {
        const cb = h('input', { type: 'checkbox', checked: !!(cur.checks || {})[c.key] });
        cb.addEventListener('change', () => {
          const v = get(block.id) || {};
          set(block.id, { ...v, checks: { ...(v.checks || {}), [c.key]: cb.checked } });
        });
        checkWrap.append(h('label', { class: 'pv-check' }, cb, h('span', { text: c.label })));
      });
      wrap.append(checkWrap);

      if (block.note) {
        const note = h('textarea', { class: 'pv-field', placeholder: block.note.hint, rows: 2 });
        note.value = cur.note || '';
        note.addEventListener('input', () => patch(block.id, { note: note.value }));
        wrap.append(h('p', { class: 'pv-block-label' }, block.note.label), note);
      }
      return wrap;
    }

    case 'submit': {
      const done = get(block.id) && get(block.id).submittedAt;
      const btn = h('button', { class: 'pv-btn-mock', type: 'button', text: done ? '제출 완료 ✓' : (label || '최종 제출') });
      if (!done) {
        btn.addEventListener('click', () => { set(block.id, { submittedAt: new Date().toISOString() }); go(screenCount() - 1); });
      }
      wrap.append(btn);
      return wrap;
    }

    default:
      wrap.append(h('p', { class: 'pv-prose', text: `(${block.type} 블록)` }));
      return wrap;
  }
}

/* ── 신규 블록 3종 (배포되는 핸들러 그대로) ──────────────── */
async function realBlock(block) {
  const handler = CUSTOM[block.type];
  const wrap = h('div', { class: 'pv-block pv-real-wrap' });
  wrap.append(h('p', { class: 'pv-block-label' }, block.label || block.type));
  try {
    const node = await handler.render(block, ctx);
    wrap.append(node);
    const value = get(block.id);
    if (!handler.complete(block, value, ctx)) {
      wrap.append(h('p', { class: 'pv-step-gate', text: '· ' + handler.missing(block, value, ctx) }));
    }
  } catch (err) {
    wrap.append(h('p', { class: 'pv-prose', text: '렌더 오류: ' + err.message }));
  }
  return wrap;
}

/* ── 페이지(단계) 이동 ──────────────────────────────────── */
// 화면 목록: [표지] + 단계 11개 + [마무리]
function stepList() {
  return PROG.sessions.flatMap((s) => s.steps.map((st) => ({ session: s, step: st })));
}
let CUR = 0; // 현재 화면 번호 (0 = 표지)

function screenCount() { return stepList().length + 2; }
function screenTitle(i) {
  if (i === 0) return '표지';
  if (i === screenCount() - 1) return '마무리';
  const { session, step } = stepList()[i - 1];
  return `${session.no}. ${step.title}`;
}

function go(i) {
  CUR = Math.max(0, Math.min(screenCount() - 1, i));
  if (history.replaceState) history.replaceState(null, '', '#' + CUR);
  render().then(() => window.scrollTo(0, 0));
}

/* ── 공유의 장 (가상 동급생 진행·제출 보기 / 친구 카드 / 도감북) ── */
let SHARE_VIEW = null; // null=닫힘, 'class'=반 전체, 'dex'=내 도감북, peerId=상세

function creatureCardEl(prof, opts) {
  const stars = typeof prof.stars === 'number' ? prof.stars : 1;
  const cls = TIER_CLASS[Math.max(0, Math.min(4, stars - 1))];
  const card = h('div', { class: 'fx-card pv-mini-card ' + cls });
  card.append(h('div', { class: 'fx-card-foil' }));
  card.append(h('div', { class: 'fx-card-stars', text: '★'.repeat(stars) + '☆'.repeat(5 - stars) + ' ' + (TIER_NAME[stars - 1] || '') }));
  const img = h('div', { class: 'fx-card-img' });
  const src = prof.aiImage || prof.sketch;
  if (src) img.append(h('img', { src, alt: prof.creatureName }));
  card.append(img);
  card.append(h('div', { class: 'fx-card-name', text: prof.creatureName }));
  const ci = prof.cardInfo || {};
  card.append(h('div', { class: 'fx-card-meta' },
    h('span', { text: '타입 ' + (ci.type || '-') }), h('span', { text: '서식지 ' + (ci.habitat || prof.habitat || '-') })));
  if (opts && opts.onClick) { card.style.cursor = 'pointer'; card.addEventListener('click', opts.onClick); }
  return card;
}

function sharePanel() {
  if (SHARE_VIEW == null) return null;
  const overlay = h('div', { class: 'pv-share' });
  const panel = h('div', { class: 'pv-share-panel' });

  const close = h('button', { class: 'pv-share-close', type: 'button', text: '✕' });
  close.addEventListener('click', () => { SHARE_VIEW = null; render(); });

  const tabs = h('div', { class: 'pv-share-tabs' });
  const tab = (id, label) => {
    const b = h('button', { class: 'pv-share-tab' + (SHARE_VIEW === id ? ' is-cur' : ''), type: 'button', text: label });
    b.addEventListener('click', () => { SHARE_VIEW = id; render(); });
    return b;
  };
  tabs.append(tab('class', '반 전체'), tab('dex', '내 도감북'));

  panel.append(h('div', { class: 'pv-share-head' }, h('h2', { text: '공유의 장' }), tabs, close));

  const body = h('div', { class: 'pv-share-body' });
  const students = allStudents();

  if (SHARE_VIEW === 'class') {
    body.append(h('p', { class: 'pv-prose', text: `참가 학생 ${students.length}명 — 각자의 진행 상황과 제출물입니다. 카드를 눌러 자세히 볼 수 있습니다.` }));
    const grid = h('div', { class: 'pv-share-grid' });
    for (const s of students) {
      const cell = h('div', { class: 'pv-share-cell' + (s.isMe ? ' is-me' : '') });
      cell.append(h('div', { class: 'pv-share-cell-head' },
        h('b', { text: s.name }),
        h('span', { class: 'pv-share-hab', text: s.habitat })));
      const bar = h('div', { class: 'pv-progress pv-share-bar' },
        h('div', { class: 'pv-progress-fill', style: `width:${Math.round((s.progress || 0) * 100)}%` }));
      cell.append(bar, h('span', { class: 'pv-share-pct', text: Math.round((s.progress || 0) * 100) + '% 진행' }));
      cell.append(creatureCardEl(s, { onClick: () => { SHARE_VIEW = s.id; render(); } }));
      grid.append(cell);
    }
    body.append(grid);
  } else if (SHARE_VIEW === 'dex') {
    body.append(dexView(students));
  } else {
    const s = students.find((x) => x.id === SHARE_VIEW);
    if (s) body.append(studentDetail(s));
  }

  panel.append(body);
  overlay.append(panel);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) { SHARE_VIEW = null; render(); } });
  return overlay;
}

function studentDetail(s) {
  const wrap = h('div', null);
  const back = h('button', { class: 'pv-share-tab', type: 'button', text: '← 반 전체' });
  back.addEventListener('click', () => { SHARE_VIEW = 'class'; render(); });
  wrap.append(back);
  wrap.append(h('h3', { text: `${s.name} · ${s.habitat}` }));
  wrap.append(h('div', { class: 'pv-share-detail' },
    creatureCardEl(s),
    h('div', null,
      h('p', { class: 'pv-block-label', text: s.creatureName }),
      h('p', { class: 'pv-prose', text: s.creatureDesc || '(설명 미작성)' }),
      typeof s.envGrade === 'number' ? h('p', { class: 'pv-prose', text: `환경 조사 AI 채점: ${s.envGrade}/5점` }) : null,
    )));
  const tr = s.traits || {};
  const labels = { body: '몸의 구조', food: '먹이·에너지', move: '이동', temp: '체온·수분', repro: '번식·생존' };
  const tbl = h('table', { class: 'pv-table' });
  for (const k of Object.keys(labels)) {
    if (tr[k]) tbl.append(h('tr', null, h('th', { text: labels[k] }), h('td', { text: tr[k] })));
  }
  if (tbl.children.length) wrap.append(h('p', { class: 'pv-block-label', text: '공통 속성' }), tbl);

  if (!s.isMe) wrap.append(friendQuizBlock(s));
  return wrap;
}

/* ── 친구 카드 획득 퀴즈 (세션 6 핵심) ──────────────────── */
function dexState() { return get('pv-dex') || { owned: [], quizzes: {} }; }

function friendQuizBlock(peer) {
  const wrap = h('div', { class: 'pv-aiwrap pv-friend-quiz' });
  const dex = dexState();
  const owned = (dex.owned || []).includes(peer.id);
  const qz = (dex.quizzes || {})[peer.id] || {};
  const status = h('p', { class: 'pv-upl-status' });

  if (allStudents().length < 4) {
    wrap.append(h('p', { class: 'pv-prose', text: '참가 학생이 4명 이상일 때 카드 획득 퀴즈가 열립니다.' }));
    return wrap;
  }

  wrap.append(h('p', { class: 'pv-block-label', text: `${peer.name}의 카드 획득하기` }));
  if (owned) {
    wrap.append(h('p', { class: 'pv-quiz-score', text: '✓ 이 카드를 도감북에 획득했습니다.' }));
    return wrap;
  }
  wrap.append(h('p', { class: 'pv-prose', text: `${peer.creatureName}에 대한 과학 퀴즈 5문제 중 3개 이상 맞히면 이 카드를 얻습니다. 친구의 작품을 잘 살펴본 뒤 푸세요.` }));

  if (!qz.questions) {
    const gen = h('button', { class: 'pv-btn-mock', type: 'button', text: '퀴즈 생성' });
    gen.addEventListener('click', async () => {
      if (!aiConfig()) { status.textContent = 'AI가 설정되지 않았습니다.'; return; }
      gen.disabled = true; status.textContent = '문제 만드는 중…';
      try {
        const tr = Object.values(peer.traits || {}).filter(Boolean).join(', ');
        const qs = await generateText(
          `중학교 과학 수업이다. 한 학생이 '${peer.habitat}' 환경에 사는 가상 생물 '${peer.creatureName}'을 만들었다.\n`
          + `생물 설명: ${peer.creatureDesc}\n공통 속성: ${tr}\n`
          + '이 생물의 적응·환경·과학 개념을 묻는 4지선다 퀴즈 5문제를 만들어라. '
          + '친구의 작품 설명을 충분히 읽은 학생이 풀 수 있는 수준으로, 단순 암기가 아니라 이해를 묻게.\n'
          + 'JSON 배열만: [{"q":"","choices":["","","",""],"answer":정답인덱스,"why":""}]',
          true,
        );
        const clean = (Array.isArray(qs) ? qs : []).slice(0, 5).map((q, i) => ({
          key: 'fq' + i, q: String(q.q || ''), choices: (q.choices || []).map(String).slice(0, 5),
          answer: Math.max(0, Math.min((q.choices || []).length - 1, Number(q.answer) || 0)),
          why: String(q.why || ''),
        })).filter((q) => q.q && q.choices.length >= 3);
        if (clean.length < 3) throw new Error('문제를 충분히 만들지 못했습니다');
        const d = dexState();
        set('pv-dex', { ...d, quizzes: { ...(d.quizzes || {}), [peer.id]: { questions: clean, answers: {} } } });
        render();
      } catch (e) {
        status.textContent = '생성 실패: ' + (e && e.message ? e.message : e);
        gen.disabled = false;
      }
    });
    wrap.append(gen, status);
    return wrap;
  }

  const picks = { ...(qz.answers || {}) };
  const graded = typeof qz.correct === 'number';
  const box = h('div', { class: 'pv-quiz' + (graded ? ' reveal' : '') });
  qz.questions.forEach((q, qi) => {
    const qEl = h('div', { class: 'pv-quiz-q' }, h('p', { text: `${qi + 1}. ${q.q}` }));
    q.choices.forEach((c, ci) => {
      const isPick = picks[q.key] === ci;
      const cls = 'pv-quiz-opt'
        + (graded && ci === q.answer ? ' is-correct' : '')
        + (graded && isPick && ci !== q.answer ? ' is-wrong' : '');
      const radio = h('input', { type: 'radio', name: 'fq-' + peer.id + '-' + q.key, checked: isPick, disabled: graded });
      radio.addEventListener('change', () => { picks[q.key] = ci; });
      qEl.append(h('label', { class: cls }, radio, h('span', { text: c })));
    });
    if (graded) qEl.append(h('p', { class: 'pv-quiz-why', text: '해설 · ' + q.why }));
    box.append(qEl);
  });
  wrap.append(box);

  if (graded) {
    const pass = qz.correct >= 3;
    wrap.append(h('p', { class: 'pv-quiz-score', text: `${qz.correct} / 5 정답 — ${pass ? '획득 성공!' : '3개 이상 필요, 다시 도전하세요'}` }));
    const btn = h('button', { class: 'pv-quiz-reveal-btn', type: 'button', text: pass ? '도감북에 추가' : '다시 풀기' });
    btn.addEventListener('click', () => {
      const d = dexState();
      if (pass) {
        set('pv-dex', { ...d, owned: [...new Set([...(d.owned || []), peer.id])] });
        // 친구 카드를 1개라도 얻으면 세션 6 게이트(final-quiz) 통과 처리
        if (!(get('final-quiz') || {}).correct) {
          set('final-quiz', { answers: { a: 1, b: 1, c: 1, d: 1, e: 1 }, correct: 5, total: 5 });
        }
      } else {
        set('pv-dex', { ...d, quizzes: { ...(d.quizzes || {}), [peer.id]: { questions: qz.questions, answers: {} } } });
      }
      render();
    });
    wrap.append(btn);
  } else {
    const grade = h('button', { class: 'pv-btn-mock', type: 'button', text: '채점하기' });
    grade.addEventListener('click', () => {
      const unanswered = qz.questions.filter((q) => picks[q.key] === undefined).length;
      if (unanswered) { status.textContent = `${unanswered}문항이 남았습니다.`; return; }
      let correct = 0;
      const answers = {};
      qz.questions.forEach((q) => { answers[q.key] = picks[q.key]; if (picks[q.key] === q.answer) correct++; });
      const d = dexState();
      set('pv-dex', { ...d, quizzes: { ...(d.quizzes || {}), [peer.id]: { questions: qz.questions, answers, correct } } });
      render();
    });
    wrap.append(grade, status);
  }
  return wrap;
}

/* ── 도감북 ─────────────────────────────────────────────── */
function dexView(students) {
  const wrap = h('div', null);
  const dex = dexState();
  const owned = dex.owned || [];
  const me = students.find((s) => s.isMe);
  const mine = [];
  if (me && typeof me.stars === 'number') mine.push(me);
  for (const s of students) if (!s.isMe && owned.includes(s.id)) mine.push(s);

  wrap.append(h('p', { class: 'pv-prose', text: `내 도감북 · ${mine.length}종 수집 (내 카드 + 친구 카드 획득분)` }));
  if (!mine.length) {
    wrap.append(h('p', { class: 'pv-prose', text: '아직 카드가 없습니다. 내 카드를 개봉하거나, "반 전체"에서 친구 카드 퀴즈를 풀어 획득하세요.' }));
  }
  const grid = h('div', { class: 'pv-share-grid' });
  for (const s of mine) grid.append(creatureCardEl(s));
  wrap.append(grid);

  // 친구들 도감 진행(가상)
  const peerDex = h('div', { class: 'pv-dex-peers' });
  peerDex.append(h('p', { class: 'pv-block-label', text: '친구들의 수집 현황' }));
  SAMPLE_PEERS.forEach((p, i) => {
    const n = 1 + ((i * 2 + owned.length) % 5); // 데모용 가상 수치
    peerDex.append(h('p', { class: 'pv-prose', text: `${p.name} — ${n}종 수집` }));
  });
  wrap.append(peerDex);
  return wrap;
}

/* ── 페이지 조립 ────────────────────────────────────────── */
function topbar() {
  const seed = h('button', { class: 'pv-seed-btn', type: 'button', text: '예시 답안 채우기' });
  seed.addEventListener('click', async () => { seed.disabled = true; await seedState(); await render(); });
  const reset = h('button', { class: 'pv-seed-btn', type: 'button', text: '빈 수업으로 보기' });
  reset.addEventListener('click', async () => { _clear(); await render(); });
  const share = h('button', { class: 'pv-share-btn', type: 'button', text: '👥 공유의 장' });
  share.addEventListener('click', () => { SHARE_VIEW = SHARE_VIEW == null ? 'class' : null; render(); });

  return h('div', { class: 'pv-topbar' },
    h('div', { class: 'pv-topbar-inner' },
      h('p', { class: 'pv-topbar-title' }, '화석으로 알아보는 생물 탐구 ', h('span', { text: '· 수업 시안' })),
      h('div', { class: 'pv-progress' }, h('div', { class: 'pv-progress-fill', id: 'pv-fill' })),
      share, seed, reset,
    ));
}

// 단계 진행바: 세션별로 묶은 점, 현재 단계 강조, 클릭 시 이동
function stepper() {
  const steps = stepList();
  const rail = h('div', { class: 'pv-rail' });

  const coverDot = h('button', {
    class: 'pv-rail-dot' + (CUR === 0 ? ' is-cur' : ''), type: 'button', title: '표지',
  });
  coverDot.addEventListener('click', () => go(0));
  rail.append(coverDot);

  let lastSession = null;
  steps.forEach((entry, idx) => {
    if (entry.session !== lastSession) {
      rail.append(h('span', { class: 'pv-rail-sep', text: entry.session.no }));
      lastSession = entry.session;
    }
    const screenIdx = idx + 1;
    const dot = h('button', {
      class: 'pv-rail-dot' + (screenIdx === CUR ? ' is-cur' : (screenIdx < CUR ? ' is-done' : '')),
      type: 'button', title: `${entry.session.no}. ${entry.step.title}`,
    });
    dot.addEventListener('click', () => go(screenIdx));
    rail.append(dot);
  });

  const finDot = h('button', {
    class: 'pv-rail-dot pv-rail-fin' + (CUR === screenCount() - 1 ? ' is-cur' : ''), type: 'button', title: '마무리',
  });
  finDot.addEventListener('click', () => go(screenCount() - 1));
  rail.append(finDot);

  return rail;
}

// 한 블록이 "완료"인지 — 다음 단계로 넘어갈 수 있는지 판단.
function blockDone(id) {
  const blk = allBlocks().find((b) => b.id === id);
  if (!blk) return true;
  const v = get(id);
  if (CUSTOM[blk.type]) return CUSTOM[blk.type].complete(blk, v, ctx);
  switch (blk.type) {
    case 'capture.photo': return !!(v && v.url);
    case 'capture.sketch': return !!(v && v.image);
    case 'input.short': return !!(v && (v.text || '').trim().length >= 1);
    case 'input.long': return !!(v && (v.text || '').trim().length >= (blk.min || 1));
    case 'input.table': {
      const rows = (v && v.rows) || {};
      return (blk.rows || []).some((r) => (rows[r.key] || '').trim().length > 0);
    }
    case 'quiz':
      if (id === 'final-quiz') return (dexState().owned || []).length >= 1;
      return typeof (v || {}).correct === 'number';
    case 'ai.collect': return !!(get('ai-image') || {}).url;
    default: return true;
  }
}

// 현재 화면(단계)의 advance.requires 가 모두 충족됐는가
function screenGate(i) {
  if (i === 0 || i === screenCount() - 1) return { ok: true };
  const { step } = stepList()[i - 1];
  const req = (step.advance && step.advance.requires) || [];
  const missing = req.filter((id) => !blockDone(id));
  return { ok: missing.length === 0, missing };
}

function navRow() {
  const last = screenCount() - 1;
  const prev = h('button', { class: 'pv-nav-btn', type: 'button', disabled: CUR === 0 },
    '← 이전', CUR > 0 ? h('span', { class: 'pv-nav-sub', text: screenTitle(CUR - 1) }) : null);
  const next = h('button', { class: 'pv-nav-btn pv-nav-next', type: 'button', disabled: CUR === last },
    CUR < last ? h('span', { class: 'pv-nav-sub', text: screenTitle(CUR + 1) }) : null, '다음 →');
  const hint = h('p', { class: 'pv-nav-hint', hidden: true });

  prev.addEventListener('click', () => go(CUR - 1));
  next.addEventListener('click', () => {
    const g = screenGate(CUR);
    if (g.ok) { go(CUR + 1); return; }
    hint.textContent = '다음으로 가려면 완료해야 합니다: ' + g.missing.map((id) => blockLabel(id)).join(', ');
    hint.hidden = false;
  });

  return h('div', null,
    h('div', { class: 'pv-nav' },
      prev,
      h('span', { class: 'pv-nav-count', text: CUR === 0 ? '표지' : CUR === last ? '마무리' : `${CUR} / ${stepList().length}` }),
      next),
    hint);
}

function hero() {
  const m = PROG;
  return h('div', null,
    h('div', { class: 'pv-hero' },
      h('span', { class: 'pv-hero-kicker', text: '국립중앙과학관 연계 · ' + (m.hall || '') }),
      h('h1', { text: m.title }),
      h('p', { class: 'pv-hero-sub', text: m.subtitle || '' }),
      h('div', { class: 'pv-hero-meta' },
        h('span', null, h('b', { text: '대상 ' }), gradeText(m.gradeBand)),
        h('span', null, h('b', { text: '차시 ' }), `약 ${m.estimatedMinutes}분`),
        h('span', null, h('b', { text: '모둠 ' }), groupText(m.groupMode)),
        h('span', null, h('b', { text: '세션 ' }), `${m.sessions.length}개`),
      )),
    h('p', { class: 'pv-note', text:
      '이 페이지에서 수업 전체를 직접 해볼 수 있습니다. 사진·손그림을 올리고, 글을 쓰고, 퀴즈를 풀면 '
      + (aiConfig()
        ? '세션 5에서 그 내용으로 AI 극실사 사진이 실제로 생성되고(장당 약 55원 과금), '
        : '세션 5에서 프롬프트를 복사해 AI 도구로 이미지를 만들고, ')
      + '그 이미지로 마지막 수집 카드가 만들어집니다. '
      + '"빈 수업으로 보기"로 처음부터, "예시 답안 채우기"로 채워진 예시를 볼 수 있습니다. '
      + '입력한 내용은 이 브라우저에만 저장됩니다(새로고침해도 유지).' }),
  );
}

function gradeText(b) { return ({ elementary: '초등', middle: '중학', high: '고등' })[b] || b || '-'; }
function groupText(g) { return ({ 'solo': '개인', 'solo-or-pair': '개인 또는 짝', 'group': '모둠' })[g] || g || '-'; }

// 한 단계 화면: 세션 맥락 + 단계 카드
async function stepScreen(session, step, stepNoInSession) {
  const wrap = h('div', null);

  wrap.append(h('div', { class: 'pv-session-head' },
    h('div', { class: 'pv-session-no', text: String(session.no) }),
    h('div', null,
      h('h2', { class: 'pv-session-title', text: `세션 ${session.no} · ${session.title}` }),
      h('p', { class: 'pv-session-tagline', text: session.tagline || '' }),
    )));

  const card = h('div', { class: 'pv-step' });
  const head = h('div', { class: 'pv-step-head' },
    h('h3', { class: 'pv-step-title', text: step.title }));
  if (session.steps.length > 1) {
    head.append(h('span', { class: 'pv-step-count', text: `단계 ${stepNoInSession}/${session.steps.length}` }));
  }
  if (step.phase) head.append(h('span', { class: 'pv-phase', 'data-phase': step.phase, text: step.phase }));
  card.append(head);

  for (const block of step.blocks) {
    card.append(CUSTOM[block.type] ? await realBlock(block) : mockBlock(block));
  }

  const req = (step.advance && step.advance.requires) || [];
  if (req.length) {
    card.append(h('p', { class: 'pv-step-gate' },
      h('b', { text: '다음으로 넘어가려면 · ' }),
      req.map((id) => blockLabel(id)).join(', ') + ' 완료'));
  }
  wrap.append(card);
  return wrap;
}

function finale() {
  const refs = (PROG.deliverable && PROG.deliverable.collect) || [];
  const done = refs.filter((r) => get(r) != null).length;
  const complete = done === refs.length;
  const exp = (PROG.deliverable && PROG.deliverable.export) || [];
  const expName = { pdf: 'PDF 문서', zip: 'ZIP(원본 묶음)', csv: 'CSV(표 데이터)' };

  return h('div', { class: 'pv-finale' + (complete ? ' is-complete' : '') },
    h('p', { class: 'pv-finale-title', text: complete ? '수업 완료 — 산출물이 모두 모였습니다' : `진행 중 · 산출물 ${done}/${refs.length}` }),
    h('p', { class: 'pv-prose', text:
      '학생이 만든 것: 화석 사진 · 서식환경 · 연대 측정 · 환경 조사표 · 손그림 · AI 실사 이미지 · 5등급 수집 카드' }),
    h('p', { class: 'pv-prose', text: '내보내기: ' + exp.map((e) => expName[e] || e).join(' · ') }),
  );
}

async function currentScreen() {
  const last = screenCount() - 1;
  if (CUR === 0) return hero();
  if (CUR === last) return finale();
  const steps = stepList();
  const entry = steps[CUR - 1];
  const noInSession = entry.session.steps.indexOf(entry.step) + 1;
  return stepScreen(entry.session, entry.step, noInSession);
}

async function body() {
  const wrap = h('div', { class: 'pv-wrap' });
  wrap.append(stepper());
  wrap.append(h('div', { class: 'pv-screen' }, await currentScreen()));
  wrap.append(navRow());
  return wrap;
}

function updateProgress() {
  const refs = (PROG.deliverable && PROG.deliverable.collect) || [];
  const done = refs.filter((r) => get(r) != null).length;
  const fill = document.getElementById('pv-fill');
  if (fill) fill.style.width = (refs.length ? Math.round((done / refs.length) * 100) : 0) + '%';
}

/* ── 검토용 상태 시드 ──────────────────────────────────── */
async function seedState() {
  const data = await loadFossilData();

  // 신규 블록 3종도 완료 상태로 — 서식환경 뽑기 / 연대측정 제출 / 카드 개봉
  const habitat = data.habitats.find((x) => x.korName.includes('툰드라')) || data.habitats[2];
  set('draw-habitat', {
    habitat, index: data.habitats.indexOf(habitat), drawnAt: new Date().toISOString(),
  });
  const problemIndex = 1; // 토륨-230, 75,000년 전 (후기 플라이스토세) — 매머드류 서사와 맞춤
  const problem = data.datingProblems[problemIndex];
  set('dating-sim', {
    problem, problemIndex,
    answer: String(problem.correctAnswer), correct: true, submittedAt: new Date().toISOString(),
  });

  set('fossil-photo', { url: PLACEHOLDER_PHOTO, name: 'my-fossil.jpg' });
  set('fossil-note', { text: '자연사관 2층 화석 전시실에서 봤다. 돌 속에 조개껍데기가 그대로 박혀 있어 신기했다.' });
  set('env-research', {
    text:
      '툰드라는 연중 대부분 땅이 얼어 있는 영구동토 지대다. 여름이 짧고 서늘하며 강수량이 적다. '
      + '큰 나무가 자라지 못하고 이끼와 지의류, 키 작은 관목이 주로 자란다. 바람이 강하고 겨울이 매우 길다. '
      + '동물은 두꺼운 지방과 털로 추위를 견디고, 눈 아래 먹이를 찾아 이동하며 산다.',
    correct: 4, total: 5, feedback: '기후·지형·식생·동물 적응을 고르게 담았습니다. 계절 변화 서술이 조금 더 있으면 좋아요.',
  });
  set('common-traits', { rows: {
    body: '두꺼운 지방층과 촘촘한 겉털', food: '이끼·지의류·풀뿌리',
    move: '넓은 발굽으로 눈 위를 걷기', temp: '긴 털과 피하지방으로 체온 유지',
    repro: '봄에 한 배만 출산, 새끼를 무리가 함께 보호',
  } });
  set('mid-quiz', { correct: 3, total: 4, answers: { e0: 0, e1: 0, e2: 0, e3: 1 }, questions: [
    { key: 'e0', q: '툰드라 동물이 겨울을 나기에 가장 유리한 몸의 특징은?', choices: ['두꺼운 지방층과 촘촘한 털', '넓고 얇은 잎 모양 귀', '얇고 매끈한 피부', '발광 기관'], answer: 0, why: '툰드라는 매우 춥고 길게 얼어 있어 단열이 생존의 핵심입니다.' },
    { key: 'e1', q: '툰드라에 큰 나무가 잘 자라지 못하는 주된 이유는?', choices: ['영구동토와 짧은 생장기', '너무 잦은 산불', '지나친 강수량', '토양의 높은 염분'], answer: 0, why: '얼어 있는 땅과 짧은 여름 때문에 뿌리가 깊이 못 내리고 생장기가 짧습니다.' },
    { key: 'e2', q: '툰드라 초식동물이 먹이를 얻는 방식으로 가장 알맞은 것은?', choices: ['눈을 헤쳐 이끼·지의류를 먹는다', '나무 열매를 대량으로 저장한다', '물속 플랑크톤을 걸러 먹는다', '수액을 빨아 먹는다'], answer: 0, why: '툰드라의 대표 먹이는 이끼와 지의류이며, 눈 아래에서 찾아 먹습니다.' },
    { key: 'e3', q: '툰드라 환경에서 몸집이 큰 동물이 유리한 이유는?', choices: ['천적이 전혀 없어서', '부피 대비 표면적이 작아 열을 덜 잃어서', '먹이가 매우 풍부해서', '더위를 피하기 쉬워서'], answer: 1, why: '몸집이 클수록 표면적 비율이 낮아 체온 손실이 적습니다(베르그만 법칙).' },
  ] });
  set('sketch', { image: PLACEHOLDER_SKETCH, strokes: new Array(40).fill([0, 0]) });
  set('bio-name', { text: '눈털코뿔소' });
  set('bio-desc', { text:
    '몸길이 3.5m가 넘는 대형 초식동물로, 온몸이 촘촘한 겉털과 두꺼운 지방층으로 덮여 있어 영하 40도의 눈보라도 견딘다. '
    + '넓적하게 자란 앞뿔로 눈을 파헤쳐 그 아래의 이끼와 지의류를 먹고, 되새김질로 에너지를 아낀다. '
    + '넓은 발굽으로 눈 위를 빠지지 않고 걸으며 먹이를 따라 무리 지어 이동한다. '
    + '봄에 한 배에 한 마리를 낳고 무리 전체가 새끼를 감싸 보호하며, 짧은 여름 동안 지방을 최대한 축적해 겨울을 난다.' });
  set('card-info', { polished: true, rows: {
    name: '눈털코뿔소', type: '얼음', habitat: '툰드라',
    ability: '눈폭풍 저항', weakness: '해빙기의 더위',
  } });
  set('ai-image', { url: PLACEHOLDER_IMG });
  set('sketch-vs-ai', { checks: { silhouette: true, ratio: true, traits: true }, note: '실루엣은 잘 유지됐고 털 질감이 훨씬 사실적이 됐다.' });

  // 예시: 친구 카드 2개 획득 + 세션6 게이트 통과
  set('pv-dex', { owned: ['p3', 'p1'], quizzes: {} });
  set('final-quiz', { answers: { a: 1, b: 1, c: 1, d: 1, e: 1 }, correct: 5, total: 5 });

  // 퀴즈 통과 상태가 준비됐으니 카드도 개봉해 둔다.
  const cardBlock = allBlocks().find((b) => b.type === 'card.collect');
  if (cardBlock && !get(cardBlock.id)) {
    try { await cardCollect._open(cardBlock, ctx); } catch { /* 개봉 실패는 무시 */ }
  }
}

/* ── 렌더 루프 ─────────────────────────────────────────── */
let renderToken = 0;
async function render() {
  const my = ++renderToken; // 빠른 연속 이동 시 오래된 렌더가 화면을 덮어쓰지 않도록
  const app = document.getElementById('app');
  const bar = topbar();
  const content = await body();
  if (my !== renderToken) return; // 더 최근 렌더가 시작됨 → 폐기
  app.className = '';
  const kids = [bar, content];
  const share = sharePanel();
  if (share) kids.push(share);
  app.replaceChildren(...kids);
  updateProgress();
}

// 주소창 #번호 로 직접 이동 (북마크·수동 편집)
window.addEventListener('hashchange', () => {
  const n = parseInt((location.hash || '').replace('#', ''), 10);
  if (Number.isInteger(n) && n !== CUR) go(n);
});

// ← → 키로 단계 이동 (입력칸에 있을 땐 무시)
document.addEventListener('keydown', (e) => {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (e.key === 'ArrowRight') { if (screenGate(CUR).ok) go(CUR + 1); }
  else if (e.key === 'ArrowLeft') go(CUR - 1);
});

async function boot() {
  try {
    const res = await fetch(new URL('../programs/p6-fossil-explorer.json', import.meta.url), { cache: 'no-store' });
    PROG = await res.json();
    await loadFossilData();
    // 첫 방문이면 예시 답안이 채워진 "완성된 수업" 상태로 보여준다.
    // ("빈 수업으로 보기"를 누르면 비워지고, 직접 눌러볼 수 있다.)
    if (!get('final-quiz')) await seedState();
    const fromHash = parseInt((location.hash || '').replace('#', ''), 10);
    if (Number.isInteger(fromHash)) CUR = Math.max(0, Math.min(screenCount() - 1, fromHash));
    await render();
  } catch (err) {
    document.getElementById('app').textContent = '시안 로드 실패: ' + err.message;
  }
}

boot();
