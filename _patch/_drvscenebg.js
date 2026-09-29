/* v0.74.0 六张整屏场景背景的验收驱动：商店/篝火/胜利/失败/选英雄/胜利奖励。
   一次页面加载里把六屏逐个走一遍，回报每一屏的几件事 —— 图有没有真的加载出来、
   黑幕放松了没有、`body.at-menu` 的取值、有没有撑出竖向滚动。

   为什么走**生产入口**（showShop/showCampfire/…）而不是合成 `setBg('shop.jpg')`：
   合成调用只能证明「这条图片路径存在」，证明不了「哪个函数负责挂它」。漏接某一屏、
   把名字写错、把 setBg 写进 show* 而不是 render* —— 这三种真会发生的错法，
   只有在生产入口上跑才会露（合成调用会照样全绿）。

   ⚠️ 五条实测约束（前三条与 _drvevtmtx.js 同源，缺一条报告就会假绿或假红）：
   1) `loseGame()` 开头有 `if(G.dead) return;` 守卫 ⇒ 摆失败屏前必须先把 G.dead 清掉，
      否则那一屏根本不执行，背景留在上一屏而**报告仍然会写下一屏的名字**。
   2) `setBg` 是 `<img>.src=…` + onerror 摘 has-bg ⇒ **必须以 naturalWidth 判 404**，
      不能只看 src 字符串：字符串永远等于你写进去的那个，404 了也照样"对"。
   3) 等图落定必须**事件驱动**（听 load/error），不能用 rAF 轮询 —— 轮询按每帧 16ms
      烧 `--virtual-time-budget`，冷启动读盘时会把预算吃光，症状是只有本进程的
      第一个视口失败（详见 _drvevtmtx.js 那段长注释与 _drvland.js 文件头）。
   4) 断言 `#bg.src` 要在**整段 basename**上做：src 是 percent-encoded 的，
      `slice(-22)` 会切进转义序列中间，切出一堆随机残渣 ⇒ 全行假红。
      ⚠️ 期望的 basename **不手写字符串镜像**，而是拿生产的 `assetURL(bgRel(name))` 现算 ——
      本项目有过「镜像把 bg_map.jpg 算成 bg/map.jpg」的旧账，镜像必漂。
   5) 幕背景的名字不写死 `'act1'`：续档/换幕/无尽之后 G.act 会变，写死就是在赌测试时的状态。
      用 `wantFn` 在**开跑之后**现算（与 startBattle 里那一行同一表达式）。

   本驱动只**回报事实**（src / natural / has-bg / evt-bg / at-menu / overlay 底色）；
   「哪一屏该是什么」这份规格属于 _patch/probe_scenebg.py，不在这里写第二遍。
   用法见该文件。 */
(function () {
  /* 六屏 + 一个控制组。
     ⚠️ `ctl_act` 是**唯一能排除「散弹式放松黑幕」的对照**：幕背景在战局之内，
       背后是真正的战斗 HUD ⇒ evt-bg 必须缺席、黑幕留在 .88。缺了它，
       上面六行的 Y 全都说明不了问题（可能只是开关恒真）。 */
  var SCENES = [
    { id: 'shop',           want: 'shop.jpg',           go: function () { showShop(); } },
    { id: 'campfire',       want: 'campfire.jpg',       go: function () { showCampfire(); } },
    { id: 'victory',        want: 'victory.jpg',        go: function () { showVictory(); } },
    { id: 'defeat',         want: 'defeat.jpg',
      go: function () { G.dead = false; loseGame(); } },   // ← 守卫，见文件头第 1 条
    { id: 'hero_select',    want: 'hero_select.jpg',    go: function () { showHeroSelect(); } },
    { id: 'victory_reward', want: 'victory_reward.jpg', go: function () { showReward(); } },
    /* 控制组没有生产入口，直接铺幕背景（它本来就是 startBattle 里那一行的表达式）。
       ⚠️ 铺之前要**先把 #overlay 的场景类摘干净**：不摘的话这一行量到的黑幕取决于
          **上一屏留下了什么场景类**，调一下 SCENES 的顺序这条就会时红时绿。 */
    { id: 'ctl_act',
      wantFn: function () { return (G && G.endless) ? 'act3' : ('act' + (G ? G.act : 1)); },
      go: function (want) {
        var ov = document.getElementById('overlay');
        if (ov && ov.classList) {
          ['map-scene', 'menu-scene', 'scroll-scene', 'hero-scene', 'pick-scene']
            .forEach(function (c) { ov.classList.remove(c); });
        }
        setBg(want);
      } }
  ];
  var recs = [];
  var i = 0;

  /* 期望的 basename 由**生产函数**现算：assetURL(bgRel(name))。
     这样「期望值」与「游戏实际拼出来的路径」共用同一份规则，不会各写一遍而漂开。 */
  function expectBase(name) { return String(assetURL(bgRel(name))).split('/').pop(); }

  function boot() {
    confirmNewGame();
    pickHero('tianshi');
    skipOpening();
    /* 先把战斗建起来拿到完整状态（G.deck / 遗物池 / 手牌都就位），六屏才有东西可渲染。
       与 _drvevtmtx.js / _drvevt.js 同一条启动路径。 */
    startBattle(['huyao', 'shuigui']);
    if (typeof closeOverlay === 'function') closeOverlay();
    document.body.classList.remove('at-menu');
    step();
  }

  function cs(sel, prop) {
    var e = document.querySelector(sel);
    if (!e || !window.getComputedStyle) return '(节点不在)';
    return window.getComputedStyle(e)[prop];
  }

  function step() {
    if (i >= SCENES.length) return emit();
    var sc = SCENES[i++];
    /* wantFn 在这里求值（boot 之后）—— 见文件头第 5 条。 */
    var want = sc.wantFn ? sc.wantFn() : sc.want;
    wait(sc, want, function (why) {
      var im = document.getElementById('bg') || {};
      var src = String(im.src || '');
      var base = src.split('/').pop() || '(无)';           // ← 整段 basename，不 slice
      var want_base = expectBase(want);
      var srcok = (base === want_base) ? 'Y' : ('N(期望 ' + want_base + ')');
      recs.push([
        sc.id,
        srcok,
        (im.naturalWidth | 0) + 'x' + (im.naturalHeight | 0),
        document.body.classList.contains('has-bg') ? 'Y' : 'N',
        document.body.classList.contains('evt-bg') ? 'Y' : 'N',
        document.body.classList.contains('at-menu') ? 'Y' : 'N',
        cs('#overlay', 'backgroundColor').replace(/^rgba?\(|\)$/g, '').replace(/\s+/g, ''),
        why
      ].join(' | '));
      step();
    });
  }

  /* 摆出第 sc 屏，等 #bg 落定后再回报。
     **先挂监听再触发** —— 反过来的话，图若已在缓存里、请求当场完成，
     load 事件可能在监听挂上之前就发完（概率极小但免费避开）。
     真 404 走 error 分支，照样回报（naturalWidth=0 / has-bg=N）⇒ 报红不假绿。
     5000ms 兜底只是不让整轮卡死，走到它说明有问题（报 timeout，判定交给上层）。 */
  function wait(sc, want, cb) {
    var im = document.getElementById('bg');
    if (!im) return cb('无 #bg');
    var done = false;
    function fin(why) {
      if (done) return;
      done = true;
      im.removeEventListener('load', onL);
      im.removeEventListener('error', onE);
      clearTimeout(tid);
      cb(why);
    }
    function onL() { fin('load'); }
    function onE() { fin('error'); }
    im.addEventListener('load', onL);
    im.addEventListener('error', onE);
    var tid = setTimeout(function () { fin('timeout'); }, 5000);
    sc.go(want);   // ← want 传进去：六屏的生产入口忽略它，控制组要用它铺背景
  }

  function emit() {
    var out = [];
    out.push('vp=' + window.innerWidth + 'x' + window.innerHeight);
    out.push('overflow=' + (document.documentElement.scrollHeight - window.innerHeight));
    /* 反证：把开关摘掉，同一条规则必须立刻回落到基档 —— 不量这一下，
       「0.55 对了」可能只是碰巧命中了别的规则（本项目 CSS 静默失败的老账）。
       ⚠️ 量之前必须**显式摘掉 `#overlay` 上的场景类**（hero-scene 等）：
          留着的话基档 #overlay 的 (1,0,0) 会被更具体的场景规则压过，
          「摘掉开关必须回到 .88」这条期望就会在产物上**假红** ——
          _drvdist.js 的 G 段正是踩了这个（那边跑在 E 段之后、摘不干净），
          只能退而求其次改成相对比较。这里摘得干净，所以敢断言绝对值。 */
    var ov = document.getElementById('overlay');
    if (ov && ov.classList) {
      ['map-scene', 'menu-scene', 'scroll-scene', 'hero-scene', 'pick-scene']
        .forEach(function (c) { ov.classList.remove(c); });
    }
    document.body.classList.remove('evt-bg');
    out.push('overlay_off=' + cs('#overlay', 'backgroundColor'));
    document.body.classList.add('evt-bg');
    out.push('overlay_on=' + cs('#overlay', 'backgroundColor'));
    out.push('panel_bg=' + cs('#overlay .panel', 'backgroundColor'));
    out.push('cols=id | srcok | natural | has-bg | evt-bg | at-menu | overlayRGB | 落定原因');
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