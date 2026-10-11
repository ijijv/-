/* 临时：量「锦囊」入口按钮（战斗竖栏 + 地图顶栏）的矩形与是否被裁。用完即删。 */
(function () {
  var q = new URLSearchParams(location.search);
  var out = [], errs = [];
  window.onerror = function (m, u, l) { errs.push(m + ' @' + l); };
  function R(sel) {
    var e = document.querySelector(sel);
    if (!e) return 'MISSING';
    var r = e.getBoundingClientRect();
    return Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height);
  }
  function run() {
    try {
      confirmNewGame(); pickHero('tianshi');
      if (typeof skipOpening === 'function') skipOpening();
      closeOverlay();
      document.body.classList.remove('at-menu');
      var sc = q.get('sc') || 'battle';
      if (sc === 'map') { G.mapPath = [{ r: G.mapRow, c: 0 }]; G.mapCol = 0; showMap(); }
      else {
        G.relics = ['zhaohunfan', 'shiyu']; G.potions = [randomPotion(), randomPotion()];
        startBattle(['huyao']);
      }
    } catch (e) { errs.push('run: ' + e.message); }
    setTimeout(function () {
      out.push('vp=' + window.innerWidth + 'x' + window.innerHeight + ' sc=' + (q.get('sc') || 'battle'));
      out.push('#jinnangBtn   ' + R('#jinnangBtn') + '  text=' + ((document.querySelector('#jinnangBtn') || {}).textContent || ''));
      out.push('  hasImg=' + !!document.querySelector('#jinnangBtn img'));
      out.push('#menuBtn     ' + R('#menuBtn'));
      out.push('.title-actions ' + R('.title-actions'));
      out.push('#mtJinnangBtn ' + R('#mtJinnangBtn') + '  hasImg=' + !!document.querySelector('#mtJinnangBtn img'));
      out.push('.mt-menu      ' + R('.mt-menu'));
      out.push('.map-topbar   ' + R('.map-topbar'));
      out.push('#topbar detail prelic=' + (document.querySelector('#topbar') ? document.querySelector('#topbar').innerHTML.indexOf('prelic-chip') : 'no-topbar')
        + ' potion=' + (document.querySelector('#topbar') ? document.querySelector('#topbar').innerHTML.indexOf('potion-chip') : 'no-topbar'));
      try {
        showJinnang();
        out.push('.pouch-root   ' + R('.pouch-root'));
        out.push('.pouch-potions ' + R('.pouch-potions'));
        out.push('.pouch-relics  ' + R('.pouch-relics'));
        out.push('.pouch-item    ' + R('.pouch-item'));
        var pi = document.querySelector('.pouch-potions .pouch-item');
        out.push('potionItemHTML=' + (pi ? pi.outerHTML.slice(0, 260) : 'MISSING'));
        out.push('potions=' + JSON.stringify((G.potions || []).map(function (p) { return p && p.name; })));
      } catch (e) { errs.push('jin: ' + e.message); }
      out.push('errs=' + (errs.length ? errs.join(' | ') : '0'));
      var d = document.getElementById('__dbg');
      if (!d) { d = document.createElement('div'); d.id = '__dbg';
        d.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#000d;color:#0f0;font:11px/1.4 monospace;padding:4px 6px;white-space:pre-wrap';
        document.body.appendChild(d); }
      d.textContent = out.join('\n');
    }, 2000);
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(run, 0);
  else window.addEventListener('DOMContentLoaded', function () { setTimeout(run, 0); });
})();