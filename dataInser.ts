/**
 * insertCategories.ts
 *
 * Reads the NCDS category xlsx (4 columns: MAIN CATEGORY, Category 1,
 * Category 2, CATEGORY 3 - an "outline" layout where a blank cell means
 * "same as the value above it", and fully blank rows are just spacers)
 * and inserts it into MongoDB using your MainCategory model.
 *
 * Setup:
 *   npm install xlsx mongoose
 *   npm install -D ts-node typescript @types/node
 *
 * Run directly:
 *   MONGO_URI="mongodb://localhost:27017/yourdb" npx ts-node insertCategories.ts path/to/file.xlsx
 *
 * Or import insertCategoriesFromXlsx(...) into your own app code.
 *
 * IMPORTANT: adjust the import path below to point at your actual model file.
 */

import path from 'path';
import * as XLSX from 'xlsx';
import mongoose from 'mongoose';
import MainCategory, {IMainCategory} from './src/modules/FR/models/category'; // <-- adjust path

// ---- Types for the parsed tree (matches IMainCategory shape minus mongoose extras) ----
type ParsedCat3 = { name: string; narration: string };
type ParsedCat2 = { name: string; subcategory3: ParsedCat3[] };
type ParsedCat1 = { name: string; subcategory2: ParsedCat2[] };
type ParsedMain = { name: string; subcategory1: ParsedCat1[] };

// ---- Parse the xlsx into the nested tree shape ----
function parseWorkbook(filePath: string): ParsedMain[] {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, {header: 1, defval: null, raw: true});

  const mains: ParsedMain[] = [];
  let currentMain: ParsedMain | null = null;
  let currentCat1: ParsedCat1 | null = null;
  let currentCat2: ParsedCat2 | null = null;

  const clean = (v: any) => (typeof v === 'string' ? v.trim() : v);

  function findOrCreate<T extends { name: string }>(
    arr: T[],
    name: string,
    factory: (name: string) => T,
  ): T {
    let node = arr.find((n) => n.name === name);
    if (!node) {
      node = factory(name);
      arr.push(node);
    }
    return node;
  }

  for (const row of rows) {
    const [a, b, c, d] = row.map(clean);

    // fully blank row -> spacer, skip
    if (!a && !b && !c && !d) continue;
    // header row
    if (a === 'MAIN CATEGORY') continue;

    if (a) {
      currentMain = findOrCreate(mains, a, (name) => ({name, subcategory1: []}));
      currentCat1 = null;
      currentCat2 = null;
    }

    if (!currentMain) continue; // safety guard

    if (b) {
      currentCat1 = findOrCreate(currentMain.subcategory1, b, (name) => ({name, subcategory2: []}));
      currentCat2 = null;
    }

    if (c) {
      if (!currentCat1) {
        currentCat1 = findOrCreate(currentMain.subcategory1, '(Uncategorized)', (name) => ({name, subcategory2: []}));
      }
      currentCat2 = findOrCreate(currentCat1.subcategory2, c, (name) => ({name, subcategory3: []}));
    }

    if (d) {
      if (!currentCat2) {
        if (!currentCat1) {
          currentCat1 = findOrCreate(currentMain.subcategory1, '(Uncategorized)', (name) => ({name, subcategory2: []}));
        }
        currentCat2 = findOrCreate(currentCat1.subcategory2, '(Uncategorized)', (name) => ({name, subcategory3: []}));
      }
      if (!currentCat2.subcategory3.find((n) => n.name === d)) {
        currentCat2.subcategory3.push({name: d, narration: ''});
      }
    }
  }

  ensureSelectDefaults(mains);

  return mains;
}

function ensureSelectDefaults(mains: ParsedMain[]): void {
  for (const main of mains) {
    if (main.subcategory1.length === 0) {
      main.subcategory1.push({name: 'Select', subcategory2: []});
    }
    for (const cat1 of main.subcategory1) {
      if (cat1.subcategory2.length === 0) {
        cat1.subcategory2.push({name: 'Select', subcategory3: []});
      }
      for (const cat2 of cat1.subcategory2) {
        if (cat2.subcategory3.length === 0) {
          cat2.subcategory3.push({name: 'Select', narration: ''});
        }
      }
    }
  }
}

interface InsertOptions {
  mongoUri?: string;
  wipe?: boolean;
  manageConnection?: boolean;
}

async function insertCategoriesFromXlsx(filePath: string, opts: InsertOptions = {}) {
  const {
    mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ncds',
    wipe = true,
    manageConnection = true,
  } = opts;

  const parsed = parseWorkbook(filePath);

  console.log(`Parsed ${parsed.length} main categories from ${filePath}`);
  parsed.forEach((m) => {
    const cat1Count = m.subcategory1.length;
    const cat2Count = m.subcategory1.reduce((s, c1) => s + c1.subcategory2.length, 0);
    const cat3Count = m.subcategory1.reduce(
      (s, c1) => s + c1.subcategory2.reduce((s2, c2) => s2 + c2.subcategory3.length, 0), 0,
    );
    console.log(`  - ${m.name}: ${cat1Count} cat1 / ${cat2Count} cat2 / ${cat3Count} cat3`);
  });

  if (manageConnection) {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB:', mongoUri);
  }

  if (wipe) {
    await MainCategory.deleteMany({});
  }
  const inserted = await MainCategory.insertMany(parsed as IMainCategory[]);
  console.log(`Inserted ${inserted.length} main-category documents.`);

  if (manageConnection) {
    await mongoose.disconnect();
  }

  return {parsed, inserted};
}

export {parseWorkbook, insertCategoriesFromXlsx};

// ---- Optional CLI entry point: `npx ts-node insertCategories.ts path/to/file.xlsx` ----
if (require.main === module) {
  const filePath = process.argv[2] || path.join(__dirname, 'data.xlsx');
  insertCategoriesFromXlsx(filePath).catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  });
}
