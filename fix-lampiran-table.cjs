const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/InputPengajuanView.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add Volume column header (rowSpan={2})
content = content.replace(
  /<th colSpan=\{2\} className="border-b border-l border-emerald-200 px-2 py-2 text-center font-bold uppercase tracking-wide">\s+Kesepakatan\s+<\/th>\s+<th rowSpan=\{3\}/,
  `<th colSpan={2} className="border-b border-l border-emerald-200 px-2 py-2 text-center font-bold uppercase tracking-wide">
                           Kesepakatan
                         </th>
                         <th rowSpan={2} className="border-b border-l border-emerald-200 px-2 py-2 text-center font-bold uppercase tracking-wide align-bottom">
                           Volume
                         </th>
                         <th rowSpan={3}`
);

// 2. Add Volume column subheader in last row
content = content.replace(
  /(<th className="border-b border-emerald-200 px-2 py-1.5 text-center font-semibold">Jasa<\/th>)\s+(<\/tr>\s+<\/thead>)/,
  `$1
                         <th className="border-b border-l border-emerald-200 px-2 py-1.5 text-center font-semibold">Vol</th>
                       </tr>`
);

// 3. Add Volume input cell in tbody
content = content.replace(
  /(<td className="px-2 py-2 text-right tabular-nums text-slate-800">\s+\{r\.ksepJasa\.toLocaleString\('id-ID'\)\}\s+<\/td>)\s+(<td className="px-1.5 py-1.5 text-center">\s+<button)/,
  `$1
                           <td className="border-l border-slate-100 px-2 py-2 text-center">
                             <input
                               type="number"
                               min="0"
                               step="0.1"
                               value={r.volume || 0}
                               onChange={(e) => {
                                 const newVal = parseFloat(e.target.value) || 0;
                                 setLampiranHargaRows(lampiranHargaRows.map((row, idx) =>
                                   idx === i ? { ...row, volume: newVal } : row
                                 ));
                               }}
                               className="w-20 rounded border border-slate-200 px-1.5 py-1 text-right text-[10px] font-mono outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                             />
                           </td>
                           <td className="px-1.5 py-1.5 text-center">
                             <button`
);

// 4. Add subtotal section after table
content = content.replace(
  /(<\/tbody>\s+<\/table>\s+<\/div>)\s+(<div className="mt-2 flex flex-wrap)/,
  `$1

                 {/* Subtotal footer */}
                 <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                   <div className="grid grid-cols-3 gap-4 text-xs font-semibold">
                     <div>
                       <p className="text-slate-600">Subtotal Material</p>
                       <p className="text-lg text-emerald-800">{formatRupiah(lampiranHargaRows.reduce((s, r) => s + ((r.ksepMaterial || 0) * (r.volume || 0)), 0))}</p>
                     </div>
                     <div>
                       <p className="text-slate-600">Subtotal Jasa</p>
                       <p className="text-lg text-emerald-800">{formatRupiah(lampiranHargaRows.reduce((s, r) => s + ((r.ksepJasa || 0) * (r.volume || 0)), 0))}</p>
                     </div>
                     <div>
                       <p className="text-slate-600">Total</p>
                       <p className="text-lg text-emerald-900 font-bold">{formatRupiah(lampiranHargaRows.reduce((s, r) => s + (((r.ksepMaterial || 0) + (r.ksepJasa || 0)) * (r.volume || 0)), 0))}</p>
                     </div>
                   </div>
                 </div>

                 $2`
);

fs.writeFileSync(filePath, content);
console.log('✓ InputPengajuanView.tsx updated dengan Volume column & subtotal');
