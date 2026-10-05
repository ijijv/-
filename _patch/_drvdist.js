/* _drvdist.js —— **产物**（dist/志怪塔.html）的功能性验证驱动。

为什么非有它不可：`verify_dist.py` 全是文本闸，而本仓的产物是 javascript-obfuscator 混淆过的，
**大量字符串（含中文明文与一部分 ASCII 串）被搬进了 base64 串表** ⇒ 在产物里 grep 任何串都可能
「假缺失」。整块的注释更是在混淆时被整个删掉。实测最扎眼的一次：新写的 `data-new`、`anim-layer`、
`fx-pulse` 在产物原文里出现 **0 次**，看起来像「改动根本没进产物」，实际它们活得很好 ——
只是换了个地方存。所以**产物这一层只能靠跑**，不能靠查。

它验的是什么（每条都对应一处「混淆可能悄悄弄坏」的地方）：
  A. 步 6/7 的全局符号在产物里仍可解析，且 ANIM_DUR 的**值**原样。
  B. `原型.html` 新加的 `.fly-*` / `#anim-layer` 规则**被解析器接受**（grep 到不算证明 ——
     规则文本在文件里、浏览器却丢弃它，是本仓 v0.71.0 连踩三次的静默失败）。
  C. 真打一场：开局发牌（startBattle → drawCards → render）在产物里真的起抽牌动画。
  D. 手动抽一张走生产入口：`render` 尾部的 flush 被调到、`handCardHTML` 真的产出 `data-new`、
     `Anim.skip()` 收尾不留残影。
  E. §三 易物**两段**动画 + §四 pick-scene，全程走生产入口（`playCard` → eff → `animExchangeCast`，
     再 `pickExchangeHand` → `pickExchangeNew` → `animExchangeQueued` → render 尾部 flush）：
     亮相批次开播、克隆落在 z=12 的层上、小窗带 `pick-scene` 且黑幕 .22 / 面板无底 / 卡宽 165、
     成交交错两张（翻背 + 翻正）都在、收尾干净且隐身的牌复明。
  F. 产物**自包含**（发给别人试玩的那一个文件能不能双击就跑）：ASSET_MAP 在、sfx/ 与 music/ 键全套
     内联且值都是 data:audio/、`sampleURL`/`assetURL` 无视 file:// 那道闸直接命中内联表、
     `Store` 在 file:// 下不抛。⚠️ 本段只证**机制**（键在、值是 data:、取址不拐弯）；
     「file:// 下 fetch(data:audio) 真的取到字节并解出 AudioBuffer」是异步的，本文件同步跑完就
     return，证不了 ⇒ 那半边在 `_patch/probe_sfx.py` + `_drvsfx.js`（一次性取证，已实测通过）。
  G. v0.73.0 事件房背景：八个未知事件 id 齐备、每个都有背景键、八张 bg_evt_*.jpg 都内联进
     ASSET_MAP 且值是 data:image/、`setBg(事件背景)` 真的把 #bg 指过去且挂上 body.evt-bg、
     黑幕被放松到 .55、**装/摘开关真的改变底色且摘掉后逐字节回到基线**（可逆才证明是这条
     规则在生效）、evt-bg **不改变** .panel 的底色（正文可读性没被牵连）。
     ⚠️ 最后两条刻意做成**相对**比较，不写死 .88 / 不透明：本探针跑完 E 段之后
     #overlay 还留着场景类，`#overlay.menu-scene` 的实心色与 `#overlay.pick-scene .panel`
     的 background:none 都会赢过基档 ⇒ 写死就是假红（第一版这么写的，产物上红了 2 条）。
  ⚠️ E 段两处**必须掐/必须放宽**的地方（都是探针自身的坑，不是产物的毛病）：
     · 量卡宽前得把 `overlayIn` 掐掉（冻结在 scale(.985)，165 会读成 163 —— 假阳性）；
     · 「隐身的牌」只能断言 ≥1（换出攻击牌 + 天师会给一次额外抽牌，那一张也隐身 ⇒ 张数随机）。

⚠️ 所有游戏侧标识符都走 **frame.contentWindow.eval**，绝不用 `frame.contentWindow.Anim` 这种取法：
   `function` 声明会变成 window 的属性，而 `const/let`（Anim / NEW_CARDS / ANIM_DUR / G / ENEMIES）
   在经典脚本里是**词法全局**、根本不挂 window。第一版探针就是这样把三个 const 误报成
   「产物里没有」的。eval 在全局作用域里执行，词法全局照样解析得到。
⚠️ 驱动脚本（本文件）活在**外层页**，被验的代码在 iframe 里 —— 这是刻意的：
   产物是单文件自包含的，任何注入都会改变它，所以只能从外面往里看。
   外层页由 `_patch/probe_dist.py` 生成（`--allow-file-access-from-files` 下父页可读子帧）。

用法：`python _patch/probe_dist.py`（自建外层页 + 调 headless Chrome，退出码 = 失败条数）
*/
(function () {
  var box = document.getElementById('__out');
  window.onerror = function (m, u, l) { box.textContent = '外层异常 ' + m + ' @' + l; };
  var f = document.createElement('iframe');
  f.src = '../dist/%E5%BF%97%E6%80%AA%E5%A1%94.html';
  f.onload = function () {
    var out;
    try { out = f.contentWindow.eval('(' + SCRIPT + ')()'); }
    catch (e) { out = ['!! eval 抛出：' + (e && e.message) + '\n' + ((e && e.stack) || '')]; }
    box.textContent = out.join('\n');
    document.title = 'DP';
  };
  document.body.appendChild(f);

  /* 这个函数会被 toString() 后丢进 iframe 的全局作用域里跑 ⇒ 里面只能用**产物自己的**标识符，
     一个都不能引用外层页的东西（拿不到）。 */
  function SCRIPT() {
    var L = [], bad = 0;
    function t(c, label, detail) { L.push((c ? '  ok   ' : '  FAIL ') + label + (detail ? '   ' + detail : '')); if (!c) bad++; }
    function cs(el, p) { return getComputedStyle(el)[p]; }

    t(true, 'dist 载入并 eval 成功');
    var names = ['Anim', 'animLive', 'animLayer', 'animRect', 'animDrawQueued', 'animShuffleQueued',
                 'flyCardHTML', 'flyFaceHTML', 'NEW_CARDS', 'ANIM_DUR'];
    var miss = names.filter(function (n) { return typeof eval(n) === 'undefined'; });
    t(miss.length === 0, '步 6/7 的全局符号都在产物里', miss.length ? ('缺 ' + miss.join(',')) : names.length + ' 个齐');
    t(ANIM_DUR.draw === 340 && ANIM_DUR.shuffle === 520 && ANIM_DUR.exchange === 300,
      'ANIM_DUR 的值原样保留', JSON.stringify(ANIM_DUR));

    /* CSS：新规则必须被解析器接受（在文件里 grep 到不算证明） */
    var lay = animLayer();
    t(lay && lay.id === 'anim-layer', 'animLayer() 真的建出了 #anim-layer');
    t(cs(lay, 'position') === 'fixed' && cs(lay, 'zIndex') === '12',
      '#anim-layer 规则活着（fixed / z=12）', cs(lay, 'position') + ' / ' + cs(lay, 'zIndex'));
    var tmp = document.createElement('div');
    tmp.innerHTML = flyCardHTML('<i>x</i>', 132, 200);
    lay.appendChild(tmp.firstChild);
    var node = lay.lastElementChild;
    t(cs(node, 'perspective') === '800px', '.fly-card 规则活着（perspective:800px）', cs(node, 'perspective'));
    t(cs(node.querySelector('.fly-inner'), 'transformStyle') === 'preserve-3d', '.fly-inner 规则活着');
    t(cs(node.querySelector('.fly-back'), 'backfaceVisibility') === 'hidden', '.fly-back 规则活着（backface-visibility）');
    lay.removeChild(node);

    /* 真打一场：开局发牌本身就该是第一次抽牌动画 */
    confirmNewGame(); pickHero('tianshi'); skipOpening();
    startBattle(Object.keys(ENEMIES).slice(0, 3));
    t(flyFaceHTML(cardById('leifu')).indexOf('has-frame') > 0, 'flyFaceHTML → cardBody 在产物里仍可用');
    t(Anim.flights.length >= 1, '开局发牌在产物里起了抽牌动画批次', 'flights=' + Anim.flights.length);
    t(lay.children.length >= 2, '克隆挂上了 #anim-layer', '克隆 ' + lay.children.length + ' 个');
    Anim.skip();
    t(lay.children.length === 0 && Anim.flights.length === 0, 'skip() 收尾干净');

    /* data-new / flush 接线：手动抽一张，全程走生产入口 */
    var n0 = G.hand.length;
    drawCards(1); render();
    t(G.hand.length === n0 + 1, 'drawCards 状态同步', G.hand.length + ' vs ' + (n0 + 1));
    t(Anim.pending.length === 0 && Anim.flights.length === 1, 'render 尾部 flush 真的被调到',
      'pending=' + Anim.pending.length + ' flights=' + Anim.flights.length);
    var dn = document.querySelectorAll('#hand .card[data-new]').length;
    t(dn >= 1, '产物里 handCardHTML 真的产出了 data-new（对象身份标记那一段没被吃掉）', 'data-new 数 ' + dn);
    Anim.skip();
    t(document.querySelectorAll('#hand .card').length === G.hand.length, '手牌 DOM 张数与 G.hand 一致');
    /* 收尾后不许有牌被留在隐身态（settle 里那句 opacity='' 是唯一的还原点）。
       注意不能拿 data-new 的个数当判据 —— 属性是 render 时写进 HTML 的，settle 只清 NEW_CARDS
       与 opacity，属性会留到下一次 render。留着一个没有样式意义的 data-new 无害。 */
    t(document.querySelectorAll('#hand .card[style*="opacity"]').length === 0, '收尾后没有残留的隐身牌',
      document.querySelectorAll('#hand .card').length + ' 张牌查过');

    /* E. §三 易物**两段**动画 + §四 pick-scene：全程走生产入口
          （playCard → eff → animExchangeCast，再 pickExchangeHand → pickExchangeNew
            → animExchangeQueued → render 尾部 flush）。
       为什么必须跑而不是查：产物是混淆过的，`cinnabar` / `pick-scene` 这种串会被搬进
       base64 串表，在产物原文里 grep 到 **0 次**是假缺失（见本文件头部那条教训）。
       ⚠️ 断言不许依赖「此刻手牌恰好有易物」—— 牌序是随机的，没有就现塞一张。 */
    Anim.skip();
    var yi = -1;
    for (var k = 0; k < G.hand.length; k++) { if (G.hand[k].id === 'yiwu') { yi = k; break; } }
    if (yi < 0) {
      G.hand.push(Object.assign({}, cardById('yiwu')));
      yi = G.hand.length - 1;
    }
    t(yi >= 0 && G.hand.length >= 2, '手里有易物、且至少有另一张可换',
      'idx=' + yi + ' 手牌 ' + G.hand.length);
    G.energy = 9;
    var flights0 = Anim.flights.length;
    playCard(yi);
    /* ① 亮相：克隆必须落在 #anim-layer(12) 上，而且**在 #overlay 已经盖上来之后**还看得见
       —— 这正是本层取 z=12 的全部理由（见原型.html 里 #anim-layer 的注释）。 */
    t(Anim.flights.length > flights0, '打出易物在产物里起了亮相动画批次',
      'flights=' + Anim.flights.length);
    t(lay.children.length >= 1, '亮相克隆挂上了 #anim-layer', '克隆 ' + lay.children.length + ' 个');
    var ovl = document.getElementById('overlay');
    var zl = parseInt(cs(lay, 'zIndex'), 10), zo = parseInt(cs(ovl, 'zIndex'), 10);
    t(zl > zo, '#anim-layer 的 z 高于 #overlay（否则亮相被小窗盖住）', zl + ' > ' + zo);
    t(document.body.contains(lay), '#anim-layer 在文档里（不是游离节点）');
    /* §四：易物选牌小窗开出来的 #overlay 必须带 pick-scene —— 产物 CSS 的补集媒体门
       与那六处第三实参都在这一条上见真章。 */
    t(ovl.classList.contains('pick-scene'), '易物选牌小窗的 #overlay 带 pick-scene 场景类',
      'class=' + ovl.className);
    t(cs(ovl, 'backgroundColor') === 'rgba(8, 6, 5, 0.22)', '§四 黑幕被降到 .22（不是 .88）',
      cs(ovl, 'backgroundColor'));
    var pnl = document.querySelector('#overlay .panel');
    t(!!pnl && cs(pnl, 'backgroundColor') === 'rgba(0, 0, 0, 0)', '§四 .panel 纯色底真的去掉了',
      pnl ? cs(pnl, 'backgroundColor') : '(没有 .panel)');
    var rc = document.querySelector('#overlay .reward-cards .card');
    /* ⚠️ 量之前必须把进场动画掐掉。`@keyframes overlayIn` 的起点是
       `scale(.985)`（原型.html 那条），而本探针在 showOverlay 之后**同步**就量 ——
       无头/同步执行的这一拍合成器时钟根本没推进 ⇒ 动画冻在 t=0 ⇒
       每个 #overlayWrap 的后代都被缩小 1.5%：165 → **163**、1280 → 1261。
       不掐就会把 163 报成「1.25 倍没生效」，**是假阳性**。
       这不是给产物开后门：真实用户看到这个弹窗时那 0.3s 早已播完，终态就是 165。
       同一个手法在 `_patch/_drvclip.js` 的夹具里早已用过；本仓对 map-scene 也有一条
       等价的 `#overlay.ov-enter.map-scene #overlayWrap{animation:none;}`（原型.html），
       所以这是本仓既有惯例，不是为探针特设的例外。 */
    var freeze = document.createElement('style');
    freeze.textContent = '#overlay.ov-enter #overlayWrap{animation:none !important;}';
    document.head.appendChild(freeze);
    var cw = rc ? Math.round(rc.getBoundingClientRect().width) : 0;
    t(cw === 165, '§四 卡牌 1.25 倍真的量到了（132×1.25=165）', '实测宽 ' + cw + 'px');
    document.head.removeChild(freeze);

    /* ② 成交交错：pickExchangeHand → pickExchangeNew，两条飞行 delay 差 90ms */
    pickExchangeHand(0);
    t(document.querySelectorAll('#overlay .reward-cards .card').length === 3,
      '换入候选三张（牌堆随机三张）',
      document.querySelectorAll('#overlay .reward-cards .card').length + ' 张');
    /* 净额判据要**算出来**而不是写死 0：本探针选的是天师，而 pickExchangeNew 末尾有一条
       「换出攻击牌 ⇒ 额外抽 1 张」的英雄奖（30_engine.js）⇒ 换出 attack 时净额是 +1。
       （第一版写死 `=== hn0`，同一份产物两次跑出了「6 vs 6」和「7 vs 6」两种结果。）
       pickExchangeHand(0) 把 ex.handIndex 定成 0，所以被换出的就是此刻的 G.hand[0]。 */
    var _oldType = G.hand[0].type;
    var _bonus = (G.hero === 'tianshi' && _oldType === 'attack') ? 1 : 0;
    var hn0 = G.hand.length;
    /* 用**批次身份**判「交错动画开播了」，不判条数 —— 上一条亮相批次（520ms）可能在这几拍里
       自己播完并出列，条数会 1→2 也可能 1→1，判条数是竞态。新出现的 flight 对象才是证据。 */
    var flew = Anim.flights.slice();
    pickExchangeNew(0);
    t(G.exchange === null, '成交后 G.exchange 收口', String(G.exchange));
    t(G.hand.length === hn0 + _bonus, '一出一进净额正确（天师换出攻击牌会额外抽 1 张）',
      G.hand.length + ' vs ' + (hn0 + _bonus) + '（换出 ' + _oldType + ' / 英雄 ' + G.hero + '）');
    var fresh = Anim.flights.filter(function (x) { return flew.indexOf(x) < 0; });
    t(fresh.length >= 1, '成交后 render 尾部 flush 真的开播了交错动画',
      '新批次 ' + fresh.length + ' 个 / 在飞共 ' + Anim.flights.length + ' 个');
    var fly = lay.querySelectorAll('.fly-card');
    t(fly.length >= 1, '交错克隆在 #anim-layer 上', fly.length + ' 个');
    var back = lay.querySelector('.fly-back'), front = lay.querySelector('.fly-front');
    t(!!back && !!front, '一出一进两张都在（翻背 + 翻正）',
      'back=' + !!back + ' front=' + !!front);
    /* 只断言「至少一张」而不是「恰好一张」：换出的若是攻击牌且英雄是天师，
       pickExchangeNew 的末尾会给一次额外抽牌（drawCards(1)），那一张也会被隐身
       ⇒ 张数随牌面随机，判死值就是竞态（第一版这么写，同一份产物两次跑出了 1 和 2）。 */
    var hid = document.querySelectorAll('#hand .card[style*="opacity"]').length;
    t(hid >= 1, '换入那张牌此刻是隐身的（data-new 身份标记没被吃掉）', '隐身 ' + hid + ' 张');
    Anim.skip();
    t(lay.children.length === 0 && Anim.flights.length === 0, '易物动画 skip() 收尾干净');
    t(document.querySelectorAll('#hand .card[style*="opacity"]').length === 0,
      '收尾后换入那张牌已复明（settle 里那句 opacity="" 是唯一还原点）');
    t(document.getElementById('overlay').classList.contains('hidden')
      || cs(document.getElementById('overlay'), 'visibility') === 'hidden'
      || cs(document.getElementById('overlay'), 'opacity') === '0',
      '成交后小窗已收（hideOverlay 生效）');

    /* F. 产物必须**自包含**（2026-09-29 加）。
       为什么值得一条常驻闸：`dist/志怪塔.html` 就是**发给别人试玩的那一个文件** ——
       对方双击打开（file://），没有 python、没有 素材/、没有 js/。而 `js/10_audio.js`
       里有一道 `SFX_FETCH_OK = … && SFX_PROTO!=='file:'` 的闸（注释：「file:// 下 fetch
       会被浏览器拦，别白试」），看起来像是「双击产物就没音效」。**其实不是**：
       `sampleURL()` 是**先查 ASSET_MAP 再回落到相对路径**，而 `loadSfxSamples()` 的早退
       条件是 `!ASSET_MAP && !SFX_FETCH_OK` —— 产物有 ASSET_MAP ⇒ 早退不成立 ⇒ 走
       `fetch(data:…)`，而 data: URI 在 file:// 下 fetch 是通的（已实测，见
       `_patch/probe_sfx.py`：真取到 14448 字节并解出 0.853s/48kHz 的 AudioBuffer）。
       所以本段要钉的正是「ASSET_MAP 真的在、音效真的全套内联」这件事 ——
       它一旦退化（比如打包漏收 sfx/、或 data URI 前缀变了），朋友那边就是**静音**，
       而这在开发树上完全看不出来（开发树走 `素材/` 相对路径，一直是好的）。 */
    var amap = null;
    try { amap = eval('ASSET_MAP'); } catch (e) { }
    t(!!amap, 'F 产物里 ASSET_MAP 已注入（自包含的前提）', amap ? Object.keys(amap).length + ' 个键' : String(amap));
    if (amap) {
      var akeys = Object.keys(amap);
      var sfr = akeys.filter(function (k) { return k.indexOf('sfx/') === 0; });
      var mur = akeys.filter(function (k) { return k.indexOf('music/') === 0; });
      t(sfr.length > 0, 'F 音效采样已内联进 ASSET_MAP（双击产物不会是哑的）', sfr.length + ' 个 sfx/ 键');
      t(mur.length > 0, 'F BGM 也已内联（music/ 键在）', mur.length + ' 个 music/ 键');
      /* 键在还不够 —— 值必须是 data:audio/…，否则 file:// 下拿不到 */
      var notdata = sfr.concat(mur).filter(function (k) { return String(amap[k]).indexOf('data:audio/') !== 0; });
      t(notdata.length === 0, 'F 音效/BGM 的值全是 data:audio/ 内联 URI',
        notdata.length ? ('不是的：' + notdata.slice(0, 3).join(',')) : (sfr.length + mur.length) + ' 条查过');
      /* sampleURL 是音效取址的唯一出口，assetURL 是 BGM/图片的出口：两者都必须
         无视 file:// 那道闸直接命中内联表（这正是「不需要 试玩.py」的机制） */
      if (sfr.length) {
        var u1 = null, u2 = null;
        try { u1 = sampleURL(sfr[0]); u2 = assetURL(sfr[0]); } catch (e) { }
        t(u1 === amap[sfr[0]], 'F sampleURL 直接返回内联 data URI（不被 file:// 那道闸挡住）',
          String(u1).slice(0, 40) + '…');
        t(u2 === amap[sfr[0]], 'F assetURL 同理（BGM 走的就是它）', String(u2).slice(0, 40) + '…');
      }
      /* 产物 <style> 里有 4 条**看起来会 404** 的活声明：.map-roller.top/.bot 的
         url(素材/map/scroll_*.png)、#map-sheet 的 url(素材/bg/bg_map.jpg)+url(素材/map/scroll_paper.jpg)。
         它们是**开发期兜底**（原型.html 与 素材/ 同级）—— 打包.py 不重写 CSS 里的 url()，
         所以这几条在朋友那边就是 4 个静默 404。兜住它们的是运行时 applyMapTextures()：
         走 assetURL() 把**内联属性** background-image 覆盖成 data URI（内联属性赢过样式表）。
         ⚠️ 这条必须实跑：光看「CSS 里有没有」没用，得看覆盖到底有没有发生。
         （verify_dist.py 的 [5] 只证「字面量在产物 <script> 段里找得到」，证不了覆盖生效。） */
      var mapNote = '(showMap 取不到)';
      try {
        /* 走**生产入口** showMap()（它内部 :558 调 applyMapTextures）—— 而不是直接调
           applyMapTextures()：三个节点只有在地图场景渲染出来之后才存在，先直接调只会
           量到「节点不在」，那是探针顺序问题、不是产物的毛病。 */
        showMap();
        var probes = [['.map-roller.top', 'map/scroll_top.png'],
                      ['.map-roller.bot', 'map/scroll_bottom.png'],
                      ['#map-sheet', 'bg/bg_map.jpg']];
        var still = [];
        for (var pi = 0; pi < probes.length; pi++) {
          var pel = document.querySelector(probes[pi][0]);
          if (!pel) { still.push(probes[pi][0] + '(节点不在)'); continue; }
          var pb = cs(pel, 'backgroundImage');
          /* v1.0.8（手机端性能）：applyMapTextures 改走 assetURL(rel, true)，产物里拿到的是
             `blob:` 短地址（为了不把几百 KB 的 base64 每次进地图都塞进 CSS）。本条断言的本意是
             「不许是那条在产物里会静默 404 的相对路径」，`blob:` 与 `data:` 同样满足 ⇒ 两者都收。 */
          if ((pb.indexOf('data:') < 0 && pb.indexOf('blob:') < 0) || pb.indexOf('素材/') >= 0)
            still.push(probes[pi][0] + '=' + pb.slice(0, 30));
        }
        mapNote = still.length ? ('没覆盖成内联：' + still.join(' / ')) : '三条地图纹理都覆盖成 data URI 了';
        t(still.length === 0, 'F 地图卷轴/画心的 CSS 兜底被 assetURL 覆盖成内联（否则产物里有 4 个静默 404）', mapNote);
      } catch (e) {
        t(false, 'F showMap() 抛了', String(e && e.message));
      }

      /* file:// 下 localStorage 在部分浏览器会抛 SecurityError。Store 是**全部**读写的
         唯一入口且自带 try/catch（js/00_base.js）⇒ 只会退化成「不存盘」，不会崩。
         这里只断言「不抛」并把结果报出来 —— 判死值会随浏览器实现漂，不是产物的事。 */
      var storeNote = '(Store 取不到)';
      try {
        Store.set('__distprobe__', 'ok');
        storeNote = 'Store.set 不抛；读回 ' + JSON.stringify(Store.get('__distprobe__'))
          + '（file:// 下若为 null，是浏览器按源隔离存储，只影响存盘，不影响试玩）';
        Store.del('__distprobe__');
        t(true, 'F file:// 下 Store 读写不抛异常（再没有存档也不会崩）', storeNote);
      } catch (e) {
        t(false, 'F file:// 下 Store 抛了 —— try/catch 没兜住', String(e && e.message));
      }

      /* ── G v0.73.0：事件房背景（八个未知事件 ↔ 八张 bg_evt_*.jpg） ──────────────
         为什么必须在这一层（跑一遍）而不是文本闸：这八条路径是**算出来的**
         （EVT_BG 里存的是 'evt_well.jpg' 这种短名，bgRel 再补 bg_ 前缀）⇒ 产物里
         搜不到 'bg_evt_well.jpg' 这个整串，文本闸对「拼出来的路径」会系统性撒谎
         （与 F 段同一条理由）。只能真的调一次 setBg，看 #bg 量到什么、黑幕变成什么。 */
      try {
        var evNames = eval('UNKNOWN_EVENTS'), evMap = eval('EVT_BG');
        t(evNames && evNames.length === 8, 'G 八个事件 id 齐备', '共 ' + ((evNames || []).length) + ' 个');
        var missingKey = (evNames || []).filter(function (k) { return !evMap || !evMap[k]; });
        t(missingKey.length === 0,
          'G 每个事件都有背景键（缺一个就静默回落成 map.jpg，玩到才发现没背景）',
          missingKey.length ? ('缺：' + missingKey.join(',')) : '八个都配了图');

        var noAsset = [], notData = [];
        (evNames || []).forEach(function (k) {
          var rel = bgRel(evMap[k]);
          if (!amap || !amap[rel]) { noAsset.push(rel); return; }
          if (String(amap[rel]).indexOf('data:image/') !== 0) notData.push(rel + '=' + String(amap[rel]).slice(0, 18));
        });
        t(noAsset.length === 0, 'G 八张事件图都打进了 ASSET_MAP（否则事件房静默无背景）',
          noAsset.length ? ('没打进：' + noAsset.join(',')) : '八条都在');
        t(notData.length === 0, 'G 八条都是 data:image/ 内联（不是相对路径，file:// 下也通）',
          notData.length ? notData.join(' / ') : '全是 data URI');

        /* 走生产入口：setBg 顺带挂 body.evt-bg，CSS 再据此放松 #overlay 的黑幕。 */
        setBg(evMap['well']);
        var bgEl = document.getElementById('bg');
        /* v1.0.8（手机端性能）：setBg 现在带 wantBlob=true（战斗背景每次换场景都要重赋，
           不能把几百 KB 的 base64 塞进 <img src>）⇒ 这里取址也要带第二参，才能拿到同一个
           缓存 blob 地址。ASSET_OBJ_URLS 会缓存，所以第二次取到的是同一个串，等值仍成立。 */
        var wantSrc = assetURL(bgRel(evMap['well']), true);
        t(!!bgEl && bgEl.src === wantSrc,
          'G setBg(事件背景) 把 #bg 指向了内联的那张图',
          bgEl ? ('尾部 ' + String(bgEl.src).slice(-24)) : '#bg 不在');
        t(document.body.classList.contains('evt-bg'), 'G 事件背景挂上了 body.evt-bg 开关');

        var ovEl = document.getElementById('overlay');
        /* ⚠️ 反证必须做**相对**的，不能把回落目标写死成 0.88。
           本探针前面几段（易物 / 选牌小窗）会把 #overlay 留在某个场景类下，而
           `#overlay.menu-scene{background:#0b0a09}`（:588）的特异度 (1,1,0) 高于基档
           #overlay 的 (1,0,0) ⇒ 摘掉 evt-bg 之后落到的是那个**场景**色，不是 .88。
           第一版把 0.88 写死、又断言 .panel「不透明」，于是在产物上假红了两条
           （源码树那份矩阵探针 probe_evtmtx.py 是从干净状态进事件房，量到的确实就是 .88）。
           改成「先量基线 → 装开关必须变 → 摘开关必须逐字节回到基线」，
           既与场景类无关，又仍然排除了「碰巧命中别的规则」这个唯一要排除的解释。 */
        document.body.classList.remove('evt-bg');
        var base = ovEl ? cs(ovEl, 'backgroundColor') : '(#overlay 不在)';
        document.body.classList.add('evt-bg');
        var on = ovEl ? cs(ovEl, 'backgroundColor') : '(#overlay 不在)';
        t(on === 'rgba(10, 8, 6, 0.55)',
          'G body.evt-bg 把 #overlay 黑幕放松到 0.55（不放松的话深色场景图只剩 12% 可见度）', on);
        t(on !== base, 'G 装/摘 evt-bg 真的改变了 #overlay 的底色', base + ' → ' + on);
        document.body.classList.remove('evt-bg');
        var back = ovEl ? cs(ovEl, 'backgroundColor') : '(#overlay 不在)';
        document.body.classList.add('evt-bg');
        t(back === base,
          'G 摘掉开关逐字节回到基线（证明是这条规则在生效，不是碰巧命中别的规则）',
          base + ' → ' + on + ' → ' + back);
        /* 事件面板的纯色底**必须没被动过**：面板里有大段说明文字，可读性靠它。
           ⚠️ 同样不能断言「不透明」—— 前面几段会把 #overlay 留在 pick-scene 下，
           而 `#overlay.pick-scene .panel{background:none}` 正是不透明的反面 ⇒ 也是假红。
           这里真正要证的是「evt-bg 这条规则不碰 .panel」，所以量**装与不装开关时是否相同**；
           具体值随场景类而变，只当信息打出来给眼睛看。 */
        var pnl = document.querySelector('#overlay .panel');
        var pOn = pnl ? cs(pnl, 'backgroundColor') : '(panel 不在)';
        document.body.classList.remove('evt-bg');
        var pOff = pnl ? cs(pnl, 'backgroundColor') : '(panel 不在)';
        document.body.classList.add('evt-bg');
        t(pOn === pOff,
          'G evt-bg 开关不改变事件面板 .panel 的底色（放松黑幕没有牵连正文可读性）',
          '装 ' + pOn + ' / 摘 ' + pOff);
        setBg(mapBgName());   // 还原场景，别把 at-menu / evt-bg 状态留给后续
      } catch (e) {
        t(false, 'G 事件房背景探针抛了', String(e && e.message));
      }
    }

    L.push('');
    L.push('bad=' + bad);
    L.push(bad ? ('✗ ' + bad + ' 条不合格') : 'A~G 全部通过 ✓');
    return L;
  }
})();