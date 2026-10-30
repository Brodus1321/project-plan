import React, { useState } from 'react';
import { AmandemenRecord, ProjectSubmission } from '../types';
import { formatTanggalIndo, formatRupiah, addDays, generateKurvaS, generateKurvaSDariPlan } from '../db/storage';
import { 
  FileEdit, 
  PlusCircle, 
  GitBranch, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  Calendar, 
  Coins, 
  FileCheck,
  UserCheck,
  FileText
} from 'lucide-react';

interface AmandemenViewProps {
  submissions: ProjectSubmission[];
  amandemenList: AmandemenRecord[];
  onCreateAmandemen: (payload: Omit<AmandemenRecord, 'id' | 'status'>, updatedSubData?: Partial<ProjectSubmission>) => void;
}

export const AmandemenView: React.FC<AmandemenViewProps> = ({
  submissions,
  amandemenList,
  onCreateAmandemen,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState<string>(submissions[0]?.id || '');
  const [alasanAmandemen, setAlasanAmandemen] = useState<AmandemenRecord['alasanAmandemen']>('PERPANJANGAN_WAKTU');
  const [keterangan, setKeterangan] = useState('');
  const [pemohon, setPemohon] = useState('Project Manager (PM Lapangan)');
  const [disetujuiOleh, setDisetujuiOleh] = useState('General Manager Proyek');

  // Specific dynamic amendment fields
  const [tambahanHari, setTambahanHari] = useState<number>(14);
  const [nilaiBaru, setNilaiBaru] = useState<number>(0);
  const [alasanLain, setAlasanLain] = useState('');

  const currentSub = submissions.find(s => s.id === selectedSubId);

  const handleOpenModal = () => {
    if (submissions.length > 0) {
      setSelectedSubId(submissions[0].id);
      if (submissions[0]) {
        setNilaiBaru(submissions[0].nilaiPekerjaan);
      }
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSub) return;

    const nomorAmandemen = `AMD-0${(currentSub.amandemenCount || 0) + 1}/${currentSub.nomorSPK.replace(/\//g, '-')}`;
    const todayStr = new Date().toISOString().split('T')[0];

    const perubahan: { field: string; sebelum: string; sesudah: string }[] = [];
    const subUpdates: Partial<ProjectSubmission> = {};

    if (alasanAmandemen === 'PERPANJANGAN_WAKTU') {
      const durasiBaru = currentSub.durasiKerjaHari + tambahanHari;
      const selesaiBaru = addDays(currentSub.tanggalMulaiKerja, durasiBaru);
      perubahan.push({
        field: 'Durasi Pekerjaan (Kurva S)',
        sebelum: `${currentSub.durasiKerjaHari} Hari`,
        sesudah: `${durasiBaru} Hari (+${tambahanHari} hari)`,
      });
      perubahan.push({
        field: 'Tanggal Selesai SPK',
        sebelum: formatTanggalIndo(currentSub.tanggalSelesaiKerja),
        sesudah: formatTanggalIndo(selesaiBaru),
      });

      subUpdates.durasiKerjaHari = durasiBaru;
      subUpdates.tanggalSelesaiKerja = selesaiBaru;
      subUpdates.kurvaSData = currentSub.kurvaSPlan?.entries.length
        ? generateKurvaSDariPlan(currentSub.kurvaSPlan, durasiBaru, currentSub.tanggalMulaiKerja)
        : generateKurvaS(durasiBaru, currentSub.nilaiPekerjaan);
    } else if (alasanAmandemen === 'PERUBAHAN_BIAYA') {
      perubahan.push({
        field: 'Nilai Total Kontrak SPK',
        sebelum: formatRupiah(currentSub.nilaiPekerjaan),
        sesudah: formatRupiah(nilaiBaru),
      });
      subUpdates.nilaiPekerjaan = nilaiBaru;
    } else {
      perubahan.push({
        field: 'Revisi Administrasi / Catatan SPK',
        sebelum: 'Sesuai SPK Awal',
        sesudah: alasanLain || keterangan,
      });
    }

    onCreateAmandemen(
      {
        submissionId: currentSub.id,
        nomorAmandemen,
        tanggalAmandemen: todayStr,
        alasanAmandemen,
        keterangan: keterangan || 'Amandemen operasional proyek disetujui sesuai regulasi dan justifikasi teknis.',
        perubahan,
        pemohon,
        disetujuiOleh,
      },
      subUpdates
    );

    setIsModalOpen(false);
    setKeterangan('');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
            <FileEdit className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Amandemen & Addendum Pengajuan</h2>
            <p className="text-xs text-slate-500">
              Pengelolaan perubahan durasi kerja (Kurva S), nilai kontrak, dan penyesuaian SPK
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenModal}
          className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-full shadow-md transition-all flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4 text-emerald-400" />
          <span>Buat Pengajuan Amandemen</span>
        </button>
      </div>

      {/* Info card */}
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl p-4 border border-teal-200/80 text-xs text-teal-900 flex items-start gap-3">
        <FileCheck className="w-5 h-5 text-teal-700 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Ketentuan Amandemen Pengajuan Prelim:</span>
          <p className="mt-0.5 text-slate-700">
            Perubahan durasi kerja <strong>(Kurva S)</strong> akan secara otomatis meregenerasi bobot distribusi <strong>Kurva S pada dokumen PP</strong> dan memperbarui jadwal penyelesaian proyek tanpa membatalkan riwayat pencairan Imprest Fund yang telah berjalan.
          </p>
        </div>
      </div>

      {/* Amandemen List Cards */}
      <div className="space-y-4">
        {amandemenList.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center text-slate-400 border border-slate-200 text-xs">
            Belum ada riwayat amandemen. Klik tombol "Buat Pengajuan Amandemen" untuk memulai.
          </div>
        ) : (
          amandemenList.map(amd => {
            const relatedSub = submissions.find(s => s.id === amd.submissionId);
            return (
              <div 
                key={amd.id} 
                className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:border-teal-300 transition-all"
              >
                <div className="flex items-start justify-between flex-wrap gap-2 pb-3 mb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold font-mono text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        {amd.nomorAmandemen}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        {amd.status}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatTanggalIndo(amd.tanggalAmandemen)}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">
                      {relatedSub?.namaPekerjaan || 'Proyek Lapangan'}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Dasar SPK: {relatedSub?.nomorSPK} | Regional: {relatedSub?.regional}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 inline-block">
                      {amd.alasanAmandemen.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Diff table before vs after */}
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 mb-3">
                  <div className="text-[11px] font-bold text-slate-700 mb-2 uppercase tracking-wider">
                    Rincian Perubahan Kontrak:
                  </div>
                  <div className="space-y-2">
                    {amd.perubahan.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-slate-200/70">
                        <span className="font-semibold text-slate-700">{p.field}</span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-400 line-through">{p.sebelum}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-teal-600" />
                          <span className="text-emerald-700 font-bold">{p.sesudah}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes and Approver */}
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500 pt-1">
                  <div>
                    <span className="font-medium text-slate-700">Justifikasi:</span> {amd.keterangan}
                  </div>
                  <div className="flex items-center gap-3">
                    <span>Pemohon: <strong className="text-slate-800">{amd.pemohon}</strong></span>
                    {amd.disetujuiOleh && (
                      <span>Disetujui: <strong className="text-emerald-700">{amd.disetujuiOleh}</strong></span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Buat Amandemen */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <FileEdit className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Buat Amandemen SPK & Pengajuan</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Select Submission */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Pilih Pengajuan SPK Proyek *</label>
                <select
                  value={selectedSubId}
                  onChange={e => {
                    setSelectedSubId(e.target.value);
                    const sub = submissions.find(s => s.id === e.target.value);
                    if (sub) setNilaiBaru(sub.nilaiPekerjaan);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 font-medium text-slate-800"
                >
                  {submissions.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nomorSPK} - {s.namaPekerjaan.slice(0, 45)}...
                    </option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Jenis / Alasan Amandemen *</label>
                <select
                  value={alasanAmandemen}
                  onChange={e => setAlasanAmandemen(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 font-medium text-slate-800"
                >
                  <option value="PERPANJANGAN_WAKTU">Perpanjangan Waktu Kerja (Kurva S)</option>
                  <option value="PERUBAHAN_BIAYA">Perubahan Nilai Kontrak / Tambah-Kurang BOQ</option>
                  <option value="REVISI_KURVA_S">Penyesuaian Distribusi Bobot Kurva S di PP</option>
                  <option value="PERUBAHAN_REKENING">Perubahan Rekening Penerima Panjar Prelim</option>
                  <option value="LAINNYA">Perubahan Klausul Administrasi Lainnya</option>
                </select>
              </div>

              {/* Dynamic form based on type */}
              {alasanAmandemen === 'PERPANJANGAN_WAKTU' && (
                <div className="bg-teal-50/60 p-3 rounded-2xl border border-teal-200">
                  <label className="block text-teal-900 font-bold mb-1">
                    Tambahan Hari Kerja (Kurva S) *
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={tambahanHari}
                      onChange={e => setTambahanHari(Number(e.target.value))}
                      className="w-24 px-3 py-2 bg-white rounded-xl border border-teal-300 font-bold text-slate-900"
                    />
                    <span className="text-slate-600 font-medium">
                      Durasi baru: <strong>{(currentSub?.durasiKerjaHari || 0) + tambahanHari} Hari</strong> (Kurva S akan direkalkulasi otomatis)
                    </span>
                  </div>
                </div>
              )}

              {alasanAmandemen === 'PERUBAHAN_BIAYA' && (
                <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-200">
                  <label className="block text-amber-900 font-bold mb-1">
                    Nilai Total Kontrak Baru (Rp) *
                  </label>
                  <input
                    type="number"
                    step="500000"
                    value={nilaiBaru}
                    onChange={e => setNilaiBaru(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-amber-300 font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-amber-700 mt-1 block">
                    Semula: {formatRupiah(currentSub?.nilaiPekerjaan || 0)}
                  </span>
                </div>
              )}

              {/* Justification note */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Alasan Teknis & Justifikasi Lapangan *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Jelaskan alasan perubahan, kendala lapangan, atau persetujuan pihak terkait..."
                  value={keterangan}
                  onChange={e => setKeterangan(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-slate-800"
                ></textarea>
              </div>

              {/* Pemohon & Approver */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Nama Pemohon (PM)</label>
                  <input
                    type="text"
                    value={pemohon}
                    onChange={e => setPemohon(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Pejabat Penyetujui (GM)</label>
                  <input
                    type="text"
                    value={disetujuiOleh}
                    onChange={e => setDisetujuiOleh(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-full font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-md"
                >
                  Simpan & Terbitkan Amandemen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
