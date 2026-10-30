import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ProjectSubmission } from '../types';
import {
  muatTemplate,
  renderDokumen,
  type TemplateDokumen,
  type FilterTab,
} from '../lib/docxTemplate';
import {
  Printer,
  X,
  FileDown,
  Settings2,
  Lock,
} from 'lucide-react';

interface PrintDocumentModalProps {
  submission: ProjectSubmission;
  onClose: () => void;
  /**
   * false = mode pratinjau saja: dokumen bisa dicek di layar, tetapi tombol
   * Cetak PDF & Ekspor Word dikunci sampai pengajuan terverifikasi.
   * Default true (dipanggil dari menu lain setelah lolos gerbang).
   */
  allowDownload?: boolean;
}

/** Daftar kertas: [kode, lebar mm, tinggi mm]. */
const PAPER: Record<string, { label: string; w: number; h: number }> = {
  A4: { label: 'A4 (210 × 297 mm)', w: 210, h: 297 },
  A5: { label: 'A5 (148 × 210 mm)', w: 148, h: 210 },
  A3: { label: 'A3 (297 × 420 mm)', w: 297, h: 420 },
  F4: { label: 'F4 / Folio (216 × 330 mm)', w: 216, h: 330 },
  Legal: { label: 'Legal (216 × 356 mm)', w: 216, h: 356 },
  Letter: { label: 'Letter (216 × 279 mm)', w: 216, h: 279 },
};

const MARGIN_PRESET: { label: string; nilai: number; ket: string }[] = [
  { label: 'Template Masterpp', nilai: -2, ket: 'atas 13 · bawah 13 · kiri/kanan 16 mm (sesuai masterpp.docx)' },
  { label: 'Normal 2,5 cm', nilai: 25, ket: 'semua sisi 2,5 cm' },
  { label: 'Rapat 1,5 cm', nilai: 15, ket: 'semua sisi 1,5 cm' },
  { label: 'Surat Dinas', nilai: -1, ket: 'atas 4 · kanan 3 · bawah 3 · kiri 4 cm' },
  { label: 'Lebar 3 cm', nilai: 30, ket: 'semua sisi 3 cm' },
];

const FONT_STACK: Record<string, string> = {
  sans: 'Arial, Helvetica, sans-serif',
  serif: "'Times New Roman', Times, serif",
  mono: "'Courier New', Courier, monospace",
};

const mmKePx = (mm: number) => (mm * 96) / 25.4;

interface PengaturanCetak {
  kertas: keyof typeof PAPER;
  orientasi: 'portrait' | 'landscape';
  margin: { atas: number; kanan: number; bawah: number; kiri: number }; // mm
  skala: number; // skala cetak (1 = 100%)
  zoomPreview: number;
  fontUkuran: number; // pt
  fontJenis: keyof typeof FONT_STACK;
  footerAktif: boolean;
  footerTeks: string;
}

const PENGATURAN_AWAL: PengaturanCetak = {
  kertas: 'A4',
  orientasi: 'portrait',
  // default mengikuti pgMar masterpp.docx (atas/bawah 13 mm · kiri/kanan 16 mm)
  margin: { atas: 13, kanan: 16, bawah: 13, kiri: 16 },
  skala: 1,
  zoomPreview: 0.75,
  fontUkuran: 10.5,
  fontJenis: 'sans',
  footerAktif: true,
  footerTeks: 'Sistem Manajemen Pengajuan Prelim Proyek • Dokumen Sah Digital',
};

/** Label tab dokumen. */
const TABS = [
  { key: 'BUNDLE', label: 'Bundle Lengkap (Semua Berkas)' },
  { key: 'BAKH', label: 'BAKH & Kesepakatan Harga' },
  { key: 'SPK', label: 'SPK' },
  { key: 'PP', label: 'PP & Kurva S' },
  { key: 'PANJAR', label: 'Pengajuan Panjar' },
  { key: 'PROGRES', label: 'Progres / Termin' },
  { key: 'IF', label: 'Imprest Fund (IF)' },
  { key: 'EVIDEN', label: 'Eviden Transfer & ST' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/** Input angka kecil (mm/pt) untuk panel pengaturan. */
const AngkaInput: React.FC<{
  label: string;
  value: number;
  satuan: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}> = ({ label, value, satuan, min = 0, max = 500, step = 1, onChange }) => (
  <label className="block">
    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
      {label}
    </span>
    <span className="mt-1 flex items-center gap-1">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={e => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
        className="w-full min-h-[32px] px-2 rounded-lg border border-slate-300 bg-white text-[12px] tabular-nums text-slate-800 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15"
      />
      <span className="text-[10px] font-semibold text-slate-400">{satuan}</span>
    </span>
  </label>
);

export const PrintDocumentModal: React.FC<PrintDocumentModalProps> = ({
  submission,
  onClose,
  allowDownload = true,
}) => {
  const [activeDocTab, setActiveDocTab] = useState<TabKey>('BUNDLE');
  const [setelan, setSetelan] = useState<PengaturanCetak>(PENGATURAN_AWAL);
  const [infoHalaman, setInfoHalaman] = useState(1);
  const [template, setTemplate] = useState<TemplateDokumen | null>(null);
  const [memuatTemplate, setMemuatTemplate] = useState(true);
  const [galatTemplate, setGalatTemplate] = useState<string | null>(null);
  const docRef = useRef<HTMLDivElement>(null);

  const muat = () => {
    setMemuatTemplate(true);
    setGalatTemplate(null);
    muatTemplate()
      .then(t => setTemplate(t))
      .catch(e => setGalatTemplate(e instanceof Error ? e.message : String(e)))
      .finally(() => setMemuatTemplate(false));
  };

  useEffect(() => {
    muat();
  }, []);

  /** HTML dokumen dari template masterpp.docx (satu-satunya sumber kebenaran). */
  const htmlDokumen = useMemo(
    () => (template ? renderDokumen(template, submission, activeDocTab as FilterTab) : ''),
    [template, submission, activeDocTab]
  );

  const siapCetak = Boolean(template) && htmlDokumen.length > 0;
  /** Izin aksi: lolos verifikasi DAN template sudah ter-render. */
  const bolehAksi = allowDownload && siapCetak;

  const paper = PAPER[setelan.kertas];
  const lebarMm = setelan.orientasi === 'landscape' ? paper.h : paper.w;
  const tinggiMm = setelan.orientasi === 'landscape' ? paper.w : paper.h;
  const { atas, kanan, bawah, kiri } = setelan.margin;

  const ubah = (patch: Partial<PengaturanCetak>) => setSetelan(prev => ({ ...prev, ...patch }));
  const ubahMargin = (sisi: keyof PengaturanCetak['margin'], nilai: number) =>
    setSetelan(prev => ({ ...prev, margin: { ...prev.margin, [sisi]: nilai } }));

  /** Garis margin antar halaman pada preview (tidak ikut dicetak). */
  const zonaMargin = () => {
    const h = mmKePx(tinggiMm);
    const atasPx = mmKePx(atas);
    const bawahPx = mmKePx(bawah);
    if (h - atasPx - bawahPx <= 0) return undefined;
    return [
      `repeating-linear-gradient(to bottom, rgba(245,158,11,0.16) 0 ${atasPx}px, transparent ${atasPx}px ${h}px)`,
      `repeating-linear-gradient(to bottom, transparent 0 ${h - bawahPx}px, rgba(245,158,11,0.16) ${h - bawahPx}px ${h}px)`,
    ].join(', ');
  };

  /** Perkiraan jumlah halaman untuk pengaturan saat ini. */
  useEffect(() => {
    const el = docRef.current;
    if (!el) return;
    const isiPx = el.scrollHeight;
    const perHalamanPx = mmKePx(tinggiMm - atas - bawah);
    if (perHalamanPx <= 0) return;
    setInfoHalaman(Math.max(1, Math.ceil(isiPx / perHalamanPx)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setelan, activeDocTab, htmlDokumen]);

  const handlePrint = () => {
    if (!bolehAksi) return;
    window.print();
  };

  /** Ekspor isi dokumen ke Word (.doc berbasis HTML). */
  const handleExportWord = async () => {
    if (!bolehAksi) return;
    const el = docRef.current;
    if (!el) return;
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.no-print').forEach(n => n.remove());
    // SVG inline (mis. grafik Kurva S) -> PNG data URL agar tampil di Word.
    await Promise.all(
      Array.from(clone.querySelectorAll('svg')).map(async svg => {
        const w = Number(svg.getAttribute('width')) || 640;
        const h = Number(svg.getAttribute('height')) || 220;
        try {
          const data =
            'data:image/svg+xml;charset=utf-8,' +
            encodeURIComponent(new XMLSerializer().serializeToString(svg));
          const img = await new Promise<HTMLImageElement>((res, rej) => {
            const im = new Image();
            im.onload = () => res(im);
            im.onerror = () => rej(new Error('svg'));
            im.src = data;
          });
          const skala = 2;
          const canvas = document.createElement('canvas');
          canvas.width = w * skala;
          canvas.height = h * skala;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.scale(skala, skala);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          const repl = document.createElement('img');
          repl.setAttribute('src', canvas.toDataURL('image/png'));
          repl.setAttribute('width', String(w));
          repl.setAttribute('height', String(h));
          svg.parentNode?.replaceChild(repl, svg);
        } catch {
          /* SVG gagal dirasterkan — biarkan inline (tidak merusak ekspor) */
        }
      })
    );
    // blob: (gambar hasil resolver template) -> data URL agar ikut terbawa ke .doc
    await Promise.all(
      Array.from(clone.querySelectorAll('img')).map(async img => {
        const src = img.getAttribute('src') || '';
        if (!src.startsWith('blob:')) return;
        try {
          const blob = await (await fetch(src)).blob();
          const dataUrl = await new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(String(r.result));
            r.onerror = () => rej(r.error);
            r.readAsDataURL(blob);
          });
          img.setAttribute('src', dataUrl);
        } catch {
          /* gambar gagal dikonversi — biarkan (tidak merusak ekspor) */
        }
      })
    );
    const cssDokumen = Array.from(document.querySelectorAll('style'))
      .map(s => s.textContent || '')
      .join('\n');
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Dokumen Prelim ${submission.nomorSPK}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
@page WordSection1 { size: ${lebarMm}mm ${tinggiMm}mm; margin: ${atas}mm ${kanan}mm ${bawah}mm ${kiri}mm; }
div.WordSection1 { page: WordSection1; }
body { font-family: ${FONT_STACK[setelan.fontJenis]}; font-size: ${setelan.fontUkuran}pt; line-height: 1.5; color: #1e293b; }
${cssDokumen}
</style></head><body><div class="WordSection1">${clone.innerHTML}</div></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'application/msword' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `Dokumen_Prelim_${submission.nomorSPK || 'Tanpa_Nomor'}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const terapkanPreset = (label: string) => {
    const preset = MARGIN_PRESET.find(p => p.label === label);
    if (!preset) return;
    if (preset.nilai > 0) {
      ubah({ margin: { atas: preset.nilai, kanan: preset.nilai, bawah: preset.nilai, kiri: preset.nilai } });
    } else if (preset.nilai === -2) {
      ubah({ margin: { atas: 13, kanan: 16, bawah: 13, kiri: 16 } });
    } else {
      ubah({ margin: { atas: 40, kanan: 30, bawah: 30, kiri: 40 } });
    }
  };

  const marginAktif = MARGIN_PRESET.find(
    p =>
      (p.nilai > 0 &&
        atas === p.nilai &&
        kanan === p.nilai &&
        bawah === p.nilai &&
        kiri === p.nilai) ||
      (p.nilai === -2 && atas === 13 && kanan === 16 && bawah === 13 && kiri === 16) ||
      (p.nilai === -1 && atas === 40 && kanan === 30 && bawah === 30 && kiri === 40)
  )?.label;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm print:static print:bg-white print:backdrop-blur-none flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:overflow-visible print:p-0 print:block">
      <style
        dangerouslySetInnerHTML={{
          __html: `
@page { size: ${lebarMm}mm ${tinggiMm}mm; margin: ${atas}mm ${kanan}mm ${bawah}mm ${kiri}mm; }
@media print {
  html, body { background: #fff !important; }
  .print-shell { max-height: none !important; overflow: visible !important; border: 0 !important; box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; }
  .preview-zoom { zoom: 1 !important; }
  .print-sheet { zoom: ${setelan.skala} !important; width: auto !important; max-width: none !important; min-height: 0 !important; padding: 0 !important; margin: 0 !important; border: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
}
`,
        }}
      />

      <div className="print-shell bg-slate-100 rounded-3xl w-full max-w-[1380px] my-auto shadow-2xl border border-slate-300 flex flex-col max-h-[96vh]">
        {/* Modal Top Bar */}
        <div className="no-print flex items-center justify-between p-4 bg-white rounded-t-3xl border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-teal-800 text-white flex items-center justify-center">
              <Printer className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Print Preview Dokumen Prelim</h3>
                {allowDownload ? (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    Siap Cetak ke PDF / Word
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    <Lock className="w-3 h-3" />
                    Pratinjau saja — terkunci sampai verifikasi
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono">
                {submission.nomorSPK} | {submission.namaPenerimaPrelim}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportWord}
              disabled={!bolehAksi}
              className={`px-4 py-2 rounded-full font-bold text-xs bg-white border border-slate-300 shadow-sm flex items-center gap-1.5 transition-all ${
                bolehAksi
                  ? 'hover:border-slate-400 text-slate-700'
                  : 'text-slate-400 cursor-not-allowed border-slate-200'
              }`}
            >
              {allowDownload ? <FileDown className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{allowDownload ? 'Ekspor Word (.doc)' : 'Unduh terkunci'}</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={!bolehAksi}
              className={`px-4 py-2 rounded-full font-bold text-xs shadow-md flex items-center gap-1.5 transition-all ${
                bolehAksi
                  ? 'bg-slate-900 hover:bg-slate-800 text-white'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{allowDownload ? 'Cetak / Simpan PDF' : 'Cetak terkunci'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-sm text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 print:block">
          {/* ============ Panel Pengaturan Cetak ============ */}
          <aside className="no-print w-72 shrink-0 bg-white border-r border-slate-200 overflow-y-auto p-4 space-y-4 print:hidden">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-teal-700" />
              <h4 className="text-[12px] font-bold uppercase tracking-wide text-slate-800">
                Pengaturan Cetak
              </h4>
            </div>

            {/* Kertas */}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                Ukuran Kertas (Paper Size)
              </span>
              <div className="space-y-1">
                {Object.entries(PAPER).map(([kode, v]) => (
                  <label
                    key={kode}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 cursor-pointer text-[11px] font-semibold transition-colors ${
                      setelan.kertas === kode
                        ? 'border-teal-600 bg-teal-50 text-teal-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paper"
                      checked={setelan.kertas === kode}
                      onChange={() => ubah({ kertas: kode as keyof typeof PAPER })}
                      className="accent-teal-700"
                    />
                    {v.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Orientasi */}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                Orientasi
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(['portrait', 'landscape'] as const).map(o => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => ubah({ orientasi: o })}
                    className={`min-h-[34px] rounded-lg border text-[11px] font-bold transition-colors ${
                      setelan.orientasi === o
                        ? 'border-teal-600 bg-teal-50 text-teal-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {o === 'portrait' ? 'Potret (Vertikal)' : 'Lanskap (Horisontal)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Margin */}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                Margin
              </span>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {MARGIN_PRESET.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    title={p.ket}
                    onClick={() => terapkanPreset(p.label)}
                    className={`px-2 py-1 rounded-full border text-[10px] font-bold transition-colors ${
                      marginAktif === p.label
                        ? 'border-teal-600 bg-teal-50 text-teal-800'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <AngkaInput label="Atas" satuan="mm" value={atas} max={100} onChange={v => ubahMargin('atas', v)} />
                <AngkaInput label="Kanan" satuan="mm" value={kanan} max={100} onChange={v => ubahMargin('kanan', v)} />
                <AngkaInput label="Bawah" satuan="mm" value={bawah} max={100} onChange={v => ubahMargin('bawah', v)} />
                <AngkaInput label="Kiri" satuan="mm" value={kiri} max={100} onChange={v => ubahMargin('kiri', v)} />
              </div>
            </div>

            {/* Skala cetak */}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                Skala Cetak
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 0.95, 0.9, 0.85].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => ubah({ skala: s })}
                    className={`min-h-[30px] rounded-lg border text-[11px] font-bold tabular-nums transition-colors ${
                      setelan.skala === s
                        ? 'border-teal-600 bg-teal-50 text-teal-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {Math.round(s * 100)}%
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-slate-400">Dipakai saat dicetak (bukan preview).</p>
            </div>

            {/* Teks dokumen */}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                Ukuran Teks Dokumen
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[9, 10, 10.5, 12].map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => ubah({ fontUkuran: f })}
                    className={`min-h-[30px] rounded-lg border text-[11px] font-bold tabular-nums transition-colors ${
                      setelan.fontUkuran === f
                        ? 'border-teal-600 bg-teal-50 text-teal-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-2 mb-1">
                Jenis Huruf
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(FONT_STACK) as (keyof typeof FONT_STACK)[]).map(f => (
                  <button
                    key={f}
                    type="button"
                    style={{ fontFamily: FONT_STACK[f] }}
                    onClick={() => ubah({ fontJenis: f })}
                    className={`min-h-[30px] rounded-lg border text-[11px] transition-colors ${
                      setelan.fontJenis === f
                        ? 'border-teal-600 bg-teal-50 text-teal-800 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {f === 'sans' ? 'Arial' : f === 'serif' ? 'Times' : 'Courier'}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div>
              <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={setelan.footerAktif}
                  onChange={e => ubah({ footerAktif: e.target.checked })}
                  className="accent-teal-700"
                />
                Tampilkan footer dokumen
              </label>
              {setelan.footerAktif && (
                <textarea
                  value={setelan.footerTeks}
                  onChange={e => ubah({ footerTeks: e.target.value })}
                  rows={2}
                  aria-label="Teks footer dokumen"
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-700 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15"
                />
              )}
            </div>

            {/* Ringkasan siap cetak */}
            <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-3 space-y-1 text-[11px] text-teal-900">
              <p className="font-bold uppercase tracking-wide text-[10px] text-teal-700">
                Ringkasan Dokumen
              </p>
              <p>
                Kertas: <strong>{PAPER[setelan.kertas].label}</strong>
              </p>
              <p>
                Orientasi: <strong>{setelan.orientasi === 'portrait' ? 'Potret' : 'Lanskap'}</strong>{' '}
                · Skala <strong>{Math.round(setelan.skala * 100)}%</strong>
              </p>
              <p>
                Margin: <strong>T {atas} · K {kanan} · B {bawah} · KI {kiri} mm</strong>
              </p>
              <p>
                Terakhir: <strong>± {infoHalaman} halaman</strong>
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={handlePrint}
                disabled={!bolehAksi}
                className={`inline-flex items-center justify-center gap-1.5 min-h-[40px] rounded-full text-xs font-bold shadow-md ${
                  bolehAksi
                    ? 'text-white bg-slate-900 hover:bg-slate-800'
                    : 'text-slate-500 bg-slate-300 cursor-not-allowed'
                }`}
              >
                <Printer className="w-4 h-4" />
                Cetak / Simpan PDF
              </button>
              <button
                onClick={handleExportWord}
                disabled={!bolehAksi}
                className={`inline-flex items-center justify-center gap-1.5 min-h-[40px] rounded-full text-xs font-bold shadow-sm border ${
                  bolehAksi
                    ? 'text-slate-700 bg-white border-slate-300 hover:border-slate-400'
                    : 'text-slate-400 bg-white border-slate-200 cursor-not-allowed'
                }`}
              >
                {allowDownload ? <FileDown className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                Ekspor ke Word (.doc)
              </button>
              {allowDownload ? (
                <p className="text-[10px] leading-snug text-slate-400">
                  Cetak → pilih printer <strong>Save as PDF</strong> untuk menyimpan PDF. Ekspor
                  Word menghasilkan file .doc siap dibuka di Microsoft Word.
                </p>
              ) : (
                <p className="text-[10px] leading-snug text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  <strong>Terkunci.</strong> Dokumen hanya bisa dicek di layar ini. Tombol Cetak
                  PDF &amp; Ekspor Word aktif setelah pengajuan <strong>terverifikasi</strong>.
                </p>
              )}
            </div>
          </aside>

          {/* ============ Area Preview ============ */}
          <div className="flex-1 min-w-0 flex flex-col print:block">
            {/* Document Switcher Tabs */}
            <div className="no-print flex items-center gap-1 p-2 bg-slate-200/70 border-b border-slate-300 overflow-x-auto text-xs font-semibold print:hidden">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveDocTab(t.key)}
                  className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                    activeDocTab === t.key
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:bg-white/50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
              <span className="ml-auto flex items-center gap-1.5 pr-1 text-[10px] font-bold text-slate-500 whitespace-nowrap">
                Zoom preview
                {[0.5, 0.75, 1].map(z => (
                  <button
                    key={z}
                    onClick={() => ubah({ zoomPreview: z })}
                    className={`px-1.5 py-0.5 rounded border ${
                      setelan.zoomPreview === z
                        ? 'border-teal-600 text-teal-800 bg-teal-50'
                        : 'border-slate-300 text-slate-500 bg-white'
                    }`}
                  >
                    {Math.round(z * 100)}%
                  </button>
                ))}
              </span>
            </div>

            {/* Printable Sheet Viewport */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-200/50 print:p-0 print:overflow-visible print:bg-white">
              <div className="preview-zoom mx-auto w-max" style={{ zoom: setelan.zoomPreview }}>
                <div
                  className="print-sheet relative bg-white shadow-xl border border-slate-300 text-slate-800 print:shadow-none print:border-none print:rounded-none"
                  style={{
                    width: `${lebarMm}mm`,
                    minHeight: `${tinggiMm}mm`,
                    padding: `${atas}mm ${kanan}mm ${bawah}mm ${kiri}mm`,
                    fontFamily: FONT_STACK[setelan.fontJenis],
                    fontSize: `${setelan.fontUkuran}pt`,
                    lineHeight: 1.5,
                  }}
                >
                  <div ref={docRef}>
                    {/* Isi dokumen — dirender dari template public/masterpp.docx */}
                    {memuatTemplate && (
                      <div className="py-16 text-center text-xs text-slate-500">
                        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-teal-700" />
                        Memuat template dokumen (masterpp.docx)…
                      </div>
                    )}
                    {!memuatTemplate && galatTemplate && (
                      <div className="my-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
                        <p className="mb-1 font-bold">Template dokumen gagal dimuat.</p>
                        <p className="mb-3 font-mono text-[11px]">{galatTemplate}</p>
                        <button
                          onClick={muat}
                          className="rounded-full bg-amber-700 px-4 py-1.5 font-bold text-white transition-colors hover:bg-amber-800"
                        >
                          Coba lagi
                        </button>
                      </div>
                    )}
                    {siapCetak && (
                      <div dangerouslySetInnerHTML={{ __html: htmlDokumen }} />
                    )}

                    {/* Document Footer */}
                    {setelan.footerAktif && (
                      <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between gap-4 text-[10px] text-slate-400 font-mono">
                        <span>{setelan.footerTeks}</span>
                        <span>Dicetak: {new Date().toLocaleDateString('id-ID')}</span>
                      </div>
                    )}
                  </div>

                  {/* Penanda zona margin antar halaman (preview saja, tidak dicetak) */}
                  <div
                    aria-hidden
                    className="no-print absolute inset-0 pointer-events-none print:hidden"
                    style={{ backgroundImage: zonaMargin() }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
