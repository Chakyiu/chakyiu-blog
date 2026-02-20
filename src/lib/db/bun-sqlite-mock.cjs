class Database {
  constructor(_path, _options) {}
  exec(_sql) { return this; }
  query(_sql) { return { all: () => [], get: () => null, run: () => ({ changes: 0, lastInsertRowid: 0 }) }; }
  prepare(_sql) { return { all: () => [], get: () => null, run: () => ({ changes: 0, lastInsertRowid: 0 }), finalize: () => {} }; }
  close() {}
  transaction(fn) { return fn; }
}
module.exports = { Database };
