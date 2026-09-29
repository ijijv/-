/* 洗牌动画**可见性**探针 —— 回答「洗牌动画到底有没有真的放出来、放出来有多大」。

   为什么需要它：`probe_anim.js` 只证明「无头下是空操作」（那是一道**行为不变**的闸），
   它证明不了真实浏览器里这一条动画**看得见**。而 v0.72.0 交付后用户反馈
   「洗牌动画做了吗我怎么没看到」—— 这正是「闸全绿但人看不见」的典型，
   只能靠浏览器里量。

   为什么能同步量：`Anim.play()`（js/00_base.js:992）是**完全同步**的 ——
   没有 rAF、没有 setTimeout，`build()` 与 `_animItem()` 里的 `el.animate()` 都在
   `render()` 尾部的 `Anim.flush()` 里当场执行。所以只要**桩掉 `Element.prototype.animate`
   记录每一次调用**，就能拿到确定性的答案，完全不受 `--virtual-time-budget`
   「后注册的 rAF 拿不到帧」那条夹具陷阱影响（见 _drvland.js 文件头）。

   用法：python _patch/probe_shuffle.py */
(function () {
  var out = [], errs = [];
  window.onerror = function (m, u, l) { errs.push(m + ' @' + l); };
  function log(s) { out.push(s); }

  /* ── 记录每一次 WAAPI 调用 ───────────────────────────────────────── */
  var calls = [];
  var _animate = Element.prototype.animate;
  Element.prototype.animate = function (kf, opts) {
    calls.push({
      tag: this.tagName, id: this.id || '', cls: String(this.className || ''),
      kf: JSON.stringify(kf),
      opts: JSON.stringify(opts || {})
    });
    return _animate.apply(this, arguments);
  };

  function rect(sel) {
    var e = document.querySelector(sel);
    if (!e) return null;
    var r = e.getBoundingClientRect();
    return { w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10,
             x: Math.round(r.left), y: Math.round(r.top) };
  }
  /* 堆把式：只认「打在堆元素自己身上」的那几条（id 是 pile-draw / pile-discard） */
  function onPile(c) { return c.id === 'pile-draw' || c.id === 'pile-discard'; }
  /* 飞行克隆：_animItem 给克隆节点挂的是 .fly-card */
  function isFly(c) { return c.cls.indexOf('fly') >= 0; }

  function go() {
    confirmNewGame();
    pickHero('tianshi');
    skipOpening();
    startBattle(['huyao', 'shuigui']);
    if (typeof closeOverlay === 'function') closeOverlay();
    document.body.classList.remove('at-menu');
    render();

    log('A 前置：动画到底有没有资格跑');
    log('  animLive() = ' + animLive() + '     fx() = ' + fx());
    log('  window.innerWidth = ' + window.innerWidth + '    devicePixelRatio = ' + window.devicePixelRatio);
    var layer = document.getElementById('anim-layer');
    log('  #anim-layer ' + (layer ? '存在，z-index=' + window.getComputedStyle(layer).zIndex : '**不存在**'));

    if (!G.deck || !G.deck.length) {
      G.deck = (typeof CARDS !== 'undefined' ? CARDS.slice(0, 12) : []).map(function (c) { return cardById(c.id); });
      errs.push('G.deck 在 startBattle 之后是空的，改用 CARDS 兜底 —— 下面的数字仍可用');
    }
    log('  G.deck.length = ' + G.deck.length);
    var pr = rect('#pile-draw'), pd = rect('#pile-discard');
    log('  #pile-draw    盒子 = ' + JSON.stringify(pr));
    log('  #pile-discard 盒子 = ' + JSON.stringify(pd));

    /* ── B 对照：普通抽牌（抽牌堆够，不触发洗牌） ─────────────────── */
    calls.length = 0;
    G.hand = []; G.drawPile = G.deck.slice(0, 10); G.discard = [];
    drawCards(3);
    render();
    var bPile = calls.filter(onPile), bFly = calls.filter(isFly);
    log('');
    log('B 普通抽牌（不洗牌）—— 对照组');
    log('  animate 调用总数 = ' + calls.length);
    log('  打在两个堆上的  = ' + bPile.length + '   （期望 0，因为没洗牌）');
    log('  飞行克隆        = ' + bFly.length);

    /* ── C 正题：抽牌堆空 ⇒ 弃牌堆洗回抽牌堆 ─────────────────────── */
    calls.length = 0;
    G.hand = []; G.drawPile = []; G.discard = G.deck.slice(0, 10);
    var drew = false;
    drawCards(3); drew = (G.hand.length > 0);
    render();
    var cPile = calls.filter(onPile), cFly = calls.filter(isFly);
    var cOther = calls.filter(function (c) { return !onPile(c) && !isFly(c); });

    log('');
    log('C 洗牌（抽牌堆空 → 弃牌堆洗回）—— 正题');
    log('  真的抽到牌了吗 = ' + drew + '（G.hand.length=' + G.hand.length + '）');
    log('  animate 调用总数 = ' + calls.length);
    log('  打在两个堆上的  = ' + cPile.length + '   ← 这就是「洗牌动画」本体');
    cPile.forEach(function (c, i) {
      log('     [' + i + '] id=' + c.id);
      log('         kf   = ' + c.kf);
      log('         opts = ' + c.opts);
    });
    /* v0.74.0：洗牌与抽牌已**串行**（洗牌独占 340ms，见 ANIM_SHUFFLE_HOLD）。
       这里把「克隆最早的一条 delay」量出来，与 340 对拍 —— 同拍时它会是 0。 */
    log('  飞行克隆        = ' + cFly.length + '   ← 抽牌动画；洗牌已串行占位');
    cFly.forEach(function (c, i) {
      log('     [' + i + '] cls=' + c.cls + ' opts=' + c.opts);
    });
    log('  其余（光晕等）  = ' + cOther.length);
    cOther.forEach(function (c, i) {
      log('     ~[' + i + '] tag=' + c.tag + ' id="' + c.id + '" cls="' + c.cls + '"');
      log('            opts = ' + c.opts);
    });

    /* ── D 结论：这条动画在屏幕上占多少像素 ─────────────────────── */
    log('');
    log('D 可见性折算（拿实测盒子算，不用 CSS 注释里的数字）');
    if (pr) {
      /* _animItem 的堆把式关键帧是 scale(1) → scale(1.09) → scale(1)，
         峰值在 offset .32；持续 Math.max(80, 520*0.55) = 286ms。 */
      var dw = pr.w * 0.09, dh = pr.h * 0.09;
      log('  堆盒子 ' + pr.w + '×' + pr.h + 'px → 峰值 scale(1.09) ⇒ '
        + (pr.w * 1.09).toFixed(1) + '×' + (pr.h * 1.09).toFixed(1) + 'px');
      log('  净增长 ' + dw.toFixed(1) + 'px 宽 / ' + dh.toFixed(1) + 'px 高'
        + '（单边各 ' + (dw / 2).toFixed(1) + ' / ' + (dh / 2).toFixed(1) + 'px）');
      log('  持续 286ms，峰值落在 ~92ms（offset .32）+ 第二堆 delay 40ms');
      var pr2 = rect('#pile-draw');
      log('  光晕半径 = max(w,h)*0.95 ≈ ' + (Math.max(pr.w, pr.h) * 0.95).toFixed(0) + 'px（金）');
    } else {
      log('  ⚠️ 量不到堆盒子');
    }
    /* 串行对拍：所有克隆 / 光晕的 delay 里最小的那个，就是「第二拍」的起点。
       v0.74.0 期望 ≥340（洗牌独占），同拍时代它恒为 0 —— 这条比读常量更可信，
       因为它量的是**浏览器真收到的 opts**。 */
    var minLate = Infinity, minFirst = Infinity;
    cFly.concat(cPile, cOther).forEach(function (c) {
      var m = /"delay":(\d+(?:\.\d+)?)/.exec(String(c.opts) || '');
      var d = m ? parseFloat(m[1]) : 0;
      /* 「洗牌侧」= 打在堆元素上的 + 光晕；「抽牌侧」= 飞行克隆。
         ⚠️ 判据用 onPile(c) 而不是某个 c.pile 字段 —— 记录对象里从来没存过那个字段，
         写成 c.pile 会恒假，于是堆把式被算进「抽牌侧」，minLate 变成 0、这条对拍永远假绿。 */
      if (onPile(c) || c.cls.indexOf('fx-pulse') >= 0) { minFirst = Math.min(minFirst, d); }
      else { minLate = Math.min(minLate, d); }
    });
    log('  抽牌克隆最早的 delay = ' + (isFinite(minLate) ? minLate : '(无克隆)') + 'ms'
      + '   ← v0.74.0 期望 340（= 洗牌独占的那一拍；改回同拍会变 0）');
    log('  洗牌侧最早 delay      = ' + (isFinite(minFirst) ? minFirst : '(无)') + 'ms  ← 期望 0');
    log('  对照：抽牌克隆 ' + cFly.length + ' 条，每条是整张牌大小'
      + (bFly.length ? '（对照组 ' + bFly.length + ' 条）' : ''));

    log('');
    log('G errs = ' + (errs.length ? errs.join(' | ') : 'none'));
  }

  function emit() {
    var pre = document.createElement('pre');
    pre.id = '__out';
    pre.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:99999;'
      + 'background:#000e;color:#0f0;font:11px/1.35 monospace;padding:6px;'
      + 'white-space:pre-wrap;overflow:auto;margin:0';
    pre.textContent = out.join('\n');
    document.body.appendChild(pre);
  }

  function run() {
    try { go(); } catch (e) {
      out.unshift('GO 抛出：' + (e && e.message) + '\n' + ((e && e.stack) || ''));
    }
    emit();
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(run, 0);
  } else {
    window.addEventListener('DOMContentLoaded', function () { setTimeout(run, 0); });
  }
})();