/* v0.70.0 §横屏专用驱动：量「一屏装不装得下」。
   为什么非量不可：装不下的第一因是**敌人横排换行撞上写死宽度**（184/280/372px），
   而 `.battle{align-items:flex-end}` 会把行数直接乘进纵向高度 —— 这没法靠算术估，
   必须让浏览器真的排一遍。判据是 `documentElement.scrollHeight - innerHeight <= 0`。

   用法：
     python _patch/shot.py --direct --drv _patch/_drvland.js --widths 844 --h 390 --dump
     竖屏（430x932）必须走 iframe 模式（Chrome 的 --window-size 最小 512 宽）：
     python _patch/shot.py --drv _patch/_drvland.js --widths 430 --h 932

   ⚠️ **出图**（--screenshot）一律走 iframe 模式，别用 --direct：
     判据是 844x390 下底部条 `#log`。--direct 下主线程的 rect/计算样式/命中栈
     全都说它老老实实躺在 0,346,844,44、bg 是纯红、还是该点最顶层元素，
     可图上一个像素都没有；同一份 CSS 换 iframe 模式拍就正常显影。
     结论：--direct（顶层文档）在 --virtual-time-budget 下对
     「position:fixed + overflow:auto + 曾被 transform 提层」的元素会漏栅格化，
     属于无头自身的毛病，**不要照着它去改游戏 CSS**。
     --direct 仍然适合 --dump：数是对的（A/B/C/D 段全部可信）。

   参数（都走 --q 查询串）：
     n   手牌张数（默认 8）
     e   敌人 id 列表，逗号分隔（默认 huyao,shuigui,youhun —— 三个 e-normal，专门压换行）
     m   战报栏形态：off/0=关 / log-open=右侧抽屉
         （**不给 m** = 两种各量一遍；给 m = 只量那一种，且出图时落在这一种上）
         v0.71.0 起没有第三种了：试玩期的「底部条」定稿时落选，CSS 已删。

   输出：
     A 视口与「一屏装得下吗」—— 两种战报形态各一行，判据 scrollHeight-innerHeight<=0
     B 各块矩形
     C 敌人换行行数 + 每行几个（装不下的第一因）
     D 净空与后排上抬是否被矮屏档收住
     E 红色禁区自查（.hand-area / #hand 不许有 transform/filter/will-change）
     F 竖屏闸是否生效
*/
(function () {
  var out = [], errs = [];
  window.onerror = function (m, u, l) { errs.push(m + ' @' + l); };
  function log(s) { out.push(s); }
  var q = new URLSearchParams(location.search);
  function pick(n) { return parseInt(n, 10) || 0; }

  /* ⚠️ 夹具竞态（踩了很久，记下来）：驱动在 load 里**同步** closeOverlay()，
     可游戏自己的异步 boot 随后又把地图 overlay 显示了一遍。而
     `--virtual-time-budget` 只快进计时器，**不推进合成器的 CSS 过渡时钟** ——
     `#overlay` 那 0.22s 的淡出永远走不完，出图时就定格在 opacity≈0.46 的半透明上。
     它 z-index:10 压在战报栏（z-index:9）之上 ⇒ 量到的矩形全对，图上一个像素都没有。
     游戏本来就给它挂了 `hidden` 类，只是靠 opacity 隐藏；这里让 `hidden` 直接生效，
     过渡也一并掐掉，免得再出现「半透明定格」这种只在无头里成立的中间态。
     ⚠️ 只影响夹具：手机上是真实时钟，淡出正常走完。 */
  (function () {
    /* ⚠️ #log 那条 `transition:transform .22s`（translateX(100%)→none）是**合成器**
     时钟驱动的，而 --virtual-time-budget 不推进它 ⇒ 主线程布局早就到了 346，
     合成器那一层还停在屏幕外（translateX(100%)），于是出现「rect/计算样式/命中栈
     全都说它在底部、图上一个像素都没有」这种只可能在无头里成立的怪相。
     夹具里直接掐掉过渡：要量的是**终态**，不是这 0.22s 的中间帧。 */
    var st = document.createElement('style');
    st.textContent = '#overlay{transition:none !important;}'
      + '#overlay.hidden{display:none !important;}'
      + '#log{transition:none !important;}';
    (document.head || document.documentElement).appendChild(st);
  })();

  /* body 的 class 谁在写？—— 用观察者抓**每一次**写入（带调用栈）。
     为什么非抓不可：形态类（log-open/log-bar）在 go() 里量得到、出图却看不到，
     中间只可能是「被谁抹掉了」。肉眼 grep 只能证明「我没找到」，证明不了「没有」。 */
  var classLog = [];
  try {
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        if (m.attributeName !== 'class') return;
        var st = '';
        try { throw new Error(''); } catch (e) { st = (e.stack || '').split('\n')[2] || ''; }
        classLog.push('「' + (m.oldValue || '') + '」→「' + document.body.className + '」'
                      + st.replace(/^\s*at\s*/, '  @'));
      });
    }).observe(document.body, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  } catch (e) { classLog.push('观察者装不上：' + e.message); }

  function rect(sel) {
    var el = document.querySelector(sel);
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
  }
  function fmt(name, r) {
    return r ? (name + ' ' + r.w + 'x' + r.h + ' @' + r.l + ',' + r.t) : (name + ' 不存在');
  }
  function fakeHand(n) {
    var a = [];
    for (var i = 0; i < n; i++) {
      var c = CARDS[i % CARDS.length];
      a.push({ id: c.id, name: c.name, type: c.type, rarity: c.rarity, cost: c.cost,
               up: i % 4 === 3, t: c.t, ts: c.ts, eff: c.eff });
    }
    return a;
  }

  /* 「一屏装得下吗」：只认这一个数。>0 就是要竖滚，竖滚 + 拖拽出牌 = 没法玩。 */
  function overflow() {
    var d = document.documentElement;
    return d.scrollHeight - window.innerHeight;
  }
  function setMode(m) {
    if (m === 'off' || m === '0') m = '';   /* 「关」的显式写法，两种都认 */
    var c = document.body.classList;
    c.remove('log-open');
    if (m) c.add(m);
  }
  /* ⚠️ 敌人 id 必须先过 ENEMIES 这一关（v0.71.0 加）—— 这里踩过一个
     **静默失效**的大坑：默认值原先写 `huyao,shuigui,bailang`，而 `bailang`
     在游戏里早就不存在了（全仓库只剩两个夹具文件还提它）。`startBattle` 走到
     makeEnemy 就抛「reading 'summon'」，**一个敌人都没建起来**；而 go() 只把异常
     记了一行 message，没有把「战斗没起来」变成任何可见状态 ⇒ 之后 A/B/C/D 四段
     全部在**量一个空战场**，还一路报「溢出 0 ✓ 装得下」。
     唯一的线索是 B 段的 `#player-panel 200x0` / `#enemy-panel 568x2`，没人会盯它。
     所以：id 先校验、丢了就进 errs（G 段会打出来），并且**在 A 段之前顶一条横幅**。 */
  function ENEMY_IDS() {
    var want = (q.get('e') || 'huyao,shuigui,youhun').split(',');
    var ok = want.filter(function (k) { return typeof ENEMIES !== 'undefined' && !!ENEMIES[k]; });
    var missing = want.filter(function (k) { return ok.indexOf(k) < 0; });
    if (missing.length) errs.push('敌人 id 不在 ENEMIES：' + missing.join(','));
    return ok;
  }
  /* 敌人换行行数 —— 装不下的第一因。
     按 top 分组：同一行的敌人 top 会差 0~1px（都是 align-items:flex-end 对齐的），
     所以容差取 4px 再取整。 */
  function enemyRows() {
    var es = document.querySelectorAll('#enemy-panel .enemy');
    var a = [], i, saved = [];
    /* 判「换没换行」踩过三个坑，最后只剩这一个可靠判据：
       ① 不能看 getBoundingClientRect().top —— 同排敌人的纵深错落就是
          translateY(RISE_LIFT×倍率)，同排能差出二三十 px，看着像三行；
       ② 不能用 offsetTop —— 它倒是排除了 transform，但 `.battle` 是
          `align-items:flex-end`，**同排不同身高的顶边本来就不同**（底边才对齐）；
       ③ 不能看 left 有没有回升 —— row-reverse + wrap 时第二行首个元素与第一行
          首个元素右边界重合，回升判据整个漏掉（实测 1366×640 因此误报单行）。
       可行解：**临时摘掉 transform**（内联改 none，覆盖掉 lift），重排一次，
       再按 **bottom** 分组 —— flex-end 下同排 bottom 恒等、异排差一个行高。 */
    for (i = 0; i < es.length; i++) { saved.push(es[i].style.transform); es[i].style.transform = 'none'; }
    void document.body.offsetHeight;
    for (i = 0; i < es.length; i++) {
      var r = es[i].getBoundingClientRect();
      a.push({ b: Math.round(r.bottom), l: Math.round(r.left), w: Math.round(r.width) });
    }
    for (i = 0; i < es.length; i++) es[i].style.transform = saved[i];
    if (!a.length) return [];
    a.sort(function (x, y) { return x.b - y.b; });
    var rows = [{ top: a[0].b, n: 1, l: a[0].l }];
    for (i = 1; i < a.length; i++) {
      if (a[i].b - rows[rows.length - 1].top > 3) rows.push({ top: a[i].b, n: 1, l: a[i].l });
      else rows[rows.length - 1].n++;
    }
    return rows;
  }
  function cs(sel, prop) {
    var el = document.querySelector(sel);
    if (!el || !window.getComputedStyle) return '?';
    return window.getComputedStyle(el)[prop];
  }

  function go() {
    try {
      confirmNewGame();
      pickHero(q.get('hero') || 'tianshi');
      skipOpening();
      startBattle(ENEMY_IDS());
      if (typeof closeOverlay === 'function') closeOverlay();
      document.body.classList.remove('at-menu');
      G.hand = fakeHand(pick(q.get('n')) || 8);
      /* 灌几条假战报：本夹具的文件级 log() 把游戏的全局 log() 遮蔽了，
         所以走 window.log。不灌的话底部条/抽屉是空的，出图看不出形态。 */
      if (q.get('fill') !== '0' && window.log) {
        ['—— 遭遇 狐妖 ——', '—— 第 1 回合开始 ——', '咒印道体：对敌人施加 1 层诅咒',
         '摸 5 张：雷符、火符、剑符、破布符、聚灵', '你对 纸扎人 造成 6 点伤害',
         '纸扎人 失去 6 点生命', '—— 第 2 回合开始 ——'].forEach(function (s) { try { window.log(s); } catch (e) {} });
      }
      render();
    } catch (e) {
      log('!! 初始化失败 ' + (e && e.message));
      log('!! 栈 ' + ((e && e.stack) || '(无)').split('\n').slice(0, 5).join('\n!!    '));
      log('!! ⇒ 战斗没建起来，下面 A–H 全部是**空战场**的数字，不可用。先修 go()。');
    }

    log('A 一屏装得下吗（视口 ' + window.innerWidth + 'x' + window.innerHeight
        + ' · 手牌 ' + (pick(q.get('n')) || 8) + ' 张 · 敌人 '
        + ENEMY_IDS().join(',') + '）');
    /* 参数没生效时，先怀疑参数根本没到 —— 打印原始查询串，免得去查不存在的 bug。 */
    log('   search=「' + location.search + '」  m=「' + (q.get('m') || '') + '」');
    var modes = q.get('m') ? [q.get('m')] : ['', 'log-open'];
    var names = { '': '战报关  ', 'log-open': '右侧抽屉' };
    modes.forEach(function (m) {
      /* ⚠️ #log 带 `transition:transform .22s`，而这里是**同步**量矩形 ——
       刚 setMode 完的 getBoundingClientRect 拿到的还是上一形态的过渡中间值
       （实测底部条会报 left=844，像是没生效）。量之前先掐掉过渡。 */
      var _lg = document.getElementById('log');
      if (_lg) _lg.style.transition = 'none';
      setMode(m);
      void document.body.offsetHeight;
      var ov = overflow();
      var lr = rect('#log') || {};
      log('   ' + names[m] + '  溢出 ' + (ov > 0 ? '+' + ov + '  ✗ 要竖滚' : ov + '  ✓ 装得下')
          + '   #col-main 宽 ' + (rect('#col-main') || {}).w
          + '   #enemy-panel 宽 ' + (rect('#enemy-panel') || {}).w
          + '   #log ' + lr.w + 'x' + lr.h + '@' + lr.l + ',' + lr.t);
    });
    setMode('');

    log('B 各块矩形');
    ['#app', '#topbar', 'h1.title', '.battle', '#player-panel', '#enemy-panel',
     '#turn-summary', '.hand-area', '#hand', '#log', '#pile-draw', '#pile-discard', '.hint']
      .forEach(function (s) { log('   ' + fmt(s, rect(s))); });

    log('B2 顶栏子项（矮屏档 48px ⇒ 说明折了两行）');
    var tb = document.getElementById('topbar');
    if (tb) {
      var cs2 = getComputedStyle(tb);
      log('   #topbar flex-wrap=' + cs2.flexWrap + ' padding=' + cs2.padding + ' 子项 ' + tb.children.length + ' 个');
      for (var ti = 0; ti < tb.children.length; ti++) {
        var c2 = tb.children[ti], r2 = c2.getBoundingClientRect();
        log('     [' + ti + '] ' + c2.tagName.toLowerCase()
            + (c2.className ? '.' + String(c2.className).split(' ').join('.') : '')
            + ' ' + Math.round(r2.width) + 'x' + Math.round(r2.height)
            + ' @' + Math.round(r2.left) + ',' + Math.round(r2.top)
            + '  「' + (c2.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24) + '」');
      }
    }

    log('C 敌人换行（装不下的第一因）');
    var rows = enemyRows();
    rows.forEach(function (r, i) { log('   第 ' + (i + 1) + ' 行：' + r.n + ' 个  top=' + r.top); });
    log('   共 ' + rows.length + ' 行' + (rows.length > 1 ? '  ✗ 换行了' : '  ✓ 单行'));

    log('C2 敌人内部构成（.battle 208px 是当前最大的纵向开销）');
    var ep = document.getElementById('enemy-panel');
    if (ep) {
      var cse = getComputedStyle(ep);
      log('   #enemy-panel padding=' + cse.padding + ' align-items=' + cse.alignItems
          + ' 子项 ' + ep.children.length + ' 个');
      for (var pi = 0; pi < ep.children.length; pi++) {
        var cp = ep.children[pi], rp2 = cp.getBoundingClientRect();
        log('     <' + pi + '> ' + cp.tagName.toLowerCase()
            + (cp.className ? '.' + String(cp.className).split(' ').join('.') : '')
            + ' ' + Math.round(rp2.width) + 'x' + Math.round(rp2.height)
            + ' @' + Math.round(rp2.left) + ',' + Math.round(rp2.top));
      }
    }
    var e0 = document.querySelector('#enemy-panel .enemy');
    if (e0) {
      var r0 = e0.getBoundingClientRect();
      log('   首个敌人 ' + Math.round(r0.width) + 'x' + Math.round(r0.height)
          + '  class=' + e0.className);
      for (var ei = 0; ei < e0.children.length; ei++) {
        var ce = e0.children[ei], re = ce.getBoundingClientRect();
        log('     [' + ei + '] ' + ce.tagName.toLowerCase()
            + (ce.className ? '.' + String(ce.className).split(' ').join('.') : '')
            + ' ' + Math.round(re.width) + 'x' + Math.round(re.height)
            + ' @' + Math.round(re.left) + ',' + Math.round(re.top));
      }
    }

    log('D 净空与后排上抬');
    log('   #enemy-panel padding-top = ' + cs('#enemy-panel', 'paddingTop'));
    var en = document.querySelector('.enemy');
    log('   首个 .enemy transform = ' + (en ? getComputedStyle(en).transform : '?'));
    log('   #log position = ' + cs('#log', 'position') + '（矮屏档应为 fixed）');
    log('   --rise-unit = ' + (window.getComputedStyle
        ? getComputedStyle(document.documentElement).getPropertyValue('--rise-unit').trim() : '?'));

    log('E 红色禁区自查（.hand-area / #hand 不许有 transform/filter/will-change）');
    var bad = [];
    function chk(r) {
      if (r.cssRules) { for (var k = 0; k < r.cssRules.length; k++) chk(r.cssRules[k]); return; }
      if (!r.selectorText) return;
      if (!/\.hand-area|#hand\b/.test(r.selectorText)) return;
      var s = r.style.cssText || '';
      if (/transform\s*:|filter\s*:|will-change\s*:|perspective\s*:/.test(s)) {
        bad.push(r.selectorText + ' { ' + s.slice(0, 70) + ' }');
      }
    }
    for (var i = 0; i < document.styleSheets.length; i++) {
      var rs;
      try { rs = document.styleSheets[i].cssRules; } catch (e) { continue; }
      for (var j = 0; j < rs.length; j++) chk(rs[j]);
    }
    log('   ' + (bad.length ? '✗ ' + bad.length + ' 处：\n     ' + bad.join('\n     ') : '干净 ✓'));

    log('F 竖屏闸');
    log('   #rotate-tip display = ' + cs('#rotate-tip', 'display'));
    log('   #app display = ' + cs('#app', 'display'));
    /* ⚠️ 这里量到的**不是**出图时的状态：本段是 go() 的最后一段，而形态类是
       go() 返回之后由 run() 落的。之前把它标成「末态」是错的 —— 那行报的
       「body.class = has-bg」只是 setMode('') 之后、落形态之前的中间态。
       真正的终态检查见 run() 里的 finalCheck()。 */
    log('   [go末] body.class = 「' + document.body.className + '」');
    var lr2 = rect('#log') || {};
    var lg2 = document.getElementById('log');
    log('   [go末] #log ' + lr2.w + 'x' + lr2.h + '@' + lr2.l + ',' + lr2.t
        + '  transform=' + (lg2 ? getComputedStyle(lg2).transform : '?')
        + '  transition=' + (lg2 ? getComputedStyle(lg2).transitionProperty : '?'));
    log('   [body.class 写入史] ' + (classLog.length ? classLog.length + ' 次' : '一次都没有（观察者装晚了）'));
    classLog.forEach(function (s) { log('     ' + s); });

    log('G errs=' + (errs.length ? errs.join(' | ') : 'none'));
  }

  function emit() {
    var box = document.createElement('div');
    box.id = '__dbg';
    box.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:99999;background:#000e;'
      + 'color:#0f0;font:11px/1.35 monospace;padding:6px;white-space:pre-wrap;overflow:auto';
    box.textContent = out.join('\n');
    document.body.appendChild(box);
    document.title = 'LAND';
  }
  function run() {
    try { go(); } catch (e) { out.unshift('GO 抛出：' + (e && e.message) + '\n' + ((e && e.stack) || '')); }
    /* 参数类错误（敌人 id 不存在之类）不会抛异常，只会让战斗**静悄悄地空着**。
       所以顶一条横幅 —— 「数字看着正常但其实没量到东西」是这批夹具最大的敌人。 */
    if (errs.length) {
      out.unshift('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n'
        + '!! 参数有问题，下面的数字**不可信**：\n!!   ' + errs.join('\n!!   ')
        + '\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    }
    /* go() 量完 A 段会把形态清空（三种都要量一遍），但**出图**时要的是
       参数指定的那一种 —— 所以这里按 m 再落一次。 */
    /* 「关」也要能显式表达：原先靠「不给 m」隐式表示，出图时读代码的人
       分不清「要的就是关」和「忘了传」。off/0 都当关（归一在 setMode 里）。 */
    if (q.has('m')) setMode(q.get('m'));
    /* 终态检查：真正落在 run() 之后（形态已落、快到 virtual-time 取样点），
       这才是「量到的 0 溢出」和「拍到的东西」共用的那个状态。 */
    out.push('H 终态（落形态之后）');
    out.push('   body.class = 「' + document.body.className + '」  #log style.transform = '
             + ((document.getElementById('log') || {}).style || {}).transform);
    out.push('   #log ' + fmt('', rect('#log')).replace(/^ /, '') + '  overflow=' + overflow());
    /* 图片加载自查：手机走 HTTP 时最怕的就是某个 assetURL 组出来的路径 404 ——
       版面全对、图是空的。naturalWidth===0 就是没解码出来（404 或路径错）。
       ⚠️ 必须**等图落定**再判：这些 <img> 是 go() 里 render() 现造的，同步测的话
          网络还没回来，会把一整屏好图误报成 49/51 没加载。判据用 `!complete`
          （404 的图 complete 也为 true，但那时它已被 imgFail 换成占位符、不在
           document.images 里了，所以「仍在 DOM 且 !complete」= 还在路上）。 */
    function imgReport() {
      var imgs = document.images, dead = [], pending = 0;
      for (var ii = 0; ii < imgs.length; ii++) {
        if (!imgs[ii].complete) { pending++; continue; }
        if (imgs[ii].naturalWidth === 0) dead.push((imgs[ii].src || '?').split('/').slice(-1)[0]);
      }
      out.push('   图片 ' + imgs.length + ' 张，没加载出来的 ' + dead.length + ' 张'
               + (pending ? '（还有 ' + pending + ' 张在路上）' : '')
               + (dead.length ? '：' + dead.slice(0, 8).join(' ') : ' ✓'));
    }
    /* 「量得到矩形」与「画得出来」是两件事：矩形对而看不见，只剩栈序/透明两类原因。
       elementFromPoint 直接回答「这一点上最上面的是谁」，比逐个猜 z-index 快。 */
    var lg3 = document.getElementById('log');
    if (lg3) {
      var c3 = getComputedStyle(lg3);
      out.push('   #log 计算样式 bg=' + c3.backgroundColor + ' opacity=' + c3.opacity
               + ' visibility=' + c3.visibility + ' zIndex=' + c3.zIndex
               + ' display=' + c3.display + ' overflowY=' + c3.overflowY);
      out.push('   #log 父链 z：' + (function () {
        var a = [], p = lg3.parentNode, k = 0;
        while (p && p.nodeType === 1 && k++ < 6) {
          var pc = getComputedStyle(p);
          a.push((p.id || p.className || p.tagName) + '(z=' + pc.zIndex + ',pos=' + pc.position + ')');
          p = p.parentNode;
        }
        return a.join(' < ');
      })());
      var hit = document.elementFromPoint(Math.round(window.innerWidth / 2),
                                          Math.round(window.innerHeight - 12));
      out.push('   底部中点命中：' + (hit ? (hit.id || hit.className || hit.tagName) : 'null'));
    }
    /* tint=1：给 #log 糊一层红底 + 青描边。「矩形对但看不见」时，
       这一下直接区分「没画」和「画了但看不出」（深底深字/被盖住）。
       tint=2：再把整页底色刷绿 —— 用来分辨「run() 压根没跑」和「跑到了但这条不画」。
       两个是可叠加的探针，别当成正式开关。 */
    if (q.get('tint')) {
      if (lg3) {
        lg3.style.setProperty('background', '#f00', 'important');
        lg3.style.setProperty('outline', '2px solid #0ff', 'important');
      }
      if (q.get('tint') === '3') {
        /* --screenshot 模式下 dump-dom 拿不到，但很多毛病只在**出图那一刻**才现形。
           所以把诊断**画进图里**：一个跟在 #log 矩形上的黄框（钉几何），
           外加一条图内角标（钉计算样式）。看图就等于看数。 */
        var rr = lg3 ? lg3.getBoundingClientRect() : null;
        var mk = document.createElement('div');
        mk.id = '__mark';
        mk.style.cssText = 'position:fixed;z-index:99998;pointer-events:none;'
          + 'border:2px solid #ff0;background:transparent;'
          + (rr ? 'left:' + rr.left + 'px;top:' + rr.top + 'px;width:' + rr.width + 'px;height:' + rr.height + 'px;'
                : 'left:0;top:0;width:10px;height:10px;');
        document.body.appendChild(mk);
        var c4 = lg3 ? getComputedStyle(lg3) : {};
        var bd = document.createElement('div');
        /* ⚠️ 角标必须**矮**：`#000e` 是全屏底色，行数一多就把底部条那一带自己也盖了，
           于是「条没画」和「条被角标盖了」分不开 —— 这个坑我踩过一次。 */
        bd.style.cssText = 'position:fixed;left:0;top:0;right:0;height:118px;overflow:hidden;'
          + 'z-index:99999;background:#000e;color:#0f0;'
          + 'font:11px/1.3 monospace;padding:4px;white-space:pre;pointer-events:none';
        bd.textContent = 'class=' + document.body.className
          + '  rect=' + (rr ? [rr.left, rr.top, rr.width, rr.height].map(Math.round).join(',') : 'null')
          + '  op=' + c4.opacity + ' vis=' + c4.visibility + ' z=' + c4.zIndex
          + '\ntop=' + c4.top + ' bottom=' + c4.bottom + ' bg=' + c4.backgroundColor
          + '\n#overlay: ' + (function () {
            var o = document.getElementById('overlay');
            if (!o) return '不存在';
            var oc = getComputedStyle(o), orr = o.getBoundingClientRect();
            return 'disp=' + oc.display + ' op=' + oc.opacity + ' z=' + oc.zIndex
              + ' bg=' + oc.backgroundColor + ' rect=' + [orr.left, orr.top, orr.width, orr.height].map(Math.round).join(',');
          })()
          + '\n#overlay.className=' + ((document.getElementById('overlay') || {}).className || '-')
          + '\n栈 x=700,y=370: ' + (document.elementsFromPoint
              ? document.elementsFromPoint(700, 370).slice(0, 6).map(function (e) {
                  return (e.id ? '#' + e.id : '.' + String(e.className).split(' ')[0]) + '(' + getComputedStyle(e).zIndex + ')';
                }).join(' > ') : '?');
        document.body.appendChild(bd);
      }
      if (q.get('tint') === '5') {
        /* 只改一件事：把 `top:auto; bottom:0` 换成等价的 `top:calc(100% - 44px); bottom:auto`。
           两条算出来的盒子**逐像素相同**（都是底边贴视口底、高 44）。
           若这条画得出来 ⇒ 触发条件就是 `top:auto` 这一种定位写法本身。 */
        [['top', 'calc(100% - 44px)'], ['bottom', 'auto'], ['left', '0'], ['right', '0'],
         ['width', 'auto'], ['height', '44px'], ['max-height', '44px'], ['transform', 'none']]
          .forEach(function (kv) { lg3.style.setProperty(kv[0], kv[1], 'important'); });
      }
      if (q.get('tint') === '4') {
        /* 暴力定位：逐个 setProperty（**不要**用 cssText += —— 那个 setter 会把
           整条内联样式重写一遍，带 !important 的串解析失败就顺手把之前设的红底也清了，
           于是「没红」既有可能是没画、也有可能是压根没设上，判据被污染）。 */
        [['position', 'fixed'], ['left', '0'], ['top', '200px'], ['width', '100%'],
         ['height', '120px'], ['z-index', '999999'], ['background', '#f00'],
         ['transform', 'none'], ['display', 'block'], ['visibility', 'visible']]
          .forEach(function (kv) { lg3.style.setProperty(kv[0], kv[1], 'important'); });
      }
      if (q.get('tint') === '2') {
        /* ⚠️ 必须先藏 #bg（全屏 fixed 底图，z-index:0）—— 不藏的话整页绿底被它
         盖得严严实实，会得出「run() 没跑」的错误结论。 */
        var bg = document.getElementById('bg');
        if (bg) bg.style.display = 'none';
        document.documentElement.style.setProperty('background', '#0f0', 'important');
        document.body.style.setProperty('background', '#0f0', 'important');
      }
    }
    /* badge=0 ⇒ 不打角标，同一个夹具就能用来**出图**（--dump 与 --screenshot 互斥）。 */
    if (q.get('badge') === '0') { document.title = 'LAND'; return; }
    /* 等图落定再出角标：图是 go() 里现造的，同步测会把一整屏好图误报成没加载。
       走 setTimeout 轮询而不是同步测 —— `--virtual-time-budget` 的策略是
       pauseIfNetworkFetchesPending，请求在飞的时候虚拟时间不走，所以这里能等到。 */
    var tries = 0;
    (function waitImgs() {
      var im = document.images, pending = 0, i;
      for (i = 0; i < im.length; i++) if (!im[i].complete) pending++;
      if (pending && tries++ < 80) { setTimeout(waitImgs, 100); return; }
      imgReport();
      emit();
    })();
  }
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run);
})();