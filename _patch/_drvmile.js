/* 一次性调试驱动：打开「里程碑」或「设置」屏（v1.0.17 核对）。
   跑法： python _patch/shot.py --direct --drv _patch/_drvmile.js --widths 1280 --h 720 --clean --q "&ui=mile"
   默认 ui=mile；--q "&ui=settings" 开设置（看「通关计时榜」入口）。 */
(function () {
  var q = new URLSearchParams(location.search);
  function go() {
    try {
      showStartScreen();
      // 造一份「已解锁到 5/6」的进度，好让节点轴的两种形态同屏可见
      SAVE.progress = SAVE.progress || {};
      SAVE.progress.pts = 1040;
      SAVE.mile = ['hero_ganshiren', 'adv_card', 'potion_new', 'hero_wuseng', 'adv_relic'];
      var ui = q.get('ui') || 'mile';
      if (ui === 'settings') { showSettings(); document.title = 'DBG settings'; }
      else { viewMilestones(); document.title = 'DBG mile'; }
    } catch (e) { document.title = 'ERR ' + e.message; }
  }
  setTimeout(go, 400);
})();