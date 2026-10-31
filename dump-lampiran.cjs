const XLSX = require('xlsx');
const path = require('path');

const wb = XLSX.readFile(path.join(__dirname, 'Lampiran BAKH.xlsx'));
console.log('Sheets:', wb.SheetNames);

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
  console.log(`\n=== Sheet: ${name} — ${grid.length} baris ===`);
  console.log('Dimensi:', ws['!ref']);
  grid.slice(0, 15).forEach((row, i) => {
    console.log(`[${i}]`, JSON.stringify(row));
  });
  if (grid.length > 15) {
    console.log('...');
    grid.slice(-5).forEach((row, i) => {
      console.log(`[akhir-${i}]`, JSON.stringify(row));
    });
    console.log('Jumlah total baris:', grid.length);
  }
}
