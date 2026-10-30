import React from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  FileStack, 
  FileEdit, 
  WalletCards,
  Info,
  RotateCcw,
  Trash2,
  Sparkles,
  ShieldCheck,
  Lock,
} from 'lucide-react';

export type ActiveTab = 'dashboard' | 'input' | 'antrian' | 'amandemen' | 'laporan_if' | 'verifikasi';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenSop: () => void;
  onResetData: () => void;
  onClearAntrianData: () => void;
  pendingEvidenCount: number;
  role?: 'ADMIN' | 'VERIFIKATOR';
  userName?: string;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSop,
  onResetData,
  onClearAntrianData,
  pendingEvidenCount,
  role,
  userName,
  onLogout,
}) => {
  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: '1. Dashboard',
      icon: LayoutDashboard,
      tooltip: 'Dashboard Ringkasan Proyek & Peta',
    },
    {
      id: 'input' as ActiveTab,
      label: '2. Input Pengajuan',
      icon: PlusCircle,
      tooltip: 'Input Pengajuan Baru & Hitung SOP Tanggal',
      hidden: role !== 'ADMIN',
    },
    {
      id: 'antrian' as ActiveTab,
      label: '3. List Antrian Pengajuan',
      icon: FileStack,
      badge: pendingEvidenCount > 0 ? pendingEvidenCount : undefined,
      tooltip: 'List Antrian, Upload Eviden & Cetak Berkas',
    },
    {
      id: 'amandemen' as ActiveTab,
      label: '4. Amandemen Pengajuan',
      icon: FileEdit,
      tooltip: 'Amandemen SPK, Waktu & Kurva S',
    },
    {
      id: 'laporan_if' as ActiveTab,
      label: '5. Laporan IF',
      icon: WalletCards,
      tooltip: 'Laporan Imprest Fund & Rekap Buku Kas',
    },
    {
      id: 'verifikasi' as ActiveTab,
      label: '6. Verifikasi',
      icon: ShieldCheck,
      tooltip: 'Setujui atau kirim revisi pengajuan',
      hidden: role !== 'VERIFIKATOR',
    },
  ];

  const getButtonClassName = (isActive: boolean) => {
    if (isActive) {
      return 'relative w-11 h-11 rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/25 ring-1 ring-slate-900/10 flex items-center justify-center transition-all';
    }
    return 'relative w-11 h-11 rounded-2xl text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-slate-200 flex items-center justify-center transition-all';
  };

  const iconButtonClass =
    'w-10 h-10 rounded-2xl flex items-center justify-center transition-colors';

  return (
    <aside className="w-18 md:w-20 flex-shrink-0 flex flex-col items-center justify-between py-6 px-2 border-r border-slate-100 select-none">
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => setActiveTab('dashboard')}
          title="PROPERE - Dashboard Proyek"
          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center shadow-lg shadow-slate-900/30 ring-1 ring-white/10 hover:scale-105 active:scale-95 transition-transform"
        >
          <div className="grid grid-cols-2 gap-1">
            <span className="w-2 h-2 rounded-full bg-white"></span>
            <span className="w-2 h-2 rounded-full bg-teal-400"></span>
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="w-2 h-2 rounded-full bg-white/70"></span>
          </div>
        </button>
        <span className="hidden md:block text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
          PROPERE
        </span>
      </div>

      <nav className="flex flex-col items-center gap-1.5 bg-slate-100/70 p-1.5 rounded-3xl border border-slate-200/70 shadow-inner">
        {navItems.map(item => {
          const isHidden = item.hidden;
          if (isHidden) return null;
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div key={item.id} className="relative group">
              <button
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={getButtonClassName(isActive)}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.1 : 1.8} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-[18px] text-center ring-2 ring-slate-100">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute -left-[9px] top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-teal-500" />
                )}
              </button>

              <div className="absolute left-14 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-50 pointer-events-none">
                <div className="bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-xl shadow-xl whitespace-nowrap border border-slate-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                  {item.label}
                </div>
                <span className="w-2 h-2 -ml-1 rotate-45 bg-slate-900 border-r border-b border-slate-700"></span>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onOpenSop}
          title="Petunjuk SOP & Alur Berkas"
          className={`${iconButtonClass} text-slate-400 hover:text-teal-700 hover:bg-teal-50`}
        >
          <Info className="w-5 h-5" strokeWidth={1.8} />
        </button>

        {role === 'ADMIN' && (
          <>
            <button
              onClick={onClearAntrianData}
              title="Hapus Semua Data Antrian"
              className={`${iconButtonClass} text-slate-400 hover:text-rose-600 hover:bg-rose-50`}
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.8} />
            </button>

            <button
              onClick={onResetData}
              title="Reset Data Demo"
              className={`${iconButtonClass} text-slate-400 hover:text-rose-600 hover:bg-rose-50`}
            >
              <RotateCcw className="w-4 h-4" strokeWidth={1.8} />
            </button>
          </>
        )}

        {role && userName && (
          <div
            title={`${userName} (${role})`}
            className="mt-1 w-10 h-10 rounded-full bg-gradient-to-tr from-teal-700 to-emerald-500 text-white text-xs font-bold flex items-center justify-center shadow-md ring-2 ring-white cursor-pointer"
          >
            {userName.substring(0, 2).toUpperCase()}
          </div>
        )}

        {!role && (
          <button
            onClick={() => setActiveTab('dashboard')}
            title="Login sebagai Admin atau Verifikator"
            className={`${iconButtonClass} text-slate-400 hover:text-teal-700 hover:bg-teal-50`}
          >
            <Sparkles className="w-4 h-4" strokeWidth={1.8} />
          </button>
        )}

        <button
          onClick={onLogout}
          title="Keluar Aplikasi"
          className={`${iconButtonClass} text-slate-400 hover:text-rose-600 hover:bg-rose-50`}
        >
          <Lock className="w-4 h-4" strokeWidth={1.8} />
        </button>
      </div>
    </aside>
  );
};