import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, '..', 'sales.csv');

// ── CSV parser simples (lida com campos entre aspas) ────────────────────────
function parseCSV(content) {
  const lines = content.split('\n').filter((l) => l.trim());
  const headers = splitCSVLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line);
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (values[i] ?? '').trim()]));
  });
}

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// ── MongoDB ──────────────────────────────────────────────────────────────────
const schema = new mongoose.Schema(
  { email: { type: String, required: true, unique: true, lowercase: true, trim: true }, discordId: { type: String, default: null } },
  { collection: 'kiwify-members', timestamps: true }
);
const KiwifyMember = mongoose.model('KiwifyMember', schema);

// ── Main ─────────────────────────────────────────────────────────────────────
console.log('[Import] Starting sales import from sales.csv...');

if (!fs.existsSync(CSV_PATH)) {
  console.error(`[Import] File not found: ${CSV_PATH}`);
  process.exit(1);
}

console.log(`[Import] Reading file: ${CSV_PATH}`);
const content = fs.readFileSync(CSV_PATH, 'utf-8');
const rows = parseCSV(content);
console.log(`[Import] Total rows parsed: ${rows.length}`);

const paid = rows.filter((r) => r['Status']?.toLowerCase() === 'paid');
console.log(`[Import] Rows with status "paid": ${paid.length}`);

const skipped = rows.length - paid.length;
if (skipped > 0) {
  console.log(`[Import] Skipped ${skipped} row(s) with non-paid status`);
}

console.log(`\n[Import] Connecting to MongoDB...`);
await mongoose.connect(process.env.MONGODB_URI);
console.log('[Import] Connected\n');

let inserted = 0;
let duplicates = 0;
let errors = 0;

for (const row of paid) {
  const email = row['Email']?.trim().toLowerCase();

  if (!email) {
    console.warn(`[Import] Row skipped — missing email: ${JSON.stringify(row)}`);
    errors++;
    continue;
  }

  try {
    const existing = await KiwifyMember.findOne({ email });

    if (existing) {
      console.log(`[Import] Already exists, skipping: ${email}`);
      duplicates++;
    } else {
      await KiwifyMember.create({ email, discordId: null });
      console.log(`[Import] Inserted: ${email}`);
      inserted++;
    }
  } catch (err) {
    console.error(`[Import] Error inserting "${email}":`, err.message);
    errors++;
  }
}

console.log(`
[Import] ─────────────────────────────
[Import] Done.
[Import]   Inserted:   ${inserted}
[Import]   Duplicates: ${duplicates}
[Import]   Errors:     ${errors}
[Import] ─────────────────────────────
`);

await mongoose.disconnect();
console.log('[Import] MongoDB disconnected. Bye.');
