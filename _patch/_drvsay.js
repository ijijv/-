/* v0.76.0 敌人台词气泡（#enemy-say）的验收驱动。

   这个夹具存在的理由：本项唯一会**静默失效**的地方是「目录里写了台词、气泡却永远不出现」
   —— 而它有三条互不相干的断法，grep 与子串闸**一条都证不了**：
     a) `makeEnemy` 是逐字段显式构造，漏透传 ⇒ 字段在、气泡永不来（冒烟已单独钉了这一层）；
     b) `pumpSay` 的锚点用 `enemyEl(e)`（按 data-uid）而**不是 DOM 下标**
        —— 渲染的是 `G.enemies.filter(e=>alive(e)||e.dying)`，两者会错位；
     c) 气泡挂错了父节点（挂进 `#enemy-panel` 会被它的 `isolation:isolate` 夹到 0 层，
        看得见才有鬼）或定位写错（`position:static` 时坐标全废）。
   所以这里走**真实路径** startBattle → enemySay → pumpSay，再读真实 DOM 与计算样式。

   五个判据（每种都对应一个真会发生的错法）：
     1. 精英在场 ⇒ `#enemy-say` 恰好一条、父节点是 `document.body`、
        `position:fixed` + `z-index:34` + `pointer-events:none`（错法：挂错父节点 / 规则被解析器丢弃）。
     2. 它锚在 **G.enemies[0]** 的头顶：水平中心差 ≈ 0、下边缘 ≈ 立绘顶边。
        同时报出到 G.enemies[1] 的距离 —— 「锚错了敌人」只有把两者摆在一起才看得见。
     3. 文字 == 目录里那一句（真实路径取出来的，不是手抄的 HTML）。
     4. 随便点一下 ⇒ 立刻收掉（玩家任何一次出牌都会收，不能挡拖拽落点）。
     5. 普通敌人 / 低配 / 减弱动态 ⇒ **一条都不建**。

   ⚠️ 两条夹具自身的坑：
     a) 无头下 `--virtual-time-budget` 只快进计时器、不推进合成器时钟 ⇒ 那 2.6s 的收尾定时器
        在本次同步任务里不会到点，所以「读完再收」的顺序是安全的；但也**不要**在这里 await。
     b) CSS 过渡同样冻在起始帧：`.on` 那一拍起的 `translateY(6px) → 0` 在无头下读到的是
        **6px 那一头**。所以纵向判据写成区间 [−2, 8]（真浏览器落 0、无头落 6），
        横向没有过渡 ⇒ 仍然是 ±2 的硬判据。见 probe_say.py 的注释。

   本驱动只**回报事实**；规格（哪一例该显该隐、文字该是什么）属于 probe_say.py。用法见该文件。 */
(function () {
  var HERO = 'tianshi';
  var recs = [];

  function boot() {
    confirmNewGame();
    pickHero(HERO);
    skipOpening();
    closeOverlay();
    document.body.classList.remove('at-menu');
  }

  function node() { return document.getElementById('enemy-say'); }

  /* 报事实：n | parent | position | zindex | pe | dx | dy | dx2 | dy2 | text
     dx/dy  = 气泡中心 − G.enemies[0] 的中心 / 气泡**下边缘** − G.enemies[0] 立绘**上边缘**
     dx2/dy2= 同上，但对着 G.enemies[1]（「锚错敌人」的对照） */
  function probe() {
    var el = node();
    if (!el) return ['0', '-', '-', '-', '-', 'NA', 'NA', 'NA', 'NA', '(没建过)'];
    var n = document.querySelectorAll('#enemy-say').length;
    var cs = window.getComputedStyle(el);
    var r = el.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var e0 = (G.enemies && G.enemies[0]) ? enemyEl(G.enemies[0]) : null;
    var e1 = (G.enemies && G.enemies[1]) ? enemyEl(G.enemies[1]) : null;
    function dx(el2) {
      if (!el2) return 'NA';
      var q = el2.getBoundingClientRect();
      return String(Math.round(cx - (q.left + q.width / 2)));
    }
    function dy(el2) {
      if (!el2) return 'NA';
      return String(Math.round(r.bottom - el2.getBoundingClientRect().top));
    }
    /* ⚠️ 不能写成 `parentNode.id || nodeName`：`document.body` 的 id 是**空串**（falsy），
       于是每一行都会印成 'BODY' —— 夹具第一版就这么报了假红。直接与 body 比身份。 */
    var par = (el.parentNode === document.body) ? 'body'
            : ((el.parentNode && (el.parentNode.id || el.parentNode.nodeName)) || '?');
    return [String(n), par,
            cs.position, cs.zIndex, cs.pointerEvents, dx(e0), dy(e0), dx(e1), dy(e1),
            String(el.textContent || '')];
  }

  function rec(id, want) { recs.push([id, want].concat(probe()).join(' | ')); }

  function tapBody() {
    /* 真实事件：capture 相挂在 window 上，body 上派发、bubbles=true 一定能到。
       ⚠️ 不要直接调 clearSay() —— 那样验的是函数而不是**接线**。 */
    document.body.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, clientX: 10, clientY: 10,
      pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1
    }));
  }

  function run() {
    boot();

    /* A 精英在场 ⇒ 该显。两只精英同场，**同时只许一条**（排队），且锚的是第一只。 */
    startBattle(['baiwuchang', 'heiwuchang']);
    rec('elite_in', 'show');

    /* B 点一下 ⇒ 收掉。 */
    tapBody();
    rec('dismiss', 'none');

    /* C 普通敌人 ⇒ 一条都不建（`sayPick` 对没写字段的敌人返 null）。 */
    startBattle(['huyao', 'shuigui']);
    rec('normal_none', 'none');

    /* D 低配 ⇒ 不建（`menuFxOff()` 的第一条分支）。 */
    SETTINGS.lowSpec = true;
    startBattle(['baiwuchang']);
    rec('lowspec_none', 'none');
    SETTINGS.lowSpec = false;

    /* E 系统「减弱动态效果」⇒ 不建（同一条 `menuFxOff()`，第二条分支）。
       桩在**调用时**才被读（menuFxOff 每次现调 matchMedia）⇒ 现在替换还来得及。 */
    var _mm = window.matchMedia;
    window.matchMedia = function (q) {
      if (String(q).indexOf('prefers-reduced-motion') >= 0) return { matches: true, media: q, addListener: function () {}, removeListener: function () {} };
      return _mm.apply(window, arguments);
    };
    startBattle(['baiwuchang']);
    rec('reduced_none', 'none');
    window.matchMedia = _mm;

    emit();
  }

  function emit() {
    var out = [];
    out.push('vp=' + window.innerWidth + 'x' + window.innerHeight);
    out.push('hero=' + G.hero);
    out.push('cols=id | 期望 | n | parent | position | zIndex | pointerEvents | dx | dy | dx2 | dy2 | text');
    out.push.apply(out, recs);
    var pre = document.createElement('pre');
    pre.id = '__out';
    pre.textContent = out.join('\n');
    document.body.appendChild(pre);
  }

  function go() {
    try { run(); } catch (e) {
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