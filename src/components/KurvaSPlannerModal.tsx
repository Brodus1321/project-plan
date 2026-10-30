import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Layers,
  Package,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { KurvaSPlan, KurvaSProgress, KurvaSEntry } from '../types';
import { KURVA_S_ITEMS, KURVA_S_PROGRES_DEFAULT } from '../db/kurvaSMaster';
import {
  formatRupiah,
  formatTanggalIndo,
  mingguDariTanggal,
  nilaiEntry,
  patokanKurvaS,
  rekapKurvaSPlan,
} from '../db/storage';
import { SearchSelectField, TextField, SelectField } from './wizard/Field';

interface KurvaSPlannerModalProps {
  plan: KurvaSPlan | null;
  /** Durasi kerja (hari) dari langkah SPK, dipakai menghitung minggu ke berapa tanggal jatuh. */
  durasiHari: number;
  onClose: () => void;
  onSave: (plan: KurvaSPlan) => void;
}

const buatId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const progresAwal = (): KurvaSProgress[] =>
  KURVA_S_PROGRES_DEFAULT.map(nama => ({ id: buatId(), nama, tanggal: '' }));

/**
 * Popup isian data Kurva S.
 * 1. Admin isi Tanggal Mulai Kerja Mandor (patokan waktu).
 * 2. Daftar progres fleksibel - tiap progres punya tanggal sendiri (TGL-BLN-THN).
 * 3. Tiap progres admin menambah item: search nama item dari master KURVA S.xlsx,
 *    isi qty, lalu pilih kolom progresnya.
 */
export const KurvaSPlannerModal: React.FC<KurvaSPlannerModalProps> = ({
  plan,
  durasiHari,
  onClose,
  onSave,
}) => {
  const [tanggalMulaiMandor, setTanggalMulaiMandor] = useState(
    plan?.tanggalMulaiMandor ?? ''
  );
  const [progres, setProgres] = useState<KurvaSProgress[]>(
    plan?.progres?.length ? plan.progres : progresAwal()
  );
  const [entries, setEntries] = useState<KurvaSEntry[]>(plan?.entries ?? []);

  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('');
  const [progressId, setProgressId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const itemOptions = useMemo(
    () => KURVA_S_ITEMS.map(i => ({ value: i.nama, label: i.nama })),
    []
  );
  const progresOptions = useMemo(
    () => progres.map(p => ({ value: p.id, label: p.nama || '(tanpa nama)' })),
    [progres]
  );

  const masterTerpilih = KURVA_S_ITEMS.find(i => i.nama === itemId);
  const rekap = useMemo(() => rekapKurvaSPlan({ tanggalMulaiMandor, progres, entries }), [
    tanggalMulaiMandor,
    progres,
    entries,
  ]);

  // Patokan minggu = terawal antara mulai kerja mandor & tanggal progres terisi.
  const patokan = useMemo(
    () => patokanKurvaS({ tanggalMulaiMandor, progres, entries }),
    [tanggalMulaiMandor, progres, entries]
  );

  /** Minggu ke berapa tiap progres jatuh pada kurva (null bila belum ada tanggal). */
  const mingguProgres = (id: string): number | null => {
    const tgl = progres.find(p => p.id === id)?.tanggal;
    if (!tgl) return null;
    return mingguDariTanggal(patokan, tgl, durasiHari);
  };

  // Peringatan bila seluruh progres berisi jatuh di minggu yang sama
  // (kurva akan langsung melonjak ke 100% pada minggu itu).
  const mingguTerisi = rekap.baris
    .filter(b => b.nilai > 0 && b.tanggal)
    .map(b => mingguDariTanggal(patokan, b.tanggal, durasiHari))
    .filter((m): m is number => m !== null);
  const mingguTunggal =
    mingguTerisi.length >= 2 && new Set(mingguTerisi).size === 1 ? mingguTerisi[0] : null;

  const ubahProgres = (id: string, patch: Partial<KurvaSProgress>) =>
    setProgres(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));

  const hapusProgres = (id: string) => {
    setProgres(prev => prev.filter(p => p.id !== id));
    setEntries(prev => prev.filter(e => e.progressId !== id));
    if (progressId === id) setProgressId('');
  };

  const tambahProgres = () =>
    setProgres(prev => [...prev, { id: buatId(), nama: `Progres ${prev.length + 1}`, tanggal: '' }]);

  const tambahEntry = () => {
    if (!itemId) return setFormError('Pilih nama item dari master terlebih dahulu.');
    if (!qty || Number(qty) <= 0) return setFormError('Qty harus lebih dari 0.');
    if (!progressId) return setFormError('Pilih kolom progres tujuan.');

    const master = KURVA_S_ITEMS.find(i => i.nama === itemId);
    if (!master) return setFormError('Item tidak ada di master KURVA S.');

    setEntries(prev => [
      ...prev,
      {
        id: buatId(),
        item: master.nama,
        material: master.material,
        jasa: master.jasa,
        qty: Number(qty),
        progressId,
      },
    ]);
    setItemId('');
    setQty('');
    setFormError(null);
  };

  const hapusEntry = (id: string) => setEntries(prev => prev.filter(e => e.id !== id));

  const simpan = () => {
    if (!tanggalMulaiMandor)
      return setSaveError('Tanggal Mulai Kerja Mandor wajib diisi.');
    if (!progres.length) return setSaveError('Tambahkan minimal satu progres.');
    if (!entries.length)
      return setSaveError('Tambahkan minimal satu item ke salah satu progres.');

    const belumTanggal = progres.filter(
      p => entries.some(e => e.progressId === p.id) && !p.tanggal
    );
    if (belumTanggal.length)
      return setSaveError(
        `Progres berikut belum punya tanggal: ${belumTanggal.map(p => p.nama || '(tanpa nama)').join(', ')}.`
      );

    onSave({ tanggalMulaiMandor, progres, entries });
  };

  const namaProgress = (id: string) => progres.find(p => p.id === id)?.nama ?? '-';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-5xl p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[94vh] overflow-y-auto">
        {/* Kepala */}
        <div className="flex items-start justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-800 text-white flex items-center justify-center shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Isi Data Kurva S</h3>
              <p className="text-xs text-slate-500">
                Tanggal mulai kerja mandor &rarr; tanggal tiap progres &rarr; item + qty per progres.
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

        {/* 1. Tanggal mulai kerja mandor */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-teal-700" />
            <h4 className="text-[12px] font-bold uppercase tracking-wide text-slate-700">
              1. Tanggal Mulai Kerja Mandor
            </h4>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <TextField
              id="ks-tgl-mulai"
              label="Mulai Kerja Mandor"
              type="date"
              required
              value={tanggalMulaiMandor}
              onChange={e => {
                setTanggalMulaiMandor(e.target.value);
                setSaveError(null);
              }}
              hint="Patokan awal sumbu waktu Kurva S."
            />
            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3 self-end">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">
                  Total Item
                </p>
                <p className="text-sm font-black text-slate-800">{entries.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">
                  Total Qty
                </p>
                <p className="text-sm font-black text-slate-800">{rekap.totalQty}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 col-span-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">
                  Total Nilai
                </p>
                <p className="text-sm font-black text-teal-700">
                  {formatRupiah(rekap.totalNilai)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Daftar progres */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-teal-700" />
              <h4 className="text-[12px] font-bold uppercase tracking-wide text-slate-700">
                2. Kolom Progres (TGL-BLN-THN)
              </h4>
            </div>
            <button
              type="button"
              onClick={tambahProgres}
              className="inline-flex items-center gap-1.5 min-h-[34px] px-3 rounded-full text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Progres
            </button>
          </div>

          <div className="space-y-2">
            {progres.map((p, idx) => {
              const adaIsi = entries.some(e => e.progressId === p.id);
              const mg = mingguProgres(p.id);
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-[28px_minmax(0,1.1fr)_minmax(0,1.5fr)_36px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-2.5 py-2"
                >
                  <span className="text-[11px] font-black text-teal-700 tabular-nums text-center">
                    {idx + 1}
                  </span>
                  <input
                    value={p.nama}
                    onChange={e => ubahProgres(p.id, { nama: e.target.value })}
                    aria-label={`Nama progres ${idx + 1}`}
                    className="w-full min-h-[36px] px-3 rounded-lg border border-slate-300 bg-white text-[13px] text-slate-800 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15"
                  />
                  <div className="flex min-w-0 items-center gap-1.5">
                    <input
                      type="date"
                      value={p.tanggal}
                      onChange={e => ubahProgres(p.id, { tanggal: e.target.value })}
                      aria-label={`Tanggal progres ${p.nama}`}
                      className="w-full min-w-0 min-h-[36px] px-2 rounded-lg border border-slate-300 bg-white text-[12px] text-slate-800 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15"
                    />
                    {p.tanggal && mg !== null && (
                      <span
                        title={`Jatuh di minggu ke-${mg} pada kurva`}
                        className="shrink-0 rounded-full bg-teal-800 px-2 py-1 text-[10px] font-black text-white tabular-nums"
                      >
                        Mg {mg}
                      </span>
                    )}
                    {adaIsi && !p.tanggal && (
                      <span className="shrink-0 text-[10px] font-bold text-rose-600">
                        wajib
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => hapusProgres(p.id)}
                    aria-label={`Hapus progres ${p.nama}`}
                    className="w-9 h-9 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Tambah item */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-teal-700" />
            <h4 className="text-[12px] font-bold uppercase tracking-wide text-slate-700">
              3. Tambah Item ke Kolom Progres
            </h4>
            <span className="text-[10px] font-bold text-slate-400">
              master {KURVA_S_ITEMS.length} item
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <SearchSelectField
              id="ks-item"
              label="Nama Item"
              required
              containerClassName="md:col-span-5"
              options={itemOptions}
              value={itemId}
              onChange={v => {
                setItemId(v);
                setFormError(null);
              }}
              placeholder="Ketik untuk mencari nama item..."
              emptyLabel="Item tidak ditemukan di master"
              hint={
                masterTerpilih
                  ? `Material ${formatRupiah(masterTerpilih.material)} · Jasa ${formatRupiah(
                      masterTerpilih.jasa
                    )}${masterTerpilih.catatan ? ` · ${masterTerpilih.catatan}` : ''}`
                  : 'Sumber: KURVA S.xlsx'
              }
              hintTone={masterTerpilih ? 'accent' : 'muted'}
            />

            <TextField
              id="ks-qty"
              label="Qty"
              required
              type="number"
              min={0}
              inputMode="numeric"
              containerClassName="md:col-span-2"
              value={qty}
              onChange={e => {
                setQty(e.target.value);
                setFormError(null);
              }}
              placeholder="0"
              error={formError && !qty ? 'Wajib diisi.' : undefined}
            />

            <SelectField
              id="ks-progres"
              label="Kolom Progres"
              required
              containerClassName="md:col-span-3"
              value={progressId}
              onChange={e => {
                setProgressId(e.target.value);
                setFormError(null);
              }}
              error={formError && !progressId ? 'Pilih progres.' : undefined}
            >
              <option value="">— Pilih progres —</option>
              {progresOptions.map(o => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectField>

            <div className="md:col-span-2 flex items-end">
              <button
                type="button"
                onClick={tambahEntry}
                className="w-full inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl text-xs font-bold text-white bg-teal-800 hover:bg-teal-700 shadow-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                Tambah
              </button>
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

          {masterTerpilih && Number(qty) > 0 && progressId && (
            <p className="mt-2 text-[11px] font-semibold text-teal-700">
              Akan masuk ke kolom{' '}
              <strong>{namaProgress(progressId)}</strong> senilai{' '}
              {formatRupiah(nilaiEntry({
                id: '',
                item: masterTerpilih.nama,
                material: masterTerpilih.material,
                jasa: masterTerpilih.jasa,
                qty: Number(qty),
                progressId,
              }))}
            </p>
          )}
        </div>

        {/* 4. Rekap + tabel isian */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-teal-700" />
            <h4 className="text-[12px] font-bold uppercase tracking-wide text-slate-700">
              4. Rekap &amp; Baris Isian
            </h4>
          </div>

          {entries.length > 0 && (
            <p className="mb-3 text-[11px] font-semibold text-slate-500">
              Patokan minggu:{' '}
              <span className="font-bold text-slate-700">{formatTanggalIndo(patokan)}</span> —
              minggu dihitung dari tanggal ini, tiap progres jatuh ke minggu sesuai tanggalnya.
            </p>
          )}

          {mingguTunggal !== null && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <p className="text-[11px] font-semibold leading-snug text-amber-800">
                Semua progres berisi tanggalnya jatuh di minggu ke-{mingguTunggal}, sehingga
                kurva langsung mencapai 100% pada minggu tersebut. Periksa kembali tanggal tiap
                progres bila jadwalnya seharusnya menyebar di beberapa minggu.
              </p>
            </div>
          )}

          {rekap.baris.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
              {rekap.baris.map(b => (
                <div
                  key={b.progressId}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-700 truncate">
                      {b.nama || '(tanpa nama)'}
                    </span>
                    <span className="text-[11px] font-black text-teal-700 tabular-nums">
                      {b.bobot}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {b.tanggal
                      ? `${formatTanggalIndo(b.tanggal)}${
                          b.nilai > 0 ? ` · Mg ${mingguDariTanggal(patokan, b.tanggal, durasiHari) ?? 1}` : ''
                        }`
                      : 'tanpa tanggal'}
                  </p>
                  <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-600 transition-[width] duration-300"
                      style={{ width: `${Math.min(100, b.bobot)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] font-semibold text-slate-600">
                    {formatRupiah(b.nilai)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {entries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-[12px] font-medium text-slate-400">
              Belum ada isian. Pilih nama item, isi qty, lalu pilih kolom progres.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wide">
                    <th className="px-2.5 py-2 text-left font-bold w-8">#</th>
                    <th className="px-2.5 py-2 text-left font-bold">Item</th>
                    <th className="px-2.5 py-2 text-right font-bold">Material</th>
                    <th className="px-2.5 py-2 text-right font-bold">Jasa</th>
                    <th className="px-2.5 py-2 text-right font-bold">Qty</th>
                    <th className="px-2.5 py-2 text-right font-bold">Nilai</th>
                    <th className="px-2.5 py-2 text-left font-bold">Progres</th>
                    <th className="px-2.5 py-2 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.map((e, i) => (
                    <tr key={e.id} className="hover:bg-slate-50/80">
                      <td className="px-2.5 py-2 text-slate-400 tabular-nums">{i + 1}</td>
                      <td className="px-2.5 py-2 font-medium text-slate-800">{e.item}</td>
                      <td className="px-2.5 py-2 text-right font-mono text-slate-500">
                        {formatRupiah(e.material)}
                      </td>
                      <td className="px-2.5 py-2 text-right font-mono text-slate-500">
                        {formatRupiah(e.jasa)}
                      </td>
                      <td className="px-2.5 py-2 text-right font-mono text-slate-700">
                        {e.qty}
                      </td>
                      <td className="px-2.5 py-2 text-right font-mono font-semibold text-teal-700">
                        {formatRupiah(nilaiEntry(e))}
                      </td>
                      <td className="px-2.5 py-2">
                        <span className="inline-block rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                          {namaProgress(e.progressId)}
                        </span>
                      </td>
                      <td className="px-2.5 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => hapusEntry(e.id)}
                          aria-label={`Hapus ${e.item}`}
                          className="w-7 h-7 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-semibold">
                    <td colSpan={4} className="px-2.5 py-2 text-right text-[11px] text-slate-500">
                      Total ({entries.length} item)
                    </td>
                    <td className="px-2.5 py-2 text-right font-mono text-slate-700">
                      {rekap.totalQty}
                    </td>
                    <td className="px-2.5 py-2 text-right font-mono text-teal-700 font-bold">
                      {formatRupiah(rekap.totalNilai)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
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
              Simpan Data Kurva S
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
