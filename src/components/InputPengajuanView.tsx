import React, { useEffect, useRef, useState } from 'react';
import {
  AlurProyek,
  BoqSpkRow,
  BakhDetail,
  LampiranHargaRow,
  PpDetail,
  ProjectSubmission,
  SpkDetail,
  KurvaSPlan,
  BopCostRow,
  MarginAngka,
  LevelRisiko,
  barisLampiranHargaKosong,
  lampiranHargaTerisi,
  totalKesepakatanBaris,
  totalNegosiasiBaris,
} from '../types';
import {
  addDays,
  formatRupiah,
  generateKurvaS,
  generateKurvaSDariPlan,
  rekapKurvaSPlan,
  titikKurvaSDariPlan,
  rentangKurvaSDariPlan,
  alurProyekDariKurvaS,
  formatTanggalIndo,
  db,
} from '../db/storage';
import {
  ADMIN_LIST,
  GM_LIST,
  MANDOR_LIST,
  NAMA_PEKERJAAN_BAKH,
  ORANG_PER_TEAM_FO,
  ORANG_PER_TEAM_JOINTER,
  PM_LIST,
  WASPANG_LIST,
  cariOrang,
  hintOrang,
} from '../db/masterpp';
import {
  hitungSubtotalMaterial,
  hitungSubtotalJasa,
  cariRabItem,
} from '../db/lampiranBakhMaster';
import { BOQ_SWAKELOLA_ITEMS } from '../db/boqSwakelola';
import { RAB_TA, RAB_MANDOR, cariRabTA, cariRabMandor } from '../db/lampiranBakhData';
import {
  BERKAS_PRELIM_WIZARD,
  BerkasDef,
  BerkasLetter,
  DokumenKey,
  berkasByKey,
} from '../db/berkas';
import { BerkasStepShell, BerkasStatus } from './wizard/BerkasStepShell';
import { WizardRail } from './wizard/WizardRail';
import { UploadStep, StoredFile } from './wizard/UploadStep';
import { TextField, SelectField, SearchSelectField, SearchSelectOption } from './wizard/Field';
import { LampiranHargaTable } from './LampiranHargaTable';
import {
  BoqParseResult,
  parseBoqGrid,
  parseBoqSpkWorkbook,
  parseLampiranGrid,
  parseLampiranHargaWorkbook,
  parseTsvGrid,
} from '../lib/excel';
import { KurvaSChart } from './KurvaSChart';
import { KurvaSPlannerModal } from './KurvaSPlannerModal';
import { BopCostModal } from './BopCostModal';
import { PerkiraanMargin, PERKIRAAN_MARGIN_AWAL } from './PerkiraanMargin';
import {
  FilePlus2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building2,
  DollarSign,
  FileText,
  Info,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock3,
  Table2,
  Trash2,
  Users,
  FileSpreadsheet,
  ClipboardPaste,
  Calculator,
  UploadCloud,
  Eye,
  FileSearch,
  Lock,
  Save,
} from 'lucide-react';
import { PrintDocumentModal } from './PrintDocumentModal';
import { RailStep } from './wizard/WizardRail';

interface InputPengajuanViewProps {
  onSubmitSuccess: (newSub: ProjectSubmission) => void;
  onCancel: () => void;
}

/** Komponen pada "Rincian Total Nilai Pengajuan IF Project" (langkah PP). */
type KomponenTotal = 'prelim' | 'termin1' | 'termin2' | 'termin3' | 'retensi' | 'materialStock' | 'lumpsum';

/** Pilihan "Total Nilai" pada langkah Pengajuan Panjar Proyek. */
const KOMPONEN_TOTAL: { key: KomponenTotal; label: string }[] = [
  { key: 'prelim', label: 'Prelim' },
  { key: 'termin1', label: 'Termin 1' },
  { key: 'termin2', label: 'Termin 2' },
  { key: 'termin3', label: 'Termin 3' },
  { key: 'retensi', label: 'Retensi' },
  { key: 'materialStock', label: 'Material Non Stock' },
  { key: 'lumpsum', label: 'Lumpsum' },
];

/** Galangan judul sub-bagian di dalam satu langkah. */
/** Warna aksen per sub-bagian â€” redup (50/200/700) supaya hidup tapi tidak mencolok. */
type SectionTone =
  | 'teal'
  | 'emerald'
  | 'sky'
  | 'amber'
  | 'violet'
  | 'rose'
  | 'indigo'
  | 'slate';

const SECTION_TONE: Record<
  SectionTone,
  { icon: string; title: string; rule: string; badge: string; panel: string }
> = {
  teal: {
    icon: 'border-teal-200 bg-teal-50 text-teal-700',
    title: 'text-teal-900',
    rule: 'border-teal-200/80',
    badge: 'border-teal-200 bg-teal-50 text-teal-800',
    panel: 'border-teal-200/70 bg-teal-50/50',
  },
  emerald: {
    icon: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    title: 'text-emerald-900',
    rule: 'border-emerald-200/80',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    panel: 'border-emerald-200/70 bg-emerald-50/50',
  },
  sky: {
    icon: 'border-sky-200 bg-sky-50 text-sky-700',
    title: 'text-sky-900',
    rule: 'border-sky-200/80',
    badge: 'border-sky-200 bg-sky-50 text-sky-800',
    panel: 'border-sky-200/70 bg-sky-50/50',
  },
  amber: {
    icon: 'border-amber-200 bg-amber-50 text-amber-700',
    title: 'text-amber-900',
    rule: 'border-amber-200/80',
    badge: 'border-amber-200 bg-amber-50 text-amber-800',
    panel: 'border-amber-200/70 bg-amber-50/50',
  },
  violet: {
    icon: 'border-violet-200 bg-violet-50 text-violet-700',
    title: 'text-violet-900',
    rule: 'border-violet-200/80',
    badge: 'border-violet-200 bg-violet-50 text-violet-800',
    panel: 'border-violet-200/70 bg-violet-50/50',
  },
  rose: {
    icon: 'border-rose-200 bg-rose-50 text-rose-700',
    title: 'text-rose-900',
    rule: 'border-rose-200/80',
    badge: 'border-rose-200 bg-rose-50 text-rose-800',
    panel: 'border-rose-200/70 bg-rose-50/50',
  },
  indigo: {
    icon: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    title: 'text-indigo-900',
    rule: 'border-indigo-200/80',
    badge: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    panel: 'border-indigo-200/70 bg-indigo-50/50',
  },
  slate: {
    icon: 'border-slate-200 bg-slate-100 text-slate-600',
    title: 'text-slate-800',
    rule: 'border-slate-200/80',
    badge: 'border-slate-200 bg-slate-100 text-slate-700',
    panel: 'border-slate-200/80 bg-slate-50/70',
  },
};

/** Kelas garis pemisah sub-bagian mengikuti tone SectionTitle-nya. */
const ruleCls = (tone: SectionTone) => SECTION_TONE[tone].rule;

/** Kelas kartu panel berlatar warna redup mengikuti tone sub-bagian. */
const panelCls = (tone: SectionTone) => SECTION_TONE[tone].panel;

/**
 * Kartu sub-bagian berlatar warna redup â€” SectionTitle + isian di dalam satu
 * kotak berwarna supaya form tidak didominasi putih.
 */
const SectionPanel: React.FC<{
  icon: React.ReactNode;
  title: string;
  caption?: string;
  right?: React.ReactNode;
  tone?: SectionTone;
  children: React.ReactNode;
  className?: string;
}> = ({ icon, title, caption, right, tone = 'teal', children, className = '' }) => (
  <section className={`rounded-2xl border p-4 ${panelCls(tone)} ${className}`}>
    <SectionTitle
      tone={tone}
      icon={icon}
      title={title}
      caption={caption}
      right={right}
    />
    <div className="mt-3">{children}</div>
  </section>
);

const SectionTitle: React.FC<{
  icon: React.ReactNode;
  title: string;
  caption?: string;
  right?: React.ReactNode;
  tone?: SectionTone;
}> = ({ icon, title, caption, right, tone = 'teal' }) => {
  const t = SECTION_TONE[tone];
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className={`mt-px flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${t.icon}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className={`text-[12px] font-bold uppercase tracking-wider ${t.title}`}>{title}</h3>
          {caption && <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{caption}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
};

/** Tahap alur proyek berurutan (untuk label, validasi, dan render). */
const TAHAP_ALUR: { key: keyof AlurProyek; label: string; id: string }[] = [
  { key: 'persiapan', label: 'Persiapan', id: 'f-alur-persiapan' },
  { key: 'materialDelivery', label: 'Material Delivery', id: 'f-alur-material' },
  { key: 'instalasi', label: 'Instalasi', id: 'f-alur-instalasi' },
  { key: 'commissioningTest', label: 'Commissioning Test', id: 'f-alur-commissioning' },
  { key: 'ujiTerima', label: 'Uji Terima', id: 'f-alur-uji-terima' },
];

/** Î£ jumlah hari kerja seluruh tahap Alur Proyek, termasuk Persiapan. */
const hitungTotalAlur = (a: AlurProyek): number =>
  a.persiapan + a.materialDelivery + a.instalasi + a.commissioningTest + a.ujiTerima;

/**
 * Unggahan terpisah dokumen penerima panjar (berkas i1/i2/i3).
 * key mengikuti registry src/db/berkas.ts; errKey = key pesan validasi.
 */
const IDENTITAS_UPLOADS: { key: DokumenKey; errKey: string }[] = [
  { key: 'ktp', errKey: 'f-panjar-ktp' },
  { key: 'npwp', errKey: 'f-panjar-npwp' },
  { key: 'bukuRekening', errKey: 'f-panjar-buku' },
];

/** Pesan validasi per field (key = id input) untuk satu langkah. */
type StepFieldErrors = Record<string, string>;

/** Kartu nilai turunan (readonly) untuk berkas yang isian rincinya menyusul. */
const InfoBox: React.FC<{
  title: string;
  value: string;
  hint: string;
  tone?: 'teal' | 'emerald' | 'rose';
}> = ({ title, value, hint, tone = 'teal' }) => (
  <div
    className={`p-3 rounded-xl border ${
      tone === 'emerald'
        ? 'bg-emerald-50/70 border-emerald-200'
        : tone === 'rose'
          ? 'bg-rose-50/70 border-rose-200'
          : 'bg-white border-teal-100'
    }`}
  >
    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{title}</div>
    <div className="mt-1 text-sm font-bold text-slate-900">{value}</div>
    <div
      className={`mt-0.5 text-[10px] font-medium ${
        tone === 'emerald'
          ? 'text-emerald-700'
          : tone === 'rose'
            ? 'text-rose-700'
            : 'text-teal-700'
      }`}
    >
      {hint}
    </div>
  </div>
);

/** Penanda slot alur rinci yang akan diisi pada iterasi berikutnya. */
const SlotAlurRinci: React.FC<{ nama: string }> = ({ nama }) => (
  <div className="mt-3 flex items-start gap-2 rounded-xl border border-dashed border-teal-300 bg-teal-50/60 px-3 py-2.5">
    <Clock3 className="w-4 h-4 text-teal-600 shrink-0 mt-px" />
    <p className="text-[11px] text-teal-800 leading-relaxed">
      <strong>Slot alur input {nama}.</strong> Kerangka langkah ini sudah disiapkan â€” formulir rinci
      berkas <strong>{nama}</strong> akan dicolok di sini tanpa mengubah kerangka wizard.
    </p>
  </div>
);

/** Ubah daftar nama (data master orang) jadi opsi dropdown ber-search. */
const opsiOrang = (list: { nama: string }[]): SearchSelectOption[] =>
  list.map(o => ({ value: o.nama, label: o.nama }));

/** Ubah daftar string jadi opsi dropdown ber-search. */
const opsiTeks = (list: string[]): SearchSelectOption[] =>
  list.map(n => ({ value: n, label: n }));

export const InputPengajuanView: React.FC<InputPengajuanViewProps> = ({
  onSubmitSuccess,
  onCancel,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // --- Data kontrak (langkah c) ---
  const [nomorSPK, setNomorSPK] = useState(`SPK/INFRA/2026/04/${Math.floor(100 + Math.random() * 900)}`);
  const [namaPekerjaan, setNamaPekerjaan] = useState('');
  const [lokasiProyek, setLokasiProyek] = useState('');
  const [regional, setRegional] = useState('Regional Jawa Barat');
  const [picProyek, setPicProyek] = useState('');
  const [vendorPelaksana, setVendorPelaksana] = useState('');
  const [nilaiPekerjaan, setNilaiPekerjaan] = useState<number>(250000000);
  const [tanggalSPK, setTanggalSPK] = useState(todayStr);
  const [durasiKerjaHari, setDurasiKerjaHari] = useState<number>(30);

  // --- Isian rinci BAKH (langkah a) ---
  // Lokasi, durasi & mandor memakai state yang sama dengan langkah SPK agar konsisten.
  const [bakhNamaPekerjaan, setBakhNamaPekerjaan] = useState('CENTRATAMA');
  const [bakhWitel, setBakhWitel] = useState('');
  const [bakhPid, setBakhPid] = useState('');
  const [hargaPenawaran, setHargaPenawaran] = useState<number>(0);
  const [hargaKesepakatan, setHargaKesepakatan] = useState<number>(0);
  const [teamFo, setTeamFo] = useState<number>(0);
  const [teamJoiner, setTeamJoiner] = useState<number>(0);
  /** Lampiran Harga BAKH â€” tabel gaya Excel (Designator | Uraian | Negosiasi | Kesepakatan). */
  const [lampiranHargaRows, setLampiranHargaRows] = useState<LampiranHargaRow[]>([
    barisLampiranHargaKosong(),
  ]);
  const [lampiranHargaFile, setLampiranHargaFile] = useState('');
  const [lampiranHargaErr, setLampiranHargaErr] = useState<string | null>(null);
  const lampiranHargaInputRef = useRef<HTMLInputElement>(null);
  // Input manual Lampiran Harga via pencarian designator (tanpa harus tempel/unggah Excel).
  const [lampiranManual, setLampiranManual] = useState(false);
  const [lampiranManualDesignator, setLampiranManualDesignator] = useState('');
  const [lampiranManualVolume, setLampiranManualVolume] = useState<number>(0);
  const [gm, setGm] = useState('');
  const [pm, setPm] = useState('');
  const [mandor, setMandor] = useState('');
  const [projectAdmin, setProjectAdmin] = useState('');
  /** Alur proyek BAKH â€” jumlah hari tiap tahap (Î£ = jumlah hari kerja). */
  const [alurProyek, setAlurProyek] = useState<AlurProyek>({
    persiapan: 0,
    materialDelivery: 0,
    instalasi: 0,
    commissioningTest: 0,
    ujiTerima: 0,
  });

  // --- Isian rinci SPK (langkah c) ---
  const [noLeonita, setNoLeonita] = useState('');
  const [waspang, setWaspang] = useState('');
  const [noHp, setNoHp] = useState('');
  /** Lampiran BOQ SPK (tabel Designator / Material / Jasa / Vol). */
  const [boqSpk, setBoqSpk] = useState<BoqSpkRow[]>([
    { designator: '', material: 0, jasa: 0, vol: 0 },
  ]);
  /** Sumber data BOQ (nama file Excel / "Tempel dari Excel") untuk ditampilkan. */
  const [boqSumber, setBoqSumber] = useState('');
  const [boqErr, setBoqErr] = useState<string | null>(null);
  const boqInputRef = useRef<HTMLInputElement>(null);

  // --- Nomor berkas turunan ---
  const [nomorBAKH, setNomorBAKH] = useState('');
  const [nomorPP, setNomorPP] = useState(`PP/TEL/2026/04/${Math.floor(100 + Math.random() * 900)}`);
  const [nomorIF, setNomorIF] = useState(`IF-DISB-2604-${Math.floor(10 + Math.random() * 90)}`);

  // --- Pembayaran (langkah d) ---
  const [persentasePrelim, setPersentasePrelim] = useState<number>(15);
  const [nilaiPrelimPanjar, setNilaiPrelimPanjar] = useState<number>(37500000);
  /** Komponen rincian PP yang dipakai sebagai "Total Nilai" panjar (langkah 5) â€” boleh lebih dari satu. */
  const [komponenPanjar, setKomponenPanjar] = useState<KomponenTotal[]>(['prelim']);
  const [namaPenerimaPrelim, setNamaPenerimaPrelim] = useState('');
  const [bankPenerima, setBankPenerima] = useState('Bank Mandiri');
  const [nomorRekening, setNomorRekening] = useState('');
  const [npwpPenerima, setNpwpPenerima] = useState('');
  /** Alur penerima panjar (langkah 5): Prelim = input manual, Mandor = ambil dari database. */
  const [jenisPenerima, setJenisPenerima] = useState<'prelim' | 'mandor'>('prelim');

  // --- Isian PP (langkah c) â€” daftar field baru ---
  /** SAAT PENGGUNAAN â€” INPUT TANGGAL PENGGUNAAN PP. */
  const [tglPenggunaanPP, setTglPenggunaanPP] = useState('');
  /** Jenis disposisi: kosong / IHLD / NDE â€” menentukan nomor mana yang diisi. */
  const [jenisDisposisi, setJenisDisposisi] = useState<'' | 'IHLD' | 'NDE'>('');
  const [nomorIhld, setNomorIhld] = useState('');
  const [nomorNde, setNomorNde] = useState('');
  /** Rincian Total Nilai Pengajuan IF Project (TOTAL KESELURUHAN = Î£ ketujuh isian). */
  const [prelim, setPrelim] = useState<number>(0);
  const [lumpsum, setLumpsum] = useState<number>(0);
  const [termin1, setTermin1] = useState<number>(0);
  const [termin2, setTermin2] = useState<number>(0);
  const [termin3, setTermin3] = useState<number>(0);
  const [retensi, setRetensi] = useState<number>(0);
  const [materialStock, setMaterialStock] = useState<number>(0);
  /** TEKNISI â€” sumbernya belum ditentukan (dikosongkan dulu). */
  const [teknisi, setTeknisi] = useState('');

  // --- Tanggal turunan sesuai SOP ---
  const [tanggalMulaiKerja, setTanggalMulaiKerja] = useState(todayStr);
  const [tanggalBAKH, setTanggalBAKH] = useState(todayStr);
  const [tanggalPP, setTanggalPP] = useState(addDays(todayStr, 2));
  const [tanggalPengajuanPanjar, setTanggalPengajuanPanjar] = useState(addDays(todayStr, 2));
  const [tanggalImprestFund, setTanggalImprestFund] = useState(addDays(todayStr, 4));
  const [tanggalSelesaiKerja, setTanggalSelesaiKerja] = useState(addDays(todayStr, 30));

  // --- Wizard ---
  const [step, setStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<StepFieldErrors>({});
  const [uploadedFiles, setUploadedFiles] = useState<Partial<Record<DokumenKey, StoredFile>>>({});
  const [boqResult, setBoqResult] = useState<BoqParseResult | null>(null);
  // Isian Kurva S (diisi lewat popup, lihat KurvaSPlannerModal).
  const [kurvaSPlan, setKurvaSPlan] = useState<KurvaSPlan | null>(null);
  const [showKurvaPlanner, setShowKurvaPlanner] = useState(false);
  // Isian Rincian Kebutuhan BOP Cost Structure (diisi lewat popup, lihat BopCostModal).
  const [bopRows, setBopRows] = useState<BopCostRow[]>([]);
  const [showBopModal, setShowBopModal] = useState(false);
  const [nilaiPerintahRincian, setNilaiPerintahRincian] = useState(500_000);
  /** Nilai Perizinan (Preliminary) yang dapat dilakukan reimbursement â€” diisi di popup BOP Cost Structure. */
  const [nilaiPerizinan, setNilaiPerizinan] = useState(0);
  /** V. Manajemen Risiko â€” tingkat risiko proyek (diisi di popup BOP Cost Structure). */
  const [manajemenRisiko, setManajemenRisiko] = useState<LevelRisiko | ''>('');
  // Perkiraan Margin yang dilaksanakan (langkah Jadwal Pelaksanaan Proyek) â€” admin isi angka Penilaian saja.
  const [marginKemitraan, setMarginKemitraan] = useState<MarginAngka>(PERKIRAAN_MARGIN_AWAL);
  const [marginSwakelola, setMarginSwakelola] = useState<MarginAngka>(PERKIRAAN_MARGIN_AWAL);
  // --- Draft wizard: simpan / pulihkan input setengah jalan (tanpa mulai dari awal lagi) ---
  const DRAFT_KEY = 'prelim_draft_input_v1';
  const [draftTersedia, setDraftTersedia] = useState(false);

  const simpanDraft = () => {
    const d: Record<string, unknown> = {
      nomorSPK, namaPekerjaan, lokasiProyek, regional, picProyek, vendorPelaksana,
      nilaiPekerjaan, tanggalSPK, durasiKerjaHari,
      bakhNamaPekerjaan, bakhWitel, bakhPid, hargaPenawaran, hargaKesepakatan,
      teamFo, teamJoiner, lampiranHargaRows, lampiranHargaFile,
      gm, pm, mandor, projectAdmin, alurProyek,
      noLeonita, waspang, noHp, boqSpk, boqSumber,
      nomorBAKH, nomorPP, nomorIF,
      persentasePrelim, nilaiPrelimPanjar, komponenPanjar, namaPenerimaPrelim,
      bankPenerima, nomorRekening, npwpPenerima, jenisPenerima,
      tglPenggunaanPP, jenisDisposisi, nomorIhld, nomorNde,
      prelim, lumpsum, termin1, termin2, termin3, retensi, materialStock,
      teknisi, kurvaSPlan, bopRows, nilaiPerintahRincian, nilaiPerizinan, manajemenRisiko,
      marginKemitraan, marginSwakelola,
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
      // Simpan draft metadata untuk tampil di list antrian
      db.saveDraftMetadata(nomorSPK, namaPekerjaan);
    } catch {
      /* abaikan kegagalan penyimpanan draft */
    }
    setDraftTersedia(true);
  };

  /** Hapus draft dari penyimpanan lokal (memulai dari awal). */
  const hapusDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      // Hapus draft metadata dari list antrian
      db.deleteDraftMetadata(nomorSPK);
      setDraftTersedia(false);
    } catch {
      /* abaikan kegagalan hapus draft */
    }
  };

  const restoreDraft = (d: Record<string, unknown>) => {
    if (typeof d.nomorSPK === 'string') setNomorSPK(d.nomorSPK);
    if (typeof d.namaPekerjaan === 'string') setNamaPekerjaan(d.namaPekerjaan);
    if (typeof d.lokasiProyek === 'string') setLokasiProyek(d.lokasiProyek);
    if (typeof d.regional === 'string') setRegional(d.regional);
    if (typeof d.picProyek === 'string') setPicProyek(d.picProyek);
    if (typeof d.vendorPelaksana === 'string') setVendorPelaksana(d.vendorPelaksana);
    if (typeof d.nilaiPekerjaan === 'number') setNilaiPekerjaan(d.nilaiPekerjaan);
    if (typeof d.tanggalSPK === 'string') setTanggalSPK(d.tanggalSPK);
    if (typeof d.durasiKerjaHari === 'number') setDurasiKerjaHari(d.durasiKerjaHari);
    if (typeof d.bakhNamaPekerjaan === 'string') setBakhNamaPekerjaan(d.bakhNamaPekerjaan);
    if (typeof d.bakhWitel === 'string') setBakhWitel(d.bakhWitel);
    if (typeof d.bakhPid === 'string') setBakhPid(d.bakhPid);
    if (typeof d.hargaPenawaran === 'number') setHargaPenawaran(d.hargaPenawaran);
    if (typeof d.hargaKesepakatan === 'number') setHargaKesepakatan(d.hargaKesepakatan);
    if (typeof d.teamFo === 'number') setTeamFo(d.teamFo);
    if (typeof d.teamJoiner === 'number') setTeamJoiner(d.teamJoiner);
    if (Array.isArray(d.lampiranHargaRows)) setLampiranHargaRows(d.lampiranHargaRows as LampiranHargaRow[]);
    if (typeof d.lampiranHargaFile === 'string') setLampiranHargaFile(d.lampiranHargaFile);
    if (typeof d.gm === 'string') setGm(d.gm);
    if (typeof d.pm === 'string') setPm(d.pm);
    if (typeof d.mandor === 'string') setMandor(d.mandor);
    if (typeof d.projectAdmin === 'string') setProjectAdmin(d.projectAdmin);
    if (d.alurProyek && typeof d.alurProyek === 'object') setAlurProyek(d.alurProyek as AlurProyek);
    if (typeof d.noLeonita === 'string') setNoLeonita(d.noLeonita);
    if (typeof d.waspang === 'string') setWaspang(d.waspang);
    if (typeof d.noHp === 'string') setNoHp(d.noHp);
    if (Array.isArray(d.boqSpk)) setBoqSpk(d.boqSpk as BoqSpkRow[]);
    if (typeof d.boqSumber === 'string') setBoqSumber(d.boqSumber);
    if (typeof d.nomorBAKH === 'string') setNomorBAKH(d.nomorBAKH);
    if (typeof d.nomorPP === 'string') setNomorPP(d.nomorPP);
    if (typeof d.nomorIF === 'string') setNomorIF(d.nomorIF);
    if (typeof d.persentasePrelim === 'number') setPersentasePrelim(d.persentasePrelim);
    if (typeof d.nilaiPrelimPanjar === 'number') setNilaiPrelimPanjar(d.nilaiPrelimPanjar);
    if (Array.isArray(d.komponenPanjar)) setKomponenPanjar(d.komponenPanjar as KomponenTotal[]);
    if (typeof d.namaPenerimaPrelim === 'string') setNamaPenerimaPrelim(d.namaPenerimaPrelim);
    if (typeof d.bankPenerima === 'string') setBankPenerima(d.bankPenerima);
    if (typeof d.nomorRekening === 'string') setNomorRekening(d.nomorRekening);
    if (typeof d.npwpPenerima === 'string') setNpwpPenerima(d.npwpPenerima);
    if (typeof d.jenisPenerima === 'string') setJenisPenerima(d.jenisPenerima as 'prelim' | 'mandor');
    if (typeof d.tglPenggunaanPP === 'string') setTglPenggunaanPP(d.tglPenggunaanPP);
    if (typeof d.jenisDisposisi === 'string') setJenisDisposisi(d.jenisDisposisi as '' | 'IHLD' | 'NDE');
    if (typeof d.nomorIhld === 'string') setNomorIhld(d.nomorIhld);
    if (typeof d.nomorNde === 'string') setNomorNde(d.nomorNde);
    if (typeof d.prelim === 'number') setPrelim(d.prelim);
    if (typeof d.lumpsum === 'number') setLumpsum(d.lumpsum);
    if (typeof d.termin1 === 'number') setTermin1(d.termin1);
    if (typeof d.termin2 === 'number') setTermin2(d.termin2);
    if (typeof d.termin3 === 'number') setTermin3(d.termin3);
    if (typeof d.retensi === 'number') setRetensi(d.retensi);
    if (typeof d.materialStock === 'number') setMaterialStock(d.materialStock);
    if (typeof d.teknisi === 'string') setTeknisi(d.teknisi);
    if (d.kurvaSPlan && typeof d.kurvaSPlan === 'object') setKurvaSPlan(d.kurvaSPlan as KurvaSPlan);
    if (Array.isArray(d.bopRows)) setBopRows(d.bopRows as BopCostRow[]);
    if (typeof d.nilaiPerintahRincian === 'number') setNilaiPerintahRincian(d.nilaiPerintahRincian);
    if (typeof d.nilaiPerizinan === 'number') setNilaiPerizinan(d.nilaiPerizinan);
    if (typeof d.manajemenRisiko === 'string') setManajemenRisiko((d.manajemenRisiko as LevelRisiko) || '');
    if (d.marginKemitraan && typeof d.marginKemitraan === 'object') setMarginKemitraan(d.marginKemitraan as MarginAngka);
    if (d.marginSwakelola && typeof d.marginSwakelola === 'object') setMarginSwakelola(d.marginSwakelola as MarginAngka);
  };

  // Pulihkan draft bila ada (saat mulai input baru / refresh).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d && typeof d === 'object') restoreDraft(d);
      setDraftTersedia(true);
    } catch {
      /* abaikan kegagalan membaca draft */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const topRef = useRef<HTMLDivElement>(null);
  /** Draft pengajuan untuk pratinjau review (langkah 6) â€” belum disimpan. */
  const [reviewSub, setReviewSub] = useState<ProjectSubmission | null>(null);

  /**
   * Kalkulasi tanggal SOP. Tgl Surat BAKH adalah jangkar:
   * Mulai Kerja = BAKH + 1 hari (H+1), PP = BAKH + 2, dst.
   * Rentang & durasi kerja akan di-override oleh efek Kurva S bila sudah diisi.
   */
  useEffect(() => {
    setTanggalSPK(tanggalBAKH);
    const mulaiKerja = addDays(tanggalBAKH, 1);
    setTanggalMulaiKerja(mulaiKerja);
    setTanggalSelesaiKerja(addDays(mulaiKerja, durasiKerjaHari));

    const calculatedPP = addDays(tanggalBAKH, 2);
    setTanggalPP(calculatedPP);
    setTanggalPengajuanPanjar(calculatedPP);
    setTanggalImprestFund(addDays(calculatedPP, 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tanggalBAKH]);

  /** Nomor BAKH turunan dari Nomor SPK (bila belum diisi manual). */
  useEffect(() => {
    setNomorBAKH(prev =>
      !prev || prev.startsWith('BAKH/') ? `BAKH/${nomorSPK.replace('SPK/', '')}` : prev
    );
  }, [nomorSPK]);

  /** Nama Pekerjaan / Proyek (SPK & dokumen) selalu = Nama Lokasi di BAKH. */
  useEffect(() => {
    setNamaPekerjaan(lokasiProyek);
  }, [lokasiProyek]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [step]);

  const handleNilaiPekerjaanChange = (val: number) => {
    setNilaiPekerjaan(val);
    setNilaiPrelimPanjar(Math.round((val * persentasePrelim) / 100));
  };

  const handlePersentaseChange = (pct: number) => {
    setPersentasePrelim(pct);
    setNilaiPrelimPanjar(Math.round((nilaiPekerjaan * pct) / 100));
  };

  const handlePanjarValueChange = (val: number) => {
    setNilaiPrelimPanjar(val);
    if (nilaiPekerjaan > 0) {
      setPersentasePrelim(Number(((val / nilaiPekerjaan) * 100).toFixed(2)));
    }
  };

  const setFile = (key: DokumenKey, file: File | null) => {
    if (!file) {
      setUploadedFiles(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    setUploadedFiles(prev => ({
      ...prev,
      [key]: { name: file.name, size: `${Math.max(1, Math.round(file.size / 1024))} KB` },
    }));
  };

  /** Rentang hari Kurva S -> durasi kerja otomatis (dipakai validasi & efek durasi). */
  const rentangKurva = rentangKurvaSDariPlan(kurvaSPlan);

  /**
   * Validasi satu langkah -> pesan per field (key = id input di langkah ini).
   * Key '_form' dipakai untuk pesan lintas-langkah (tampil sebagai alert atas).
   */
  const errorsOfStep = (d: BerkasDef): StepFieldErrors => {
    const e: StepFieldErrors = {};
    switch (d.key) {
      case 'bakh':
        if (!nomorBAKH.trim()) e['f-bakh'] = 'Nomor BAKH wajib diisi.';
        if (!bakhNamaPekerjaan.trim()) e['f-bakh-nama'] = 'Pilih tematis.';
        if (!lokasiProyek.trim()) e['f-bakh-lokasi'] = 'Lokasi wajib diisi.';
        if (!bakhWitel.trim()) e['f-witel'] = 'Witel wajib diisi.';
        if (!bakhPid.trim()) e['f-pid'] = 'PID SAP wajib diisi.';
        if (!tanggalBAKH) e['f-tgl-bakh'] = 'Tanggal surat wajib diisi.';
        if (hargaPenawaran <= 0) e['f-harga-penawaran'] = 'Harga penawaran harus lebih dari 0.';
        if (hargaKesepakatan <= 0) e['f-harga-kesepakatan'] = 'Harga kesepakatan harus lebih dari 0.';
        if (teamFo + teamJoiner <= 0) {
          e['f-team-fo'] = `Isi jumlah team (1 team FO = ${ORANG_PER_TEAM_FO} orang).`;
          e['f-team-joiner'] = `Isi jumlah team (1 team Jointer = ${ORANG_PER_TEAM_JOINTER} orang).`;
        }
        const barisHarga = lampiranHargaRows.filter(lampiranHargaTerisi);
        if (
          barisHarga.some(
            r =>
              !r.designator.trim() ||
              (totalKesepakatanBaris(r) <= 0 && totalNegosiasiBaris(r) <= 0)
          )
        ) {
          e['f-lampiran-harga'] =
            'Lampiran Harga: setiap baris butuh Designator dan minimal satu nilai Negosiasi/Kesepakatan (hapus baris yang kosong).';
        }
        if (!gm) e['f-gm'] = 'Pilih GM penyetuju.';
        if (!pm) e['f-pm'] = 'Pilih PM pelaksana.';
        if (!mandor) e['f-mandor'] = 'Pilih Mandor pelaksana.';
        if (!projectAdmin) e['f-project-admin'] = 'Pilih Project Admin.';
        {
          // Alur Proyek terkunci â€” hanya terisi otomatis dari Kurva S,
          // jadi divalidasi hanya bila Kurva S sudah menghasilkan isian.
          if (kurvaSPlan?.entries.length || kurvaSPlan?.progres.some(p => p.tanggal)) {
            const totalAlur = hitungTotalAlur(alurProyek);
            if (totalAlur <= 0) {
              e['f-alur-persiapan'] =
                'Alur Proyek belum terbentuk dari Kurva S â€” pastikan tiap progres punya tanggal dan namanya mengandung Persiapan / Material / Instalasi / Commissioning / Uji Terima.';
            } else if (totalAlur !== durasiKerjaHari) {
              e['f-alur-persiapan'] =
                `Jumlah hari alur proyek (${totalAlur} hari) harus sama dengan ` +
                `jumlah hari kerja (${durasiKerjaHari} hari) â€” perbaiki rentang tanggal pada Kurva S.`;
            }
          }
        }
        // Isian Kurva S kini berada di langkah BAKH (di bawah Lampiran Harga).
        if (durasiKerjaHari < 1) {
          e['f-durasi-kurva'] = rentangKurva
            ? `Durasi hasil Kurva S hanya ${durasiKerjaHari} hari â€” periksa tanggal progres pada Kurva S.`
            : 'Durasi kerja minimal 1 hari (langkah SPK).';
        }
        if (!kurvaSPlan || kurvaSPlan.entries.length === 0) {
          e['_form'] =
            'Isi data Kurva S lewat tombol "Isi Data Kurva S": tanggal mulai kerja mandor, tanggal tiap progres, item & qty.';
        } else if (!kurvaSPlan.tanggalMulaiMandor) {
          e['_form'] = 'Tanggal Mulai Kerja Mandor belum diisi.';
        } else {
          const belum = kurvaSPlan.progres.filter(
            p => !p.tanggal && kurvaSPlan.entries.some(en => en.progressId === p.id)
          );
          if (belum.length) {
            e['_form'] = `Progres ini belum punya tanggal: ${belum
              .map(p => p.nama || '(tanpa nama)')
              .join(', ')}.`;
          }
        }
        break;
      case 'spk':
        if (!namaPekerjaan.trim())
          e['_form'] = 'Isi Nama Lokasi pada langkah BAKH terlebih dahulu.';
        if (!noLeonita.trim()) e['f-no-leonita'] = 'Nomor Leonita wajib diisi.';
        if (!tanggalMulaiKerja) e['f-tgl-mulai'] = 'Tanggal mulai kerja wajib diisi.';
        else if (!tanggalSelesaiKerja) {
          e['f-rentang-spk'] = 'Tanggal selesai kerja belum diisi â€” atur rentang di langkah BAKH.';
        }
        if (!waspang) e['f-waspang'] = 'Pilih Waspang pelaksana.';
        if (!bakhWitel.trim()) e['_form'] = 'Witel belum diisi pada langkah BAKH.';
        if (nilaiPekerjaan <= 0) e['f-nilai'] = 'Nilai total pekerjaan harus lebih dari 0.';
        break;
      case 'pp': {
        if (!lokasiProyek.trim())
          e['f-pp-nama-kegiatan'] = 'Isi Lokasi (Nama Kegiatan) pada langkah BAKH terlebih dahulu.';
        if (!bakhPid.trim()) e['f-pp-pid'] = 'Isi PID (Id Project) pada langkah BAKH terlebih dahulu.';
        if (!pm) e['f-pp-pm'] = 'Pilih PM pada langkah BAKH terlebih dahulu.';
        if (!projectAdmin) e['f-pp-admin'] = 'Pilih Project Admin pada langkah BAKH terlebih dahulu.';
        if (!mandor) e['f-pp-mandor'] = 'Pilih Mandor pada langkah BAKH terlebih dahulu.';
        if (!waspang) e['f-pp-waspang'] = 'Pilih Waspang pada langkah SPK terlebih dahulu.';
        if (!tglPenggunaanPP) e['f-pp-tgl-pakai'] = 'Tanggal Penggunaan PP wajib diisi.';
        if (!jenisDisposisi) e['f-pp-jenis'] = 'Pilih IHLD atau NDE.';
        else if (jenisDisposisi === 'IHLD' && !nomorIhld.trim())
          e['f-pp-nomor'] = 'Nomor IHLD wajib diisi.';
        else if (jenisDisposisi === 'NDE' && !nomorNde.trim())
          e['f-pp-nomor'] = 'Nomor NDE wajib diisi.';
        const totalIf = prelim + termin1 + termin2 + termin3 + retensi + materialStock + lumpsum;
        if (totalIf <= 0)
          e['f-pp-total-if'] =
            'Total Nilai Pengajuan IF masih 0 â€” isi Prelim, Termin 1/2/3, Retensi, Material Non Stock & Lumpsum.';
        break;
      }
      case 'pengajuanPanjar':
        if (nilaiPrelimPanjar <= 0)
          e['_form'] =
            'Total Nilai panjar masih 0 â€” pilih komponen yang sudah diisi pada Rincian langkah PP.';
        if (!uploadedFiles.lampiranDasarPekerjaan)
          e['f-panjar-upload'] = 'Unggah Lampiran Dasar Pekerjaan terlebih dahulu.';
        if (jenisPenerima === 'prelim') {
          if (!namaPenerimaPrelim.trim()) e['f-panjar-nama'] = 'Isi Nama Penerima (Prelim).';
          if (!nomorRekening.trim()) e['f-panjar-rek'] = 'Isi Nomor Rekening Penerima.';
          if (!uploadedFiles.ktp)
            e['f-panjar-ktp'] = 'Unggah foto KTP penerima.';
          if (!uploadedFiles.npwp)
            e['f-panjar-npwp'] = 'Unggah foto NPWP penerima.';
          if (!uploadedFiles.bukuRekening)
            e['f-panjar-buku'] = 'Unggah buku tabungan penerima.';
        } else if (!mandor) {
          e['f-panjar-mandor'] = 'Pilih Mandor pada langkah BAKH terlebih dahulu.';
        }
        break;
      case 'imprestFund':
        if (!nomorIF.trim()) e['f-if'] = 'Nomor disposisi Imprest Fund wajib diisi.';
        break;
      case 'kurvaS':
        break;
      case 'boqDrm':
      case 'lampiranDasarPekerjaan':
      case 'ktp':
      case 'npwp':
      case 'bukuRekening':
      case 'spb':
        if (!uploadedFiles[d.key]) e['_form'] = `Unggah ${d.short} terlebih dahulu.`;
        break;
      default:
        break;
    }
    return e;
  };

  /** null = lolos. */
  const validateStep = (d: BerkasDef): string | null => {
    const errs = errorsOfStep(d);
    return Object.values(errs)[0] ?? null;
  };

  const isDone = (d: BerkasDef) => validateStep(d) === null;

  const statusOf = (d: BerkasDef): BerkasStatus => {
    if (validateStep(d) === null) return 'done';
    return d.deferred ? 'deferred' : 'ready';
  };

  const totalLengkap = BERKAS_PRELIM_WIZARD.filter(isDone).length;

  /** Index langkah virtual terakhir: review dokumen sebelum disimpan. */
  const REVIEW_IDX = BERKAS_PRELIM_WIZARD.length;
  const semuanyaLengkap = totalLengkap === BERKAS_PRELIM_WIZARD.length;

  /** Daftar langkah rail = 5 langkah isian + 1 langkah Review Dokumen. */
  const RAIL_STEPS: RailStep[] = [
    ...BERKAS_PRELIM_WIZARD.map(b => ({
      step: b.step,
      short: b.wizardShort ?? b.short,
      label: b.wizardLabel ?? b.label,
    })),
    {
      step: BERKAS_PRELIM_WIZARD.length + 1,
      short: 'Review Dokumen',
      label: 'Review Dokumen & Simpan',
    },
  ];

  const isRailDone = (idx: number) =>
    idx === REVIEW_IDX ? semuanyaLengkap : isDone(BERKAS_PRELIM_WIZARD[idx]);

  const isReviewStep = step === REVIEW_IDX;
  const def = isReviewStep ? null : BERKAS_PRELIM_WIZARD[step];

  const goto = (idx: number) => {
    setErrorMsg(null);
    setStepErrors({});
    setStep(Math.min(Math.max(idx, 0), RAIL_STEPS.length - 1));
  };

  /** Tampilkan seluruh pesan validasi langkah (inline + alert atas). */
  const showErrors = (errs: StepFieldErrors) => {
    setStepErrors(errs);
    setErrorMsg(Object.values(errs)[0] ?? null);
  };

  /** Bersihkan error satu field begitu pengguna mengetik lagi. */
  const clearFieldError = (id: string) => {
    if (stepErrors[id]) setErrorMsg(null);
    setStepErrors(prev => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const textChange = (id: string, set: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      clearFieldError(id);
      set(e.target.value);
    };

  const numChange = (id: string, set: (v: number) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      clearFieldError(id);
      set(Number(e.target.value));
    };

  /** Handler untuk SearchSelectField (dropdown dengan pencarian). */
  const pick = (id: string, set: (v: string) => void) => (value: string) => {
    clearFieldError(id);
    set(value);
  };

  // --- Rentang durasi kerja (DARI -> SAMPAI) ---
  /** Tanggal mulai berubah -> durasi tetap, selesai ikut bergeser. */
  const ubahMulai = (v: string) => {
    if (!v) return;
    setTanggalMulaiKerja(v);
    setTanggalSelesaiKerja(addDays(v, durasiKerjaHari));
  };

  /** Durasi (hari) berubah -> selesai dihitung ulang dari tanggal mulai. */
  const ubahDurasi = (v: number) => {
    setDurasiKerjaHari(v);
    if (tanggalMulaiKerja) setTanggalSelesaiKerja(addDays(tanggalMulaiKerja, v));
  };

  /** Pilih Waspang -> NOHP terisi otomatis dari data master. */
  const pilihWaspang = (nama: string) => {
    clearFieldError('f-waspang');
    setWaspang(nama);
    setNoHp(cariOrang(WASPANG_LIST, nama)?.noHp ?? '');
  };

  // --- Lampiran BOQ SPK ---
  const hitungBaris = (r: BoqSpkRow) => {
    const jumlahMaterial = r.material * r.vol;
    const jumlahJasa = r.jasa * r.vol;
    return { jumlahMaterial, jumlahJasa, total: jumlahMaterial + jumlahJasa };
  };

  const totalMaterialBoq = boqSpk.reduce((s, r) => s + hitungBaris(r).jumlahMaterial, 0);
  const totalJasaBoq = boqSpk.reduce((s, r) => s + hitungBaris(r).jumlahJasa, 0);
  const nilaiTotalBoq = totalMaterialBoq + totalJasaBoq;
  const boqTerisi = boqSpk.some(r => r.designator.trim() && (r.material > 0 || r.jasa > 0) && r.vol > 0);

  const setBarisBoq = (rows: BoqSpkRow[]) => {
    setBoqSpk(rows.length ? rows : [{ designator: '', material: 0, jasa: 0, vol: 0 }]);
    setBoqErr(null);
    clearFieldError('_form');
  };

  const hapusBarisBoq = (idx: number) =>
    setBoqSpk(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  /** Tempel (Ctrl+V) salinan sel BOQ dari Excel â€” kolom dipisah Tab. */
  const tempelBoq = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const teks = e.clipboardData.getData('text/plain');
    if (!teks.trim()) return;
    e.preventDefault();
    try {
      const grid = teks
        .split(/\r?\n/)
        .map(l => l.split('\t'))
        .filter(sel => sel.some(c => c.trim() !== ''));
      setBarisBoq(parseBoqGrid(grid));
      setBoqSumber('Tempel dari Excel');
    } catch (err) {
      setBoqErr(err instanceof Error ? err.message : 'Gagal membaca data yang ditempel.');
    }
  };

  /** Unggah file Excel BOQ SPK (.xlsx / .xls / .csv). */
  const uploadBoqSpk = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setBarisBoq(await parseBoqSpkWorkbook(file));
      setBoqSumber(file.name);
    } catch (err) {
      setBoqErr(err instanceof Error ? err.message : 'Gagal membaca file Excel BOQ.');
    }
  };

  // --- Lampiran Harga BAKH (langsung salin dari Excel / unggah file) ---
  // Seluruh total memperhitungkan Volume setiap baris.
  const totalTelkomAksesLampiran = lampiranHargaRows.reduce(
    (s, r) => s + ((Number(r.telkomMaterial) || 0) + (Number(r.telkomJasa) || 0)) * (Number(r.volume) || 0),
    0
  );
  const totalMandorLampiran = lampiranHargaRows.reduce(
    (s, r) => s + ((Number(r.mandorMaterial) || 0) + (Number(r.mandorJasa) || 0)) * (Number(r.volume) || 0),
    0
  );
  const totalHargaLampiran = lampiranHargaRows.reduce(
    (s, r) => s + totalKesepakatanBaris(r) * (Number(r.volume) || 0),
    0
  );
  const totalNegosiasiLampiran = totalTelkomAksesLampiran + totalMandorLampiran;
  const setBarisHarga = (rows: LampiranHargaRow[]) => {
    setLampiranHargaRows(rows.length ? rows : [barisLampiranHargaKosong()]);
    setLampiranHargaErr(null);
    clearFieldError('f-lampiran-harga');
  };

  const hapusBarisHarga = (idx: number) =>
    setLampiranHargaRows(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  /** Tempel (Ctrl+V) salinan sel dari Excel â€” kolom dipisah Tab. */
  const tempelLampiranHarga = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const teks = e.clipboardData.getData('text/plain');
    if (!teks.trim()) return;
    e.preventDefault();
    try {
      setBarisHarga(parseLampiranGrid(parseTsvGrid(teks)));
      setLampiranHargaFile('Tempel dari Excel');
    } catch (err) {
      setLampiranHargaErr(
        err instanceof Error ? err.message : 'Gagal membaca data yang ditempel.'
      );
    }
  };

  /** Unggah file Excel Lampiran Harga (.xlsx / .xls / .csv). */
  const uploadLampiranHarga = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setBarisHarga(await parseLampiranHargaWorkbook(file));
      setLampiranHargaFile(file.name);
    } catch (err) {
      setLampiranHargaErr(
        err instanceof Error ? err.message : 'Gagal membaca file Excel Lampiran Harga.'
      );
    }
  };

  /** Tambah baris Lampiran Harga manual via pencarian designator. */
  const tambahBarisManualLampiranHarga = () => {
    const designator = lampiranManualDesignator.trim().toUpperCase();
    if (!designator) {
      setLampiranHargaErr('Pilih designator untuk baris Lampiran Harga manual.');
      return;
    }

    // Cari di RAB TA & MANDOR terlebih dahulu
    const itemTA = cariRabTA(designator);
    const itemMandor = cariRabMandor(designator);
    const item = itemTA || itemMandor;

    if (!item) {
      setLampiranHargaErr('Designator tidak ditemukan di master RAB TA maupun RAB MANDOR.');
      return;
    }

    const row: LampiranHargaRow = {
      ...barisLampiranHargaKosong(),
      designator,
      uraian: item.uraian,
      sat: item.sat,
      telkomMaterial: itemTA?.material || 0,
      telkomJasa: itemTA?.jasa || 0,
      mandorMaterial: itemMandor?.material || 0,
      mandorJasa: itemMandor?.jasa || 0,
      // Kesepakatan diisi manual oleh user setelah Designator dipilih.
      ksepMaterial: 0,
      ksepJasa: 0,
      volume: lampiranManualVolume,
    };
    setBarisHarga([
      ...lampiranHargaRows.filter(r => r.designator.trim().toLowerCase() !== designator.toLowerCase()),
      row,
    ]);
    setLampiranManualDesignator('');
    setLampiranManualVolume(0);
    setLampiranHargaErr(null);
  };

  /** Auto-populate Uraian, Sat, & harga dari RAB TA & MANDOR ketika Designator diinput di tabel. */
  const autoPopulateDariRAB = (row: LampiranHargaRow, designator: string): LampiranHargaRow => {
    const upper = designator.trim().toUpperCase();
    const itemTA = cariRabTA(upper);
    const itemMandor = cariRabMandor(upper);
    const item = itemTA || itemMandor;

    if (!item) {
      return { ...row, designator: upper };
    }

    // Kesepakatan default = Negosiasi Telkom Akses (Material + Jasa)
    return {
      ...row,
      designator: upper,
      uraian: item.uraian,
      sat: item.sat,
      telkomMaterial: itemTA?.material || 0,
      telkomJasa: itemTA?.jasa || 0,
      mandorMaterial: itemMandor?.material || 0,
      mandorJasa: itemMandor?.jasa || 0,
      // Kolom Kesepakatan sengaja tidak disalin dari RAB: diisi manual oleh user.
      ksepMaterial: 0,
      ksepJasa: 0,
      volume: row.volume || 0,
    };
  };

  // NILAI TOTAL SPK = Nilai Jasa + Nilai Material (ikut berubah saat BOQ diubah).
  useEffect(() => {
    if (nilaiTotalBoq > 0) {
      setNilaiPekerjaan(nilaiTotalBoq);
    }
    // Material Non Stock: TIDAK diinput manual â€” terisi otomatis dari baris Lampiran
    // BOQ SPK yang memuat material (total = Î£ Volume x Harga Satuan per baris).
    const totalNonStock = boqSpk
      .filter(r => r.material > 0)
      .reduce((s, r) => s + r.vol * r.jasa, 0);
    if (totalNonStock > 0) {
      setMaterialStock(totalNonStock);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boqSpk]);

  /** Nilai panjar (langkah 5) = jumlah komponen "Total Nilai" yang dipilih dari rincian PP. */
  useEffect(() => {
    const peta: Record<KomponenTotal, number> = {
      prelim,
      termin1,
      termin2,
      termin3,
      retensi,
      materialStock,
      lumpsum,
    };
    setNilaiPrelimPanjar(komponenPanjar.reduce((s, k) => s + (peta[k] ?? 0), 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [komponenPanjar, prelim, termin1, termin2, termin3, retensi, materialStock, lumpsum]);

  const handleLanjut = () => {
    if (!def) return;
    const errs = errorsOfStep(def);
    if (Object.keys(errs).length) {
      showErrors(errs);
      return;
    }
    goto(step + 1);
  };

  /** Validasi seluruh langkah input; lompat ke langkah pertama yang belum lengkap. */
  const validasiSemuaLangkah = (): boolean => {
    for (let i = 0; i < BERKAS_PRELIM_WIZARD.length; i++) {
      const errs = errorsOfStep(BERKAS_PRELIM_WIZARD[i]);
      if (Object.keys(errs).length) {
        setStep(i);
        showErrors(errs);
        return false;
      }
    }
    setErrorMsg(null);
    setStepErrors({});
    return true;
  };

  /** Susun objek pengajuan dari seluruh isian (tanpa menyimpan ke database). */
  const buildPayload = (): Omit<
    ProjectSubmission,
    'id' | 'createdAt' | 'updatedAt' | 'amandemenCount' | 'isLockedForPrint'
  > => {
    const kurva =
      kurvaSPlan && kurvaSPlan.entries.length
        ? generateKurvaSDariPlan(kurvaSPlan, durasiKerjaHari, tanggalMulaiKerja)
        : generateKurvaS(durasiKerjaHari, nilaiPekerjaan);
    const file = (k: DokumenKey) => uploadedFiles[k];
    const barisUpload = (
      key: DokumenKey,
      id: string,
      name: string,
      tanggal: string
    ): ProjectSubmission['dokumen'][DokumenKey] => {
      const f = file(key);
      return {
        id,
        name,
        required: true,
        status: f ? 'VERIFIED' : 'PENDING',
        ...(f ? { fileName: f.name, fileSize: f.size, uploadedAt: tanggal } : {}),
      };
    };

    const bakhDetail: BakhDetail = {
      namaPekerjaan: bakhNamaPekerjaan,
      lokasi: lokasiProyek,
      witel: bakhWitel,
      pid: bakhPid,
      tglSurat: tanggalBAKH,
      hargaPenawaran,
      hargaKesepakatan,
      teamFo,
      teamJoiner,
      durasiPekerjaan: durasiKerjaHari,
      lampiranHarga: lampiranHargaRows.filter(lampiranHargaTerisi),
      ...(lampiranHargaFile ? { lampiranHargaFile } : {}),
      gm,
      pm,
      mandor,
      projectAdmin,
      alurProyek,
      durasiDari: tanggalMulaiKerja,
      durasiSampai: tanggalSelesaiKerja,
    };

    const spkDetail: SpkDetail = {
      noLeonita,
      tglSurat: tanggalBAKH,
      witel: bakhWitel,
      mandor,
      lokasi: lokasiProyek,
      waspang,
      noHp,
      tglMulaiKerja: tanggalMulaiKerja,
      tglSelesaiKerja: tanggalSelesaiKerja,
      nilaiJasa: totalJasaBoq,
      nilaiMaterial: totalMaterialBoq,
      nilaiTotal: nilaiTotalBoq,
    };

    const ppDetail: PpDetail = {
      namaKegiatan: lokasiProyek,
      idProject: bakhPid,
      totalProjectBoq: nilaiTotalBoq,
      tglPenggunaan: tglPenggunaanPP,
      jenisDisposisi: jenisDisposisi || 'IHLD',
      nomorDisposisi: jenisDisposisi === 'NDE' ? nomorNde : nomorIhld,
      termin1,
      termin2,
      termin3,
      prelim,
      retensi,
      materialStock,
      lumpsum,
      totalPengajuanIF:
        prelim + termin1 + termin2 + termin3 + retensi + materialStock + lumpsum,
      pm,
      waspang,
      projectAdmin,
      teknisi,
      mandor,
    };

    const newSubmission: Omit<
      ProjectSubmission,
      'id' | 'createdAt' | 'updatedAt' | 'amandemenCount' | 'isLockedForPrint'
    > = {
      nomorSPK,
      nomorPP,
      nomorBAKH,
      nomorIF,
      namaPekerjaan,
      lokasiProyek: lokasiProyek || 'Lokasi Site Lapangan',
      regional,
      picProyek: picProyek || 'Admin Proyek',
      vendorPelaksana,
      namaPenerimaPrelim: jenisPenerima === 'mandor' ? mandor : namaPenerimaPrelim,
      bankPenerima:
        jenisPenerima === 'mandor'
          ? 'Sesuai data mandor (database)'
          : `${bankPenerima} (${nomorRekening})`,
      nomorRekening: jenisPenerima === 'mandor' ? '' : nomorRekening,
      npwpPenerima:
        jenisPenerima === 'mandor' ? '' : npwpPenerima || '00.000.000.0-000.000',
      jenisPenerima,
      bakhDetail,
      spkDetail,
      ppDetail,
      boqSpk,
      bopCost: bopRows,
      nilaiPerintahRincian,
      nilaiPerizinan,
      manajemenRisiko,
      marginEstimate: { kemitraan: marginKemitraan, swakelola: marginSwakelola },
      nilaiPekerjaan,
      nilaiPrelimPanjar,
      persentasePrelim,
      tanggalSPK,
      tanggalBAKH,
      tanggalMulaiKerja,
      durasiKerjaHari,
      tanggalSelesaiKerja,
      tanggalPP,
      tanggalPengajuanPanjar,
      tanggalImprestFund,
      kurvaSData: kurva,
      ...(kurvaSPlan ? { kurvaSPlan } : {}),
      dokumen: {
        bakh: {
          id: 'd-1', name: 'BAKH (Berita Acara Kesepakatan Harga)', required: true,
          status: 'VERIFIED', fileName: `${nomorBAKH.replace(/\//g, '_')}.pdf`,
          fileSize: '1.1 MB', uploadedAt: tanggalBAKH,
        },
        lampiranKesepakatanHarga: {
          id: 'd-2', name: 'Lampiran Kesepakatan Harga', required: true,
          status: 'VERIFIED', fileName: `Lampiran_Harga_${nomorSPK.slice(-4)}.pdf`,
          fileSize: '850 KB', uploadedAt: tanggalBAKH,
        },
        spk: {
          id: 'd-3', name: 'Surat Perintah Kerja (SPK)', required: true,
          status: 'VERIFIED', fileName: `${nomorSPK.replace(/\//g, '_')}.pdf`,
          fileSize: '2.0 MB', uploadedAt: tanggalSPK,
        },
        pp: {
          id: 'd-4', name: 'Permintaan Pembayaran (PP)', required: true,
          status: 'VERIFIED', fileName: `${nomorPP.replace(/\//g, '_')}.pdf`,
          fileSize: '1.4 MB', uploadedAt: tanggalPP,
        },
        boqDrm: barisUpload(
          'boqDrm', 'd-5', 'BOQ DRM (Design Review Meeting)', tanggalSPK
        ),
        lampiranDasarPekerjaan: barisUpload(
          'lampiranDasarPekerjaan', 'd-6', 'Lampiran Dasar Pekerjaan / Justifikasi', tanggalSPK
        ),
        pengajuanPanjar: {
          id: 'd-7', name: 'Pengajuan Panjar Operasional', required: true,
          status: 'VERIFIED', fileName: `Form_Panjar_${nomorPP.slice(-4)}.pdf`,
          fileSize: '780 KB', uploadedAt: tanggalPengajuanPanjar,
        },
        imprestFund: {
          id: 'd-8', name: 'Lembar Disposisi Imprest Fund (IF)', required: true,
          status: 'VERIFIED', fileName: `${nomorIF}.pdf`,
          fileSize: '920 KB', uploadedAt: tanggalImprestFund,
        },
        kurvaS: {
          id: 'd-13', name: 'Grafik Kurva S (GRAVIK CURVA S)', required: true,
          status: 'VERIFIED', fileName: `Gravik_CurvaS_${nomorSPK.slice(-4)}.pdf`,
          fileSize: '640 KB', uploadedAt: tanggalSPK,
        },
        ktp: barisUpload('ktp', 'd-9', 'Lampiran KTP Penerima Panjar', tanggalSPK),
        npwp: barisUpload('npwp', 'd-9b', 'Lampiran NPWP Penerima Panjar', tanggalSPK),
        bukuRekening: barisUpload(
          'bukuRekening', 'd-9c',
          'Lampiran Buku Tabungan Penerima', tanggalSPK
        ),
        evidenSerahTerimaPrelim: barisUpload(
          'evidenSerahTerimaPrelim', 'd-10',
          'Evidence Serah Terima Prelim (Berita Acara/Tanda Terima Fisik)', tanggalSPK
        ),
        buktiTransferTA: barisUpload(
          'buktiTransferTA', 'd-11',
          'Lampiran Bukti Transfer dari TA ke Penerima Prelim', tanggalSPK
        ),
        spb: barisUpload('spb', 'd-12', 'Surat Perintah Bayar (SPB)', tanggalPP),
      },
      status: 'MENUNGGU_EVIDEN',
    };

    return newSubmission;
  };

  const handleSimpan = () => {
    if (!validasiSemuaLangkah()) return;
    onSubmitSuccess(buildPayload() as ProjectSubmission);
    // Pengajuan resmi sudah tersimpan — hapus draft setengah jalan.
    try {
      localStorage.removeItem(DRAFT_KEY);
      // Metadata draft juga dihapus dari list antrian.
      db.deleteDraftMetadata(nomorSPK);
      setDraftTersedia(false);
    } catch {
      /* abaikan kegagalan hapus draft */
    }
  };

  /**
   * Langkah 6 â€” Review Dokumen: tampilkan bundel prelim di layar
   * (tanpa unduh) memakai data draft. Tombol Cetak PDF / Ekspor Word
   * sengaja dikunci (`allowDownload={false}`) sampai pengajuan terverifikasi.
   */
  const handleReview = () => {
    if (!validasiSemuaLangkah()) return;
    setReviewSub({
      ...buildPayload(),
      id: 'draft-review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      amandemenCount: 0,
      isLockedForPrint: false,
    } as ProjectSubmission);
    setStep(REVIEW_IDX);
  };

  const previewKurva =
    kurvaSPlan && kurvaSPlan.entries.length
      ? generateKurvaSDariPlan(kurvaSPlan, durasiKerjaHari, tanggalMulaiKerja)
      : generateKurvaS(durasiKerjaHari, nilaiPekerjaan);

  /** Titik grafik per kolom progres (format master KURVA S.xlsx). */
  const titikKurva = titikKurvaSDariPlan(kurvaSPlan);

  /**
   * Tanggal & durasi kerja selalu mengikuti rentang Kurva S (hari pertama â†’
   * terakhir): mulai = awal Kurva S, selesai = akhir, durasi = selisihnya.
   * Bila Kurva S belum diisi, patokan tetap dari tanggal BAKH.
   */
  useEffect(() => {
    if (!rentangKurva) return;
    setTanggalMulaiKerja(rentangKurva.awal);
    setDurasiKerjaHari(rentangKurva.hari);
    setTanggalSelesaiKerja(rentangKurva.akhir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kurvaSPlan, tanggalBAKH]);

  /**
   * Alur Proyek BAKH selalu mengikuti tanggal progres Kurva S. Kolomnya terkunci
   * di BAKH â€” satu-satunya cara mengisi/mengubahnya adalah lewat Kurva S.
   */
  useEffect(() => {
    if (!kurvaSPlan?.entries.length && !kurvaSPlan?.progres.some(p => p.tanggal)) return;
    const alur = alurProyekDariKurvaS(kurvaSPlan, durasiKerjaHari, tanggalMulaiKerja);
    if (alur && TAHAP_ALUR.some(t => alur[t.key] > 0)) setAlurProyek(alur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kurvaSPlan, durasiKerjaHari, tanggalMulaiKerja, step]);

  /** Buka popup isian Kurva S. Tanggal mulai kerja mandor diisi awal otomatis. */
  const bukaPlanner = () => {
    setKurvaSPlan(
      prev => prev ?? { tanggalMulaiMandor: tanggalMulaiKerja, progres: [], entries: [] }
    );
    if (stepErrors['_form']) {
      setStepErrors(prev => {
        const next = { ...prev };
        delete next['_form'];
        return next;
      });
      setErrorMsg(null);
    }
    setShowKurvaPlanner(true);
  };

  /**
   * Blok isian Kurva S (tombol planner + rekap + grafik). Dipakai di langkah
   * BAKH, tepat di bawah Lampiran Harga.
   */
  const blokKurvaS = () => {
    const rekapPlan = kurvaSPlan ? rekapKurvaSPlan(kurvaSPlan) : null;
    const adaIsi = Boolean(kurvaSPlan && kurvaSPlan.entries.length);
    const progresTerisi = rekapPlan ? rekapPlan.baris.filter(b => b.nilai > 0).length : 0;
    // Grafik jadwal menampilkan tahap yang dipakai pada kolom Progres aktif.
    // Bila nama progres tidak bisa dipetakan, tahap lengkap tetap ditampilkan.
    const tahapAktif = (() => {
      if (!kurvaSPlan?.progres.length) return TAHAP_ALUR;
      const nama = kurvaSPlan.progres.map(p => p.nama.toLowerCase());
      const dipakai = TAHAP_ALUR.filter(t => {
        if (t.key === 'persiapan') return nama.some(n => n.includes('persiapan'));
        if (t.key === 'materialDelivery') return nama.some(n => n.includes('material'));
        if (t.key === 'instalasi') return nama.some(n => n.includes('instalasi') || n.includes('istalasi') || n.includes('installation'));
        if (t.key === 'commissioningTest') return nama.some(n => n.includes('commissioning') || n.includes('komisioning') || n.includes('penarikan'));
        return nama.some(n => n.includes('uji') || n.includes('serah terima'));
      });
      return dipakai.length ? dipakai : TAHAP_ALUR;
    })();

    return (
      <div className="space-y-4">
        {/* Tombol buka popup isian */}
        <button
          type="button"
          onClick={bukaPlanner}
          className={`w-full flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 ${
            adaIsi
              ? 'border-teal-300 bg-teal-50/70 hover:border-teal-500'
              : 'border-dashed border-teal-400 bg-teal-50/50 hover:border-teal-600 hover:bg-teal-50'
          }`}
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-800 text-white shadow-md">
              <Table2 className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[13px] font-bold text-slate-900">
                {adaIsi ? 'Ubah Data Kurva S' : 'Klik untuk Isi Data Kurva S'}
              </span>
              <span className="block text-[11px] leading-snug text-slate-500">
                {adaIsi
                  ? `${kurvaSPlan?.entries.length} item Â· ${progresTerisi} progres terisi Â· ${formatRupiah(
                      rekapPlan?.totalNilai ?? 0
                    )}`
                  : 'Tanggal mulai kerja mandor â†’ tanggal tiap progres â†’ item (search) + qty per kolom progres.'}
              </span>
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-800 px-4 py-2 text-[11px] font-bold text-white shadow-sm">
            {adaIsi ? 'Ubah Isian' : 'Isi Sekarang'}
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </button>

        {adaIsi && rekapPlan && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Mulai Kerja Mandor
              </p>
              <p className="text-[12px] font-bold text-slate-800">
                {formatTanggalIndo(kurvaSPlan?.tanggalMulaiMandor || '')}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Progres / Item
              </p>
              <p className="text-[12px] font-bold text-slate-800">
                {rekapPlan.baris.length} / {kurvaSPlan?.entries.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Total Qty
              </p>
              <p className="text-[12px] font-bold text-slate-800">{rekapPlan.totalQty}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Total Nilai
              </p>
              <p className="text-[12px] font-black text-teal-700">
                {formatRupiah(rekapPlan.totalNilai)}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-end justify-between gap-3">
          <TextField
            id="f-durasi-kurva"
            label="Durasi Kerja"
            type="number"
            min={1}
            max={365}
            inputMode="numeric"
            required
            readOnly={!!rentangKurva}
            containerClassName="w-full max-w-[280px]"
            suffix={rentangKurva ? undefined : 'hari'}
            value={durasiKerjaHari}
            error={stepErrors['f-durasi-kurva']}
            onChange={numChange('f-durasi-kurva', ubahDurasi)}
            hint={
              rentangKurva
                ? `Otomatis dari Kurva S: ${formatTanggalIndo(
                    rentangKurva.awal
                  )} s/d ${formatTanggalIndo(rentangKurva.akhir)} (${
                    rentangKurva.hari
                  } hari) Â· Nilai kontrak ${formatRupiah(nilaiPekerjaan)}`
                : `Isi Kurva S, durasi ikut terhitung otomatis Â· Nilai kontrak ${formatRupiah(
                    nilaiPekerjaan
                  )}`
            }
            hintTone={rentangKurva ? 'accent' : 'muted'}
          />
          <div className="flex items-center gap-1.5 rounded-lg border border-teal-100 bg-teal-50 px-2.5 py-1.5 text-[11px] font-semibold text-teal-700">
            <Sparkles className="h-3.5 w-3.5" />
            {adaIsi
              ? 'Dihitung dari bobot nilai tiap progres'
              : 'Digenerate otomatis ke dokumen berkas'}
          </div>
        </div>

        <div className="rounded-2xl border border-teal-100 bg-white p-3 shadow-inner">
          <KurvaSChart
            data={previewKurva}
            titikProgres={titikKurva}
            durasiHari={durasiKerjaHari}
            compact={false}
            tahapHari={tahapAktif.map(t => ({ nama: t.label, hari: alurProyek[t.key] }))}
          />
        </div>
      </div>
    );
  };

  /** Isi langkah sesuai berkas. */
  const renderBody = (d: BerkasDef) => {
    switch (d.key) {
      // ---------- a. BAKH ----------
      case 'bakh': {
        // Hitungan orang: 1 team FO = 4 orang, 1 team Jointer = 2 orang.
        const orangFo = teamFo * ORANG_PER_TEAM_FO;
        const orangJoiner = teamJoiner * ORANG_PER_TEAM_JOINTER;
        const orangTotal = orangFo + orangJoiner;
        const selisih = hargaKesepakatan - hargaPenawaran;
        const totalAlur = hitungTotalAlur(alurProyek);
        const selisihAlur = totalAlur - durasiKerjaHari;
        return (
          <div className="space-y-4">
            <SectionPanel
              tone="teal"
              icon={<FileText className="h-4 w-4" />}
              title="Isian Rinci BAKH"
              caption="Satu kali isi â€” hasilnya digenerate ke dokumen master (masterpp.docx)."
            >
              <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-3">
              <TextField
                id="f-bakh"
                label="No. BAKH"
                required
                value={nomorBAKH}
                placeholder="BAKH/â€¦/09-2026"
                mono
                error={stepErrors['f-bakh']}
                onChange={textChange('f-bakh', setNomorBAKH)}
              />
              <SearchSelectField
                id="f-bakh-nama"
                label="Tematik"
                required
                containerClassName="md:col-span-2"
                value={bakhNamaPekerjaan}
                error={stepErrors['f-bakh-nama']}
                onChange={pick('f-bakh-nama', setBakhNamaPekerjaan)}
                options={opsiTeks(NAMA_PEKERJAAN_BAKH)}
                placeholder="Ketik untuk mencari tematis..."
                hint="Pilihan tetap â€” daftar bisa diedit di src/db/masterpp.ts."
              />

              <TextField
                id="f-bakh-lokasi"
                label="Lokasi"
                required
                containerClassName="md:col-span-2"
                placeholder="Contoh: STO Cempaka Putih, Jakarta Pusat"
                value={lokasiProyek}
                error={stepErrors['f-bakh-lokasi']}
                onChange={textChange('f-bakh-lokasi', setLokasiProyek)}
                hint="Satu lokasi dengan langkah SPK."
              />
              <TextField
                id="f-witel"
                label="Witel"
                required
                placeholder="Contoh: JAKARTA UTARA"
                value={bakhWitel}
                error={stepErrors['f-witel']}
                onChange={textChange('f-witel', setBakhWitel)}
              />

              <TextField
                id="f-pid"
                label="PID"
                required
                placeholder="26KT08R201-0033"
                mono
                value={bakhPid}
                error={stepErrors['f-pid']}
                onChange={textChange('f-pid', setBakhPid)}
                hint="PID SAP proyek."
              />
              <TextField
                id="f-tgl-bakh"
                label="Tgl Surat"
                type="date"
                required
                value={tanggalBAKH}
                error={stepErrors['f-tgl-bakh']}
                onChange={textChange('f-tgl-bakh', setTanggalBAKH)}
                hint={`Ditulis pada surat: ${formatTanggalIndo(tanggalBAKH)}`}
                hintTone="accent"
                right={<span className="text-[10px] font-semibold text-slate-400">Jangkar tanggal SPK &amp; PP</span>}
              />
              <InfoBox
                title="Durasi Pekerjaan"
                value={`${durasiKerjaHari} hari`}
                hint={`${formatTanggalIndo(tanggalMulaiKerja)} s/d ${formatTanggalIndo(tanggalSelesaiKerja)}`}
              />
              </div>
            </SectionPanel>

            {/* Panel: Harga Kesepakatan */}
            <SectionPanel
              tone="amber"
              icon={<DollarSign className="h-4 w-4" />}
              title="Harga Kesepakatan"
              caption="Harga penawaran vendor dibandingkan harga final yang disepakati."
            >
              <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-3">
              <TextField
                id="f-harga-penawaran"
                label="Harga Penawaran"
                required
                type="number"
                step={1000}
                inputMode="numeric"
                prefix="Rp"
                value={hargaPenawaran}
                error={stepErrors['f-harga-penawaran']}
                onChange={numChange('f-harga-penawaran', setHargaPenawaran)}
                hint={formatRupiah(hargaPenawaran)}
              />
              <TextField
                id="f-harga-kesepakatan"
                label="Harga Kesepakatan"
                required
                type="number"
                step={1000}
                inputMode="numeric"
                prefix="Rp"
                value={hargaKesepakatan}
                error={stepErrors['f-harga-kesepakatan']}
                onChange={numChange('f-harga-kesepakatan', setHargaKesepakatan)}
                hint={
                  selisih === 0
                    ? 'Sesuai harga penawaran.'
                    : `Selisih dari penawaran ${selisih > 0 ? '+' : ''}${formatRupiah(selisih)}`
                }
                hintTone="accent"
              />
              <InfoBox
                title="Selisih Negosiasi"
                value={`${selisih > 0 ? '+' : ''}${formatRupiah(selisih)}`}
                hint={
                  selisih === 0
                    ? 'Harga final sama dengan penawaran.'
                    : selisih < 0
                      ? 'Harga final di bawah penawaran.'
                      : 'Harga final di atas penawaran.'
                }
                tone={selisih < 0 ? 'emerald' : selisih > 0 ? 'rose' : 'teal'}
              />
              </div>
            </SectionPanel>

            {/* Panel: Lampiran Harga */}
            <SectionPanel
              tone="emerald"
              icon={<Table2 className="h-4 w-4" />}
              title="Lampiran Harga"
              caption="Tempel dari Excel atau unggah file â€” header Negosiasi & Kesepakatan (Material/Jasa) terbaca otomatis."
              right={
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${SECTION_TONE.emerald.badge}`}>
                  {lampiranHargaRows.length} baris Â· {formatRupiah(totalHargaLampiran)}
                </span>
              }
            >
              {/* LAMPILAN HARGA â€” input manual via search designator */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h5 className="text-[12px] font-bold text-emerald-900">Input Manual â€” Designator</h5>
                    <p className="mt-0.5 text-[10px] leading-snug text-emerald-700">
Pilih Designator dan isi Volume saja — uraian, satuan, serta seluruh harga diisi otomatis dari RAB.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLampiranManual(v => !v)}
                    className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-4 text-[11px] font-bold text-emerald-800 transition-colors hover:border-emerald-400 outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                  >
                    {lampiranManual ? 'Tutup Input Manual' : 'Input Manual (Designator)'}
                  </button>
                </div>

                {lampiranManual && (
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-12">
                    <SearchSelectField
                      id="f-lampiran-manual-designator"
                      label="Designator"
                      containerClassName="md:col-span-5"
                      options={[
                        ...RAB_TA.map(i => ({ value: i.designator, label: i.designator })),
                        ...RAB_MANDOR.filter(m => !RAB_TA.some(t => t.designator === m.designator)).map(i => ({ value: i.designator, label: i.designator })),
                      ]}
                      value={lampiranManualDesignator}
                      onChange={v => {
                        setLampiranManualDesignator(v);
                        setLampiranHargaErr(null);
                      }}
                      placeholder="Ketik designator..."
                      emptyLabel="Designator tidak ditemukan di master RAB"
                      hint="Sumber: Lampiran BAKH.xlsx (RAB TA & RAB MANDOR)."
                      hintTone="muted"
                    />
                    <TextField
                      id="f-lampiran-manual-volume"
                      label="Volume"
                      type="number"
                      min={0}
                      step={0.1}
                      inputMode="decimal"
                      containerClassName="md:col-span-3"
                      value={lampiranManualVolume}
                      onChange={e => setLampiranManualVolume(Math.max(0, Number(e.target.value) || 0))}
                      hint="Isi volume saja — uraian, satuan, dan harga diambil otomatis dari RAB."
                      hintTone="muted"
                    />
                    <div className="md:col-span-4 flex items-end">
                      <button
                        type="button"
                        onClick={tambahBarisManualLampiranHarga}
                        className="inline-flex w-full min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-[12px] font-bold text-white shadow-md transition-colors hover:bg-emerald-600"
                      >
                        <FilePlus2 className="h-4 w-4" />
                        Tambah Baris
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* LAMPIRAN HARGA â€” input ala BOQ (manual) atau unggah Excel */}
              <div>
                {/* Area tempel: salin sel di Excel (Ctrl+C) lalu tempel (Ctrl+V) di sini */}
                <div
                  tabIndex={0}
                  onPaste={tempelLampiranHarga}
                  aria-label="Area tempel Lampiran Harga dari Excel"
                  className="mb-2 flex cursor-copy items-center gap-3 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/50 px-4 py-3 transition-colors hover:border-teal-500 hover:bg-teal-50 outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  <ClipboardPaste className="h-5 w-5 shrink-0 text-teal-600" />
                  <p className="text-[11px] leading-snug text-teal-900">
                    <strong>Salin (Ctrl+C) baris dari Excel, lalu klik area ini &amp; tekan Ctrl+V.</strong>{' '}
                    Header <em>Negosiasi (Telkom Akses/Mandor) &amp; Kesepakatan (Material/Jasa)</em>{' '}
                    terdeteksi otomatis â€” tidak perlu diketik per baris.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full min-w-[980px] text-[11px]">
                    <thead>
                      <tr className="bg-emerald-50 text-emerald-900">
                        <th rowSpan={2} className="w-9 border-b border-emerald-200 px-2 py-2 text-center font-bold align-middle">NO</th>
                        <th rowSpan={2} className="border-b border-emerald-200 px-2 py-2 text-center font-bold align-middle">DESIGNATOR</th>
                        <th rowSpan={2} className="border-b border-emerald-200 px-2 py-2 text-center font-bold align-middle">URAIAN PEKERJAAN</th>
                        <th rowSpan={2} className="border-b border-emerald-200 px-2 py-2 text-center font-bold align-middle">SAT</th>
                        <th colSpan={2} className="border-b border-l border-emerald-200 px-2 py-2 text-center font-bold">Telkom Akses</th>
                        <th colSpan={2} className="border-b border-l border-emerald-200 px-2 py-2 text-center font-bold">Mandor</th>
                        <th colSpan={2} className="border-b border-l border-emerald-200 px-2 py-2 text-center font-bold">Kesepakatan</th>
                        <th rowSpan={2} className="border-b border-l border-emerald-200 px-2 py-2 text-center font-bold align-middle">Volume</th>
                        <th rowSpan={2} className="w-10 border-b border-emerald-200 px-2 py-2 align-middle"><span className="sr-only">Aksi</span></th>
                      </tr>
                      <tr className="bg-emerald-50 text-emerald-800">
                        <th className="border-b border-l border-emerald-200 px-2 py-1.5 text-center font-semibold">Material</th>
                        <th className="border-b border-emerald-200 px-2 py-1.5 text-center font-semibold">Jasa</th>
                        <th className="border-b border-l border-emerald-200 px-2 py-1.5 text-center font-semibold">Material</th>
                        <th className="border-b border-emerald-200 px-2 py-1.5 text-center font-semibold">Jasa</th>
                        <th className="border-b border-l border-emerald-200 px-2 py-1.5 text-center font-semibold">Material</th>
                        <th className="border-b border-emerald-200 px-2 py-1.5 text-center font-semibold">Jasa</th>
                      </tr>
                    </thead>
                     <tbody>
                      {lampiranHargaRows.map((r, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-2 py-2 text-center font-bold tabular-nums text-slate-400">
                            {i + 1}
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              placeholder="Designator"
                              value={r.designator || ''}
                              onChange={(e) => {
                                const updated = lampiranHargaRows.map((row: LampiranHargaRow, idx: number) =>
                                  idx === i ? autoPopulateDariRAB(row, e.target.value) : row
                                );
                                setLampiranHargaRows(updated);
                                setLampiranHargaErr(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const updated = lampiranHargaRows.map((row: LampiranHargaRow, idx: number) =>
                                    idx === i ? autoPopulateDariRAB(row, e.currentTarget.value) : row
                                  );
                                  setLampiranHargaRows(updated);
                                  // Tambah baris baru otomatis
                                  setLampiranHargaRows(prev => {
                                    const hasEmpty = prev.some(r => !r.designator?.trim());
                                    return hasEmpty ? prev : [...prev, barisLampiranHargaKosong()];
                                  });
                                }
                              }}
                              className="w-32 rounded border border-slate-200 px-1.5 py-1 font-mono text-[10px] font-bold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                            />
                          </td>
                          <td className="whitespace-pre-wrap px-2 py-2 text-slate-700">
                            {r.uraian || <span className="text-slate-400">â€”</span>}
                          </td>
                          <td className="px-2 py-2 text-slate-600">
                            {r.sat || <span className="text-slate-400">â€”</span>}
                          </td>
                          <td className="border-l border-slate-100 px-2 py-2 text-right tabular-nums text-slate-700">
                            {r.telkomMaterial.toLocaleString('id-ID')}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums text-slate-700">
                            {r.telkomJasa.toLocaleString('id-ID')}
                          </td>
                          <td className="border-l border-slate-100 px-2 py-2 text-right tabular-nums text-slate-700">
                            {r.mandorMaterial.toLocaleString('id-ID')}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums text-slate-700">
                            {r.mandorJasa.toLocaleString('id-ID')}
                          </td>
                          <td className="border-l border-slate-100 px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              inputMode="numeric"
                              value={r.ksepMaterial || ''}
                              placeholder="0"
                              aria-label={`Kesepakatan Material ${r.designator || i + 1}`}
                              onChange={(e) => {
                                const value = Math.max(0, Number(e.target.value) || 0);
                                setLampiranHargaRows(prev => prev.map((row, idx) =>
                                  idx === i ? { ...row, ksepMaterial: value } : row
                                ));
                              }}
                              className="w-24 rounded border border-teal-200 bg-teal-50/60 px-1.5 py-1 text-right font-mono text-[10px] font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              inputMode="numeric"
                              value={r.ksepJasa || ''}
                              placeholder="0"
                              aria-label={`Kesepakatan Jasa ${r.designator || i + 1}`}
                              onChange={(e) => {
                                const value = Math.max(0, Number(e.target.value) || 0);
                                setLampiranHargaRows(prev => prev.map((row, idx) =>
                                  idx === i ? { ...row, ksepJasa: value } : row
                                ));
                              }}
                              className="w-24 rounded border border-teal-200 bg-teal-50/60 px-1.5 py-1 text-right font-mono text-[10px] font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                            />
                          </td>
                           <td className="border-l border-slate-100 px-2 py-2 text-center">
                             <input
                               type="number"
                               min="0"
                               step="0.1"
                               value={r.volume || 0}
                               onChange={(e) => {
                                 const newVal = parseFloat(e.target.value) || 0;
                                 setLampiranHargaRows(lampiranHargaRows.map((row, idx) =>
                                   idx === i ? { ...row, volume: newVal } : row
                                 ));
                               }}
                               className="w-20 rounded border border-slate-200 px-1.5 py-1 text-right text-[10px] font-mono outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                             />
                           </td>
                           <td className="px-1.5 py-1.5 text-center">
                             <button
                              type="button"
                              onClick={() => hapusBarisHarga(i)}
                              aria-label={`Hapus baris Lampiran Harga ${i + 1}`}
                              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                 {/* Total per kategori: seluruh harga × Volume. */}
                 <div className="mt-3 grid gap-3 md:grid-cols-3">
                   <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
                     <p className="text-xs font-semibold text-slate-600">Total Telkom Akses</p>
                     <p className="mt-1 text-lg font-bold text-sky-900">{formatRupiah(totalTelkomAksesLampiran)}</p>
                     <p className="mt-1 text-[10px] text-sky-700">Material + Jasa × Volume</p>
                   </div>
                   <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                     <p className="text-xs font-semibold text-slate-600">Total Mandor</p>
                     <p className="mt-1 text-lg font-bold text-violet-900">{formatRupiah(totalMandorLampiran)}</p>
                     <p className="mt-1 text-[10px] text-violet-700">Material + Jasa × Volume</p>
                   </div>
                   <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                     <p className="text-xs font-semibold text-slate-600">Total Kesepakatan</p>
                     <p className="mt-1 text-lg font-bold text-emerald-900">{formatRupiah(totalHargaLampiran)}</p>
                     <p className="mt-1 text-[10px] text-emerald-700">Material + Jasa × Volume</p>
                   </div>
                 </div>

                 <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => lampiranHargaInputRef.current?.click()}
                    className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-[11px] font-bold text-emerald-800 transition-colors hover:border-emerald-400 hover:bg-emerald-100 outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Upload Excel
                  </button>
                  <input
                    ref={lampiranHargaInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    aria-label="Upload file Excel Lampiran Harga"
                    onChange={uploadLampiranHarga}
                  />
                  <p className="text-[10px] text-slate-500">
                    Negosiasi <strong className="text-slate-700">{formatRupiah(totalNegosiasiLampiran)}</strong>
                    {' Â· '}
                    Kesepakatan <strong className="text-teal-800">{formatRupiah(totalHargaLampiran)}</strong>
                    {lampiranHargaFile ? ` Â· Sumber: ${lampiranHargaFile}` : ''}
                  </p>
                </div>

                {(lampiranHargaErr || stepErrors['f-lampiran-harga']) && (
                  <p
                    role="alert"
                    className="mt-2 flex items-start gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700"
                  >
                    <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                    {lampiranHargaErr ?? stepErrors['f-lampiran-harga']}
                  </p>
                )}
              </div>
            </SectionPanel>

            {/* Panel: Kurva S (dipindah dari langkah terpisah) */}
            <SectionPanel
              tone="teal"
              icon={<Table2 className="h-4 w-4" />}
              title="Kurva S"
              caption="Isi rencana Kurva S: tanggal mulai kerja mandor, tanggal tiap progres, item & qty. Durasi kerja & Alur Proyek ikut terhitung otomatis."
              right={
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${SECTION_TONE.teal.badge}`}>
                  {kurvaSPlan?.entries.length ? `${kurvaSPlan.entries.length} item` : 'Belum diisi'}
                </span>
              }
            >
              {blokKurvaS()}
            </SectionPanel>

            {/* Panel: Alur Proyek */}
            <SectionPanel
              tone="violet"
              icon={<Clock3 className="h-4 w-4" />}
              title="Alur Proyek"
              caption="Terkunci â€” jumlah hari per tahap hanya bisa diisi lewat Kurva S, lalu tersalin otomatis ke sini (totalnya wajib sama dengan jumlah hari kerja)."
              right={
                <span className="flex flex-wrap items-baseline justify-end gap-1.5">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                      selisihAlur === 0
                        ? SECTION_TONE.violet.badge
                        : 'border-rose-200 bg-rose-50 text-rose-700'
                    }`}
                  >
                    Î£ {totalAlur} hari / {durasiKerjaHari} hari kerja
                  </span>
                  {!!kurvaSPlan?.entries.length && (
                    <span className="rounded-full border border-teal-100 bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-700">
                      Terisi otomatis dari Kurva S
                    </span>
                  )}
                </span>
              }
            >

              {/* ALUR PROYEK â€” 5 tahap; Î£ hari harus = Jumlah Hari Kerja */}
              <div className="md:col-span-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                  {TAHAP_ALUR.map((t, idx) => {
                    const akumulasi = TAHAP_ALUR.slice(0, idx).reduce(
                      (s, x) => s + alurProyek[x.key],
                      0
                    );
                    const mulaiTahap = addDays(tanggalMulaiKerja, akumulasi);
                    const selesaiTahap = addDays(mulaiTahap, Math.max(alurProyek[t.key] - 1, 0));
                    return (
                      <TextField
                        key={t.id}
                        id={t.id}
                        label={t.label}
                        required
                        type="number"
                        min={0}
                        inputMode="numeric"
                        readOnly
                        value={alurProyek[t.key]}
                        error={stepErrors[t.id]}
                        hint={
                          alurProyek[t.key] > 0 && tanggalMulaiKerja
                            ? `${alurProyek[t.key]} hari Â· ${formatTanggalIndo(
                                mulaiTahap
                              )} â€“ ${formatTanggalIndo(selesaiTahap)}`
                            : 'Terisi otomatis dari Kurva S.'
                        }
                        hintTone={alurProyek[t.key] > 0 ? 'accent' : 'muted'}
                      />
                    );
                  })}
                </div>
                <p
                  className={`mt-1.5 text-[11px] font-semibold ${
                    selisihAlur === 0 ? 'text-teal-700' : 'text-rose-600'
                  }`}
                >
                  {selisihAlur === 0
                    ? `Sesuai dengan jumlah hari kerja (${durasiKerjaHari} hari).`
                    : selisihAlur < 0
                      ? `Masih ada ${-selisihAlur} hari yang belum dialokasikan â€” perbaiki lewat Kurva S.`
                      : `Melebihi jumlah hari kerja sebanyak ${selisihAlur} hari â€” perbaiki lewat Kurva S.`}
                </p>
                <button
                  type="button"
                  onClick={bukaPlanner}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-bold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Ubah lewat Kurva S
                </button>
              </div>
            </SectionPanel>

            {/* Panel: Jumlah Team FO + Jointer */}
            <SectionPanel
              tone="indigo"
              icon={<Users className="h-4 w-4" />}
              title="Jumlah Team FO + Jointer"
              caption={`1 team FO = ${ORANG_PER_TEAM_FO} orang Â· 1 team Jointer = ${ORANG_PER_TEAM_JOINTER} orang.`}
              right={
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${SECTION_TONE.indigo.badge}`}>
                  {teamFo} FO ({orangFo}) + {teamJoiner} JNT ({orangJoiner}) ={' '}
                  <strong className="opacity-80">{orangTotal} orang</strong>
                </span>
              }
            >
              <div className="flex items-start gap-3">
                  <TextField
                    id="f-team-fo"
                    label="Team FO"
                    required
                    containerClassName="min-w-0 flex-1"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    suffix="team"
                    value={teamFo}
                    error={stepErrors['f-team-fo']}
                    onChange={numChange('f-team-fo', setTeamFo)}
                    hint={`1 team = ${ORANG_PER_TEAM_FO} orang â†’ ${orangFo} orang`}
                  />
                  <span
                    aria-hidden="true"
                    className="mt-[38px] shrink-0 text-lg font-black leading-none text-slate-300"
                  >
                    +
                  </span>
                  <TextField
                    id="f-team-joiner"
                    label="Team Jointer"
                    required
                    containerClassName="min-w-0 flex-1"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    suffix="team"
                    value={teamJoiner}
                    error={stepErrors['f-team-joiner']}
                    onChange={numChange('f-team-joiner', setTeamJoiner)}
                    hint={`1 team = ${ORANG_PER_TEAM_JOINTER} orang â†’ ${orangJoiner} orang`}
                  />
                </div>
            </SectionPanel>

            {/* Panel: Personel Penanggung Jawab */}
            <SectionPanel
              tone="rose"
              icon={<Users className="h-4 w-4" />}
              title="Personel Penanggung Jawab"
              caption="GM, PM, Mandor & Project Admin â€” menempel di seluruh dokumen prelim."
            >
              {/* INPUT GM / PM / MANDOR */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SearchSelectField
                  id="f-gm"
                  label="GM"
                  required
                  value={gm}
                  error={stepErrors['f-gm']}
                  onChange={pick('f-gm', setGm)}
                  options={opsiOrang(GM_LIST)}
                  hint={hintOrang(GM_LIST, gm)}
                />
                <SearchSelectField
                  id="f-pm"
                  label="PM"
                  required
                  value={pm}
                  error={stepErrors['f-pm']}
                  onChange={pick('f-pm', setPm)}
                  options={opsiOrang(PM_LIST)}
                  hint={hintOrang(PM_LIST, pm)}
                />
                <SearchSelectField
                  id="f-mandor"
                  label="Mandor"
                  required
                  value={mandor}
                  error={stepErrors['f-mandor']}
                  onChange={pick('f-mandor', setMandor)}
                  options={opsiOrang(MANDOR_LIST)}
                  hint={hintOrang(MANDOR_LIST, mandor)}
                />
                <SearchSelectField
                  id="f-project-admin"
                  label="Project Admin"
                  required
                  value={projectAdmin}
                  error={stepErrors['f-project-admin']}
                  onChange={pick('f-project-admin', setProjectAdmin)}
                  options={opsiOrang(ADMIN_LIST)}
                  hint={hintOrang(ADMIN_LIST, projectAdmin)}
                />
              </div>
            </SectionPanel>
          </div>
        );
      }

      // ---------- b. SPK ----------
      case 'spk':
        return (
          <div className="space-y-4">
            <SectionPanel
              tone="sky"
              icon={<Building2 className="h-4 w-4" />}
              title="Data Kontrak & Identitas Pekerjaan"
              caption="Tgl Surat, Lokasi, dan Witel mengikuti BAKH â€” isi No. Leonita serta Nilai Total Pekerjaan di sini."
            >
              <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-3">
              <TextField
                id="f-tglspk"
                label="Tgl Surat"
                type="date"
                value={tanggalSPK}
                readOnly
                hint={`Sama dengan Tgl Surat BAKH â€” ${formatTanggalIndo(tanggalSPK)}`}
                hintTone="accent"
              />
              <TextField
                id="f-no-leonita"
                label="No. Leonita"
                required
                placeholder="cth. 07649/LG.000/â€¦"
                mono
                value={noLeonita}
                error={stepErrors['f-no-leonita']}
                onChange={textChange('f-no-leonita', setNoLeonita)}
              />
              <TextField
                id="f-lokasi"
                label="Lokasi"
                containerClassName="md:col-span-2"
                value={lokasiProyek}
                readOnly
                hint="Sama dengan BAKH."
              />
              <TextField
                id="f-witel-spk"
                label="Witel"
                value={bakhWitel || ''}
                readOnly
                hint="Sama dengan BAKH."
              />
              <TextField
                id="f-nilai"
                label="Nilai Total Pekerjaan (Kontrak SPK)"
                required
                containerClassName="md:col-span-3"
                type="number"
                min={0}
                step={1000}
                inputMode="numeric"
                prefix="Rp"
                value={nilaiPekerjaan}
                error={stepErrors['f-nilai']}
                onChange={numChange('f-nilai', handleNilaiPekerjaanChange)}
                hint="Isi sesuai nilai kontrak SPK."
                hintTone="muted"
              />
              </div>
            </SectionPanel>

            {/* --- Tim Lapangan --- */}
            <SectionPanel
              tone="indigo"
              icon={<Users className="h-4 w-4" />}
              title="Tim Lapangan"
              caption="Mandor mengikuti BAKH; No HP terisi otomatis begitu Waspang dipilih."
            >
              <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-3">
                <SearchSelectField
                  id="f-mandor"
                  label="Mandor"
                  required
                  value={mandor}
                  error={stepErrors['f-mandor']}
                  onChange={pick('f-mandor', setMandor)}
                  options={opsiOrang(MANDOR_LIST)}
                  hint={mandor ? `Sama dengan BAKH Â· ${hintOrang(MANDOR_LIST, mandor)}` : 'Sama dengan BAKH.'}
                />
                <SearchSelectField
                  id="f-waspang"
                  label="Waspang"
                  required
                  value={waspang}
                  error={stepErrors['f-waspang']}
                  onChange={v => pilihWaspang(v)}
                  options={opsiOrang(WASPANG_LIST)}
                  hint={hintOrang(WASPANG_LIST, waspang)}
                />
                <TextField
                  id="f-nohp"
                  label="No. HP"
                  value={noHp}
                  readOnly
                  placeholder="Terisi otomatis dari Waspang"
                  hint="Otomatis dari data master Waspang."
                  hintTone="accent"
                />
              </div>
            </SectionPanel>

            {/* --- Waktu Pelaksanaan --- */}
            <SectionPanel
              tone="violet"
              icon={<Calendar className="h-4 w-4" />}
              title="Waktu Pelaksanaan"
              caption="Tgl Mulai Kerja = H+1 setelah Tgl Surat BAKH; rentang selesai & durasi tampil otomatis (durasi diatur di BAKH)."
            >
              <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-3">
                <TextField
                  id="f-tgl-mulai"
                  label="Tgl Mulai Kerja (SPK)"
                  type="date"
                  required
                  value={tanggalMulaiKerja}
                  error={stepErrors['f-tgl-mulai']}
                  onChange={e => {
                    clearFieldError('f-tgl-mulai');
                    ubahMulai(e.target.value);
                  }}
                  hint={`${formatTanggalIndo(tanggalMulaiKerja)} â€” H+1 setelah Tgl Surat BAKH.`}
                  hintTone="accent"
                />
                <div className="md:col-span-2">
                  <div className="mb-1.5 text-[12px] font-semibold text-slate-700">
                    Rentang Pekerjaan
                  </div>
                  <div className="rounded-xl border border-teal-100 bg-teal-50/60 px-3.5 py-3">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px] font-bold text-slate-900">
                      <span>{formatTanggalIndo(tanggalMulaiKerja)}</span>
                      <span className="text-teal-600">s/d</span>
                      <span>{formatTanggalIndo(tanggalSelesaiKerja)}</span>
                      <span className="rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-bold text-white">
                        {durasiKerjaHari} hari
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] leading-snug text-teal-800">
                      Rentang tampil di SPK; jumlah hari yang tampil di BAKH.
                    </p>
                    {stepErrors['f-rentang-spk'] && (
                      <p role="alert" className="mt-1.5 text-[11px] font-semibold text-rose-600">
                        {stepErrors['f-rentang-spk']}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </SectionPanel>

            {/* --- 2. Rincian Kebutuhan Anggaran Material Non Stock (otomatis) --- */}
            <SectionPanel
              tone="amber"
              icon={<DollarSign className="h-4 w-4" />}
              title="2. Rincian Kebutuhan Anggaran Material Non Stock"
              caption="(dapat dibeli oleh Mandor/TA, diisi sesuai kebutuhan) â€” terisi otomatis dari baris Lampiran BOQ SPK yang memuat material."
            >

                {(() => {
                  const barisNonStock = boqSpk.filter(r => r.material > 0);
                  // Total Harga per baris = Volume x Harga Satuan (Jasa).
                  const totalNonStock = barisNonStock.reduce((s, r) => s + r.vol * r.jasa, 0);
                  const persenNonStock =
                    nilaiTotalBoq > 0 ? (totalNonStock / nilaiTotalBoq) * 100 : 0;

                  if (!barisNonStock.length) {
                    return (
                      <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-5 text-center text-[11px] font-medium text-slate-400">
                        Belum ada material non stock â€” kolom Material pada Lampiran BOQ SPK masih 0
                        di semua baris.
                      </p>
                    );
                  }

                  const isiSatuan = (idxBarisBoq: number, nilai: string) =>
                    setBoqSpk(prev =>
                      prev.map((r, i) => (i === idxBarisBoq ? { ...r, satuan: nilai } : r))
                    );

                  return (
                    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full min-w-[620px] text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600">
                            <th className="w-14 px-2 py-2 text-left font-bold">Nomor</th>
                            <th className="px-2 py-2 text-left font-bold">Material</th>
                            <th className="px-2 py-2 text-right font-bold">Volume</th>
                            <th className="px-2 py-2 text-center font-bold">Satuan</th>
                            <th className="px-2 py-2 text-right font-bold">Harga Satuan</th>
                            <th className="px-2 py-2 text-right font-bold">Total Harga</th>
                            <th className="w-10 px-2 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {barisNonStock.map((r, i) => {
                            const idxBarisBoq = boqSpk.indexOf(r);
                            return (
                              <tr key={idxBarisBoq} className="border-t border-slate-100">
                                <td className="px-2 py-2 text-center font-bold tabular-nums text-slate-400">
                                  {i + 1}
                                </td>
                                <td className="px-2 py-2 font-mono text-slate-800">
                                  {r.designator || <span className="text-slate-400">â€”</span>}
                                </td>
                                <td className="px-2 py-2 text-right tabular-nums text-slate-700">
                                  {r.vol}
                                </td>
                                <td className="px-2 py-2 text-center">
                                  <input
                                    value={r.satuan ?? ''}
                                    onChange={e => isiSatuan(idxBarisBoq, e.target.value)}
                                    aria-label={`Satuan ${r.designator || i + 1}`}
                                    placeholder="pcs"
                                    className="w-20 min-h-[30px] px-2 rounded-lg border border-slate-300 bg-white text-center text-[11px] text-slate-800 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15"
                                  />
                                </td>
                                <td className="px-2 py-2 text-right tabular-nums text-slate-700">
                                  {formatRupiah(r.jasa)}
                                </td>
                                <td className="px-2 py-2 text-right font-bold tabular-nums text-slate-900">
                                  {formatRupiah(r.vol * r.jasa)}
                                </td>
                                <td className="px-2 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => hapusBarisBoq(idxBarisBoq)}
                                    aria-label={`Hapus designator ${r.designator || i + 1}`}
                                    className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                            <td colSpan={5} className="px-2 py-2 text-right text-slate-600">
                              Total Material Non Stock
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums text-teal-800">
                              {formatRupiah(totalNonStock)}
                            </td>
                            <td />
                          </tr>
                          <tr className="bg-slate-50 font-bold">
                            <td colSpan={5} className="px-2 py-2 text-right text-slate-600">
                              % Material Non Stock / Total BoQ
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums text-teal-800">
                              {persenNonStock.toFixed(2).replace('.', ',')}%
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  );
                })()}
              </SectionPanel>

            <SectionPanel
              tone="sky"
              icon={<Calendar className="h-4 w-4" />}
              title="Turunan Tanggal SOP"
              caption="Dihitung otomatis dari Tgl Surat BAKH â€” tidak perlu diisi manual."
            >
              <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                <InfoBox title="Tgl Surat BAKH" value={formatTanggalIndo(tanggalBAKH)} hint="= Tgl Surat SPK" />
                <InfoBox title="Mulai & Selesai Kerja" value={`${formatTanggalIndo(tanggalMulaiKerja)} s/d ${formatTanggalIndo(tanggalSelesaiKerja)}`} hint={`${durasiKerjaHari} hari kerja`} />
                <InfoBox title="Tanggal PP" value={formatTanggalIndo(tanggalPP)} hint="+2 hari setelah surat" />
                <InfoBox title="Tanggal Pengajuan Panjar" value={formatTanggalIndo(tanggalPengajuanPanjar)} hint="= Tanggal PP" />
              </div>
            </SectionPanel>
          </div>
        );

      // ---------- c. PP ----------
      case 'pp': {
        const totalIf =
          prelim + termin1 + termin2 + termin3 + retensi + materialStock + lumpsum;
        const isIhld = jenisDisposisi === 'IHLD';
        const isNde = jenisDisposisi === 'NDE';
        return (
          <div className="space-y-4">
            <SectionPanel
              tone="amber"
              icon={<DollarSign className="h-4 w-4" />}
              title="Data PP (Permintaan Pembayaran)"
              caption="Nama Kegiatan, Id Project, Total BOQ & personel mengikuti BAKH/SPK â€” yang diinput: Tanggal Penggunaan, Jenis/Nomor Disposisi (IHLD/NDE) dan rincian Termin."
            >
              <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-3">
              <TextField
                id="f-pp-nama-kegiatan"
                label="Nama Kegiatan"
                readOnly
                value={lokasiProyek}
                hint="Mengikuti Lokasi di BAKH."
                hintTone="accent"
                error={stepErrors['f-pp-nama-kegiatan']}
              />
              <TextField
                id="f-pp-pid"
                label="Id Project (PID)"
                readOnly
                mono
                value={bakhPid}
                hint="Mengikuti PID di BAKH."
                hintTone="accent"
                error={stepErrors['f-pp-pid']}
              />
              <TextField
                id="f-pp-total-boq"
                label="Total Nilai Project (BOQ)"
                readOnly
                prefix="Rp"
                value={nilaiTotalBoq}
                hint={`Sumber: BOQ DRM â€” ${formatRupiah(nilaiTotalBoq)}`}
                hintTone="accent"
              />
              <TextField
                id="f-pp-total-if"
                label="Total Nilai Pengajuan IF Project"
                readOnly
                prefix="Rp"
                value={totalIf}
                hint={`${formatRupiah(totalIf)} â€” total keseluruhan (Prelim + Termin 1/2/3 + Retensi + Material Non Stock + Lumpsum)`}
                hintTone={totalIf > 0 ? 'success' : 'muted'}
                error={stepErrors['f-pp-total-if']}
              />
              <TextField
                id="f-pp-tgl-pakai"
                label="Saat Penggunaan (Tanggal Penggunaan PP)"
                type="date"
                required
                value={tglPenggunaanPP}
                error={stepErrors['f-pp-tgl-pakai']}
                onChange={textChange('f-pp-tgl-pakai', setTglPenggunaanPP)}
                hint="Kapan panjar dipakai di lapangan."
              />
              <SelectField
                id="f-pp-jenis"
                label="IHLD / NDE"
                required
                value={jenisDisposisi}
                error={stepErrors['f-pp-jenis']}
                onChange={e => {
                  clearFieldError('f-pp-jenis');
                  clearFieldError('f-pp-nomor');
                  setJenisDisposisi(e.target.value as '' | 'IHLD' | 'NDE');
                }}
              >
                <option value="">â€” Pilih IHLD / NDE â€”</option>
                <option value="IHLD">IHLD</option>
                <option value="NDE">NDE</option>
              </SelectField>
              {isIhld && (
                <TextField
                  id="f-pp-nomor"
                  label="Nomor IHLD"
                  required
                  mono
                  placeholder="Nomor IHLD"
                  value={nomorIhld}
                  error={stepErrors['f-pp-nomor']}
                  onChange={textChange('f-pp-nomor', setNomorIhld)}
                  hint="Ditampilkan bila IHLD dipilih."
                />
              )}
              {isNde && (
                <TextField
                  id="f-pp-nomor"
                  label="Nomor NDE"
                  required
                  mono
                  placeholder="Nomor NDE"
                  value={nomorNde}
                  error={stepErrors['f-pp-nomor']}
                  onChange={textChange('f-pp-nomor', setNomorNde)}
                  hint="Ditampilkan bila NDE dipilih."
                />
              )}
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[12px] font-semibold text-slate-700">
                  Rincian Total Nilai Pengajuan IF Project
                </span>
                <span className="rounded-full border border-teal-100 bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-800">
                  Î£ {formatRupiah(totalIf)}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
                <TextField
                  id="f-pp-prelim"
                  label="Prelim"
                  type="number"
                  min={0}
                  step={100000}
                  inputMode="numeric"
                  prefix="Rp"
                  value={prelim}
                  error={stepErrors['f-pp-prelim']}
                  onChange={numChange('f-pp-prelim', setPrelim)}
                />
                <TextField
                  id="f-pp-t1"
                  label="Termin 1"
                  type="number"
                  min={0}
                  step={100000}
                  inputMode="numeric"
                  prefix="Rp"
                  value={termin1}
                  error={stepErrors['f-pp-t1']}
                  onChange={numChange('f-pp-t1', setTermin1)}
                />
                <TextField
                  id="f-pp-t2"
                  label="Termin 2"
                  type="number"
                  min={0}
                  step={100000}
                  inputMode="numeric"
                  prefix="Rp"
                  value={termin2}
                  error={stepErrors['f-pp-t2']}
                  onChange={numChange('f-pp-t2', setTermin2)}
                />
                <TextField
                  id="f-pp-t3"
                  label="Termin 3"
                  type="number"
                  min={0}
                  step={100000}
                  inputMode="numeric"
                  prefix="Rp"
                  value={termin3}
                  error={stepErrors['f-pp-t3']}
                  onChange={numChange('f-pp-t3', setTermin3)}
                />
                <TextField
                  id="f-pp-retensi"
                  label="Retensi"
                  type="number"
                  min={0}
                  step={100000}
                  inputMode="numeric"
                  prefix="Rp"
                  value={retensi}
                  error={stepErrors['f-pp-retensi']}
                  onChange={numChange('f-pp-retensi', setRetensi)}
                />
                <TextField
                  id="f-pp-matstock"
                  label="Material Non Stock"
                  type="number"
                  min={0}
                  step={100000}
                  inputMode="numeric"
                  prefix="Rp"
                  value={materialStock}
                  error={stepErrors['f-pp-matstock']}
                  onChange={numChange('f-pp-matstock', setMaterialStock)}
                />
                <TextField
                  id="f-pp-lumpsum"
                  label="Lumpsum"
                  type="number"
                  min={0}
                  step={100000}
                  inputMode="numeric"
                  prefix="Rp"
                  value={lumpsum}
                  error={stepErrors['f-pp-lumpsum']}
                  onChange={numChange('f-pp-lumpsum', setLumpsum)}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 text-[12px] font-semibold text-slate-700">
                Personel (mengikuti BAKH / SPK)
              </div>
              <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-3">
                <TextField
                  id="f-pp-pm"
                  label="PM"
                  readOnly
                  value={pm}
                  hint="Mengikuti BAKH."
                  hintTone="accent"
                  error={stepErrors['f-pp-pm']}
                />
                <TextField
                  id="f-pp-waspang"
                  label="Waspang"
                  readOnly
                  value={waspang}
                  hint="Mengikuti SPK."
                  hintTone="accent"
                  error={stepErrors['f-pp-waspang']}
                />
                <TextField
                  id="f-pp-admin"
                  label="Project Admin"
                  readOnly
                  value={projectAdmin}
                  hint="Mengikuti BAKH."
                  hintTone="accent"
                  error={stepErrors['f-pp-admin']}
                />
                <TextField
                  id="f-pp-mandor"
                  label="Mandor"
                  readOnly
                  value={mandor}
                  hint="Mengikuti BAKH."
                  hintTone="accent"
                  error={stepErrors['f-pp-mandor']}
                />
              </div>
            </div>
            </SectionPanel>

            <div className={`rounded-2xl border border-slate-200 bg-slate-50/60 p-4 ${ruleCls('slate')}`}>
              <SlotAlurRinci nama={d.short} />
            </div>
          </div>
        );
      }

      // ---------- f. Pengajuan Panjar Proyek ----------
      case 'pengajuanPanjar': {
        const dataMandor = jenisPenerima === 'mandor' ? cariOrang(MANDOR_LIST, mandor) : undefined;
        const petaNilai: Record<KomponenTotal, number> = {
          prelim,
          termin1,
          termin2,
          termin3,
          retensi,
          materialStock,
          lumpsum,
        };
        const labelTerpilih = komponenPanjar
          .map(key => KOMPONEN_TOTAL.find(k => k.key === key)?.label ?? '')
          .filter(Boolean)
          .join(' + ');
        const toggleKomponen = (key: KomponenTotal) =>
          setKomponenPanjar(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
          );
        return (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InfoBox
                title="Nilai Pengajuan"
                value={formatRupiah(nilaiPrelimPanjar)}
                hint={labelTerpilih ? `Total: ${labelTerpilih}` : 'Belum ada komponen dipilih'}
                tone="emerald"
              />
              <InfoBox
                title="Tanggal Pengajuan Panjar"
                value={formatTanggalIndo(tanggalPengajuanPanjar)}
                hint="= Tanggal PP"
              />
            </div>

            <fieldset className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <legend className="px-1 text-[12px] font-semibold text-slate-700">
                Total Nilai
                <span className="ml-2 text-[11px] font-normal text-slate-500">
                  (boleh pilih lebih dari satu â€” mis. Termin 1 + Termin 2)
                </span>
              </legend>
              <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-2.5">
                {KOMPONEN_TOTAL.map(k => (
                  <label
                    key={k.key}
                    className="inline-flex cursor-pointer items-center gap-2 text-[12px] font-bold text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={komponenPanjar.includes(k.key)}
                      onChange={() => toggleKomponen(k.key)}
                      className="h-4 w-4 rounded border-slate-300 accent-teal-700 focus:ring-2 focus:ring-teal-600/30"
                    />
                    {k.label}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Jumlah nilai dari komponen terpilih otomatis dihitung dan muncul di Nilai Pengajuan.
              </p>
            </fieldset>

            <div>
              <div className="mb-2 text-[12px] font-semibold text-slate-700">
                Rincian Total Nilai Pengajuan IF Project
                <span className="ml-2 text-[11px] font-normal text-slate-500">
                  (otomatis dari isian langkah PP)
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
                {KOMPONEN_TOTAL.map(k => (
                  <TextField
                    key={k.key}
                    id={`f-panjar-${k.key}`}
                    label={k.label}
                    readOnly
                    prefix="Rp"
                    value={petaNilai[k.key]}
                    hint={komponenPanjar.includes(k.key) ? 'Total Nilai dipakai' : undefined}
                    hintTone={komponenPanjar.includes(k.key) ? 'success' : 'muted'}
                  />
                ))}
              </div>
            </div>

            <SectionPanel
              tone="violet"
              icon={<Users className="h-4 w-4" />}
              title="Penerima Panjar Proyek"
              caption="Pilih salah satu â€” Prelim diisi manual atau Mandor diambil dari database."
            >

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
                <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] font-bold text-slate-700">
                  <input
                    type="radio"
                    name="panjar-penerima"
                    checked={jenisPenerima === 'prelim'}
                    onChange={() => setJenisPenerima('prelim')}
                    className="h-4 w-4 border-slate-300 text-teal-700 focus:ring-2 focus:ring-teal-600/30"
                  />
                  Prelim â€” input manual
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] font-bold text-slate-700">
                  <input
                    type="radio"
                    name="panjar-penerima"
                    checked={jenisPenerima === 'mandor'}
                    onChange={() => setJenisPenerima('mandor')}
                    className="h-4 w-4 border-slate-300 text-teal-700 focus:ring-2 focus:ring-teal-600/30"
                  />
                  Mandor â€” ambil dari database
                </label>
              </div>

              {jenisPenerima === 'prelim' ? (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <TextField
                      id="f-panjar-nama"
                      label="Nama Penerima"
                      required
                      value={namaPenerimaPrelim}
                      onChange={e => setNamaPenerimaPrelim(e.target.value)}
                      placeholder="Sesuai KTP / buku rekening"
                      error={stepErrors['f-panjar-nama']}
                    />
                    <TextField
                      id="f-panjar-rek"
                      label="Nomor Rekening"
                      required
                      value={nomorRekening}
                      onChange={e => setNomorRekening(e.target.value)}
                      error={stepErrors['f-panjar-rek']}
                    />
                  </div>
                  <TextField
                    id="f-panjar-npwp"
                    label="NPWP"
                    value={npwpPenerima}
                    onChange={e => setNpwpPenerima(e.target.value)}
                    placeholder="Opsional"
                    hint="Boleh dikosongkan."
                  />
                  <div>
                    <div className="mb-2 text-[12px] font-semibold text-slate-700">
                      Upload Dokumen Penerima{' '}
                      <span className="font-normal text-slate-500">
                        (KTP, NPWP & buku tabungan â€” unggah terpisah)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {IDENTITAS_UPLOADS.map(({ key, errKey }) => {
                        const def = berkasByKey(key);
                        return (
                          <div key={key}>
                            <div className="mb-2 text-[11px] font-bold text-slate-700">
                              {def.label}
                            </div>
                            <UploadStep
                              def={def}
                              file={uploadedFiles[key]}
                              onFileChange={f => setFile(key, f)}
                            />
                            {stepErrors[errKey] && (
                              <p
                                role="alert"
                                className="mt-2 flex items-start gap-1.5 text-[11px] font-semibold text-rose-600"
                              >
                                <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                                {stepErrors[errKey]}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <TextField
                      id="f-panjar-mandor-nama"
                      label="Nama Mandor"
                      readOnly
                      value={mandor || 'â€”'}
                      hint="Diambil dari data mandor (langkah BAKH)."
                      error={stepErrors['f-panjar-mandor']}
                    />
                    <TextField
                      id="f-panjar-mandor-hp"
                      label="No. HP Mandor"
                      readOnly
                      value={dataMandor?.noHp || 'â€”'}
                    />
                    <TextField id="f-panjar-mandor-jabatan" label="Jabatan" readOnly value="MANDOR" />
                  </div>
                  <div className="flex items-start gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5">
                    <Info className="mt-px h-4 w-4 shrink-0 text-teal-600" />
                    <p className="text-[11px] leading-relaxed text-teal-900">
                      Data penerima diambil otomatis dari database mandor. Tidak perlu input nama,
                      rekening, maupun unggah KTP/NPWP/buku rekening.
                    </p>
                  </div>
                </div>
              )}
            </SectionPanel>

            <SectionPanel
              tone="indigo"
              icon={<UploadCloud className="h-4 w-4" />}
              title="Upload Lampiran Dasar Pekerjaan"
              caption="Dokumen dasar yang mendukung pengajuan panjar ini."
            >
              <UploadStep
                def={berkasByKey('lampiranDasarPekerjaan')}
                file={uploadedFiles.lampiranDasarPekerjaan}
                onFileChange={f => setFile('lampiranDasarPekerjaan', f)}
              />
              {stepErrors['f-panjar-upload'] && (
                <p
                  role="alert"
                  className="mt-2 flex items-start gap-1.5 text-[11px] font-semibold text-rose-600"
                >
                  <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                  {stepErrors['f-panjar-upload']}
                </p>
              )}
            </SectionPanel>

            {stepErrors['_form'] && (
              <p
                role="alert"
                className="flex items-start gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700"
              >
                <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                {stepErrors['_form']}
              </p>
            )}
            <SlotAlurRinci nama={d.short} />
          </div>
        );
      }

      // ---------- g. Imprest Fund ----------
      case 'imprestFund':
        return (
          <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-3">
            <TextField
              id="f-if"
              label="Nomor Disposisi Imprest Fund (IF)"
              value={nomorIF}
              placeholder="IF-DISB-2604-â€¦"
              mono
              error={stepErrors['f-if']}
              onChange={textChange('f-if', setNomorIF)}
            />
            <TextField
              id="f-tgl-if"
              label="Tanggal Imprest Fund"
              type="date"
              value={tanggalImprestFund}
              readOnly
              hint="+2 hari setelah pengajuan panjar."
              hintTone="accent"
            />
            <InfoBox title="Nominal Dicairkan" value={formatRupiah(nilaiPrelimPanjar)} hint="Sama dengan nilai panjar prelim" tone="emerald" />
            <div className="md:col-span-3">
              <SlotAlurRinci nama={d.short} />
            </div>
          </div>
        );

      // ---------- h. GRAVIK CURVA S ----------
      case 'kurvaS': {
        // Rincian Total Nilai Pengajuan IF Project (langkah PP) â€” sumber nilai
        // Perizinan (Preliminary) untuk BOP Cost Structure (langkah Jadwal Pelaksanaan).
        const totalIf =
          prelim + termin1 + termin2 + termin3 + retensi + materialStock + lumpsum;
        return (
          <div className="space-y-4">
            {/* 6. Perkiraan Margin yang dilaksanakan â€” admin isi Penilaian, % otomatis / Revenue. */}
            <PerkiraanMargin
              kemitraan={marginKemitraan}
              swakelola={marginSwakelola}
              onChange={(blok, m) =>
                blok === 'kemitraan' ? setMarginKemitraan(m) : setMarginSwakelola(m)
              }
            />

            {/* Rincian Kebutuhan BOP Cost Structure â€” terpisah dari isian Kurva S. */}
            <button
              type="button"
              onClick={() => setShowBopModal(true)}
              className={`w-full flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 ${
                bopRows.length
                  ? 'border-teal-300 bg-teal-50/70 hover:border-teal-500'
                  : 'border-dashed border-teal-400 bg-teal-50/50 hover:border-teal-600 hover:bg-teal-50'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-800 text-white shadow-md">
                  <Calculator className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-[13px] font-bold text-slate-900">
                    {bopRows.length
                      ? 'Ubah Rincian Kebutuhan BOP Cost Structure'
                      : 'Klik untuk Isi Rincian Kebutuhan BOP Cost Structure'}
                  </span>
                  <span className="block text-[11px] leading-snug text-slate-500">
                    {bopRows.length
                      ? `${bopRows.length} material Â· ${formatRupiah(
                          bopRows.reduce((s, r) => s + r.vol * r.hargaSatuan, 0)
                        )} Â· Nilai Perizinan ${formatRupiah(nilaiPerizinan)} Â· Risiko ${manajemenRisiko || 'â€”'}`
                      : 'Material, volume, satuan & harga satuan diambil dari BOQ swakelola (berkas COST STRUCTURE).'}
                  </span>
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-800 px-4 py-2 text-[11px] font-bold text-white shadow-sm">
                {bopRows.length ? 'Ubah Isian' : 'Isi Sekarang'}
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </button>

            {showBopModal && (
              <BopCostModal
                rows={bopRows}
                boqSpk={boqSpk}
                totalBoq={nilaiTotalBoq}
                nilaiPerintahRincian={nilaiPerintahRincian}
                nilaiPerizinan={totalIf}
                manajemenRisiko={manajemenRisiko}
                onClose={() => setShowBopModal(false)}
                onSave={(next, nilai, nilaiPerizinanBaru, risikoBaru) => {
                  setBopRows(next);
                  setNilaiPerintahRincian(nilai);
                  setNilaiPerizinan(nilaiPerizinanBaru);
                  setManajemenRisiko(risikoBaru);
                  setShowBopModal(false);
                }}
              />
            )}
          </div>
        );
      }

      // ---------- Kelompok unggah ----------
      default:
        return (
          <div className="space-y-3">
            {stepErrors['_form'] && (
              <p
                role="alert"
                className="flex items-start gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700"
              >
                <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                {stepErrors['_form']}
              </p>
            )}
            <UploadStep
              def={d}
              file={uploadedFiles[d.key]}
              boqResult={d.key === 'boqDrm' ? boqResult : undefined}
              onFileChange={f => setFile(d.key, f)}
              onBoqResult={d.key === 'boqDrm' ? setBoqResult : undefined}
            />
            {d.deferred && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-px" />
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  <strong>Boleh diisi belakangan.</strong> Berkas {d.short} baru tersedia
                  setelah transfer / serah terima dilakukan pada menu <em>List Antrian Pengajuan</em>.
                  Kunci cetak terbuka setelah eviden serah terima dan bukti transfer lengkap.
                </p>
              </div>
            )}
            {catatanTambahan(d)}
          </div>
        );
    }
  };

  /** Catatan tambahan khusus berkas unggah tertentu. */
  const catatanTambahan = (d: BerkasDef) => {
    if (d.key === 'boqDrm') {
      return (
        <div className="flex items-start gap-2 rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-2.5">
          <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-px" />
          <p className="text-[11px] text-indigo-900 leading-relaxed">
            <strong>Excel dibaca sistem.</strong> Berkas yang diunggah dibaca lewat SheetJS â€” baris,
            jumlah item, dan total nilai dibaca lalu digenerate ke dokumen BOQ DRM.
          </p>
        </div>
      );
    }
    if (d.key === 'spb') {
      return (
        <div className="flex items-start gap-2 rounded-xl bg-slate-100 border border-slate-200 px-3 py-2.5">
          <FileText className="w-4 h-4 text-slate-500 shrink-0 mt-px" />
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Unggah SPB hasil terbit Bagian Keuangan / Treasury, lalu sistem meng-generate berkasnya
            ke dalam bundel prelim.
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm max-w-5xl mx-auto">
      <div ref={topRef} />

      {/* Kepala */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-800 text-white flex items-center justify-center shadow-md">
            <FilePlus2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Input Pengajuan Prelim Proyek</h2>
            <p className="text-xs text-slate-500">
              Wizard {RAIL_STEPS.length} langkah â€” Informasi Pekerjaan (dasar pekerjaan), BOQ,
              Struktur Organisasi &amp; Tim Proyek, Jadwal Pelaksanaan Proyek, Pengajuan Panjar
              otomatis, lalu review dokumen sebelum disimpan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full">
            {totalLengkap}/{BERKAS_PRELIM_WIZARD.length} lengkap
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[36px] text-xs font-medium text-slate-600 hover:bg-slate-100 px-4 py-2 rounded-full transition-colors"
          >
            Batal
          </button>
        </div>
      </div>

      {/* Rail langkah */}
      <WizardRail current={step} steps={RAIL_STEPS} isDone={isRailDone} onSelect={goto} />

      {errorMsg && (
        <div role="alert" className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isReviewStep ? (
        /* ============ Langkah 6 â€” Review Dokumen ============ */
        <section aria-labelledby="review-title" className="space-y-4">
          <header className="pb-4 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                Langkah {RAIL_STEPS.length} / {RAIL_STEPS.length}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">
                <FileSearch className="w-3 h-3" />
                Review Sebelum Simpan
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${
                  semuanyaLengkap
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                {semuanyaLengkap ? 'Semua langkah lengkap' : 'Masih ada langkah kosong'}
              </span>
            </div>

            <h2 id="review-title" className="mt-3 text-base font-bold text-slate-900">
              Review Dokumen Prelim
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
              Seluruh isian sudah dirangkum menjadi bundel dokumen (BAKH, SPK, PP, Kurva S,
              Pengajuan Panjar &amp; IF). Cek hasilnya langsung di layar â€” tidak perlu unduh.
            </p>
          </header>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
            {/* Checklist kelengkapan tiap langkah isian */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {BERKAS_PRELIM_WIZARD.map((d, idx) => {
                const ok = isDone(d);
                const pesan = validateStep(d);
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => goto(idx)}
                    className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                      ok
                        ? 'border-emerald-200 bg-white hover:border-emerald-400'
                        : 'border-amber-300 bg-amber-50/70 hover:border-amber-400'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-slate-800">{d.short}</span>
                      <span
                        className={`mt-0.5 block text-[11px] leading-snug ${
                          ok ? 'text-slate-500' : 'text-amber-700'
                        }`}
                      >
                        {ok ? 'Lengkap â€” klik untuk ubah' : pesan}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Buka pratinjau dokumen di layar */}
            <div className="flex flex-col gap-3 rounded-xl border border-teal-200 bg-teal-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <Eye className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
                <div>
                  <p className="text-xs font-bold text-teal-900">
                    Pratinjau Dokumen di Layar
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-teal-800">
                    Buka bundel dokumen (semua tab berkas) untuk dicek langsung di web,
                    tanpa harus di-download.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleReview}
                className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full bg-teal-800 px-6 text-xs font-bold text-white shadow-md transition-all hover:bg-teal-700 outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                <FileSearch className="h-4 w-4" />
                Buka Review Dokumen
              </button>
            </div>

            {/* Keterangan kunci unduh */}
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
              <Lock className="mt-px h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-[11px] leading-relaxed text-amber-900">
                <strong>Pratinjau selalu bisa dibuka.</strong> Tombol{' '}
                <strong>Cetak / Simpan PDF</strong> dan <strong>Ekspor Word</strong> baru aktif
                setelah pengajuan <strong>terverifikasi</strong> oleh verifikator.
              </p>
            </div>
          </div>

          <div className="w-full flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => goto(step - 1)}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-5 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Sebelumnya
            </button>

            <button
              type="button"
              onClick={handleSimpan}
              className="inline-flex items-center gap-2 min-h-[44px] px-6 rounded-full text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Simpan Pengajuan & Terbitkan Alur Digital
            </button>
          </div>
        </section>
      ) : (
        <BerkasStepShell
          def={def!}
          status={statusOf(def!)}
          actions={
            <div className="w-full flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goto(step - 1)}
                  disabled={step === 0}
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-5 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Sebelumnya
                </button>

                {/* Simpan Draft â€” isian setengah jalan ke penyimpanan lokal browser. */}
                <button
                  type="button"
                  onClick={simpanDraft}
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-5 rounded-full text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan Draft
                </button>

                {/* Hapus Draft — buang isian lama agar draft baru tersimpan rapi. */}
                <button
                  type="button"
                  onClick={hapusDraft}
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-5 rounded-full text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Draft
                </button>
              </div>

              {step === REVIEW_IDX - 1 ? (
                <button
                  type="button"
                  onClick={handleReview}
                  className="inline-flex items-center gap-2 min-h-[44px] px-6 rounded-full text-xs font-bold text-white bg-teal-800 hover:bg-teal-700 shadow-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  <FileSearch className="w-4 h-4" />
                  Review Dokumen
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLanjut}
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-6 rounded-full text-xs font-bold text-white bg-teal-800 hover:bg-teal-700 shadow-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                >
                  Simpan & Lanjut
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          }
        >
          {renderBody(def!)}
        </BerkasStepShell>
      )}

      {/* Ringkasan progres */}
      <div className="mt-5 p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-amber-900 text-[11px] flex items-start gap-2">
        <Calendar className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <span className="font-bold">Aturan SOP tanggal:</span> BAKH = SPK, PP = SPK + 2 hari,
          Pengajuan Panjar = PP. Berkas lain (BOQ DRM, Lampiran Dasar Pekerjaan, Imprest Fund,
          identitas, eviden, SPB) diolah di menu lain. Kunci cetak terbuka setelah berkas{' '}
          <strong>Evidence Serah Terima Prelim</strong> dan{' '}
          <strong>Lampiran Bukti Transfer dari TA ke Penerima</strong> terverifikasi.
        </p>
      </div>

      {/* Planner Kurva S â€” dirender di root agar bisa dibuka dari langkah mana pun */}
      {showKurvaPlanner && (
        <KurvaSPlannerModal
          plan={kurvaSPlan}
          durasiHari={durasiKerjaHari}
          onClose={() => setShowKurvaPlanner(false)}
          onSave={next => {
            setKurvaSPlan(next);
            // Durasi kerja mengikuti rentang hari pada Kurva S.
            const hari = rentangKurvaSDariPlan(next)?.hari;
            if (hari && hari !== durasiKerjaHari) ubahDurasi(hari);
            // Alur Proyek BAKH ikut terisi dari tanggal progres Kurva S.
            const alur = alurProyekDariKurvaS(
              next,
              hari ?? durasiKerjaHari,
              tanggalMulaiKerja
            );
            if (alur) setAlurProyek(alur);
            setShowKurvaPlanner(false);
            setStepErrors(prev => {
              const n = { ...prev };
              delete n['_form'];
              TAHAP_ALUR.forEach(t => delete n[t.id]);
              return n;
            });
            setErrorMsg(null);
          }}
        />
      )}

      {/* Pratinjau dokumen (tanpa unduh) â€” dikunci sampai verifikasi */}
      {reviewSub && (
        <PrintDocumentModal
          submission={reviewSub}
          onClose={() => setReviewSub(null)}
          allowDownload={false}
        />
      )}
    </div>
  );
};
