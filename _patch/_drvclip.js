/* _drvclip.js —— 「裁切探针」：`_drvland.js` 的姊妹夹具，专治整页上锁之后的**假绿灯**。

为什么非有它不可：
  `_drvland.js` 的 A 段判据只有一条 ——
      overflow() = documentElement.scrollHeight - window.innerHeight
  一旦 `html,body{overflow:hidden}` 生效，**这个数恒等于 0**：内容被 `#app` 裁掉了它也说
  「装得下」。「被裁掉」和「装得下」在数值上无法区分 ⇒ A 段从此只会报绿，
  而那正是本批要消灭的那个错误状态换了个样子回来。**这是整批里唯一会骗人的坑。**
  所以判据必须换：看**每个元素的矩形有没有越出视口**。

三个数，缺一不可：
  doc  —— 旧判据，留着做交叉验证（上锁后应恒为 0）
  app  —— `#app.scrollHeight - #app.clientHeight`：`#app` **内部**有没有溢出
           （上锁后内容挤在 #app 里，这个数才是真正还在动的那个）
  越界表 —— `#app *` 里 rect.bottom > innerHeight 或 rect.top < 0 的元素

越界表的判读口径（★ 这张表是**透镜不是判据**，要人来判，所以列的是证据不是结论）：
  · 已知滚动容器内部（`.panel` / `.menu-col` / `#log` / `.map-viewport` / `.map-scroll`）
    **已经排除** —— 它们本来就该滚，是本批要保留的那些。
  · `.enemy` 系列天然带 translateY 上抬（RISE_LIFT），被 `--headroom` 顶出的净空抵消，
    所以它的越界要结合上抬量看；表里一并打出 `transform`。
  · `position:fixed` 的元素（`#overlay` / `#fx-layer` / `#rotate-tip` / 矮屏档的 `#log`）
    不在 `#app *` 里，天然不会被误列（`#log` 在 #app 内但已按容器排除）。

用法：
    python _patch/shot.py --direct --drv _patch/_drvclip.js --widths 1280 --h 720 --dump
    python _patch/shot.py --direct --drv _patch/_drvclip.js --widths 844 --h 390 --dump
    # 参数同 _drvland：n 手牌数 / e 敌人 / hero / m 战报形态 / fill=0 不灌假战报
    # ⚠️ 只走 --direct + --dump（纯数字夹具，不需要出图；出图请看 _drvland 那边的说明）
*/
(function () {
  var out = [], errs = [];
  window.onerror = function (m, u, l) { errs.push(m + ' @' + l); };
  function log(s) { out.push(s); }
  var q = new URLSearchParams(location.search);
  function pick(n) { return parseInt(n, 10) || 0; }

  /* 掐掉两条**合成器**时钟驱动的过渡（同 _drvland.js 的理由）：
     `--virtual-time-budget` 只快进计时器、不推进合成器的 CSS 过渡时钟，
     留着它们会把「rect 说在位、图上一个像素都没有」这种只可能在无头里成立的
     中间态混进量测。要量的是终态。 */
  (function () {
    var st = document.createElement('style');
    st.textContent = '#overlay{transition:none !important;}'
      + '#overlay.hidden{display:none !important;}'
      + '#log{transition:none !important;}';
    (document.head || document.documentElement).appendChild(st);
  })();

  /* `css=` 参数：把候选 CSS 注入到**最后**（appendChild 到 head 末尾 ⇒ 与原型里的规则
     同特异度时后来者胜），用来**扫参** —— 敌人高度那套公式要试十几个系数组合，
     每试一次都改一遍 原型.html 再回滚是不可接受的。定稿后再写回 原型.html。
     用法：--q "&css=.enemy.e-boss{width:1px}"（URL 编码由调用方负责） */
  (function () {
    var extra = q.get('css');
    if (!extra) return;
    var st2 = document.createElement('style');
    st2.textContent = extra;
    (document.head || document.documentElement).appendChild(st2);
  })();

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
  function setMode(m) {
    if (m === 'off' || m === '0') m = '';
    var c = document.body.classList;
    c.remove('log-open');
    if (m) c.add(m);
  }
  /* 同 _drvland.js 的守卫，理由见那边的长注释：一个不存在的敌人 id 会让
     startBattle 静默半途而死，之后所有量测都在量空战场。 */
  function ENEMY_IDS() {
    var want = (q.get('e') || 'huyao,shuigui,youhun').split(',');
    var ok = want.filter(function (k) { return typeof ENEMIES !== 'undefined' && !!ENEMIES[k]; });
    var missing = want.filter(function (k) { return ok.indexOf(k) < 0; });
    if (missing.length) errs.push('敌人 id 不在 ENEMIES：' + missing.join(','));
    return ok;
  }

  /* 本来就该滚的容器 —— 它们内部的越界不算问题，是本批明确要**保留**的滚动。
     口径与用户的要求一一对应：图鉴 / 地图 / 锻造 / 战报 + 一切走 .panel 的弹窗。 */
  var SCROLLERS = ['.panel', '.menu-col', '#log', '.map-viewport', '.map-scroll', '.map-root'];
  function insideScroller(el) {
    for (var i = 0; i < SCROLLERS.length; i++) {
      try { if (el.closest(SCROLLERS[i])) return true; } catch (e) {}
    }
    return false;
  }
  /* 裁切祖先 —— 越界表里最吵的一类假阳性是「卡面里的金色词 span」：
     它们的矩形确实越出了视口，但 `.card{overflow:hidden}` 早就把它们裁在卡面里了，
     肉眼一个像素都看不到。不区分就会出现「.kw 下+35」霸榜，把真正的越界淹掉。
     ⚠️ `#app` / `#field` / body / html **不算**裁切祖先：本批就是要看
        #app 的 overflow:hidden 裁掉了什么 —— 那正是「装不下」的证据。 */
  var NOT_A_CLIPPER = { app: 1, field: 1, body: 1, html: 1 };
  function clippedBy(el) {
    var p = el.parentElement, n = 0;
    while (p && p.nodeType === 1 && n < 40) {
      if (!(p.id && NOT_A_CLIPPER[p.id]) && p.tagName !== 'BODY' && p.tagName !== 'HTML') {
        var cs = null;
        try { cs = window.getComputedStyle(p); } catch (e) {}
        if (cs && cs.overflow && cs.overflow !== 'visible' && cs.overflow !== '') {
          return (p.className && typeof p.className === 'string')
            ? (p.tagName.toLowerCase() + '.' + p.className.trim().split(/\s+/)[0])
            : (p.id ? p.tagName.toLowerCase() + '#' + p.id : p.tagName.toLowerCase());
        }
      }
      p = p.parentElement; n++;
    }
    return '';
  }

  /* 选择器路径：够定位就行，最多回溯 3 层 —— 打全长路径反而看不清是谁。 */
  function path(el) {
    var s = [], n = 0;
    while (el && el.nodeType === 1 && n < 3) {
      var one = el.tagName.toLowerCase();
      if (el.id) { s.unshift(one + '#' + el.id); break; }
      if (el.className && typeof el.className === 'string') {
        one += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.');
      }
      s.unshift(one);
      el = el.parentElement; n++;
    }
    return s.join(' > ');
  }

  function probe(tag) {
    var ih = window.innerHeight;
    var d = document.documentElement;
    var app = document.getElementById('app');
    var docOv = d.scrollHeight - ih;
    var appOv = app ? (app.scrollHeight - app.clientHeight) : 0;
    log(tag + '  doc(旧判据)=' + docOv + '  #app(内部溢出)=' + appOv);
    if (!app) return;
    var all = app.querySelectorAll('*'), bad = [], i;
    for (i = 0; i < all.length; i++) {
      var el = all[i];
      var cs = window.getComputedStyle ? window.getComputedStyle(el) : null;
      if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) continue;
      var r = el.getBoundingClientRect();
      if (r.width <= 0.5 && r.height <= 0.5) continue;
      if (insideScroller(el)) continue;
      var overBottom = r.bottom - ih, overTop = -r.top;
      if (overBottom <= 0.5 && overTop <= 0.5) continue;
      bad.push({ p: path(el), r: r, ob: overBottom, ot: overTop, tf: (cs ? cs.transform : ''),
                 clip: clippedBy(el) });
    }
    /* 真越界（没人替他裁）排前面；被祖先裁掉的那些沉到表尾并标注出来。
       排序之外**不丢**：夹具是透镜不是判据，由人决定那一类算不算问题。 */
    bad.sort(function (x, y) {
      if (!!x.clip !== !!y.clip) return x.clip ? 1 : -1;
      return Math.max(y.ob, y.ot) - Math.max(x.ob, x.ot);
    });
    if (!bad.length) { log('   越界表：空 ✓'); return; }
    var real = bad.filter(function (b) { return !b.clip; }).length;
    log('   越界表（' + bad.length + ' 个：真越界 ' + real + ' / 已被祖先裁掉 ' + (bad.length - real)
        + '，按越界量降序，最多 30 行）'
        + '  ← 「下」=超出视口下沿 px，「上」=超出视口上沿 px');
    bad.slice(0, 30).forEach(function (b) {
      log('     ' + (b.clip ? '·' : '!')
          + ' ' + (b.ob > 0.5 ? '下+' + Math.round(b.ob) : '      ')
          + ' ' + (b.ot > 0.5 ? '上+' + Math.round(b.ot) : '     ')
          + '  ' + b.p + '  [' + Math.round(b.r.width) + 'x' + Math.round(b.r.height)
          + ' @' + Math.round(b.r.left) + ',' + Math.round(b.r.top) + ']'
          + (b.clip ? '  被 ' + b.clip + ' 裁' : '')
          + (b.tf && b.tf !== 'none' ? '  transform=' + b.tf : ''));
    });
  }

  /* 高度预算表 —— 越界表只说「谁出界」，不说「该从哪里省」。
     整页上锁之后要 reclaim 的 px 得知道是从哪几块吃掉的总和里来的，
     所以把纵向那一串按流的顺序列出来。**只报高度，不做判断。** */
  var BUDGET = ['#app', 'h1.title', '#topbar', '#field', '.battle', '#player-panel', '#enemy-panel',
                '#turn-summary', '.hand-area', '#hand', '.hint'];
  function budget() {
    log('   高度预算表（纵向流的顺序，含 margin）：');
    var cs = function (el) { try { return window.getComputedStyle(el); } catch (e) { return null; } };
    BUDGET.forEach(function (sel) {
      var el = document.querySelector(sel);
      if (!el) { log('     ' + sel + ' 不存在'); return; }
      var r = el.getBoundingClientRect(), s = cs(el);
      var mt = s ? Math.round(parseFloat(s.marginTop) || 0) : 0;
      var mb = s ? Math.round(parseFloat(s.marginBottom) || 0) : 0;
      log('     ' + (sel + '                    ').slice(0, 20)
          + ' h=' + Math.round(r.height) + '  y=' + Math.round(r.top) + '→' + Math.round(r.bottom)
          + '  margin ' + mt + '/' + mb);
    });
    /* 顶栏单独铺开 —— 它是纵向预算里第二贵的一块（base 档实测 81px），
       而它内部靠 flex-wrap 折行，`flex-basis:100%` 的子项**空着也占整行**。
       不铺开就只能看到「81」这个总数，没法判断该收哪一行。 */
    /* 敌人面板同理：它是纵向预算里最贵的一块，而它的高度是
       `--headroom`（JS 按 RISE_LIFT 写）+ 单个敌人内部那一摞撑出来的，
       光看总数分不清是哪一半在吃。 */
    var ep = document.getElementById('enemy-panel');
    if (ep) {
      log('   #enemy-panel 子项（' + ep.children.length + ' 个，只列第 1 个的内部）：');
      var e0 = ep.children[0];
      if (e0) {
        log('     .enemy  h=' + Math.round(e0.getBoundingClientRect().height)
            + '  w=' + Math.round(e0.getBoundingClientRect().width));
        /* ⚠️ 要**直接子元素**（`children`）不是后代（`querySelectorAll('*')`）：
           `.enemy` 那一摞（立绘/名字/生命/血条/格挡/徽章/意图）才是撑高度的东西，
           而 `.badges` 里还嵌着 `.badge`，用后代选择器会被它们挤掉真实子项。 */
        var kids = e0.children;
        for (var j = 0; j < kids.length && j < 14; j++) {
          var k = kids[j], kr = k.getBoundingClientRect(), ks = cs(k);
          log('       ' + (k.tagName.toLowerCase() + '.' + (k.className || '')).slice(0, 24)
              + '                    '.slice(0, Math.max(0, 24 - (k.tagName + '.' + k.className).length))
              + ' h=' + Math.round(kr.height) + ' w=' + Math.round(kr.width));
        }
      }
    }
    var tb = document.getElementById('topbar');
    if (tb) {
      log('   #topbar 子项（' + tb.children.length + ' 个）：');
      for (var i = 0; i < tb.children.length; i++) {
        var c = tb.children[i], cr = c.getBoundingClientRect(), scs = cs(c);
        log('     ' + (c.className || c.tagName).toString().slice(0, 22)
            + '                    '.slice(0, Math.max(0, 22 - (c.className || '').toString().length))
            + ' h=' + Math.round(cr.height) + ' w=' + Math.round(cr.width)
            + ' y=' + Math.round(cr.top) + '→' + Math.round(cr.bottom)
            + ' basis=' + (scs ? scs.flexBasis : '?'));
      }
    }
  }

  /* `screen=hero`：量**选英雄屏**。
     为什么需要单独一条：它渲染进 `#overlay`，而 `#overlay` 是 `position:fixed`，
     **不在 `#app *` 里** ⇒ 上面那张越界表天生看不见它。而用户点名说这个屏
     「显示不完全所以导致它还能上下滑动」= 他**不要**它滚（虽然它走的是通用
     `.panel{max-height:94dvh; overflow-y:auto}`，技术上「能滚」是被允许的形态）。
     所以这里的判据不是「越界」，是 **`.panel` 自己的 scrollHeight 有没有超过 clientHeight** ——
     超了就说明内容装不下，在 390 高的横屏上要么缩字号要么缩格子。
     用法：--q "&screen=hero"                                          */
  function heroReport() {
    var panel = document.querySelector('#overlay .panel');
    if (!panel) { log('  ! 选英雄屏：没有 #overlay .panel，判定不可用'); return; }
    var pr = panel.getBoundingClientRect();
    log('  选英雄屏 #overlay .panel  ' + Math.round(pr.width) + 'x' + Math.round(pr.height)
        + ' @' + Math.round(pr.left) + ',' + Math.round(pr.top)
        + '  内部溢出=' + (panel.scrollHeight - panel.clientHeight));
    var rc = document.querySelector('#overlay .reward-cards');
    if (rc) {
      var rr = rc.getBoundingClientRect();
      log('  .reward-cards  ' + Math.round(rr.width) + 'x' + Math.round(rr.height)
          + ' @' + Math.round(rr.left) + ',' + Math.round(rr.top));
    }
    var rels = document.querySelectorAll('#overlay .relic'), i;
    log('  .relic ×' + rels.length + '：');
    for (i = 0; i < rels.length; i++) {
      var r = rels[i].getBoundingClientRect();
      log('    [' + i + '] ' + Math.round(r.width) + 'x' + Math.round(r.height)
          + ' @' + Math.round(r.left) + ',' + Math.round(r.top));
    }
    var h2 = document.querySelector('#overlay .panel h2');
    if (h2) log('  h2 h=' + Math.round(h2.getBoundingClientRect().height));
  }

  /* `dialog=N`：量**选牌小窗**（用户澄清的「弃牌界面」= 战斗里的选牌小窗）。
     为什么要单独一条：它渲染进 `#overlay`（`position:fixed`，**不在 `#app *` 里**），
     越界表看不见；而它和选英雄屏一样走 `.panel{max-height:88dvh; overflow-y:auto}`。
     判据同样是「`.panel` 的 scrollHeight 有没有超过 clientHeight」。
     ⚠️ 这里**逐字复刻** `renderDiscardSelect()`（js/30_engine.js:442）的卡面标记，
       包括 `has-frame` / 稀有度类 / `selected` / `.card-extra` 的「✓ 已选」——
       少一个类都可能让几何与真实弹窗不一致（`.reward-cards .card.selected` 的金边
       就是靠 `selected` 这个类名命中的）。`sel=1` 让第 1 张处于选中态，把选中样式
       也一起量进去。                                                      */
  function dialogReport(n, sel) {
    var cards = [];
    for (var i = 0; i < n; i++) {
      var c = CARDS[i % CARDS.length];
      var on = sel && i === 0;
      cards.push('<div class="card has-frame ' + (typeof RCOLOR !== 'undefined' ? (RCOLOR[c.rarity] || '') : '')
        + (on ? ' selected' : '') + '">' + cardBody(c)
        + (on ? '<div class="card-extra" style="color:var(--green)">✓ 已选</div>' : '') + '</div>');
    }
    showOverlay('<h2>焚 符 · 弃 牌</h2><p style="color:var(--red)">可弃任意张手牌，每弃 1 张触发一次效果（已选 <b>1</b> 张）</p>'
      + '<div class="reward-cards">' + cards.join('') + '</div>');
    var panel = document.querySelector('#overlay .panel');
    if (!panel) { log('  ! 选牌小窗：没有 #overlay .panel，判定不可用'); return; }
    var pr = panel.getBoundingClientRect();
    log('  选牌小窗（' + n + ' 张） #overlay .panel  ' + Math.round(pr.width) + 'x' + Math.round(pr.height)
        + ' @' + Math.round(pr.left) + ',' + Math.round(pr.top)
        + '  内部溢出=' + (panel.scrollHeight - panel.clientHeight));
    var rc = document.querySelector('#overlay .reward-cards');
    if (rc) {
      var rr = rc.getBoundingClientRect();
      log('  .reward-cards  ' + Math.round(rr.width) + 'x' + Math.round(rr.height)
          + ' @' + Math.round(rr.left) + ',' + Math.round(rr.top));
      var ks = rc.children, rows = {}, order = [];
      for (var j = 0; j < ks.length; j++) {
        var t = Math.round(ks[j].getBoundingClientRect().top);
        if (rows[t] === undefined) { rows[t] = 0; order.push(t); }
        rows[t]++;
      }
      order.sort(function (a, b) { return a - b; });
      log('  卡宽 ' + (ks[0] ? Math.round(ks[0].getBoundingClientRect().width) : '?')
          + 'px · 行数 ' + order.length + '（每行 ' + order.map(function (t) { return rows[t]; }).join('/') + '）');
    }
    var one = document.querySelector('#overlay .card.selected');
    if (one) {
      var cs = window.getComputedStyle(one), or = one.getBoundingClientRect();
      log('  .card.selected 命中  ' + Math.round(or.width) + 'x' + Math.round(or.height)
          + '  border-color=' + cs.borderTopColor + '  box-shadow=' + (cs.boxShadow || 'none').slice(0, 44));
    } else { log('  ! .card.selected 没命中任何元素（选中态没有样式落点）'); }
  }

  /* `rules=<子串>`：**证明某条规则真的活过了 CSS 解析**。
     为什么非有它不可（v0.71.0 的血泪）：CSS 是**静默失败**的 —— 规则文本在文件里、
     grep 得到、verify_dist 的**子串**匹配也绿，但浏览器可能整条丢弃它
     （注释被正文里的结束符提前截断 ⇒ 后半句变非法选择器前奏 ⇒ 吞掉紧随其后的规则）。
     `.exhaust-tag` 就这么被吞过。**唯一能证明它活着的方式**：
       ① 在 document.styleSheets 里**递归**（含 @media 内部）找到这条规则本身；
       ② 造一个同名元素，读 getComputedStyle —— 有样式落点才算数。
     两样都打，缺一不可：①证明规则在表里，②证明它真的作用到这个类上。          */
  function rulesReport(sub) {
    var found = [], total = 0;
    function walk(list, path) {
      for (var i = 0; i < list.length; i++) {
        var r = list[i];
        if (r.type === 4 && r.cssRules) { walk(r.cssRules, path + (r.conditionText ? '@media(' + r.conditionText + ')' : r.cssText.slice(0, 24)) + ' > '); continue; }
        total++;
        if (r.selectorText && r.selectorText.indexOf(sub) >= 0) {
          found.push('    [' + path + '] ' + r.selectorText + ' {' + (r.style ? r.style.cssText : '').slice(0, 120) + '}');
        }
      }
    }
    try {
      for (var s = 0; s < document.styleSheets.length; s++) {
        try { if (document.styleSheets[s].cssRules) walk(document.styleSheets[s].cssRules, ''); } catch (e) { log('    (样式表 ' + s + ' 读不到：' + e.message + ')'); }
      }
    } catch (e) { log('  ! 遍历 styleSheets 失败：' + e.message); }
    log('  规则匹配 "' + sub + '"：在表里找到 ' + found.length + ' 条（共扫过 ' + total + ' 条规则）');
    found.forEach(function (f) { log(f); });
    /* ② 真造一个元素读计算样式。挂到 body 上量完就摘掉，不污染别的量测。 */
    var probe = document.createElement('div');
    probe.className = sub.replace(/^\./, '');
    probe.style.position = 'fixed'; probe.style.left = '-9999px'; probe.style.top = '0';
    document.body.appendChild(probe);
    var cs = window.getComputedStyle(probe);
    log('  探针元素 .' + sub.replace(/^\./, '') + ' 的计算样式：position=' + cs.position
        + '  left=' + cs.left + '  display=' + cs.display
        + '  font-size=' + cs.fontSize + '  z-index=' + cs.zIndex
        + '  background-image=' + (cs.backgroundImage || 'none').slice(0, 40));
    document.body.removeChild(probe);
  }

  function go() {
    try {
      confirmNewGame();
      if (q.get('rules')) { rulesReport(q.get('rules')); return; }
      if (q.get('screen') === 'hero') { heroReport(); return; }
      if (q.get('dialog')) { dialogReport(pick(q.get('dialog')) || 5, q.get('sel') !== '0'); return; }
      pickHero(q.get('hero') || 'tianshi');
      skipOpening();
      /* ⚠️ 必须在这里播种，不能更早：`confirmNewGame()` 自己会 `seedRng(rngSeedNow())`
         无条件重播一次（js/60_boot.js:351），在它之前播种等于没播。
         而 `startBattle` 会抽词缀/徽章 ⇒ **不播种时同一档位的两次量测能差 20px**
         （徽章换行与否），扫参时会把噪声当成信号。默认固定种子，`seed=0` 恢复真随机。 */
      if (typeof seedRng === 'function' && q.get('seed') !== '0') {
        seedRng(pick(q.get('seed')) || 20260928);
      }
      startBattle(ENEMY_IDS());
      if (typeof closeOverlay === 'function') closeOverlay();
      document.body.classList.remove('at-menu');
      G.hand = fakeHand(pick(q.get('n')) || 8);
      /* ⚠️ `#turn-summary` 是**常驻**的（`finishEndTurn` 每次都写它，不是一闪而过），
         而它 :empty 时才隐藏 ⇒ 夹具不填它 = 白送 29px 余量，正是「夹具比实机宽松」
         这一类假绿灯。默认填一条**偏长**的真实文案（会换行的长度），
         `ts=0` 可关掉做对照。 */
      if (q.get('ts') !== '0' && typeof G !== 'undefined') {
        /* 必须写 G.turnSummary 而不是直接改 DOM —— `render()` 会用
           `G.turnSummary || ''` 重写它（js/60_boot.js:261），直接改会被抹掉，
           量出来还是空的（假绿灯）。 */
        G.turnSummary = '第 3 回合结束：你受伤 <b>6</b>（格挡抵消 5） · 对敌造成 <b>12</b> 点伤害 · 击败 纸扎人';
      }
      if (q.get('fill') !== '0' && window.log) {
        ['—— 遭遇 狐妖 ——', '—— 第 1 回合开始 ——', '咒印道体：对敌人施加 1 层诅咒',
         '摸 5 张：雷符、火符、剑符、破布符、聚灵', '你对 纸扎人 造成 6 点伤害',
         '纸扎人 失去 6 点生命', '—— 第 2 回合开始 ——'].forEach(function (s) { try { window.log(s); } catch (e) {} });
      }
      render();
    } catch (e) {
      /* ⚠️ 只打 message 是不够的 —— 这个夹具的前身就是只打 message，
         于是「startBattle 挂了、整套量测都在量一个空战场」这件事藏了很久
         （B 段 #player-panel 200x0 / #enemy-panel 568x2 才是线索）。
         栈必须打出来，否则每次都要重新二分。 */
      log('!! 初始化失败 ' + (e && e.message));
      log('!! 栈 ' + ((e && e.stack) || '(无)').split('\n').slice(0, 6).join('\n!!    '));
      log('!! ⇒ 下面所有数字都是**空战场**的，不可用；先修 go() 再看。');
    }
  }

  function emit() {
    var box = document.createElement('div');
    box.id = '__dbg';
    box.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:99999;background:#000e;'
      + 'color:#0f0;font:11px/1.35 monospace;padding:6px;white-space:pre-wrap;overflow:auto';
    box.textContent = out.join('\n');
    document.body.appendChild(box);
    document.title = 'CLIP';
  }

  function run() {
    try { go(); } catch (e) { out.unshift('GO 抛出：' + (e && e.message) + '\n' + ((e && e.stack) || '')); }
    if (errs.length) {
      out.unshift('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n'
        + '!! 参数有问题，下面的数字**不可信**：\n!!   ' + errs.join('\n!!   ')
        + '\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    }
    log('视口 ' + window.innerWidth + 'x' + window.innerHeight
        + ' · 手牌 ' + (pick(q.get('n')) || 8) + ' 张 · 敌人 '
        + ENEMY_IDS().join(','));
    /* 选英雄屏：后面的越界表 / 高度预算表全是在量**战斗页**的，这里一场战斗都没开，
       硬跑会打出一整张「空战场」的红表 ⇒ 直接收工，只留 heroReport 的输出。 */
    if (q.get('screen') === 'hero') { emit(); return; }
    /* 同上：rules 模式是纯样式表查询，后面的越界表 / 高度预算表对它没有意义。 */
    if (q.get('rules')) { emit(); return; }
    /* 选牌小窗同理：它渲染进 `#overlay`（fixed，不在 `#app *` 里），越界表与高度预算表
       对它一个字都说不上。判据只有 `.panel` 自己的「内部溢出」，已在 dialogReport 里打全。 */
    if (q.get('dialog')) { emit(); return; }
    var modes = q.get('m') ? [q.get('m')] : ['', 'log-open'];
    var names = { '': '战报关  ', 'log-open': '右侧抽屉' };
    modes.forEach(function (m) {
      var lg = document.getElementById('log');
      if (lg) lg.style.transition = 'none';
      setMode(m);
      void document.body.offsetHeight;
      probe('[' + names[m] + ']');
    });
    setMode(q.has('m') ? q.get('m') : '');
    void document.body.offsetHeight;
    budget();
    log('E 红色禁区自查（.hand-area / #hand 的规则体不许有 transform/filter/will-change/perspective）');
    var hit = [];
    /* ⚠️ 口径必须与 verify_dist.py 那条闸**逐字对齐**，否则两边会各报各的：
       · 只认**最后一个复合选择器**是不是 `.hand-area` / `#hand`。
         `.hand-area .endcol{transform:…}` 的主语是 .endcol，不改变 .hand-area 自身的
         包含块语义 ⇒ 不拦。用裸正则 `#hand\b` 会把 `#hand .card{transform:...}`
         （卡牌自身的旋转）误报进来 —— 那不是红线，会让这条自查变成狼来了。
       · 必须**递归进 @media**：矮屏档那几条规则全在 @media 里，`r.type===4 → continue`
         等于把最该看的那一段整个跳过（这正是原先那个版本的漏洞）。 */
    function isHandSubject(txt) {
      return txt.split(',').some(function (one) {
        var last = one.trim().split(/\s+/).pop() || '';
        return last === '#hand' || /\.hand-area$/.test(last);
      });
    }
    function walk(rules, depth) {
      for (var ri = 0; ri < rules.length; ri++) {
        var r = rules[ri];
        if (r.cssRules) { walk(r.cssRules, depth + 1); continue; }   /* @media / @supports */
        var txt = r.selectorText || '';
        if (!isHandSubject(txt)) continue;
        var body = (r.style && r.style.cssText) || '';
        if (/[\w-]*(transform|filter|will-change|perspective)\s*:/.test(body)) {
          hit.push(txt + ' { ' + body.slice(0, 60) + ' }');
        }
      }
    }
    try {
      var ss = document.styleSheets, si;
      for (si = 0; si < ss.length; si++) {
        try { walk(ss[si].cssRules, 0); } catch (e) { hit.push('读不到样式表#' + si + '：' + e.message); }
      }
    } catch (e) { hit.push('读不到样式表：' + e.message); }
    log('   ' + (hit.length ? '✗ ' + hit.join(' | ') : 'none ✓'));
    log('G 夹具自身异常：' + (errs.length ? errs.join(' | ') : 'none'));
    emit();
  }
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run);
})();