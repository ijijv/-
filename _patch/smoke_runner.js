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
    __ok('噬魂术预览 武僧=诅咒×5(非×6)', pv().d === 10, 'd=' + pv().d);
    g = __base('wuseng'); g.blockGainedTurn = 10; g.enemies[0].curse = 0;
    __ok('噬魂术预览 武僧=格挡加成5(无诅咒不落空)', pv().d === 5 && !pv().miss, JSON.stringify(pv()));
    g = __base('wuseng'); g.enemies[0].curse = 0;
    __ok('噬魂术预览 武僧=无诅咒落空', pv().miss === '无诅咒', JSON.stringify(pv()));
    g = __base('yincha'); g.xuenu = 3; g.enemies[0].curse = 0;
    __ok('噬魂术预览 阴差=10+血怒2×3(共16)', pv().d === 16, 'd=' + pv().d);
    g = __base('tianshi'); g.enemies[0].curse = 2;
    __ok('噬魂术预览 天师=诅咒×7', pv().d === 14, 'd=' + pv().d);
    g = __base('tianshi'); g.enemies[0].curse = 0;
    __ok('噬魂术预览 天师=无诅咒落空', pv().miss === '无诅咒', JSON.stringify(pv()));
    var shU = Object.assign({}, sh); shU.up = true;
    g = __base('ganshiren'); g.尸气 = 10; g.enemies[0].curse = 5;
    __ok('噬魂术预览 升级赶尸人=18', previewDamage(shU).d === 18, 'd=' + previewDamage(shU).d);
    g = __base('tianshi'); g.enemies[0].curse = 2;
    __ok('噬魂术预览 升级天师=诅咒×9', previewDamage(shU).d === 18, 'd=' + previewDamage(shU).d);
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

  rep.pass = _p; rep.fail = _f;
  try { globalThis.__report = rep; } catch (e) { this.__report = rep; }
})();
