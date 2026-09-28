/* v0.69.0 §D 校验器：把 _ts_cand.js 的短版草稿与 js/20_data.js 里卡牌的 t() 全文对拍。
   两条硬闸（与 smoke_runner 里那段完全一致，这里只是能给出更细的 diff）：
     ① 列宽 ≤30（ASCII 记 0.5 列，其余记 1 列）
     ② 数字多重集与 t() 逐元素相等
   用法：node _patch/_tscheck.js
*/
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const vmh = require('./vm_host.js');

/* ⚠️ 草稿里的 ts 是 `(u)=>G.hero==='...'?...` 形式，引用的是裸 `G`。
   用 require 加载时 `G` 会落到 **node 的真实全局**（未定义）—— 必须丢进 vm 上下文，
   且每张卡都要用当前的 G.hero 重新求值，所以上下文里的 G 是**可变的**。 */
const ctx = vm.createContext({ module: { exports: {} }, G: { hero: 'ganshiren' } });
vm.runInContext(fs.readFileSync('_patch/_ts_cand.js', 'utf8'), ctx, { filename: '_ts_cand.js' });
const CAND = ctx.module.exports;

const APPENDED = `
(function () {
  try { render=function(){}; } catch(e){}
  var HEROES = ['ganshiren','wuseng','yincha','tianshi'];
  var out = {};
  HEROES.forEach(function (h) {
    G = newState(); G.hero = h; G.act = 1;
    out[h] = {};
    CARDS.forEach(function (c) {
      out[h][c.id] = { n: c.name, t0: c.t(false), t1: c.t(true),
                       hasTs: typeof c.ts === 'function' };
    });
  });
  __TEXTS = out;
})();
`;
const { sandbox } = vmh.load(path.resolve('原型.html'), APPENDED);
if (sandbox.__boom) { console.error('BOOM\n' + sandbox.__boom); process.exit(1); }
const REAL = sandbox.__TEXTS;
const HEROES = ['ganshiren', 'wuseng', 'yincha', 'tianshi'];

function cols(t) {
  let w = 0;
  for (const ch of String(t)) {
    const c = ch.codePointAt(0);
    w += (c >= 0x20 && c <= 0x7e) ? 0.5 : 1;
  }
  return w;
}
function nums(t) { return String(t).match(/\d+(?:\.\d+)?/g) || []; }
function sameNums(a, b) {
  const x = nums(a), y = nums(b);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

/* 草稿里的 ts 是在 vm 外跑的：直接调用会引用未定义的 G。给它一个 G 桩。 */
const MAXCOL = 30;

/* `node _patch/_tscheck.js --m 字符串` —— 只量一条候选的列宽与数字，用于快速试写。
   （手算列宽极容易错：ASCII 数字只占 0.5 列，所以「伤 2」= 2 列而不是 3 列。） */
if (process.argv[2] === '--m') {
  process.argv.slice(3).forEach(function (t) {
    console.log(cols(t).toFixed(1) + ' 列  nums=[' + nums(t).join(',') + ']  ' + t);
  });
  process.exit(0);
}

let bad = 0, checked = 0;
const ids = Object.keys(CAND);
for (const id of ids) {
  for (const h of HEROES) {
    ctx.G.hero = h;
    for (const [u, key] of [[false, 't0'], [true, 't1']]) {
      let short;
      try { short = CAND[id].ts(u); }
      catch (e) { console.log(`✗ ${id}/${h}/${u ? '升' : '基'} 抛异常: ${e.message}`); bad++; continue; }
      checked++;
      const full = REAL[h][id][key];
      const cw = cols(short);
      const probs = [];
      if (cw > MAXCOL) probs.push(`列宽 ${cw.toFixed(1)} > ${MAXCOL}`);
      if (!sameNums(full, short)) probs.push(`数字不符 [全文:${nums(full).join(',')}] vs [短版:${nums(short).join(',')}]`);
      if (probs.length) { bad++; console.log(`✗ ${id} ${REAL[h][id].n} ${h} ${u ? '升' : '基'}\n    ${probs.join('\n    ')}\n    短版(${cw}): ${short}\n    全文(${cols(full).toFixed(1)}): ${full}`); }
    }
  }
}

/* 未写 ts 的卡是否真的都放得下 */
const noTs = [];
for (const h of HEROES) for (const id of Object.keys(REAL[h])) {
  if (CAND[id]) continue;
  const cw = Math.max(cols(REAL[h][id].t0), cols(REAL[h][id].t1));
  if (noTs.indexOf(id) < 0) noTs.push(id);
  if (cw > MAXCOL) { bad++; console.log(`✗ ${id} ${REAL[h][id].n} ${h} 未写 ts 但列宽 ${cw.toFixed(1)} > ${MAXCOL}`); }
}
console.log(`\n抽查 ${checked} 条（${ids.length} 张卡），另 ${noTs.length} 张未写 ts：${noTs.join(' ')}`);
console.log(bad ? `\n✗ ${bad} 条不通过` : '\n✓ 全部通过');
process.exit(bad ? 1 : 0);