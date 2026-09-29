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

    L.push('');
    L.push('bad=' + bad);
    L.push(bad ? ('✗ ' + bad + ' 条不合格') : 'A~D 全部通过 ✓');
    return L;
  }
})();