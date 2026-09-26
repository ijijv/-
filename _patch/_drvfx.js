/* 一次性调试驱动（只用于 _shotfx.html，不进仓库产物）：把 30 个特效精灵图铺成对照图，
   并把「真实锚点在真实战斗 DOM 里量出来多大、playFx 会算成多大的盒子」写成角标。

   为什么必须有这个夹具：冒烟用的是 DOM 桩（getBoundingClientRect 恒 10×10、offsetHeight 恒 0），
   它证明得了「playFx 没抛异常」，证明不了「特效贴到敌人身上是不是比敌人还大」。
   v0.62.0 用户报的「地图贴图在底层」就是冒烟全绿、肉眼一看就废。

   两种模式（?mode=）：
     sheet （默认）30 格对照图：每格用 fxSeek 把该特效钉在中间帧，格子边长**由 fxBoxSize 真算**
                    （喂一个 260×260 的合成锚点 ⇒ 260×1.15 = 299），所以图里看到的就是
                    真实公式给出的相对比例。
     battle        真开一场战斗，按真实锚点把三个代表特效钉在场上 —— 看它们在**真实版面**里
                    是否喧宾夺主（这是用户那句「你要注意特效尺寸放在游戏中」的直接证据）。

   角标里 X 行 = 每个特效自己的 alpha 内容占比（由 shot_fx.py 用 PIL 离线量，见 --measure），
   那是定 scale 的依据；浏览器这边不重复量（canvas 读 file:// 图会 taint）。
*/
(function () {
  var q = new URLSearchParams(location.search);
  var mode = q.get('mode') || 'sheet';
  var errs = [];
  window.onerror = function (m, u, l) { errs.push(m + ' @' + l); };

  function badge(t) {
    if (q.get('clean')) { document.title = 'DBG(clean)'; return; }
    var d = document.getElementById('__dbg');
    if (!d) {
      d = document.createElement('div');
      d.id = '__dbg';
      d.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#000c;color:#0f0;'
        + 'font:11px/1.4 monospace;padding:4px 6px;max-width:100%;white-space:pre-wrap';
      document.body.appendChild(d);
    }
    d.textContent = t;
  }

  function rectOf(sel) {
    var e = document.querySelector(sel);
    if (!e || !e.getBoundingClientRect) return null;
    var r = e.getBoundingClientRect();
    return (r && r.width > 0) ? r : null;
  }

  /* 四个锚点类别的**真实**短边 → playFx 会算出的盒子边长。这就是「特效在游戏里多大」的答案。 */
  function anchors() {
    var out = [];
    var p = rectOf('#player-panel');
    var f = rectOf('#enemy-panel');
    var e = rectOf('#enemy-panel .enemy');
    out.push(['player', '#player-panel', p]);
    out.push(['enemy', '#enemy-panel .enemy', e]);
    out.push(['field', '#enemy-panel', f]);
    // 'summon' 没有自己的元素：v0.64.0 起 fxAnchorRect 让它回落到玩家面板（召唤物站在玩家这一侧），
    // 所以这里也按 #player-panel 量 —— 早先落「屏幕中心、短边 0」会被 96px 下限兜住，四个召唤特效偏小。
    out.push(['summon', '#player-panel（召回）', p]);
    return out;
  }

  function go() {
    var st = [];
    try {
      SETTINGS.lowSpec = false;                    // 夹具里要真看得到特效
      confirmNewGame();
      pickHero(q.get('hero') || 'tianshi');
      skipOpening();
      if (typeof hideOverlay === 'function') hideOverlay();
      var keys = Object.keys(ENEMIES);
      var pick = ['guiying', 'shixiong', 'shiwang'].filter(function (k) { return keys.indexOf(k) >= 0; });
      startBattle(pick.length ? pick : [keys[0]]);
      if (typeof render === 'function') render();
      startTurn();
      st.push('A battle enemies=' + G.enemies.map(function (x) { return x.uid + ':' + x.name; }).join(' ')
        + ' playerPanel=' + (rectOf('#player-panel') ? 'yes' : 'NO'));
      st.push('W vw=' + window.innerWidth + ' vh=' + window.innerHeight
        + ' cap=' + Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.9)
        + ' fx()=' + fx());
      anchors().forEach(function (a) {
        var r = a[2], r2 = r || { width: 0, height: 0 };
        st.push('B ' + a[0] + ' <- ' + a[1] + ' w=' + Math.round(r2.width) + ' h=' + Math.round(r2.height)
          + ' short=' + Math.round(Math.min(r2.width, r2.height))
          + ' => box=' + fxBoxSize(Math.min(r2.width, r2.height), window.innerWidth, window.innerHeight)
          + (r ? '' : '  (缺元素，落兜底)'));
      });
      st.push('C FX_SHEETS n=' + Object.keys(FX_SHEETS).length
        + ' CARD_FX n=' + Object.keys(CARD_FX).length
        + ' #fx-layer=' + (fxLayer() ? 'yes' : 'NO'));
    } catch (e) {
      st.push('THROW ' + e.message);
    }

    if (mode === 'battle') {
      /* 按真实锚点钉三个代表：单体（敌）/ 全体（场）/ 玩家。still=1 ⇒ 不注册 rAF，
         headless 的 --virtual-time-budget 里后注册的 rAF 拿不到帧，钉帧才出得来稳定图。 */
      try {
        fxStopAll();
        var one = G.enemies[0];
        // 钉帧位置 = 该特效**覆盖率最高**的那一帧（PIL 量，见 shot_fx.py 的 peak_frame）；
        // 钉在 70% 处会拍到消散段（lei 那会儿只剩 0.08% 像素），看上去像特效没做
        var a1 = fxSeek('lei', 3, enemyEl(one) || 'field');
        var a2 = fxSeek('wanjian', 9, 'field');
        var a3 = fxSeek('hurt', 0, 'player');
        st.push('D pinned lei@enemy=' + (a1 ? a1.style.width : 'null')
          + ' wanjian@field=' + (a2 ? a2.style.width : 'null')
          + ' hurt@player=' + (a3 ? a3.style.width : 'null'));
        // 锚点框描边：让图自己说出「特效 vs 单位」的比值
        anchors().forEach(function (a) {
          if (!a[2]) return;
          var m = document.createElement('div');
          m.style.cssText = 'position:fixed;pointer-events:none;z-index:6;border:1px dashed #0ff;'
            + 'left:' + Math.round(a[2].left) + 'px;top:' + Math.round(a[2].top) + 'px;'
            + 'width:' + Math.round(a[2].width) + 'px;height:' + Math.round(a[2].height) + 'px';
          document.body.appendChild(m);
        });
      } catch (e) { st.push('D THROW ' + e.message); }
      badge(st.join(String.fromCharCode(10)));
      document.title = 'DBG ' + st.length + ' lines';
      return;
    }

    /* ---- 对照图：按**锚点类别**分区，每格用该锚点的**真实尺寸**（长边走 fxBoxSize 真公式），
           并在格子里画出锚点本身的虚线脚印 —— 于是「特效 vs 单位」的比值一眼可见。
           锚点尺寸由 shot_fx.py 从真实战斗里量出来再传进来（?anchor=名:宽x高）。 ---- */
    try {
      var AS = {};
      (q.get('anchor') || 'enemy:184x309,player:200x290,field:386x311,summon:200x290').split(',')
        .forEach(function (s) {
          var m = /^([a-z]+):(\d+)x(\d+)$/.exec(s);
          if (m) AS[m[1]] = [+m[2], +m[3]];
        });
      // 钉帧位置由 shot_fx.py 用 PIL 量出来（哪一帧覆盖率最高）再传进来。
      // 早先写死「70% 处」，结果过半特效在那个位置已经在**消散**，钉出来是一格近乎空白 ——
      // 那是夹具选错了帧，不是素材坏了（实测 lei 第 13 帧只有 0.08% 不透明像素）。
      var PIN = {};
      (q.get('pin') || '').split(',').forEach(function (s) {
        var m = /^([a-z][a-z0-9_]*):(\d+)$/.exec(s);
        if (m) PIN[m[1]] = +m[2];
      });
      var WHERE = {};
      // 卡牌侧直接从 CARD_FX 推（唯一真相源），引擎侧（非卡触发）在这里列一遍，
      // 与 js/30_engine.js 的 playFx 调用点一一对应；漏一个的后果只是它不出现在对照图里。
      Object.keys(CARD_FX).forEach(function (cid) { WHERE[CARD_FX[cid].n] = CARD_FX[cid].a; });
      ['curse', 'charge', 'jiangshi'].forEach(function (k) { WHERE[k] = 'enemy'; });
      Object.keys(FX_SHEETS).forEach(function (k) {
        if (!(k in WHERE)) WHERE[k] = 'player';    // 其余全是玩家侧（受击/回血/格挡/尸气/血怒/虚弱/灼烧/勾魂/业火/忘忧/吸血/佛渡）
      });
      var cont = document.createElement('div');
      cont.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:99998;'
        + 'background:#2f2d2b;overflow:auto;padding:10px;'
        + 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;align-content:start;align-items:start';
      document.body.appendChild(cont);
      var probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(probe);
      // 兜底夹取必须用**游戏里那个视口**的尺寸，不能用截图窗口的 ——
      // 截图窗口为了竖排格子开成 940×2580，min(vw,vh)=940 ⇒ 夹取上限 846，
      // 而真机 878×834 的上限是 751。不传 vw/vh 的话，全场 AoE（百鬼夜行）会按 766 画出来，
      // 比游戏里大 2% —— 对照图就是用来量这个的，差 2% 也得对齐。
      var VW = +(q.get('vw') || 0) || window.innerWidth;
      var VH = +(q.get('vh') || 0) || window.innerHeight;
      var cap0 = Math.round(Math.min(VW, VH) * 0.9);
      var szCache = {};
      ['enemy', 'field', 'player', 'summon'].forEach(function (cls) {
        if (!AS[cls]) return;
        probe.style.width = AS[cls][0] + 'px'; probe.style.height = AS[cls][1] + 'px';
        var box = fxBoxSize(Math.min(AS[cls][0], AS[cls][1]), VW, VH);
        var keys = Object.keys(FX_SHEETS).filter(function (k) { return WHERE[k] === cls; });
        // 每个特效的**真实**盒子边长（含它自己的 scale 与全局兜底夹取）——caption 里报的就是它
        var boxes = {};
        keys.forEach(function (k) {
          var b = Math.round(box * (FX_SHEETS[k].scale || 1));
          if (cap0 > 0 && b > cap0) b = cap0;
          boxes[k] = b;
        });
        // 显示缩放：只为了让一屏塞得下。**比例完全保真**（格子、锚点虚线脚印、特效三者同倍缩放），
        // 真实像素值写在 caption 里，所以这张图能用来判断比值，不能用来量绝对尺寸。
        var kk = Math.min(1, 280 / Math.max.apply(null, keys.map(function (k) { return boxes[k]; })));
        szCache[cls] = { box: box, maxBox: Math.max.apply(null, keys.map(function (k) { return boxes[k]; })), k: +kk.toFixed(3) };
        var head = document.createElement('div');
        head.style.cssText = 'grid-column:1/-1;color:#ffd;font:12px monospace;padding:6px 0 2px';
        head.textContent = '【' + cls + '】锚点 ' + AS[cls][0] + '×' + AS[cls][1]
          + '（短边 ' + Math.min(AS[cls][0], AS[cls][1]) + '）⇒ 基准盒子 ' + box + 'px，'
          + keys.length + ' 个；本区按 ×' + kk.toFixed(2) + ' 显示（比例保真，真实像素见每格 caption）'
          + '　视口 ' + VW + '×' + VH + '、夹取上限 ' + cap0;
        cont.appendChild(head);
        keys.forEach(function (k) {
          var S = FX_SHEETS[k], b = boxes[k];
          var tile = document.createElement('div');
          tile.style.cssText = 'background:#25231f;border:1px solid #555;padding:5px;text-align:center';
          var wrap = document.createElement('div');
          wrap.style.cssText = 'width:' + Math.round(b * kk) + 'px;height:' + Math.round(b * kk)
            + 'px;margin:0 auto;position:relative;overflow:hidden';
          var stage = document.createElement('div');
          stage.style.cssText = 'position:absolute;left:0;top:0;width:' + b + 'px;height:' + b + 'px;'
            + 'transform:scale(' + kk + ');transform-origin:top left;'
            + 'background:repeating-conic-gradient(#454340 0 25%,#3d3b38 0 50%) 0 0/' + (b / 8) + 'px ' + (b / 8) + 'px';
          var foot = document.createElement('div');       // 锚点脚印（虚线）——比值的参照物
          foot.style.cssText = 'position:absolute;pointer-events:none;border:1px dashed #0ff;'
            + 'left:' + Math.round((b - AS[cls][0]) / 2) + 'px;top:' + Math.round((b - AS[cls][1]) / 2) + 'px;'
            + 'width:' + AS[cls][0] + 'px;height:' + AS[cls][1] + 'px';
          var cap = document.createElement('div');
          cap.style.cssText = 'color:#e8e0d0;font:10px/1.4 monospace;margin-top:3px;white-space:pre-line';
          var pin = (k in PIN) ? PIN[k] : Math.floor(S.f * 0.7);
          cap.textContent = k + '  f=' + S.f + (S.i0 ? '+i0' + S.i0 : '') + ' scale=' + S.scale
            + '\nbox=' + b + 'px  钉帧 ' + pin;
          stage.appendChild(foot); wrap.appendChild(stage); tile.appendChild(wrap); tile.appendChild(cap);
          cont.appendChild(tile);
          try {
            var el = fxSeek(k, pin, probe);
            if (el) {
              stage.appendChild(el);
              el.style.position = 'relative'; el.style.left = '0px'; el.style.top = '0px';
            } else { cap.textContent += ' [null]'; }
          } catch (e) { cap.textContent += ' THROW ' + e.message; }
        });
      });
      st.push('E 锚点尺寸 ' + JSON.stringify(AS) + ' ⇒ ' + JSON.stringify(szCache));
      st.push('F 分区铺完（每格钉在**像素最多的那一帧**，帧号由 shot_fx.py 离线量；显示缩放只影响观感，不影响比例）');
    } catch (e) { st.push('F THROW ' + e.message); }

    if (errs.length) st.push('ERR ' + errs.slice(0, 3).join(' | '));
    badge(st.join(String.fromCharCode(10)));
    document.title = 'DBG ' + st.length + ' lines';
  }

  setTimeout(go, 400);
})();