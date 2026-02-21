const EMPTY_STMT = {
  all: () => [],
  get: () => null,
  run: () => null,
  values: () => [],
  finalize: () => {},
};

export class Database {
  constructor(_path: string, _options?: unknown) {}
  exec(_sql: string) {
    return this;
  }
  query(_sql: string) {
    return EMPTY_STMT;
  }
  prepare(_sql: string) {
    return EMPTY_STMT;
  }
  close() {}
  transaction(fn: (...args: unknown[]) => unknown) {
    return fn;
  }
}
