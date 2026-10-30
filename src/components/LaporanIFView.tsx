import React, { useState } from 'react';
import { ImprestFundEntry, ProjectSubmission } from '../types';
import { formatRupiah, formatTanggalIndo } from '../db/storage';
import { 
  WalletCards, 
  ArrowDownLeft, 
  ArrowUpRight, 
  PlusCircle, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  Search, 
  Filter, 
  CheckCircle2, 
  Building2, 
  CreditCard,
  Sparkles
} from 'lucide-react';

interface LaporanIFViewProps {
  entries: ImprestFundEntry[];
  submissions: ProjectSubmission[];
  onAddEntry: (entry: Omit<ImprestFundEntry, 'id' | 'nomorTransaksi' | 'saldo'>) => void;
}

export const LaporanIFView: React.FC<LaporanIFViewProps> = ({
  entries,
  submissions,
  onAddEntry,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTx, setSearchTx] = useState<string>('');
  const [isTopupModalOpen, setIsTopupModalOpen] = useState<boolean>(false);

  // Modal form states
  const [txTipe, setTxTipe] = useState<ImprestFundEntry['tipe']>('DROP_DANA_IF');
  const [nominal, setNominal] = useState<number>(50000000);
  const [keterangan, setKeterangan] = useState<string>('');
  const [penerima, setPenerima] = useState<string>('Treasury Admin Proyek');
  const [petugasTA, setPetugasTA] = useState<string>('Siti Nurhaliza (Finance Admin)');

  // Calculations
  const totalDebit = entries.reduce((acc, curr) => acc + (curr.debit || 0), 0);
  const totalKredit = entries.reduce((acc, curr) => acc + (curr.kredit || 0), 0);
  const currentSaldo = entries.length > 0 ? entries[0].saldo : 0;
  const totalPencairanPrelim = entries
    .filter(e => e.tipe === 'PENCAIRAN_PRELIM')
    .reduce((acc, curr) => acc + curr.kredit, 0);

  const filteredEntries = entries.filter(e => {
    const matchType = filterType === 'ALL' || e.tipe === filterType;
    const matchSearch = searchTx === '' ||
      e.nomorTransaksi.toLowerCase().includes(searchTx.toLowerCase()) ||
      (e.proyek && e.proyek.toLowerCase().includes(searchTx.toLowerCase())) ||
      (e.nomorSPK && e.nomorSPK.toLowerCase().includes(searchTx.toLowerCase())) ||
      e.penerima.toLowerCase().includes(searchTx.toLowerCase()) ||
      e.keterangan.toLowerCase().includes(searchTx.toLowerCase());

    return matchType && matchSearch;
  });

  const handleExportCSV = () => {
    const headers = ['No Transaksi', 'Tanggal', 'No SPK', 'Proyek', 'Penerima', 'Tipe', 'Debit', 'Kredit', 'Saldo', 'Keterangan', 'Petugas TA'];
    const rows = entries.map(e => [
      e.nomorTransaksi,
      e.tanggal,
      e.nomorSPK || '-',
      `"${e.proyek || '-'}"`,
      `"${e.penerima}"`,
      e.tipe,
      e.debit,
      e.kredit,
      e.saldo,
      `"${e.keterangan}"`,
      e.petugasTA,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Imprest_Fund_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintLaporan = () => {
    window.print();
  };

  const handleSubmitTopup = (e: React.FormEvent) => {
    e.preventDefault();
    const isDebit = txTipe === 'DROP_DANA_IF' || txTipe === 'SETOR_SISA_PRELIM';
    onAddEntry({
      tanggal: new Date().toISOString().split('T')[0],
      penerima,
      tipe: txTipe,
      debit: isDebit ? nominal : 0,
      kredit: !isDebit ? nominal : 0,
      keterangan: keterangan || 'Transaksi mutasi kas Imprest Fund',
      petugasTA,
    });

    setIsTopupModalOpen(false);
    setKeterangan('');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-800 text-white flex items-center justify-center shadow-md">
            <WalletCards className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Laporan Kas Imprest Fund (IF)</h2>
            <p className="text-xs text-slate-500">
              Buku kas mutasi pencairan panjar prelim, pengisian plafon IF, dan monitoring saldo kas proyek
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTopupModalOpen(true)}
            className="text-xs font-bold bg-teal-800 hover:bg-teal-900 text-white px-3.5 py-2 rounded-full shadow-sm transition-all flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4 text-emerald-300" />
            <span>+ Catat Transaksi IF</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-full transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrintLaporan}
            className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-full shadow-sm transition-all flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Cetak Laporan Kas</span>
          </button>
        </div>
      </div>

      {/* 4 Key Highlight Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Sisa Saldo Kas Aktif */}
        <div className="bg-gradient-to-br from-slate-900 to-teal-950 text-white p-4 rounded-3xl shadow-sm border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Sisa Saldo Kas IF Aktif</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-amber-400 tracking-tight">
              {formatRupiah(currentSaldo)}
            </div>
            <div className="text-[11px] text-teal-300/80 mt-0.5">Siap digunakan untuk panjar prelim</div>
          </div>
          <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-800 flex justify-between">
            <span>Plafon Operasional</span>
            <span className="text-white font-semibold">Terkontrol</span>
          </div>
        </div>

        {/* Metric 2: Total Drop Dana Masuk */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Plafon / Drop Dana</span>
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl font-bold text-slate-900">
              {formatRupiah(totalDebit)}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Top-up Kas Masuk</div>
          </div>
          <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
            Sumber: Kas Besar / Treasury Pusat
          </div>
        </div>

        {/* Metric 3: Total Pencairan Panjar Prelim */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Panjar Prelim Cair</span>
            <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-xl font-bold text-rose-700">
              {formatRupiah(totalPencairanPrelim)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Tercatat di Dokumen IF</div>
          </div>
          <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
            {entries.filter(e => e.tipe === 'PENCAIRAN_PRELIM').length} Proyek Terdisposisi
          </div>
        </div>

        {/* Metric 4: Ratio Penyerapan IF */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Rasio Penyerapan IF</span>
            <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full">
              Q1-2026
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-900">
              {totalDebit > 0 ? Math.round((totalKredit / totalDebit) * 100) : 0}%
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Penyerapan dari Plafon Kas</div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
            <div 
              className="bg-amber-500 h-full rounded-full" 
              style={{ width: `${totalDebit > 0 ? Math.min(100, Math.round((totalKredit / totalDebit) * 100)) : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
              filterType === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Semua Mutasi ({entries.length})
          </button>
          <button
            onClick={() => setFilterType('PENCAIRAN_PRELIM')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
              filterType === 'PENCAIRAN_PRELIM'
                ? 'bg-rose-700 text-white shadow-sm'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-800'
            }`}
          >
            Pencairan Panjar Prelim
          </button>
          <button
            onClick={() => setFilterType('DROP_DANA_IF')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
              filterType === 'DROP_DANA_IF'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
            }`}
          >
            Drop Plafon Kas
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTx}
            onChange={e => setSearchTx(e.target.value)}
            placeholder="Cari transaksi, SPK, nama penerima..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 focus:bg-white rounded-full border border-slate-200 focus:border-teal-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Transaction Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/70">
                <th className="py-3 px-4">No. Transaksi & Tgl</th>
                <th className="py-3 px-4">Uraian / Keterangan Proyek</th>
                <th className="py-3 px-4">Penerima & Rekening</th>
                <th className="py-3 px-4 text-right">Debit (Masuk)</th>
                <th className="py-3 px-4 text-right">Kredit (Panjar)</th>
                <th className="py-3 px-4 text-right">Saldo Kas IF</th>
                <th className="py-3 px-4 text-center">Petugas TA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map(tx => {
                const isDebit = tx.debit > 0;
                return (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* No TRX & Date */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 font-mono">{tx.nomorTransaksi}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{formatTanggalIndo(tx.tanggal)}</div>
                      {tx.nomorSPK && (
                        <span className="text-[10px] bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded font-mono inline-block mt-0.5">
                          {tx.nomorSPK}
                        </span>
                      )}
                    </td>

                    {/* Uraian */}
                    <td className="py-3.5 px-4 max-w-[280px]">
                      <div className="font-semibold text-slate-800 line-clamp-2">
                        {tx.keterangan}
                      </div>
                      {tx.proyek && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Proyek: {tx.proyek}
                        </div>
                      )}
                    </td>

                    {/* Penerima */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <div className="font-medium text-slate-800">{tx.penerima}</div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block mt-1 ${
                        tx.tipe === 'PENCAIRAN_PRELIM' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {tx.tipe.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Debit */}
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-700">
                      {tx.debit > 0 ? formatRupiah(tx.debit) : '-'}
                    </td>

                    {/* Kredit */}
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-rose-700">
                      {tx.kredit > 0 ? formatRupiah(tx.kredit) : '-'}
                    </td>

                    {/* Saldo Kas */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                      {formatRupiah(tx.saldo)}
                    </td>

                    {/* Petugas TA */}
                    <td className="py-3.5 px-4 text-center text-slate-500 text-[11px]">
                      {tx.petugasTA}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Topup / Add Transaction Modal */}
      {isTopupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-800 text-white flex items-center justify-center">
                  <WalletCards className="w-4 h-4 text-emerald-300" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Catat Transaksi Imprest Fund (IF)</h3>
              </div>
              <button
                onClick={() => setIsTopupModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitTopup} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Tipe Mutasi *</label>
                <select
                  value={txTipe}
                  onChange={e => setTxTipe(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 font-medium text-slate-800"
                >
                  <option value="DROP_DANA_IF">Drop Dana / Replenishment Plafon (Debit Masuk)</option>
                  <option value="PENCAIRAN_PRELIM">Pencairan Panjar Prelim Proyek (Kredit Keluar)</option>
                  <option value="SETOR_SISA_PRELIM">Setor Sisa Prelim Proyek (Debit Masuk)</option>
                  <option value="BIAYA_OPERASIONAL">Biaya Operasional Treasury Lainnya (Kredit Keluar)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Nominal (Rp) *</label>
                <input
                  type="number"
                  step="100000"
                  required
                  value={nominal}
                  onChange={e => setNominal(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm"
                />
                <span className="text-[11px] text-teal-700 font-semibold mt-0.5 block">{formatRupiah(nominal)}</span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Pihak Penerima / Asal Dana *</label>
                <input
                  type="text"
                  required
                  value={penerima}
                  onChange={e => setPenerima(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Keterangan / Uraian Transaksi *</label>
                <textarea
                  rows={2}
                  required
                  value={keterangan}
                  onChange={e => setKeterangan(e.target.value)}
                  placeholder="Contoh: Pengisian kembali kas kecil operasional IF bulan Maret..."
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-slate-800"
                ></textarea>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Petugas Treasury Admin (TA)</label>
                <input
                  type="text"
                  value={petugasTA}
                  onChange={e => setPetugasTA(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTopupModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-full font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-md"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
