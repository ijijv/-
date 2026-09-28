/* v0.68.1 专用驱动：主菜单「排版 + 尺寸 + 演出」验收。

   为什么要新写一只而不是改 _drvmenu.js：那只是 v0.65.0 的，量的选择器（`.menu-col`、
   `.menu-tier.is-main .btn`）在本轮结构里已经不存在了 —— 复用会量到一片 MISSING，
   看着像"改坏了"，其实是量错了地方。冒烟测不到 CSS（smoke_host 的 DOM 桩是空操作），
   所以本轮的五个诉求**只能靠这只眼睛**：
     ① 两块石碑左右并排 + 入塔明显大于续 + 两个都 ≥ 旧尺寸的 2 倍
     ② 右上三张符纸变小、彼此不重叠
     ③ 标题放大到 ~1.5 倍、且带 drop-shadow 描边特效
     ④ 符纸按下 = menuTug（下拉回弹）
     ⑤ 拉下图鉴 = 卷轴 scrollDrop 从屏幕上方坠落 + 惯性回弹

   ⚠️ 沿用 _drvmenu.js 踩过的坑：**必须 `hideOverlay(); showStartScreen();`**。
      单调 showStartScreen() 时 overlay 本来就开着 ⇒ 门闩算出 wasOpen=true ⇒ ov-enter 被摘掉
      ⇒ 量到 an=none，看着像动画没生效，其实是门闩正确工作的证据。

   用法：
     python _patch/shot.py --direct --widths 1280 --h 720 --drv _patch/_drvmenu3.js --dump
     python _patch/shot.py --direct --widths 1280 --h 720 --drv _patch/_drvmenu3.js --clean --out _patch/_menu_1280.png
     python _patch/shot.py --direct --widths 640 --h 360 --drv _patch/_drvmenu3.js --clean --out _patch/_menu_640.png
     # 拍「卷轴坠落中途」：--q "&pull=300" --budget 920  （300ms 按下 → 420ms 拉回弹 → 落 200ms）
     python _patch/shot.py --direct --widths 1280 --h 720 --drv _patch/_drvmenu3.js --q "&pull=300" --budget 920 --out _patch/_scroll_mid.png */
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
        box.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;background:#000c;color:#0f0;'
          + 'font:11px/1.45 monospace;padding:4px 6px;max-width:100%;white-space:pre-wrap';
        document.body.appendChild(box);
      }
    }
    box.textContent = t;
  }
  function cs(el, p) { try { return getComputedStyle(el).getPropertyValue(p); } catch (e) { return 'ERR'; } }
  function R(sel) {
    var e = document.querySelector(sel);
    if (!e) return null;
    var r = e.getBoundingClientRect();
    return { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width),
             h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom) };
  }
  function f(r) { return r ? (r.l + ',' + r.t + ' ' + r.w + '×' + r.h) : 'MISSING'; }
  /* 旧 v0.65.0 的 clamp 公式（改前的字面值，见 原型.html 注释与 git 里那份计划）。
     这里**按公式反算**而不是引用某个缓存值 —— 反算出来的数就是"不改会是多少"，
     拿它当 2 倍判据的分母，比凭印象说"看着大了"硬。 */
  function clamp(lo, v, hi) { return Math.max(lo, Math.min(hi, v)); }

  function snap(tag) {
    var vw = window.innerWidth, vh = window.innerHeight;
    var st = [tag, 'A vp=' + vw + '×' + vh + ' fxOff=' + (typeof menuFxOff === 'function' ? menuFxOff() : '?')];

    /* ---------- ① 石碑：左右并排 + 入塔更大 + 双 2 倍 ---------- */
    var col = document.querySelector('.menu-col-stele');
    st.push('B .menu-col-stele fd=' + (col ? cs(col, 'flex-direction') : 'MISSING')
      + ' align=' + (col ? cs(col, 'align-items') : '-')
      + ' pos=' + f(R('.menu-col-stele')));
    var S = R('.menu-hit.is-start .menu-art'), C = R('.menu-hit.is-continue .menu-art');
    st.push('C 入塔 start  ' + f(S) + '  an=' + cs(document.querySelector('.menu-hit.is-start .menu-art'), 'animation-name'));
    st.push('D 续   cont   ' + f(C) + '  an=' + cs(document.querySelector('.menu-hit.is-continue .menu-art'), 'animation-name'));
    if (S && C) {
      st.push('E 并排? start.l=' + S.l + ' > cont.r=' + C.r + ' ⇒ ' + (S.l > C.r)
        + '  | 纵向重叠=' + (Math.min(S.b, C.b) - Math.max(S.t, C.t)) + 'px');
      var oS = clamp(120, 0.26 * vh, 300), oC = clamp(92, 0.20 * vh, 226);
      st.push('F 高度比  start ' + oS.toFixed(0) + '→' + S.h + ' = ' + (S.h / oS).toFixed(2) + '×'
        + '   cont ' + oC.toFixed(0) + '→' + C.h + ' = ' + (C.h / oC).toFixed(2) + '×'
        + '   start/cont=' + (S.h / C.h).toFixed(2));
    }
    var hit = R('.menu-hit.is-start');
    st.push('G start 热区 ' + f(hit) + ' disabled=' + (document.querySelector('.menu-hit.is-start') || {}).disabled);

    /* ---------- ② 三张符纸：变小 + 不重叠 ---------- */
    var ts = ['.menu-hit.is-collection', '.menu-hit.is-leaderboard', '.menu-hit.is-setting'];
    var rs = [], names = [];
    for (var i = 0; i < ts.length; i++) {
      var r = R(ts[i] + ' .menu-art');
      rs.push(r);
      names.push(cs(document.querySelector(ts[i] + ' .menu-art'), 'animation-name')
        + '/' + cs(document.querySelector(ts[i] + ' .menu-art'), 'animation-delay'));
    }
    st.push('H 符纸 ' + f(rs[0]) + ' | ' + f(rs[1]) + ' | ' + f(rs[2]));
    var oT = clamp(80, 0.23 * vh, 250), nT = rs[0] ? rs[0].h : 0;
    st.push('I 符纸高度 ' + oT.toFixed(0) + '→' + nT + ' = ' + (oT ? (nT / oT).toFixed(2) : '?') + '×（<1 才是"变小"）');
    var ov = 0;
    if (rs[0] && rs[1]) ov = Math.max(ov, rs[0].r - rs[1].l);
    if (rs[1] && rs[2]) ov = Math.max(ov, rs[1].r - rs[2].l);
    st.push('J 符纸相邻重叠最大=' + ov + 'px（≤0 才叫不重叠）  an=' + names.join(' '));

    /* ---------- ③ 标题：1.5 倍 + 描边特效 ---------- */
    var T = R('.menu-title .menu-art');
    st.push('K 标题 ' + f(T) + '  an=' + cs(document.querySelector('.menu-title .menu-art'), 'animation-name'));
    if (T) {
      var oW = clamp(180, 0.24 * vw, 460), oH = oW * 709 / 2015;
      st.push('L 标题宽 ' + oW.toFixed(0) + '→' + T.w + ' = ' + (T.w / oW).toFixed(2) + '×'
        + '（旧高 ' + oH.toFixed(0) + '→' + T.h + '）');
      var flt = cs(document.querySelector('.menu-title .menu-art'), 'filter');
      st.push('M 描边 filter=' + flt.replace(/\s+/g, ' ').slice(0, 150));
      st.push('N 描边层数=' + (flt.split('drop-shadow').length - 1) + '（≥2 才算"字迹边框"）'
        + '  TL撞? ' + (T && S ? '标题b=' + T.b + ' 碑顶=' + S.t + ' ⇒ ' + (T.b > S.t ? '⚠纵向重叠(横向 ' + T.l + '–' + T.r + ' vs ' + Math.min(S.l, C ? C.l : S.l) + '–' + Math.max(S.r, C ? C.r : S.r) + ')' : '不撞') : '?'));
    }

    /* ---------- ④⑤ 演出 ---------- */
    st.push('O wrap an=' + cs(document.getElementById('overlayWrap'), 'animation-name')
      + ' dur=' + cs(document.getElementById('overlayWrap'), 'animation-duration'));
    st.push('P #overlay.class=' + (document.getElementById('overlay') || {}).className);
    st.push('Q errs=' + (errs.length ? errs.join(' | ') : '0'));
    return st.join('\n');
  }

  function go() {
    try {
      if (typeof hideOverlay === 'function') hideOverlay();
      if (typeof showStartScreen === 'function') showStartScreen();

      /* ?pull=NNN：在 NNN ms 按下「图鉴」那张符纸 —— 走的是真按钮的 onclick，
         不是直接 viewBestiary()，这样 menuTug → talisOpen 的 420ms 闸也一起验了。 */
      var pull = parseInt(q.get('pull') || '0', 10);
      if (pull > 0) {
        setTimeout(function () {
          var b = document.querySelector('.menu-hit.is-collection');
          if (!b) { badge('pull: 没找到 is-collection 按钮'); return; }
          b.click();
          /* 按下后 120ms 采样一次：此刻应正在 menuTug（下拉回弹）里，
             且 .menu-stage 挂着 is-busy（防连点闸生效）。 */
          setTimeout(function () {
            var a = document.querySelector('.menu-hit.is-collection .menu-art');
            var stg = document.querySelector('.menu-stage');
            badge('--- 符纸按下 +' + 120 + 'ms ---\n'
              + '.menu-art an=' + cs(a, 'animation-name') + ' dur=' + cs(a, 'animation-duration') + '\n'
              + 'transform=' + cs(a, 'transform') + '（⚠️ 恒等于首帧，见下方 anim 分支的说明；'
              + '别据此判"回弹没生效"）\n'
              + 'stage.busy=' + (stg && stg.classList && stg.classList.contains('is-busy'))
              + '（防连点闸，演出窗口内必须 true）\n'
              + 'btn.class=' + (b || {}).className + '\n'
              + 'errs=' + (errs.length ? errs.join(' | ') : '0'));
          }, 120);
          /* 卷轴落定后采样：talisOpen 的闸是 420ms，421ms 起才轮到 viewBestiary()。
             ⚠️ 只验**结构性**的三件事（class / animation-name / duration）：
                `--virtual-time-budget` 下合成器动画时钟不走（本仓库既有的「后注册的 rAF
                拿不到帧」是同一件事的另一面）⇒ getComputedStyle(transform) 恒等于首帧，
                量不到"坠落中途"。像素级的中间帧**这只夹具拍不出来**，别拿它当没生效的证据。 */
          setTimeout(function () {
            var ov = document.getElementById('overlay');
            var w = document.getElementById('overlayWrap');
            /* ?anim=1：**手工驱动动画时钟**，把 scrollDrop 的真实轨迹一节一节量出来。
               为什么非这么做不可：`--virtual-time-budget` 下合成器动画时钟不走（同一件事的另一面
               就是本仓库早记过的「后注册的 rAF 拿不到帧」）⇒ getComputedStyle(transform) 永远
               停在首帧 -120vh。而 Web Animations 的 currentTime 是**可写的**，写完之后再读
               computed style 会按新时刻重算 ⇒ 等于把那条曲线逐点采出来。
               ⚠️ 这是"用夹具把动画钉在某一刻"，不是动画自己跑到了那一刻 —— 报数时说清楚。 */
            if (q.get('anim')) {
              var an = (w && w.getAnimations) ? w.getAnimations()[0] : null;
              if (!an) { badge('anim: overlayWrap 上没有动画（scrollDrop 没挂上）'); return; }
              var at = parseFloat(q.get('at') || '0');
              var rows = [];
              [0, 100, 200, 300, 399, 500, 600, 700, 800, 900, 950].forEach(function (t) {
                an.pause(); an.currentTime = t;
                var m = cs(w, 'transform');
                var ty = (m === 'none') ? 0 : parseFloat(m.split(',')[5]);
                rows.push('  t=' + String(t).padStart(3) + 'ms  translateY=' + (ty === 0 ? '0' : ty.toFixed(0)) + 'px');
              });
              an.pause(); an.currentTime = at;
              var m2 = cs(w, 'transform');
              var ty2 = (m2 === 'none') ? 0 : parseFloat(m2.split(',')[5]);
              badge('--- 卷轴 scrollDrop 轨迹（duration=' + (an.effect.getTiming().duration) + 'ms, vh=' + window.innerHeight + '）---\n'
                + rows.join('\n')
                + '\n  停针在 t=' + at + 'ms ⇒ translateY=' + ty2.toFixed(0) + 'px（负=还在屏幕上方）\n'
                + '  判据：t=399(42%) 到 0 → 越过 → t=600 弹到 -26 附近 → 再回 0 → t=800 弹到 -9 附近 → 落定\n'
                + 'errs=' + (errs.length ? errs.join(' | ') : '0'));
              return;
            }
            var app = document.getElementById('app');
            badge('--- 卷轴落定 ---\n'
              + 'body.class=' + document.body.className + '\n'
              + '#app display=' + cs(app, 'display') + ' h=' + (app ? app.offsetHeight : '?') + '\n'
              + '#overlay.class=' + (ov || {}).className + '\n'
              + '  ⇒ 该含 scroll-scene 且**不含** menu-scene（漏摘会继承整屏不透明底）\n'
              + 'wrap an=' + cs(w, 'animation-name') + ' dur=' + cs(w, 'animation-duration') + '\n'
              + 'wrap transform=' + cs(w, 'transform').slice(0, 60) + '\n'
              + '面板标题=' + (document.querySelector('#overlayContent h2') || {}).textContent + '\n'
              + 'errs=' + (errs.length ? errs.join(' | ') : '0'));
          }, 1500);
        }, pull);
        return;
      }

      /* ⚠️ 必须**等一下再量**：石碑/符纸/标题的宽都是 `width:auto`（靠图的内在宽度），
         而 <img> 在图片解码完成前是 0×N —— t=0 量出来的会是一片 w=0 的假象，
         看着像"图没铺上"。等 1200ms 既躲开 ov-enter 入场过渡，也给足解码时间。 */
      var wait = parseInt(q.get('t') || '1200', 10);
      badge('--- t0 刚开，' + wait + 'ms 后出数 ---');
      setTimeout(function () { badge(snap('--- t' + wait + ' 终态 ---')); }, wait);
    } catch (e) {
      badge('THROW ' + e.message);
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(go, 0);
  else window.addEventListener('DOMContentLoaded', function () { setTimeout(go, 0); });
})();