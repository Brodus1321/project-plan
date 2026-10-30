/**
 * Parser template DOCX (OOXML) -> HTML siap render untuk pratinjau dokumen.
 *
 * Sumber kebenaran adalah file `public/masterpp.docx`. Modul ini:
 *  1. Membaca ZIP DOCX secara manual (store + deflate via DecompressionStream).
 *  2. Mem-parse word/document.xml menjadi daftar blok ber-section (paragraf /
 *     tabel / token tabel), termasuk numbering, header, dan gambar.
 *  3. Me-render balik ke HTML dengan substitusi placeholder `{KEY}` memakai
 *     data pengajuan (ProjectSubmission), plus tabel generik untuk token blok
 *     (Lampiran Harga, BOQ SPK, Kurva S, BOP Cost Structure).
 *
 * Catatan: gaya font (rFonts) TIDAK dirender — teks mewarisi font panel
 * cetak. Ukuran (w:sz), tebal/miring/baris coret, highlight (kecuali kuning
 * penanda placeholder), perataan, indentasi, spasi, numbering, border/shading
 * tabel, dan gambar dirender demi kesetiaan visual.
 */
import {
  lampiranHargaTerisi,
  type ProjectSubmission,
  type LampiranHargaRow,
} from '../types';
import { formatRupiah, formatTanggalIndo } from '../db/storage';

// ---------------------------------------------------------------------------
// Tipe hasil parse
// ---------------------------------------------------------------------------

export type SectionKey = 'BAKH' | 'SPK' | 'PP' | 'PANJAR' | 'PROGRES' | 'IF' | 'EVIDEN';

/** Gaya run dari w:rPr (font sengaja tidak disimpan). */
interface Gaya {
  b?: boolean;
  i?: boolean;
  u?: boolean;
  s?: boolean;
  /** ukuran pt (w:sz / 2) */
  sz?: number;
  /** nama highlight Word; 'yellow' dibuang saat render */
  hl?: string;
}

type Item =
  | { t: 'teks'; teks: string; g: Gaya }
  | { t: 'tab'; g: Gaya }
  | { t: 'br'; g: Gaya }
  | { t: 'page' }
  | { t: 'img'; rel: string; w: number; h: number; x?: number };

interface Paragraf {
  items: Item[];
  /** default run dari pPr/rPr */
  gaya: Gaya;
  jc?: string;
  ind?: { left?: number; right?: number; first?: number; hanging?: number };
  sp?: { before?: number; after?: number; line?: number };
  num?: { numId: string; lvl: number };
}

interface SelTabel {
  paras: Paragraf[];
  /** jumlah kolom yang dikuasai (w:gridSpan) */
  span: number;
  /** indeks kolom awal di grid */
  mulai: number;
  vMerge?: 'mulai' | 'lanjut';
  shd?: string;
  va?: string;
  /** CSS border milik sel ini (w:tcBorders), bila ada */
  batas?: string;
}

interface BarisTabel {
  sels: SelTabel[];
  header?: boolean;
}

interface Tabel {
  kolom: number[];
  baris: BarisTabel[];
  /** CSS border default utk sel */
  selCss: string;
  css: string;
}

export interface LevelNomor {
  fmt: string;
  teks: string;
  left?: number;
  hanging?: number;
}

type Blok =
  | { t: 'par'; sec: SectionKey; p: Paragraf }
  | { t: 'tbl'; sec: SectionKey; tb: Tabel }
  | { t: 'token'; sec: SectionKey; token: string };

export interface TemplateDokumen {
  /** paragraf header (word/header1.xml) — ditampilkan sekali di atas */
  kop: Paragraf[];
  blok: Blok[];
  /** numId -> definisi level numbering */
  nomor: Map<string, LevelNomor[]>;
  /** resolver rId gambar -> blob URL (per bagian document/header) */
  gambar: { dok: (rel: string) => string; kop: (rel: string) => string };
}

// ---------------------------------------------------------------------------
// Konstanta
// ---------------------------------------------------------------------------

/** Token blok yang diganti seluruhnya (tabel generik). Key: lower-case + trim. */
const TOKEN_BLOK = new Map<string, string>([
  ['lampiran harga bakh', 'LAMPIRAN_HARGA'],
  ['lampiran boq spk', 'BOQ_SPK'],
  ['muncul kan tabel kurva s disini', 'KURVA_S'],
  ['hasil ooutput cost srukture', 'BOP'],
]);

/** Literal harga kesepakatan contoh di template (hanya bagian BAKH). */
const LITERAL_HARGA_KESEPAKATAN =
  /Rp16\.731\.414 \(Enam Belas Juta Tujuh Ratus Tiga Puluh Satu Ribu Empat Ratus Empat Belas Rupiah\)/g;

const HIGHLIGHT: Record<string, string> = {
  yellow: '#ffff00',
  green: '#00ff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  blue: '#0000ff',
  red: '#ff0000',
  darkBlue: '#000080',
  darkCyan: '#008b8b',
  darkGreen: '#006400',
  darkMagenta: '#8b008b',
  darkRed: '#8b0000',
  darkYellow: '#808000',
  darkGray: '#a9a9a9',
  lightGray: '#d3d3d3',
  black: '#000000',
  white: '#ffffff',
  auto: '#000000',
};

// 1 twip = 1/20 pt = 0.0667 px (1 px = 0.75 pt)
const twipKePx = (t: number) => Math.round(t * 0.0666667 * 100) / 100;
const emuKePx = (e: number) => Math.round((e / 9525) * 100) / 100;

// ---------------------------------------------------------------------------
// Helper XML (ringan, tanpa dependensi)
// ---------------------------------------------------------------------------

const elemen = (n: Node | null | undefined): Element | null =>
  n && n.nodeType === 1 ? (n as Element) : null;

const anak = (el: Element | null): Element[] =>
  el ? Array.from(el.childNodes).map(elemen).filter((x): x is Element => x !== null) : [];

const cari = (el: Element | null, local: string): Element | null =>
  anak(el).find(c => c.localName === local) ?? null;

const cariDalam = (el: Element | null, local: string): Element | null => {
  const antrean: Element[] = anak(el);
  while (antrean.length) {
    const x = antrean.shift()!;
    if (x.localName === local) return x;
    antrean.push(...anak(x));
  }
  return null;
};

/** Ambil atribut; mendukung nama kualifikasi (w:val) maupun lokal (val). */
const attr = (el: Element | null, ...nama: string[]): string | undefined => {
  if (!el) return undefined;
  for (const n of nama) {
    const v = el.getAttribute(n);
    if (v !== null) return v;
  }
  const daftar = el.attributes;
  for (let i = 0; i < daftar.length; i++) {
    const a = daftar[i];
    const lokal = a.localName || a.name.split(':').pop() || '';
    for (const n of nama) {
      const target = n.includes(':') ? n.split(':').pop()! : n;
      if (lokal === target) return a.value;
    }
  }
  return undefined;
};

const angkaAttr = (el: Element | null, ...nama: string[]): number | undefined => {
  const v = attr(el, ...nama);
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Konversi twip ke px bila atribut ada. */
const twipAttr = (el: Element | null, ...nama: string[]): number | undefined => {
  const n = angkaAttr(el, ...nama);
  return n !== undefined ? twipKePx(n) : undefined;
};

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------------------------------------------------------------------------
// ZIP reader (tanpa pustaka)
// ---------------------------------------------------------------------------

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error(
      'Browser ini tidak mendukung DecompressionStream (butuh Chrome/Edge/Firefox terbaru).'
    );
  }
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([data as unknown as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function bacaZip(buf: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);
  // Cari EOCD dari akhir file (signature 0x06054b50)
  let eocd = -1;
  const batasCari = Math.max(0, u8.length - 22 - 65535);
  for (let i = u8.length - 22; i >= batasCari; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('File bukan ZIP/DOCX yang valid (EOCD tidak ditemukan).');
  const jumlah = dv.getUint16(eocd + 10, true);
  let off = dv.getUint32(eocd + 16, true);
  const keluaran = new Map<string, Uint8Array>();
  for (let n = 0; n < jumlah; n++) {
    if (off + 46 > u8.length || dv.getUint32(off, true) !== 0x02014b50) break;
    const metode = dv.getUint16(off + 10, true);
    const ukuranKomp = dv.getUint32(off + 20, true);
    const namaLen = dv.getUint16(off + 28, true);
    const ekstraLen = dv.getUint16(off + 30, true);
    const komenLen = dv.getUint16(off + 32, true);
    const lokal = dv.getUint32(off + 42, true);
    const nama = new TextDecoder().decode(u8.subarray(off + 46, off + 46 + namaLen));
    const nLen = dv.getUint16(lokal + 26, true);
    const eLen = dv.getUint16(lokal + 28, true);
    const mulai = lokal + 30 + nLen + eLen;
    const data = u8.subarray(mulai, mulai + ukuranKomp);
    if (nama && !nama.endsWith('/')) {
      keluaran.set(nama, metode === 0 ? data.slice() : await inflateRaw(data));
    }
    off += 46 + namaLen + ekstraLen + komenLen;
  }
  if (!keluaran.has('word/document.xml')) {
    throw new Error('File DOCX tidak memuat word/document.xml.');
  }
  return keluaran;
}

const parseXml = (teks: string): Document =>
  new DOMParser().parseFromString(teks, 'application/xml');

const teksZip = (zip: Map<string, Uint8Array>, path: string): string | null => {
  const d = zip.get(path);
  return d ? new TextDecoder().decode(d) : null;
};

// ---------------------------------------------------------------------------
// Relasi (rId -> path berkas di dalam zip)
// ---------------------------------------------------------------------------

function parseRels(teks: string, dasar: string): Map<string, string> {
  const out = new Map<string, string>();
  if (!teks) return out;
  let doc: Document;
  try {
    doc = parseXml(teks);
  } catch {
    return out;
  }
  for (const rel of anak(doc.documentElement)) {
    if (rel.localName !== 'Relationship') continue;
    const id = attr(rel, 'Id');
    const target = attr(rel, 'Target');
    if (!id || !target) continue;
    if (/^[a-z]+:/i.test(target)) continue; // URI eksternal
    // target relatif terhadap direktori bagian ('word/')
    const gabung = `${dasar}/${target}`;
    const bersih: string[] = [];
    for (const b of gabung.split('/')) {
      if (b === '..') bersih.pop();
      else if (b !== '.' && b !== '') bersih.push(b);
    }
    out.set(id, bersih.join('/'));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Numbering
// ---------------------------------------------------------------------------

function parseNumbering(teks: string | null): Map<string, LevelNomor[]> {
  const out = new Map<string, LevelNomor[]>();
  if (!teks) return out;
  let doc: Document;
  try {
    doc = parseXml(teks);
  } catch {
    return out;
  }
  const akar = doc.documentElement;
  const absMap = new Map<string, LevelNomor[]>();
  for (const el of anak(akar)) {
    if (el.localName !== 'abstractNum') continue;
    const id = attr(el, 'w:abstractNumId', 'abstractNumId');
    if (!id) continue;
    const levels: LevelNomor[] = [];
    for (const lvl of anak(el)) {
      if (lvl.localName !== 'lvl') continue;
      const i = angkaAttr(lvl, 'w:ilvl', 'ilvl') ?? 0;
      const fmt = attr(cari(lvl, 'numFmt'), 'w:val', 'val') ?? 'decimal';
      const teksLvl = attr(cari(lvl, 'lvlText'), 'w:val', 'val') ?? `%${i + 1}.`;
      const ind = cari(cari(lvl, 'pPr'), 'ind');
      levels[i] = {
        fmt,
        teks: teksLvl,
        left: twipAttr(ind, 'w:left', 'left'),
        hanging: twipAttr(ind, 'w:hanging', 'hanging'),
      };
    }
    absMap.set(id, levels);
  }
  for (const el of anak(akar)) {
    if (el.localName !== 'num') continue;
    const numId = attr(el, 'w:numId', 'numId');
    const absId = attr(cari(el, 'abstractNumId'), 'w:val', 'val');
    if (numId && absId && absMap.has(absId)) out.set(numId, absMap.get(absId)!);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Gaya run / paragraf
// ---------------------------------------------------------------------------

const nilaiBool = (el: Element | null): boolean => {
  if (!el) return false;
  const v = attr(el, 'w:val', 'val');
  return v === undefined || (v !== '0' && v !== 'false' && v !== 'none');
};

function bacaGaya(rPr: Element | null): Gaya {
  const g: Gaya = {};
  if (!rPr) return g;
  if (nilaiBool(cari(rPr, 'b'))) g.b = true;
  if (nilaiBool(cari(rPr, 'i'))) g.i = true;
  if (nilaiBool(cari(rPr, 'strike'))) g.s = true;
  const u = cari(rPr, 'u');
  if (u) {
    const v = attr(u, 'w:val', 'val');
    if (v === undefined || (v !== 'none' && v !== '0')) g.u = true;
  }
  const sz = angkaAttr(cari(rPr, 'sz'), 'w:val', 'val');
  if (sz !== undefined) g.sz = sz / 2;
  const hl = attr(cari(rPr, 'highlight'), 'w:val', 'val');
  if (hl && hl !== 'none') g.hl = hl;
  return g;
}

// ---------------------------------------------------------------------------
// Paragraf
// ---------------------------------------------------------------------------

/** Baca isi satu <w:r> (rPr + teks/tab/br/gambar). */
function bacaRun(r: Element, dasar: Gaya, items: Item[]): void {
  let g = dasar;
  for (const rc of anak(r)) {
    switch (rc.localName) {
      case 'rPr':
        g = { ...dasar, ...bacaGaya(rc) };
        break;
      case 't':
        items.push({ t: 'teks', teks: rc.textContent ?? '', g });
        break;
      case 'tab':
        items.push({ t: 'tab', g });
        break;
      case 'br': {
        const tipe = attr(rc, 'w:type', 'type');
        if (tipe === 'page') items.push({ t: 'page' });
        else items.push({ t: 'br', g });
        break;
      }
      case 'drawing':
      case 'pict': {
        const blip = cariDalam(rc, 'blip');
        const rel = attr(blip, 'r:embed', 'embed');
        const extent = cariDalam(rc, 'extent');
        if (rel && extent) {
          const w = emuKePx(angkaAttr(extent, 'cx') ?? 0);
          const h = emuKePx(angkaAttr(extent, 'cy') ?? 0);
          const anchor = cari(rc, 'anchor');
          const posH = cari(cari(anchor, 'positionH') ?? cari(cari(rc, 'inline'), 'positionH'), 'posOffset');
          const x = posH?.textContent ? emuKePx(Number(posH.textContent)) : undefined;
          items.push({ t: 'img', rel, w, h, x: x || undefined });
        }
        break;
      }
      default:
        break; // lastRenderedPageBreak, proofErr, noProof, dst.
    }
  }
}

/** Baca anak-anak <w:p> (run / hyperlink / ins). */
function bacaAnakParagraf(el: Element, dasar: Gaya, items: Item[]): void {
  for (const c of anak(el)) {
    if (c.localName === 'r') bacaRun(c, dasar, items);
    else if (c.localName === 'hyperlink' || c.localName === 'ins') bacaAnakParagraf(c, dasar, items);
  }
}

function parseParagraf(p: Element): Paragraf {
  const pPr = cari(p, 'pPr');
  let gaya: Gaya = {};
  let jc: string | undefined;
  let ind: Paragraf['ind'];
  let sp: Paragraf['sp'];
  let num: Paragraf['num'];
  if (pPr) {
    gaya = bacaGaya(cari(pPr, 'rPr'));
    jc = attr(cari(pPr, 'jc'), 'w:val', 'val');
    const indEl = cari(pPr, 'ind');
    if (indEl) {
      ind = {
        left: twipAttr(indEl, 'w:left', 'left'),
        right: twipAttr(indEl, 'w:right', 'right'),
        first: twipAttr(indEl, 'w:firstLine', 'firstLine'),
        hanging: twipAttr(indEl, 'w:hanging', 'hanging'),
      };
    }
    const spEl = cari(pPr, 'spacing');
    if (spEl) {
      const before = angkaAttr(spEl, 'w:before', 'before');
      const after = angkaAttr(spEl, 'w:after', 'after');
      const line = angkaAttr(spEl, 'w:line', 'line');
      const rule = attr(spEl, 'w:lineRule', 'lineRule');
      sp = {
        before: before !== undefined ? twipKePx(before) : undefined,
        after: after !== undefined ? twipKePx(after) : undefined,
        line: line !== undefined ? (rule === 'auto' ? line / 240 : twipKePx(line)) : undefined,
      };
    }
    const numPr = cari(pPr, 'numPr');
    if (numPr) {
      const numId = attr(cari(numPr, 'numId'), 'w:val', 'val');
      const ilvl = angkaAttr(cari(numPr, 'ilvl'), 'w:val', 'val') ?? 0;
      if (numId && numId !== '0') num = { numId, lvl: ilvl };
    }
  }
  const items: Item[] = [];
  bacaAnakParagraf(p, gaya, items);
  return { items, gaya, jc, ind, sp, num };
}

const teksParagraf = (p: Paragraf): string =>
  p.items.map(i => (i.t === 'teks' ? i.teks : '')).join('');

// ---------------------------------------------------------------------------
// Tabel
// ---------------------------------------------------------------------------

const gayaBatas = (el: Element | null): string | null => {
  if (!el) return null;
  const v = attr(el, 'w:val', 'val') ?? 'single';
  if (v === 'none' || v === 'nil') return 'none';
  const sz = angkaAttr(el, 'w:sz', 'sz') ?? 4;
  const gayaCss: Record<string, string> = {
    single: 'solid',
    dashed: 'dashed',
    dotted: 'dotted',
    double: 'double',
    thickThin: 'solid',
    thinThick: 'solid',
    triple: 'double',
  };
  const warna = attr(el, 'w:color', 'color') ?? 'auto';
  const hex = warna === 'auto' || warna.length !== 6 ? '#000' : `#${warna}`;
  const pt = Math.round((sz / 8) * 100) / 100;
  return `${pt}pt ${gayaCss[v] || 'solid'} ${hex}`;
};

function parseTabel(tbl: Element): Tabel {
  const tblPr = cari(tbl, 'tblPr');
  const namaGaya = attr(cari(tblPr, 'tblStyle'), 'w:val', 'val');

  // Lebar kolom dari tblGrid (twip -> px)
  const kolom: number[] = anak(cari(tbl, 'tblGrid'))
    .filter(c => c.localName === 'gridCol')
    .map(c => twipKePx(angkaAttr(c, 'w:w', 'w') ?? 0));

  // Border tabel: langsung (w:tblBorders) atau gaya bawaan TableGrid
  let batasTabel: Record<string, string> | null = null;
  const tblB = cari(tblPr, 'tblBorders');
  if (tblB) {
    batasTabel = {
      top: gayaBatas(cari(tblB, 'top')) ?? 'none',
      left: gayaBatas(cari(tblB, 'left')) ?? 'none',
      bottom: gayaBatas(cari(tblB, 'bottom')) ?? 'none',
      right: gayaBatas(cari(tblB, 'right')) ?? 'none',
      h: gayaBatas(cari(tblB, 'insideH')) ?? 'none',
      v: gayaBatas(cari(tblB, 'insideV')) ?? 'none',
    };
  } else if (namaGaya === 'TableGrid') {
    const b = '0.5pt solid #000';
    batasTabel = { top: b, left: b, bottom: b, right: b, h: b, v: b };
  }

  // Border sel milik sendiri (w:tcBorders)
  const batasSel = (tcPr: Element | null): string | undefined => {
    const b = cari(tcPr, 'tcBorders');
    if (!b) return undefined;
    const sisiCss: string[] = [];
    const peta: [string, string][] = [
      ['top', 'border-top'],
      ['left', 'border-left'],
      ['bottom', 'border-bottom'],
      ['right', 'border-right'],
    ];
    for (const [sisi, css] of peta) {
      const v = gayaBatas(cari(b, sisi));
      if (v && v !== 'none') sisiCss.push(`${css}:${v}`);
      else if (v === 'none') sisiCss.push(`${css}:none`);
    }
    return sisiCss.length ? sisiCss.join(';') : undefined;
  };

  let selCss = '';
  if (batasTabel) {
    const dasar = batasTabel.h !== 'none' ? batasTabel.h : batasTabel.top !== 'none' ? batasTabel.top : 'none';
    if (dasar !== 'none') {
      if (batasTabel.v !== 'none' && batasTabel.v !== dasar) {
        selCss = `border-top:${dasar};border-bottom:${dasar};border-left:${batasTabel.v};border-right:${batasTabel.v}`;
      } else {
        selCss = `border:${dasar}`;
      }
    }
  }

  const tblInd = angkaAttr(cari(tblPr, 'tblInd'), 'w:w', 'w');
  const css: string[] = ['border-collapse:collapse', 'table-layout:fixed'];
  // Lebar TIDAK dikunci ke px: renderTabel memaksa width:100% agar tabel
  // selalu pas dengan lebar area konten kertas (lihat catatan pgMar).
  if (tblInd !== undefined && tblInd > 0) css.push(`margin-left:${twipKePx(tblInd)}px`);

  const baris: BarisTabel[] = [];
  for (const tr of anak(tbl)) {
    if (tr.localName !== 'tr') continue;
    const trPr = cari(tr, 'trPr');
    const header = !!cari(trPr, 'tblHeader');
    const sels: SelTabel[] = [];
    let kolomKe = 0;
    for (const tc of anak(tr)) {
      if (tc.localName !== 'tc') continue;
      const tcPr = cari(tc, 'tcPr');
      const span = angkaAttr(cari(tcPr, 'gridSpan'), 'w:val', 'val') ?? 1;
      const vmEl = cari(tcPr, 'vMerge');
      const vm = attr(vmEl, 'w:val', 'val');
      const vMerge: SelTabel['vMerge'] =
        vmEl === null ? undefined : vm === 'restart' ? 'mulai' : 'lanjut';
      const shd = attr(cari(tcPr, 'shd'), 'w:fill', 'fill');
      const va = attr(cari(tcPr, 'vAlign'), 'w:val', 'val');
      const paras: Paragraf[] = [];
      for (const c of anak(tc)) {
        if (c.localName === 'p') paras.push(parseParagraf(c));
      }
      sels.push({
        paras,
        span,
        mulai: kolomKe,
        vMerge,
        shd: shd && shd !== 'auto' && shd.length === 6 ? `#${shd}` : undefined,
        va: va === 'center' ? 'middle' : va === 'bottom' ? 'bottom' : undefined,
        batas: batasSel(tcPr),
      });
      kolomKe += span;
    }
    baris.push({ sels, header });
  }

  return { kolom, baris, selCss, css: css.join(';') };
}

/** Cari token blok di dalam tabel (paragraf mana pun). */
function cariTokenTabel(tb: Tabel): string | null {
  for (const b of tb.baris) {
    for (const s of b.sels) {
      for (const p of s.paras) {
        const tok = deteksiToken(teksParagraf(p));
        if (tok) return tok;
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Section & token
// ---------------------------------------------------------------------------

function deteksiSection(teks: string): SectionKey | null {
  const t = teks.replace(/\s+/g, ' ').trim();
  const u = t.toUpperCase();
  if (u.startsWith('SURAT PERINTAH KERJA')) return 'SPK';
  if (u.startsWith('LAMPIRAN BOQ MANDOR')) return 'SPK';
  if (u.startsWith('PROJECT PLAN')) return 'PP';
  if (u.startsWith('PENGAJUAN PANJAR PROYEK')) return 'PANJAR';
  if (u.startsWith('LAMPIRAN BOQ DRM')) return 'PANJAR';
  if (u.startsWith('LAMPIRAN DASAR PEKERJAAN')) return 'PANJAR';
  if (u.startsWith('BERITA ACARA PENYELESAIAN')) return 'PROGRES';
  if (u.startsWith('BERITA ACARA REKONSILIASI')) return 'PROGRES';
  if (u.startsWith('LAMPIRAN PEKERJAAN TERMIN')) return 'PROGRES';
  if (u.startsWith('DAFTAR PERTANGGUNGAN IMPREST FUND')) return 'IF';
  if (u.startsWith('LAMPIRAN DATA MANDOR')) return 'EVIDEN';
  if (u.startsWith('LAMPIRAN KWINTANSI')) return 'EVIDEN';
  if (u.startsWith('LAMPIRAN EVIDENCE TRANSFER')) return 'EVIDEN';
  if (u === 'BERITA ACARA') return 'BAKH';
  if (u.startsWith('LAMPIRAN BERITA ACARA')) return 'BAKH';
  return null;
}

function deteksiToken(teks: string): string | null {
  const t = teks.trim();
  if (!/^\{[^{}]+\}$/.test(t)) return null;
  return TOKEN_BLOK.get(t.slice(1, -1).trim().toLowerCase()) ?? null;
}

// ---------------------------------------------------------------------------
// Muat template
// ---------------------------------------------------------------------------

let cacheTemplate: Promise<TemplateDokumen> | null = null;

/** Ambil (dan cache) template dari URL; gagal -> cache dibersihkan utk retry. */
export function muatTemplate(url = '/masterpp.docx'): Promise<TemplateDokumen> {
  if (!cacheTemplate) {
    cacheTemplate = fetch(url)
      .then(async r => {
        if (!r.ok) throw new Error(`Gagal memuat ${url} (HTTP ${r.status}).`);
        return parseTemplate(await r.arrayBuffer());
      })
      .catch(e => {
        cacheTemplate = null;
        throw e;
      });
  }
  return cacheTemplate;
}

const cacheGambar = new Map<string, string>();

function buatResolver(
  zip: Map<string, Uint8Array>,
  rels: Map<string, string>
): (relId: string) => string {
  return (relId: string): string => {
    const path = rels.get(relId);
    if (!path) return '';
    let url = cacheGambar.get(path);
    if (url) return url;
    const data = zip.get(path);
    if (!data) return '';
    const bawah = path.toLowerCase();
    const mime = bawah.endsWith('.png')
      ? 'image/png'
      : bawah.match(/\.(jpg|jpeg)$/)
        ? 'image/jpeg'
        : bawah.endsWith('.gif')
          ? 'image/gif'
          : 'application/octet-stream';
    url = URL.createObjectURL(new Blob([data as unknown as BlobPart], { type: mime }));
    cacheGambar.set(path, url);
    return url;
  };
}

/** Parse byte DOCX menjadi struktur template (dipakai muatTemplate & pengujian). */
export async function parseTemplate(buf: ArrayBuffer): Promise<TemplateDokumen> {
  const zip = await bacaZip(buf);
  const doc = parseXml(teksZip(zip, 'word/document.xml')!);
  const relsDok = parseRels(teksZip(zip, 'word/_rels/document.xml.rels') ?? '', 'word');
  const relsKop = parseRels(teksZip(zip, 'word/_rels/header1.xml.rels') ?? '', 'word');
  const nomor = parseNumbering(teksZip(zip, 'word/numbering.xml'));
  const resolverDok = buatResolver(zip, relsDok);
  const resolverKop = buatResolver(zip, relsKop);

  // Kop surat (header1.xml) bila ada
  const kop: Paragraf[] = [];
  const xmlKop = teksZip(zip, 'word/header1.xml');
  if (xmlKop) {
    try {
      const hdr = parseXml(xmlKop);
      for (const c of anak(hdr.documentElement)) {
        if (c.localName === 'p') kop.push(parseParagraf(c));
      }
    } catch {
      /* header rusak -> tanpa kop */
    }
  }

  // Blok body
  const body = cari(doc.documentElement, 'body');
  const blok: Blok[] = [];
  let sec: SectionKey = 'BAKH';
  for (const el of anak(body)) {
    if (el.localName === 'p') {
      const p = parseParagraf(el);
      const teks = teksParagraf(p);
      const baru = deteksiSection(teks);
      if (baru) sec = baru;
      const tok = deteksiToken(teks);
      if (tok) blok.push({ t: 'token', sec, token: tok });
      else blok.push({ t: 'par', sec, p });
    } else if (el.localName === 'tbl') {
      const tb = parseTabel(el);
      const tok = cariTokenTabel(tb);
      if (tok) blok.push({ t: 'token', sec, token: tok });
      else blok.push({ t: 'tbl', sec, tb });
    }
  }

  return { kop, blok, nomor, gambar: { dok: resolverDok, kop: resolverKop } };
}

// ---------------------------------------------------------------------------
// Data pengajuan & substitusi placeholder
// ---------------------------------------------------------------------------

interface Ctx {
  sub: ProjectSubmission;
  bakh: Partial<NonNullable<ProjectSubmission['bakhDetail']>>;
  spk: Partial<NonNullable<ProjectSubmission['spkDetail']>>;
  pp: Partial<NonNullable<ProjectSubmission['ppDetail']>>;
}

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function hariIndo(iso: string): string {
  if (!iso) return '-';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '-';
  return HARI[d.getDay()] ?? '-';
}

/** Angka -> kata (Bahasa Indonesia), diakhiri "Rupiah". */
function terbilang(nilai: number): string {
  let n = Math.floor(Math.abs(Number(nilai) || 0));
  if (n === 0) return 'Nol Rupiah';
  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan'];
  const bagian = (x: number): string => {
    if (x < 10) return satuan[x];
    if (x < 20) return x === 10 ? 'Sepuluh' : x === 11 ? 'Sebelas' : `${satuan[x - 10]} Belas`;
    if (x < 100) return `${bagian(Math.floor(x / 10))} Puluh${x % 10 ? ` ${bagian(x % 10)}` : ''}`;
    return `${bagian(Math.floor(x / 100))} Ratus${x % 100 ? ` ${bagian(x % 100)}` : ''}`;
  };
  const unit: [number, string][] = [
    [1e12, 'Triliun'],
    [1e9, 'Miliar'],
    [1e6, 'Juta'],
    [1e3, 'Ribu'],
  ];
  const keluar: string[] = [];
  for (const [nilaiUnit, nama] of unit) {
    if (n >= nilaiUnit) {
      const q = Math.floor(n / nilaiUnit);
      keluar.push(q === 1 && nama === 'Ribu' ? 'Seribu' : `${bagian(q)} ${nama}`);
      n %= nilaiUnit;
    }
  }
  if (n > 0) keluar.push(bagian(n));
  return `${keluar.join(' ')} Rupiah`;
}

function buatCtx(sub: ProjectSubmission): Ctx {
  return {
    sub,
    bakh: sub.bakhDetail ?? {},
    spk: sub.spkDetail ?? {},
    pp: sub.ppDetail ?? {},
  };
}

const rupiah = (v: unknown): string => formatRupiah(Number(v) || 0);
const tanggal = (v: unknown): string => formatTanggalIndo(String(v ?? ''));

/** Nilai pengganti placeholder. undefined = key tidak dikenal (tampil mentah). */
function cariNilai(key: string, ctx: Ctx, sec: SectionKey): string | undefined {
  const { sub, bakh, spk, pp } = ctx;
  switch (key.trim()) {
    case 'NO BAKH':
      return sub.nomorBAKH || '-';
    case 'NAMA PEKERJAAN':
      return bakh.namaPekerjaan || sub.namaPekerjaan || '-';
    case 'LOKASI':
      return bakh.lokasi || sub.lokasiProyek || '-';
    case 'WITEL':
      return bakh.witel || sub.regional || '-';
    case 'PID':
      return bakh.pid || pp.idProject || '-';
    case 'HARIBAKH':
      return hariIndo(bakh.tglSurat || sub.tanggalBAKH);
    case 'TGL SURAT':
      return tanggal(bakh.tglSurat || sub.tanggalBAKH);
    case 'HARGA PENAWARAN':
      return rupiah(bakh.hargaPenawaran);
    case 'TERBILANG':
      return `(${terbilang(Number(bakh.hargaPenawaran) || 0)})`;
    case 'JUMLAH TEAM FO + JOINTER':
      return `${Number(bakh.teamFo) || 0} Tim FO + ${Number(bakh.teamJoiner) || 0} Tim Joiner`;
    case 'INPUT DURASI KERJA':
      return sec === 'SPK'
        ? tanggal(spk.tglMulaiKerja || sub.tanggalMulaiKerja)
        : String(Number(bakh.durasiPekerjaan) || sub.durasiKerjaHari || 0);
    case 'INPUT GM':
      return bakh.gm || '-';
    case 'INPUT PM':
      return bakh.pm || pp.pm || '-';
    case 'INPUT MANDOR':
      return bakh.mandor || spk.mandor || pp.mandor || '-';
    case 'INPUT PROJECT ADMIN':
      return bakh.projectAdmin || pp.projectAdmin || '-';
    case 'INPUT WASPANG':
      return spk.waspang || pp.waspang || '-';
    case 'NO LEONITA':
      return spk.noLeonita || '-';
    case 'NOHP':
      return spk.noHp || '-';
    case 'IHLD':
      return pp.nomorDisposisi || '-';
    case 'MATERIALNONSTOCK':
      return rupiah(spk.nilaiMaterial);
    case 'NILAIJASA':
      return rupiah(spk.nilaiJasa);
    case 'NILAI JASA+NILAI MATERIAL':
      return rupiah(spk.nilaiTotal);
    case 'Total Nilai Project (Boq)':
      return rupiah(pp.totalProjectBoq);
    case 'TOTAL KESELURAHAN':
      return rupiah(pp.totalPengajuanIF);
    case 'INPUT TANGGAL PENGGUNAAN PP':
      return tanggal(pp.tglPenggunaan);
    case 'Persiapan':
      return String(Number(bakh.alurProyek?.persiapan) || 0);
    case 'Material Delivery':
      return String(Number(bakh.alurProyek?.materialDelivery) || 0);
    case 'Instalasi':
      return String(Number(bakh.alurProyek?.instalasi) || 0);
    case 'Commissioning Test':
      return String(Number(bakh.alurProyek?.commissioningTest) || 0);
    case 'Uji Terima':
      return String(Number(bakh.alurProyek?.ujiTerima) || 0);
    case 'MATRIAL NON STOCK':
      return 'Material Non Stock';
    case 'VOLUME MATERIAL NON STOCK':
      return '1';
    case 'SATUAN MATERIAL NON STOCK':
      return 'Lumpsum';
    case 'HARGA SATUAN JASA NYA':
      return rupiah(pp.materialStock);
    case 'TOTAL VOLUME * HARGA SATUAN':
      return rupiah(pp.materialStock);
    case 'Nilai Perizinan (Preliminary) yang dapat dilakukan reimbursement':
      return rupiah(sub.nilaiPerizinan ?? 0);
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// Substitusi placeholder pada items paragraf
// ---------------------------------------------------------------------------

function substitusi(items: Item[], ctx: Ctx, sec: SectionKey): Item[] {
  const keluar: Item[] = [];
  let i = 0;
  while (i < items.length) {
    const it = items[i];
    if (it.t !== 'teks') {
      keluar.push(it);
      i++;
      continue;
    }
    // Kumpulkan run teks berurutan (chunk) — placeholder boleh terpecah antar-run
    const run: { teks: string; g: Gaya }[] = [];
    while (i < items.length && items[i].t === 'teks') {
      const t = items[i] as { t: 'teks'; teks: string; g: Gaya };
      run.push({ teks: t.teks, g: t.g });
      i++;
    }
    const gabung = run.map(r => r.teks).join('');
    if (!gabung) continue;

    type Temuan = { mulai: number; akhir: number; nilai?: string; key?: string };
    const temuan: Temuan[] = [];
    for (const m of gabung.matchAll(/\{[^{}]*\}/g)) {
      temuan.push({ mulai: m.index, akhir: m.index + m[0].length, key: m[0].slice(1, -1).trim() });
    }
    if (sec === 'BAKH') {
      for (const m of gabung.matchAll(LITERAL_HARGA_KESEPAKATAN)) {
        const v = Number(ctx.bakh.hargaKesepakatan) || 0;
        temuan.push({
          mulai: m.index,
          akhir: m.index + m[0].length,
          nilai: `${formatRupiah(v)} (${terbilang(v)})`,
        });
      }
    }
    temuan.sort((a, b) => a.mulai - b.mulai);

    const gayaDi = (pos: number): Gaya => {
      let acc = 0;
      for (const r of run) {
        acc += r.teks.length;
        if (pos < acc) return r.g;
      }
      return run[run.length - 1]?.g ?? {};
    };
    const potong = (dari: number, sampai: number): void => {
      let pos = 0;
      for (const r of run) {
        const a = pos;
        const b = pos + r.teks.length;
        pos = b;
        const sa = Math.max(dari, a);
        const sb = Math.min(sampai, b);
        if (sa < sb) keluar.push({ t: 'teks', teks: r.teks.slice(sa - a, sb - a), g: r.g });
      }
    };

    let kursor = 0;
    for (const t of temuan) {
      if (t.mulai < kursor) continue;
      potong(kursor, t.mulai);
      const nilai = t.nilai ?? (t.key !== undefined ? cariNilai(t.key, ctx, sec) : undefined);
      if (nilai !== undefined) {
        const g = { ...gayaDi(t.mulai) };
        delete g.hl; // buang highlight kuning penanda placeholder
        keluar.push({ t: 'teks', teks: nilai, g });
      } else {
        potong(t.mulai, t.akhir); // key tak dikenal -> tampil mentah (debug)
      }
      kursor = t.akhir;
    }
    potong(kursor, gabung.length);
  }
  return keluar;
}

// ---------------------------------------------------------------------------
// Render paragraf
// ---------------------------------------------------------------------------

const cssGaya = (g: Gaya): string => {
  const s: string[] = [];
  if (g.b) s.push('font-weight:700');
  if (g.i) s.push('font-style:italic');
  const dekorasi: string[] = [];
  if (g.u) dekorasi.push('underline');
  if (g.s) dekorasi.push('line-through');
  if (dekorasi.length) s.push(`text-decoration:${dekorasi.join(' ')}`);
  if (g.sz !== undefined && g.sz > 0) s.push(`font-size:${g.sz}pt`);
  if (g.hl && g.hl !== 'yellow' && HIGHLIGHT[g.hl]) s.push(`background-color:${HIGHLIGHT[g.hl]}`);
  return s.join(';');
};

const ROMAN: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

function formatNomor(fmt: string, n: number): string {
  if (n <= 0) return String(n);
  switch (fmt) {
    case 'lowerLetter':
      return String.fromCharCode(97 + ((n - 1) % 26));
    case 'upperLetter':
      return String.fromCharCode(65 + ((n - 1) % 26));
    case 'lowerRoman':
    case 'upperRoman': {
      let s = '';
      let sisa = n;
      for (const [v, r] of ROMAN) {
        while (sisa >= v) {
          s += r;
          sisa -= v;
        }
      }
      return fmt === 'lowerRoman' ? s.toLowerCase() : s;
    }
    default:
      return String(n);
  }
}

const divBreak =
  '<div style="page-break-after:always;break-after:page;height:0;"></div>';

function renderItems(items: Item[], rel: (r: string) => string): string {
  let html = '';
  for (const it of items) {
    switch (it.t) {
      case 'teks': {
        const css = cssGaya(it.g);
        const teks = escapeHtml(it.teks);
        html += css ? `<span style="${css}">${teks}</span>` : teks;
        break;
      }
      case 'tab':
        html += '<span style="display:inline-block;min-width:48px;vertical-align:bottom;"></span>';
        break;
      case 'br':
        html += '<br/>';
        break;
      case 'img': {
        const url = rel(it.rel);
        if (url) {
          const pos = it.x ? `margin-left:${it.x}px;` : '';
          const w = it.w ? `width:${it.w}px;` : '';
          const h = it.h ? `height:${it.h}px;` : '';
          html += `<img src="${url}" alt="" style="${w}${h}max-width:100%;${pos}vertical-align:top;" />`;
        }
        break;
      }
      default:
        break;
    }
  }
  return html;
}

function renderPar(
  p: Paragraf,
  ctx: Ctx,
  sec: SectionKey,
  template: TemplateDokumen,
  rel: (r: string) => string,
  counter: Map<string, number[]>
): string {
  const items = substitusi(p.items, ctx, sec);

  // Paragraf yang hanya berisi page break -> cukup satu penanda
  if (items.length && items.every(x => x.t === 'page')) return divBreak;

  const css: string[] = [];
  if (p.jc) {
    const j =
      p.jc === 'both' || p.jc === 'distribute'
        ? 'justify'
        : p.jc === 'center'
          ? 'center'
          : p.jc === 'right'
            ? 'right'
            : 'left';
    css.push(`text-align:${j}`);
  }
  if (p.sp?.before !== undefined) css.push(`margin-top:${p.sp.before}px`);
  if (p.sp?.after !== undefined) css.push(`margin-bottom:${p.sp.after}px`);
  if (p.sp?.line !== undefined)
    css.push(p.sp.line < 5 ? `line-height:${p.sp.line}` : `line-height:${p.sp.line}px`);
  const ind = p.ind;
  if (ind?.left !== undefined) css.push(`padding-left:${ind.left}px`);
  if (ind?.right !== undefined) css.push(`padding-right:${ind.right}px`);
  let indent = 0;
  if (ind?.hanging !== undefined) indent = -ind.hanging;
  else if (ind?.first !== undefined) indent = ind.first;

  // Numbering
  let penanda = '';
  if (p.num) {
    const def = template.nomor.get(p.num.numId);
    const lvl = def?.[p.num.lvl];
    if (ind?.left === undefined && lvl?.left !== undefined) css.push(`padding-left:${lvl.left}px`);
    if (ind?.hanging === undefined && lvl?.hanging !== undefined) indent = -lvl.hanging;
    const c = counter.get(p.num.numId) ?? [0, 0, 0, 0, 0, 0, 0, 0, 0];
    c[p.num.lvl] = (c[p.num.lvl] ?? 0) + 1;
    for (let x = p.num.lvl + 1; x < 9; x++) c[x] = 0;
    counter.set(p.num.numId, c);
    if (lvl) {
      const teks =
        lvl.fmt === 'bullet'
          ? lvl.teks
          : lvl.teks.replace(/%(\d)/g, (_m, d: string) => {
              const idx = Number(d) - 1;
              return formatNomor(def?.[idx]?.fmt ?? 'decimal', c[idx] ?? 1);
            });
      penanda = `<span>${escapeHtml(teks)}</span>`;
    }
  }
  if (indent !== 0) css.push(`text-indent:${indent}px`);

  const gayaPar = cssGaya(p.gaya);
  if (gayaPar) css.push(gayaPar);

  // Pecah di setiap page break di dalam paragraf
  const segmen: Item[][] = [[]];
  for (const it of items) {
    if (it.t === 'page') segmen.push([]);
    else segmen[segmen.length - 1].push(it);
  }
  const bagian: string[] = [];
  segmen.forEach((seg, idx) => {
    if (idx > 0) bagian.push(divBreak);
    let isi = renderItems(seg, rel);
    if (idx === 0 && penanda) isi = penanda + isi;
    if (!isi) isi = '&#8203;';
    bagian.push(`<div style="${css.join(';')}">${isi}</div>`);
  });
  return bagian.join('');
}

// ---------------------------------------------------------------------------
// Render tabel terparse (dengan rowspan dari vMerge)
// ---------------------------------------------------------------------------

function renderTabel(
  tb: Tabel,
  ctx: Ctx,
  sec: SectionKey,
  template: TemplateDokumen,
  rel: (r: string) => string,
  counter: Map<string, number[]>
): string {
  const rows = tb.baris.length;
  // vMerge 'mulai' -> jumlah baris 'lanjut' berikut pada kolom sama; 'lanjut' dilewati
  const rowspanAt = new Map<string, number>();
  const skipSel = new Set<string>();
  for (let r = 0; r < rows; r++) {
    for (const s of tb.baris[r].sels) {
      const kunci = `${r}:${s.mulai}`;
      if (s.vMerge === 'lanjut') skipSel.add(kunci);
      else if (s.vMerge === 'mulai') {
        let n = 1;
        for (let r2 = r + 1; r2 < rows; r2++) {
          if (!tb.baris[r2].sels.some(x => x.mulai === s.mulai && x.vMerge === 'lanjut')) break;
          n++;
        }
        rowspanAt.set(kunci, n);
      }
    }
  }

  // Lebar kolom dipetakan ke persen agar tabel selalu pas dengan lebar kertas
  // (pgMar masterpp.docx = 10092 twips, jauh lebih lebar daripada area preview).
  const totalKolom = tb.kolom.reduce((s, k) => s + k, 0) || 1;
  const colgroup = tb.kolom.length
    ? `<colgroup>${tb.kolom
        .map(k => `<col style="width:${((k / totalKolom) * 100).toFixed(3)}%" />`)
        .join('')}</colgroup>`
    : '';
  const theadRows: string[] = [];
  const tbodyRows: string[] = [];

  for (let r = 0; r < rows; r++) {
    const baris = tb.baris[r];
    let selHtml = '';
    for (const s of baris.sels) {
      const kunci = `${r}:${s.mulai}`;
      if (skipSel.has(kunci)) continue;
      const gaya: string[] = [];
      if (tb.selCss) gaya.push(tb.selCss);
      if (s.batas) gaya.push(s.batas);
      if (s.shd) gaya.push(`background:${s.shd}`);
      if (s.va) gaya.push(`vertical-align:${s.va}`);
      const rs = rowspanAt.get(kunci);
      const colspan = s.span > 1 ? ` colspan="${s.span}"` : '';
      const rowspan = rs && rs > 1 ? ` rowspan="${rs}"` : '';
      const isi =
        s.paras.map(p => renderPar(p, ctx, sec, template, rel, counter)).join('') || '&#8203;';
      selHtml += `<td${colspan}${rowspan} style="${gaya.join(';')}">${isi}</td>`;
    }
    const barisHtml = `<tr>${selHtml || '<td>&#8203;</td>'}</tr>`;
    if (baris.header && r === 0) theadRows.push(barisHtml);
    else tbodyRows.push(barisHtml);
  }

  const thead = theadRows.length ? `<thead>${theadRows.join('')}</thead>` : '';
  const lebarTabel = /(^|;)\s*width\s*:/.test(tb.css) ? tb.css : `${tb.css};width:100%;`;
  return `<table style="${lebarTabel}">${colgroup}${thead}<tbody>${tbodyRows.join('')}</tbody></table>`;
}

// ---------------------------------------------------------------------------
// Tabel generik (token blok)
// ---------------------------------------------------------------------------

const SEL_DASAR = 'border:0.5pt solid #000;padding:1.5px 4px;font-size:8pt;vertical-align:middle;';
const SEL_HEADER = `${SEL_DASAR}background:#f2f2f2;font-weight:700;text-align:center;`;
const SEL_ANGKA = `${SEL_DASAR}text-align:right;`;
const angkaTabel = (n: unknown): string => (Number(n) || 0).toLocaleString('id-ID');
const persenTabel = (n: unknown): string =>
  `${(Number(n) || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`;

const selTeks = (teks: string, css: string, attrSel = ''): string =>
  `<td style="${css}"${attrSel}>${teks}</td>`;

const bukaTabel = (lebar: string[]): string =>
  '<table style="border-collapse:collapse;table-layout:fixed;width:100%;font-size:8pt;">' +
  `<colgroup>${lebar.map(w => `<col style="width:${w}" />`).join('')}</colgroup>`;

function tabelLampiranHarga(baris: LampiranHargaRow[]): string {
  const isi = baris.filter(lampiranHargaTerisi);
  // Baris 1: No | Designator | Uraian | Sat | NEGOSIASI(4) | KESEPAKATAN(2, 2 baris)
  const r1 =
    selTeks('No', `${SEL_HEADER}width:4%`, ' rowspan="3"') +
    selTeks('Designator', SEL_HEADER, ' rowspan="3"') +
    selTeks('Uraian Pekerjaan', SEL_HEADER, ' rowspan="3"') +
    selTeks('Sat', SEL_HEADER, ' rowspan="3"') +
    selTeks('NEGOSIASI', SEL_HEADER, ' colspan="4"') +
    selTeks('KESEPAKATAN', SEL_HEADER, ' colspan="2" rowspan="2"');
  // Baris 2: Telkom Akses (2) | Mandor (2)
  const r2 =
    selTeks('Telkom Akses', SEL_HEADER, ' colspan="2"') +
    selTeks('Mandor', SEL_HEADER, ' colspan="2"');
  // Baris 3: Material | Jasa | Material | Jasa | Material | Jasa
  const r3 = ['Material', 'Jasa', 'Material', 'Jasa', 'Material', 'Jasa']
    .map(t => selTeks(t, SEL_HEADER))
    .join('');

  const barisHtml = isi.map(
    (r, i) =>
      '<tr>' +
      selTeks(String(i + 1), `${SEL_DASAR}text-align:center;`) +
      selTeks(escapeHtml(r.designator || ''), SEL_DASAR) +
      selTeks(escapeHtml(r.uraian || ''), SEL_DASAR) +
      selTeks(escapeHtml(r.sat || ''), `${SEL_DASAR}text-align:center;`) +
      selTeks(angkaTabel(r.telkomMaterial), SEL_ANGKA) +
      selTeks(angkaTabel(r.telkomJasa), SEL_ANGKA) +
      selTeks(angkaTabel(r.mandorMaterial), SEL_ANGKA) +
      selTeks(angkaTabel(r.mandorJasa), SEL_ANGKA) +
      selTeks(angkaTabel(r.ksepMaterial), SEL_ANGKA) +
      selTeks(angkaTabel(r.ksepJasa), SEL_ANGKA) +
      '</tr>'
  );
  const kosong =
    '<tr>' + Array.from({ length: 10 }, () => selTeks('', SEL_DASAR)).join('') + '</tr>';
  return (
    bukaTabel(['4%', '9%', '26%', '5%', '8%', '8%', '8%', '8%', '12%', '12%']) +
    `<thead><tr>${r1}</tr><tr>${r2}</tr><tr>${r3}</tr></thead>` +
    `<tbody>${barisHtml.length ? barisHtml.join('') : kosong}</tbody></table>`
  );
}

function tabelBoqSpk(sub: ProjectSubmission): string {
  const rows = (sub.boqSpk ?? []).filter(
    r => (r.designator || '').trim() || r.vol || r.material || r.jasa
  );
  const head =
    '<tr>' +
    ['No', 'Designator', 'Material', 'Jasa', 'Vol', 'Jumlah Material', 'Jumlah Jasa', 'Total']
      .map(t => selTeks(t, SEL_HEADER))
      .join('') +
    '</tr>';
  let totMat = 0;
  let totJasa = 0;
  const body = rows.map((r, i) => {
    const jm = (Number(r.material) || 0) * (Number(r.vol) || 0);
    const jj = (Number(r.jasa) || 0) * (Number(r.vol) || 0);
    totMat += jm;
    totJasa += jj;
    return (
      '<tr>' +
      selTeks(String(i + 1), `${SEL_DASAR}text-align:center;`) +
      selTeks(escapeHtml(r.designator || ''), SEL_DASAR) +
      selTeks(angkaTabel(r.material), SEL_ANGKA) +
      selTeks(angkaTabel(r.jasa), SEL_ANGKA) +
      selTeks(angkaTabel(r.vol), `${SEL_DASAR}text-align:center;`) +
      selTeks(angkaTabel(jm), SEL_ANGKA) +
      selTeks(angkaTabel(jj), SEL_ANGKA) +
      selTeks(angkaTabel(jm + jj), SEL_ANGKA) +
      '</tr>'
    );
  });
  const footer =
    '<tr>' +
    selTeks('TOTAL', `${SEL_HEADER}text-align:left;`, ' colspan="5"') +
    selTeks(angkaTabel(totMat), `${SEL_ANGKA}font-weight:700;`) +
    selTeks(angkaTabel(totJasa), `${SEL_ANGKA}font-weight:700;`) +
    selTeks(angkaTabel(totMat + totJasa), `${SEL_ANGKA}font-weight:700;`) +
    '</tr>';
  const kosong =
    '<tr>' + Array.from({ length: 8 }, () => selTeks('', SEL_DASAR)).join('') + '</tr>';
  return (
    bukaTabel(['5%', '15%', '13%', '13%', '7%', '16%', '16%', '15%']) +
    `<thead>${head}</thead><tbody>${body.length ? body.join('') : kosong}${footer}</tbody></table>`
  );
}

/**
 * Grafik garis Kurva S (kumulatif rencana & realisasi) sebagai SVG inline.
 * Dipasang di atas tabel Rencana Kurva S pada section PP. Atribut memakai
 * properti eksplisit (bukan CSS class) supaya bisa ikut dirasterkan saat
 * Ekspor Word.
 */
function svgKurvaS(sub: ProjectSubmission): string {
  const data = (sub.kurvaSData ?? []).filter(Boolean);
  if (data.length === 0) return '';

  const width = 640;
  const height = 220;
  const padL = 46;
  const padR = 18;
  const padT = 22;
  const padB = 38;
  const cw = width - padL - padR;
  const ch = height - padT - padB;
  const baseY = height - padB;
  const X = (i: number) => padL + (i / (data.length - 1 || 1)) * cw;
  const Y = (p: unknown) =>
    baseY - (Math.max(0, Math.min(100, Number(p) || 0)) / 100) * ch;

  const pts = data.map((d, i) => ({
    x: X(i),
    y: Y(d.rencanaKumulatif),
    label: d.label || `Mg ${d.week}`,
  }));
  const jalur = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const real = data
    .map((d, i) => ({
      x: X(i),
      y: Y(d.realisasiKumulatif ?? 0),
      ada: d.realisasiKumulatif !== undefined && d.realisasiKumulatif !== null,
    }))
    .filter(p => p.ada);
  const jalurReal = real
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const grid = [0, 25, 50, 75, 100]
    .map(v => {
      const y = Y(v).toFixed(1);
      return (
        `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3 3"/>` +
        `<text x="${padL - 6}" y="${(Number(y) + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#94a3b8" font-family="Arial, sans-serif">${v}%</text>`
      );
    })
    .join('');

  const area = `${jalur} L ${pts[pts.length - 1].x.toFixed(1)} ${baseY} L ${pts[0].x.toFixed(1)} ${baseY} Z`;

  const titik = pts
    .map(
      (p, i) =>
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#0d9488" stroke="#ffffff" stroke-width="1.5"/>` +
        (data.length <= 14
          ? `<text x="${p.x.toFixed(1)}" y="${(baseY + 14).toFixed(1)}" text-anchor="middle" font-size="9" fill="#64748b" font-family="Arial, sans-serif">${escapeHtml(p.label)}</text>`
          : '')
    )
    .join('');

  const titikReal = real
    .map(
      p =>
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5"/>`
    )
    .join('');

  const realisasi = jalurReal
    ? `<path d="${jalurReal}" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 2" stroke-linecap="round"/>`
    : '';

  const legend =
    `<line x1="${padL}" y1="12" x2="${padL + 18}" y2="12" stroke="#0d9488" stroke-width="2.5"/>` +
    `<text x="${padL + 22}" y="15" font-size="9" fill="#334155" font-family="Arial, sans-serif">Rencana</text>` +
    (jalurReal
      ? `<line x1="${padL + 74}" y1="12" x2="${padL + 92}" y2="12" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 2"/>` +
        `<text x="${padL + 96}" y="15" font-size="9" fill="#334155" font-family="Arial, sans-serif">Realisasi</text>`
      : '');

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="display:block;width:100%;max-width:${width}px;height:auto;margin:0 auto 4px;">` +
    `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>` +
    grid +
    `<path d="${area}" fill="rgba(13,148,136,0.08)"/>` +
    `<path d="${jalur}" fill="none" stroke="#0d9488" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    realisasi +
    titik +
    titikReal +
    legend +
    `</svg>`
  );
}

function tabelKurvaS(sub: ProjectSubmission): string {
  const minggu = sub.kurvaSData ?? [];
  const grafik = svgKurvaS(sub);
  const caption = grafik
    ? '<p style="margin:0 0 2px;font-weight:700;font-size:9pt;text-align:center;">Grafik Kurva S</p>'
    : '';
  const head =
    '<tr>' +
    ['No', 'Minggu', 'Rencana', 'Kum. Rencana', 'Realisasi', 'Kum. Realisasi']
      .map(t => selTeks(t, SEL_HEADER))
      .join('') +
    '</tr>';
  const body = minggu.map(
    (w, i) =>
      '<tr>' +
      selTeks(String(i + 1), `${SEL_DASAR}text-align:center;`) +
      selTeks(escapeHtml(w.label || `Mg ${w.week}`), `${SEL_DASAR}text-align:center;`) +
      selTeks(persenTabel(w.rencanaMingguan), SEL_ANGKA) +
      selTeks(persenTabel(w.rencanaKumulatif), SEL_ANGKA) +
      selTeks(w.realisasiMingguan !== undefined ? persenTabel(w.realisasiMingguan) : '-', SEL_ANGKA) +
      selTeks(w.realisasiKumulatif !== undefined ? persenTabel(w.realisasiKumulatif) : '-', SEL_ANGKA) +
      '</tr>'
  );
  const kosong =
    '<tr>' +
    selTeks('Belum ada data Kurva S.', `${SEL_DASAR}text-align:center;`, ' colspan="6"') +
    '</tr>';
  return (
    caption +
    grafik +
    bukaTabel(['6%', '14%', '20%', '20%', '20%', '20%']) +
    `<thead>${head}</thead><tbody>${body.length ? body.join('') : kosong}</tbody></table>`
  );
}

function tabelBop(sub: ProjectSubmission): string {
  const rows = (sub.bopCost ?? []).filter(r => (r.designator || '').trim() || r.vol || r.hargaSatuan);
  const head =
    '<tr>' +
    ['Nomor', 'Material', 'Volume', 'Satuan', 'Harga Satuan', 'Total Harga']
      .map(t => selTeks(t, SEL_HEADER))
      .join('') +
    '</tr>';
  let total = 0;
  const body = rows.map((r, i) => {
    const harga = Number(r.hargaSatuan) || 0;
    const jml = harga * (Number(r.vol) || 0);
    total += jml;
    const hargaTeks = r.catatan && !harga ? escapeHtml(r.catatan) : angkaTabel(harga);
    return (
      '<tr>' +
      selTeks(String(i + 1), `${SEL_DASAR}text-align:center;`) +
      selTeks(escapeHtml(r.designator || ''), SEL_DASAR) +
      selTeks(angkaTabel(r.vol), `${SEL_DASAR}text-align:center;`) +
      selTeks(escapeHtml(r.satuan || '-'), `${SEL_DASAR}text-align:center;`) +
      selTeks(hargaTeks, SEL_ANGKA) +
      selTeks(angkaTabel(jml), SEL_ANGKA) +
      '</tr>'
    );
  });
  const boq = Number(sub.ppDetail?.totalProjectBoq) || Number(sub.nilaiPekerjaan) || 0;
  const ratio = boq > 0 ? (total / boq) * 100 : 0;
  const footer =
    '<tr>' +
    selTeks('Total BOP', `${SEL_HEADER}text-align:left;`, ' colspan="5"') +
    selTeks(angkaTabel(total), `${SEL_ANGKA}font-weight:700;`) +
    '</tr>' +
    '<tr>' +
    selTeks('% BOP / Total BOQ', `${SEL_HEADER}text-align:left;`, ' colspan="5"') +
    selTeks(persenTabel(ratio), `${SEL_ANGKA}font-weight:700;`) +
    '</tr>';
  const kosong =
    '<tr>' + Array.from({ length: 6 }, () => selTeks('', SEL_DASAR)).join('') + '</tr>';
  return (
    bukaTabel(['7%', '33%', '10%', '12%', '19%', '19%']) +
    `<thead>${head}</thead><tbody>${body.length ? body.join('') : kosong}${footer}</tbody></table>`
  );
}

function renderToken(token: string, sub: ProjectSubmission): string {
  switch (token) {
    case 'LAMPIRAN_HARGA':
      return tabelLampiranHarga(sub.bakhDetail?.lampiranHarga ?? []);
    case 'BOQ_SPK':
      return tabelBoqSpk(sub);
    case 'KURVA_S':
      return tabelKurvaS(sub);
    case 'BOP':
      return tabelBop(sub);
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Render dokumen utuh
// ---------------------------------------------------------------------------

export type FilterTab = SectionKey | 'BUNDLE';

export function renderDokumen(
  template: TemplateDokumen,
  sub: ProjectSubmission,
  filter: FilterTab = 'BUNDLE'
): string {
  const ctx = buatCtx(sub);
  const counter = new Map<string, number[]>();
  const bagian: string[] = [];

  // Kop surat dari header template (sekali di atas)
  if (template.kop.length) {
    const isiKop = template.kop
      .map(p => renderPar(p, ctx, 'BAKH', template, template.gambar.kop, counter))
      .join('');
    if (isiKop) bagian.push(`<div style="margin-bottom:6px;">${isiKop}</div>`);
  }

  let secTerakhir: SectionKey | null = null;
  let breakTerakhir = false;
  for (const b of template.blok) {
    if (filter !== 'BUNDLE' && b.sec !== filter) continue;
    if (filter === 'BUNDLE' && secTerakhir !== null && b.sec !== secTerakhir && !breakTerakhir) {
      bagian.push(divBreak); // pemisah antar-bagian saat digabung
    }
    secTerakhir = b.sec;
    breakTerakhir = false;
    switch (b.t) {
      case 'par': {
        bagian.push(renderPar(b.p, ctx, b.sec, template, template.gambar.dok, counter));
        const last = b.p.items[b.p.items.length - 1];
        breakTerakhir = last?.t === 'page';
        break;
      }
      case 'tbl':
        bagian.push(renderTabel(b.tb, ctx, b.sec, template, template.gambar.dok, counter));
        break;
      case 'token': {
        const html = renderToken(b.token, sub);
        if (html) bagian.push(`<div style="margin:4px 0;">${html}</div>`);
        break;
      }
    }
  }
  return bagian.join('');
}

/** Daftar key placeholder yang dikenal (untuk pengujian/diagnostik). */
export const PLACEHOLDER_DIKENAL = [
  'NO BAKH', 'NAMA PEKERJAAN', 'LOKASI', 'WITEL', 'PID', 'HARIBAKH', 'TGL SURAT',
  'HARGA PENAWARAN', 'TERBILANG', 'JUMLAH TEAM FO + JOINTER', 'INPUT DURASI KERJA',
  'INPUT GM', 'INPUT PM', 'INPUT MANDOR', 'INPUT PROJECT ADMIN', 'INPUT WASPANG',
  'NO LEONITA', 'NOHP', 'IHLD', 'MATERIALNONSTOCK', 'NILAIJASA',
  'NILAI JASA+NILAI MATERIAL', 'Total Nilai Project (Boq)', 'TOTAL KESELURAHAN',
  'INPUT TANGGAL PENGGUNAAN PP', 'Persiapan', 'Material Delivery', 'Instalasi',
  'Commissioning Test', 'Uji Terima', 'MATRIAL NON STOCK',
  'VOLUME MATERIAL NON STOCK', 'SATUAN MATERIAL NON STOCK',
  'HARGA SATUAN JASA NYA', 'TOTAL VOLUME * HARGA SATUAN',
  'Nilai Perizinan (Preliminary) yang dapat dilakukan reimbursement',
  'LAMPIRAN HARGA BAKH', 'LAMPIRAN BOQ SPK', 'MUNCUL KAN TABEL KURVA S DISINI',
  'hasil ooutput cost srukture',
];
