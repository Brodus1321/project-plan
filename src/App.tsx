/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db, lolosVerifikasi } from './db/storage';
import { ProjectSubmission, AmandemenRecord, ImprestFundEntry } from './types';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { InputPengajuanView } from './components/InputPengajuanView';
import { ListAntrianView } from './components/ListAntrianView';
import { AmandemenView } from './components/AmandemenView';
import { LaporanIFView } from './components/LaporanIFView';
import { UploadEvidenModal } from './components/UploadEvidenModal';
import { PrintDocumentModal } from './components/PrintDocumentModal';
import { SopInfoModal } from './components/SopInfoModal';
import { KurvaSChart } from './components/KurvaSChart';
import { VerifikasiView } from './components/VerifikasiView';
import { LoginView } from './components/LoginView';
import { getSession, logout, SessionUser } from './auth';
import { X, Layers } from 'lucide-react';
import bgVideo from '../11.mp4';

export default function App() {
  const [session, setSession] = useState<SessionUser | null>(getSession());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  
  // Data states from DB
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [amandemenList, setAmandemenList] = useState<AmandemenRecord[]>([]);
  const [ifEntries, setIfEntries] = useState<ImprestFundEntry[]>([]);

  // Search & Global Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegional, setSelectedRegional] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modals state
  const [evidenModalSub, setEvidenModalSub] = useState<ProjectSubmission | null>(null);
  const [printModalSub, setPrintModalSub] = useState<ProjectSubmission | null>(null);
  const [kurvaModalSub, setKurvaModalSub] = useState<ProjectSubmission | null>(null);
  const [isSopModalOpen, setIsSopModalOpen] = useState(false);

  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Load initial data
  const refreshData = () => {
    setSubmissions(db.getSubmissions());
    setAmandemenList(db.getAmandemen());
    setIfEntries(db.getIFEntries());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Filter submissions by global search & filters
  const filteredSubmissions = submissions.filter(sub => {
    const matchRegional = selectedRegional === 'ALL' || sub.regional === selectedRegional;
    let matchStatus = true;
    if (selectedStatus !== 'ALL') {
      if (selectedStatus === 'SIAP_CETAK') {
        matchStatus = !sub.isLockedForPrint && lolosVerifikasi(sub);
      } else if (selectedStatus === 'MENUNGGU_EVIDEN') {
        matchStatus = sub.isLockedForPrint && lolosVerifikasi(sub);
      } else if (selectedStatus === 'MENUNGGU_VERIFIKASI') {
        matchStatus = sub.verifikasiStatus === 'MENUNGGU';
      } else if (selectedStatus === 'REVISI_ADMIN') {
        matchStatus = sub.verifikasiStatus === 'REVISI';
      } else {
        matchStatus = sub.status === selectedStatus;
      }
    }

    const query = searchQuery.toLowerCase().trim();
    const matchSearch = query === '' ||
      (sub.nomorSPK ?? '').toLowerCase().includes(query) ||
      (sub.nomorPP ?? '').toLowerCase().includes(query) ||
      (sub.namaPekerjaan ?? '').toLowerCase().includes(query) ||
      (sub.vendorPelaksana ?? '').toLowerCase().includes(query) ||
      (sub.namaPenerimaPrelim ?? '').toLowerCase().includes(query);

    return matchRegional && matchStatus && matchSearch;
  });

  // Action handlers
  const handleCreateSubmission = (newPayload: any) => {
    const created = db.createSubmission(newPayload);
    refreshData();
    setActiveTab('antrian');
    showToast(`Pengajuan SPK ${created.nomorSPK} berhasil diterbitkan! Alur digital telah aktif.`);
  };

  const handleSaveEviden = (
    submissionId: string, 
    buktiTransfer: { fileName: string; fileSize: string }, 
    serahTerima: { fileName: string; fileSize: string }
  ) => {
    const sub = db.getSubmissionById(submissionId);
    if (!sub) return;

    db.uploadDocument(submissionId, 'buktiTransferTA', buktiTransfer);
    db.uploadDocument(submissionId, 'evidenSerahTerimaPrelim', serahTerima);

    // Also update submission status
    db.updateSubmission(submissionId, {
      status: 'SIAP_CETAK',
      isLockedForPrint: false,
    });

    refreshData();
    showToast(`Eviden Transfer dan Serah Terima berhasil diverifikasi! Berkas ${sub.nomorSPK} kini Siap Dicetak.`);
  };

  const handleQuickSimulateEviden = (subId: string) => {
    const sub = db.getSubmissionById(subId);
    if (!sub) return;

    db.uploadDocument(subId, 'buktiTransferTA', {
      fileName: `Bukti_Transfer_Mandiri_${sub.nomorSPK.slice(-4)}.pdf`,
      fileSize: '750 KB',
    });
    db.uploadDocument(subId, 'evidenSerahTerimaPrelim', {
      fileName: `Eviden_SerahTerima_Signed_${sub.nomorSPK.slice(-4)}.jpg`,
      fileSize: '1.8 MB',
    });

    db.updateSubmission(subId, {
      status: 'SIAP_CETAK',
      isLockedForPrint: false,
    });

    refreshData();
    showToast(`Simulasi berhasil! Dokumen SPK ${sub.nomorSPK} kini terbuka untuk dicetak.`);
  };

  const handleCreateAmandemen = (payload: any, updatedSubData?: any) => {
    db.createAmandemen(payload);
    if (updatedSubData && payload.submissionId) {
      db.updateSubmission(payload.submissionId, updatedSubData);
    }
    refreshData();
    showToast(`Amandemen ${payload.nomorAmandemen} berhasil disimpan dan disetujui!`);
  };

  const handleAddIFEntry = (entry: any) => {
    db.createIFEntry(entry);
    refreshData();
    showToast('Transaksi Imprest Fund berhasil dicatatkan dalam buku kas!');
  };

  const handleResetData = () => {
    if (confirm('Apakah Anda yakin ingin mereset seluruh data kembali ke setelan default awal?')) {
      db.resetAllData();
      refreshData();
      showToast('Seluruh data berhasil di-reset ke nilai default demo!');
    }
  };

  const pendingEvidenCount = submissions.filter(s => s.isLockedForPrint && lolosVerifikasi(s)).length;
  const menungguVerifCount = submissions.filter(s => s.verifikasiStatus === 'MENUNGGU').length;
  const revisiAdminCount = submissions.filter(s => s.verifikasiStatus === 'REVISI').length;

  // Gerbang login: layar login tampil sebelum sesi ada.
  if (!session) {
    return <LoginView onLoginSuccess={setSession} />;
  }

  // Tab yang butuh role tertentu dijaga di sini juga, bukan hanya di Sidebar,
  // supaya URL/tab lama tidak menampilkan halaman yang bukan hak user.
  const tabValid: ActiveTab =
    (activeTab === 'input' && session.role !== 'ADMIN') ||
    (activeTab === 'verifikasi' && session.role !== 'VERIFIKATOR')
      ? 'dashboard'
      : activeTab;

  const handleLogout = () => {
    logout();
    setSession(null);
    setActiveTab('dashboard');
  };

  return (
    <div
      className="relative isolate min-h-screen w-full p-2 sm:p-4 md:p-6 lg:p-8 flex items-center justify-center font-['Plus_Jakarta_Sans',sans-serif]"
      style={{ backgroundColor: '#6b1220' }}
    >
      <video
        className="fixed inset-0 -z-10 h-full w-full object-cover"
        src={bgVideo}
        autoPlay
        muted
        loop
        playsInline
      />
      {/* Outer Floating Main Application Frame (matches user's uploaded image) */}
      <div className="w-full max-w-7xl bg-white/95 backdrop-blur-xl rounded-[28px] md:rounded-[36px] shadow-2xl border border-white/70 overflow-hidden flex flex-col md:flex-row min-h-[820px] transition-all duration-300">
        
        {/* Left Column Sidebar */}
        <Sidebar
          activeTab={tabValid}
          setActiveTab={setActiveTab}
          onOpenSop={() => setIsSopModalOpen(true)}
          onResetData={handleResetData}
          pendingEvidenCount={pendingEvidenCount}
          role={session.role}
          userName={session.nama}
          onLogout={handleLogout}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
          {/* Top Bar Header */}
          <Header
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedRegional={selectedRegional}
            setSelectedRegional={setSelectedRegional}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            submissions={submissions}
            onOpenSop={() => setIsSopModalOpen(true)}
          />

          {/* Toast Notification Alert */}
          {toastMessage && (
            <div className="my-2 p-3 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-lg border border-slate-700 flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>{toastMessage}</span>
              </div>
              <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
          )}

          {/* Viewport for Active Interface */}
          <main className="flex-1 overflow-y-auto pt-4 pr-1">
            {/* 1. DASHBOARD */}
            {tabValid === 'dashboard' && (
              <DashboardView
                submissions={filteredSubmissions.length > 0 ? filteredSubmissions : submissions}
                onSelectSubmission={(sub) => {
                  setPrintModalSub(sub);
                }}
                onOpenInput={() => setActiveTab('input')}
                onOpenAntrian={() => setActiveTab('antrian')}
                onOpenEvidenModal={(sub) => setEvidenModalSub(sub)}
                onOpenPrintModal={(sub) => setPrintModalSub(sub)}
              />
            )}

            {/* 2. INPUT PENGAJUAN */}
            {tabValid === 'input' && (
              <InputPengajuanView
                onSubmitSuccess={handleCreateSubmission}
                onCancel={() => setActiveTab('dashboard')}
              />
            )}

            {/* 3. LIST ANTRIAN PENGAJUAN */}
            {tabValid === 'antrian' && (
              <ListAntrianView
                submissions={filteredSubmissions.length > 0 ? filteredSubmissions : submissions}
                onOpenEvidenModal={(sub) => setEvidenModalSub(sub)}
                onOpenPrintModal={(sub) => setPrintModalSub(sub)}
                onOpenKurvaModal={(sub) => setKurvaModalSub(sub)}
                onQuickSimulateEviden={handleQuickSimulateEviden}
              />
            )}

            {/* 4. AMANDEMEN PENGAJUAN */}
            {tabValid === 'amandemen' && (
              <AmandemenView
                submissions={submissions}
                amandemenList={amandemenList}
                onCreateAmandemen={handleCreateAmandemen}
              />
            )}

            {/* 5. LAPORAN IF */}
            {tabValid === 'laporan_if' && (
              <LaporanIFView
                entries={ifEntries}
                submissions={submissions}
                onAddEntry={handleAddIFEntry}
              />
            )}

            {/* 6. VERIFIKASI (khusus VERIFIKATOR) */}
            {tabValid === 'verifikasi' && (
              <VerifikasiView onClose={() => setActiveTab('dashboard')} />
            )}
          </main>
        </div>
      </div>

      {/* MODAL 1: Upload Eviden Transfer & Serah Terima (k & l) */}
      {evidenModalSub && (
        <UploadEvidenModal
          submission={evidenModalSub}
          onClose={() => setEvidenModalSub(null)}
          onSaveEviden={handleSaveEviden}
        />
      )}

      {/* MODAL 2: Print & Document Bundle Generator (unduh terkunci sampai verifikasi) */}
      {printModalSub && (
        <PrintDocumentModal
          submission={printModalSub}
          onClose={() => setPrintModalSub(null)}
          allowDownload={lolosVerifikasi(printModalSub)}
        />
      )}

      {/* MODAL 3: SOP Alur Berkas Information */}
      {isSopModalOpen && (
        <SopInfoModal
          onClose={() => setIsSopModalOpen(false)}
        />
      )}

      {/* MODAL 4: Kurva S Detail View */}
      {kurvaModalSub && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-800 text-white flex items-center justify-center">
                  <Layers className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Kurva S Pekerjaan Proyek</h3>
                  <p className="text-xs text-slate-500 font-mono">{kurvaModalSub.nomorSPK}</p>
                </div>
              </div>
              <button
                onClick={() => setKurvaModalSub(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-1">
              <div className="text-xs text-slate-600 mb-3 bg-teal-50/60 p-3 rounded-2xl border border-teal-200/80">
                <strong>Ketentuan Kurva S:</strong> Tanggal mulai kerja dimulai <strong>H+1 setelah Tgl Surat SPK</strong> (<strong>{kurvaModalSub.tanggalMulaiKerja}</strong>) mengikuti durasi full pekerjaan (<strong>{kurvaModalSub.durasiKerjaHari} Hari</strong>) sesuai distribusi Kurva S di dokumen PP.
              </div>

              <KurvaSChart
                data={kurvaModalSub.kurvaSData}
                durasiHari={kurvaModalSub.durasiKerjaHari}
                compact={false}
              />
            </div>

            <div className="flex justify-end pt-4 mt-2 border-t border-slate-100">
              <button
                onClick={() => setKurvaModalSub(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
