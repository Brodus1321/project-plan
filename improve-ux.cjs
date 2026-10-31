const fs = require('fs');
const f = 'src/components/InputPengajuanView.tsx';
let c = fs.readFileSync(f, 'utf-8');
let changed = false;

// 1. Add tambahBarisHarga helper after hapusBarisHarga
const helperAnchor = 'const hapusBarisHarga = (idx: number) =>\n    setLampiranHargaRows(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));';
const helperNew = `const hapusBarisHarga = (idx: number) =>
    setLampiranHargaRows(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  /** Tambah baris kosong di bawah tabel Lampiran Harga. */
  const tambahBarisHarga = () =>
    setLampiranHargaRows(prev => [...prev, barisLampiranHargaKosong()]);`;

if (c.includes(helperAnchor)) {
  c = c.replace(helperAnchor, helperNew);
  changed = true;
  console.log('✓ Added tambahBarisHarga helper');
}

// 2. Find designator input in table and add onKeyDown Enter handler
// Look for the autoPopulateDariRAB onChange in designator cell
const oldInput = `onChange={(e) => {
                                const updated = lampiranHargaRows.map((row: LampiranHargaRow, idx: number) =>
                                  idx === i ? autoPopulateDariRAB(row, e.target.value) : row
                                );
                                setLampiranHargaRows(updated);
                              }}`;
const newInput = `onChange={(e) => {
                                const updated = lampiranHargaRows.map((row: LampiranHargaRow, idx: number) =>
                                  idx === i ? autoPopulateDariRAB(row, e.target.value) : row
                                );
                                setLampiranHargaRows(updated);
                                setLampiranHargaErr(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (!autoPopulateErr && !r.designator.trim()) return;
                                  setLampiranHargaRows(prev => {
                                    const next = [...prev];
                                    const emptyIdx = next.findIndex(r => !r.designator?.trim());
                                    if (emptyIdx === -1) next.push(barisLampiranHargaKosong());
                                    return next;
                                  });
                                }
                              }}`;

if (c.includes(oldInput)) {
  c = c.replace(oldInput, newInput);
  changed = true;
  console.log('✓ Added onKeyDown Enter handler');
}

if (changed) {
  fs.writeFileSync(f, c);
  console.log('✓ Saved');
} else {
  console.log('⚠ No changes made');
}
