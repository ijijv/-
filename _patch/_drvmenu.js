/* v0.65.0 专用驱动：**停在主菜单**，把「整屏场景到底生效没有」画成角标。
   为什么不复用 _drv.js：那个一路 confirmNewGame→pickHero→skipOpening 冲进地图，
   主菜单在它截图时早就没了。本轮的核心验收点全部在主菜单上，必须单独一只眼睛。

   ⚠️ 踩过的坑（第一版就踩了）：第一版直接调 showStartScreen() 做「确保在主菜单」，
      结果 overlay 本来就开着 ⇒ 门闩算出 wasOpen=true ⇒ **ov-enter 被摘掉**，
      于是量到 an=none、看起来像"动画没生效"。那其实是门闩正确工作的证据，不是 bug。
      改成显式 `hideOverlay(); showStartScreen();`（= 启动与「战败回主菜单」走的同一条路径）。

   采样两个时刻：
     t≈120ms 动画在跑 ⇒ 看 animation-name / opacity 上升
     t≈900ms 动画结束 ⇒ 看终态（opacity 必须是 1）
   用法：python _patch/shot.py --drv _patch/_drvmenu.js --out _patch/_shot_menu.png */
(function () {
  var errs = [];
  window.onerror = function (m, u, l) { errs.push(m + ' @' + l); };
  var q = new URLSearchParams(location.search);
  var box = null;

  function badge(t) {
    if (q.get('clean')) { document.title = 'DBG(clean)'; return; }
    if (!box) {
      box = document.getElementById('__dbg');
      if (!box) {
        box = document.createElement('div');
        box.id = '__dbg';
        box.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;background:#000c;color:#0f0;'
          + 'font:11px/1.4 monospace;padding:4px 6px;max-width:100%;white-space:pre-wrap';
        document.body.appendChild(box);
      }
    }
    box.textContent = t;
  }
  function cs(el, p) { try { return getComputedStyle(el).getPropertyValue(p); } catch (e) { return 'ERR'; } }
  function px(v) { return String(v).replace('px', ''); }

  function snap(tag) {
    var st = [tag];
    var ov = document.getElementById('overlay');
    st.push('B #overlay.class=' + (ov ? ov.className : 'MISSING'));
    st.push('C ov opacity=' + (ov ? cs(ov, 'opacity') : '?')
      + ' vis=' + (ov ? cs(ov, 'visibility') : '?')
      + ' h=' + (ov ? ov.offsetHeight : '?'));

    var root = document.querySelector('.menu-root');
    if (root) {
      var bi = cs(root, 'background-image');
      st.push('D root h=' + root.offsetHeight + ' (需要 ≈ ov 高度才叫整屏)'
        + ' bg=' + (bi === 'none' ? 'NONE(没铺上!)' : 'ok'));
    } else st.push('D .menu-root=MISSING');

    var col = document.querySelector('.menu-col');
    if (col) st.push('E .menu-col scrollH=' + col.scrollHeight + ' clientH=' + col.clientHeight
      + (col.scrollHeight > col.clientHeight + 1 ? ' ⚠溢出' : ' ok'));

    var tiers = document.querySelectorAll('.menu-tier');
    var line = [];
    for (var i = 0; i < tiers.length; i++) {
      line.push(cs(tiers[i], 'animation-name') + '/' + cs(tiers[i], 'animation-delay'));
    }
    st.push('F .menu-tier×' + tiers.length + ' an/delay=' + line.join(' '));

    var wrap = document.getElementById('overlayWrap');
    if (wrap) st.push('G wrap an=' + cs(wrap, 'animation-name') + ' h=' + wrap.offsetHeight);

    var mb = document.querySelector('.menu-tier.is-main .btn');
    if (mb) st.push('H 主按钮 fs=' + cs(mb, 'font-size') + ' pad=' + cs(mb, 'padding-top')
      + ' w=' + mb.offsetWidth);

    var hide = document.getElementById('overlayCloseX');
    st.push('I 关闭叉=' + (hide ? (cs(hide, 'display') === 'none' ? '隐藏✓(closable=false)' : '显示⚠') : 'MISSING'));
    st.push('J errs=' + (errs.length ? errs.join(' | ') : '0'));
    return st.join('\n');
  }

  function go() {
    try {
      // 走**与启动完全同一条路径**：关掉再开 ⇒ 门闩重算成「从关到开」⇒ 该播的动画都播。
      if (typeof hideOverlay === 'function') hideOverlay();
      if (typeof showStartScreen === 'function') showStartScreen();
      // ?panel=1：从主菜单点进「志怪图鉴」—— 验证**普通面板**的淡入+推入，
      // 且 .menu-scene 被摘干净（不摘的话图鉴会继承整屏不透明底、还带上菜单的居中排版）。
      if (q.get('panel') && typeof viewBestiary === 'function') {
        // ⚠️ 用 hide→viewBestiary（不是 hide→showStartScreen→viewBestiary）：
        //    后者会在同一帧里连开两次面板，量到的 opacity 是过渡中途值（0.82），不是终态。
        if (typeof hideOverlay === 'function') hideOverlay();
        viewBestiary();
        setTimeout(function () {
          var ov = document.getElementById('overlay');
          badge('--- 普通面板（图鉴）t1200 ---\n'
            + '#overlay.class=' + ov.className + '\n'
            + '（不该出现 menu-scene / map-scene）\n'
            + 'ov opacity=' + cs(ov, 'opacity') + '（终态必须是 1）'
            + ' vis=' + cs(ov, 'visibility') + '\n'
            + 'wrap an=' + cs(document.getElementById('overlayWrap'), 'animation-name') + '\n'
            + '.panel bg=' + cs(document.getElementById('overlayContent'), 'background-color')
            + ' radius=' + cs(document.getElementById('overlayContent'), 'border-radius') + '\n'
            + 'errs=' + (errs.length ? errs.join(' | ') : '0'));
        }, 1200);
        return;
      }
      badge(snap('--- t0 刚开 (hide→show) ---'));
      setTimeout(function () { badge(snap('--- t900 终态 ---')); }, 900);
    } catch (e) {
      badge('THROW ' + e.message);
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(go, 0);
  else window.addEventListener('DOMContentLoaded', function () { setTimeout(go, 0); });
})();