import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const connectionUrl = process.env.TURSO_CONNECTION_URL!;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ 
  url: connectionUrl, 
  authToken 
});

export const db = drizzle(client, { schema });
export type DatabaseType = typeof db;
