/* v0.66.0 专用驱动：主菜单**全屏横屏**重做的眼睛。
   为什么不用 _drvmenu.js（v0.65.0 那版）：它量的全是「居中一列」时代的容器
   （.menu-root 背景、.menu-col 是否溢出、.menu-tier 的入场动画、.menu-tier.is-main .btn 的尺寸），
   v0.66.0 把这些全换掉了 —— 继续用它只会得到一堆 MISSING。

   本驱动回答 4 个问题（都是冒烟测不到的：VM 里 getBoundingClientRect 恒 10×10）：
     Q1 布局：标题 / 左石碑列 / 右符纸行 三块的**实际矩形**，以及它们两两是否相撞。
        这是本轮最大的风险 —— 石碑与符纸裁掉透明边距后是 0.25~0.55:1 的细高条，
        用 width 定尺寸会在矮屏把整列撑爆（640×360 实测 top 算出负值）。所以必须两端都量。
     Q2 素材：6 张图的 naturalWidth/naturalHeight —— 404 的话 imgFail() 已经把 <img> 换成
        文字兜底（.menu-fb），这里能直接看出「有没有悄悄退化成文字」。
     Q3 轮换：连进 4 次主界面，把 .menu-bgimg.a 的 backgroundImage 记下来 ⇒ 必须三张循环、
        第 4 次回到第 1 张。
     Q4 碎片：5 片 .menu-shard 都在、clip-path 都算得出、且**拼满**画布（5 片的面积和 = 1）。

   用法：
     python _patch/shot.py --drv _patch/_drvmenu2.js --widths 1280 --h 720 --clean --out _patch/_shot_menu2.png
     python _patch/shot.py --drv _patch/_drvmenu2.js --widths 640  --h 360 --dump
*/
(function () {
  var errs = [];
  window.onerror = function (m, u, l) { errs.push(m + ' @' + l); };
  var q = new URLSearchParams(location.search);
  var box = null;

  /* v0.76.1：`css=` 参数与 _drvclip.js 的同名参数**同一套约定** —— 把候选 CSS 注入到 head
     末尾（同特异度时后来者胜），用来扫参 / 造出「宿主小游戏那一层」才有的条件。
     本批的用处：`--q "&css=:root{--sys-cap-r:130px}"` 假装 TapTap 那枚原生胶囊占了右侧
     130px，看主菜单右上角那三枚法器有没有真的整体左移（真实宿主里 --sys-cap-r 由
     js/60_boot.js 的 sysSafeInit() 写，无头里没有 tt/wx/dd/qq ⇒ 只能手工注入）。 */
  (function () {
    var extra = q.get('css');
    if (!extra) return;
    var st = document.createElement('style');
    st.textContent = extra;
    (document.head || document.documentElement).appendChild(st);
  })();

  function badge(t) {
    if (q.get('clean')) { document.title = 'DBG(clean)'; return; }
    if (!box) {
      box = document.getElementById('__dbg');
      if (!box) {
        box = document.createElement('div');
        box.id = '__dbg';
        box.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;background:#000c;color:#0f0;'
          + 'font:11px/1.35 monospace;padding:4px 6px;max-width:100%;white-space:pre-wrap';
        document.body.appendChild(box);
      }
    }
    box.textContent = t;
  }
  function cs(el, p) { try { return getComputedStyle(el).getPropertyValue(p); } catch (e) { return 'ERR'; } }
  function R(sel) {
    var el = (function () { try { return document.querySelector(sel); } catch (e) { return null; } })();
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
             el: el };
  }
  function fmt(r) { return r ? (r.x + ',' + r.y + ' ' + r.w + 'x' + r.h) : 'MISSING'; }
  function hit(a, b) {   // 两块矩形是否相交（留 2px 容差，抗亚像素）
    if (!a || !b) return false;
    return a.x < b.x + b.w - 2 && b.x < a.x + a.w - 2 && a.y < b.y + b.h - 2 && b.y < a.y + a.h - 2;
  }
  function inView(r, W, H) {
    if (!r) return 'MISSING';
    return (r.x >= -2 && r.y >= -2 && r.x + r.w <= W + 2 && r.y + r.h <= H + 2) ? 'ok' : '⚠出屏';
  }

  function report() {
    var W = window.innerWidth, H = window.innerHeight;
    var st = ['=== v0.66.0 主菜单（' + W + 'x' + H + '）==='];
    st.push('A 视口 vpW=' + W + ' vpH=' + H + ' docW=' + document.documentElement.clientWidth);

    /* ⚠️ 量的是**标题图**不是 .menu-titlebar：标题栏是 left:0;right:0 满宽容器（用 text-align
       居中，不靠 transform —— 见 原型.html 里那条注释），量它只会恒得 0,0 W×h，
       既看不出偏没偏，还会和符纸行算出假"⚠撞"。 */
    var tb = R('.menu-title img.menu-art') || R('.menu-title .menu-fb') || R('.menu-titlebar');
    var cs1 = R('.menu-col-stele'), tr = R('.menu-row-talis');
    st.push('B 标题图 ' + fmt(tb) + ' 居中偏差=' + (tb ? Math.round(tb.x + tb.w / 2 - W / 2) : '?')
      + 'px ' + inView(tb, W, H));
    st.push('C 石碑列 ' + fmt(cs1) + ' ' + inView(cs1, W, H));
    st.push('D 符纸行 ' + fmt(tr) + ' ' + inView(tr, W, H));
    /* 三块两两不相撞。⚠️ 标题与石碑列在窄屏**纵向**会略交叠（640×360 实测），但横向完全错开
       （标题居中、石碑贴左）⇒ 所以这里报的是「矩形相交」，真要判死的是横向那一段。 */
    st.push('E 撞? 标题/石碑=' + (hit(tb, cs1) ? '⚠撞' : 'ok')
      + ' 标题/符纸=' + (hit(tb, tr) ? '⚠撞' : 'ok')
      + ' 石碑/符纸=' + (hit(cs1, tr) ? '⚠撞' : 'ok')
      + '　横叠(标题右沿-石碑右沿)=' + (tb && cs1 ? (tb.x - (cs1.x + cs1.w)) : '?'));

    var hits = document.querySelectorAll('.menu-hit');
    var names = ['入塔', '续', '图鉴', '排行', '设置'], lines = [], xs = [];
    for (var i = 0; i < hits.length; i++) {
      var r = hits[i].getBoundingClientRect();
      var im = hits[i].querySelector('img.menu-art');
      lines.push((hits[i].className.replace('menu-hit ', '') || '?') + '=' + Math.round(r.width) + 'x'
        + Math.round(r.height) + (im ? '' : ' [无图→文字兜底]')
        + (hits[i].disabled ? ' [disabled✓]' : ''));
      if (hits[i].className.indexOf('is-continue') > 0 || hits[i].className.indexOf('is-start') > 0) xs.push(r);
    }
    st.push('F 5 个热区×' + hits.length + '：' + lines.join('  '));
    /* 触控热区下限：符纸在矮屏只有 ~24px 宽，靠 .menu-hit 的 min-width/min-height 补到 48。
       这条量的是**补上之后**的真实值 —— 补漏了在手机上就是点不中。 */
    var small = [];
    for (var j = 0; j < hits.length; j++) {
      var rr = hits[j].getBoundingClientRect();
      if (rr.width < 47 || rr.height < 47) small.push(names[j] || j);
    }
    st.push('G 热区 <48px 的：' + (small.length ? '⚠' + small.join(',') : '无 ok'));

    /* 三张符纸互不重叠 —— demo 用 right:18%/12%/6% 平铺，小尺寸 16:9 下会叠；改成 flex+gap 就是为了这个 */
    var tj = document.querySelectorAll('.menu-row-talis .menu-hit'), ov = [];
    for (var a = 0; a < tj.length; a++) for (var b = a + 1; b < tj.length; b++) {
      var ra = tj[a].getBoundingClientRect(), rb = tj[b].getBoundingClientRect();
      if (ra.left < rb.right - 2 && rb.left < ra.right - 2) ov.push(a + '-' + b);
    }
    st.push('H 符纸互叠：' + (ov.length ? '⚠' + ov.join(',') : '无 ok'));

    /* Q2 素材：404 会被 imgFail() 换成 .menu-fb 文字 ⇒ naturalWidth=0 且 .menu-fb 出现 */
    var arts = document.querySelectorAll('.menu-hit img.menu-art');
    var nat = [];
    for (var k = 0; k < arts.length; k++) {
      nat.push((arts[k].className.replace('menu-art', '').trim() || k) + ':'
        + arts[k].naturalWidth + 'x' + arts[k].naturalHeight);
    }
    var ti = document.querySelector('.menu-title img.menu-art');
    st.push('I 素材(标题 ' + (ti ? ti.naturalWidth + 'x' + ti.naturalHeight : 'MISSING') + ') '
      + nat.join(' ') + '　文字兜底×' + document.querySelectorAll('.menu-fb').length + '(必须 0)');

    /* Q4 碎片：5 片都在、clip-path 算得出、且拼满画布 */
    var sh = document.querySelectorAll('.menu-shard');
    var s0 = sh.length ? sh[0] : null;
    st.push('J 碎片×' + sh.length + '(必须 5/石碑) clip=' + (s0 ? cs(s0, 'clip-path').slice(0, 46) : 'MISSING'));
    var art0 = document.querySelector('.menu-hit.is-start .menu-art');
    var box0 = document.querySelector('.menu-hit.is-start .menu-artbox');
    if (art0 && box0) {
      var ra0 = art0.getBoundingClientRect(), rb0 = box0.getBoundingClientRect();
      st.push('K 碎片盒对齐：art=' + Math.round(ra0.width) + 'x' + Math.round(ra0.height)
        + ' box=' + Math.round(rb0.width) + 'x' + Math.round(rb0.height)
        + (Math.abs(ra0.width - rb0.width) < 2 && Math.abs(ra0.height - rb0.height) < 2 ? ' 对齐✓' : ' ⚠错位'));
    }

    st.push('L 背景 bgimg.a=' + String(cs(document.querySelector('.menu-bgimg.a') || document.body,
      'background-image')).slice(-40));
    st.push('M root h=' + (function () {
      var r = R('.menu-root'); return r ? r.h + '/' + H + (r.h === H ? ' ok' : ' ⚠没铺满') : 'MISSING';
    })());
    st.push('N errs=' + (errs.length ? errs.join(' | ') : '0'));
    /* 最上层命中谁 —— 截图里看见「不该有的东西」时，这条能立刻说出它是谁的孩子，
       不用瞎猜（v0.66.0 就是靠它认出顶部那截淡色圆角块是底层页面自己的 <h1>）。 */
    st.push('Q 顶部中央(W/2,4)最上层：' + (function () {
      var el = document.elementFromPoint(Math.round(W / 2), 4), s = [], n = 0;
      while (el && n++ < 4) {
        s.push(el.tagName + (el.id ? '#' + el.id : '')
          + (el.className ? '.' + String(el.className).trim().split(/\s+/).join('.') : ''));
        el = el.parentElement;
      }
      return s.join(' < ') || '(null)';
    })());
    /* 全文档扫「底边贴着视口顶」的窄元素 —— 专治「截图里看见一条不属于任何已知布局的边」。
       判据用 bottom 而不是 top：一个从屏幕外伸进来的框，top 是负的、bottom 才是能看见的那条边。
       ⚠️ 必须在 **body *** 上扫，不能只扫 #overlay 内 —— 盖在 overlay 之上的层不在它的子树里，
       只扫子树会得出「顶部什么都没有」的错误结论。 */
    st.push('S 底边贴顶的元素：' + (function () {
      var out = [], all = document.querySelectorAll('body *');
      for (var i = 0; i < all.length; i++) {
        var r = all[i].getBoundingClientRect();
        if (r.width > 60 && r.width < 800 && r.bottom > -6 && r.bottom < 16 && r.height < 300) {
          out.push(all[i].tagName + (all[i].id ? '#' + all[i].id : '') + '.'
            + (String(all[i].className).trim().split(/\s+/).join('.') || '-')
            + ' ' + Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width)
            + 'x' + Math.round(r.height) + ' b=' + Math.round(r.bottom));
        }
      }
      return out.join(' | ') || '(空)';
    })());
    /* 顶部 26px 内所有有面积的元素（含 pointer-events:none 的）—— Q 命中的可能是某个
       「不吃点击但看得见」的层，这条把嫌疑犯全列出来。 */
    st.push('R 顶部26px内的元素：' + (function () {
      var out = [], all = document.querySelectorAll('#overlay, #overlay *');
      for (var i = 0; i < all.length; i++) {
        var r = all[i].getBoundingClientRect();
        if (r.width > 1 && r.height > 1 && r.top < 26 && r.bottom > -26) {
          out.push(all[i].tagName + '.' + (String(all[i].className).trim().split(/\s+/).join('.') || '-')
            + ' ' + Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x'
            + Math.round(r.height) + '/op' + cs(all[i], 'opacity'));
        }
      }
      return out.join(' | ') || '(空)';
    })());
    return st.join('\n');
  }

  /* Q3 轮换：连进 4 次主界面，记下每次 .menu-bgimg.a 实际拿到的图。
     ⚠️ 必须 hide→show 成对（同 _drvmenu.js 的教训）：只调 showStartScreen 的话 overlay 本来就开着，
        门闩算出 wasOpen=true ⇒ ov-enter 被摘掉，看起来像"动画没生效"（其实是门闩正确工作）。 */
  function rotate() {
    var seq = [];
    for (var i = 0; i < 4; i++) {
      hideOverlay(); showStartScreen();
      var a = document.querySelector('.menu-bgimg.a');
      var bi = a ? String(cs(a, 'background-image')) : '';
      var m = bi.match(/menu[_]?[0-9]|menu_[0-9]/);
      seq.push((m ? m[0] : (bi === 'none' || !bi ? 'NONE' : bi.slice(-28))) + '(idx' + SAVE.menuBgIdx + ')');
    }
    return seq.join(' → ');
  }

  function go() {
    try {
      /* 定帧模式：不进 700ms 量测，**立刻**起演出，靠 --virtual-time-budget=<ms> 决定拍到第几帧。
         ⚠️ 用 --clean 关掉角标，否则角标会盖住画面。 */
      /* ?lowspec=1：低配档。要证的是「动画被关掉后演出**不卡死**」——
       steleBreak 的收尾走的是定时器而不是 animationend，所以低配下应当**更快**结束（60ms）。 */
      if (q.get('lowspec') !== null) {
        try { SETTINGS.lowSpec = true; applyLowSpec(); } catch (e) { errs.push('lowspec:' + e.message); }
      }
      /* ?missing=1：故意把「入塔」那张图指到不存在的路径 —— imgFail() 必须把它换成文字兜底
       （.menu-fb），而不是留一个点不动的空框。 */
      if (q.get('missing') !== null) {
        setTimeout(function () {
          var im = document.querySelector('.menu-hit.is-start img.menu-art');
          if (im) im.src = '素材/ui/menu/__no_such_file__.png';
        }, 20);
      }
      var mode = q.get('shatter') !== null ? 'shatter'
        : (q.get('talis') !== null ? 'talis' : (q.get('scroll') !== null ? 'scroll' : null));
      if (typeof hideOverlay === 'function') hideOverlay();
      if (typeof showStartScreen === 'function') showStartScreen();
      if (mode) {
        if (mode === 'shatter') steleBreak(document.querySelector('.menu-hit.is-start'), function () {});
        /* talis = **只**测「纸下拉」：fn 传空函数，主菜单才留得住。
           ⚠️ 真传 viewBestiary 的话，talisOpen 的 150ms setTimeout 在虚拟时钟下**立刻**到期，
              overlay 内容被整个换掉，拍到的只会是图鉴面板，根本看不到下拉。
           卷轴下落另开 ?scroll=1（那条走的就是生产的 viewBestiary）。 */
        else if (mode === 'talis') talisOpen(document.querySelector('.menu-hit.is-collection'), function () {});
        else if (typeof viewBestiary === 'function') viewBestiary();
        /* ?pin=<ms>：把演出**钉**在第 ms 毫秒 —— 负 animation-delay + paused。
           ⚠️ 别指望用 --virtual-time-budget 定帧：虚拟时钟喂得动 setTimeout，但**喂不动
              CSS 动画的时钟**（实测 budget=450 与 760 两帧逐像素几乎相同，max 差 19、
              均值 1.56 —— 因为两次的真实耗时接近，动画都停在同一个真实时刻）。
              负 delay 是唯一与时钟无关的定帧法。延迟要**减去**本元素原有的 animation-delay，
              否则 5 片碎片错峰 0/.04/.08/.12/.16s 的节奏会被抹平。 */
        var pin = q.get('pin');
        if (pin !== null) {
          var ms = parseFloat(pin) || 0;
          var SEL = {
            shatter: '.menu-shard, .menu-flash, .menu-hit.is-breaking .menu-art',
            talis: '.menu-hit.tug .menu-art',   // 纸下拉（menuTug）
            scroll: '#overlayWrap'              // 卷轴下落（scrollDrop）
          };
          var els = document.querySelectorAll(SEL[mode]);
          /* ?talis 的 menuTug 挂在 `.tug` 类上，而 talisOpen 的 150ms 计时器会把它摘掉 ——
             虚拟时钟下那个计时器**在截图前**就到期了，类一摘，选择器不匹配，动画整个消失，
             量出来三帧一模一样（踩过）。所以定帧时把动画直接写进 inline style，
             与 `.tug` 的生命周期解耦。 */
          var FORCE = { talis: 'menuTug .15s ease-out' };
          for (var pi = 0; pi < els.length; pi++) {
            if (FORCE[mode]) els[pi].style.animation = FORCE[mode];
            var pd = (parseFloat(cs(els[pi], 'animation-delay')) || 0) * 1000;
            /* .menu-flash 的 .on 是 steleBreak 之后 **800ms**（tFlash）才挂上的，
               它的动画时间轴比碎片晚 800ms 起步 ⇒ 单独扣掉；不扣的话 pin=930 时
               它已经播完，看到的是「没闪」，会误判成闪没生效。 */
            var off = els[pi].classList.contains('menu-flash') ? 800 : 0;
            els[pi].style.animationDelay = (pd - (ms - off)) + 'ms';
            els[pi].style.animationPlayState = 'paused';
          }
        }
        return;   // 定帧模式不量测、不打角标
      }
      /* ?leak=1：场景类泄漏 —— showOverlay 开面板前必须把 map-scene / menu-scene / scroll-scene
         **三个都摘掉**。少摘一个，卷轴/全屏菜单的样式就会跟到别的界面上（比如地图被套上卷轴动画）。 */
      if (q.get('leak') !== null) {
        setTimeout(function () {
          var cls = function () {
            var o = document.querySelector('#overlay');
            return o ? o.className : 'MISSING';
          };
          /* ⚠️ 这里**不要**调 showMap()：G 为 null（还没开局）时它自己就会抛
             「reading 空值.endless」—— 那是「没开局不能开地图」的正常反应，不是泄漏。
             要验的是**类名交接**，所以直接用 showOverlay 造出各种 scene 更干净。 */
          var log = [];
          hideOverlay(); showStartScreen();
          log.push('进菜单 → ' + cls());
          viewBestiary();
          log.push('图鉴(scroll) → ' + cls());
          showOverlay('<h2>普通面板</h2>', true);          // 不带 scene 参
          log.push('再开普通面板 → ' + cls() + '　← 必须一个场景类都不剩');
          showOverlay('<h2>地图面板</h2>', true, 'map-scene');
          log.push('地图(map) → ' + cls());
          showOverlay('<h2>普通面板</h2>', true);
          log.push('再开普通面板 → ' + cls());
          hideOverlay(); showStartScreen();
          log.push('回菜单 → ' + cls());
          badge(log.join('\n'));
        }, 0);
        return;
      }
      var rot = '';
      try { rot = rotate(); } catch (e) { rot = 'THROW ' + e.message; }
      /* ⚠️ 等到 700ms 再量：overlayIn(.3s) 与 menuRise(.38s + 140ms 错峰) 还在跑时，
         #overlayWrap 上挂着 scale(.985) translateY(10px) ⇒ getBoundingClientRect 量到的
         .menu-root 会比视口矮一截（实测 612.67/622），看着像"没铺满"，其实只是动画中途。 */
      setTimeout(function () {
        var t = report() + '\nO 四次轮换：' + rot;
        badge(t);
        // 演出样本：点一次「入塔」，拍 t≈300ms（正在碎）与 t≈950ms（该切场景了）
        if (q.get('fx')) {
          var btn = document.querySelector('.menu-hit.is-start');
          if (btn && typeof steleBreak === 'function') {
            /* 用**真实调用形态**测防连点：生产代码就是 steleBreak(this, startGame)，
               所以把 startGame 换成计数器再原样传进去 —— MENU_BUSY 闸一旦失效，
               三次点击会各自走到底 ⇒ startCalls 变 3。 */
            var keep = window.startGame, startCalls = 0;
            window.startGame = function () { startCalls++; };
            steleBreak(btn, window.startGame);
            steleBreak(btn, window.startGame);   // 连点第 2 次：必须被 MENU_BUSY 吃掉
            steleBreak(btn, window.startGame);   // 连点第 3 次：同上
            setTimeout(function () {
              var f = document.querySelector('.menu-flash');
              /* ⚠️ `>= 0` 必须自己加括号：`+` 的优先级**高于** `>=`，不括的话
                 '...is-breaking=' + idx >= 0 + ' flash=...' 会被解析成
                 (整串) >= (0 + ' flash=...') ——字符串比大小恒得 true，badge 里只剩 "true"。 */
              badge(report() + '\nO 四次轮换：' + rot
                + '\nP 连点 3 次 → startGame 被调 ' + startCalls + ' 次（必须 1）'
                + ' busy=' + MENU_BUSY
                + ' is-breaking=' + (btn.className.indexOf('is-breaking') >= 0)
                + ' flash=' + (f ? f.className + '/op' + cs(f, 'opacity') : 'MISSING'));
            }, 950);
            window.startGame = keep;
          }
        }
      }, 700);
    } catch (e) {
      badge('THROW ' + e.message);
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(go, 0);
  else window.addEventListener('DOMContentLoaded', function () { setTimeout(go, 0); });
})();