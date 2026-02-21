// Mock for bun:sqlite used during Next.js edge (middleware) webpack compilation.
// bun:sqlite is unavailable in the edge runtime, so this no-op stub satisfies
// the module graph without crashing.
const EMPTY_STMT = {
  all: () => [],
  get: () => null,
  run: () => ({ changes: 0, lastInsertRowid: 0 }),
  values: () => [],
  finalize: () => {},
};

export class Database {
  constructor(_path, _options) {}
  exec(_sql) {
    return this;
  }
  query(_sql) {
    return EMPTY_STMT;
  }
  prepare(_sql) {
    return EMPTY_STMT;
  }
  close() {}
  transaction(fn) {
    return fn;
  }
}
