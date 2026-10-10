/* 一次性调试驱动（只用于 _p3fx.html，不进仓库产物）：给 P3 三处视觉留实拍证据。
   冒烟用的是 DOM 桩，证明得了逻辑、证明不了 CSS —— 翻牌那一版就是「冒烟全绿、肉眼一看就是没翻」。
   三种模式（?mode=）：
     flip    战后三选一：卡背自下升起急停，三张**卡背朝上**（?reveal=1 时自动翻开中间那张对照）
     daoxin  道心破碎：先 grantRelic(daoxin)，再把动画**钉在破碎中段**反复重播（动画只活 1.15s，不钉拍不到）
     xue     血魔刀火环：阴差 + 血魔刀 + 血压到 30% 以下，手牌换成攻击牌，看边框那圈橙红火线
*/
(function () {
  var q = new URLSearchParams(location.search);
  var mode = q.get('mode') || 'flip';
  var errs = [];
  window.onerror = function (m, u, l) { errs.push(m + ' @' + l); };

  function badge(t) {
    var d = document.getElementById('__dbg');
    if (!d) {
      d = document.createElement('div');
      d.id = '__dbg';
      d.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#000c;color:#0f0;'
        + 'font:11px/1.4 monospace;padding:4px 6px;max-width:48%;white-space:pre-wrap';
      document.body.appendChild(d);
    }
    d.textContent = t;
  }

  function relic(id) { return RELICS.filter(function (r) { return r.id === id; })[0]; }

  function boot(hero) {
    SETTINGS.lowSpec = false;                 // 夹具里要真看得到动画
    confirmNewGame();
    pickHero(hero || 'tianshi');
    skipOpening();
    if (typeof hideOverlay === 'function') hideOverlay();
  }

  function go() {
    var st = [];
    try {
      if (mode === 'daoxin') {
        boot('tianshi');
        var r = relic('daoxin');
        if (r) grantRelic(r);
        var pin = function () {
          try {
            daoxinBurst();
            var el = document.getElementById('daoxin-burst');
            if (!el) { st.push('daoxin: #daoxin-burst 没建出来（fx()=' + fx() + '）'); return; }
            el.querySelectorAll('.dx-wrap,.dx-piece').forEach(function (n) {
              n.style.animationPlayState = 'paused';
              n.style.animationDelay = '-0.42s';    // 钉在「刚好炸开」那一段
            });
            st.push('daoxin: 已建，碎片 ' + el.querySelectorAll('.dx-piece').length
              + ' 片 / 已钉帧  素材=' + (el.querySelector('img') ? el.querySelector('img').currentSrc.slice(-28) : 'none'));
          } catch (e) { st.push('daoxin THROW ' + e.message); }
        };
        pin(); setInterval(pin, 600);
      } else if (mode === 'xue') {
        boot('yincha');
        var xr = relic('xuemodao');
        if (xr) grantRelic(xr);
        var keys = Object.keys(ENEMIES);
        startBattle([keys.indexOf('guiying') >= 0 ? 'guiying' : keys[0]]);
        startTurn();
        G.hp = Math.max(1, Math.floor(G.maxHp * 0.2));       // 压到 30% 以下 ⇒ 火环该亮
        var atk = CARDS.filter(function (c) { return c.type === 'attack'; }).slice(0, 4);
        G.hand = atk.concat(G.hand.filter(function (c) { return c.type !== 'attack'; })).slice(0, 6);
        render();
        var n = document.querySelectorAll('#hand .card.xue-fire').length;
        st.push('xue: hero=' + G.hero + ' hp=' + G.hp + '/' + G.maxHp + ' fx()=' + fx()
          + ' / 手牌 ' + G.hand.length + ' 张，其中攻击牌 ' + atk.length + ' 张'
          + ' / 带 .xue-fire 的卡 = ' + n);
      } else {
        boot('tianshi');
        showReward();
        var rc = document.querySelectorAll('#overlay .rcard');
        st.push('flip: .rcard = ' + rc.length + ' 张，卡背节点 = '
          + document.querySelectorAll('#overlay .rcard-back').length
          + '，已翻开 = ' + document.querySelectorAll('#overlay .rcard.revealed').length
          + '，升起类 = ' + (document.querySelector('#overlay .reward-cards') || {}).className);
        if (q.get('reveal')) {
          setTimeout(function () {
            var m = document.querySelectorAll('#overlay .rcard')[1];
            if (m) m.classList.add('revealed');
          }, 900);
        }
      }
    } catch (e) { st.push('THROW ' + e.message); }
    if (errs.length) st.push('ERR ' + errs.slice(0, 3).join(' | '));
    badge(st.join(String.fromCharCode(10)));
    document.title = 'DBG ' + mode;
  }

  setTimeout(go, 400);
})();