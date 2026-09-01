// 테스트용 가짜 ctx. 블록의 complete/missing/summary가 기대하는 최소 표면만 제공.
export function makeCtx(overrides = {}) {
  return {
    studentKey: undefined,
    refreshFooter() {},
    assembledPrompt() { return ''; },
    summaryOf() { return null; },
    getValue() { return null; },
    peers() { return []; },
    publishPeer() {},
    onTeardown() {},
    checklist() { return []; },
    ...overrides,
  };
}
