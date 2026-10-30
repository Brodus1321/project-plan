import React, { useEffect, useMemo, useState } from 'react';
import {
  ProjectSubmission
} from '../types';
import {
  formatRupiah,
  formatRingkas,
  formatTanggalIndo
} from '../db/storage';
import {
  Search,
  MapPin,
  ChevronDown,
  Printer,
  ChevronRight
} from 'lucide-react';
import bcCard from '../../bccard.jpg';
interface DashboardViewProps {
  submissions: ProjectSubmission[];
  onSelectSubmission: (sub: ProjectSubmission) => void;
  onOpenInput: () => void;
  onOpenAntrian: () => void;
  onOpenEvidenModal: (sub: ProjectSubmission) => void;
  onOpenPrintModal: (sub: ProjectSubmission) => void;
}

// Master lokasi yang dimonitor (data proyek per lokasi menyusul).
export const LOKASI_PROYEK = [
  'BEKASI',
  'KARAWANG',
  'BOGOR',
  'CIREBON',
  'JAKARTA UTARA',
  'SERANG',
  'JAKARTA SELATAN',
  'JAKARTA PUSAT',
  'JAKARTA TIMUR',
  'TANGERANG',
  'TASIKMALAYA',
  'SUKABUMI',
  'JAKARTA BARAT',
  'BANDUNG',
  'CIANJUR',
];

// Posisi relatif tiap lokasi pada peta (persen dari lebar/tinggi peta),
// hanya untuk tata letak visual — koordinat geografis menyusul.
const POSISI_LOKASI: Record<string, { x: number; y: number }> = {
  CIANJUR: { x: 15, y: 18 },
  CIREBON: { x: 87, y: 14 },
  TANGERANG: { x: 68, y: 12 },
  BOGOR: { x: 30, y: 42 },
  'DKI JAKARTA': { x: 47, y: 28 },
  KARAWANG: { x: 70, y: 32 },
  BEKASI: { x: 58, y: 48 },
  SERANG: { x: 80, y: 48 },
  BANDUNG: { x: 12, y: 68 },
  SUKABUMI: { x: 12, y: 87 },
  TASIKMALAYA: { x: 32, y: 87 },
};

/** Ruas jalan yang menghubungkan pin sesuai posisi di atas. */
const JALUR_UTAMA: [string, string][] = [
  ['CIANJUR', 'BOGOR'],
  ['BOGOR', 'DKI JAKARTA'],
  ['DKI JAKARTA', 'KARAWANG'],
  ['KARAWANG', 'BEKASI'],
  ['BEKASI', 'SERANG'],
  ['SERANG', 'TANGERANG'],
  ['DKI JAKARTA', 'TANGERANG'],
  ['SERANG', 'CIREBON'],
  ['CIANJUR', 'BANDUNG'],
  ['BANDUNG', 'SUKABUMI'],
  ['BOGOR', 'SUKABUMI'],
  ['BOGOR', 'TASIKMALAYA'],
];

/** Ruas jalan tol (digambar warna kuning seperti Google Maps). */
const JALUR_TOL: [string, string][] = [
  ['BOGOR', 'DKI JAKARTA'],
  ['DKI JAKARTA', 'KARAWANG'],
  ['KARAWANG', 'BEKASI'],
  ['BEKASI', 'SERANG'],
  ['SERANG', 'CIREBON'],
];

/** Kurva organik antara dua pin, dipakai untuk menggambar jalan. */
function kurvaJalan(a: string, b: string): string | null {
  const A = POSISI_LOKASI[a];
  const B = POSISI_LOKASI[b];
  if (!A || !B) return null;
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = (A.x + B.x) / 2 - (dy / len) * 2.4;
  const cy = (A.y + B.y) / 2 + (dx / len) * 2.4;
  return `M${A.x} ${A.y} Q${cx} ${cy} ${B.x} ${B.y}`;
}

/** Palet warna ala Google Maps. */
const WARNA_PETA = {
  laut: '#aadaff',
  daratan: '#f5f3f0',
  garisPantai: '#e3e1dd',
  taman: '#c9e7c0',
  urban: '#f7f1d9',
  tol: '#fdd663',
  jalan: '#ffffff',
  casingJalan: '#dedad5',
  bayangan: 'rgba(0,0,0,0.2)',
  biru: '#1a73e8',
  hijau: '#34a853',
  merah: '#ea4335',
  abu: '#9aa0a6',
};

/**
 * Rincian termin pembayaran sebuah pengajuan.
 * PRELIM memakai nilai panjar prelim yang sebenarnya, sisa nilai pekerjaan
 * dibagi TERMIN 1-3 + Retensi + Lumpsum. Sisa pembulatananea dikembalikan ke
 * TERMIN 1 supaya penjumlahannya selalu sama dengan nilai pekerjaan.
 */
function rincianTermin(sub: ProjectSubmission): { label: string; nilai: number; persen: number }[] {
  const total = Number(sub.nilaiPekerjaan) || 0;
  const prelim = Number(sub.nilaiPrelimPanjar) || 0;
  const sisa = Math.max(total - prelim, 0);

  const bobot: [string, number][] = [
    ['TERMIN 1', 30],
    ['TERMIN 2', 28],
    ['TERMIN 3', 14],
    ['RETENSI', 5],
    ['LUMPSUM', 3],
  ];
  const totalBobot = bobot.reduce((a, b) => a + b[1], 0);

  const rows = bobot.map(([label, b]) => ({
    label,
    nilai: Math.round((sisa * b) / totalBobot / 1000) * 1000,
    persen: total > 0 ? (sisa * b) / totalBobot / total * 100 : 0,
  }));

  const delta = sisa - rows.reduce((a, r) => a + r.nilai, 0);
  if (delta !== 0) rows[0].nilai += delta;

  return [
    { label: 'PRELIM', nilai: prelim, persen: total > 0 ? (prelim / total) * 100 : 0 },
    ...rows,
  ];
}

/** Cocokkan data pengajuan dengan salah satu nama kota pada LOKASI_PROYEK. */
function cariLokasiDariProject(sub: ProjectSubmission): string | null {
  const sumber = [sub.lokasiProyek, sub.regional, sub.namaPekerjaan]
    .join(' ')
    .toUpperCase();
  return LOKASI_PROYEK.find((l) => sumber.includes(l)) ?? null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  submissions,
  onSelectSubmission,
  onOpenInput,
  onOpenAntrian,
  onOpenEvidenModal,
  onOpenPrintModal,
}) => {
  const [selectedProjectIndex, setSelectedProjectIndex] = useState<number>(0);
  const [selectedLokasi, setSelectedLokasi] = useState<string>(LOKASI_PROYEK[0]);
  const [clusterTerbuka, setClusterTerbuka] = useState<string | null>(null);
  const [infoTerbuka, setInfoTerbuka] = useState<string | null>(null);
  const [daftarTerbuka, setDaftarTerbuka] = useState(false);
  const [cariLokasi, setCariLokasi] = useState('');
  const [subInfoId, setSubInfoId] = useState<string | null>(null);
  const [zoomPeta, setZoomPeta] = useState(1);

  // Peta lokasi -> pengajuan. Data per lokasi menyusul; bila nama kota pada
  // data pengajuan belum cocok, lokasinya tetap tampil tanpa berkas.
  const subPerLokasi = useMemo(() => {
    const map = new Map<string, ProjectSubmission>();
    for (const s of submissions) {
      const lokasi = cariLokasiDariProject(s);
      if (lokasi && !map.has(lokasi)) map.set(lokasi, s);
    }
    return map;
  }, [submissions]);

  // Pin peta. Lima kota DKI Jakarta digabung jadi satu titik agar labelnya
  // tidak saling menutupi; daftar lengkap lokasi ada di dropdown Rincian Termin.
  const sitePins = useMemo(() => {
    const dki = LOKASI_PROYEK.filter((l) => l.startsWith('JAKARTA'));
    const tunggal = LOKASI_PROYEK.filter((l) => !l.startsWith('JAKARTA'));
    const grup: { kunci: string; lokasi: string[] }[] = [
      ...tunggal.map((l) => ({ kunci: l, lokasi: [l] })),
      ...(dki.length ? [{ kunci: 'DKI JAKARTA', lokasi: dki }] : []),
    ];
    return grup.map((g) => ({
      ...g,
      x: POSISI_LOKASI[g.kunci]?.x ?? 50,
      y: POSISI_LOKASI[g.kunci]?.y ?? 50,
    }));
  }, []);

  const subLokasiTerpilih = subPerLokasi.get(selectedLokasi) ?? null;
  const totalLokasiTerisi = LOKASI_PROYEK.filter((l) => subPerLokasi.has(l)).length;

  // Semua proyek per kota, bukan hanya yang pertama. Satu kota bisa punya
  // banyak lokasi proyek, mis. BOGOR -> Jalan Jambu 2, Jalan Jambu 3, dst.
  const proyekPerKota = useMemo(() => {
    const map = new Map<string, ProjectSubmission[]>();
    for (const nama of LOKASI_PROYEK) map.set(nama, []);
    for (const s of submissions) {
      const kota = cariLokasiDariProject(s);
      if (kota) map.get(kota)!.push(s);
    }
    return map;
  }, [submissions]);

  // Proyek yang sedang ditunjuk di peta / dropdown.
  const subInfo = useMemo(
    () => proyekPerKota.get(selectedLokasi)?.find((s) => s.id === subInfoId) ?? subLokasiTerpilih,
    [proyekPerKota, selectedLokasi, subInfoId, subLokasiTerpilih]
  );

  // Dropdown pencarian lokasi proyek. Daftar dikelompokkan per kota/branch agar
  // tetap rapi saat tiap branch punya banyak lokasi proyek.
  const lokasiPerBranch = useMemo(() => {
    return LOKASI_PROYEK.map((kota) => {
      const daftar = (proyekPerKota.get(kota) ?? []).map((sub) => ({
        id: sub.id,
        nama: sub.lokasiProyek?.trim() || sub.namaPekerjaan,
        kota,
        sub,
      }));
      return [kota, daftar] as const;
    });
  }, [proyekPerKota]);

  const branchTersaring = useMemo(() => {
    const q = cariLokasi.trim().toLowerCase();
    if (!q) return lokasiPerBranch;
    return lokasiPerBranch
      .map(([kota, daftar]) => [kota, daftar.filter((i) => i.nama.toLowerCase().includes(q) || i.kota.toLowerCase().includes(q))] as const)
      .filter(([, daftar]) => daftar.length > 0);
  }, [lokasiPerBranch, cariLokasi]);

  const jumlahTersaring = branchTersaring.reduce((a, [, daftar]) => a + daftar.length, 0);

  // Klik di luar menutup klaster, info window, dan daftar lokasi.
  useEffect(() => {
    if (!clusterTerbuka && !infoTerbuka && !daftarTerbuka) return;
    const tutup = () => {
      setClusterTerbuka(null);
      setInfoTerbuka(null);
      setDaftarTerbuka(false);
    };
    window.addEventListener('click', tutup);
    return () => window.removeEventListener('click', tutup);
  }, [clusterTerbuka, infoTerbuka, daftarTerbuka]);

  // Sinkronkan index pengajuan agar seluruh kartu di bawah mengikuti proyek terpilih.
  useEffect(() => {
    const target = subInfo ?? subLokasiTerpilih;
    const idx = target ? submissions.indexOf(target) : -1;
    // Lokasi tanpa data -> kembali ke index awal, tidak menampilkan data basi.
    setSelectedProjectIndex(idx >= 0 ? idx : 0);
  }, [subInfo, subLokasiTerpilih, submissions]);

  // Stats calculation
  const totalSubmissions = submissions.length;
  const readyToPrint = submissions.filter(s => !s.isLockedForPrint).length;
  const waitingEviden = submissions.filter(s => s.status === 'MENUNGGU_EVIDEN' || s.isLockedForPrint).length;
  const completed = submissions.filter(s => s.status === 'SELESAI').length;

  const totalNilaiKontrak = submissions.reduce((sum, s) => sum + s.nilaiPekerjaan, 0);
  const totalNilaiPanjar = submissions.reduce((sum, s) => sum + s.nilaiPrelimPanjar, 0);
  const persentaseRealisasiIF = totalNilaiKontrak > 0 ? Math.round((totalNilaiPanjar / totalNilaiKontrak) * 100) : 12;

  // ---- KPI (sumber tunggal: array submissions) ----
  // Total Uang Beredar = panjar prelim yang sudah dicairkan pada berkas
  // yang belum SELESAI (belum dipertanggungjawab).
  const grandTotalNilai = totalNilaiKontrak;
  const sudahPJ = submissions
    .filter((s) => s.status === 'SELESAI')
    .reduce((sum, s) => sum + s.nilaiPekerjaan, 0);
  const totalUangBeredar = submissions
    .filter((s) => s.status !== 'SELESAI')
    .reduce((sum, s) => sum + s.nilaiPrelimPanjar, 0);
  const rasioAman = grandTotalNilai > 0 ? (sudahPJ / grandTotalNilai) * 100 : 0;
  const rasioAmanRendah = rasioAman < 50;

  // Donut arc angle calculation
  const arcPercentage = 78; // 78% of IF disbursed
  const strokeDashoffset = 251.2 - (251.2 * arcPercentage) / 100;

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Indikator Kinerja Utama (KPI) — latar gambar bccard.jpg + overlay gelap */}
      <section
        aria-label="Indikator Kinerja Utama"
        className="rounded-3xl overflow-hidden ring-1 ring-rose-900/40 shadow-[0_6px_24px_rgba(30,58,138,0.3)] px-5 py-6"
        style={{
          backgroundImage: `linear-gradient(rgba(15,23,42,0.45), rgba(15,23,42,0.45)), url(${bcCard})`,
          backgroundSize: 'auto, 900% auto',
          backgroundPosition: 'center, 0% 40%',
          backgroundRepeat: 'no-repeat, no-repeat',
        }}
      >
        <header className="text-center">
          <h2 className="text-2xl font-semibold text-white tracking-tight">Indikator Kinerja Utama (KPI)</h2>
          <p className="mt-1.5 text-[13px] text-blue-200/70">Ringkasan metrik pertanggungan tingkat eksekutif.</p>
          <button
            onClick={onOpenInput}
            className="mt-3 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-1.5 rounded-full shadow transition-colors"
          >
            + Buat Pengajuan Baru
          </button>
        </header>

        {/* Angka KPI dirangkum jadi satu kotak biru, gaya sama dengan strip metrik Monitoring */}
        <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 max-w-[620px] mx-auto rounded-xl bg-slate-950/45 ring-1 ring-blue-700/50 shadow-[0_4px_14px_rgba(0,0,0,0.25)] divide-y sm:divide-y-0 sm:divide-x divide-white/10">
          {/* Total Uang Beredar */}
          <div
            className="relative flex flex-col items-center gap-2 text-center px-4 py-5"
            aria-label="Total Uang Beredar"
          >
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-white/10 text-blue-200" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" focusable="false">
                <rect x="2" y="6" width="20" height="12" rx="2.5" />
                <circle cx="12" cy="12" r="2.6" />
                <path d="M6 10.4v3.2M18 10.4v3.2" />
              </svg>
            </span>
            <p className="m-0 text-[10px] uppercase tracking-wide font-semibold text-blue-200/70">Total Uang Beredar</p>
            <p
              className="m-0 text-[28px] leading-none font-bold tracking-tight tabular-nums text-white"
              title={`Rp${Number(totalUangBeredar).toLocaleString('id-ID')}`}
            >
              {formatRingkas(totalUangBeredar)}
            </p>
          </div>

          {/* Grand Total Nilai — sel yang menonjol */}
          <div
            className="relative flex flex-col items-center gap-2 text-center px-4 py-5"
            aria-label="Grand Total Nilai"
          >
            <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-blue-500 text-white text-[10px] font-semibold leading-tight whitespace-nowrap shadow-sm">
              Terbesar
            </span>
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-blue-500/20 text-blue-200" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" focusable="false">
                <ellipse cx="12" cy="5.6" rx="8" ry="3.1" />
                <path d="M4 5.6v5.4c0 1.7 3.6 3.1 8 3.1s8-1.4 8-3.1V5.6" />
                <path d="M4 11v5.4c0 1.7 3.6 3.1 8 3.1s8-1.4 8-3.1V11" />
              </svg>
            </span>
            <p className="m-0 text-[10px] uppercase tracking-wide font-semibold text-blue-200/70">Grand Total Nilai</p>
            <p
              className="m-0 text-[28px] leading-none font-bold tracking-tight tabular-nums text-white"
              title={`Rp${Number(grandTotalNilai).toLocaleString('id-ID')}`}
            >
              {formatRingkas(grandTotalNilai)}
            </p>
          </div>

          {/* Rasio Aman */}
          <div
            className="relative flex flex-col items-center gap-2 text-center px-4 py-5"
            aria-label="Rasio Aman"
          >
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-white/10 text-blue-200" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" focusable="false">
                <path d="M21.4 15.6A9.6 9.6 0 1 1 8.4 2.6" />
                <path d="M22 12.4A10.1 10.1 0 0 0 12.4 2.8v9.6z" />
              </svg>
            </span>
            <p className="m-0 text-[10px] uppercase tracking-wide font-semibold text-blue-200/70">Rasio Aman</p>
            <p
              className={`m-0 text-[28px] leading-none font-bold tracking-tight tabular-nums ${rasioAmanRendah ? 'text-rose-400' : 'text-emerald-400'}`}
              title={`Sudah dipertanggungjawab: Rp${Number(sudahPJ).toLocaleString('id-ID')} dari Rp${Number(grandTotalNilai).toLocaleString('id-ID')}`}
            >
              {grandTotalNilai > 0 ? `${rasioAman.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%` : '0%'}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Monitoring Sebaran Proyek */}
      <section
        className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden"
        aria-label="Monitoring sebaran proyek"
      >
        {/* Header: judul + ringkasan + metrik berkas aktif */}
        <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-2.5 px-5 py-3.5 border-b border-slate-100">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Monitoring Sebaran Proyek</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              <span className="font-semibold text-slate-600">{totalLokasiTerisi}/{LOKASI_PROYEK.length}</span> lokasi terdata
              &middot; Area Jabodetabek &amp; Jawa Barat
            </p>
          </div>

          {/* Metrik berkas aktif — kotak biru dongker sebagai pembeda */}
          <div className="grid grid-cols-3 md:flex md:items-center w-full md:w-auto shrink-0 rounded-xl overflow-hidden bg-gradient-to-r from-slate-900 via-blue-950 to-blue-900 ring-1 ring-blue-800/60 shadow-[0_4px_14px_rgba(30,58,138,0.28)] divide-x divide-white/10">
            <div className="px-3 py-1.5 md:px-4 md:py-2 leading-tight">
              <div className="text-sm font-bold text-white tabular-nums">
                {subInfo ? subInfo.durasiKerjaHari : '\u2014'} Hari
              </div>
              <div className="text-[9px] uppercase tracking-wide text-blue-200/70 font-semibold whitespace-nowrap">Durasi Kurva S</div>
            </div>
            <div className="px-3 py-1.5 md:px-4 md:py-2 leading-tight">
              <div className="text-sm font-bold text-white tabular-nums">
                {subInfo ? formatRupiah(subInfo.nilaiPrelimPanjar) : '\u2014'}
              </div>
              <div className="text-[9px] uppercase tracking-wide text-blue-200/70 font-semibold whitespace-nowrap">Panjar IF Prelim</div>
            </div>
            <div className="px-3 py-1.5 md:px-4 md:py-2 leading-tight">
              <div className={`text-sm font-bold tabular-nums ${!subInfo ? 'text-blue-200/70' : subInfo.isLockedForPrint ? 'text-rose-300' : 'text-emerald-300'}`}>
                {!subInfo ? '\u2014' : subInfo.isLockedForPrint ? 'LOCKED' : 'READY'}
              </div>
              <div className="text-[9px] uppercase tracking-wide text-blue-200/70 font-semibold whitespace-nowrap">Status Cetak Berkas</div>
            </div>
          </div>
        </div>

        {/* Kanvas peta — gaya Google Maps */}
        <div className="relative w-full h-[300px] md:h-[340px] overflow-hidden bg-[#aadaff]">
          <div
            className="absolute inset-0 transition-transform duration-300 ease-out"
            style={{ transform: `scale(${zoomPeta})` }}
          >
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Laut + riak tipis */}
              <rect x="0" y="0" width="100" height="100" fill={WARNA_PETA.laut} />
              <g stroke="#ffffff" strokeWidth="0.35" fill="none" strokeOpacity="0.22" strokeLinecap="round">
                <path d="M4 18 C14 15, 24 21, 34 18" />
                <path d="M64 70 C74 67, 86 73, 96 70" />
                <path d="M50 86 C60 83, 70 89, 82 86" />
                <path d="M10 46 C20 43, 30 49, 40 46" />
              </g>

              {/* Daratan Jawa Barat */}
              <path
                d="M0 8 C10 3, 24 2, 36 6 C42 8, 46 11, 47 16 C48 22, 46 26, 45 31
                   C44 36, 46 40, 45 45 C44 50, 41 54, 37 57 C34 60, 32 64, 33 68
                   C34 72, 37 76, 40 79 C43 82, 45 86, 44 90 C40 94, 32 96, 24 95
                   C16 94, 8 96, 2 98 L0 98 Z"
                fill={WARNA_PETA.daratan}
                stroke={WARNA_PETA.garisPantai}
                strokeWidth="0.35"
                strokeLinejoin="round"
              />
              {/* Daratan Banten */}
              <path
                d="M63 6 L100 1 L100 86 C90 94, 76 96, 66 89 C63 84, 62 78, 63 72
                   C64 64, 62 56, 61 48 C60 38, 62 26, 61 18 C60 13, 61 9, 63 6 Z"
                fill={WARNA_PETA.daratan}
                stroke={WARNA_PETA.garisPantai}
                strokeWidth="0.35"
                strokeLinejoin="round"
              />

              {/* Area hijau / taman alam */}
              <g fill={WARNA_PETA.taman} stroke="#b6dba9" strokeWidth="0.2">
                <ellipse cx="13" cy="62" rx="9.5" ry="6.5" />
                <ellipse cx="25" cy="78" rx="7" ry="4.5" />
                <ellipse cx="8" cy="44" rx="6" ry="4" />
                <ellipse cx="80" cy="72" rx="8" ry="5" />
              </g>

              {/* Area urban Jabodetabek */}
              <ellipse cx="51" cy="28" rx="15" ry="11" fill={WARNA_PETA.urban} fillOpacity="0.9" stroke="#e6d9a0" strokeWidth="0.3" />

              {/* Selat Sunda + Kepulauan Seribu */}
              <path d="M44 88 C48 90, 50 94, 51 100 L44 100 Z" fill={WARNA_PETA.laut} />
              <g fill="#d8d2c4">
                <circle cx="52" cy="9" r="0.6" />
                <circle cx="55" cy="11.5" r="0.5" />
                <circle cx="53" cy="13.5" r="0.45" />
                <circle cx="57.5" cy="8.5" r="0.4" />
              </g>

              {/* Batas provinsi Jawa Barat - Banten */}
              <path
                d="M61 18 C58 30, 60 44, 63 56 C66 66, 65 78, 66 89"
                fill="none"
                stroke="#bdb8ad"
                strokeWidth="0.3"
                strokeDasharray="1.4 1.4"
              />

              {/* Jaringan jalan: casing abu + putih */}
              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                <g stroke={WARNA_PETA.casingJalan} strokeWidth="1.3">
                  {JALUR_UTAMA.map(([a, b]) => {
                    const d = kurvaJalan(a, b);
                    return d ? <path key={`c-${a}-${b}`} d={d} /> : null;
                  })}
                </g>
                <g stroke={WARNA_PETA.jalan} strokeWidth="0.85">
                  {JALUR_UTAMA.map(([a, b]) => {
                    const d = kurvaJalan(a, b);
                    return d ? <path key={`w-${a}-${b}`} d={d} /> : null;
                  })}
                </g>
                {/* Jalan tol: kuning di atas whites */}
                <g stroke={WARNA_PETA.tol} strokeWidth="0.55">
                  {JALUR_TOL.map(([a, b]) => {
                    const d = kurvaJalan(a, b);
                    return d ? <path key={`t-${a}-${b}`} d={d} /> : null;
                  })}
                </g>
              </g>
            </svg>

            {/* Label provinsi ala Google Maps */}
            <span className="absolute left-[20%] top-[5%] -translate-x-1/2 text-[8px] font-semibold uppercase tracking-[0.18em] text-[#7b7b7b] drop-shadow-[0_0_2px_#fff] pointer-events-none">Jawa Barat</span>
            <span className="absolute left-[78%] top-[68%] -translate-x-1/2 text-[8px] font-semibold uppercase tracking-[0.18em] text-[#7b7b7b] drop-shadow-[0_0_2px_#fff] pointer-events-none">Banten</span>
            <span className="absolute left-[47%] top-[15%] -translate-x-1/2 text-[8px] font-semibold uppercase tracking-[0.18em] text-[#7b7b7b] drop-shadow-[0_0_2px_#fff] pointer-events-none">DKI Jakarta</span>

            {/* Label kota kecil ala Google Maps */}
            <span className="absolute left-[6%] top-[30%] text-[7.5px] font-medium text-[#8a8a8a] drop-shadow-[0_0_2px_#fff] pointer-events-none">Cianjur</span>
            <span className="absolute left-[33%] top-[76%] text-[7.5px] font-medium text-[#8a8a8a] drop-shadow-[0_0_2px_#fff] pointer-events-none">Bandung</span>

            {/* Watermark */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center select-none pointer-events-none">
              <span className="text-[52px] font-black tracking-[0.22em] text-white/50">AREA 2</span>
            </div>

            {/* Pin per lokasi (5 kota Jakarta digabung jadi satu klaster) */}
            {sitePins.map((pin) => {
            const isKlaster = pin.lokasi.length > 1;
            const adaData = pin.lokasi.some((l) => subPerLokasi.has(l));
            const terkunci = pin.lokasi.some((l) => {
              const s = subPerLokasi.get(l);
              return s ? s.isLockedForPrint : false;
            });
            const isSelected = pin.lokasi.includes(selectedLokasi);
            const isOpen = clusterTerbuka === pin.kunci;

                        const infoDibuka = !isKlaster && infoTerbuka === pin.lokasi[0];
            const subInfoPin =
              (proyekPerKota.get(pin.lokasi[0]) ?? []).find((s) => s.id === subInfoId) ??
              (proyekPerKota.get(pin.lokasi[0]) ?? [])[0] ??
              null;

            const warnaTetes = isSelected
              ? WARNA_PETA.biru
              : adaData
                ? terkunci
                  ? WARNA_PETA.merah
                  : WARNA_PETA.hijau
                : WARNA_PETA.abu;

            return (
              <div
                key={pin.kunci}
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLokasi(pin.lokasi[0]);
                    if (isKlaster) {
                      setClusterTerbuka(isOpen ? null : pin.kunci);
                      setInfoTerbuka(null);
                    } else {
                      setClusterTerbuka(null);
                      const pertama = (proyekPerKota.get(pin.lokasi[0]) ?? [])[0];
                      setSubInfoId(pertama?.id ?? null);
                      setInfoTerbuka(infoDibuka ? null : pin.lokasi[0]);
                    }
                  }}
                  title={pin.lokasi.join(', ')}
                  className={`group flex flex-col items-center cursor-pointer transition-transform ${
                    isSelected ? 'scale-110 z-30' : 'hover:scale-110'
                  }`}
                >
                  {isKlaster ? (
                    <span
                      className="grid place-items-center w-[22px] h-[22px] rounded-full bg-white text-[#1a73e8] text-[10px] font-bold border-2 border-[#1a73e8] shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
                    >
                      {pin.lokasi.length}
                    </span>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" aria-hidden="true">
                      <path
                        d="M12 2.2C7.6 2.2 4.2 5.6 4.2 10c0 5.8 7.8 11.4 7.8 11.4S19.8 15.8 19.8 10c0-4.4-3.4-7.8-7.8-7.8z"
                        fill={warnaTetes}
                        stroke="#ffffff"
                        strokeWidth="1.4"
                      />
                      <circle cx="12" cy="9.8" r="2.5" fill="#ffffff" />
                    </svg>
                  )}
                  <span
                    className={`mt-0.5 max-w-[88px] truncate text-[9px] font-medium leading-none px-1.5 py-[2.5px] rounded-[3px] ${
                      isSelected
                        ? 'bg-[#1a73e8] text-white font-semibold'
                        : 'bg-white/85 text-[#3c4043] border border-[#dadce0]'
                    }`}
                  >
                    {isKlaster ? 'DKI Jakarta' : pin.lokasi[0]}
                  </span>
                </button>


                {/* Info window Google Maps: rincian termin pekerjaan */}
                {infoDibuka && subInfoPin && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute z-40 w-[232px] rounded-lg bg-white shadow-[0_2px_10px_rgba(0,0,0,0.3)] ring-1 ring-black/5 overflow-hidden text-left ${
                      pin.y > 55 ? 'bottom-full mb-2' : 'top-full mt-2'
                    } ${pin.x > 55 ? 'right-0' : 'left-0'}`}
                  >
                    {/* Kepala */}
                    <div className="flex items-start gap-2 px-2.5 py-2 bg-[#f8f9fa] border-b border-[#e8eaed]">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold text-[#202124] leading-tight line-clamp-2">
                          {subInfoPin.namaPekerjaan}
                        </p>
                        <p className="text-[8.5px] text-[#5f6368] leading-tight mt-0.5 line-clamp-1">
                          {subInfoPin.lokasiProyek || pin.lokasi[0]}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInfoTerbuka(null);
                        }}
                        aria-label="Tutup info"
                        className="w-4 h-4 shrink-0 grid place-items-center text-[13px] leading-none text-[#5f6368] hover:text-[#202124] cursor-pointer"
                      >
                        ×
                      </button>
                    </div>

                    {/* Rincian PRELIM / TERMIN / RETENSI / LUMPSUM */}
                    <div className="px-2.5 py-1.5 space-y-[3px]">
                      {rincianTermin(subInfoPin).map((row, i) => (
                        <div
                          key={row.label}
                          className={`flex items-baseline justify-between gap-2 py-[2.5px] ${
                            i === 0 ? '' : ''
                          }`}
                        >
                          <span className="text-[8.5px] font-semibold uppercase tracking-wide text-[#5f6368]">
                            {row.label}
                          </span>
                          <span className="flex items-baseline gap-1.5">
                            <span className="text-[8px] text-[#80868b] tabular-nums">
                              {row.persen.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%
                            </span>
                            <span className="text-[10px] font-semibold text-[#202124] tabular-nums">
                              {formatRupiah(row.nilai)}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-[#f8f9fa] border-t border-[#e8eaed]">
                      <span className="text-[8.5px] font-bold uppercase tracking-wide text-[#202124]">Total</span>
                      <span className="text-[10.5px] font-bold text-[#1a73e8] tabular-nums">
                        {formatRupiah(subInfoPin.nilaiPekerjaan)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Popover klaster: daftar kota dalam satu titik */}
                {isKlaster && isOpen && (
                  <div className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 z-40 w-44 rounded-xl bg-white border border-slate-200 shadow-xl p-1.5">
                    <p className="px-1.5 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      DKI Jakarta
                    </p>
                    {pin.lokasi.map((l) => {
                      const s = subPerLokasi.get(l);
                      const aktif = selectedLokasi === l;
                      return (
                        <button
                          key={l}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLokasi(l);
                            setSubInfoId(null);
                            setClusterTerbuka(null);
                            setInfoTerbuka(l);
                          }}
                          className={`w-full flex items-center gap-2 px-1.5 py-1 rounded-lg text-left text-[11px] font-medium transition-colors ${
                            aktif ? 'bg-[#1a73e8] text-white' : 'text-[#3c4043] hover:bg-[#f1f3f4]'
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: !s ? WARNA_PETA.abu : s.isLockedForPrint ? WARNA_PETA.merah : WARNA_PETA.hijau }}
                          ></span>
                          <span className="truncate">{l}</span>
                          {s && <span className="ml-auto text-[9px] font-bold opacity-70">{s.nomorSPK.slice(0, 6)}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Kartu lokasi terpilih — gaya kartu info Google Maps */}
              {subInfo && (
                <button
                  type="button"
                  onClick={() => onSelectSubmission(subInfo)}
                  className="absolute left-2 bottom-2 z-20 hidden sm:flex flex-col items-start gap-0.5 bg-white/95 rounded-lg px-2.5 py-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.2)] ring-1 ring-black/5 text-left hover:bg-white transition-colors"
                >
                  <span className="text-[8px] uppercase tracking-wider text-[#5f6368] font-semibold">
                    Lokasi Terpilih
                  </span>
                  <span className="text-[11px] font-semibold text-[#202124] leading-tight">
                    {subInfo.lokasiProyek || selectedLokasi}
                  </span>
                  <span className="text-[9px] text-[#5f6368] leading-tight line-clamp-1 max-w-[200px]">
                    {selectedLokasi} &middot; {subInfo.namaPekerjaan}
                  </span>
                </button>
              )}
            </div>

          {/* Kontrol zoom ala Google Maps */}
          <div className="absolute left-2 top-2 z-30 flex flex-col overflow-hidden rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.25)] ring-1 ring-black/5 bg-white">
            <button
              type="button"
              onClick={() => setZoomPeta((z) => Math.min(2, Number((z + 0.5).toFixed(1))))}
              aria-label="Perbesar peta"
              className="w-7 h-7 grid place-items-center text-[17px] leading-none text-[#5f6368] hover:bg-[#f1f3f4] active:bg-[#e8eaed] cursor-pointer"
            >
              +
            </button>
            <div className="h-px bg-[#dadce0]"></div>
            <button
              type="button"
              onClick={() => setZoomPeta((z) => Math.max(1, Number((z - 0.5).toFixed(1))))}
              aria-label="Perkecil peta"
              className="w-7 h-7 grid place-items-center text-[17px] leading-none text-[#5f6368] hover:bg-[#f1f3f4] active:bg-[#e8eaed] cursor-pointer"
            >
              −
            </button>
            {zoomPeta !== 1 && (
              <>
                <div className="h-px bg-[#dadce0]"></div>
                <button
                  type="button"
                  onClick={() => setZoomPeta(1)}
                  aria-label="Reset zoom"
                  className="w-7 h-7 grid place-items-center text-[11px] leading-none text-[#5f6368] hover:bg-[#f1f3f4] active:bg-[#e8eaed] cursor-pointer"
                >
                  ↺
                </button>
              </>
            )}
          </div>

          {/* Legend status ala Google Maps */}
          <div className="absolute right-2 top-2 z-20 hidden sm:flex items-center gap-2.5 bg-white/95 rounded-md shadow-[0_1px_3px_rgba(0,0,0,0.2)] ring-1 ring-black/5 px-2 py-1.5 text-[9px] font-medium text-[#3c4043]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: WARNA_PETA.hijau }}></span>Siap cetak</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: WARNA_PETA.merah }}></span>Terkunci</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: WARNA_PETA.abu }}></span>Belum ada data</span>
          </div>

          {/* Skala peta */}
          <div className="absolute right-2 bottom-2 z-20 hidden sm:flex items-center gap-1.5 bg-white/90 rounded px-1.5 py-1 text-[8px] font-medium text-[#5f6368]">
            <span className="flex flex-col items-center leading-none">
              <span className="w-10 h-1.5 border-x border-b border-[#5f6368]"></span>
            </span>
            Skema ilustratif
          </div>
          </div>
        </section>

      {/* 3. Bottom Half: 3 Distinct Cards (Matching the reference screenshot) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Card 1: Location & Operational Info (Col 1 - 5 columns) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              {/* Pemilih lokasi per branch */}
              <div className="mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Rincian Termin
                </span>

                <div className="relative mt-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDaftarTerbuka((v) => !v);
                      if (!daftarTerbuka) setCariLokasi('');
                    }}
                    className="w-full flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#1a73e8] flex-shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        Lokasi Proyek
                      </span>
                      <span className="block text-xs font-bold text-slate-800 truncate">
                        {subInfo ? subInfo.lokasiProyek || subInfo.namaPekerjaan : 'Pilih lokasi...'}
                      </span>
                    </span>
                    {subInfo && (
                      <span className="text-[9px] text-slate-400 flex-shrink-0 hidden sm:block">
                        {selectedLokasi}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform ${
                        daftarTerbuka ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Daftar lokasi */}
                  {daftarTerbuka && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl bg-white shadow-[0_8px_28px_rgba(0,0,0,0.16)] ring-1 ring-slate-200 overflow-hidden"
                    >
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
                        <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <input
                          autoFocus
                          value={cariLokasi}
                          onChange={(e) => setCariLokasi(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setDaftarTerbuka(false);
                            if (e.key === 'Enter') {
                              const pertama = branchTersaring[0]?.[1][0];
                              if (!pertama) return;
                              setSelectedLokasi(pertama.kota);
                              setSubInfoId(pertama.id);
                              setDaftarTerbuka(false);
                              setCariLokasi('');
                              setInfoTerbuka(pertama.kota);
                            }
                          }}
                          placeholder="Cari lokasi proyek..."
                          className="flex-1 text-xs text-slate-700 placeholder:text-slate-400 outline-none bg-transparent"
                        />
                        {cariLokasi && (
                          <button
                            type="button"
                            onClick={() => setCariLokasi('')}
                            aria-label="Bersihkan"
                            className="w-4 h-4 grid place-items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      <div className="max-h-[240px] overflow-y-auto">
                        {jumlahTersaring === 0 ? (
                          <p className="px-3 py-4 text-xs text-slate-400 text-center">
                            Lokasi &quot;{cariLokasi}&quot; tidak ditemukan
                          </p>
                        ) : (
                          branchTersaring.map(([kota, daftar]) => (
                            <div key={kota}>
                              <p className="px-3 py-1.5 bg-slate-50 text-[9px] font-bold uppercase tracking-wider text-slate-400 sticky top-0">
                                {kota} &middot; {daftar.length}
                              </p>
                              {daftar.map((o) => {
                                const aktif = subInfoId === o.id;
                                return (
                                  <button
                                    key={o.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedLokasi(o.kota);
                                      setSubInfoId(o.id);
                                      setDaftarTerbuka(false);
                                      setCariLokasi('');
                                      setInfoTerbuka(o.kota);
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                                      aktif ? 'bg-teal-50' : 'hover:bg-slate-50'
                                    }`}
                                  >
                                    <span
                                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                      style={{
                                        background: o.sub.isLockedForPrint
                                          ? WARNA_PETA.merah
                                          : WARNA_PETA.hijau,
                                      }}
                                    ></span>
                                    <span className="min-w-0 flex-1">
                                      <span
                                        className={`block text-xs truncate ${
                                          aktif ? 'font-bold text-teal-700' : 'text-slate-700'
                                        }`}
                                      >
                                        {o.nama}
                                      </span>
                                      <span className="block text-[9px] text-slate-400 truncate">
                                        {o.sub.namaPekerjaan}
                                      </span>
                                    </span>
                                    <span className="text-[9px] text-slate-400 flex-shrink-0">
                                      {o.sub.isLockedForPrint ? 'Terkunci' : 'Siap cetak'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ))
                        )}
                      </div>

                      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[9px] text-slate-400">
                        {jumlahTersaring} lokasi proyek di {branchTersaring.length} kota
                        {cariLokasi.trim() && ` · untuk "${cariLokasi.trim()}"`}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {subInfo ? (
                <>
                  <div className="rounded-2xl border border-slate-100 divide-y divide-slate-100">
                    {rincianTermin(subInfo).map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          {row.label}
                        </span>
                        <span className="flex items-baseline gap-2">
                          <span className="text-[10px] text-slate-400 tabular-nums">
                            {row.persen.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%
                          </span>
                          <span className="text-xs font-bold text-slate-800 tabular-nums">
                            {formatRupiah(row.nilai)}
                          </span>
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-50">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-700">
                        Total Nilai Pekerjaan
                      </span>
                      <span className="text-sm font-bold text-[#1a73e8] tabular-nums">
                        {formatRupiah(subInfo.nilaiPekerjaan)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center">
                  <p className="text-xs font-semibold text-slate-500">Belum ada data termin</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Data lokasi &quot;{selectedLokasi}&quot; belum tersedia
                  </p>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            {subInfo && (
              <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      subInfo.isLockedForPrint
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {subInfo.isLockedForPrint ? 'Terkunci' : 'Siap Cetak'}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate max-w-[180px]">
                    {subInfo.namaPekerjaan}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {subInfo.isLockedForPrint ? (
                    <button
                      onClick={() => onOpenEvidenModal(subInfo)}
                      className="text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-full shadow-sm transition-colors"
                    >
                      Upload Eviden
                    </button>
                  ) : (
                    <button
                      onClick={() => onOpenPrintModal(subInfo)}
                      className="text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-full shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak Berkas</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

        {/* Card 2: Visual Card (Col 2 - 4 columns, matching modern building visual card from screenshot) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-900 mb-3 group">
            {/* Visual infrastructure image */}
            <img
              src="https://images.unsplash.com/photo-1541888946425-d0fbb186156f?q=80&w=800&auto=format&fit=crop"
              alt="Site Proyek Telekomunikasi & Sipil"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
            
            {/* Overlay badge */}
            <div className="absolute bottom-3 left-3 right-3 text-white">
              <span className="text-[10px] font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full uppercase">
                {subInfo ? 'Progress Lapangan' : 'Lokasi Belum Terdata'}
              </span>
              <div className="text-sm font-bold mt-1 text-white leading-tight">
                {subInfo?.vendorPelaksana || 'Belum ada data lokasi'}
              </div>
              <div className="text-[11px] text-slate-300">
                PIC: {subInfo?.picProyek || '—'}
              </div>
            </div>
          </div>

          {/* SOP Dates Checklist */}
          {subInfo && (
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-xs flex flex-col gap-2">
              <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>Rangkaian Tanggal SOP:</span>
                <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full font-medium">Tervalidasi</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-600">
                  <span>BAKH (= SPK)</span>
                  <span className="font-semibold text-slate-800">{formatTanggalIndo(subInfo.tanggalBAKH)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>PP (+2 Hari SPK)</span>
                  <span className="font-semibold text-slate-800">{formatTanggalIndo(subInfo.tanggalPP)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Panjar (= PP)</span>
                  <span className="font-semibold text-slate-800">{formatTanggalIndo(subInfo.tanggalPengajuanPanjar)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Imprest Fund (+2 Hari Panjar)</span>
                  <span className="font-semibold text-slate-800">{formatTanggalIndo(subInfo.tanggalImprestFund)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 3: Donut Gauge & Ringkasan Antrian (Col 3 - 3 columns, matching 8.5k members orange donut chart from screenshot) */}
        <div className="lg:col-span-3 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Realisasi Dana IF</h4>
                <p className="text-xs text-slate-400">Pencairan Panjar Prelim Aktif</p>
              </div>

              {/* Small Avatars Stack like screenshot */}
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-teal-600 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
                  TA
                </div>
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
                  PM
                </div>
                <div className="w-6 h-6 rounded-full bg-slate-700 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
                  FIN
                </div>
              </div>
            </div>

            {/* Circular Arc Donut Chart matching the screenshot gauge */}
            <div className="flex flex-col items-center justify-center my-3">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background track circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#f1f5f9"
                    strokeWidth="9"
                    fill="transparent"
                  />
                  {/* Active orange arc gauge as in reference image */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#f59e0b"
                    strokeWidth="9"
                    strokeDasharray="251.2"
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>

                {/* Center text in donut */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    {arcPercentage}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                    Plafon IF
                  </span>
                </div>
              </div>
            </div>

            {/* Status Breakdown Pills */}
            <div className="space-y-1.5 text-xs pt-1">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Siap Cetak Berkas
                </span>
                <span className="font-bold text-slate-900">{readyToPrint}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Menunggu Eviden (j & k)
                </span>
                <span className="font-bold text-slate-900">{waitingEviden}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Selesai Diarsipkan
                </span>
                <span className="font-bold text-slate-900">{completed}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenAntrian}
            className="w-full mt-3 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Buka Antrian Pengajuan</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
