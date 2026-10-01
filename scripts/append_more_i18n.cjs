const fs = require('fs');
let content = fs.readFileSync('src/lib/i18n.tsx', 'utf-8');

const moreTranslations = {
  "directory.vision.heroDesc": { sw: "Twende Duka ni daraja linalounganisha wanunuzi na wauzaji. Sisi ni jukwaa kamili la kukuza biashara na kurahisisha manunuzi kwa kila mtu.", en: "Twende Duka connects customers and businesses through a unified digital marketplace and powerful business management tools." },
  "directory.vision.ctaDesc": { sw: "Jiunge na mtandao wetu leo. Fungua duka lako au anza kununua bidhaa kutoka kwa wauzaji wanaoaminika.", en: "Join our ecosystem today. Create your digital storefront or start shopping from trusted merchants." },
  "directory.vision.searchResults": { sw: "Matokeo ya Utafutaji", en: "Search Results" },
  "directory.vision.exploreAll": { sw: "Gundua Bidhaa Zote", en: "Explore All Products" },
  "directory.vision.langSwahili": { sw: "Swahili", en: "Swahili" },
  "directory.vision.langEnglish": { sw: "English", en: "English" }
};

const parts = content.split('// ─── Common ───');
const newContent = parts[0] + '// ─── Common ───\n' + 
  Object.entries(moreTranslations).map(([key, val]) => `  "${key}": { sw: ${JSON.stringify(val.sw)}, en: ${JSON.stringify(val.en)} },`).join('\n') + '\n' + parts[1];

fs.writeFileSync('src/lib/i18n.tsx', newContent);
