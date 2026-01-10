import { db } from './index';
import { wines } from './schema';
import { desc, eq, and, like, or } from 'drizzle-orm';

export async function getWines({ 
  limit = 12, 
  offset = 0,
  country,
  grape,
  vintage,
  search
}: { 
  limit?: number; 
  offset?: number;
  country?: string;
  grape?: string;
  vintage?: string;
  search?: string;
} = {}) {
  const conditions = [];

  if (country) conditions.push(eq(wines.country, country));
  if (grape) conditions.push(eq(wines.grape, grape));
  if (vintage) conditions.push(eq(wines.vintage, vintage));
  if (search) {
    conditions.push(
      or(
        like(wines.title, `%${search}%`),
        like(wines.producer, `%${search}%`),
        like(wines.notes, `%${search}%`)
      )
    );
  }

  return db.query.wines.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(wines.isoCreatedAt)],
    limit,
    offset,
  });
}

export async function getFilterMetadata() {
  const allWines = await db.select({
    country: wines.country,
    grape: wines.grape,
    vintage: wines.vintage,
  }).from(wines);

  const countries = Array.from(new Set(allWines.map(w => w.country).filter(Boolean))) as string[];
  const grapes = Array.from(new Set(allWines.map(w => w.grape).filter(Boolean))) as string[];
  const vintages = Array.from(new Set(allWines.map(w => w.vintage).filter(Boolean))) as string[];

  return {
    countries: countries.sort(),
    grapes: grapes.sort(),
    vintages: vintages.sort().reverse(),
  };
}
