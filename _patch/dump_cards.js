// 志怪塔 · 卡面全量导出（复核 Block1~5 用）
// 用法：node _patch/dump_cards.js [输出路径]
// 在 VM 里加载 原型.html 的 <script>，把赶尸人(A)列 48 张卡的 t(false)/t(true) 与
// CARD_DMG 预览键有无 / 尸气上限 / 初始卡池 一并导出成 JSON。
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const P = path.join(__dirname, '..', '原型.html');
const OUT = process.argv[2] || path.join(__dirname, '_cards_dump.json');
const html = fs.readFileSync(P, 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('FAIL: 找不到 <script>'); process.exit(2); }

function dummyEl() {
  const classList = { _s: new Set(), add() {}, remove() {}, toggle() {}, contains() { return false; } };
  return {
    style: {}, dataset: {}, classList,
    setAttribute() {}, removeAttribute() {}, appendChild() {}, removeChild() {},
    insertBefore() {}, remove() {}, addEventListener() {}, removeEventListener() {},
    _text: '', _html: '',
    set textContent(v) { this._text = String(v); }, get textContent() { return this._text; },
    set innerHTML(v) { this._html = String(v); }, get innerHTML() { return this._html; },
    set src(v) {}, get src() { return ''; },
    onload: null, onerror: null, onclick: null,
    offsetWidth: 0, offsetHeight: 0,
    getBoundingClientRect() { return { left: 0, top: 0, right: 10, bottom: 10, width: 10, height: 10 }; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    focus() {}, blur() {}, click() {}, contains() { return false; },
  };
}
const store = new Map();
const ls = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
class AudioStub { constructor() { this.loop = false; this.volume = 0.5; this._src = ''; } set src(v) { this._src = v; } get src() { return this._src; } play() { return Promise.resolve(); } pause() {} addEventListener() {} removeEventListener() {} }
const ctor = () => dummyEl();
const sandbox = {
  console: { log() {}, warn() {}, error() {} },
  setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame(cb) { return setTimeout(() => cb(Date.now()), 0); },
  cancelAnimationFrame(id) { clearTimeout(id); },
  performance, Audio: AudioStub, Image: ctor,
  navigator: { userAgent: 'dump', onLine: true },
  location: { href: 'about:blank', reload() {}, assign() {} },
  history: { pushState() {}, replaceState() {} },
  localStorage: ls, sessionStorage: ls,
  document: {
    addEventListener() {}, removeEventListener() {},
    getElementById() { return dummyEl(); }, querySelector() { return null; }, querySelectorAll() { return []; },
    createElement() { return dummyEl(); }, createTextNode() { return {}; },
    body: dummyEl(), documentElement: dummyEl(), head: dummyEl(), title: '',
  },
  alert() {}, confirm() { return true; }, prompt() { return null; },
  screen: { width: 1280, height: 800 },
  TextEncoder, TextDecoder, URL, URLSearchParams,
  __out: null,
};
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const DUMP = `
G = newState();
G.hero='ganshiren'; G.act=1; G.endless=false; G.relics=[]; G.summons=[]; G.尸气=0; G.block=0;
G.maxShiQi = 12;
try{ render=function(){}; }catch(e){}
var __cards = CARDS.map(function(c){
  var t0,t1;
  try{ t0=c.t(false); }catch(e){ t0='ERR:'+e.message; }
  try{ t1=c.t(true); }catch(e){ t1='ERR:'+e.message; }
  return { id:c.id, name:c.name, type:c.type, rarity:c.rarity, cost:c.cost,
           hasU: !!c.costU || (typeof c.hpCost==='function'), exhaust:!!c.exhaust,
           dmg: (typeof CARD_DMG!=='undefined' && CARD_DMG[c.id]) ? 'Y' : '-',
           t0:t0, t1:t1 };
});
var __hero = HEROES.filter(function(h){ return h.id==='ganshiren'; })[0] || {};
__out = {
  shiqiMax: (typeof G.maxShiQi!=='undefined' ? G.maxShiQi : 'undef'),
  gainShiqiCapDefault: 12,
  deck: (__hero.deck||[]).map(function(p){ return p[0]+'x'+p[1]; }),
  deckCount: (__hero.deck||[]).reduce(function(a,p){ return a+p[1]; }, 0),
  ghostIds: (typeof GHOST_IDS!=='undefined'?GHOST_IDS:null),
  cards: __cards
};
`;

try {
  vm.runInContext(m[1] + '\n' + DUMP, sandbox, { timeout: 90000, filename: 'dump.js' });
} catch (e) {
  console.error('BOOT FAIL:', e && e.stack ? e.stack : e); process.exit(2);
}
fs.writeFileSync(OUT, JSON.stringify(sandbox.__out, null, 1), 'utf8');
const o = sandbox.__out;
console.log('导出 ' + o.cards.length + ' 张 → ' + OUT);
console.log('尸气上限 maxShiQi=' + o.shiqiMax + ' / 初始卡池 ' + o.deckCount + ' 张: ' + o.deck.join(' '));
console.log('无 CARD_DMG 预览键的卡: ' + o.cards.filter(c => c.dmg === '-').map(c => c.id).join(', '));
