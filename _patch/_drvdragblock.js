/* v0.75.0 拖拽格挡预演（#drag-block）的验收驱动。
   用户口径：「打出防御牌获得的格挡，也要在卡牌往上拖拽的时候提前显示出来」+
   「显示在**玩家头部**，用**蓝色的浮字**」。

   这个夹具存在的理由：本项唯一会**静默失效**的地方不是数值（数值由冒烟对着 eff 逐列证过），
   而是**元素建了但定位错 / 颜色不对 / 阈值与松手不同刻**——这三样 grep 与子串闸都证明不了。
   所以这里派发**真实的指针事件**走一遍 cardPointerDown → onDragMove → onDragUp，
   再读**计算样式与几何**。

   五个判据（每种都对应一个真会发生的错法）：
     1. 往上拖够 40px ⇒ 元素存在且**不含** .off（错法：根本没接上）。
     2. 那一行的 color 是蓝的、position 是 fixed（错法：规则被解析器丢弃 / 写错颜色）。
     3. 元素的**下边缘贴齐** `#player-panel .hero-art-box` 的上边缘（错法：锚点写成了敌人
        或 hpbar —— 那就不是「玩家头部」了）。**用相对量**，不吃缩放。
     4. 往上拖 **20px**（不足 40）⇒ 含 .off（错法：阈值与 onDragUp 不同刻 ⇒
        看到预演、松手却没打出去）。
     5. 往下拖 60px / 攻击牌（指向牌走箭头分支）/ 反震（previewBlock 恒 0）⇒ 都含 .off。

   ⚠️ 三条夹具自身的坑（本仓踩过的）：
     a) 无头下 `--virtual-time-budget` 只快进计时器、不推进合成器时钟，入场动画会冻在 t=0。
        本页的入场动画只挂在 `#overlay.ov-enter #overlayWrap` 上，**不碰 #app / #player-panel**
        （已核 原型.html 的 animation 全部落点），所以这里不需要注入 `animation:none`。
     b) 判「藏起来了」不能只判 `el.classList.contains('off')`：元素是**懒创建**的，
        从没显示过时 `getElementById` 直接是 null ⇒ 必须写成「元素不存在 **或** 带 .off」。
     c) ⚠️ 期望**不由 `previewBlock` 现算** —— 那是让被测函数自己出题（它若恒返回 0，
        五例会全部期望 hide 而全绿）。显隐的规格写在 CASES 里，显示的数字由
        `_probe_dragblock.py` 拿 shown 那一列与写死的 '+4格挡' 比对。

   本驱动只**回报事实**；规格（哪一行该显该隐）属于 _patch/probe_dragblock.py。用法见该文件。 */
(function () {
  /* 固定 赶尸人：金刚符 4 格挡（未升级）、反震恒 0 —— 两个都是与活变量无关的定值，
     夹具才敢把期望钉死。 */
  var HERO = 'ganshiren';
  /* 每例：卡 id / 纵向位移（负 = 往上拖）/ 期望（show|hide）。
     顺序**刻意**把「该显」的放第一个：「该隐」的几例排在后面才能真正抓到泄漏
     （前一例没藏干净 ⇒ 后一例当场红）。 */
  var CASES = [
    { id: 'jingang_up60',   card: 'jingang', dy: -60, want: 'show' },
    { id: 'jingang_up20',   card: 'jingang', dy: -20, want: 'hide' },   // 不足 40px 阈值
    { id: 'jingang_down60', card: 'jingang', dy:  60, want: 'hide' },   // 拖反了方向
    { id: 'leifu_up60',     card: 'leifu',   dy: -60, want: 'hide' },   // 攻击牌：走箭头分支
    { id: 'fanzhen_up60',   card: 'fanzhen', dy: -60, want: 'hide' }    // previewBlock 恒 0
  ];
  var recs = [];
  var i = 0;

  function boot() {
    confirmNewGame();
    pickHero(HERO);
    skipOpening();
    /* 与 _drvscenebg.js / _drvevtmtx.js 同一条启动路径：先把完整战局建起来。 */
    startBattle(['huyao', 'shuigui']);
    if (typeof closeOverlay === 'function') closeOverlay();
    document.body.classList.remove('at-menu');
    step();
  }

  function artBox() { return document.querySelector('#player-panel .hero-art-box'); }

  /* 元素显示时把数字渲染成 <img class="fx-num" alt="N">（字形档），没装素材时回落文字。
     两条路必须归一到同一个字符串，否则夹具会因「素材加载时序」而时红时绿。 */
  function shownText(el) {
    if (!el) return '(无元素)';
    var digs = el.querySelectorAll ? el.querySelectorAll('.fx-num') : [];
    if (digs.length) {
      var s = '';
      for (var k = 0; k < digs.length; k++) s += (digs[k].alt || '?');
      return '+' + s + '格挡';
    }
    return String(el.textContent || '').replace(/\s+/g, '');
  }

  /* 报事实：present | off | color | position | geo | shown
     geo = 元素**下边缘**减去 hero-art-box 的**上边缘**（贴齐则 0，负 = 跑到头顶上方去了） */
  function probe() {
    var el = document.getElementById('drag-block');
    if (!el) return ['N', '-', '(没建过)', '-', 'NA', '(没建过)'];
    /* ⚠️ 必须与 'Y' 比：off 是字符串，'N' 也是**真值** —— 写成 `if(off)` 会让
       「隐藏」那一支恒成立，于是显示的每一行都被报成隐藏（这个夹具第一版就这么错过）。 */
    var off = el.classList.contains('off') ? 'Y' : 'N';
    if (off === 'Y') return ['Y', 'Y', '-', '-', 'NA', shownText(el)];
    var cs = window.getComputedStyle(el);
    var geo = 'NA';
    var a = artBox();
    if (a) geo = String(Math.round(el.getBoundingClientRect().bottom - a.getBoundingClientRect().top));
    return ['Y', 'N', cs.color, cs.position, geo, shownText(el)];
  }

  function dispatch(target, type, x, y) {
    target.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, clientX: x, clientY: y,
      pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1
    }));
  }

  function step() {
    if (i >= CASES.length) return emit();
    var cs = CASES[i++];
    /* 每例都把状态重置成「一张牌、能量管够」，免得上一例真的打出了牌影响下一例。 */
    G.hand = [cardById(cs.card)];
    G.energy = 99;
    render();
    var el = document.querySelector('#hand .card');
    if (!el) { recs.push(cs.id + ' | 无卡牌元素'); return step(); }
    /* ⚠️ 期望值用 CASES 里写死的**规格**，**不**调 previewBlock 现算 ——
       那样等于让被测函数自己出题：previewBlock 若恒返回 0，五例会全部期望 hide 而全绿。
       数字对不对由 _probe_dragblock.py 拿 shown 那一列与写死的 '+4格挡' 比对。 */
    var r = el.getBoundingClientRect();
    var sx = Math.round(r.left + r.width / 2), sy = Math.round(r.top + r.height / 2);
    dispatch(el, 'pointerdown', sx, sy);
    dispatch(document, 'pointermove', sx, sy + cs.dy);
    recs.push([cs.id, cs.want].concat(probe()).join(' | '));
    /* 松手一律在**当前位置**上：该显的那一例因此会真的打出这张牌 —— 这正是我们要的，
       它顺带证明了「松手即隐」。其余几例的位移都不满足 onDragUp 的 40px 条件，不会出牌。 */
    dispatch(document, 'pointerup', sx, sy + cs.dy);
    recs.push([cs.id + '#rel', 'hide'].concat(probe()).join(' | '));
    step();
  }

  function emit() {
    var out = [];
    out.push('vp=' + window.innerWidth + 'x' + window.innerHeight);
    out.push('hero=' + G.hero);
    out.push('art_box=' + (function () {
      var a = artBox();
      if (!a) return '(不在)';
      var r = a.getBoundingClientRect();
      return Math.round(r.left) + ',' + Math.round(r.top) + ',' + Math.round(r.width) + 'x' + Math.round(r.height);
    })());
    out.push('cols=id | 期望 | present | off | color | position | geo(下边缘-头顶) | shown');
    out.push.apply(out, recs);
    var pre = document.createElement('pre');
    pre.id = '__out';
    pre.textContent = out.join('\n');
    document.body.appendChild(pre);
  }

  function run() {
    try { boot(); } catch (e) {
      var pre = document.createElement('pre');
      pre.id = '__out';
      pre.textContent = 'BOOT 抛出：' + (e && e.message) + '\n' + ((e && e.stack) || '');
      document.body.appendChild(pre);
    }
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(run, 0);
  } else {
    window.addEventListener('DOMContentLoaded', function () { setTimeout(run, 0); });
  }
})();