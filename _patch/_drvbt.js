/* 战斗版面「出图 + 安全区定量」驱动（只用于 _shot.html，不进仓库产物）。
   为什么再写一个：_drvland.js 走 load 事件进战斗，而 **load 那一刻游戏 boot 还没落定**
   —— confirmNewGame → pickHero 会在 heroDeck() 里读不到 HEROES（实测 TypeError
   `Cannot read properties of undefined (reading 'deck')`），战斗压根没建起来，
   A~H 段全在量空战场。_drvfx.js 用的 setTimeout(go,400) 才是能跑通的那一种。

   用法：
     python _patch/shot.py --direct --drv _patch/_drvbt.js --widths 1024 --h 474 \
       --q "badge=0&n=8&e=huyao,huapigui,jiangwang"
   参数（走 --q 查询串）：
     n      手牌张数（默认 8）
     e      敌人 id，逗号分隔（默认 huyao,huapigui,jiangwang = 小怪/精英/boss 各一）
     badge=0  不打角标（**出图必须加**，否则角标盖住版面）

   给出两类东西：
     1. 图：版面长什么样（--screenshot 用）
     2. 数：A 段一屏装不装得下 + 每块矩形 + 每只敌人/立绘的矩形与安全区断言
        （badge!=0 时把数写进角标，--dump 直接读）
*/
(function () {
  var q = new URLSearchParams(location.search);
  var out = [], errs = [];
  window.onerror = function (m, u, l) { errs.push(m + ' @' + l); };

  function badge(t) {
    if (q.get('badge') === '0') { document.title = 'BT'; return; }
    var d = document.getElementById('__dbg');
    if (!d) {
      d = document.createElement('div');
      d.id = '__dbg';
      d.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#000c;color:#0f0;'
        + 'font:11px/1.4 monospace;padding:4px 6px;max-width:100%;white-space:pre-wrap';
      document.body.appendChild(d);
    }
    d.textContent = t;
  }

  function R(sel) {
    var e = document.querySelector(sel);
    if (!e || !e.getBoundingClientRect) return null;
    var r = e.getBoundingClientRect();
    return { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), b: Math.round(r.bottom), r: Math.round(r.right) };
  }
  function fmt(name, r) {
    return r ? (name + ' ' + r.w + 'x' + r.h + ' @' + r.l + ',' + r.t + ' 底=' + r.b) : (name + ' 不存在');
  }
  function fakeHand(n) {
    var a = [];
    var want = (q.get('hids') || '').split(',').filter(Boolean);
    for (var i = 0; i < n; i++) {
      var c = want.length ? (CARDS.filter(function (x) { return x.id === want[i % want.length]; })[0] || CARDS[i % CARDS.length])
                          : CARDS[i % CARDS.length];
      a.push({ id: c.id, name: c.name, type: c.type, rarity: c.rarity, cost: c.cost,
               up: i % 4 === 3, t: c.t, ts: c.ts, eff: c.eff });
    }
    return a;
  }
  function ids() {
    var want = (q.get('e') || 'huyao,huapigui,jiangwang').split(',');
    var ok = want.filter(function (k) { return typeof ENEMIES !== 'undefined' && !!ENEMIES[k]; });
    if (ok.length !== want.length) errs.push('敌人 id 不在 ENEMIES：' + want.filter(function (k) { return ok.indexOf(k) < 0; }).join(','));
    return ok.length ? ok : ['huyao'];
  }

  function go() {
    try {
      confirmNewGame();
      var heroId = q.get('hero') || 'tianshi';
      out.push('DBG typeof HEROES=' + (typeof HEROES)
        + ' len=' + (typeof HEROES !== 'undefined' && HEROES ? HEROES.length : '?')
        + ' ids=' + (typeof HEROES !== 'undefined' && HEROES ? HEROES.map(function (h) { return h.id; }).join('/') : '?')
        + ' qHero=「' + q.get('hero') + '」 picked=「' + heroId + '」');
      pickHero(heroId);
      skipOpening();
      if (typeof hideOverlay === 'function') hideOverlay();
      startBattle(ids());
      if (typeof closeOverlay === 'function') closeOverlay();
      document.body.classList.remove('at-menu');
      var n = parseInt(q.get('n'), 10) || 8;
      G.hand = fakeHand(n);
      /* ts=1：把「回合回顾」灌进 #turn-summary —— 它在每次敌方回合里都是**有内容的**，
         而这块（T-short 下约 21px）正好吃掉底部余量。不灌的话量出来的是「最空的一种战斗」，
         会高估能放大多少立绘。放大立绘前必须先看这个最坏值。 */
      if (q.get('ts') === '1') G.turnSummary = '你造成了 <b>12</b> 点伤害 · 击杀 <b>1</b> 只 · 获得 <b>3</b> 金币';
      /* sum=1：灌两只召唤物（纸人 + 小鬼），验证筹码条与顶栏/详情的短写-长写切换。
         ⚠️ 必须放在 startBattle 之后 —— startBattle 会清空 G.summons。 */
      if (q.get('sum') === '1') G.summons = [{ type: 'zhiren', v: 2, dur: 2 }, { type: 'xiaogui', v: 3, dur: 1 }];
      /* bad=1：把「徽章 / 意图 / 顶栏 / 芯片」四类图标一次性铺满，专门用来看图标尺寸。
         不加这个分支时战斗里通常只有 0~1 个徽章，量不出放大后会不会撑爆词条区。 */
      if (q.get('bad') === '1') {
        G.gold = 1234;
        G.relics.push('daoxin', 'shiyu', 'xueyu', 'duanren');
        G.thorns = 3; G.weak = 2; G.burn = 5; G.dodge = 2; G.gouhun = 1;
        var st = { curse: 6, poison: 3, charm: 2, strength: 4, pendingDamage: 7,
                   seal: 1, phase2: 1, block: 12 };
        (G.enemies || []).forEach(function (e, i) {
          e.curse = st.curse; e.poison = st.poison; e.charm = st.charm;
          e.strength = st.strength; e.pendingDamage = st.pendingDamage;
          e.seal = st.seal; e.block = st.block;
          if (i === 0) { e.phase2 = st.phase2; e.ledgerActive = true; }
        });
        /* 灵汁：铺多种，专门量 T-short 详情浮层里 .potion-chip 的图标尺寸与芯片间距（f6）。 */
        G.potions = POTIONS.slice(0, 7).map(function (p) { return Object.assign({}, p); });
        /* 意图类型逐只换开，否则三只都是 attack，只看得到一张攻击图标。 */
        if (G.enemies[1]) G.enemies[1].intent = { type: 'multi', n: 3, v: 5 };
        if (G.enemies[2]) G.enemies[2].intent = { type: 'attackBlock', v: 9, block: 6 };
      }
      /* tbo=1：强制展开顶栏详情（T-short 档默认 TOPBAR_OPEN=false）——
         验证手机档点开「详情」后：芯片仍是短写、详情里出现 `.stat-detail-full` 完整信息行、
         且 `.tb-summons` 已被筹码条取代（不重复）。TOPBAR_OPEN 是 60_boot.js 的顶层 let
         （全局词法绑定、不是 window 属性）⇒ 直接按标识符赋值。 */
      if (q.get('tbo') === '1') TOPBAR_OPEN = true;
      /* pso=1：强制展开召唤物筹码条 —— v1.0.4 起它**默认收起**，要量展开态必须显式打开。
         PSUMMONS_OPEN 同样是 60_boot.js 的顶层 let（全局词法绑定）⇒ 按标识符赋值。 */
      if (q.get('pso') === '1') PSUMMONS_OPEN = true;
      /* notut=1：关掉新手引导气泡 —— 它 `top:50%` 正好压在战场正中，出图时会盖掉
         左边那半只小僵尸，看不出网格版式。TUT / renderTutHint 都是 60_boot.js 的顶层绑定。 */
      if (q.get('notut') === '1') { TUT = null; if (typeof renderTutHint === 'function') renderTutHint(); }
      if (typeof render === 'function') render();
    } catch (e) {
      out.push('!! 初始化失败 ' + (e && e.message));
      out.push('!! 栈 ' + ((e && e.stack) || '').split('\n').slice(0, 4).join(' | '));
      badge(out.join('\n'));
      return;
    }

    var d = document.documentElement;
    var ov = d.scrollHeight - window.innerHeight;
    out.push('A 视口 ' + window.innerWidth + 'x' + window.innerHeight
      + '  溢出 ' + (ov > 0 ? '+' + ov + '  ✗ 顶穿' : ov + '  ✓ 装得下')
      + '   手牌 ' + (parseInt(q.get('n'), 10) || 8) + ' 张');
    out.push('B 各块矩形');
    ['#app', 'h1.title', '#topbar', '#field', '.tb-detail', '.battle', '#player-panel', '.hero-art-box',
     '#enemy-panel', '#turn-summary', '.hand-area', '#hand',
     '#pile-draw', '#pile-discard', '#rune-display', '.endcol'].forEach(function (s) {
      out.push('   ' + fmt(s, R(s)));
    });

    out.push('C 敌人分档与立绘');
    var enAll = document.querySelectorAll('#enemy-panel .enemy');
    var app = R('#app'), vh = window.innerHeight, vw = window.innerWidth;
    var epn = document.getElementById('enemy-panel');
    out.push('   #enemy-panel class=「' + (epn ? epn.className : '?') + '」 display='
      + (epn ? getComputedStyle(epn).display : '?'));
    for (var i = 0; i < enAll.length; i++) {
      var e = enAll[i], re = e.getBoundingClientRect();
      var pr = e.querySelector('.eportrait');
      var rp = pr ? pr.getBoundingClientRect() : null;
      var tier = /e-boss/.test(e.className) ? 'boss' : /e-elite/.test(e.className) ? '精英' : /e-summon/.test(e.className) ? '召唤' : '小怪';
      out.push('   [' + i + '] ' + tier + '  name=' + (e.querySelector('.ename') ? e.querySelector('.ename').textContent : '?')
        + '  敌盒 ' + Math.round(re.width) + 'x' + Math.round(re.height) + ' @' + Math.round(re.left) + ',' + Math.round(re.top)
        + '  立绘 ' + (rp ? Math.round(rp.width) + 'x' + Math.round(rp.height) : '无')
        + '  原图 ' + (pr ? (pr.naturalWidth || 0) + 'x' + (pr.naturalHeight || 0) + (pr.complete ? '' : '(未载完)') : '-'));
      /* 召唤小怪的盒子逐行拆解（v1.0.4 网格版式的行高预算就花在这里） */
      if (/e-summon/.test(e.className) && out.indexOf('   小僵尸子盒') < 0) {
        var ch = e.children, lines = [];
        for (var j = 0; j < ch.length; j++) {
          var cc = ch[j], rcr = cc.getBoundingClientRect();
          var scc = getComputedStyle(cc);
          lines.push(cc.nodeName.toLowerCase() + '.' + (cc.className || '') + ' h=' + Math.round(rcr.height)
            + '(fs=' + scc.fontSize + ',lh=' + scc.lineHeight + ',mt=' + scc.marginTop + ',mb=' + scc.marginBottom + ')');
        }
        out.push('   小僵尸子盒：' + lines.join(' | '));
      }
      /* 安全区三条：不出 #app、不越视口底、不顶进顶栏 */
      if (app && (re.left < app.left - 1 || re.right > app.right + 1)) errs.push('敌人[' + i + '] 越出 #app 左右');
      if (re.top < -1) errs.push('敌人[' + i + '] 顶到视口上沿 top=' + Math.round(re.top));
      if (re.bottom > vh + 1) errs.push('敌人[' + i + '] 越过视口底 bottom=' + Math.round(re.bottom) + ' > ' + vh);
    }
    var hb = R('.hero-art-box'), pp = R('#player-panel');
    if (hb) out.push('   玩家立绘 ' + hb.w + 'x' + hb.h + ' @' + hb.l + ',' + hb.t);
    if (pp && pp.bottom > vh + 1) errs.push('玩家面板越过视口底 ' + pp.bottom);
    var hand = R('.hand-area');
    if (hand && hand.bottom > vh + 1) errs.push('.hand-area 越过视口底 ' + hand.bottom);
    out.push('D errs=' + (errs.length ? errs.join(' | ') : 'none'));
    /* E 段：特效锚点。立绘放大后要确认「特效贴的是放大的立绘、不是旧位置」。
       这里不真播特效（fx() 门禁在冒烟/fixture 里可能是关的），而是用**同一套纯函数**
       fxBoxSize(锚点短边) 把盒子边长与中心算出来 —— 与 playFx/fxTrack 的内联写法同源。 */
    out.push('E 特效（盒子=fxBoxSize(锚点短边×1.15)，落点=锚点中心）');
    function fxLine(tag, r) {
      if (!r || !r.width) return out.push('   ' + tag + '：无锚点');
      var box = (typeof fxBoxSize === 'function') ? fxBoxSize(Math.min(r.width, r.height), vw, vh) : -1;
      out.push('   ' + tag + ' 锚 ' + Math.round(r.width) + 'x' + Math.round(r.height)
        + ' → 盒 ' + box + ' 心 ' + Math.round(r.left + r.width / 2) + ',' + Math.round(r.top + r.height / 2));
    }
    var e0 = document.querySelector('#enemy-panel .enemy');
    if (e0) {
      fxLine('敌人 .enemy（curse/charge/jiangshi 的锚）', e0.getBoundingClientRect());
      var p0 = e0.querySelector('.eportrait');
      if (p0) fxLine('  同只 .eportrait（仅参照）', p0.getBoundingClientRect());
    }
    fxLine('玩家 #player-panel（旧锚）', R('#player-panel') ? document.querySelector('#player-panel').getBoundingClientRect() : null);
    fxLine('玩家 .hero-art-box（新锚）', document.querySelector('.hero-art-box') ? document.querySelector('.hero-art-box').getBoundingClientRect() : null);
    out.push('   fxAliasSel(player) = ' + ((typeof fxAliasSel === 'function') ? fxAliasSel('player') : '?'));
    /* F 段：v1.0.3 顶部合行 + 左竖栏的计算值（合行靠负 margin 与静态定位，必须看计算值，
       不能只看矩形 —— 矩形相同也可能是别的原因）。 */
    out.push('F v1.0.3 顶部合行/左竖栏');
    function cs(sel, props) {
      var el = document.querySelector(sel); if (!el) return out.push('   ' + sel + ' 不存在');
      var s = getComputedStyle(el);
      out.push('   ' + sel + ' ' + props.map(function (p) { return p + '=' + s[p]; }).join(' '));
    }
    cs('h1.title', ['position', 'height', 'fontSize', 'paddingLeft', 'pointerEvents']);
    cs('#topbar', ['position', 'paddingLeft', 'marginTop', 'paddingTop', 'height', 'marginBottom']);
    cs('#field', ['display', 'flex', 'minHeight', 'height']);
    cs('.tb-detail', ['position', 'top', 'left', 'right', 'zIndex', 'maxHeight', 'display']);
    cs('.title-actions', ['position', 'left', 'right', 'top', 'width', 'flexDirection', 'zIndex']);
    var ta = document.querySelector('.title-actions');
    var vtag = document.getElementById('ver-tag');
    if (ta) { var rt = ta.getBoundingClientRect();
      out.push('   竖栏矩形 ' + Math.round(rt.width) + 'x' + Math.round(rt.height)
        + ' @' + Math.round(rt.left) + ',' + Math.round(rt.top) + ' 底=' + Math.round(rt.bottom)); }
    if (vtag) { var rv = vtag.getBoundingClientRect();
      out.push('   V1.0.0 @' + Math.round(rv.left) + ',' + Math.round(rv.top) + ' 右=' + Math.round(rv.right)); }
    /* ② 卡名一行：`justify-content:center` + `overflow:hidden` 时 scrollWidth 恒等于
       clientWidth（居中溢出的那部分是向左溢的，scrollWidth 不认）⇒ **不能**拿它当判据。
       也不能克隆到 body 外量：克隆件丢了 `.card.has-frame` 祖先 ⇒ 后代选择器
       （如 `.cname span{font-size:.6em}`）不生效，量出来的箭头还是原尺寸（假绿）。
       正确做法：**就地**把 .cname 的每个子节点宽度加起来（文本节点用 Range 量），
       再加左右内边距，与容器 border-box 宽（clientWidth）比。 */
    function cnameNeed(cn) {
      var w = 0, n = cn.firstChild;
      while (n) {
        if (n.nodeType === 3) {
          var r = document.createRange(); r.selectNodeContents(n);
          w += r.getBoundingClientRect().width;
        } else if (n.nodeType === 1) {
          w += n.getBoundingClientRect().width;
        }
        n = n.nextSibling;
      }
      var s = getComputedStyle(cn);
      return w + parseFloat(s.paddingLeft || 0) + parseFloat(s.paddingRight || 0);
    }
    var cns = document.querySelectorAll('#hand .card .cname');
    var bad = 0;
    for (var ci = 0; ci < cns.length; ci++) {
      var cn = cns[ci], s = getComputedStyle(cn);
      var need = cnameNeed(cn), avail = cn.clientWidth;
      if (need > avail + 0.5) bad++;
      if (need > avail + 0.5 || ci < 3) out.push('   卡名「' + cn.textContent.trim() + '」 fs=' + s.fontSize
        + ' 需=' + need.toFixed(1) + ' 可=' + avail
        + (need > avail + 0.5 ? '  ✗ 超出 ' + (need - avail).toFixed(1) : '  ✓ 收得进'));
    }
    out.push('   卡名共 ' + cns.length + ' 张，超出 ' + bad + ' 张');
    cs('#end-turn-hint', ['display']);
    /* G 段：v1.0.3 的三个新结构 —— 召唤物筹码条 / 卡面左下角分类标 / 顶栏芯片短写。
       筹码条是「贴玩家立绘右侧、只显示短写」，所以要同时看 display（基档 none）、
       矩形（有没有压到最左那只敌人）与可见文案（innerText 会自动剔除 display:none 的子树）。 */
    out.push('G v1.0.3 新结构（筹码条 / 分类标 / 芯片短写）');
    var ps = document.querySelector('.psummons');
    out.push('   .psummons ' + (ps ? '存在 文案=「' + ps.textContent.replace(/\s+/g, ' ').trim() + '」' : '不存在'));
    cs('.psummons', ['display', 'left', 'top', 'maxWidth']);
    /* v1.0.14：筹码条与折叠键**必须不重叠**（用户实拍两颗筹码叠在一起）。
       两者是同一父盒（.hero-art-box）下的兄弟，筹码条 top:100% 恒在折叠键下方。 */
    var rps = ps ? ps.getBoundingClientRect() : null;
    if (rps) out.push('   .psummons 矩形 ' + Math.round(rps.width) + 'x' + Math.round(rps.height)
      + ' @' + Math.round(rps.left) + ',' + Math.round(rps.top) + ' 底=' + Math.round(rps.bottom));
    var pf = document.querySelector('.ps-fold');
    out.push('   .ps-fold ' + (pf ? '存在 文案=「' + pf.textContent.trim() + '」' : '不存在'));
    if (pf) {
      var rpf = pf.getBoundingClientRect();
      out.push('   .ps-fold 矩形 ' + Math.round(rpf.width) + 'x' + Math.round(rpf.height)
        + ' @' + Math.round(rpf.left) + ',' + Math.round(rpf.top) + ' 底=' + Math.round(rpf.bottom)
        + (rpf.bottom > vh + 1 ? '  ✗ 越视口底' : ''));
      if (rpf.bottom > vh + 1) errs.push('.ps-fold 越过视口底 ' + Math.round(rpf.bottom));
    }
    cs('.ps-fold', ['display', 'position', 'right', 'bottom', 'fontSize']);
    if (rps && pf) {
      var rpf2 = pf.getBoundingClientRect();
      var ov = !(rps.right < rpf2.left || rps.left > rpf2.right || rps.bottom < rpf2.top || rps.top > rpf2.bottom);
      out.push('   .psummons × .ps-fold 重叠？ ' + (ov ? '✗ 重叠' : '✓ 不重叠'));
      if (ov) errs.push('.psummons 与 .ps-fold 重叠');
    }
    var ct = document.querySelector('#hand .ct-corner');
    if (ct) { var rc = ct.getBoundingClientRect();
      out.push('   卡面分类标「' + ct.textContent + '」 ' + Math.round(rc.width) + 'x' + Math.round(rc.height)
        + ' @' + Math.round(rc.left) + ',' + Math.round(rc.top) + ' 底=' + Math.round(rc.bottom)); }
    else out.push('   卡面分类标 不存在');
    cs('#hand .ctype', ['display', 'fontSize']);
    cs('.stat-detail-full', ['display']);
    cs('.tb-summons', ['display']);
    /* K 灵汁芯片（f6）：T-short 详情浮层内必须放大命中区（用户报「拥挤 + 图标小 + 误触」）。
       ⚠️ 首帧图标常是 emoji 回落（`.bicon` 还没生成）⇒ 量芯片盒本身 + 相邻间距最可靠；
          有 `.bicon` 时另报图标尺寸。 */
    var _sp = document.querySelector('.tb-detail .stat-potion');
    var pcs = document.querySelectorAll('.tb-detail .potion-chip');
    out.push('K 灵汁芯片（详情浮层内）n=' + pcs.length
      + ' .stat-potion flexWrap=' + (_sp ? getComputedStyle(_sp).flexWrap : '无'));
    var __prevRight = -1;
    for (var pi = 0; pi < pcs.length && pi < 4; pi++) {
      var pc = pcs[pi], rp = pc.getBoundingClientRect();
      var ip = pc.querySelector('.bicon');
      var gap = (__prevRight >= 0) ? Math.round(rp.left - __prevRight) : -1;
      out.push('   [' + pi + '] 芯片 ' + Math.round(rp.width) + 'x' + Math.round(rp.height)
        + ' @' + Math.round(rp.left) + ',' + Math.round(rp.top)
        + ' 图标 ' + (ip ? Math.round(ip.getBoundingClientRect().width) + 'px' : 'emoji回落')
        + ' 与前一枚间距 ' + (gap < 0 ? '-' : gap + 'px'));
      __prevRight = rp.right;
    }
    var tb = document.getElementById('topbar');
    if (tb) out.push('   顶栏可见文本=「' + tb.innerText.replace(/\s+/g, ' ').trim() + '」');
    /* I 段：拖拽预伤 / 预格挡浮字的落点（用户报「敌人立绘放大后浮字顶出屏幕上沿」）。
       不真造拖拽手势（无头下 PointerEvent 序列太脆），而是直接调那两个 show* 函数 ——
       它们只依赖 DRAG 为真 + G.hand[DRAG.i]/G.enemies[idx]，落点写在行内 style 上：
         left = 锚盒中心、top = 锚盒顶；CSS 是 translate(-50%,-100%)
         ⇒ **标签底边 = 锚盒顶边**，标签顶边 = 锚顶 − 标签高。锚顶 < 标签高 就顶出屏幕上沿。 */
    out.push('I 拖拽浮字落点（标签底=锚顶；顶<' + 0 + ' 即出屏）');
    var __oldDRAG = DRAG;
    function findCard(pred) { for (var i = 0; i < G.hand.length; i++) { try { if (pred(G.hand[i])) return i; } catch (e) {} } return -1; }
    DRAG = { i: 0 };
    var dmgIdx = findCard(function (c) { var pv = previewDamage(c, G.enemies[0]); return pv && pv.d > 0; });
    if (dmgIdx < 0) out.push('   #drag-dmg：手牌里没有对敌 0 有伤害的牌，跳过');
    else {
      DRAG.i = dmgIdx;
      for (var k = 0; k < G.enemies.length; k++) {
        showDragPreview(k);
        var dl = document.getElementById('drag-dmg');
        if (!dl || dl.classList.contains('off')) { out.push('   #drag-dmg 敌人[' + k + ']：未显示'); continue; }
        var rdl = dl.getBoundingClientRect();
        out.push('   #drag-dmg 敌[' + k + '](' + (G.enemies[k] && G.enemies[k].name) + ') 敌盒顶='
          + Math.round(document.querySelector('#enemy-panel .enemy[data-uid="' + G.enemies[k].uid + '"]').getBoundingClientRect().top)
          + '  标签 ' + Math.round(rdl.width) + 'x' + Math.round(rdl.height)
          + ' 顶=' + Math.round(rdl.top) + ' 底=' + Math.round(rdl.bottom)
          + (rdl.top < 0 ? '  ✗ 顶出上沿' : '  ✓'));
        if (rdl.top < 0) errs.push('#drag-dmg 顶出上沿 ' + Math.round(rdl.top));
      }
    }
    var blkIdx = findCard(function (c) { return previewBlock(c) > 0; });
    if (blkIdx < 0) out.push('   #drag-block：手牌里没有格挡>0 的牌，跳过');
    else {
      DRAG.i = blkIdx;
      showDragBlock(blkIdx);
      var bl = document.getElementById('drag-block');
      var hbx = document.querySelector('#player-panel .hero-art-box');
      if (!bl || bl.classList.contains('off')) out.push('   #drag-block：未显示');
      else {
        var rbl = bl.getBoundingClientRect();
        out.push('   #drag-block 玩家立绘顶=' + Math.round(hbx.getBoundingClientRect().top)
          + '  标签 ' + Math.round(rbl.width) + 'x' + Math.round(rbl.height)
          + ' 顶=' + Math.round(rbl.top) + ' 底=' + Math.round(rbl.bottom)
          + (rbl.top < 0 ? '  ✗ 顶出上沿' : '  ✓'));
        if (rbl.top < 0) errs.push('#drag-block 顶出上沿 ' + Math.round(rbl.top));
      }
    }
    DRAG = __oldDRAG;
    if (typeof hideDragPreview === 'function') hideDragPreview();
    if (typeof hideDragBlock === 'function') hideDragBlock();
    out.push('I2 errs(含 I 段)=' + (errs.length ? errs.join(' | ') : 'none'));
    /* J v1.0.11：攻防「动作效果」是**代码关键帧**（不是视频素材）——
       玩家 heroAnim('attack'|'hit') → .hero-art 拿 heroAttack / heroHit；
       敌人 enemyAttackAnim(e) → 当前 DOM 拿 .e-atk → enemyAtk；受击 .hit → shake。
       低配「流畅模式」(.low-spec) 下两条必须都被关掉（animation:none）。 */
    out.push('J v1.0.11 攻防动作关键帧');
    function animOf(el) { return el ? (getComputedStyle(el).animationName + ' ' + getComputedStyle(el).animationDuration) : '无元素'; }
    var hab = document.querySelector('.hero-art-box'), har = document.querySelector('.hero-art');
    if (hab && har && typeof heroAnim === 'function') {
      heroAnim('attack');
      out.push('   玩家 attack → ' + animOf(har) + (getComputedStyle(har).animationName === 'heroAttack' ? '  ✓' : '  ✗'));
      if (getComputedStyle(har).animationName !== 'heroAttack') errs.push('玩家攻击未挂 heroAttack 关键帧');
      heroAnim('hit');
      out.push('   玩家 hit → ' + animOf(har) + (getComputedStyle(har).animationName === 'heroHit' ? '  ✓' : '  ✗'));
      if (getComputedStyle(har).animationName !== 'heroHit') errs.push('玩家受击未挂 heroHit 关键帧');
      heroAnim(null);
    } else out.push('   .hero-art-box/.hero-art/heroAnim 缺失，跳过玩家动作断言');
    var e0 = G.enemies.filter(function (x) { return x.hp > 0; })[0];
    var eel = e0 ? enemyEl(e0) : null;
    if (eel && typeof enemyAttackAnim === 'function') {
      enemyAttackAnim(e0);
      var eelA = enemyEl(e0);
      out.push('   敌人出手 → ' + animOf(eelA) + (getComputedStyle(eelA).animationName === 'enemyAtk' ? '  ✓' : '  ✗'));
      if (getComputedStyle(eelA).animationName !== 'enemyAtk') errs.push('敌人出手未挂 enemyAtk 关键帧');
      eelA.classList.remove('e-atk');
      eelA.classList.add('hit');
      out.push('   敌人受击 → ' + animOf(eelA) + (getComputedStyle(eelA).animationName === 'shake' ? '  ✓' : '  ✗'));
      if (getComputedStyle(eelA).animationName !== 'shake') errs.push('敌人受击未挂 shake 关键帧');
      eelA.classList.remove('hit');
      document.body.classList.add('low-spec');
      enemyAttackAnim(e0);
      var eelB = enemyEl(e0);
      out.push('   低配敌人出手 → ' + animOf(eelB) + (getComputedStyle(eelB).animationName === 'none' ? '  ✓' : '  ✗'));
      if (getComputedStyle(eelB).animationName !== 'none') errs.push('低配下敌人出手动画没关掉');
      eelB.classList.remove('e-atk');
      document.body.classList.remove('low-spec');
    } else out.push('   无存活敌人或 enemyAttackAnim 缺失，跳过敌人动作断言');
    out.push('J2 errs(含 J 段)=' + (errs.length ? errs.join(' | ') : 'none'));
    /* ⚠️ 正常路径必须自己落角标。上一轮删 K 段临时探针时，把原来跟在它后面的这句
       `badge(out.join('\n'))` 一起删掉了 ⇒ --dump 永远报「没找到 __dbg」。
       tip 分支在 finishTip() 里自己落，故先 return。 */
    if (q.get('tip') === '1') { tipTest(); return; }
    badge(out.join('\n'));
  }

  /* H 段（tip=1）：触屏长按浮层的运行时断言。走**真的 PointerEvent(pointerType:'touch')**
     —— 桌面 hover 路径在无头下本来就能触发，单靠它验不出「手机能不能长按」。
     面板用 tippanel=pile|forge 选（默认 pile 牌库；forge 走锻造的两列对照）。
     断言：420ms 后 #tooltip 显示 + 挂 tt-card + 有全文；抬指那一下 click 被吞（不误点）；
     桌面路径（showTip 不传第三参）不挂 tt-card。 */
  function tipTest() {
    var panel = q.get('tippanel') || 'pile';
    out.push('H 触屏长按浮层（tippanel=' + panel + '）');
    try {
      if (panel === 'forge') showForgePicker('camp');
      else if (panel === 'shop') { G.shopWares = G.deck.slice(0, 5); G.shopPotions = []; renderShop(); }
      else { if (G && (!G.drawPile || !G.drawPile.length)) G.drawPile = (G.deck || []).slice(); showPile('draw'); }
    } catch (e) { errs.push('打开面板失败 ' + e.message); }
    /* v1.0.12：面板尾部「返回/确认」按钮应被打上 ov-act-l/ov-act-r（左上/右上拇指区）。
       牌堆/锻造面板尾部没有按钮 ⇒ 只验「不误标」；商店面板尾部 3 枚 ⇒ 验「都打上」。 */
    var __oa = document.querySelectorAll('#overlayContent > .btn.ov-act-l, #overlayContent > .btn.ov-act-r');
    out.push('   ov-act 角标按钮数=' + __oa.length + '（'
      + Array.prototype.map.call(__oa, function (b) { return (b.classList.contains('ov-act-l') ? '左' : '右') + '「' + b.textContent.trim() + '」'; }).join(' ') + '）');
    if (panel === 'shop' && __oa.length !== 3) errs.push('商店面板应有 3 枚角标按钮，实际 ' + __oa.length);
    if (panel !== 'shop' && __oa.length !== 0) errs.push('非商店面板不应有角标按钮，实际 ' + __oa.length);
    var oc = document.getElementById('overlayContent');
    out.push('   面板前：drawPile=' + (G && G.drawPile ? G.drawPile.length : '?')
      + ' deck=' + (G && G.deck ? G.deck.length : '?')
      + ' overlayContent len=' + (oc ? oc.innerHTML.length : -1)
      + ' overlay hidden=' + (document.getElementById('overlay') ? document.getElementById('overlay').classList.contains('hidden') : '?'));
    var cards = document.querySelectorAll('#overlayContent .card');
    var card = cards[0];
    /* tipid=<卡 id>：换成指定的那张卡（初始牌堆里没有的长文案牌，如 shi_wang / xueji），
       用来验「最长的全文在矮屏上放不放得下」。 */
    if (q.get('tipid')) {
      var cd = CARDS.filter(function (x) { return x.id === q.get('tipid'); })[0];
      if (cd) {
        showOverlay('<div class="reward-cards"><div class="card has-frame ' + RCOLOR[cd.rarity] + '">' + cardBody(cd) + '</div></div>');
        cards = document.querySelectorAll('#overlayContent .card');
        card = cards[0];
      } else errs.push('tipid 不在 CARDS：' + q.get('tipid'));
    }
    /* v1.0.11（用户 2026-10-05 报障）：面板卡（锻造 / 易物 / 弃牌 / 商店 / 牌堆 …）
       左下角也必须显示「攻击／防御」小墨牌，才方便玩家按属性筛牌。
       基档 `.ct-corner` 是 display:none、只在 max-height:560px 显示 ⇒ 这里同时断言
       「元素存在」+「可见时四角没越出卡面」。 */
    out.push('   [面板卡] 左下角分类标（应有 .ct-corner）');
    var _ctHave = 0, _ctMiss = 0;
    for (var ci2 = 0; ci2 < cards.length; ci2++) {
      var cc2 = cards[ci2], tag2 = cc2.querySelector('.ct-corner');
      if (!tag2) {
        _ctMiss++;
        if (_ctMiss <= 3) out.push('     ✗ 「' + (cc2.querySelector('.cname') ? cc2.querySelector('.cname').textContent.trim() : '?') + '」无 .ct-corner');
        continue;
      }
      _ctHave++;
      var _cs2 = getComputedStyle(tag2), _r2 = tag2.getBoundingClientRect(), _ra2 = cc2.getBoundingClientRect();
      var _out2 = (_cs2.display !== 'none') && (_r2.left < _ra2.left - 1 || _r2.right > _ra2.right + 1 || _r2.top < _ra2.top - 1 || _r2.bottom > _ra2.bottom + 1);
      if (ci2 < 3) out.push('     「' + tag2.textContent + '」 display=' + _cs2.display
        + ' ' + Math.round(_r2.width) + 'x' + Math.round(_r2.height) + ' @' + Math.round(_r2.left) + ',' + Math.round(_r2.top)
        + (_cs2.display === 'none' ? '（基档隐藏，桌面应如此）' : (_out2 ? '  ✗ 越出卡面' : '  ✓')));
      if (_out2) errs.push('面板卡分类标越出卡面');
    }
    out.push('     面板卡 ' + cards.length + ' 张：有标 ' + _ctHave + ' / 无标 ' + _ctMiss);
    if (_ctMiss > 0) errs.push('面板里有 ' + _ctMiss + ' 张卡缺 .ct-corner（用户报障未修净）');
    var holder = card && card.querySelector('[data-cardid]');
    out.push('   面板 .card 数=' + cards.length
      + '  data-cardid=「' + (holder ? holder.getAttribute('data-cardid') : '无') + '」'
      + '  cardup=「' + (holder ? holder.getAttribute('data-cardup') : '无') + '」');
    if (!card || !holder) { errs.push('面板里拿不到带 data-cardid 的卡'); out.push('D errs=' + errs.join(' | ')); return badge(out.join('\n')); }
    var art = card.querySelector('.cart-wrap') || card;
    var r = art.getBoundingClientRect();
    var cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + Math.min(20, r.height / 2));
    function pev(type) {
      art.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true, clientX: cx, clientY: cy }));
    }
    var t0 = Date.now();
    pev('pointerdown');
    setTimeout(function () {
      var tt = document.getElementById('tooltip');
      var shown = !!(tt && tt.classList.contains('show'));
      out.push('   长按 ' + (Date.now() - t0) + 'ms 后 show=' + shown
        + ' tt-card=' + (tt ? tt.classList.contains('tt-card') : '?')
        + ' 文案长度=' + (tt ? tt.textContent.length : 0)
        + ' 全文=「' + (tt ? tt.textContent.replace(/\s+/g, ' ').trim().slice(0, 140) : '') + '」');
      if (!shown) errs.push('长按后 #tooltip 未显示');
      if (tt && !tt.classList.contains('tt-card')) errs.push('长按卡牌未挂 .tt-card（宽度没放宽）');
      if (shown) {
        var tr = tt.getBoundingClientRect();
        out.push('   浮层矩形 ' + Math.round(tr.width) + 'x' + Math.round(tr.height)
          + ' @' + Math.round(tr.left) + ',' + Math.round(tr.top) + ' 底=' + Math.round(tr.bottom)
          + '（视口 ' + window.innerWidth + 'x' + window.innerHeight + '）');
        if (tr.left < -1 || tr.right > window.innerWidth + 1) errs.push('浮层越出视口左右 ' + Math.round(tr.left) + '~' + Math.round(tr.right));
        if (tr.top < -1 || tr.bottom > window.innerHeight + 1) errs.push('浮层越出视口上下 ' + Math.round(tr.top) + '~' + Math.round(tr.bottom));
      }
      /* 抬指 → click：必须被吞掉（不能顺手把这张牌点掉） */
      pev('pointerup');
      var hits = 0; var probe = function () { hits++; };
      card.addEventListener('click', probe);
      art.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      card.removeEventListener('click', probe);
      out.push('   抬指后 click 到达卡上的次数=' + hits + '（应为 0）');
      if (hits !== 0) errs.push('长按抬指那一下没被吞掉（会误点牌/选项）');
      /* 桌面路径回归：showTip 不传第三参必须摘掉 .tt-card */
      showTip('<div class="tt-line">桌面路径</div>', { clientX: cx, clientY: cy });
      out.push('   桌面 showTip(2 参) tt-card=' + (tt.classList.contains('tt-card') ? 'true ✗' : 'false ✓'));
      if (tt.classList.contains('tt-card')) errs.push('桌面 hover 路径也挂上了 .tt-card');
      /* 手牌整体跳过：直接问 tipSpecAt（不派发 pointerdown，免得把 cardPointerDown 的拖拽起手也带起来） */
      var handCard = document.querySelector('#hand .card');
      if (handCard && typeof tipSpecAt === 'function') {
        out.push('   手牌触点 tipSpecAt=' + (tipSpecAt(handCard) ? '有(✗)' : 'null(✓)'));
        if (tipSpecAt(handCard)) errs.push('手牌未跳过长按浮层（会与 showCardZoom 打架）');
      }
      /* ② [data-tip] 触摸路径：敌人名牌（触屏长按应弹浮层，且**不带** tt-card） */
      hideOverlay();
      var en = document.querySelector('#enemy-panel .ename');
      if (!en) return finishTip();
      var er = en.getBoundingClientRect();
      var ex = Math.round(er.left + er.width / 2), ey = Math.round(er.top + er.height / 2);
      en.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true, clientX: ex, clientY: ey }));
      setTimeout(function () {
        var tt2 = document.getElementById('tooltip');
        var s2 = !!(tt2 && tt2.classList.contains('show'));
        out.push('   敌人名牌（[data-tip]）长按 show=' + s2
          + ' tt-card=' + (tt2 ? tt2.classList.contains('tt-card') : '?')
          + ' 文案=「' + (tt2 ? tt2.textContent.replace(/\s+/g, ' ').trim().slice(0, 90) : '') + '」');
        if (!s2) errs.push('敌人名牌长按未弹浮层（[data-tip] 的触摸通路失效）');
        if (tt2 && tt2.classList.contains('tt-card')) errs.push('非卡浮层错误地挂上了 .tt-card');
        finishTip();
      }, 520);
      function finishTip() {
        out.push('D errs=' + (errs.length ? errs.join(' | ') : 'none'));
        badge(out.join('\n'));
      }
    }, 520);
  }

  setTimeout(go, 400);
})();