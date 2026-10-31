export type SubmissionStatus = 
  | 'DRAFT'
  | 'MENUNGGU_VERIFIKASI' // Baru diinput admin, menunggu verifikator
  | 'REVISI_ADMIN'        // Ditolak verifikator, dikembalikan untuk revisi
  | 'VERIFIKASI_ADMIN'
  | 'KIRIM_DIGITAL'
  | 'MENUNGGU_EVIDEN' // Menunggu Eviden Transfer & Serah Terima
  | 'SIAP_CETAK'      // Eviden sudah masuk, berkas siap diprint
  | 'SELESAI';

/**
 * Hasil pemeriksaan verifikator atas pengajuan yang diinput admin.
 * `MENUNGGU`  — admin sudah selesai input, belum diperiksa.
 * `DISETUJUI` — lolos; berkas lanjut ke alur eviden & cetak.
 * `REVISI`    — dikembalikan ke admin beserta catatan perbaikan.
 *
 * Field ini bersifat opsional: data lama (tanpa field) dianggap sudah
 * disetujui agar daftar demo yang ada tetap bisa dicetak.
 */
export type VerifikasiStatus = 'MENUNGGU' | 'DISETUJUI' | 'REVISI';

export interface KurvaSWeek {
  week: number;
  label: string;
  rencanaMingguan: number;
  rencanaKumulatif: number;
  realisasiMingguan?: number;
  realisasiKumulatif?: number;
}

/**
 * Satu kolom progres pada Kurva S (header TGL-BLN-THN di KURVA S.xlsx).
 * Daftar progres fleksibel: admin boleh menambah / mengubah nama / menghapus,
 * dan mengisi tanggalnya sendiri per progres.
 */
export interface KurvaSProgress {
  id: string;
  nama: string;
  /** yyyy-mm-dd. Kosong bila admin belum mengisi tanggal progres ini. */
  tanggal: string;
}

/**
 * Satu baris isian: item dipilih dari master + qty, ditempatkan ke satu progres.
 * Nilai baris = qty x (material + jasa) memakai harga dari master KURVA S.xlsx.
 */
export interface KurvaSEntry {
  id: string;
  /** Nama item persis seperti di master. */
  item: string;
  material: number;
  jasa: number;
  qty: number;
  progressId: string;
}

/** Isian langkah GRAVIK CURVA S (diisi lewat popup). */
export interface KurvaSPlan {
  /** Tanggal mulai kerja mandor - patokan awal sumbu waktu. */
  tanggalMulaiMandor: string;
  progres: KurvaSProgress[];
  entries: KurvaSEntry[];
}

export interface DocumentUpload {
  id: string;
  name: string;
  fileName?: string;
  fileSize?: string;
  uploadedAt?: string;
  fileUrl?: string; // Data URL or mock path
  required: boolean;
  status: 'PENDING' | 'UPLOADED' | 'VERIFIED';
}

/**
 * Isian rinci berkas a (BAKH). Satu field per baris isian pada dokumen master
 * `masterpp.docx` — dipakai saat generate dokumen nanti.
 */
export interface BakhDetail {
  /** NAMA PEKERJAAN (dropdown, mis. CENTRATAMA / IFORTE / OSP). */
  namaPekerjaan: string;
  /** LOKASI — memakai lokasi proyek yang sama dengan langkah SPK. */
  lokasi: string;
  /** WITEL, mis. JAKARTA UTARA. */
  witel: string;
  /** PID SAP, mis. 26KT08R201-0033. */
  pid: string;
  /** TGL SURAT dalam format ISO; ditampilkan sebagai "10 September 2026". */
  tglSurat: string;
  /** HARGA PENAWARAN (Rp). */
  hargaPenawaran: number;
  /** HARGA KESEPAKATAN (Rp). */
  hargaKesepakatan: number;
  /** JUMLAH TEAM FO (1 team = 4 orang). */
  teamFo: number;
  /** JUMLAH TEAM JOINTER (1 team = 2 orang). */
  teamJoiner: number;
  /** DURASI PEKERJAAN (hari) — sama dengan durasi kerja langkah SPK. */
  durasiPekerjaan: number;
  /** LAMPIRAN HARGA — baris tabel (Designator | Uraian | Sat | Negosiasi | Kesepakatan). */
  lampiranHarga: LampiranHargaRow[];
  /** Nama file Excel Lampiran Harga (bila diunggah). */
  lampiranHargaFile?: string;
  /** INPUT GM (dropdown nama). */
  gm: string;
  /** INPUT PM (dropdown nama). */
  pm: string;
  /** INPUT MANDOR (dropdown nama). */
  mandor: string;
  /** PROJECT ADMIN (dropdown nama). */
  projectAdmin: string;
  /** ALUR PROYEK — jumlah hari per tahap; totalnya = durasiPekerjaan. */
  alurProyek: AlurProyek;
  /** Rentang durasi kerja (DARI tanggal). */
  durasiDari: string;
  /** Rentang durasi kerja (SAMPAI tanggal). */
  durasiSampai: string;
}

/** Alur proyek BAKH — jumlah hari tiap tahap (Σ = jumlah hari kerja). */
export interface AlurProyek {
  /** Persiapan (hari). */
  persiapan: number;
  /** Material Delivery (hari). */
  materialDelivery: number;
  /** Instalasi (hari). */
  instalasi: number;
  /** Commissioning Test (hari). */
  commissioningTest: number;
  /** Uji Terima (hari). */
  ujiTerima: number;
}

/**
 * Baris Lampiran Harga (BAKH) — mengikuti format Excel:
 * No | Designator | Uraian Pekerjaan | Sat |
 * Negosiasi (Telkom Akses Mat/Jasa, Mandor Mat/Jasa) | Kesepakatan (Mat/Jasa).
 */
export interface LampiranHargaRow {
  /** Kode item (kolom Designator). */
  designator: string;
  /** Uraian pekerjaan (boleh multi-baris). */
  uraian: string;
  /** Satuan (meter, titik, dsb). */
  sat: string;
  /** Negosiasi — Telkom Akses / Material. */
  telkomMaterial: number;
  /** Negosiasi — Telkom Akses / Jasa. */
  telkomJasa: number;
  /** Negosiasi — Mandor / Material. */
  mandorMaterial: number;
  /** Negosiasi — Mandor / Jasa. */
  mandorJasa: number;
  /** Kesepakatan / Material. */
  ksepMaterial: number;
  /** Kesepakatan / Jasa. */
  ksepJasa: number;
  /** Volume input oleh user. */
  volume: number;
}

/** Baris Lampiran Harga kosong (baris bawaan tabel). */
export const barisLampiranHargaKosong = (): LampiranHargaRow => ({
  designator: '',
  uraian: '',
  sat: '',
  telkomMaterial: 0,
  telkomJasa: 0,
  mandorMaterial: 0,
  mandorJasa: 0,
  ksepMaterial: 0,
  ksepJasa: 0,
  volume: 0,
});

/** Total nilai Kesepakatan satu baris (Material + Jasa). */
export const totalKesepakatanBaris = (r: LampiranHargaRow): number =>
  (Number(r.ksepMaterial) || 0) + (Number(r.ksepJasa) || 0);

/** Total nilai Negosiasi satu baris (Telkom Akses + Mandor, Material + Jasa). */
export const totalNegosiasiBaris = (r: LampiranHargaRow): number =>
  (Number(r.telkomMaterial) || 0) +
  (Number(r.telkomJasa) || 0) +
  (Number(r.mandorMaterial) || 0) +
  (Number(r.mandorJasa) || 0);

/** Baris Lampiran Harga terisi nilai apa pun (untuk saringan payload & validasi). */
export const lampiranHargaTerisi = (r: LampiranHargaRow): boolean =>
  Boolean((r.designator || '').trim()) || totalKesepakatanBaris(r) > 0;

/** Baris Lampiran BOQ SPK: No | Designator | Material | Jasa | Vol | … */
export interface BoqSpkRow {
  /** Designator / ID barang. */
  designator: string;
  /** Harga satuan Material (Rp). */
  material: number;
  /** Harga satuan Jasa (Rp). */
  jasa: number;
  /** Volume. */
  vol: number;
  /** Satuan material (diisi manual pada tabel Rincian Material Non Stock). */
  satuan?: string;
}

/** Baris Rincian Kebutuhan BOP Cost Structure (sumber: BOQ SWAKELOLA.xlsx). */
export interface BopCostRow {
  id: string;
  /** Designator barang dari master BOQ swakelola. */
  designator: string;
  /** Satuan dari master BOQ swakelola (mis. meter, pcs, Lumpsum). */
  satuan: string;
  /** Harga satuan Material dari master BOQ swakelola (Rp). */
  hargaSatuan: number;
  /** Teks harga bila sel master berisi teks (mis. "At Cost +3%"). */
  catatan?: string;
  /** Volume — default ditarik dari Lampiran BOQ SPK (designator sama), bisa diubah manual. */
  vol: number;
}

/** Tingkat risiko pada bagian V. Manajemen Risiko (satu pilihan). */
export const LEVEL_RISIKO = ['TINGGI', 'SEDANG', 'RENDAH'] as const;
export type LevelRisiko = (typeof LEVEL_RISIKO)[number];

/** Angka Penilaian satu blok Perkiraan Margin (Kemitraan / Swakelola). % dihitung / Revenue. */
export interface MarginAngka {
  revenue: number;
  cogs: number;
  materialStock: number;
  materialNonStock: number;
  jasa: number;
  sewa: number;
  operasional: number;
}

/** Isian rinci berkas c (SPK). Lokasi/witel/mandor mengikuti BAKH. */
export interface SpkDetail {
  /** NO LEONITA. */
  noLeonita: string;
  /** TGL SURAT — sama dengan Tgl Surat BAKH. */
  tglSurat: string;
  /** WITEL — sama dengan BAKH. */
  witel: string;
  /** INPUT MANDOR — sama dengan BAKH. */
  mandor: string;
  /** LOKASI — sama dengan BAKH. */
  lokasi: string;
  /** INPUT WASPANG (dropdown). */
  waspang: string;
  /** NOHP — terisi otomatis dari Waspang. */
  noHp: string;
  /** INPUT TGL MULAI KERJA (SPK). */
  tglMulaiKerja: string;
  /** Rentang selesai kerja (tampil sebagai range di SPK). */
  tglSelesaiKerja: string;
  /** Σ Jumlah Jasa dari Lampiran BOQ SPK. */
  nilaiJasa: number;
  /** Σ Jumlah Material (nonstock) dari Lampiran BOQ SPK. */
  nilaiMaterial: number;
  /** NILAI TOTAL SPK = Nilai Jasa + Nilai Material. */
  nilaiTotal: number;
}

export interface PpDetail {
  /** NAMA KEGIATAN — mengikuti Lokasi di BAKH. */
  namaKegiatan: string;
  /** ID PROJECT (PID) — mengikuti PID di BAKH. */
  idProject: string;
  /** TOTAL NILAI PROJECT (BOQ) — dari input BOQ DRM (Material + Jasa). */
  totalProjectBoq: number;
  /** SAAT PENGGUNAAN — INPUT TANGGAL PENGGUNAAN PP. */
  tglPenggunaan: string;
  /** Jenis disposisi: IHLD atau NDE. */
  jenisDisposisi: 'IHLD' | 'NDE';
  /** Nomor IHLD (bila IHLD) atau Nomor NDE (bila NDE). */
  nomorDisposisi: string;
  /** INPUT Termin 1. */
  termin1: number;
  /** INPUT Termin 2. */
  termin2: number;
  /** INPUT Termin 3. */
  termin3: number;
  /** INPUT Prelim. */
  prelim: number;
  /** INPUT Retensi. */
  retensi: number;
  /** INPUT Material Non Stock (key storage tetap `materialStock`). */
  materialStock: number;
  /** INPUT Lumpsum. */
  lumpsum: number;
  /** TOTAL NILAI PENGAJUAN IF PROJECT = Σ Prelim + Termin 1/2/3 + Retensi + Material Non Stock + Lumpsum. */
  totalPengajuanIF: number;
  /** PM — mengikuti BAKH. */
  pm: string;
  /** WASPANG — mengikuti SPK. */
  waspang: string;
  /** PROJECT ADMIN — mengikuti BAKH. */
  projectAdmin: string;
  /** TEKNISI — sumber belum ditentukan (dikosongkan dulu). */
  teknisi: string;
  /** MANDOR — mengikuti BAKH. */
  mandor: string;
}

export interface ProjectSubmission {
  id: string;
  nomorSPK: string;
  nomorPP: string;
  nomorBAKH: string;
  nomorIF: string;
  namaPekerjaan: string;
  lokasiProyek: string;
  regional: string;
  picProyek: string;
  vendorPelaksana: string;
  namaPenerimaPrelim: string;
  bankPenerima: string;
  nomorRekening: string;
  npwpPenerima: string;
  /** Penerima panjar: Prelim (input manual) atau Mandor (data dari database). */
  jenisPenerima?: 'prelim' | 'mandor';

  /** Isian rinci berkas a (BAKH) — sumber data generate masterpp.docx. */
  bakhDetail?: BakhDetail;

  /** Isian rinci berkas c (SPK). */
  spkDetail?: SpkDetail;

  /** Isian rinci berkas c.3 (PP) — nama kegiatan, termin, IHLD/NDE, personel. */
  ppDetail?: PpDetail;

  /** Lampiran BOQ SPK (tabel: Designator / Material / Jasa / Vol). */
  boqSpk?: BoqSpkRow[];
  
  nilaiPekerjaan: number;
  nilaiPrelimPanjar: number; // Nilai panjar prelim yang dicairkan via IF
  persentasePrelim: number; // e.g. 20% or 30%

  // Dates according to SOP:
  tanggalSPK: string;           // Tanggal SPK (c)
  tanggalBAKH: string;          // Tanggal sama dengan SPK (a)
  tanggalMulaiKerja: string;    // c.1: Hari yang sama mengikuti durasi Kurva S di PP
  durasiKerjaHari: number;      // c.1: Durasi full pekerjaan
  tanggalSelesaiKerja: string;  // Auto-calculated
  tanggalPP: string;            // d: 2 Hari setelah tanggal SPK
  tanggalPengajuanPanjar: string;// g: Tanggal sama dengan PP
  tanggalImprestFund: string;   // h: 2 Hari setelah tanggal pengajuan panjar
  tanggalTransfer?: string;

  // Kurva S data
  kurvaSData: KurvaSWeek[];
  /** Isian rinci Kurva S (tanggal progres + item & qty per progres). Opsional. */
  kurvaSPlan?: KurvaSPlan;

  /** Rincian Kebutuhan BOP Cost Structure (diisi lewat popup pada langkah Jadwal Pelaksanaan Proyek). */
  bopCost?: BopCostRow[];
  /** Nilai Perintah Rincian (Preliminary) yang dapat dilakukan reimbursemen (Rp). */
  nilaiPerintahRincian?: number;
  /** Nilai Perizinan (Preliminary) yang dapat dilakukan reimbursement (Rp). */
  nilaiPerizinan?: number;
  /** V. Manajemen Risiko — tingkat risiko proyek (TINGGI / SEDANG / RENDAH). */
  manajemenRisiko?: LevelRisiko | '';
  /** Perkiraan Margin yang dilaksanakan (langkah Jadwal Pelaksanaan Proyek) — blok a. Kemitraan & b. Swakelola. */
  marginEstimate?: { kemitraan: MarginAngka; swakelola: MarginAngka };

  // Uploaded documents checklist. Huruf a-m mengikuti registry src/db/berkas.ts
  // (satu-satunya sumber kebenaran penomoran berkas — jangan label manual di view).
  dokumen: {
    bakh: DocumentUpload;                  // a (INPUT)
    lampiranKesepakatanHarga: DocumentUpload;// b (INPUT)
    spk: DocumentUpload;                   // c (INPUT)
    pp: DocumentUpload;                    // d (INPUT)
    boqDrm: DocumentUpload;                // e (UPLOAD, Excel)
    lampiranDasarPekerjaan: DocumentUpload;// f (UPLOAD)
    pengajuanPanjar: DocumentUpload;       // g (INPUT)
    imprestFund: DocumentUpload;           // h (INPUT)
    kurvaS: DocumentUpload;                // i (GRAVIK CURVA S, INPUT -> generate)
    ktp: DocumentUpload;                   // i1 (UPLOAD) — KTP penerima panjar
    npwp: DocumentUpload;                  // i2 (UPLOAD) — NPWP penerima panjar
    bukuRekening: DocumentUpload;          // i3 (UPLOAD) — buku tabungan penerima
    evidenSerahTerimaPrelim: DocumentUpload;// k (UPLOAD EVIDEN SERAH TERIMA)
    buktiTransferTA: DocumentUpload;       // l (UPLOAD EVIDEN BUKTI TRANSFER TA KE PENERIMA)
    spb: DocumentUpload;                   // m (UPLOAD)
  };

  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
  catatan?: string;
  amandemenCount: number;
  isLockedForPrint: boolean; // Locked until eviden j & k uploaded

  /** Nama admin yang menginput pengajuan ini. */
  diajukanOleh?: string;
  /** Hasil pemeriksaan verifikator. Kosong = pengajuan lama (dianggap lolos). */
  verifikasiStatus?: VerifikasiStatus;
  /** Catatan revisi dari verifikator (terisi saat verifikasiStatus = REVISI). */
  verifikasiCatatan?: string;
  /** Nama verifikator yang memutuskan. */
  diverifikasiOleh?: string;
  /** yyyy-mm-dd keputusan verifikator. */
  diverifikasiPada?: string;
}

export interface AmandemenRecord {
  id: string;
  submissionId: string;
  nomorAmandemen: string; // misal AMD-01/SPK/...
  tanggalAmandemen: string;
  alasanAmandemen: 'PERPANJANGAN_WAKTU' | 'PERUBAHAN_BIAYA' | 'REVISI_KURVA_S' | 'PERUBAHAN_REKENING' | 'LAINNYA';
  keterangan: string;
  perubahan: {
    field: string;
    sebelum: string;
    sesudah: string;
  }[];
  pemohon: string;
  disetujuiOleh?: string;
  status: 'MENUNGGU_PERSETUJUAN' | 'DISETUJUI' | 'DITOLAK';
  lampiranAmandemenUrl?: string;
}

export interface ImprestFundEntry {
  id: string;
  tanggal: string;
  nomorTransaksi: string;
  submissionId?: string;
  nomorSPK?: string;
  proyek?: string;
  penerima: string;
  tipe: 'DROP_DANA_IF' | 'PENCAIRAN_PRELIM' | 'SETOR_SISA_PRELIM' | 'BIAYA_OPERASIONAL';
  debit: number;   // Masuk
  kredit: number;  // Keluar
  saldo: number;
  keterangan: string;
  petugasTA: string;
  buktiUrl?: string;
}
