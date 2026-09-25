// 一次性工具：把某份 原型.html 里 48 张牌 × 4 英雄 × {未升级,升级} 的卡面文案全部导出成 JSON。
// 用法：node _patch/dump_texts.js <原型.html 路径>
// 用于 v0.61.39 更新日志的「现值 → 新值」对照表（HEAD 版 vs 工作区版做真 diff，不凭记忆写）。
const vmh = require('./vm_host.js');
const path = require('path');

const target = process.argv[2];
if (!target) { console.error('用法：node dump_texts.js <原型.html>'); process.exit(1); }

const APPENDED = `
(function () {
  try { render=function(){}; } catch(e){}
  var HEROES = ['ganshiren','wuseng','yincha','tianshi'];
  var out = {};
  HEROES.forEach(function (h) {
    G = newState(); G.hero = h; G.act = 1;
    out[h] = {};
    CARDS.forEach(function (c) {
      var t0, t1;
      try { t0 = c.t(false); } catch (e) { t0 = 'ERR:' + e.message; }
      try { t1 = c.t(true); } catch (e) { t1 = 'ERR:' + e.message; }
      out[h][c.id] = { n: c.name, u0: t0, u1: t1 };
    });
  });
  __TEXTS = out;
})();
`;

const { sandbox } = vmh.load(path.resolve(target), APPENDED);
if (sandbox.__boom) { console.error('BOOM\n' + sandbox.__boom); process.exit(1); }
process.stdout.write(JSON.stringify(sandbox.__TEXTS));