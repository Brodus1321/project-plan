import { ProjectSubmission } from '../types';

/**
 * REGISTRY BERKAS PRELIM (a s/d l) — SATU SUMBER KEBENARAN.
 *
 * Berkas identitas & rekening penerima (dulunya satu entri "i") dipecah
 * menjadi tiga unggahan terpisah: i1 (KTP), i2 (NPWP), i3 (Buku Tabungan).
 *
 * Semua label/huruf berkas di seluruh aplikasi (wizard input, daftar antrian,
 * modal cetak, modal SOP, modal eviden) wajib mengambil dari file ini.
 * Jangan menulis label berkas secara manual di mana pun agar penomoran tidak
 * bentrok antar layar.
 *
 * Dua kelompok alur:
 *  - kind: 'input'  -> datanya diinputkan; alur rinci per berkas menyusul
 *                      (rumah/slot-nya sudah disiapkan di BerkasStepShell).
 *  - kind: 'upload' -> berkas diunggah lalu sistem membaca/meng-generate
 *                      ke dokumen.
 */

export type BerkasLetter =
  | 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'
  | 'i1' | 'i2' | 'i3'
  | 'j' | 'k' | 'l';

export type DokumenKey = keyof ProjectSubmission['dokumen'];
export type BerkasKind = 'input' | 'upload';

export interface BerkasDef {
  /** Huruf urut SOP. */
  letter: BerkasLetter;
  /** Nomor langkah 1..14 (selalu = index + 1 dari array ini). */
  step: number;
  /** Key pada ProjectSubmission['dokumen']. */
  key: DokumenKey;
  /** Label lengkap sesuai SOP. */
  label: string;
  /** Label pendek untuk rail/stepper. */
  short: string;
  /**
   * Label khusus langkah wizard (rail + judul langkah). Bila kosong, dipakai
   * `short`/`label`. Berguna saat isi langkah bergeser dari label dokumennya.
   */
  wizardShort?: string;
  wizardLabel?: string;
  /** 'input' = isian, 'upload' = unggah lalu generate. */
  kind: BerkasKind;
  /** Penjelasan singkat isi berkas ini (tampil di rumah/langkah). */
  purpose: string;
  /** Aturan turunan tanggal SOP, bila ada. */
  rule?: string;
  /** accept attribute input file (hanya kind: 'upload'). */
  accept?: string;
  /** Petunjuk format unggahan. */
  uploadHint?: string;
  /**
   * true = boleh diisi belakangan (diluar wizard), misal eviden yang baru
   * tersedia setelah transfer dilakukan.
   */
  deferred?: boolean;
}

export const BERKAS_PRELIM: BerkasDef[] = [
  {
    letter: 'a', step: 1, key: 'bakh',
    label: 'BAKH (Berita Acara Kesepakatan Harga)',
    short: 'BAKH',
    wizardShort: 'Informasi Pekerjaan',
    wizardLabel: 'Informasi Pekerjaan (Dasar Pekerjaan)',
    kind: 'input',
    purpose: 'Berita acara kesepakatan harga antara Telkom Akses dengan vendor pelaksana.',
    rule: 'Tanggal sama dengan SPK',
  },
  {
    letter: 'b', step: 2, key: 'spk',
    label: 'SPK (Surat Perintah Kerja)',
    short: 'SPK',
    wizardShort: 'BOQ',
    wizardLabel: 'BOQ',
    kind: 'input',
    purpose: 'Surat perintah kerja beserta data kontrak: vendor, lokasi, nilai, dan durasi.',
    rule: 'Dasar penanggalan seluruh berkas',
  },
  {
    letter: 'c', step: 3, key: 'pp',
    label: 'PP (Permintaan Pembayaran)',
    short: 'PP',
    wizardShort: 'Struktur Organisasi & Tim Proyek',
    wizardLabel: 'Struktur Organisasi & Tim Proyek',
    kind: 'input',
    purpose: 'Data PP: nama kegiatan, id project, total BOQ & pengajuan IF (termin), tanggal penggunaan, disposisi IHLD/NDE, dan personel.',
    rule: '2 hari setelah tanggal SPK',
  },
  {
    letter: 'h', step: 4, key: 'kurvaS',
    label: 'GRAVIK CURVA S',
    short: 'Gravik Kurva S',
    wizardShort: 'Jadwal Pelaksanaan Proyek',
    wizardLabel: 'Jadwal Pelaksanaan Proyek',
    kind: 'input',
    purpose: 'Perkiraan margin (kemitraan & swakelola) serta rincian kebutuhan BOP Cost Structure. Isian Kurva S sendiri ada di langkah BAKH.',
    rule: 'Mengikuti durasi kerja pada SPK',
  },
  {
    letter: 'f', step: 5, key: 'pengajuanPanjar',
    label: 'Pengajuan Panjar Proyek',
    short: 'Pengajuan Panjar Proyek',
    kind: 'input',
    purpose: 'Formulir pengajuan panjar operasional untuk pencairan prelim.',
    rule: 'Tanggal sama dengan tanggal PP',
  },
  {
    letter: 'd', step: 6, key: 'boqDrm',
    label: 'BOQ DRM (Design Review Meeting)',
    short: 'BOQ DRM',
    kind: 'upload',
    purpose: 'Unggah BOQ hasil DRM. Berkas Excel dibaca sistem lalu digenerate ke dokumen.',
    rule: '',
    accept: '.xlsx,.xls,.xlsm,.csv',
    uploadHint: 'Excel (.xlsx / .xls / .csv) — baris dibaca lalu dirangkum ke dokumen BOQ DRM',
  },
  {
    letter: 'e', step: 7, key: 'lampiranDasarPekerjaan',
    label: 'Lampiran Dasar Pekerjaan (UPLOAD)',
    short: 'Dasar Pekerjaan',
    kind: 'upload',
    purpose: 'Surat justifikasi / dasar instruksi kerja, digenerate ke dokumen lampiran.',
    rule: '',
    accept: '.pdf,.jpg,.jpeg,.png',
    uploadHint: 'PDF / JPG (maks 10 MB)',
  },
  {
    letter: 'g', step: 8, key: 'imprestFund',
    label: 'Imprest Fund (IF)',
    short: 'Imprest Fund',
    kind: 'input',
    purpose: 'Lembar disposisi Imprest Fund beserta nominal yang dicairkan.',
    rule: '2 hari setelah tanggal pengajuan panjar',
  },
  {
    letter: 'i1', step: 9, key: 'ktp',
    label: 'Lampiran KTP Penerima (UPLOAD)',
    short: 'KTP',
    kind: 'upload',
    purpose: 'Foto / scan KTP penerima panjar untuk verifikasi identitas penerima.',
    rule: '',
    accept: '.pdf,.jpg,.jpeg,.png,.zip',
    uploadHint: 'PDF / JPG / ZIP (maks 10 MB)',
  },
  {
    letter: 'i2', step: 10, key: 'npwp',
    label: 'Lampiran NPWP Penerima (UPLOAD)',
    short: 'NPWP',
    kind: 'upload',
    purpose: 'Foto / scan NPWP penerima panjar untuk keperluan administrasi & pajak.',
    rule: '',
    accept: '.pdf,.jpg,.jpeg,.png,.zip',
    uploadHint: 'PDF / JPG / ZIP (maks 10 MB)',
  },
  {
    letter: 'i3', step: 11, key: 'bukuRekening',
    label: 'Lampiran Buku Tabungan Penerima (UPLOAD)',
    short: 'Buku Tabungan',
    kind: 'upload',
    purpose: 'Halaman depan buku tabungan penerima untuk verifikasi rekening pencairan.',
    rule: '',
    accept: '.pdf,.jpg,.jpeg,.png,.zip',
    uploadHint: 'PDF / JPG / ZIP (maks 10 MB)',
  },
  {
    letter: 'j', step: 12, key: 'evidenSerahTerimaPrelim',
    label: 'Evidence Serah Terima Prelim (UPLOAD)',
    short: 'Eviden Serah Terima',
    kind: 'upload',
    purpose: 'Berita acara / tanda terima fisik dari penerima prelim, digenerate ke dokumen.',
    rule: 'Diunggah setelah serah terima dilakukan',
    accept: '.pdf,.jpg,.jpeg,.png',
    uploadHint: 'PDF / JPG berisi berita acara atau tanda terima fisik',
    deferred: true,
  },
  {
    letter: 'k', step: 13, key: 'buktiTransferTA',
    label: 'Lampiran Bukti Transfer dari TA ke Penerima Prelim (UPLOAD)',
    short: 'Bukti Transfer',
    kind: 'upload',
    purpose: 'Struk / mutasi rekening dari TA ke penerima prelim, digenerate ke dokumen.',
    rule: 'Diunggah setelah transfer dilakukan',
    accept: '.pdf,.jpg,.jpeg,.png',
    uploadHint: 'PDF / JPG berisi struk atau mutasi rekening',
    deferred: true,
  },
  {
    letter: 'l', step: 14, key: 'spb',
    label: 'SPB (UPLOAD)',
    short: 'SPB',
    kind: 'upload',
    purpose: 'Surat Perintah Bayar dari Bagian Keuangan / Treasury, digenerate ke dokumen.',
    rule: '',
    accept: '.pdf,.jpg,.jpeg,.png',
    uploadHint: 'PDF / JPG surat perintah bayar',
  },
];

/** Semua berkas kelompok alur input (a,b,c,f,g,h). */
export const BERKAS_INPUT: BerkasDef[] = BERKAS_PRELIM.filter(b => b.kind === 'input');

/** Semua berkas kelompok unggah + generate (d,e,i1-i3,j,k,l). */
export const BERKAS_UPLOAD: BerkasDef[] = BERKAS_PRELIM.filter(b => b.kind === 'upload');

/**
 * Urutan langkah yang tampil di wizard "Input Pengajuan Prelim Proyek".
 * Hanya berkas inti (a,b,c,h,f) — sisanya di luar wizard (diolah di menu lain).
 */
const WIZARD_KEYS: DokumenKey[] = ['bakh', 'spk', 'pp', 'kurvaS', 'pengajuanPanjar'];
export const BERKAS_PRELIM_WIZARD: BerkasDef[] = BERKAS_PRELIM.filter(b =>
  WIZARD_KEYS.includes(b.key)
);

const BY_LETTER = new Map<BerkasLetter, BerkasDef>(BERKAS_PRELIM.map(b => [b.letter, b]));
const BY_KEY = new Map<DokumenKey, BerkasDef>(BERKAS_PRELIM.map(b => [b.key, b]));

export function berkasByLetter(letter: BerkasLetter): BerkasDef {
  const found = BY_LETTER.get(letter);
  if (!found) throw new Error(`Berkas '${letter}' tidak ada di registry`);
  return found;
}

export function berkasByKey(key: DokumenKey): BerkasDef {
  const found = BY_KEY.get(key);
  if (!found) throw new Error(`Key berkas '${key}' tidak ada di registry`);
  return found;
}

/** Nama berkas tanpa prefiks huruf, contoh: "Evidence Serah Terima Prelim (UPLOAD)". */
export function berkasLabel(letter: BerkasLetter): string {
  return berkasByLetter(letter).label;
}

/** Nama berkas dari key dokumen, contoh: "Lampiran Bukti Transfer dari TA ...". */
export function berkasLabelByKey(key: DokumenKey): string {
  return berkasByKey(key).label;
}

/** Rentang urutan berkas untuk teks "1 s/d 14". */
export const RENTANG_BERKAS = `1 s/d ${BERKAS_PRELIM.length}`;

/** Kunci berkas yang menahan kunci cetak (eviden wajib masuk dulu). */
export const EVIDEN_KUNCI_CETAK: BerkasLetter[] = ['j', 'k'];
