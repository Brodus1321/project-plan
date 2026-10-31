const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('Lampiran BAKH.xlsx');
const wsTA = wb.Sheets['RAB TA'];
const gridTA = XLSX.utils.sheet_to_json(wsTA, { header: 1 });
const wsMandor = wb.Sheets['RAB MANDOR'];
const gridMandor = XLSX.utils.sheet_to_json(wsMandor, { header: 1 });

const rabTA = [], rabMandor = [];

for (let i = 5; i < gridTA.length; i++) {
  const row = gridTA[i];
  if (!row || !row[0] || row[0] === 'MATERIAL') break;
  if (row[0] && row[3]) {
    rabTA.push({designator: row[0], uraian: row[3], sat: row[4], material: row[5] || 0, jasa: row[6] || 0});
  }
}

for (let i = 5; i < gridMandor.length; i++) {
  const row = gridMandor[i];
  if (!row || !row[0] || row[0] === 'MATERIAL') break;
  if (row[0] && row[3]) {
    rabMandor.push({designator: row[0], uraian: row[3], sat: row[4], material: row[5] || 0, jasa: row[6] || 0});
  }
}

const content = `export interface RabItem {
  designator: string;
  uraian: string;
  sat: string;
  material: number;
  jasa: number;
}

export const RAB_TA = ${JSON.stringify(rabTA)};
export const RAB_MANDOR = ${JSON.stringify(rabMandor)};

export function cariRabTA(designator) {
  return RAB_TA.find(i => i.designator.toLowerCase() === designator.toLowerCase());
}

export function cariRabMandor(designator) {
  return RAB_MANDOR.find(i => i.designator.toLowerCase() === designator.toLowerCase());
}
`;

fs.writeFileSync('src/db/lampiranBakhData.ts', content);
console.log(`✓ Generated: RAB TA ${rabTA.length} items, RAB MANDOR ${rabMandor.length} items`);
