// Mock for bun:sqlite used during Next.js build time (Node.js workers can't require bun:sqlite)
// This is a no-op stub that satisfies the module resolution without crashing.
export class Database {
  constructor(_path, _options) {}
  exec(_sql) { return this; }
  query(_sql) { return { all: () => [], get: () => null, run: () => ({ changes: 0, lastInsertRowid: 0 }) }; }
  prepare(_sql) { return { all: () => [], get: () => null, run: () => ({ changes: 0, lastInsertRowid: 0 }), finalize: () => {} }; }
  close() {}
  transaction(fn) { return fn; }
}
