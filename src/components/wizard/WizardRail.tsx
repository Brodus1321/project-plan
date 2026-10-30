import React, { useEffect, useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';

/** Bentuk minimal yang dibutuhkan rail — cocok dengan BerkasDef maupun langkah virtual. */
export interface RailStep {
  step: number;
  short: string;
  label: string;
}

interface WizardRailProps {
  current: number;
  steps: RailStep[];
  /** Status kelengkapan berdasarkan INDEX langkah (bukan objek def). */
  isDone: (index: number) => boolean;
  onSelect: (index: number) => void;
}

/**
 * Rail navigasi langkah wizard "Input Pengajuan Prelim Proyek".
 * Stepper segmented: tiap langkah berukuran sama, item aktif digulir ke
 * tengah viewport bila rail meluap di layar sempit.
 * Daftar langkah disuntikkan lewat props agar wizard boleh punya langkah
 * virtual (mis. Review Dokumen) di luar registry berkas.
 */
export const WizardRail: React.FC<WizardRailProps> = ({
  current,
  steps,
  isDone,
  onSelect,
}) => {
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = railRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    if (el && railRef.current) {
      const rail = railRef.current;
      const left = el.offsetLeft - rail.clientWidth / 2 + el.clientWidth / 2;
      rail.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    }
  }, [current]);

  const total = steps.length;
  const lengkap = steps.filter((_, idx) => isDone(idx)).length;
  const persen = Math.round((lengkap / total) * 100);

  return (
    <div className="mb-4">
      <div
        ref={railRef}
        role="tablist"
        aria-label="Daftar langkah berkas prelim"
        className="overflow-x-auto overscroll-x-contain pb-0.5"
        style={{ scrollbarWidth: 'thin' }}
      >
        <ol className="flex min-w-max items-stretch gap-1.5 rounded-2xl border border-slate-200 bg-slate-100/70 p-1.5">
          {steps.map((def, idx) => {
            const done = isDone(idx);
            const active = idx === current;

            const status = active ? 'Sedang diisi' : done ? 'Lengkap' : 'Belum diisi';

            return (
              <li key={def.step} className="min-w-[150px] flex-1">
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`Langkah ${def.step}: ${def.label} — ${status}`}
                  data-active={active}
                  onClick={() => onSelect(idx)}
                  className={[
                    'group flex h-full w-full items-start gap-2 rounded-xl border px-2.5 py-2 text-left transition-all outline-none',
                    'focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1',
                    active
                      ? 'border-teal-700 bg-teal-800 shadow-sm'
                      : done
                        ? 'border-emerald-200 bg-white hover:border-emerald-400'
                        : 'border-slate-200 bg-white hover:border-teal-400',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black tabular-nums',
                      active
                        ? 'bg-white text-teal-800'
                        : done
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-teal-50 group-hover:text-teal-700',
                    ].join(' ')}
                  >
                    {done && !active ? <CheckCircle2 className="h-3.5 w-3.5" /> : def.step}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={[
                        'block text-[11px] font-bold leading-tight line-clamp-2',
                        active ? 'text-white' : done ? 'text-slate-800' : 'text-slate-600',
                      ].join(' ')}
                    >
                      {def.short}
                    </span>
                    <span
                      className={[
                        'mt-0.5 block text-[9px] font-semibold uppercase tracking-wide',
                        active ? 'text-teal-200' : done ? 'text-emerald-600' : 'text-slate-400',
                      ].join(' ')}
                    >
                      {status}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Progres isian seluruh langkah */}
      <div className="mt-2.5 flex items-center gap-2.5">
        <div
          role="progressbar"
          aria-valuenow={persen}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progres pengisian ${lengkap} dari ${total} langkah`}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200"
        >
          <div
            className="h-full rounded-full bg-teal-600 transition-all duration-500"
            style={{ width: `${persen}%` }}
          />
        </div>
        <span className="text-[10px] font-bold tabular-nums text-slate-500">{persen}%</span>
      </div>
    </div>
  );
};
