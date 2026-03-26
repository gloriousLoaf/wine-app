import { db } from './index';
import { wines } from './schema';
import { desc, eq, and, like, or, sql } from 'drizzle-orm';

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

export async function getTotalWinesCount() {
  const result = await db.select({ count: sql<number>`count(*)` }).from(wines);
  return result[0].count;
}

export async function getBottleStats() {
  const result = await db.select({
    earliest: sql<string>`min(${wines.isoCreatedAt})`,
    latest: sql<string>`max(${wines.isoCreatedAt})`
  }).from(wines);
  
  return {
    earliest: result[0].earliest,
    latest: result[0].latest
  };
}

export async function getWinesForEdit(search?: string) {
  const conditions = [];

  if (search) {
    conditions.push(
      or(
        like(wines.title, `%${search}%`),
        like(wines.producer, `%${search}%`)
      )
    );
  } else {
    // If no search, show a sample of wines missing metadata
    conditions.push(
      or(
        eq(wines.country, 'Unknown'),
        eq(wines.grape, 'Unknown'),
        sql`${wines.country} IS NULL`,
        sql`${wines.grape} IS NULL`
      )
    );
  }

  return db.query.wines.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(wines.isoCreatedAt)],
    limit: 50,
  });
}
