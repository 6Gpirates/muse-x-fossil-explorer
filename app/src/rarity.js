// 등급 계산 순수 함수. DOM·상태와 무관. node --test로 검증한다.

/** FNV-1a 32비트 해시 → uint32 */
export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 문자열 → [0,1) 결정적 실수 */
export function seededUnit(str) {
  return fnv1a(String(str)) / 0x100000000;
}

/** key → [0, weight] 결정적 정수 (가챠 "운") */
export function luckRoll(key, weight) {
  return Math.round(seededUnit(String(key)) * weight);
}

/** 비유한수 → 0, 그 외 [0,1]로 클램프 */
export function clamp01(x) {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** parts: Array<{weight, ratio}> → 반올림된 가중합 */
export function detailScore(parts) {
  const raw = parts.reduce((sum, p) => sum + p.weight * clamp01(p.ratio), 0);
  return Math.round(raw);
}

/** tiers(오름차순 min) 중 total 이상인 최고 등급 */
export function pickTier(total, tiers) {
  let chosen = tiers[0];
  for (const t of tiers) if (total >= t.min) chosen = t;
  return chosen;
}

/** 실력 + 운 → 등급 */
export function computeRarity({ parts, luckKey, luckWeight, tiers }) {
  const d = detailScore(parts);
  const l = luckRoll(luckKey, luckWeight);
  const total = Math.min(100, d + l);
  const tier = pickTier(total, tiers);
  return {
    detailScore: d,
    luckRoll: l,
    total,
    stars: tier.stars,
    name: tier.name,
    class: tier.class,
  };
}
