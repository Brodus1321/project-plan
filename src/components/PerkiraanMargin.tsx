import React, { useState } from 'react';
import { MarginAngka } from '../types';

/** Angka awal kedua blok Perkiraan Margin (semua 0). */
export const PERKIRAAN_MARGIN_AWAL: MarginAngka = {
  revenue: 0,
  cogs: 0,
  materialStock: 0,
  materialNonStock: 0,
  jasa: 0,
  sewa: 0,
  operasional: 0,
};

const ribuan = (v: number) => new Intl.NumberFormat('id-ID').format(v);

/** Persentase terhadap Revenue — patokan sama seperti dokumen (Revenue = 100%). */
const persen = (nilai: number, revenue: number) =>
  revenue > 0 ? `${((nilai / revenue) * 100).toFixed(2).replace('.', ',')}%` : '0,00%';

const BARIS: { nomor: string; uraian: string; key: keyof MarginAngka }[] = [
  { nomor: '1', uraian: 'Revenue', key: 'revenue' },
  { nomor: '2', uraian: 'COGS', key: 'cogs' },
  { nomor: '2.1', uraian: 'Material Stock', key: 'materialStock' },
  { nomor: '2.2', uraian: 'Material Non Stock', key: 'materialNonStock' },
  { nomor: '2.3', uraian: 'Jasa', key: 'jasa' },
  { nomor: '2.4', uraian: 'Sewa', key: 'sewa' },
  { nomor: '2.5', uraian: 'Operasional', key: 'operasional' },
];

/** Input angka rupiah — memisah ribuan dengan titik saat tidak sedang fokus. */
const InputRupiah: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({
  label,
  value,
  onChange,
}) => {
  const [fokus, setFokus] = useState(false);
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={label}
      value={fokus ? (value ? String(value) : '') : ribuan(value)}
      onFocus={() => setFokus(true)}
      onBlur={() => setFokus(false)}
      onChange={e => onChange(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
      className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-right font-mono text-[11px] text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
    />
  );
};

/** Satu blok margin (a. KEMITRAAN / b. SWAKELOLA) — admin isi kolom Penilaian saja. */
const TabelMargin: React.FC<{
  label: string;
  nilai: MarginAngka;
  onChange: (m: MarginAngka) => void;
}> = ({ label, nilai, onChange }) => {
  const gpm = nilai.revenue - nilai.cogs;
  return (
    <div className="mb-3">
      <div className="mb-1 text-[12px] font-bold text-slate-800">
        {label} {persen(gpm, nilai.revenue)}
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-[#1f4e79] text-white">
              <th className="w-12 px-2 py-1.5 text-left font-semibold">Nomor</th>
              <th className="px-2 py-1.5 text-left font-semibold">Uraian</th>
              <th className="w-40 px-2 py-1.5 text-right font-semibold">Penilaian</th>
              <th className="w-20 px-2 py-1.5 text-right font-semibold">%</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {BARIS.map(b => (
              <tr key={b.key} className="border-t border-slate-100">
                <td className="px-2 py-1 text-center font-mono text-slate-500">{b.nomor}</td>
                <td className="px-2 py-1">{b.uraian}</td>
                <td className="px-1 py-1">
                  <InputRupiah
                    label={`${label} — ${b.uraian}`}
                    value={nilai[b.key]}
                    onChange={v => onChange({ ...nilai, [b.key]: v })}
                  />
                </td>
                <td className="px-2 py-1 text-right font-mono whitespace-nowrap">
                  {persen(nilai[b.key], nilai.revenue)}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-slate-400 bg-slate-50 font-bold text-slate-900">
              <td className="px-2 py-1.5" />
              <td className="px-2 py-1.5">Gross Profit Margin</td>
              <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">{ribuan(gpm)}</td>
              <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap">
                {persen(gpm, nilai.revenue)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * "6. Perkiraan Margin yang dilaksanakan" — dua blok identik seperti dokumen:
 * a. KEMITRAAN dan b. SWAKELOLA. Admin hanya mengisi angka Penilaian;
 * kolom % = nilai / Revenue; Gross Profit Margin = Revenue − COGS.
 */
export const PerkiraanMargin: React.FC<{
  kemitraan: MarginAngka;
  swakelola: MarginAngka;
  onChange: (blok: 'kemitraan' | 'swakelola', m: MarginAngka) => void;
}> = ({ kemitraan, swakelola, onChange }) => (
  <div className="rounded-2xl border border-teal-100 bg-white p-4 shadow-inner">
    <div className="mb-3 text-[13px] font-bold text-slate-800">
      6. Perkiraan Margin yang dilaksanakan:
    </div>
    <TabelMargin label="a. KEMITRAAN" nilai={kemitraan} onChange={m => onChange('kemitraan', m)} />
    <TabelMargin label="b. SWAKELOLA" nilai={swakelola} onChange={m => onChange('swakelola', m)} />
    <p className="text-[10px] leading-snug text-slate-500">
      Admin hanya mengisi angka <strong>Penilaian</strong> — kolom % dihitung otomatis terhadap
      Revenue, Gross Profit Margin = Revenue − COGS.
    </p>
  </div>
);
