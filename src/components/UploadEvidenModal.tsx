import React, { useState } from 'react';
import { ProjectSubmission } from '../types';
import { formatRupiah, formatTanggalIndo } from '../db/storage';
import { 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Unlock, 
  FileCheck, 
  CreditCard, 
  FileText,
  Building2,
  Calendar
} from 'lucide-react';

interface UploadEvidenModalProps {
  submission: ProjectSubmission;
  onClose: () => void;
  onSaveEviden: (
    submissionId: string, 
    buktiTransfer: { fileName: string; fileSize: string }, 
    serahTerima: { fileName: string; fileSize: string }
  ) => void;
}

export const UploadEvidenModal: React.FC<UploadEvidenModalProps> = ({
  submission,
  onClose,
  onSaveEviden,
}) => {
  const [fileTransfer, setFileTransfer] = useState<{ fileName: string; fileSize: string } | null>(
    submission.dokumen.buktiTransferTA?.fileName 
      ? { fileName: submission.dokumen.buktiTransferTA.fileName, fileSize: submission.dokumen.buktiTransferTA.fileSize || '720 KB' } 
      : null
  );

  const [fileST, setFileST] = useState<{ fileName: string; fileSize: string } | null>(
    submission.dokumen.evidenSerahTerimaPrelim?.fileName 
      ? { fileName: submission.dokumen.evidenSerahTerimaPrelim.fileName, fileSize: submission.dokumen.evidenSerahTerimaPrelim.fileSize || '1.5 MB' } 
      : null
  );

  const [tanggalTransfer, setTanggalTransfer] = useState<string>(
    submission.tanggalTransfer || submission.tanggalImprestFund
  );
  const [bankPengirimTA, setBankPengirimTA] = useState<string>('Rekening Operasional TA (Bank Mandiri 120-00-559281)');
  const [refNumber, setRefNumber] = useState<string>(`TRX-TA-${Math.floor(100000 + Math.random() * 900000)}`);

  const handleSimulateFile = (type: 'transfer' | 'st') => {
    if (type === 'transfer') {
      setFileTransfer({
        fileName: `Bukti_Transfer_TA_${submission.nomorSPK.slice(-4)}_${submission.namaPenerimaPrelim.split(' ')[0]}.pdf`,
        fileSize: '820 KB',
      });
    } else {
      setFileST({
        fileName: `BA_Serah_Terima_Prelim_Fisik_${submission.nomorSPK.slice(-4)}_Signed.jpg`,
        fileSize: '1.9 MB',
      });
    }
  };

  const handleFileChange = (type: 'transfer' | 'st', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (type === 'transfer') {
      setFileTransfer({
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(0)} KB`,
      });
    } else {
      setFileST({
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(0)} KB`,
      });
    }
  };

  const isBothCompleted = !!fileTransfer && !!fileST;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBothCompleted) return;

    onSaveEviden(submission.id, fileTransfer!, fileST!);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
              isBothCompleted ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
            }`}>
              {isBothCompleted ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Upload Eviden Transfer & Serah Terima</h3>
              <p className="text-xs text-slate-500">
                Syarat utama untuk membuka hak cetak berkas SOP Prelim Proyek
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Project Snapshot */}
        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 mb-4 text-xs">
          <div className="flex items-center justify-between font-mono text-[11px] text-teal-800 font-bold mb-1">
            <span>{submission.nomorSPK}</span>
            <span>Nilai Panjar: {formatRupiah(submission.nilaiPrelimPanjar)}</span>
          </div>
          <div className="font-semibold text-slate-800">{submission.namaPekerjaan}</div>
          <div className="text-slate-500 mt-1">
            Penerima: <strong className="text-slate-700">{submission.namaPenerimaPrelim}</strong> | Rekening: <strong className="text-slate-700">{submission.bankPenerima}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Eviden k: Bukti Transfer dari TA ke Penerima */}
          <div className={`p-4 rounded-2xl border transition-all ${
            fileTransfer ? 'bg-emerald-50/50 border-emerald-300' : 'bg-slate-50 border-slate-300'
          }`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <span className="font-bold text-slate-900 text-xs">
                  Lampiran Bukti Transfer dari TA ke Penerima Prelim *
                </span>
                <p className="text-[11px] text-slate-500">
                  Bukti struk / mutasi bank transfer kas Imprest Fund ke rekening pelaksana
                </p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                fileTransfer ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'
              }`}>
                {fileTransfer ? 'Terunggah' : 'Belum Ada'}
              </span>
            </div>

            {fileTransfer ? (
              <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-bold text-slate-800 font-mono text-xs">{fileTransfer.fileName}</div>
                    <div className="text-[10px] text-slate-400">{fileTransfer.fileSize}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFileTransfer(null)}
                  className="text-[11px] text-rose-600 hover:underline"
                >
                  Ganti
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-2">
                <label className="flex-1 cursor-pointer bg-white hover:bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-3 text-center transition-colors">
                  <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                  <span className="font-semibold text-slate-700">Pilih Dokumen Bukti Transfer</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">PDF, PNG, JPG (Maks 5MB)</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={e => handleFileChange('transfer', e)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => handleSimulateFile('transfer')}
                  className="px-3 py-3 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl border border-teal-200 font-semibold text-[11px]"
                >
                  Simulasikan Contoh Transfer
                </button>
              </div>
            )}

            {/* Transfer info metadata */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-200/60">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Tanggal Transfer</label>
                <input
                  type="date"
                  value={tanggalTransfer}
                  onChange={e => setTanggalTransfer(e.target.value)}
                  className="w-full px-2 py-1 bg-white rounded-lg border border-slate-300 font-medium text-slate-800 text-[11px]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">No. Referensi Bank</label>
                <input
                  type="text"
                  value={refNumber}
                  onChange={e => setRefNumber(e.target.value)}
                  className="w-full px-2 py-1 bg-white rounded-lg border border-slate-300 font-mono text-slate-800 text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* Eviden j: Evidence Serah Terima Prelim */}
          <div className={`p-4 rounded-2xl border transition-all ${
            fileST ? 'bg-emerald-50/50 border-emerald-300' : 'bg-slate-50 border-slate-300'
          }`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <span className="font-bold text-slate-900 text-xs">
                  Evidence Serah Terima Prelim *
                </span>
                <p className="text-[11px] text-slate-500">
                  Berita Acara / Tanda Terima fisik dana prelim yang ditandatangani penerima
                </p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                fileST ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'
              }`}>
                {fileST ? 'Terunggah' : 'Belum Ada'}
              </span>
            </div>

            {fileST ? (
              <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-bold text-slate-800 font-mono text-xs">{fileST.fileName}</div>
                    <div className="text-[10px] text-slate-400">{fileST.fileSize}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFileST(null)}
                  className="text-[11px] text-rose-600 hover:underline"
                >
                  Ganti
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-2">
                <label className="flex-1 cursor-pointer bg-white hover:bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-3 text-center transition-colors">
                  <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                  <span className="font-semibold text-slate-700">Pilih Dokumen Serah Terima</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">PDF, PNG, JPG (Maks 5MB)</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={e => handleFileChange('st', e)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => handleSimulateFile('st')}
                  className="px-3 py-3 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl border border-teal-200 font-semibold text-[11px]"
                >
                  Simulasikan Tanda Terima
                </button>
              </div>
            )}
          </div>

          {/* Status Message */}
          <div className={`p-3 rounded-2xl text-xs flex items-center gap-2.5 ${
            isBothCompleted
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}>
            {isBothCompleted ? (
              <>
                <Unlock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  <strong>Eviden Lengkap!</strong> Status akan berubah menjadi <strong>SIAP CETAK</strong> dan dokumen dapat langsung dicetak.
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  Unggah kedua eviden (transfer dan serah terima) untuk membuka izin cetak berkas prelim.
                </span>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-full font-medium"
            >
              Tutup
            </button>
            <button
              type="submit"
              disabled={!isBothCompleted}
              className={`px-6 py-2 rounded-full font-bold text-white shadow-md transition-all flex items-center gap-1.5 ${
                isBothCompleted
                  ? 'bg-slate-900 hover:bg-slate-800 cursor-pointer'
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-teal-300" />
              <span>Simpan & Buka Kunci Cetak</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
