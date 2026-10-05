/* _sweep.js —— 上线前「版面体检」的通用驱动（只用于 _shot.html，不进仓库产物）。
   用法：python _patch/shot.py --direct --drv _patch/_sweep.js --widths 1280 --h 720 --q "&ui=menu" --dump
   参数（走 --q 查询串）：
     ui   界面 id（见下 drive() 里的 switch），默认 menu
     clean=1  不打角标（出干净截图用）
     fill=0   战报不灌假数据
   输出：写进 #__dbg 的**纯文本**，前缀即分类：
     HDR  视口/页面级溢出
     OVF  元素 rect 超出视口（只报「最外层」那一枚，父级没溢出的）
     INT  scrollWidth/Height > client
     OVL  可交互元素两两相交
     OCC  可交互元素中心点被别的层盖住 / 被裁出视口
     ZRO  可交互元素 rect 宽或高为 0
     TCH  手机档可交互元素任一边 < 44px（按小到大）
     ALI  同父兄弟同一行边缘不对齐 > 4px
   ⚠️ 本驱动**只读**，不改任何游戏 DOM（除了末尾建 #__dbg 那一块——量完之后才建）。
   ⚠️ 量测推迟到 t≈700ms（躲入场动画）；无头 --virtual-time-budget 下后注册的 rAF 拿不到帧，
      所以全程只用 setTimeout，不用 rAF。 */
(function () {
  var errs = [];
  window.onerror = function (m, u, l) { errs.push(m + ' @' + l); };
  var q = new URLSearchParams(location.search);
  var box = null;
  function badge(t) {
    if (q.get('clean')) { document.title = 'SWEEP(clean)'; return; }
    if (!box) {
      box = document.createElement('div');
      box.id = '__dbg';
      box.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:99999;background:#000e;'
        + 'color:#0f0;font:10px/1.25 monospace;padding:4px;white-space:pre;overflow:auto';
      document.body.appendChild(box);
    }
    box.textContent = t;
  }

  /* ---------------- 小工具 ---------------- */
  function nm(el) {
    if (!el || el.nodeType !== 1) return String(el);
    var s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    var c = (typeof el.className === 'string') ? el.className.trim() : '';
    if (c) s += '.' + c.split(/\s+/).slice(0, 2).join('.');
    return s;
  }
  function R(el) { return el.getBoundingClientRect(); }
  function vis(el) {
    var r = el.getBoundingClientRect();
    if (r.width < 0.5 || r.height < 0.5) return false;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (parseFloat(cs.opacity) < 0.06) return false;
    return true;
  }
  var INT_SEL = 'button,a,input,select,textarea,[onclick],[role=button],.btn,.menu-hit,.card,.relic,.map-node,.pile';
  function inter(el) { try { return el.matches(INT_SEL); } catch (e) { return false; } }
  function label(el) {
    var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return t.slice(0, 18);
  }
  function inScope(el) {
    var p = el;
    while (p && p.nodeType === 1) { if (p.id === 'app' || p.id === 'overlay') return true; p = p.parentElement; }
    return false;
  }

  /* ---------------- 驱动到各界面 ---------------- */
  function fakeHand(n) {
    var a = [];
    for (var i = 0; i < n; i++) {
      var c = CARDS[i % CARDS.length];
      a.push({ id: c.id, name: c.name, type: c.type, rarity: c.rarity, cost: c.cost,
               up: i % 4 === 3, t: c.t, ts: c.ts, eff: c.eff });
    }
    return a;
  }
  function battle(keys, n) {
    confirmNewGame();
    pickHero('tianshi');
    skipOpening();
    startBattle(keys);
    if (typeof closeOverlay === 'function') closeOverlay();
    document.body.classList.remove('at-menu');
    G.hand = fakeHand(n || 8);
    if (q.get('fill') !== '0' && window.log) {
      ['—— 遭遇 狐妖 ——', '—— 第 1 回合开始 ——', '咒印道体：对敌人施加 1 层诅咒',
       '摸 5 张：雷符、火符、剑符、破布符、聚灵', '你对 纸扎人 造成 6 点伤害',
       '纸扎人 失去 6 点生命', '—— 第 2 回合开始 ——'].forEach(function (s) { try { window.log(s); } catch (e) {} });
    }
    render();
  }
  /* 地图相机钉到终态（rAF 在无头下拿不到帧 —— 夹具坑，不是游戏 bug）。 */
  function pinMap() {
    try {
      /* ⚠️ 不调 mapCamInit —— 它 entry=true 时会起一条 2000ms 的缓入，无头下量到的是
         「半路」的相机位置（实测 camYnow=684 但 sheet 渲染在 556，差 128px）。
         直接写终态并掐掉 transition（.cam-nofx + 下面注入的 #map-sheet{transition:none}）。 */
      var sheet = document.getElementById('map-sheet');
      if (sheet) sheet.classList.add('cam-nofx');
      var C = mapCamRange();
      var tgt = camYForRow(G.mapRow, C.rowH, C.maxY, C.vpH, C.padTop);
      setMapCam(tgt, false, 0);
      if (typeof drawMapLinks === 'function') drawMapLinks();
    } catch (e) { errs.push('pinMap:' + e.message); }
  }

  function drive(ui) {
    switch (ui) {
      case 'menu': hideOverlay(); showStartScreen(); break;
      case 'heroselect': confirmNewGame(); break;
      case 'opening': confirmNewGame(); pickHero('tianshi'); showOpeningChoice(); break;
      case 'map': confirmNewGame(); pickHero('tianshi'); skipOpening(); pinMap(); break;
      case 'battle': battle(['huyao', 'shuigui']); break;
      /* pickFightFrom 实测上限 = 3 只（普通战固定 2 或 3；精英=精英+可选 1 小怪≤2）
         ⇒ 3 只才是「游戏真会出现的敌人多的情形」；battle6 是场景外的压力档，只作参照。 */
      case 'battlemany': battle(['huyao', 'shuigui', 'youhun']); break;
      case 'battle6': battle(['huyao', 'shuigui', 'youhun', 'zhizharen', 'shanxiao', 'jiangshi']); break;
      case 'piledraw': battle(['huyao', 'shuigui']); showPile('draw'); break;
      case 'pilediscard': battle(['huyao', 'shuigui']); G.discard = fakeHand(5); showPile('discard'); break;
      case 'shop': confirmNewGame(); pickHero('tianshi'); skipOpening(); G.gold = 60; showShop(); break;
      case 'campfire': confirmNewGame(); pickHero('tianshi'); skipOpening(); showCampfire(); break;
      case 'restconfirm': confirmNewGame(); pickHero('tianshi'); skipOpening(); showCampfire(); showRestConfirm(); break;
      case 'event': {
        confirmNewGame(); pickHero('tianshi'); skipOpening();
        startBattle(['huyao', 'shuigui']); closeOverlay(); document.body.classList.remove('at-menu');
        var ev = q.get('ev') || 'well';
        SCENE = 'unknown';
        setBg((typeof EVT_BG !== 'undefined' && EVT_BG[ev]) || 'map.jpg');
        doUnknown(ev);
        break;
      }
      case 'forge': confirmNewGame(); pickHero('tianshi'); skipOpening(); showForgePicker('camp'); break;
      case 'bestiary': hideOverlay(); viewBestiary(); break;
      case 'leaderboard': hideOverlay(); viewLeaderboard(); break;
      case 'deck': confirmNewGame(); pickHero('tianshi'); skipOpening(); viewDeck(); break;
      case 'reward': confirmNewGame(); pickHero('tianshi'); skipOpening(); showReward(); break;
      case 'relicreward': confirmNewGame(); pickHero('tianshi'); skipOpening(); showRelicReward(); break;
      case 'bossreward': confirmNewGame(); pickHero('tianshi'); skipOpening(); showBossReward(); break;
      case 'result': {
        battle(['huyao', 'shuigui']);
        G.battleGold = 12; G.lastGold = 12;
        G.battleResult = { g: 12, hpLost: 5, h: 0 };
        G._settlePlayed = true;   /* 让 settleTransition 立刻开面板（无头里过场计时不可靠） */
        showBattleResult(G.battleResult);
        break;
      }
      case 'victory': {
        confirmNewGame(); pickHero('tianshi'); skipOpening();
        G._settlePlayed = true; showVictory();
        break;
      }
      case 'defeat': {
        battle(['huyao', 'shuigui']);
        G._settlePlayed = true; loseGame();
        break;
      }
      case 'settings': hideOverlay(); showSettings(); break;
      case 'log': battle(['huyao', 'shuigui']); break;
      case 'logopen': {
        battle(['huyao', 'shuigui']);
        document.body.classList.add('log-open');
        break;
      }
      default: throw new Error('未知 ui=' + ui);
    }
  }

  /* ---------------- 体检 ---------------- */
  function audit(ui) {
    var W = window.innerWidth, H = window.innerHeight;
    var out = [];
    var de = document.documentElement;
    out.push('HDR ui=' + ui + ' iw=' + W + ' ih=' + H
      + ' docOvX=' + (de.scrollWidth - W) + ' docOvY=' + (de.scrollHeight - H)
      + ' bodyOvX=' + (document.body.scrollWidth - W)
      + ' ovClass=' + ((document.getElementById('overlay') || {}).className || '-')
      + ' bodyClass=' + (document.body.className || '-'));
    var tb = document.getElementById('tip-bubble');
    if (tb && vis(tb)) {
      out.push('TIP 「' + (tb.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) + '」');
    }
    var lg = document.getElementById('log');
    if (lg) out.push('LOGCLASS ' + lg.className + ' tr=' + getComputedStyle(lg).transform);

    if (q.get('mapdbg')) {
      try {
        var C2 = mapCamRange();
        var sh2 = document.getElementById('map-sheet');
        var vp2 = document.getElementById('map-viewport');
        out.push('MAPDBG mapRow=' + G.mapRow + ' MAPlen=' + MAP.length + ' rowH=' + C2.rowH
          + ' vpH=' + C2.vpH + ' sheetH=' + C2.sheetH + ' maxY=' + C2.maxY + ' padTop=' + C2.padTop
          + ' camYnow=' + mapCamNow()
          + ' vpRect=' + Math.round(R(vp2).top) + '..' + Math.round(R(vp2).bottom)
          + ' sheetRect=' + Math.round(R(sh2).top) + '..' + Math.round(R(sh2).bottom));
        var rn = document.querySelectorAll('.map-row');
        out.push('MAPDBG rows=' + rn.length + ' row0=' + Math.round(R(rn[0]).top) + ' rowN=' + Math.round(R(rn[rn.length - 1]).top));
        var rc = document.querySelector('.map-node.o-reached');
        if (rc) out.push('MAPDBG reached data-r=' + rc.getAttribute('data-r') + ' rect=' + Math.round(R(rc).top) + '..' + Math.round(R(rc).bottom));
      } catch (e) { out.push('MAPDBG ERR ' + e.message); }
    }
    if (q.get('cards')) {
      var hc = document.querySelectorAll('#hand .card');
      for (var ci = 0; ci < hc.length; ci++) {
        var cr = R(hc[ci]);
        var cd = hc[ci].querySelector('.cdesc');
        out.push('CARD[' + ci + '] ' + Math.round(cr.left) + ',' + Math.round(cr.top)
          + ' ' + Math.round(cr.width) + 'x' + Math.round(cr.height)
          + ' cdesc=' + (cd ? (cd.scrollHeight - cd.clientHeight) + 'px溢出/' + cd.clientHeight + '高/'
            + (cd.textContent || '').length + '字' : '无')
          + ' hasTs=' + (typeof CARDS !== 'undefined' && typeof CARDS[0].ts));
      }
    }

    /* 关键容器矩形（直接可对账的原始数字） */
    var KEYS = ['#app', '#overlay', '#overlayWrap', '.panel', '#topbar', 'h1.title', '#field',
      '#log', '#col-main', '.battle', '#player-panel', '#enemy-panel', '#turn-summary',
      '.hand-area', '#hand', '.pile-discard', '.pile-draw', '.rune-display', '.endcol', '#endTurn', '.hint',
      '.menu-root', '.menu-stage', '.menu-col-stele', '.menu-row-talis', '.menu-titlebar',
      '.reward-cards', '#bestiary-grid', '.kwlist', '#rotate-tip', '#pile-draw-n', '#pile-discard-n',
      '.forge-pair', '.forge-arrow', '#scene-veil', '#tip-bubble', '#drag-dmg', '#drag-block',
      '#map-viewport', '.map-bottombar', '.map-roller.top', '.mt-menu', '.map-node.o-reached'];
    KEYS.forEach(function (s) {
      var el = null; try { el = document.querySelector(s); } catch (e) {}
      if (!el) { out.push('BOX ' + s + ' = 不存在'); return; }
      var r = R(el);
      out.push('BOX ' + s + ' = ' + Math.round(r.left) + ',' + Math.round(r.top)
        + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)
        + (vis(el) ? '' : ' [不可见]')
        + (r.left < -2 || r.top < -2 || r.right > W + 2 || r.bottom > H + 2
           ? ' 超右=' + Math.max(0, Math.round(r.right - W)) + '超下=' + Math.max(0, Math.round(r.bottom - H)) : ''));
    });

    /* 作用域：overlay 开着 ⇒ 只体检 overlay 子树（底下的 #app 被整层盖住，报它是噪声）；
       overlay 关着 ⇒ 体检 #app 子树（战斗/战报就是这一态）。 */
    var ovEl = document.getElementById('overlay');
    var ovOpen = !!(ovEl && !ovEl.classList.contains('hidden'));
    var root = ovOpen ? ovEl : document.getElementById('app');
    out.push('SCOPE=' + (ovOpen ? '#overlay' : '#app'));

    /* 收集作用域内可见元素 */
    var all = [];
    var nodes = root ? root.querySelectorAll('*') : [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (!vis(el)) continue;
      all.push(el);
      if (all.length > 2500) break;
    }

    /* A1 溢出：只报「最外层」——父级没溢出的那一枚（溢出从它开始） */
    var seenP = function (el) {
      var p = el.parentElement;
      while (p && p.nodeType === 1 && inScope(p)) {
        var r = p.getBoundingClientRect();
        if (r.width > 0.5 && r.height > 0.5
          && (r.left < -2 || r.top < -2 || r.right > W + 2 || r.bottom > H + 2)) return true;
        p = p.parentElement;
      }
      return false;
    };
    var ovf = [];
    for (var a = 0; a < all.length; a++) {
      var r2 = R(all[a]);
      if (r2.left >= -2 && r2.top >= -2 && r2.right <= W + 2 && r2.bottom <= H + 2) continue;
      if (r2.left < -1500 || r2.top < -1500) continue;      /* 停在屏幕外的探针 */
      if (seenP(all[a])) continue;                          /* 溢出由祖先引起，交给祖先报 */
      var ox = Math.max(0, -r2.left) + Math.max(0, r2.right - W);
      var oy = Math.max(0, -r2.top) + Math.max(0, r2.bottom - H);
      ovf.push({ s: nm(all[a]), l: Math.round(r2.left), t: Math.round(r2.top),
                 w: Math.round(r2.width), h: Math.round(r2.height),
                 ox: Math.round(ox), oy: Math.round(oy),
                 tr: getComputedStyle(all[a]).transform });
    }
    ovf.sort(function (x, y) { return (y.ox + y.oy) - (x.ox + x.oy); });
    ovf.slice(0, 22).forEach(function (o) {
      out.push('OVF ' + o.s + ' rect=' + o.l + ',' + o.t + ' ' + o.w + 'x' + o.h
        + ' 超右=' + Math.max(0, o.l + o.w - W) + '超下=' + Math.max(0, o.t + o.h - H)
        + '超左=' + Math.max(0, -o.l) + '超上=' + Math.max(0, -o.t)
        + (o.tr && o.tr !== 'none' ? ' tr=' + o.tr : ''));
    });
    out.push('OVFn=' + ovf.length);

    /* A2 内部溢出 */
    var ints = [];
    for (var b = 0; b < all.length; b++) {
      var e2 = all[b];
      var sx = e2.scrollWidth - e2.clientWidth, sy = e2.scrollHeight - e2.clientHeight;
      if (e2.clientWidth === 0 && e2.clientHeight === 0) continue;
      if (sx > 1 || sy > 1) {
        var cs2 = getComputedStyle(e2);
        ints.push({ s: nm(e2), x: sx, y: sy, ox: cs2.overflowX, oy: cs2.overflowY });
      }
    }
    ints.sort(function (x, y) { return (y.x + y.y) - (x.x + x.y); });
    ints.slice(0, 22).forEach(function (o) {
      out.push('INT ' + o.s + ' scrollW>client=' + o.x + ' scrollH>client=' + o.y
        + ' overflow=' + o.ox + '/' + o.oy);
    });
    out.push('INTn=' + ints.length);

    /* 可交互元素 */
    var intEls = [];
    for (var c = 0; c < all.length; c++) if (inter(all[c])) intEls.push(all[c]);

    /* A3 重叠（排除 #hand 内手牌扇形——设计上就交叠） */
    function inHand(el) { var p = el; while (p) { if (p.id === 'hand') return true; p = p.parentElement; } return false; }
    var ovl = [];
    for (var d = 0; d < intEls.length; d++) {
      for (var e = d + 1; e < intEls.length; e++) {
        if (inHand(intEls[d]) && inHand(intEls[e])) continue;
        var ra = R(intEls[d]), rb = R(intEls[e]);
        var ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        var iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (ix > 0 && iy > 0 && ix * iy > 6) {
          /* 父子关系不算重叠 */
          if (intEls[d].contains(intEls[e]) || intEls[e].contains(intEls[d])) continue;
          ovl.push({ a: nm(intEls[d]), b: nm(intEls[e]), area: Math.round(ix * iy),
                     ix: Math.round(ix), iy: Math.round(iy) });
        }
      }
    }
    ovl.sort(function (x, y) { return y.area - x.area; });
    ovl.slice(0, 16).forEach(function (o) {
      out.push('OVL ' + o.a + ' × ' + o.b + ' 相交 ' + o.ix + 'x' + o.iy + '=' + o.area + 'px²');
    });
    out.push('OVLn=' + ovl.length);

    /* A4/A5 遮挡 / 裁出视口 / 零尺寸 */
    var occ = [], zro = [];
    for (var f = 0; f < intEls.length; f++) {
      var el2 = intEls[f], r3 = R(el2);
      if (r3.width < 1 || r3.height < 1) { zro.push(nm(el2) + ' ' + Math.round(r3.width) + 'x' + Math.round(r3.height)); continue; }
      var cx = r3.left + r3.width / 2, cy = r3.top + r3.height / 2;
      if (cx < 0 || cy < 0 || cx > W || cy > H) {
        occ.push(nm(el2) + ' 中心(' + Math.round(cx) + ',' + Math.round(cy) + ')在视口外');
        continue;
      }
      var hit = document.elementFromPoint(Math.round(cx), Math.round(cy));
      if (hit && !(hit === el2 || el2.contains(hit) || hit.contains(el2))) {
        occ.push(nm(el2) + ' 中心(' + Math.round(cx) + ',' + Math.round(cy) + ')被 ' + nm(hit) + ' 盖住');
      }
    }
    occ.slice(0, 22).forEach(function (s) { out.push('OCC ' + s); });
    out.push('OCCn=' + occ.length);
    zro.slice(0, 12).forEach(function (s) { out.push('ZRO ' + s); });
    out.push('ZROn=' + zro.length);

    /* A6 触摸目标 < 44 */
    var tch = [];
    for (var g = 0; g < intEls.length; g++) {
      var r4 = R(intEls[g]);
      var mn = Math.min(r4.width, r4.height);
      if (mn < 44) tch.push({ s: nm(intEls[g]), w: Math.round(r4.width), h: Math.round(r4.height),
                              mn: Math.round(mn), lb: label(intEls[g]) });
    }
    tch.sort(function (x, y) { return x.mn - y.mn; });
    out.push('TCHn=' + tch.length);
    tch.slice(0, 20).forEach(function (o) {
      out.push('TCH ' + o.s + ' ' + o.w + 'x' + o.h + ' min=' + o.mn + ' 「' + o.lb + '」');
    });

    /* A7 同行边缘对齐 */
    var byParent = {};
    for (var h = 0; h < intEls.length; h++) {
      if (inHand(intEls[h])) continue;
      var p2 = intEls[h].parentElement; if (!p2) continue;
      var key = nm(p2);
      (byParent[key] = byParent[key] || []).push(intEls[h]);
    }
    var ali = [];
    Object.keys(byParent).forEach(function (k) {
      var arr = byParent[k];
      if (arr.length < 2 || arr.length > 14) return;
      /* 按 top 分组（同排容差 6px） */
      var rows = [];
      arr.slice().sort(function (x, y) { return R(x).top - R(y).top; }).forEach(function (el3) {
        var r5 = R(el3);
        var row = null;
        for (var ri = 0; ri < rows.length; ri++) {
          if (Math.abs(rows[ri].top - r5.top) <= 6) { row = rows[ri]; break; }
        }
        if (!row) { row = { top: r5.top, items: [] }; rows.push(row); }
        row.items.push({ el: el3, r: r5 });
      });
      rows.forEach(function (row) {
        if (row.items.length < 2) return;
        var tops = row.items.map(function (x) { return x.r.top; });
        var bots = row.items.map(function (x) { return x.r.bottom; });
        var hs = row.items.map(function (x) { return Math.round(x.r.height); });
        var spreadTop = Math.max.apply(null, tops) - Math.min.apply(null, tops);
        var spreadBot = Math.max.apply(null, bots) - Math.min.apply(null, bots);
        if (spreadTop > 4 || spreadBot > 4) {
          ali.push({ p: k, n: row.items.length, names: row.items.map(function (x) { return nm(x.el); }),
                     st: Math.round(spreadTop), sb: Math.round(spreadBot),
                     h: hs.join('/') });
        }
      });
    });
    ali.sort(function (x, y) { return Math.max(y.st, y.sb) - Math.max(x.st, x.sb); });
    ali.slice(0, 12).forEach(function (o) {
      out.push('ALI 父=' + o.p + ' n=' + o.n + ' top差=' + o.st + ' bottom差=' + o.sb
        + ' 高=' + o.h + ' 项=' + o.names.join(','));
    });
    out.push('ALIn=' + ali.length);

    return out;
  }

  function go() {
    var ui = q.get('ui') || 'menu';
    var lines;
    try {
      drive(ui);
    } catch (e) {
      badge('DRIVE THROW ui=' + ui + ' :: ' + (e && e.message) + '\n' + ((e && e.stack) || ''));
      return;
    }
    setTimeout(function () {
      try {
        lines = audit(ui);
      } catch (e) {
        lines = ['AUDIT THROW :: ' + (e && e.message), ((e && e.stack) || '').split('\n').slice(0, 4).join(' | ')];
      }
      if (errs.length) lines.push('ERR ' + errs.slice(0, 4).join(' | '));
      badge(lines.join('\n'));
      document.title = 'SWEEP ' + ui;
    }, 700);
  }

  /* 战场夹具：先掐掉过渡，#overlay.hidden 直接不在命中树里（同 _drvland.js 的做法） */
  (function () {
    var st = document.createElement('style');
    st.textContent = '#overlay{transition:none !important;}'
      + '#log{transition:none !important;}'
      /* ⚠️ 夹具层：入场动画（overlayIn / scrollDrop / resultRise…）在无头 --virtual-time-budget 下
         会停在 0% 帧（实测 settings/bestiary 的 #overlayWrap 恒停在 translateY(-120vh)）。
         这是**夹具缺陷不是游戏 bug**：真机 0.95s 后落到静止位。这里直接让 wrap 停在终态再量。 */
      + '#overlayWrap{animation:none !important;}'
      + '#overlay .menu-tier{animation:none !important;}'
      + '#map-sheet{transition:none !important;}';
    (document.head || document.documentElement).appendChild(st);
  })();

  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(go, 0);
  else window.addEventListener('DOMContentLoaded', function () { setTimeout(go, 0); });
})();