import { NextRequest, NextResponse } from 'next/server';
import { getWines } from '../../../lib/db/repo';
import { parseWineQuery } from '../../../lib/query-params';
import { COLLECTION_CACHE_CONTROL } from '../../../lib/cache-control';

/**
 * This is the layer that makes repeat traffic free: an edge hit never invokes
 * the Worker, so it never reaches D1. It only takes effect once a Cache Rule
 * exists for this path — Cloudflare does not cache /api/* by default. The zone
 * configuration this depends on is recorded in the README.
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Every value is clamped and normalized before it can reach the query
  // builder. Previously `limit` went through a bare parseInt straight into the
  // query, so ?limit=1000000 returned the entire table in one request.
  const query = parseWineQuery(searchParams);

  const winesData = await getWines(query);

  return NextResponse.json(winesData, {
    headers: { 'Cache-Control': COLLECTION_CACHE_CONTROL },
  });
}
