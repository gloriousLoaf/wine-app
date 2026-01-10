import { NextRequest, NextResponse } from 'next/server';
import { getWines } from '../../../lib/db/repo';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '12');
  const offset = parseInt(searchParams.get('offset') || '0');
  const country = searchParams.get('country') || undefined;
  const grape = searchParams.get('grape') || undefined;
  const vintage = searchParams.get('vintage') || undefined;
  const search = searchParams.get('search') || undefined;

  const winesData = await getWines({ limit, offset, country, grape, vintage, search });
  return NextResponse.json(winesData);
}
