import React, { useMemo, useState } from 'react';
import { AlertCircle, Calculator, FileText, Plus, Save, ShieldAlert, Trash2, X } from 'lucide-react';
import { BoqSpkRow, BopCostRow, LEVEL_RISIKO, LevelRisiko } from '../types';
import { BOQ_SWAKELOLA_ITEMS } from '../db/boqSwakelola';
import { formatRupiah } from '../db/storage';
import { SearchSelectField, TextField } from './wizard/Field';

interface BopCostModalProps {
  rows: BopCostRow[];
  /** Lampiran BOQ SPK — dipakai menarik Volume default berdasarkan Designator. */
  boqSpk: BoqSpkRow[];
  /** Nilai Total BoQ (pembaca persen % Total BOP / Total BoQ). */
  totalBoq: number;
  /** Nilai Perintah Rincian (Preliminary) yang dapat dilakukan reimbursemen (Rp). */
  nilaiPerintahRincian: number;
  /** Nilai Perizinan (Preliminary) yang dapat dilakukan reimbursement (Rp). */
  nilaiPerizinan: number;
  /** V. Manajemen Risiko — tingkat risiko terpilih. */
  manajemenRisiko: LevelRisiko | '';
  onClose: () => void;
  onSave: (
    rows: BopCostRow[],
    nilaiPerintahRincian: number,
    nilaiPerizinan: number,
    manajemenRisiko: LevelRisiko | ''
  ) => void;
}

const buatId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * Popup Rincian Kebutuhan BOP Cost Structure.
 * Baris ditambahkan dari master BOQ SWAKELOLA.xlsx (COST STRUCTURE):
 * Material = Designator, Satuan & Harga Satuan otomatis, Volume ditarik dari
 * Lampiran BOQ SPK bila Designator-nya cocok (selain itu default 1, bisa diubah).
 */
export const BopCostModal: React.FC<BopCostModalProps> = ({
  rows,
  boqSpk,
  totalBoq,
  nilaiPerintahRincian,
  nilaiPerizinan,
  manajemenRisiko,
  onClose,
  onSave,
}) => {
  const [daftar, setDaftar] = useState<BopCostRow[]>(rows);
  const [perizinan, setPerizinan] = useState<number>(nilaiPerizinan);
  const [risiko, setRisiko] = useState<LevelRisiko | ''>(manajemenRisiko);
  const [itemId, setItemId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const itemOptions = useMemo(
    () => BOQ_SWAKELOLA_ITEMS.map(i => ({ value: i.designator, label: i.designator })),
    []
  );
  const masterTerpilih = BOQ_SWAKELOLA_ITEMS.find(i => i.designator === itemId);

  const totalBop = daftar.reduce((s, r) => s + r.vol * r.hargaSatuan, 0);
  const persenBop = totalBoq > 0 ? (totalBop / totalBoq) * 100 : 0;

  const tambahBaris = () => {
    if (!masterTerpilih) return setFormError('Pilih material dari master BOQ swakelola.');
    if (daftar.some(r => r.designator === masterTerpilih.designator))
      return setFormError('Designator tersebut sudah ada di tabel.');

    // Volume default: tarik dari Lampiran BOQ SPK (Designator sama), kalau tidak ada = 1.
    const cocok = boqSpk.find(
      r => r.designator.trim().toLowerCase() === masterTerpilih.designator.toLowerCase()
    );
    const vol = cocok && cocok.vol > 0 ? cocok.vol : 1;

    setDaftar(prev => [
      ...prev,
      {
        id: buatId(),
        designator: masterTerpilih.designator,
        satuan: masterTerpilih.satuan,
        hargaSatuan: masterTerpilih.material,
        ...(masterTerpilih.catatan ? { catatan: masterTerpilih.catatan } : {}),
        vol,
      },
    ]);
    setItemId('');
    setFormError(null);
  };

  const ubahVol = (id: string, nilaiBaru: string) => {
    const vol = Math.max(0, Number(nilaiBaru) || 0);
    setDaftar(prev => prev.map(r => (r.id === id ? { ...r, vol } : r)));
  };

  const hapusBaris = (id: string) => setDaftar(prev => prev.filter(r => r.id !== id));

  const simpan = () => {
    if (!daftar.length) return setSaveError('Tambahkan minimal satu baris BOP.');
    onSave(daftar, nilaiPerintahRincian, perizinan, risiko);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-5xl p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[94vh] overflow-y-auto">
        {/* Kepala */}
        <div className="flex items-start justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-800 text-white flex items-center justify-center shadow-md">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Rincian Kebutuhan BOP Cost Structure
              </h3>
              <p className="text-xs text-slate-500">
                (BoQ swakelola sesuai berkas COST STRUCTURE) — master {BOQ_SWAKELOLA_ITEMS.length}{' '}
                material.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Tambah baris dari master */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="w-4 h-4 text-teal-700" />
            <h4 className="text-[12px] font-bold uppercase tracking-wide text-slate-700">
              1. Tambah Baris dari Master BOQ Swakelola
            </h4>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <SearchSelectField
              id="bop-material"
              label="Material (Designator)"
              containerClassName="md:col-span-7"
              options={itemOptions}
              value={itemId}
              onChange={v => {
                setItemId(v);
                setFormError(null);
              }}
              placeholder="Ketik untuk mencari designator..."
              emptyLabel="Material tidak ditemukan di master"
              hint={
                masterTerpilih
                  ? `${masterTerpilih.uraian || '-'} · ${masterTerpilih.satuan || '-'} · Material ${formatRupiah(
                      masterTerpilih.material
                    )}${masterTerpilih.catatan ? ` · ${masterTerpilih.catatan}` : ''}`
                  : 'Sumber: BOQ SWAKELOLA.xlsx (COST STRUCTURE)'
              }
              hintTone={masterTerpilih ? 'accent' : 'muted'}
            />
            <div className="md:col-span-2 flex items-end">
              <button
                type="button"
                onClick={tambahBaris}
                className="w-full inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl text-xs font-bold text-white bg-teal-800 hover:bg-teal-700 shadow-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                Tambah
              </button>
            </div>
            <div className="md:col-span-3 flex items-end">
              <div className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">
                  Total BOP
                </p>
                <p className="text-sm font-black text-teal-700">{formatRupiah(totalBop)}</p>
              </div>
            </div>
          </div>

          {formError && (
            <p
              role="alert"
              className="mt-3 flex items-start gap-1.5 text-[11px] font-semibold text-rose-600"
            >
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
              <span>{formError}</span>
            </p>
          )}
        </div>

        {/* 2. Tabel rincian */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4 text-teal-700" />
            <h4 className="text-[12px] font-bold uppercase tracking-wide text-slate-700">
              2. Rincian Kebutuhan BOP
            </h4>
          </div>

          {daftar.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-[12px] font-medium text-slate-400">
              Belum ada baris. Pilih material pada bagian di atas lalu klik Tambah.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[640px] text-[12px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wide">
                    <th className="px-2.5 py-2 text-left font-bold w-8">Nomor</th>
                    <th className="px-2.5 py-2 text-left font-bold">Material</th>
                    <th className="px-2.5 py-2 text-right font-bold">Volume</th>
                    <th className="px-2.5 py-2 text-center font-bold">Satuan</th>
                    <th className="px-2.5 py-2 text-right font-bold">Harga Satuan</th>
                    <th className="px-2.5 py-2 text-right font-bold">Total Harga</th>
                    <th className="px-2.5 py-2 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {daftar.map((r, i) => (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="px-2.5 py-2 font-bold text-slate-400 tabular-nums">
                        {i + 1}
                      </td>
                      <td className="px-2.5 py-2 font-mono text-slate-800">{r.designator}</td>
                      <td className="px-2.5 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={r.vol}
                          onChange={e => ubahVol(r.id, e.target.value)}
                          aria-label={`Volume ${r.designator}`}
                          className="w-24 min-h-[32px] px-2 rounded-lg border border-slate-300 bg-white text-right text-[12px] tabular-nums text-slate-800 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15"
                        />
                      </td>
                      <td className="px-2.5 py-2 text-center text-slate-700">
                        {r.satuan || '—'}
                      </td>
                      <td className="px-2.5 py-2 text-right font-mono text-slate-700">
                        {r.catatan ?? formatRupiah(r.hargaSatuan)}
                      </td>
                      <td className="px-2.5 py-2 text-right font-mono font-semibold text-teal-700">
                        {r.catatan ? '—' : formatRupiah(r.vol * r.hargaSatuan)}
                      </td>
                      <td className="px-2.5 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => hapusBaris(r.id)}
                          aria-label={`Hapus ${r.designator}`}
                          className="w-7 h-7 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={6} className="px-2.5 py-2 text-right text-[11px] text-slate-600">
                      Total BOP
                    </td>
                    <td className="px-2.5 py-2 text-right font-mono text-teal-800">
                      {formatRupiah(totalBop)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={6} className="px-2.5 py-2 text-right text-[11px] text-slate-600">
                      % Total BOP / Total BoQ
                    </td>
                    <td className="px-2.5 py-2 text-right font-mono text-teal-800">
                      {persenBop.toFixed(2).replace('.', ',')}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* 4. Nilai Perizinan (Preliminary) */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-teal-700" />
            <h4 className="text-[12px] font-bold uppercase tracking-wide text-slate-700">
              4. Nilai Perizinan (Preliminary) yang dapat dilakukan reimbursement
            </h4>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <TextField
              id="bop-nilai-perizinan"
              label="Nilai Perizinan"
              type="number"
              min={0}
              step={100000}
              inputMode="numeric"
              prefix="Rp"
              suffix=",-"
              containerClassName="w-full max-w-xs"
              value={perizinan}
              readOnly
              hint="Otomatis dari Rincian Total Nilai Pengajuan IF Project (langkah PP) — tidak diisi manual."
              hintTone="muted"
              onChange={e => {
                setPerizinan(Math.max(0, Number(e.target.value) || 0));
                setSaveError(null);
              }}
            />
            <p className="text-[11px] text-slate-500">
              Total BoQ:{' '}
              <span className="font-bold text-slate-700">{formatRupiah(totalBoq)}</span>
            </p>
          </div>
        </div>

        {/* 5. V. Manajemen Risiko */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-teal-700" />
            <h4 className="text-[12px] font-bold uppercase tracking-wide text-slate-700">
              5. Manajemen Risiko
            </h4>
          </div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            {LEVEL_RISIKO.map(lvl => (
              <label
                key={lvl}
                className="inline-flex cursor-pointer items-center gap-2 text-[12px] font-bold text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={risiko === lvl}
                  onChange={() => setRisiko(prev => (prev === lvl ? '' : lvl))}
                  className="h-4 w-4 rounded border-slate-300 accent-teal-700 focus:ring-2 focus:ring-teal-600/30"
                />
                {lvl}
              </label>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Pilih satu tingkat risiko proyek — digenerate ke dokumen sebagai bagian V.
          </p>
        </div>

        {/* Footer aksi */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-100">
          <div className="min-h-[20px] text-[11px] font-semibold text-rose-600">
            {saveError && (
              <span role="alert" className="inline-flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                {saveError}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-5 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={simpan}
              className="inline-flex items-center gap-1.5 min-h-[42px] px-6 rounded-full text-xs font-bold text-white bg-teal-800 hover:bg-teal-700 shadow-md transition-colors"
            >
              <Save className="w-4 h-4" />
              Simpan Rincian BOP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
