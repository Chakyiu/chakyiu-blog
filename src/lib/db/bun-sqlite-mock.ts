export class Database {
  constructor(_path: string, _options?: unknown) {}
  exec(_sql: string) { return this }
  query(_sql: string) { return { all: () => [], get: () => null, run: () => null } }
  close() {}
}
