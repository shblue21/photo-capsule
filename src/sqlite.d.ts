// Ambient type declaration for node:sqlite (not yet in @types/node@22)
declare module 'node:sqlite' {
  interface StatementResultingChanges {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  interface StatementSync<T = Record<string, unknown>> {
    run(...params: unknown[]): StatementResultingChanges;
    get(...params: unknown[]): T | undefined;
    all(...params: unknown[]): T[];
  }

  interface DatabaseSyncOptions {
    open?: boolean;
    readOnly?: boolean;
    enableForeignKeyConstraints?: boolean;
    enableDoubleQuotedStringLiterals?: boolean;
    allowExtension?: boolean;
    timeout?: number;
  }

  class DatabaseSync {
    constructor(location: string, options?: DatabaseSyncOptions);
    open(): void;
    close(): void;
    exec(sql: string): void;
    prepare<T = Record<string, unknown>>(sql: string): StatementSync<T>;
  }
}
