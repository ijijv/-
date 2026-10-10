/* 一次性驱动（只用于 _shot.html，不进仓库产物）：
   验「召唤召唤物 → 从打出的鬼怪牌冒翻滚黑雾、带拖尾加速飞到右下角召唤位」这条演出。
   不真看 540ms 的飞行中间帧（WAAPI + virtual-time-budget 不可靠），而是**在 doPlayCard 之后
   同步量**：LAST_PLAY_RECT（起点＝刚打出的那张牌）与 .fx-summon-mist 团数/关键帧/终点锚。
   用法：python _patch/shot.py --direct --widths 1280 --h 720 --drv _patch/_drvmist.js --dump */
(function () {
  var out = [], errs = [];
  window.onerror = function (m, u, l) { errs.push(m + ' @' + l); };

  function go() {
    try {
      confirmNewGame();
      pickHero('ganshiren');
      skipOpening();
      if (typeof hideOverlay === 'function') hideOverlay();
      startBattle(['huyao']);
      if (typeof closeOverlay === 'function') closeOverlay();
      document.body.classList.remove('at-menu');
      G.energy = 99;
      var c = CARDS.filter(function (x) { return x.id === 'zhiren'; })[0];
      out.push('纸人卡=' + (c ? c.name + '（t=' + c.t + '）' : '没找到'));
      if (!c) { errs.push('CARDS 里没有 zhiren'); throw new Error('no zhiren'); }
      G.hand = [{ id: c.id, name: c.name, type: c.type, rarity: c.rarity, cost: c.cost, t: c.t, ts: c.ts, eff: c.eff }];
      render();
      var before = document.querySelector('#hand .card');
      var rb = before ? before.getBoundingClientRect() : null;
      out.push('打牌前手牌卡矩形=' + (rb ? (Math.round(rb.left) + ',' + Math.round(rb.top)
        + ' ' + Math.round(rb.width) + 'x' + Math.round(rb.height)) : '无'));
      out.push('fx()=' + fx() + ' animLive()=' + animLive()
        + ' SETTINGS.fx=' + (typeof SETTINGS !== 'undefined' ? SETTINGS.fx : '?'));
      playCard(0);
      var lp = LAST_PLAY_RECT;
      out.push('LAST_PLAY_RECT=' + JSON.stringify(lp));
      var hb = document.querySelector('#player-panel .hero-art-box');
      var hr = hb ? hb.getBoundingClientRect() : null;
      out.push('召唤位锚 .hero-art-box 右下=' + (hr ? (Math.round(hr.right) + ',' + Math.round(hr.bottom)) : '无'));
      var ms = document.querySelectorAll('.fx-summon-mist');
      out.push('黑雾团数=' + ms.length);
      if (ms.length) {
        var m0 = ms[0];
        out.push('头团 w=' + m0.style.width + ' 行内 opacity=' + m0.style.opacity);
        var anims = m0.getAnimations ? m0.getAnimations() : [];
        out.push('头团 getAnimations=' + anims.length);
        if (anims.length) {
          var kf = anims[0].effect.getKeyframes();
          out.push('关键帧 ' + kf.length + ' 段 首=' + kf[0].transform + ' | 末=' + kf[kf.length - 1].transform);
        }
        out.push('尾团 w=' + ms[ms.length - 1].style.width);
      }
      out.push('summons=' + JSON.stringify(G.summons));
      if (!lp) errs.push('LAST_PLAY_RECT 没量到（起点会掉到屏幕中下）');
      if (ms.length !== 6) errs.push('黑雾团数应为 6，实际 ' + ms.length);
      if (lp && rb) {
        var dx = Math.abs(lp.cx - (rb.left + rb.width / 2)), dy = Math.abs(lp.cy - (rb.top + rb.height / 2));
        out.push('起点 vs 手牌卡中心 偏差 dx=' + Math.round(dx) + ' dy=' + Math.round(dy));
        if (dx > 6 || dy > 6) errs.push('黑雾起点没落在打出的那张牌上');
      }
    } catch (e) {
      out.push('THROW ' + (e && e.message) + ' | ' + ((e && e.stack) || '').split('\n')[1]);
    }
    out.push('errs=' + (errs.length ? errs.join(' | ') : 'none'));
    var d = document.getElementById('__dbg');
    if (!d) {
      d = document.createElement('div'); d.id = '__dbg';
      d.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#000c;color:#0f0;'
        + 'font:11px/1.4 monospace;padding:4px 6px;white-space:pre-wrap';
      document.body.appendChild(d);
    }
    d.textContent = out.join('\n');
    document.title = 'MIST';
  }
  setTimeout(go, 400);
})();