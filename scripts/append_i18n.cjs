const fs = require('fs');
const content = fs.readFileSync('src/lib/i18n.tsx', 'utf-8');

const translations = require('./extracted.json');

const parts = content.split('// ─── Common ───');
const newContent = parts[0] + '// ─── Common ───\n' + 
  Object.entries(translations).map(([key, val]) => `  "${key}": { sw: ${JSON.stringify(val.sw)}, en: ${JSON.stringify(val.en)} },`).join('\n') + '\n' + parts[1];

fs.writeFileSync('src/lib/i18n.tsx', newContent);
