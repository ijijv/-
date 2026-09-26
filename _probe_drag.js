/* 一次性复现/验证夹具（临时，不属于游戏）：地图的**滚轮**与**左键拖拽**（v0.64.1 修的那个 bug）。
   为什么非要在真浏览器里跑：冒烟 VM 里没有真 DOM、没有事件派发 —— `mapWheelCam` /`mapDragCam`
   那类纯函数对拍只能证明**算术**，证明不了三件事：
     ① 事件真的接到了（监听器挂对了节点、bubbles 到位）；
     ② `passive:false` 真的生效（默认 passive 下 preventDefault() 是空操作，页面会跟着一起滚）；
     ③ 真布局里 `maxY > 0`（一屏装得下的话滚轮按设计不接管，量出来会是「纹丝不动」）。
   用法：python _patch/_probe_drag_run.py        （先注入 _drv.js 把游戏开进地图）
   判读：看 PROBEDRAG 那一行。 */
setTimeout(function () {
  var out = [];
  function cam() {
    var sh = document.getElementById('map-sheet');
    if (!sh || !sh.style || !sh.style.getPropertyValue) return -1;
    var v = parseFloat(sh.style.getPropertyValue('--camY'));
    return isFinite(v) ? v : 0;
  }
  /* 先钉到 maxY 的一半 —— 否则往下滚时可能已经贴着 maxY，看不出位移（假阴性）。 */
  function pin() {
    var C = mapCamRange();
    setMapCam(Math.round(C.maxY / 2), false, 0);
    return C;
  }
  function wheelOn(target, dy, mode) {
    var ev = new WheelEvent('wheel', { deltaY: dy, deltaMode: mode || 0, bubbles: true, cancelable: true });
    target.dispatchEvent(ev);
    return ev;
  }
  try {
    var vp = document.getElementById('map-viewport');
    if (!vp) { out.push('❌ 找不到 #map-viewport（地图没打开？）'); }
    else {
      var C = pin();
      out.push('几何 maxY=' + Math.round(C.maxY) + ' vpH=' + Math.round(C.vpH) + ' rowH=' + C.rowH);
      /* 事件派发点：必须是**视口内部真元素**（我的监听器有 vp.contains(target) 判定，派到视口外会被忽略）。
         ⚠️ 别用 elementFromPoint(视口左上角) —— 本夹具 _drv.js 在 left:0;top:0 压了一块 z-index:9999 的
         #__dbg 调试角标，会把那个点整个盖住，于是派发点变成 #__dbg（在视口外）⇒ 滚轮 Δ 恒为 0，
         看着像「滚轮没修好」，其实是**夹具自己挡的**（第一版就是这么骗过我一次的）。 */
      var mid = document.querySelector('#map-viewport .map-node')
        || document.querySelector('#map-sheet') || vp;
      out.push('派发点=' + (mid.id || mid.className || mid.tagName) + ' insideVP=' + vp.contains(mid));

      /* ① 往下滚 → 看更下面的层 ⇒ camY 变大 */
      var b1 = cam();
      var e1 = wheelOn(mid, 120);
      out.push('① 滚轮下 deltaY=+120: ' + Math.round(b1) + '→' + Math.round(cam()) +
        ' Δ=' + Math.round(cam() - b1) + ' defaultPrevented=' + e1.defaultPrevented);
      /* ② 往上滚 → camY 变小 */
      var b2 = cam();
      wheelOn(mid, -50);
      out.push('② 滚轮上 deltaY=-50: ' + Math.round(b2) + '→' + Math.round(cam()) +
        ' Δ=' + Math.round(cam() - b2));
      /* ③ 行模式（Firefox 常见）：deltaY 只有 3，不换算几乎不动 */
      var b3 = cam();
      wheelOn(mid, 3, 1);
      out.push('③ 行模式 deltaY=+3: Δ=' + Math.round(cam() - b3) + '（不换算的话只会 +3）');
      /* ④ 到底/到顶都夹住，不越界 */
      for (var i = 0; i < 60; i++) wheelOn(mid, 400);
      var atBottom = cam();
      for (var j = 0; j < 60; j++) wheelOn(mid, -400);
      out.push('④ 夹取 狂滚到底=' + Math.round(atBottom) + '(应=' + Math.round(C.maxY) + ')'
        + ' 狂滚到顶=' + Math.round(cam()) + '(应=0)');
      /* ⑤ 视口外派发必须被忽略（别把页面别处的滚轮也吃掉） */
      var outside = document.querySelector('#overlay .map-bottombar') || document.body;
      var b5 = cam();
      wheelOn(outside, 300);
      out.push('⑤ 视口外滚轮: Δ=' + Math.round(cam() - b5) + '（应=0）');

      /* ⑥ 左键从**节点图标**上起拖（bug 现场：图标是 <img>，会被浏览器抢去当原生拖图） */
      var C2 = pin();
      var node = document.querySelector('.map-node img') || document.querySelector('.map-node');
      if (!node) out.push('⑥ 找不到 .map-node');
      else {
        var nb = node.getBoundingClientRect();
        var x = nb.left + nb.width / 2, sy = nb.top + nb.height / 2;
        function pe(type, ty) {
          return new PointerEvent(type, { pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1,
            clientX: x, clientY: ty, bubbles: true, cancelable: true });
        }
        var b6 = cam();
        node.dispatchEvent(pe('pointerdown', sy));
        document.dispatchEvent(pe('pointermove', sy - 20));   // 先过 7px 阈值
        document.dispatchEvent(pe('pointermove', sy + 60));   // 再拖
        var a6 = cam();
        document.dispatchEvent(pe('pointerup', sy + 60));
        out.push('⑥ 左键从图标上拖：' + Math.round(b6) + '→' + Math.round(a6) +
          ' Δ=' + Math.round(a6 - b6) + '（应 ≈ -60 = 起点−(−20 后的净位移 60)）');
        /* ⑦ 根因护栏：这张图到底还可不可拖 —— 这才是 bug 的正面证据 */
        out.push('⑦ 护栏 draggable=' + node.draggable + '(须 false) attr=' + node.getAttribute('draggable') +
          ' computedUserDrag=' + (getComputedStyle(node).webkitUserDrag || '(空)'));
        /* ⑧ 拖完那 400ms 内要点一次「吞掉 click」——防拖地图被误判成点节点 */
        out.push('⑧ 拖后 _mapEatClickUntil=' + (typeof _mapEatClickUntil === 'number' ? '已设(+' +
          Math.round(_mapEatClickUntil - Date.now()) + 'ms)' : '未设'));
      }
    }
  } catch (e) { out.push('THROW ' + e.message); }
  var d = document.createElement('div');
  d.id = 'probedrag';
  d.textContent = 'PROBEDRAG ' + out.join(' | ');
  document.body.appendChild(d);
}, 1500);