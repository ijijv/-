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
      + '#log{transition:none !important;}'
      /* v0.72.0：**`#overlayWrap` 的进场动画也必须掐**。`@keyframes overlayIn` 的起点是
         `scale(.985)`，而 showOverlay 之后夹具立刻量 —— 无头下合成器时钟不推进（`--virtual-time-budget`
         只快进计时器），于是动画冻在起点，**整个面板连卡牌一起被缩了 1.5%**：
         `width:165px` 的卡量出来是 163、`#overlayWrap` 的 1280 量出来是 1261。
         这不是 CSS 的问题、也不是真实浏览器里的样子，但会让「1.25 倍到底生效没有」这类
         逐像素断言永远差 2px ⇒ 必须掐掉，量的才是终态。 */
      + '#overlayWrap{animation:none !important;}';
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
       `--headroom`（JS 按 RISE_LIFT 与弧线槽位表里更大的那个写）+ 单个敌人内部那一摞撑出来的，
       光看总数分不清是哪一半在吃。 */
    var ep = document.getElementById('enemy-panel');
    if (ep) {
      /* v0.72.0：改成**逐只**上报 —— 弧线构图唯一真会出事的地方是几何，
         而几何只有浏览器夹具量得到。每只打：尺寸类 / rect / 两个自定义属性 /
         计算后的 transform（出处见原型.html 的 .enemy 规则），外加两条包含性判据。
         ⚠️ `--ex/--ey` 走 getPropertyValue 而不是读 style 属性：要的是**计算值**，
           内联 style 拿不到 var() 解析后的结果，也看不出规则被丢弃。 */
      var epr = ep.getBoundingClientRect();
      var epcs = cs(ep), pp = document.getElementById('player-panel');
      var ppr = pp ? pp.getBoundingClientRect() : null;
      log('   #enemy-panel 子项（' + ep.children.length + ' 个）'
          + '  ' + Math.round(epr.left) + '→' + Math.round(epr.right)
          + '  padding=' + epcs.paddingTop + ' ' + epcs.paddingRight + ' ' + epcs.paddingBottom + ' ' + epcs.paddingLeft
          + '  --slot-dx-k=' + epcs.getPropertyValue('--slot-dx-k').trim()
          + ' --rise-unit=' + epcs.getPropertyValue('--rise-unit').trim()
          + (ppr ? '  #player-panel ' + Math.round(ppr.left) + '→' + Math.round(ppr.right)
                 + ' 净距 ' + Math.round(epr.left - ppr.right) + 'px' : ''));
      /* ⚠️ 「高出面板上沿」**不是**失败判据，#enemy-panel 没有背景也没有边框（原型.html 那条
         规则里没有 background / border）⇒ 敌人越过它的盒边在视觉上什么都不发生。矮屏档
         正是靠这一点把 padding-top 压到 2px 换高度的。
         真正的失败是**顶进 #topbar** —— 那是 v0.60 修过的实机缺陷（战报被敌人盖住），
         也是弧线纵向振幅唯一真会撞的墙。所以这里分开报：⚠=真失败，( )=只是越过了面板盒边。 */
      var tbar = document.getElementById('topbar');
      var tbr = tbar ? tbar.getBoundingClientRect() : null;
      for (var ei = 0; ei < ep.children.length; ei++) {
        var ee = ep.children[ei], er = ee.getBoundingClientRect(), ecs = cs(ee);
        var w1 = (tbr && er.top < tbr.bottom - 0.5)
          ? '  ⚠顶进顶栏 ' + Math.round(tbr.bottom - er.top) + 'px' : '';
        var w2 = er.right > epr.right + 0.5 ? '  ⚠顶出面板右沿' : '';
        var w3 = (ppr && er.left < ppr.right - 0.5 && er.right > ppr.left + 0.5 && er.top < ppr.bottom && er.bottom > ppr.top)
          ? '  ⚠与玩家面板相交' : '';
        log('     [' + ei + '] ' + String(ee.className || '').replace(/^enemy\s*/, '')
            + '  ' + Math.round(er.width) + 'x' + Math.round(er.height)
            + ' @' + Math.round(er.left) + ',' + Math.round(er.top)
            + '  --ex=' + ecs.getPropertyValue('--ex').trim()
            + ' --ey=' + ecs.getPropertyValue('--ey').trim()
            + '  tf=' + (ecs.transform || 'none')
            + (er.top < epr.top - 0.5 ? '  (高出面板上沿 ' + Math.round(epr.top - er.top) + 'px)' : '')
            + (er.left < epr.left - 0.5 ? '  (左出面板沿 ' + Math.round(epr.left - er.left) + 'px)' : '')
            + w1 + w2 + w3);
      }
      var e0 = ep.children[0];
      if (e0) {
        log('     第 1 只的内部构成：');
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
  function dialogReport(n, sel, scene) {
    var cards = [];
    for (var i = 0; i < n; i++) {
      var c = CARDS[i % CARDS.length];
      var on = sel && i === 0;
      cards.push('<div class="card has-frame ' + (typeof RCOLOR !== 'undefined' ? (RCOLOR[c.rarity] || '') : '')
        + (on ? ' selected' : '') + '">' + cardBody(c)
        + (on ? '<div class="card-extra" style="color:var(--green)">✓ 已选</div>' : '') + '</div>');
    }
    showOverlay('<h2>焚 符 · 弃 牌</h2><p style="color:var(--red)">可弃任意张手牌，每弃 1 张触发一次效果（已选 <b>1</b> 张）</p>'
      + '<div class="reward-cards">' + cards.join('') + '</div>', undefined, scene || undefined);
    measureDialog(n, false);
  }

  /* `live=1`：走**真实**的 renderDiscardSelect()，而不是上面逐字复刻的那份 HTML。
     为什么非有它：dialogReport 的卡面标记是**手抄**的 —— 一旦 renderDiscardSelect 改了类名或结构，
     夹具会继续量一个「已经不存在的界面」并且照样全绿，这正是「夹具与真实代码漂移」的典型形态。
     live 模式下场景类（pick-scene）与桌面档的 1.25 倍卡宽都通过**真实代码路径**生效，漂移风险归零。
     ⚠️ 它必须先有一场正常开局的战斗（G.hand / G 的各字段齐备），所以 go() 里把它排在 render() 之后。
     用法：--q "&dialog=5&live=1"                                            */
  function liveDialogReport(n) {
    if (typeof renderDiscardSelect !== 'function') { log('  ! live：没有 renderDiscardSelect，判定不可用'); return; }
    if (typeof G === 'undefined' || !G || !G.hand) { log('  ! live：G 还没起（要先开局）'); return; }
    G.hand = fakeHand(n);
    /* 复刻 renderDiscardSelect 的入口状态：待选数、已选 0 号（对应老模式的 sel=1，把选中金边也量进去）、
       不挂来源卡（card=null ⇒ 取消时不回手，纯量测用）。 */
    G.discardSelect = { need: n, picked: [0], card: null };
    renderDiscardSelect();
    measureDialog(n, true);
  }

  /* 两条入口共用的量测。live 只改「HTML 从哪来」，判据完全一样 —— 这样两边的数字可直接对照。 */
  function measureDialog(n, live) {
    var panel = document.querySelector('#overlay .panel');
    if (!panel) { log('  ! 选牌小窗：没有 #overlay .panel，判定不可用'); return; }
    var pr = panel.getBoundingClientRect();
    log('  选牌小窗（' + n + ' 张' + (live ? '，live 真实渲染' : '') + '） #overlay .panel  '
        + Math.round(pr.width) + 'x' + Math.round(pr.height)
        + ' @' + Math.round(pr.left) + ',' + Math.round(pr.top)
        + '  内部溢出=' + (panel.scrollHeight - panel.clientHeight));
    /* v0.72.0 §四：这三个计算样式是「去纯色底」能不能被证明的唯一途径 ——
       grep 到规则、子串闸绿，都只说明文本在文件里，不说明它活过了 CSS 解析。
       ⚠️ 纯色底有**两个**来源（.panel 的 --ink2 与 #overlay 的 88% 黑幕），两个都要打。 */
    var ov = document.getElementById('overlay');
    log('  #overlay  class="' + (ov ? (ov.className || '(无)') : '?') + '"'
        + '  backgroundColor=' + (ov ? window.getComputedStyle(ov).backgroundColor : '?'));
    var pcs = window.getComputedStyle(panel);
    log('  .panel computed  background-color=' + pcs.backgroundColor
        + '  border-top-width=' + pcs.borderTopWidth
        + '  padding=' + pcs.paddingTop + ' ' + pcs.paddingLeft
        + '  max-height=' + pcs.maxHeight
        + '  h2 投影=' + (function () {
            var h = panel.querySelector('h2');
            return h ? (window.getComputedStyle(h).textShadow || 'none').slice(0, 52) : '?';
          })());
    var w = document.getElementById('overlayWrap');
    if (w) log('  #overlayWrap  width=' + Math.round(w.getBoundingClientRect().width)
        + '（视口 ' + window.innerWidth + '）  computed max-width=' + window.getComputedStyle(w).maxWidth);
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
      if (ks[0]) {
        var k0 = window.getComputedStyle(ks[0]);
        log('  第 1 张卡的 computed： width=' + k0.width + '  min-height=' + k0.minHeight
            + '  flex=' + k0.flexGrow + '/' + k0.flexShrink + '/' + k0.flexBasis
            + '  （1.25 倍生效时应是 165/250 且不许收缩）');
      }
    }
    var one = document.querySelector('#overlay .card.selected');
    if (one) {
      var cs = window.getComputedStyle(one), or = one.getBoundingClientRect();
      log('  .card.selected 命中  ' + Math.round(or.width) + 'x' + Math.round(or.height)
          + '  border-color=' + cs.borderTopColor + '  box-shadow=' + (cs.boxShadow || 'none').slice(0, 44));
    } else { log('  ! .card.selected 没命中任何元素（选中态没有样式落点）'); }
  }

  /* `forge=1`（配 `&deck=N`）：锻造页（v0.75.0 的 forge-scene）验收。
     走**真实代码路径** `showForgePicker('camp')`，不手抄 HTML —— 类名/结构一旦漂移，
     夹具会继续量一个「已经不存在的界面」还照样全绿（与 live=1 那条同一个理由）。
     六条判据，每条都对着一种真会发生的错法：
       1. `#overlay` 真的挂上了 forge-scene（错法：漏传第三实参 ⇒ 整页还是 620px 窄版）。
       2. `.reward-cards` 的 display 是 grid，且 gridTemplateColumns 的**轨道数**是 3/2/1
          （错法：规则被 CSS 解析器静默丢弃 ⇒ 退回 .reward-cards 基档的 flex，
           这一栏直接读成 `none`）。**轨道数就是「六列/四列」这句承诺唯一的证据。**
       3. 一组 `.forge-pair` 的宽 ≈ 282（132 档）/ 226（104 档）、内含 2 张卡、中间有 svg 箭头
          （错法：两张卡被挤扁 ⇒ 宽高比破掉，has-frame 的百分比子元素全歪）。
       4. `#overlayWrap` 的宽 ≈ 视口宽（错法：基档 max-width:620 没被放开 ⇒ 三组 866px 折行，
          六列不成立）。
       5. `.panel` 的 background-color **不是**透明的 —— 本批明确保留纯色底（与 pick-scene
          刻意相反），顺手抄了 pick-scene 的 background:none 会在这里被抓住。
       6. 右卡描述的 computed color **与左卡不同**（错法：只写了 `.upgrade-preview` 类而没写
          那条高特异度规则 ⇒ `.card .cdesc`(0,2,0) 压过 `.upgrade-preview`(0,1,0)，
          两栏一个色，「红色 = 升级后的效果」这条语汇当场失效，而 grep 与子串闸全绿）。
     ⚠️ 出图走 iframe 模式；--direct 只序列化外层文档。            */
  function forgeReport(deckN) {
    if (typeof showForgePicker !== 'function') { log('  ! forge：没有 showForgePicker，判定不可用'); return; }
    if (typeof G === 'undefined' || !G || !G.deck) { log('  ! forge：G 还没起（要先开局）'); return; }
    /* 牌组不够就补到 deckN 张（抄自己已有的牌，id / up / costU 都合法）。
       `deck=0`（或不传）用原生牌组。卡数越多越容易把「六列」压成折行，是最该压的边界。 */
    if (deckN > 0 && G.deck.length) {
      var base = G.deck.slice(), k = 0;
      while (G.deck.length < deckN) { G.deck.push(Object.assign({}, base[k % base.length])); k++; }
    }
    showForgePicker('camp');
    var ov = document.getElementById('overlay');
    log('  锻造页 #overlay class="' + (ov ? (ov.className || '(无)') : '?') + '"  牌组 ' + G.deck.length + ' 张');
    var panel = document.querySelector('#overlay .panel');
    if (!panel) { log('  ! 没有 #overlay .panel，判定不可用'); return; }
    var pcs = window.getComputedStyle(panel), pr = panel.getBoundingClientRect();
    log('  .panel  ' + Math.round(pr.width) + 'x' + Math.round(pr.height)
        + '  padding=' + pcs.paddingTop + ' ' + pcs.paddingLeft
        + '  background-color=' + pcs.backgroundColor
        + '  内部溢出=' + (panel.scrollHeight - panel.clientHeight));
    var w = document.getElementById('overlayWrap');
    if (w) log('  #overlayWrap width=' + Math.round(w.getBoundingClientRect().width)
        + '（视口 ' + window.innerWidth + '）  computed max-width=' + window.getComputedStyle(w).maxWidth);
    var rc = document.querySelector('#overlay .reward-cards');
    if (!rc) { log('  ! 没有 #overlay .reward-cards，判定不可用'); return; }
    var rcs = window.getComputedStyle(rc);
    var tracks = (rcs.gridTemplateColumns || '').trim();
    /* ⚠️ display 不是 grid 时 computed gridTemplateColumns 是 `none`（一个词）⇒ 轨道数会
       误报成 1。所以**先把 display 一起打出来**，判据由 probe 那边两条一起看。
       ⚠️ v0.76.1：v0.61.42 起的列数由 `repeat(3, max-content)` 换成
       `repeat(auto-fit, <单元格宽>)` 之后，**必须只数非零轨道** —— auto-fit 会把空轨道收成
       `0px`，但它仍占一个词位（实测 1000px 容器 + 4 张卡 ⇒ `229px 0px 0px 229px` 这种），
       直接 split 会把 3 轨数成 5、6 轨。文案格式一字不改（probe 用正则解析 `⇒ 轨道数 (\d+)`）。 */
    var tracksN = 0;
    if (rcs.display === 'grid' && tracks && tracks !== 'none') {
      tracksN = tracks.split(/\s+/).filter(function (s) { return parseFloat(s) > 0; }).length;
    }
    log('  .reward-cards display=' + rcs.display + '  gridTemplateColumns=' + tracks
        + '  ⇒ 轨道数 ' + tracksN);
    var pairs = rc.querySelectorAll('.forge-pair');
    log('  .forge-pair 共 ' + pairs.length + ' 组（可升级的牌才成组）');
    var singles = rc.querySelectorAll(':scope > .card');
    log('  单张卡（已升级 / 不可升级，刻意不配对）' + singles.length + ' 张');
    if (pairs.length) {
      var p0 = pairs[0], qr = p0.getBoundingClientRect();
      var faces = p0.querySelectorAll(':scope > .card');
      log('  第 1 组  ' + Math.round(qr.width) + 'x' + Math.round(qr.height)
          + '  内含卡 ' + faces.length + ' 张'
          + (faces[0] ? '  左卡宽 ' + Math.round(faces[0].getBoundingClientRect().width) : ''));
      var ar = p0.querySelector('.forge-arrow');
      if (ar) {
        var arr = ar.getBoundingClientRect();
        log('  .forge-arrow ' + Math.round(arr.width) + 'x' + Math.round(arr.height)
            + '  内联 svg=' + (ar.querySelector('svg') ? '有' : '无'));
      } else { log('  ! 第 1 组里没有 .forge-arrow'); }
      if (faces.length === 2) {
        var ld = faces[0].querySelector('.cdesc'), rd = faces[1].querySelector('.cdesc');
        log('  左描述类="' + (ld ? ld.className : '?') + '" 色=' + (ld ? window.getComputedStyle(ld).color : '?'));
        log('  右描述类="' + (rd ? rd.className : '?') + '" 色=' + (rd ? window.getComputedStyle(rd).color : '?')
            + '  字重=' + (rd ? window.getComputedStyle(rd).fontWeight : '?')
            + '  margin-top=' + (rd ? window.getComputedStyle(rd).marginTop : '?')
            + '  border-top=' + (rd ? window.getComputedStyle(rd).borderTopWidth : '?'));
        log('  右卡名里带 ↑ = ' + (faces[1].querySelector('.cname') && faces[1].querySelector('.cname').textContent.indexOf('↑') >= 0 ? 'Y' : 'N'));
      } else { log('  ! 第 1 组不是恰好 2 张卡（拿到 ' + faces.length + '）'); }
      /* 排布：按 .forge-pair 的 top 归并出每行几组 —— 「六列」= 每行 3 组。 */
      var rows = {}, order = [];
      for (var j = 0; j < pairs.length; j++) {
        var t = Math.round(pairs[j].getBoundingClientRect().top);
        if (rows[t] === undefined) { rows[t] = 0; order.push(t); }
        rows[t]++;
      }
      order.sort(function (a, b) { return a - b; });
      log('  组-行数 ' + order.length + '（每行 ' + order.map(function (t) { return rows[t]; }).join('/') + '）');
    } else { log('  ! 一组都没有（牌组里一张可升级的牌都没有？）'); }
  }

  /* `pile=draw|discard`（v0.76.0 的 pile-scene）：点牌堆看内容的面板验收。
     与 forgeReport 同一个理由走**真实代码路径** `showPile(kind)`，不手抄 HTML ——
     类名/结构一旦漂移，夹具会继续量一个「已经不存在的界面」还照样全绿。
     判据（每条对着一种真会发生的错法）：
       1. `#overlay` 真的挂上 pile-scene（错法：漏传第三实参 ⇒ 整页还是 620px 窄版）。
       2. `.reward-cards` 的 display 是 grid，且轨道数是 3 / ≤700 变 2 / ≤560 变 1
          （错法：CSS 分组规则被解析器静默丢弃 ⇒ 退回 .reward-cards 基档的 flex，
           这一栏读成 `none`、轨道数误报 0）。**轨道数就是这套排列唯一的证据。**
       3. `#overlayWrap` 的宽 ≈ 视口宽（错法：基档 max-width:620 没被放开）。
       4. `.panel` 的 background-color **不是**透明的 —— 与 forge-scene 同一条约定。
       5. 面板里**一个** `.forge-pair` / `.upgrade-preview` / `.forge-arrow` 都没有
          （错法：把 forge-scene 那三条容器规则复制第二份时，把对照件一起带过来）；
          也**没有** `.card[onclick]`（会与长按放大抢事件）。
       6. 卡数与牌堆数一致；且抽牌堆那一次**不泄露顺序**（见下）。
     ⚠️ 出图走 iframe 模式；--direct 只序列化外层文档。            */
  function pileReport(kind) {
    if (typeof showPile !== 'function') { log('  ! pile：没有 showPile，判定不可用'); return; }
    if (typeof G === 'undefined' || !G) { log('  ! pile：G 还没起（要先开局）'); return; }
    var isDraw = (kind !== 'discard');
    var src = isDraw ? G.drawPile : G.discard;
    /* 牌堆空就播一点种（抄自己牌组里的牌，id / up / costU 都合法）——
       否则夹具量的是一个**弹了浮字就收工**的空面板，比不量还坏。 */
    if (!src.length) {
      var pool = (G.deck && G.deck.length) ? G.deck : (G.hand || []);
      if (!pool || !pool.length) { log('  ! pile：牌组与手牌都空，无从播种'); return; }
      if (isDraw) {
        for (var k = 0; k < 7; k++) { G.drawPile.push(Object.assign({}, pool[k % pool.length])); }
      } else {
        for (var m = 0; m < 5; m++) {
          /* 从抽牌堆搬 —— 弃牌堆本来就该是「打出过的牌」，从牌组另抄一份会让
             `#overlay` 里的卡与两个堆的读数对不上。 */
          if (G.drawPile.length) { G.discard.push(G.drawPile.shift()); }
          else { G.discard.push(Object.assign({}, pool[m % pool.length])); }
        }
      }
      src = isDraw ? G.drawPile : G.discard;
    }
    /* 顺序判据：showPile 不许动真牌序。**快照必须在调用之前取**。
       ⚠️ 不能只看调用后的那个数组引用：shuffle 就地打乱时 `src` 引用不变、内容变了
       （能抓到），但写成 `G.drawPile = shuffle(G.drawPile)` 时引用换了 —— 那种写法的
       错法只有重新读 `G.drawPile` 才看得见。所以**前**取 `src`、**后**重新取 `G`。
       对不上就是 `.slice()` 漏了。 */
    var ids = function (a) { return a.map(function (c) { return (c && c.id) || '?'; }).join(','); };
    var before = ids(src);
    showPile(kind);
    var ov = document.getElementById('overlay');
    log('  牌堆页 kind=' + (isDraw ? 'draw' : 'discard') + '  #overlay class="'
        + (ov ? (ov.className || '(无)') : '?') + '"  该堆 ' + src.length + ' 张');
    var panel = document.querySelector('#overlay .panel');
    if (!panel) { log('  ! 没有 #overlay .panel，判定不可用'); return; }
    var pcs = window.getComputedStyle(panel), pr = panel.getBoundingClientRect();
    log('  .panel  ' + Math.round(pr.width) + 'x' + Math.round(pr.height)
        + '  padding=' + pcs.paddingTop + ' ' + pcs.paddingLeft
        + '  background-color=' + pcs.backgroundColor
        + '  overflow-y=' + pcs.overflowY
        + '  内部溢出=' + (panel.scrollHeight - panel.clientHeight));
    var w = document.getElementById('overlayWrap');
    if (w) log('  #overlayWrap width=' + Math.round(w.getBoundingClientRect().width)
        + '（视口 ' + window.innerWidth + '）  computed max-width=' + window.getComputedStyle(w).maxWidth);
    var rc = document.querySelector('#overlay .reward-cards');
    if (!rc) { log('  ! 没有 #overlay .reward-cards，判定不可用'); return; }
    var rcs = window.getComputedStyle(rc);
    var tracks = (rcs.gridTemplateColumns || '').trim();
    /* ⚠️ 与 forgeReport 同一条坑：display 不是 grid 时 computed gridTemplateColumns
       是 `none`（一个词）⇒ 轨道数会误报成 1。所以 display 一起打，由 probe 两条一起看。
       ⚠️ v0.76.1：与 forgeReport 一样**只数非零轨道**（auto-fit 把空轨道收成 `0px`
       但仍占词位）—— 理由与那处长注释完全相同，别只改一处。 */
    var tracksN = 0;
    if (rcs.display === 'grid' && tracks && tracks !== 'none') {
      tracksN = tracks.split(/\s+/).filter(function (s) { return parseFloat(s) > 0; }).length;
    }
    log('  .reward-cards display=' + rcs.display + '  gridTemplateColumns=' + tracks
        + '  ⇒ 轨道数 ' + tracksN);
    var cards = rc.querySelectorAll(':scope > .card');
    log('  卡 ' + cards.length + ' 张（该堆 ' + src.length + ' 张）'
        + (cards[0] ? '  首卡 ' + Math.round(cards[0].getBoundingClientRect().width)
                      + 'x' + Math.round(cards[0].getBoundingClientRect().height) : ''));
    /* 5 条禁用件：锻造页专属的对照结构与升级预览一律不许出现。 */
    log('  forge 残留  .forge-pair=' + rc.querySelectorAll('.forge-pair').length
        + '  .upgrade-preview=' + rc.querySelectorAll('.upgrade-preview').length
        + '  .forge-arrow=' + rc.querySelectorAll('.forge-arrow').length
        + '  .card[onclick]=' + rc.querySelectorAll('.card[onclick]').length);
    /* 抽牌堆那一次的**顺序**判据（快照在函数开头取，见上）：showPile 不许动真牌序。 */
    var after = ids(isDraw ? G.drawPile : G.discard);
    log('  真牌序 ' + (isDraw ? 'drawPile' : 'discard') + ' 前=' + before);
    log('  真牌序 ' + (isDraw ? 'drawPile' : 'discard') + ' 后=' + after
        + '  ⇒ ' + (before === after ? '未被动过' : '!! 被改写了'));
    /* ⚠️ 这里**不许**照 liveDialogReport（:656）那样收尾 `closeOverlay()`。
       本夹具的两种用法是「--dump 读数字」与「实拍看图」，而 `--dump-dom` 抓的是
       `#__dbg` 里那段**已经拼好的字符串**（emit 之后不再变），关不关面板都不影响读数；
       截图却是**预算耗尽那一刻**的画面 —— 面板一关，图里就只剩战场，
       于是「数字全对、图上什么都没有」。v0.76.0 的牌堆面板实测正是栽在这一行上：
       `#overlay class="ov-enter pile-scene"` / 轨道数 3 / 真牌序未被动过 全部为真，
       而每一张截图都是战斗页。forgeReport 没有这一行，所以锻造页的图一直是好的。
       run() 末尾对 pile 是 `emit(); return;`，后面没有任何量测依赖「面板已关」⇒ 删掉安全。 */
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
        /* v0.72.0：@keyframes 是 type===7，原来**不递归** ⇒ 写在关键帧里的位移/缩放
           根本没有验证路径（step 1 修的 enemyDie / shake 就卡在这）。
           递归进去并按**名字**匹配（关键帧没有 selectorText，用 sub 去比 selectorText
           永远找不到），把每个停靠点原样打出来 —— 漏一个停靠点就会跳回原点。 */
        if (r.type === 7 && r.cssRules) {
          total++;
          if (r.name && r.name.indexOf(sub) >= 0) {
            for (var k = 0; k < r.cssRules.length; k++) {
              var kf = r.cssRules[k];
              found.push('    [' + path + '@keyframes ' + r.name + '] ' + (kf.keyText || '?') + ' {' + (kf.style ? kf.style.cssText : '') + '}');
            }
          }
          continue;
        }
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
      if (q.get('dialog') && !q.get('live')) {
        dialogReport(pick(q.get('dialog')) || 5, q.get('sel') !== '0', q.get('scene') || ''); return;
      }
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
      /* v0.72.0：live 选牌小窗排在最后 —— 它用的是真实 renderDiscardSelect()，
         要有 G.hand 与一场已开局的战斗才成立（上面那几行正是在备这些）。 */
      if (q.get('dialog')) { liveDialogReport(pick(q.get('dialog')) || 5); }
      /* v0.75.0：forge 排在最后同理 —— showForgePicker 要有 G.deck。 */
      if (q.get('forge')) { forgeReport(pick(q.get('deck')) || 0); }
      /* v0.76.0：pile（点抽牌堆/弃牌堆看内容）也要先有一场开局 ⇒ 一起排在最后。
         ⚠️ 它排在 forge 之后：两者都往 #overlay 里写，同一次跑里只该开一个。 */
      if (q.get('pile')) { pileReport(q.get('pile') === 'discard' ? 'discard' : 'draw'); }
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
    /* `&quiet=1`：照常跑完所有量测、只是**不铺那层全屏日志**。
       给「实拍看构图」用 —— 日志盒是 #000e 的全屏遮罩，图里只剩剪影看不出弧线。
       量数字仍走 --dump（--dump 抓的是 DOM 文本，跟这层盒子无关）。 */
    if (q.get('quiet')) { document.title = 'CLIP'; return; }
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
    /* v0.75.0：锻造页也渲染进 #overlay（fixed，不在 `#app *` 里）⇒ 越界表/高度预算表
       对它一个字都说不上。判据全在 forgeReport 里。 */
    if (q.get('forge')) { emit(); return; }
    /* v0.76.0：牌堆页同理（同一个 #overlay）。 */
    if (q.get('pile')) { emit(); return; }
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