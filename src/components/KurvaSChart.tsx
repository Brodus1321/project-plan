import React from 'react';
import { KurvaSWeek } from '../types';
import { KurvaSProgresPoint, formatRupiah } from '../db/storage';

interface KurvaSChartProps {
  /** Data mingguan (dipakai bila tidak ada isian progres). */
  data: KurvaSWeek[];
  /** Titik per kolom progres — mengikuti master KURVA S.xlsx. */
  titikProgres?: KurvaSProgresPoint[];
  durasiHari?: number;
  compact?: boolean;
  /** Jadwal Pelaksanaan Proyek: nama aktivitas + jumlah hari kerja (Alur Proyek). */
  tahapHari?: { nama: string; hari: number }[];
}

/** Garis halus Catmull-Rom -> bezier, meniru setelan smooth=1 pada grafik master. */
const haluskan = (p: { x: number; y: number }[]): string => {
  if (p.length === 0) return '';
  if (p.length === 1) return `M ${p[0].x} ${p[0].y}`;
  let d = `M ${p[0].x} ${p[0].y}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(
      2
    )} ${p2.y.toFixed(2)}`;
  }
  return d;
};

/** Pecah nama progres menjadi maksimum 2 baris agar muat di sumbu X. */
const duaBaris = (teks: string): string[] => {
  const kata = teks.split(/\s+/).filter(Boolean);
  if (kata.length <= 1 || teks.length <= 11) return [teks];
  return [kata.slice(0, -1).join(' '), kata[kata.length - 1]];
};

/** Header grafik + legenda. */
const KepalaGrafik: React.FC<{
  sub?: string;
  legend: { warna: string; label: string; putus?: boolean }[];
}> = ({ sub, legend }) => (
  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-slate-700">Grafik Kurva S</span>
      {sub && (
        <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
          {sub}
        </span>
      )}
    </div>
    <div className="flex items-center gap-3 text-[11px]">
      {legend.map(l => (
        <div key={l.label} className="flex items-center gap-1.5">
          <span
            className={`w-3 h-1 ${l.putus ? 'bg-transparent border-t-2 border-dashed' : ''} rounded-full inline-block`}
            style={l.putus ? { borderColor: l.warna } : { backgroundColor: l.warna }}
          />
          <span className="text-slate-600">{l.label}</span>
        </div>
      ))}
    </div>
  </div>
);

/** Grafik mingguan (tanpa isian progres / data lama). */
const GrafikMinggu: React.FC<{
  data: KurvaSWeek[];
  durasiHari?: number;
  compact?: boolean;
}> = ({ data, durasiHari, compact = false }) => {
  const height = compact ? 120 : 200;
  const paddingX = 30;
  const paddingY = 25;
  const width = 500;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const pointsRencana = data.map((item, index) => {
    const x = paddingX + (index / (data.length - 1 || 1)) * chartWidth;
    const y = height - paddingY - (item.rencanaKumulatif / 100) * chartHeight;
    return { x, y, ...item };
  });

  const pathRencana = pointsRencana.reduce(
    (acc, curr, idx) => (idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`),
    ''
  );

  const pointsRealisasi = data
    .filter(item => item.realisasiKumulatif !== undefined)
    .map((item, index, filteredArr) => {
      const originalIndex = data.findIndex(d => d.week === item.week);
      const x = paddingX + (originalIndex / (data.length - 1 || 1)) * chartWidth;
      const y = height - paddingY - ((item.realisasiKumulatif || 0) / 100) * chartHeight;
      return { x, y, ...item };
    });

  const pathRealisasi = pointsRealisasi.reduce(
    (acc, curr, idx) => (idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`),
    ''
  );

  return (
    <div className="w-full">
      <KepalaGrafik
        sub={
          durasiHari
            ? `Durasi Full: ${durasiHari} Hari (${data.length} Minggu)`
            : `${data.length} Minggu`
        }
        legend={[
          { warna: '#0d9488', label: 'Rencana' },
          { warna: '#f59e0b', label: 'Realisasi' },
        ]}
      />

      <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-200/80 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[320px]">
          {[0, 25, 50, 75, 100].map(val => {
            const y = height - paddingY - (val / 100) * chartHeight;
            return (
              <g key={val}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-slate-400 font-mono"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          <path
            d={`${pathRencana} L ${pointsRencana[pointsRencana.length - 1]?.x} ${
              height - paddingY
            } L ${pointsRencana[0]?.x} ${height - paddingY} Z`}
            fill="rgba(13, 148, 136, 0.08)"
          />

          <path
            d={pathRencana}
            fill="none"
            stroke="#0d9488"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {pathRealisasi && (
            <path
              d={pathRealisasi}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="4 2"
              strokeLinecap="round"
            />
          )}

          {pointsRencana.map((pt, i) => (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r="3" fill="#0d9488" stroke="#ffffff" strokeWidth="1.5" />
              <text
                x={pt.x}
                y={height - paddingY + 14}
                textAnchor="middle"
                className="text-[9px] fill-slate-500 font-medium"
              >
                {pt.label}
              </text>
            </g>
          ))}

          {pointsRealisasi.map((pt, i) => (
            <circle
              key={`real-${i}`}
              cx={pt.x}
              cy={pt.y}
              r="3"
              fill="#f59e0b"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          ))}
        </svg>

        {!compact && (
          <div className="mt-3 pt-2 border-t border-slate-200/60 overflow-x-auto">
            <table className="w-full text-[10px] text-center">
              <thead>
                <tr className="text-slate-400 border-b border-slate-200/60">
                  <th className="py-1 px-1 text-left font-normal">Item Bobot</th>
                  {data.map(d => (
                    <th key={d.week} className="py-1 px-1 font-normal">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-mono">
                <tr>
                  <td className="py-1 px-1 text-left font-sans text-teal-800 font-medium">
                    Rencana Mgg (%)
                  </td>
                  {data.map(d => (
                    <td key={d.week} className="py-1 px-1">
                      {d.rencanaMingguan}%
                    </td>
                  ))}
                </tr>
                <tr className="bg-teal-50/40">
                  <td className="py-1 px-1 text-left font-sans text-teal-900 font-semibold">
                    Kumulatif (%)
                  </td>
                  {data.map(d => (
                    <td key={d.week} className="py-1 px-1 font-semibold text-teal-800">
                      {d.rencanaKumulatif}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-1 px-1 text-left font-sans text-amber-800 font-medium">
                    Realisasi Kum (%)
                  </td>
                  {data.map(d => (
                    <td key={d.week} className="py-1 px-1 text-amber-700">
                      {d.realisasiKumulatif !== undefined ? `${d.realisasiKumulatif}%` : '-'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/** Grafik per kolom progres — format master KURVA S.xlsx (Bobot Cum %). */
const GrafikProgres: React.FC<{
  titik: KurvaSProgresPoint[];
  durasiHari?: number;
  compact?: boolean;
  tahapHari?: { nama: string; hari: number }[];
}> = ({ titik, durasiHari, compact = false, tahapHari }) => {
  const WARNA = '#EA4335'; // warna accent2 pada KURVA S.xlsx
  const height = compact ? 150 : 230;
  const padKiri = 46;
  const padKanan = 60;
  const padAtas = 26;
  const padBawah = 40;
  const width = 600;
  const chartWidth = width - padKiri - padKanan;
  const chartHeight = height - padAtas - padBawah;
  const baseY = height - padBawah;

  const titikPx = titik.map((t, i) => ({
    x: padKiri + (i / (titik.length - 1 || 1)) * chartWidth,
    y: baseY - (Math.min(100, Math.max(0, t.bobotCum)) / 100) * chartHeight,
    ...t,
  }));
  const jalur = haluskan(titikPx);

  // Sumbu-Y 0 s/d 1 dengan langkah 0,1 — sama seperti grafik master.
  const ticks = Array.from({ length: 11 }, (_, i) => i / 10);

  return (
    <div className="w-full">
      <KepalaGrafik
        sub={
          durasiHari
            ? `Durasi Full: ${durasiHari} Hari (${titik.length} Progres)`
            : `${titik.length} Progres`
        }
        legend={[]}
      />

      <div className="bg-white rounded-xl p-2.5 border border-slate-200 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[420px]">
          {ticks.map(v => {
            const y = baseY - v * chartHeight;
            return (
              <g key={v}>
                <line
                  x1={padKiri}
                  y1={y}
                  x2={width - padKanan}
                  y2={y}
                  stroke="#b7b7b7"
                  strokeWidth="0.7"
                />
                <text
                  x={padKiri - 7}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[8.5px] fill-slate-600 font-mono"
                >
                  {v === 0 ? '0' : v === 1 ? '1' : v.toFixed(1).replace('.', ',')}
                </text>
              </g>
            );
          })}

          <path
            d={jalur}
            fill="none"
            stroke={WARNA}
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {titikPx.map((pt, i) => (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r="5" fill={WARNA} />
              <text
                x={pt.x + 8}
                y={pt.y + 3.5}
                textAnchor="start"
                className="text-[8.5px] font-semibold"
                fill={WARNA}
              >
                {pt.bobotCum.toFixed(2)}%
              </text>
              {duaBaris(pt.label).map((baris, li) => (
                <text
                  key={li}
                  x={pt.x}
                  y={baseY + 13 + li * 9}
                  textAnchor="middle"
                  className="text-[8.5px] fill-slate-600 font-medium"
                >
                  {baris}
                </text>
              ))}
            </g>
          ))}
        </svg>

        {/* Legenda per kolom progres, seperti legenda grafik master */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          {titik.map((t, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-[10px] text-slate-700">
              <svg
                width="20"
                height="8"
                viewBox="0 0 20 8"
                aria-hidden="true"
                className="shrink-0"
              >
                <line x1="0" y1="4" x2="20" y2="4" stroke={WARNA} strokeWidth="2" />
                <circle cx="10" cy="4" r="3" fill={WARNA} />
              </svg>
              {t.label}
            </span>
          ))}
        </div>

        {!compact && (
          <div className="mt-3 pt-2 border-t border-slate-200/60 overflow-x-auto">
            <table className="w-full text-[10px] text-center">
              <thead>
                <tr className="text-slate-400 border-b border-slate-200/60">
                  <th className="py-1 px-1 text-left font-normal whitespace-nowrap">Item</th>
                  {titik.map((t, i) => (
                    <th key={i} className="py-1 px-1 font-normal whitespace-nowrap">
                      {t.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-mono">
                <tr>
                  <td className="py-1 px-1 text-left font-sans text-slate-600 whitespace-nowrap">
                    Waktu Kerja
                  </td>
                  {titik.map((t, i) => (
                    <td key={i} className="py-1 px-1 text-slate-500 whitespace-nowrap">
                      {t.tanggal ? t.tanggal.split('-').reverse().join('/') : '-'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-1 px-1 text-left font-sans text-teal-800 font-medium whitespace-nowrap">
                    Bobot (%)
                  </td>
                  {titik.map((t, i) => (
                    <td key={i} className="py-1 px-1 whitespace-nowrap">
                      {t.bobot.toFixed(2)}
                    </td>
                  ))}
                </tr>
                <tr className="bg-teal-50/40">
                  <td className="py-1 px-1 text-left font-sans text-teal-900 font-semibold whitespace-nowrap">
                    Bobot Cum (%)
                  </td>
                  {titik.map((t, i) => (
                    <td
                      key={i}
                      className="py-1 px-1 font-semibold text-teal-800 whitespace-nowrap"
                    >
                      {t.bobotCum.toFixed(2)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-1 px-1 text-left font-sans text-slate-700 font-medium whitespace-nowrap">
                    Nilai (Rp)
                  </td>
                  {titik.map((t, i) => (
                    <td key={i} className="py-1 px-1 whitespace-nowrap">
                      {formatRupiah(t.nilai)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>

            {tahapHari && tahapHari.length > 0 && (
              <div className="mt-3 pt-2 border-t border-slate-200/60">
                <div className="mb-1.5 font-sans text-[11px] font-semibold text-slate-700">
                  Jadwal Pelaksanaan Proyek
                </div>
                <table className="w-full max-w-xs text-[10px]">
                  <thead>
                    <tr className="border-b border-slate-200/60 text-slate-400">
                      <th className="py-1 px-1 text-left font-normal font-sans whitespace-nowrap">
                        Aktivitas
                      </th>
                      <th className="py-1 px-1 text-right font-normal font-sans whitespace-nowrap">
                        Jumlah HK
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-mono">
                    {tahapHari.map(t => (
                      <tr key={t.nama}>
                        <td className="py-1 px-1 text-left font-sans text-slate-700 whitespace-nowrap">
                          {t.nama}
                        </td>
                        <td className="py-1 px-1 text-right font-semibold text-teal-800 whitespace-nowrap">
                          {t.hari > 0 ? `${t.hari} hari` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const KurvaSChart: React.FC<KurvaSChartProps> = ({
  data,
  titikProgres,
  durasiHari,
  compact = false,
  tahapHari,
}) => {
  if (titikProgres && titikProgres.length > 0) {
    return (
      <GrafikProgres
        titik={titikProgres}
        durasiHari={durasiHari}
        compact={compact}
        tahapHari={tahapHari}
      />
    );
  }
  if (!data || data.length === 0) {
    return <div className="text-xs text-slate-400 py-3 text-center">Data Kurva S belum tersedia</div>;
  }
  return <GrafikMinggu data={data} durasiHari={durasiHari} compact={compact} />;
};
