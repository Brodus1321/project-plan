import React from 'react';
import {
  CheckCircle2,
  Circle,
  Clock3,
  PenLine,
  UploadCloud,
  CalendarClock,
} from 'lucide-react';
import { BerkasDef, BERKAS_PRELIM_WIZARD } from '../../db/berkas';

export type BerkasStatus = 'done' | 'ready' | 'deferred';

interface BerkasStepShellProps {
  def: BerkasDef;
  status: BerkasStatus;
  /** Konten isian/ununggahan. Slot ini tempat alur rinci dicolok nanti. */
  children: React.ReactNode;
  /** Aksi tambahan di bawah (mis. tombol generate). */
  actions?: React.ReactNode;
}

const STATUS_META: Record<
  BerkasStatus,
  { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  done: {
    label: 'Lengkap',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    Icon: CheckCircle2,
  },
  ready: {
    label: 'Siap diisi',
    className: 'bg-teal-50 text-teal-800 border-teal-200',
    Icon: Circle,
  },
  deferred: {
    label: 'Diisi belakangan',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
    Icon: Clock3,
  },
};

/**
 * "Rumah" satu langkah berkas. Semua langkah wizard memakai komponen ini
 * sehingga alur rinci per berkas nanti tinggal mengisi slot `children`
 * tanpa menyentuh kerangka wizard.
 */
export const BerkasStepShell: React.FC<BerkasStepShellProps> = ({
  def,
  status,
  children,
  actions,
}) => {
  const meta = STATUS_META[status];
  const isUpload = def.kind === 'upload';

  return (
    <section aria-labelledby={`berkas-${def.letter}-title`} className="space-y-4">
      {/* Kepala langkah */}
      <header className="pb-4 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            Langkah {def.step} / {BERKAS_PRELIM_WIZARD.length}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${
              isUpload
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-sky-50 text-sky-700 border-sky-200'
            }`}
          >
            {isUpload ? <UploadCloud className="w-3 h-3" /> : <PenLine className="w-3 h-3" />}
            {isUpload ? 'Unggah & Generate' : 'Alur Input'}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${meta.className}`}
          >
            <meta.Icon className="w-3 h-3" />
            {meta.label}
          </span>
        </div>

        <h2 id={`berkas-${def.letter}-title`} className="mt-3 text-base font-bold text-slate-900">
          {def.wizardLabel ?? def.label}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{def.purpose}</p>

        {def.rule && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-lg">
            <CalendarClock className="w-3.5 h-3.5" />
            {def.rule}
          </p>
        )}
      </header>

      {/* Slot alur — konten langkah ini */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">{children}</div>

      {actions && (
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">{actions}</div>
      )}
    </section>
  );
};
