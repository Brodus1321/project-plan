import { ProjectSubmission, AmandemenRecord, ImprestFundEntry, SubmissionStatus, DocumentUpload, KurvaSEntry, KurvaSPlan, KurvaSWeek, AlurProyek } from '../types';
import { KURVA_S_PROGRES_DEFAULT } from './kurvaSMaster';

const STORAGE_KEYS = {
  SUBMISSIONS: 'prelim_submissions_v1',
  AMANDEMEN: 'prelim_amandemen_v1',
  IF_ENTRIES: 'prelim_if_entries_v1',
  DRAFT_METADATA: 'prelim_draft_metadata_v1',
};

// Muat data contoh/demo saat pertama kali buka aplikasi?
// Set true jika suatu saat ingin menampilkan data demo lagi.
const SEED_DEMO_DATA = false;

// Bersihkan sekali jalan data demo lama yang mungkin masih tersimpan di
// browser (localStorage). Hanya berjalan sekali per browser.
const PURGE_FLAG_KEY = 'prelim_demo_purged_v1';
try {
  if (typeof localStorage !== 'undefined' && !localStorage.getItem(PURGE_FLAG_KEY)) {
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.AMANDEMEN, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.IF_ENTRIES, JSON.stringify([]));
    localStorage.setItem(PURGE_FLAG_KEY, '1');
  }
} catch {
  // abaikan bila localStorage tidak tersedia
}

// Date calculation utilities per user's rules:
// - BAKH = Tanggal sama dengan SPK
// - SPK = Tanggal sama dengan SPK
// - Tanggal mulai kerja bisa dimulai di hari yang sama mengikuti durasi full pekerjaan sesuai di Kurva S (c.1)
// - PP = 2 hari setelah tanggal SPK
// - Pengajuan Panjar = Tanggal sama dengan PP
// - Imprest Fund = 2 hari setelah tanggal pengajuan panjar
export function addDays(dateStr: string, days: number): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format singkat untuk KPI: 891.000.000 -> "Rp891 jt", 1,14 M, 9,8 T.
export function formatRingkas(amount: number): string {
  const v = Number(amount);
  if (!Number.isFinite(v) || v === 0) return 'Rp0';
  const abs = Math.abs(v);
  const tanda = v < 0 ? '-' : '';
  if (abs >= 1e12) return tanda + 'Rp' + (abs / 1e12).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' T';
  if (abs >= 1e9)  return tanda + 'Rp' + (abs / 1e9).toLocaleString('id-ID',  { maximumFractionDigits: 2 }) + ' M';
  if (abs >= 1e6)  return tanda + 'Rp' + (abs / 1e6).toLocaleString('id-ID',  { maximumFractionDigits: 0 }) + ' jt';
  if (abs >= 1e3)  return tanda + 'Rp' + (abs / 1e3).toLocaleString('id-ID',  { maximumFractionDigits: 0 }) + ' rb';
  return tanda + 'Rp' + abs.toLocaleString('id-ID');
}

export function formatTanggalIndo(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const day = parseInt(parts[2], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const year = parts[0];
  return `${day} ${bulan[monthIdx] || ''} ${year}`;
}

/**
 * Pengajuan sudah lolos verifikator? Data lama tanpa `verifikasiStatus`
 * dianggap lolos agar daftar demo tetap bisa dicetak.
 */
export function lolosVerifikasi(sub: ProjectSubmission): boolean {
  return !sub.verifikasiStatus || sub.verifikasiStatus === 'DISETUJUI';
}

/**
 * Alasan sebuah berkas belum boleh dicetak. String kosong bila sudah bisa dicetak.
 * Urutan pemeriksaan: verifikator dulu (verifikasi masuk sebelum cetak), baru eviden j & k.
 */
export function alasanTerkunci(sub: ProjectSubmission): string {
  if (sub.verifikasiStatus === 'MENUNGGU') return 'Menunggu verifikasi verifikator';
  if (sub.verifikasiStatus === 'REVISI') return 'Dikembalikan untuk revisi admin';
  if (sub.isLockedForPrint) return 'Perlu Eviden j & k';
  return '';
}

/** Status turunan setelah verifikator memutuskan, mengikuti kelengkapan eviden. */
function statusSetelahVerifikasi(sub: ProjectSubmission): SubmissionStatus {
  const evidenLengkap =
    !!(sub.dokumen?.buktiTransferTA?.fileName || sub.dokumen?.buktiTransferTA?.status === 'VERIFIED') &&
    !!(sub.dokumen?.evidenSerahTerimaPrelim?.fileName || sub.dokumen?.evidenSerahTerimaPrelim?.status === 'VERIFIED');
  if (sub.status === 'SELESAI') return 'SELESAI';
  if (!evidenLengkap) return 'MENUNGGU_EVIDEN';
  return 'SIAP_CETAK';
}

export function generateKurvaS(totalDays: number, totalNilai: number) {
  const weeksCount = Math.max(1, Math.ceil(totalDays / 7));
  const kurva = [];
  let cumulative = 0;

  // Standard S-curve bell distribution weights
  const mid = (weeksCount + 1) / 2;
  const std = Math.max(1, weeksCount / 3);
  const rawWeights: number[] = [];
  let totalRawWeight = 0;

  for (let w = 1; w <= weeksCount; w++) {
    // Gaussian-like bell distribution
    const exponent = -Math.pow(w - mid, 2) / (2 * Math.pow(std, 2));
    const weight = Math.exp(exponent);
    rawWeights.push(weight);
    totalRawWeight += weight;
  }

  for (let w = 1; w <= weeksCount; w++) {
    const pct = (rawWeights[w - 1] / totalRawWeight) * 100;
    cumulative += pct;
    if (w === weeksCount) cumulative = 100; // clamp end
    
    kurva.push({
      week: w,
      label: `Mg ${w}`,
      rencanaMingguan: Number(pct.toFixed(2)),
      rencanaKumulatif: Number(Math.min(100, cumulative).toFixed(2)),
      realisasiMingguan: w <= 2 ? Number((pct * 0.95).toFixed(2)) : undefined,
      realisasiKumulatif: w <= 2 ? Number((cumulative * 0.95).toFixed(2)) : undefined,
    });
  }

  return kurva;
}

/** Nilai satu baris isian = qty x (harga material + harga jasa dari master). */
export function nilaiEntry(e: KurvaSEntry): number {
  return e.qty * (e.material + e.jasa);
}

export interface RekapProgres {
  progressId: string;
  nama: string;
  tanggal: string;
  nilai: number;
  /** Persen terhadap total nilai seluruh progres (0 bila total 0). */
  bobot: number;
}

/** Rekap nilai & bobot tiap progres dari isian Kurva S. */
export function rekapKurvaSPlan(plan: KurvaSPlan): {
  totalNilai: number;
  totalQty: number;
  baris: RekapProgres[];
} {
  const baris: RekapProgres[] = plan.progres.map(p => {
    const nilai = plan.entries
      .filter(e => e.progressId === p.id)
      .reduce((sum, e) => sum + nilaiEntry(e), 0);
    return { progressId: p.id, nama: p.nama, tanggal: p.tanggal, nilai, bobot: 0 };
  });

  const totalNilai = baris.reduce((sum, b) => sum + b.nilai, 0);
  const totalQty = plan.entries.reduce((sum, e) => sum + e.qty, 0);

  if (totalNilai > 0) {
    baris.forEach(b => {
      b.bobot = Number(((b.nilai / totalNilai) * 100).toFixed(2));
    });
  } else if (baris.length) {
    // Tanpa nilai rupiah, bobot dibagi rata agar kurva tetap terbentuk.
    const rata = Number((100 / baris.length).toFixed(2));
    baris.forEach(b => {
      b.bobot = rata;
    });
  }

  return { totalNilai, totalQty, baris };
}

/** Satu titik Kurva S per kolom progres, mengikuti master KURVA S.xlsx (baris Bobot Cum %). */
export interface KurvaSProgresPoint {
  /** Nama kolom progres (TGL-BLN-THN di master). */
  label: string;
  /** Bobot progres ini terhadap total nilai (%). */
  bobot: number;
  /** Bobot kumulatif sampai progres ini (%) — yang diplot pada grafik master. */
  bobotCum: number;
  /** Nilai rupiah progres ini. */
  nilai: number;
  /** Tanggal progres (kosong bila belum diisi). */
  tanggal: string;
}

/**
 * Bangun titik grafik Kurva S per progres dari isian admin, setara dengan
 * baris Bobot (%) / Bobot Cum (%) / Nilai pada sheet "Kurva S" master.
 * Sumbu-X memakai nama kolom progres, sumbu-Y bobot kumulatif (0-100%).
 * Tanpa isian (plan null / belum ada entry) memakai kolom progres default
 * dengan bobot 0, persis tampilan master yang masih kosong.
 */
export function titikKurvaSDariPlan(plan: KurvaSPlan | null): KurvaSProgresPoint[] {
  const progres =
    plan?.progres?.length
      ? plan.progres
      : KURVA_S_PROGRES_DEFAULT.map(nama => ({ id: nama, nama, tanggal: '' }));
  const entries = plan?.entries ?? [];
  const adaIsi = entries.length > 0;
  const { baris } = rekapKurvaSPlan({
    tanggalMulaiMandor: plan?.tanggalMulaiMandor ?? '',
    progres,
    entries,
  });

  let cum = 0;
  const titik = baris.map(b => {
    const bobot = adaIsi ? b.bobot : 0;
    cum += bobot;
    return {
      label: b.nama || '(tanpa nama)',
      bobot,
      bobotCum: Number(cum.toFixed(2)),
      nilai: adaIsi ? b.nilai : 0,
      tanggal: b.tanggal,
    };
  });
  // Pastikan titik terakhir tepat 100% (pembulatan desimal).
  if (adaIsi && titik.length) titik[titik.length - 1].bobotCum = 100;
  return titik;
}

/** Rentang waktu yang dicakup Kurva S: hari pertama -> hari terakhir. */
export interface RentangKurvaS {
  /** Patokan awal: terawal antara mulai kerja mandor & tanggal progres terisi. */
  awal: string;
  /** Tanggal progres terakhir. */
  akhir: string;
  /** Selisih hari (akhir - awal), sama seperti durasi kerja pada aplikasi. */
  hari: number;
}

/**
 * Durasi kerja otomatis dari isian Kurva S: hari pertama sampai hari terakhir
 * yang tercatat pada rencana. Null bila belum ada tanggal sama sekali.
 */
export function rentangKurvaSDariPlan(plan: KurvaSPlan | null): RentangKurvaS | null {
  if (!plan) return null;
  const tanggalAktif = plan.progres
    .filter(p => p.tanggal && plan.entries.some(e => e.progressId === p.id))
    .map(p => p.tanggal)
    .sort();
  if (!tanggalAktif.length) return null;

  const awal = patokanKurvaS(plan);
  const akhir = tanggalAktif[tanggalAktif.length - 1];
  if (!awal) return null;
  const hari = selisihHari(akhir, awal);
  if (hari === null || hari < 1) return null;
  return { awal, akhir, hari };
}

/** Durasi kerja (hari) otomatis dari isian Kurva S. */
export function durasiKurvaSDariPlan(plan: KurvaSPlan | null): number | null {
  return rentangKurvaSDariPlan(plan)?.hari ?? null;
}

/** Selisih hari tanggal - patokan (positif bila sesudah patokan). */
function selisihHari(dari: string, ke: string): number | null {
  if (!dari || !ke) return null;
  const a = new Date(dari).getTime();
  const b = new Date(ke).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((a - b) / 86_400_000);
}

/**
 * Patokan minggu (tanggal paling awal) untuk rencana Kurva S: terawal di antara
 * Tanggal Mulai Kerja Mandor dan tanggal-tanggal progres. Dipakai agar progres
 * yang tanggalnya diisi sebelum mulai kerja mandor tidak semuanya jatuh ke
 * minggu 1 (karena selisih hari bernilai negatif).
 */
export function patokanKurvaS(plan: KurvaSPlan, fallback = ''): string {
  const tanggalProgres = plan.progres
    .filter(p => plan.entries.some(e => e.progressId === p.id))
    .map(p => p.tanggal);
  const kandidat = [plan.tanggalMulaiMandor || fallback, ...tanggalProgres]
    .filter((t): t is string => Boolean(t))
    .sort();
  return kandidat[0] ?? '';
}

/** Urutan tahap Alur Proyek BAKH. */
const URUTAN_TAHAP: (keyof AlurProyek)[] = [
  'persiapan',
  'materialDelivery',
  'instalasi',
  'commissioningTest',
  'ujiTerima',
];

/**
 * Petakan nama progres Kurva S ke tahap Alur Proyek BAKH.
 * Nama progres bersifat fleksibel — pencocokan berbasis kata kunci.
 * Null bila nama tidak terpetakan ke tahap mana pun.
 */
function tahapDariNamaProgres(nama: string): keyof AlurProyek | null {
  const n = (nama || '').toLowerCase();
  if (n.includes('persiapan')) return 'persiapan';
  if (n.includes('material')) return 'materialDelivery';
  if (n.includes('instalasi') || n.includes('installation')) return 'instalasi';
  if (n.includes('uji') || n.includes('serah terima')) return 'ujiTerima';
  if (n.includes('penarikan') || n.includes('commissioning') || n.includes('komisioning'))
    return 'commissioningTest';
  return null;
}

/**
 * Isi otomatis Alur Proyek BAKH dari tanggal progres Kurva S.
 * Batas akhir tiap tahap = tanggal progres terakhir pada kelompoknya;
 * hari tahap = selisih hari dari batas tahap sebelumnya (patokan Kurva S untuk
 * tahap pertama). Tahap terakhir (Uji Terima) menampung sisa durasi kerja
 * agar Σ alur selalu = durasi. Null bila belum ada tanggal progres sama sekali.
 */
export function alurProyekDariKurvaS(
  plan: KurvaSPlan | null,
  durasiHari: number,
  fallbackMulai = ''
): AlurProyek | null {
  if (!plan || !plan.progres.length) return null;

  // Batas akhir tiap tahap = tanggal terakhir (maks) progres dalam kelompoknya.
  const batas: Partial<Record<keyof AlurProyek, string>> = {};
  for (const p of plan.progres) {
    if (!p.tanggal) continue;
    const tahap = tahapDariNamaProgres(p.nama);
    if (!tahap) continue;
    if (!batas[tahap] || p.tanggal > batas[tahap]) batas[tahap] = p.tanggal;
  }
  if (!Object.keys(batas).length) return null;

  const patokan = patokanKurvaS(plan, fallbackMulai);
  if (!patokan) return null;

  const hasil: AlurProyek = {
    persiapan: 0,
    materialDelivery: 0,
    instalasi: 0,
    commissioningTest: 0,
    ujiTerima: 0,
  };

  let akhir = patokan;
  let akumulasi = 0;
  // Persiapan tidak terhitung sebagai hari kerja — hitungan hari kerja dimulai
  // dari tahap berikutnya (Material Delivery) dan bertambah s/d Uji Terima.
  for (const tahap of URUTAN_TAHAP.slice(1, 4)) {
    const t = batas[tahap];
    if (!t || t <= akhir) continue;
    const hari = selisihHari(t, akhir) ?? 0;
    hasil[tahap] = Math.max(0, hari);
    akhir = t;
    akumulasi += hasil[tahap];
  }

  // Tahap terakhir menampung sisa durasi (bila melebihi, di-clamp ke 0 dan
  // validasi jumlah hari alur akan memberi peringatan sendiri).
  hasil.ujiTerima = Math.max(0, durasiHari - akumulasi);
  return hasil;
}

/** Minggu ke-berapa (1-based) sebuah tanggal jatuh, relatif ke patokan. */
export function mingguDariTanggal(
  patokan: string,
  tanggal: string,
  totalDays: number
): number | null {
  if (!patokan || !tanggal) return null;
  const hari = selisihHari(tanggal, patokan);
  if (hari === null) return null;
  const total = Math.max(1, Math.ceil((totalDays || 1) / 7));
  return Math.min(total, Math.max(1, Math.floor(hari / 7) + 1));
}

/**
 * Bangun Kurva S dari isian admin (KurvaSPlan):
 * bobot tiap progres = nilai progres / total nilai, lalu jatuh ke minggu
 * sesuai tanggal progres yang dihitung dari patokan (lihat patokanKurvaS).
 * Progres tanpa tanggal dibagi rata ke seluruh minggu.
 */
export function generateKurvaSDariPlan(
  plan: KurvaSPlan,
  totalDays: number,
  tanggalMulaiFallback = ''
): KurvaSWeek[] {
  const weeksCount = Math.max(1, Math.ceil((totalDays || 1) / 7));
  const { baris } = rekapKurvaSPlan(plan);
  if (!baris.length) return generateKurvaS(totalDays, 0);

  const patokan = patokanKurvaS(plan, tanggalMulaiFallback);
  const bobotPerMinggu: number[] = new Array(weeksCount).fill(0);
  const tanpaTanggal = baris.filter(b => !b.tanggal || !patokan);
  const bernilai = baris.filter(b => b.bobot > 0);

  baris.forEach(b => {
    if (b.bobot <= 0) return;
    const dariTanggal = mingguDariTanggal(patokan, b.tanggal, totalDays);
    let week: number;
    if (dariTanggal !== null) {
      week = dariTanggal;
    } else {
      const idx = baris.indexOf(b);
      week = Math.ceil(((idx + 1) / baris.length) * weeksCount);
    }
    week = Math.min(weeksCount, Math.max(1, week));
    bobotPerMinggu[week - 1] += b.bobot;
  });

  // Bila semua progres tanpa nilai & tanpa tanggal -> bagi rata.
  if (!bernilai.length && tanpaTanggal.length) {
    const rata = 100 / weeksCount;
    for (let i = 0; i < weeksCount; i++) bobotPerMinggu[i] = rata;
  }

  // Normalisasi agar jumlah tepat 100%.
  const jumlah = bobotPerMinggu.reduce((s, v) => s + v, 0);
  const skala = jumlah > 0 ? 100 / jumlah : 1;

  const kurva: KurvaSWeek[] = [];
  let cumulative = 0;
  for (let w = 1; w <= weeksCount; w++) {
    const pct = bobotPerMinggu[w - 1] * skala;
    cumulative += pct;
    if (w === weeksCount) cumulative = 100;
    kurva.push({
      week: w,
      label: `Mg ${w}`,
      rencanaMingguan: Number(pct.toFixed(2)),
      rencanaKumulatif: Number(Math.min(100, cumulative).toFixed(2)),
    });
  }

  return kurva;
}

// Daftar dokumen baku sesuai SOP. Dipakai pembuat pengajuan contoh.
const DAFTAR_DOKUMEN: { key: keyof ProjectSubmission['dokumen']; name: string; required: boolean }[] = [
  { key: 'bakh', name: 'BAKH (Berita Acara Kesepakatan Harga)', required: true },
  { key: 'lampiranKesepakatanHarga', name: 'Lampiran Kesepakatan Harga', required: true },
  { key: 'spk', name: 'Surat Perintah Kerja (SPK)', required: true },
  { key: 'pp', name: 'Permintaan Pembayaran (PP)', required: true },
  { key: 'boqDrm', name: 'BOQ DRM (Design Review Meeting)', required: false },
  { key: 'lampiranDasarPekerjaan', name: 'Lampiran Dasar Pekerjaan / Justifikasi', required: false },
  { key: 'pengajuanPanjar', name: 'Pengajuan Panjar Operasional', required: true },
  { key: 'imprestFund', name: 'Lembar Disposisi Imprest Fund (IF)', required: true },
  { key: 'kurvaS', name: 'Grafik Kurva S (GRAVIK CURVA S)', required: true },
  { key: 'ktp', name: 'Lampiran KTP Penerima Panjar', required: true },
  { key: 'npwp', name: 'Lampiran NPWP Penerima Panjar', required: true },
  { key: 'bukuRekening', name: 'Lampiran Buku Tabungan Penerima', required: true },
  { key: 'evidenSerahTerimaPrelim', name: 'Evidence Serah Terima Prelim (Berita Acara/Tanda Terima Fisik)', required: true },
  { key: 'buktiTransferTA', name: 'Lampiran Bukti Transfer dari TA ke Penerima Prelim', required: true },
  { key: 'spb', name: 'Surat Perintah Bayar (SPB)', required: true },
];

function buatDokumen(prefix: string, tanggal: string, terverifikasi: string[]): ProjectSubmission['dokumen'] {
  const dokumen = {} as ProjectSubmission['dokumen'];
  const rekam = dokumen as Record<string, DocumentUpload>;
  for (const d of DAFTAR_DOKUMEN) {
    const ok = terverifikasi.includes(d.key);
    rekam[d.key] = {
      id: `${prefix}-${d.key}`,
      name: d.name,
      required: d.required,
      status: ok ? 'VERIFIED' : 'PENDING',
      ...(ok
        ? { fileName: `${prefix}_${d.key}.pdf`, fileSize: '1.1 MB', uploadedAt: tanggal }
        : {}),
    };
  }
  return dokumen;
}

// Pengajuan contoh per branch. Semua tanggal mengikuti aturan SOP:
// BAKH = SPK, PP = SPK + 2 hari, Panjar = PP, Imprest Fund = PP + 2 hari.
function buatPengajuan(o: {
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
  nilaiPekerjaan: number;
  nilaiPrelimPanjar: number;
  tanggalSPK: string;
  durasiKerjaHari: number;
  status: SubmissionStatus;
  isLockedForPrint: boolean;
  terverifikasi?: string[];
  catatan?: string;
  amandemenCount?: number;
}): ProjectSubmission {
  const tanggalPP = addDays(o.tanggalSPK, 2);
  const tanggalImprestFund = addDays(tanggalPP, 2);
  return {
    id: o.id,
    nomorSPK: o.nomorSPK,
    nomorPP: o.nomorPP,
    nomorBAKH: o.nomorBAKH,
    nomorIF: o.nomorIF,
    namaPekerjaan: o.namaPekerjaan,
    lokasiProyek: o.lokasiProyek,
    regional: o.regional,
    picProyek: o.picProyek,
    vendorPelaksana: o.vendorPelaksana,
    namaPenerimaPrelim: o.namaPenerimaPrelim,
    bankPenerima: o.bankPenerima,
    nomorRekening: o.nomorRekening,
    npwpPenerima: o.npwpPenerima,
    nilaiPekerjaan: o.nilaiPekerjaan,
    nilaiPrelimPanjar: o.nilaiPrelimPanjar,
    persentasePrelim: Number(((o.nilaiPrelimPanjar / o.nilaiPekerjaan) * 100).toFixed(2)),
    tanggalSPK: o.tanggalSPK,
    tanggalBAKH: o.tanggalSPK,
    tanggalMulaiKerja: o.tanggalSPK,
    durasiKerjaHari: o.durasiKerjaHari,
    tanggalSelesaiKerja: addDays(o.tanggalSPK, o.durasiKerjaHari),
    tanggalPP,
    tanggalPengajuanPanjar: tanggalPP,
    tanggalImprestFund,
    tanggalTransfer: tanggalImprestFund,
    kurvaSData: generateKurvaS(o.durasiKerjaHari, o.nilaiPekerjaan),
    dokumen: buatDokumen(o.id, o.tanggalSPK, o.terverifikasi ?? []),
    status: o.status,
    createdAt: `${o.tanggalSPK}T08:00:00Z`,
    updatedAt: `${o.tanggalSPK}T16:00:00Z`,
    catatan: o.catatan,
    amandemenCount: o.amandemenCount ?? 0,
    isLockedForPrint: o.isLockedForPrint,
  };
}

const INITIAL_SUBMISSIONS: ProjectSubmission[] = [
  {
    id: 'SUB-2026-001',
    nomorSPK: 'SPK/TEL/2026/03/0182',
    nomorPP: 'PP/INFRA/2026/03/0089',
    nomorBAKH: 'BAKH/TEL/2026/03/0182',
    nomorIF: 'IF-DISB-2603-044',
    namaPekerjaan: 'Penggelaran Kabel Feeder FO 48 Core & Jointing Kawasan Industri Cikarang',
    lokasiProyek: 'Kawasan Industri GIIC Cikarang Pusat, Kab. Bekasi',
    regional: 'Regional Jawa Barat',
    picProyek: 'Rahmat Hidayat (Project Manager)',
    vendorPelaksana: 'PT Mandiri Prima Solusindo',
    namaPenerimaPrelim: 'Bambang Supriyanto',
    bankPenerima: 'Bank Mandiri (156-00-1849201-9)',
    nomorRekening: '156-00-1849201-9',
    npwpPenerima: '09.845.210.4-411.000',
    nilaiPekerjaan: 385000000,
    nilaiPrelimPanjar: 45000000,
    persentasePrelim: 11.69,
    tanggalSPK: '2026-03-02',
    tanggalBAKH: '2026-03-02', // Same as SPK
    tanggalMulaiKerja: '2026-03-02', // c.1 started same day
    durasiKerjaHari: 35, // Kurva S PP 5 weeks
    tanggalSelesaiKerja: '2026-04-06',
    tanggalPP: '2026-03-04', // 2 days after SPK
    tanggalPengajuanPanjar: '2026-03-04', // Same as PP
    tanggalImprestFund: '2026-03-06', // 2 days after Pengajuan Panjar
    tanggalTransfer: '2026-03-06',
    kurvaSData: generateKurvaS(35, 385000000),
    dokumen: {
      bakh: { id: 'd-1', name: 'BAKH (Berita Acara Kesepakatan Harga)', required: true, status: 'VERIFIED', fileName: 'BAKH-0182-Signed.pdf', fileSize: '1.2 MB', uploadedAt: '2026-03-02' },
      lampiranKesepakatanHarga: { id: 'd-2', name: 'Lampiran Kesepakatan Harga', required: true, status: 'VERIFIED', fileName: 'Lampiran_Harga_0182.pdf', fileSize: '850 KB', uploadedAt: '2026-03-02' },
      spk: { id: 'd-3', name: 'Surat Perintah Kerja (SPK)', required: true, status: 'VERIFIED', fileName: 'SPK_TEL_0182_Scan.pdf', fileSize: '2.1 MB', uploadedAt: '2026-03-02' },
      pp: { id: 'd-4', name: 'Permintaan Pembayaran (PP)', required: true, status: 'VERIFIED', fileName: 'PP_INFRA_0089.pdf', fileSize: '1.4 MB', uploadedAt: '2026-03-04' },
      boqDrm: { id: 'd-5', name: 'BOQ DRM (Design Review Meeting)', required: true, status: 'VERIFIED', fileName: 'BOQ_DRM_Final_Approved.xlsx', fileSize: '3.4 MB', uploadedAt: '2026-03-03' },
      lampiranDasarPekerjaan: { id: 'd-6', name: 'Lampiran Dasar Pekerjaan / Justifikasi', required: true, status: 'VERIFIED', fileName: 'Dasar_Pekerjaan_DRM.pdf', fileSize: '1.8 MB', uploadedAt: '2026-03-03' },
      pengajuanPanjar: { id: 'd-7', name: 'Pengajuan Panjar Operasional', required: true, status: 'VERIFIED', fileName: 'Form_Panjar_0089.pdf', fileSize: '720 KB', uploadedAt: '2026-03-04' },
      imprestFund: { id: 'd-8', name: 'Lembar Disposisi Imprest Fund (IF)', required: true, status: 'VERIFIED', fileName: 'IF_Disposisi_2603.pdf', fileSize: '980 KB', uploadedAt: '2026-03-06' },
      kurvaS: { id: 'd-13', name: 'Grafik Kurva S (GRAVIK CURVA S)', required: true, status: 'VERIFIED', fileName: 'Gravik_CurvaS_0182.pdf', fileSize: '640 KB', uploadedAt: '2026-03-02' },
      ktp: { id: 'd-9', name: 'Lampiran KTP Penerima Panjar', required: true, status: 'VERIFIED', fileName: 'KTP_Bambang.pdf', fileSize: '0.9 MB', uploadedAt: '2026-03-03' },
      npwp: { id: 'd-9b', name: 'Lampiran NPWP Penerima Panjar', required: true, status: 'VERIFIED', fileName: 'NPWP_Bambang.pdf', fileSize: '0.7 MB', uploadedAt: '2026-03-03' },
      bukuRekening: { id: 'd-9c', name: 'Lampiran Buku Tabungan Penerima', required: true, status: 'VERIFIED', fileName: 'Buku_Tabungan_Bambang.pdf', fileSize: '1.0 MB', uploadedAt: '2026-03-03' },
      evidenSerahTerimaPrelim: { id: 'd-10', name: 'Evidence Serah Terima Prelim (Berita Acara/Tanda Terima Fisik)', required: true, status: 'VERIFIED', fileName: 'Eviden_SerahTerima_Prelim_Signed.jpg', fileSize: '1.9 MB', uploadedAt: '2026-03-07' },
      buktiTransferTA: { id: 'd-11', name: 'Lampiran Bukti Transfer dari TA ke Penerima Prelim', required: true, status: 'VERIFIED', fileName: 'Bukti_Transfer_Mandiri_45jt.pdf', fileSize: '650 KB', uploadedAt: '2026-03-06' },
      spb: { id: 'd-12', name: 'Surat Perintah Bayar (SPB)', required: true, status: 'VERIFIED', fileName: 'SPB_FIN_2026_0182.pdf', fileSize: '1.1 MB', uploadedAt: '2026-03-05' },
    },
    status: 'SIAP_CETAK',
    createdAt: '2026-03-02T08:30:00Z',
    updatedAt: '2026-03-07T14:20:00Z',
    catatan: 'Eviden serah terima dan bukti transfer lengkap. Berkas sudah divalidasi dan dapat dicetak.',
    amandemenCount: 0,
    isLockedForPrint: false,
  },
  {
    id: 'SUB-2026-002',
    nomorSPK: 'SPK/CIV/2026/03/0205',
    nomorPP: 'PP/CIV/2026/03/0112',
    nomorBAKH: 'BAKH/CIV/2026/03/0205',
    nomorIF: 'IF-DISB-2603-058',
    namaPekerjaan: 'Pekerjaan Perkuatan Pondasi & Grounding Tower 52M Monopole Subang',
    lokasiProyek: 'Site ID: SBG-044, Pagaden, Kab. Subang',
    regional: 'Regional Jawa Barat',
    picProyek: 'Dimas Wicaksono',
    vendorPelaksana: 'CV Konstruksi Menara Mandiri',
    namaPenerimaPrelim: 'Hendro Gunawan',
    bankPenerima: 'Bank BCA (883-091-2811)',
    nomorRekening: '883-091-2811',
    npwpPenerima: '31.294.108.9-408.000',
    nilaiPekerjaan: 215000000,
    nilaiPrelimPanjar: 25000000,
    persentasePrelim: 11.63,
    tanggalSPK: '2026-03-10',
    tanggalBAKH: '2026-03-10',
    tanggalMulaiKerja: '2026-03-10',
    durasiKerjaHari: 28,
    tanggalSelesaiKerja: '2026-04-07',
    tanggalPP: '2026-03-12', // +2 days
    tanggalPengajuanPanjar: '2026-03-12', // = PP
    tanggalImprestFund: '2026-03-14', // +2 days
    kurvaSData: generateKurvaS(28, 215000000),
    dokumen: {
      bakh: { id: 'd-1', name: 'BAKH (Berita Acara Kesepakatan Harga)', required: true, status: 'VERIFIED', fileName: 'BAKH-0205.pdf', fileSize: '1.1 MB', uploadedAt: '2026-03-10' },
      lampiranKesepakatanHarga: { id: 'd-2', name: 'Lampiran Kesepakatan Harga', required: true, status: 'VERIFIED', fileName: 'Lampiran_Harga_0205.pdf', fileSize: '780 KB', uploadedAt: '2026-03-10' },
      spk: { id: 'd-3', name: 'Surat Perintah Kerja (SPK)', required: true, status: 'VERIFIED', fileName: 'SPK_0205_Approved.pdf', fileSize: '1.9 MB', uploadedAt: '2026-03-10' },
      pp: { id: 'd-4', name: 'Permintaan Pembayaran (PP)', required: true, status: 'VERIFIED', fileName: 'PP_0112_Signed.pdf', fileSize: '1.3 MB', uploadedAt: '2026-03-12' },
      boqDrm: { id: 'd-5', name: 'BOQ DRM (Design Review Meeting)', required: true, status: 'VERIFIED', fileName: 'BOQ_DRM_Monopole.xlsx', fileSize: '2.8 MB', uploadedAt: '2026-03-11' },
      lampiranDasarPekerjaan: { id: 'd-6', name: 'Lampiran Dasar Pekerjaan / Justifikasi', required: true, status: 'VERIFIED', fileName: 'Site_Justifikasi_SBG044.pdf', fileSize: '2.2 MB', uploadedAt: '2026-03-11' },
      pengajuanPanjar: { id: 'd-7', name: 'Pengajuan Panjar Operasional', required: true, status: 'VERIFIED', fileName: 'Pengajuan_Panjar_0112.pdf', fileSize: '810 KB', uploadedAt: '2026-03-12' },
      imprestFund: { id: 'd-8', name: 'Lembar Disposisi Imprest Fund (IF)', required: true, status: 'VERIFIED', fileName: 'IF_SBG_Disposisi.pdf', fileSize: '950 KB', uploadedAt: '2026-03-14' },
      kurvaS: { id: 'd-13', name: 'Grafik Kurva S (GRAVIK CURVA S)', required: true, status: 'VERIFIED', fileName: 'Gravik_CurvaS_0205.pdf', fileSize: '640 KB', uploadedAt: '2026-03-10' },
      ktp: { id: 'd-9', name: 'Lampiran KTP Penerima Panjar', required: true, status: 'VERIFIED', fileName: 'KTP_Hendro.pdf', fileSize: '1.1 MB', uploadedAt: '2026-03-11' },
      npwp: { id: 'd-9b', name: 'Lampiran NPWP Penerima Panjar', required: true, status: 'VERIFIED', fileName: 'NPWP_Hendro.pdf', fileSize: '0.8 MB', uploadedAt: '2026-03-11' },
      bukuRekening: { id: 'd-9c', name: 'Lampiran Buku Tabungan Penerima', required: true, status: 'VERIFIED', fileName: 'Buku_Tabungan_Hendro.pdf', fileSize: '1.2 MB', uploadedAt: '2026-03-11' },
      evidenSerahTerimaPrelim: { id: 'd-10', name: 'Evidence Serah Terima Prelim (Berita Acara/Tanda Terima Fisik)', required: true, status: 'PENDING' },
      buktiTransferTA: { id: 'd-11', name: 'Lampiran Bukti Transfer dari TA ke Penerima Prelim', required: true, status: 'PENDING' },
      spb: { id: 'd-12', name: 'Surat Perintah Bayar (SPB)', required: true, status: 'VERIFIED', fileName: 'SPB_0205_FIN.pdf', fileSize: '1.0 MB', uploadedAt: '2026-03-13' },
    },
    status: 'MENUNGGU_EVIDEN', // Eviden j & k pending
    createdAt: '2026-03-10T10:15:00Z',
    updatedAt: '2026-03-14T09:00:00Z',
    catatan: 'Menunggu upload bukti transfer dari Tim TA dan lembar serah terima fisik prelim oleh penerima.',
    amandemenCount: 0,
    isLockedForPrint: true, // CANNOT PRINT UNTIL EVIDEN J & K UPLOADED
  },
  {
    id: 'SUB-2026-003',
    nomorSPK: 'SPK/PWR/2026/03/0240',
    nomorPP: 'PP/PWR/2026/03/0145',
    nomorBAKH: 'BAKH/PWR/2026/03/0240',
    nomorIF: 'IF-DISB-2603-071',
    namaPekerjaan: 'Penggantian Rectifier 48V 100A & Battery Bank Lithium 200Ah Semarang',
    lokasiProyek: 'Data Center & Hub Node Candisari, Kota Semarang',
    regional: 'Regional Jawa Tengah',
    picProyek: 'Agus Purnomo',
    vendorPelaksana: 'PT Daya Pratama Energi',
    namaPenerimaPrelim: 'Kurniawan Prasetyo',
    bankPenerima: 'Bank BNI (029-441-9284)',
    nomorRekening: '029-441-9284',
    npwpPenerima: '07.412.391.2-503.000',
    nilaiPekerjaan: 175000000,
    nilaiPrelimPanjar: 20000000,
    persentasePrelim: 11.43,
    tanggalSPK: '2026-03-18',
    tanggalBAKH: '2026-03-18',
    tanggalMulaiKerja: '2026-03-18',
    durasiKerjaHari: 21,
    tanggalSelesaiKerja: '2026-04-08',
    tanggalPP: '2026-03-20',
    tanggalPengajuanPanjar: '2026-03-20',
    tanggalImprestFund: '2026-03-22',
    kurvaSData: generateKurvaS(21, 175000000),
    dokumen: {
      bakh: { id: 'd-1', name: 'BAKH (Berita Acara Kesepakatan Harga)', required: true, status: 'VERIFIED', fileName: 'BAKH_0240.pdf', fileSize: '1.0 MB', uploadedAt: '2026-03-18' },
      lampiranKesepakatanHarga: { id: 'd-2', name: 'Lampiran Kesepakatan Harga', required: true, status: 'VERIFIED', fileName: 'Lamp_Harga_0240.pdf', fileSize: '650 KB', uploadedAt: '2026-03-18' },
      spk: { id: 'd-3', name: 'Surat Perintah Kerja (SPK)', required: true, status: 'VERIFIED', fileName: 'SPK_0240.pdf', fileSize: '1.7 MB', uploadedAt: '2026-03-18' },
      pp: { id: 'd-4', name: 'Permintaan Pembayaran (PP)', required: true, status: 'PENDING' },
      boqDrm: { id: 'd-5', name: 'BOQ DRM (Design Review Meeting)', required: true, status: 'VERIFIED', fileName: 'BOQ_Power_Smg.xlsx', fileSize: '1.9 MB', uploadedAt: '2026-03-19' },
      lampiranDasarPekerjaan: { id: 'd-6', name: 'Lampiran Dasar Pekerjaan / Justifikasi', required: true, status: 'VERIFIED', fileName: 'Justifikasi_Rectifier.pdf', fileSize: '1.4 MB', uploadedAt: '2026-03-19' },
      pengajuanPanjar: { id: 'd-7', name: 'Pengajuan Panjar Operasional', required: true, status: 'PENDING' },
      imprestFund: { id: 'd-8', name: 'Lembar Disposisi Imprest Fund (IF)', required: true, status: 'PENDING' },
      kurvaS: { id: 'd-13', name: 'Grafik Kurva S (GRAVIK CURVA S)', required: true, status: 'PENDING' },
      ktp: { id: 'd-9', name: 'Lampiran KTP Penerima Panjar', required: true, status: 'VERIFIED', fileName: 'KTP_Kurniawan.pdf', fileSize: '0.8 MB', uploadedAt: '2026-03-18' },
      npwp: { id: 'd-9b', name: 'Lampiran NPWP Penerima Panjar', required: true, status: 'VERIFIED', fileName: 'NPWP_Kurniawan.pdf', fileSize: '0.6 MB', uploadedAt: '2026-03-18' },
      bukuRekening: { id: 'd-9c', name: 'Lampiran Buku Tabungan Penerima', required: true, status: 'VERIFIED', fileName: 'Buku_Tabungan_Kurniawan.pdf', fileSize: '0.9 MB', uploadedAt: '2026-03-18' },
      evidenSerahTerimaPrelim: { id: 'd-10', name: 'Evidence Serah Terima Prelim (Berita Acara/Tanda Terima Fisik)', required: true, status: 'PENDING' },
      buktiTransferTA: { id: 'd-11', name: 'Lampiran Bukti Transfer dari TA ke Penerima Prelim', required: true, status: 'PENDING' },
      spb: { id: 'd-12', name: 'Surat Perintah Bayar (SPB)', required: true, status: 'PENDING' },
    },
    status: 'KIRIM_DIGITAL',
    createdAt: '2026-03-18T11:00:00Z',
    updatedAt: '2026-03-20T16:00:00Z',
    catatan: 'Dokumen PP digital dikirim ke Bagian Keuangan TA. Menunggu proses SPB dan pencairan panjar.',
    amandemenCount: 0,
    isLockedForPrint: true,
  },
  {
    id: 'SUB-2026-004',
    nomorSPK: 'SPK/TEL/2026/02/0098',
    nomorPP: 'PP/TEL/2026/02/0045',
    nomorBAKH: 'BAKH/TEL/2026/02/0098',
    nomorIF: 'IF-DISB-2602-019',
    namaPekerjaan: 'Relokasi Jalur Fiber Optic Dampak Pelebaran Jalan Tol Surabaya-Gresik',
    lokasiProyek: 'KM 14+200 Ruas Tol Surabaya-Gresik, Jawa Timur',
    regional: 'Regional Jawa Timur',
    picProyek: 'Sony Prasetyo',
    vendorPelaksana: 'PT Trans Jasa Optika',
    namaPenerimaPrelim: 'Arif Wibowo',
    bankPenerima: 'Bank Mandiri (142-00-983192-3)',
    nomorRekening: '142-00-983192-3',
    npwpPenerima: '08.772.190.1-602.000',
    nilaiPekerjaan: 520000000,
    nilaiPrelimPanjar: 60000000,
    persentasePrelim: 11.54,
    tanggalSPK: '2026-02-15',
    tanggalBAKH: '2026-02-15',
    tanggalMulaiKerja: '2026-02-15',
    durasiKerjaHari: 49,
    tanggalSelesaiKerja: '2026-04-05',
    tanggalPP: '2026-02-17',
    tanggalPengajuanPanjar: '2026-02-17',
    tanggalImprestFund: '2026-02-19',
    tanggalTransfer: '2026-02-19',
    kurvaSData: generateKurvaS(49, 520000000),
    dokumen: {
      bakh: { id: 'd-1', name: 'BAKH (Berita Acara Kesepakatan Harga)', required: true, status: 'VERIFIED', fileName: 'BAKH_0098.pdf', fileSize: '1.5 MB', uploadedAt: '2026-02-15' },
      lampiranKesepakatanHarga: { id: 'd-2', name: 'Lampiran Kesepakatan Harga', required: true, status: 'VERIFIED', fileName: 'Lamp_Harga_0098.pdf', fileSize: '920 KB', uploadedAt: '2026-02-15' },
      spk: { id: 'd-3', name: 'Surat Perintah Kerja (SPK)', required: true, status: 'VERIFIED', fileName: 'SPK_0098.pdf', fileSize: '2.4 MB', uploadedAt: '2026-02-15' },
      pp: { id: 'd-4', name: 'Permintaan Pembayaran (PP)', required: true, status: 'VERIFIED', fileName: 'PP_0045.pdf', fileSize: '1.6 MB', uploadedAt: '2026-02-17' },
      boqDrm: { id: 'd-5', name: 'BOQ DRM (Design Review Meeting)', required: true, status: 'VERIFIED', fileName: 'BOQ_Relokasi_Tol.xlsx', fileSize: '4.1 MB', uploadedAt: '2026-02-16' },
      lampiranDasarPekerjaan: { id: 'd-6', name: 'Lampiran Dasar Pekerjaan / Justifikasi', required: true, status: 'VERIFIED', fileName: 'Surat_Jasa_Marga_Relokasi.pdf', fileSize: '3.2 MB', uploadedAt: '2026-02-16' },
      pengajuanPanjar: { id: 'd-7', name: 'Pengajuan Panjar Operasional', required: true, status: 'VERIFIED', fileName: 'Form_Panjar_0045.pdf', fileSize: '850 KB', uploadedAt: '2026-02-17' },
      imprestFund: { id: 'd-8', name: 'Lembar Disposisi Imprest Fund (IF)', required: true, status: 'VERIFIED', fileName: 'IF_Disposisi_0045.pdf', fileSize: '990 KB', uploadedAt: '2026-02-19' },
      kurvaS: { id: 'd-13', name: 'Grafik Kurva S (GRAVIK CURVA S)', required: true, status: 'VERIFIED', fileName: 'Gravik_CurvaS_0098.pdf', fileSize: '640 KB', uploadedAt: '2026-02-15' },
      ktp: { id: 'd-9', name: 'Lampiran KTP Penerima Panjar', required: true, status: 'VERIFIED', fileName: 'KTP_Arif_Wibowo.pdf', fileSize: '1.0 MB', uploadedAt: '2026-02-16' },
      npwp: { id: 'd-9b', name: 'Lampiran NPWP Penerima Panjar', required: true, status: 'VERIFIED', fileName: 'NPWP_Arif_Wibowo.pdf', fileSize: '0.7 MB', uploadedAt: '2026-02-16' },
      bukuRekening: { id: 'd-9c', name: 'Lampiran Buku Tabungan Penerima', required: true, status: 'VERIFIED', fileName: 'Buku_Tabungan_Arif.pdf', fileSize: '1.1 MB', uploadedAt: '2026-02-16' },
      evidenSerahTerimaPrelim: { id: 'd-10', name: 'Evidence Serah Terima Prelim (Berita Acara/Tanda Terima Fisik)', required: true, status: 'VERIFIED', fileName: 'Tanda_Terima_Fisik_Signed.jpg', fileSize: '2.3 MB', uploadedAt: '2026-02-21' },
      buktiTransferTA: { id: 'd-11', name: 'Lampiran Bukti Transfer dari TA ke Penerima Prelim', required: true, status: 'VERIFIED', fileName: 'Transfer_TA_60Jt.pdf', fileSize: '720 KB', uploadedAt: '2026-02-20' },
      spb: { id: 'd-12', name: 'Surat Perintah Bayar (SPB)', required: true, status: 'VERIFIED', fileName: 'SPB_0045.pdf', fileSize: '1.2 MB', uploadedAt: '2026-02-18' },
    },
    status: 'SELESAI',
    createdAt: '2026-02-15T09:00:00Z',
    updatedAt: '2026-02-22T11:00:00Z',
    catatan: 'Pencairan panjar prelim selesai, berkas hardcopy telah dicetak dan diarsipkan oleh Tim Admin Keuangan.',
    amandemenCount: 1,
    isLockedForPrint: false,
  },

  // --- Pengajuan contoh per branch lain (data sementara, menyusul diganti data asli) ---
  buatPengajuan({
    id: 'SUB-2026-005',
    nomorSPK: 'SPK/TEL/2026/04/0231',
    nomorPP: 'PP/INFRA/2026/04/0142',
    nomorBAKH: 'BAKH/TEL/2026/04/0231',
    nomorIF: 'IF-DISB-2604-051',
    namaPekerjaan: 'Fiberisasi Feeder 48 Core & Instalasi ODP Kawasan Industri, Karawang',
    lokasiProyek: 'Kawasan Suryacipta City of Industry, Karawang',
    regional: 'Regional Jawa Barat',
    picProyek: 'Yusuf Maulana (Project Manager)',
    vendorPelaksana: 'PT Sarana Fiber Nusantara',
    namaPenerimaPrelim: 'Hendra Saputra',
    bankPenerima: 'Bank BRI (0027-01-5541180-7)',
    nomorRekening: '0027-01-5541180-7',
    npwpPenerima: '31.724.908.7-403.000',
    nilaiPekerjaan: 265000000,
    nilaiPrelimPanjar: 32000000,
    tanggalSPK: '2026-04-06',
    durasiKerjaHari: 30,
    status: 'SIAP_CETAK',
    isLockedForPrint: false,
    terverifikasi: ['bakh', 'lampiranKesepakatanHarga', 'spk', 'pp', 'pengajuanPanjar', 'imprestFund', 'ktp', 'npwp', 'bukuRekening', 'evidenSerahTerimaPrelim', 'buktiTransferTA', 'spb'],
    catatan: 'Pekerjaan fiberisasi kawasan industri. Eviden serah terima lengkap.',
  }),
  buatPengajuan({
    id: 'SUB-2026-006',
    nomorSPK: 'SPK/TEL/2026/04/0244',
    nomorPP: 'PP/INFRA/2026/04/0150',
    nomorBAKH: 'BAKH/TEL/2026/04/0244',
    nomorIF: 'IF-DISB-2604-057',
    namaPekerjaan: 'Penggelaran Kabel Feeder FO 48 Core Perumahan Griya Jambu, Bogor',
    lokasiProyek: 'Jalan Jambu 2, Kota Bogor',
    regional: 'Regional Jawa Barat',
    picProyek: 'Rizky Ananda (Project Manager)',
    vendorPelaksana: 'PT Sarana Fiber Nusantara',
    namaPenerimaPrelim: 'Dedi Kurniawan',
    bankPenerima: 'Bank Mandiri (135-00-2274810-5)',
    nomorRekening: '135-00-2274810-5',
    npwpPenerima: '22.105.663.8-442.000',
    nilaiPekerjaan: 148500000,
    nilaiPrelimPanjar: 18000000,
    tanggalSPK: '2026-04-08',
    durasiKerjaHari: 24,
    status: 'SIAP_CETAK',
    isLockedForPrint: false,
    terverifikasi: ['bakh', 'lampiranKesepakatanHarga', 'spk', 'pp', 'pengajuanPanjar', 'imprestFund', 'ktp', 'npwp', 'bukuRekening', 'evidenSerahTerimaPrelim', 'buktiTransferTA', 'spb'],
    catatan: 'Paket pekerjaan Griya Jambu, siap cetak berkas.',
  }),
  buatPengajuan({
    id: 'SUB-2026-007',
    nomorSPK: 'SPK/CIV/2026/04/0258',
    nomorPP: 'PP/CIV/2026/04/0163',
    nomorBAKH: 'BAKH/CIV/2026/04/0258',
    nomorIF: 'IF-DISB-2604-063',
    namaPekerjaan: 'Pembangunan Base Transceiver Station & Microwave Link, Bogor',
    lokasiProyek: 'Jalan Jambu 3, Kota Bogor',
    regional: 'Regional Jawa Barat',
    picProyek: 'Fajar Nugroho (Project Manager)',
    vendorPelaksana: 'CV Karya Menara Sentosa',
    namaPenerimaPrelim: 'Agus Setiawan',
    bankPenerima: 'Bank BNI (0451-7720-19',
    nomorRekening: '0451-7720-19',
    npwpPenerima: '58.410.226.3-421.000',
    nilaiPekerjaan: 312000000,
    nilaiPrelimPanjar: 40000000,
    tanggalSPK: '2026-04-13',
    durasiKerjaHari: 42,
    status: 'MENUNGGU_EVIDEN',
    isLockedForPrint: true,
    terverifikasi: ['bakh', 'lampiranKesepakatanHarga', 'spk', 'pp', 'boqDrm', 'lampiranDasarPekerjaan', 'pengajuanPanjar', 'imprestFund', 'ktp', 'npwp', 'bukuRekening'],
    catatan: 'Menunggu eviden serah terima prelim dan bukti transfer TA sebelum berkas bisa dicetak.',
  }),
  buatPengajuan({
    id: 'SUB-2026-008',
    nomorSPK: 'SPK/TEL/2026/04/0267',
    nomorPP: 'PP/INFRA/2026/04/0171',
    nomorBAKH: 'BAKH/TEL/2026/04/0267',
    nomorIF: 'IF-DISB-2604-070',
    namaPekerjaan: 'Penggelaran Backbone FO 144 Core & Splicing, Tangerang',
    lokasiProyek: 'Kawasan BSD City, Tangerang',
    regional: 'Regional Banten',
    picProyek: 'Andi Prasetyo (Project Manager)',
    vendorPelaksana: 'PT Trans Jasa Optika',
    namaPenerimaPrelim: 'Rudi Hartono',
    bankPenerima: 'Bank CIMB Niaga (8000-3311-4529)',
    nomorRekening: '8000-3311-4529',
    npwpPenerima: '07.991.485.2-409.000',
    nilaiPekerjaan: 472000000,
    nilaiPrelimPanjar: 55000000,
    tanggalSPK: '2026-04-15',
    durasiKerjaHari: 45,
    status: 'KIRIM_DIGITAL',
    isLockedForPrint: false,
    terverifikasi: ['bakh', 'lampiranKesepakatanHarga', 'spk', 'pp', 'boqDrm', 'lampiranDasarPekerjaan', 'pengajuanPanjar'],
    catatan: 'Berkas dikirim via approval digital ke PM. Imprest Fund dijadwalkan menyusul.',
  }),
  buatPengajuan({
    id: 'SUB-2026-009',
    nomorSPK: 'SPK/TEL/2026/04/0275',
    nomorPP: 'PP/INFRA/2026/04/0178',
    nomorBAKH: 'BAKH/TEL/2026/04/0275',
    nomorIF: 'IF-DISB-2604-076',
    namaPekerjaan: 'Rekonstruksi Jaringan Distribusi Fiber & Instalasi Kanal, Serang',
    lokasiProyek: 'Jalan Raya Serang, Kota Serang',
    regional: 'Regional Banten',
    picProyek: 'Bagus Ramadhan (Project Manager)',
    vendorPelaksana: 'CV Konstruksi Menara Mandiri',
    namaPenerimaPrelim: 'Taufik Hidayat',
    bankPenerima: 'Bank Syariah Indonesia (7129-4400-1822)',
    nomorRekening: '7129-4400-1822',
    npwpPenerima: '64.882.517.0-447.000',
    nilaiPekerjaan: 196000000,
    nilaiPrelimPanjar: 24000000,
    tanggalSPK: '2026-04-20',
    durasiKerjaHari: 28,
    status: 'SIAP_CETAK',
    isLockedForPrint: false,
    terverifikasi: ['bakh', 'lampiranKesepakatanHarga', 'spk', 'pp', 'pengajuanPanjar', 'imprestFund', 'ktp', 'npwp', 'bukuRekening', 'evidenSerahTerimaPrelim', 'buktiTransferTA', 'spb'],
    catatan: 'Rekonstruksi distribusi Serang. Seluruh eviden lengkap.',
  }),
  buatPengajuan({
    id: 'SUB-2026-010',
    nomorSPK: 'SPK/TEL/2026/04/0284',
    nomorPP: 'PP/INFRA/2026/04/0186',
    nomorBAKH: 'BAKH/TEL/2026/04/0284',
    nomorIF: 'IF-DISB-2604-083',
    namaPekerjaan: 'Pemasangan Kabel UG & Konstruksi Building Route, Cirebon',
    lokasiProyek: 'Jalan Juanda, Kota Cirebon',
    regional: 'Regional Jawa Barat',
    picProyek: 'Sinta Lestari (Project Manager)',
    vendorPelaksana: 'PT Sarana Fiber Nusantara',
    namaPenerimaPrelim: 'Wawan Susilo',
    bankPenerima: 'Bank Mandiri (0987-00-1135529-4)',
    nomorRekening: '0987-00-1135529-4',
    npwpPenerima: '45.203.778.6-433.000',
    nilaiPekerjaan: 228000000,
    nilaiPrelimPanjar: 27500000,
    tanggalSPK: '2026-04-22',
    durasiKerjaHari: 35,
    status: 'MENUNGGU_EVIDEN',
    isLockedForPrint: true,
    terverifikasi: ['bakh', 'lampiranKesepakatanHarga', 'spk', 'pp', 'pengajuanPanjar', 'imprestFund', 'ktp', 'npwp', 'bukuRekening'],
    catatan: 'Menunggu eviden j (serah terima) dan k (bukti transfer) dari vendor.',
  }),
  buatPengajuan({
    id: 'SUB-2026-011',
    nomorSPK: 'SPK/TEL/2026/04/0296',
    nomorPP: 'PP/INFRA/2026/04/0194',
    nomorBAKH: 'BAKH/TEL/2026/04/0296',
    nomorIF: 'IF-DISB-2604-091',
    namaPekerjaan: 'Penggelaran Kabel Indoor-Outdoor & Jointing Gedung, Bandung',
    lokasiProyek: 'Jalan Asia Afrika, Kota Bandung',
    regional: 'Regional Jawa Barat',
    picProyek: 'Dimas Wicaksono (Project Manager)',
    vendorPelaksana: 'PT Mandiri Prima Solusindo',
    namaPenerimaPrelim: 'Bambang Supriyanto',
    bankPenerima: 'Bank Mandiri (156-00-1849201-9)',
    nomorRekening: '156-00-1849201-9',
    npwpPenerima: '09.845.210.4-411.000',
    nilaiPekerjaan: 356000000,
    nilaiPrelimPanjar: 42000000,
    tanggalSPK: '2026-04-27',
    durasiKerjaHari: 38,
    status: 'SIAP_CETAK',
    isLockedForPrint: false,
    terverifikasi: ['bakh', 'lampiranKesepakatanHarga', 'spk', 'pp', 'pengajuanPanjar', 'imprestFund', 'ktp', 'npwp', 'bukuRekening', 'evidenSerahTerimaPrelim', 'buktiTransferTA', 'spb'],
    catatan: 'Berkas lengkap, menunggu cetak hardcopy.',
  }),
  buatPengajuan({
    id: 'SUB-2026-012',
    nomorSPK: 'SPK/TEL/2026/05/0304',
    nomorPP: 'PP/INFRA/2026/05/0202',
    nomorBAKH: 'BAKH/TEL/2026/05/0304',
    nomorIF: 'IF-DISB-2605-098',
    namaPekerjaan: 'Instalasi Jaringan Fiber Gedung Perkantoran & Site Survey, Jakarta Selatan',
    lokasiProyek: 'Jalan Kemang Raya, Jakarta Selatan',
    regional: 'Regional DKI Jakarta',
    picProyek: 'Rahmat Hidayat (Project Manager)',
    vendorPelaksana: 'PT Daya Pratama Energi',
    namaPenerimaPrelim: 'Sari Wulandari',
    bankPenerima: 'Bank BCA (0371-555-6601)',
    nomorRekening: '0371-555-6601',
    npwpPenerima: '29.610.488.9-415.000',
    nilaiPekerjaan: 184000000,
    nilaiPrelimPanjar: 22000000,
    tanggalSPK: '2026-05-04',
    durasiKerjaHari: 21,
    status: 'SIAP_CETAK',
    isLockedForPrint: false,
    terverifikasi: ['bakh', 'lampiranKesepakatanHarga', 'spk', 'pp', 'pengajuanPanjar', 'imprestFund', 'ktp', 'npwp', 'bukuRekening', 'evidenSerahTerimaPrelim', 'buktiTransferTA', 'spb'],
    catatan: 'Paket gedung perkantoran Jakarta Selatan, durasi pendek.',
  }),
  buatPengajuan({
    id: 'SUB-2026-013',
    nomorSPK: 'SPK/CIV/2026/05/0312',
    nomorPP: 'PP/CIV/2026/05/0211',
    nomorBAKH: 'BAKH/CIV/2026/05/0312',
    nomorIF: 'IF-DISB-2605-104',
    namaPekerjaan: 'Crossing Jalan Tol & Instalasi Duct Raceway, Jakarta Pusat',
    lokasiProyek: 'Jalan Medan Merdeka Barat, Jakarta Pusat',
    regional: 'Regional DKI Jakarta',
    picProyek: 'Sony Prasetyo (Project Manager)',
    vendorPelaksana: 'CV Karya Menara Sentosa',
    namaPenerimaPrelim: 'Joko Susilo',
    bankPenerima: 'Bank BRI (0058-01-7740291-3)',
    nomorRekening: '0058-01-7740291-3',
    npwpPenerima: '77.904.115.2-407.000',
    nilaiPekerjaan: 418000000,
    nilaiPrelimPanjar: 50000000,
    tanggalSPK: '2026-05-06',
    durasiKerjaHari: 40,
    status: 'KIRIM_DIGITAL',
    isLockedForPrint: false,
    terverifikasi: ['bakh', 'lampiranKesepakatanHarga', 'spk', 'pp', 'boqDrm', 'lampiranDasarPekerjaan', 'pengajuanPanjar', 'imprestFund', 'ktp', 'npwp', 'bukuRekening'],
    catatan: 'Perizinan crossing jalan tol sedang diproses bersama pengelola tol.',
  }),
  buatPengajuan({
    id: 'SUB-2026-014',
    nomorSPK: 'SPK/TEL/2026/05/0321',
    nomorPP: 'PP/INFRA/2026/05/0219',
    nomorBAKH: 'BAKH/TEL/2026/05/0321',
    nomorIF: 'IF-DISB-2605-111',
    namaPekerjaan: 'Penggelaran Backbone FO Ruas Jalan Siliwangi & Jointing, Tasikmalaya',
    lokasiProyek: 'Jalan Ir. H. Juanda, Kota Tasikmalaya',
    regional: 'Regional Jawa Barat',
    picProyek: 'Fajar Nugroho (Project Manager)',
    vendorPelaksana: 'PT Sarana Fiber Nusantara',
    namaPenerimaPrelim: 'Asep Rohman',
    bankPenerima: 'Bank Syariah Indonesia (7712-0045-9033)',
    nomorRekening: '7712-0045-9033',
    npwpPenerima: '53.227.604.1-436.000',
    nilaiPekerjaan: 167000000,
    nilaiPrelimPanjar: 20000000,
    tanggalSPK: '2026-05-11',
    durasiKerjaHari: 26,
    status: 'SIAP_CETAK',
    isLockedForPrint: false,
    terverifikasi: ['bakh', 'lampiranKesepakatanHarga', 'spk', 'pp', 'pengajuanPanjar', 'imprestFund', 'ktp', 'npwp', 'bukuRekening', 'evidenSerahTerimaPrelim', 'buktiTransferTA', 'spb'],
    catatan: 'Paket Tasikmalaya siap cetak.',
  }),
  buatPengajuan({
    id: 'SUB-2026-015',
    nomorSPK: 'SPK/TEL/2026/05/0330',
    nomorPP: 'PP/INFRA/2026/05/0227',
    nomorBAKH: 'BAKH/TEL/2026/05/0330',
    nomorIF: 'IF-DISB-2605-118',
    namaPekerjaan: 'Pemasangan Kabel Feeder & Perbaikan Jaringan PON, Sukabumi',
    lokasiProyek: 'Jalan Suryakencana, Kota Sukabumi',
    regional: 'Regional Jawa Barat',
    picProyek: 'Bagus Ramadhan (Project Manager)',
    vendorPelaksana: 'CV Konstruksi Menara Mandiri',
    namaPenerimaPrelim: 'Endang Saputra',
    bankPenerima: 'Bank CIMB Niaga (7000-9922-1174)',
    nomorRekening: '7000-9922-1174',
    npwpPenerima: '40.518.936.7-432.000',
    nilaiPekerjaan: 132000000,
    nilaiPrelimPanjar: 16000000,
    tanggalSPK: '2026-05-13',
    durasiKerjaHari: 20,
    status: 'MENUNGGU_EVIDEN',
    isLockedForPrint: true,
    terverifikasi: ['bakh', 'lampiranKesepakatanHarga', 'spk', 'pp', 'pengajuanPanjar', 'imprestFund', 'ktp', 'npwp', 'bukuRekening'],
    catatan: 'Menunggu upload eviden serah terima dan bukti transfer.',
  }),
];

const INITIAL_AMANDEMEN: AmandemenRecord[] = [
  {
    id: 'AMD-2026-001',
    submissionId: 'SUB-2026-004',
    nomorAmandemen: 'AMD-01/SPK-TEL-0098/2026',
    tanggalAmandemen: '2026-03-05',
    alasanAmandemen: 'PERPANJANGAN_WAKTU',
    keterangan: 'Penambahan durasi kerja selama 14 hari akibat kendala perizinan crossing jalan tol dari pengelola tol dan cuaca ekstrem.',
    pemohon: 'Sony Prasetyo (Project Manager)',
    disetujuiOleh: 'Ir. Hendra Gunawan, MT (General Manager Proyek)',
    status: 'DISETUJUI',
    perubahan: [
      { field: 'Durasi Pekerjaan', sebelum: '35 Hari', sesudah: '49 Hari (Kurva S disesuaikan)' },
      { field: 'Tanggal Selesai SPK', sebelum: '22 Maret 2026', sesudah: '05 April 2026' },
      { field: 'Kurva S', sebelum: '5 Periode Mingguan', sesudah: '7 Periode Mingguan' },
    ],
  },
];

const INITIAL_IF_ENTRIES: ImprestFundEntry[] = [
  {
    id: 'IF-TX-001',
    tanggal: '2026-03-01',
    nomorTransaksi: 'TRX-IF-260301-01',
    penerima: 'Treasury Admin Proyek (Kas Besar ke IF)',
    tipe: 'DROP_DANA_IF',
    debit: 250000000,
    kredit: 0,
    saldo: 250000000,
    keterangan: 'Top-up Plafon Kas Imprest Fund Bulan Maret 2026 (SK Direksi Keuangan No. 042/KEU/2026)',
    petugasTA: 'Siti Nurhaliza (Finance Admin)',
  },
  {
    id: 'IF-TX-002',
    tanggal: '2026-03-06',
    nomorTransaksi: 'TRX-IF-260306-02',
    submissionId: 'SUB-2026-001',
    nomorSPK: 'SPK/TEL/2026/03/0182',
    proyek: 'Penggelaran Kabel Feeder FO 48 Core Cikarang',
    penerima: 'Bambang Supriyanto (Mandiri: 156-00-1849201-9)',
    tipe: 'PENCAIRAN_PRELIM',
    debit: 0,
    kredit: 45000000,
    saldo: 205000000,
    keterangan: 'Pencairan Panjar Prelim Pekerjaan FO Cikarang sesuai disposisi IF-DISB-2603-044',
    petugasTA: 'Siti Nurhaliza (Finance Admin)',
  },
  {
    id: 'IF-TX-003',
    tanggal: '2026-03-14',
    nomorTransaksi: 'TRX-IF-260314-03',
    submissionId: 'SUB-2026-002',
    nomorSPK: 'SPK/CIV/2026/03/0205',
    proyek: 'Perkuatan Pondasi & Grounding Tower Subang',
    penerima: 'Hendro Gunawan (BCA: 883-091-2811)',
    tipe: 'PENCAIRAN_PRELIM',
    debit: 0,
    kredit: 25000000,
    saldo: 180000000,
    keterangan: 'Disposisi Panjar Prelim Menara Subang IF-DISB-2603-058 (Menunggu konfirmasi eviden fisik)',
    petugasTA: 'Siti Nurhaliza (Finance Admin)',
  },
  {
    id: 'IF-TX-004',
    tanggal: '2026-02-19',
    nomorTransaksi: 'TRX-IF-260219-01',
    submissionId: 'SUB-2026-004',
    nomorSPK: 'SPK/TEL/2026/02/0098',
    proyek: 'Relokasi Jalur FO Tol Surabaya-Gresik',
    penerima: 'Arif Wibowo (Mandiri: 142-00-983192-3)',
    tipe: 'PENCAIRAN_PRELIM',
    debit: 0,
    kredit: 60000000,
    saldo: 120000000,
    keterangan: 'Pencairan Panjar Prelim Proyek Relokasi Tol Jawa Timur IF-DISB-2602-019',
    petugasTA: 'Rina Marlina (TA Lead Jatim)',
  },
  {
    id: 'IF-TX-005',
    tanggal: '2026-03-25',
    nomorTransaksi: 'TRX-IF-260325-04',
    penerima: 'Treasury Admin Proyek',
    tipe: 'DROP_DANA_IF',
    debit: 100000000,
    kredit: 0,
    saldo: 280000000,
    keterangan: 'Tambahan Replenishment Kas Imprest Fund untuk percepatan proyek Q1',
    petugasTA: 'Siti Nurhaliza (Finance Admin)',
  }
];

export const db = {
  getSubmissions(): ProjectSubmission[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
      if (!data) {
        const seed = SEED_DEMO_DATA ? INITIAL_SUBMISSIONS : [];
        localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(seed));
        return seed;
      }
      const list: ProjectSubmission[] = JSON.parse(data);
      // Jika list sengaja dikosongkan (mis. setelah "Hapus Semua Data Antrian"),
      // jangan diisi ulang dengan data demo.
      if (list.length === 0) {
        return [];
      }
      // Pelengkap seed hanya dijalankan bila data demo diaktifkan.
      if (SEED_DEMO_DATA) {
        const sudahAda = new Set(list.map(s => s.id));
        const tambahan = INITIAL_SUBMISSIONS.filter(s => !sudahAda.has(s.id));
        if (tambahan.length > 0) {
          const gabung = [...list, ...tambahan];
          localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(gabung));
          return gabung;
        }
      }
      return list;
    } catch {
      return SEED_DEMO_DATA ? INITIAL_SUBMISSIONS : [];
    }
  },

  saveSubmissions(items: ProjectSubmission[]) {
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(items));
  },

  clearSubmissions() {
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify([]));
    // Hapus juga semua draft metadata agar list antrian benar-benar kosong
    localStorage.setItem(STORAGE_KEYS.DRAFT_METADATA, JSON.stringify([]));
  },

  getSubmissionById(id: string): ProjectSubmission | undefined {
    return this.getSubmissions().find(s => s.id === id);
  },

  createSubmission(payload: Omit<ProjectSubmission, 'id' | 'createdAt' | 'updatedAt' | 'amandemenCount' | 'isLockedForPrint'>): ProjectSubmission {
    const list = this.getSubmissions();
    const newId = `SUB-${new Date().getFullYear()}-${String(list.length + 1).padStart(3, '0')}`;
    
    // Check if eviden transfer & serah terima are provided
    const hasEvidenTransfer = payload.dokumen.buktiTransferTA?.status === 'VERIFIED' || payload.dokumen.buktiTransferTA?.status === 'UPLOADED';
    const hasEvidenSerahTerima = payload.dokumen.evidenSerahTerimaPrelim?.status === 'VERIFIED' || payload.dokumen.evidenSerahTerimaPrelim?.status === 'UPLOADED';
    const isLocked = !(hasEvidenTransfer && hasEvidenSerahTerima);

    const newSub: ProjectSubmission = {
      ...payload,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      amandemenCount: 0,
      isLockedForPrint: isLocked,
      // Pengajuan baru selalu masuk antrean verifikator sebelum bisa dicetak.
      status: 'MENUNGGU_VERIFIKASI',
      verifikasiStatus: 'MENUNGGU',
      verifikasiCatatan: undefined,
      diverifikasiOleh: undefined,
      diverifikasiPada: undefined,
    };

    list.unshift(newSub);
    this.saveSubmissions(list);

    // If IF value > 0, log an IF record entry automatically
    if (payload.nilaiPrelimPanjar > 0) {
      this.createIFEntry({
        tanggal: payload.tanggalImprestFund || new Date().toISOString().split('T')[0],
        submissionId: newId,
        nomorSPK: payload.nomorSPK,
        proyek: payload.namaPekerjaan,
        penerima: `${payload.namaPenerimaPrelim} (${payload.bankPenerima})`,
        tipe: 'PENCAIRAN_PRELIM',
        debit: 0,
        kredit: payload.nilaiPrelimPanjar,
        keterangan: `Disposisi Pencairan Panjar Prelim Proyek: ${payload.namaPekerjaan} (${payload.nomorIF})`,
        petugasTA: 'Admin Treasury Proyek',
      });
    }

    return newSub;
  },

  updateSubmission(id: string, updates: Partial<ProjectSubmission>): ProjectSubmission | null {
    const list = this.getSubmissions();
    const idx = list.findIndex(s => s.id === id);
    if (idx === -1) return null;

    const current = list[idx];
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Recheck locked print rule:
    // "transfer dan serah terima (masuk eviden transfer dan serah terima) - baru bisa di print untuk berkas nya"
    const hasEvidenTransfer = !!(updated.dokumen?.buktiTransferTA?.fileName || updated.dokumen?.buktiTransferTA?.status === 'VERIFIED');
    const hasEvidenSerahTerima = !!(updated.dokumen?.evidenSerahTerimaPrelim?.fileName || updated.dokumen?.evidenSerahTerimaPrelim?.status === 'VERIFIED');

    if (hasEvidenTransfer && hasEvidenSerahTerima) {
      updated.isLockedForPrint = false;
      if (updated.status === 'MENUNGGU_EVIDEN' || updated.status === 'KIRIM_DIGITAL') {
        updated.status = 'SIAP_CETAK';
      }
    } else {
      updated.isLockedForPrint = true;
    }

    // Gerbang verifikator: status selalu mengikuti hasil pemeriksaan, sehingga
    // pengajuan tidak pernah menyandang SIAP_CETAK sebelum disetujui.
    if (updated.verifikasiStatus === 'MENUNGGU') {
      updated.status = 'MENUNGGU_VERIFIKASI';
    } else if (updated.verifikasiStatus === 'REVISI') {
      updated.status = 'REVISI_ADMIN';
    } else if (!updated.verifikasiStatus && updates.verifikasiStatus) {
      // jatuhkan ke penanganan di bawah bila field baru saja diisi
    }

    if (updated.verifikasiStatus === 'DISETUJUI') {
      updated.status = statusSetelahVerifikasi(updated);
    }

    if (!updated.verifikasiStatus && (hasEvidenTransfer && hasEvidenSerahTerima)) {
      if (updated.status === 'MENUNGGU_EVIDEN' || updated.status === 'KIRIM_DIGITAL') {
        updated.status = 'SIAP_CETAK';
      }
    }

    list[idx] = updated;
    this.saveSubmissions(list);
    return updated;
  },

  uploadDocument(submissionId: string, docKey: keyof ProjectSubmission['dokumen'], fileInfo: { fileName: string; fileSize: string; fileUrl?: string }) {
    const sub = this.getSubmissionById(submissionId);
    if (!sub) return null;

    const updatedDoc = {
      ...sub.dokumen[docKey],
      fileName: fileInfo.fileName,
      fileSize: fileInfo.fileSize,
      fileUrl: fileInfo.fileUrl,
      uploadedAt: new Date().toISOString().split('T')[0],
      status: 'VERIFIED' as const,
    };

    const newDocs = {
      ...sub.dokumen,
      [docKey]: updatedDoc,
    };

    // Saat admin mengunggah ulang berkas sesuai revisi, kendalikan status.
    let statusUpdate: Partial<ProjectSubmission> = {
      verifikasiStatus: sub.verifikasiStatus === 'REVISI' ? 'MENUNGGU' : sub.verifikasiStatus,
    };
    if (statusUpdate.verifikasiStatus === 'MENUNGGU' && sub.verifikasiStatus === 'REVISI') {
      statusUpdate.status = 'MENUNGGU_VERIFIKASI';
      statusUpdate.verifikasiCatatan = undefined;
    }

    return this.updateSubmission(submissionId, {
      dokumen: newDocs,
      ...statusUpdate,
    });
  },

  // AMANDEMEN
  getAmandemen(): AmandemenRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AMANDEMEN);
      if (!data) {
        const seed = SEED_DEMO_DATA ? INITIAL_AMANDEMEN : [];
        localStorage.setItem(STORAGE_KEYS.AMANDEMEN, JSON.stringify(seed));
        return seed;
      }
      return JSON.parse(data);
    } catch {
      return SEED_DEMO_DATA ? INITIAL_AMANDEMEN : [];
    }
  },

  saveAmandemen(items: AmandemenRecord[]) {
    localStorage.setItem(STORAGE_KEYS.AMANDEMEN, JSON.stringify(items));
  },

  createAmandemen(payload: Omit<AmandemenRecord, 'id' | 'status'>): AmandemenRecord {
    const list = this.getAmandemen();
    const newId = `AMD-${new Date().getFullYear()}-${String(list.length + 1).padStart(3, '0')}`;
    const newAmd: AmandemenRecord = {
      ...payload,
      id: newId,
      status: 'DISETUJUI', // Auto approved for operational flow, or pending
    };
    list.unshift(newAmd);
    this.saveAmandemen(list);

    // Update parent submission amandemen count
    const sub = this.getSubmissionById(payload.submissionId);
    if (sub) {
      this.updateSubmission(payload.submissionId, {
        amandemenCount: (sub.amandemenCount || 0) + 1,
      });
    }

    return newAmd;
  },

  // IMPREST FUND
  getIFEntries(): ImprestFundEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.IF_ENTRIES);
      if (!data) {
        const seed = SEED_DEMO_DATA ? INITIAL_IF_ENTRIES : [];
        localStorage.setItem(STORAGE_KEYS.IF_ENTRIES, JSON.stringify(seed));
        return seed;
      }
      return JSON.parse(data);
    } catch {
      return SEED_DEMO_DATA ? INITIAL_IF_ENTRIES : [];
    }
  },

  saveIFEntries(items: ImprestFundEntry[]) {
    localStorage.setItem(STORAGE_KEYS.IF_ENTRIES, JSON.stringify(items));
  },

  createIFEntry(entry: Omit<ImprestFundEntry, 'id' | 'nomorTransaksi' | 'saldo'>): ImprestFundEntry {
    const list = this.getIFEntries();
    const lastSaldo = list.length > 0 ? list[0].saldo : 0;
    const newSaldo = lastSaldo + (entry.debit || 0) - (entry.kredit || 0);
    
    const newEntry: ImprestFundEntry = {
      ...entry,
      id: `IF-TX-${Date.now()}`,
      nomorTransaksi: `TRX-IF-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(list.length + 1).padStart(2, '0')}`,
      saldo: newSaldo,
    };

    list.unshift(newEntry);
    this.saveIFEntries(list);
    return newEntry;
  },

  resetAllData() {
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(SEED_DEMO_DATA ? INITIAL_SUBMISSIONS : []));
    localStorage.setItem(STORAGE_KEYS.AMANDEMEN, JSON.stringify(SEED_DEMO_DATA ? INITIAL_AMANDEMEN : []));
    localStorage.setItem(STORAGE_KEYS.IF_ENTRIES, JSON.stringify(SEED_DEMO_DATA ? INITIAL_IF_ENTRIES : []));
    localStorage.setItem(STORAGE_KEYS.DRAFT_METADATA, JSON.stringify([]));
  },

  // DRAFT METADATA
  getDraftMetadata(): Array<{ id: string; nomorSPK: string; namaPekerjaan: string; createdAt: string; updatedAt: string; status: 'DRAFT' }> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DRAFT_METADATA);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveDraftMetadata(nomorSPK: string, namaPekerjaan: string): void {
    const drafts = this.getDraftMetadata();
    const now = new Date().toISOString();
    const draftId = `DRAFT-${Date.now()}`;
    
    // Cek apakah sudah ada draft untuk nomor SPK ini, jika ya update, jika tidak tambah baru
    const existingIdx = drafts.findIndex(d => d.nomorSPK === nomorSPK);
    if (existingIdx !== -1) {
      drafts[existingIdx].updatedAt = now;
      drafts[existingIdx].namaPekerjaan = namaPekerjaan;
    } else {
      drafts.unshift({
        id: draftId,
        nomorSPK,
        namaPekerjaan,
        createdAt: now,
        updatedAt: now,
        status: 'DRAFT',
      });
    }
    
    localStorage.setItem(STORAGE_KEYS.DRAFT_METADATA, JSON.stringify(drafts));
  },

  deleteDraftMetadata(nomorSPK: string): void {
    const drafts = this.getDraftMetadata().filter(d => d.nomorSPK !== nomorSPK);
    localStorage.setItem(STORAGE_KEYS.DRAFT_METADATA, JSON.stringify(drafts));
  }
};

