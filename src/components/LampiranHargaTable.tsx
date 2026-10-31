import React from 'react';
import { Trash2 } from 'lucide-react';
import { LampiranHargaRow } from '../types';
import { formatRupiah } from '../db/storage';
import {
  hitungSubtotalMaterial,
  hitungSubtotalJasa,
} from '../db/lampiranBakhMaster';

interface LampiranHargaTableProps {
  rows: LampiranHargaRow[];
  onUpdateRow: (index: number, row: LampiranHargaRow) => void;
  onDeleteRow: (index: number) => void;
}

export const LampiranHargaTable: React.FC<LampiranHargaTableProps> = ({
  rows,
  onUpdateRow,
  onDeleteRow,
}) => {
  const subtotalMaterial = hitungSubtotalMaterial(rows);
  const subtotalJasa = hitungSubtotalJasa(rows);
  const totalSubtotal = subtotalMaterial + subtotalJasa;

  const handleVolumeChange = (index: number, newVolume: number) => {
    const updatedRow = { ...rows[index], volume: newVolume };
    onUpdateRow(index, updatedRow);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[1050px] text-[11px]">
          <thead>
            <tr className="bg-emerald-50 text-emerald-900">
              <th rowSpan={3} className="w-9 border-b border-emerald-200 px-2 py-2 text-left font-bold align-bottom">
                No
              </th>
              <th rowSpan={3} className="border-b border-emerald-200 px-2 py-2 text-left font-bold align-bottom">
                Designator
              </th>
              <th rowSpan={3} className="border-b border-emerald-200 px-2 py-2 text-left font-bold align-bottom">
                Uraian Pekerjaan
              </th>
              <th rowSpan={3} className="border-b border-emerald-200 px-2 py-2 text-left font-bold align-bottom">
                Sat
              </th>
              <th colSpan={4} className="border-b border-l border-emerald-200 px-2 py-2 text-center font-bold uppercase tracking-wide">
                Negosiasi
              </th>
              <th colSpan={2} className="border-b border-l border-emerald-200 px-2 py-2 text-center font-bold uppercase tracking-wide">
                Kesepakatan
              </th>
              <th rowSpan={2} className="border-b border-l border-emerald-200 px-2 py-2 text-center font-bold uppercase tracking-wide align-bottom">
                Volume
              </th>
              <th rowSpan={3} className="w-10 border-b border-emerald-200 px-2 py-2 align-bottom">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
            <tr className="bg-emerald-50 text-emerald-800">
              <th colSpan={2} className="border-b border-emerald-100 px-2 py-1.5 text-center font-semibold">
                Telkom Akses
              </th>
              <th colSpan={2} className="border-b border-emerald-100 px-2 py-1.5 text-center font-semibold">
                Mandor
              </th>
              <th rowSpan={2} className="border-b border-l border-emerald-200 px-2 py-1.5 text-center font-semibold align-bottom">
                Material
              </th>
              <th rowSpan={2} className="border-b border-emerald-200 px-2 py-1.5 text-center font-semibold align-bottom">
                Jasa
              </th>
            </tr>
            <tr className="bg-emerald-50 text-emerald-800">
              <th className="border-b border-emerald-200 px-2 py-1.5 text-center font-semibold">Material</th>
              <th className="border-b border-emerald-200 px-2 py-1.5 text-center font-semibold">Jasa</th>
              <th className="border-b border-emerald-200 px-2 py-1.5 text-center font-semibold">Material</th>
              <th className="border-b border-emerald-200 px-2 py-1.5 text-center font-semibold">Jasa</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-2 py-2 text-center font-bold tabular-nums text-slate-400">
                  {i + 1}
                </td>
                <td className="px-2 py-2 font-mono text-slate-800">
                  {r.designator || <span className="text-slate-400">–</span>}
                </td>
                <td className="whitespace-pre-wrap px-2 py-2 text-slate-700">
                  {r.uraian || <span className="text-slate-400">–</span>}
                </td>
                <td className="px-2 py-2 text-slate-600">
                  {r.sat || <span className="text-slate-400">–</span>}
                </td>
                <td className="border-l border-slate-100 px-2 py-2 text-right tabular-nums text-slate-700">
                  {r.telkomMaterial.toLocaleString('id-ID')}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-700">
                  {r.telkomJasa.toLocaleString('id-ID')}
                </td>
                <td className="border-l border-slate-100 px-2 py-2 text-right tabular-nums text-slate-700">
                  {r.mandorMaterial.toLocaleString('id-ID')}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-700">
                  {r.mandorJasa.toLocaleString('id-ID')}
                </td>
                <td className="border-l border-slate-100 px-2 py-2 text-right tabular-nums text-slate-800 font-semibold">
                  {r.ksepMaterial.toLocaleString('id-ID')}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-800 font-semibold">
                  {r.ksepJasa.toLocaleString('id-ID')}
                </td>
                <td className="border-l border-slate-100 px-2 py-2 text-center">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={r.volume || 0}
                    onChange={(e) => {
                      const newVal = parseFloat(e.target.value) || 0;
                      handleVolumeChange(i, newVal);
                    }}
                    className="w-20 rounded border border-slate-200 px-1.5 py-1 text-right text-[10px] font-mono outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  />
                </td>
                <td className="px-1.5 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => onDeleteRow(i)}
                    aria-label={`Hapus baris Lampiran Harga ${i + 1}`}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Subtotal footer */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <div className="grid grid-cols-3 gap-4 text-xs font-semibold">
          <div>
            <p className="text-slate-600">Subtotal Material</p>
            <p className="text-lg text-emerald-800">{formatRupiah(subtotalMaterial)}</p>
          </div>
          <div>
            <p className="text-slate-600">Subtotal Jasa</p>
            <p className="text-lg text-emerald-800">{formatRupiah(subtotalJasa)}</p>
          </div>
          <div>
            <p className="text-slate-600">Total</p>
            <p className="text-lg text-emerald-900 font-bold">{formatRupiah(totalSubtotal)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
