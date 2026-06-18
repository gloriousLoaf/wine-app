import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

export type DatabaseType = ReturnType<typeof drizzle<typeof schema>>;

let _db: DatabaseType | undefined;

function initDb(): DatabaseType {
  if (!_db) {
    _db = drizzle(
      createClient({
        url: process.env.TURSO_CONNECTION_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }),
      { schema }
    );
  }
  return _db;
}

// Proxy defers client creation until first use, when env vars are available
export const db = new Proxy({} as DatabaseType, {
  get(_, prop: string | symbol) {
    const instance = initDb();
    const val = (instance as any)[prop];
    return typeof val === 'function' ? val.bind(instance) : val;
  },
});
