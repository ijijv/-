/* v0.73.0 事件房背景的**验收矩阵**驱动：一次页面加载里把八个事件房逐个摆出来，
   回报每个的三件事 —— 图有没有真的加载出来、黑幕放松了没有、有没有撑出竖向滚动。

   为什么要一次跑完八个而不是一次一个：八个事件 id 与八张图的对应关系是**算出来的**
   （EVT_BG 存短名、bgRel 补 bg_ 前缀），产物里根本不存在 'bg_evt_well.jpg' 这个整串
   ⇒ 任何文本闸都会在这一类路径上系统性地撒谎。只能**跑**（见
   `_patch/verify_dist.py` 的 evtBg 那两条 check 为何要进游戏作用域求值）。

   ⚠️ 三条实测约束，缺一条这份报告就会假绿或假红：
   1) `doUnknown()` 的八个分支**没有一个**会调 setBg / startBattle（已逐条读过
      js/50_ui.js:787-871；拦路恶鬼的 startBattle 挂在那颗按钮的 onclick 上，不点不会走）
      ⇒ 循环摆八个是安全的，背景不会被后继代码改掉。唯一会「换事件」的是牌组太短时的
      兜底（unknownRemove / unknownForge → unknownEmpty），所以这里只在**背景**层面回报。
   2) `setBg` 是 `<img>.src=…` + onerror 摘 has-bg ⇒ **必须以 naturalWidth 判 404**，
      不能只看 src 字符串：字符串永远等于你写进去的那个，404 了也照样"对"。
   3) 等图落定必须 rAF 轮询 `img.complete`。`--virtual-time-budget` 下 rAF 跑得极快、
      不占墙钟；而刚设完 src 就同步读 complete 常常还是 false（假红）。

   参数（走查询串）：无。八个事件写死在 EVS，顺序与 js/50_ui.js 的 UNKNOWN_EVENTS 一致。
   用法见 _patch/probe_evtmtx.py。 */
(function () {
  var EVS = ['well', 'blackmarket', 'temple', 'ambush', 'forge', 'empty', 'potion', 'remove'];
  var recs = [];
  var i = 0;

  function boot() {
    confirmNewGame();
    pickHero('tianshi');
    skipOpening();
    /* 先把战斗建起来拿到一份完整状态（G.deck / 遗物池都就位），再关掉战斗面板
       改成事件房 —— 与真实流程「踩到未知节点」等价，也与 _drvevt.js 同一条路。 */
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
    if (i >= EVS.length) return emit();
    var ev = EVS[i++];
    SCENE = 'unknown';
    /* 走生产入口：背景用 EVT_BG 表 + setBg（顺带挂 body.evt-bg），面板用 doUnknown */
    var want = (typeof EVT_BG !== 'undefined' && EVT_BG[ev]) || 'map.jpg';
    wait(ev, want, function (why) {
      var im = document.getElementById('bg') || {};
      var src = String(im.src || '');
      /* 路径断言要在**整串**上做，不能取固定长度的尾部：src 是 percent-encoded 的，
         slice(-22) 会正好切进 %E5%8E%9F 这类转义序列中间，切出来的头两个字符是随机残渣
         ⇒ 八条全报假红（这份夹具的头一版就是这么翻车的）。 */
      var base = src.split('/').pop() || '(无)';
      var srcok = (base === 'bg_evt_' + ev + '.jpg') ? 'Y' : 'N';
      recs.push([
        ev,
        srcok + ':' + base,
        (im.naturalWidth | 0) + 'x' + (im.naturalHeight | 0),
        document.body.classList.contains('has-bg') ? 'Y' : 'N',
        document.body.classList.contains('evt-bg') ? 'Y' : 'N',
        cs('#overlay', 'backgroundColor').replace(/^rgba?\(|\)$/g, '').replace(/\s+/g, ''),
        why
      ].join(' | '));
      step();
    });
  }

  /* 摆出第 ev 个事件房，等 #bg 落定后再回报。**先挂监听再 setBg** —— 反过来的话，
     图若已在缓存里、请求当场就完成，load 事件可能在监听挂上之前就发完（概率极小但免费避开）。

     ⚠️ 等待必须是**事件驱动**的，不能用 rAF 轮询。这一版最初是 rAF 轮询
     「complete && naturalWidth>0 && body.has-bg」，语义没错但会**吃掉虚拟时间预算**：
     `--virtual-time-budget` 把每帧记 16ms，而冷启动时八张 1920x1080 的图要真读盘，
     轮询期间预算照走 ⇒ 8 事件 × 150 帧兜底 ≈ 19.2s，正好顶掉 20s 预算，
     `--dump-dom` 抓到的 DOM 里还没有 #__out。症状是**只有本次进程的第一个视口**失败
     （唯一的冷启动），后面几个全绿 —— 极容易被误判成「大视口有 bug」。
     改成听 load/error 之后，等待期间一帧都不烧，预算只花在真正渲染上。
     ⚠️ 也不能只判 `complete`：它在图片尺寸已知时就翻真，而 setBg 的 onload
     （唯一给 body 加 has-bg 的地方，见 js/10_audio.js:411）是**随后排队的一个任务**
     ⇒ 只等 complete 会量到 naturalWidth=1920x1080 却 has-bg=N（实测踩到过，也是夹具的坑）。
     `load` 事件发完时 onload 已经跑过，所以听 load 天然没有这个竞态。
     ⚠️ 真 404 走 error 分支，照样回报（naturalWidth=0 / has-bg=N）⇒ 报红不假绿。 */
  function wait(ev, want, cb) {
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
    setBg(want);
    doUnknown(ev);
  }

  function emit() {
    var out = [];
    out.push('vp=' + window.innerWidth + 'x' + window.innerHeight);
    out.push('overflow=' + (document.documentElement.scrollHeight - window.innerHeight));
    /* 反证：把开关摘掉，同一条规则必须立刻回落到基档 —— 不量这一下，
       「0.55 对了」可能只是碰巧命中了别的规则（本项目 CSS 静默失败的老账）。 */
    document.body.classList.remove('evt-bg');
    out.push('overlay_off=' + cs('#overlay', 'backgroundColor'));
    document.body.classList.add('evt-bg');
    out.push('overlay_on=' + cs('#overlay', 'backgroundColor'));
    out.push('panel_bg=' + cs('#overlay .panel', 'backgroundColor'));
    out.push('cols=ev | srcok:basename | natural | has-bg | evt-bg | overlayRGB | 落定原因');
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