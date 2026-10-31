const fs = require('fs');
const f = 'src/components/InputPengajuanView.tsx';
let c = fs.readFileSync(f, 'utf-8');

// Replace the onKeyDown handler with clean version
const oldHandler = /onKeyDown=\{\(e\) => \{\n\s+if \(e\.key === 'Enter'\) \{\n\s+e\.preventDefault\(\);\n\s+if \(!autoPopulateErr && !r\.designator\.trim\(\)\) return;\n\s+setLampiranHargaRows\(prev => \{\n\s+const next = \[\.\.\.prev\];\n\s+const emptyIdx = next\.findIndex\(r => !r\.designator\?\.trim\(\)\);\n\s+if \(emptyIdx === -1\) next\.push\(barisLampiranHargaKosong\(\)\);\n\s+return next;\n\s+\}\);\n\s+\}\n\s+\}\}/;

const newHandler = `onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const updated = lampiranHargaRows.map((row: LampiranHargaRow, idx: number) =>
                                    idx === i ? autoPopulateDariRAB(row, e.currentTarget.value) : row
                                  );
                                  setLampiranHargaRows(updated);
                                  // Tambah baris baru otomatis
                                  setLampiranHargaRows(prev => {
                                    const hasEmpty = prev.some(r => !r.designator?.trim());
                                    return hasEmpty ? prev : [...prev, barisLampiranHargaKosong()];
                                  });
                                }
                              }}`;

if (oldHandler.test(c)) {
  c = c.replace(oldHandler, newHandler);
  fs.writeFileSync(f, c);
  console.log('✓ Fixed onKeyDown Enter handler');
} else {
  console.log('⚠ Handler pattern not found - checking current state');
  // Show the onKeyDown block
  const match = c.match(/onKeyDown=\{[^}]+\}[^}]+\}[^}]+\}[^}]+\}/);
  if (match) console.log(match[0].slice(0, 500));
}
