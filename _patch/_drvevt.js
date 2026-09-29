/* v0.73.0 事件房背景：把某一个未知事件直接摆出来，用于出图看背景。
   参数（走 --q 查询串）：
     ev  事件 id（well/blackmarket/temple/ambush/forge/empty/potion/remove），默认 well
   用法：
     python _patch/shot.py --drv _patch/_drvevt.js --widths 1280 --h 720 --q "&ev=well" --out _patch/_evt_well.png
   ⚠️ 走**默认的 iframe 模式**出图，不要 --direct（见 shot.py 文件头：--direct 在
      --virtual-time-budget 下对 fixed + 曾被 transform 提层的元素会漏栅格化）。 */
(function () {
  var q = new URLSearchParams(location.search);
  function go() {
    confirmNewGame();
    pickHero('tianshi');
    skipOpening();
    /* 先把战斗建起来拿到一份完整状态（G.deck / G.hp / 遗物池都就位），
       再把战斗面板关掉、改成事件房 —— 与真实流程「踩到未知节点」等价。 */
    startBattle(['huyao', 'shuigui']);
    if (typeof closeOverlay === 'function') closeOverlay();
    document.body.classList.remove('at-menu');

    var ev = q.get('ev') || 'well';
    SCENE = 'unknown';
    /* 走**生产入口**的那两行：背景用 EVT_BG 表 + setBg（它顺带挂 body.evt-bg），
       面板用 doUnknown（它内部就是真实的那几个 showOverlay）。 */
    setBg((typeof EVT_BG !== 'undefined' && EVT_BG[ev]) || 'map.jpg');
    doUnknown(ev);

    if (q.get('rep') === '1') report(ev);
  }

  /* ?rep=1：把「黑幕到底被放松了没有」用**计算样式**读出来，而不是靠肉眼看图。
     本项目的老账：CSS 能不能 grep 到、子串闸绿不绿，都证明不了规则没被解析器丢弃
     （见 _drvclip.js 的 rules= 模式与更新日志里连踩三次的记录）。
     ⚠️ 只在这一支里建 #__dbg —— 它是铺满全屏的 fixed 层，会盖住截图。 */
  function report(ev) {
    var out = [];
    function cs(sel, prop) {
      var e = document.querySelector(sel);
      if (!e || !window.getComputedStyle) return '(节点不在)';
      return window.getComputedStyle(e)[prop];
    }
    out.push('事件 id = ' + ev);
    out.push('EVT_BG[' + ev + '] = ' + ((typeof EVT_BG !== 'undefined' && EVT_BG[ev]) || '(缺键)'));
    out.push('bgRel 之后 = ' + bgRel(EVT_BG[ev]));
    var bg = document.getElementById('bg');
    out.push('#bg src 尾部 = ' + String(bg && bg.src || '').slice(-28));
    out.push('body.evt-bg = ' + document.body.classList.contains('evt-bg'));
    out.push('body.at-menu = ' + document.body.classList.contains('at-menu'));
    out.push('#overlay background-color = ' + cs('#overlay', 'backgroundColor')
      + '   ← 期望 rgba(10, 8, 6, 0.55)');
    /* 反证：把开关摘掉，同一条规则必须立刻回落到基档 .88。
       不量这一下，「值对了」可能只是碰巧命中了别的规则。 */
    document.body.classList.remove('evt-bg');
    out.push('#overlay background-color（摘掉 evt-bg 后）= ' + cs('#overlay', 'backgroundColor')
      + '   ← 期望回到 rgba(10, 8, 6, 0.88)');
    document.body.classList.add('evt-bg');
    out.push('#overlay background-color（装回 evt-bg）= ' + cs('#overlay', 'backgroundColor')
      + '   ← 期望又是 0.55（证明可逆、且规则真的在生效）');
    /* .panel 的底色必须**没被动过**：事件面板的正文可读性靠它 */
    out.push('.panel background-color = ' + cs('#overlay .panel', 'backgroundColor')
      + '   ← 期望不透明（事件面板的纯色底，本批刻意不动）');
    out.push('#bg display = ' + cs('#bg', 'display') + ' / body.has-bg = '
      + document.body.classList.contains('has-bg'));

    var pre = document.createElement('div');
    pre.id = '__dbg';
    pre.textContent = out.join('\n');
    document.body.appendChild(pre);
  }
  /* 与 _drvland.js 同一套竞态处理：游戏自己的异步 boot 之后还会再显示一次地图
     overlay。这里让它落定后再摆事件房，并把 overlay 的过渡掐掉（无头里过渡走不完）。 */
  function run() {
    try { go(); } catch (e) {
      var pre = document.createElement('pre');
      pre.id = '__dbg';
      pre.textContent = 'GO 抛出：' + (e && e.message) + '\n' + ((e && e.stack) || '');
      document.body.appendChild(pre);
    }
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(run, 0);
  } else {
    window.addEventListener('DOMContentLoaded', function () { setTimeout(run, 0); });
  }
})();