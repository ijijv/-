// 志怪塔 · Task#13 VM 冒烟宿主
// 把 原型.html 的 <script> 正文与 smoke_runner.js 拼接后在 node:vm 沙箱中执行，
// 结果写入沙箱 __report 并打印。退出码：0=通过，1=有失败，2=宿主错误。
const fs = require('fs');
const vm = require('vm');
const path = require('path');

// 默认跑开发源 原型.html；传入路径则跑该文件（用于验证单文件打包产物）
const P = path.resolve(process.argv[2] || path.join(__dirname, '..', '原型.html'));
const html = fs.readFileSync(P, 'utf8');

/**
 * 按文档顺序把页面里的脚本拼成一段（v0.61.05 三层重构后）：
 *   开发源 原型.html   → <script src="js/xx.js"> 依次读取相对该 HTML 的文件
 *   单文件打包产物     → 内联 <script>（打包.py 已把 js/* 合回去）
 * 两者共用同一条路径，冒烟对源码与产物都能跑。
 */
function collectScripts(html, baseDir) {
  const out = [];
  const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1] || '';
    const src = /\bsrc\s*=\s*"([^"]+)"/i.exec(attrs);
    if (src) out.push(fs.readFileSync(path.resolve(baseDir, src[1]), 'utf8'));
    else out.push(m[2]);
  }
  return out.join('\n');
}

const code_in = collectScripts(html, path.dirname(P));
if (!code_in.trim()) { console.error('FAIL: 页面里没有任何 <script>'); process.exit(2); }
const runner = fs.readFileSync(path.join(__dirname, 'smoke_runner.js'), 'utf8');
// 注意：runner 追加进全部脚本之后，与 CARDS/G/CURSE_THIS_TURN 同一声明作用域
const code = code_in + '\n/* ===== VM SMOKE RUNNER (appended) ===== */\n' + runner;

function dummyEl() {
  const classList = {
    _s: new Set(),
    add() {}, remove() {}, toggle() {}, contains() { return false; },
  };
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
const ls = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  clear: () => store.clear(),
};
class AudioStub {
  constructor() { this.loop = false; this.volume = 0.5; this._src = ''; }
  set src(v) { this._src = v; } get src() { return this._src; }
  play() { return Promise.resolve(); } pause() {}
  addEventListener() {} removeEventListener() {}
}
const ctor = () => dummyEl();
const sandbox = {
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame(cb) { return setTimeout(() => cb(Date.now()), 0); },
  cancelAnimationFrame(id) { clearTimeout(id); },
  performance,
  Audio: AudioStub,
  Image: ctor,
  navigator: { userAgent: 'zhiguaitower-smoke', onLine: true },
  location: { href: 'about:blank', reload() {}, assign() {} },
  history: { pushState() {}, replaceState() {} },
  localStorage: ls,
  sessionStorage: ls,
  document: {
    addEventListener() {}, removeEventListener() {},
    getElementById() { return dummyEl(); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return dummyEl(); },
    createTextNode() { return {}; },
    body: dummyEl(), documentElement: dummyEl(), head: dummyEl(), title: '',
  },
  alert() {}, confirm() { return true; }, prompt() { return null; },
  screen: { width: 1280, height: 800 },
  TextEncoder, TextDecoder, URL, URLSearchParams,
  __report: null,
  __boom: null,
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
try {
  vm.runInContext(code, sandbox, { timeout: 90000, filename: 'zhiguaitower-smoke.js' });
} catch (e) {
  sandbox.__boom = (e && e.stack) ? e.stack : String(e);
}
// 调试用：SMOKE_DUMP="表达式" 时在游戏作用域里求值并打印（用于打包校验取 id 清单）
if (process.env.SMOKE_DUMP) {
  try {
    const v = vm.runInContext(process.env.SMOKE_DUMP, sandbox, { timeout: 15000 });
    console.log('__DUMP__' + JSON.stringify(v));
  } catch (e) { console.log('__DUMPERR__' + (e && e.message)); }
  process.exit(0);
}
const rep = sandbox.__report || {};
if (sandbox.__boom) { rep.ok = false; rep.bootError = sandbox.__boom; }
console.log(JSON.stringify(rep, null, 1));
process.exit(rep && rep.ok ? 0 : 1);
