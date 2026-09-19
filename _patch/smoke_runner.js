/* ===== 志怪塔 Task#13 冒烟 runner（追加于 <script> 末尾，与引擎同作用域） ===== */
(function () {
  /* ---------- 外围降级：保留结算逻辑，屏蔽渲染/音效/存档/成就/召唤 UI 的副作用 ---------- */
  try { SETTINGS.lowSpec = true; SETTINGS.sound = false; SETTINGS.musicVol = 0; SETTINGS.sfxVol = 0; } catch (e) {}
  var __sil = function () {};
  var __realSaveRun = saveRun; // v0.61.06：saveRun 会被 stub，但「存档里带没带随机态」只有真函数测得出
  var __gcInit = goldCompensation; // v0.61 B6：捕获金卡补偿初值（后续用例会改动这个全局）
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
  var __realEnemyAct = enemyAct; // 保留真实引用（默认 stub 掉，避免 enemyAct->startTurn 连锁）
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
      okType.indexOf(c.type) >= 0 && okRar.indexOf(c.rarity) >= 0 &&
      (typeof c.cost === 'number' || (c.cost && typeof c.cost === 'object'))); // cost 可为按英雄对象（_costPick）
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
    __ok('A#41 纸人 入召唤槽(计数1/持续2+被动1=3)', g.summonsMadeTurn === 1 && g.summons[0].type === 'zhiren' && g.summons[0].dur === 3, JSON.stringify(g.summons));

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
    // ===== Block4 防御批 A 列修正（金刚/隐身/金光/金钟/荆棘/铜皮/卸甲，佛渡加赶尸人分支）=====
    g = __base('ganshiren');
    (function () { var c = __card('jingang'); c.eff(false, c);
      __ok('D#15 金刚符 基础4格+1尸气', g.block === 4 && g.尸气 === 1, 'block=' + g.block + ' 尸气=' + g.尸气); })();
    (function () { G.block = 0; G.尸气 = 0; var c = __card('jingang'); c.eff(true, c);
      __ok('D#15u 金刚符 升级7格+2尸气', g.block === 7 && g.尸气 === 2, 'block=' + g.block + ' 尸气=' + g.尸气); })();
    g = __base('ganshiren'); G.summons = [{type:'zhiren', v:1, dur:2}];
    (function () { var c = __card('jingang'); c.eff(false, c);
      __ok('D#15s 金刚符 召唤不再加格挡', g.block === 4, 'block=' + g.block); })();
    g = __base('ganshiren');
    (function () { var c = __card('yinshen'); c.eff(false, c);
      __ok('D#16 隐身符 基础3格挡', g.block === 3, 'block=' + g.block); })();
    (function () { G.block = 0; var c = __card('yinshen'); c.eff(true, c);
      __ok('D#16u 隐身符 升级6格挡', g.block === 6, 'block=' + g.block); })();
    g = __base('ganshiren'); g.尸气 = 2;
    (function () { var c = __card('jinguang'); c.eff(false, c);
      __ok('D#17 金光罩 基础10格+耗2尸气+4格', g.block === 14 && g.尸气 === 0, 'block=' + g.block + ' 尸气=' + g.尸气); })();
    g = __base('ganshiren'); g.尸气 = 2;
    (function () { var c = __card('jinguang'); c.eff(true, c);
      __ok('D#17u 金光罩 升级15格+耗2尸气+5格', g.block === 20 && g.尸气 === 0, 'block=' + g.block + ' 尸气=' + g.尸气); })();
    g = __base('ganshiren');
    (function () { var c = __card('jinzhong'); c.eff(false, c);
      __ok('D#18 金钟罩 基础10格挡', g.block === 10, 'block=' + g.block); })();
    (function () { G.block = 0; var c = __card('jinzhong'); c.eff(true, c);
      __ok('D#18u 金钟罩 升级16格挡', g.block === 16, 'block=' + g.block); })();
    g = __base('ganshiren');
    (function () { var c = __card('jingji'); c.eff(false, c);
      __ok('D#19 荆棘符 基础3格+反弹4', g.block === 3 && G.thorns === 4, 'block=' + g.block + ' thorns=' + G.thorns); })();
    (function () { G.block = 0; G.thorns = 0; var c = __card('jingji'); c.eff(true, c);
      __ok('D#19u 荆棘符 升级6格+反弹6', g.block === 6 && G.thorns === 6, 'block=' + g.block + ' thorns=' + G.thorns); })();
    g = __base('ganshiren');
    (function () { var c = __card('fodu'); c.eff(false, c);
      __ok('D#20 佛渡 基础免疫+无尸气', G.debuffImmune === 1 && g.尸气 === 0, '免疫=' + G.debuffImmune + ' 尸气=' + g.尸气); })();
    (function () { var c = __card('fodu'); c.eff(true, c);
      __ok('D#20u 佛渡 升级获2尸气+免疫', g.尸气 === 2 && G.debuffImmune === 1, '尸气=' + g.尸气 + ' 免疫=' + G.debuffImmune); })();
    g = __base('ganshiren'); G.summons = [{type:'zhiren', v:1, dur:2}];
    (function () { var c = __card('tongpi'); c.eff(false, c);
      __ok('D#21 铜皮 基础9格+反弹4+召唤1', g.block === 9 && G.thorns === 5, 'block=' + g.block + ' thorns=' + G.thorns); })();
    (function () { G.block = 0; G.thorns = 0; var c = __card('tongpi'); c.eff(true, c);
      __ok('D#21u 铜皮 升级12格+反弹6+召唤1', g.block === 12 && G.thorns === 7, 'block=' + g.block + ' thorns=' + G.thorns); })();
    g = __base('ganshiren');
    (function () { var c = __card('xiejiashengyuan'); c.eff(false, c);
      __ok('D#23 卸甲 基础4格+开A转化', g.block === 4 && G.endBlockKind === 'A' && !g.xiejiaUp, 'block=' + g.block + ' kind=' + G.endBlockKind); })();
    (function () { G.block = 0; var c = __card('xiejiashengyuan'); c.eff(true, c);
      __ok('D#23u 卸甲 升级7格+xiejiaUp', g.block === 7 && g.xiejiaUp === true, 'block=' + g.block + ' up=' + g.xiejiaUp); })();
    // ===== Block4 功能批 A 列修正（聚灵/舍身/血契 升级倍率；燃魂抽2+符文；移形换影2尸气；镇妖铃无条件3尸气）=====
    g = __base('ganshiren'); g.hand = []; g.drawPile = [__card('leifu'), __card('zhiren')];
    (function () { var cc = __card('juling'); cc.eff(true, cc);
      __ok('F#24u 聚灵 升级抽到鬼怪→2尸气', g.尸气 === 2, '尸气=' + g.尸气); })();
    g = __base('ganshiren'); G.drawPile = ['leifu', 'jingang', 'zhiren'].map(__card); g.hand = [];
    (function () { var cc = __card('sheshen'); cc.eff(false, cc);
      __ok('F#25 舍身 失4血+1尸气', g.hp === 56 && g.尸气 === 1, 'hp=' + g.hp + ' 尸气=' + g.尸气); })();
    g = __base('ganshiren'); G.drawPile = ['leifu', 'jingang', 'zhiren'].map(__card); g.hand = []; g.尸气 = 0;
    (function () { var cc = __card('sheshen'); cc.eff(true, cc);
      __ok('F#25u 舍身 升级→2尸气', g.尸气 === 2, '尸气=' + g.尸气); })();
    g = __base('ganshiren');
    (function () { var cc = __card('xueqi'); cc.eff(false, cc);
      __ok('F#28 血契 基础每失1血+2格挡', G.bloodPact === 2, 'pact=' + G.bloodPact); })();
    (function () { G.bloodPact = 0; var cc = __card('xueqi'); cc.eff(true, cc);
      __ok('F#28u 血契 升级每失1血+3格挡', G.bloodPact === 3, 'pact=' + G.bloodPact); })();
    g = __base('ganshiren');
    __ok('F#35 血祭 文本上限3张', __card('xueji').t(false).indexOf('上限 3张') >= 0, __card('xueji').t(false));
    g = __base('ganshiren'); G.drawPile = ['leifu', 'jingang', 'zhiren'].map(__card); g.hand = []; g.energy = 0;
    (function () { var cc = __card('ranhun'); cc.eff(false, cc);
      __ok('F#36 燃魂 失6血+抽2张+1符文', g.hp === 54 && g.hand.length === 2 && g.energy === 1, 'hp=' + g.hp + ' hand=' + g.hand.length + ' en=' + g.energy); })();
    g = __base('ganshiren'); G.drawPile = ['leifu', 'jingang', 'zhiren'].map(__card); g.hand = []; g.energy = 0;
    (function () { var cc = __card('ranhun'); cc.eff(true, cc);
      __ok('F#36u 燃魂 升级失4血+2符文', g.hp === 56 && g.energy === 1, 'hp=' + g.hp + ' en=' + g.energy); })();
    g = __base('ganshiren');
    (function () { var cc = __card('yixing'); cc.eff(false, cc);
      __ok('F#38 移形换影 闪避+成功后2尸气', G.dodge === 1 && G.dodgeShiqi === 2, 'dodge=' + G.dodge + ' shiqi=' + G.dodgeShiqi); })();
    g = __base('ganshiren');
    (function () { var cc = __card('zhenyaoling'); cc.eff(false, cc);
      __ok('F#40 镇妖铃 无条件获3尸气', g.尸气 === 3, '尸气=' + g.尸气); })();
    // ===== Block4 召唤批 A 列修正（纸人强化/咒魂/小鬼/五通神/咒雨引爆/尸王）=====
    g = __base('ganshiren'); g.尸气 = 3;
    (function () { var cc = __card('zhiren'); cc.eff(false, cc);
      __ok('S#41 纸人 尸气不足3→基础v=2不消耗', g.summons[0].v === 2 && g.尸气 === 3, 'v=' + g.summons[0].v + ' 尸气=' + g.尸气); })();
    g = __base('ganshiren'); g.尸气 = 4;
    (function () { var cc = __card('zhiren'); cc.eff(false, cc);
      __ok('S#41b 纸人 尸气≥4→耗4强化v=5', g.summons[0].v === 5 && g.尸气 === 0, 'v=' + g.summons[0].v + ' 尸气=' + g.尸气); })();
    g = __base('ganshiren'); g.尸气 = 4;
    (function () { var cc = __card('zhiren'); cc.eff(true, cc);
      __ok('S#41c 纸人 升级强化v=7', g.summons[0].v === 7, 'v=' + g.summons[0].v); })();
    g = __base('ganshiren'); g.summons = [{ type: 'zhiren', v: 2, dur: 2 }]; G.enemies.forEach(function (e) { e.curse = 0; });
    (function () { summonAct(g.summons[0]);
      __ok('S#41d 纸人(赶尸人) 攻击不叠诅咒', __sumCurse() === 0, 'curse=' + __sumCurse()); })();
    g = __base('ganshiren');
    (function () { var cc = __card('zhouyin'); cc.eff(false, cc);
      // v0.60.02：「咒魂」只是氛围说法，不产生任何召唤单位，只结算 +3 尸气
      __ok('S#42 咒印 只获3尸气、不召唤咒魂',
        g.尸气 === 3 && g.summons.length === 0 &&
        !g.summons.some(function (x) { return x.type === 'zhouhun'; }),
        '尸气=' + g.尸气 + ' summons=' + g.summons.length); })();
    g = __base('ganshiren');
    (function () { var cc = __card('zhouyin'); cc.eff(true, cc);
      __ok('S#42u 咒印 升级获5尸气', g.尸气 === 5, '尸气=' + g.尸气); })();
    g = __base('ganshiren');
    (function () { var cc = __card('xiaogui'); cc.eff(false, cc);
      __ok('S#43 小鬼 基础v=2', g.summons[0].v === 2, 'v=' + g.summons[0].v); })();
    g = __base('ganshiren');
    (function () { var cc = __card('xiaogui'); cc.eff(false, cc); onSummonDeath(g.summons[0]);
      __ok('S#43d 小鬼死亡 基础给2尸气', g.尸气 === 2, '尸气=' + g.尸气); })();
    g = __base('ganshiren');
    (function () { var cc = __card('xiaogui'); cc.eff(true, cc); onSummonDeath(g.summons[0]);
      __ok('S#43u 小鬼升级 v=4/死亡给3尸气', g.summons[0].v === 4 && g.尸气 === 3, 'v=' + g.summons[0].v + ' 尸气=' + g.尸气); })();
    g = __base('ganshiren');
    (function () { var cc = __card('wutong'); cc.eff(false, cc);
      __ok('S#45 五通神 基础立即5格挡(无尸气)', g.block === 5 && g.尸气 === 0, 'block=' + g.block + ' 尸气=' + g.尸气); })();
    g = __base('ganshiren'); g.尸气 = 5;
    (function () { var cc = __card('wutong'); cc.eff(false, cc);
      __ok('S#45b 五通神 尸气≥5→耗5强化6格挡', g.block === 6 && g.尸气 === 0, 'block=' + g.block + ' 尸气=' + g.尸气); })();
    g = __base('ganshiren'); g.尸气 = 6; var __hp0 = __sumHp();
    (function () { var cc = __card('zhouyu'); cc.eff(false, cc);
      __ok('S#46 咒雨 引爆6尸气→36伤害+清零', g.尸气 === 0 && (__hp0 - __sumHp()) === 36, '尸气=' + g.尸气 + ' dmg=' + (__hp0 - __sumHp())); })();
    g = __base('ganshiren'); g.尸气 = 0;
    (function () { onSummonDeath({ type: 'shi_wang', v: 10, dur: 0 });
      __ok('S#48 尸王消散 不再给2尸气', g.尸气 === 0, '尸气=' + g.尸气); })();






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
    __ok('B#23 卸甲 只置 xiejia 不清格挡', g.xiejia === 2 && g.endBlockKind === null && g.block === 5, 'xiejia=' + g.xiejia + ' endBlockKind=' + g.endBlockKind + ' block=' + g.block);
    g = __base('wuseng'); c = __card('xiejiashengyuan'); c.eff(false, c); finishEndTurn();
    __ok('B#23 卸甲 回合末格挡保留', g.block === 5 && g.xiejia === 2, 'block=' + g.block);

    // ---- v0.58 防御牌（15~23）按《武僧版卡池.md》 ----
    function blk(id, up) { var g2 = __base('wuseng'); var cc = Object.assign({}, __card(id), { up: !!up }); cc.eff(!!up, cc); return g2.block; }
    __ok('B#15 金刚符 6/9', blk('jingang') === 6 && blk('jingang', true) === 9, blk('jingang') + '/' + blk('jingang', true));
    __ok('B#16 隐身符 4/6', blk('yinshen') === 4 && blk('yinshen', true) === 6, blk('yinshen') + '/' + blk('yinshen', true));
    __ok('B#17 金光罩 14/19', blk('jinguang') === 14 && blk('jinguang', true) === 19, blk('jinguang') + '/' + blk('jinguang', true));
    __ok('B#18 金钟罩 12/17', blk('jinzhong') === 12 && blk('jinzhong', true) === 17, blk('jinzhong') + '/' + blk('jinzhong', true));
    __ok('B#19 荆棘符 4/7 + 反弹 4/5', blk('jingji') === 4 && blk('jingji', true) === 7,
      'blk=' + blk('jingji') + '/' + blk('jingji', true) + ' 反弹=' + (function () { var g2 = __base('wuseng'); var cc = __card('jingji'); cc.eff(false, cc); return g2.thorns; })() +
      '/' + (function () { var g2 = __base('wuseng'); var cc = Object.assign({}, __card('jingji'), { up: true }); cc.eff(true, cc); return g2.thorns; })());
    __ok('B#20 佛渡 升级 +4 格挡', blk('fodu') === 0 && blk('fodu', true) === 4, blk('fodu') + '/' + blk('fodu', true));
    __ok('B#21 铜皮铁骨 10/15 + 反弹 6/8',
      blk('tongpi') === 10 && blk('tongpi', true) === 15 &&
      (function () { var g2 = __base('wuseng'); var cc = __card('tongpi'); cc.eff(false, cc); return g2.thorns === 6; })() &&
      (function () { var g2 = __base('wuseng'); var cc = Object.assign({}, __card('tongpi'), { up: true }); cc.eff(true, cc); return g2.thorns === 8; })(),
      blk('tongpi') + '/' + blk('tongpi', true));
    var fz = __card('fanzhen');
    g = __base('wuseng'); __card('fanzhen').eff(false, __card('fanzhen'));
    __ok('B#22 反震 反弹 4/5 且不再给下回合格挡',
      G.thorns === 4 && (G.nextBlock || 0) === 0 && cardCost(fz) === 1 && cardCost(Object.assign({}, fz, { up: true })) === 0,
      'thorns=' + G.thorns + ' nextBlock=' + G.nextBlock + ' cost=' + cardCost(fz) + ' costU=' + cardCost(Object.assign({}, fz, { up: true })));
    __ok('B#22 反震 升级反弹 5', (function () { var g2 = __base('wuseng'); var cc = Object.assign({}, __card('fanzhen'), { up: true }); cc.eff(true, cc); return g2.thorns === 5; })());
    __ok('B#23 卸甲生元 5/8', blk('xiejiashengyuan') === 5 && blk('xiejiashengyuan', true) === 8,
      blk('xiejiashengyuan') + '/' + blk('xiejiashengyuan', true));

    g = __base('wuseng'); c = __card('jingji'); c.eff(false, c);
    __ok('B#19 荆棘符 thorns>=4', (g.thorns || 0) >= 4, 'thorns=' + g.thorns);

    g = __base('wuseng'); c = __card('yixing'); c.eff(false, c);
    __ok('B#37 移形 dodge+闪避后+5格挡', g.dodge === 1 && g.dodgeNextBlock === 5, 'dodge=' + g.dodge);

    g = __base('wuseng'); g.hand = [__card('leifu'), __card('leifu'), __card('leifu')];
    c = __card('fenfu'); c.eff(false, c); g.discardSelect.picked = [0, 2]; confirmDiscardSelect();
    __ok('B#34 焚符 弃2张→8格挡(每张4)', (g.blockGainedTurn || 0) === 8, 'blockTurn=' + g.blockGainedTurn);

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
    __ok('C#30 燃血术 失4血+1符文', g.hp === pre - 4 && g.energy === 10, 'hp=' + g.hp + ' energy=' + g.energy);

    g = __base('yincha'); g.xuenu = 5; c = __card('kaitianyan'); c.eff(false, c);
    __ok('C#33 开天眼 消耗5层血怒+8攻', g.xuenu === 0 && g.turnAtkBuff === 8, 'xuenu=' + g.xuenu + ' atk=' + g.turnAtkBuff);

    g = __base('yincha'); g.hand = [__card('leifu'), __card('leifu'), __card('leifu')]; g.hp = 40;
    c = __card('fenfu'); c.eff(false, c); g.discardSelect.picked = [0, 2]; confirmDiscardSelect();
    __ok('C#34 焚符 弃2张→回6血(每张3)', g.hp === 46, 'hp=' + g.hp);

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
    __ok('D#17 金光罩 12 盾+诅咒全额(15)', g.block === 15, 'block=' + g.block);

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
    var zeroUp = ['tongling', 'jingxin', 'xueji', 'yixing']; // tiebushan 已按列取费（B 0 费不可升级）
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
    __ok('噬魂术预览 武僧=诅咒×2=4', pv().d === 4, 'd=' + pv().d);
    g = __base('wuseng'); g.blockGainedTurn = 10; g.enemies[0].curse = 0;
    __ok('噬魂术预览 武僧=格挡不参与伤害(无诅咒落空)', pv().miss === '无诅咒', JSON.stringify(pv()));
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
    __ok('百鬼预览 B=5+min(8,6/2)=8', lv('baigui').d === 8, 'd=' + lv('baigui').d);
    g = __base('yincha');
    __ok('百鬼预览 C=5+0召唤=5', lv('baigui').d === 5, 'd=' + lv('baigui').d);
    g = __base('tianshi'); g.enemies[0].curse = 3;
    __ok('百鬼预览 D=7+1×3诅咒=10', lv('baigui').d === 10, 'd=' + lv('baigui').d);
    g = __base('ganshiren'); g.block = 0; g.尸气 = 6;
    __ok('铁布衫预览 A 无格挡有尸气(3) 非落空', lv('tiebushan').d === 3 && !lv('tiebushan').miss, 'd=' + lv('tiebushan').d);
    g = __base('ganshiren');
    __ok('纸人预览 每回合 v=2', lv('zhiren').d === 2, 'd=' + lv('zhiren').d);
    g = __base('ganshiren'); G.summons = [{ type: 'shi_wang', v: 10, dur: 3 }];
    __ok('纸人预览 尸王在场 2+1=3', lv('zhiren').d === 3, 'd=' + lv('zhiren').d);
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

    // 武僧：基础 1 点（卡）+ 首次触发 4 点（召唤）= 当回合 5 格挡
    g = __base('wuseng'); G.block = 0; c = __card('wutong'); c.eff(false, c);
    __ok('v0.58 五通神(武僧) 当回合 1+4=5 格挡', g.block === 5, 'block=' + g.block);
    __ok('v0.51 五通神(武僧) 现形即耗 1 回合(剩1)', g.summons.length === 1 && g.summons[0].dur === 1, JSON.stringify(g.summons));

    // 赶尸人：立即 +3 格挡 +1 尸气
    g = __base('ganshiren'); G.block = 0; G.尸气 = 0; c = __card('wutong'); c.eff(false, c);
    __ok('v0.57 五通神(赶尸人) 当回合 +5格挡', g.block === 5 && (g.尸气 || 0) === 0, 'block=' + g.block + ' 尸气=' + g.尸气);

    // 阴差：改成回血 —— 当回合 = 立即 5 + 首次触发 5 = +10 生命，不给格挡
    g = __base('yincha'); G.block = 0; c = __card('wutong'); c.eff(false, c);
    __ok('v0.59 五通神(阴差) 当回合 +10生命+0格挡', g.hp === 70 && g.block === 0, 'hp=' + g.hp + ' block=' + g.block);
    __ok('v0.59 五通神(阴差) 基础剩1回合(共2)', g.summons[0].dur === 1, 'dur=' + g.summons[0].dur);

    // 阴差：血怒 ≥4 → 消耗 4 层，持续 2 → 3 回合
    g = __base('yincha'); G.block = 0; g.xuenu = 4; c = __card('wutong'); c.eff(false, c);
    __ok('v0.59 五通神(阴差) 血怒4 → 消耗4层、剩2回合(共3)', g.xuenu === 0 && g.summons[0].dur === 2,
      'xuenu=' + g.xuenu + ' dur=' + g.summons[0].dur);

    // 阴差：回合开始的 tick 是「恢复生命」而非格挡
    g = __base('yincha'); G.block = 0; g.summons = [{ type: 'wutong', v: 5, dur: 2 }]; g.hp = 50;
    wutongTick(g.summons[0]);
    __ok('v0.59 五通神(阴差) 回合开始 +5生命、不给格挡', g.hp === 55 && g.block === 0,
      'hp=' + g.hp + ' block=' + g.block);

    // 天师：不再是「永久」——有 2/3 回合限制；当回合 +3 格挡 +1 诅咒
    g = __base('tianshi'); G.block = 0; c = __card('wutong'); c.eff(false, c);
    s = g.summons[0];
    __ok('v0.51 五通神(天师) 非永久(有回合限制)', s.indefinite !== true && typeof s.dur === 'number', 'indefinite=' + s.indefinite + ' dur=' + s.dur);
    __ok('v0.51 五通神(天师) 基础剩1回合(共2)', s.dur === 1, 'dur=' + s.dur);
    __ok('v0.60 五通神(天师) 当回合 +4格挡+1诅咒', g.block === 4 && __sumCurse() === 1, 'block=' + g.block + ' curse=' + __sumCurse());

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

  /* ============ v0.58 噬魂术(武僧) 按《武僧版卡池.md》重做：每层 2/3 伤 + 每层 1/2 格挡 ============ */
  (function () {
    __base('wuseng');
    var shW = __card('shihun'), shWU = Object.assign({}, shW, { up: true });
    var txtW = shW.t(false), txtWU = shW.t(true);
    __ok('v0.58 噬魂术(武僧) 卡面每层2', txtW.indexOf('每层造成 2') >= 0, txtW);
    __ok('v0.58 噬魂术(武僧) 升级卡面每层3', txtWU.indexOf('每层造成 3') >= 0, txtWU);
    __ok('v0.58 噬魂术(武僧) 卡面含「获得 1 点格挡」', txtW.indexOf('获得 1 点格挡') >= 0, txtW);
    __ok('v0.58 噬魂术(武僧) 升级卡面含「获得 2 点格挡」', txtWU.indexOf('获得 2 点格挡') >= 0, txtWU);

    G.enemies[0].curse = 2; G.enemies[0].block = 0;
    __ok('v0.58 噬魂术(武僧) 升级预览 2层诅咒 → 6', previewDamage(shWU).d === 6, 'd=' + previewDamage(shWU).d);
    G.enemies[0].curse = 0;
    __ok('v0.58 噬魂术(武僧) 无诅咒落空', previewDamage(shWU).miss === '无诅咒', JSON.stringify(previewDamage(shWU)));

    // 实测升级态：3 层诅咒 → 9 伤 + 6 格挡，诅咒清零
    G.enemies[0].curse = 3; G.enemies[0].block = 0;
    G.enemies[0].maxHp = 300; G.enemies[0].hp = 300;
    G.block = 0;
    var hw0 = G.enemies[0].hp;
    G.hand = [shWU]; G.deck = [shWU]; G.drawPile = []; G.discard = []; G.exhausted = [];
    doPlayCard(0);
    __ok('v0.58 噬魂术(武僧) 升级 3层诅咒 → 9 伤害', hw0 - G.enemies[0].hp === 9, 'dealt=' + (hw0 - G.enemies[0].hp));
    __ok('v0.58 噬魂术(武僧) 升级 3层诅咒 → 6 格挡', G.block === 6, 'block=' + G.block);
    __ok('v0.58 噬魂术(武僧) 打出后诅咒清零', G.enemies[0].curse === 0, 'curse=' + G.enemies[0].curse);
    __ok('v0.58 噬魂术(武僧) 非消耗牌 正常进弃牌堆', (G.exhausted || []).length === 0 && G.discard.indexOf(shWU) >= 0);
  })();

  /* ============ v0.58 武僧攻击牌（1~14）按文档重做 ============ */
  (function () {
    function up(id) { return Object.assign({}, __card(id), { up: true }); }
    var g;
    // #1 雷符 / #2 火符：升级后每 2 点格挡 +1
    g = __base('wuseng'); g.block = 4;
    __ok('v0.58 雷符(武僧) 升级 4 格挡 → 6+2=8', previewDamage(up('leifu')).d === 8, 'd=' + previewDamage(up('leifu')).d);
    g = __base('wuseng'); g.block = 4;
    __ok('v0.58 火符(武僧) 升级 4 格挡 → 7+2=9', previewDamage(up('huofu')).d === 9, 'd=' + previewDamage(up('huofu')).d);

    // #5 天雷正法：20 伤 + 获得等量格挡
    g = __base('wuseng'); g.block = 0;
    g.enemies[0].hp = 300; g.enemies[0].maxHp = 300;
    var tlU = up('tianlei');
    g.hand = [tlU]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.58 天雷正法(武僧) 升级 20 伤 + 20 格挡', g.enemies[0].hp === 280 && G.block === 20,
      'hp=' + g.enemies[0].hp + ' block=' + G.block);
    __ok('v0.58 天雷正法(武僧) 预览=20(不含格挡)', previewDamage(tlU).d === 20, 'd=' + previewDamage(tlU).d);

    // #6 万剑归宗：全体 9/14 + 获得 10/12 格挡 + 斩杀刷新 0 费万剑
    g = __base('wuseng'); g.block = 0;
    g.enemies[0].hp = 300; g.enemies[0].maxHp = 300;
    g.enemies[1].hp = 4; g.enemies[1].maxHp = 60;
    g.hand = [__card('wanjian')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.58 万剑归宗(武僧) 全体 9 伤', g.enemies[0].hp === 291, 'hp=' + g.enemies[0].hp);
    __ok('v0.58 万剑归宗(武僧) 获得 10 格挡', G.block === 10, 'block=' + G.block);
    var zc = G.hand.filter(function (x) { return x.id === 'wanjian' && cardCost(x) === 0; });
    __ok('v0.58 万剑归宗(武僧) 斩杀 1 名 → 手牌多 1 张 0 费万剑', zc.length === 1,
      'hand=' + G.hand.map(function (x) { return x.id + '@' + cardCost(x); }).join(','));

    // #7 铁布衫：B 0 费不可升级；A/C 1→0；D 1 不可升级
    var tb = __card('tiebushan');
    g = __base('wuseng');
    __ok('v0.58 铁布衫(武僧) 0 费且不可升级', cardCost(tb) === 0 && canUpgrade(tb) === false, 'cost=' + cardCost(tb));
    g = __base('ganshiren');
    __ok('v0.58 铁布衫(赶尸人) 1 费 → 升级 0 费', cardCost(tb) === 1 && cardCost(Object.assign({}, tb, { up: true })) === 0);
    g = __base('tianshi');
    // v0.60：D 列铁布衫升级后「每层诅咒额外 +2」（原 +1），故变为可升级；费用仍 1 费
    __ok('v0.60 铁布衫(天师) 1 费且可升级(每层 +1→+2)', cardCost(tb) === 1 && canUpgrade(tb) === true, 'cost=' + cardCost(tb));

    // #11 蚀魂咒：耗 2 格挡，施 1/2 层诅咒
    g = __base('wuseng'); g.block = 5; g.enemies[0].curse = 0;
    g.hand = [__card('shihunzhou')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.58 蚀魂咒(武僧) 耗 2 格挡施 1 层诅咒', G.block === 3 && G.enemies[0].curse === 1,
      'block=' + G.block + ' curse=' + G.enemies[0].curse);

    // #12 嗜血：升级后每 2 点格挡 +1（上限 5）
    g = __base('wuseng'); g.block = 6;
    __ok('v0.58 嗜血(武僧) 升级 6 格挡 → 6+min(5,3)=9', previewDamage(up('shixue')).d === 9, 'd=' + previewDamage(up('shixue')).d);

    // #13 百鬼夜行：升级 6 伤、每 1 点格挡 +1（上限 +11）
    g = __base('wuseng'); g.block = 10;
    __ok('v0.58 百鬼夜行(武僧) 升级 10 格挡 → 6+10=16', previewDamage(up('baigui')).d === 16, 'd=' + previewDamage(up('baigui')).d);

    // #14 钟馗镇魂：减费门槛 12/15/21
    var zk = __card('zhongkui');
    g = __base('wuseng');
    g.block = 11; var c11 = effectiveCost(zk);
    g.block = 12; var c12 = effectiveCost(zk);
    g.block = 15; var c15 = effectiveCost(zk);
    g.block = 21; var c21 = effectiveCost(zk);
    __ok('v0.58 钟馗镇魂(武僧) 减费门槛 12/15/21', c11 === 3 && c12 === 2 && c15 === 1 && c21 === 0,
      [c11, c12, c15, c21].join('/'));
    __ok('v0.58 钟馗镇魂(武僧) 卡面门槛 12/15/21', zk.t(false).indexOf('12/15/21') >= 0, zk.t(false));
  })();

  /* ============ v0.58 武僧功能牌（24~40）按《武僧版卡池.md》重做 ============ */
  (function () {
    var g, cc;

    // #24 聚灵：B 只抽牌（去掉「获得过格挡再抽 1 张」）
    g = __base('wuseng'); __fill();
    __card('juling').eff(false, __card('juling'));
    __ok('v0.58 B#24 聚灵 只抽 1 张', g.hand.length === 1, 'hand=' + g.hand.length);

    // #25 舍身：3/5 格挡
    g = __base('wuseng'); __fill(); __card('sheshen').eff(false, __card('sheshen'));
    var s3 = g.block;
    g = __base('wuseng'); __fill(); cc = Object.assign({}, __card('sheshen'), { up: true }); cc.eff(true, cc);
    __ok('v0.58 B#25 舍身 3/5 格挡', s3 === 3 && g.block === 5, s3 + '/' + g.block);

    // #26 守一：保留 1 张防御牌 3/4 格挡
    g = __base('wuseng'); g.block = 0;
    __card('shouyi').eff(false, __card('shouyi'));
    g.hand = [__card('jingang')]; g.retainSelect = { need: 1, picked: [0] };
    confirmRetainSelect();
    var sy3 = g.block;
    g = __base('wuseng'); g.block = 0;
    cc = Object.assign({}, __card('shouyi'), { up: true }); cc.eff(true, cc);
    var syUp = g.shouyiUp === true;
    g.hand = [__card('jingang')]; g.retainSelect = { need: 1, picked: [0] };
    confirmRetainSelect();
    __ok('v0.58 B#26 守一 保留防御牌 3/4 格挡', sy3 === 3 && g.block === 4 && syUp,
      sy3 + '/' + g.block + ' shouyiUp=' + syUp);

    // #28 血契：1/0(U:0)，把当前格挡按 60% 转化为生命（v0.61.10 P2）
    var xq = __card('xueqi');
    g = __base('wuseng'); g.block = 7; g.hp = 40;
    xq.eff(false, xq);
    __ok('v0.58 B#28 血契 格挡 7 → floor(7×0.6)=4 血（格挡清零）', g.block === 0 && g.hp === 44, 'block=' + g.block + ' hp=' + g.hp);
    // P2 边界：10 格挡 → 6 血（恰好整除）、1 格挡 → 0 血（floor 不吃亏血）
    g = __base('wuseng'); g.block = 10; g.hp = 40; xq.eff(false, xq); var _hp10 = g.hp;
    g = __base('wuseng'); g.block = 1; g.hp = 40; xq.eff(false, xq); var _hp1 = g.hp;
    __ok('v0.61.10 P2 血契 10→6 / 1→0（floor 不产生零头血）', _hp10 === 46 && _hp1 === 40, _hp10 + '/' + _hp1);
    __ok('v0.58 B#28 血契 1 费升级 0 费', cardCost(xq) === 1 && cardCost(Object.assign({}, xq, { up: true })) === 0,
      cardCost(xq) + '/' + cardCost(Object.assign({}, xq, { up: true })));
    g = __base('wuseng'); g.block = 0; g.hp = 40;
    xq.eff(false, xq);
    __ok('v0.58 B#28 血契 无格挡时不变', g.block === 0 && g.hp === 40, 'hp=' + g.hp);
    g = __base('ganshiren');
    __ok('v0.58 B#28 血契 赶尸人仍是血转盾文案', xq.t(false).indexOf('转化为血量') < 0 && xq.t(false).indexOf('失去 1 点生命') >= 0, xq.t(false));

    // #31 燃血术：B 失去 6
    g = __base('wuseng'); cc = __card('ranxue'); cc.eff(false, cc);
    __ok('v0.58 B#31 燃血术 失去 6 点生命', g.hp === 54 && g.energy === 11, 'hp=' + g.hp + ' energy=' + g.energy);
    __ok('v0.58 B#31 燃血术 卡面写 6', __card('ranxue').t(false).indexOf('失去 6 点生命') >= 0, __card('ranxue').t(false));

    // #36 燃魂：B 抽 3、每防御牌回 2/3
    g = __base('wuseng'); __fill(); cc = __card('ranhun'); cc.eff(false, cc);
    __ok('v0.58 B#36 燃魂 抽 3 且回血档位 2', g.hand.length === 3 && g.ranhunHeal === 2 && g.energy === 9,
      'hand=' + g.hand.length + ' heal=' + g.ranhunHeal + ' energy=' + g.energy);
    g = __base('wuseng'); __fill(); cc = Object.assign({}, __card('ranhun'), { up: true }); cc.eff(true, cc);
    __ok('v0.58 B#36 燃魂 升级回血档位 3', g.ranhunHeal === 3, 'heal=' + g.ranhunHeal);
    __ok('v0.58 B#36 燃魂 卡面 2/3 同步', __card('ranhun').t(false).indexOf('恢复 2 点生命') >= 0 &&
      Object.assign({}, __card('ranhun'), { up: true }).t(true).indexOf('恢复 3 点生命') >= 0,
      __card('ranhun').t(false));

    // #37 开天眼：+2/+4，每 3/2 点格挡 +1（上限 +5）
    g = __base('wuseng'); g.block = 4;
    cc = Object.assign({}, __card('kaitianyan'), { up: true }); cc.eff(true, cc);
    __ok('v0.58 B#37 开天眼 升级 4 格挡 → 4+2=6', g.turnAtkBuff === 6, 'buff=' + g.turnAtkBuff);
    g = __base('wuseng'); g.block = 100; cc = __card('kaitianyan'); cc.eff(false, cc);
    __ok('v0.58 B#37 开天眼 上限 +5（2+5=7）', g.turnAtkBuff === 7, 'buff=' + g.turnAtkBuff);

    // #39 附灵术：每触发 1 个召唤单位 3/4 格挡
    g = __base('wuseng'); g.block = 0;
    g.summons = [{ type: 'zhiren', v: 1, dur: 2 }, { type: 'xiaogui', v: 1, dur: 2 }];
    cc = __card('fuling'); cc.eff(false, cc);
    var fl3 = g.block;
    g = __base('wuseng'); g.block = 0;
    g.summons = [{ type: 'zhiren', v: 1, dur: 2 }];
    cc = Object.assign({}, __card('fuling'), { up: true }); cc.eff(true, cc);
    __ok('v0.58 B#39 附灵术 2 个→6 / 升级 1 个→4', fl3 === 6 && g.block === 4, fl3 + '/' + g.block);

    // #40 镇妖铃：10/15 +（格挡 ≥10 时）+8/+11，且不再消耗格挡
    g = __base('wuseng'); g.block = 12; g.enemies[0].hp = 300; g.enemies[0].maxHp = 300;
    cc = __card('zhenyaoling'); cc.eff(false, cc);
    __ok('v0.58 B#40 镇妖铃 格挡12 → 18 伤且格挡不动', g.enemies[0].hp === 282 && g.block === 12,
      'hp=' + g.enemies[0].hp + ' block=' + g.block);
    g = __base('wuseng'); g.block = 9; g.enemies[0].hp = 300; g.enemies[0].maxHp = 300;
    cc = __card('zhenyaoling'); cc.eff(false, cc);
    __ok('v0.58 B#40 镇妖铃 格挡9 → 只有 10 伤', g.enemies[0].hp === 290, 'hp=' + g.enemies[0].hp);
    g = __base('wuseng'); g.block = 12;
    __ok('v0.58 B#40 镇妖铃 预览 15+11=26', previewDamage(Object.assign({}, __card('zhenyaoling'), { up: true })).d === 26,
      'd=' + previewDamage(Object.assign({}, __card('zhenyaoling'), { up: true })).d);
    g = __base('ganshiren');
    __ok('v0.58 B#40 镇妖铃 赶尸人预览仍 10/16',
      previewDamage(__card('zhenyaoling')).d === 10 && previewDamage(Object.assign({}, __card('zhenyaoling'), { up: true })).d === 16,
      previewDamage(__card('zhenyaoling')).d + '/' + previewDamage(Object.assign({}, __card('zhenyaoling'), { up: true })).d);
  })();

  /* ============ Block6 复核修正（按《赶尸人版卡池.md》补齐） ============ */
  (function () {
    function ids(arr) { return arr.map(function (c) { return c.id; }).join(','); }

    // ---- #2 火符（赶尸人）：随机弃 → 挑选弃 ----
    g = __base('ganshiren'); g.energy = 9; G.discard = []; G.drawPile = [];
    G.hand = [__card('huofu'), __card('zhiren')]; // 纸人 = 鬼怪牌
    doPlayCard(0);
    __ok('#2 火符A 打出后进入挑选弃牌（手牌不再随机弃）',
      !!G.huofuSelect && G.hand.length === 1 && G.hand[0].id === 'zhiren',
      'sel=' + !!G.huofuSelect + ' hand=' + ids(G.hand));
    pickHuofuDiscard(0);
    __ok('#2 火符A 弃掉鬼怪牌 +1 尸气',
      G.尸气 === 1 && G.huofuSelect === null && G.discard.some(function (c) { return c.id === 'zhiren'; }),
      '尸气=' + G.尸气 + ' sel=' + G.huofuSelect + ' disc=' + ids(G.discard));

    g = __base('ganshiren'); g.energy = 9; G.discard = []; G.drawPile = [];
    G.hand = [__card('huofu'), __card('jingang')]; // 金刚符 = 非鬼怪牌
    doPlayCard(0); pickHuofuDiscard(0);
    __ok('#2 火符A 弃非鬼怪牌 不加尸气', G.尸气 === 0 && G.discard.some(function (c) { return c.id === 'jingang'; }),
      '尸气=' + G.尸气 + ' disc=' + ids(G.discard));

    g = __base('ganshiren'); g.energy = 9; G.discard = []; G.drawPile = [];
    var hfU = Object.assign({}, __card('huofu'), { up: true }); // 勿改共享卡对象：否则后续所有用例的「火符」都变成升级态
    G.hand = [hfU, __card('zhiren')];
    doPlayCard(0); pickHuofuDiscard(0);
    __ok('#2 火符A 升级 弃鬼怪牌 +2 尸气', G.尸气 === 2, '尸气=' + G.尸气);

    g = __base('ganshiren');
    __ok('#2 火符A 文案为「挑选弃 1 张手牌」', __card('huofu').t(false).indexOf('挑选弃') >= 0, __card('huofu').t(false));

    // ---- #39 附灵术：按列取费 + 按列消耗（A 免费且消耗；B/C 2 费非消耗；D 2 费/升级 1 费）----
    var fl = __card('fuling');
    g = __base('ganshiren');
    __ok('#39 附灵术(赶尸人) 0 费 + 消耗牌',
      cardCost(fl) === 0 && isOneUse(fl) === true && canUpgrade(fl) === false,
      'cost=' + cardCost(fl) + ' oneUse=' + isOneUse(fl) + ' canUp=' + canUpgrade(fl));
    __ok('#39 附灵术 A 文案含「消耗牌（一次性）」', fl.t(false).indexOf('消耗牌（一次性）') >= 0, fl.t(false));

    g = __base('yincha');
    __ok('#39 附灵术(阴差) 2 费 + 非消耗牌',
      cardCost(fl) === 2 && isOneUse(fl) === false, 'cost=' + cardCost(fl) + ' oneUse=' + isOneUse(fl));

    g = __base('wuseng');
    __ok('#39 附灵术(武僧) 2 费 + 非消耗牌',
      cardCost(fl) === 2 && isOneUse(fl) === false, 'cost=' + cardCost(fl) + ' oneUse=' + isOneUse(fl));

    g = __base('tianshi');
    var flU = Object.assign({}, __card('fuling'), { up: true }); // 不改共享卡对象
    __ok('#39 附灵术(天师) 2 费 / 升级 1 费',
      cardCost(fl) === 2 && cardCost(flU) === 1 && isOneUse(fl) === false,
      'cost=' + cardCost(fl) + ' up=' + cardCost(flU) + ' oneUse=' + isOneUse(fl));

    g = __base('ganshiren');
    __ok('#39 附灵术(赶尸人) 不可升级', canUpgrade(__card('fuling')) === false);

    // ---- #38 移形换影：A 列升级补「（0 符文）」----
    g = __base('ganshiren');
    var yx = __card('yixing');
    __ok('#38 移形换影 A 升级文案含「0 符文」', yx.t(true).indexOf('0 符文') >= 0, yx.t(true));
    __ok('#38 移形换影 A 未升级文案不含「0 符文」', yx.t(false).indexOf('0 符文') < 0, yx.t(false));

    // ---- 需求⑤ 预览键补齐：镇妖铃 / 咒雨 / 尸王 ----
    g = __base('ganshiren'); g.尸气 = 5;
    __ok('⑤ 预览 咒雨 = 尸气 5 × 6 = 30', previewDamage(__card('zhouyu')).d === 30, JSON.stringify(previewDamage(__card('zhouyu'))));
    g.尸气 = 0;
    __ok('⑤ 预览 咒雨 无尸气→miss',
      (function () { var p = previewDamage(__card('zhouyu')); return !!p && p.raw === 0 && p.miss === '无尸气'; })(),
      JSON.stringify(previewDamage(__card('zhouyu'))));

    g = __base('ganshiren');
    __ok('⑤ 预览 镇妖铃 赶尸人 = 10/16',
      previewDamage(__card('zhenyaoling')).d === 10 && previewDamage(Object.assign({}, __card('zhenyaoling'), { up: true })).d === 16,
      'd0=' + previewDamage(__card('zhenyaoling')).d);

    __ok('⑤ 预览 尸王 = 10 且标注每回合',
      (function () { var p = previewDamage(__card('shi_wang')); return !!p && p.d === 10 && p.perTurn === true; })(),
      JSON.stringify(previewDamage(__card('shi_wang'))));
  })();

  /* ============ v0.58 Block8a：武僧（苦僧 B 列） ============ */
  (function () {
    // ---- ① 格挡结算顺序：先由敌人攻击消耗，再算存留最多 3 点 ----
    g = __base('wuseng');
    __fill();
    g.enemies = [g.enemies[0]];
    var _e0 = g.enemies[0]; _e0.hp = 200; _e0.maxHp = 200; _e0.intent = { type: 'attack', v: 6 };
    g.block = 10; g.hp = 60;
    __realEnemyAct();
    // 正确顺序：10 格挡挡下 6 → 剩 4 → 存留压到 3 → 下回合开始 +2 = 5，且没有掉血
    // 旧顺序（bug）：先压到 3 → 6 点攻击打穿 → 掉 3 血 → 下回合开始 +2 = 2
    __ok('B① 苦僧格挡「先消耗后存留」', G.block === 5 && G.hp === 60, 'block=' + G.block + ' hp=' + G.hp);

    // 同场对照：格挡不足以全挡时，多余伤害照常进血
    g = __base('wuseng'); __fill();
    g.enemies = [g.enemies[0]];
    var _e1 = g.enemies[0]; _e1.hp = 200; _e1.maxHp = 200; _e1.intent = { type: 'attack', v: 14 };
    g.block = 10; g.hp = 60;
    __realEnemyAct();
    __ok('B① 苦僧格挡不足时超出部分进血', G.block === 2 && G.hp === 56, 'block=' + G.block + ' hp=' + G.hp);

    // ---- ③ 初始卡池 10 张 ----
    var _wh = HEROES.filter(function (h) { return h.id === 'wuseng'; })[0];
    __ok('B③ 武僧初始卡池 10 张（雷符2 金刚2 金钟罩1 铁布衫1 血契1 反震1 咒雨1 守一1）',
      JSON.stringify(_wh.deck) === JSON.stringify([['leifu', 2], ['jingang', 2], ['jinzhong', 1], ['tiebushan', 1], ['xueqi', 1], ['fanzhen', 1], ['zhouyu', 1], ['shouyi', 1]]),
      JSON.stringify(_wh.deck));
  })();

  /* ============ v0.58 武僧召唤牌（41~48）按《武僧版卡池.md》重做 ============ */
  (function () {
    var g, c;
    // #41 纸人：2/3 伤害、不再附带诅咒；存活时每回合开始 2/3 格挡
    g = __base('wuseng'); c = __card('zhiren'); c.eff(false, c);
    var zv = g.summons[0].v, zup = g.summons[0].up;
    g = __base('wuseng'); c = Object.assign({}, __card('zhiren'), { up: true }); c.eff(true, c);
    __ok('v0.58 B#41 纸人 2/3 伤害且带升级标记', zv === 2 && g.summons[0].v === 3 && zup === false && g.summons[0].up === true,
      zv + '/' + g.summons[0].v + ' up=' + zup + '/' + g.summons[0].up);
    __ok('v0.58 B#41 纸人存活 → 回合开始 2/3 格挡',
      summonTurnBlock({ type: 'zhiren', v: 2, dur: 2, up: false }) === 2 &&
      summonTurnBlock({ type: 'zhiren', v: 3, dur: 2, up: true }) === 3);
    g = __base('wuseng'); G.summons = [{ type: 'zhiren', v: 2, dur: 2 }];
    summonAct(G.summons[0]);
    __ok('v0.58 B#41 纸人攻击不再附带诅咒', __sumCurse() === 0, 'curse=' + __sumCurse());

    // #43 小鬼：2/3 伤害；死亡 5/7 格挡
    g = __base('wuseng'); c = __card('xiaogui'); c.eff(false, c);
    var xv = g.summons[0].v;
    g = __base('wuseng'); c = Object.assign({}, __card('xiaogui'), { up: true }); c.eff(true, c);
    var xvU = g.summons[0].v;
    g = __base('wuseng'); g.block = 0; onSummonDeath({ type: 'xiaogui', up: false });
    var xb = g.block;
    g = __base('wuseng'); g.block = 0; onSummonDeath({ type: 'xiaogui', up: true });
    __ok('v0.58 B#43 小鬼 2/3 伤害 + 死亡 5/7 格挡', xv === 2 && xvU === 3 && xb === 5 && g.block === 7,
      xv + '/' + xvU + ' 死亡格挡 ' + xb + '/' + g.block);

    // #45 五通神：立即 1/2 + 首次 4 = 5/6，之后每回合开始 4
    g = __base('wuseng'); g.block = 0; c = __card('wutong'); c.eff(false, c);
    var wb = g.block, wv = g.summons[0].v;
    g = __base('wuseng'); g.block = 0; c = Object.assign({}, __card('wutong'), { up: true }); c.eff(true, c);
    __ok('v0.58 B#45 五通神 立即 5/6，之后每回合 4', wb === 5 && g.block === 6 && wv === 4 && g.summons[0].v === 4,
      wb + '/' + g.block + ' v=' + wv + '/' + g.summons[0].v);

    // #46 咒雨：0 费 / 格挡全转伤害·**逐点结算** / 无伤害预览（v0.61.10 P3 改版）
    g = __base('wuseng'); g.block = 12; g.hp = 40; var _hp0 = g.enemies.map(function (e) { return e.hp; });
    c = __card('zhouyu'); c.eff(false, c);
    __ok('v0.61.10 P3 咒雨(武僧) 12 格挡 → 12 连击 / 合计 12 伤害且格挡清零',
      g.block === 0 && g.hp === 40 &&
      g.enemies.reduce(function (a, e, i) { return a + (_hp0[i] - e.hp); }, 0) === 12,
      'block=' + g.block + ' hp=' + g.hp + ' dmg=' + g.enemies.reduce(function (a, e, i) { return a + (_hp0[i] - e.hp); }, 0));
    // 逐点结算必须「跳过整张牌口径的加成」：+2 攻击力只折成 2 点，不是每击 +2（12→14，而非 36）
    g = __base('wuseng'); g.block = 12; g.attackBuff = 2;
    var _hpB = g.enemies.map(function (e) { return e.hp; });
    c = __card('zhouyu'); c.eff(false, c);
    __ok('v0.61.10 P3 咒雨(武僧) 攻击力加成折算成点数、不逐击翻倍',
      g.enemies.reduce(function (a, e, i) { return a + (_hpB[i] - e.hp); }, 0) === 14,
      'dmg=' + g.enemies.reduce(function (a, e, i) { return a + (_hpB[i] - e.hp); }, 0));
    // 虚弱 0.75 同样折算在点数上 —— 关键是不能因为 floor(1×0.75)=0 而整场打 0 伤
    g = __base('wuseng'); g.block = 12; g.weak = 3;
    var _hpW = g.enemies.map(function (e) { return e.hp; });
    c = __card('zhouyu'); c.eff(false, c);
    __ok('v0.61.10 P3 咒雨(武僧) 虚弱下打成 floor(12×0.75)=9 点（不是 0）',
      g.enemies.reduce(function (a, e, i) { return a + (_hpW[i] - e.hp); }, 0) === 9,
      'dmg=' + g.enemies.reduce(function (a, e, i) { return a + (_hpW[i] - e.hp); }, 0));
    // 逐点结算必须**保留逐击反应**：反震 tier1 每次受击反弹 3 → 12 击共 36 点反噬（用户点名的口径）。
    // 两只敌人都挂上词缀，点数落谁身上都触发 → 结果确定。
    g = __base('wuseng'); g.block = 12; g.hp = 80; g.maxHp = 80;
    g.enemies.forEach(function (e) { e.affixes = [{ id: 'fanzhen', tier: 1 }]; });
    c = __card('zhouyu'); c.eff(false, c);
    __ok('v0.61.10 P3 咒雨(武僧) 逐点触发反震：12 击 × tier1(3) = 36 点反噬', g.hp === 44, 'hp=' + g.hp);
    // 无格挡时不空转、不报错
    g = __base('wuseng'); g.block = 0; c = __card('zhouyu'); c.eff(false, c);
    __ok('v0.61.10 P3 咒雨(武僧) 无格挡时安全返回', g.block === 0 && g.hp === 60);
    __ok('v0.58 B#46 咒雨(武僧) 0 费', cardCost(__card('zhouyu')) === 0 &&
      cardCost(Object.assign({}, __card('zhouyu'), { up: true })) === 0, 'cost=' + cardCost(__card('zhouyu')));
    g = __base('ganshiren');
    __ok('v0.58 B#46 咒雨(赶尸人) 仍 2 费', cardCost(__card('zhouyu')) === 2, 'cost=' + cardCost(__card('zhouyu')));
    g = __base('wuseng');
    __ok('v0.58 B#46 咒雨(武僧) 无伤害预览', previewDamage(__card('zhouyu')) === null);

    // #47 阴兵过境：2/3 只、4/5 伤害；存活时每回合开始 3/4 格挡
    g = __base('wuseng'); c = __card('yinbingguo'); c.eff(false, c);
    var n2 = g.summons.length, yv = g.summons[0].v, yup = g.summons[0].up;
    g = __base('wuseng'); c = Object.assign({}, __card('yinbingguo'), { up: true }); c.eff(true, c);
    __ok('v0.58 B#47 阴兵 2/3 只、4/5 伤害、带升级标记',
      n2 === 2 && g.summons.length === 3 && yv === 4 && g.summons[0].v === 5 && yup === false && g.summons[0].up === true,
      n2 + '/' + g.summons.length + ' v=' + yv + '/' + g.summons[0].v);
    __ok('v0.58 B#47 阴兵存活 → 回合开始 3/4 格挡',
      summonTurnBlock({ type: 'yinbing', v: 4, dur: 3, up: false }) === 3 &&
      summonTurnBlock({ type: 'yinbing', v: 5, dur: 3, up: true }) === 4);

    // #42 咒印：招咒魂 → 本回合下一张攻击牌 100% 吸血，且武僧视为消耗牌
    g = __base('wuseng'); var zy = __card('zhouyin'); zy.eff(false, zy);
    __ok('v0.58 B#42 咒印 咒魂待发', g.zhouhunSteal === 1, 'steal=' + g.zhouhunSteal);
    g = __base('wuseng'); g.hand = [__card('leifu')]; g.hp = 40;
    g.enemies[0].hp = 300; g.enemies[0].maxHp = 300;
    zy.eff(false, zy); doPlayCard(0);
    var dealt = 300 - g.enemies[0].hp;
    __ok('v0.58 B#42 咒印 攻击牌吸血（实际伤害 = 回血量）',
      dealt === 4 && g.hp === 40 + dealt && g.zhouhunSteal === 0,
      'hp=' + g.hp + ' ehp=' + g.enemies[0].hp + ' dealt=' + dealt + ' steal=' + g.zhouhunSteal);
    __ok('v0.58 B#42 咒印 武僧视为消耗牌、赶尸人不', isOneUse(__card('zhouyin')) === true &&
      (function () { __base('ganshiren'); return isOneUse(__card('zhouyin')); })() === false);
  })();

  /* ============ v0.58 武僧卡面预伤害徽章（格挡/诅咒浮动牌恒显实时值） ============ */
  (function () {
    function pv(id, block, curse, up) {
      var g2 = __base('wuseng'); g2.block = block || 0;
      g2.enemies[0].curse = curse || 0; g2.enemies[0].hp = 500; g2.enemies[0].maxHp = 500;
      return previewDamage(Object.assign({}, __card(id), { up: !!up }));
    }
    var p;
    p = pv('leifu', 6);
    __ok('v0.58 B 预伤害 雷符 格挡6 → 4+2=6 且恒显', p.d === 6 && p.dynamic === true, 'd=' + p.d + ' dyn=' + p.dynamic);
    p = pv('huofu', 6);
    __ok('v0.58 B 预伤害 火符 格挡6 → 5+2=7 / 升级 7+3=10',
      p.d === 7 && pv('huofu', 6, 0, true).d === 10, p.d + '/' + pv('huofu', 6, 0, true).d);
    p = pv('jianfu', 6);
    __ok('v0.58 B 预伤害 剑符 格挡6 → 6+3=9', p.d === 9 && p.dynamic === true, 'd=' + p.d);
    p = pv('shixue', 6);
    __ok('v0.58 B 预伤害 嗜血 格挡6 → 4+2=6', p.d === 6, 'd=' + p.d);
    p = pv('baigui', 6);
    __ok('v0.58 B 预伤害 百鬼夜行 格挡6 → 5+3=8', p.d === 8, 'd=' + p.d);
    p = pv('zhenyaoling', 12);
    __ok('v0.58 B 预伤害 镇妖铃 格挡12 → 10+8=18', p.d === 18 && p.dynamic === true, 'd=' + p.d);
    p = pv('zhanyaojian', 0, 3);
    __ok('v0.58 B 预伤害 斩妖剑 带诅咒 8+6=14 且挂诅咒标签', p.d === 14 && p.curse === 3, 'd=' + p.d + ' curse=' + p.curse);
    p = pv('leifu', 6, 3);
    __ok('v0.58 B 预伤害 雷符 不吃诅咒（不挂诅咒标签）', p.curse === 0, 'curse=' + p.curse);
    p = pv('tianlei', 6);
    __ok('v0.58 B 预伤害 天雷正法 无浮动 → 不挂徽章', p.dynamic === false && p.d === p.raw, 'dyn=' + p.dynamic);

    // 关键词悬停：B 列文案里的【】括注必须都有词条
    __ok('v0.58 B 关键词 含【尸气】【吸血】', KEYWORDS.some(function (k) { return k[0] === '尸气'; }) &&
      KEYWORDS.some(function (k) { return k[0] === '吸血'; }));
    var kwsAll = KEYWORDS.map(function (k) { return k[0]; });
    var missing = [];
    ['zhiren','xiaogui','wutong','yinbingguo','zhouyin','zhouyu','huapi','shi_wang'].forEach(function (id) {
      [__card(id).t(false), __card(id).t(true)].forEach(function (t) {
        (t.match(/【([^】]+)】/g) || []).forEach(function (x) {
          var k = x.slice(1, -1); if (kwsAll.indexOf(k) < 0) missing.push(id + ':' + k);
        });
      });
    });
    __ok('v0.58 B 召唤/咒印牌【】括注均有词条', missing.length === 0, missing.join(','));
    __ok('v0.58 B 咒印文案挂【吸血】', __card('zhouyin').t(false).indexOf('【吸血】') >= 0, __card('zhouyin').t(false));
  })();

  /* ============ v0.59 阴差（C 列）全卡重做（《阴差版卡池.md》） ============ */
  (function () {
    function up(id) { return Object.assign({}, __card(id), { up: true }); }
    function gy(hp) { var g = __base('yincha'); g.hp = hp == null ? 60 : hp; return g; }
    function play(id, u, hp) {
      var g = gy(hp); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500;
      var c = u ? up(id) : __card(id);
      g.hand = [c]; g.drawPile = []; g.discard = []; g.exhausted = [];
      doPlayCard(0);
      return { g: g, e: g.enemies[0] };
    }
    var g, c, r;

    /* —— 初始卡池：雷符×3 金刚符×2 火符×1 佛渡×1 聚灵×1 血契×1 守一×1 渡魂归己×1 = 11 张 —— */
    var h = HEROES.filter(function (x) { return x.id === 'yincha'; })[0];
    var got = h.deck.map(function (p) { return p[0] + 'x' + p[1]; }).join(' ');
    var cnt = h.deck.reduce(function (a, p) { return a + p[1]; }, 0);
    __ok('v0.59 阴差初始卡池 11 张且组成正确',
      cnt === 11 && got === 'leifux3 jingangx2 huofux1 fodux1 julingx1 xueqix1 shouyix1 duhunguijix1', got);

    /* —— 48 张卡的阴差费用（含 (U:0) 升级减免）与文档逐条对齐 —— */
    var COST_WANT = {
      leifu: [1, 1], huofu: [1, 1], jianfu: [2, 2], zhanyaojian: [2, 2], tianlei: [3, 3], wanjian: [3, 3],
      tiebushan: [1, 0], shihun: [2, 2], qungui: [1, 1], taomufu: [1, 1], shihunzhou: [1, 1], shixue: [1, 1],
      baigui: [2, 2], zhongkui: [3, 3], jingang: [1, 1], yinshen: [1, 1], jinguang: [2, 2], jinzhong: [2, 2],
      jingji: [1, 1], fodu: [0, 0], tongpi: [2, 2], fanzhen: [1, 1], xiejiashengyuan: [1, 1], juling: [0, 0],
      sheshen: [0, 0], shouyi: [0, 0], yiwu: [0, 0], xueqi: [1, 0], tongling: [1, 0], jingxin: [1, 0],
      ranxue: [0, 0], xisui: [2, 2], duhunguiji: [1, 1], fenfu: [0, 0], xueji: [1, 0], ranhun: [0, 0],
      kaitianyan: [1, 1], yixing: [1, 0], fuling: [2, 2], zhenyaoling: [2, 2], zhiren: [1, 1], zhouyin: [1, 1],
      xiaogui: [1, 1], huapi: [1, 1], wutong: [2, 2], zhouyu: [2, 2], yinbingguo: [3, 3], shi_wang: [0, 0]
    };
    var badCost = [];
    __base('yincha'); // 费用按英雄取值，必须先切到阴差
    Object.keys(COST_WANT).forEach(function (id) {
      var cc = __card(id); if (!cc) { badCost.push(id + ':缺卡'); return; }
      var a = cardCost(cc), b = cardCost(Object.assign({}, cc, { up: true }));
      if (a !== COST_WANT[id][0] || b !== COST_WANT[id][1]) badCost.push(id + ':' + a + '>' + b);
    });
    __ok('v0.59 阴差 48 张卡费用与文档一致（(U:0) 升级减免）', badCost.length === 0 && Object.keys(COST_WANT).length === 48,
      badCost.join(' '));

    /* —— 攻击 1：雷符 5/8 + 每层血怒 +2（上限 +6）+ 击杀得 2 血怒 —— */
    g = gy(); g.xuenu = 3; g.enemies[0].hp = 500; g.enemies[0].maxHp = 500;
    g.hand = [__card('leifu')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.59 C#1 雷符 5+2×3=11 伤并消耗 3 层血怒', g.enemies[0].hp === 489 && g.xuenu === 0,
      'ehp=' + g.enemies[0].hp + ' xuenu=' + g.xuenu);
    g = gy(); g.xuenu = 0; g.enemies[0].hp = 5;
    g.hand = [__card('leifu')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.59 C#1 雷符 击杀 → 获得 2 层血怒', g.enemies[0].hp <= 0 && g.xuenu === 2, 'xuenu=' + g.xuenu);

    /* —— 攻击 2：火符 8/11 + 失去 2 生命（不弃牌） —— */
    g = gy(); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500;
    g.hand = [__card('huofu'), __card('leifu'), __card('leifu')];
    g.drawPile = []; g.discard = []; g.exhausted = [];
    cardPlayWindow = true; doPlayCard(0); cardPlayWindow = false;
    __ok('v0.59 C#2 火符 8 伤 + 失去 2 生命(被动再给 2 血怒)',
      g.enemies[0].hp === 492 && g.hp === 58 && g.xuenu === 2,
      'ehp=' + g.enemies[0].hp + ' hp=' + g.hp + ' xuenu=' + g.xuenu);
    __ok('v0.59 C#2 火符 不弃牌（另 2 张仍在手，弃牌堆只有打出的这张）',
      g.hand.length === 2 && g.discard.length === 1, 'hand=' + g.hand.length + ' discard=' + g.discard.length);
    r = play('huofu', true, 60);
    __ok('v0.59 C#2 火符 升级 11 伤', r.e.hp === 489, 'ehp=' + r.e.hp);

    /* —— 攻击 3：剑符 固定 10 + 本回合每失 1 血 +1/+2 —— */
    g = gy(); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; g.hpLostTurn = 4;
    g.hand = [__card('jianfu')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.59 C#3 剑符 10+4=14 伤', g.enemies[0].hp === 486, 'ehp=' + g.enemies[0].hp);
    g = gy(); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; g.hpLostTurn = 4;
    g.hand = [up('jianfu')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.59 C#3 剑符 升级 10+4×2=18 伤', g.enemies[0].hp === 482, 'ehp=' + g.enemies[0].hp);

    /* —— 攻击 4：斩妖剑 9/14 + 带诅咒额外 4/6 —— */
    g = gy(); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; g.enemies[0].curse = 1;
    g.hand = [__card('zhanyaojian')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.59 C#4 斩妖剑 9+4=13 伤（带诅咒）', g.enemies[0].hp === 487, 'ehp=' + g.enemies[0].hp);
    g = gy(); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; g.enemies[0].curse = 1;
    g.hand = [up('zhanyaojian')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.59 C#4 斩妖剑 升级 14+6=20 伤（带诅咒）', g.enemies[0].hp === 480, 'ehp=' + g.enemies[0].hp);
    g = gy(); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; g.enemies[0].curse = 0;
    g.hand = [__card('zhanyaojian')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.59 C#4 斩妖剑 无诅咒 = 9 伤', g.enemies[0].hp === 491, 'ehp=' + g.enemies[0].hp);

    /* —— 攻击 5：天雷正法 16/21 + 失 5 + 本场每失 1 血 +1/+2（上限 +20） —— */
    g = gy(); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; g.totalHpLost = 0;
    g.hand = [__card('tianlei')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.59 C#5 天雷正法 16+5(自扣)=21 伤且实扣 5 血', g.enemies[0].hp === 479 && g.hp === 55,
      'ehp=' + g.enemies[0].hp + ' hp=' + g.hp);
    g = gy(); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; g.totalHpLost = 40;
    g.hand = [up('tianlei')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.59 C#5 天雷正法 升级 21+上限20=41 伤', g.enemies[0].hp === 459, 'ehp=' + g.enemies[0].hp);

    /* —— 攻击 6：万剑归宗 全体 10/15 + 失 3 + 斩杀回 8/12 与 1 符文 —— */
    g = gy(50); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500;
    g.enemies[1].hp = 4; g.enemies[1].maxHp = 60; g.energy = 9;
    g.hand = [__card('wanjian')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.59 C#6 万剑归宗 全体 10 伤 + 斩杀回 8 血 + 1 符文',
      g.enemies[0].hp === 490 && g.hp === 50 - 3 + 8 && g.energy === 9 - 3 + 1,
      'ehp=' + g.enemies[0].hp + ' hp=' + g.hp + ' energy=' + g.energy);

    /* —— 攻击 8：噬魂术 10/15 + 血怒每层 +2（上限 +20） —— */
    g = gy(); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; g.xuenu = 3;
    g.hand = [__card('shihun')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.59 C#8 噬魂术 10+2×3=16 伤并消耗 3 层血怒', g.enemies[0].hp === 484 && g.xuenu === 0,
      'ehp=' + g.enemies[0].hp + ' xuenu=' + g.xuenu);
    g = gy(); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; g.xuenu = 10;
    g.hand = [up('shihun')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.59 C#8 噬魂术 升级 15+上限20=35 伤（10 层全消耗）', g.enemies[0].hp === 465 && g.xuenu === 0,
      'ehp=' + g.enemies[0].hp + ' xuenu=' + g.xuenu);

    /* —— 攻击 9：群鬼乱舞 失 2 + 本回合每失 2 血召唤增伤 1/2 —— */
    g = gy();
    c = __card('qungui'); c.eff(false, c);
    __ok('v0.59 C#9 群鬼乱舞 档位=1（未升级）', g.bleedSummons === true && g.bleedSummonsBonus === 1,
      'bonus=' + g.bleedSummonsBonus);
    g = gy();
    c = up('qungui'); c.eff(true, c);
    __ok('v0.59 C#9 群鬼乱舞 升级档位=2', g.bleedSummons === true && g.bleedSummonsBonus === 2,
      'bonus=' + g.bleedSummonsBonus);
    g = gy(); g.hpLostTurn = 4; g.bleedSummons = true; g.bleedSummonsBonus = 2;
    g.enemies[0].hp = 500; g.enemies[0].maxHp = 500;
    g.enemies[1].hp = 500; g.enemies[1].maxHp = 500;
    summonAct({ type: 'zhiren', v: 1, dur: 2 }); // 纸人打随机敌人，故按双方合计扣血断言
    __ok('v0.59 C#9 群鬼乱舞 失4血 → 纸人 1+2×2=5 伤',
      g.enemies[0].hp + g.enemies[1].hp === 995,
      'e0=' + g.enemies[0].hp + ' e1=' + g.enemies[1].hp);

    /* —— 攻击 11：蚀魂咒 5/8 + 失去 2 生命（旧版漏扣，本次修复） —— */
    g = gy(); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; g.enemies[0].curse = 0;
    g.hand = [__card('shihunzhou')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.59 C#11 蚀魂咒 5 伤 + 失去 2 生命 + 2 层诅咒',
      g.enemies[0].hp === 495 && g.hp === 58 && g.enemies[0].curse === 2,
      'ehp=' + g.enemies[0].hp + ' hp=' + g.hp + ' curse=' + g.enemies[0].curse);
    r = play('shihunzhou', true, 60);
    __ok('v0.59 C#11 蚀魂咒 升级 8 伤', r.e.hp === 492, 'ehp=' + r.e.hp);

    /* —— 攻击 12：嗜血 4/6 + 本场每失 4/3 点血 +1（上限 +15/20） —— */
    g = gy(); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; g.totalHpLost = 12;
    g.hand = [__card('shixue')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.59 C#12 嗜血 4+floor(12/4)=7 伤', g.enemies[0].hp === 493, 'ehp=' + g.enemies[0].hp);
    g = gy(); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; g.totalHpLost = 12;
    g.hand = [up('shixue')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.59 C#12 嗜血 升级 6+floor(12/3)=10 伤', g.enemies[0].hp === 490, 'ehp=' + g.enemies[0].hp);

    /* —— 攻击 14：钟馗镇魂 16/24 + 失 4 + 生命 <40% 翻倍 —— */
    g = gy(40); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; // 40/80 = 50% → 不翻倍
    g.hand = [__card('zhongkui')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.59 C#14 钟馗镇魂 50% 生命 → 16 伤（不翻倍）', g.enemies[0].hp === 484, 'ehp=' + g.enemies[0].hp);
    g = gy(28); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; // 28-4=24 /80 = 30% → 翻倍
    g.hand = [up('zhongkui')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.59 C#14 钟馗镇魂 升级 <40% → 24×2=48 伤', g.enemies[0].hp === 452, 'ehp=' + g.enemies[0].hp);

    /* —— 功能 28：血契 1/0 费、扣除全部血怒回 2× —— */
    g = gy(40); g.xuenu = 5;
    c = __card('xueqi'); c.eff(false, c);
    __ok('v0.59 C#28 血契 扣 5 层血怒回 10 血', g.hp === 50 && g.xuenu === 0, 'hp=' + g.hp + ' xuenu=' + g.xuenu);
    g = gy(40); g.xuenu = 0;
    c = __card('xueqi'); c.eff(false, c);
    __ok('v0.59 C#28 血契 无血怒 → 不回血', g.hp === 40, 'hp=' + g.hp);
    g = gy();
    __ok('v0.59 C#28 血契 升级 0 符文', effectiveCost(__card('xueqi')) === 1 && effectiveCost(up('xueqi')) === 0,
      effectiveCost(__card('xueqi')) + '→' + effectiveCost(up('xueqi')));

    /* —— 功能 31/32/36/39：燃血术 / 洗髓经 / 燃魂 / 附灵术 —— */
    g = gy(); g.energy = 9; c = up('ranxue'); c.eff(true, c);
    __ok('v0.59 C#31 燃血术 升级 失6血 +2 符文', g.hp === 54 && g.energy === 11, 'hp=' + g.hp + ' energy=' + g.energy);
    __ok('v0.59 C#32 洗髓经 文案不再产血怒',
      __card('xisui').t(false).indexOf('血怒') < 0 && __card('xisui').t(false).indexOf('1 点符文') >= 0,
      __card('xisui').t(false));
    __ok('v0.59 C#36 燃魂 失 6 血（升级不降）、回复 2/4',
      __card('ranhun').t(false).indexOf('失去 6 点生命') >= 0 && __card('ranhun').t(false).indexOf('恢复 2 点生命') >= 0 &&
      __card('ranhun').t(true).indexOf('恢复 4 点生命') >= 0, __card('ranhun').t(true));
    g = gy(40); g.summons = [{ type: 'zhiren', v: 1, dur: 2 }, { type: 'zhiren', v: 1, dur: 2 }];
    g.enemies[0].hp = 500; g.enemies[0].maxHp = 500;
    c = __card('fuling'); c.eff(false, c);
    __ok('v0.59 C#39 附灵术 触发 2 个 → 回 4(本体) + 2×2(纸人攻击各自回血) = 8',
      g.hp === 48, 'hp=' + g.hp);
    g = gy(40); g.summons = [{ type: 'zhiren', v: 1, dur: 2 }, { type: 'zhiren', v: 1, dur: 2 }];
    g.enemies[0].hp = 500; g.enemies[0].maxHp = 500;
    c = up('fuling'); c.eff(true, c);
    __ok('v0.59 C#39 附灵术 升级触发 2 个 → 回 8(本体) + 4(纸人) = 12', g.hp === 52, 'hp=' + g.hp);

    /* —— 召唤 41：纸人 失 2 + 1/2 伤 + 攻击回 2/3；血怒 ≥4 消耗 4 强化为 4/5、回 3/4 —— */
    g = gy(); c = __card('zhiren'); c.eff(false, c);
    __ok('v0.59 C#41 纸人 失 2 血 + {v:1,healV:2}',
      g.hp === 58 && g.summons[0].v === 1 && g.summons[0].healV === 2 && g.summons[0].type === 'zhiren',
      JSON.stringify(g.summons[0]) + ' hp=' + g.hp);
    g = gy(); g.xuenu = 4; c = __card('zhiren'); c.eff(false, c);
    __ok('v0.59 C#41 纸人 血怒4 → 消耗4层、{v:4,healV:3}',
      g.xuenu === 0 && g.summons[0].v === 4 && g.summons[0].healV === 3, JSON.stringify(g.summons[0]));
    g = gy(40); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500;
    g.enemies[1].hp = 500; g.enemies[1].maxHp = 500;
    g.summons = [{ type: 'zhiren', v: 2, healV: 3, dur: 2, up: false }];
    summonAct(g.summons[0]);
    __ok('v0.59 C#41 纸人攻击 = 造成 v 伤 + 按 healV 回血（不再施诅咒）',
      g.hp === 43 && g.enemies[0].hp + g.enemies[1].hp === 998 &&
      (g.enemies[0].curse || 0) === 0 && (g.enemies[1].curse || 0) === 0,
      'hp=' + g.hp + ' e0=' + g.enemies[0].hp + ' e1=' + g.enemies[1].hp + ' curse=' + g.enemies[0].curse);

    /* —— 召唤 43：小鬼 失 2 + 1/2 伤 + 每回合 +1 血怒 + 死亡回 2/4 —— */
    g = gy(); c = __card('xiaogui'); c.eff(false, c);
    __ok('v0.59 C#43 小鬼 失 2 血 + v=1', g.hp === 58 && g.summons[0].v === 1, JSON.stringify(g.summons[0]));
    g = gy(40); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; g.xuenu = 0;
    summonAct({ type: 'xiaogui', v: 1, dur: 2, up: false });
    __ok('v0.59 C#43 小鬼 每回合产出 1 层血怒', g.xuenu === 1, 'xuenu=' + g.xuenu);
    g = gy(40); onSummonDeath({ type: 'xiaogui', v: 1, dur: 0, up: false });
    __ok('v0.59 C#43 小鬼死亡（未升级）回 2 血', g.hp === 42, 'hp=' + g.hp);
    g = gy(40); onSummonDeath({ type: 'xiaogui', v: 1, dur: 0, up: true });
    __ok('v0.59 C#43 小鬼死亡（升级）回 4 血', g.hp === 44, 'hp=' + g.hp);

    /* —— 召唤 45：五通神 立即回 5（含首次触发）→ 见 v0.59 五通神断言 —— */

    /* —— 召唤 47：阴兵过境 2/3 只、每只攻击回 2 血（固定，不随升级） —— */
    g = gy(); c = __card('yinbingguo'); c.eff(false, c);
    __ok('v0.59 C#47 阴兵 基础 2 只、healV=2',
      g.summons.length === 2 && g.summons.every(function (s) { return s.healV === 2; }),
      JSON.stringify(g.summons.map(function (s) { return s.v + '/' + s.healV; })));
    g = gy(); c = up('yinbingguo'); c.eff(true, c);
    __ok('v0.59 C#47 阴兵 升级 3 只 v=5、healV 仍 2',
      g.summons.length === 3 && g.summons.every(function (s) { return s.v === 5 && s.healV === 2; }),
      JSON.stringify(g.summons.map(function (s) { return s.v + '/' + s.healV; })));

    /* —— 召唤面板文案按英雄分流 —— */
    g = gy();
    __ok('v0.59 召唤面板 阴差纸人显示回血、阴兵显示回 2 血',
      summonHTML({ type: 'zhiren', v: 2, healV: 3, dur: 2 }).indexOf('恢复 3 点生命') >= 0 &&
      summonHTML({ type: 'yinbing', v: 5, healV: 2, dur: 3 }).indexOf('恢复 2 点生命') >= 0,
      summonHTML({ type: 'zhiren', v: 2, healV: 3, dur: 2 }));

    /* —— C 列预伤害徽章：随血怒 / 失血 / 召唤数浮动的牌恒显实时值 —— */
    function pv(id, o) {
      o = o || {};
      var g2 = __base('yincha');
      g2.xuenu = o.rage || 0; g2.hpLostTurn = o.turn || 0; g2.totalHpLost = o.total || 0;
      g2.enemies[0].curse = o.curse || 0;
      g2.enemies[0].hp = 500; g2.enemies[0].maxHp = 500;
      if (o.kind) { g2.enemies[0] = makeEnemy(ENEMIES[o.kind], o.kind); g2.enemies[0].hp = 500; g2.enemies[0].maxHp = 500; g2.enemies[0].curse = o.curse || 0; }
      return previewDamage(Object.assign({}, __card(id), { up: !!o.up }));
    }
    var p;
    p = pv('leifu', { rage: 3 });
    __ok('v0.59 C 预伤害 雷符 血怒3 → 5+6=11 且恒显', p.d === 11 && p.dynamic === true, 'd=' + p.d + ' dyn=' + p.dynamic);
    p = pv('jianfu', { turn: 3 });
    __ok('v0.59 C 预伤害 剑符 本回合失3血 → 13 且恒显', p.d === 13 && p.dynamic === true, 'd=' + p.d);
    p = pv('tianlei', { total: 10 });
    __ok('v0.59 C 预伤害 天雷正法 本场失10血 → 16+10=26', p.d === 26, 'd=' + p.d);
    p = pv('zhanyaojian', { curse: 1 });
    __ok('v0.59 C 预伤害 斩妖剑 带诅咒 → 9+4=13', p.d === 13, 'd=' + p.d);
    p = pv('shihun', { rage: 3 });
    __ok('v0.59 C 预伤害 噬魂术 血怒3 → 10+6=16', p.d === 16, 'd=' + p.d);
    p = pv('shixue', { total: 12 });
    __ok('v0.59 C 预伤害 嗜血 本场失12血 → 4+3=7', p.d === 7, 'd=' + p.d);
    g = __base('yincha');
    g.summons = [{ type: 'zhiren', v: 1, dur: 2 }, { type: 'xiaogui', v: 1, dur: 2 }];
    g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; g.enemies[0].curse = 0;
    p = previewDamage(__card('baigui'));
    __ok('v0.59 C 预伤害 百鬼夜行 2 召唤 → 5+2×2=9', p.d === 9 && p.dynamic === true, 'd=' + p.d);
    p = pv('zhenyaoling', { rage: 3 });
    __ok('v0.59 C 预伤害 镇妖铃 血怒3 → 10+6=16', p.d === 16, 'd=' + p.d);
    p = pv('taomufu', { kind: 'youhun' });
    __ok('v0.59 C 预伤害 桃木符 对鬼怪 → 4+4=8 且恒显', p.d === 8 && p.dynamic === true, 'd=' + p.d);
    p = pv('zhongkui', {});
    pv('zhongkui', {});
    g = __base('yincha'); g.hp = 28; g.enemies[0].hp = 500; g.enemies[0].maxHp = 500;
    p = previewDamage(__card('zhongkui'));
    __ok('v0.59 C 预伤害 钟馗镇魂 生命<40% → 16×2=32', p.d === 32, 'd=' + p.d);
    pv('zhongkui', {});
    g = __base('yincha'); g.hp = 60; g.enemies[0].hp = 500; g.enemies[0].maxHp = 500;
    p = previewDamage(__card('zhongkui'));
    __ok('v0.59 C 预伤害 钟馗镇魂 生命 75% → 16（不翻倍）', p.d === 16, 'd=' + p.d);
    g = __base('yincha'); g.xuenu = 4; g.enemies[0].hp = 500; g.enemies[0].maxHp = 500;
    p = previewDamage(__card('zhiren'));
    __ok('v0.59 C 预伤害 纸人 血怒4 → 强化 4 伤', p.d === 4, 'd=' + p.d);
    p = pv('leifu', { rage: 3, curse: 3 });
    __ok('v0.59 C 预伤害 雷符 不吃诅咒 → 不挂诅咒标签', p.curse === 0, 'curse=' + p.curse);
    p = pv('zhanyaojian', { curse: 3 });
    __ok('v0.59 C 预伤害 斩妖剑 吃诅咒 → 挂诅咒标签', p.curse === 3, 'curse=' + p.curse);
    g = __base('yincha'); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500;
    __ok('v0.59 C 预伤害 群鬼乱舞/咒雨 无直伤 → 不挂徽章',
      previewDamage(__card('qungui')) === null && previewDamage(__card('zhouyu')) === null,
      'qungui=' + JSON.stringify(previewDamage(__card('qungui'))) + ' zhouyu=' + JSON.stringify(previewDamage(__card('zhouyu'))));

    /* —— C 列卡面【】括注都有词条（鼠标悬停可显示） —— */
    var kwsAll = KEYWORDS.map(function (k) { return k[0]; });
    var missing = [];
    CARDS.forEach(function (cc) {
      [cc.t(false), cc.t(true)].forEach(function (t) {
        (t.match(/【([^】]+)】/g) || []).forEach(function (x) {
          var k = x.slice(1, -1); if (kwsAll.indexOf(k) < 0) missing.push(cc.id + ':' + k);
        });
      });
    });
    __ok('v0.59 C 全卡【】括注均有 KEYWORDS 词条', missing.length === 0, missing.join(','));
  })();

  /* ============ v0.60 天师（D 列）全卡重做（《天师版卡池.md》） ============ */
  (function () {
    function dup(id) { return Object.assign({}, __card(id), { up: true }); }
    // 单敌 500 血的稳定靶子（多人场景另设）
    function dt(hp) {
      var g = __base('tianshi'); g.hp = hp == null ? 60 : hp;
      g.enemies = [g.enemies[0]]; g.target = 0;
      g.enemies[0].hp = 500; g.enemies[0].maxHp = 500;
      return g;
    }
    function dplay(id, u, hp) {
      var g = dt(hp);
      var c = u ? dup(id) : __card(id);
      g.hand = [c]; g.drawPile = []; g.discard = []; g.exhausted = [];
      doPlayCard(0);
      return g;
    }
    var g, c, e, s;

    /* —— 初始卡池（v0.60.02 修正：此前把两人的名单发反了）
          天师 D   ：雷符×3 金刚符×1 佛渡×1 聚灵×1 渡魂归己×1 咒印×1 画皮×1 守一×1 = 10 张
          赶尸人 A ：雷符×2 金刚符×2 佛渡×1 舍身×1 血契×1 纸人×1 尸王×1 守一×1 小鬼×1 = 9 张 —— */
    function deckOf(id) {
      var h = HEROES.filter(function (x) { return x.id === id; })[0];
      return { s: h.deck.map(function (p) { return p[0] + 'x' + p[1]; }).join(' '),
               n: h.deck.reduce(function (a, p) { return a + p[1]; }, 0) };
    }
    var dt_ = deckOf('tianshi'), ga_ = deckOf('ganshiren');
    __ok('v0.60.02 天师初始卡池 10 张且组成正确', dt_.n === 10 &&
      dt_.s === 'leifux3 jingangx1 fodux1 julingx1 duhunguijix1 zhouyinx1 huapix1 shouyix1',
      dt_.n + ' 张 | ' + dt_.s);
    __ok('v0.60.02 赶尸人初始卡池 11 张且组成正确', ga_.n === 11 &&
      ga_.s === 'leifux2 jingangx2 fodux1 sheshenx1 xueqix1 zhirenx1 shi_wangx1 shouyix1 xiaoguix1',
      ga_.n + ' 张 | ' + ga_.s);
    __ok('v0.60.02 尸王只在赶尸人起始牌组（天师无）',
      ga_.s.indexOf('shi_wang') >= 0 && dt_.s.indexOf('shi_wang') < 0, ga_.s);
    __ok('v0.60.02 咒印/画皮/聚灵/渡魂归己归天师，纸人/小鬼/舍身归赶尸人',
      dt_.s.indexOf('zhouyin') >= 0 && dt_.s.indexOf('huapi') >= 0 && dt_.s.indexOf('juling') >= 0 &&
      dt_.s.indexOf('duhunguiji') >= 0 && ga_.s.indexOf('zhiren') >= 0 &&
      ga_.s.indexOf('xiaogui') >= 0 && ga_.s.indexOf('sheshen') >= 0, dt_.s + ' || ' + ga_.s);

    /* —— 端到端：拿 HEROES 里真实的赶尸人牌组开局，尸王必须在手（激活 2275 的取牌逻辑） —— */
    var gA = __base('ganshiren');
    gA.deck = HEROES.filter(function (x) { return x.id === 'ganshiren'; })[0]
      .deck.reduce(function (a, p) { for (var i = 0; i < p[1]; i++) a.push(cardById(p[0])); return a; }, []);
    try {
      startBattle(['youhun']);
      __ok('v0.60.02 赶尸人真实牌组开局：尸王必在手', gA.hand.some(function (c) { return c.id === 'shi_wang'; }),
        'hand=' + gA.hand.map(function (c) { return c.id; }).join(','));
    } catch (err) { __ok('v0.60.02 赶尸人真实牌组开局：尸王必在手', false, err.message); }

    /* —— 【诅咒】每回合末掉 2 层 —— */
    g = __base('tianshi'); g.hp = 200; g.enemies[0].hp = 500; g.enemies[0].maxHp = 500;
    g.enemies[1].hp = 500; g.enemies[1].maxHp = 500;
    g.enemies[0].curse = 5; g.enemies[1].curse = 1;
    finishEndTurn();
    __ok('v0.60 诅咒每回合末 -2（5→3，1→0）',
      g.enemies[0].curse === 3 && g.enemies[1].curse === 0,
      'c0=' + g.enemies[0].curse + ' c1=' + g.enemies[1].curse);
    __ok('v0.60 关键词【诅咒】写明每回合末 -2',
      KEYWORDS.filter(function (k) { return k[0] === '诅咒'; })[0][1].indexOf('每回合末 -2') >= 0,
      KEYWORDS.filter(function (k) { return k[0] === '诅咒'; })[0][1]);

    /* —— 48 张卡的天师费用（含 (U:0) 升级减免）与文档逐条对齐 —— */
    var D_COST = {
      leifu: [1, 1], huofu: [1, 1], jianfu: [2, 2], zhanyaojian: [2, 2], tianlei: [3, 3], wanjian: [3, 3],
      tiebushan: [1, 1], shihun: [2, 2], qungui: [1, 1], taomufu: [1, 1], shihunzhou: [1, 1], shixue: [1, 1],
      baigui: [2, 2], zhongkui: [3, 3], jingang: [1, 1], yinshen: [1, 1], jinguang: [2, 2], jinzhong: [2, 2],
      jingji: [1, 1], fodu: [0, 0], tongpi: [2, 2], fanzhen: [1, 1], xiejiashengyuan: [1, 1], juling: [0, 0],
      sheshen: [0, 0], shouyi: [0, 0], yiwu: [0, 0], xueqi: [1, 1], tongling: [1, 0], jingxin: [1, 0],
      ranxue: [0, 0], xisui: [2, 2], duhunguiji: [1, 1], fenfu: [0, 0], xueji: [1, 0], ranhun: [0, 0],
      kaitianyan: [1, 1], yixing: [1, 0], fuling: [2, 1], zhenyaoling: [2, 2], zhiren: [1, 1], zhouyin: [1, 1],
      xiaogui: [1, 1], huapi: [1, 1], wutong: [2, 2], zhouyu: [2, 2], yinbingguo: [3, 3], shi_wang: [0, 0]
    };
    var badD = [];
    __base('tianshi');
    Object.keys(D_COST).forEach(function (id) {
      var cc = __card(id); if (!cc) { badD.push(id + ':缺卡'); return; }
      var a = cardCost(cc), b = cardCost(Object.assign({}, cc, { up: true }));
      if (a !== D_COST[id][0] || b !== D_COST[id][1]) badD.push(id + ':' + a + '>' + b);
    });
    __ok('v0.60 天师 48 张卡费用与文档一致（(U:0) 升级减免）',
      badD.length === 0 && Object.keys(D_COST).length === 48, badD.join(' '));

    /* —— 攻击 1：雷符 6/9，目标带诅咒则消耗 1 层 +3 —— */
    g = dt(); g.enemies[0].curse = 2;
    g.hand = [__card('leifu')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#1 雷符 6+3=9 伤且消耗 1 层诅咒',
      g.enemies[0].hp === 491 && g.enemies[0].curse === 1,
      'ehp=' + g.enemies[0].hp + ' curse=' + g.enemies[0].curse);
    g = dt(); g.enemies[0].curse = 0;
    g.hand = [__card('leifu')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#1 雷符 无诅咒 → 6 伤', g.enemies[0].hp === 494, 'ehp=' + g.enemies[0].hp);

    /* —— 攻击 2：火符 5/8 + 1 层诅咒 + 弃 1 张 —— */
    g = dt(); g.hand = [__card('huofu'), __card('leifu')];
    g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#2 火符 5 伤 + 1 层诅咒 + 弃 1 张（2 张→打出 1+弃 1=0）',
      g.enemies[0].hp === 495 && g.enemies[0].curse === 1 && g.hand.length === 0,
      'ehp=' + g.enemies[0].hp + ' curse=' + g.enemies[0].curse + ' hand=' + g.hand.length);
    g = dt(); g.hand = [dup('huofu'), __card('leifu')];
    g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#2u 火符升级 8 伤', g.enemies[0].hp === 492, 'ehp=' + g.enemies[0].hp);

    /* —— 攻击 3：剑符 9/14，诅咒≥3 层则消耗 3 层并翻倍 —— */
    g = dt(); g.enemies[0].curse = 3;
    g.hand = [__card('jianfu')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#3 剑符 9×2=18 伤，诅咒 3→0',
      g.enemies[0].hp === 482 && g.enemies[0].curse === 0,
      'ehp=' + g.enemies[0].hp + ' curse=' + g.enemies[0].curse);
    g = dt(); g.enemies[0].curse = 2;
    g.hand = [__card('jianfu')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#3 剑符 诅咒 2 层 → 9 伤不翻倍', g.enemies[0].hp === 491 && g.enemies[0].curse === 2, 'ehp=' + g.enemies[0].hp);

    /* —— 攻击 5：天雷正法 20/30，每 2 层诅咒 -1 费、结算后失去减免×2 —— */
    g = dt(); g.enemies[0].curse = 5;
    g.hand = [__card('tianlei')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#5 天雷正法 20 伤，诅咒 5→1（减免 2 层×2）',
      g.enemies[0].hp === 480 && g.enemies[0].curse === 1,
      'ehp=' + g.enemies[0].hp + ' curse=' + g.enemies[0].curse);
    g = dt(); g.enemies[0].curse = 0;
    g.hand = [dup('tianlei')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#5u 天雷正法升级 30 伤', g.enemies[0].hp === 470, 'ehp=' + g.enemies[0].hp);

    /* —— 攻击 6：万剑归宗 全体 14/16 + 施加 1/2 层诅咒 + 斩杀回 1 费 —— */
    g = __base('tianshi'); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500;
    g.enemies[1].hp = 500; g.enemies[1].maxHp = 500;
    g.hand = [__card('wanjian')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#6 万剑归宗 全体 14 伤 + 每人 1 层诅咒',
      g.enemies[0].hp === 486 && g.enemies[1].hp === 486 && __sumCurse() === 2,
      'e0=' + g.enemies[0].hp + ' e1=' + g.enemies[1].hp + ' curse=' + __sumCurse());
    g = __base('tianshi'); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500;
    g.enemies[1].hp = 500; g.enemies[1].maxHp = 500;
    g.hand = [dup('wanjian')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#6u 万剑归宗升级 全体 16 伤 + 每人 2 层诅咒',
      g.enemies[0].hp === 484 && __sumCurse() === 4, 'e0=' + g.enemies[0].hp + ' curse=' + __sumCurse());

    /* —— 攻击 7：铁布衫 = 当前格挡 + 每层诅咒 +1/+2，并消耗全部诅咒 —— */
    g = dt(); g.block = 5; g.enemies[0].curse = 2;
    g.hand = [__card('tiebushan')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#7 铁布衫 5格挡+2层=7 伤且清空诅咒',
      g.enemies[0].hp === 493 && g.enemies[0].curse === 0,
      'ehp=' + g.enemies[0].hp + ' curse=' + g.enemies[0].curse);
    g = dt(); g.block = 5; g.enemies[0].curse = 2;
    g.hand = [dup('tiebushan')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#7u 铁布衫升级 5+2×2=9 伤', g.enemies[0].hp === 491, 'ehp=' + g.enemies[0].hp);

    /* —— 攻击 9：群鬼乱舞 5/6 + 每层诅咒 +1（上限 +4/+6） —— */
    g = dt(); g.enemies[0].curse = 3;
    g.hand = [__card('qungui')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#9 群鬼乱舞 5+3=8 伤（不消耗诅咒）',
      g.enemies[0].hp === 492 && g.enemies[0].curse === 3,
      'ehp=' + g.enemies[0].hp + ' curse=' + g.enemies[0].curse);
    g = dt(); g.enemies[0].curse = 6;
    g.hand = [dup('qungui')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#9u 群鬼乱舞 6+min(6,6)=12 伤（上限 +6）', g.enemies[0].hp === 488, 'ehp=' + g.enemies[0].hp);

    /* —— 攻击 11：蚀魂咒 3/6 + 2 层诅咒 —— */
    g = dt(); g.hand = [__card('shihunzhou')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#11 蚀魂咒 4 伤 + 2 层诅咒（v0.61.10 P5：3→4）',
      g.enemies[0].hp === 496 && g.enemies[0].curse === 2,
      'ehp=' + g.enemies[0].hp + ' curse=' + g.enemies[0].curse);

    /* —— 攻击 12：嗜血 6/8 吸血 50%，目标诅咒≥3 层则消耗 3 层改 100% —— */
    g = dt(40); g.enemies[0].curse = 3;
    g.hand = [__card('shixue')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#12 嗜血 诅咒3层 → 消耗3层、6伤回6血',
      g.enemies[0].hp === 494 && g.hp === 46 && g.enemies[0].curse === 0,
      'ehp=' + g.enemies[0].hp + ' hp=' + g.hp + ' curse=' + g.enemies[0].curse);
    g = dt(40); g.enemies[0].curse = 2;
    g.hand = [__card('shixue')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#12 嗜血 诅咒2层 → 保留诅咒、6伤回3血',
      g.hp === 43 && g.enemies[0].curse === 2, 'hp=' + g.hp + ' curse=' + g.enemies[0].curse);

    /* —— 攻击 13：百鬼夜行 全体 7 + 每层 +1/+2，并消耗各自全部诅咒 —— */
    g = __base('tianshi'); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500;
    g.enemies[1].hp = 500; g.enemies[1].maxHp = 500;
    g.enemies[0].curse = 3; g.enemies[1].curse = 0;
    g.hand = [__card('baigui')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#13 百鬼夜行 7+3=10 / 7 伤且清空诅咒',
      g.enemies[0].hp === 490 && g.enemies[1].hp === 493 && __sumCurse() === 0,
      'e0=' + g.enemies[0].hp + ' e1=' + g.enemies[1].hp + ' curse=' + __sumCurse());

    /* —— 攻击 14：钟馗镇魂 15/20 + 引爆全部诅咒（每层 5/6）+ 消耗牌 —— */
    g = dt(); g.enemies[0].curse = 2;
    g.hand = [__card('zhongkui')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#14 钟馗镇魂 18+2×5=28 伤且清空诅咒（v0.61.10 P5：15→18）',
      g.enemies[0].hp === 472 && g.enemies[0].curse === 0 && g.enemies[0].seal === true,
      'ehp=' + g.enemies[0].hp + ' curse=' + g.enemies[0].curse + ' seal=' + g.enemies[0].seal);

    /* —— 防御 15~22 —— */
    g = __base('tianshi'); CURSE_THIS_TURN = 3;
    c = __card('jingang'); c.eff(false, c);
    __ok('v0.60 D#15 金刚符 4+1×3=7 格挡', g.block === 7, 'block=' + g.block);
    g = __base('tianshi'); CURSE_THIS_TURN = 3;
    c = dup('jingang'); c.eff(true, c);
    __ok('v0.60 D#15u 金刚符升级 6+2×3=12 格挡', g.block === 12, 'block=' + g.block);
    g = __base('tianshi'); CURSE_THIS_TURN = 3;
    c = __card('jinguang'); c.eff(false, c);
    __ok('v0.60 D#17 金光罩 12+3=15 格挡', g.block === 15, 'block=' + g.block);
    g = __base('tianshi'); g.drawPile = [__card('huofu')]; g.hand = []; g.discard = [];
    c = __card('yinshen'); c.eff(false, c);
    __ok('v0.60 D#16 隐身符 抽到诅咒牌 3+3=6 格挡', g.block === 6, 'block=' + g.block);
    g = __base('tianshi'); g.drawPile = [__card('huofu')]; g.hand = []; g.discard = [];
    c = dup('yinshen'); c.eff(true, c);
    __ok('v0.60 D#16u 隐身符升级 6+4=10 格挡', g.block === 10, 'block=' + g.block);
    g = __base('tianshi'); c = __card('tongpi'); c.eff(false, c);
    __ok('v0.60 D#21 铜皮铁骨 8 格挡 + 受击施 1 层诅咒', g.block === 8 && g.hitCurse === 1,
      'block=' + g.block + ' hitCurse=' + g.hitCurse);
    g = __base('tianshi'); c = dup('tongpi'); c.eff(true, c);
    __ok('v0.60 D#21u 铜皮铁骨升级 12 格挡', g.block === 12, 'block=' + g.block);
    g = __base('tianshi'); c = __card('fanzhen'); c.eff(false, c);
    __ok('v0.60 D#22 反震 反击 3 伤 + 1 层诅咒（不给格挡）',
      g.thorns === 3 && g.hitCurse === 1 && g.hitBlock === 0 && g.block === 0,
      'thorns=' + g.thorns + ' hitCurse=' + g.hitCurse + ' hitBlock=' + g.hitBlock);
    g = __base('tianshi'); c = dup('fanzhen'); c.eff(true, c);
    __ok('v0.60 D#22u 反震升级 仍反击 3 伤、诅咒 2 层', g.thorns === 3 && g.hitCurse === 2,
      'thorns=' + g.thorns + ' hitCurse=' + g.hitCurse);

    /* —— 功能 28：血契 天师 1/2（赶尸人仍是 2/3） —— */
    g = __base('tianshi'); c = __card('xueqi'); c.eff(false, c);
    __ok('v0.60 D#28 血契(天师) 每失 1 血 +1 格挡', g.bloodPact === 1, 'pact=' + g.bloodPact);
    g = __base('tianshi'); c = dup('xueqi'); c.eff(true, c);
    __ok('v0.60 D#28u 血契(天师) 升级每失 1 血 +2 格挡', g.bloodPact === 2, 'pact=' + g.bloodPact);
    g = __base('ganshiren'); c = __card('xueqi'); c.eff(false, c);
    __ok('v0.60 A#28 血契(赶尸人) 仍为每失 1 血 +2 格挡', g.bloodPact === 2, 'pact=' + g.bloodPact);

    /* —— 功能 40：镇妖铃 10/14 + 带诅咒镇魂 2 回合 —— */
    g = dt(); g.enemies[0].curse = 2;
    g.hand = [dup('zhenyaoling')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#40 镇妖铃升级 14 伤 + 镇魂 2 回合',
      g.enemies[0].hp === 486 && g.enemies[0].seal === true && g.enemies[0].sealTurn === 2,
      'ehp=' + g.enemies[0].hp + ' seal=' + g.enemies[0].seal + ' sealTurn=' + g.enemies[0].sealTurn);

    /* —— 功能 46：咒雨 固定 1 层（升级不加层）；费用下限 1→升级 0 —— */
    g = __base('tianshi'); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500;
    g.enemies[1].hp = 500; g.enemies[1].maxHp = 500;
    g.hand = [__card('zhouyu')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#46 咒雨 未升级也只施加 1 层/敌', __sumCurse() === 2, 'curse=' + __sumCurse());
    g = __base('tianshi'); g.enemies[0].curse = 6; g.enemies[1].curse = 6;
    __ok('v0.60 D#46 咒雨 未升级费用下限 1', effectiveCost(__card('zhouyu')) === 1, 'cost=' + effectiveCost(__card('zhouyu')));
    __ok('v0.60 D#46u 咒雨 升级费用下限 0', effectiveCost(dup('zhouyu')) === 0, 'cost=' + effectiveCost(dup('zhouyu')));

    /* —— 召唤 41：纸人 基础 2/3；目标带诅咒再 +2/+3 —— */
    g = dt(); g.hand = [__card('zhiren')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#41 纸人 基础每回合 2 伤', g.summons[0] && g.summons[0].v === 2,
      'v=' + (g.summons[0] && g.summons[0].v));
    g = dt(); g.enemies[0].curse = 4; g.summons = [{ type: 'zhiren', v: 2, dur: 2, up: false }];
    summonAct(g.summons[0]);
    __ok('v0.60 D#41 纸人 目标带诅咒 2+2=4 伤（不分层数）', g.enemies[0].hp === 496, 'ehp=' + g.enemies[0].hp);
    g = dt(); g.enemies[0].curse = 4; g.summons = [{ type: 'zhiren', v: 3, dur: 2, up: true }];
    summonAct(g.summons[0]);
    __ok('v0.60 D#41u 纸人升级 3+3=6 伤', g.enemies[0].hp === 494, 'ehp=' + g.enemies[0].hp);

    /* —— 召唤 45：五通神 立即 4 格挡 + 1 诅咒 —— */
    g = __base('tianshi'); G.block = 0;
    g.hand = [dup('wutong')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#45 五通神 立即 4 格挡 + 1 诅咒、升级剩 3 回合',
      g.block === 4 && __sumCurse() === 1 && g.summons[0].dur === 2,
      'block=' + g.block + ' curse=' + __sumCurse() + ' dur=' + g.summons[0].dur);

    /* —— 召唤 43：小鬼 3/4 —— */
    g = dt(); g.hand = [__card('xiaogui')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#43 小鬼 每回合 3 伤', g.summons[0] && g.summons[0].v === 3, 'v=' + (g.summons[0] && g.summons[0].v));

    /* —— 卡面预伤害（诅咒/格挡浮动牌恒定显示） —— */
    g = dt(); g.enemies[0].curse = 3;
    __ok('v0.60 D 预伤害 雷符 6+3=9 且常显', previewDamage(__card('leifu')).d === 9 && previewDamage(__card('leifu')).dynamic === true,
      'd=' + previewDamage(__card('leifu')).d);
    __ok('v0.60 D 预伤害 群鬼乱舞 5+3=8', previewDamage(__card('qungui')).d === 8, 'd=' + previewDamage(__card('qungui')).d);
    __ok('v0.60 D 预伤害 百鬼夜行 7+3=10', previewDamage(__card('baigui')).d === 10, 'd=' + previewDamage(__card('baigui')).d);
    __ok('v0.60 D 预伤害 钟馗镇魂 15+3×5=30', previewDamage(__card('zhongkui')).d === 30, 'd=' + previewDamage(__card('zhongkui')).d);
    __ok('v0.60 D 预伤害 斩妖剑 8+2×5=18', previewDamage(__card('zhanyaojian')).d === 18, 'd=' + previewDamage(__card('zhanyaojian')).d);
    __ok('v0.60 D 预伤害 噬魂术 3×5=15', previewDamage(__card('shihun')).d === 15, 'd=' + previewDamage(__card('shihun')).d);
    g.block = 4;
    __ok('v0.60 D 预伤害 铁布衫 4+3=7', previewDamage(__card('tiebushan')).d === 7, 'd=' + previewDamage(__card('tiebushan')).d);
    __ok('v0.60 D 预伤害 纸人 2+2(带诅咒)=4', previewDamage(__card('zhiren')).d === 4, 'd=' + previewDamage(__card('zhiren')).d);
    __ok('v0.60 D 预伤害 咒雨 无直伤 → 不挂徽章', previewDamage(__card('zhouyu')) === null,
      JSON.stringify(previewDamage(__card('zhouyu'))));
    __ok('v0.60 D 预伤害 剑符 诅咒≥3 → 18 且常显', previewDamage(__card('jianfu')).d === 18 && previewDamage(__card('jianfu')).dynamic === true,
      'd=' + previewDamage(__card('jianfu')).d);
  })();

  /* ============ v0.60 战斗区下移（后排错落净空，别顶到顶部栏） ============ */
  (function () {
    // 单敌：无后排上抬 → 不预留净空
    var g = __base('tianshi'); g.enemies = [g.enemies[0]];
    __ok('v0.60 战斗区净空 单敌=0（不浪费纵向空间）', battleHeadroom() === 0, 'hr=' + battleHeadroom());

    // 双敌：idx1 抬 42
    g = __base('tianshi');
    __ok('v0.60 战斗区净空 双敌=42', battleHeadroom() === 42, 'hr=' + battleHeadroom());

    // 四敌：idx0..3 → 0/42/20/60 → 取最大 60
    g = __base('tianshi');
    var b0 = g.enemies[0], b1 = g.enemies[1];
    g.enemies = [Object.assign({}, b0, { uid: 901 }), Object.assign({}, b1, { uid: 902 }),
                 Object.assign({}, b0, { uid: 903 }), Object.assign({}, b1, { uid: 904 })];
    __ok('v0.60 战斗区净空 四敌=60（RISE_LIFT 最大振幅）', battleHeadroom() === 60, 'hr=' + battleHeadroom());

    // 死敌不占净空：idx1/idx3 阵亡 → 只剩 idx0(0)/idx2(20) → 20
    g.enemies[1].hp = 0; g.enemies[3].hp = 0;
    __ok('v0.60 战斗区净空 阵亡敌人不计入（只剩 0/20 → 20）', battleHeadroom() === 20, 'hr=' + battleHeadroom());

    // 净空恒 ≥ 该场面实际最大上抬（这就是「不遮挡顶部栏」的保证式）
    g = __base('tianshi');
    var worst = 0, i;
    for (i = 0; i < g.enemies.length; i++) worst = Math.max(worst, RISE_LIFT[i % RISE_LIFT.length]);
    __ok('v0.60 战斗区净空 ≥ 实际最大上抬', battleHeadroom() === worst, 'hr=' + battleHeadroom() + ' worst=' + worst);
  })();

  /* ============ v0.61 批1 评审整改（B1~B12 + B13/C1/C2） ============ */
  (function () {
    function ids(a) { return a.map(function (c) { return c.id; }).join(','); }
    var g, e, xerr, __saveG;

    /* ---- B6：金卡 pity 初值 ---- */
    __ok('v0.61 B6 金卡补偿初值 = 0（原 -0.05 让前 5 场精英/商店金卡概率恒为 0）', __gcInit === 0, 'init=' + __gcInit);
    var __gcSave = goldCompensation;
    goldCompensation = 0;
    __ok('v0.61 B6 补偿 0 时精英金卡 = 基础 5%', Math.abs(getAdjustedGoldProbability('elite') - 0.05) < 1e-9,
      'p=' + getAdjustedGoldProbability('elite'));
    goldCompensation = -0.05;
    __ok('v0.61 B6 出金后 -5% 仍能压到 0（防连金保留）', getAdjustedGoldProbability('elite') === 0, 'p=' + getAdjustedGoldProbability('elite'));
    goldCompensation = __gcSave;

    /* ---- B1：失血到 0 立即判负（洗髓经/燃血/反噬统一口径）---- */
    xerr = null;
    try {
      g = __base('yincha'); G.hp = 2; G.dead = false; G.battleOver = false;
      G.xisuiTurns = 1; G.drawPile = [__card('leifu'), __card('jingang')]; G.discard = [];
      startTurn(); // 洗髓经·阴差分支：loseHp(2) → 归零
    } catch (ex) { xerr = ex; }
    __ok('v0.61 B1 洗髓经(阴差)扣到 0 立即判负、血量钳 0',
      xerr === null && G.hp === 0 && G.dead === true, (xerr && xerr.message) || ('hp=' + G.hp + ' dead=' + G.dead));
    g = __base('yincha'); G.hp = 60; G.dead = false;
    loseHp(3);
    __ok('v0.61 B1 未致命时照常扣血、不误判负', G.hp === 57 && !G.dead, 'hp=' + G.hp + ' dead=' + G.dead);

    /* ---- B2：同帧「杀光敌人 + 自己 ≤0」按判负，不带 0 血进胜利结算 ---- */
    xerr = null;
    try {
      g = __base('yincha'); G.hp = 2; G.dead = false; G.battleOver = false; G.gold = 0;
      e = G.enemies[0]; e.hp = 1; e.block = 0;
      G.hand = [__card('huofu')]; G.discard = []; G.drawPile = []; G.energy = 9;
      doPlayCard(0); // 火符：loseHp(2) 自身归零 + 8 伤杀敌 → 同帧双结算
    } catch (ex) { xerr = ex; }
    __ok('v0.61 B2 死亡先于胜利：判负且不再结算战利（金币仍 0）',
      xerr === null && G.dead === true && G.hp === 0 && G.gold === 0,
      (xerr && xerr.message) || ('dead=' + G.dead + ' hp=' + G.hp + ' gold=' + G.gold));

    /* ---- B3：镇妖铃 A 列日志插值 ---- */
    g = __base('ganshiren'); G.energy = 9; G.log = []; G.discard = []; G.drawPile = [];
    G.hand = [__card('zhenyaoling')];
    e = G.enemies[0]; e.hp = 60; e.block = 0;
    doPlayCard(0);
    __ok('v0.61 B3 镇妖铃(赶尸人)日志正常插值',
      G.log.some(function (l) { return l.indexOf('镇妖铃：造成 10 伤害并获得 3 点【尸气】') >= 0; }),
      G.log.join(' | ').slice(0, 120));

    /* ---- B4：winFight 重入守卫 ---- */
    xerr = null;
    try {
      g = __base('tianshi'); G.gold = 0;
      winFight();
      var __g1 = G.gold, __tier1 = G.rewardTier;
      winFight();
      __ok('v0.61 B4 winFight 二次调用不再重复结算', G.gold === __g1 && G.rewardTier === __tier1,
        'g1=' + __g1 + ' g2=' + G.gold);
    } catch (ex) { xerr = ex; __ok('v0.61 B4 winFight 重入守卫', false, ex && ex.message); }

    /* ---- B5：Boss 奖励不再把 rewardTier='boss' 泄漏给下一家商店 ---- */
    xerr = null;
    try {
      g = __base('tianshi'); G.rewardTier = 'boss';
      showBossReward();
      __ok('v0.61 B5 Boss 战利品结算后立即清空 rewardTier', G.rewardTier === null, 'tier=' + G.rewardTier);
    } catch (ex) { xerr = ex; __ok('v0.61 B5 rewardTier 复位', false, ex && ex.message); }

    /* ---- B9：生死簿只记实际可扣血量 ---- */
    g = __base('tianshi');
    e = G.enemies[0]; e.hp = 3; e.maxHp = 60; e.block = 0; e.ledgerActive = true; e.ledgerDmg = 0;
    dealDamageTo(e, 20);
    __ok('v0.61 B9 斩杀溢出不计入生死簿（20 伤打 3 血 → 记 3）', e.ledgerDmg === 3, 'ledger=' + e.ledgerDmg);

    /* ---- B7：火符(赶尸人) 可取消 + 伤害延后结算 ---- */
    g = __base('ganshiren'); G.energy = 9; G.discard = []; G.drawPile = []; G.尸气 = 0;
    G.hand = [__card('huofu'), __card('zhiren')];
    e = G.enemies[0]; e.hp = 60; e.block = 0;
    doPlayCard(0);
    __ok('v0.61 B7 火符选牌阶段：伤害尚未结算', !!G.huofuSelect && e.hp === 60 && G.energy === 8,
      'sel=' + !!G.huofuSelect + ' hp=' + e.hp + ' en=' + G.energy);
    cancelHuofuSelect();
    __ok('v0.61 B7 取消＝不弃牌、不结算伤害、退符文、牌回手',
      G.huofuSelect === null && e.hp === 60 && G.energy === 9 && ids(G.hand) === 'zhiren,huofu' && G.尸气 === 0,
      'hp=' + e.hp + ' en=' + G.energy + ' hand=' + ids(G.hand));
    var __hi = G.hand.map(function (c) { return c.id; }).indexOf('huofu');
    doPlayCard(__hi); pickHuofuDiscard(0);
    e.dying = false;
    __ok('v0.61 B7 确认弃牌后才结算伤害（5 伤）+ 鬼怪牌 1 尸气',
      e.hp === 55 && G.尸气 === 1 && G.huofuSelect === null, 'hp=' + e.hp + ' 尸气=' + G.尸气);

    /* ---- B8：忘忧汤按卡对象引用结算 + 触发排序 ---- */
    g = __base('yincha'); G.discard = [];
    G.hand = [__card('leifu'), __card('jingang'), __card('zhiren')];
    showWangyouChoice();
    __ok('v0.61 B8 忘忧汤快照存的是卡对象引用',
      Array.isArray(G.wangyouPool) && G.wangyouPool.length === 3 && G.wangyouPool[1].id === 'jingang',
      'pool=' + (G.wangyouPool || []).map(function (c) { return c.id; }).join(','));
    var __gone = G.hand.splice(1, 1)[0]; G.discard.push(__gone); // 同帧缠绕弃掉「金刚符」
    xerr = null;
    try { drinkWangyou(1); } catch (ex) { xerr = ex; }
    __ok('v0.61 B8 索引错位不再弃错牌/报 TypeError（被缠绕弃掉的牌不重复处理）',
      xerr === null && G.wangyouDrunk === 1 && ids(G.hand) === 'leifu,zhiren' && G.discard.length === 1 && G.discard[0] === __gone,
      (xerr && xerr.message) || ('drunk=' + G.wangyouDrunk + ' hand=' + ids(G.hand) + ' disc=' + G.discard.length));
    g = __base('yincha'); G.discard = [];
    G.hand = [__card('leifu'), __card('jingang')];
    showWangyouChoice(); drinkWangyou(0);
    __ok('v0.61 B8 正常喝下：按引用删掉对应手牌并进弃牌堆',
      ids(G.hand) === 'jingang' && G.discard.length === 1 && G.discard[0].id === 'leifu' && G.wangyouPool === null,
      'hand=' + ids(G.hand) + ' pool=' + G.wangyouPool);
    var __st = startTurn.toString();
    __ok('v0.61 B8 回合开始：缠绕先结算、忘忧汤后开',
      __st.indexOf('if(G.pendingDiscard>0){ G.pendingDiscard--; enemyRandomDiscard(); }') >= 0 &&
      __st.indexOf('if(G.pendingDiscard>0){ G.pendingDiscard--; enemyRandomDiscard(); }') < __st.indexOf('if(G.wangyouTurns>0){'),
      'idx=' + __st.indexOf('pendingDiscard'));

    /* ---- B11：未开局点「牌库」不再静默 ---- */
    xerr = null; __saveG = G;
    try { G = null; viewDeck(); } catch (ex) { xerr = ex; }
    G = __saveG;
    __ok('v0.61 B11 未开局点牌库不抛异常（改为浮字提示）', xerr === null, xerr && xerr.message);
    g = __base('tianshi'); G.deck = [];
    xerr = null;
    try { viewDeck(); } catch (ex) { xerr = ex; }
    __ok('v0.61 B11 空牌库点牌库不抛异常', xerr === null, xerr && xerr.message);

    /* ---- B12：浮字改小堆叠 ---- */
    __ok('v0.61 B12 floatMsg 改为追加子节点（上限 3 条），不再单元素覆盖',
      floatMsg.toString().indexOf('appendChild') >= 0 && floatMsg.toString().indexOf("'fm'") >= 0 &&
      floatMsg.toString().indexOf('el.textContent') < 0, floatMsg.toString().slice(0, 90));
    xerr = null;
    try { for (var __i = 0; __i < 5; __i++) floatMsg('测试浮字 ' + __i); } catch (ex) { xerr = ex; }
    __ok('v0.61 B12 连续 5 条浮字不抛异常', xerr === null, xerr && xerr.message);

    /* ---- B13：易物前置守卫 + 回退兜底 ---- */
    g = __base('tianshi'); G.energy = 9; G.discard = []; G.drawPile = [];
    G.hand = [__card('yiwu')];
    playCard(0);
    __ok('v0.61 B13 手牌只剩易物 → 出牌前拦住（原来打出后整段静默跳过）',
      G.energy === 9 && ids(G.hand) === 'yiwu' && !G.exchange, 'en=' + G.energy + ' hand=' + ids(G.hand));
    g = __base('tianshi'); G.energy = 9; G.discard = []; G.drawPile = [];
    G.hand = [__card('yiwu'), __card('leifu')];
    playCard(0);
    __ok('v0.61 B13 牌堆与弃牌堆皆空 → 拦住（避免空的三选一）',
      G.energy === 9 && ids(G.hand) === 'yiwu,leifu', 'en=' + G.energy + ' hand=' + ids(G.hand));
    g = __base('tianshi'); G.energy = 9; G.discard = [__card('jingang')]; G.drawPile = [];
    G.hand = [__card('yiwu'), __card('leifu')];
    playCard(0);
    __ok('v0.61 B13 正常出易物仍进入「选一张手牌」阶段',
      !!G.exchange && G.exchange.phase === 'pickHand', 'phase=' + (G.exchange || {}).phase);
    cancelExchangeSelect();
    __ok('v0.61 B13 放弃交换后易物回手',
      G.hand.length === 2 && G.hand.some(function (c) { return c.id === 'yiwu'; }) && G.hand.some(function (c) { return c.id === 'leifu'; }),
      'hand=' + ids(G.hand));

    /* ---- C1：魅惑削减「一整次行动」的全部伤害 ---- */
    g = __base('tianshi'); G.hp = 60; G.block = 0;
    e = G.enemies[0]; e.strength = 0; e.charm = 1; e.charmPct = 0.5; e.charmUsed = false;
    dealDamageToPlayer(10, e);
    dealDamageToPlayer(10, e);
    __ok('v0.61 C1 连击每一段都被削减（10×2 → 共扣 10，原只削第一段共 15）', (60 - G.hp) === 10, 'lost=' + (60 - G.hp));
    __ok('v0.61 C1 魅惑层数不按段消耗（留到该敌人行动结束统一扣）',
      e.charm === 1 && e.charmUsed === true, 'charm=' + e.charm + ' used=' + e.charmUsed);
    __ok('v0.61 C1 消耗点已接进敌人行动循环',
      __realEnemyAct.toString().indexOf('if(e.charmUsed)') >= 0, 'enemyAct 源码未见 charmUsed 消耗点');

    /* ---- C2：力量每点 +2 → +1（结算与意图预览同步）---- */
    g = __base('tianshi'); G.hp = 60; G.block = 0;
    e = G.enemies[0]; e.charm = 0; e.charmUsed = false; e.strength = 4; e.pendingDamage = 0; e.intent = { type: 'attack', v: 10 };
    dealDamageToPlayer(10, e);
    __ok('v0.61 C2 力量 4 点 → 10+4=14（原 +8=18）', (60 - G.hp) === 14, 'lost=' + (60 - G.hp));
    __ok('v0.61 C2 意图预览同步：攻击 14', intentText(e).indexOf('攻击 14') >= 0, intentText(e));
    e.intent = { type: 'multi', n: 3, v: 10 }; e.pendingDamage = 5;
    __ok('v0.61 C2 连击预览不吃蓄力加值（3×14，与实际结算一致）', intentText(e).indexOf('连击 3×14') >= 0, intentText(e));
    var __kwStr = KEYWORDS.filter(function (k) { return k[0] === '力量'; }).map(function (k) { return k[1]; }).join('');
    __ok('v0.61 C2 关键词已改为每点 +1', __kwStr.indexOf('+1') >= 0 && __kwStr.indexOf('+2') < 0, __kwStr);
  })();

  /* ============ v0.61.01 蓄力口径：只惠及单体攻击 ============ */
  (function () {
    function seg(src, key) { var i = src.indexOf(key); return i < 0 ? '' : src.slice(i, i + 260); }
    var src = __realEnemyAct.toString();
    var mMulti = seg(src, "case 'multi'"), mAoe = seg(src, "case 'aoe'"), mAtk = seg(src, "case 'attack'"), mChg = seg(src, "case 'charge'");
    __ok('v0.61.01 连击结算不含蓄力（multi 分支不读 pendingDamage）', mMulti.indexOf('pendingDamage') < 0, mMulti.slice(0, 80));
    __ok('v0.61.01 群体攻击结算不含蓄力（aoe 分支不读 pendingDamage）', mAoe.indexOf('pendingDamage') < 0, mAoe.slice(0, 80));
    __ok('v0.61.01 单体攻击既叠加又清空蓄力',
      mAtk.indexOf('e.pendingDamage||0') >= 0 && mAtk.indexOf('e.pendingDamage=0') >= 0, mAtk.slice(0, 90));
    __ok('v0.61.01 蓄力只累加不消费', mChg.indexOf('e.pendingDamage=(e.pendingDamage||0)+e.intent.v') >= 0, mChg.slice(0, 90));

    /* 动态：单体攻击吃满蓄力并清账 */
    var g = __base('tianshi'); G.hp = 60; G.block = 0;
    var e = makeEnemy(ENEMIES['youhun'], 'youhun');
    e.charm = 0; e.charmUsed = false; e.strength = 0; e.pendingDamage = 5; e.affixes = null;
    e.intent = { type: 'attack', v: 10 };
    G.enemies = [e]; G.target = 0;
    __realEnemyAct();
    __ok('v0.61.01 单体攻击 = 10 + 蓄力 5 = 15 伤害，且蓄力清零',
      (60 - G.hp) === 15 && e.pendingDamage === 0, 'lost=' + (60 - G.hp) + ' pend=' + e.pendingDamage);

    /* 动态：连击不吃蓄力、也不清账 */
    g = __base('tianshi'); G.hp = 60; G.block = 0;
    e = makeEnemy(ENEMIES['youhun'], 'youhun');
    e.charm = 0; e.charmUsed = false; e.strength = 0; e.pendingDamage = 5; e.affixes = null;
    e.intent = { type: 'multi', n: 2, v: 6 };
    G.enemies = [e]; G.target = 0;
    __realEnemyAct();
    __ok('v0.61.01 连击 2×6 = 12 伤害（不叠加蓄力 5），且蓄力原样保留',
      (60 - G.hp) === 12 && e.pendingDamage === 5, 'lost=' + (60 - G.hp) + ' pend=' + e.pendingDamage);

    /* 动态：群体攻击同理 */
    g = __base('tianshi'); G.hp = 60; G.block = 0;
    e = makeEnemy(ENEMIES['youhun'], 'youhun');
    e.charm = 0; e.charmUsed = false; e.strength = 0; e.pendingDamage = 5; e.affixes = null;
    e.intent = { type: 'aoe', v: 7 };
    G.enemies = [e]; G.target = 0;
    __realEnemyAct();
    __ok('v0.61.01 群体攻击 7 伤害（不叠加蓄力），蓄力保留',
      (60 - G.hp) === 7 && e.pendingDamage === 5, 'lost=' + (60 - G.hp) + ' pend=' + e.pendingDamage);

    /* 预览与实际一致 */
    var p = makeEnemy(ENEMIES['youhun'], 'youhun');
    p.strength = 2; p.pendingDamage = 5;
    p.intent = { type: 'attack', v: 10 };
    __ok('v0.61.01 预览·攻击 含蓄力（10+5+2=17）', intentText(p).indexOf('攻击 17') >= 0, intentText(p));
    p.intent = { type: 'multi', n: 3, v: 6 };
    __ok('v0.61.01 预览·连击 不含蓄力（3×8）', intentText(p).indexOf('连击 3×8') >= 0, intentText(p));
    p.intent = { type: 'attackBlock', v: 6, block: 4 };
    __ok('v0.61.01 预览·攻击并格挡 不含蓄力（攻击 8 · 格挡 4）',
      intentText(p).indexOf('攻击 8') >= 0 && intentText(p).indexOf('攻击 13') < 0, intentText(p));

    /* 文案 */
    var kw = KEYWORDS.filter(function (k) { return k[0] === '蓄力'; }).map(function (k) { return k[1]; }).join('');
    __ok('v0.61.01 关键词写明「只加单体攻击、连击/群体不吃」',
      kw.indexOf('单体') >= 0 && kw.indexOf('连击') >= 0 && kw.indexOf('群体') >= 0, kw);
    var __chg = seg(__realEnemyAct.toString(), '蓄力（下回合');
    __ok('v0.61.01 蓄力行动日志写明「单体攻击」', __chg.indexOf('下回合单体攻击 +') >= 0, __chg.slice(0, 60));
  })();

  /* ============ v0.61.06：三个接缝（Store / rng / AdSlot） ============ */
  (function () {
    __base('tianshi');

    /* --- 随机：同种子同序列、快照可续 --- */
    function draw(n) { var a = []; for (var i = 0; i < n; i++) a.push(rng()); return a; }
    function uniq(a) { var m = {}, k = 0; a.forEach(function (x) { if (!m[x]) { m[x] = 1; k++; } }); return k; }
    seedRng(20260919); var A = draw(20);
    seedRng(20260919); var B = draw(20);
    __ok('v0.61.06 rng 同种子 → 同序列（对局可复现）', JSON.stringify(A) === JSON.stringify(B));
    seedRng(20260920); var C = draw(20);
    __ok('v0.61.06 rng 换种子 → 换序列', JSON.stringify(A) !== JSON.stringify(C));
    __ok('v0.61.06 rng 取值落在 [0,1)', A.every(function (x) { return x >= 0 && x < 1; }));
    __ok('v0.61.06 rng 不是常量', uniq(A) > 15, uniq(A));

    seedRng(777); draw(5); var snap = rngSnapshot(); var D = draw(10);
    seedRng(777); draw(5); rngRestore(snap); var E = draw(10);
    __ok('v0.61.06 rngSnapshot/rngRestore 中途续流一致', JSON.stringify(D) === JSON.stringify(E));
    __ok('v0.61.06 旧存档没有随机态 → 退回新种子且不抛',
      rngRestore(undefined) === false && rngRestore({}) === false);

    /* 玩法随机确实改走 rng（同种子 → 同掉落） */
    seedRng(31337); var w1 = [weightedCard().id, weightedCard().id, weightedCard().id].join(',');
    seedRng(31337); var w2 = [weightedCard().id, weightedCard().id, weightedCard().id].join(',');
    __ok('v0.61.06 卡牌掉落走 rng（同种子同结果）', w1 === w2 && w1.length > 0, w1);
    seedRng(31338); var w3 = [weightedCard().id, weightedCard().id, weightedCard().id].join(',');
    __ok('v0.61.06 卡牌掉落随种子变化', w1 !== w3, w1 + ' / ' + w3);

    /* ?seed=N 调试接缝（复现某一局） */
    var __ls = location.search;
    location.search = '?foo=1&seed=12345'; var q1s = rngSeedNow(); seedRng(q1s); var q1 = draw(5);
    location.search = '?seed=12345'; seedRng(rngSeedNow()); var q2 = draw(5);
    __ok('v0.61.06 ?seed=12345 解析出固定种子', q1s === 12345, String(q1s));
    __ok('v0.61.06 ?seed=N 两局完全一致（可复现报障）', JSON.stringify(q1) === JSON.stringify(q2));
    location.search = __ls;

    /* --- 随机态确实落进存档 --- */
    seedRng(4242); draw(3);
    var want = rngSnapshot();
    var _sv = saveRun; saveRun = __realSaveRun;
    var threw = null;
    try { __realSaveRun('map'); } catch (e) { threw = String((e && e.message) || e); }
    saveRun = _sv;
    var pay = Store.getJSON(RUN_KEY);
    __ok('v0.61.06 存档写入随机态 rng{s,n}',
      !threw && pay && pay.rng && pay.rng.s === want.s && pay.rng.n === want.n,
      threw || JSON.stringify(pay && pay.rng));
    __ok('v0.61.06 续档会恢复随机态', continueRun.toString().indexOf('rngRestore(d.rng)') >= 0);
    __ok('v0.61.06 新局/无尽开局各自播种',
      confirmNewGame.toString().indexOf('seedRng(rngSeedNow())') >= 0 &&
      startEndless.toString().indexOf('seedRng(rngSeedNow())') >= 0);
    Store.del(RUN_KEY);

    /* --- 存储薄封装 --- */
    Store.setJSON('__v616', { a: 1, b: 'x' });
    var r1 = Store.getJSON('__v616');
    __ok('v0.61.06 Store JSON 往返', !!(r1 && r1.a === 1 && r1.b === 'x'));
    Store.del('__v616');
    __ok('v0.61.06 Store.del 生效', Store.get('__v616') === null);
    Store.set('__v616', '{坏数据');
    __ok('v0.61.06 Store.getJSON 遇坏数据返回 null 不抛', Store.getJSON('__v616') === null);
    Store.del('__v616');
    __ok('v0.61.06 键名与旧版一致（老存档仍能读）',
      RUN_KEY === 'zhiguaitower_run_v1' && SAVE_KEY === 'zhiguaitower_save_v1' &&
      loadSettings.toString().indexOf('zhiguaitower_settings_v1') >= 0 &&
      tutorialSeen.toString().indexOf('zhiguaitower_tutorial_v1') >= 0);
    __ok('v0.61.06 玩法代码不再直接摸 localStorage',
      __realSaveRun.toString().indexOf('localStorage') < 0 &&
      hasRunSave.toString().indexOf('localStorage') < 0 &&
      readRun.toString().indexOf('localStorage') < 0 &&
      clearRunSave.toString().indexOf('localStorage') < 0 &&
      persistSave.toString().indexOf('localStorage') < 0);

    /* --- 广告位唯一入口 --- */
    var SLOT4 = ['奖励翻倍', '复活', '签到翻倍', '开局重随'];
    __ok('v0.61.06 AD_SLOTS 覆盖 4 个激励点位',
      AD_SLOTS.length === 4 && SLOT4.every(function (x) { return AD_SLOTS.indexOf(x) >= 0; }));
    var __h1 = 0; AdSlot.request('复活', function () { __h1++; });
    __ok('v0.61.06 AdSlot.request 回放奖励', __h1 === 1);
    var __h2 = 0; adPlaceholder('奖励翻倍', function () { __h2++; });
    __ok('v0.61.06 adPlaceholder 转发到 AdSlot', __h2 === 1);
    var __h3 = 0; adPlaceholder('签到翻倍', function () { __h3++; });
    __ok('v0.61.06 签到翻倍点位仍可用', __h3 === 1);
  })();


  /* ============ v0.61.10 批2 平衡（用户逐条勾选 P1~P15） ============ */
  (function () {
    var g, c, r;

    /* —— P1 佛渡：0 费 + 全列【消耗】 —— */
    var fd = __card('fodu');
    __ok('v0.61.10 P1 佛渡 0 费（未升级/升级同价）',
      cardCost(fd) === 0 && cardCost(Object.assign({}, fd, { up: true })) === 0,
      cardCost(fd) + '/' + cardCost(Object.assign({}, fd, { up: true })));
    __ok('v0.61.10 P1 佛渡 exhaust:true（每场限一次，免疫不再可续）', fd.exhaust === true, String(fd.exhaust));
    __ok('v0.61.10 P1 佛渡 四列卡面都写明「消耗（一次性）」',
      ['ganshiren', 'wuseng', 'yincha', 'tianshi'].every(function (h) {
        __base(h); return String(fd.t(false)).indexOf('消耗（一次性）') >= 0;
      }), '');
    __base('wuseng');
    __ok('v0.61.10 P1 佛渡 关键词已校准（本回合免疫 + 消耗）',
      KEYWORDS.filter(function (k) { return k[0] === '佛渡'; })[0][1].indexOf('本回合免疫') >= 0 &&
      KEYWORDS.filter(function (k) { return k[0] === '佛渡'; })[0][1].indexOf('消耗') >= 0);

    /* —— P5 补：蚀魂咒/钟馗镇魂 只动天师列，其余三列原值不变 —— */
    var SH = __card('shihunzhou');
    __base('ganshiren'); var _a = [SH.t(false), SH.t(true)];
    __base('wuseng'); var _b = [SH.t(false), SH.t(true)];
    __base('yincha'); var _c = [SH.t(false), SH.t(true)];
    __base('tianshi'); var _d = [SH.t(false), SH.t(true)];
    __ok('v0.61.10 P5 蚀魂咒 只有天师列升到 4/7，其余三列不动',
      _a[0].indexOf('3 伤害') >= 0 && _a[1].indexOf('6 伤害') >= 0 &&
      _b[0].indexOf('5 伤害') >= 0 && _b[1].indexOf('7 伤害') >= 0 &&
      _c[0].indexOf('5 伤害') >= 0 && _c[1].indexOf('8 伤害') >= 0 &&
      _d[0].indexOf('4 伤害') >= 0 && _d[1].indexOf('7 伤害') >= 0,
      _d.join(' / '));
    var ZK = __card('zhongkui');
    __base('ganshiren'); var _e = ZK.t(false);
    __base('wuseng'); var _f = ZK.t(false);
    __base('yincha'); var _i = ZK.t(false);
    __base('tianshi'); var _j = [ZK.t(false), ZK.t(true)];
    __ok('v0.61.10 P5 钟馗镇魂 只有天师列升到 18/24，其余三列不动',
      _e.indexOf('16 伤害') >= 0 && _f.indexOf('16 伤害') >= 0 && _i.indexOf('16 伤害') >= 0 &&
      _j[0].indexOf('18 伤害') >= 0 && _j[1].indexOf('24 伤害') >= 0,
      _j.join(' / '));

    /* —— P6 赶尸人新被动：4 种召唤物寿命 +1；尸王排除；其他英雄不受影响 —— */
    // 注意：id 用**卡牌 id**（阴兵是 yinbingguo，'yinbing' 只是召唤物 type）；
    // BASE 是「非赶尸人英雄打出后立即看到的 dur」——五通神现形当回合会走一次 wutongTick，所以是 1 不是 2。
    var BASE = { zhiren: 2, xiaogui: 2, wutong: 1, yinbingguo: 3 };
    var badLife = [];
    Object.keys(BASE).forEach(function (id) {
      g = __base('wuseng');
      var cc = __card(id); cc.eff(false, cc);
      var sm = g.summons[g.summons.length - 1];
      var base = sm && sm.dur;
      if (base !== BASE[id]) badLife.push('基准 ' + id + ':' + base + '≠' + BASE[id]);
      g = __base('ganshiren');
      cc = __card(id); cc.eff(false, cc);
      sm = g.summons[g.summons.length - 1];
      if (!sm || sm.dur !== base + 1) badLife.push('A ' + id + ':' + (sm && sm.dur) + '≠' + (base + 1));
    });
    __ok('v0.61.10 P6 赶尸人 纸人/小鬼/五通神/阴兵 寿命恰好 +1，其他英雄不加', badLife.length === 0, badLife.join(' '));

    g = __base('ganshiren'); g.尸气 = 10;
    var sw = __card('shi_wang'); sw.eff(false, sw);
    var sw2 = g.summons[g.summons.length - 1];
    __ok('v0.61.10 P6 尸王 不受被动影响（不是「役使」）', sw2 && sw2.dur === 5, 'dur=' + (sw2 && sw2.dur));

    // 升级版只叠「卡面自带的 dur 提升」，被动不双计：阴兵 3 → 升级仍 3 → 被动 +1 = 4
    g = __base('ganshiren'); g.尸气 = 0;
    var ybg = __card('yinbingguo'); ybg.eff(true, ybg);
    __ok('v0.61.10 P6 被动只加一次（升级阴兵 3 → 4，不是 5）',
      g.summons.every(function (s) { return s.dur === 4; }) && g.summons.length === 3,
      JSON.stringify(g.summons.map(function (s) { return s.dur; })));

    __ok('v0.61.10 P6 英雄被动文案已写明寿命 +1、尸王除外',
      HEROES.filter(function (h) { return h.id === 'ganshiren'; })[0].passive.indexOf('额外获得 1 回合寿命') >= 0 &&
      HEROES.filter(function (h) { return h.id === 'ganshiren'; })[0].passive.indexOf('尸王不受影响') >= 0);
    __ok('v0.61.10 P6 关键词新增【召唤寿命】',
      KEYWORDS.some(function (k) { return k[0] === '召唤寿命' && k[1].indexOf('尸王不受影响') >= 0; }));

    /* —— P7 战后金币 3/6/9 → 4/8/12 —— */
    function __goldAfter(kind) {
      g = __base('tianshi');
      g.battleStartHp = g.hp; g.energy = 1; g.rewardTier = null;
      if (kind === 'elite') g.enemies[0].elite = true;
      if (kind === 'boss') g.enemies[0].boss = true;
      g.enemies.forEach(function (e) { e.hp = 0; e.dying = false; });
      var before = g.gold;
      winFight();
      return g.gold - before;
    }
    var _gN = __goldAfter('normal'), _gE = __goldAfter('elite'), _gB = __goldAfter('boss');
    __ok('v0.61.10 P7 战后金币 4/8/12', _gN === 4 && _gE === 8 && _gB === 12, _gN + '/' + _gE + '/' + _gB);

    /* —— P10 聚灵·武僧：升级效果整体替换（仍抽 1；抽到防御牌 +4 格挡） —— */
    var JL = __card('juling');
    __base('wuseng');
    __ok('v0.61.10 P10 聚灵(武僧) 卡面：未升级抽 1、升级抽 1 + 抽到防御牌 +4 格挡',
      JL.t(false) === '抽 1 张牌' && JL.t(true) === '抽 1 张牌。若抽到【防御牌】，获得 4 点格挡',
      JL.t(false) + ' | ' + JL.t(true));
    g = __base('wuseng'); g.block = 0;
    g.drawPile = [__card('jingang')]; g.discard = [];
    var jl1 = Object.assign({}, JL, { up: true }); jl1.eff(true, jl1);
    __ok('v0.61.10 P10 聚灵(武僧·升级) 抽到防御牌获得 4 点格挡', g.hand.length === 1 && g.block === 4,
      'hand=' + g.hand.length + ' block=' + g.block);
    g = __base('wuseng'); g.block = 0;
    g.drawPile = [__card('leifu')]; g.discard = [];
    var jl2 = Object.assign({}, JL, { up: true }); jl2.eff(true, jl2);
    __ok('v0.61.10 P10 聚灵(武僧·升级) 抽到非防御牌不给格挡', g.hand.length === 1 && g.block === 0,
      'hand=' + g.hand.length + ' block=' + g.block);
    g = __base('wuseng'); g.block = 0;
    g.drawPile = [__card('jingang'), __card('leifu')]; g.discard = [];
    var jl3 = __card('juling'); jl3.eff(false, jl3);
    __ok('v0.61.10 P10 聚灵(武僧·未升级) 仍只抽 1 张、无格挡', g.hand.length === 1 && g.block === 0,
      'hand=' + g.hand.length + ' block=' + g.block);
    // 其余三列的「升级抽 2」保持不动
    __base('ganshiren');
    __ok('v0.61.10 P10 聚灵 其余三列仍是 1/2 张',
      __card('juling').t(false).indexOf('抽 1 张') >= 0 && __card('juling').t(true).indexOf('抽 2 张') >= 0);

    /* —— P11 易物：换入的牌本回合费用 -1 —— */
    g = __base('ganshiren');
    var yw = __card('yiwu'); var other = __card('leifu');
    g.hand = [other]; g.discard = [yw];
    // 换入池 = shuffle(drawPile + discard).slice(0,3)：可换牌超过 3 张会把 钟馗 洗出局，
    // 所以只放 1 张进抽牌堆（池子 = 钟馗 + 刚才打出的易物，两张，确定）。3 费金卡好验证 -1。
    g.drawPile = [__card('zhongkui')];
    g.deck = [__card('zhongkui')];   // 牌库持有同一批对象（真局如此），换入副本要在这里顶替原对象
    yw.eff(false, yw); pickExchangeHand(0);
    var exx = G.exchange, kk = 0;
    while (exx.pool[kk] && (exx.pool[kk] === yw || exx.pool[kk].id !== 'zhongkui')) kk++;
    if (kk < exx.pool.length) {
      pickExchangeNew(kk);
      var inHand = g.hand[g.hand.length - 1];
      __ok('v0.61.10 P11 易物 换入的牌本回合费用 -1',
        inHand && inHand.tempCostCut === 1 && effectiveCost(inHand) === cardCost(inHand) - 1,
        'id=' + (inHand && inHand.id) + ' cost=' + (inHand && cardCost(inHand)) + ' eff=' + (inHand && effectiveCost(inHand)));
      // 关键：不能污染 CARDS 里的共享对象（同名牌的另外几张不该一起减费）
      __ok('v0.61.10 P11 易物 减费标记不落到共享卡牌对象上',
        __card('zhongkui').tempCostCut === undefined, String(__card('zhongkui').tempCostCut));
      // 消耗牌回牌库靠 G.deck.indexOf —— 副本必须已在牌库里顶替原对象
      __ok('v0.61.10 P11 易物 副本在 G.deck 里顶替原对象（保住 indexOf 语义）',
        g.deck.indexOf(inHand) >= 0, 'deckLen=' + g.deck.length);
      // 到期清除：进入下一回合后标记消失（牌此时可能已在弃牌堆，也要清）
      startTurn();
      __ok('v0.61.10 P11 易物 减费「本回合」到期即失效', !inHand.tempCostCut && effectiveCost(inHand) === cardCost(inHand),
        'cut=' + inHand.tempCostCut + ' eff=' + effectiveCost(inHand));
    } else {
      __ok('v0.61.10 P11 易物 换入池构造失败（用例前提不成立）', false, JSON.stringify(exx.pool.map(function (x) { return x.id; })));
    }
    __base('yincha');
    __ok('v0.61.10 P11 易物 四列卡面都写明「换入的牌本回合费用 -1」',
      ['ganshiren', 'wuseng', 'yincha', 'tianshi'].every(function (h) {
        __base(h); return __card('yiwu').t(false).indexOf('换入的牌本回合费用 -1') >= 0;
      }));

    /* —— 未勾选项必须原样保留（防误改） —— */
    g = __base('tianshi');
    g.battleStartHp = g.hp = 40; g.maxHp = 80; g.energy = 0; g.rewardTier = null;
    G.enemies.forEach(function (e) { e.hp = 0; });
    winFight();
    __ok('v0.61.10 未勾选项 P8 战后恢复仍是 8 点（不改）', g.hp === 48, 'hp=' + g.hp);
    // P4 荆棘：用户判定「无上限本就是克制连击敌人的设计」→ 必须仍是可无限叠加的裸加法
    __base('wuseng'); g.block = 0;
    var jj = __card('jingji');
    for (var _i = 0; _i < 3; _i++) { jj.eff(false, jj); }
    __ok('v0.61.10 未勾选项 P4 荆棘无上限叠加（3 次 × 4 = 12，未被钳制）', G.thorns === 12, 'thorns=' + G.thorns);
  })();


    /* ============================================================
     * v0.61.20 批3 手机端/UI
     * ============================================================ */

    /* —— P1 结束回合软提示 —— */
    var _pc = CARDS.find(function (c) { return !c.costU && cardCost(c) >= 2; });
    __ok('v0.61.20 P1 找得到一张 ≥2 费的基准牌（用例前提）', !!_pc, 'card=' + (_pc && _pc.id));
    if (_pc) {
      var _c2 = cardCost(_pc);
      g = __base('wuseng'); SCENE = 'battle'; g.energy = _c2;
      g.hand = [Object.assign({}, _pc)];
      __ok('v0.61.20 P1 能量刚好够 → 1 张可打', playableCount() === 1, 'cost=' + _c2 + ' n=' + playableCount());
      g.energy = _c2 - 1;
      __ok('v0.61.20 P1 差 1 点能量 → 不计入可打', playableCount() === 0, 'n=' + playableCount());
      g.energy = 9;
      g.hand = [Object.assign({}, _pc, { sealed: 1 })];
      __ok('v0.61.20 P1 被忘忧封印的牌不算可打', playableCount() === 0, 'n=' + playableCount());
      g.hand = [Object.assign({}, _pc), Object.assign({}, _pc), Object.assign({}, _pc)];
      __ok('v0.61.20 P1 三张同名牌 → 3 张可打', playableCount() === 3, 'n=' + playableCount());
      SCENE = 'map';
      __ok('v0.61.20 P1 非战斗场景不提示', playableCount() === 0, 'n=' + playableCount());
      SCENE = 'battle';
      __ok('v0.61.20 P1 软提示默认开（设置项默认 true）', SETTINGS.endTurnHint !== false, String(SETTINGS.endTurnHint));
    }

    /* —— P2 地图路径历史：记一笔 / 存档往返 / 老存档降级 —— */
    var __realStartBattle = startBattle;
    var __savedMAP = MAP;
    try {
      startBattle = __sil;
      MAP = [[{ t: 'fight', e: ['youhun'] }, { t: 'fight', e: ['youhun'] }],
             [{ t: 'fight', e: ['youhun'] }],
             [{ t: 'fight', e: ['youhun'] }]];
      g = __base('wuseng'); g.mapRow = 0; g.mapCol = -1; g.mapPath = []; SCENE = 'map';
      chooseNode(1);
      __ok('v0.61.20 P2 chooseNode 走一步记一笔路径',
        g.mapPath.length === 1 && g.mapPath[0].r === 0 && g.mapPath[0].c === 1, JSON.stringify(g.mapPath));

      g.mapRow = 2; g.mapCol = 1; g.mapPath = [{ r: 0, c: 1 }, { r: 1, c: 1 }];
      __realSaveRun();
      var _raw = readRun();
      __ok('v0.61.20 P2 存档带上 mapPath',
        !!(_raw && _raw.mapPath && _raw.mapPath.length === 2 && _raw.mapPath[1].c === 1),
        JSON.stringify(_raw && _raw.mapPath));

      g.mapPath = [];              // 打乱内存里的路径，验证是「从存档恢复」而不是「碰巧还在」
      continueRun();
      __ok('v0.61.20 P2 续档恢复 mapPath',
        Array.isArray(G.mapPath) && G.mapPath.length === 2 && G.mapPath[1].c === 1, JSON.stringify(G.mapPath));

      // 老存档：字段整个不存在 —— 必须降级成空数组，不能是 undefined（连线代码会 .length）
      var _old = readRun(); delete _old.mapPath;
      Store.setJSON(RUN_KEY, _old);
      continueRun();
      __ok('v0.61.20 P2 老存档无 mapPath → 降级为空数组',
        Array.isArray(G.mapPath) && G.mapPath.length === 0, String(G.mapPath));
      clearRunSave();
    } catch (exP2) {
      __ok('v0.61.20 P2 地图路径用例执行未抛错', false, String(exP2 && exP2.message));
    } finally {
      startBattle = __realStartBattle; MAP = __savedMAP; SCENE = 'map';
    }
    __ok('v0.61.20 P2 newState 自带空 mapPath', Array.isArray(newState().mapPath) && newState().mapPath.length === 0);

    /* —— P3 拖拽受击预览：无 DOM 时不炸、函数在位 —— */
    __ok('v0.61.20 P3 showDragPreview / hideDragPreview 已定义',
      typeof showDragPreview === 'function' && typeof hideDragPreview === 'function');
    var _p3threw = false;
    try { hideDragPreview(); } catch (e3) { _p3threw = true; }
    __ok('v0.61.20 P3 hideDragPreview 在无 DOM 环境下安全返回', !_p3threw);
    var _p3threw2 = false;
    try { showDragPreview(0); } catch (e3b) { _p3threw2 = true; }
    __ok('v0.61.20 P3 showDragPreview 无 DRAG/无 DOM 时不抛错', !_p3threw2);
    __ok('v0.61.20 P3 受击预览与卡面徽章同源（previewDamage 仍在位）', typeof previewDamage === 'function');

    /* —— P4 Boss 二阶段转场 —— */
    var __realBPI = bossPhaseIntro, __bpiName = null;
    try {
      bossPhaseIntro = function (n) { __bpiName = n; };
      g = __base('wuseng');
      g.enemies = [makeEnemy(ENEMIES.yanluotianzi, 'yanluotianzi')];
      var _bz = G.enemies[0]; _bz.hp = _bz.maxHp;
      enterPhase2(_bz);
      __ok('v0.61.20 P4 enterPhase2 触发裂印过场且带上 Boss 名讳',
        __bpiName === '阎罗天子', String(__bpiName));
      __ok('v0.61.20 P4 二阶段数值不受过场影响（return 到 60% 血）',
        _bz.phase2 === true && _bz.hp === Math.floor(_bz.maxHp * 0.6), 'hp=' + _bz.hp + '/' + _bz.maxHp);
    } catch (exP4) {
      __ok('v0.61.20 P4 二阶段用例执行未抛错', false, String(exP4 && exP4.message));
    } finally { bossPhaseIntro = __realBPI; }
    __ok('v0.61.20 P4 bossPhaseIntro 是独立的非阻塞函数', typeof bossPhaseIntro === 'function' && bossPhaseIntro.length === 1);

    /* —— P5 战报分类 —— */
    __ok('v0.61.20 P5 分类·伤害', logCat('对 游魂 造成 5 点伤害') === 'dmg', logCat('对 游魂 造成 5 点伤害'));
    __ok('v0.61.20 P5 分类·获得', logCat('获得 4 点格挡') === 'gain', logCat('获得 4 点格挡'));
    __ok('v0.61.20 P5 分类·状态', logCat('对 游魂 施加 2 层诅咒') === 'buff', logCat('对 游魂 施加 2 层诅咒'));
    __ok('v0.61.20 P5 分类·分隔线', logCat('—— 第 2 回合 ——') === 'sep', logCat('—— 第 2 回合 ——'));
    __ok('v0.61.20 P5 认不出的行保持空类（筛选时永远显示）',
      logCat('阎罗天子堕入轮回') === '', '[' + logCat('阎罗天子堕入轮回') + ']');
    __ok('v0.61.20 P5 伤害优先于状态（一句话里两者都有的归伤害）',
      logCat('造成 5 点伤害并施加 2 层诅咒') === 'dmg', logCat('造成 5 点伤害并施加 2 层诅咒'));
    var _lf = { dmg: true, gain: false, buff: false };
    var _keys = LOG_CATS.map(function (p) { return p[0]; }).filter(function (k) { return _lf[k]; });
    __ok('v0.61.20 P5 筛选键提取（只留勾中的）', _keys.length === 1 && _keys[0] === 'dmg', JSON.stringify(_keys));
    __ok('v0.61.20 P5 日志渲染函数在位', typeof renderLogBox === 'function' && typeof toggleLogFilter === 'function');

    /* —— P8 条件引导气泡：每个键只弹一次、落盘、四类触发点都接上 —— */
    function __tipReset() { TIPS_SEEN = null; try { Store.set(TIPS_KEY, '{}'); } catch (e) {} TIPS_SEEN = null; }
    SCENE = 'battle';
    __tipReset();
    __ok('v0.61.20 P8 首次触发返回 true', tipOnce('block', 'x') === true);
    __ok('v0.61.20 P8 同键第二次不再弹', tipOnce('block', 'x') === false);
    __ok('v0.61.20 P8 不同键各自独立', tipOnce('curse', 'x') === true);
    __ok('v0.61.20 P8 已落盘（换局不重弹）',
      (Store.getJSON(TIPS_KEY) || {}).block === 1, JSON.stringify(Store.getJSON(TIPS_KEY)));

    __tipReset(); SCENE = 'battle';
    g = __base('wuseng');
    gainBlock(3);
    __ok('v0.61.20 P8 gainBlock 触发「格挡」提示', (Store.getJSON(TIPS_KEY) || {}).block === 1);

    __tipReset(); SCENE = 'battle';
    g = __base('tianshi'); __fresh();
    applyCurse(G.enemies[0], 2);
    __ok('v0.61.20 P8 applyCurse 触发「诅咒」提示', (Store.getJSON(TIPS_KEY) || {}).curse === 1);

    __tipReset(); SCENE = 'battle';
    g = __base('ganshiren');
    gainShiqi(1);
    __ok('v0.61.20 P8 gainShiqi 触发「尸气」提示', (Store.getJSON(TIPS_KEY) || {}).shiqi === 1);

    __tipReset(); SCENE = 'battle';
    g = __base('ganshiren');
    addSummon({ type: 'zhiren', v: 3, dur: 2 });
    __ok('v0.61.20 P8 addSummon 触发「召唤物」提示', (Store.getJSON(TIPS_KEY) || {}).summon === 1);

    // 气泡只在战斗里弹：非战斗场景不写盘、不画 DOM，但仍返回 true（提示「已消费」）
    __tipReset(); SCENE = 'map';
    __ok('v0.61.20 P8 非战斗场景仍消费提示位（返回 true）', tipOnce('summon', 'x') === true);
    __ok('v0.61.20 P8 非战斗场景不画气泡（DOM 无 #tip-bubble）',
      !document.getElementById('tip-bubble') || !document.getElementById('tip-bubble').classList
        || !document.getElementById('tip-bubble').classList.contains('show'));
    SCENE = 'map';
    __tipReset();

    /* —— P2 连线 / P6 / P7 / P9 —— 无 DOM，只能确认入口在位 —— */
    __ok('v0.61.20 P2 drawMapLinks 已定义且在无 svg 环境下安全返回',
      typeof drawMapLinks === 'function' && (function () { try { drawMapLinks(); return true; } catch (e) { return false; } })());
    __ok('v0.61.20 P6 长按放大的「升级后」对比行有内容可比（升级前后文案不同）',
      (function () { var cu = __card('leifu'); return !!cu && cu.t(true) !== cu.t(false); })());
    // P7 敌人热区 / P9 色弱微调是纯 CSS，列进 更新日志.md 的浏览器复核清单

  rep.pass = _p; rep.fail = _f;
  try { globalThis.__report = rep; } catch (e) { this.__report = rep; }
})();
