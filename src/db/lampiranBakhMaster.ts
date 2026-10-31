/**
 * Master data Lampiran BAKH — harga material/jasa dari RAB TA, Mandor, Nego.
 * Dipergunakan untuk auto-populate uraian & harga saat user input designator.
 */

export interface RabItemMaster {
  designator: string;
  uraian: string;
  sat: string;
  taaMaterial: number;  // RAB TA — Material
  taaJasa: number;      // RAB TA — Jasa
  mandorMaterial: number;  // RAB Mandor — Material
  mandorJasa: number;      // RAB Mandor — Jasa
}

/**
 * Master Lampiran BAKH dari RAB TA & Mandor.
 * Kolom: Designator | Uraian | Satuan | TA Material | TA Jasa | Mandor Material | Mandor Jasa
 */
export const RAB_MASTER: RabItemMaster[] = [
  {
    designator: 'AB-OF-SM-12D',
    uraian: 'Pengadaan dan pemasangan air blown cable optik, single mode 12 core, g 652 d',
    sat: 'meter',
    taaMaterial: 5480,
    taaJasa: 2220,
    mandorMaterial: 4110,
    mandorJasa: 1665,
  },
  {
    designator: 'AB-OF-SM-144D',
    uraian: 'Pengadaan dan pemasangan air blown cable optik, single mode 144 core, g 652 d',
    sat: 'meter',
    taaMaterial: 36000,
    taaJasa: 3560,
    mandorMaterial: 27000,
    mandorJasa: 2670,
  },
  {
    designator: 'AB-OF-SM-24D',
    uraian: 'Pengadaan dan pemasangan air blown cable optik, single mode 24 core, g 652 d',
    sat: 'meter',
    taaMaterial: 7820,
    taaJasa: 3150,
    mandorMaterial: 5865,
    mandorJasa: 2362.5,
  },
  {
    designator: 'AB-OF-SM-288D',
    uraian: 'Pengadaan dan pemasangan air blown cable optik, single mode 288 core, g 652 d',
    sat: 'meter',
    taaMaterial: 68650,
    taaJasa: 4450,
    mandorMaterial: 51487.5,
    mandorJasa: 3337.5,
  },
  {
    designator: 'AB-OF-SM-2D',
    uraian: 'Pengadaan dan pemasangan air blown cable optik, single mode 2 core, g 652 d',
    sat: 'meter',
    taaMaterial: 1520,
    taaJasa: 2220,
    mandorMaterial: 1140,
    mandorJasa: 1665,
  },
  {
    designator: 'AB-OF-SM-48D',
    uraian: 'Pengadaan dan pemasangan air blown cable optik, single mode 48 core, g 652 d',
    sat: 'meter',
    taaMaterial: 12350,
    taaJasa: 3150,
    mandorMaterial: 9262.5,
    mandorJasa: 2362.5,
  },
  {
    designator: 'AB-OF-SM-4D',
    uraian: 'Pengadaan dan pemasangan air blown cable optik, single mode 4 core, g 652 d',
    sat: 'meter',
    taaMaterial: 2120,
    taaJasa: 2220,
    mandorMaterial: 1590,
    mandorJasa: 1665,
  },
  {
    designator: 'AB-OF-SM-72D',
    uraian: 'Pengadaan dan pemasangan air blown cable optik, single mode 72 core, g 652 d',
    sat: 'meter',
    taaMaterial: 19830,
    taaJasa: 3150,
    mandorMaterial: 14872.5,
    mandorJasa: 2362.5,
  },
  {
    designator: 'AB-OF-SM-8D',
    uraian: 'Pengadaan dan pemasangan air blown cable optik, single mode core, g 652 d',
    sat: 'meter',
    taaMaterial: 3960,
    taaJasa: 2220,
    mandorMaterial: 2970,
    mandorJasa: 1665,
  },
  {
    designator: 'AB-OF-SM-96D',
    uraian: 'Pengadaan dan pemasangan air blown cable optik, single mode 96 core, g 652 d',
    sat: 'meter',
    taaMaterial: 23340,
    taaJasa: 3110,
    mandorMaterial: 17505,
    mandorJasa: 2332.5,
  },
  {
    designator: 'AC-OF-SM-1-3SL',
    uraian: 'Pengadaan Dan Pemasangan Drop Cable FO 1 Core Single Mode G.657 dengan Penguat 3 Seling',
    sat: 'meter',
    taaMaterial: 1060,
    taaJasa: 1430,
    mandorMaterial: 795,
    mandorJasa: 1072.5,
  },
  {
    designator: 'AC-OF-SM-12-SC',
    uraian: 'Pengadaan dan pemasangan kabel udara fiber optik single mode 12 core g 652 d, "easy to split"',
    sat: 'meter',
    taaMaterial: 5420,
    taaJasa: 3910,
    mandorMaterial: 4065,
    mandorJasa: 2932.5,
  },
];

/** Cari item di master berdasarkan designator (case-insensitive). */
export function cariRabItem(designator: string): RabItemMaster | undefined {
  if (!designator) return undefined;
  return RAB_MASTER.find(
    item => item.designator.toLowerCase() === designator.toLowerCase()
  );
}

/** Hitung subtotal Material dari array harga dan volume. */
export function hitungSubtotalMaterial(
  rows: Array<{ ksepMaterial: number; volume: number }>
): number {
  return rows.reduce((sum, r) => sum + ((r.ksepMaterial || 0) * (r.volume || 0)), 0);
}

/** Hitung subtotal Jasa dari array harga dan volume. */
export function hitungSubtotalJasa(
  rows: Array<{ ksepJasa: number; volume: number }>
): number {
  return rows.reduce((sum, r) => sum + ((r.ksepJasa || 0) * (r.volume || 0)), 0);
}
