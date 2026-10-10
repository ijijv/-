/* 一次性驱动（只用于 _shot.html，不进仓库产物）：通关计时榜。
   灌几条成绩 → 拍「设置」入口与「通关计时榜」面板两张图。
   用法：
     python _patch/shot.py --direct --widths 844 --h 390 --drv _patch/_drvclear.js \
       --q "&ui=settings" --out _patch/_shot_set844.png
     python _patch/shot.py --direct --widths 844 --h 390 --drv _patch/_drvclear.js \
       --q "&ui=times"    --out _patch/_shot_times844.png */
(function () {
  var q = new URLSearchParams(location.search);
  function go() {
    try {
      showStartScreen();
      writeClearTimes([
        { hero: 'yincha',   ms: 371500, act: 3, score: 1240, ts: Date.now() - 60000 },
        { hero: 'tianshi',  ms: 402000, act: 3, score: 980,  ts: Date.now() - 3600000 },
        { hero: 'ganshiren',ms: 455000, act: 3, score: 1500, ts: Date.now() - 86400000 },
        { hero: 'wuseng',   ms: 512000, act: 3, score: 760,  ts: Date.now() - 172800000 }
      ]);
      var ui = q.get('ui') || 'times';
      if (ui === 'settings') { showSettings(); document.title = 'DBG settings'; }
      else { showClearTimes(); document.title = 'DBG times'; }
      /* 矮屏（844×390）下面板比视口高，「通关计时榜」按钮在折叠线以下 ⇒ 滚到底才拍得到。 */
      if (q.get('scroll') === '1') setTimeout(function () {
        var p = document.querySelector('#overlayContent .panel') || document.querySelector('.panel');
        if (p) p.scrollTop = p.scrollHeight;
      }, 300);
    } catch (e) { document.title = 'ERR ' + e.message; }
  }
  setTimeout(go, 400);
})();