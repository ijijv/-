/* 一次性调试驱动：直接进「选择英雄」屏，用于核对 v1.0.17 的选角卡片重做
   （panel_nine 头像框 / btn_primary 名字按钮 / 旧纸纹面板底）。
   跑法： python _patch/shot.py --direct --drv _patch/_drvhero.js --widths 1280 --h 720 --clean */
(function () {
  function go() {
    try { confirmNewGame(); document.title = 'DBG hero-select'; }
    catch (e) { document.title = 'ERR ' + e.message; }
  }
  setTimeout(go, 400);
})();