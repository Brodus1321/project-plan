// Generate src/db/boqSwakelola.ts dari BOQ SWAKELOLA.xlsx (sheet 'New KHS OSP-FO 2025').
// Jalankan: node scripts/gen-boq-swakelola.mjs
import XLSX from 'xlsx';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wb = XLSX.readFile(resolve(root, 'BOQ SWAKELOLA.xlsx'));
const sheetName = wb.SheetNames[0];
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
  header: 1,
  raw: true,
  defval: '',
});

const isNumeric = (v) => typeof v === 'number';
// Sel teks (mis. "At Cost +3%") bukan angka - harga disimpan sebagai catatan.
const hargaAtauCatatan = (v) =>
  isNumeric(v) ? { harga: Number.isFinite(v) ? v : 0 } : { harga: 0, catatan: String(v).trim() };

const esc = (s) =>
  String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');

// Baris 0-2 = judul + sub-judul, data mulai baris ke-3.
// Kolom: 0 No | 1 Designator | 2 Designator Material | 3 Designator Jasa
//        4 Uraian Pekerjaan | 5 Satuan | 6 Material (harga) | 7 Jasa (harga)
const items = [];
for (let i = 3; i < rows.length; i++) {
  const r = rows[i] ?? [];
  const designator = String(r[1] ?? '').trim();
  if (!designator) continue;

  const mat = hargaAtauCatatan(r[6]);
  const jasa = hargaAtauCatatan(r[7]);
  const catatan = [...new Set([mat.catatan, jasa.catatan].filter(Boolean))].join(' / ');

  items.push({
    designator,
    uraian: String(r[4] ?? '').trim(),
    satuan: String(r[5] ?? '').trim(),
    material: mat.harga,
    jasa: jasa.harga,
    ...(catatan ? { catatan } : {}),
  });
}

let out = `export interface BoqSwakelolaItem {
  designator: string;
  uraian: string;
  satuan: string;
  /** Harga satuan Material (Rp). */
  material: number;
  /** Harga satuan Jasa (Rp). */
  jasa: number;
  /**
   * Teks pengganti harga bila sel berisi teks (mis. "At Cost +3%").
   * Sumber: BOQ SWAKELOLA.xlsx sheet 'New KHS OSP-FO 2025', kolom Material & Jasa.
   */
  catatan?: string;
}

/**
 * MASTER BOQ SWAKELOLA (COST STRUCTURE) - hasil generate dari BOQ SWAKELOLA.xlsx.
 * Sumber kebenaran data ada di file tersebut; bila master diperbarui,
 * jalankan ulang scripts/gen-boq-swakelola.mjs lalu timpa daftar ini.
 */
export const BOQ_SWAKELOLA_ITEMS: BoqSwakelolaItem[] = [
`;

for (const it of items) {
  out += `  { designator: '${esc(it.designator)}', uraian: '${esc(it.uraian)}', satuan: '${esc(
    it.satuan
  )}', material: ${it.material}, jasa: ${it.jasa}`;
  if (it.catatan) out += `, catatan: '${esc(it.catatan)}'`;
  out += ` },\n`;
}
out += '];\n';

writeFileSync(resolve(root, 'src/db/boqSwakelola.ts'), out, 'utf8');
console.log(`OK: ${items.length} item -> src/db/boqSwakelola.ts`);
