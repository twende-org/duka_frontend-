const fs = require('fs');
let content = fs.readFileSync('src/pages/ShopDirectory.tsx', 'utf-8');

const regex = /\{lang === 'sw' \? "([^"]+)" : "([^"]+)"\}/g;
let count = 0;

content = content.replace(regex, (match, sw, en) => {
  return `{t("directory.vision.${count++}")}`;
});

fs.writeFileSync('src/pages/ShopDirectory.tsx', content);
