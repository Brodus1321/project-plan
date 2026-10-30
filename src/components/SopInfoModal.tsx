import React from 'react';
import {
  X,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { BERKAS_PRELIM, EVIDEN_KUNCI_CETAK } from '../db/berkas';

interface SopInfoModalProps {
  onClose: () => void;
}

export const SopInfoModal: React.FC<SopInfoModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-800 text-white flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">SOP Alur Berkas Prelim & Aturan Tanggal</h3>
              <p className="text-xs text-slate-500">Panduan Resmi Alur Berkas dan Kunci Cetak Dokumen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Golden Rule Highlight */}
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-300 mb-4 text-xs text-amber-950">
          <div className="flex items-center gap-2 font-bold mb-1 text-sm text-amber-900">
            <Lock className="w-4 h-4 text-amber-600" />
            <span>Aturan Wajib Kunci Cetak Berkas:</span>
          </div>
          <p className="leading-relaxed">
            <strong>Prelim</strong> = pengajuan admin / berkas PP &rarr; dikirim secara digital &rarr; transfer dan serah terima (masuk{' '}
            <strong>eviden transfer</strong> dan <strong>serah terima</strong>) &rarr;{' '}
            <em>baru berkas resmi dapat dicetak (print)</em>.
          </p>
        </div>

        {/* 2. Daftar berkas dan aturan tanggal */}
        <div className="space-y-2.5 text-xs text-slate-700 mb-6">
          <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2">
            Rangkaian {BERKAS_PRELIM.length} Dokumen Berkas Prelim:
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {BERKAS_PRELIM.map(def => {
              const kunci = EVIDEN_KUNCI_CETAK.includes(def.letter);
              return (
                <div
                  key={def.letter}
                  className={`p-2.5 rounded-xl border ${
                    kunci ? 'bg-amber-50/80 border-amber-200' : 'bg-slate-50 border-slate-200'
                  } ${def.key === 'spb' ? 'md:col-span-2' : ''}`}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`font-bold ${kunci ? 'text-amber-900' : 'text-teal-800'}`}
                    >
                      {def.label}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                        def.kind === 'upload'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-sky-50 text-sky-700 border-sky-200'
                      }`}
                    >
                      {def.kind === 'upload' ? 'UPLOAD' : 'INPUT'}
                    </span>
                  </div>
                  <p className={`text-[11px] ${kunci ? 'text-amber-800 font-medium' : 'text-slate-600'}`}>
                    {def.rule ? `${def.rule}. ` : ''}
                    {def.purpose}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-bold text-xs"
          >
            Mengerti & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
