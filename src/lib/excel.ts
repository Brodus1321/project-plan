import * as XLSX from 'xlsx';
import { BoqSpkRow, LampiranHargaRow } from '../types';

/**
 * Pembaca BOQ DRM (SheetJS).
 * Membaca workbook yang diunggah, mengambil preview tabel, dan merangkum
 * nilai total untuk digenerate ke dokumen berkas.
 */

export interface BoqPreviewRow {
  cells: string[];
}

export interface BoqParseResult {
  fileName: string;
  sheetNames: string[];
  activeSheet: string;
  header: string[];
  preview: BoqPreviewRow[];
  totalRows: number;
  totalCols: number;
  /** Jumlah baris data (setelah baris judul). */
  jumlahItem: number;
  /** Kolom yang terbaca sebagai kolom total (null bila tidak ditemukan). */
  totalColumnLabel: string | null;
  /** Hasil jumlahkan kolom total (null bila tidak ada angka). */
  totalNilai: number | null;
  /** Waktu parse, untuk ditampilkan sebagai bukti pembacaan. */
  parsedAt: string;
}

const MAX_PREVIEW_ROWS = 10;
const MAX_PREVIEW_COLS = 8;

const TOTAL_HEADER_RE = /^(total|jumlah|nilai\s*total|subtotal|grand\s*total|harga\s*total)/i;

function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? value.toLocaleString('id-ID')
      : value.toLocaleString('id-ID', { maximumFractionDigits: 2 });
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const cleaned = value
    .replace(/[^\d,.\-]/g, '')
    .replace(/\.(?=\d{3}\b)/g, '')
    .replace(',', '.');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Sel benar-benar berisi angka (bukan teks yang kebetulan mengandung digit).
 * `toNumber('X-1')` menghasilkan -1, sehingga kolom Designator seperti
 * "BC-TR-0.6" / "X-1" tidak boleh dihitung sebagai kolom nilai.
 */
function isSelAngka(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  if (value === null || value === undefined) return false;
  const s = String(value).trim();
  if (!s) return false;
  return /^[-+]?\d{1,3}([.,]\d{3})*([.,]\d+)?%?$/.test(s) || /^[-+]?\d+(\.\d+)?%?$/.test(s);
}

function isHeaderRow(row: unknown[]): boolean {
  const filled = row.filter(c => String(c ?? '').trim() !== '');
  if (filled.length < 2) return false;
  return filled.every(c => typeof c !== 'number');
}

/** Parse workbook BOQ menjadi preview + rangkuman. Lempar Error baca gagal. */
export async function parseBoqWorkbook(file: File): Promise<BoqParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  const sheetNames = workbook.SheetNames;
  if (!sheetNames.length) {
    throw new Error('File tidak memiliki sheet/worksheet.');
  }

  const activeSheet = sheetNames[0];
  const worksheet = workbook.Sheets[activeSheet];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    raw: true,
    defval: '',
    blankrows: false,
  });

  if (!grid.length) {
    throw new Error(`Sheet "${activeSheet}" kosong.`);
  }

  // Baris judul = baris pertama yang punya >=2 kolom terisi dan bukan angka.
  let headerIndex = grid.findIndex(isHeaderRow);
  if (headerIndex < 0) headerIndex = 0;

  const rawHeader = grid[headerIndex] ?? [];
  const header = rawHeader.map((c, i) => (toText(c) || `Kolom ${i + 1}`));
  const totalCols = header.length;

  const dataRows = grid.slice(headerIndex + 1);
  const jumlahItem = dataRows.length;

  // Cari kolom total: cocokkan judul, kalau tidak ada pakai kolom numerik terbanyak.
  let totalIdx = header.findIndex(h => TOTAL_HEADER_RE.test(h.trim()));
  let totalColumnLabel = totalIdx >= 0 ? header[totalIdx] : null;

  if (totalIdx < 0) {
    let bestIdx = -1;
    let bestCount = 0;
    header.forEach((_, col) => {
      const count = dataRows.filter(r => toNumber(r?.[col]) !== null).length;
      if (count > bestCount) {
        bestCount = count;
        bestIdx = col;
      }
    });
    if (bestCount > 0 && bestIdx >= 0) {
      totalIdx = bestIdx;
      totalColumnLabel = header[bestIdx];
    }
  }

  let totalNilai: number | null = null;
  if (totalIdx >= 0) {
    const sum = dataRows.reduce((acc, row) => {
      const n = toNumber(row?.[totalIdx]);
      return acc + (n ?? 0);
    }, 0);
    totalNilai = sum > 0 ? sum : null;
  }

  const preview: BoqPreviewRow[] = dataRows.slice(0, MAX_PREVIEW_ROWS).map(row => ({
    cells: header.slice(0, MAX_PREVIEW_COLS).map((_, col) => toText(row?.[col])),
  }));

  return {
    fileName: file.name,
    sheetNames,
    activeSheet,
    header: header.slice(0, MAX_PREVIEW_COLS),
    preview,
    totalRows: dataRows.length,
    totalCols,
    jumlahItem,
    totalColumnLabel,
    totalNilai,
    parsedAt: new Date().toISOString(),
  };
}

const DESIGNATOR_RE = /(designator|kode|item|uraian|nama|material|barang|description)/i;
const HARGA_RE = /(harga|price|nilai|rupiah|amount|tarif|cost)/i;
const VOL_RE = /(vol(ume)?\b|qty|kuantitas|quantity)/i;
const SKIP_RE = /^(no\.?|nomor|#|urut)$/i;
const HEADER_ANY_RE =
  /(designator|kode|item|uraian|nama|material|harga|price|vol(ume)?|qty|kuantitas|jumlah)/i;
const TOTAL_LINE_RE = /^(total|subtotal|grand\s*total|jumlah\s*(harga|total|biaya)?)\b/i;

function findCol(header: string[], re: RegExp): number {
  return header.findIndex(h => re.test(h.trim()) && !SKIP_RE.test(h.trim()));
}

/**
 * Baris Lampiran Harga format lama (Designator | Harga | Vol).
 * Masih dibaca untuk file lama — nilainya dipetakan ke kolom Kesepakatan.
 */
interface HargaVolRow {
  designator: string;
  harga: number;
  vol: number;
}

/** Deteksi & petakan grid format lama: Designator | Harga | Vol. */
function parseGridHargaVol(cells: string[][]): HargaVolRow[] {
  if (!cells.length) throw new Error('Tidak ada baris data yang terbaca.');

  const header = cells[0];
  const adaJudul =
    header.some(c => HEADER_ANY_RE.test(c.trim())) || header.every(c => toNumber(c) === null);
  const dataRows = adaJudul ? cells.slice(1) : cells;
  if (!dataRows.length) throw new Error('Tidak ada baris data setelah baris judul.');

  const cols = header.map((_, i) => i);
  const textCount = cols.map(col =>
    dataRows.filter(r => toNumber(r[col]) === null && (r[col] ?? '').trim() !== '').length
  );
  const numCount = cols.map(col => dataRows.filter(r => toNumber(r[col]) !== null).length);

  let designatorIdx = adaJudul ? findCol(header, DESIGNATOR_RE) : -1;
  if (designatorIdx < 0 || textCount[designatorIdx] === 0) {
    designatorIdx = textCount.reduce((best, c, i) => (c > textCount[best] ? i : best), -1);
    if (designatorIdx < 0 || textCount[designatorIdx] === 0) designatorIdx = 0;
  }

  // Kolom "No." (baris pertama, urutan 1..n) disingkirkan dari kandidat angka.
  const isNoCol = (col: number) => {
    if (col !== 0 || designatorIdx <= 0 || numCount[col] === 0) return false;
    const vals = dataRows.map(r => toNumber(r[col])).filter((n): n is number => n !== null);
    return (
      vals.length > 0 &&
      vals.every(v => Number.isInteger(v) && v >= 1) &&
      Math.max(...vals) <= vals.length
    );
  };
  const kandidat = cols.filter(col => col !== designatorIdx && numCount[col] > 0 && !isNoCol(col));

  let hargaIdx = adaJudul ? findCol(header, HARGA_RE) : -1;
  let volIdx = adaJudul ? findCol(header, VOL_RE) : -1;
  if (hargaIdx < 0 || hargaIdx === designatorIdx || numCount[hargaIdx] === 0) {
    hargaIdx = kandidat[0] ?? -1;
  }
  if (volIdx < 0 || volIdx === hargaIdx || volIdx === designatorIdx || numCount[volIdx] === 0) {
    volIdx = kandidat.find(c => c !== hargaIdx) ?? -1;
  }

  const rows: HargaVolRow[] = [];
  for (const r of dataRows) {
    const designator = (r[designatorIdx] ?? '').trim();
    const harga = hargaIdx >= 0 ? (toNumber(r[hargaIdx]) ?? 0) : 0;
    const vol = volIdx >= 0 ? ((toNumber(r[volIdx]) ?? 1) || 1) : 1;
    if (!designator && !harga) continue;
    if (TOTAL_LINE_RE.test(designator)) continue;
    rows.push({ designator, harga: harga || 0, vol: vol || 1 });
  }

  if (!rows.length) {
    throw new Error(
      'Tidak ada baris Lampiran Harga yang terbaca. Pastikan kolom Designator, Harga, dan Vol terisi.'
    );
  }
  return rows;
}

/** Baris Lampiran Harga format lama → format baru (Kesepakatan Material = Harga × Vol). */
function mapHargaVolKeBaru(rows: HargaVolRow[]): LampiranHargaRow[] {
  return rows.map(r => ({
    designator: r.designator,
    uraian: '',
    sat: '',
    telkomMaterial: 0,
    telkomJasa: 0,
    mandorMaterial: 0,
    mandorJasa: 0,
    ksepMaterial: r.harga * r.vol,
    ksepJasa: 0,
  }));
}

// --- Format baru: Negosiasi (Telkom Akses / Mandor) & Kesepakatan (Material / Jasa) ---

/**
 * Ubah teks salinan Excel (TSV) menjadi grid baris × kolom.
 * Sel yang mengandung baris/tab/kutip dibungkus "…" (dengan "" untuk kutip
 * ganda) — diparse dengan benar supaya Uraian multi-baris tidak terpecah.
 */
export function parseTsvGrid(teks: string): string[][] {
  const rows: string[][] = [];
  let baris: string[] = [];
  let sel = '';
  let dalamKutip = false;
  for (let i = 0; i < teks.length; i++) {
    const c = teks[i];
    if (dalamKutip) {
      if (c === '"') {
        if (teks[i + 1] === '"') {
          sel += '"';
          i++;
        } else dalamKutip = false;
      } else sel += c;
    } else if (c === '"') dalamKutip = true;
    else if (c === '\t') {
      baris.push(sel);
      sel = '';
    } else if (c === '\r') {
      // abaikan — ditangani saat \n
    } else if (c === '\n') {
      baris.push(sel);
      rows.push(baris);
      baris = [];
      sel = '';
    } else sel += c;
  }
  baris.push(sel);
  rows.push(baris);
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

const NO_COL_RE = /^(no\.?|nomor|urut)$/i;
const SAT_COL_RE = /^(sat|satuan|unit|uom)$/i;
const URaian_COL_RE = /(uraian|description|keterangan|spec)/i;
const DESIGNATOR_COL_RE = /(designator|kode\s*item|kode\s*barang|^kode$)/i;
const GRUP_HARGA_BARU_RE = /negosiasi|kesepakat|telkom|mandor/i;
const TELKOM_COL_RE = /telkom/i;
const MANDOR_COL_RE = /mandor/i;
const KESEP_COL_RE = /kesepakat/i;
const HEADER_MAKS_BARIS = 4;

/** Kunci enam kolom nilai sesuai urutan template Excel. */
const KUNCI_NILAI = ['telkomMat', 'telkomJasa', 'mandorMat', 'mandorJasa', 'ksepMat', 'ksepJasa'] as const;
type KunciNilai = (typeof KUNCI_NILAI)[number];

/**
 * Ubah grid (baris × kolom — hasil salinan Ctrl+V dari Excel atau pembacaan
 * sheet) menjadi baris Lampiran Harga.
 *
 * Header boleh 1–4 baris dan memakai sel merge (di-forward-fill otomatis);
 * pemetaan kolom berdasarkan label Negosiasi/Telkom/Mandor/Kesepakatan bila
 * terbaca, atau urutan template bila tidak. File format lama
 * (Designator | Harga | Vol) tetap didukung sebagai fallback.
 * Lempar Error bila tidak ada baris yang terbaca.
 */
export function parseLampiranGrid(grid: unknown[][]): LampiranHargaRow[] {
  const cells = (grid ?? [])
    .map(row => (row ?? []).map(c => toText(c)))
    .filter(row => row.some(c => c.trim() !== ''));
  if (!cells.length) throw new Error('Tidak ada baris data yang terbaca.');

  // 1) Pisahkan baris header (seluruh isinya teks) dari baris data.
  let headerEnd = 0;
  while (headerEnd < cells.length && headerEnd < HEADER_MAKS_BARIS) {
    if (cells[headerEnd].some(c => toNumber(c) !== null)) break;
    headerEnd++;
  }
  const headerRows = cells.slice(0, headerEnd);
  const dataMentah = cells.slice(headerEnd);
  if (!dataMentah.length) throw new Error('Tidak ada baris data setelah baris judul.');

  const lebar = cells.reduce((m, r) => Math.max(m, r.length), 0);
  const sel = (r: string[], c: number) => (c >= 0 && r[c] !== undefined ? r[c].trim() : '');

  // 2) Label tiap kolom = gabungan teks unik seluruh baris header (merge diisi).
  //    Isi horizontal DIBATASI: sel kosong yang atasnya terisi tidak diwarisi dari
  //    kiri — dipakai sel merge vertikal (mis. "Kesepakatan" membentang 2 baris,
  //    baris bawahnya kosong dan tidak boleh mewarisi "Mandor" dari kolom kiri).
  const labelKolom: string[] = Array.from({ length: lebar }, () => '');
  if (headerRows.length) {
    const isi = headerRows.map((row, r) => {
      const out = Array.from({ length: lebar }, (_, i) => sel(row, i));
      for (let i = 1; i < lebar; i++) {
        if (out[i]) continue;
        const atasTerisi = r > 0 && sel(headerRows[r - 1], i) !== '';
        if (!atasTerisi) out[i] = out[i - 1];
      }
      return out;
    });
    for (let c = 0; c < lebar; c++) {
      labelKolom[c] = [...new Set(isi.map(r => r[c]).filter(Boolean))].join(' ');
    }
  }

  // Kolom yang berisi angka pada baris data (dipakai untuk menebak kolom teks
  // supaya tebakan tidak pernah menimpa kolom nilai).
  const kolomAngka = new Set<number>();
  for (let c = 0; c < lebar; c++) {
    if (dataMentah.some(r => isSelAngka(sel(r, c)))) kolomAngka.add(c);
  }

  // 3) Bila bukan format baru, pakai parser format lama (Designator | Harga | Vol).
  const formatBaru =
    GRUP_HARGA_BARU_RE.test(labelKolom.join(' ')) || (!headerRows.length && lebar >= 8);
  if (!formatBaru) return mapHargaVolKeBaru(parseGridHargaVol(cells));

  // 4) Kolom tetap: No, Designator, Uraian Pekerjaan, Sat.
  //    Tebakan Uraian/Sat HANYA bila kolom tersebut bukan kolom angka — file tanpa
  //    kolom Uraian/Sat (seperti contoh lampiran BAKH) tidak boleh "makan" kolom nilai.
  let iNo = labelKolom.findIndex(l => NO_COL_RE.test(l));
  let iDes = labelKolom.findIndex(l => DESIGNATOR_COL_RE.test(l));
  let iUraian = labelKolom.findIndex(l => URaian_COL_RE.test(l));
  let iSat = labelKolom.findIndex(l => SAT_COL_RE.test(l));

  const polaNoUrut = (c: number) => {
    const vals = dataMentah.map(r => toNumber(sel(r, c))).filter((n): n is number => n !== null);
    if (vals.length !== dataMentah.length || !vals.length) return false;
    return vals.every(v => Number.isInteger(v) && v >= 1) && Math.max(...vals) <= vals.length;
  };
  if (iNo < 0 && lebar >= 8 && polaNoUrut(0)) iNo = 0;
  if (iDes < 0) {
    const urut = [iNo >= 0 ? iNo + 1 : 0, 1, 0];
    iDes = urut.find(c => c >= 0 && c !== iNo && !kolomAngka.has(c)) ?? -1;
  }
  const tebakKolomTeks = (c: number) =>
    c >= 0 && c !== iNo && c !== iDes && c !== iUraian && c !== iSat && !kolomAngka.has(c);
  if (iUraian < 0) iUraian = tebakKolomTeks(iDes + 1) ? iDes + 1 : -1;
  if (iSat < 0) iSat = tebakKolomTeks(iDes + 2) ? iDes + 2 : -1;

  // 5) Kolom nilai = kolom lain yang berisi angka pada baris data.
  const kolomNilai: number[] = [];
  for (let c = 0; c < lebar; c++) {
    if (c === iNo || c === iDes || c === iUraian || c === iSat) continue;
    if (kolomAngka.has(c)) kolomNilai.push(c);
  }

  // 6) Petakan enam kolom nilai ke Telkom/Mandor/Kesepakatan × Material/Jasa.
  const byLabel: Partial<Record<KunciNilai, number>> = {};
  for (const c of kolomNilai) {
    const l = labelKolom[c].toLowerCase();
    const grup = TELKOM_COL_RE.test(l)
      ? 'telkom'
      : MANDOR_COL_RE.test(l)
        ? 'mandor'
        : KESEP_COL_RE.test(l)
          ? 'ksep'
          : '';
    const jenis = /\bmaterial\b/.test(l) ? 'mat' : /\bjasa\b/.test(l) ? 'jasa' : '';
    if (!grup || !jenis) continue;
    const k = `${grup}${jenis}` as KunciNilai;
    if ((KUNCI_NILAI as readonly string[]).includes(k)) byLabel[k] = c;
  }
  const lengkap = KUNCI_NILAI.every(k => byLabel[k] !== undefined);
  if (kolomNilai.length < KUNCI_NILAI.length && !lengkap) {
    throw new Error(
      'Format kolom tidak dikenali. Gunakan template Lampiran Harga: ' +
        'No | Designator | Uraian Pekerjaan | Sat | Negosiasi (Telkom Akses & Mandor × Material/Jasa) | Kesepakatan (Material/Jasa).'
    );
  }
  const peta: Record<KunciNilai, number> = {} as Record<KunciNilai, number>;
  KUNCI_NILAI.forEach((k, i) => {
    peta[k] = lengkap ? (byLabel[k] as number) : kolomNilai[i];
  });

  // 7) Baris data; uraian yang terpecah di baris berikutnya disambung.
  const dataRows: string[][] = [];
  for (const r of dataMentah) {
    const adaNilai = KUNCI_NILAI.some(k => toNumber(sel(r, peta[k])) !== null);
    const isiDes = sel(r, iDes);
    if (!adaNilai && !isiDes && dataRows.length && iUraian >= 0) {
      const prev = dataRows[dataRows.length - 1];
      const teks = r.filter(c => c.trim()).join(' ');
      prev[iUraian] = `${sel(prev, iUraian)} ${teks}`.trim();
    } else {
      dataRows.push(Array.from({ length: lebar }, (_, i) => sel(r, i)));
    }
  }

  // 8) Susun baris Lampiran Harga.
  const rows: LampiranHargaRow[] = [];
  for (const r of dataRows) {
    const designator = sel(r, iDes);
    const uraian = sel(r, iUraian);
    const sat = sel(r, iSat);
    const angka = (c: number) => toNumber(sel(r, c)) ?? 0;
    if (
      !designator &&
      !uraian &&
      KUNCI_NILAI.every(k => angka(peta[k]) === 0)
    )
      continue;
    if (TOTAL_LINE_RE.test(designator) || TOTAL_LINE_RE.test(uraian)) continue;
    rows.push({
      designator,
      uraian,
      sat,
      telkomMaterial: angka(peta.telkomMat),
      telkomJasa: angka(peta.telkomJasa),
      mandorMaterial: angka(peta.mandorMat),
      mandorJasa: angka(peta.mandorJasa),
      ksepMaterial: angka(peta.ksepMat),
      ksepJasa: angka(peta.ksepJasa),
    });
  }

  if (!rows.length) {
    throw new Error(
      'Tidak ada baris Lampiran Harga yang terbaca. Pastikan kolom Designator, Uraian Pekerjaan, dan nilai Negosiasi/Kesepakatan terisi.'
    );
  }
  return rows;
}

/** Baca sheet pertama workbook menjadi grid (baris × kolom). */
function readFirstSheetGrid(file: File): Promise<unknown[][]> {
  return file.arrayBuffer().then(buffer => {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('File tidak memiliki sheet/worksheet.');
    const grid = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      raw: true,
      defval: '',
      blankrows: false,
    }) as unknown[][];
    if (!grid.length) throw new Error(`Sheet "${sheetName}" kosong.`);
    return grid;
  });
}

/**
 * Parse file Excel "Lampiran Harga" (sheet pertama) menjadi baris tabel.
 * Lempar Error bila file tidak terbaca.
 */
export function parseLampiranHargaWorkbook(file: File): Promise<LampiranHargaRow[]> {
  return readFirstSheetGrid(file).then(parseLampiranGrid);
}

const MATERIAL_RE = /(material|bahan|barang)/i;
const JASA_RE = /(jasa|labour|labor|upah|service)/i;
const TOTALISH_RE = /(jumlah|total|subtotal|grand|nilai\s*akhir)/i;
const BOQ_HEADER_RE =
  /(designator|kode|item|uraian|material|jasa|vol(ume)?|qty|kuantitas|harga)/i;

function findColEx(header: string[], re: RegExp): number {
  return header.findIndex(
    h => re.test(h.trim()) && !TOTALISH_RE.test(h.trim()) && !SKIP_RE.test(h.trim())
  );
}

/**
 * Ubah grid (baris × kolom — hasil salinan Ctrl+V atau pembacaan sheet)
 * menjadi baris BOQ SPK (Designator | Material | Jasa | Vol).
 * Baris judul, kolom "No." urut, dan baris total dilewati otomatis.
 * Lempar Error bila tidak ada baris yang terbaca.
 */
export function parseBoqGrid(grid: unknown[][]): BoqSpkRow[] {
  const cells = (grid ?? [])
    .map(row => (row ?? []).map(c => toText(c)))
    .filter(row => row.some(c => c.trim() !== ''));
  if (!cells.length) throw new Error('Tidak ada baris data yang terbaca.');

  const header = cells[0];
  const adaJudul = header.some(c => BOQ_HEADER_RE.test(c.trim())) || header.every(c => toNumber(c) === null);
  const dataRows = adaJudul ? cells.slice(1) : cells;
  if (!dataRows.length) throw new Error('Tidak ada baris data setelah baris judul.');

  const cols = header.map((_, i) => i);
  const numCount = cols.map(col => dataRows.filter(r => toNumber(r[col]) !== null).length);
  const textCount = cols.map(col =>
    dataRows.filter(r => toNumber(r[col]) === null && (r[col] ?? '').trim() !== '').length
  );
  const isUrut = (col: number) => {
    if (col !== 0) return false;
    const vals = dataRows.map(r => toNumber(r[col])).filter((n): n is number => n !== null);
    if (!vals.length || vals.length !== dataRows.length) return false;
    return vals.every(v => Number.isInteger(v) && v >= 1) && Math.max(...vals) <= vals.length;
  };

  let iDes = adaJudul ? findColEx(header, DESIGNATOR_RE) : -1;
  if (iDes < 0 || textCount[iDes] === 0) {
    iDes = textCount.reduce((best, c, i) => (c > textCount[best] ? i : best), -1);
    if (iDes < 0 || textCount[iDes] === 0) iDes = 0;
  }

  let iMat = adaJudul ? findColEx(header, MATERIAL_RE) : -1;
  let iJasa = adaJudul ? findColEx(header, JASA_RE) : -1;
  let iVol = adaJudul ? findColEx(header, VOL_RE) : -1;

  if (!adaJudul) {
    // Tanpa baris judul: urutan kolom mengikuti tabel — Designator | Material | Jasa | Vol.
    const start = isUrut(0) && iDes !== 0 ? 1 : 0;
    const sisa = cols.length - start;
    iDes = start;
    if (sisa >= 4) {
      iMat = start + 1;
      iJasa = start + 2;
      iVol = start + 3;
    } else if (sisa === 3) {
      iMat = start + 1;
      iJasa = -1;
      iVol = start + 2;
    } else if (sisa === 2) {
      iMat = start + 1;
      iJasa = -1;
      iVol = -1;
    }
  }

  const kandidat = cols.filter(
    col => col !== iDes && numCount[col] > 0 && !isUrut(col) && !TOTALISH_RE.test(header[col] ?? '')
  );
  if (iMat < 0 || iMat === iDes || numCount[iMat] === 0) iMat = kandidat[0] ?? -1;
  if (iJasa < 0 || iJasa === iDes || iJasa === iMat || numCount[iJasa] === 0) {
    iJasa = kandidat.find(c => c !== iMat) ?? -1;
  }
  if (iVol < 0 || iVol === iDes || iVol === iMat || iVol === iJasa || numCount[iVol] === 0) {
    iVol = kandidat.find(c => c !== iMat && c !== iJasa) ?? -1;
  }

  const rows: BoqSpkRow[] = [];
  for (const r of dataRows) {
    const designator = (r[iDes] ?? '').trim();
    const material = iMat >= 0 ? (toNumber(r[iMat]) ?? 0) : 0;
    const jasa = iJasa >= 0 ? (toNumber(r[iJasa]) ?? 0) : 0;
    const vol = iVol >= 0 ? (toNumber(r[iVol]) ?? 0) : 0;
    if (!designator && !material && !jasa && !vol) continue;
    if (TOTAL_LINE_RE.test(designator)) continue;
    rows.push({ designator, material, jasa, vol });
  }

  if (!rows.length) {
    throw new Error(
      'Tidak ada baris BOQ yang terbaca. Pastikan kolom Designator, Material/Jasa, dan Vol terisi.'
    );
  }
  return rows;
}

/** Parse file Excel BOQ SPK (sheet pertama) menjadi baris tabel. */
export function parseBoqSpkWorkbook(file: File): Promise<BoqSpkRow[]> {
  return readFirstSheetGrid(file).then(parseBoqGrid);
}
