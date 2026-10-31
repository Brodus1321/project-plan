const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/InputPengajuanView.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Fix: Tambahkan </thead> sebelum <tbody>
content = content.replace(
  /<th className="border-b border-l border-emerald-200 px-2 py-1\.5 text-center font-semibold">Vol<\/th>\s+<\/tr>\s+<tbody>/,
  `<th className="border-b border-l border-emerald-200 px-2 py-1.5 text-center font-semibold">Vol</th>
                       </tr>
                     </thead>
                     <tbody>`
);

fs.writeFileSync(filePath, content);
console.log('✓ Fixed JSX structure — added missing </thead>');
