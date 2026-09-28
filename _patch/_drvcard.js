/* v0.68.0 专用驱动：卡牌「真美术牌框」的眼睛。
   （只用于 _shot.html，不进仓库产物。）

为什么必须有它：冒烟里的 DOM 桩 `getBoundingClientRect` 恒 10×10，断不出任何几何。
而牌框这件事**整个就是几何** —— 卡图要塞进图窗、文字要塞进铭牌窗，塞歪了就压金边。
所以只能实拍 + 实量。

本驱动回答 3 个问题：

  Q1 窗位对不对。把 .cframe / .cart-wrap / .cplate 的实际矩形**换算回 385x583 的
     原图坐标系**打出来，直接和离线实测的金描边边界比：
         图窗   目标 45,75 .. 335,280
         铭牌窗 目标 42,344 .. 341,508
     误差 >3px 就说明 CSS 里的百分比要调。

  Q2 文字放不放得下。卡面描述区是 flex:1 + overflow:hidden，**放不下不会报错，只会静默截断**。
     这里把每张牌 .cdesc 的 scrollHeight/clientHeight 全量比一遍，数出有几张被切。
     这是本批最容易悄悄翻车的地方。

  Q3 降级链。牌框图 404 时 cardFrameFail() 该摘掉 .has-frame 让卡片退回纯 CSS 版面。
     用 ?noframe=1 把 ui/card/front.png 的请求打断，验证退回后的样子还能看。

用法：
  python _patch/shot.py --direct --drv _patch/_drvcard.js --widths 1280 --h 720 \
      --clean --out _patch/_cardframe.png
  python _patch/shot.py --direct --drv _patch/_drvcard.js --widths 1280 --h 720 --dump
*/
(function () {
  var errs = [];
  window.onerror = function (m, u, l) { errs.push(m + ' @' + l); };
  var q = new URLSearchParams(location.search);
  var box = null;

  function badge(t) {
    if (q.get('clean')) { document.title = 'DBG(clean)'; return; }
    if (!box) {
      box = document.getElementById('__dbg');
      if (!box) {
        box = document.createElement('div');
        box.id = '__dbg';
        box.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#000d;color:#0f0;'
          + 'font:11px/1.35 monospace;padding:4px 6px;max-width:100%;white-space:pre-wrap';
        document.body.appendChild(box);
      }
    }
    box.textContent = t;
  }

  /* ?noframe=1：把牌框图请求改成不存在的路径，验证「加载失败 → 摘 .has-frame → 退回纯 CSS 版面」。
   ⚠️ 拦 document.createElement **没用** —— artImg/cardFrame 产出的是 HTML 字符串，走 innerHTML，
   由 HTML 解析器建元素，根本不过 createElement（第一版就是这么白测的：has-frame 照样是 true）。
   改拦 assetURL()，它是所有素材路径的唯一出口，且是顶层函数声明 ⇒ 可重新赋值。 */
  if (q.get('noframe')) {
    var _au = assetURL;
    assetURL = function (rel) {
      if (String(rel).indexOf('ui/card/front.png') >= 0) return '素材/ui/card/__nofile__.png';
      return _au(rel);
    };
  }

  var FRAME_W = 385, FRAME_H = 583;
  /* 离线实测的金描边边界（见 原型.html 里 .has-frame 那段注释的推导） */
  var TARGET = {
    '.cart-wrap': [45, 75, 335, 280],
    '.cplate':    [42, 344, 341, 508]
  };

  function toFrame(cardEl, sel) {
    var e = cardEl.querySelector(sel);
    if (!e) return sel + ' MISSING';
    var r = cardEl.getBoundingClientRect(), b = e.getBoundingClientRect();
    if (!r.width) return sel + ' 卡宽为 0';
    var sx = FRAME_W / r.width, sy = FRAME_H / r.height;
    return sel + ' ' + Math.round((b.left - r.left) * sx) + ',' + Math.round((b.top - r.top) * sy)
      + '..' + Math.round((b.right - r.left) * sx) + ',' + Math.round((b.bottom - r.top) * sy);
  }

  function maxDiff(cardEl, sel) {
    var e = cardEl.querySelector(sel);
    if (!e) return ' MISSING';
    var r = cardEl.getBoundingClientRect(), b = e.getBoundingClientRect();
    if (!r.width) return ' 卡宽为 0';
    var sx = FRAME_W / r.width, sy = FRAME_H / r.height;
    var got = [(b.left - r.left) * sx, (b.top - r.top) * sy,
               (b.right - r.left) * sx, (b.bottom - r.top) * sy];
    if (!TARGET[sel]) return '';
    var d = TARGET[sel].map(function (v, i) { return Math.abs(v - got[i]); });
    return ' 最大偏差 ' + Math.max.apply(null, d).toFixed(1) + 'px';
  }

  function guides(cardEl) {
    var g = document.createElement('div');
    g.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:98';
    g.innerHTML =
      '<div style="position:absolute;left:11.69%;top:12.86%;width:75.32%;height:35.16%;'
      + 'outline:1.5px solid #ff00ff;outline-offset:-1.5px"></div>'
      + '<div style="position:absolute;left:10.91%;top:59.01%;width:77.66%;height:28.13%;'
      + 'outline:1.5px solid #00ffff;outline-offset:-1.5px"></div>';
    cardEl.appendChild(g);
  }

  function pick(host, cls) {
    for (var i = 0; i < host.children.length; i++) {
      if (host.children[i].className.indexOf(cls) >= 0) return host.children[i];
    }
    return null;
  }

  function go() {
    var st = [];
    try {
      confirmNewGame();
      pickHero(q.get('hero') || 'tianshi');
      skipOpening();
      st.push('A 初始化 ok hero=' + G.hero + ' deck=' + G.deck.length);

      /* 挑三张代表作：普攻 / 长描述 / 消耗牌（有左侧红条与右上角标，最容易压边） */
      var cards = G.deck.slice();
      var longOne = null, maxLen = 0;
      cards.forEach(function (c) {
        var n = String(c.t(c.up) || '').length;
        if (n > maxLen) { maxLen = n; longOne = c; }
      });
      var oneUse = null;
      for (var i = 0; i < cards.length; i++) { if (isOneUse(cards[i])) { oneUse = cards[i]; break; } }

      var host = document.createElement('div');
      host.id = '__show';
      host.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:9998;'
        + 'background:#14120f;display:flex;align-items:center;justify-content:center;gap:34px;'
        + 'flex-wrap:wrap;padding:16px;box-sizing:border-box;overflow:hidden';
      document.body.appendChild(host);

      /* ① 真实手牌尺寸（132x200）—— 这才是玩家真正看到的 */
      host.innerHTML = handCardHTML(cards[0], false, 0, 1);
      /* ② 同一张放大到 2 倍宽高：看百分比窗位跟不跟得住、文字在大尺寸下如何呼吸
            （字号是 px 不是 em，所以这**不是**真 2 倍缩放，而是「更大卡上版面会怎样」） */
      var big = _ce2(host, handCardHTML(cards[0], false, 0, 1));
      big.style.width = '264px'; big.style.height = '400px'; big.style.marginLeft = '30px';
      big.style.flex = '0 0 auto';
      /* ③ 长描述牌 + 参考线：验证「文字区边界 = 青色框」 */
      var lg = _ce2(host, handCardHTML(longOne, false, 0, 1));
      lg.style.flex = '0 0 auto'; guides(lg);
      /* ④ 消耗牌（红条 + 角标） */
      var ou = _ce2(host, handCardHTML(oneUse || cards[0], false, 0, 1));
      ou.style.flex = '0 0 auto';
      /* ⑤ 奖励面板风格的卡（cardBody 那条路径，与手牌是两份独立实现） */
      var rw = _ce2(host, '<div class="card has-frame r-gold">' + cardBody(cards[0]) + '</div>');
      rw.style.flex = '0 0 auto';
      /* ⑥ 锻造界面的卡（第三份独立实现） */
      var fg = _ce2(host, forgeCardHTML(cards[0], 0));
      fg.style.flex = '0 0 auto';

      var list = host.querySelectorAll('.card');
      st.push('B 样例卡 ' + list.length + ' 张：' +
        ['手牌', '大卡', '长描述+参考线', '消耗牌', '奖励(cardBody)', '锻造(forgeCardHTML)'].join(' / '));

      /* Q1：把「手牌尺寸那张」和「大卡」的窗位都换算回原图坐标 */
      st.push('C 窗位（原图 385x583 坐标）');
      st.push('   手牌卡 ' + toFrame(list[0], '.cart-wrap') + maxDiff(list[0], '.cart-wrap'));
      st.push('   手牌卡 ' + toFrame(list[0], '.cplate') + maxDiff(list[0], '.cplate'));
      st.push('   目标   图窗 45,75..335,280   铭牌窗 42,344..341,508');
      if (big) {
        st.push('   大卡   ' + toFrame(big, '.cart-wrap') + maxDiff(big, '.cart-wrap'));
        st.push('   大卡   ' + toFrame(big, '.cplate') + maxDiff(big, '.cplate'));
      }
      /* 卡图是否真的铺满图窗 */
      var cartImg = list[0].querySelector('.cart');
      st.push('D 卡图 naturalWxH=' + (cartImg ? cartImg.naturalWidth + 'x' + cartImg.naturalHeight : 'MISSING')
        + ' object-fit=' + (cartImg ? getComputedStyle(cartImg).objectFit : '?'));
      /* 牌框底图本身 */
      var fr = list[0].querySelector('.cframe');
      st.push('E 牌框 naturalWxH=' + (fr ? fr.naturalWidth + 'x' + fr.naturalHeight : 'MISSING(已降级)')
        + ' has-frame=' + (list[0].className.indexOf('has-frame') >= 0));

      /* Q2：全牌库扫一遍描述区溢出 —— 这是本批最容易静默翻车的地方 */
      var probeHost = document.createElement('div');
      probeHost.style.cssText = 'position:fixed;left:-99999px;top:0;width:132px';
      probeHost.innerHTML = G.deck.map(function (c) {
        return handCardHTML(c, false, 0, 1);
      }).join('');
      document.body.appendChild(probeHost);
      var over = [], worst = 0, worstName = '';
      probeHost.querySelectorAll('.card').forEach(function (el, i) {
        var d = el.querySelector('.cdesc');
        if (!d) return;
        var need = d.scrollHeight, have = d.clientHeight;
        if (need > have + 1) { over.push(G.deck[i].name + '(' + need + '>' + have + ')'); }
        if (need - have > worst) { worst = need - have; worstName = G.deck[i].name; }
      });
      st.push('F 描述溢出 ' + over.length + '/' + G.deck.length + ' 张'
        + (worst > 0 ? '，最严重 ' + worstName + ' 差 ' + worst + 'px' : '')
        + (over.length ? '：' + over.slice(0, 8).join(' ') : ''));

      /* G：卡宽扫描 —— 定出「字号不动、光把卡做大」需要多大才容得下全部文案。
         这是本批的核心取舍：牌框的铭牌窗只占卡高 28%（旧版式里文字区占 43%），
         所以同一张 132x200 的卡，能装下的描述从 5 行掉到 2 行多。
         字号是 px 不是 em ⇒ **放大卡**能真正换到行数（而按比例放大字号换不到）。
         判定用 scrollHeight>clientHeight，即「静默截断」，正是玩家会看到的现象。 */
      var sweep = [];
      [[132, 9.5], [132, 9.0], [132, 8.5], [144, 9.0], [144, 8.5], [150, 8.5],
       [156, 9.0], [156, 8.5], [162, 9.0], [162, 8.5], [168, 9.5]].forEach(function (cfg) {
        var w = cfg[0], fs = cfg[1];
        var h = Math.round(w / 0.6604);
        var host2 = document.createElement('div');
        host2.style.cssText = 'position:fixed;left:-99999px;top:0';
        host2.innerHTML = G.deck.map(function (c) { return handCardHTML(c, false, 0, 1); }).join('');
        document.body.appendChild(host2);
        var ov2 = 0;
        host2.querySelectorAll('.card').forEach(function (el) {
          el.style.width = w + 'px'; el.style.height = h + 'px';
          var d = el.querySelector('.cdesc');
          if (d) { d.style.fontSize = fs + 'px'; d.style.lineHeight = '1.3'; }
        });
        /* ⚠️ 必须**先设完所有样式、再统一量**。同一个 forEach 里「设样式 → 立刻读
           scrollHeight」看着也能出数，但那是靠 Chrome 的强制回流兜着的；
           浏览器一旦缓存了布局，读到的就是旧值（这个坑在卡宽扫描第一版里踩过：
           全档位都返回同一个数）。分两趟之后结果才跟着尺寸变。 */
        host2.querySelectorAll('.card').forEach(function (el) {
          var d = el.querySelector('.cdesc');
          if (d && d.scrollHeight > d.clientHeight + 1) ov2++;
        });
        sweep.push(w + '@' + fs + ':' + ov2 + '/' + G.deck.length);
        host2.parentNode.removeChild(host2);
      });
      st.push('G 卡宽@描述字号 扫描（描述溢出张数）');
      st.push('   ' + sweep.join('  '));
      st.push('G2 最长文案「' + worstName + '」共 ' + maxLen + ' 字');
      st.push('H errs=' + (errs.length ? errs.join(' | ') : 'none'));
    } catch (e) {
      st.push('!! 抛异常 ' + (e && e.message));
      st.push('   已走到 ' + st.length + ' 步');
    }
    badge(st.join('\n'));
  }

  /* 建一张卡并挂进宿主（手牌那张是 innerHTML 一次性铺进去的，其余都是追加） */
  function _ce2(host, html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    var card = d.firstElementChild;
    host.appendChild(card);
    return card;
  }

  /* 等布局落定再量（入场动画 / 字体都是异步的）。
     ⚠️ 只用 setTimeout，**不要用 requestAnimationFrame** —— headless 的
     `--virtual-time-budget` 下「后注册的 rAF 拿不到帧」（解析期注册的才有），
     套两层 rAF 会让 go() 永远不跑，--dump 打出一片空。这个坑 shot.py 头部记过。 */
  function boot() {
    setTimeout(go, 700);
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') boot();
  else window.addEventListener('DOMContentLoaded', boot);
})();