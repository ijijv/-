/* 一次性调试驱动：进「里程碑」界面出图，看奖励缩略图有没有被左侧海报列盖住。
   用法：python _patch/shot.py --direct --drv _patch/_drvmile.js --widths 1280 --h 720 [--clean]
   只用于 _shot.html，不进仓库产物。 */
(function () {
  var errs = [];
  window.onerror = function (m, u, l) { errs.push(m + ' @' + l); };
  var q = new URLSearchParams(location.search);

  function go() {
    try {
      confirmNewGame();
      pickHero(q.get('hero') || 'tianshi');
      skipOpening();
      if (typeof closeOverlay === 'function') closeOverlay();
      document.body.classList.remove('at-menu');
      // 给天师灌足里程，好让「已领取 / 可领取」两态都出现在同一屏
      try { SAVE.mile = SAVE.mile || {}; SAVE.mile.tianshi = 99999; } catch (e) {}
      try { SAVE.mileClaimed = SAVE.mileClaimed || {}; } catch (e) {}
      viewMilestones(q.get('hero') || 'tianshi');
      if (errs.length) document.title = 'ERR ' + errs.slice(0, 3).join(' | ');
      else document.title = 'MILE ok';
    } catch (e) {
      document.title = 'THROW ' + e.message;
    }
  }
  setTimeout(go, 500);
})();