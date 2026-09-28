/* 一次性探针：走「新局 → 选英雄 → 跳过开局 → 进地图」这条路，专门量
   v0.68.2 新增的 `body.at-menu` 有没有在进战局时被清掉。
   ⚠️ 这条是**回归闸**：at-menu 卡住不摘 ⇒ `#app{display:none}` ⇒ 整个战斗界面消失。 */
(function () {
  var errs = []; window.onerror = function (m, u, l) { errs.push(m + ' @' + l); };
  var q = new URLSearchParams(location.search);
  function cs(el, p) { try { return getComputedStyle(el).getPropertyValue(p); } catch (e) { return 'ERR'; } }
  function go() {
    var out = [];
    try {
      var before = document.body.className;
      confirmNewGame(); pickHero(q.get('hero') || 'tianshi'); skipOpening();
      var app = document.getElementById('app');
      out.push('A 主菜单时 body=' + before);
      out.push('B 进地图后 body=' + document.body.className + '（不该再有 at-menu）');
      out.push('C #app display=' + cs(app, 'display') + ' h=' + app.offsetHeight + '（必须是 block 且 h>0）');
      out.push('D #bg display=' + cs(document.getElementById('bg'), 'display'));
      out.push('E SCENE=' + SCENE + ' errs=' + (errs.length ? errs.join(' | ') : '0'));
    } catch (e) { out.push('THROW ' + e.message); }
    var d = document.getElementById('__dbg') || document.createElement('div');
    d.id = '__dbg'; d.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;background:#000c;color:#0f0;font:12px/1.5 monospace;padding:4px 6px';
    d.textContent = out.join('\n'); document.body.appendChild(d);
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(go, 0);
  else window.addEventListener('DOMContentLoaded', function () { setTimeout(go, 0); });
})();
