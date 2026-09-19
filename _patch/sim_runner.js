/* ===== 志怪塔 · 战斗仿真器（追加于全部脚本之后，与引擎同作用域） =====
 * 目的：批2 平衡改数值前，先有一把「可复现的尺子」——同一场景跑 N 场出胜率。
 *
 * 口径声明（重要，别拿它当唯一依据）：
 *   - 这是**贪心 AI 的下限**，不是人类玩家水平；只用来做改前/改后对照。
 *   - 仿真只覆盖**单场战斗**（不含地图/商店/事件），看的是「同等资源下打不打得过」。
 *   - 交互式选牌（焚符/血契弃牌、火符弃牌、守一保留）由下面的自动裁决代打：
 *     弃牌一律「先弃废牌、否则弃最便宜的那张」，守一保留最贵的 need 张。
 *   - 易物（yiwu）会让贪心陷入「打→取消→回手」的死循环，直接进跳过名单。
 *   - 所有随机走 seedRng：同 seed 同结果（v0.61.06 的 rng 就是为这个做的）。
 */
(function () {
  var __sil = function () {};
  try { SETTINGS.lowSpec = true; SETTINGS.sound = false; SETTINGS.musicVol = 0; SETTINGS.sfxVol = 0; } catch (e) {}

  /* ---------- 屏蔽渲染 / 音效 / 存档 / 引导（与 smoke_runner 同一套手法） ---------- */
  try { render = __sil; } catch (e) {}
  try { saveRun = __sil; } catch (e) {}
  try { unlockAchievement = __sil; } catch (e) {}
  try { unlockBestiary = __sil; } catch (e) {}
  try { showOverlay = __sil; } catch (e) {}
  try { hideOverlay = __sil; } catch (e) {}
  try { renderExchange = __sil; } catch (e) {}
  try { turnBanner = __sil; } catch (e) {}
  try { hurtVignette = __sil; } catch (e) {}
  try { heroAnim = __sil; } catch (e) {}
  try { screenMicroShake = __sil; } catch (e) {}
  try { inkBurst = __sil; } catch (e) {}
  try { setBg = __sil; } catch (e) {}
  try { startBGM = __sil; } catch (e) {}
  try { startSynthBGM = __sil; } catch (e) {}
  try { stopBGM = __sil; } catch (e) {}
  try { clearSynthBGM = __sil; } catch (e) {}
  try { ensureAudio = __sil; } catch (e) {}
  try { startGuidedTutorial = __sil; } catch (e) {}
  try { floatMsg = __sil; } catch (e) {}
  try { cardPlayFx = __sil; } catch (e) {}
  try { shakeCard = __sil; } catch (e) {}
  try { bossIntro = function (cb) { if (typeof cb === 'function') cb(); }; } catch (e) {}

  /* ---------- 终局：换成旗标，不跑奖励/结算 UI ---------- */
  var __done = false, __win = false;
  try { winFight = function () { if (__done) return; __done = true; __win = true; G.battleOver = true; }; } catch (e) {}
  try { loseGame = function () { if (__done) return; __done = true; __win = false; G.battleOver = true; G.dead = true; }; } catch (e) {}

  /* ---------- 交互式选牌的自动裁决 ---------- */
  function __worstIdx() {
    var best = -1, bc = 1e9;
    for (var i = 0; i < G.hand.length; i++) {
      var c = G.hand[i]; if (!c) continue;
      if (c.type === 'junk') return i;
      var cost = 0; try { cost = effectiveCost(c); } catch (e) {}
      if (cost < bc) { bc = cost; best = i; }
    }
    return best;
  }
  // 焚符 / 血契：可弃任意张 → 贪心全弃（两张牌都是「每弃 1 张结算一次收益」）
  try {
    renderDiscardSelect = function () {
      var s = G.discardSelect; if (!s) return;
      if (s.need <= 0 || !G.hand.length) { cancelDiscardSelect(); return; }
      s.picked = [];
      for (var i = 0; i < G.hand.length && s.picked.length < s.need; i++) s.picked.push(i);
      confirmDiscardSelect();
    };
  } catch (e) {}
  // 火符：必须弃 1 张 → 弃最便宜的
  try {
    renderHuofuSelect = function () {
      if (!G.huofuSelect) return;
      var i = __worstIdx();
      if (i < 0) { cancelHuofuSelect(); return; }
      pickHuofuDiscard(i);
    };
  } catch (e) {}
  // 守一：保留最贵的 need 张
  try {
    renderRetainSelect = function () {
      var s = G.retainSelect; if (!s) return;
      var idx = G.hand.map(function (c, i) { var v = 0; try { v = cardCost(c); } catch (e) {} return { i: i, v: v }; })
        .sort(function (a, b) { return b.v - a.v; });
      s.picked = idx.slice(0, s.need).map(function (x) { return x.i; }).sort(function (a, b) { return a - b; });
      confirmRetainSelect();
    };
  } catch (e) {}

  /* ---------- 卡牌工厂：每场独立副本 ----------
   * 引擎会改 c.up / c.sealed / c.retain，而 cardById() 返回的是 CARDS 里那个**共享对象**，
   * 多场连跑会互相污染 —— 所以每场都浅拷贝一份（函数字段按引用带上）。 */
  function __card(id, up) {
    var base = cardById(id);
    if (!base) return null;
    var o = {}; for (var k in base) o[k] = base[k];
    o.up = !!up; o.sealed = 0; o.retain = false;
    return o;
  }

  var SIM_SKIP = ['yiwu'];   // 需人判断、且贪心会死循环的牌

  /* ---------- 意图伤害估算（决定这回合该防还是该打） ---------- */
  function __intentDmg(e) {
    var it = e.intent || {}, st = e.strength || 0, pd = e.pendingDamage || 0;
    if (it.type === 'attack') return it.v + st + pd;
    if (it.type === 'multi') return (it.n || 1) * it.v;
    if (it.type === 'aoe') return it.v + st;
    if (it.type === 'attackBlock') return it.v + st;
    return 0;
  }
  function __incoming() {
    var t = 0;
    (G.enemies || []).forEach(function (e) { if (alive(e)) t += __intentDmg(e); });
    return t;
  }
  function __lowestAliveIdx() {
    var best = -1, bh = 1e9;
    for (var i = 0; i < G.enemies.length; i++) {
      var e = G.enemies[i];
      if (alive(e) && e.hp < bh) { bh = e.hp; best = i; }
    }
    return best;
  }

  /* ---------- 贪心：优先补刀 / 该防则防 / 同分低费 ---------- */
  var tried = [];
  function __score(c) {
    var need = Math.max(0, __incoming() - (G.block || 0));
    var s;
    if (c.type === 'attack') s = 60;
    else if (c.type === 'defense') s = need > 0 ? 75 : 25;
    else if (c.type === 'skill') s = 45;
    else s = 20;
    var ti = __lowestAliveIdx();
    if (c.type === 'attack' && ti >= 0 && G.enemies[ti].hp <= 10) s += 30;
    var cost = 0; try { cost = effectiveCost(c); } catch (e) {}
    return s - cost;
  }
  function __pickCard() {
    var best = -1, bs = -1e9;
    for (var i = 0; i < G.hand.length; i++) {
      var c = G.hand[i];
      if (!c || c.sealed > 0 || c.type === 'junk') continue;
      if (tried.indexOf(c) >= 0) continue;
      if (SIM_SKIP.indexOf(c.id) >= 0) continue;
      var cost = 0; try { cost = effectiveCost(c); } catch (e) { continue; }
      if (cost > (G.energy || 0)) continue;
      var hpc = 0; try { hpc = c.hpCost ? c.hpCost(!!c.up) : 0; } catch (e) {}
      if (hpc > 0 && (G.hp - hpc) <= 6) continue;   // 以命相搏只在不会当场暴毙时才用
      var sc = __score(c);
      if (sc > bs) { bs = sc; best = i; }
    }
    return best;
  }
  function __playTurn() {
    tried = [];
    var guard = 0;
    while (!__done && guard++ < 60) {
      var i = __pickCard();
      if (i < 0) break;
      var c = G.hand[i];
      var ti = __lowestAliveIdx();
      if (ti >= 0) G.target = ti;
      tried.push(c);
      playCard(i);
      if (aliveEnemies().length === 0) { if (!__done) { __done = true; __win = true; } break; }
      if (G.hp <= 0 && !__done) { __done = true; __win = false; break; }
    }
  }

  /* ---------- 一场战斗 ---------- */
  function __prep(o) {
    G = newState();
    G.hero = o.hero || 'tianshi';
    G.act = o.act || 1;
    G.endless = false;
    G.maxHp = o.maxHp || 80; G.hp = G.maxHp;
    G.relics = (o.relics || []).slice();
    G.gold = 0; G.potions = [];
    G.deck = [];
    (o.deck || []).forEach(function (id) { var c = __card(id, o.up || 0); if (c) G.deck.push(c); });
    G.drawPile = []; G.hand = []; G.discard = []; G.exhausted = []; G.summons = [];
    seedRng((o.seed >>> 0) || 1);
  }

  function __fight(keys, o) {
    var rec = { win: false, lose: false, stalled: false, turns: 0, hp: 0, taken: 0, error: null };
    try {
      __prep(o);
      __done = false; __win = false;
      startBattle(keys);
      var t = 0, maxT = o.maxTurns || 40;
      while (!__done && t < maxT) {
        t++;
        __playTurn();
        if (__done) break;
        endTurn();
      }
      rec.turns = t; rec.hp = G.hp;
      rec.taken = (G.maxHp || 0) - G.hp;
      if (__win) rec.win = true;
      else if (__done) rec.lose = true;
      else rec.stalled = true;
    } catch (e) {
      rec.error = String((e && e.stack) || e).split('\n').slice(0, 3).join(' | ');
    }
    return rec;
  }

  globalThis.__sim = {
    fight: __fight,
    heroes: HEROES.map(function (h) { return { id: h.id, name: h.name, deck: h.deck }; }),
    acts: ACTS.length,
    ok: true,
  };
})();
