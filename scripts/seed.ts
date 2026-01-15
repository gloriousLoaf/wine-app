import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { wines } from '../lib/db/schema';
import * as fs from 'fs';
import * as path from 'path';

const client = createClient({ url: 'file:sqlite.db' });
const db = drizzle(client);

const JSON_PATH = path.join(process.cwd(), 'delectable', 'wines.json');
const IMAGES_DIR = path.join(process.cwd(), 'delectable', 'wine_images');

interface RawWine {
  producer: string;
  title: string;
  vintage: string;
  notes: string;
  image_url: string;
  iso_created_at: string;
  image_title: string;
}

const COUNTRY_MAPPING: Record<string, string> = {
  'Rioja': 'Spain',
  'Ribera del Duero': 'Spain',
  'Priorat': 'Spain',
  'Jumilla': 'Spain',
  'Montsant': 'Spain',
  'Penedès': 'Spain',
  'Rias Baixas': 'Spain',
  'Bordeaux': 'France',
  'Burgundy': 'France',
  'Bourgogne': 'France',
  'Rhône': 'France',
  'Châteauneuf-du-Pape': 'France',
  'Champagne': 'France',
  'Loire': 'France',
  'Sancerre': 'France',
  'Vouvray': 'France',
  'Bandol': 'France',
  'Languedoc': 'France',
  'Provence': 'France',
  'Beaujolais': 'France',
  'Alsace': 'France',
  'Savoie': 'France',
  'Jura': 'France',
  'Napa Valley': 'USA',
  'Sonoma': 'USA',
  'Anderson Valley': 'USA',
  'Santa Barbara': 'USA',
  'Willamette Valley': 'USA',
  'Oregon': 'USA',
  'Washington': 'USA',
  'Finger Lakes': 'USA',
  'Wachau': 'Austria',
  'Burgenland': 'Austria',
  'Kamptal': 'Austria',
  'Kremstal': 'Austria',
  'Piedmont': 'Italy',
  'Tuscany': 'Italy',
  'Chianti': 'Italy',
  'Barolo': 'Italy',
  'Barbaresco': 'Italy',
  'Sicily': 'Italy',
  'Sicilia': 'Italy',
  'Etna': 'Italy',
  'Abruzzo': 'Italy',
  'Veneto': 'Italy',
  'Mosel': 'Germany',
  'Nahe': 'Germany',
  'Rheingau': 'Germany',
  'Rheinhessen': 'Germany',
  'Pfalz': 'Germany',
  'Marlborough': 'New Zealand',
  'Central Otago': 'New Zealand',
  'Stellenbosch': 'South Africa',
  'Western Cape': 'South Africa',
};

const GRAPE_MAPPING: string[] = [
  'Riesling', 'Chardonnay', 'Sauvignon Blanc', 'Chenin Blanc', 'Pinot Gris', 'Pinot Grigio', 
  'Grüner Veltliner', 'Viognier', 'Albariño', 'Vermentino', 'Marsanne', 'Roussanne', 'Garganega',
  'Cabernet Sauvignon', 'Merlot', 'Pinot Noir', 'Syrah', 'Shiraz', 'Grenache', 'Garnacha', 
  'Tempranillo', 'Nebbiolo', 'Sangiovese', 'Zinfandel', 'Gamay', 'Malbec', 'Carmenere', 
  'Mourvedre', 'Monastrell', 'Barbera', 'Dolcetto', 'Nerello Mascalese', 'Agiorgitiko', 
  'Xinomavro', 'Furmint', 'Blaufränkisch', 'Sankt Laurent', 'Zweigelt'
];

function normalize(s: string) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

async function seed() {
  console.log('🌱 Seeding process started...');

  if (!fs.existsSync(JSON_PATH)) {
    console.error(`❌ JSON file not found at ${JSON_PATH}`);
    process.exit(1);
  }

  const data: RawWine[] = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
  const localFiles = fs.existsSync(IMAGES_DIR) ? fs.readdirSync(IMAGES_DIR) : [];
  const fileSet = new Set(localFiles);
  const normalizedFileMap = new Map();
  localFiles.forEach(f => normalizedFileMap.set(normalize(f), f));

  console.log(`📦 Loaded ${data.length} wines from JSON.`);

  const toInsert = data.map((item) => {
    let country = null;
    let grape = null;

    // Best guess for country
    for (const [region, c] of Object.entries(COUNTRY_MAPPING)) {
      if (item.title.toLowerCase().includes(region.toLowerCase()) || 
          item.producer.toLowerCase().includes(region.toLowerCase())) {
        country = c;
        break;
      }
    }

    // Best guess for grape
    for (const g of GRAPE_MAPPING) {
      if (item.title.toLowerCase().includes(g.toLowerCase())) {
        grape = g;
        break;
      }
    }

    // Smart image resolution
    let finalImageTitle = item.image_title;
    let finalImagePath = `/images/wines/${item.image_title}`;

    if (!fileSet.has(item.image_title)) {
      // Try normalized match (accents, etc.)
      const norm = normalize(item.image_title);
      if (normalizedFileMap.has(norm)) {
        finalImageTitle = normalizedFileMap.get(norm);
        finalImagePath = `/images/wines/${finalImageTitle}`;
      } else {
        // Try including producer name if missing
        const withProducer = normalize(`${item.vintage}_${item.producer}_${item.title}.jpg`);
        if (normalizedFileMap.has(withProducer)) {
          finalImageTitle = normalizedFileMap.get(withProducer);
          finalImagePath = `/images/wines/${finalImageTitle}`;
        } else {
          // Fallback to remote URL
          console.log(`⚠️ Falling back to remote URL for: ${item.title}`);
          finalImagePath = item.image_url;
        }
      }
    }

    return {
      producer: item.producer,
      title: item.title,
      vintage: item.vintage,
      notes: item.notes || '',
      imageTitle: finalImageTitle,
      imagePath: finalImagePath,
      extImageUrl: item.image_url,
      isoCreatedAt: item.iso_created_at,
      country,
      grape,
    };
  });

  // Clear existing data for thorough re-seed
  console.log('🗑️ Clearing existing wines...');
  db.delete(wines).run();

  // Batch insert
  console.log('💾 Inserting into database...');
  for (let i = 0; i < toInsert.length; i += 100) {
    const batch = toInsert.slice(i, i + 100);
    db.insert(wines).values(batch).run();
    console.log(`✅ Inserted batch ${i / 100 + 1}`);
  }

  console.log('✨ Seeding complete!');
}

seed().catch(console.error);
