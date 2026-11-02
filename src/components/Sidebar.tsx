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

  /**
   * Gaya baris menu meniru web-bogor: teks putih transparan, dan menu aktif
   * menjadi kartu putih dengan ikon merah (#C62828). Handler tetap sama.
   */
  const navRowClass = (isActive: boolean, hasBadge?: boolean) =>
    [
      'relative flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors',
      isActive
        ? 'bg-white text-[#263238] shadow-sm'
        : 'text-white/90 hover:bg-white/10 hover:text-white',
      hasBadge ? 'pr-8' : '',
    ].join(' ');

  const footRowClass =
    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[10px] font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white';

  return (
    <aside className="w-[170px] flex-shrink-0 overflow-hidden bg-gradient-to-b from-[#B71C1C] via-[#D32F2F] to-[#A31515] text-white select-none">
      <div className="flex h-full flex-col overflow-y-auto px-3 py-4">
        {/* Brand — tombol menuju Dashboard, teks & handler tetap sama */}
        <button
          onClick={() => setActiveTab('dashboard')}
          title="PROPERE - Dashboard Proyek"
          className="mb-4 flex items-center gap-2.5 rounded-lg px-1 py-1 text-left transition-opacity hover:opacity-90"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
            <span className="grid grid-cols-2 gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
              <span className="h-1.5 w-1.5 rounded-full bg-teal-300"></span>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300"></span>
              <span className="h-1.5 w-1.5 rounded-full bg-white/70"></span>
            </span>
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[12px] font-semibold leading-tight tracking-wide text-white">
              PROPERE
            </span>
            <span className="text-[9px] leading-tight text-white/75">Project Prelim</span>
          </span>
        </button>

        {/* Menu utama — daftar menu, badge, dan handler tetap sama */}
        <nav className="flex flex-1 flex-col gap-[3px]">
          {navItems.map(item => {
            const isHidden = item.hidden;
            if (isHidden) return null;
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={navRowClass(isActive, item.badge !== undefined)}
              >
                <Icon
                  className={`mt-px h-4 w-4 shrink-0 ${isActive ? 'text-[#C62828]' : ''}`}
                  strokeWidth={isActive ? 2.1 : 1.8}
                />
                <span className="min-w-0 flex-1 text-left text-[10px] font-medium leading-tight">
                  {item.label}
                </span>
                {item.badge !== undefined && (
                  <span
                    className={`absolute right-1.5 top-1 min-w-[16px] rounded-full bg-rose-500 px-1 text-center text-[9px] font-bold leading-4 text-white ring-2 ${
                      isActive ? 'ring-white' : 'ring-white/50'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Aksi bawah — tombol & handler tetap sama */}
        <div className="mt-3 flex flex-col gap-[3px] border-t border-white/20 pt-3">
          <button
            onClick={onOpenSop}
            title="Petunjuk SOP & Alur Berkas"
            className={footRowClass}
          >
            <Info className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
            <span>Petunjuk SOP</span>
          </button>

          {role === 'ADMIN' && (
            <>
              <button
                onClick={onClearAntrianData}
                title="Hapus Semua Data Antrian"
                className={footRowClass}
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                <span>Hapus Antrian</span>
              </button>

              <button
                onClick={onResetData}
                title="Reset Data Demo"
                className={footRowClass}
              >
                <RotateCcw className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                <span>Reset Data</span>
              </button>
            </>
          )}

          {role && userName && (
            <div
              title={`${userName} (${role})`}
              className="mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#C62828] ring-2 ring-white/40">
                {userName.substring(0, 2).toUpperCase()}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[10px] font-semibold leading-tight text-white">
                  {userName}
                </span>
                <span className="text-[8px] uppercase leading-tight tracking-wider text-white/70">
                  {role}
                </span>
              </span>
            </div>
          )}

          {!role && (
            <button
              onClick={() => setActiveTab('dashboard')}
              title="Login sebagai Admin atau Verifikator"
              className={footRowClass}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
              <span>Login</span>
            </button>
          )}

          <button
            onClick={onLogout}
            title="Keluar Aplikasi"
            className={footRowClass}
          >
            <Lock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
            <span>Keluar</span>
          </button>

          <p className="pt-2 text-center text-[8px] text-white/60">PT Telkom Akses</p>
        </div>
      </div>
    </aside>
  );
};
