const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'data', 'perfumes.json');
const loadData = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

const SORTS = [['brand', 'ブランド順'], ['yen', '1mlあたりが安い順'], ['conc', '濃度が高い順']];
const allNotes = (p) => [...p.notes.top, ...p.notes.middle, ...p.notes.base, ...(p.notes.key || [])];

// 同じノートの数と系統が同じかどうかだけで「似た香り」を選ぶ（主観は入れない）
function similar(p, perfumes, n = 4) {
  const mine = new Set(allNotes(p));
  return perfumes
    .filter(x => x.id !== p.id)
    .map(x => {
      const shared = allNotes(x).filter(v => mine.has(v));
      return { p: x, shared, score: shared.length * 2 + (x.family === p.family ? 1 : 0) };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.brand.localeCompare(b.p.brand, 'ja'))
    .slice(0, n);
}

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

app.get('/', (req, res) => {
  const { perfumes, updatedAt, concentrations } = loadData();
  const families = [...new Set(perfumes.map(p => p.family))];
  const concs = Object.keys(concentrations).filter(c => perfumes.some(p => p.concentration === c));
  const family = families.includes(req.query.family) ? req.query.family : '';
  const conc = concs.includes(req.query.conc) ? req.query.conc : '';
  const sort = SORTS.some(([v]) => v === req.query.sort) ? req.query.sort : 'brand';
  const q = String(req.query.q || '').trim();
  const ql = q.toLowerCase();

  let list = perfumes.filter(p =>
    (!family || p.family === family) &&
    (!conc || p.concentration === conc) &&
    (!q || `${p.brand} ${p.name} ${p.family} ${allNotes(p).join(' ')}`.toLowerCase().includes(ql)));
  const byBrand = (a, b) => a.brand.localeCompare(b.brand, 'ja') || a.name.localeCompare(b.name, 'ja');
  list = list.sort({
    brand: byBrand,
    yen: (a, b) => (a.yenPerMl ?? Infinity) - (b.yenPerMl ?? Infinity) || byBrand(a, b),
    conc: (a, b) => (b.concentrationInfo?.rank || 0) - (a.concentrationInfo?.rank || 0) || byBrand(a, b),
  }[sort]);

  res.render('home', {
    title: 'perfumeplac｜香水を事実で比べる',
    description: `${perfumes.length}本の香水を、香りのノート・濃度・1mlあたりの価格で比べられます。`,
    perfumes: list, total: perfumes.length, families, family, concs, conc, sorts: SORTS, sort, q, updatedAt,
  });
});

app.get('/perfume/:id', (req, res, next) => {
  const { perfumes } = loadData();
  const p = perfumes.find(x => x.id === req.params.id);
  if (!p) return next();
  res.render('perfume', {
    title: `${p.brand} ${p.name}のノートと価格｜perfumeplac`,
    description: `${p.brand} ${p.name}（${p.concentration}・${p.family}）のトップ・ミドル・ベースノート、1mlあたりの価格、似たノートの香水。`,
    p, similar: similar(p, perfumes),
  });
});

app.get('/method', (req, res) => {
  const { concentrations } = loadData();
  res.render('method', { title: '比べ方｜perfumeplac', description: 'perfumeplac が香水をどう比べているか。濃度の目安と、似た香りの選び方。', concentrations });
});

app.get('/__health', (_req, res) => res.json({ ok: true }));

app.use((req, res) => res.status(404).render('404', { title: 'ページが見つかりません｜perfumeplac' }));

const PORT = process.env.PORT || 3400;
app.listen(PORT, () => console.log(`perfumeplac listening on ${PORT}`));
