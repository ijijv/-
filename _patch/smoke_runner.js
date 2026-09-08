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
    finishEndTurn();
    __ok('A#23 卸甲 回合末5格挡→2尸气', g.尸气 === 2 && g.block === 0 && g.endBlockKind === null, '尸气=' + g.尸气 + ' block=' + g.block);
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
    g = __base('tianshi'); c = __card('xiejiashengyuan'); c.eff(true, c); finishEndTurn();
    __ok('D#23 卸甲 回合末8格挡→4诅咒', g.block === 0 && g.endBlockKind === null && __sumCurse() === 4 && CURSE_THIS_TURN === 4, 'sumCurse=' + __sumCurse() + ' CURSE=' + CURSE_THIS_TURN);

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

  rep.pass = _p; rep.fail = _f;
  try { globalThis.__report = rep; } catch (e) { this.__report = rep; }
})();
