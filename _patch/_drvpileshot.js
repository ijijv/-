/* v0.69.0 §C 出图驱动：把「手牌 + 左右两个牌堆」的真实战局画出来，供肉眼验收。
   为什么不能拿 _drvpile.js 出图：那个驱动会在最上面盖一块不透明的 __dbg 角标（占满全屏），
   截图出来只能看见角标。（--dump 与 --screenshot 是两条互斥的路。）

   用法：
     python _patch/shot.py --direct --drv _patch/_drvpileshot.js --widths 1280 --h 720 \
       --q '&n=8&e=huyao&dp=13&dc=6' --out _patch/_shot_pile8.png
   参数（都走 --q 的查询串）：
     n  手牌张数（默认 8）        e  敌人 id 列表，逗号分隔（默认 huyao 单个）
     dp 抽牌堆张数（默认 13）     dc 弃牌堆张数（默认 6）
     hero 角色（shot.py 自己的 --hero，不用在这里传）
*/
(function () {
  var q = new URLSearchParams(location.search);
  function pick(n) { return parseInt(n, 10) || 0; }

  /* 手牌只借 CARDS 的**形状**，不去动真实牌库 —— 这里要的只是「渲染出来长什么样」。 */
  function fakeHand(n) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var c = CARDS[i % CARDS.length];
      out.push({ id: c.id, name: c.name, type: c.type, rarity: c.rarity, cost: c.cost,
                 up: i % 4 === 3, t: c.t, ts: c.ts, eff: c.eff });
    }
    return out;
  }

  function go() {
    var note = 'ok';
    try {
      confirmNewGame();
      pickHero(q.get('hero') || 'tianshi');
      skipOpening();                       // 落到地图（是个 overlay）
      startBattle((q.get('e') || 'huyao').split(','));
      if (typeof closeOverlay === 'function') closeOverlay();   // 摘掉地图/教学面板，露出 #app
      document.body.classList.remove('at-menu');

      G.hand = fakeHand(pick(q.get('n')) || 8);
      G.drawPile = CARDS.slice(0, pick(q.get('dp')) || 13);
      G.discard = CARDS.slice(0, pick(q.get('dc')) || 6);
      G.energy = 3;
      render();
      /* 牌堆计数徽章由 render() 里的 refreshPileCounts() 写 —— 上面 G.drawPile/discard
         是**在 render 之前**赋的，所以这里拿到的就是真数。 */
      if (typeof refreshPileCounts === 'function') refreshPileCounts();
    } catch (e) { note = 'ERR ' + e.message; }
    /* 出图驱动不打角标，但把状态塞进 title —— shot.py 的 --dump 路径能顺带看到它 */
    document.title = 'PILE ' + note;
  }
  if (document.readyState === 'complete') go();
  else window.addEventListener('load', go);
})();