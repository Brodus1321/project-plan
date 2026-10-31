const fs = require('fs');
const f = 'src/components/InputPengajuanView.tsx';
let c = fs.readFileSync(f, 'utf-8');

// Check if already done
if (c.includes('autoPopulateDariRAB(row, e.target.value)')) {
  console.log('Designator input already editable, skipping');
  process.exit(0);
}

// Find the exact designator cell block (read-only) by line content
const lines = c.split('\n');
let replaced = false;

for (let i = 0; i < lines.length; i++) {
  // Looking for: <td className="px-2 py-2 font-mono text-slate-800">
  if (lines[i].trim() === '<td className="px-2 py-2 font-mono text-slate-800">') {
    // Check next line: {r.designator || <span...
    if (lines[i+1] && lines[i+1].includes('r.designator ||') && lines[i+1].includes('text-slate-400')) {
      // Check line after next: </td>
      if (lines[i+2] && lines[i+2].trim() === '</td>') {
        // Found the designator cell in the table (not the list view ones)
        const indent = '                          ';
        const newLines = [
          indent + '<td className="px-2 py-2">',
          indent + '  <input',
          indent + '    type="text"',
          indent + '    placeholder="Designator"',
          indent + '    value={r.designator || \'\'}',
          indent + '    onChange={(e) => {',
          indent + '      const updated = lampiranHargaRows.map((row: LampiranHargaRow, idx: number) =>',
          indent + '        idx === i ? autoPopulateDariRAB(row, e.target.value) : row',
          indent + '      );',
          indent + '      setLampiranHargaRows(updated);',
          indent + '    }}',
          indent + '    className="w-32 rounded border border-slate-200 px-1.5 py-1 font-mono text-[10px] font-bold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-teal-600"',
          indent + '  />',
          indent + '</td>',
        ];
        
        // Replace 3 lines (td, {r.designator}, </td>) with 14 lines
        lines.splice(i, 3, ...newLines);
        console.log('✓ Replaced designator cell at line ' + (i+1));
        replaced = true;
        break;
      }
    }
  }
}

if (!replaced) {
  console.log('⚠ Designator cell not found with exact pattern');
}

c = lines.join('\n');
fs.writeFileSync(f, c);
console.log('✓ Saved file');
