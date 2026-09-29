/* _drvfly.js —— v0.72.0 步 6「动画地基」的实机验证夹具。

为什么冒烟不够：`smoke_host.js` 的沙箱**没有** `window.innerWidth`、`createElement().animate`
也不存在 ⇒ 整段地基在无头下按设计**完全空转**（`_patch/probe_anim.js` 证明的就是这一点）。
「空转得对」不等于「在浏览器里也长得对」—— 克隆与手牌**逐像素同构**、翻转两面谁露谁藏、
`#anim-layer` 是否真的压在 `#overlay` 之上，这三条只有真浏览器量得出来。

量什么（每条都对应设计里一句非它不可的理由）：
  A. 几何同构：拿手牌真卡与克隆卡比 **offsetWidth/Height + 内部四件套的 offsetTop/Height**。
     牌面内部全是百分比/绝对定位 ⇒ 只有克隆盒子与手牌**完全等尺寸**才不拉歪。
     ⚠️ 比的是 offset* 而不是 rect：手牌带 `rotate(var(--rot))`，rect 是**旋转后的外接框**，
     天生比卡大一圈，拿它比会得出「克隆小了」的假结论。
  B. 翻转：`.fly-inner` 的 transform-style、两面 .fly-face 的 backface-visibility、
     以及 .fly-back 到底拿到了没拿到卡背图（--pile-back-img 未加载时必须有 #2a2119 兜底底）。
  C. 层序：#anim-layer(12) 必须 > #overlay(10)。易物的「牌体亮相」在选牌小窗开着时要看得见，
     这就是这条地基取 12 而不是复用 #fx-layer(5) 的全部理由。
  D. 真飞一次：直接调 Anim.play()，看克隆是否挂上 #anim-layer、起手 transform 是否是
     「起点中心 + 起点 scale」；再 Anim.skip()，看**终态**是否一步到位（层里清空、隐身牌还原）。
     ⚠️ 不验「自然播完」：--virtual-time-budget 只快进计时器，**不推进合成器的 WAAPI 时钟**，
     在那里等 onfinish 只会等到一个永远不动的中间态。skip() 是同步的，所以能验。
  F. 洗牌光晕：`.fx-pulse` 规则**真的活下来**了吗（只 grep 到不算证明 —— 解析器会静默丢弃规则）。
  G. 步 7 接线：走**生产入口**（drawCards / render / animShuffleQueued）跑完整链路，
     验「入队时机、data-new 按对象身份标、flush 被 render 调到、bump 不摘元素」这四件事。
     这四件在无头下全都是空操作 ⇒ 只有真浏览器量得出来。
  H. 步 8 接线：真 finishEndTurn 走弃牌。⚠️ 它返回时**下一回合的开局抽牌已经在飞了**
     （末尾 triggerSummons → enemyAct → startTurn，而 startTurn 末行是 drawCards+render）
     ⇒ 条数/下标一类判据必红。本段因此按**翻转方向**给克隆分类、按**元素身份**数隐身。
  I. 步 9 接线：真的 playCard(易物) → 真的 pickExchangeHand/pickExchangeNew，两段都验
     （亮相：不翻转、×1.35、朱砂晕、有收势、终点=战场中央、起手=被打出那张的手位；
      成交：出一进一、错开 90ms、终点分别是弃牌堆面与换入牌的落位手位）。
     走 playCard 而不是直接调动画入口是刻意的 —— 亮相的源位判据（「#hand 的陈旧 DOM 里
     下标 i 就是那张牌」）只有在「先 splice 再调 eff」的真实顺序下才成立。

用法：
    python _patch/shot.py --direct --drv _patch/_drvfly.js --widths 1280 --h 720 --dump
    python _patch/shot.py --direct --drv _patch/_drvfly.js --widths 960 --h 540 --dump
*/
(function () {
  var out = [], errs = [];
  window.onerror = function (m, u, l) { errs.push(m + ' @' + l); };
  function log(s) { out.push(s); }
  var q = new URLSearchParams(location.search);
  function pick(n) { return parseInt(n, 10) || 0; }
  function r2(v) { return Math.round(v * 100) / 100; }
  function cs(el, p) { try { return window.getComputedStyle(el)[p]; } catch (e) { return '?'; } }
  /* getComputedStyle 早就把 rotateY(180deg) 折成 matrix3d 了，别再去找字面量 "180"。
     180° 绕 Y：m11 = m33 = cos180 = -1，m22 = 1。 */
  function isRotY180(v) {
    var m = /^matrix3d\(([^)]+)\)$/.exec(v || '');
    if (!m) return false;
    var n = m[1].split(',').map(function (s) { return parseFloat(s); });
    return n.length === 16 && n[0] < -0.99 && n[5] > 0.99 && n[10] < -0.99;
  }
  var bad = [];
  function want(cond, label, detail) {
    log('  ' + (cond ? 'ok  ' : 'FAIL') + ' ' + label + (detail ? '   ' + detail : ''));
    if (!cond) bad.push(label);
  }
  /* 取一条元素上**第一条** WAAPI 动画的关键帧数组（没有就返回 null）。
     H 段按关键帧判定翻转方向的理由：computed transform 是「此刻」的值，会随文档时间线往前走
     （delay 0 的那张下一帧就不再是 0 度），而关键帧是确定性的、与测量时刻无关。 */
  function animKeyframes(el) {
    try {
      var an = (el && el.getAnimations) ? el.getAnimations() : [];
      if (!an || !an.length) return null;
      var ef = an[0].effect;
      var kf = ef && ef.getKeyframes ? ef.getKeyframes() : null;
      return (kf && kf.length) ? kf : null;
    } catch (e) { return null; }
  }
  /* 一个 .fly-card 克隆是「弃牌向」还是「抽牌向」——**只看翻转方向**，不看下标、不看条数：
       弃牌/换出 flip:'back'  ⇒ 首帧 rotateY(0deg)   末帧 rotateY(180deg)
       抽牌/换入 flip:'front' ⇒ 首帧 rotateY(180deg) 末帧 rotateY(0deg)
     （关键帧里的是**字面量**，不是折好的 matrix —— 折成 matrix 是 computed 值才有的行为。） */
  function flyKind(node) {
    var kf = animKeyframes(node && node.querySelector('.fly-inner'));
    if (!kf) return '?';
    var a = String(kf[0].transform), b = String(kf[kf.length - 1].transform);
    if (a.indexOf('rotateY(0deg)') >= 0 && b.indexOf('rotateY(180deg)') >= 0) return 'discard';
    if (a.indexOf('rotateY(180deg)') >= 0 && b.indexOf('rotateY(0deg)') >= 0) return 'draw';
    return '?';
  }
  /* 一个 .fly-card 的**终点中心**（= 末帧 translate + 自身尺寸的一半，与 _animItem 里
     `tx1 = cx1 - tw/2` 互为逆运算）。用它跟真实元素的 rect 对比，才是在验「飞行落在哪」，
     而不是把标签里的期望值抄一遍。
     注意：这里读的是**节点自己**的第一条动画（位移那条）；翻转那条在 .fly-inner 上。 */
  function flyTarget(node) {
    var kf = animKeyframes(node);
    if (!kf) return null;
    var m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(String(kf[kf.length - 1].transform));
    if (!m) return null;
    var w = parseFloat(cs(node, 'width')), h = parseFloat(cs(node, 'height'));
    if (!isFinite(w) || !isFinite(h)) return null;
    return { cx: parseFloat(m[1]) + w / 2, cy: parseFloat(m[2]) + h / 2, w: w, h: h };
  }
  /* 这条飞行的起手延迟（ms）——「交错」靠的就是两条的 delay 不同。 */
  function flyDelay(node) {
    try { return node.getAnimations()[0].effect.getTiming().delay; } catch (e) { return -1; }
  }
  function ENEMY_IDS() {
    var wantIds = (q.get('e') || 'huyao,shuigui,youhun').split(',');
    var ok = wantIds.filter(function (k) { return typeof ENEMIES !== 'undefined' && !!ENEMIES[k]; });
    var missing = wantIds.filter(function (k) { return ok.indexOf(k) < 0; });
    if (missing.length) errs.push('敌人 id 不在 ENEMIES：' + missing.join(','));
    return ok;
  }
  /* 与 _drvclip.js 的 fakeHand 同一份（逐字复制）—— 手牌必须是**真牌对象**，
     flyFaceHTML 会拿它走 cardBody/cardText，桩对象会当场露馅。 */
  function fakeHand(n) {
    var a = [];
    for (var i = 0; i < n; i++) {
      var c = CARDS[i % CARDS.length];
      a.push({ id: c.id, name: c.name, type: c.type, rarity: c.rarity, cost: c.cost,
               up: i % 4 === 3, t: c.t, ts: c.ts, eff: c.eff });
    }
    return a;
  }
  /* 一张真卡的**手牌桩**（带真 eff，所以能走真 playCard）。 */
  function stubOf(c) {
    return { id: c.id, name: c.name, type: c.type, rarity: c.rarity, cost: c.cost,
             up: false, t: c.t, ts: c.ts, eff: c.eff };
  }
  function cardByType(type, skip) {
    for (var i = 0; i < CARDS.length; i++) {
      var c = CARDS[i];
      if (c.type === type && c.id !== skip) return c;
    }
    return null;
  }

  function go() {
    confirmNewGame();
    pickHero(q.get('hero') || 'tianshi');
    skipOpening();
    if (typeof seedRng === 'function' && q.get('seed') !== '0') seedRng(pick(q.get('seed')) || 20260928);
    startBattle(ENEMY_IDS());
    if (typeof closeOverlay === 'function') closeOverlay();
    document.body.classList.remove('at-menu');
    G.hand = fakeHand(pick(q.get('n')) || 5);
    render();

    /* === 0. 步 7 之后：`startBattle` 里的开局发牌**就是**第一次抽牌动画 ===
       必须在动任何东西**之前**取数：D 段的判据是「层里恰好只有我这一条」，
       开局那批克隆若不清掉，D 会变成 6 个克隆 / 2 个批次（本夹具第一次跑就是这么红的）。
       注意第 74-75 行刚把 G.hand 换成桩手牌又 render 了一次 ⇒ 那几张牌的 data-new 已经没了，
       但克隆还在飞 —— 这恰好是「按**对象身份**标 data-new」的直接体现。 */
    log('=== 0. 开局发牌走通真实 boot 路径（startBattle → drawCards → render） ===');
    var openFlights = Anim.flights.length, openClones = animLayer().children.length;
    want(openFlights >= 1, '开局发牌真的起了抽牌动画批次（步 7 的接线在 boot 路径上生效）', 'flights=' + openFlights);
    want(openClones >= 2, '开局每张新牌各一个克隆在飞', '克隆 ' + openClones + ' 个');
    Anim.skip();
    want(animLayer().children.length === 0 && Anim.flights.length === 0,
      '收尾后动画层清空 —— 后面各段才有干净基线');

    log('=== A. 克隆与手牌逐像素同构 ===');
    var real = document.querySelector('#hand .card');
    if (!real) { log('  ! #hand 里没有卡，A/B/D 无法量'); return; }
    var card = G.hand[0];
    /* ⚠️ 尺寸必须取 getComputedStyle 的**使用值**（可能是小数），不能用 offsetWidth。
       实测：窄档 5 张牌时 #hand 装不下，`.card` 作为 flex 项被 **flex-shrink 压到 104 以下**
       （如 103.5px）。offsetWidth 把使用值**四舍五入**成整数，克隆按整数建
       ⇒ 内部百分比定位的 .cart-wrap/.cplate 会整整差 1px。这正是第一版夹具在
       960×540 与 844×390 上报 4 条 / 2 条 FAIL 的原因 —— **不是克隆写错了，是量错了**。
       顺带一条对步 7 的结论：抽牌动画的「终点尺寸」也必须走 getComputedStyle，
       不能用 offsetWidth（同一个坑，只是从夹具挪到了正式接线里）。 */
    var w = parseFloat(cs(real, 'width')), h = parseFloat(cs(real, 'height'));
    var rb = real.getBoundingClientRect();
    log('  手牌 offset ' + real.offsetWidth + 'x' + real.offsetHeight
        + ' · 使用值 ' + r2(w) + 'x' + r2(h)
        + ' · 旋转后外接框 ' + r2(rb.width) + 'x' + r2(rb.height)
        + ' （外接框 > 使用值 = 扇形角在起作用）');
    want(Math.abs(rb.width - w) > 0.5 || Math.abs(rb.height - h) > 0.5,
      '手牌确实带旋转（外接框比使用值大）⇒ 克隆尺寸只能取使用值');

    var layer = animLayer();
    var tmp = document.createElement('div');
    tmp.innerHTML = flyCardHTML(flyFaceHTML(card), w, h);
    var node = tmp.firstChild;
    layer.appendChild(node);
    var clone = node.querySelector('.card');
    want(!!clone, '克隆里能找到 .card（flyFaceHTML 产出了真牌面）');
    if (!clone) { layer.removeChild(node); return; }
    var cb = clone.getBoundingClientRect();
    want(Math.abs(cb.width - w) < 0.05 && Math.abs(cb.height - h) < 0.05,
      '克隆 .card 与手牌**等尺寸**（width/height:100% 生效，小数也逐位对齐）',
      r2(cb.width) + 'x' + r2(cb.height) + ' vs ' + r2(w) + 'x' + r2(h));

    /* 内部四件套：位置与高度都要逐像素相同，才算「同构」而不是「一样大」 */
    ['.cart-wrap', '.cost', '.cname', '.cplate', '.ctype'].forEach(function (sel) {
      var a = real.querySelector(sel), b = clone.querySelector(sel);
      if (!a || !b) { want(false, sel + ' 两侧都存在'); return; }
      var same = (a.offsetTop === b.offsetTop) && (a.offsetLeft === b.offsetLeft)
              && (a.offsetWidth === b.offsetWidth) && (a.offsetHeight === b.offsetHeight);
      want(same, sel + ' 位置与尺寸逐像素相同',
        '[t' + a.offsetTop + ' l' + a.offsetLeft + ' ' + a.offsetWidth + 'x' + a.offsetHeight + '] vs '
        + '[t' + b.offsetTop + ' l' + b.offsetLeft + ' ' + b.offsetWidth + 'x' + b.offsetHeight + ']');
    });
    /* 手牌专属的东西**不许**跟过来 */
    var cnt = clone.querySelectorAll('*').length;
    var handOnly = node.innerHTML.indexOf('onpointerdown') < 0 && node.innerHTML.indexOf('--rot') < 0;
    want(handOnly, '克隆不含 onpointerdown / --rot（静态牌面）', '子元素 ' + cnt + ' 个');
    want(cs(clone, 'transform') === 'none', '克隆 .card 的 transform 被归零（不继承扇形角）', cs(clone, 'transform'));

    log('=== B. 翻转结构 ===');
    var inner = node.querySelector('.fly-inner');
    var front = node.querySelector('.fly-front'), back = node.querySelector('.fly-back');
    want(!!inner && !!front && !!back, 'fly-inner / fly-front / fly-back 三件都在');
    want(cs(node, 'perspective') === '800px', 'perspective 在 .fly-card 上（不在 .hand-area / #hand）', cs(node, 'perspective'));
    want(cs(inner, 'transformStyle') === 'preserve-3d', 'fly-inner 是 preserve-3d', cs(inner, 'transformStyle'));
    want(cs(front, 'backfaceVisibility') === 'hidden' && cs(back, 'backfaceVisibility') === 'hidden',
      '两面都 backface-visibility:hidden', cs(front, 'backfaceVisibility') + ' / ' + cs(back, 'backfaceVisibility'));
    want(cs(back, 'transform').indexOf('180') >= 0 || isRotY180(cs(back, 'transform')),
      'fly-back 预转 180deg（容器转到 180 时露出的正是它）', cs(back, 'transform'));
    var bi = cs(back, 'backgroundImage'), bc = cs(back, 'backgroundColor');
    want(bi.indexOf('url(') === 0 || bi === 'none', 'fly-back 的卡背图来自 --pile-back-img', bi.slice(0, 34));
    want(bc === 'rgb(42, 33, 25)', 'fly-back 有 #2a2119 兜底底色（图没加载时不至于是块透明）', bc);
    /* 红线：拿了 perspective / transform 之类的**绝不能**是手牌容器。
       ⚠️ will-change 的**初始值是 auto**（不是 none）⇒ 判据必须是「除了 none/auto/normal
       之外的实值」，否则任何元素都会被判红（这条第一次跑就误报了两个 FAIL）。 */
    ['.hand-area', '#hand'].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (!el) { want(false, sel + ' 存在'); return; }
      var seen = [];
      ['transform', 'filter', 'perspective', 'willChange', 'backdropFilter'].forEach(function (p) {
        var v = cs(el, p);
        if (v && v !== 'none' && v !== 'normal' && v !== 'auto') seen.push(p + '=' + v);
      });
      want(seen.length === 0, sel + ' 上没有 transform/filter/perspective/will-change（红线）', seen.join(' ') || 'none ✓');
    });

    log('=== C. 层序：#anim-layer 必须压过 #overlay ===');
    var al = cs(layer, 'zIndex'), ov = cs(document.getElementById('overlay'), 'zIndex');
    var fxz = cs(document.getElementById('fx-layer'), 'zIndex');
    want(parseInt(al, 10) > parseInt(ov, 10),
      '#anim-layer(' + al + ') > #overlay(' + ov + ') —— 易物亮相在小窗开着时要看得见');
    want(parseInt(al, 10) > parseInt(fxz, 10), '#anim-layer(' + al + ') > #fx-layer(' + fxz + ')（不复用、不抢原特效层）');
    want(cs(layer, 'position') === 'fixed' && cs(layer, 'pointerEvents') === 'none',
      '#anim-layer 是 fixed + pointer-events:none（不吃点击）',
      cs(layer, 'position') + ' / ' + cs(layer, 'pointerEvents'));

    layer.removeChild(node);

    log('=== D. 真飞一次 + skip 到终态 ===');
    var pile = document.querySelector('#pile-discard .pile-face');
    if (!pile) { log('  ! 找不到弃牌堆面，D 段跳过'); return; }
    var rr = real.getBoundingClientRect(), pr = pile.getBoundingClientRect();
    var handEl = document.querySelector('#hand');
    /* 让第二张牌「正在飞进来」：与步 7 的 data-new 同一套机制 */
    var newEl = document.querySelectorAll('#hand .card')[1];
    var payload = {
      key: 'probe', dur: 340,
      hide: [{ el: newEl, card: G.hand[1] }],
      items: [{
        html: flyFaceHTML(card), flip: 'front',
        from: { cx: pr.left + pr.width / 2, cy: pr.top + pr.height / 2, w: pr.width, h: pr.height },
        to: { cx: rr.left + rr.width / 2, cy: rr.top + rr.height / 2, w: w, h: h }
      }]
    };
    var before = layer.children.length;
    Anim.play(payload);
    want(Anim.flights.length === 1 && Anim.busy(), 'Anim.play 起了 1 个批次，busy() 为真', 'flights=' + Anim.flights.length);
    want(layer.children.length === before + 1, '克隆挂上了 #anim-layer', 'children ' + before + ' → ' + layer.children.length);
    want(newEl.style.opacity === '0', '终点那张牌被隐身在等（纯 opacity，不碰 transform）', 'opacity=' + newEl.style.opacity);
    var fly = layer.lastElementChild;
    var tf = cs(fly, 'transform');
    /* 起手 transform 必须是「起点中心 + 起点 scale」，不是原点 */
    want(tf.indexOf('matrix') === 0 || tf.indexOf('translate') === 0, '飞牌起手就有 transform（不是塌在原点）', tf.slice(0, 60));
    var exp = (pr.width / w);
    var m = /matrix\(([^)]+)\)/.exec(tf);
    var sx = m ? parseFloat(m[1].split(',')[0]) : NaN;
    want(Math.abs(sx - exp) < 0.02, '起手 scale ≈ 起点/终点宽度比',
      (isNaN(sx) ? 'NaN' : r2(sx)) + ' vs ' + r2(exp));
    var bx = m ? parseFloat(m[1].split(',')[4]) : NaN;
    want(Math.abs(bx - (pr.left + pr.width / 2 - w / 2)) < 1.5, '起手 x 平移 = 起点中心 - 终点半宽',
      (isNaN(bx) ? 'NaN' : r2(bx)) + ' vs ' + r2(pr.left + pr.width / 2 - w / 2));

    Anim.skip();
    want(Anim.flights.length === 0 && !Anim.busy(), 'skip() 之后没有在飞的批次');
    want(layer.children.length === before, 'skip() 之后 #anim-layer 清空（克隆都摘了）', 'children=' + layer.children.length);
    want(newEl.style.opacity === '', 'skip() 之后终点那张牌恢复可见（opacity 还原）', 'opacity=' + JSON.stringify(newEl.style.opacity));
    want(document.querySelectorAll('#hand .card').length === G.hand.length,
      '手牌张数没被动画改过', document.querySelectorAll('#hand .card').length + '/' + G.hand.length);

    log('=== E. 契约：Anim.pending 是数组、flush 之前不开播 ===');
    Anim.pending = [];
    Anim.push({ items: [{ html: '', from: {}, to: {} }] });
    Anim.push({ items: [{ html: '', from: {}, to: {} }] });
    want(Anim.pending.length === 2, '连续两次 push 都留在队列里（不是整体覆盖）', 'pending=' + Anim.pending.length);
    Anim.flush();
    want(Anim.pending.length === 0 && Anim.flights.length === 2, 'flush() 才开播，且两条都在飞',
      'pending=' + Anim.pending.length + ' flights=' + Anim.flights.length);
    Anim.skip();
    want(Anim.flights.length === 0, 'skip() 一次收掉全部在飞批次');

    log('=== F. 洗牌光晕（.fx-pulse 规则活性） ===');
    Anim.play({ dur: 120, items: [{ pulse: { cx: 400, cy: 300, r: 120 } }] });
    var pulse = layer.querySelector('.fx-pulse');
    want(!!pulse, 'pulse 载荷能建出 .fx-pulse 节点');
    if (pulse) {
      want(cs(pulse, 'borderRadius') === '50%', '.fx-pulse 的 border-radius:50% 活着', cs(pulse, 'borderRadius'));
      want(cs(pulse, 'position') === 'absolute', '.fx-pulse 是 absolute', cs(pulse, 'position'));
      want(cs(pulse, 'backgroundImage').indexOf('radial-gradient') === 0,
        '.fx-pulse 拿到了径向渐变底', cs(pulse, 'backgroundImage').slice(0, 30));
      want(pulse.offsetWidth === 240 && pulse.offsetHeight === 240,
        '光晕是正方形 2R（圆的直径由 border-radius 收）', pulse.offsetWidth + 'x' + pulse.offsetHeight);
      want(cs(pulse, 'pointerEvents') === 'none', '光晕不吃点击', cs(pulse, 'pointerEvents'));
    }
    Anim.skip();
    want(layer.children.length === 0, 'F 段收尾后 #anim-layer 也是空的');

    log('=== G. 步 7 接线：真 drawCards / 真洗牌走完整链路 ===');
    /* 这一段是步 7 唯一能被证伪的地方。三种错法在无头下**全都看不出来**
       （那边整条链按设计空转）：① 入队太早/太晚（render 之前量不到手牌终位）；
       ② handCardHTML 没按对象身份生成 data-new；③ flush 没被 render 调到。
       所以这里必须走**生产入口**（drawCards / render / animShuffleQueued），
       而不是像 D 段那样手搓载荷。 */
    Anim.pending = []; Anim.skip();
    if (G.hand.length > 8) { G.hand = G.hand.slice(0, 6); render(); }   // 手牌上限 10，留出抽 2 张的余量
    var handN = G.hand.length;
    /* 放进抽牌堆的必须是**真牌对象**：flyFaceHTML → cardBody/cardText 认字段，也靠对象身份配对 */
    G.drawPile = CARDS.slice(0, 4).map(function (c) {
      return { id: c.id, name: c.name, type: c.type, rarity: c.rarity, cost: c.cost,
               up: false, t: c.t, ts: c.ts, eff: c.eff };
    });
    G.discard = [];
    drawCards(2);
    want(G.hand.length === handN + 2, 'drawCards 手牌 +2（状态同步落定，不等动画）', G.hand.length + ' vs ' + (handN + 2));
    want(Anim.pending.length === 1, 'drawCards 只入队**一条**抽牌载荷（不是每张一条）', 'pending=' + Anim.pending.length);
    want(Anim.flights.length === 0, '入队时还没开播（开播权在 render 尾部）', 'flights=' + Anim.flights.length);

    var pileDraw = document.getElementById('pile-draw');
    var faceRect = document.querySelector('#pile-draw .pile-face').getBoundingClientRect();
    var faceW = parseFloat(cs(document.querySelector('#pile-draw .pile-face'), 'width'));
    var animsBefore = (pileDraw && typeof pileDraw.getAnimations === 'function') ? pileDraw.getAnimations().length : -1;

    render();   // ← 尾部会调 Anim.flush()

    want(Anim.pending.length === 0 && Anim.flights.length === 1, 'render 尾部把载荷开播了（flush 确实被调）',
      'pending=' + Anim.pending.length + ' flights=' + Anim.flights.length);
    var news = document.querySelectorAll('#hand .card[data-new]');
    want(news.length === 2, '两张新牌都带 data-new（按**对象身份**标的，不是「最后一张」）', 'data-new 数 ' + news.length);
    var clones = layer.querySelectorAll('.fly-card');
    want(clones.length === 2, '两张牌各一个克隆在飞', '克隆 ' + clones.length + ' 个');
    var hidden = 0;
    for (var hi = 0; hi < news.length; hi++) if (news[hi].style.opacity === '0') hidden++;
    want(hidden === 2, '终态新卡开播瞬间就隐身（纯 opacity，手牌 DOM 结构零改动）', hidden + '/2');
    want(document.querySelectorAll('#hand .card').length === G.hand.length,
      '手牌张数由 render 决定，动画没往里塞节点', document.querySelectorAll('#hand .card').length + '/' + G.hand.length);

    if (clones.length) {
      var inner0 = clones[0].querySelector('.fly-inner');
      want(isRotY180(cs(inner0, 'transform')), '抽牌起手是**牌背朝外**（.fly-inner 预转 180°，落点才翻正）',
        cs(inner0, 'transform').slice(0, 46));
      var mG = /matrix\(([^)]+)\)/.exec(cs(clones[0], 'transform'));
      if (mG) {
        var p0 = mG[1].split(',');
        var sxG = parseFloat(p0[0]), txG = parseFloat(p0[4]);
        var cwG = parseFloat(cs(document.querySelector('#hand .card'), 'width'));
        want(Math.abs(sxG - faceW / cwG) < 0.02,
          '起手 scale ≈ 牌堆面宽 / 手位宽（尺寸差由飞行本身承担）', r2(sxG) + ' vs ' + r2(faceW / cwG));
        want(Math.abs(txG - (faceRect.left + faceRect.width / 2 - cwG / 2)) < 1.5,
          '起手平移的锚点是**抽牌堆面**的中心', r2(txG) + ' vs ' + r2(faceRect.left + faceRect.width / 2 - cwG / 2));
      } else { want(false, '抽牌克隆有 transform', cs(clones[0], 'transform')); }
    }

    Anim.skip();
    want(news[0].style.opacity === '' && news[1].style.opacity === '',
      'skip() 之后新牌恢复可见', JSON.stringify(news[0].style.opacity) + '/' + JSON.stringify(news[1].style.opacity));
    want(layer.children.length === 0 && Anim.flights.length === 0, '抽牌收尾后层与在飞批次都清空');

    log('--- 洗牌 ---');
    animShuffleQueued();
    want(Anim.pending.length === 1, '洗牌载荷入队', 'pending=' + Anim.pending.length);
    render();
    var pulses = layer.querySelectorAll('.fx-pulse');
    want(pulses.length === 2, '两堆各一圈光晕', pulses.length + ' 个');
    var animsAfter = (pileDraw && typeof pileDraw.getAnimations === 'function') ? pileDraw.getAnimations().length : -1;
    if (animsBefore >= 0) {
      want(animsAfter > animsBefore, '「震动」是驱动**既有堆元素本身**（没在层里另造节点）',
        animsBefore + ' → ' + animsAfter);
    } else { log('  （参考）浏览器没有 Element.getAnimations，跳过震动挂载检查'); }
    Anim.skip();
    /* ⚠️ 这条是「bump 载荷的 settle 绝不能摘元素」的正面证据：
       _animItem 对 it.el 那条返回 null，play 里才不会被 nodes.push 收走。写错就会把抽牌堆删掉。 */
    want(document.getElementById('pile-draw') === pileDraw && pileDraw.parentNode,
      'skip() 没有把抽牌堆元素从 DOM 里摘掉（bump 载荷返回 null 的意义）');
    want(layer.children.length === 0, '洗牌收尾后层清空');

    log('=== H. 步 8 接线：弃牌（真 finishEndTurn） ===');
    /* 这一段要证的是**弃牌走 play 而不是 push**。它的证据形态很别扭，值得写清楚：
       finishEndTurn 尾部是 triggerSummons → enemyAct → **startTurn**，而 startTurn 的
       末行就是 `drawCards(n); render()`（30_engine.js:762）⇒ 这个函数**返回时，下一回合的
       开局抽牌动画已经在飞了**。
       ⇒ 所以「flights 恰好 1 条」不可能成立（弃牌 + 抽牌，抽牌堆见底时再加一条洗牌），
         「层里恰好 disN 个克隆」也不可能（还会多出 5 个抽牌克隆）。按条数/下标写必红。
       真正干净的两个判据，都不依赖条数：
       ① **按翻转方向分类克隆**（flip 决定 .fly-inner 的首末帧，是确定性的）：
            弃牌 flip:'back'  ⇒ 首帧 rotateY(0deg) → 末帧 rotateY(180deg)
            抽牌 flip:'front' ⇒ 首帧 rotateY(180deg) → 末帧 rotateY(0deg)
          于是「弃牌类克隆数 === disN」就是「play 而非 push」的证明本身 ——
          若写成 push，载荷会拖到 startTurn 里那次 render 才 build，那一刻 G.hand 已经
          不含被弃的这 disN 张，animHandEls 按对象身份**一个都匹配不到** ⇒ 弃牌克隆数会是 0。
       ② **按 DOM 元素身份**数隐身：弃掉的牌 = 调用前手牌里**非保留**的那几个元素本身。
       另：G.discard 的长度**不能**当判据 —— startTurn 的抽牌一旦把抽牌堆抽空，
          drawCards 会把整个弃牌堆 shuffle 回抽牌堆再清空 G.discard（30_engine.js:625）。
          正因如此下面只把它当参考信息打出来，不做断言。 */
    Anim.pending = []; Anim.skip();
    G.hp = 9999;                                  // 别让敌人把主角打死（enemyAct 会真的结算）
    var live = (typeof aliveEnemies === 'function') ? aliveEnemies() : [];
    live.forEach(function (e) { e.intent = { type: 'block', v: 0 }; });
    var hn = G.hand.length, keepN = 2, disN = hn - keepN;
    /* 保留**最后**两张 ⇒ 被弃的正好是下标 0..disN-1 ⇒ 克隆 i ↔ slotsBefore[i] 一一对齐
       （animHandEls 的输出顺序就是 G.hand 顺序）。 */
    G.hand[hn - 1].retain = true; G.hand[hn - 2].retain = true;
    var keptCards = G.hand.slice(disN);           // 保留的那两张（**对象身份**，弃牌不该动它们）
    var disc0 = G.discard.length, draw0 = G.drawPile.length;
    var hc = document.querySelectorAll('#hand .card');
    var slotsBefore = [];
    for (var q1 = 0; q1 < hn; q1++) slotsBefore.push(hc[q1].getBoundingClientRect());
    finishEndTurn();
    var allC = layer.querySelectorAll('.fly-card');
    var dClones = [], aClones = [], q4, k4;
    for (q4 = 0; q4 < allC.length; q4++) {
      k4 = flyKind(allC[q4]);
      if (k4 === 'discard') dClones.push(allC[q4]); else if (k4 === 'draw') aClones.push(allC[q4]);
    }
    want(dClones.length === disN, '弃掉 ' + disN + ' 张 ⇒ ' + disN + ' 个**弃牌向**克隆（play 而非 push 的证明）',
      '弃牌向 ' + dClones.length + ' 个 · 抽牌向 ' + aClones.length + ' 个 · 层内共 ' + allC.length);
    log('  （参考）finishEndTurn 返回时 flights=' + Anim.flights.length + ' pending=' + Anim.pending.length
      + ' · 弃牌堆 ' + disc0 + '→' + G.discard.length + ' · 抽牌堆 ' + draw0 + '→' + G.drawPile.length
      + '（抽牌堆见底 ⇒ 弃牌堆被 shuffle 回抽牌堆是正常的，故弃牌堆长度不做断言）');
    if (dClones.length) {
      /* 翻转方向读**关键帧**而不是当下的 computed transform：后者会随文档时间线往前跑
         （delay 0 的那张下一帧就不是 0 度了），关键帧是确定性的。 */
      var dInner = dClones[0].querySelector('.fly-inner');
      var kf0 = animKeyframes(dInner);
      want(kf0 && String(kf0[0].transform).indexOf('rotateY(0deg)') >= 0,
        '弃牌起手是**牌面朝外**（首帧 rotateY(0deg)）', kf0 ? String(kf0[0].transform) : '无关键帧');
      want(kf0 && String(kf0[kf0.length - 1].transform).indexOf('rotateY(180deg)') >= 0,
        '弃牌落点是**牌背**（末帧 rotateY(180deg)）', kf0 ? String(kf0[kf0.length - 1].transform) : '无关键帧');
      if (aClones.length) {
        var aKf = animKeyframes(aClones[0].querySelector('.fly-inner'));
        want(aKf && String(aKf[0].transform).indexOf('rotateY(180deg)') >= 0,
          '（对照）抽牌向克隆是**牌背朝外**（翻正落）—— 两个方向确实被区分开了',
          aKf ? String(aKf[0].transform) : '无关键帧');
      }
    }
    if (dClones.length) {
      var pileFace = document.querySelector('#pile-discard .pile-face');
      var pw = parseFloat(cs(pileFace, 'width'));
      var dw = parseFloat(cs(dClones[0], 'width'));
      want(Math.abs(dw - pw) < 0.05, '克隆的内联尺寸 = **终点**（弃牌堆面）尺寸 ⇒ 飞行中缩小',
        r2(dw) + ' vs ' + r2(pw));
      var mH = /matrix\(([^)]+)\)/.exec(cs(dClones[0], 'transform'));
      if (mH) {
        var h0 = mH[1].split(',');
        var sxH = parseFloat(h0[0]), txH = parseFloat(h0[4]), tyH = parseFloat(h0[5]);
        var cwH = parseFloat(cs(document.querySelector('#hand .card'), 'width'));
        want(sxH > 1.2, '起手 scale > 1（从手牌尺寸缩到牌堆尺寸）', r2(sxH));
        want(Math.abs(txH - (slotsBefore[0].left + slotsBefore[0].width / 2 - dw / 2)) < 1.5,
          '起手平移的锚点是**那张牌弃牌前的手位**',
          r2(txH) + ' vs ' + r2(slotsBefore[0].left + slotsBefore[0].width / 2 - dw / 2));
        want(Math.abs((tyH) - (slotsBefore[0].top + slotsBefore[0].height / 2 - parseFloat(cs(dClones[0], 'height')) / 2)) < 1.5,
          '纵向锚点同源（也是弃牌前的手位）');
        log('  （参考）手牌宽 ' + r2(cwH) + ' → 牌堆面宽 ' + r2(pw));
      }
    }
    /* 弃掉的牌必须**立刻**从手里消失。按身份数：弃掉的 = 调用前手牌里下标 0..disN-1 的那几个
       元素本身（保留的最后两张不在此列）⇒ 这条同时证明 hide 集合**精确等于**被弃集合。 */
    var hiddenN = 0, keptLit = 0;
    for (var q2 = 0; q2 < disN; q2++) if (hc[q2].style.opacity === '0') hiddenN++;
    for (var q5 = disN; q5 < hn; q5++) if (hc[q5].style.opacity !== '0') keptLit++;
    want(hiddenN === disN, '被弃的那 ' + disN + ' 张（下标 0..' + (disN - 1) + '）当场隐身（手牌视觉立刻反映弃牌）',
      hiddenN + '/' + disN);
    want(keptLit === keepN, '保留的 ' + keepN + ' 张没被隐身（hide 集合精确等于被弃集合）', keptLit + '/' + keepN);
    Anim.skip();
    want(layer.children.length === 0 && Anim.flights.length === 0, '弃牌收尾后层与批次都清空');
    /* keep:true 的意义：**不还原**透明度。还原会让弃掉的牌先飞走再弹回手里，
       一直亮到下一次 render 重写 innerHTML 才消失。 */
    var stillHidden = 0;
    for (var q3 = 0; q3 < disN; q3++) if (hc[q3].style.opacity === '0') stillHidden++;
    want(stillHidden === disN, 'skip() 之后弃掉的牌**仍然**是隐身的（keep 生效，不弹回手里）',
      stillHidden + '/' + disN);
    render();
    want(document.querySelectorAll('#hand .card').length === G.hand.length,
      'render() 之后手牌 DOM 与 G.hand 对齐（保留 ' + keepN + ' 张 + 本回合新抽的）',
      document.querySelectorAll('#hand .card').length + '/' + G.hand.length);
    var keptAlive = 0;
    for (var q6 = 0; q6 < keptCards.length; q6++) if (G.hand.indexOf(keptCards[q6]) >= 0) keptAlive++;
    want(keptAlive === keepN, '保留的 ' + keepN + ' 张按**对象身份**仍在 G.hand 里（守一没被弃牌吃掉）',
      keptAlive + '/' + keepN);
    want(document.querySelectorAll('#hand .card[style*="opacity"]').length === 0,
      '重排后没有残影（陈旧 DOM 被整块覆盖）');
    want(document.querySelectorAll('#pile-discard .pile-face').length === 1, '弃牌堆面还在（没被误删）');

    var _h = handEl.offsetHeight;
    log('  （参考）手牌区高 ' + _h + 'px · 弃牌堆面 ' + r2(pr.width) + 'x' + r2(pr.height) + ' @' + r2(pr.left) + ',' + r2(pr.top));

    log('=== I. 步 9 接线：易物的两段（真 playCard → 真 pickExchangeNew） ===');
    /* 这一段两段都走**生产入口**，不手搓载荷：
         ① playCard(i) → doPlayCard → eff → animExchangeCast；
         ② pickExchangeHand → pickExchangeNew（成交点）。
       之所以非要走 playCard 而不是直接调 animExchangeCast：亮相的**源位**判据
       （「#hand 的陈旧 DOM 里下标 i 就是那张牌」）只有在「先 splice 再调 eff」的真实
       顺序下才成立 —— 手搓调用就把这条最容易被写错的前提给绕过去了。 */
    Anim.pending = []; Anim.skip();
    var yi = null;
    for (var q7 = 0; q7 < CARDS.length; q7++) if (CARDS[q7].id === 'yiwu') { yi = CARDS[q7]; break; }
    if (!yi) { want(false, '取到【易物】卡模板'); }
    else {
      var gh = fakeHand(5), yidx = 2;
      gh[yidx] = stubOf(yi);
      /* 换出的那一张刻意选**非攻击牌**：本夹具的英雄是天师，而天师的易物奖励是
         「换出攻击牌额外抽 1 张」（30_engine.js:574）—— 一旦触发，成交那一拍会多出一条
         抽牌飞行、手牌也会多一张，克隆数与手牌张数都不再确定。
         那不是 bug，是真实规则；这里换成非攻击牌，只为把这一段的基数钉死。 */
      var plain = cardByType('skill', 'yiwu') || cardByType('defense', 'yiwu');
      if (plain) gh[0] = stubOf(plain);
      G.hand = gh;
      if (!G.drawPile.length && !G.discard.length) G.drawPile = fakeHand(3);
      G.energy = 3;
      render();
      var handCards = document.querySelectorAll('#hand .card');
      var castFrom = handCards[yidx] ? handCards[yidx].getBoundingClientRect() : null;
      var hwCast = parseFloat(cs(handCards[yidx], 'width'));
      playCard(yidx);
      /* ① 亮相 */
      want(Anim.flights.length === 1, '打出【易物】当场起了亮相批次（play 而非 push —— 源位是刚被 splice 掉的手位）',
        'flights=' + Anim.flights.length + ' pending=' + Anim.pending.length);
      var iClones = layer.querySelectorAll('.fly-card');
      var iPulses = layer.querySelectorAll('.fx-pulse');
      want(iClones.length === 1, '亮相只有一个克隆（牌体本身）', iClones.length + ' 个');
      want(iPulses.length === 1, '亮相带一圈光晕', iPulses.length + ' 圈');
      if (iClones.length) {
        var iNode = iClones[0], iInner = iNode.querySelector('.fly-inner');
        want(animKeyframes(iInner) === null, '亮相克隆**不翻转**（.fly-inner 上没有动画）');
        want(Math.abs(parseFloat(cs(iNode, 'width')) - hwCast * 1.35) < 0.6,
          '亮相终点尺寸 = 手位宽 × 1.35（放大由飞行本身承担）',
          r2(parseFloat(cs(iNode, 'width'))) + ' vs ' + r2(hwCast * 1.35));
        var iKf = animKeyframes(iNode);
        want(!!iKf && String(iKf[iKf.length - 1].opacity) === '0',
          '亮相有**收**势（末帧 opacity:0）', iKf ? String(iKf[iKf.length - 1].opacity) : '无关键帧');
        var iT = flyTarget(iNode);
        var batR = document.querySelector('.battle').getBoundingClientRect();
        want(iT && Math.abs(iT.cx - (batR.left + batR.width / 2)) < 1.5
          && Math.abs(iT.cy - (batR.top + batR.height / 2)) < 1.5,
          '亮相的终点是**战场中央**（.battle 的中心）', iT ? r2(iT.cx) + ',' + r2(iT.cy) : '无');
        if (castFrom) {
          var iK0 = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(String(iKf[0].transform));
          want(iK0 && Math.abs((parseFloat(iK0[1]) + parseFloat(cs(iNode, 'width')) / 2)
            - (castFrom.left + castFrom.width / 2)) < 1.5,
            '亮相的**起手**是打出的那张牌在手牌里的位（按下标取陈旧 DOM）',
            iK0 ? r2(parseFloat(iK0[1]) + parseFloat(cs(iNode, 'width')) / 2) + ' vs ' + r2(castFrom.left + castFrom.width / 2) : '无');
        }
      }
      if (iPulses.length) {
        var bg = String(cs(iPulses[0], 'backgroundImage')).replace(/ /g, '');
        want(bg.indexOf('214,64,44') >= 0 && bg.indexOf('224,179,65') < 0,
          '亮相是**朱砂**晕（不是洗牌那圈金晕）  215,64,44 命中 / 金 未命中',
          bg.slice(0, 46) + '…');
      }
      var ov = document.getElementById('overlay');
      want(ov && !ov.classList.contains('hidden'), '亮相期间易物小窗已经开了（所以动画层必须压过 #overlay）');
      want(parseInt(cs(animLayer(), 'zIndex'), 10) > parseInt(cs(ov, 'zIndex'), 10),
        '动画层 z-index 确实高于 #overlay', cs(animLayer(), 'zIndex') + ' > ' + cs(ov, 'zIndex'));
      Anim.skip();
      want(layer.children.length === 0 && Anim.flights.length === 0, '亮相收尾后层与批次清空');

      /* ② 成交交错 */
      log('  --- 成交（pickExchangeHand → pickExchangeNew）---');
      var ex = G.exchange;
      want(!!ex && ex.phase === 'pickHand', '易物停在「选一张手牌」阶段', ex ? ex.phase : '无 G.exchange');
      pickExchangeHand(0);
      want(G.exchange && G.exchange.phase === 'pickNew' && G.exchange.pool.length >= 1,
        '选完手牌进入「换入」阶段，候选池非空',
        G.exchange ? (G.exchange.phase + ' / 池 ' + G.exchange.pool.length) : '无');
      var handN0 = G.hand.length;
      pickExchangeNew(0);
      var xc = layer.querySelectorAll('.fly-card'), xOld = null, xNew = null, q8;
      for (q8 = 0; q8 < xc.length; q8++) {
        var kx = flyKind(xc[q8]);
        if (kx === 'discard') xOld = xc[q8]; else if (kx === 'draw') xNew = xc[q8];
      }
      want(xc.length === 2, '成交只起两条飞行（换出的是非攻击牌 ⇒ 天师那条额外抽牌不触发，基数才确定）',
        '层内 ' + xc.length + ' 个克隆');
      want(!!xOld && !!xNew, '成交起了「一出一进」两条飞行', '出一进一');
      if (xOld && xNew) {
        want(flyDelay(xOld) < flyDelay(xNew), '两条**错开**起手（一出一进交错而过）',
          '出 ' + flyDelay(xOld) + 'ms / 进 ' + flyDelay(xNew) + 'ms');
        want(flyDelay(xNew) - flyDelay(xOld) === 90, '错开的量就是载荷里写死的 90ms',
          (flyDelay(xNew) - flyDelay(xOld)) + 'ms');
        var tOut = flyTarget(xOld), tIn = flyTarget(xNew);
        var pfR = document.querySelector('#pile-discard .pile-face').getBoundingClientRect();
        want(tOut && Math.abs(tOut.cx - (pfR.left + pfR.width / 2)) < 1.5
          && Math.abs(tOut.cy - (pfR.top + pfR.height / 2)) < 1.5,
          '「出」的终点 = 弃牌堆面中心', tOut ? r2(tOut.cx) + ',' + r2(tOut.cy) : '无');
        var newEl = document.querySelector('#hand .card[data-new]');
        if (newEl) {
          var nr = newEl.getBoundingClientRect();
          want(tIn && Math.abs(tIn.cx - (nr.left + nr.width / 2)) < 1.5
            && Math.abs(tIn.cy - (nr.top + nr.height / 2)) < 1.5,
            '「进」的终点 = 换入牌**落位**的手位（按身份找到的 data-new 那张）',
            tIn ? r2(tIn.cx) + ',' + r2(tIn.cy) + ' vs ' + r2(nr.left + nr.width / 2) + ',' + r2(nr.top + nr.height / 2) : '无');
          want(newEl.style.opacity === '0', '换入牌在落位前是**隐身**的（落地才现身）',
            JSON.stringify(newEl.style.opacity));
        } else { want(false, 'render 之后能按 data-new 找到换入的那张牌'); }
        var cNewRef = G.hand[G.hand.length - 1];
        Anim.skip();
        var stillNew = document.querySelector('#hand .card[data-new]');
        want(!stillNew || stillNew.style.opacity !== '0', 'skip() 之后换入牌现身（不再隐身）');
        want(layer.children.length === 0 && Anim.flights.length === 0, '成交收尾后层与批次清空');
        want(NEW_CARDS.has(cNewRef) === false, '收尾把换入牌从 NEW_CARDS 里摘掉（标记不残留）');
      }
      want(G.hand.length === handN0, '成交后手牌张数不变（出一进一）', G.hand.length + ' vs ' + handN0);
      want(!G.exchange, '成交后 G.exchange 已收口');
      want(document.querySelectorAll('#hand .card[style*="opacity"]').length === 0,
        '成交后手牌里没有残留的隐身牌');
      render();
    }
  }

  function emit() {
    if (q.get('quiet')) { document.title = 'FLY'; return; }
    var box = document.createElement('div');
    box.id = '__dbg';
    box.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:99999;background:#000e;'
      + 'color:#0f0;font:11px/1.35 monospace;padding:6px;white-space:pre-wrap;overflow:auto';
    box.textContent = out.join('\n');
    document.body.appendChild(box);
    document.title = 'FLY';
  }

  function run() {
    try { go(); } catch (e) { out.unshift('GO 抛出：' + (e && e.message) + '\n' + ((e && e.stack) || '')); }
    if (errs.length) out.unshift('!! 页内异常：' + errs.join(' | '));
    log('');
    log('视口 ' + window.innerWidth + 'x' + window.innerHeight + ' · 手牌 ' + (pick(q.get('n')) || 5) + ' 张');
    log(bad.length ? ('✗ ' + bad.length + ' 条不合格：\n   - ' + bad.join('\n   - ')) : 'A~I 全部通过 ✓');
    emit();
  }
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run);
})();