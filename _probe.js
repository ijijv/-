/* 一次性量尺（临时夹具，不属于游戏）：把卷轴各级元素的实测宽度/相机几何写进 DOM，供 --dump-dom 抓。
   两个坑（都是夹具的，不是游戏的）：
     ① 木轴 792 与画心 760 只差 32px，靠盯截图分不出来 ⇒ 必须量。
     ② `_drv.js` 尾部那次钉帧用的是 **4 参** camYForRow（v0.62.0 写的，没有 padTop），
        而且和 2000ms 进场过渡抢时间 —— 读到的可能是过渡中间态。所以这里**自己再钉一次**，
        用游戏自己的 mapCamRange()/camYForRow(5 参)/setMapCam，钉完再量。 */
setTimeout(function () {
  var out = [];
  try {
    /* 用游戏自己的公式钉到终态（含 padTop） */
    var C = mapCamRange();
    setMapCam(camYForRow(G.mapRow, C.rowH, C.maxY, C.vpH, C.padTop), false, 0);
  } catch (e) { out.push('PIN THROW ' + e.message); }
  setTimeout(function () {
    function R(sel) {
      var e = document.querySelector(sel);
      if (!e) return sel + '=MISSING';
      var b = e.getBoundingClientRect();
      return sel + '=w' + Math.round(b.width) + '@x' + Math.round(b.left);
    }
    out.push('win=' + window.innerWidth, R('.map-scroll'), R('.map-roller.top'),
      R('#map-viewport'), R('#map-sheet'));
    var vp = document.querySelector('#map-viewport'), sh = document.querySelector('#map-sheet');
    var rows = document.querySelectorAll('.map-row');
    var lastRow = rows[rows.length - 1], nd = lastRow && lastRow.querySelector('.map-node');
    var vb = vp.getBoundingClientRect();
    if (nd) {
      var nb = nd.getBoundingClientRect();
      out.push('第1层节点底=' + Math.round(nb.bottom) + ' 视口底=' + Math.round(vb.bottom) +
        ' 差=' + Math.round(nb.bottom - vb.bottom) + '（≥0 = 被切）');
    }
    var C2 = mapCamRange();
    out.push('视口h=' + Math.round(vb.height) + ' sheetH=' + sh.offsetHeight +
      ' rowH=' + C2.rowH + ' padTop=' + C2.padTop + ' maxY=' + C2.maxY +
      ' camY=' + (sh.style.getPropertyValue('--camY') || '-') +
      ' transform=' + getComputedStyle(sh).transform);
    /* 木轴比画心宽多少 —— 用户原话「只比地图的宽度长出一点，不要横跨屏幕」 */
    var rb = document.querySelector('.map-roller.top').getBoundingClientRect();
    var sb = sh.getBoundingClientRect();
    out.push('木轴−画心=' + Math.round(rb.width - sb.width) + 'px（每边 ' +
      Math.round((rb.width - sb.width) / 2) + 'px）');
    /* 对照组：用 v0.62.0 的**4 参**公式（没有 padTop）再钉一次，量「第 1 层被切多少」。
       这是为了把「padTop 到底修了什么」量出来，而不是嘴上说修了。 */
    setMapCam(camYForRow(G.mapRow, C2.rowH, C2.maxY, C2.vpH), false, 0);
    var nb2 = nd.getBoundingClientRect();
    out.push('对照·无padTop 差=' + Math.round(nb2.bottom - vb.bottom) + '（>0 = 被切掉这么多）');
    setMapCam(camYForRow(G.mapRow, C2.rowH, C2.maxY, C2.vpH, C2.padTop), false, 0);
    var d = document.createElement('div');
    d.id = 'probe'; d.textContent = 'PROBE ' + out.join(' | ');
    document.body.appendChild(d);
  }, 400);
}, 3000);