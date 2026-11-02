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
import bgImage from '../../backgournd.jpg';
import logoTa from '../../logo-ta.png';
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

  const subLokasiTerpilih = subPerLokasi.get(selectedLokasi) ?? null;

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

  // Proyek yang sedang ditunjuk pada dropdown lokasi.
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
      {/* 1. Indikator Kinerja Utama (KPI) — latar navy (backgournd.jpg) + kartu kaca biru */}
      <section
        aria-label="Indikator Kinerja Utama"
        className="rounded-3xl overflow-hidden ring-1 ring-blue-500/40 shadow-[0_8px_30px_rgba(2,8,23,0.5)] px-5 py-6"
        style={{
          backgroundImage: `linear-gradient(rgba(8,16,38,0.55), rgba(8,16,38,0.55)), url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <header className="text-center">
          <img src={logoTa} alt="Logo" className="mx-auto mb-3 h-10 w-auto max-w-full object-contain" />
          <h2 className="text-2xl font-semibold text-white tracking-tight">Indikator Kinerja Utama (KPI)</h2>
          <p className="mt-1.5 text-[13px] text-blue-200/80">Ringkasan metrik pertanggungan tingkat eksekutif.</p>
          <button
            onClick={onOpenInput}
            className="mt-3 text-xs font-semibold bg-blue-500 hover:bg-blue-400 text-white px-4 py-1.5 rounded-full shadow-lg shadow-blue-500/30 transition-colors"
          >
            + Buat Pengajuan Baru
          </button>
        </header>

        {/* Tiga kartu kaca biru — gaya referensi */}
        <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-[720px] mx-auto">
          {/* Total Uang Beredar */}
          <div
            className="relative flex flex-col items-center gap-2 text-center px-4 py-5 rounded-2xl bg-white/5 backdrop-blur-sm ring-1 ring-blue-400/30 shadow-[0_4px_18px_rgba(0,0,0,0.25)]"
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
            className="relative flex flex-col items-center gap-2 text-center px-4 py-5 rounded-2xl bg-white/5 backdrop-blur-sm ring-1 ring-blue-400/30 shadow-[0_4px_18px_rgba(0,0,0,0.25)]"
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
            className="relative flex flex-col items-center gap-2 text-center px-4 py-5 rounded-2xl bg-white/5 backdrop-blur-sm ring-1 ring-blue-400/30 shadow-[0_4px_18px_rgba(0,0,0,0.25)]"
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

      {/* 3. Bottom Half: 3 Distinct Cards (Matching the reference screenshot) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Card 1: Location & Operational Info (Col 1 - 5 columns) */}
          <div className="lg:col-span-5 rounded-3xl p-5 border border-blue-400/25 bg-[#0b1730]/80 backdrop-blur-md shadow-[0_10px_30px_rgba(2,8,23,0.45)] flex flex-col justify-between">
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
                    className="w-full flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-left text-white hover:bg-white/15 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#1a73e8] flex-shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        Lokasi Proyek
                      </span>
                      <span className="block text-xs font-bold text-white truncate">
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
                  <div className="rounded-2xl border border-white/10 divide-y divide-white/10">
                    {rincianTermin(subInfo).map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          {row.label}
                        </span>
                        <span className="flex items-baseline gap-2">
                          <span className="text-[10px] text-slate-500 tabular-nums">
                            {row.persen.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%
                          </span>
                          <span className="text-xs font-bold text-white tabular-nums">
                            {formatRupiah(row.nilai)}
                          </span>
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-3 px-3 py-2 bg-white/5">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-200">
                        Total Nilai Pekerjaan
                      </span>
                      <span className="text-sm font-bold text-[#1a73e8] tabular-nums">
                        {formatRupiah(subInfo.nilaiPekerjaan)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/20 px-4 py-8 text-center">
                  <p className="text-xs font-semibold text-slate-300">Belum ada data termin</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Data lokasi &quot;{selectedLokasi}&quot; belum tersedia
                  </p>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            {subInfo && (
              <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      subInfo.isLockedForPrint
                        ? 'bg-rose-500/15 text-rose-300'
                        : 'bg-emerald-500/15 text-emerald-300'
                    }`}
                  >
                    {subInfo.isLockedForPrint ? 'Terkunci' : 'Siap Cetak'}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[180px]">
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
                      className="text-xs font-semibold bg-blue-500 hover:bg-blue-400 text-white px-3.5 py-1.5 rounded-full shadow-sm transition-colors flex items-center gap-1.5"
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
        <div className="lg:col-span-4 rounded-3xl p-4 border border-blue-400/25 bg-[#0b1730]/80 backdrop-blur-md shadow-[0_10px_30px_rgba(2,8,23,0.45)] flex flex-col justify-between relative overflow-hidden">
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
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10 text-xs flex flex-col gap-2">
              <div className="text-[11px] font-bold text-slate-200 flex items-center justify-between">
                <span>Rangkaian Tanggal SOP:</span>
                <span className="text-[10px] text-teal-300 bg-teal-400/15 px-2 py-0.5 rounded-full font-medium">Tervalidasi</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span>BAKH (= SPK)</span>
                  <span className="font-semibold text-white">{formatTanggalIndo(subInfo.tanggalBAKH)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>PP (+2 Hari SPK)</span>
                  <span className="font-semibold text-white">{formatTanggalIndo(subInfo.tanggalPP)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Panjar (= PP)</span>
                  <span className="font-semibold text-white">{formatTanggalIndo(subInfo.tanggalPengajuanPanjar)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Imprest Fund (+2 Hari Panjar)</span>
                  <span className="font-semibold text-white">{formatTanggalIndo(subInfo.tanggalImprestFund)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 3: Donut Gauge & Ringkasan Antrian (Col 3 - 3 columns, matching 8.5k members orange donut chart from screenshot) */}
        <div className="lg:col-span-3 rounded-3xl p-5 border border-blue-400/25 bg-[#0b1730]/80 backdrop-blur-md shadow-[0_10px_30px_rgba(2,8,23,0.45)] flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-white">Realisasi Dana IF</h4>
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
                    stroke="#1e293b"
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
                  <span className="text-2xl font-black text-white tracking-tight">
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
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Siap Cetak Berkas
                </span>
                <span className="font-bold text-white">{readyToPrint}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Menunggu Eviden (j & k)
                </span>
                <span className="font-bold text-white">{waitingEviden}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Selesai Diarsipkan
                </span>
                <span className="font-bold text-white">{completed}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenAntrian}
            className="w-full mt-3 py-2 text-xs font-semibold text-teal-200 bg-teal-400/10 hover:bg-teal-400/20 border border-teal-400/30 rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Buka Antrian Pengajuan</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
