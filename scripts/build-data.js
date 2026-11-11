// research/perfume-data.csv から data/perfumes.json を作る
// 使い方: npm run build-data
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'research', 'perfume-data.csv');
const OUT = path.join(ROOT, 'data', 'perfumes.json');

// 濃度ごとの香料の割合と持ちの目安（一般的な目安。商品ごとの実測ではない）
const CONCENTRATIONS = {
  パルファム: { rank: 5, oil: '15〜30%', hours: '6〜12時間' },
  EDP: { rank: 4, oil: '10〜20%', hours: '5〜8時間' },
  EDT: { rank: 3, oil: '5〜15%', hours: '3〜5時間' },
  コロン: { rank: 2, oil: '2〜5%', hours: '1〜3時間' },
};

// 引用符で囲んだ値の中のカンマにも対応する、小さな CSV パーサ
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(v => v !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some(v => v !== '')) rows.push(row);
  return rows;
}

const list = (s) => (s || '').split('・').map(v => v.trim()).filter(Boolean);
const num = (s) => (s === '' || s == null ? null : Number(s));

const [header, ...rows] = parseCsv(fs.readFileSync(SRC, 'utf8').replace(/^﻿/, ''));
const errors = [];
const perfumes = rows.map((r, i) => {
  const o = Object.fromEntries(header.map((h, j) => [h.trim(), (r[j] || '').trim()]));
  const conc = CONCENTRATIONS[o.concentration];
  if (!o.id) errors.push(`${i + 2}行目: id がありません`);
  if (!conc) errors.push(`${o.id}: 濃度「${o.concentration}」は ${Object.keys(CONCENTRATIONS).join('/')} のどれかにしてください`);
  const price = num(o.price);
  const priceVolume = num(o.priceVolume);
  return {
    id: o.id,
    brand: o.brand,
    name: o.name,
    concentration: o.concentration,
    concentrationInfo: conc || null,
    family: o.family,
    notes: { top: list(o.top), middle: list(o.middle), base: list(o.base) },
    volumes: list(o.volumes).map(Number),
    price,
    priceVolume,
    yenPerMl: price && priceVolume ? Math.round(price / priceVolume) : null,
    checkedAt: o.checkedAt || null,
    source: o.source || null,
    note: o.note || '',
    verified: Boolean(o.source && o.checkedAt),
  };
});

const ids = new Set();
perfumes.forEach(p => { if (ids.has(p.id)) errors.push(`id が重複: ${p.id}`); ids.add(p.id); });
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

const updatedAt = perfumes.map(p => p.checkedAt).filter(Boolean).sort().pop() || null;
fs.writeFileSync(OUT, JSON.stringify({ updatedAt, concentrations: CONCENTRATIONS, perfumes }, null, 2) + '\n');
console.log(`${perfumes.length}本を書き出しました → data/perfumes.json`);
