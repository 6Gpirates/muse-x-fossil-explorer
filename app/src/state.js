// 개발·데모 전용 상태 셔틀. 병합 시 플랫폼의 state.js가 이 파일을 대신한다.
// 인터페이스: get(id), set(id, value), shrink(dataURL)
const KEY = (id) => 'mx:' + id;
const mem = new Map();

const backing =
  (typeof localStorage !== 'undefined')
    ? localStorage
    : {
        getItem: (k) => (mem.has(k) ? mem.get(k) : null),
        setItem: (k, v) => { mem.set(k, v); },
        removeItem: (k) => { mem.delete(k); },
      };

export function get(id) {
  try {
    const raw = backing.getItem(KEY(id));
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

export function set(id, value) {
  try {
    backing.setItem(KEY(id), JSON.stringify(value));
  } catch {
    /* 저장 실패는 무시(플랫폼도 낙관적 저장) */
  }
}

// 데모에서는 압축 없이 그대로 통과. 플랫폼 shrink가 실제 압축을 담당한다.
export function shrink(dataURL) {
  return Promise.resolve(dataURL);
}

// 테스트 편의
export function _clear() {
  mem.clear();
  try { if (typeof localStorage !== 'undefined') localStorage.clear(); } catch {}
}
