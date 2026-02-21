// Stub used only in the Next.js edge (middleware) webpack compilation where
// bun:sqlite is unavailable. All methods return safe no-op values so that
// drizzle-orm/bun-sqlite can import without crashing.
const EMPTY_STMT = {
  all: () => [],
  get: () => null,
  run: () => ({ changes: 0, lastInsertRowid: 0 }),
  // drizzle-orm/bun-sqlite's PreparedQuery.get() calls stmt.values()
  values: () => [],
  finalize: () => {},
};

class Database {
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
module.exports = { Database };
