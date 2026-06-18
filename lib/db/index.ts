import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client/web';
import * as schema from './schema';

export type DatabaseType = ReturnType<typeof drizzle<typeof schema>>;

let _db: DatabaseType | undefined;

function initDb(): DatabaseType {
  if (!_db) {
    console.log('[db] url prefix:', process.env.TURSO_CONNECTION_URL?.slice(0, 15));
    console.log('[db] token length:', process.env.TURSO_AUTH_TOKEN?.length ?? 0);
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
    const val = Reflect.get(instance, prop, instance);
    return typeof val === 'function' ? val.bind(instance) : val;
  },
});
