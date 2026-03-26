import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { wines } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const connectionUrl = process.env.TURSO_CONNECTION_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!connectionUrl || !authToken) {
  console.error('❌ Missing environment variables. Please check .env');
  process.exit(1);
}

const client = createClient({ url: connectionUrl, authToken });
const db = drizzle(client);

// Comprehensive Mappings
const COUNTRY_MAPPING: Record<string, string> = {
  // Direct matches
  'france': 'France', 'italy': 'Italy', 'spain': 'Spain', 'usa': 'USA', 'germany': 'Germany', 
  'austria': 'Austria', 'new zealand': 'New Zealand', 'south africa': 'South Africa', 
  'portugal': 'Portugal', 'chile': 'Chile', 'argentina': 'Argentina', 'australia': 'Australia',
  // Europe
  'rioja': 'Spain', 'ribera del duero': 'Spain', 'priorat': 'Spain', 'jumilla': 'Spain', 
  'montsant': 'Spain', 'penedès': 'Spain', 'rias baixas': 'Spain', 'cava': 'Spain', 'jerez': 'Spain', 'sherry': 'Spain',
  'bordeaux': 'France', 'burgundy': 'France', 'bourgogne': 'France', 'rhône': 'France', 
  'châteauneuf-du-pape': 'France', 'champagne': 'France', 'loire': 'France', 'sancerre': 'France', 
  'vouvray': 'France', 'bandol': 'France', 'languedoc': 'France', 'provence': 'France', 
  'beaujolais': 'France', 'alsace': 'France', 'savoie': 'France', 'jura': 'France', 'chablis': 'France',
  'piedmont': 'Italy', 'tuscany': 'Italy', 'chianti': 'Italy', 'barolo': 'Italy', 
  'barbaresco': 'Italy', 'sicily': 'Italy', 'sicilia': 'Italy', 'etna': 'Italy', 'brunello': 'Italy',
  'abruzzo': 'Italy', 'veneto': 'Italy', 'campania': 'Italy', 'puglia': 'Italy', 'sardinia': 'Italy',
  'mosel': 'Germany', 'nahe': 'Germany', 'rheingau': 'Germany', 'rheinhessen': 'Germany', 'pfalz': 'Germany',
  'wachau': 'Austria', 'burgenland': 'Austria', 'kamptal': 'Austria', 'kremstal': 'Austria',
  'porto': 'Portugal', 'port ': 'Portugal', 'douro': 'Portugal', 'madeira': 'Portugal',
  // New World
  'napa': 'USA', 'sonoma': 'USA', 'anderson valley': 'USA', 'santa barbara': 'USA', 
  'willamette': 'USA', 'oregon': 'USA', 'washington': 'USA', 'finger lakes': 'USA', 'paso robles': 'USA', 'california': 'USA',
  'marlborough': 'New Zealand', 'central otago': 'New Zealand', 'martinborough': 'New Zealand',
  'stellenbosch': 'South Africa', 'western cape': 'South Africa', 'swartland': 'South Africa',
  'mendoza': 'Argentina', 'patagonia': 'Argentina',
  'maipo': 'Chile', 'colchagua': 'Chile', 'casablanca': 'Chile',
  'barossa': 'Australia', 'mclaren vale': 'Australia', 'margaret river': 'Australia', 'hunter valley': 'Australia', 'yarra': 'Australia',
};

const GRAPE_MAPPING: string[] = [
  'Riesling', 'Chardonnay', 'Sauvignon Blanc', 'Chenin Blanc', 'Pinot Gris', 'Pinot Grigio', 
  'Grüner Veltliner', 'Viognier', 'Albariño', 'Vermentino', 'Marsanne', 'Roussanne', 'Garganega',
  'Gewürztraminer', 'Sémillon', 'Muscat', 'Moscato', 'Assyrtiko', 'Cortese', 'Fiano', 'Falanghina',
  'Cabernet Sauvignon', 'Merlot', 'Pinot Noir', 'Syrah', 'Shiraz', 'Grenache', 'Garnacha', 
  'Tempranillo', 'Nebbiolo', 'Sangiovese', 'Zinfandel', 'Gamay', 'Malbec', 'Carmenere', 
  'Mourvedre', 'Monastrell', 'Barbera', 'Dolcetto', 'Nerello Mascalese', 'Agiorgitiko', 
  'Xinomavro', 'Furmint', 'Blaufränkisch', 'Sankt Laurent', 'Zweigelt', 'Cabernet Franc',
  'Petit Verdot', 'Petite Sirah', 'Cinsault', 'Carignan', 'Mourvèdre', 'Touriga Nacional', 'Melon de Bourgogne', 'Glera'
];

async function enrich() {
  console.log('🔍 Starting Data Enrichment...');
  const allWines = await db.select().from(wines);
  console.log(`📦 Found ${allWines.length} wines in database.`);

  let updatedCount = 0;

  for (const wine of allWines) {
    let newCountry = wine.country;
    let newGrape = wine.grape;
    const searchString = `${wine.title} ${wine.producer} ${wine.notes}`.toLowerCase();

    // 1. Better Country Matching
    if (!newCountry || newCountry === 'Unknown') {
      for (const [region, country] of Object.entries(COUNTRY_MAPPING)) {
        if (searchString.includes(region)) {
          newCountry = country;
          break;
        }
      }
    }

    // 2. Better Grape Matching
    if (!newGrape || newGrape === 'Unknown') {
      for (const grape of GRAPE_MAPPING) {
        if (searchString.includes(grape.toLowerCase())) {
          newGrape = grape;
          break;
        }
      }
      
      // Look for Blends if specific grape not found
      if (!newGrape) {
        if (searchString.includes('red blend') || searchString.includes('bourdeaux blend') || searchString.includes('rhone blend')) {
          newGrape = 'Red Blend';
        } else if (searchString.includes('white blend')) {
          newGrape = 'White Blend';
        } else if (searchString.includes('sparkling blend') || searchString.includes('champagne')) {
           newGrape = 'Sparkling Blend';
        } else if (searchString.includes('rosé') || searchString.includes('rose blend')) {
           newGrape = 'Rosé Blend';
        }
      }
    }

    if (newCountry !== wine.country || newGrape !== wine.grape) {
      await db.update(wines)
        .set({ country: newCountry, grape: newGrape })
        .where(eq(wines.id, wine.id));
      
      updatedCount++;
    }
  }

  console.log(`✨ Enrichment complete! Updated ${updatedCount} wines with new metadata.`);
}

enrich().catch(console.error);
