/* 手牌描述「装不装得下」的实拍扫参（只用于 _shot.html，不进产物）。
   为什么单写一个：_drvcard.js 的 G 段在**固定 132px** 的宿主里扫，
   而 1280x590（T-mid）下手牌卡实际只有 112x170 ⇒ 它扫的那一列全都偏大，
   报「0 溢出」与录屏矛盾。这里直接把牌放进真实 #hand，量真实尺寸。

   用法：python _patch/shot.py --direct --widths 1280 --h 590 --drv _patch/_drvdesc.js --dump
*/
(function () {
  var out = [], errs = [];
  window.onerror = function (m, u, l) { errs.push(m + ' @' + l); };
  var q = new URLSearchParams(location.search);

  function badge(t) {
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

  function go() {
    try {
      confirmNewGame();
      pickHero(q.get('hero') || 'tianshi');
      skipOpening();
      hideOverlay();
      startBattle([q.get('e') || 'zhizharen']);
      closeOverlay();
      document.body.classList.remove('at-menu');
      if (typeof TUT !== 'undefined') { TUT = null; if (typeof renderTutHint === 'function') renderTutHint(); }
      /* 用真实牌库填手牌（含长描述的牌），这样量的就是玩家实际看到的那些文案 */
      G.hand = G.deck.slice(0, 10).map(function (c) {
        return { id: c.id, name: c.name, type: c.type, rarity: c.rarity, cost: c.cost,
                 up: false, t: c.t, ts: c.ts, eff: c.eff };
      });
      render();
    } catch (e) {
      badge('!! 初始化失败 ' + (e && e.message));
      return;
    }

    var cards = document.querySelectorAll('#hand .card');
    if (!cards.length) { badge('!! #hand 里没有 .card'); return; }
    var c0 = cards[0];
    out.push('A 手牌卡 ' + cards.length + ' 张  实测卡盒 ' + c0.offsetWidth + 'x' + c0.offsetHeight
      + '  视口 ' + window.innerWidth + 'x' + window.innerHeight);

    var cont = c0.querySelector('.cplate'), d0 = c0.querySelector('.cdesc');
    function cs(el) { var s = getComputedStyle(el); return s.fontSize + '/' + s.lineHeight; }
    out.push('B .cplate clientH=' + (cont ? cont.clientHeight : '?')
      + '  .cdesc clientH=' + d0.clientHeight + '  fs/lh=' + cs(d0));

    /* 基线：不覆写任何字号，数出有几种/几张被静默截断 */
    function scan(tag) {
      var over = [], need = [];
      cards.forEach(function (el) {
        var d = el.querySelector('.cdesc');
        if (!d) return;
        var n = d.scrollHeight, h = d.clientHeight;
        var name = el.querySelector('.cname') ? el.querySelector('.cname').textContent : '?';
        var lines = Math.round(n / parseFloat(getComputedStyle(d).lineHeight) * 10) / 10;
        need.push(name + '(' + lines + '行)');
        if (n > h + 1) over.push(name + ' ' + n + '>' + h);
      });
      out.push(tag + ' 溢出 ' + over.length + '/' + cards.length
        + (over.length ? '：' + over.slice(0, 6).join(' · ') : ''));
      return need;
    }
    out.push('C 基线每张需要行数：' + scan('').slice(0, 10).join(' '));

    /* 扫参：改 .cdesc 的 font-size / line-height，看几张还溢出 */
    out.push('D 扫参（覆写 .cdesc，scrollHeight>clientHeight 判溢出）');
    [[9.5, 1.25], [9, 1.15], [8.5, 1.15], [8, 1.2], [8, 1.15], [7.5, 1.2], [7.5, 1.15],
     [7, 1.2], [7, 1.15], [6.8, 1.15], [7, 1.1], [6.5, 1.15]].forEach(function (cfg) {
      cards.forEach(function (el) {
        var d = el.querySelector('.cdesc');
        if (d) { d.style.fontSize = cfg[0] + 'px'; d.style.lineHeight = cfg[1]; }
      });
      var ov = 0, worst = 0, wn = '';
      cards.forEach(function (el) {
        var d = el.querySelector('.cdesc');
        if (!d) return;
        var n = d.scrollHeight, h = d.clientHeight;
        if (n > h + 1) { ov++; if (n - h > worst) { worst = n - h; wn = (el.querySelector('.cname') || {}).textContent || '?'; } }
      });
      out.push('   fs=' + cfg[0] + ' lh=' + cfg[1] + ' → 溢出 ' + ov + '/' + cards.length
        + (worst ? '（' + wn + ' 差 ' + worst + 'px）' : ''));
    });
    badge(out.join('\n'));
  }
  setTimeout(go, 400);
})();