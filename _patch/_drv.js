/* 一次性调试驱动（只用于 _shot.html，不进仓库产物）：
   跑一遍「新局 → 选英雄 → 跳过开局 → 进地图」，把出错信息与关键状态画成左上角角标，
   好让 --screenshot 的图自己能说话；--dump-dom 时也能直接读到这段文字。 */
(function () {
  var errs = [];
  window.onerror = function (m, u, l) { errs.push(m + ' @' + l); };
  var q = new URLSearchParams(location.search);

  function badge(t) {
    if (q.get('clean')) { document.title = 'DBG(clean)'; return; }   // ?clean=1 → 出干净截图
    var d = document.getElementById('__dbg');
    if (!d) {
      d = document.createElement('div');
      d.id = '__dbg';
      d.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;background:#000c;color:#0f0;'
        + 'font:11px/1.4 monospace;padding:4px 6px;max-width:100%;white-space:pre-wrap';
      document.body.appendChild(d);
    }
    d.textContent = t;
  }

  function cls(sel) {
    var e = document.querySelector(sel);
    return e ? (e.className || '(no class)') : 'MISSING';
  }

  function go() {
    var st = [];
    try {
      confirmNewGame();
      st.push('A hero-select ok');
      pickHero(q.get('hero') || 'tianshi');
      st.push('B hero=' + G.hero + ' deck=' + G.deck.length);
      skipOpening();
      st.push('C mapRow=' + G.mapRow + ' MAP.length=' + MAP.length);
      var ov = document.getElementById('overlay');
      st.push('D #overlay.className=' + (ov ? ov.className : '?'));
      var sh = document.getElementById('map-sheet');
      st.push('E camY=' + (sh ? (sh.style.getPropertyValue('--camY') || '(unset)') : 'MISSING')
        + ' transform=' + (sh ? (sh.style.transform || '(empty)') : '?')
        + ' computed=' + (sh ? getComputedStyle(sh).transform : '?'));
      var ml = document.getElementById('map-lines');
      st.push('E2 #map-lines ' + (ml ? ('kids=' + ml.children.length
        + ' htmlLen=' + (ml.innerHTML || '').length
        + ' head=' + (ml.innerHTML || '').slice(0, 90).replace(/</g, '{')) : 'MISSING'));
      st.push('E3 doc svg=' + document.getElementsByTagName('svg').length
        + ' path=' + document.getElementsByTagName('path').length
        + ' hasDrawMapLinks=' + (typeof drawMapLinks === 'function'));
      st.push('E4 glowEdge=' + (typeof _mapGlowEdge === 'undefined' ? 'undef' : String(_mapGlowEdge)));
      var vp = document.getElementById('map-viewport');
      st.push('F vpH=' + (vp ? vp.offsetHeight : '?')
        + ' sheetH=' + (sh ? sh.offsetHeight : '?')
        + ' rowH=' + (typeof measureRowH === 'function' ? measureRowH() : '?'));
      st.push('G rows=' + document.querySelectorAll('.map-row').length
        + ' nodes=' + document.querySelectorAll('.map-node').length
        + ' lines=' + document.querySelectorAll('.map-lines svg, #map-lines svg').length);
      st.push('H topbar=' + (document.querySelector('.map-topbar') ? 'yes' : 'NO')
        + ' plaque=' + (document.querySelector('.map-plaque') ? 'yes' : 'NO')
        + ' rollerT=' + (document.querySelector('.map-roller.top') ? 'yes' : 'NO')
        + ' rollerB=' + (document.querySelector('.map-roller.bot') ? 'yes' : 'NO')
        + ' bottombar=' + (document.querySelector('.map-bottombar') ? 'yes' : 'NO'));
      st.push('I r0=' + cls('.map-node[data-r="0"]') + ' | r13=' + cls('.map-node[data-r="13"]'));
      // 每层到底显示了什么：类型 t、图标文件名、描边档位。fog 设计里只有 choice/preview 该露真图标，
      // 其余应是锁 —— 但若**连选择层都是锁**，玩家就看不出可选项，那是设计 bug。
      for (var rr = 0; rr <= 4; rr++) {
        var rowEl = document.querySelector('.map-row[data-r="' + rr + '"]')
          || document.querySelectorAll('.map-row')[MAP.length - 1 - rr];
        var nodes = rowEl ? rowEl.querySelectorAll('.map-node') : [];
        var desc = [];
        for (var k = 0; k < nodes.length; k++) {
          var nd = nodes[k];
          var ico = nd.querySelector('.node-ico');
          var img = nd.querySelector('img');
          var src = img ? (img.getAttribute('src') || '') : '';
          desc.push((nd.getAttribute('data-c') || '?') + ':'
            + (MAP[rr] && MAP[rr][+nd.getAttribute('data-c')] ? MAP[rr][+nd.getAttribute('data-c')].t : '?')
            + '/' + (ico ? (ico.className || '(no cls)').replace('node-ico', '').trim() : 'no-ico')
            + '/' + (src ? src.split('/').pop() : 'no-img'));
        }
        st.push('Q r' + rr + ' [' + desc.join('  ') + ']');
      }
      var bg = getComputedStyle(document.getElementById('overlay')).backgroundColor;
      st.push('J overlay bg=' + bg);
      // 直接调用（绕开 rAF），判断到底是「函数坏了」还是「rAF 在这个 headless 配置下根本没跑」
      try { drawMapLinks(); st.push('L drawMapLinks() 直调 ok'); }
      catch (e) { st.push('L drawMapLinks() THROW ' + e.message); }
      var ml2 = document.getElementById('map-lines');
      st.push('L2 after: kids=' + (ml2 ? ml2.children.length : '?')
        + ' svg=' + document.getElementsByTagName('svg').length
        + ' path=' + document.getElementsByTagName('path').length);
      // showMap 里 kick() 是靠 rAF 调度的，而 --virtual-time-budget 下**后注册的 rAF 拿不到帧**
      // （我的探针 rAF 在解析期注册 → 有帧；kick 在 700ms 后才注册 → 没帧）。
      // 这是**测试夹具的坑，不是游戏的 bug** —— 所以这里手工把 kick 的效果复现一遍，
      // 好让截图反映「进场动画播完、缓停在第 1 层」的真实观感。
      try {
        _mapGlowEdge = null;
        mapCamInit(true, -1);          // 进场：钉 Boss 层 → 缓入到 G.mapRow（此处 0 = 第 1 层）
        var sh2 = document.getElementById('map-sheet');
        st.push('M camY=' + (sh2.style.getPropertyValue('--camY') || '(unset)')
          + ' computed=' + getComputedStyle(sh2).transform
          + ' transition-dur=' + (sh2.style.getPropertyValue('transition-duration') || '(unset)'));
        st.push('M2 svg=' + document.getElementsByTagName('svg').length
          + ' path=' + document.getElementsByTagName('path').length);
      } catch (e) { st.push('M mapCamInit THROW ' + e.message); }
      st.push('N rAF fired=' + (window.__rafFired ? 'yes' : 'NO'));
      // P：上面读到的 computed Y=0 是**过渡的起始值**（2000ms transition 刚起步，这个夹具里没有帧
      // 去推进它）——不是 bug。这里用 animate=false 直接钉到终点，核对 computed 真的出现负 Y。
      try {
        var sh3 = document.getElementById('map-sheet');
        /* v0.63.0：改用游戏自己的 mapCamRange()（含实测 padTop）。旧的 4 参写法是 v0.62.0 留下的，
           少了 .map-sheet 的 padding-top ⇒ 钉出来的位置比真实值低 22~30px，截图里第 1 层会假性被切。 */
        var C = mapCamRange();
        var tgt = camYForRow(G.mapRow, C.rowH, C.maxY, C.vpH, C.padTop);
        setMapCam(tgt, false, 0);
        st.push('P target=' + tgt + 'px camY=' + sh3.style.getPropertyValue('--camY')
          + ' computed=' + getComputedStyle(sh3).transform
          + ' cls=' + (sh3.className || '(none)'));
      } catch (e) { st.push('P THROW ' + e.message); }
      var vpw = vp ? vp.offsetWidth : 0;
      st.push('K vpW=' + vpw + ' bodyW=' + document.body.scrollWidth
        + ' docW=' + document.documentElement.scrollWidth);
    } catch (e) {
      st.push('THROW ' + e.message + ' :: ' + (e.stack || '').split(String.fromCharCode(10))[1]);
    }
    if (errs.length) st.push('ERR ' + errs.slice(0, 3).join(' | '));
    badge(st.join(String.fromCharCode(10)));
    document.title = 'DBG ' + st.length + ' lines';
  }

  setTimeout(go, 400);
  requestAnimationFrame(function () { window.__rafFired = true; });
})();