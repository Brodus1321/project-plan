import React, { useEffect, useState } from 'react';
import { ProjectSubmission } from '../types';
import { formatRupiah, formatTanggalIndo, db } from '../db/storage';
import { berkasLabel, berkasLabelByKey, BERKAS_PRELIM } from '../db/berkas';
import { KurvaSChart } from './KurvaSChart';
import { 
  FileStack, 
  Search, 
  Filter, 
  Printer, 
  Lock, 
  Unlock, 
  Upload, 
  CheckCircle2, 
  Clock, 
  Eye, 
  FileText, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  ArrowUpDown
} from 'lucide-react';

interface ListAntrianViewProps {
  submissions: ProjectSubmission[];
  onOpenEvidenModal: (sub: ProjectSubmission) => void;
  onOpenPrintModal: (sub: ProjectSubmission) => void;
  onOpenKurvaModal: (sub: ProjectSubmission) => void;
  onQuickSimulateEviden: (subId: string) => void;
}

/** Label & warna badge status pengajuan untuk tabel antrian. */
const STATUS_BADGE: Record<ProjectSubmission['status'], { label: string; cls: string }> = {
  DRAFT: { label: 'Draft', cls: 'bg-violet-100 text-violet-800 border-violet-200' },
  MENUNGGU_VERIFIKASI: { label: 'Menunggu Verifikasi', cls: 'bg-sky-100 text-sky-800 border-sky-200' },
  REVISI_ADMIN: { label: 'Revisi Admin', cls: 'bg-rose-100 text-rose-700 border-rose-200' },
  VERIFIKASI_ADMIN: { label: 'Verifikasi Admin', cls: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  KIRIM_DIGITAL: { label: 'Kirim Digital', cls: 'bg-teal-100 text-teal-800 border-teal-200' },
  MENUNGGU_EVIDEN: { label: 'Menunggu Eviden', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  SIAP_CETAK: { label: 'Siap Cetak', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  SELESAI: { label: 'Selesai', cls: 'bg-slate-200 text-slate-700 border-slate-300' },
};

export const ListAntrianView: React.FC<ListAntrianViewProps> = ({
  submissions,
  onOpenEvidenModal,
  onOpenPrintModal,
  onOpenKurvaModal,
  onQuickSimulateEviden,
}) => {
  const [filterTab, setFilterTab] = useState<'ALL' | 'SIAP_CETAK' | 'MENUNGGU_EVIDEN' | 'KIRIM_DIGITAL' | 'SELESAI' | 'DRAFT'>('ALL');
  const [searchLocal, setSearchLocal] = useState('');
  const [selectedSubDetail, setSelectedSubDetail] = useState<ProjectSubmission | null>(submissions[0] || null);
  const [draftMetadata, setDraftMetadata] = useState<Array<{ id: string; nomorSPK: string; namaPekerjaan: string; createdAt: string; updatedAt: string; status: 'DRAFT' }>>([]);

  // Load draft metadata
  useEffect(() => {
    setDraftMetadata(db.getDraftMetadata());
  }, []);

  // Panel detail harus tetap terisi walau komponen ter-mount saat data masih
  // kosong (render pertama) — pilih pengajuan pertama begitu data tersedia.
  useEffect(() => {
    if (!selectedSubDetail || !submissions.some(s => s.id === selectedSubDetail.id)) {
      setSelectedSubDetail(submissions[0] ?? null);
    }
  }, [submissions, selectedSubDetail]);

  /**
   * Nama file dokumen identitas penerima (berkas i1/i2/i3).
   * Data lama di localStorage masih memakai kunci gabungan
   * `ktpNpwpBukuRekening` — bila kunci baru belum ada, tampilkan file
   * gabungan itu agar riwayat pengajuan lama tidak kosong.
   */
  const fileIdentitas = (key: 'ktp' | 'npwp' | 'bukuRekening'): string => {
    const docs = selectedSubDetail?.dokumen as
      | Record<string, { fileName?: string } | undefined>
      | undefined;
    return docs?.[key]?.fileName ?? docs?.ktpNpwpBukuRekening?.fileName ?? '';
  };

  // Convert draft metadata ke format display
  interface DraftMeta {
    id: string;
    nomorSPK: string;
    namaPekerjaan: string;
    createdAt: string;
    updatedAt: string;
    status: 'DRAFT';
  }
  type AntrianItem =
    | (ProjectSubmission & { _isDraft: false })
    | (DraftMeta & { _isDraft: true });

  const draftItems: AntrianItem[] = draftMetadata.map(d => ({
    ...d,
    _isDraft: true,
  }));

  // Combine submissions + drafts
  const allItems: AntrianItem[] = [
    ...draftItems,
    ...submissions.map(s => ({ ...s, _isDraft: false } as ProjectSubmission & { _isDraft: false })),
  ];

  const filteredList = allItems.filter(item => {
    const matchFilter = 
      filterTab === 'ALL' ? true :
      filterTab === 'DRAFT' ? item._isDraft :
      !item._isDraft && (
        filterTab === 'SIAP_CETAK' ? !item.isLockedForPrint :
        filterTab === 'MENUNGGU_EVIDEN' ? item.isLockedForPrint :
        item.status === filterTab
      );

    const q = searchLocal.toLowerCase();
    const matchSearch = searchLocal === '' ||
      (item.nomorSPK ?? '').toLowerCase().includes(q) ||
      (item.namaPekerjaan ?? '').toLowerCase().includes(q) ||
      (!item._isDraft && ((item.nomorPP ?? '').toLowerCase().includes(q) ||
        (item.namaPenerimaPrelim ?? '').toLowerCase().includes(q) ||
        (item.vendorPelaksana ?? '').toLowerCase().includes(q)));

    return matchFilter && matchSearch;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Top Banner Alert regarding the specific rule */}
      <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200/80 text-amber-900 text-xs flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Aturan Cetak Berkas Prelim:</strong> Seluruh berkas baru terbuka untuk diprint setelah <strong>Eviden Bukti Transfer dari TA ke Penerima</strong> dan <strong>Evidence Serah Terima Prelim</strong> telah masuk ke sistem.
          </span>
        </div>
        <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-full">
          {submissions.filter(s => !s.isLockedForPrint).length} dari {submissions.length} Berkas Siap Cetak
        </span>
      </div>

      {/* Filter Tabs & Local Search */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
              filterTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Semua Antrian ({allItems.length})
          </button>

          <button
            onClick={() => setFilterTab('DRAFT')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1.5 ${
              filterTab === 'DRAFT'
                ? 'bg-violet-700 text-white shadow-sm'
                : 'bg-violet-50 hover:bg-violet-100 text-violet-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Draft ({draftMetadata.length})</span>
          </button>

          <button
            onClick={() => setFilterTab('SIAP_CETAK')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1.5 ${
              filterTab === 'SIAP_CETAK'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Siap Cetak ({submissions.filter(s => !s.isLockedForPrint).length})</span>
          </button>

          <button
            onClick={() => setFilterTab('MENUNGGU_EVIDEN')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1.5 ${
              filterTab === 'MENUNGGU_EVIDEN'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Menunggu Eviden Transfer/ST ({submissions.filter(s => s.isLockedForPrint).length})</span>
          </button>

          <button
            onClick={() => setFilterTab('KIRIM_DIGITAL')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
              filterTab === 'KIRIM_DIGITAL'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Kirim Digital
          </button>

          <button
            onClick={() => setFilterTab('SELESAI')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
              filterTab === 'SELESAI'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Selesai
          </button>
        </div>

        {/* Local Search input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchLocal}
            onChange={e => setSearchLocal(e.target.value)}
            placeholder="Saring tabel antrian..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 focus:bg-white rounded-full border border-slate-200 focus:border-teal-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Queue List Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/70">
                <th className="py-3 px-4">No. SPK & PP</th>
                <th className="py-3 px-4">Proyek & Vendor</th>
                <th className="py-3 px-4">Nilai Panjar Prelim (IF)</th>
                <th className="py-3 px-4">Rangkaian SOP Tanggal</th>
                <th className="py-3 px-4 text-center">Status Eviden (j & k)</th>
                <th className="py-3 px-4 text-center">Cetak Berkas</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.map(sub => {
                // ---- Baris khusus DRAFT ----
                if (sub._isDraft) {
                  return (
                    <tr
                      key={sub.id}
                      className="bg-violet-50/40 hover:bg-violet-50/70 transition-colors"
                    >
                      {/* SPK & status */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 font-mono">{sub.nomorSPK}</div>
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-violet-800 bg-violet-100 border border-violet-200 px-2 py-0.5 rounded-full">
                          <FileText className="w-3 h-3" />
                          DRAFT
                        </span>
                      </td>

                      {/* Proyek */}
                      <td className="py-3.5 px-4 max-w-[240px]">
                        <div className="font-semibold text-slate-800 line-clamp-1" title={sub.namaPekerjaan}>
                          {sub.namaPekerjaan}
                        </div>
                        <div className="text-[10px] text-violet-600 font-medium mt-0.5">
                          Draft tersimpan {formatTanggalIndo(sub.updatedAt.slice(0, 10))} — belum disubmit
                        </div>
                      </td>

                      {/* Kolom lain belum ada datanya */}
                      <td className="py-3.5 px-4 text-slate-300 text-center" colSpan={5}>
                        <span className="text-[11px] italic">
                          Lanjutkan input di menu &ldquo;Input Pengajuan Prelim Proyek&rdquo; untuk submit.
                        </span>
                      </td>
                    </tr>
                  );
                }

                const hasEvidenTransfer = !!(sub.dokumen.buktiTransferTA?.fileName);
                const hasEvidenST = !!(sub.dokumen.evidenSerahTerimaPrelim?.fileName);
                const isSelected = selectedSubDetail?.id === sub.id;

                return (
                  <tr 
                    key={sub.id}
                    onClick={() => setSelectedSubDetail(sub)}
                    className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                      isSelected ? 'bg-teal-50/30' : ''
                    }`}
                  >
                    {/* SPK & PP */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 font-mono">{sub.nomorSPK}</div>
                      <div className="text-[11px] text-teal-700 font-mono mt-0.5">{sub.nomorPP}</div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{sub.id}</span>
                      <span className={`mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE[sub.status].cls}`}>
                        {STATUS_BADGE[sub.status].label}
                      </span>
                    </td>

                    {/* Proyek & Vendor */}
                    <td className="py-3.5 px-4 max-w-[240px]">
                      <div className="font-semibold text-slate-800 line-clamp-1" title={sub.namaPekerjaan}>
                        {sub.namaPekerjaan}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {sub.vendorPelaksana || '-'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Penerima: <span className="text-slate-600 font-medium">{sub.namaPenerimaPrelim}</span>
                      </div>
                    </td>

                    {/* Panjar Prelim */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">
                        {formatRupiah(sub.nilaiPrelimPanjar)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Kontrak: {formatRupiah(sub.nilaiPekerjaan)}
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium inline-block mt-0.5">
                        {sub.persentasePrelim}% Panjar
                      </span>
                    </td>

                    {/* Tanggal SOP */}
                    <td className="py-3.5 px-4 text-[11px] text-slate-600 space-y-0.5">
                      <div>SPK/BAKH: <span className="font-semibold text-slate-800">{formatTanggalIndo(sub.tanggalSPK)}</span></div>
                      <div>PP: <span className="font-semibold text-slate-800">{formatTanggalIndo(sub.tanggalPP)}</span></div>
                      <div>IF: <span className="font-semibold text-slate-800">{formatTanggalIndo(sub.tanggalImprestFund)}</span></div>
                      <div className="text-[10px] text-teal-700 font-medium">Kurva S: {sub.durasiKerjaHari} Hari</div>
                    </td>

                    {/* Eviden Status */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {/* Eviden Transfer TA (l) */}
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className={`w-2 h-2 rounded-full ${hasEvidenTransfer ? 'bg-emerald-500' : 'bg-rose-400'}`}></span>
                          <span className={hasEvidenTransfer ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                            Transfer TA: {hasEvidenTransfer ? 'Ada' : 'Belum'}
                          </span>
                        </div>

                        {/* Eviden Serah Terima (k) */}
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className={`w-2 h-2 rounded-full ${hasEvidenST ? 'bg-emerald-500' : 'bg-rose-400'}`}></span>
                          <span className={hasEvidenST ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                            Serah Terima: {hasEvidenST ? 'Ada' : 'Belum'}
                          </span>
                        </div>

                        {/* Quick action to upload if missing */}
                        {sub.isLockedForPrint && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenEvidenModal(sub);
                            }}
                            className="mt-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 transition-colors"
                          >
                            + Upload Eviden
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Cetak Berkas Button */}
                    <td className="py-3.5 px-4 text-center">
                      {sub.isLockedForPrint ? (
                        <div className="inline-flex flex-col items-center group relative">
                          <button
                            disabled
                            className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed flex items-center gap-1.5 border border-slate-200"
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Terkunci</span>
                          </button>
                          <span className="text-[9px] text-rose-500 font-medium mt-1">Perlu Eviden j & k</span>
                          
                          {/* Fast simulation shortcut for user convenience */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickSimulateEviden(sub.id);
                            }}
                            title="Klik untuk otomatis isi eviden bukti transfer dan serah terima agar bisa langsung dicetak"
                            className="mt-1 text-[9px] text-teal-700 underline hover:text-teal-900"
                          >
                            Simulasi Lengkapi Eviden
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPrintModal(sub);
                          }}
                          className="px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 mx-auto"
                        >
                          <Printer className="w-3.5 h-3.5 text-teal-400" />
                          <span>Cetak Berkas</span>
                        </button>
                      )}
                    </td>

                    {/* Detail & Kurva S */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenKurvaModal(sub);
                          }}
                          title="Lihat Kurva S Mingguan"
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-700 transition-colors"
                        >
                          <Layers className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setSelectedSubDetail(sub)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          title="Lihat Detail Kelengkapan Dokumen"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Item Document Breakdown (a through l) */}
      {selectedSubDetail && (
        <div className="bg-slate-50/80 rounded-3xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 bg-teal-100/60 px-2 py-0.5 rounded-full">
                  Audit {BERKAS_PRELIM.length} Berkas SOP Prelim
                </span>
                <span className="font-bold text-slate-900 text-sm">{selectedSubDetail.nomorSPK}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{selectedSubDetail.namaPekerjaan}</p>
            </div>

            <div className="flex items-center gap-2">
              {selectedSubDetail.isLockedForPrint ? (
                <button
                  onClick={() => onOpenEvidenModal(selectedSubDetail)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Eviden j & k Sekarang</span>
                </button>
              ) : (
                <button
                  onClick={() => onOpenPrintModal(selectedSubDetail)}
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5 text-teal-300" />
                  <span>Cetak Bundle {BERKAS_PRELIM.length} Berkas</span>
                </button>
              )}
            </div>
          </div>

          {/* Grid of the 12 documents a to l */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            {/* a */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-start justify-between">
              <div>
                <span className="font-bold text-slate-800">BAKH</span>
                <p className="text-[11px] text-slate-500">Tgl: {formatTanggalIndo(selectedSubDetail.tanggalBAKH)} (= SPK)</p>
                <span className="text-[10px] text-teal-700 font-mono">{selectedSubDetail.dokumen.bakh.fileName || 'Auto-generated'}</span>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Siap</span>
            </div>

            {/* b */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-start justify-between">
              <div>
                <span className="font-bold text-slate-800">Lampiran Kesepakatan Harga</span>
                <p className="text-[11px] text-slate-500">Nilai: {formatRupiah(selectedSubDetail.nilaiPekerjaan)}</p>
                <span className="text-[10px] text-teal-700 font-mono">{selectedSubDetail.dokumen.lampiranKesepakatanHarga.fileName || 'Terkait BAKH'}</span>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Siap</span>
            </div>

            {/* c & c.1 */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-start justify-between">
              <div>
                <span className="font-bold text-slate-800">SPK & Kurva S</span>
                <p className="text-[11px] text-slate-500">Durasi: {selectedSubDetail.durasiKerjaHari} Hari</p>
                <span className="text-[10px] text-teal-700 font-mono">Tgl: {formatTanggalIndo(selectedSubDetail.tanggalSPK)}</span>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Siap</span>
            </div>

            {/* d */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-start justify-between">
              <div>
                <span className="font-bold text-slate-800">PP (Permintaan Pembayaran)</span>
                <p className="text-[11px] text-slate-500">Tgl: {formatTanggalIndo(selectedSubDetail.tanggalPP)} (+2 Hari SPK)</p>
                <span className="text-[10px] text-teal-700 font-mono">{selectedSubDetail.nomorPP}</span>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Siap</span>
            </div>

            {/* e */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-start justify-between">
              <div>
                <span className="font-bold text-slate-800">BOQ DRM</span>
                <p className="text-[11px] text-slate-500">{selectedSubDetail.dokumen.boqDrm.fileName || 'BOQ Design Review'}</p>
                <span className="text-[10px] text-slate-400">Status: {selectedSubDetail.dokumen.boqDrm.status}</span>
              </div>
              <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-bold">Upload</span>
            </div>

            {/* f */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-start justify-between">
              <div>
                <span className="font-bold text-slate-800">Lampiran Dasar Pekerjaan</span>
                <p className="text-[11px] text-slate-500">{selectedSubDetail.dokumen.lampiranDasarPekerjaan.fileName || 'Justifikasi Pekerjaan'}</p>
                <span className="text-[10px] text-slate-400">Status: {selectedSubDetail.dokumen.lampiranDasarPekerjaan.status}</span>
              </div>
              <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-bold">Upload</span>
            </div>

            {/* g */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-start justify-between">
              <div>
                <span className="font-bold text-slate-800">Pengajuan Panjar</span>
                <p className="text-[11px] text-slate-500">Tgl: {formatTanggalIndo(selectedSubDetail.tanggalPengajuanPanjar)} (= PP)</p>
                <span className="text-[10px] text-emerald-700 font-bold">{formatRupiah(selectedSubDetail.nilaiPrelimPanjar)}</span>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Siap</span>
            </div>

            {/* h */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-start justify-between">
              <div>
                <span className="font-bold text-slate-800">Imprest Fund (IF)</span>
                <p className="text-[11px] text-slate-500">Tgl: {formatTanggalIndo(selectedSubDetail.tanggalImprestFund)} (+2 Hari Panjar)</p>
                <span className="text-[10px] text-teal-700 font-mono">{selectedSubDetail.nomorIF}</span>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Siap</span>
            </div>

            {/* h - GRAVIK CURVA S */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-start justify-between">
              <div>
                <span className="font-bold text-slate-800">{berkasLabel('h')}</span>
                <p className="text-[11px] text-slate-500">Durasi {selectedSubDetail.durasiKerjaHari} hari · {formatRupiah(selectedSubDetail.nilaiPekerjaan)}</p>
                <span className="text-[10px] text-teal-700 font-mono">{selectedSubDetail.dokumen.kurvaS.fileName || 'Digenerate sistem'}</span>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Siap</span>
            </div>

            {/* i1 — KTP penerima */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-start justify-between">
              <div className="min-w-0">
                <span className="font-bold text-slate-800">{berkasLabelByKey('ktp')}</span>
                <p className="text-[11px] text-slate-500">
                  {selectedSubDetail.namaPenerimaPrelim}
                </p>
                <span className="text-[10px] text-teal-700 font-mono">
                  {fileIdentitas('ktp') || 'Belum diunggah'}
                </span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  fileIdentitas('ktp')
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-teal-50 text-teal-700'
                }`}
              >
                {fileIdentitas('ktp') ? 'Siap' : 'Upload'}
              </span>
            </div>

            {/* i2 — NPWP penerima */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-start justify-between">
              <div className="min-w-0">
                <span className="font-bold text-slate-800">{berkasLabelByKey('npwp')}</span>
                <p className="text-[11px] text-slate-500">
                  {selectedSubDetail.npwpPenerima || 'NPWP belum diisi'}
                </p>
                <span className="text-[10px] text-teal-700 font-mono">
                  {fileIdentitas('npwp') || 'Belum diunggah'}
                </span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  fileIdentitas('npwp')
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-teal-50 text-teal-700'
                }`}
              >
                {fileIdentitas('npwp') ? 'Siap' : 'Upload'}
              </span>
            </div>

            {/* i3 — Buku tabungan penerima */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-start justify-between">
              <div className="min-w-0">
                <span className="font-bold text-slate-800">
                  {berkasLabelByKey('bukuRekening')}
                </span>
                <p className="text-[11px] text-slate-500">
                  {selectedSubDetail.bankPenerima}
                </p>
                <span className="text-[10px] text-teal-700 font-mono">
                  {fileIdentitas('bukuRekening') || 'Belum diunggah'}
                </span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  fileIdentitas('bukuRekening')
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-teal-50 text-teal-700'
                }`}
              >
                {fileIdentitas('bukuRekening') ? 'Siap' : 'Upload'}
              </span>
            </div>

            {/* j - CRITICAL EVIDEN ST */}
            <div className={`p-2.5 rounded-xl border flex items-start justify-between ${
              selectedSubDetail.dokumen.evidenSerahTerimaPrelim.fileName
                ? 'bg-emerald-50/60 border-emerald-200'
                : 'bg-rose-50/60 border-rose-200'
            }`}>
              <div>
                <span className="font-bold text-slate-900">{berkasLabel('j')}</span>
                <p className="text-[11px] text-slate-500">
                  {selectedSubDetail.dokumen.evidenSerahTerimaPrelim.fileName || 'Belum diunggah'}
                </p>
                <span className="text-[10px] text-rose-600 font-medium">Syarat Wajib Cetak Berkas</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                selectedSubDetail.dokumen.evidenSerahTerimaPrelim.fileName
                  ? 'bg-emerald-200 text-emerald-900'
                  : 'bg-rose-200 text-rose-900'
              }`}>
                {selectedSubDetail.dokumen.evidenSerahTerimaPrelim.fileName ? 'Verified' : 'Pending'}
              </span>
            </div>

            {/* k - CRITICAL EVIDEN TRANSFER */}
            <div className={`p-2.5 rounded-xl border flex items-start justify-between ${
              selectedSubDetail.dokumen.buktiTransferTA.fileName
                ? 'bg-emerald-50/60 border-emerald-200'
                : 'bg-rose-50/60 border-rose-200'
            }`}>
              <div>
                <span className="font-bold text-slate-900">{berkasLabel('k')}</span>
                <p className="text-[11px] text-slate-500">
                  {selectedSubDetail.dokumen.buktiTransferTA.fileName || 'Belum diunggah'}
                </p>
                <span className="text-[10px] text-rose-600 font-medium">Syarat Wajib Cetak Berkas</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                selectedSubDetail.dokumen.buktiTransferTA.fileName
                  ? 'bg-emerald-200 text-emerald-900'
                  : 'bg-rose-200 text-rose-900'
              }`}>
                {selectedSubDetail.dokumen.buktiTransferTA.fileName ? 'Verified' : 'Pending'}
              </span>
            </div>

            {/* l */}
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-start justify-between">
              <div>
                <span className="font-bold text-slate-800">{berkasLabel('l')}</span>
                <p className="text-[11px] text-slate-500">{selectedSubDetail.dokumen.spb.fileName || 'SPB_FIN_Signed.pdf'}</p>
                <span className="text-[10px] text-slate-400">Status: {selectedSubDetail.dokumen.spb.status}</span>
              </div>
              <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-bold">Siap</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
