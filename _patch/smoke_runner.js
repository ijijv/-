/* ===== 志怪塔 Task#13 冒烟 runner（追加于 <script> 末尾，与引擎同作用域） ===== */
(function () {
  /* ---------- 外围降级：保留结算逻辑，屏蔽渲染/音效/存档/成就/召唤 UI 的副作用 ---------- */
  try { SETTINGS.lowSpec = true; SETTINGS.sound = false; SETTINGS.musicVol = 0; SETTINGS.sfxVol = 0; } catch (e) {}
  var __sil = function () {};
  try { render = __sil; } catch (e) {}
  try { saveRun = __sil; } catch (e) {}
  try { unlockAchievement = __sil; } catch (e) {}
  try { unlockBestiary = __sil; } catch (e) {}
  try { showOverlay = __sil; } catch (e) {}
  try { hideOverlay = __sil; } catch (e) {}
  try { renderDiscardSelect = __sil; } catch (e) {}
  try { renderExchange = __sil; } catch (e) {}
  try { renderRetainSelect = __sil; } catch (e) {}
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
  try { bossIntro = function (cb) { if (typeof cb === 'function') cb(); }; } catch (e) {}
  try { enemyAct = __sil; } catch (e) {} // 免触发 enemyAct->startTurn 连锁；finishEndTurn 骑乘结算仍原样执行

  var rep = { ok: true, errors: [], cardsTotal: 0, heroes: {}, pass: 0, fail: 0 };
  var _p = 0, _f = 0;

  function __ok(name, cond, detail) {
    if (cond) { _p++; return true; }
    _f++; rep.ok = false;
    rep.errors.push(name + (detail !== undefined ? ' | ' + detail : ''));
    return false;
  }
  function __card(id) { return CARDS.find(function (c) { return c.id === id; }); }
  function __fresh() {
    var keys = ['youhun', 'jiangshi']; // 普通怪：避开 boss/精英 特效与词缀分支
    G.enemies = keys.map(function (k) { return makeEnemy(ENEMIES[k], k); });
    G.target = 0;
    return G.enemies;
  }
  function __base(hero) {
    G = newState();
    G.hero = hero; G.act = 1; G.endless = false; G.relics = [];
    G.hp = 60; G.maxHp = 80; G.block = 0; G.energy = 9; G.gold = 0;
    G.deck = []; G.drawPile = []; G.hand = []; G.discard = []; G.summons = [];
    G.lastDrawnCards = []; G.尸气 = 0; G.xuenu = 0;
    CURSE_THIS_TURN = 0;
    G.hpLostTurn = 0; G.blockGainedTurn = 0; G.summonsMadeTurn = 0;
    G.xuejiArmed = false; G.endBlockKind = null; G.xiejia = 0; G.thorns = 0;
    G.hitHeal = 0; G.hitCurse = 0; G.hitShiqi = 0; G.hitRage = 0; G.hitBlock = 0; G.nextBlock = 0;
    G.dodge = 0; G.dodgeShiqi = 0; G.dodgeNextBlock = 0; G.dodgeHealRage = 0; G.dodgeCurse = 0;
    G.ranhunType = null; G.ranhunSelf = null; G.bloodPact = 0; G.retain = 0; G.boostCurse = 0;
    G.zhouyuA = false; G.turnAtkBuff = 0; G.karmaFire = 0; G.burn = 0; G.weak = 0; G.gouhun = 0;
    __fresh();
    return G;
  }
  function __fill() { G.drawPile = ['leifu', 'jingang', 'zhiren'].map(__card); }
  function __sumCurse() { return G.enemies.reduce(function (a, e) { return a + (e.curse || 0); }, 0); }
  function __sumHp() { return G.enemies.reduce(function (a, e) { return a + e.hp; }, 0); }
  var __HEROES = ['ganshiren', 'wuseng', 'yincha', 'tianshi'];

  /* ============ 1) 静态结构 ============ */
  rep.cardsTotal = CARDS.length;
  __ok('CARDS 恰为 48 张', CARDS.length === 48, '实际 ' + CARDS.length);
  var ids = CARDS.map(function (c) { return c.id; });
  __ok('卡牌 id 无重复', new Set(ids).size === ids.length);
  var okRar = ['white', 'blue', 'purple', 'gold'];
  var okType = ['attack', 'defense', 'skill', 'spirit'];
  CARDS.forEach(function (c) {
    __ok('card:' + c.id + ' 结构合法',
      c && typeof c.name === 'string' && typeof c.t === 'function' && typeof c.eff === 'function' &&
      okType.indexOf(c.type) >= 0 && okRar.indexOf(c.rarity) >= 0 && typeof c.cost === 'number');
  });

  /* ============ 2) 全卡 x 全英雄：t(false)/t(true)/eff(false) 冒烟 ============ */
  __HEROES.forEach(function (hero) {
    var tf = [], ef = [];
    CARDS.forEach(function (card) {
      __base(hero);
      G.hand = [card]; __fill(); G.hp = 60; G.block = 0; G.energy = 9;
      try { var s0 = card.t(false); if (typeof s0 !== 'string') throw new Error('t(false) 非字符串'); } catch (e) { tf.push(card.id + ' t0:' + (e.message || e)); }
      try { var s1 = card.t(true); if (typeof s1 !== 'string') throw new Error('t(true) 非字符串'); } catch (e) { tf.push(card.id + ' t1:' + (e.message || e)); }
      if (card.id === 'shi_wang') G.尸气 = 10;
      try { card.eff(false, card); } catch (e) { ef.push(card.id + ' eff0:' + (e.message || e)); }
    });
    var upSample = ['leifu', 'tianlei', 'zhongkui', 'jinguang', 'fanzhen', 'xueji', 'ranhun', 'kaitianyan', 'zhiren', 'yinbingguo', 'shi_wang'];
    upSample.forEach(function (id) {
      var card = __card(id); if (!card) return;
      __base(hero); G.hand = [card]; __fill(); G.hp = 60; G.block = 0; G.energy = 9;
      if (id === 'shi_wang') G.尸气 = 10;
      try { card.eff(true, card); } catch (e) { ef.push(card.id + ' eff1:' + (e.message || e)); }
    });
    rep.heroes[hero] = { textFail: tf, effFail: ef };
    if (tf.length || ef.length) rep.ok = false;
    rep.errors = rep.errors.concat(tf.map(function (s) { return hero + ' 文本 ' + s; }),
                                  ef.map(function (s) { return hero + ' 结算 ' + s; }));
  });

  /* ============ 3) 关键结算断言 ============ */
  /* —— A 茅山赶尸人 —— */
  (function () {
    var g = __base('ganshiren');
    g.hand = [__card('zhiren')];
    __card('zhiren').eff(false, __card('zhiren'));
    __ok('A#41 纸人 入召唤槽(计数1/持续2)', g.summonsMadeTurn === 1 && g.summons[0].type === 'zhiren' && g.summons[0].dur === 2, JSON.stringify(g.summons));

    g = __base('ganshiren'); g.尸气 = 10; var c = __card('shi_wang'); c.eff(false, c);
    __ok('A#48 尸王 满尸气召唤且清空', isSummon('shi_wang') && g.尸气 === 0, '尸气=' + g.尸气);
    g = __base('ganshiren'); g.尸气 = 10; c = __card('shi_wang'); c.eff(false, c); g.尸气 = 10; c.eff(false, c);
    __ok('A#48 尸王 同场唯一', g.summons.filter(function (s) { return s.type === 'shi_wang'; }).length === 1);
    // 尸王 常驻手牌 / 不可删除（Block3）
    g = __base('ganshiren'); g.deck = [__card('leifu'), __card('shi_wang')];
    try {
      startBattle(['youhun']);
      __ok('A#48b 尸王 每关开始在手牌', g.hand.some(function(c){ return c.id === 'shi_wang'; }), 'hand=' + g.hand.map(function(c){return c.id;}).join(','));
    } catch (e) { __ok('A#48b 尸王 每关开始在手牌', false, e.message); }
    g = __base('ganshiren'); g.hand = [__card('leifu'), __card('shi_wang')]; g.drawPile = [__card('jingang')];
    try { finishEndTurn();
      __ok('A#48c 尸王 回合末留手', g.hand.some(function(c){ return c.id === 'shi_wang'; }) && !g.discard.some(function(c){ return c.id === 'shi_wang'; }), 'handLen=' + g.hand.length + ' disc=' + g.discard.map(function(c){return c.id;}).join(','));
    } catch (e) { __ok('A#48c 尸王 回合末留手', false, e.message); }
    g = __base('ganshiren'); g.shiWangCard = __card('shi_wang'); g.summons = [{type:'shi_wang', v:10, dur:0}];
    try { onSummonDeath({type:'shi_wang', v:10, dur:0});
      __ok('A#48d 尸王 死亡后回弃牌堆进循环', g.shiWangCard === null && g.discard.some(function(c){ return c.id === 'shi_wang'; }), 'shiWangCard=' + g.shiWangCard + ' disc=' + g.discard.map(function(c){return c.id;}).join(','));
    } catch (e) { __ok('A#48d 尸王 死亡后回弃牌堆进循环', false, e.message); }
    g = __base('ganshiren'); g.deck = [__card('leifu'), __card('shi_wang')]; doUnknownRemove(1);
    __ok('A#48e 尸王 净坛不可删', g.deck.length === 2 && g.deck[1].id === 'shi_wang', 'len=' + g.deck.length);
    g = __base('ganshiren'); g.deck = [__card('leifu'), __card('shi_wang')]; doCampRemove(1);
    __ok('A#48f 尸王 篝火不可删', g.deck.length === 2 && g.deck[1].id === 'shi_wang', 'len=' + g.deck.length);
    g = __base('ganshiren'); g.deck = [__card('leifu'), __card('shi_wang')]; doRemove(1);
    __ok('A#48g 尸王 商店不可删', g.deck.length === 2 && g.deck[1].id === 'shi_wang', 'len=' + g.deck.length);
    // ===== Block4 攻击批 A 列修正（雷符4/7+击杀2尸气 / 蚀魂3/6+回血 / 钟馗16/24+无条件4/5）=====
    g = __base('ganshiren'); G.summons = [{type:'zhiren', v:1, dur:2}];
    (function () { var c = __card('leifu'); var t = G.enemies[0]; var bh = t.hp; c.eff(false, c);
      __ok('A#1 雷符 基础4+召唤1=5伤', bh - t.hp === 5, 'taken=' + (bh - t.hp)); })();
    (function () { var c = __card('leifu'); var t = G.enemies[0]; var bh = t.hp; c.eff(true, c);
      __ok('A#1u 雷符 升级7+召唤1=8伤', bh - t.hp === 8, 'taken=' + (bh - t.hp)); })();
    g = __base('ganshiren'); G.summons = [];
    (function () { var c = __card('leifu'); var t = G.enemies[0]; t.hp = 2; c.eff(false, c);
      __ok('A#1k 雷符 击杀获2尸气', g.尸气 === 2 && G.enemies[0].hp <= 0, '尸气=' + g.尸气); })();
    g = __base('ganshiren'); G.summons = [{type:'zhiren', v:1, dur:2}];
    (function () { var c = __card('shihunzhou'); var t = G.enemies[0]; var bh = t.hp; var hp0 = g.hp; c.eff(false, c);
      __ok('A#11 蚀魂 基础3伤+每召唤回1血', bh - t.hp === 3 && g.hp === hp0 + 1, 'taken=' + (bh - t.hp) + ' hp=' + g.hp); })();
    g = __base('ganshiren');
    (function () { var c = __card('zhongkui'); var t = G.enemies[0]; var bh = t.hp; c.eff(false, c);
      __ok('A#14 钟馗 16伤+无条件4尸气', bh - t.hp === 16 && g.尸气 === 4, 'taken=' + (bh - t.hp) + ' 尸气=' + g.尸气); })();
    g.尸气 = 0;
    (function () { var c = __card('zhongkui'); var t = G.enemies[0]; var bh = t.hp; c.eff(true, c);
      __ok('A#14u 钟馗 升级24伤+5尸气', bh - t.hp === 24 && g.尸气 === 5, 'taken=' + (bh - t.hp) + ' 尸气=' + g.尸气); })();



    g = __base('ganshiren'); g.hand = []; g.drawPile = [__card('leifu'), __card('zhiren')];
    __card('juling').eff(false, __card('juling'));
    __ok('A#24 聚灵 抽到鬼怪牌→1尸气', g.尸气 === 1, '尸气=' + g.尸气);

    g = __base('ganshiren'); g.hand = [__card('leifu'), __card('leifu'), __card('leifu')];
    c = __card('fenfu'); c.eff(false, c); g.discardSelect.picked = [0, 2]; confirmDiscardSelect();
    __ok('A#34 焚符 弃2张→2尸气+4格挡', g.尸气 === 2 && (g.blockGainedTurn || 0) >= 4, '尸气=' + g.尸气 + ' blockTurn=' + g.blockGainedTurn);

    g = __base('ganshiren'); g.hand = [__card('zhiren'), __card('leifu')];
    g.drawPile = [__card('leifu'), __card('leifu'), __card('leifu')];
    c = __card('yiwu'); c.eff(false, c); pickExchangeHand(0); pickExchangeNew(0);
    __ok('A#27 易物 换出鬼怪牌→1尸气', g.尸气 === 1, '尸气=' + g.尸气);
    __ok('A#27 易物 手牌换入 1 张', g.hand.length === 2, 'hand=' + g.hand.length);

    g = __base('ganshiren'); var pre = g.hp; c = __card('xueji'); c.eff(false, c);
    __ok('A#35 血祭 失3血并武装', g.hp === pre - 3 && g.xuejiArmed === true, 'hp=' + g.hp);

    g = __base('ganshiren'); c = __card('xiejiashengyuan'); g.hand = [c]; c.eff(false, c);
    finishEndTurn(); // A 列回合末自动结算（敌不攻也转），不依赖敌人攻击
    __ok('A#23 卸甲 回合末自动结算 5格挡→2尸气', g.尸气 === 2 && g.block === 0 && g.endBlockKind === null && g.xiejiaUp === false, '尸气=' + g.尸气 + ' block=' + g.block + ' up=' + g.xiejiaUp);
    g = __base('ganshiren'); c = __card('xiejiashengyuan'); c.eff(true, c); // 升级 7 格挡
    finishEndTurn();
    __ok('A#23u 卸甲 回合末自动结算 升级7格挡→6尸气', g.尸气 === 6 && g.block === 0 && g.endBlockKind === null, '尸气=' + g.尸气 + ' block=' + g.block);
  })();

  /* —— B 苦行武僧 —— */
  (function () {
    var g = __base('wuseng');
    var c = __card('xiejiashengyuan'); c.eff(false, c);
    __ok('B#23 卸甲 只置 xiejia 不清格挡', g.xiejia === 2 && g.endBlockKind === null && g.block >= 6, 'xiejia=' + g.xiejia + ' endBlockKind=' + g.endBlockKind);
    g = __base('wuseng'); c = __card('xiejiashengyuan'); c.eff(false, c); finishEndTurn();
    __ok('B#23 卸甲 回合末格挡保留', g.block === 6 && g.xiejia === 2, 'block=' + g.block);

    g = __base('wuseng'); c = __card('jingji'); c.eff(false, c);
    __ok('B#19 荆棘符 thorns>=4', (g.thorns || 0) >= 4, 'thorns=' + g.thorns);

    g = __base('wuseng'); c = __card('yixing'); c.eff(false, c);
    __ok('B#37 移形 dodge+闪避后+5格挡', g.dodge === 1 && g.dodgeNextBlock === 5, 'dodge=' + g.dodge);

    g = __base('wuseng'); g.hand = [__card('leifu'), __card('leifu'), __card('leifu')];
    c = __card('fenfu'); c.eff(false, c); g.discardSelect.picked = [0, 2]; confirmDiscardSelect();
    __ok('B#34 焚符 弃2张→6格挡', (g.blockGainedTurn || 0) === 6, 'blockTurn=' + g.blockGainedTurn);

    g = __base('wuseng'); g.hand = [__card('jingang'), __card('leifu')];
    g.drawPile = [__card('leifu'), __card('leifu'), __card('leifu')];
    c = __card('yiwu'); c.eff(false, c); pickExchangeHand(0); pickExchangeNew(0);
    __ok('B#27 易物 换出防御牌→4格挡', g.block >= 4, 'block=' + g.block);

    g = __base('wuseng'); g.block = 0; c = __card('jinguang'); c.eff(false, c);
    __ok('B#17 金光罩 获得14格挡', g.block === 14, 'block=' + g.block);
  })();

  /* —— C 血祭阴差 —— */
  (function () {
    var g = __base('yincha');
    var c = __card('xueji'); var pre = g.hp; c.eff(false, c);
    __ok('C#35 血祭 失4血并武装', g.hp === pre - 4 && g.xuejiArmed === true, 'hp=' + g.hp);

    g = __base('yincha'); pre = g.hp; c = __card('ranxue'); g.energy = 9; c.eff(false, c);
    __ok('C#30 燃血术 失4血+2符文', g.hp === pre - 4 && g.energy === 11, 'hp=' + g.hp + ' energy=' + g.energy);

    g = __base('yincha'); g.xuenu = 5; c = __card('kaitianyan'); c.eff(false, c);
    __ok('C#33 开天眼 消耗5层血怒+8攻', g.xuenu === 0 && g.turnAtkBuff === 8, 'xuenu=' + g.xuenu + ' atk=' + g.turnAtkBuff);

    g = __base('yincha'); g.hand = [__card('leifu'), __card('leifu'), __card('leifu')]; g.hp = 40;
    c = __card('fenfu'); c.eff(false, c); g.discardSelect.picked = [0, 2]; confirmDiscardSelect();
    __ok('C#34 焚符 弃2张→回4血', g.hp === 44, 'hp=' + g.hp);

    g = __base('yincha'); g.hand = [__card('juling'), __card('leifu')];
    g.drawPile = [__card('leifu'), __card('leifu'), __card('leifu')]; g.hp = 60;
    c = __card('yiwu'); c.eff(false, c); pickExchangeHand(0); pickExchangeNew(0);
    __ok('C#27 易物 换出技能牌→回5血', g.hp === 65, 'hp=' + g.hp);
  })();

  /* —— D 符箓天师 —— */
  (function () {
    var g = __base('tianshi');
    g.enemies[0].curse = 1; var c = __card('zhouyin');
    c.eff(true, c); // 升级：3 层 + 目标带诅咒额外 1 = 4
    __ok('D#42 咒印 目标带诅咒额外+1层(共4)', g.enemies[0].curse === 5 && CURSE_THIS_TURN === 4, 'curse=' + g.enemies[0].curse + ' CURSE=' + CURSE_THIS_TURN);

    g = __base('tianshi'); CURSE_THIS_TURN = 3; c = __card('jingang'); c.eff(false, c);
    __ok('D#15 金刚符 按本回合诅咒+格挡(7)', g.block === 7, 'block=' + g.block);

    g = __base('tianshi'); CURSE_THIS_TURN = 3; c = __card('jinguang'); c.eff(false, c);
    __ok('D#17 金光罩 诅咒全额加盾(13)', g.block === 13, 'block=' + g.block);

    g = __base('tianshi'); c = __card('xiejiashengyuan'); g.hand = [c]; c.eff(true, c); // 升级 8 格挡
    __ok('D#23 卸甲 置 endBlockKind=D(8盾)', g.endBlockKind === 'D' && g.block === 8, 'kind=' + g.endBlockKind + ' block=' + g.block);
    g = __base('tianshi'); c = __card('xiejiashengyuan'); c.eff(true, c); finishEndTurn(); resolveEndBlock();
    __ok('D#23 卸甲 敌后结算 8格挡→4诅咒', g.block === 0 && g.endBlockKind === null && __sumCurse() === 4 && CURSE_THIS_TURN === 4, 'sumCurse=' + __sumCurse() + ' CURSE=' + CURSE_THIS_TURN);

    g = __base('tianshi'); g.hand = [__card('leifu'), __card('leifu'), __card('leifu')];
    c = __card('fenfu'); c.eff(false, c); g.discardSelect.picked = [0, 2]; confirmDiscardSelect();
    __ok('D#34 焚符 弃2张→2诅咒+4格挡', __sumCurse() === 2 && (g.blockGainedTurn || 0) >= 4, 'sumCurse=' + __sumCurse());

    g = __base('tianshi'); g.hand = [__card('leifu'), __card('leifu')];
    g.drawPile = [__card('zhiren'), __card('jingang'), __card('leifu')];
    c = __card('yiwu'); c.eff(false, c); pickExchangeHand(0); pickExchangeNew(0);
    __ok('D#27 易物 换出攻击牌→补抽1张', g.hand.length === 3, 'hand=' + g.hand.length);

    g = __base('tianshi'); g.summons = [{ type: 'xiaogui', v: 3, dur: 2 }];
    g.enemies[0].curse = 3; var hp0 = __sumHp();
    c = __card('fuling'); c.eff(false, c);
    __ok('D#39 附灵 触发小鬼打最诅咒敌人(3伤)', __sumHp() === hp0 - 3, 'sumHp ' + hp0 + '->' + __sumHp());
  })();

  /* —— #35 血祭 四列口径（经 finishEndTurn） —— */
  (function () {
    var expect = { ganshiren: 3, wuseng: 2, yincha: 3, tianshi: 4 };
    var setCnt = {
      ganshiren: function () { G.summonsMadeTurn = 3; },
      wuseng: function () { G.blockGainedTurn = 12; },
      yincha: function () { G.hpLostTurn = 7; },
      tianshi: function () { CURSE_THIS_TURN = 4; },
    };
    __HEROES.forEach(function (h) {
      var g = __base(h); g.xuejiArmed = true; setCnt[h](); finishEndTurn();
      __ok('血祭口径 ' + h + ' → +' + expect[h], g.xuejiBonus === expect[h] && g.xuejiArmed === false, 'xuejiBonus=' + g.xuejiBonus);
    });
  })();

  // ===== 升级后 0 费（costU:0）真实出牌判定 =====
  // 全部出牌/显示路径走 effectiveCost/cardCost；两者在 c.up && costU!=null 时返回 costU
  (function () {
    var zeroUp = ['tiebushan', 'tongling', 'jingxin', 'xueji', 'yixing'];
    zeroUp.forEach(function (id) {
      var cu = Object.assign({}, __card(id)); cu.up = true;
      __ok('升级0费 costU=' + id, cardCost(cu) === 0 && effectiveCost(cu) === 0,
        'cost=' + cu.cost + ' costU=' + cu.costU + ' cardCost=' + cardCost(cu) + ' eff=' + effectiveCost(cu));
    });
    // playCard 能量门槛（L2314 拦截条件 G.energy<cost）：energy=0/1 对 0 费升级牌均放行
    ['ganshiren', 'wuseng', 'yincha', 'tianshi'].forEach(function (h) {
      ['tongling', 'jingxin', 'xueji'].forEach(function (id) {
        [0, 1].forEach(function (e) {
          var g = __base(h); g.energy = e;
          var cu = Object.assign({}, __card(id)); cu.up = true;
          var eff = effectiveCost(cu);
          __ok('0费升级可打 ' + h + '/' + id + ' e=' + e, eff === 0 && !(g.energy < eff),
            'eff=' + eff + ' energy=' + g.energy);
        });
      });
    });
  })();

  // ===== 尸王修复：eff 消耗口径 / 面板伤害与 summonAct 规则一致 =====
  (function () {
    // eff：10 尸气足额 → 召唤成功并扣光；重复召唤 → 拒绝且不再扣；不足 → 拒绝且分文不扣
    var g1 = __base('ganshiren'); g1.尸气 = 10;
    var sw = __card('shi_wang');
    var r1 = sw.eff(false, sw, 0);
    __ok('尸王成功：扣光 10 尸气并出召唤', r1 !== false && G.尸气 === 0 && G.summons.length === 1 && G.summons[0].type === 'shi_wang', 'r1=' + r1 + ' 尸气=' + G.尸气 + ' summons=' + G.summons.length);
    var rA = sw.eff(false, sw, 0);
    __ok('尸王重复在场被拒且不扣', rA === false && G.尸气 === 0 && G.summons.length === 1, 'rA=' + rA + ' 尸气=' + G.尸气);
    var g2 = __base('ganshiren'); g2.尸气 = 5;
    var r2 = sw.eff(false, sw, 0);
    __ok('尸王尸气不足被拒且不扣', r2 === false && g2.尸气 === 5 && G.summons.length === 0, 'r2=' + r2 + ' 尸气=' + g2.尸气);
    // 面板：有存活尸王时，尸王自己显示 10（不吃 +1）、纸人 +1；尸王消退后纸人回到本体；其他英雄恒本体
    var g3 = __base('ganshiren');
    var sz = { type: 'shi_wang', v: 10, dur: 5 };
    var zr = { type: 'zhiren', v: 1, dur: 2 };
    G.summons = [sz, zr];
    __ok('面板 尸王不吃 +1', summonHTML(sz).indexOf('造成 10 点') >= 0 && summonHTML(sz).indexOf('造成 11 点') < 0, summonHTML(sz));
    __ok('面板 纸人(有尸王) +1', summonHTML(zr).indexOf('造成 2 点') >= 0, summonHTML(zr));
    G.summons = [zr];
    __ok('面板 纸人(尸王已退) 不加', summonHTML(zr).indexOf('造成 1 点') >= 0, summonHTML(zr));
    var g4 = __base('wuseng');
    var zr4 = { type: 'zhiren', v: 1, dur: 2 };
    G.summons = [zr4];
    __ok('面板 武僧纸人 恒本体', summonHTML(zr4).indexOf('造成 1 点') >= 0, summonHTML(zr4));
  })();

  // ===== 易物修复：取消回退手牌（仿焚符），成交才消耗 =====
  (function () {
    // 取消发生在“选一张手牌”阶段：已打出并进弃牌堆的易物应回退到手牌，不吞牌
    ['ganshiren', 'wuseng', 'yincha', 'tianshi'].forEach(function (h) {
      var g = __base(h);
      var yw = __card('yiwu'); var other = __card('leifu');
      g.hand = [other]; g.discard = [yw]; // 模拟 doPlayCard 已把易物推入弃牌堆
      yw.eff(false, yw);
      cancelExchangeSelect();
      __ok('易物取消(pickHand) ' + h + ' → 牌回手',
        g.hand.indexOf(yw) >= 0 && g.discard.indexOf(yw) < 0,
        'hand=' + g.hand.map(function (x) { return x.id; }).join(',') + ' discard=' + g.discard.map(function (x) { return x.id; }).join(','));
    });
    // 取消发生在“牌堆随机三张”阶段（已选待换手牌但未成交）：同样回退
    var g3 = __base('ganshiren');
    var yw3 = __card('yiwu'); var other3 = __card('leifu');
    g3.hand = [other3]; g3.discard = [yw3];
    g3.drawPile = [__card('zhiren'), __card('jingang'), __card('leifu')];
    yw3.eff(false, yw3); pickExchangeHand(0); cancelExchangeSelect();
    __ok('易物取消(pickNew) → 牌回手且牌堆未动',
      g3.hand.indexOf(yw3) >= 0 && g3.discard.indexOf(yw3) < 0 && g3.drawPile.length === 3,
      'hand=' + g3.hand.map(function (x) { return x.id; }).join(',') + ' draw=' + g3.drawPile.length);
    // 真成交：易物留在弃牌堆（已消耗），换入的新牌进手
    // 注：换入池 = drawPile+discard 洗牌取 3，可能含刚打出的易物本身 → 选首个非易物项，
    //     保证“易物已消耗不回手”这一语义被确定性测到（避免随机池抽到易物造成的假阴性）
    var g4 = __base('ganshiren');
    var yw4 = __card('yiwu'); var other4 = __card('leifu');
    g4.hand = [other4]; g4.discard = [yw4];
    g4.drawPile = [__card('zhiren'), __card('jingang'), __card('leifu')];
    yw4.eff(false, yw4); pickExchangeHand(0);
    var ex4 = G.exchange, kk = 0;
    while (ex4.pool[kk] && ex4.pool[kk] === yw4) kk++;
    __ok('易物 换入池存在可换牌', kk < ex4.pool.length, JSON.stringify(ex4.pool.map(function (x) { return x.id; })));
    pickExchangeNew(kk);
    __ok('易物成交 → 易物留在弃牌堆',
      g4.discard.indexOf(yw4) >= 0 && g4.hand.indexOf(yw4) < 0 && g4.hand.length === 1,
      'hand=' + g4.hand.map(function (x) { return x.id; }).join(',') + ' discard=' + g4.discard.map(function (x) { return x.id; }).join(','));
  })();

  // ===== 噬魂术卡面预览修复：与 eff 逐列一致（不再按“非天师=诅咒×6/8”错算） =====
  (function () {
    var sh = __card('shihun');
    function pv() { return previewDamage(sh); }
    var g;
    g = __base('ganshiren'); g.尸气 = 10; g.enemies[0].curse = 2;
    __ok('噬魂术预览 赶尸人=固定14(诅咒不参与)', pv().d === 14 && !pv().miss, 'd=' + pv().d);
    g = __base('wuseng'); g.enemies[0].curse = 2;
    __ok('噬魂术预览 武僧=基础诅咒×5', pv().d === 10, 'd=' + pv().d);
    g = __base('wuseng'); g.blockGainedTurn = 10; g.enemies[0].curse = 0;
    __ok('噬魂术预览 武僧=格挡加成5(无诅咒不落空)', pv().d === 5 && !pv().miss, JSON.stringify(pv()));
    g = __base('wuseng'); g.enemies[0].curse = 0;
    __ok('噬魂术预览 武僧=无诅咒落空', pv().miss === '无诅咒', JSON.stringify(pv()));
    g = __base('yincha'); g.xuenu = 3; g.enemies[0].curse = 0;
    __ok('噬魂术预览 阴差=10+血怒2×3(共16)', pv().d === 16, 'd=' + pv().d);
    g = __base('tianshi'); g.enemies[0].curse = 2;
    __ok('噬魂术预览 天师=诅咒×5', pv().d === 10, 'd=' + pv().d);
    g = __base('tianshi'); g.enemies[0].curse = 0;
    __ok('噬魂术预览 天师=无诅咒落空', pv().miss === '无诅咒', JSON.stringify(pv()));
    var shU = Object.assign({}, sh); shU.up = true;
    g = __base('ganshiren'); g.尸气 = 10; g.enemies[0].curse = 5;
    __ok('噬魂术预览 升级赶尸人=18', previewDamage(shU).d === 18, 'd=' + previewDamage(shU).d);
    g = __base('tianshi'); g.enemies[0].curse = 2;
    __ok('噬魂术预览 升级天师=诅咒×6', previewDamage(shU).d === 12, 'd=' + previewDamage(shU).d);
  })();

  // ===== CARD_DMG 清理：预览与 eff 逐列一致（雷符 D 基数 6/9；召唤 v 对齐 summonAct） =====
  (function () {
    function lv(id, up) { var c = Object.assign({}, __card(id)); c.up = !!up; return previewDamage(c); }
    var g;
    g = __base('ganshiren'); g.summons = [{ type: 'zhiren', v: 1, dur: 2 }, { type: 'zhiren', v: 1, dur: 1 }];
    __ok('雷符预览 A=4+2召唤=6', lv('leifu').d === 6, 'd=' + lv('leifu').d);
    g = __base('wuseng'); g.block = 9;
    __ok('雷符预览 B=4+min6,3=7', lv('leifu').d === 7, 'd=' + lv('leifu').d);
    g = __base('yincha'); g.xuenu = 4;
    __ok('雷符预览 C=5+血怒6=11', lv('leifu').d === 11, 'd=' + lv('leifu').d);
    g = __base('tianshi'); g.enemies[0].curse = 1;
    __ok('雷符预览 D=6+3=9', lv('leifu').d === 9, 'd=' + lv('leifu').d);
    __ok('雷符预览 D升级=9+3=12', lv('leifu', true).d === 12, 'd=' + lv('leifu', true).d);
    g = __base('tianshi'); g.enemies[0].curse = 2;
    __ok('斩妖剑预览 D=8+引爆2×5=18', lv('zhanyaojian').d === 18, 'd=' + lv('zhanyaojian').d);
    g = __base('ganshiren'); g.summons = [{ type: 'zhiren', v: 1, dur: 2 }];
    __ok('百鬼预览 A=4+1×2=6', lv('baigui').d === 6, 'd=' + lv('baigui').d);
    g = __base('wuseng'); g.block = 6;
    __ok('百鬼预览 B=4+6/3=6', lv('baigui').d === 6, 'd=' + lv('baigui').d);
    g = __base('yincha');
    __ok('百鬼预览 C=5+0召唤=5', lv('baigui').d === 5, 'd=' + lv('baigui').d);
    g = __base('tianshi'); g.enemies[0].curse = 3;
    __ok('百鬼预览 D=4+1×3诅咒=7', lv('baigui').d === 7, 'd=' + lv('baigui').d);
    g = __base('ganshiren'); g.block = 0; g.尸气 = 6;
    __ok('铁布衫预览 A 无格挡有尸气(3) 非落空', lv('tiebushan').d === 3 && !lv('tiebushan').miss, 'd=' + lv('tiebushan').d);
    g = __base('ganshiren');
    __ok('纸人预览 每回合 v=1', lv('zhiren').d === 1, 'd=' + lv('zhiren').d);
    g = __base('ganshiren'); G.summons = [{ type: 'shi_wang', v: 10, dur: 3 }];
    __ok('纸人预览 尸王在场 +1', lv('zhiren').d === 2, 'd=' + lv('zhiren').d);
    g = __base('tianshi');
    __ok('小鬼预览 天师 v=3', lv('xiaogui').d === 3, 'd=' + lv('xiaogui').d);
    g = __base('wuseng');
    __ok('小鬼预览 武僧 v=2', lv('xiaogui').d === 2, 'd=' + lv('xiaogui').d);
    __ok('阴兵过境预览 每只 v=4', lv('yinbingguo').d === 4, 'd=' + lv('yinbingguo').d);
    __ok('energyBonusTurns 死字段已移除', G.energyBonusTurns === undefined);
    __ok('bloodCost 死函数已移除', typeof bloodCost === 'undefined');
    __ok('kaitianyanTianshi 死标志已移除', G.kaitianyanTianshi === undefined);
    __ok('yinchaSummon 死函数已移除', typeof yinchaSummon === 'undefined');
    var yp = HEROES.filter(function (h) { return h.id === 'yincha'; })[0].passive;
    __ok('阴差 hero 文案去除小妖承诺', yp.indexOf('小妖') < 0 && yp.indexOf('血怒') >= 0, yp);
  })();

  // ===== 血祭阴差增强：以血引怒被动 + 整局累积 + KEYWORDS/徽章 =====
  (function () {
    var g;
    cardPlayWindow = false;
    __ok('KEYWORDS 新增【血怒】词条', KEYWORDS.some(function (k) { return k[0] === '血怒'; }),
      JSON.stringify(KEYWORDS.filter(function (k) { return k[0] === '血怒'; })));
    var yp = HEROES.filter(function (h) { return h.id === 'yincha'; })[0].passive;
    __ok('阴差被动改整局累积(去跨战保留)+扣血牌产怒', yp.indexOf('整局累积') >= 0 && yp.indexOf('跨战保留') < 0 && yp.indexOf('扣血牌') >= 0, yp);

    // loseHp 出牌窗口产怒 1:1（仅阴差、仅窗口内、上限 10）
    g = __base('yincha'); var hp0 = g.hp;
    cardPlayWindow = true; loseHp(3); cardPlayWindow = false;
    __ok('阴差 窗口内失3血 → +3血怒', g.xuenu === 3 && g.hp === hp0 - 3, 'xuenu=' + g.xuenu + ' hp=' + g.hp);
    g = __base('yincha'); g.xuenu = 9;
    cardPlayWindow = true; loseHp(4); cardPlayWindow = false;
    __ok('阴差 血怒上限封顶 10', g.xuenu === 10, 'xuenu=' + g.xuenu);
    g = __base('wuseng');
    cardPlayWindow = true; loseHp(5); cardPlayWindow = false;
    __ok('非阴差 窗口内失血不加血怒', (g.xuenu || 0) === 0, 'xuenu=' + g.xuenu);
    g = __base('yincha'); loseHp(2);
    __ok('阴差 窗口外失血不加血怒', (g.xuenu || 0) === 0, 'xuenu=' + g.xuenu);

    // 铁布衫 eff：已删卡面自带 gainRage，净由被动按失血 1:1 补（窗口内 +2）
    g = __base('yincha'); g.block = 8; var hb = g.hp;
    __card('tiebushan').eff(false);
    __ok('铁布衫eff 窗口外只失2血不加怒', g.hp === hb - 2 && (g.xuenu || 0) === 0, 'hp=' + g.hp + ' xuenu=' + g.xuenu);
    g = __base('yincha'); g.block = 8; hb = g.hp;
    cardPlayWindow = true; __card('tiebushan').eff(false); cardPlayWindow = false;
    __ok('铁布衫eff 窗口内失2血 → +2血怒(持平)', g.hp === hb - 2 && g.xuenu === 2, 'hp=' + g.hp + ' xuenu=' + g.xuenu);

    // rageSpend 仍按“每层加成/上限”就地扣层
    g = __base('yincha'); g.xuenu = 6;
    __ok('rageSpend(2,20) 6层全烧→归0', rageSpend(2, 20) === 6 && (g.xuenu || 0) === 0, 'xuenu=' + g.xuenu);
    g = __base('yincha'); g.xuenu = 10;
    __ok('rageSpend(2,6) 只烧满+6所需3层', rageSpend(2, 6) === 3 && (g.xuenu || 0) === 7, 'xuenu=' + g.xuenu);

    // 血怒无“每战斗清零”点：__base(每场初始化) 不触碰 xuenu
    g = __base('yincha'); g.xuenu = 5;
    __ok('__base 初始化不清血怒(整局累积依据)', (g.xuenu || 0) === 5, 'xuenu=' + g.xuenu);
  })();

  /* ===== 2026-09-09 批 ①-⑧：封顶 / 诅咒牌 / 顶栏 / 天师溢出 / 卸甲时机 / 阴兵目标 / 纸人随机 ===== */
  (function () {
    var g, c, en, hp, e0, e1;
    // 静默战斗特效，防 DOM 副作用（本块在所有既有断言之后，不影响前面）
    try { floatDamage = __sil; } catch (e) {}
    try { sfx = __sil; } catch (e) {}

    /* ① 数值封顶 */
    g = __base('ganshiren'); en = g.enemies[0];
    addEnemyStrength(en, 6); addEnemyStrength(en, 4);
    __ok('① 力量成长封顶 MAX=8', en.strength === 8 && MAX_ENEMY_STRENGTH === 8, 'str=' + en.strength);
    g = __base('tianshi'); g.block = 0;
    var xs = makeEnemy(ENEMIES['xueshi'], 'xueshi');
    var cap = Math.floor((xs.maxHp || xs.hp) * 1.5);  // 150% 封顶（boss HP 有缩放，动态取）
    xs.hp = cap - 10;                                  // 距封顶差 10；30 伤 ×0.8=24 会越帽
    dealDamageToPlayer(30, xs);
    __ok('① 吸血回复封顶 maxHp150%', xs.hp === cap, 'hp=' + xs.hp + ' cap=' + cap);

    /* ② 术语：简称 + 悬停原解释 + 无残余 */
    __ok('② KEYWORDS 含【诅咒牌】', KEYWORDS.some(function (k) { return k[0] === '诅咒牌'; }));
    __ok('② 诅咒牌词条保留原解释', KEYWORDS.some(function (k) { return k[0] === '诅咒牌' && k[1].indexOf('可施加诅咒的牌') >= 0; }));
    var res = [];
    __HEROES.forEach(function (h) {
      g = __base(h);
      CARDS.forEach(function (card) {
        try { if (card.t(false).indexOf('【可施加诅咒的牌】') >= 0 || card.t(true).indexOf('【可施加诅咒的牌】') >= 0) res.push(h + ':' + card.id); } catch (e2) {}
      });
    });
    __ok('② 全卡文案无残留【可施加诅咒的牌】', res.length === 0, res.join(','));

    /* ③ 顶栏：默认展开、无金卡补偿 */
    __ok('③ 顶栏默认展开(TOPBAR_OPEN)', TOPBAR_OPEN === true);
    g = __base('tianshi');
    var capEl = { _html: '', set innerHTML(v) { this._html = String(v); }, get innerHTML() { return this._html; } };
    var origById = document.getElementById;
    document.getElementById = function (id) { if (id === 'topbar') return capEl; return origById(id); };
    try { renderTopbar(); } catch (e3) {}
    document.getElementById = origById;
    __ok('③ 顶栏无「金卡补偿」且详情默认展开(tb-detail)', capEl._html.indexOf('金卡补偿') < 0 && capEl._html.indexOf('stat-compensation') < 0 && capEl._html.indexOf('tb-detail') >= 0, capEl._html.slice(0, 90));

    /* ④ 天师溢出 → 每层 1 格挡 */
    g = __base('tianshi'); en = g.enemies[0]; en.curse = 6; g.block = 0;
    applyCurse(en, 1);
    __ok('④ 天师施加溢出 满6再施→每层转1格挡', g.block === 1 && en.curse === 6 && g.ybTarget === en.uid, 'block=' + g.block + ' yb=' + g.ybTarget);
    var tp = HEROES.filter(function (h) { return h.id === 'tianshi'; })[0].passive;
    __ok('④ 天师被动文案=溢出每层转1格挡', tp.indexOf('溢出') >= 0 && tp.indexOf('每层转化为 1 点格挡') >= 0, tp);

    /* ⑦ 卸甲生元 D：格挡先抵敌伤、敌后结算；目标满 6 层溢出转回格挡并保留 */
    g = __base('tianshi'); en = g.enemies[0]; en.affixes = null; en.strength = 0;
    c = __card('xiejiashengyuan'); c.eff(true, c); // 8 盾 + endBlockKind=D
    dealDamageToPlayer(5, en);                     // 敌人打 5 → 格挡 8→3
    __ok('⑦ 卸甲 D 敌攻先耗格挡(8→3) 未提前转化', g.block === 3 && g.endBlockKind === 'D' && g.hp === 60, 'block=' + g.block + ' hp=' + g.hp);
    resolveEndBlock();
    __ok('⑦ 卸甲 D 敌后结算 余3盾→1诅咒', g.block === 0 && g.endBlockKind === null && __sumCurse() === 1, 'block=' + g.block + ' sum=' + __sumCurse());

    g = __base('tianshi'); en = g.enemies[0]; g.enemies[1].hp = 0; // 只剩 en：resolveEndBlock 的随机目标必然命中它
    en.affixes = null; en.strength = 0; en.curse = 6;
    c = __card('xiejiashengyuan'); c.eff(true, c);
    dealDamageToPlayer(5, en);
    resolveEndBlock();
    __ok('⑦ 卸甲 D 满6溢出转回格挡(余1)不清零', g.block === 1 && g.endBlockKind === null && en.curse === 6, 'block=' + g.block);

    /* ⑧b 阴兵过境：锁定“上一次施咒的敌人”+🎯标记 + 转移 + 死亡回落 */
    g = __base('tianshi'); e0 = g.enemies[0]; e1 = g.enemies[1];
    applyCurse(e0, 1);
    __ok('⑧b 施咒 e0 → 标记 e0', g.ybTarget === e0.uid, 'yb=' + g.ybTarget);
    applyCurse(e1, 1);
    __ok('⑧b 再施咒 e1 → 标记转移 e1', g.ybTarget === e1.uid, 'yb=' + g.ybTarget);
    var h0 = e0.hp, h1 = e1.hp;
    G.summons = [{ type: 'yinbing', v: 4, dur: 2 }];
    summonAct(G.summons[0]);
    __ok('⑧b 回合末阴兵打中标记敌 e1', e1.hp === h1 - 4 && e0.hp === h0, 'e0=' + e0.hp + ' e1=' + e1.hp + '(was ' + h1 + ')');

    g = __base('tianshi'); e0 = g.enemies[0]; e1 = g.enemies[1];
    e0.hp = 0; e1.curse = 1; G.ybTarget = e0.uid; var h1b = e1.hp;
    G.summons = [{ type: 'yinbing', v: 4, dur: 2 }];
    summonAct(G.summons[0]);
    __ok('⑧b 标记敌死亡 → 回落带诅咒随机(打中e1)', e1.hp === h1b - 4, 'e1=' + e1.hp);

    g = __base('tianshi'); e0 = g.enemies[0]; e1 = g.enemies[1];
    applyCurse(e1, 1); G.summons = [{ type: 'yinbing', v: 4, dur: 2 }];
    __ok('⑧b 🎯徽章 只出现在标记敌 e1', enemyPanelHTML(e1, 1).indexOf('阴兵目标') >= 0 && enemyPanelHTML(e0, 0).indexOf('阴兵目标') < 0);
    g = __base('tianshi'); G.summons = [{ type: 'yinbing', v: 4, dur: 3 }];
    __ok('⑧b 阴兵召唤标签 天师注明🎯', summonHTML(G.summons[0]).indexOf('🎯') >= 0, summonHTML(G.summons[0]));
    g = __base('wuseng'); G.summons = [{ type: 'yinbing', v: 4, dur: 3 }];
    __ok('⑧b 阴兵召唤标签 武僧随机无🎯', summonHTML(G.summons[0]).indexOf('🎯') < 0, summonHTML(G.summons[0]));
    __ok('⑧b KEYWORDS 含【阴兵目标】', KEYWORDS.some(function (k) { return k[0] === '阴兵目标'; }));

    /* ⑧a 纸人：保持随机攻击（不被选中 / 最高诅咒锁死） */
    g = __base('tianshi'); e0 = g.enemies[0]; e1 = g.enemies[1];
    e0.curse = 6; e1.curse = 0; G.target = 0; e0.hp = 999; e1.hp = 999;
    var cnt0 = 0, cnt1 = 0;
    for (var t = 0; t < 60; t++) { var hh = e0.hp; summonAct({ type: 'zhiren', v: 1, dur: 2 }); if (e0.hp < hh) cnt0++; else cnt1++; }
    __ok('⑧a 纸人 60试 两敌均被随机命中(未锁死)', cnt0 > 0 && cnt1 > 0 && cnt0 + cnt1 === 60, 'cnt0=' + cnt0 + ' cnt1=' + cnt1);
  })();

  /* ============ v0.50 新断言 ============ */
  (function () {
    var g, c, en, t, hp0, r, beforeHand, beforeEnergy;

    /* ③ 渡魂归己：5 回合 + 消耗牌 */
    g = __base('ganshiren'); c = __card('duhunguiji');
    c.eff(true, c);
    __ok('v0.50 ③ 渡魂归己 turns===5', g.duhun && g.duhun.turns === 5, 'turns=' + (g.duhun && g.duhun.turns));
    __ok('v0.50 ③ 渡魂归己 升级比例 50%', g.duhun && g.duhun.ratio === 0.5, 'ratio=' + (g.duhun && g.duhun.ratio));
    __ok('v0.50 ③ 渡魂归己 exhaust=true', c.exhaust === true, 'exhaust=' + c.exhaust);

    /* ⑤ 灵化：不再免疫诅咒；仍挡镇魂/魅惑 */
    g = __base('tianshi'); en = g.enemies[0];
    en.affixes = [{ id: 'linghua', tier: 1 }];
    r = applyCurse(en, 1);
    __ok('v0.50 ⑤ 灵化敌人仍可被施加诅咒', r === 1 && en.curse === 1, 'r=' + r + ' curse=' + en.curse);
    en.seal = false; en.charm = 0;
    __ok('v0.50 ⑤ 灵化仍挡镇魂', sealEnemy(en, 1) === false && !en.seal, 'seal=' + en.seal);
    __ok('v0.50 ⑤ 灵化仍挡魅惑', charmEnemy(en, 0.5) === false && (en.charm || 0) === 0, 'charm=' + en.charm);

    /* ⑥ 嗜血(天师)：吸血 50% 实际扣血 */
    g = __base('tianshi'); t = g.enemies[0]; t.hp = 10; hp0 = g.hp;
    c = __card('shixue'); c.eff(false, c);
    __ok('v0.50 ⑥ 嗜血(天师) 回复 3 点(6伤×50%)', g.hp === hp0 + 3 && t.hp === 4, 'hp0=' + hp0 + ' hp=' + g.hp + ' t.hp=' + t.hp);

    /* ⑦ 吸血按实际扣血：敌剩 3 血、渡魂 50%、打 20 → 回 1 而非 10 */
    g = __base('ganshiren'); g.duhun = { turns: 5, ratio: 0.5 };
    en = g.enemies[0]; en.hp = 3; hp0 = g.hp;
    dealDamageTo(en, 20);
    __ok('v0.50 ⑦ 渡魂按实际扣血回 1(而非10)', g.hp === hp0 + 1, 'hp0=' + hp0 + ' hp=' + g.hp);

    /* ⑧ 火符：仅 1 张手牌禁止打出 */
    g = __base('ganshiren'); G.hand = [__card('huofu')]; G.energy = 9;
    beforeHand = G.hand.length; beforeEnergy = G.energy;
    playCard(0);
    __ok('v0.50 ⑧ 火符 仅1手牌被拦(手牌/符文不变)', G.hand.length === beforeHand && G.energy === beforeEnergy, 'hand=' + G.hand.length + ' energy=' + G.energy);
  })();

  /* ============ v0.51 五通神：现形即结算首回合 + 天师回合限制 ============ */
  (function () {
    var g, c, s;

    // 武僧：立即 4 点（卡）+ 首次触发 3 点（召唤）= 当回合 7 格挡
    g = __base('wuseng'); G.block = 0; c = __card('wutong'); c.eff(false, c);
    __ok('v0.51 五通神(武僧) 当回合 +7 格挡', g.block === 7, 'block=' + g.block);
    __ok('v0.51 五通神(武僧) 现形即耗 1 回合(剩1)', g.summons.length === 1 && g.summons[0].dur === 1, JSON.stringify(g.summons));

    // 赶尸人：立即 +3 格挡 +1 尸气
    g = __base('ganshiren'); G.block = 0; G.尸气 = 0; c = __card('wutong'); c.eff(false, c);
    __ok('v0.51 五通神(赶尸人) 当回合 +3格挡+1尸气', g.block === 3 && (g.尸气 || 0) === 1, 'block=' + g.block + ' 尸气=' + g.尸气);

    // 阴差：立即 +4 生命 +3 格挡
    g = __base('yincha'); G.block = 0; c = __card('wutong'); c.eff(false, c);
    __ok('v0.51 五通神(阴差) 当回合 +4生命+3格挡', g.hp === 64 && g.block === 3, 'hp=' + g.hp + ' block=' + g.block);

    // 天师：不再是「永久」——有 2/3 回合限制；当回合 +3 格挡 +1 诅咒
    g = __base('tianshi'); G.block = 0; c = __card('wutong'); c.eff(false, c);
    s = g.summons[0];
    __ok('v0.51 五通神(天师) 非永久(有回合限制)', s.indefinite !== true && typeof s.dur === 'number', 'indefinite=' + s.indefinite + ' dur=' + s.dur);
    __ok('v0.51 五通神(天师) 基础剩1回合(共2)', s.dur === 1, 'dur=' + s.dur);
    __ok('v0.51 五通神(天师) 当回合 +3格挡+1诅咒', g.block === 3 && __sumCurse() === 1, 'block=' + g.block + ' curse=' + __sumCurse());

    g = __base('tianshi'); c = __card('wutong'); c.eff(true, c);
    __ok('v0.51 五通神(天师) 升级剩2回合(共3)', g.summons[0].dur === 2, 'dur=' + g.summons[0].dur);
  })();

  /* ============ v0.52 锻造置灰（升级无变化不可锻造） + 遗物/召唤物进详情页 ============ */
  (function () {
    __base('ganshiren');
    // ① 不可升级判定：升级前后文案一致、且无费用减免
    __ok('v0.52 燃血术 判定为不可升级', canUpgrade(__card('ranxue')) === false);
    __ok('v0.52 易物 判定为不可升级', canUpgrade(__card('yiwu')) === false);
    __ok('v0.52 附灵术 判定为不可升级', canUpgrade(__card('fuling')) === false);
    __ok('v0.52 尸王 判定为不可升级', canUpgrade(__card('shi_wang')) === false);
    // 反例：血祭是真升级（符文 1→0），雷符/五通神文案有变
    __ok('v0.52 血祭 可升级(费用 1→0)', canUpgrade(__card('xueji')) === true);
    __ok('v0.52 雷符 可升级(文案变化)', canUpgrade(__card('leifu')) === true);
    __ok('v0.52 五通神(赶尸人) 可升级', canUpgrade(__card('wutong')) === true);

    // ② 锻造卡面：不可升级的置灰 + 「不可升级」角标，且不显示升级预览
    var hRan = forgeCardHTML(__card('ranxue'), 0);
    __ok('v0.52 锻造页 燃血术 置灰(locked)', hRan.indexOf('locked') >= 0, hRan.slice(0, 80));
    __ok('v0.52 锻造页 燃血术 标「不可升级」', hRan.indexOf('不可升级') >= 0);
    __ok('v0.52 锻造页 燃血术 无升级预览', hRan.indexOf('upgrade-preview') < 0);
    var hLei = forgeCardHTML(__card('leifu'), 0);
    __ok('v0.52 锻造页 雷符 不置灰', hLei.indexOf('locked') < 0);
    __ok('v0.52 锻造页 雷符 有升级预览', hLei.indexOf('upgrade-preview') >= 0);

    // ③ forgeCard 拦截：不可升级的牌点击后不置 up
    G.deck = [__card('ranxue')]; G.forgeFrom = null;
    forgeCard(0);
    __ok('v0.52 锻造 燃血术 被拦截(up 仍 falsy)', !G.deck[0].up, 'up=' + G.deck[0].up);
    G.deck = [__card('ranxue')]; G.forgeFrom = 'camp';
    forgeCard(0);
    __ok('v0.52 锻造 燃血术(camp) 同样被拦截', !G.deck[0].up && !G.campActed, 'up=' + G.deck[0].up + ' campActed=' + G.campActed);

    // ④ 遗物/召唤物进顶栏详情页（玩家面板下方不再有）
    G.relics = ['zhaohunfan'];
    __ok('v0.52 relicIcon 仍可用(插图)', typeof relicIcon(relById('zhaohunfan')) === 'string' && relicIcon(relById('zhaohunfan')).length > 0);

    var _cap = null, _og = document.getElementById;
    document.getElementById = function (id) { if (id === 'topbar') { if (!_cap) { _cap = _og(id); } return _cap; } return _og(id); };
    try {
      SCENE = 'battle'; G.summons = [{ type: 'wutong', v: 3, dur: 2 }];
      try { renderTopbar(); } catch (e) { __ok('v0.52 renderTopbar 不抛异常', false, e && e.message); }
      var tb = _cap ? _cap.innerHTML : '';
      __ok('v0.52 详情页 遗物带插图 chip', tb.indexOf('prelic-chip') >= 0 && tb.indexOf('ricon') >= 0, tb.length);
      __ok('v0.52 详情页 遗物名可见', tb.indexOf('招魂幡') >= 0);
      __ok('v0.52 详情页 含召唤物', tb.indexOf('tb-summons') >= 0, tb.length);

      SCENE = 'map';   // 地图场景：召唤物不显示（G.summons 到下一场战斗才清空，避免残留）
      if (_cap) _cap.innerHTML = '';
      try { renderTopbar(); } catch (e) { __ok('v0.52 renderTopbar(map) 不抛异常', false, e && e.message); }
      var tm = _cap ? _cap.innerHTML : '';
      __ok('v0.52 地图场景 详情页无召唤物', tm.indexOf('tb-summons') < 0, tm.length);
      __ok('v0.52 地图场景 遗物仍在详情页', tm.indexOf('prelic-chip') >= 0);
      SCENE = 'battle';
    } finally { document.getElementById = _og; }

  })();

  /* ============ v0.53 消耗牌：一关一次（而非一局一次） + 卡面显著提示 ============ */
  (function () {
    // ① 消耗牌判定：牌自带 exhaust，或该英雄专属消耗（噬魂术仅天师）
    __base('tianshi');
    __ok('v0.53 镇妖铃 是消耗牌', isOneUse(__card('zhenyaoling')) === true);
    __ok('v0.53 钟馗镇魂 是消耗牌', isOneUse(__card('zhongkui')) === true);
    __ok('v0.53 渡魂归己 是消耗牌', isOneUse(__card('duhunguiji')) === true);
    __ok('v0.53 雷符 非消耗牌', isOneUse(__card('leifu')) === false);
    __ok('v0.55 噬魂术(天师) 非消耗牌', isOneUse(__card('shihun')) === false);
    __base('wuseng');
    __ok('v0.53 噬魂术(武僧) 非消耗牌', isOneUse(__card('shihun')) === false);

    // ② 卡面标记：红色左条 + 「消耗」角标
    __base('tianshi');
    var hz = handCardHTML(__card('zhenyaoling'), false, 0, 1);
    __ok('v0.53 手牌 镇妖铃 有左红条', hz.indexOf('oneuse-bar') >= 0, hz.slice(0, 100));
    __ok('v0.53 手牌 镇妖铃 有「消耗」角标', hz.indexOf('>消耗<') >= 0);
    var hl = handCardHTML(__card('leifu'), false, 0, 1);
    __ok('v0.53 手牌 雷符 无消耗标记', hl.indexOf('oneuse') < 0);
    __ok('v0.53 cardBody 镇妖铃 有标记', cardBody(__card('zhenyaoling')).indexOf('oneuse-bar') >= 0);
    __ok('v0.53 forgeCardHTML 镇妖铃 有标记', forgeCardHTML(__card('zhenyaoling'), 0).indexOf('oneuse-bar') >= 0);
    __ok('v0.55 噬魂术(天师) 手牌无标记', handCardHTML(__card('shihun'), false, 0, 1).indexOf('oneuse') < 0);
    __base('wuseng');
    __ok('v0.53 噬魂术(武僧) 手牌无标记', handCardHTML(__card('shihun'), false, 0, 1).indexOf('oneuse') < 0);

    // ③ 机制：打出后本关消失，但牌库仍保留（关键——此前是直接从 G.deck 删除＝一局一次）
    __base('ganshiren');
    var zl = __card('zhenyaoling');
    G.hand = [zl]; G.deck = [zl]; G.drawPile = []; G.discard = []; G.exhausted = [];
    doPlayCard(0);
    __ok('v0.53 打出后进入本关消耗区', G.exhausted.length === 1 && G.exhausted[0] === zl, 'n=' + G.exhausted.length);
    __ok('v0.53 打出后不进弃牌堆', G.discard.indexOf(zl) < 0);
    __ok('v0.53 打出后牌库仍保留（不再是一局一次）', G.deck.indexOf(zl) >= 0);

    // ④ 战斗结束：消耗区清空，牌回牌库；下一场能再抽到
    try { winFight(); } catch (e) { __ok('v0.53 winFight 不抛异常', false, e && e.message); }
    __ok('v0.53 战斗结束后消耗区清空', (G.exhausted || []).length === 0);
    __ok('v0.53 战斗结束后牌库仍含镇妖铃', G.deck.indexOf(zl) >= 0);
    G.hand = []; G.discard = [];
    resetDeck();
    __ok('v0.53 下一场战斗 镇妖铃回到抽牌堆', G.drawPile.indexOf(zl) >= 0, 'draw=' + G.drawPile.length);

    // ⑤ 关键词文案已改成一关一次
    var kwX = KEYWORDS.find(function (k) { return k[0] === '消耗'; });
    __ok('v0.53 【消耗】关键词文案已更新', !!kwX && kwX[1].indexOf('每场战斗限用一次') >= 0, kwX && kwX[1]);
  })();

  /* ============ v0.55 噬魂术：取消消耗牌 + 天师版降到 5/6 ============ */
  (function () {
    // 四个英雄都不再是消耗牌
    ['ganshiren', 'wuseng', 'yincha', 'tianshi'].forEach(function (h) {
      __base(h);
      __ok('v0.55 噬魂术(' + h + ') 非消耗牌', isOneUse(__card('shihun')) === false);
      __ok('v0.55 噬魂术(' + h + ') 卡面无消耗标记', handCardHTML(__card('shihun'), false, 0, 1).indexOf('oneuse') < 0);
    });

    // 天师版卡面：每层 5（升级 6），且不再出现「消耗牌」字样
    __base('tianshi');
    var shT = __card('shihun');
    var txtB = shT.t(false), txtU = shT.t(true);
    __ok('v0.55 噬魂术(天师) 卡面每层5', txtB.indexOf('每层造成 5') >= 0, txtB);
    __ok('v0.55 噬魂术(天师) 升级卡面每层6', txtU.indexOf('每层造成 6') >= 0, txtU);
    __ok('v0.55 噬魂术(天师) 卡面不再写「消耗牌」', txtB.indexOf('消耗牌') < 0, txtB);

    // 天师版机制：消耗目标全部诅咒，每层 5；不是消耗牌，正常进弃牌堆
    G.enemies[0].curse = 3; G.enemies[0].block = 0;
    G.enemies[0].maxHp = 300; G.enemies[0].hp = 300;
    G.hand = [shT]; G.deck = [shT]; G.drawPile = []; G.discard = []; G.exhausted = [];
    var hp0 = G.enemies[0].hp;
    doPlayCard(0);
    __ok('v0.55 噬魂术(天师) 3层诅咒 → 15 伤害', hp0 - G.enemies[0].hp === 15, 'dealt=' + (hp0 - G.enemies[0].hp));
    __ok('v0.55 噬魂术(天师) 打出后诅咒清零', G.enemies[0].curse === 0, 'curse=' + G.enemies[0].curse);
    __ok('v0.55 噬魂术(天师) 不进本关消耗区', (G.exhausted || []).length === 0);
    __ok('v0.55 噬魂术(天师) 正常进弃牌堆', G.discard.indexOf(shT) >= 0);
  })();

  /* ============ v0.56 噬魂术(武僧) 每层 7→6，与天师统一为 5/6 ============ */
  (function () {
    __base('wuseng');
    var shW = __card('shihun'), shWU = Object.assign({}, shW, { up: true });
    var txtW = shW.t(false), txtWU = shW.t(true);
    __ok('v0.56 噬魂术(武僧) 卡面每层5', txtW.indexOf('每层造成 5') >= 0, txtW);
    __ok('v0.56 噬魂术(武僧) 升级卡面每层6', txtWU.indexOf('每层造成 6') >= 0, txtWU);
    __ok('v0.56 噬魂术(武僧) 升级卡面额外6', txtWU.indexOf('额外造成 6') >= 0, txtWU);
    __ok('v0.56 噬魂术(武僧) 卡面不再出现 7', txtWU.indexOf('7 伤害') < 0, txtWU);

    // 升级态预览：2 层诅咒 → 12
    G.enemies[0].curse = 2; G.enemies[0].block = 0; G.blockGainedTurn = 0;
    __ok('v0.56 噬魂术(武僧) 升级预览 2层诅咒 → 12', previewDamage(shWU).d === 12, 'd=' + previewDamage(shWU).d);
    // 升级态 + 格挡加成：无诅咒也打 6 且不落空
    G.enemies[0].curse = 0; G.blockGainedTurn = 10;
    __ok('v0.56 噬魂术(武僧) 升级预览 格挡加成6', previewDamage(shWU).d === 6 && !previewDamage(shWU).miss,
      JSON.stringify(previewDamage(shWU)));

    // 实测升级态：3 层诅咒 → 18 伤，诅咒清零
    G.blockGainedTurn = 0;
    G.enemies[0].curse = 3; G.enemies[0].block = 0;
    G.enemies[0].maxHp = 300; G.enemies[0].hp = 300;
    var hw0 = G.enemies[0].hp;
    G.hand = [shWU]; G.deck = [shWU]; G.drawPile = []; G.discard = []; G.exhausted = [];
    doPlayCard(0);
    __ok('v0.56 噬魂术(武僧) 升级 3层诅咒 → 18 伤害', hw0 - G.enemies[0].hp === 18, 'dealt=' + (hw0 - G.enemies[0].hp));
    __ok('v0.56 噬魂术(武僧) 打出后诅咒清零', G.enemies[0].curse === 0, 'curse=' + G.enemies[0].curse);
    __ok('v0.56 噬魂术(武僧) 非消耗牌 正常进弃牌堆', (G.exhausted || []).length === 0 && G.discard.indexOf(shWU) >= 0);
  })();

  rep.pass = _p; rep.fail = _f;
  try { globalThis.__report = rep; } catch (e) { this.__report = rep; }
})();
