const fs = require('fs');
const vm = require('vm');

const cardsSrc = fs.readFileSync('_cards_block.js', 'utf-8');
const heroesSrc = fs.readFileSync('_heroes_block.js', 'utf-8');

// 安全 G：任何字段读取都返回惰性安全值，避免 t() 在构建描述时崩
const safeObj = () => new Proxy({}, {
  get: (t, k) => {
    if (k === 'hero') return t.__hero;
    if (k === 'deck' || k === 'hand' || k === 'summons') return [];
    if (typeof k === 'symbol') return undefined;
    return undefined;
  },
  set: (t, k, v) => { t[k] = v; return true; }
});

const ctx = { G: safeObj(), console, JSON, Math, Object, Array, String, Number, Boolean, parseInt, parseFloat, isNaN, Infinity, NaN, undefined };
vm.createContext(ctx);
const combined = cardsSrc + '\n' + heroesSrc + '\n;({ CARDS, HEROES });';
const ret = vm.runInContext(combined, ctx);
const HEROES = ret.HEROES;
const CARDS = ret.CARDS;

const heroSet = HEROES.map(h => h.id);
const cardOut = CARDS.map((c) => {
  const meta = {};
  for (const k of Object.keys(c)) {
    if (typeof c[k] !== 'function') meta[k] = c[k];
  }
  meta._hasUpCost = ('costU' in c);          // costU 存在表示升级减费
  meta._hasHpCost = ('hpCost' in c);
  meta._hasEff = true;
  // 每张卡在每位英雄 + 基础/升级 下的成品描述
  const desc = {};
  for (const hero of heroSet) {
    ctx.G.__hero = hero;
    const row = {};
    for (const u of [0, 1]) {
      let txt = '';
      let err = null;
      try { txt = c.t ? String(c.t(!!u, c)) : ''; }
      catch (e) { err = e.message; }
      row[u] = err ? '[[ERR:' + err + ']]' : txt;
    }
    desc[hero] = row;
  }
  meta.desc = desc;
  return meta;
});

const heroOut = HEROES.map(h => {
  const meta = {};
  for (const k of Object.keys(h)) {
    if (typeof h[k] !== 'function') meta[k] = h[k];
  }
  return meta;
});

const out = { heroes: heroOut, cards: cardOut };
fs.writeFileSync('_cards_dump.json', JSON.stringify(out, null, 1), 'utf-8');
console.log('heroes:', heroOut.length, 'cards:', cardOut.length);
console.log('hero ids:', heroOut.map(h => h.id).join(','));
