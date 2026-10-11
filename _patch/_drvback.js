/* v1.1.x 专用驱动：「返回主界面 / 返回地图 卡死」三路复现（场景版，单终态 —— 便于截图对拍）。
   ?sc=menu|shop|boss   （默认 menu）
   用法：
     python _patch/shot.py --direct --widths 1016 --h 471 --drv _patch/_drvback.js --q "&sc=menu" --dump
     python _patch/shot.py --direct --widths 1016 --h 471 --drv _patch/_drvback.js --q "&sc=menu" --clean --out _patch/_stuck_menu.png
*/
(function () {
  var errs = [];
  window.onerror = function (m, u, l) { errs.push(m + ' @' + l); };
  var q = new URLSearchParams(location.search);
  var sc = q.get('sc') || 'menu';
  var box = null, lines = [];

  function badge() {
    if (q.get('clean')) return;
    if (!box) {
      box = document.createElement('div');
      box.id = '__dbg';
      box.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;background:#000d;color:#0f0;'
        + 'font:11px/1.4 monospace;padding:4px 6px;max-width:100%;white-space:pre-wrap';
      document.body.appendChild(box);
    }
    box.textContent = lines.join('\n');
  }
  function cs(el, p) { try { return getComputedStyle(el).getPropertyValue(p); } catch (e) { return 'ERR'; } }
  function cls(el) { return el ? String(el.className || '') : '(无)'; }
  function R(sel) {
    var e = document.querySelector(sel); if (!e) return 'MISSING';
    var r = e.getBoundingClientRect();
    return Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + '×' + Math.round(r.height)
      + ' op=' + cs(e, 'opacity') + ' an=' + cs(e, 'animation-name');
  }

  function snap(tag) {
    var ov = document.getElementById('overlay');
    var oc = document.getElementById('overlayContent');
    var oc2 = document.getElementById('ovConfirm');
    var stage = document.querySelector('.menu-stage');
    var clickable = 0, alln = 0;
    try { alln = document.querySelectorAll('.map-node').length; clickable = document.querySelectorAll('button.map-node').length; } catch (e) {}
    lines.push('=== ' + tag + ' (vp=' + window.innerWidth + '×' + window.innerHeight + ') ===');
    lines.push('  body.class=' + cls(document.body) + '  #app.display=' + cs(document.getElementById('app'), 'display'));
    lines.push('  #overlay.class=' + cls(ov) + '  display=' + cs(ov, 'display') + '  #ovConfirm=' + cls(oc2));
    lines.push('  #content 长度=' + (((oc && oc.textContent) || '').length) + ' 头=' + ((oc && oc.textContent) || '').replace(/\s+/g, ' ').slice(0, 40));
    lines.push('  menu-stage=' + (stage ? 'Y display=' + cs(stage, 'display') : 'N'));
    lines.push('  标题  ' + R('.menu-titlebar .menu-art'));
    lines.push('  入塔  ' + R('.menu-hit.is-start .menu-art'));
    lines.push('  续    ' + R('.menu-hit.is-continue .menu-art'));
    lines.push('  图鉴  ' + R('.menu-hit.is-collection .menu-art'));
    lines.push('  设置  ' + R('.menu-hit.is-setting .menu-art'));
    lines.push('  地图节点 全部/可点=' + alln + '/' + clickable);
    lines.push('  关闭✕   ' + R('#overlayCloseX') + '  display=' + cs(document.getElementById('overlayCloseX'), 'display'));
    var acts = document.querySelectorAll('#overlayContent .ov-act-l, #overlayContent .ov-act-r');
    for (var i = 0; i < acts.length; i++) {
      var ar = acts[i].getBoundingClientRect();
      lines.push('  角标按钮 ' + i + ' [' + acts[i].textContent.slice(0, 6) + '] '
        + Math.round(ar.left) + ',' + Math.round(ar.top) + ' ' + Math.round(ar.width) + '×' + Math.round(ar.height)
        + ' op=' + cs(acts[i], 'opacity'));
    }
    lines.push('  errs=' + (errs.length ? errs.join(' | ') : '0'));
  }

  function enterRun() {
    confirmNewGame(); pickHero('tianshi');
    if (typeof skipOpening === 'function') skipOpening();
    closeOverlay();
    document.body.classList.remove('at-menu');
  }

  function run() {
    try {
      enterRun();
      if (sc === 'menu') {
        quitToMenu();                 // 主菜单
        hideOverlay(); viewBestiary();// 开图鉴
        closeOverlay();               // 点 ✕ 回主菜单  ← 用户报「卡住」的那一下
      } else if (sc === 'menux') {
        /* 图鉴连开两次再关：查「MENU_BUSY / 尾随定时器」类问题 */
        quitToMenu();
        hideOverlay(); viewBestiary(); closeOverlay();
        hideOverlay(); viewBestiary(); closeOverlay();
      } else if (sc === 'set') {
        quitToMenu();
        hideOverlay(); showSettings();
        menuBack();                   // 设置「返回菜单」
      } else if (sc === 'rank') {
        quitToMenu();
        hideOverlay(); showSettings();
        showClearTimes();             // 设置 → 榜单
        showSettings();               // 榜单「返回设置」
        menuBack();                   // 设置「返回菜单」
      } else if (sc === 'tut') {
        quitToMenu();
        hideOverlay(); showSettings();
        showTutorial(1);              // 设置 → 新手引导（v1.0.20 报过的那条）
        closeOverlay();
      } else if (sc === 'shop') {
        G.mapPath = [{ r: G.mapRow, c: 0 }]; G.mapCol = 0;
        showShop();                   // 进商店
        hideOverlay(); showMap();     // 商店「返回地图」的原句
      } else if (sc === 'boss') {
        /* 真打一场最终 Boss：走 winFight → showBattleResult → 继续 → advanceAct → showVictory */
        try {
          G.act = ACTS.length; G.mapRow = MAP.length - 1; G.mapCol = 0;
          G.mapPath = [{ r: G.mapRow, c: 0 }];
        } catch (e) { errs.push('setup: ' + e.message); }
        startBattle(['mengpo']);      // 任一 Boss key 兜底
        G.enemies.forEach(function (e) { e.hp = 0; });
        winFight();                   // ⇒ G.finalBoss = true（act>=ACTS.length）
        continueAfterBattle();        // ⇒ advanceAct ⇒ showVictory
      }
    } catch (e) { errs.push('run: ' + e.message); }
    /* 等入场动画落定再采样 —— 60ms 太早，会量到 opacity≈0 的假象 */
    setTimeout(function () { snap('终态 sc=' + sc); badge(); }, 2200);
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(run, 0);
  else window.addEventListener('DOMContentLoaded', function () { setTimeout(run, 0); });
})();