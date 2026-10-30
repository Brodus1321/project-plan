// Generate src/db/kurvaSMaster.ts dari KURVA S.xlsx (sheet 'Kurva S').
// Jalankan: node scripts/gen-kurva-master.mjs
import XLSX from 'xlsx';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wb = XLSX.readFile(resolve(root, 'KURVA S.xlsx'));
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Kurva S'], { header: 1, raw: true, defval: '' });

// Baris penanda bagian, bukan item.
const SKIP = new Set(['Persiapan', 'Material Delivery', 'NEW ITEM']);

const toNum = (v) => {
  if (typeof v === 'number') return v;
  if (v === '' || v == null) return 0;
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const isNumeric = (v) => typeof v === 'number' || v === '';

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const items = [];
for (let i = 6; i < rows.length; i++) {
  const r = rows[i];
  const nama = String(r[0] ?? '').trim();
  if (!nama) break;
  if (SKIP.has(nama)) continue;

  const mRaw = r[1];
  const jRaw = r[2];
  const catatan = [
    !isNumeric(mRaw) && String(mRaw).trim() ? String(mRaw).trim() : '',
    !isNumeric(jRaw) && String(jRaw).trim() ? String(jRaw).trim() : '',
  ]
    .filter(Boolean)
    .join(' / ');

  items.push({
    nama,
    material: toNum(mRaw),
    jasa: toNum(jRaw),
    ...(catatan ? { catatan } : {}),
  });
}

let out = `export interface KurvaSMasterItem {
  nama: string;
  material: number;
  jasa: number;
  /**
   * Teks pengganti harga bila sel berisi teks (mis. "At Cost +3%").
   * Sumber: KURVA S.xlsx sheet 'Kurva S', kolom Material & Jasa.
   */
  catatan?: string;
}

/**
 * Daftar progres baku mengikuti header kolom TGL-BLN-THN di KURVA S.xlsx.
 * Bersifat fleksibel - admin boleh menambah / mengubah / menghapus progres.
 */
export const KURVA_S_PROGRES_DEFAULT: string[] = [
  'Persiapan',
  'Material Delivery',
  'Instalasi 1',
  'Instalasi 2',
  'Instalasi 3',
  'Penarikan KU FO',
  'Uji Terima',
];

/**
 * MASTER ITEM KURVA S - hasil generate dari KURVA S.xlsx (sheet 'Kurva S').
 * Sumber kebenaran data item ada di file tersebut; bila master diperbarui,
 * jalankan ulang scripts/gen-kurva-master.mjs lalu timpa daftar ini.
 */
export const KURVA_S_ITEMS: KurvaSMasterItem[] = [
`;

for (const it of items) {
  out += `  { nama: '${esc(it.nama)}', material: ${it.material}, jasa: ${it.jasa}`;
  if (it.catatan) out += `, catatan: '${esc(it.catatan)}'`;
  out += ` },\n`;
}
out += `];
`;

writeFileSync(resolve(root, 'src/db/kurvaSMaster.ts'), out, 'utf8');
console.log(`OK: ${items.length} item -> src/db/kurvaSMaster.ts`);
