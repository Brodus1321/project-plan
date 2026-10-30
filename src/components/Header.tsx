import React from 'react';
import { Search, Filter, ShieldCheck, ChevronDown, Bell, Sparkles } from 'lucide-react';
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
    <header className="flex flex-col gap-3 pb-3 border-b border-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search bar matching screenshot: rounded, clean input with search icon */}
        <div className="flex-1 min-w-[260px] max-w-md relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari No. SPK, No. PP, Proyek, Vendor..."
            className="w-full pl-10 pr-4 py-2 bg-slate-100/90 hover:bg-slate-100 focus:bg-white text-xs font-medium text-slate-800 rounded-full border border-transparent focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none transition-all placeholder:text-slate-400 shadow-sm"
          />
        </div>

        {/* Dropdown Filters (matching screenshot pill selects) */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Status filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              aria-label="Filter status berkas"
              className="appearance-none bg-slate-100/80 hover:bg-slate-100 text-slate-700 font-medium pl-3 pr-7 py-1.5 rounded-full border border-slate-200/60 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="SIAP_CETAK">Siap Cetak (Eviden Lengkap)</option>
              <option value="MENUNGGU_EVIDEN">Menunggu Eviden</option>
              <option value="KIRIM_DIGITAL">Kirim Digital</option>
              <option value="VERIFIKASI_ADMIN">Verifikasi Admin</option>
              <option value="SELESAI">Selesai</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Regional filter */}
          <div className="relative">
            <select
              value={selectedRegional}
              onChange={e => setSelectedRegional(e.target.value)}
              aria-label="Filter regional proyek"
              className="appearance-none bg-slate-100/80 hover:bg-slate-100 text-slate-700 font-medium pl-3 pr-7 py-1.5 rounded-full border border-slate-200/60 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
            >
              <option value="ALL">Semua Regional</option>
              <option value="Regional Jawa Barat">Jawa Barat</option>
              <option value="Regional Jawa Tengah">Jawa Tengah</option>
              <option value="Regional Jawa Timur">Jawa Timur</option>
              <option value="Regional DKI Jakarta & Banten">DKI Jakarta & Banten</option>
              <option value="Regional Luar Jawa">Luar Jawa</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* SOP Alur Badge Button */}
          <button
            onClick={onOpenSop}
            className="flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-medium px-3 py-1.5 rounded-full transition-colors border border-teal-200/60"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Alur Berkas Prelim (SOP)</span>
          </button>
        </div>
      </div>

      {/* Floating Highlight Metrics Pill (Exact match to the black badge in the screenshot) */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">MIE II</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Sistem Aktif</span>
        </div>

        {/* Floating pill badge like screenshot */}
        <div className="inline-flex items-center bg-slate-950 text-white rounded-full p-1.5 px-3 shadow-lg border border-slate-800 text-xs">
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
