/* 一次性调试驱动：量「里程碑」整屏场景的几何（v1.0.23 重做后核对）。
   跑法：
     python _patch/shot.py --direct --drv _patch/_drvmile3.js --widths 1280 --h 720 --clean --dump
     python _patch/shot.py --direct --drv _patch/_drvmile3.js --widths 844  --h 475 --clean --dump
   可选查询串：
     &alt=<heroId>   切到该角色后再量一次（验「未选中 2/3 → 选中全幅」）
   —— 只往 #__dbg 里吐 JSON，不改游戏任何状态。 */
(function () {
  var errs = [];
  window.addEventListener('error', function (e) { errs.push('' + (e.message || e)); });
  function box(el) { return el.getBoundingClientRect(); }
  function rc(el) {
    if (!el) return null;
    var b = box(el);
    return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) };
  }
  function q(s) { return document.querySelector(s); }
  function qa(s) { return [].slice.call(document.querySelectorAll(s)); }

  function report(tag) {
    var ov = q('#overlay.mile-scene'), root = q('.ml-root');
    var heroes = q('.ml-heroes'), stage = q('.ml-stage'), sc = q('.ml-scroll'), tr = q('.ml-track');
    var out = { tag: tag, vp: [innerWidth, innerHeight], errs: errs.slice(0, 5) };
    out.overlay = rc(ov);
    out.root = rc(root);
    out.heroes = rc(heroes);
    out.stage = rc(stage);
    /* v1.0.25 新增：两层浮叠是否真的「无边界」、海报列是否被裁、轨线落点、可滚性。 */
    if (root) {
      var rs = getComputedStyle(root);
      out.pw = rs.getPropertyValue('--pw').trim();
      out.railY = rs.getPropertyValue('--rail-y').trim();
    }
    if (stage) {
      var ss = getComputedStyle(stage);
      out.stageStyle = { pos: ss.position, border: ss.borderTopWidth, radius: ss.borderTopLeftRadius,
                         bg: ss.backgroundColor, z: ss.zIndex };
    }
    if (heroes) {
      out.heroesScroll = { clientW: heroes.clientWidth, scrollW: heroes.scrollWidth,
                           clientH: heroes.clientHeight, scrollH: heroes.scrollHeight,
                           padR: getComputedStyle(heroes).paddingRight };
      /* 裁切自检：卡片（含选中态外发光 7px）右缘有没有越出海报列的 padding box。 */
      var hb = box(heroes), hpadR = parseFloat(getComputedStyle(heroes).paddingRight) || 0;
      out.crop = qa('.ml-hcard').map(function (c, i) {
        var cb = box(c), right = cb.right;
        return right > hb.right - hpadR + 1 ? (i + ' right=' + Math.round(right) + ' > ' + Math.round(hb.right - hpadR)) : null;
      }).filter(Boolean);
    }
    out.scroll = sc ? { x: Math.round(box(sc).left), r: Math.round(box(sc).right),
                        clientW: sc.clientWidth, scrollW: sc.scrollWidth } : null;
    out.track = tr ? { w: Math.round(box(tr).width), h: Math.round(box(tr).height) } : null;
    out.cards = qa('.ml-hcard').map(function (c) {
      var b = box(c);
      var shot = c.querySelector('.ml-shot, .ml-em');
      return { on: c.classList.contains('on'), x: Math.round(b.left), y: Math.round(b.top),
               w: Math.round(b.width), h: Math.round(b.height),
               shot: shot ? (shot.tagName + (shot.tagName === 'IMG'
                 ? ' complete=' + shot.complete + ' nw=' + shot.naturalWidth + ' nh=' + shot.naturalHeight
                   + ' cur=' + (shot.currentSrc || '').split('/').slice(-1)[0]
                 : '')) : 'none' };
    });
    var off = [];
    qa('.ml-root *').forEach(function (el) {
      var b = box(el);
      if (b.width <= 0 || b.height <= 0) return;
      if (b.left < -1 || b.top < -1 || b.right > innerWidth + 1 || b.bottom > innerHeight + 1) {
        off.push((el.className || el.tagName) + ' @' + Math.round(b.left) + ',' + Math.round(b.top)
                 + ' ' + Math.round(b.width) + 'x' + Math.round(b.height));
      }
    });
    out.overflow = off.slice(0, 12);
    if (stage) {
      var sb = box(stage);
      out.boxesOutOfStage = qa('.ml-box').map(function (b2, i) {
        var bb = box(b2);
        return (bb.left < sb.left - 1 || bb.right > sb.right + 1 || bb.top < sb.top - 1 || bb.bottom > sb.bottom + 1)
          ? (i + ':' + Math.round(bb.left) + ',' + Math.round(bb.top) + ' ' + Math.round(bb.width) + 'x' + Math.round(bb.height))
          : null;
      }).filter(Boolean).slice(0, 12);
    }
    out.nodes = qa('.ml-node').map(function (n) {
      return { mid: n.getAttribute('data-mid'), cls: n.className, x: Math.round(box(n).left) };
    });
    /* v1.0.24：奖励白框**两两重叠自检**（旧版白框互相压住就是用户报的 bug）。 */
    var bs = qa('.ml-box');
    var hits = [];
    for (var i = 0; i < bs.length; i++) {
      for (var j = i + 1; j < bs.length; j++) {
        var a = box(bs[i]), b = box(bs[j]);
        if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) {
          hits.push(i + '×' + j);
        }
      }
    }
    out.boxOverlaps = hits;
    out.infos = qa('.ml-hinfo').map(function (e) { return e.textContent.trim(); });
    return out;
  }

  function dump(o, title) {
    var d = document.getElementById('__dbg');
    if (!d) { d = document.createElement('div'); d.id = '__dbg'; document.body.appendChild(d); }
    d.textContent = title + '\n' + JSON.stringify(o, null, 1);
  }

  function fin() {
    var q1 = new URLSearchParams(location.search);
    /* 夹具把 CSS 动画冻在 0%（虚拟时钟不推进动画时间轴）⇒ `.ov-enter` 的 mileIn
       停在 translateY(12px)，量出来 root.y=12 是**夹具假象**。摘掉再看真布局。 */
    var ov = document.getElementById('overlay');
    if (ov) ov.classList.remove('ov-enter');
    var o = report('default');
    /* 拖轨自检（要显式带 &drag=1 才跑；否则会把轨滚走，截图就拍到半个白框）。 */
    var sc = q('.ml-scroll');
    if (sc && q1.get('drag')) {
      var before = sc.scrollLeft;
      mileDragStart({ pointerType: 'mouse', currentTarget: sc, clientX: 600, target: sc, pointerId: 1 });
      mileDragMove({ clientX: 380, preventDefault: function () {} });
      mileDragEnd();
      o.drag = { before: before, after: sc.scrollLeft, moved: sc.scrollLeft !== before };
    }
    var alt = q1.get('alt');
    if (alt) { viewMilestones(alt); o.alt = report('after ' + alt); }
    dump(o, 'MILE vp=' + innerWidth + 'x' + innerHeight);
    document.title = 'DBG ok';
  }

  function go() {
    try {
      showStartScreen();
      SAVE.progress = SAVE.progress || {};
      SAVE.progress.pts = 1040;
      /* v1.0.24：里程按角色分账 ⇒ 给两个角色各塞一点，验「每张海报下面显示自己的里程」。 */
      SAVE.progress.heroes = { tianshi: { pts: 1040 }, ganshiren: { pts: 300 } };
      viewMilestones();
      setTimeout(fin, 1800);   // 给海报图一点加载时间再量
    } catch (e) {
      dump({ err: String(e.message), stack: String(e.stack) }, 'ERR');
      document.title = 'ERR ' + e.message;
    }
  }
  setTimeout(go, 500);
})();