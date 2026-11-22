import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(root, 'src', 'pages');
const outDir = path.join(root, 'assets', 'data');
fs.mkdirSync(outDir, { recursive: true });

function walk(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else if (entry.name.endsWith('.html') && !entry.name.startsWith('_')) out.push(full);
  }
  return out;
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(s) {
  return s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

const META_RE = /^\s*<!--META([\s\S]*?)META-->/;

const pages = [];
const problems = [];

for (const file of walk(pagesDir)) {
  const rel = path.relative(pagesDir, file).replace(/\\/g, '/');
  const id = rel.replace(/\.html$/, '').replace(/\/index$/, '');
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(META_RE);
  if (!m) {
    problems.push(`${rel}: нет блока <!--META ... META-->`);
    continue;
  }
  let meta;
  try {
    meta = JSON.parse(m[1]);
  } catch (e) {
    problems.push(`${rel}: невалидный JSON в META — ${e.message}`);
    continue;
  }
  const body = raw.slice(m[0].length).trim();
  if (!body) problems.push(`${rel}: пустое тело страницы`);
  const h2 = [...body.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(x => stripTags(x[1]));
  pages.push({
    id,
    title: meta.title || id,
    nav: meta.nav || meta.title || id,
    num: meta.num || '',
    subtitle: meta.subtitle || '',
    kicker: meta.kicker || '',
    code: meta.code || '',
    group: meta.group || 'misc',
    order: typeof meta.order === 'number' ? meta.order : 999,
    parent: meta.parent || null,
    tags: meta.tags || [],
    summary: meta.summary || '',
    hidden: !!meta.hidden,
    hub: !!meta.hub,
    body,
    headings: h2,
  });
}

pages.sort((a, b) => (a.group === b.group ? a.order - b.order : a.group.localeCompare(b.group)));

const search = pages.filter(p => !p.hidden && p.id !== 'start').map(p => {
  const text = stripTags(p.body);
  return {
    id: p.id,
    title: p.title,
    nav: p.nav,
    group: p.group,
    parent: p.parent,
    headings: p.headings,
    text: text.slice(0, 12000),
  };
});

const pagesJs = `/* Сгенерировано build.mjs — не редактировать вручную. */\nwindow.DG_PAGES = ${JSON.stringify(pages, null, 0)};\n`;
fs.writeFileSync(path.join(outDir, 'pages.js'), pagesJs, 'utf8');
fs.writeFileSync(path.join(outDir, 'search.js'), `/* Сгенерировано build.mjs. */\nwindow.DG_SEARCH = ${JSON.stringify(search, null, 0)};\n`, 'utf8');

// Bestiary: concatenate data modules.
const dataDir = path.join(root, 'src', 'data');
let bestiary = '';
if (fs.existsSync(dataDir)) {
  const files = fs.readdirSync(dataDir).filter(f => /^bestiary.*\.js$/.test(f)).sort();
  bestiary = files.map(f => `\n/* ---- ${f} ---- */\n` + fs.readFileSync(path.join(dataDir, f), 'utf8')).join('\n');
}
fs.writeFileSync(path.join(outDir, 'bestiary.js'), `/* Сгенерировано build.mjs. */\nwindow.DG = window.DG || {};\nwindow.DG_BESTIARY = [];\nwindow.DG.registerBestiary = function (list) { if (Array.isArray(list)) window.DG_BESTIARY.push(...list); };\n${bestiary}\nwindow.DG_BESTIARY.sort(function(a,b){ return (a.danger||0)-(b.danger||0) || String(a.name).localeCompare(String(b.name),'ru'); });\n`, 'utf8');

// Copy static profession data if kept in src.
const profSrc = path.join(dataDir, 'professions.js');
if (fs.existsSync(profSrc)) fs.copyFileSync(profSrc, path.join(outDir, 'professions.js'));

const metaDump = pages.map(({ body, ...rest }) => rest);
fs.writeFileSync(path.join(root, 'build-report.json'), JSON.stringify({ pages: metaDump, problems }, null, 2), 'utf8');

console.log(`pages: ${pages.length}`);
console.log(`search entries: ${search.length}`);
console.log(`out: ${path.relative(root, outDir)}`);
if (problems.length) {
  console.log('\nПРОБЛЕМЫ:');
  for (const p of problems) console.log(' - ' + p);
  process.exitCode = 1;
}
