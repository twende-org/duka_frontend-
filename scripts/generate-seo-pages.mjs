/**
 * generate-seo-pages.mjs
 *
 * Post-build script: for each public route, copies dist/index.html and
 * replaces the generic meta tags with page-specific title, description,
 * OG tags, and canonical URL — all baked into static HTML.
 *
 * This means Google (which fetches HTML before running JS) sees the correct
 * per-page metadata, fixing "Soft 404", "Crawled - not indexed", and
 * "Duplicate title" errors in Google Search Console.
 *
 * Nginx serves dist/[route]/index.html via: try_files $uri $uri/ /index.html
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir   = join(__dirname, '..', 'dist');
const baseHtml  = readFileSync(join(distDir, 'index.html'), 'utf-8');

/** All public routes that need unique SEO meta */
const routes = [
  {
    route:       'nyumbani',
    title:       'Simamia & Tangaza Biashara Yako — Twende Duka | Smart POS Tanzania',
    description: 'Twende Duka ni mfumo kamili wa kusimamia duka lako Tanzania. Rekodi mauzo, simamia bidhaa, na angalia maduka ya karibu nawe. Smart POS & Shop Directory kwa Tanzania.',
    ogTitle:     'Twende Duka — Simamia Biashara Yako Mtandaoni',
    keywords:    'twende duka, pos system tanzania, smart shop, simamia duka, mauzo, bidhaa, shop management',
    canonical:   'https://duka.twendedigital.tech/nyumbani',
  },
  {
    route:       'explore',
    title:       'Maduka Yote — Tafuta Duka na Bidhaa | Twende Duka',
    description: 'Gundua maduka na bidhaa bora karibu nawe Tanzania. Tafuta, linganisha bei, na upate unachohitaji kwenye Twende Duka shop directory.',
    ogTitle:     'Twende Duka — Shop Directory Tanzania',
    keywords:    'maduka, bidhaa, duka, tafuta duka, shop directory, products tanzania, bei, duka karibu nawe',
    canonical:   'https://duka.twendedigital.tech/explore',
  },
  {
    route:       'duka-pos-system',
    title:       'Duka POS System — Mfumo Bora wa Point of Sale kwa Maduka Tanzania',
    description: 'Duka POS System ni mfumo wa kisasa wa point of sale uliojengwa kwa maduka ya Tanzania. Simamia mauzo, stoo, wafanyakazi na ripoti kwa urahisi. Bora kuliko POS za zamani.',
    ogTitle:     'Duka POS System — Point of Sale kwa Tanzania',
    keywords:    'duka pos, duka pos system, pos tanzania, pos system, point of sale, mfumo wa duka, pos ya duka, cash register, duka management',
    canonical:   'https://duka.twendedigital.tech/duka-pos-system',
  },
  {
    route:       'twendedigital',
    title:       'TwendeDigital — Mfumo wa Kisasa wa POS Tanzania - Twende Duka',
    description: 'TwendeDigital ni kampuni ya teknolojia inayotengeneza mifumo ya kisasa ya biashara kama Twende Duka POS System. Suluhisho za digital kwa wafanyabiashara wa Tanzania.',
    ogTitle:     'TwendeDigital — Tech Company Tanzania',
    keywords:    'twendedigital, twende digital, twende digital tanzania, software company tanzania, tech company dar es salaam, duka software, business software africa',
    canonical:   'https://duka.twendedigital.tech/twendedigital',
  },
  {
    route:       'twende-duka',
    title:       'Twende Duka — Smart Shop Management System Tanzania',
    description: 'Twende Duka ni mfumo wa smart shop management kwa maduka ya Tanzania. Simamia bidhaa, mauzo, matumizi, wafanyakazi na ripoti kwa urahisi. Anza bure leo.',
    ogTitle:     'Twende Duka — Smart Shop Management Tanzania',
    keywords:    'twende duka, twendeduka, smart shop management, shop management system, inventory system tanzania, mfumo wa duka, biashara software',
    canonical:   'https://duka.twendedigital.tech/twende-duka',
  },
];

/**
 * Replace a meta tag's content attribute value.
 * Handles both self-closing and attribute order variations.
 */
function replaceMeta(html, nameOrProp, value) {
  // name="..." or property="..."
  return html
    .replace(
      new RegExp(`(<meta\\s+name="${nameOrProp}"\\s+content=")[^"]*("\\s*/?>)`, 'i'),
      `$1${value}$2`
    )
    .replace(
      new RegExp(`(<meta\\s+property="${nameOrProp}"\\s+content=")[^"]*("\\s*/?>)`, 'i'),
      `$1${value}$2`
    )
    // Also handle content="..." name="..." order
    .replace(
      new RegExp(`(<meta\\s+content=")[^"]*("\\s+name="${nameOrProp}"\\s*/?>)`, 'i'),
      `$1${value}$2`
    )
    .replace(
      new RegExp(`(<meta\\s+content=")[^"]*("\\s+property="${nameOrProp}"\\s*/?>)`, 'i'),
      `$1${value}$2`
    );
}

let successCount = 0;

for (const page of routes) {
  let html = baseHtml;

  // 1. Title
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${page.title}</title>`);

  // 2. Description
  html = replaceMeta(html, 'description', page.description);

  // 3. Keywords — insert after description if not already present
  if (!html.includes('name="keywords"')) {
    html = html.replace(
      /(<meta\s+name="description")/,
      `<meta name="keywords" content="${page.keywords}" />\n  $1`
    );
  } else {
    html = replaceMeta(html, 'keywords', page.keywords);
  }

  // 4. Canonical — insert/replace
  if (html.includes('rel="canonical"')) {
    html = html.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${page.canonical}" />`
    );
  } else {
    html = html.replace(
      '</title>',
      `</title>\n  <link rel="canonical" href="${page.canonical}" />`
    );
  }

  // 5. OG title
  html = replaceMeta(html, 'og:title', page.ogTitle);

  // 6. OG description
  html = replaceMeta(html, 'og:description', page.description);

  // 7. OG URL — insert after og:type if missing
  if (!html.includes('og:url')) {
    html = html.replace(
      /(<meta\s+property="og:type")/,
      `<meta property="og:url" content="${page.canonical}" />\n  $1`
    );
  } else {
    html = replaceMeta(html, 'og:url', page.canonical);
  }

  // Write → dist/[route]/index.html
  const routeDir = join(distDir, page.route);
  if (!existsSync(routeDir)) mkdirSync(routeDir, { recursive: true });
  writeFileSync(join(routeDir, 'index.html'), html, 'utf-8');

  console.log(`✅  dist/${page.route}/index.html`);
  successCount++;
}

console.log(`\n🚀  SEO pre-rendering done — ${successCount}/${routes.length} pages generated.\n`);
