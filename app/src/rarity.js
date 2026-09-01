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
