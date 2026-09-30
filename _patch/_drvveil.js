/* v0.76.0 结算墨色过场（#scene-veil）的验收驱动。

   用户口径：「不只要淡入淡出，还要场景的合理过渡」+「分级：普通轻 / 精英·Boss·结局重」
   +「胜：金墨自下升  负：暗红墨自上压」。

   这个夹具存在的理由：本项唯一的失败形态是**分级判错**与**该铺的墨没铺**（或反之），
   而这**不能靠定时采样** —— `--virtual-time-budget` 会把计时器快进，采样点与节拍一对不上
   就会时红时绿。所以用 `MutationObserver` **把每一次类/样式变化都记下来**，
   事后按「出现过什么、先后次序对不对」判定，与节拍快慢无关。

   四条判据（每种都对应一个真会发生的错法）：
     1. 轻档（普通战斗）⇒ 墨幕**一次都没出现**（.show 从未挂上），但那一拍的挡板要真的落下
        （style.display 动过）——错法：分级判错，普通战斗也铺一场墨。反向的错法（轻档干脆
        什么都不演）由「内容」与「同刻=N」两列一起抓：内容最终为 Y 说明面板确实开了。
     2. 重档（精英）⇒ `.show` 出现、随后 `.parting` 出现，且**次序如此** ——
        错法：揭幕那一拍没接上，墨盖住战场就不走了（最坏的一种：屏幕全黑）。
     3. 败局 ⇒ `.show.lose` —— 错法：金墨/暗红墨配错（方向反过来，观感正好相反）。
     4. `prefers-reduced-motion` ⇒ 墨幕一次都不出现、`style` 一次都没动过，且面板**同刻**就在。
        错法：只关 CSS 动画而漏了 JS 早返回 ⇒ 面板黑屏 0.5 秒才出现。

   ⚠️ **`rec()` 必须在下一拍再读**，不能紧跟 `winFight()` 同步读：
      MutationObserver 的回调走**微任务**，同步读到的 `log` 恒为空 ⇒ 每一行都是 N。
      （这个坑踩过一次：夹具第一版全行 show=N，看着像「分级全坏了」，其实是读早了。）
      唯一**要求同步读**的是「同刻」那一列 —— 它在 `winFight()` 的下一行取值，
      恰好证明「没有任何计时器插在中间」。

   本驱动只**回报事实**；规格（哪一档该显该隐）属于 probe_veil.py。用法见该文件。 */
(function () {
  var HERO = 'tianshi';
  var recs = [];
  var log = [];
  var obs = null;
  var PHASES = [
    { id: 'light',      want: 'light',      wait: 1300 },
    { id: 'heavy_win',  want: 'heavy_win',  wait: 3000 },
    { id: 'heavy_lose', want: 'heavy_lose', wait: 3000 },
    { id: 'reduced',    want: 'reduced',    wait: 900 }
  ];
  var idx = 0;
  var pending = null;      /* 上一拍的行，等它的定时器跑完再读 log */
  var _mm = null;

  function boot() {
    confirmNewGame();
    pickHero(HERO);
    skipOpening();
    closeOverlay();
    document.body.classList.remove('at-menu');
    var v = document.getElementById('scene-veil');
    if (v) {
      obs = new MutationObserver(function (mus) {
        for (var i = 0; i < mus.length; i++) {
          var m = mus[i];
          log.push(m.attributeName + '=' + String(m.target.getAttribute(m.attributeName) || ''));
        }
      });
      obs.observe(v, { attributes: true, attributeFilter: ['class', 'style'] });
    }
  }

  function veilCls() {
    var v = document.getElementById('scene-veil');
    return v ? (v.className || '(空)') : '(无元素)';
  }
  function content() {
    var c = document.getElementById('overlayContent');
    if (!c) return 'N';
    var t = c.textContent || '';
    return (t.indexOf('战 斗 结 算') >= 0 || t.indexOf('妖气侵蚀了你') >= 0) ? 'Y' : 'N';
  }
  /* `.show` 要按**词**判 —— `indexOf('show')` 会在 `showcase` 之类上假阳性，
     而这一列的整个意义就是「墨幕到底出没出现过」。 */
  function classWord(w) {
    for (var i = 0; i < log.length; i++) {
      var s = log[i];
      if (s.indexOf('class=') !== 0) continue;
      var parts = s.slice(6).split(/\s+/);
      for (var j = 0; j < parts.length; j++) if (parts[j] === w) return true;
    }
    return false;
  }
  /* 次序：`.parting` 第一次出现必须**晚于** `.show` 第一次出现。 */
  function order() {
    var si = -1, pi = -1;
    for (var i = 0; i < log.length; i++) {
      var s = log[i];
      if (s.indexOf('class=') !== 0) continue;
      var parts = s.slice(6).split(/\s+/);
      if (si < 0 && parts.indexOf('show') >= 0) si = i;
      if (pi < 0 && parts.indexOf('parting') >= 0) pi = i;
    }
    if (si < 0 || pi < 0) return 'NA';
    return pi > si ? 'ok' : 'bad';
  }
  function styleTouched() {
    for (var i = 0; i < log.length; i++) if (log[i].indexOf('style=') === 0) return true;
    return false;
  }

  function rec(p) {
    recs.push([p.id, p.want,
               classWord('show') ? 'Y' : 'N',
               classWord('parting') ? 'Y' : 'N',
               classWord('lose') ? 'Y' : 'N',
               order(),
               styleTouched() ? 'Y' : 'N',
               p.immediate,
               content(),
               veilCls()].join(' | '));
  }

  /* ⚠️ 每一拍开头必须**清空面板再把浮层收掉**：上一拍结算出来的那块面板还挂在
     `#overlayContent` 里，不清的话「同刻」这一列读到的是**上一拍的残留**——
     夹具第一版就这么把 heavy_win/heavy_lose 判成了假红（同刻=Y）。 */
  function clearPanel() {
    hideOverlay();
    var c = document.getElementById('overlayContent');
    if (c) c.innerHTML = '';
  }

  /* 每拍返回「等多久再来读」；`immediate` 是**同刻**那一列，必须由调用点当场取值。 */
  function phase(id) {
    log = [];
    clearPanel();
    if (id === 'light') {
      startBattle(['huyao', 'shuigui']);
      winFight();
      pending = { id: id, want: 'light', immediate: content() };
      return 1300;
    }
    if (id === 'heavy_win') {
      startBattle(['baiwuchang', 'heiwuchang']);
      winFight();
      pending = { id: id, want: 'heavy_win', immediate: content() };
      return 3000;
    }
    if (id === 'heavy_lose') {
      startBattle(['baiwuchang', 'heiwuchang']);
      G.dead = false; G.battleOver = false;   /* 前置条件，不是伪造结果：loseGame 自己会置回 true */
      loseGame();
      pending = { id: id, want: 'heavy_lose', immediate: content() };
      return 3000;
    }
    /* reduced：桩要**在调用之前**装 —— menuFxOff() 每次都现调 matchMedia。 */
    _mm = window.matchMedia;
    window.matchMedia = function (q) {
      if (String(q).indexOf('prefers-reduced-motion') >= 0) {
        return { matches: true, media: q, addListener: function () {}, removeListener: function () {} };
      }
      return _mm.apply(window, arguments);
    };
    startBattle(['baiwuchang', 'heiwuchang']);
    winFight();
    pending = { id: id, want: 'reduced', immediate: content() };
    window.matchMedia = _mm;
    return 900;
  }

  function step() {
    if (pending) { rec(pending); pending = null; }
    if (idx >= PHASES.length) return emit();
    var ph = PHASES[idx++];
    var wait = phase(ph.id);
    setTimeout(step, wait);
  }

  function emit() {
    var out = [];
    out.push('vp=' + window.innerWidth + 'x' + window.innerHeight);
    out.push('hero=' + G.hero);
    out.push('cols=id | 期望 | show | parting | lose | 次序 | style动过 | 同刻 | 内容 | veilClass');
    out.push.apply(out, recs);
    var pre = document.createElement('pre');
    pre.id = '__out';
    pre.textContent = out.join('\n');
    document.body.appendChild(pre);
  }

  function go() {
    try { boot(); step(); } catch (e) {
      var pre = document.createElement('pre');
      pre.id = '__out';
      pre.textContent = 'BOOT 抛出：' + (e && e.message) + '\n' + ((e && e.stack) || '');
      document.body.appendChild(pre);
    }
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(go, 0);
  } else {
    window.addEventListener('DOMContentLoaded', function () { setTimeout(go, 0); });
  }
})();