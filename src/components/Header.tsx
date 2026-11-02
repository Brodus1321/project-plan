import React from 'react';
import { Search, ShieldCheck, ChevronDown } from 'lucide-react';
import { formatRupiah } from '../db/storage';
import { ProjectSubmission } from '../types';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedRegional: string;
  setSelectedRegional: (r: string) => void;
  selectedStatus: string;
  setSelectedStatus: (s: string) => void;
  submissions: ProjectSubmission[];
  onOpenSop: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  selectedRegional,
  setSelectedRegional,
  selectedStatus,
  setSelectedStatus,
  submissions,
  onOpenSop,
}) => {
  // Compute floating metrics pill
  const totalSubmissions = submissions.length;
  const totalNilaiKontrak = submissions.reduce((acc, curr) => acc + (curr.nilaiPekerjaan || 0), 0);
  const totalPanjarPrelim = submissions.reduce((acc, curr) => acc + (curr.nilaiPrelimPanjar || 0), 0);
  const siapCetakCount = submissions.filter(s => !s.isLockedForPrint).length;

  return (
    <header className="relative shrink-0 overflow-hidden bg-gradient-to-b from-[#B71C1C] to-[#C62828] px-4 py-3.5 text-white shadow-[0_10px_26px_rgba(15,23,42,0.18)] md:px-6">
      {/* Baris judul — meniru brand topbar web-bogor */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/20 pb-2.5">
        <div className="flex min-w-0 flex-col">
          <span className="text-[12px] font-semibold leading-tight tracking-wide text-white">
            PROPERE
          </span>
          <span className="text-[9px] leading-tight text-white/80">
            Project Prelim — PT Telkom Akses
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/85">MIE II</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[11px] font-medium text-emerald-100 bg-emerald-400/15 border border-emerald-300/40 px-2 py-0.5 rounded-full">Sistem Aktif</span>
        </div>
      </div>

      {/* Baris kontrol — pencarian, filter, SOP, dan ringkasan angka tetap sama */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[240px] flex-1 flex-wrap items-center gap-2">
          {/* Search bar */}
          <div className="flex-1 min-w-[220px] max-w-md relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari No. SPK, No. PP, Proyek, Vendor..."
              className="w-full pl-10 pr-4 py-2 bg-white text-xs font-medium text-slate-800 rounded-full border border-white/50 focus:border-white focus:ring-2 focus:ring-white/30 focus:outline-none transition-all placeholder:text-slate-400 shadow-sm"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            {/* Status filter */}
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                aria-label="Filter status berkas"
                className="appearance-none bg-white hover:bg-slate-50 text-slate-700 font-medium pl-3 pr-7 py-1.5 rounded-full border border-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="SIAP_CETAK">Siap Cetak (Eviden Lengkap)</option>
                <option value="MENUNGGU_EVIDEN">Menunggu Eviden</option>
                <option value="KIRIM_DIGITAL">Kirim Digital</option>
                <option value="VERIFIKASI_ADMIN">Verifikasi Admin</option>
                <option value="SELESAI">Selesai</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Regional filter */}
            <div className="relative">
              <select
                value={selectedRegional}
                onChange={e => setSelectedRegional(e.target.value)}
                aria-label="Filter regional proyek"
                className="appearance-none bg-white hover:bg-slate-50 text-slate-700 font-medium pl-3 pr-7 py-1.5 rounded-full border border-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer"
              >
                <option value="ALL">Semua Regional</option>
                <option value="Regional Jawa Barat">Jawa Barat</option>
                <option value="Regional Jawa Tengah">Jawa Tengah</option>
                <option value="Regional Jawa Timur">Jawa Timur</option>
                <option value="Regional DKI Jakarta & Banten">DKI Jakarta & Banten</option>
                <option value="Regional Luar Jawa">Luar Jawa</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* SOP Alur Badge Button */}
            <button
              onClick={onOpenSop}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white font-medium px-3 py-1.5 rounded-full transition-colors border border-white/30"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
              <span>Alur Berkas Prelim (SOP)</span>
            </button>
          </div>
        </div>

        {/* Floating Highlight Metrics Pill — isi & fungsi tetap sama */}
        <div className="ml-auto inline-flex items-center bg-slate-950 text-white rounded-full p-1.5 px-3 shadow-lg border border-slate-800 text-xs">
          {/* Section 1 */}
          <div className="flex items-center gap-2 px-3 border-r border-slate-800">
            <span className="text-base font-extrabold text-amber-400">{totalSubmissions}</span>
            <span className="text-[10px] text-slate-400 leading-tight uppercase font-medium">Pengajuan<br />Aktif</span>
          </div>

          {/* Section 2 */}
          <div className="flex items-center gap-2 px-3 border-r border-slate-800">
            <span className="text-sm font-bold text-white tracking-tight">{formatRupiah(totalNilaiKontrak)}</span>
            <span className="text-[10px] text-slate-400 leading-tight uppercase font-medium">Total Nilai<br />Pekerjaan</span>
          </div>

          {/* Section 3 */}
          <div className="flex items-center gap-2 px-3 border-r border-slate-800">
            <span className="text-sm font-bold text-emerald-400 tracking-tight">{formatRupiah(totalPanjarPrelim)}</span>
            <span className="text-[10px] text-slate-400 leading-tight uppercase font-medium">Panjar IF<br />Prelim</span>
          </div>

          {/* Section 4 */}
          <div className="flex items-center gap-2 px-3">
            <span className="text-base font-extrabold text-teal-300">{siapCetakCount}</span>
            <span className="text-[10px] text-slate-400 leading-tight uppercase font-medium">Siap<br />Cetak</span>
          </div>
        </div>
      </div>
    </header>
  );
};
