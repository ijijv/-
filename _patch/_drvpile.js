/* v0.69.0 §C 专用驱动：抽牌堆 / 弃牌堆的**宽度算术**与几何。
   为什么非量不可：§C5 的配平（#log 236→200、#hand .card margin-left →-76px）
   全靠 `.rune-display` / `.endcol` / `#hand` 的**真实**宽度，而这三者在
   原型.html 里只有 min-width / padding，实际宽度由内容撑开 —— 估算会直接把
   `#hand` 的余量算错几十 px（V0.66 那批就是估的，plan 里明文标了「必须实拍量一次再定」）。

   输出：
     A 现状：.hand-area 各子项宽度 + #hand 可用宽 + 8/10 张牌的实际跨度
     B 牌堆：两个堆的矩形、是否与手牌重叠、侧棱露出的木口宽度
     C 徽章：#pile-draw-n / #pile-discard-n 的文字与「有堆但徽章是空的」告警
     D 回归：.hand-area / #hand 的规则体里有没有 transform/filter/will-change（红色禁区）

   用法：python _patch/shot.py --direct --drv _patch/_drvpile.js --widths 1280 --h 720 --dump
        （换档：--widths 1920 --h 1080 / --widths 520 --h 900 看退化成绝对定位那一档）
*/
(function () {
  var out = [], errs = [];
  window.onerror = function (m, u, l) { errs.push(m + ' @' + l); };
  function log(s) { out.push(s); }

  function rect(sel) {
    var el = document.querySelector(sel);
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
  }
  function fmt(name, r) {
    return r ? (name + ' ' + r.w + '×' + r.h + ' @' + r.l + ',' + r.t) : (name + ' 不存在');
  }
  /* 手牌的实际跨度：首张左沿 → 末张右沿。margin-left 是负的，所以它**小于**各卡宽之和。
     ⚠️ 手牌张数必须自己塞：驱动停在**地图页**（默认 _drv.js 就是拍地图的），
        G.hand 是空的，直接量会得到「读不到」。塞完必须 render() —— #hand 的
        innerHTML 只在 render() 里重写。 */
  function setHand(n) {
    var saved = G.hand;
    G.hand = CARDS.slice(0, n).map(function (c) {
      return { id: c.id, name: c.name, type: c.type, rarity: c.rarity, cost: c.cost,
               up: false, t: c.t, ts: c.ts, eff: c.eff };
    });
    try { render(); } catch (e) { log('   render 抛异常：' + e.message); }
    return saved;
  }
  function handSpan() {
    var cs = document.querySelectorAll('#hand .card');
    if (!cs.length) return null;
    var a = cs[0].getBoundingClientRect(), b = cs[cs.length - 1].getBoundingClientRect();
    return { n: cs.length, span: Math.round(b.right - a.left), card: Math.round(a.width),
             l: Math.round(a.left), r: Math.round(b.right) };
  }

  function go() {
    try { confirmNewGame(); pickHero('tianshi'); skipOpening(); }
    catch (e) { log('初始化失败 ' + e.message); }

    log('A 手牌区宽度算术（视口 ' + window.innerWidth + '×' + window.innerHeight + '）');
    ['#app', '#field', '#log', '#col-main', '.hand-area', '.rune-display', '#hand', '.endcol', '#endTurn']
      .forEach(function (s) { log('   ' + fmt(s, rect(s))); });
    var ha = rect('.hand-area'), rd = rect('.rune-display'), ec = rect('.endcol');
    var pd0 = rect('.pile-discard'), pw0 = rect('.pile-draw');
    if (ha && rd && ec) {
      /* 「两端吃掉多少」必须把两个堆算进去 —— 漏掉就会得出「#hand 还有 611px」的假余量。
         ⚠️ ≤520 档两个堆退化成 position:absolute（§C5），这时它们**不吃 flex 宽度**，
            改吃 `.hand-area` 的左右 padding（每侧 = 堆宽）。两种算法的 gap 数也不同
            （4 个 vs 2 个），混用会得出错的「理论可用」—— 所以按真实 position 分支。 */
      var pdEl = document.querySelector('.pile-discard');
      var isAbs = pdEl && getComputedStyle(pdEl).position === 'absolute';
      var eaten, note;
      if (isAbs) {
        var padL = parseFloat(getComputedStyle(document.querySelector('.hand-area')).paddingLeft) || 0;
        var padR = parseFloat(getComputedStyle(document.querySelector('.hand-area')).paddingRight) || 0;
        eaten = rd.w + ec.w + padL + padR + 2 * 4;
        note = '（绝对定位档：堆吃 padding ' + padL + '+' + padR + '，2×gap=8）';
      } else {
        eaten = rd.w + ec.w + (pd0 ? pd0.w : 0) + (pw0 ? pw0.w : 0) + 4 * 8;
        note = '（flex 兄弟档：4×gap=32）';
      }
      log('   固定的两端 + 两个堆吃掉 ' + eaten + 'px' + note + ' ⇒ #hand 理论可用 = '
        + (ha.w - eaten) + 'px');
    }
    var sp = handSpan();
    log('   当前手牌 ' + (sp ? sp.n + ' 张，跨度 ' + sp.span + 'px（卡宽 ' + sp.card + '）'
      : '读不到（未进战斗？）'));

    /* 8 张是「必须稳」，10 张容许对称溢出（plan §C5）。两张都量。

       ⚠️ 必须分开量**两个**不同的量，混起来会把结论搞反（v0.69.0 实测踩过）：
         · 布局宽 = #hand.scrollWidth vs clientWidth —— 真正决定「挤不挤得下」。
           #hand 是 flex + `flex-wrap:nowrap` + 默认 flex-shrink ⇒ 牌会被**压窄**，
           所以布局上其实一直是「刚好塞满」，并不会溢出。
         · 视觉跨度 = 首末卡的 getBoundingClientRect() 之差 —— 它把 `rotate(--rot)`
           的**外扩**算进去了（132×200 的卡转 10.5° 外接盒变 165px），
           所以它**必然**比布局宽大一截，这截不是 bug，是扇形展开本身的形状。
       只看后者会得出「8 张已经溢出 71px 了」的错误结论，进而把 margin-left 调得过紧。 */
    log('A2 手牌张数扫描（布局 span/clientW ＋ 视觉跨度）');
    var hw = ha ? ha.w - (rd ? rd.w : 0) - (ec ? ec.w : 0) - 16 : 0;
    [5, 8, 10, 12].forEach(function (n) {
      setHand(n);
      var s2 = handSpan(), hd = document.getElementById('hand');
      if (!s2 || !hd) { log('   ' + n + ' 张：读不到'); return; }
      /* 布局跨度：offsetLeft/offsetWidth **不含 transform**，是真正的排版范围。
         （scrollWidth 在 Chrome 里会把旋转外扩也算进可滚动溢出，量不准；
           getBoundingClientRect 同理带旋转。所以只认 offset*。） */
      var cs = hd.querySelectorAll('.card');
      var a = cs[0], b = cs[cs.length - 1];
      var lay = (b.offsetLeft + b.offsetWidth) - a.offsetLeft;
      var cw = hd.clientWidth;
      var padL = parseFloat(getComputedStyle(hd).paddingLeft) || 0;
      log('   ' + n + ' 张：布局 ' + lay + '/' + (cw - padL * 2) + 'px ⇒ '
        + (lay <= cw - padL * 2 ? '✓ 余 ' + (cw - padL * 2 - lay) : '✗ 溢出 ' + (lay - (cw - padL * 2)))
        + '  ｜ 视觉跨度 ' + s2.span + 'px（旋转外扩 ' + (s2.span - lay) + '）'
        + '  ｜ 卡宽 ' + a.offsetWidth + 'px  --rot='
        + getComputedStyle(a).getPropertyValue('--rot').trim());
    });
    setHand(8);   /* B 段的重叠判定要有牌才看得出手牌边界 */

    log('B 牌堆几何');
    ['.pile-discard', '.pile-draw', '.pile-discard .pile-face', '.pile-draw .pile-face',
     '.pile-discard .pile-slab', '.pile-draw .pile-slab'].forEach(function (s) {
      log('   ' + fmt(s, rect(s)));
    });
    var pd = rect('.pile-discard'), pw = rect('.pile-draw'), h = rect('#hand');
    if (pd && pw && h && sp) {
      log('   弃牌堆右沿 ' + (pd.l + pd.w) + ' vs 手牌左沿 ' + sp.l + ' ⇒ '
        + ((pd.l + pd.w) <= sp.l ? '不重叠 ✓' : '重叠 ' + (pd.l + pd.w - sp.l) + 'px ✗'));
      log('   抽牌堆左沿 ' + pw.l + ' vs 手牌右沿 ' + sp.r + ' ⇒ '
        + (pw.l >= sp.r ? '不重叠 ✓' : '重叠 ' + (sp.r - pw.l) + 'px ✗'));
    }
    /* 底对齐要拿**手牌卡片的底**比，不能拿 #hand 盒子的底比 ——
       #hand 有 padding-bottom:16px，卡片坐在内容盒底部，两者差 16px。
       拿盒子比会误报「堆矮了 16px」，然后就会去删掉正确的 margin-bottom。 */
    var cs2 = document.querySelectorAll('#hand .card'), cardsB = null;
    if (cs2.length) { var cb = cs2[0].getBoundingClientRect(); cardsB = Math.round(cb.bottom); }
    if (pd && cardsB !== null) log('   堆底 ' + (pd.t + pd.h) + ' vs 手牌卡底 ' + cardsB + ' ⇒ '
      + (Math.abs((pd.t + pd.h) - cardsB) <= 2 ? '底对齐 ✓' : '底不齐，差 '
        + ((pd.t + pd.h) - cardsB) + 'px'));

    log('C 计数徽章');
    [['#pile-draw-n', '抽牌堆'], ['#pile-discard-n', '弃牌堆']].forEach(function (p) {
      var el = document.querySelector(p[0]);
      if (!el) { log('   ' + p[0] + ' 不存在 ✗'); return; }
      var txt = (el.textContent || '').trim();
      log('   ' + p[1] + ' → 「' + txt + '」' + (txt === '' ? '  ✗空（有堆没数）' : ''));
    });
    log('   G.drawPile=' + (typeof G !== 'undefined' && G.drawPile ? G.drawPile.length : '?')
      + ' G.discard=' + (typeof G !== 'undefined' && G.discard ? G.discard.length : '?'));

    /* C2 贴图有没有真的接上。⚠️ 这条不能靠肉眼：.pile-slab 有 background-color 兜底色，
       side.png 404 时那块**照样是木色**，截图上看不出来（只是纹理变成了纯色）。
       判据是 computed backgroundImage 里有没有 url(...) 以及它的长度（data: URI 会很短）。 */
    log('C2 贴图接线（backgroundImage 必须是非 none 的 url()）');
    [['.pile-face', '--pile-back-img'], ['.pile-slab', '--pile-side-img']].forEach(function (p) {
      var el = document.querySelector(p[0]);
      var bg = el ? getComputedStyle(el).backgroundImage : '(无元素)';
      var v = getComputedStyle(document.documentElement).getPropertyValue(p[1]).trim();
      log('   ' + p[0] + ' backgroundImage=' + (bg.length > 90 ? bg.slice(0, 60) + '…(' + bg.length + ')' : bg));
      log('      ' + p[1] + ' = ' + (v.length > 90 ? v.slice(0, 60) + '…(' + v.length + ')' : (v || '(空 ✗ —— pileInit 没跑到)')));
    });

    /* D 红色禁区：.hand-area / #hand 上出现 transform/filter/will-change 会
       让它们成为 position:fixed 后代的**包含块** ⇒ #fx-layer 的坐标系当场失效（§A/§C6）。 */
    log('D 红色禁区自查（.hand-area / #hand 不许有 transform/filter/will-change）');
    var bad = [];
    for (var i = 0; i < document.styleSheets.length; i++) {
      var rs;
      try { rs = document.styleSheets[i].cssRules; } catch (e) { continue; }
      for (var j = 0; j < rs.length; j++) chk(rs[j]);
    }
    function chk(r) {
      if (r.cssRules) { for (var k = 0; k < r.cssRules.length; k++) chk(r.cssRules[k]); return; }
      if (!r.selectorText) return;
      if (!/\.hand-area|#hand\b/.test(r.selectorText)) return;
      var s = r.style.cssText || '';
      if (/transform\s*:|filter\s*:|will-change\s*:|perspective\s*:/.test(s)) {
        bad.push(r.selectorText + ' { ' + s.slice(0, 70) + ' }');
      }
    }
    log('   ' + (bad.length ? '✗ ' + bad.length + ' 处：\n     ' + bad.join('\n     ') : '干净 ✓'));

    log('E errs=' + (errs.length ? errs.join(' | ') : 'none'));
  }

  function emit() {
    var box = document.createElement('div');
    box.id = '__dbg';
    box.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:99999;background:#000e;'
      + 'color:#0f0;font:11px/1.35 monospace;padding:6px;white-space:pre-wrap;overflow:auto';
    box.textContent = out.join('\n');
    document.body.appendChild(box);
    document.title = 'PILE';
  }
  function run() {
    try { go(); } catch (e) { out.unshift('GO 抛出：' + (e && e.message) + '\n' + ((e && e.stack) || '')); }
    emit();
  }
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run);
})();