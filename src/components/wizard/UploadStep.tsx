import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  X,
  AlertTriangle,
  Loader2,
  Table2,
} from 'lucide-react';
import { BerkasDef } from '../../db/berkas';
import { BoqParseResult, parseBoqWorkbook } from '../../lib/excel';
import { formatRupiah } from '../../db/storage';

export interface StoredFile {
  name: string;
  size: string;
}

interface UploadStepProps {
  def: BerkasDef;
  file?: StoredFile;
  boqResult?: BoqParseResult | null;
  onFileChange: (file: File | null) => void;
  onBoqResult?: (result: BoqParseResult | null) => void;
  children?: React.ReactNode;
}

const MAX_BYTES = 10 * 1024 * 1024;

function ukuran(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Kartu unggahan satu langkah. Untuk BOQ DRM (SheetJS) file Excel dibaca
 * sungguhan lalu hasilnya dikirim naik lewat `onBoqResult`.
 */
export const UploadStep: React.FC<UploadStepProps> = ({
  def,
  file,
  boqResult,
  onFileChange,
  onBoqResult,
  children,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExcel = def.key === 'boqDrm';
  const accept = def.accept ?? '.pdf,.jpg,.jpeg,.png';

  const terima = async (picked: File | null) => {
    setError(null);
    if (!picked) return;
    if (picked.size > MAX_BYTES) {
      setError(`Ukuran file ${(picked.size / 1024 / 1024).toFixed(1)} MB melebihi batas 10 MB.`);
      return;
    }

    if (isExcel) {
      setBusy(true);
      try {
        const hasil = await parseBoqWorkbook(picked);
        onFileChange(picked);
        onBoqResult?.(hasil);
      } catch (e) {
        onBoqResult?.(null);
        onFileChange(null);
        setError(e instanceof Error ? e.message : 'File Excel gagal dibaca.');
      } finally {
        setBusy(false);
      }
      return;
    }

    onFileChange(picked);
  };

  const bersihkan = () => {
    setError(null);
    onFileChange(null);
    onBoqResult?.(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const acceptFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    void terima(e.target.files?.[0] ?? null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void terima(e.dataTransfer.files?.[0] ?? null);
  };

  return (
    <div className="space-y-3">
      {/* Zona unggah */}
      {!file ? (
        <div
          onDragOver={e => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={[
            'rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-colors',
            dragging ? 'border-teal-500 bg-teal-50' : 'border-slate-300 bg-white',
          ].join(' ')}
        >
          <div className="mx-auto w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mb-2">
            {isExcel ? (
              <FileSpreadsheet className="w-5 h-5" />
            ) : (
              <UploadCloud className="w-5 h-5" />
            )}
          </div>
          <p className="text-xs font-bold text-slate-700">Tarik file ke sini atau pilih dari perangkat</p>
          <p className="mt-1 text-[11px] text-slate-500">
            {def.uploadHint ?? 'PDF / JPG / PNG (maks 10 MB)'}
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="mt-3 inline-flex items-center gap-2 min-h-[44px] px-5 rounded-full text-xs font-bold text-white bg-teal-800 hover:bg-teal-700 disabled:opacity-60 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            {busy ? 'Membaca file…' : 'Pilih File'}
          </button>

          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={accept}
            onChange={acceptFile}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-700">
              {isExcel ? <FileSpreadsheet className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-900 truncate">{file.name}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-emerald-800">
                {file.size} · siap digenerate ke dokumen {def.short}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="min-h-[36px] px-3 rounded-full text-[11px] font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                Ganti
              </button>
              <button
                type="button"
                onClick={bersihkan}
                aria-label={`Hapus file ${file.name}`}
                className="w-9 h-9 rounded-full text-slate-500 bg-white border border-slate-300 hover:text-rose-600 hover:border-rose-300 transition-colors flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={accept}
            onChange={acceptFile}
          />
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
          {error}
        </p>
      )}

      {/* Hasil pembacaan Excel */}
      {isExcel && boqResult && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Table2 className="w-4 h-4 text-indigo-600" />
              Hasil pembacaan Excel
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {boqResult.sheetNames.length} sheet · {boqResult.totalRows} baris ·{' '}
              {boqResult.totalCols} kolom
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Sheet aktif</div>
              <div className="text-xs font-bold text-slate-800 truncate">{boqResult.activeSheet}</div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Jumlah item</div>
              <div className="text-xs font-bold text-slate-800">{boqResult.jumlahItem}</div>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                {boqResult.totalColumnLabel ?? 'Total nilai'}
              </div>
              <div className="text-xs font-black text-emerald-800">
                {boqResult.totalNilai !== null ? formatRupiah(boqResult.totalNilai) : '—'}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-slate-600">
                  {boqResult.header.map((h, i) => (
                    <th key={i} className="px-2.5 py-1.5 text-left font-bold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {boqResult.preview.map((row, ri) => (
                  <tr key={ri} className={ri % 2 ? 'bg-slate-50' : 'bg-white'}>
                    {row.cells.map((cell, ci) => (
                      <td
                        key={ci}
                        className="px-2.5 py-1.5 border-t border-slate-100 text-slate-700 whitespace-nowrap max-w-[220px] truncate"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-slate-400">
            Menampilkan {boqResult.preview.length} dari {boqResult.totalRows} baris pada sheet{' '}
            <span className="font-semibold text-slate-500">{boqResult.activeSheet}</span>.
          </p>
        </div>
      )}

      {children}
    </div>
  );
};
