const fs = require('fs');
const content = fs.readFileSync('src/pages/ShopDirectory.tsx', 'utf-8');

const regex = /\{lang === 'sw' \? "([^"]+)" : "([^"]+)"\}/g;
let match;
const translations = {};
let count = 0;

while ((match = regex.exec(content)) !== null) {
  const sw = match[1];
  const en = match[2];
  const key = `directory.vision.${count++}`;
  translations[key] = { sw, en };
}
console.log(JSON.stringify(translations, null, 2));
