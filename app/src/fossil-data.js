// 콘텐츠 번들을 1회 로드해 캐시한다.
let _cache = null;

export async function loadFossilData(baseUrl) {
  if (_cache) return _cache;
  const url = new URL('../content/fossil-explorer.json', baseUrl || import.meta.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error('fossil-explorer.json 로드 실패: ' + res.status);
  _cache = await res.json();
  return _cache;
}

export function _resetCache() {
  _cache = null;
}
