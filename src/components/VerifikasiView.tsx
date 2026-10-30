import React, { useEffect, useState } from 'react';
import { ProjectSubmission } from '../types';
import { db, alasanTerkunci } from '../db/storage';
import { formatRupiah } from '../db/storage';
import {
  CheckCircle2, Search, ShieldCheck,
  ArrowLeft, CircleCheck, X,
} from 'lucide-react';

interface VerifikasiViewProps {
  onClose: () => void;
}

export const VerifikasiView: React.FC<VerifikasiViewProps> = ({ onClose }) => {
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSub, setSelectedSub] = useState<ProjectSubmission | null>(null);
  const [verifStatusFilter, setVerifStatusFilter] = useState<'ALL' | 'MENUNGGU' | 'DISETUJUI' | 'REVISI'>('ALL');

  useEffect(() => {
    const load = () => {
      const data = db.getSubmissions();
      setSubmissions(data);
    };
    load();
  }, []);

  const filtered = submissions.filter(s => {
    const matchSearch = !search || 
      (s.nomorSPK ?? '').toLowerCase().includes(search) ||
      (s.namaPekerjaan ?? '').toLowerCase().includes(search);
    const matchStatus = 
      verifStatusFilter === 'ALL' ? true :
      verifStatusFilter === 'MENUNGGU' ? s.verifikasiStatus === 'MENUNGGU' :
      verifStatusFilter === 'DISETUJUI' ? s.verifikasiStatus === 'DISETUJUI' :
      s.verifikasiStatus === 'REVISI';
    return matchSearch && matchStatus;
  });

  const reload = () => setSubmissions(db.getSubmissions());

  const setujui = (sub: ProjectSubmission) => {
    db.updateSubmission(sub.id, {
      verifikasiStatus: 'DISETUJUI',
      verifikasiCatatan: undefined,
      diverifikasiOleh: sessionStorage.getItem('user_nama') ?? 'Verifikator Berkas',
      diverifikasiPada: new Date().toISOString(),
    });
    reload();
  };

  const revisi = (sub: ProjectSubmission, catatan: string) => {
    db.updateSubmission(sub.id, {
      verifikasiStatus: 'REVISI',
      verifikasiCatatan: catatan || undefined,
      diverifikasiOleh: sessionStorage.getItem('user_nama') ?? 'Verifikator Berkas',
      diverifikasiPada: new Date().toISOString(),
    });
    reload();
  };

  const kirimUlang = (sub: ProjectSubmission) => {
    db.updateSubmission(sub.id, {
      verifikasiStatus: 'MENUNGGU',
      verifikasiCatatan: undefined,
      diverifikasiOleh: undefined,
      diverifikasiPada: undefined,
    });
    reload();
  };

  const chipClass = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
      active
        ? 'border-teal-600 bg-teal-600 text-white'
        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
    }`;

  const statusDot: Record<string, string> = {
    MENUNGGU: 'bg-amber-400',
    DISETUJUI: 'bg-teal-500',
    REVISI: 'bg-rose-500',
  };

  return (
    <div className="relative isolate min-h-screen w-full p-2 sm:p-4 md:p-6 lg:p-8 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-600" /> Verifikasi Pengajuan
            </h1>
            <p className="text-sm text-slate-500">
              Pengajuan menunggu verifikasi verifikator sebelum berkas bisa dicetak.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Saring No. SPK, Nama Proyek..."
              className="pl-8 py-1.5 rounded-full border border-slate-200 text-xs bg-slate-100 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-2xl p-3 border border-slate-200/60">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
            <div className="font-bold text-emerald-800">{filtered.length}</div>
            <div className="text-[10px] text-emerald-400 uppercase">Total</div>
          </div>
          <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
            <div className="font-bold text-amber-800">{filtered.filter(s => s.verifikasiStatus === 'MENUNGGU').length}</div>
            <div className="text-[10px] text-amber-400 uppercase">Menunggu Verifikasi</div>
          </div>
          <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
            <div className="font-bold text-teal-800">{filtered.filter(s => s.verifikasiStatus === 'DISETUJUI').length}</div>
            <div className="text-[10px] text-teal-400 uppercase">Disetujui</div>
          </div>
          <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
            <div className="font-bold text-rose-800">{filtered.filter(s => s.verifikasiStatus === 'REVISI').length}</div>
            <div className="text-[10px] text-rose-400 uppercase">Revisi</div>
          </div>
        </div>

        {/* Filter chips */}
        <div className="mt-3 flex gap-1.5">
          <button
            onClick={() => setVerifStatusFilter('ALL')}
            className={chipClass(verifStatusFilter === 'ALL')}
          >
            Semua ({submissions.length})
          </button>
          <button
            onClick={() => setVerifStatusFilter('MENUNGGU')}
            className={chipClass(verifStatusFilter === 'MENUNGGU')}
          >
            Menunggu ({submissions.filter(s => s.verifikasiStatus === 'MENUNGGU').length})
          </button>
          <button
            onClick={() => setVerifStatusFilter('DISETUJUI')}
            className={chipClass(verifStatusFilter === 'DISETUJUI')}
          >
            Disetujui ({submissions.filter(s => s.verifikasiStatus === 'DISETUJUI').length})
          </button>
          <button
            onClick={() => setVerifStatusFilter('REVISI')}
            className={chipClass(verifStatusFilter === 'REVISI')}
          >
            Revisi ({submissions.filter(s => s.verifikasiStatus === 'REVISI').length})
          </button>
        </div>

        {/* List Tabel */}
        {filtered.map(sub => (
          <div
            key={sub.id}
            className="mt-3 rounded-xl bg-white border border-slate-200/80 p-4 shadow-sm"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-800">{sub.nomorSPK}</span>
                  <span className="text-xs text-slate-500">({sub.regional})</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{sub.namaPekerjaan}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${statusDot[sub.verifikasiStatus ?? 'MENUNGGU'] ?? 'bg-slate-300'}`}></span>
                <span className="text-[9px] font-semibold ">{sub.verifikasiStatus ?? 'MENUNGGU'}</span>
              </div>
            </div>

            {/* Detail & Action */}
            <div className="mt-2">
              <div className="text-xs text-slate-500 mb-1">
                Alasan Terkunci: <span className="font-medium text-slate-600">{alasanTerkunci(sub)}</span>
              </div>
              {sub.verifikasiStatus === 'MENUNGGU' && (
                <>
                  <button
                    onClick={() => setujui(sub)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Setujui (lanjut cetak)
                  </button>
                  <button
                    onClick={() => {
                      const catatan = window.prompt('Masukkan catatan revisi (opsional):');
                      if (catatan !== null) revisi(sub, catatan);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Revisi (kembali ke admin)
                  </button>
                </>
              )}
              {sub.verifikasiStatus === 'REVISI' && (
                <>
                  <button
                    onClick={() => kirimUlang(sub)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white border border-slate-200 transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Kirim Ulang (ke admin)
                  </button>
                </>
              )}
              {sub.verifikasiStatus === 'DISETUJUI' && (
                <button
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-900 hover:bg-teal-800 text-white border border-teal-200 transition-colors"
                  title="Berhasil diverifikasi, berkas kini siap cetak"
                >
                  <CircleCheck className="w-3 h-3" />
                  Selesai
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Close button */}
        <button
          onClick={onClose}
          className="mt-4 px-5 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};