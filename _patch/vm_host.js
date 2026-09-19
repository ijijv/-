// 志怪塔 · VM 宿主（smoke_host.js 与 sim.js 共用）
// 把 原型.html（或单文件产物）里的脚本按文档顺序拼起来，在 node:vm 沙箱里跑。
// 沙箱里没有真 DOM/音频，全部用桩；游戏代码本来就用 try/catch 兜着降级。
const fs = require('fs');
const vm = require('vm');
const path = require('path');

/**
 * 按文档顺序把页面里的脚本拼成一段：
 *   开发源 原型.html   → <script src="js/xx.js"> 依次读取相对该 HTML 的文件
 *   单文件打包产物     → 内联 <script>（打包.py 已把 js/* 合回去）
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

function makeSandbox() {
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
    navigator: { userAgent: 'zhiguaitower-vm', onLine: true },
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
  return sandbox;
}

/**
 * 载入游戏代码（+ 追加代码）到沙箱。
 * 返回 { sandbox, html, codeIn }；沙箱内如有异常会记在 sandbox.__boom。
 */
function load(gamePath, extraCode, opts) {
  const P = path.resolve(gamePath);
  const html = fs.readFileSync(P, 'utf8');
  const codeIn = collectScripts(html, path.dirname(P));
  if (!codeIn.trim()) throw new Error('页面里没有任何 <script>：' + P);
  const code = codeIn + '\n/* ===== APPENDED ===== */\n' + (extraCode || '');
  const sandbox = makeSandbox();
  vm.createContext(sandbox);
  const timeout = (opts && opts.timeout) || 90000;
  try {
    vm.runInContext(code, sandbox, { timeout, filename: 'zhiguaitower-vm.js' });
  } catch (e) {
    sandbox.__boom = (e && e.stack) ? e.stack : String(e);
  }
  return { sandbox, html, codeIn };
}

module.exports = { collectScripts, makeSandbox, load, dummyEl };
