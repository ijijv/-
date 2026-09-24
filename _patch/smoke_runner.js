/* ===== 志怪塔 Task#13 冒烟 runner（追加于 <script> 末尾，与引擎同作用域） ===== */
(function () {
  /* ---------- 外围降级：保留结算逻辑，屏蔽渲染/音效/存档/成就/召唤 UI 的副作用 ---------- */
  try { SETTINGS.lowSpec = true; SETTINGS.sound = false; SETTINGS.musicVol = 0; SETTINGS.sfxVol = 0; } catch (e) {}
  var __sil = function () {};
  var __realSfx = sfx; // v0.61.25 金快照探针要用真 sfx（第 631 行会把全局 sfx 顶成 __sil）
  var __realFloatDamage = floatDamage; // v0.61.36：第 658 行会把全局 floatDamage 顶成 __sil，结构断言要用真的
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
    G.ranhunType = null; G.ranhunSelf = null; G.bloodPact = 0; G.retain = 0;   // v0.61.35：boostCurse 已随守一改为「减费」而退役
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
    __ok('A#41 纸人 入召唤槽(计数1/持续2；v0.61.37 删掉寿命+1 被动 → 与卡面一致)', g.summonsMadeTurn === 1 && g.summons[0].type === 'zhiren' && g.summons[0].dur === 2, JSON.stringify(g.summons));

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
    // ===== Block4 攻击批 A 列修正（雷符5/7+击杀2/3尸气 / 蚀魂4/8+回血 / 钟馗16/24+无条件4/6）· v0.61.37 再调 =====
    g = __base('ganshiren'); G.summons = [{type:'zhiren', v:1, dur:2}];
    (function () { var c = __card('leifu'); var t = G.enemies[0]; var bh = t.hp; c.eff(false, c);
      __ok('A#1 雷符 基础5+召唤1=6伤', bh - t.hp === 6, 'taken=' + (bh - t.hp)); })();
    (function () { var c = __card('leifu'); var t = G.enemies[0]; var bh = t.hp; c.eff(true, c);
      __ok('A#1u 雷符 升级7+召唤1=8伤', bh - t.hp === 8, 'taken=' + (bh - t.hp)); })();
    g = __base('ganshiren'); G.summons = [];
    (function () { var c = __card('leifu'); var t = G.enemies[0]; t.hp = 2; c.eff(false, c);
      __ok('A#1k 雷符 击杀获2尸气', g.尸气 === 2 && G.enemies[0].hp <= 0, '尸气=' + g.尸气); })();
    g = __base('ganshiren'); G.summons = [{type:'zhiren', v:1, dur:2}];
    (function () { var c = __card('shihunzhou'); var t = G.enemies[0]; var bh = t.hp; var hp0 = g.hp; c.eff(false, c);
      __ok('A#11 蚀魂 基础4伤+每召唤回1血', bh - t.hp === 4 && g.hp === hp0 + 1, 'taken=' + (bh - t.hp) + ' hp=' + g.hp); })();
    g = __base('ganshiren');
    (function () { var c = __card('zhongkui'); var t = G.enemies[0]; var bh = t.hp; c.eff(false, c);
      __ok('A#14 钟馗 16伤+无条件4尸气', bh - t.hp === 16 && g.尸气 === 4, 'taken=' + (bh - t.hp) + ' 尸气=' + g.尸气); })();
    g.尸气 = 0;
    (function () { var c = __card('zhongkui'); var t = G.enemies[0]; var bh = t.hp; c.eff(true, c);
      __ok('A#14u 钟馗 升级24伤+6尸气', bh - t.hp === 24 && g.尸气 === 6, 'taken=' + (bh - t.hp) + ' 尸气=' + g.尸气); })();
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
      __ok('D#17 金光罩 基础9格+耗2尸气+5格（=14）', g.block === 14 && g.尸气 === 0, 'block=' + g.block + ' 尸气=' + g.尸气); })();
    g = __base('ganshiren'); g.尸气 = 2;
    (function () { var c = __card('jinguang'); c.eff(true, c);
      __ok('D#17u 金光罩 升级14格+耗2尸气+7格（=21）', g.block === 21 && g.尸气 === 0, 'block=' + g.block + ' 尸气=' + g.尸气); })();
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
      __ok('D#21 铜皮 基础8格+反弹4+召唤1', g.block === 8 && G.thorns === 5, 'block=' + g.block + ' thorns=' + G.thorns); })();
    (function () { G.block = 0; G.thorns = 0; var c = __card('tongpi'); c.eff(true, c);
      __ok('D#21u 铜皮 升级12格+反弹5+召唤1', g.block === 12 && G.thorns === 6, 'block=' + g.block + ' thorns=' + G.thorns); })();
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
      __ok('F#38 移形换影 闪避+成功后1尸气（未升级；v0.61.37 1/3）', G.dodge === 1 && G.dodgeShiqi === 1, 'dodge=' + G.dodge + ' shiqi=' + G.dodgeShiqi); })();
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
      __ok('S#46 咒雨 引爆6尸气→30伤害+清零+回6血（清零算消耗）', g.尸气 === 0 && (__hp0 - __sumHp()) === 30 && g.hp === 66, '尸气=' + g.尸气 + ' dmg=' + (__hp0 - __sumHp()) + ' hp=' + g.hp); })();
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
    __ok('A#27 易物 换出鬼怪牌→2尸气', g.尸气 === 2, '尸气=' + g.尸气);
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
    (function () {
      var j0 = (function () { var g2 = __base('wuseng'); var cc = __card('jingji'); cc.eff(false, cc); return g2.thorns; })();
      var j1 = (function () { var g2 = __base('wuseng'); var cc = Object.assign({}, __card('jingji'), { up: true }); cc.eff(true, cc); return g2.thorns; })();
      // v0.61.36：武僧列反弹 4/5 → 3/4（格挡 4/7 不动）
      __ok('B#19 荆棘符 4/7 + 反弹 3/4', blk('jingji') === 4 && blk('jingji', true) === 7 && j0 === 3 && j1 === 4,
        'blk=' + blk('jingji') + '/' + blk('jingji', true) + ' 反弹=' + j0 + '/' + j1);
    })();
    __ok('B#20 佛渡 升级 +5 格挡（v0.61.36 武僧列 4 → 5）', blk('fodu') === 0 && blk('fodu', true) === 5, blk('fodu') + '/' + blk('fodu', true));
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
    __ok('B#19 荆棘符 thorns=3（v0.61.36 武僧列 4 → 3）', (g.thorns || 0) === 3, 'thorns=' + g.thorns);

    g = __base('wuseng'); c = __card('yixing'); c.eff(false, c);
    __ok('B#37 移形 dodge+闪避后+5格挡', g.dodge === 1 && g.dodgeNextBlock === 5, 'dodge=' + g.dodge);

    g = __base('wuseng'); g.hand = [__card('leifu'), __card('leifu'), __card('leifu')];
    c = __card('fenfu'); c.eff(false, c); g.discardSelect.picked = [0, 2]; confirmDiscardSelect();
    __ok('B#34 焚符 弃2张→8格挡(每张4)', (g.blockGainedTurn || 0) === 8, 'blockTurn=' + g.blockGainedTurn);

    // v0.61.36：武僧列升级档 6 → 5（未升级 4 不动，上面那条即是）
    g = __base('wuseng'); g.hand = [__card('leifu'), __card('leifu'), __card('leifu')];
    c = Object.assign({}, __card('fenfu'), { up: true }); c.eff(true, c); g.discardSelect.picked = [0, 2]; confirmDiscardSelect();
    __ok('v0.61.36 B#34 焚符(升级) 弃2张→10格挡(每张5)', (g.blockGainedTurn || 0) === 10, 'blockTurn=' + g.blockGainedTurn);

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
    __ok('D#15 金刚符 按本回合诅咒+格挡(8)', g.block === 8, 'block=' + g.block);   // v0.61.35：基础 4/6 → 5/7

    g = __base('tianshi'); CURSE_THIS_TURN = 3; c = __card('jinguang'); c.eff(false, c);
    __ok('D#17 金光罩 12 盾+诅咒全额(15)', g.block === 15, 'block=' + g.block);

    g = __base('tianshi'); c = __card('xiejiashengyuan'); g.hand = [c]; c.eff(true, c); // v0.61.35：升级 8 → 12 格挡
    __ok('D#23 卸甲 置 endBlockKind=D(12盾)', g.endBlockKind === 'D' && g.block === 12, 'kind=' + g.endBlockKind + ' block=' + g.block);
    g = __base('tianshi'); c = __card('xiejiashengyuan'); c.eff(true, c); finishEndTurn(); resolveEndBlock();
    __ok('D#23 卸甲 敌后结算 12格挡→6诅咒', g.block === 0 && g.endBlockKind === null && __sumCurse() === 6 && CURSE_THIS_TURN === 6, 'sumCurse=' + __sumCurse() + ' CURSE=' + CURSE_THIS_TURN);

    g = __base('tianshi'); g.hand = [__card('leifu'), __card('leifu'), __card('leifu')];
    c = __card('fenfu'); c.eff(false, c); g.discardSelect.picked = [0, 2]; confirmDiscardSelect();
    __ok('D#34 焚符 弃2张→2诅咒+4格挡', __sumCurse() === 2 && (g.blockGainedTurn || 0) >= 4, 'sumCurse=' + __sumCurse());

    g = __base('tianshi'); g.hand = [__card('leifu'), __card('leifu')];
    g.drawPile = [__card('zhiren'), __card('jingang'), __card('leifu')];
    c = __card('yiwu'); c.eff(false, c); pickExchangeHand(0); pickExchangeNew(0);
    __ok('D#27 易物 换出攻击牌→补抽1张', g.hand.length === 3, 'hand=' + g.hand.length);

    g = __base('tianshi'); g.summons = [{ type: 'xiaogui', v: 3, dur: 2 }];
    // v0.61.37：小鬼目标自 v0.61.35 起是**随机**的，只给 enemies[0] 上诅咒会让本用例随机红/绿。
    // 两只都上，则无论随机命中谁都是 3+2=5，断言变确定。
    g.enemies.forEach(function (e) { e.curse = 3; }); var hp0 = __sumHp();
    c = __card('fuling'); c.eff(false, c);
    __ok('D#39 附灵 触发小鬼攻击（目标带诅咒 +2 → 5伤）', __sumHp() === hp0 - 5, 'sumHp ' + hp0 + '->' + __sumHp());
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
    var zeroUp = ['tongling', 'jingxin', 'xueji']; // tiebushan 已按列取费（B 0 费不可升级）；yixing 按列分叉（B/D/A 1/1），另测
    zeroUp.forEach(function (id) {
      var cu = Object.assign({}, __card(id)); cu.up = true;
      __ok('升级0费 costU=' + id, cardCost(cu) === 0 && effectiveCost(cu) === 0,
        'cost=' + cu.cost + ' costU=' + cu.costU + ' cardCost=' + cardCost(cu) + ' eff=' + effectiveCost(cu));
    });
    // v0.61.35 天师列、v0.61.36 武僧列、v0.61.37 赶尸人列：移形换影取消 (U:0) → 1/1；只剩 C 列仍 1/0
    ['yincha'].forEach(function (h) {
      __base(h); var cy = Object.assign({}, __card('yixing'), { up: true });
      __ok('移形换影 ' + h + ' 升级 0 费（仅剩 C 列 1/0）',
        cardCost(cy) === 0 && effectiveCost(cy) === 0, 'cost=' + cardCost(cy));
    });
    ['tianshi', 'wuseng', 'ganshiren'].forEach(function (h) {
      __base(h); var cy = Object.assign({}, __card('yixing'), { up: true });
      __ok('移形换影 ' + h + ' 升级仍 1 费（取消 (U:0)）',
        cardCost(cy) === 1 && effectiveCost(cy) === 1, 'cost=' + cardCost(cy));
    });
    (function () {
      // 「1/1」的必然推论：文案与费用升级前后都一样 → 锻造页应置灰
      __base('wuseng'); var cy = __card('yixing');
      __ok('v0.61.36 移形换影(武僧) 文案无「0 符文」且升级项置灰（1/1 的必然结果）',
        cy.t(false).indexOf('0 符文') < 0 && canUpgrade(cy) === false,
        cy.t(false) + ' canUp=' + canUpgrade(cy));
    })();
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
    __ok('雷符预览 A=5+2召唤=7', lv('leifu').d === 7, 'd=' + lv('leifu').d);
    g = __base('wuseng'); g.block = 9;
    __ok('雷符预览 B=4+min6,3=7', lv('leifu').d === 7, 'd=' + lv('leifu').d);
    g = __base('yincha'); g.xuenu = 4;
    __ok('雷符预览 C=5+血怒6=11', lv('leifu').d === 11, 'd=' + lv('leifu').d);
    g = __base('tianshi'); g.enemies[0].curse = 1;
    __ok('雷符预览 D=6+3=9', lv('leifu').d === 9, 'd=' + lv('leifu').d);
    __ok('雷符预览 D升级=9+4=13', lv('leifu', true).d === 13, 'd=' + lv('leifu', true).d);   // v0.61.35：带诅咒加成 +3/+4
    g = __base('tianshi'); g.enemies[0].curse = 2;
    __ok('斩妖剑预览 D=10+引爆2×5=20', lv('zhanyaojian').d === 20, 'd=' + lv('zhanyaojian').d);   // v0.61.35：主伤 8→10
    g = __base('ganshiren'); g.summons = [{ type: 'zhiren', v: 1, dur: 2 }];
    __ok('百鬼预览 A=4+1×2=6', lv('baigui').d === 6, 'd=' + lv('baigui').d);
    g = __base('wuseng'); g.block = 6;
    __ok('百鬼预览 B=5+min(8,6/2)=8', lv('baigui').d === 8, 'd=' + lv('baigui').d);
    g = __base('yincha');
    __ok('百鬼预览 C=5+0召唤=5', lv('baigui').d === 5, 'd=' + lv('baigui').d);
    g = __base('tianshi'); g.enemies[0].curse = 3;
    __ok('百鬼预览 D=8+1×3诅咒=11', lv('baigui').d === 11, 'd=' + lv('baigui').d);   // v0.61.35：全体主伤 7→8
    g = __base('ganshiren'); g.block = 0; g.尸气 = 6;
    __ok('铁布衫预览 A 无格挡有尸气(3) 非落空', lv('tiebushan').d === 3 && !lv('tiebushan').miss, 'd=' + lv('tiebushan').d);
    g = __base('ganshiren');
    __ok('纸人预览 每回合 v=2', lv('zhiren').d === 2, 'd=' + lv('zhiren').d);
    g = __base('ganshiren'); G.summons = [{ type: 'shi_wang', v: 10, dur: 3 }];
    __ok('纸人预览 尸王在场 2+1=3', lv('zhiren').d === 3, 'd=' + lv('zhiren').d);
    g = __base('tianshi');
    __ok('小鬼预览 天师 v=2', lv('xiaogui').d === 2, 'd=' + lv('xiaogui').d);   // v0.61.35：天师列 3/4 → 2/3
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
    c = __card('xiejiashengyuan'); c.eff(true, c); // v0.61.35：12 盾 + endBlockKind=D
    dealDamageToPlayer(5, en);                     // 敌人打 5 → 格挡 12→7
    __ok('⑦ 卸甲 D 敌攻先耗格挡(12→7) 未提前转化', g.block === 7 && g.endBlockKind === 'D' && g.hp === 60, 'block=' + g.block + ' hp=' + g.hp);
    resolveEndBlock();
    __ok('⑦ 卸甲 D 敌后结算 余7盾→3诅咒', g.block === 0 && g.endBlockKind === null && __sumCurse() === 3, 'block=' + g.block + ' sum=' + __sumCurse());

    g = __base('tianshi'); en = g.enemies[0]; g.enemies[1].hp = 0; // 只剩 en：resolveEndBlock 的随机目标必然命中它
    en.affixes = null; en.strength = 0; en.curse = 6;
    c = __card('xiejiashengyuan'); c.eff(true, c);
    dealDamageToPlayer(5, en);
    resolveEndBlock();
    __ok('⑦ 卸甲 D 满6溢出转回格挡(余7盾→3层全溢出→3盾)不清零', g.block === 3 && g.endBlockKind === null && en.curse === 6, 'block=' + g.block);

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

    // 武僧：基础 1 点（卡）+ 首次触发 6 点（召唤）= 当回合 7 格挡（v0.61.36：5 → 7）
    g = __base('wuseng'); G.block = 0; c = __card('wutong'); c.eff(false, c);
    __ok('v0.58 五通神(武僧) 当回合 1+6=7 格挡（v0.61.36）', g.block === 7, 'block=' + g.block);
    // ⚠️ 隐式镜像：顶栏「下回合预格挡」走的是 summonTurnBlock，不走 eff —— 不同步就会两处不一致
    __ok('v0.61.36 五通神(武僧) summonTurnBlock=6 且顶栏预格挡=6（与 eff 同步）',
      summonTurnBlock(g.summons[0]) === 6 && preBlockNextTurn() === 6,
      'stb=' + summonTurnBlock(g.summons[0]) + ' pre=' + preBlockNextTurn());
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
    __ok('v0.60 五通神(天师) 当回合 +6格挡+1诅咒', g.block === 6 && __sumCurse() === 1, 'block=' + g.block + ' curse=' + __sumCurse());   // v0.61.35：立即/每回合格挡 4 → 6

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

    // #25 舍身：4 固定格挡（v0.61.36 武僧列 3/5 → 4/4，升级不再涨）
    g = __base('wuseng'); __fill(); __card('sheshen').eff(false, __card('sheshen'));
    var s3 = g.block;
    g = __base('wuseng'); __fill(); cc = Object.assign({}, __card('sheshen'), { up: true }); cc.eff(true, cc);
    __ok('v0.58 B#25 舍身 4/4 格挡（v0.61.36：3/5 → 4 固定）', s3 === 4 && g.block === 4, s3 + '/' + g.block);

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

    // #31 燃血术：B 失去 8（v0.61.36：6 → 8，两档同值；+2 符文不动）
    g = __base('wuseng'); cc = __card('ranxue'); cc.eff(false, cc);
    __ok('v0.58 B#31 燃血术 失去 8 点生命', g.hp === 52 && g.energy === 11, 'hp=' + g.hp + ' energy=' + g.energy);
    __ok('v0.58 B#31 燃血术 卡面写 8', __card('ranxue').t(false).indexOf('失去 8 点生命') >= 0, __card('ranxue').t(false));

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
    __ok('v0.58 B#39 附灵术 2 个→6 / 升级 1 个→3（v0.61.36：每触发 1 个固定 3）', fl3 === 6 && g.block === 3, fl3 + '/' + g.block);

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
    __ok('v0.58 B#40 镇妖铃 赶尸人预览 10/15（v0.61.37 升级 16 → 15）',
      previewDamage(__card('zhenyaoling')).d === 10 && previewDamage(Object.assign({}, __card('zhenyaoling'), { up: true })).d === 15,
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
    __ok('#2 火符A 弃掉鬼怪牌 +2 尸气（v0.61.37 1 → 2）',
      G.尸气 === 2 && G.huofuSelect === null && G.discard.some(function (c) { return c.id === 'zhiren'; }),
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
    __ok('#2 火符A 升级 弃鬼怪牌 +3 尸气（v0.61.37 2 → 3）', G.尸气 === 3, '尸气=' + G.尸气);

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
    var flB = Object.assign({}, __card('fuling'), { up: true }); // 不改共享卡对象
    __ok('#39 附灵术(武僧) 2 费 / 升级 1 费 + 非消耗牌（v0.61.36：2 → 2/1）',
      cardCost(fl) === 2 && cardCost(flB) === 1 && isOneUse(fl) === false,
      'cost=' + cardCost(fl) + ' up=' + cardCost(flB) + ' oneUse=' + isOneUse(fl));

    g = __base('tianshi');
    var flU = Object.assign({}, __card('fuling'), { up: true }); // 不改共享卡对象
    __ok('#39 附灵术(天师) 2 费 / 升级 1 费',
      cardCost(fl) === 2 && cardCost(flU) === 1 && isOneUse(fl) === false,
      'cost=' + cardCost(fl) + ' up=' + cardCost(flU) + ' oneUse=' + isOneUse(fl));

    g = __base('ganshiren');
    __ok('#39 附灵术(赶尸人) 不可升级', canUpgrade(__card('fuling')) === false);

    // ---- #38 移形换影：v0.61.37 A 列改 1/1（取消 (U:0)）→ 升级档不再有「0 符文」后缀，改核尸气 1/3 ----
    g = __base('ganshiren');
    var yx = __card('yixing');
    __ok('#38 移形换影 A 1/1：费用升级前后都是 1（cardCost/effectiveCost 双路径）',
      cardCost(yx) === 1 && cardCost(Object.assign({}, yx, { up: true })) === 1 &&
      effectiveCost(Object.assign({}, yx, { up: true })) === 1,
      'cost=' + cardCost(yx) + ' upCost=' + cardCost(Object.assign({}, yx, { up: true })));
    __ok('#38 移形换影 A 文案分档 1/3 点【尸气】且已去掉「0 符文」',
      yx.t(false).indexOf('获得 1 点【尸气】') >= 0 && yx.t(true).indexOf('获得 3 点【尸气】') >= 0 &&
      yx.t(true).indexOf('0 符文') < 0,
      yx.t(false) + ' || ' + yx.t(true));

    // ---- 需求⑤ 预览键补齐：镇妖铃 / 咒雨 / 尸王 ----
    g = __base('ganshiren'); g.尸气 = 5;
    __ok('⑤ 预览 咒雨 = 尸气 5 × 5 = 25（v0.61.37 每层 6 → 5）', previewDamage(__card('zhouyu')).d === 25, JSON.stringify(previewDamage(__card('zhouyu'))));
    g.尸气 = 0;
    __ok('⑤ 预览 咒雨 无尸气→miss',
      (function () { var p = previewDamage(__card('zhouyu')); return !!p && p.raw === 0 && p.miss === '无尸气'; })(),
      JSON.stringify(previewDamage(__card('zhouyu'))));

    g = __base('ganshiren');
    __ok('⑤ 预览 镇妖铃 赶尸人 = 10/15（v0.61.37 升级 16 → 15）',
      previewDamage(__card('zhenyaoling')).d === 10 && previewDamage(Object.assign({}, __card('zhenyaoling'), { up: true })).d === 15,
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

    // #45 五通神：立即 1 + 首次 6 = 7（两档同值），之后每回合开始 6（v0.61.36 武僧列）
    g = __base('wuseng'); g.block = 0; c = __card('wutong'); c.eff(false, c);
    var wb = g.block, wv = g.summons[0].v;
    g = __base('wuseng'); g.block = 0; c = Object.assign({}, __card('wutong'), { up: true }); c.eff(true, c);
    __ok('v0.58 B#45 五通神 立即 7/7，之后每回合 6（v0.61.36：5/6 与 4 → 7 与 6）',
      wb === 7 && g.block === 7 && wv === 6 && g.summons[0].v === 6,
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
    __ok('v0.61.37 咒雨(赶尸人) 3 费（原 2 费；B 仍 0 费不受影响）', cardCost(__card('zhouyu')) === 3, 'cost=' + cardCost(__card('zhouyu')));
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

    /* —— 初始卡池（v0.61.35 换新：天师去佛渡/画皮、金刚符 1→2、加纸人）
          天师 D   ：雷符×3 金刚符×2 聚灵×1 渡魂归己×1 咒印×1 纸人×1 守一×1 = 10 张
          赶尸人 A ：雷符×2 金刚符×1 咒印×1 舍身×1 附灵术×1 纸人×1 尸王×1 守一×1 小鬼×1 五通神×1 = 11 张（v0.61.37 换新） —— */
    function deckOf(id) {
      var h = HEROES.filter(function (x) { return x.id === id; })[0];
      return { s: h.deck.map(function (p) { return p[0] + 'x' + p[1]; }).join(' '),
               n: h.deck.reduce(function (a, p) { return a + p[1]; }, 0) };
    }
    var dt_ = deckOf('tianshi'), ga_ = deckOf('ganshiren');
    __ok('v0.60.02 天师初始卡池 10 张且组成正确', dt_.n === 10 &&
      dt_.s === 'leifux3 jingangx2 julingx1 duhunguijix1 zhouyinx1 zhirenx1 shouyix1',
      dt_.n + ' 张 | ' + dt_.s);
    __ok('v0.61.37 赶尸人初始卡池 11 张且组成正确（金刚符 2→1、去佛渡/血契、加咒印/附灵术/五通神）', ga_.n === 11 &&
      ga_.s === 'leifux2 jingangx1 zhouyinx1 sheshenx1 fulingx1 zhirenx1 shi_wangx1 shouyix1 xiaoguix1 wutongx1',
      ga_.n + ' 张 | ' + ga_.s);
    __ok('v0.60.02 尸王只在赶尸人起始牌组（天师无）',
      ga_.s.indexOf('shi_wang') >= 0 && dt_.s.indexOf('shi_wang') < 0, ga_.s);
    __ok('v0.61.35 咒印/聚灵/渡魂归己/纸人/守一归天师；佛渡与画皮已退出天师初始牌组',
      dt_.s.indexOf('zhouyin') >= 0 && dt_.s.indexOf('juling') >= 0 &&
      dt_.s.indexOf('duhunguiji') >= 0 && dt_.s.indexOf('zhiren') >= 0 && dt_.s.indexOf('shouyi') >= 0 &&
      dt_.s.indexOf('huapi') < 0 && dt_.s.indexOf('fodu') < 0 &&
      ga_.s.indexOf('zhiren') >= 0 && ga_.s.indexOf('xiaogui') >= 0 && ga_.s.indexOf('sheshen') >= 0,
      dt_.s + ' || ' + ga_.s);

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
      kaitianyan: [1, 1], yixing: [1, 1], fuling: [2, 1], zhenyaoling: [2, 2], zhiren: [1, 1], zhouyin: [1, 1],   // v0.61.35：yixing 天师列取消 (U:0)
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

    /* —— 攻击 2：火符 6/10 + 1 层诅咒 + 弃 1 张（v0.61.35） —— */
    g = dt(); g.hand = [__card('huofu'), __card('leifu')];
    g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#2 火符 6 伤 + 1 层诅咒 + 弃 1 张（2 张→打出 1+弃 1=0）',
      g.enemies[0].hp === 494 && g.enemies[0].curse === 1 && g.hand.length === 0,
      'ehp=' + g.enemies[0].hp + ' curse=' + g.enemies[0].curse + ' hand=' + g.hand.length);
    g = dt(); g.hand = [dup('huofu'), __card('leifu')];
    g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#2u 火符升级 10 伤', g.enemies[0].hp === 490, 'ehp=' + g.enemies[0].hp);

    /* —— 攻击 3：剑符 10/15，诅咒≥3 层则消耗 3 层并翻倍（v0.61.35） —— */
    g = dt(); g.enemies[0].curse = 3;
    g.hand = [__card('jianfu')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#3 剑符 10×2=20 伤，诅咒 3→0',
      g.enemies[0].hp === 480 && g.enemies[0].curse === 0,
      'ehp=' + g.enemies[0].hp + ' curse=' + g.enemies[0].curse);
    g = dt(); g.enemies[0].curse = 2;
    g.hand = [__card('jianfu')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#3 剑符 诅咒 2 层 → 10 伤不翻倍', g.enemies[0].hp === 490 && g.enemies[0].curse === 2, 'ehp=' + g.enemies[0].hp);

    /* —— 攻击 5：天雷正法 22/32，每 2 层诅咒 -1 费、结算后失去减免×2（v0.61.35） —— */
    g = dt(); g.enemies[0].curse = 5;
    g.hand = [__card('tianlei')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#5 天雷正法 22 伤，诅咒 5→1（减免 2 层×2）',
      g.enemies[0].hp === 478 && g.enemies[0].curse === 1,
      'ehp=' + g.enemies[0].hp + ' curse=' + g.enemies[0].curse);
    g = dt(); g.enemies[0].curse = 0;
    g.hand = [dup('tianlei')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#5u 天雷正法升级 32 伤', g.enemies[0].hp === 468, 'ehp=' + g.enemies[0].hp);

    /* —— 攻击 6：万剑归宗 全体 14/18 + 施加 1/2 层诅咒 + 斩杀回 1 费（v0.61.35） —— */
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
    __ok('v0.60 D#6u 万剑归宗升级 全体 18 伤 + 每人 2 层诅咒',
      g.enemies[0].hp === 482 && __sumCurse() === 4, 'e0=' + g.enemies[0].hp + ' curse=' + __sumCurse());

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

    /* —— 攻击 9：群鬼乱舞 6/9 + 每层诅咒 +1（上限 +4/+6）（v0.61.35） —— */
    g = dt(); g.enemies[0].curse = 3;
    g.hand = [__card('qungui')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#9 群鬼乱舞 6+3=9 伤（不消耗诅咒）',
      g.enemies[0].hp === 491 && g.enemies[0].curse === 3,
      'ehp=' + g.enemies[0].hp + ' curse=' + g.enemies[0].curse);
    g = dt(); g.enemies[0].curse = 6;
    g.hand = [dup('qungui')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#9u 群鬼乱舞 9+min(6,6)=15 伤（上限 +6）', g.enemies[0].hp === 485, 'ehp=' + g.enemies[0].hp);

    /* —— 攻击 11：蚀魂咒 3/8 + 2 层诅咒（v0.61.35：天师列由 v0.61.10 P5 的 4/7 改回 3/8） —— */
    g = dt(); g.hand = [__card('shihunzhou')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#11 蚀魂咒 3 伤 + 2 层诅咒（v0.61.35 天师列 3/8）',
      g.enemies[0].hp === 497 && g.enemies[0].curse === 2,
      'ehp=' + g.enemies[0].hp + ' curse=' + g.enemies[0].curse);

    /* —— 攻击 12：嗜血 6/8 吸血 50%，目标诅咒≥2 层则消耗 2 层改 100%（v0.61.35：阈值 3→2） —— */
    g = dt(40); g.enemies[0].curse = 3;
    g.hand = [__card('shixue')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#12 嗜血 诅咒3层 → 只耗2层、6伤回6血',
      g.enemies[0].hp === 494 && g.hp === 46 && g.enemies[0].curse === 1,
      'ehp=' + g.enemies[0].hp + ' hp=' + g.hp + ' curse=' + g.enemies[0].curse);
    g = dt(40); g.enemies[0].curse = 1;   // v0.61.35：阈值降到 2 层，改用 1 层测「不足阈值」分支
    g.hand = [__card('shixue')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#12 嗜血 诅咒1层 → 保留诅咒、6伤回3血',
      g.hp === 43 && g.enemies[0].curse === 1, 'hp=' + g.hp + ' curse=' + g.enemies[0].curse);

    /* —— 攻击 13：百鬼夜行 全体 8 + 每层 +1/+2，并消耗各自全部诅咒（v0.61.35） —— */
    g = __base('tianshi'); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500;
    g.enemies[1].hp = 500; g.enemies[1].maxHp = 500;
    g.enemies[0].curse = 3; g.enemies[1].curse = 0;
    g.hand = [__card('baigui')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#13 百鬼夜行 8+3=11 / 8 伤且清空诅咒',
      g.enemies[0].hp === 489 && g.enemies[1].hp === 492 && __sumCurse() === 0,
      'e0=' + g.enemies[0].hp + ' e1=' + g.enemies[1].hp + ' curse=' + __sumCurse());

    /* —— 攻击 14：钟馗镇魂 主伤 16 固定 + 引爆全部诅咒（每层 3/4）+ 消耗牌（v0.61.35） —— */
    g = dt(); g.enemies[0].curse = 2;
    g.hand = [__card('zhongkui')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#14 钟馗镇魂 16+2×3=22 伤且清空诅咒（v0.61.35：18/24+5/6 → 16+3/4）',
      g.enemies[0].hp === 478 && g.enemies[0].curse === 0 && g.enemies[0].seal === true,
      'ehp=' + g.enemies[0].hp + ' curse=' + g.enemies[0].curse + ' seal=' + g.enemies[0].seal);

    /* —— 防御 15~22 —— */
    g = __base('tianshi'); CURSE_THIS_TURN = 3;
    c = __card('jingang'); c.eff(false, c);
    __ok('v0.60 D#15 金刚符 5+1×3=8 格挡', g.block === 8, 'block=' + g.block);
    g = __base('tianshi'); CURSE_THIS_TURN = 3;
    c = dup('jingang'); c.eff(true, c);
    __ok('v0.60 D#15u 金刚符升级 7+2×3=13 格挡', g.block === 13, 'block=' + g.block);
    g = __base('tianshi'); CURSE_THIS_TURN = 3;
    c = __card('jinguang'); c.eff(false, c);
    __ok('v0.60 D#17 金光罩 12+3=15 格挡', g.block === 15, 'block=' + g.block);
    g = __base('tianshi'); g.drawPile = [__card('huofu')]; g.hand = []; g.discard = [];
    c = __card('yinshen'); c.eff(false, c);
    __ok('v0.60 D#16 隐身符 抽到诅咒牌 3+3=6 格挡', g.block === 6, 'block=' + g.block);
    g = __base('tianshi'); g.drawPile = [__card('huofu')]; g.hand = []; g.discard = [];
    c = dup('yinshen'); c.eff(true, c);
    __ok('v0.60 D#16u 隐身符升级 5+4=9 格挡', g.block === 9, 'block=' + g.block);
    g = __base('tianshi'); c = __card('tongpi'); c.eff(false, c);
    __ok('v0.60 D#21 铜皮铁骨 9 格挡 + 受击施 1 层诅咒', g.block === 9 && g.hitCurse === 1,
      'block=' + g.block + ' hitCurse=' + g.hitCurse);
    g = __base('tianshi'); c = dup('tongpi'); c.eff(true, c);
    __ok('v0.60 D#21u 铜皮铁骨升级 14 格挡', g.block === 14, 'block=' + g.block);
    g = __base('tianshi'); c = __card('fanzhen'); c.eff(false, c);
    __ok('v0.60 D#22 反震 反击 3 伤 + 1 层诅咒（不给格挡）',
      g.thorns === 3 && g.hitCurse === 1 && g.hitBlock === 0 && g.block === 0,
      'thorns=' + g.thorns + ' hitCurse=' + g.hitCurse + ' hitBlock=' + g.hitBlock);
    g = __base('tianshi'); c = dup('fanzhen'); c.eff(true, c);
    __ok('v0.60 D#22u 反震升级 反击 4 伤、诅咒 2 层（v0.61.35）', g.thorns === 4 && g.hitCurse === 2,
      'thorns=' + g.thorns + ' hitCurse=' + g.hitCurse);

    /* —— 功能 28：血契 天师 1/2（赶尸人仍是 2/3） —— */
    g = __base('tianshi'); c = __card('xueqi'); c.eff(false, c);
    __ok('v0.60 D#28 血契(天师) 每失 1 血 +1 格挡', g.bloodPact === 1, 'pact=' + g.bloodPact);
    g = __base('tianshi'); c = dup('xueqi'); c.eff(true, c);
    __ok('v0.60 D#28u 血契(天师) 升级每失 1 血 +2 格挡', g.bloodPact === 2, 'pact=' + g.bloodPact);
    g = __base('ganshiren'); c = __card('xueqi'); c.eff(false, c);
    __ok('v0.60 A#28 血契(赶尸人) 仍为每失 1 血 +2 格挡', g.bloodPact === 2, 'pact=' + g.bloodPact);

    /* —— 功能 40：镇妖铃 10/15；【诅咒】≥4 层才消耗 4 层、镇魂 2 回合（v0.61.35） —— */
    g = dt(); g.enemies[0].curse = 2;
    g.hand = [dup('zhenyaoling')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#40 镇妖铃升级 15 伤 + 诅咒<4 层仅镇魂 1 回合',
      g.enemies[0].hp === 485 && g.enemies[0].seal === true && g.enemies[0].sealTurn === 1,
      'ehp=' + g.enemies[0].hp + ' seal=' + g.enemies[0].seal + ' sealTurn=' + g.enemies[0].sealTurn);
    g = dt(); g.enemies[0].curse = 4;
    g.hand = [dup('zhenyaoling')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.61.35 D#40 镇妖铃 诅咒≥4 层 → 消耗 4 层、镇魂 2 回合',
      g.enemies[0].hp === 485 && g.enemies[0].curse === 0 && g.enemies[0].seal === true && g.enemies[0].sealTurn === 2,
      'ehp=' + g.enemies[0].hp + ' curse=' + g.enemies[0].curse + ' sealTurn=' + g.enemies[0].sealTurn);

    /* —— 功能 46：咒雨 固定 1 层（升级不加层）；费用下限 1→升级 0 —— */
    g = __base('tianshi'); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500;
    g.enemies[1].hp = 500; g.enemies[1].maxHp = 500;
    g.hand = [__card('zhouyu')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#46 咒雨 未升级也只施加 1 层/敌', __sumCurse() === 2, 'curse=' + __sumCurse());
    g = __base('tianshi'); g.enemies[0].curse = 6; g.enemies[1].curse = 6;
    __ok('v0.60 D#46 咒雨 未升级费用下限 1', effectiveCost(__card('zhouyu')) === 1, 'cost=' + effectiveCost(__card('zhouyu')));
    __ok('v0.60 D#46u 咒雨 升级费用下限 0', effectiveCost(dup('zhouyu')) === 0, 'cost=' + effectiveCost(dup('zhouyu')));

    /* —— 召唤 41：纸人 每回合末 2/3 伤 **并施加 1/2 层【诅咒】**（v0.61.35 去掉旧「带诅咒增伤」） —— */
    g = dt(); g.hand = [__card('zhiren')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#41 纸人 基础每回合 2 伤', g.summons[0] && g.summons[0].v === 2,
      'v=' + (g.summons[0] && g.summons[0].v));
    g = dt(); g.summons = [{ type: 'zhiren', v: 2, dur: 2, up: false }];
    summonAct(g.summons[0]);
    __ok('v0.61.35 D#41 纸人 回合末 2 伤 + 施 1 层【诅咒】',
      g.enemies[0].hp === 498 && g.enemies[0].curse === 1,
      'ehp=' + g.enemies[0].hp + ' curse=' + g.enemies[0].curse);
    g = dt(); g.summons = [{ type: 'zhiren', v: 3, dur: 2, up: true }];
    summonAct(g.summons[0]);
    __ok('v0.61.35 D#41u 纸人升级 3 伤 + 施 2 层【诅咒】',
      g.enemies[0].hp === 497 && g.enemies[0].curse === 2,
      'ehp=' + g.enemies[0].hp + ' curse=' + g.enemies[0].curse);

    /* —— 召唤 45：五通神 立即 6 格挡 + 1 诅咒（v0.61.35：天师列 4→6） —— */
    g = __base('tianshi'); G.block = 0;
    g.hand = [dup('wutong')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#45 五通神 立即 6 格挡 + 1 诅咒、升级剩 3 回合',
      g.block === 6 && __sumCurse() === 1 && g.summons[0].dur === 2,
      'block=' + g.block + ' curse=' + __sumCurse() + ' dur=' + g.summons[0].dur);

    /* —— 召唤 43：小鬼 天师列 2/3；目标改**随机**，命中带【诅咒】则本击 +2/3（v0.61.35） —— */
    g = dt(); g.hand = [__card('xiaogui')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#43 小鬼 每回合 2 伤', g.summons[0] && g.summons[0].v === 2, 'v=' + (g.summons[0] && g.summons[0].v));
    g = dt(); g.enemies[0].curse = 1; g.summons = [{ type: 'xiaogui', v: 2, dur: 2, up: false }];
    summonAct(g.summons[0]);
    __ok('v0.61.35 D#43 小鬼(天师) 命中带【诅咒】目标 2+2=4 伤',
      g.enemies[0].hp === 496, 'ehp=' + g.enemies[0].hp);
    g = dt(); g.summons = [{ type: 'xiaogui', v: 3, dur: 2, up: true }];
    summonAct(g.summons[0]);
    __ok('v0.61.35 D#43u 小鬼升级 命中无诅咒目标 3 伤（不加成）',
      g.enemies[0].hp === 497, 'ehp=' + g.enemies[0].hp);

    /* —— v0.61.35 守一(#26)天师列：保留【诅咒牌】→ **该牌自身**下回合 -1 费，只持续一回合 —— */
    g = __base('tianshi');
    var _syCurse = Object.assign({}, __card('huofu')), _syPlain = Object.assign({}, __card('jingang'));
    var _turn0 = g.turn || 0;
    g.hand = [_syCurse, _syPlain]; g.retainSelect = { need: 1, picked: [0, 1] };
    g.enemies.forEach(function (x) { x.hp = 0; });   // 关掉 enemyAct 的干扰，只测保留结算
    confirmRetainSelect();
    __ok('v0.61.35 守一(天师) 只给保留到的【诅咒牌】挂减免时间戳（普通牌不挂）',
      _syCurse.costCutTurn === _turn0 + 1 && !_syPlain.costCutTurn,
      'curse=' + _syCurse.costCutTurn + ' plain=' + _syPlain.costCutTurn);
    g.turn = _turn0;
    __ok('v0.61.35 守一(天师) 结算当回合不减费（下一回合才生效）',
      effectiveCost(_syCurse) === cardCost(_syCurse), 'cost=' + effectiveCost(_syCurse));
    g.turn = _turn0 + 1;
    __ok('v0.61.35 守一(天师) 下回合该牌自身 -1 费',
      effectiveCost(_syCurse) === cardCost(_syCurse) - 1, 'cost=' + effectiveCost(_syCurse));
    __ok('v0.61.35 守一(天师) 同批保留的普通牌不跟着减费（只减该牌自己）',
      effectiveCost(_syPlain) === cardCost(_syPlain), 'cost=' + effectiveCost(_syPlain));
    g.turn = _turn0 + 2;
    __ok('v0.61.35 守一(天师) 只持续一回合（再下一回合恢复原价）',
      effectiveCost(_syCurse) === cardCost(_syCurse), 'cost=' + effectiveCost(_syCurse));
    g.turn = _turn0 + 3;
    var _syFree = Object.assign({}, __card('juling'), { costCutTurn: _turn0 + 3 });
    __ok('v0.61.35 守一(天师) 减费不低于 0（0 费牌挂上标记仍是 0）',
      cardCost(_syFree) === 0 && effectiveCost(_syFree) === 0, 'cost=' + effectiveCost(_syFree));
    g = dt(); g.turn = 1;
    var _syOnce = Object.assign({}, __card('juling'), { costCutTurn: 1 });
    g.hand = [_syOnce]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.61.35 守一(天师) 减免是一次性的：打出即清标记（同回合再回手不会二次减免）',
      !_syOnce.costCutTurn, 'flag=' + _syOnce.costCutTurn);

    /* —— v0.61.35 佛渡 / 燃血术：两张「按列分叉」的牌逐列钉住 —— */
    var FD = __card('fodu');
    __base('ganshiren'); var _fdA = FD.t(true);
    __base('wuseng'); var _fdB = FD.t(true);
    __base('yincha'); var _fdC = FD.t(true);
    __base('tianshi'); var _fdT = FD.t(true);
    __ok('v0.61.35/36 佛渡 升级附加：天师 5 格挡 / 阴差 3 格挡 / 武僧 5 格挡 / 赶尸人 2 尸气',
      _fdT.indexOf('5 点格挡') >= 0 && _fdC.indexOf('3 点格挡') >= 0 &&
      _fdB.indexOf('5 点格挡') >= 0 && _fdA.indexOf('2 点【尸气】') >= 0,
      _fdT + ' | ' + _fdC + ' | ' + _fdB + ' | ' + _fdA);
    var RX = __card('ranxue');
    __base('ganshiren'); var _rxA = [RX.t(false), RX.t(true)];
    __base('wuseng'); var _rxB = [RX.t(false), RX.t(true)];
    __base('yincha'); var _rxC = [RX.t(false), RX.t(true)];
    __base('tianshi'); var _rxT = [RX.t(false), RX.t(true)];
    __ok('v0.61.35 燃血术 天师列固定失 8 点生命（升级不再减到 3）',
      _rxT[0].indexOf('失去 8 点生命') >= 0 && _rxT[1].indexOf('失去 8 点生命') >= 0,
      _rxT.join(' / '));
    __ok('v0.61.37 燃血术 A 列 4 → 8（与武僧同值）；B 8/8、C 4/6 不动',
      _rxA[0].indexOf('失去 8 点生命') >= 0 && _rxA[1].indexOf('失去 8 点生命') >= 0 &&
      _rxB[0].indexOf('失去 8 点生命') >= 0 && _rxB[1].indexOf('失去 8 点生命') >= 0 &&
      _rxC[0].indexOf('失去 4 点生命') >= 0 && _rxC[1].indexOf('失去 6 点生命') >= 0,
      _rxA.join('/') + ' | ' + _rxB.join('/') + ' | ' + _rxC.join('/'));

    /* —— v0.61.36 武僧（B 列 / 苦僧）8 条改动的反误伤核对 ——
       本批所有改动都写成 `G.hero==='wuseng'` 分叉或按列常量，A/C/D 三列应逐字不变；
       这里把「没被动过」钉死，免得下次谁顺手把 else 兜底改了没人发现。 */
    (function () {
      // 荆棘符：A 反弹 6/4（本批只动武僧），C 走 hitHeal、D 走 hitCurse —— thorns 都不该有值
      var jA0 = (function () { var g2 = __base('ganshiren'); var cc = __card('jingji'); cc.eff(false, cc); return g2.thorns; })();
      var jA1 = (function () { var g2 = __base('ganshiren'); var cc = Object.assign({}, __card('jingji'), { up: true }); cc.eff(true, cc); return g2.thorns; })();
      var jC = (function () { var g2 = __base('yincha'); var cc = __card('jingji'); cc.eff(false, cc); return { t: g2.thorns, h: g2.hitHeal }; })();
      var jD = (function () { var g2 = __base('tianshi'); var cc = __card('jingji'); cc.eff(false, cc); return { t: g2.thorns, c: g2.hitCurse }; })();
      __ok('v0.61.36 反误伤 荆棘符 赶尸人仍反弹 4/6、阴差仍 hitHeal=2、天师仍 hitCurse=1',
        jA0 === 4 && jA1 === 6 && jC.h === 2 && !jC.t && jD.c === 1 && !jD.t,
        'A=' + jA0 + '/' + jA1 + '（未升级/升级） C=' + jC.h + ' D=' + jD.c);

      // 佛渡 eff 的 fb 三元：武僧 5 / 天师 5 / 阴差 3（赶尸人走上面的尸气分支，不给格挡）
      function fdBlock(h, up) {
        var g2 = __base(h); g2.block = 0;
        var cc = Object.assign({}, __card('fodu'), { up: !!up }); cc.eff(!!up, cc);
        return g2.block;
      }
      __ok('v0.61.36 反误伤 佛渡 升级附加格挡逐列：武僧 5 / 天师 5 / 阴差 3 / 赶尸人 0',
        fdBlock('wuseng', true) === 5 && fdBlock('tianshi', true) === 5 &&
        fdBlock('yincha', true) === 3 && fdBlock('ganshiren', true) === 0,
        [fdBlock('wuseng', true), fdBlock('tianshi', true), fdBlock('yincha', true), fdBlock('ganshiren', true)].join('/'));

      // 舍身 eff：只有武僧给格挡 —— A 给尸气、C 只抽牌、D 只施咒，三列 block 都该是 0
      function ssBlock(h, up) {
        var g2 = __base(h); g2.block = 0; __fill();
        var cc = Object.assign({}, __card('sheshen'), { up: !!up }); cc.eff(!!up, cc);
        return g2.block;
      }
      __ok('v0.61.36 反误伤 舍身 格挡只有武僧列有：B 4/4、A/C/D 恒 0',
        ssBlock('wuseng', false) === 4 && ssBlock('wuseng', true) === 4 &&
        ssBlock('ganshiren', false) === 0 && ssBlock('yincha', true) === 0 && ssBlock('tianshi', false) === 0,
        [ssBlock('wuseng', false), ssBlock('wuseng', true), ssBlock('ganshiren', false), ssBlock('yincha', true), ssBlock('tianshi', false)].join('/'));

      // 附灵术 费用逐列：A 0 费（消耗）／B 2→1／C 2／D 2→1
      var flU2 = function () { return Object.assign({}, __card('fuling'), { up: true }); };
      __base('ganshiren'); var _fA0 = cardCost(__card('fuling'));
      __base('wuseng');    var _fB = [cardCost(__card('fuling')), cardCost(flU2())];
      __base('yincha');    var _fC = [cardCost(__card('fuling')), cardCost(flU2())];
      __base('tianshi');   var _fD = [cardCost(__card('fuling')), cardCost(flU2())];
      __ok('v0.61.36 反误伤 附灵术 费用逐列：A 0（消耗）／B 2/1／C 2/2／D 2/1',
        _fA0 === 0 && _fB[0] === 2 && _fB[1] === 1 && _fC[0] === 2 && _fC[1] === 2 &&
        _fD[0] === 2 && _fD[1] === 1,
        'A=' + _fA0 + ' B=' + _fB + ' C=' + _fC + ' D=' + _fD);

      // 五通神 立即格挡：武僧 7（本批）／天师 6／阴差 0（走回血）／赶尸人 0（走尸气分支）
      function wtBlock(h, up) {
        var g2 = __base(h); g2.block = 0;
        var cc = Object.assign({}, __card('wutong'), { up: !!up }); cc.eff(!!up, cc);
        return g2.block;
      }
      // 阴差走回血（heal 5，不给格挡）、赶尸人走尸气分支但召唤自身仍给 5 格挡（老断言 :782 即 +5格挡）
      __ok('v0.61.36 反误伤 五通神 立即格挡：武僧 7（本批）/ 天师 6 / 赶尸人 5 / 阴差 0',
        wtBlock('wuseng', false) === 7 && wtBlock('tianshi', false) === 6 &&
        wtBlock('ganshiren', false) === 5 && wtBlock('yincha', false) === 0,
        [wtBlock('wuseng', false), wtBlock('tianshi', false), wtBlock('ganshiren', false), wtBlock('yincha', false)].join('/'));
      // 五通神「每回合开始」值：武僧 6（本批）／天师 6
      var wtU = function (h) {
        var g2 = __base(h); var cc = Object.assign({}, __card('wutong'), { up: true }); cc.eff(true, cc);
        return summonTurnBlock(g2.summons[0]);
      };
      // 注意：summonTurnBlock / preBlockNextTurn 第一行就是 `if(G.hero!=='wuseng') return 0` ——
      // 它是**武僧专用**函数（天师的每回合格挡走 wutongTick，不经过这里）。
      __ok('v0.61.36 五通神 每回合开始格挡：武僧 6（4 → 6）；summonTurnBlock 对非武僧恒 0（函数契约）',
        wtU('wuseng') === 6 && wtU('tianshi') === 0 &&
        (__base('yincha'), summonTurnBlock({ type: 'wutong', v: 6, dur: 2, up: false }) === 0),
        'B=' + wtU('wuseng') + ' D=' + wtU('tianshi'));
    })();

    /* —— 卡面预伤害（诅咒/格挡浮动牌恒定显示） —— */
    g = dt(); g.enemies[0].curse = 3;
    __ok('v0.60 D 预伤害 雷符 6+3=9 且常显', previewDamage(__card('leifu')).d === 9 && previewDamage(__card('leifu')).dynamic === true,
      'd=' + previewDamage(__card('leifu')).d);
    __ok('v0.60 D 预伤害 群鬼乱舞 6+3=9', previewDamage(__card('qungui')).d === 9, 'd=' + previewDamage(__card('qungui')).d);
    __ok('v0.60 D 预伤害 百鬼夜行 8+3=11', previewDamage(__card('baigui')).d === 11, 'd=' + previewDamage(__card('baigui')).d);
    __ok('v0.60 D 预伤害 钟馗镇魂 16+3×3=25（v0.61.35）', previewDamage(__card('zhongkui')).d === 25, 'd=' + previewDamage(__card('zhongkui')).d);
    __ok('v0.60 D 预伤害 斩妖剑 10+2×5=20（v0.61.35）', previewDamage(__card('zhanyaojian')).d === 20, 'd=' + previewDamage(__card('zhanyaojian')).d);
    __ok('v0.60 D 预伤害 噬魂术 3×5=15', previewDamage(__card('shihun')).d === 15, 'd=' + previewDamage(__card('shihun')).d);
    g.block = 4;
    __ok('v0.60 D 预伤害 铁布衫 4+3=7', previewDamage(__card('tiebushan')).d === 7, 'd=' + previewDamage(__card('tiebushan')).d);
    __ok('v0.61.35 D 预伤害 纸人 恒为 2（去掉带诅咒增伤后，预览=基础每回合伤）', previewDamage(__card('zhiren')).d === 2, 'd=' + previewDamage(__card('zhiren')).d);
    __ok('v0.60 D 预伤害 咒雨 无直伤 → 不挂徽章', previewDamage(__card('zhouyu')) === null,
      JSON.stringify(previewDamage(__card('zhouyu'))));
    // 注意：这里用的是 CARDS 里的共享单例（此刻 up=false），所以是未升级的 10×2=20
    __ok('v0.60 D 预伤害 剑符(未升级) 诅咒≥3 → 20 且常显（v0.61.35：10×2）', previewDamage(__card('jianfu')).d === 20 && previewDamage(__card('jianfu')).dynamic === true,
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
    __ok('v0.61 B7 确认弃牌后才结算伤害（5 伤）+ 鬼怪牌 2 尸气（v0.61.37）',
      e.hp === 55 && G.尸气 === 2 && G.huofuSelect === null, 'hp=' + e.hp + ' 尸气=' + G.尸气);

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
    __ok('v0.61.37 蚀魂咒 A 列 3/6 → 4/8；天师 3/8、B 5/7、C 5/8 不动',
      _a[0].indexOf('4 伤害') >= 0 && _a[1].indexOf('8 伤害') >= 0 &&
      _b[0].indexOf('5 伤害') >= 0 && _b[1].indexOf('7 伤害') >= 0 &&
      _c[0].indexOf('5 伤害') >= 0 && _c[1].indexOf('8 伤害') >= 0 &&
      _d[0].indexOf('3 伤害') >= 0 && _d[1].indexOf('8 伤害') >= 0,
      _d.join(' / '));
    var ZK = __card('zhongkui');
    __base('ganshiren'); var _e = ZK.t(false);
    __base('wuseng'); var _f = ZK.t(false);
    __base('yincha'); var _i = ZK.t(false);
    __base('tianshi'); var _j = [ZK.t(false), ZK.t(true)];
    __ok('v0.61.35 钟馗镇魂 天师列改为主伤 16 固定 + 每层 3/4，其余三列不动',
      _e.indexOf('16 伤害') >= 0 && _f.indexOf('16 伤害') >= 0 && _i.indexOf('16 伤害') >= 0 &&
      _j[0].indexOf('16 伤害') >= 0 && _j[0].indexOf('每层 3 伤害') >= 0 &&
      _j[1].indexOf('16 伤害') >= 0 && _j[1].indexOf('每层 4 伤害') >= 0,
      _j.join(' / '));

    /* —— v0.61.37：v0.61.10 P6 的「4 种召唤物寿命 +1」被动**已删除**（换成「每消耗 1 尸气回 1 血」）。
          寿命偏移的唯一来源没了 → A 列 dur 从此与**卡面完全一致**，与非赶尸人英雄逐字相同。
          注意：id 用**卡牌 id**（阴兵是 yinbingguo，'yinbing' 只是召唤物 type）；
          BASE 是「打出后立即看到的 dur」——五通神现形当回合会走一次 wutongTick，所以是 1 不是 2。 */
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
      if (!sm || sm.dur !== base) badLife.push('A ' + id + ':' + (sm && sm.dur) + '≠' + base + '（被动已删，应与基准相同）');
    });
    __ok('v0.61.37 删掉寿命+1 被动后：A 列 纸人/小鬼/五通神/阴兵 dur 与卡面（非赶尸人）完全一致', badLife.length === 0, badLife.join(' '));

    g = __base('ganshiren'); g.尸气 = 10;
    var sw = __card('shi_wang'); sw.eff(false, sw);
    var sw2 = g.summons[g.summons.length - 1];
    __ok('v0.61.10 P6 尸王 不受被动影响（不是「役使」）', sw2 && sw2.dur === 5, 'dur=' + (sw2 && sw2.dur));

    // 升级阴兵本就不加 dur（卡面 3/3），旧被动删除后仍是 3
    g = __base('ganshiren'); g.尸气 = 0;
    var ybg = __card('yinbingguo'); ybg.eff(true, ybg);
    __ok('v0.61.37 升级阴兵 dur 仍为 3（卡面不变；旧被动 +1 已删）',
      g.summons.every(function (s) { return s.dur === 3; }) && g.summons.length === 3,
      JSON.stringify(g.summons.map(function (s) { return s.dur; })));

    var __pa = HEROES.filter(function (h) { return h.id === 'ganshiren'; })[0].passive;
    __ok('v0.61.37 英雄被动文案改为「每消耗 1 点【尸气】，回复 1 点生命」',
      __pa.indexOf('每消耗 1 点【尸气】，回复 1 点生命') >= 0 &&
      __pa.indexOf('额外获得 1 回合寿命') < 0 && __pa.indexOf('尸王不受影响') < 0, __pa);
    __ok('v0.61.37 关键词【召唤寿命】已删掉「寿命 +1」尾句（词条本身保留）',
      KEYWORDS.some(function (k) { return k[0] === '召唤寿命' && k[1].indexOf('尸王不受影响') < 0; }));
    __ok('v0.61.37 关键词新增【预尸气】',
      KEYWORDS.some(function (k) { return k[0] === '预尸气' && k[1].indexOf('召唤物') >= 0 && k[1].indexOf('死亡返还') >= 0; }));

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
    __ok('v0.61.10 未勾选项 P4 荆棘无上限叠加（3 次 × 3 = 9，未被钳制；v0.61.36 武僧列每层 4 → 3）', G.thorns === 9, 'thorns=' + G.thorns);
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

    /* ===== v0.61.25 音效金快照探针（分发表重写的等价性红线） =====
       打桩 tone/boom，记录每个键名的「调用序列」（步骤类型 + 全部实参）。
       与改造前的快照逐条比对：序列必须完全一致，参数个数也必须一致
       （旧代码里 tone 有 4/5/7 参三种叫法，转发时不能用默认值填充）。 */
    globalThis.__probeSfx = function (keys) {
      var K = keys || ['card', 'error', 'block', 'death', 'hit', 'hurt',
                       'heal', 'gold', 'relic', 'win', 'lose', 'boss'];
      var _t = tone, _b = boom, out = {}, log = [], i;
      var _snd = SETTINGS.sound, _vol = SETTINGS.sfxVol;
      tone = function () { log.push(['t'].concat(Array.prototype.slice.call(arguments))); };
      boom = function () { log.push(['b'].concat(Array.prototype.slice.call(arguments))); };
      try {
        SETTINGS.sound = true; SETTINGS.sfxVol = 1;  // 探针不受设置开关/音量影响
        for (i = 0; i < K.length; i++) { log.length = 0; __realSfx(K[i]); out[K[i]] = log.slice(); }
      } finally {
        SETTINGS.sound = _snd; SETTINGS.sfxVol = _vol; tone = _t; boom = _b; // 无论如何都要还原
      }
      return out;
    };
    globalThis.__G12 = function () { return globalThis.__probeSfx(); };
    globalThis.__ALLKEYS = function () { return (typeof SFX_KEYS !== 'undefined') ? SFX_KEYS.slice() : null; };

    /* ===== v0.61.25 音效金快照断言：分发表重写的「零行为变更」红线 =====
       __GOLD 是改造前（switch 版）打桩 tone/boom 采到的真实调用序列，
       存档见 _patch/sfx_golden_v61_24.json（12 键 / 27 步）。
       只要这块绿着，就证明「switch → 分发表」没动过任何一条现有音效的听感参数 ——
       包括参数个数（旧代码 tone 有 4/5/7 参三种叫法，转发时不能用默认值填充）。 */
    var __GOLD = {"card":[["t",360,0.06,"triangle",0.18],["b",0.04,0.12,4000,800]],"error":[["t",200,0.12,"square",0.18,0,120]],"block":[["t",300,0.09,"triangle",0.16,0,500]],"death":[["b",0.3,0.4,1200,100],["t",160,0.18,"sawtooth",0.18,0,60]],"hit":[["b",0.14,0.5,2000,160],["t",150,0.12,"square",0.2,0,70]],"hurt":[["b",0.22,0.6,1400,110],["t",110,0.2,"sawtooth",0.25,0,55]],"heal":[["t",520,0.16,"sine",0.14,0,760]],"gold":[["t",880,0.1,"sine",0.16],["t",1320,0.12,"sine",0.14,0.06]],"relic":[["t",660,0.12,"sine",0.18],["t",990,0.16,"sine",0.14,0.08]],"win":[["b",0.3,0.4,2000,300],["t",523,0.16,"triangle",0.16,0],["t",659,0.16,"triangle",0.16,0.1],["t",784,0.16,"triangle",0.16,0.2],["t",1047,0.16,"triangle",0.16,0.30000000000000004]],"lose":[["b",0.4,0.45,1500,120],["t",400,0.2,"sawtooth",0.14,0],["t",300,0.2,"sawtooth",0.14,0.13],["t",220,0.2,"sawtooth",0.14,0.26],["t",150,0.2,"sawtooth",0.14,0.39]],"boss":[["b",0.42,0.5,800,110],["t",120,0.34,"sawtooth",0.22,0,58]]};
    (function () {
      var now = globalThis.__probeSfx() || {};
      var gk = Object.keys(__GOLD), i, diffs = [], steps = 0;
      for (i = 0; i < gk.length; i++) {
        var k = gk[i];
        var a = JSON.stringify(now[k]), b = JSON.stringify(__GOLD[k]);
        if (a !== b) diffs.push(k);
        steps += (__GOLD[k] || []).length;
      }
      __ok('v0.61.25 金快照 · 覆盖 12 键 / 27 步（探针自检）', gk.length === 12 && steps === 27,
        'keys=' + gk.length + ' steps=' + steps);
      for (i = 0; i < gk.length; i++) {
        var kk = gk[i];
        var aa = JSON.stringify(now[kk]), bb = JSON.stringify(__GOLD[kk]);
        __ok('v0.61.25 金快照 · ' + kk + ' 调用序列未变', aa === bb,
          aa === bb ? '' : ('now=' + aa + ' gold=' + bb));
      }
      __ok('v0.61.25 金快照 · 12 键整体一致', diffs.length === 0, diffs.join(','));
    })();

    /* ===== v0.61.25 音效包：分发表 / 采样通路 / 高频接线 ===== */
    (function () {
      var i, j, k, s, ok, got, missing, bad, steps;

      /* ① 分发表完整性：70 键，每步参数都齐 */
      __ok('v0.61.25 音效表 70 键', SFX_KEYS.length === 70, 'n=' + SFX_KEYS.length);
      bad = [];
      for (i = 0; i < SFX_KEYS.length; i++) {
        k = SFX_KEYS[i]; steps = SFX_TABLE[k];
        if (!steps || !steps.length) { bad.push(k + ':空'); continue; }
        for (j = 0; j < steps.length; j++) {
          s = steps[j];
          if (s[0] === 't') { if (typeof s[1] !== 'number' || typeof s[2] !== 'number' || s[3] == null || typeof s[4] !== 'number') bad.push(k + ':t参'); }
          else if (s[0] === 'b') { if (typeof s[1] !== 'number' || typeof s[2] !== 'number' || typeof s[3] !== 'number' || typeof s[4] !== 'number') bad.push(k + ':b参'); }
          else if (s[0] === 'n') { if (!(s[1] && s[1].length) || typeof s[2] !== 'number' || typeof s[4] !== 'number' || typeof s[5] !== 'number') bad.push(k + ':n参'); }
          else bad.push(k + ':未知步型' + s[0]);
        }
      }
      __ok('v0.61.25 音效表每步参数完整（无 undefined / 无未知步型）', bad.length === 0, bad.slice(0, 6).join(','));

      /* ② 70 键逐个调用不抛错、且都真的产出声音（探针空序列 = 哑键） */
      var threw = [], gp;
      for (i = 0; i < SFX_KEYS.length; i++) { try { __realSfx(SFX_KEYS[i]); } catch (e) { threw.push(SFX_KEYS[i]); } }
      __ok('v0.61.25 70 键在无 WebAudio 下逐个调用不抛错', threw.length === 0, threw.join(','));
      gp = globalThis.__probeSfx(SFX_KEYS);
      var silent = [];
      for (i = 0; i < SFX_KEYS.length; i++) if (!(gp[SFX_KEYS[i]] || []).length) silent.push(SFX_KEYS[i]);
      __ok('v0.61.25 70 键全部有声音（无哑键）', silent.length === 0, silent.join(','));

      /* ③ 未知键名：静默忽略 + 只记一次（runner 把 SETTINGS.sound 关了，得先顶开） */
      var _snU = SETTINGS.sound, _svU = SETTINGS.sfxVol, _eU = null;
      var _cw = console.warn, _warns = 0;
      console.warn = function () { _warns++; };        // 顺手接住 warn，别让它污染 _sm.json
      SETTINGS.sound = true; SETTINGS.sfxVol = 1;   // 音量闸门在查表之前，不顶开就看不到未知键
      try { __realSfx('__no_such_key__'); __realSfx('__no_such_key__'); }
      catch (e) { _eU = String((e && e.message) || e); }
      SETTINGS.sound = _snU; SETTINGS.sfxVol = _svU; console.warn = _cw;
      __ok('v0.61.25 未知键名静默忽略不抛错', _eU === null, _eU || '');
      __ok('v0.61.25 未知键名只 warn 一次（连调两次仍 1 次）', _warns === 1 && _sfxWarned['__no_such_key__'] === 1,
        'warns=' + _warns + ' flag=' + _sfxWarned['__no_such_key__']);

      /* ④ bug A 回归：sfxVol=0 必须真静音。
         不能用 __probeSfx —— 它为金快照故意把 sfxVol 顶成 1，正好绕开这条。自己打桩 tone/boom。 */
      var _sv = SETTINGS.sfxVol, _sn = SETTINGS.sound;
      var _t0 = tone, _b0 = boom, _tc = 0, _bc = 0, _eA = null;
      tone = function () { _tc++; }; boom = function () { _bc++; };
      SETTINGS.sound = true; SETTINGS.sfxVol = 0;
      try { __realSfx('hit'); __realSfx('card'); __realSfx('win'); }
      catch (e) { _eA = String((e && e.message) || e); }
      var _t0c = _tc, _b0c = _bc;                    // 正对照：把音量开回来必须出声
      SETTINGS.sfxVol = 1;
      try { __realSfx('win'); } catch (e) { _eA = String((e && e.message) || e); }
      SETTINGS.sfxVol = _sv; SETTINGS.sound = _sn; tone = _t0; boom = _b0;
      __ok('v0.61.25 bugA：探针是活的（sfxVol=1 时确实出声）',
        _tc > _t0c || _bc > _b0c, 'tone=' + _tc + ' boom=' + _bc);
      __ok('v0.61.25 bugA：sfxVol=0 时 tone/boom 零调用（旧写法 0||1 会 100% 播放）',
        _t0c === 0 && _b0c === 0 && _eA === null,
        'tone=' + _t0c + ' boom=' + _b0c + ' err=' + _eA);

      /* ⑤ bug B 回归：扩展名真相源含 .m4a，音效/BGM 同集合 */
      __ok('v0.61.25 bugB：AUD_EXTS 含 .m4a', AUD_EXTS.indexOf('.m4a') >= 0, AUD_EXTS.join(','));
      __ok('v0.61.25 bugB：BGM_EXTS 与 AUD_EXTS 同集合（只差顺序）',
        AUD_EXTS.slice().sort().join(',') === BGM_EXTS.slice().sort().join(','),
        AUD_EXTS.join(',') + ' vs ' + BGM_EXTS.join(','));

      /* ⑥ 第二参数缺省 → rate 1（40 个旧调用点未破坏）；clamp 边界 */
      __ok('v0.61.25 sfxRate 缺省=1', sfxRate() === 1 && sfxRate(null) === 1 && sfxRate({}) === 1 && sfxRate(0) === 1);
      __ok('v0.61.25 sfxRate 直接传数字也认', sfxRate(1.1) === 1.1);
      __ok('v0.61.25 sfxDamageRate 下限（0 伤）', sfxDamageRate(0) === SFX_RATE_MIN);
      __ok('v0.61.25 sfxDamageRate 上限（999 伤）', sfxDamageRate(999) === SFX_RATE_MAX);
      __ok('v0.61.25 sfxDamageRate 单调不减', sfxDamageRate(1) <= sfxDamageRate(5) && sfxDamageRate(5) <= sfxDamageRate(12));

      /* ⑦ 打击层分级 */
      __ok('v0.61.25 pickHitSfx 分级（轻/重/暴击/斩杀/格挡）',
        pickHitSfx(3, false, false) === 'hit_light' && pickHitSfx(12, false, false) === 'hit_heavy'
        && pickHitSfx(30, false, false) === 'hit_crit' && pickHitSfx(3, false, true) === 'hit_crit'
        && pickHitSfx(0, true, false) === 'hit_guard');

      /* ⑧ 采样通路：无 WebAudio 时安全跳过；无 buffer 不假装播了 */
      __ok('v0.61.25 采集状态结构正确',
        (function () { var r = sfxSamples(); return !!r && r.mode === 'auto' && r.keys === 0 && r.loaded === false && r.loading === false; })());
      __ok('v0.61.25 无 AudioContext 时 loadSfxSamples 安全返回',
        (function () { var old = sfxMode; sfxMode = 'sample'; try { loadSfxSamples(); return sfxSamples().keys === 0 && SFX_LOADING === false; } catch (e) { return false; } finally { sfxMode = old; } })());
      __ok('v0.61.25 playSample 无采样时返回 false（优雅回退合成）', playSample('hit_light', 1) === false);

      /* ⑨ 命名与路径：键名_变体号，mp3 优先，且不会串到别的键 */
      var cands = sfxCandidates('hit_light');
      __ok('v0.61.25 采样路径命名符合规范',
        cands.indexOf('sfx/hit_light.mp3') >= 0 && cands.indexOf('sfx/hit_light_1.mp3') >= 0
        && cands.indexOf('sfx/hit_light_2.mp3') >= 0 && cands.indexOf('sfx/hit_light_3.mp3') >= 0,
        cands.slice(0, 8).join(' '));
      __ok('v0.61.25 sfxCandidates 不越界到别的键',
        cands.filter(function (p) { return p.indexOf('hit_light') < 0; }).length === 0);
      __ok('v0.61.25 file:// 下 sampleURL 不做无谓请求',
        (SFX_PROTO === 'file:') ? sampleURL('sfx/hit_light.mp3') === null : true, 'proto=' + SFX_PROTO);

      /* ⑩ 节流：同键间隔内第二次不出声 */
      _sfxGate['__gate__'] = 0;
      __ok('v0.61.25 sfxOnce 首次出声', sfxOnce('__gate__', 80) === true);
      __ok('v0.61.25 sfxOnce 同帧第二次被节流', sfxOnce('__gate__', 80) === false);

      /* ⑪ 高频接线：打桩 sfx 记录键名，验证真的接在调用点上 */
      function __rec(fn) {
        var list = [], _s = sfx;
        sfx = function (n) { list.push(n); };
        try { fn(); } finally { sfx = _s; }
        return list;
      }
      __ok('v0.61.25 接线·抽牌 → card_draw',
        __rec(function () { G = __base('ganshiren'); G.drawPile = [__card('leifu')]; drawCards(1); }).indexOf('card_draw') >= 0);
      __ok('v0.61.25 接线·施咒 → card_curse',
        __rec(function () { G = __base('tianshi'); applyCurse(G.enemies[0], 2); }).indexOf('card_curse') >= 0);
      _sfxGate['card_shiji'] = 0;   // 整份冒烟 <120ms，闸门会被前面既有用例点着
      __ok('v0.61.25 接线·尸气 → card_shiji',
        __rec(function () { G = __base('ganshiren'); gainShiqi(2); }).indexOf('card_shiji') >= 0);
      __ok('v0.61.25 接线·尸气没涨就不出声',
        (function () { _sfxGate['card_shiji'] = 0;
          return __rec(function () { G = __base('ganshiren'); G.尸气 = G.maxShiQi || 12; gainShiqi(2); }).indexOf('card_shiji') < 0; })());
      __ok('v0.61.25 接线·真伤 → atk_true',
        __rec(function () { G = __base('tianshi'); G.hp = 60; directDamage(8, '真伤'); }).indexOf('atk_true') >= 0);
      __ok('v0.61.25 接线·全局点击音 → ui_click',
        (function () {
          var list = __rec(function () { onDocClick({ target: { closest: function () { return {}; } } }); });
          return list.indexOf('ui_click') >= 0;
        })(), 'ok');
      __ok('v0.61.25 接线·点空白不出点击音',
        (function () {
          var list = __rec(function () { onDocClick({ target: { closest: function () { return null; } } }); });
          return list.indexOf('ui_click') < 0;
        })());

      /* 打击层分级接线（轻/重/暴击/格挡/连击段） */
      function __hitKey(dmg, block, point) {
        return __rec(function () {
          G = __base('tianshi');
          var e = G.enemies[0]; e.hp = 500; e.maxHp = 500; e.block = block || 0; e.kind = 'ghost';
          dealDamageTo(e, dmg, false, 0, !!point);
        });
      }
      got = __hitKey(3, 0);    __ok('v0.61.25 接线·轻击 → hit_light', got.indexOf('hit_light') >= 0, got.join(','));
      got = __hitKey(12, 0);   __ok('v0.61.25 接线·重击 → hit_heavy', got.indexOf('hit_heavy') >= 0, got.join(','));
      got = __hitKey(40, 0);   __ok('v0.61.25 接线·高伤 → hit_crit', got.indexOf('hit_crit') >= 0, got.join(','));
      got = __hitKey(3, 99);   __ok('v0.61.25 接线·全被格挡 → hit_guard', got.indexOf('hit_guard') >= 0, got.join(','));
      got = __hitKey(1, 0, 1); __ok('v0.61.25 接线·连击逐段 → atk_multi_each', got.indexOf('atk_multi_each') >= 0, got.join(','));

      /* 反伤 / 受击 / 格挡吃满的连击段 */
      got = __rec(function () { G = __base('wuseng'); G.thorns = 3; G.enemies[0].hp = 99; dealDamageToPlayer(5, G.enemies[0]); });
      __ok('v0.61.25 接线·反震 → thorns', got.indexOf('thorns') >= 0, got.join(','));
      __ok('v0.61.25 接线·玩家受击 → hurt', got.indexOf('hurt') >= 0, got.join(','));
      got = __rec(function () { G = __base('wuseng'); G.hp = 60; G.block = 99; dealDamageToPlayer(4, G.enemies[0], 0, { multi: true }); });
      __ok('v0.61.25 接线·格挡吃满的连击段仍出 enemy_multi', got.indexOf('enemy_multi') >= 0, got.join(','));

      /* 敌人出招：逐意图类型验声 */
      function __intentKey(type, extra) {
        return __rec(function () {
          G = __base('ganshiren'); G.hp = 200;
          var e = G.enemies[0]; e.hp = 200; e.maxHp = 200; e.block = 0;
          var it = { type: type, v: 3, n: 1 };
          for (var kk in (extra || {})) it[kk] = extra[kk];
          e.intents = [it]; e.intents2 = null; e.intentIndex = 0; e.intent = it;
          __realEnemyAct();   // 全局 enemyAct 已被 runner stub，必须调真身
        });
      }
      /* v0.61.32：weak / gouhun / yehuo 按素材清单.md 拆成专属键；
         jiming（判官王生死簿记账）在 v0.61.25 时整段静默、根本没进这张表，一并补上。 */
      var IMAP = { attack: 'enemy_attack', multi: 'enemy_multi', charge: 'enemy_charge', block: 'enemy_block',
                   heal: 'enemy_heal', strength: 'enemy_strength', summon: 'enemy_summon', weak: 'kw_weak',
                   gouhun: 'kw_gouhun', discard: 'enemy_debuff', burn: 'enemy_debuff', wangyou: 'enemy_debuff',
                   yehuo: 'boss_yehuo', jiming: 'boss_ledger', qingsuan: 'enemy_qingsuan', dormant: 'enemy_dormant' };
      missing = [];
      for (k in IMAP) {
        got = __intentKey(k);
        if (got.indexOf(IMAP[k]) < 0) missing.push(k + '→' + IMAP[k]);
      }
      __ok('v0.61.32 接线·16 种敌人出招各有其声（v0.61.32 拆键后）', missing.length === 0, missing.join(' '));
      got = __intentKey('attackBlock', { v: 6, block: 5 });
      __ok('v0.61.25 接线·攻击+格挡 → enemy_attack 与 enemy_block 各一次',
        got.indexOf('enemy_attack') >= 0 && got.indexOf('enemy_block') >= 0, got.join(','));

      /* 二阶段 / 消耗 / 三选一·地图选点（后者无 DOM，只验调用点在位） */
      got = __rec(function () { G = __base('tianshi'); var e = G.enemies[0]; e.intents2 = e.intents; enterPhase2(e); });
      __ok('v0.61.25 接线·Boss 二阶段 → boss_phase2（不再蹭 relic）',
        got.indexOf('boss_phase2') >= 0 && got.indexOf('relic') < 0, got.join(','));
      got = __rec(function () { G = __base('tianshi'); G.hand = [__card('fodu')]; G.energy = 5; doPlayCard(0); });
      __ok('v0.61.25 接线·消耗牌 → card_exhaust', got.indexOf('card_exhaust') >= 0, got.join(','));
      /* 三选一 / 地图选点：下游要 DOM，把下游入口临时打桩后直接调 —— 验行为，不验源码文本
         （原先用 String(fn).indexOf 查源码，混淆产物里必然红，等于给产物冒烟白添两条噪音）。 */
      got = __rec(function () {
        var _g = goNext, _h = hideOverlay, _r = render, _s2 = saveRun, _u = updateGoldCompensation;
        goNext = hideOverlay = render = saveRun = updateGoldCompensation = function () {};
        try {
          G = __base('tianshi');
          G.rewardPicks = [__card('leifu')];
          pickReward(0);
        } finally {
          goNext = _g; hideOverlay = _h; render = _r; saveRun = _s2; updateGoldCompensation = _u;
        }
      });
      __ok('v0.61.25 接线·三选一翻牌 → ui_reward', got.indexOf('ui_reward') >= 0, got.join(','));

      got = __rec(function () { G = __base('tianshi'); G.mapRow = 0; G.mapPath = []; chooseNode(0); });
      __ok('v0.61.25 接线·地图选点 → ui_map', got.indexOf('ui_map') >= 0, got.join(','));
    })();


  /* ============ v0.61.30 复活后战斗能正常结算（B4 终局旗标回归） ============ */
  (function () {
    /* 复现路径：死亡 → 复活 → 打死最后一个敌人。此前 revive() 只清 G.dead，
       G.battleOver 留在 true，winFight() 被重入守卫挡掉 → 战斗永不结算（界面卡死）。 */
    G = __base('ganshiren'); __fresh();
    loseGame();
    var flagAfterLose = G.battleOver;
    revive();
    __ok('v0.61.30 前置：loseGame 确实置了 battleOver', flagAfterLose === true);
    __ok('v0.61.30 revive 后 battleOver 已清（不再卡死）', G.battleOver === false, 'battleOver=' + G.battleOver);
    __ok('v0.61.30 revive 后 dead 也已清（旧行为未破坏）', G.dead === false);

    // 行为验：复活后打死全部敌人，胜利结算要真的跑起来（battleResult 只有 winFight 尾段会写）
    G = __base('ganshiren'); __fresh();
    loseGame();
    revive();
    G.enemies.forEach(function (e) { e.hp = 0; });
    __ok('v0.61.30 前置：此刻已无存活敌人', aliveEnemies().length === 0);
    var threw = null;
    try { winFight(); } catch (e) { threw = e; }
    __ok('v0.61.30 winFight 不抛异常', threw === null, threw && threw.message);
    __ok('v0.61.30 复活后清场 → 胜利结算执行（不再被守卫吞掉）', !!G.battleResult, 'result=' + JSON.stringify(G.battleResult));
    __ok('v0.61.30 结算后 battleOver 重新置 true', G.battleOver === true);
  })();

  /* ============ v0.61.31 BGM 五轨路由 + 缺轨回退到基础轨 ============ */
  (function () {
    /* 1. 回退表本身：三条升级轨各有基础轨可退；三条基础轨不设项（没有可退的上级） */
    __ok('v0.61.31 BGM_FALLBACK 三条升级轨都有基础轨可退',
      BGM_FALLBACK.battle_elite === 'battle' && BGM_FALLBACK.battle_boss === 'battle' && BGM_FALLBACK.shop === 'map');
    __ok('v0.61.31 基础轨不设回退项（否则会自我递归）',
      !('menu' in BGM_FALLBACK) && !('map' in BGM_FALLBACK) && !('battle' in BGM_FALLBACK));

    /* 2. 战斗轨判定：Boss > 精英 > 普通 */
    __ok('v0.61.31 battleBgmFor：普通战 → battle',
      battleBgmFor([{ elite:false, boss:false }, { elite:false, boss:false }]) === 'battle');
    __ok('v0.61.31 battleBgmFor：含精英 → battle_elite',
      battleBgmFor([{ elite:false, boss:false }, { elite:true, boss:false }]) === 'battle_elite');
    __ok('v0.61.31 battleBgmFor：含 Boss → battle_boss（优先于精英）',
      battleBgmFor([{ elite:true, boss:false }, { elite:false, boss:true }]) === 'battle_boss');
    __ok('v0.61.31 battleBgmFor：空列表 / undefined 不抛错 → battle',
      battleBgmFor([]) === 'battle' && battleBgmFor(undefined) === 'battle' && battleBgmFor([null]) === 'battle');

    /* 3. 打包产物口径：ASSET_MAP 是权威清单 → 同步回退，不空转 4 次文件探测 */
    var __savA = ASSET_MAP;
    ASSET_MAP = { 'music/bgm_map.ogg': 'data:x', 'music/bgm_battle.ogg': 'data:x' };
    __ok('v0.61.31 缺 Boss 轨 → bgmTrackFor 退回 battle', bgmTrackFor('battle_boss') === 'battle');
    __ok('v0.61.31 缺精英轨 → bgmTrackFor 退回 battle', bgmTrackFor('battle_elite') === 'battle');
    __ok('v0.61.31 缺商店轨 → bgmTrackFor 退回 map', bgmTrackFor('shop') === 'map');
    __ok('v0.61.31 基础轨仍指向自己',
      bgmTrackFor('battle') === 'battle' && bgmTrackFor('map') === 'map' && bgmTrackFor('menu') === 'menu');
    ASSET_MAP = { 'music/bgm_map.ogg': 'data:x', 'music/bgm_battle_boss.mp3': 'data:x' };
    __ok('v0.61.31 交付了 Boss 轨 → 用它，且不挑扩展名（.mp3 也认）',
      bgmTrackFor('battle_boss') === 'battle_boss');
    __ok('v0.61.31 交付 Boss 轨不影响没交付的精英轨', bgmTrackFor('battle_elite') === 'battle');
    ASSET_MAP = __savA;

    /* 4. setBGM 打桩：CUR_BGM 记逻辑轨、实际请求走 bgmTrackFor */
    var __origStart = startBGM, __seen = [];
    startBGM = function (t) { __seen.push(t); };
    var __stubOK = (startBGM !== __origStart);
    __ok('v0.61.31 前置：startBGM 可被桩替换（冒烟里它本就被全局静音桩 __sil 换掉了，本组只验路由、不验真实播放）', __stubOK);
    if (__stubOK) {
      var __savB = ASSET_MAP;
      ASSET_MAP = { 'music/bgm_battle.ogg': 'data:x' };
      setBGM('battle_boss');
      __ok('v0.61.31 setBGM 记的是逻辑轨（CUR_BGM=battle_boss）', CUR_BGM === 'battle_boss');
      __ok('v0.61.31 缺 Boss 轨时实际只请求 battle（一次到位，不空转探测）',
        __seen.length === 1 && __seen[0] === 'battle', JSON.stringify(__seen));
      __seen = []; ASSET_MAP = { 'music/bgm_battle_boss.ogg': 'data:x' };
      setBGM('battle_boss');
      __ok('v0.61.31 有 Boss 轨时实际请求 battle_boss（素材到货即生效）',
        __seen.length === 1 && __seen[0] === 'battle_boss', JSON.stringify(__seen));
      ASSET_MAP = __savB;
      startBGM = __origStart;
    }

    /* 5. 端到端：真的开一场 Boss/精英/普通战，看 startBattle 请求了哪条轨。
       敌人 key 不写死 —— 从 ENEMIES 里现挑，挑不到就让上面的前置断言直接红。 */
    var __normalKey = Object.keys(ENEMIES).filter(function (k) {
      return !ENEMIES[k].elite && !ENEMIES[k].boss;
    })[0];
    var __eliteKey = Object.keys(ENEMIES).filter(function (k) { return ENEMIES[k].elite && !ENEMIES[k].boss; })[0];
    var __bossKey = Object.keys(ENEMIES).filter(function (k) { return ENEMIES[k].boss; })[0];
    __ok('v0.61.31 前置：ENEMIES 里普通/精英/Boss 三类都有可取样的 key',
      !!__normalKey && !!__eliteKey && !!__bossKey,
      'normal=' + __normalKey + ' elite=' + __eliteKey + ' boss=' + __bossKey);

    var __o2 = startBGM, __tracks = [];
    startBGM = function (t) { __tracks.push(t); };
    /* 本节每一条都必须**显式摆好 ASSET_MAP** —— 它决定 setBGM 是原样透传逻辑轨还是先退回基础轨。
       曾经这里没摆，于是同一组断言「源码树过、打包产物红」：源码树 ASSET_MAP=null（开发期透传），
       产物里 打包.py 注入了 ASSET_MAP 且用户还没交付那三首 → 正确退回 'battle' → 断言红。
       断言依赖了环境而不是被测逻辑，是写错了；现在三种情形各验一次。 */
    var __savE = ASSET_MAP;
    var __TRACKS_ALL = { 'music/bgm_battle.ogg': 'data:x',
      'music/bgm_battle_elite.ogg': 'data:x', 'music/bgm_battle_boss.ogg': 'data:x',
      'music/bgm_map.ogg': 'data:x', 'music/bgm_shop.ogg': 'data:x' };
    var __ONLY_BASE = { 'music/bgm_battle.ogg': 'data:x', 'music/bgm_map.ogg': 'data:x' };
    if (startBGM !== __o2 && __normalKey && __eliteKey && __bossKey) {
      var __stErr = null;
      function __startWith(keys, amap) {
        __tracks = [];
        ASSET_MAP = amap;
        try { G = __base('ganshiren'); __fresh(); startBattle(keys); }
        catch (e) { __stErr = e; }
        return __tracks[__tracks.length - 1];
      }
      /* (a) 逻辑轨 —— 与素材是否交付无关（这条是本节的地基，环境无关） */
      __startWith([__normalKey], __TRACKS_ALL);
      __ok('v0.61.31 前置：startBattle 在本沙箱跑得动（不抛异常）',
        __stErr === null, __stErr && __stErr.message);
      __ok('v0.61.31 普通战的逻辑轨 = battle（前置：该敌人确实非精英非Boss）',
        battleBgmFor(G.enemies) === 'battle' && G.enemies.every(function (e) { return !e.boss && !e.elite; }),
        'logic=' + battleBgmFor(G.enemies));
      __startWith([__eliteKey], __TRACKS_ALL);
      __ok('v0.61.31 精英战的逻辑轨 = battle_elite（前置：该敌人确实是精英）',
        battleBgmFor(G.enemies) === 'battle_elite' && G.enemies.some(function (e) { return e.elite; }),
        'logic=' + battleBgmFor(G.enemies));
      __startWith([__bossKey], __TRACKS_ALL);
      __ok('v0.61.31 Boss 战的逻辑轨 = battle_boss（前置：该敌人确实是 Boss）',
        battleBgmFor(G.enemies) === 'battle_boss' && G.enemies.some(function (e) { return e.boss; }),
        'logic=' + battleBgmFor(G.enemies));
      __startWith([__eliteKey, __normalKey], __TRACKS_ALL);
      __ok('v0.61.31 精英带小怪 → 逻辑轨仍是 battle_elite（不被小怪拉回普通轨）',
        battleBgmFor(G.enemies) === 'battle_elite', 'logic=' + battleBgmFor(G.enemies));

      /* (b) 端到端·三首都已交付 → startBattle 真的把升级轨交出去 */
      var __te = __startWith([__eliteKey], __TRACKS_ALL);
      __ok('v0.61.31 已交付精英轨时，startBattle 交出 battle_elite', __te === 'battle_elite', 'got=' + __te);
      var __tb = __startWith([__bossKey], __TRACKS_ALL);
      __ok('v0.61.31 已交付 Boss 轨时，startBattle 交出 battle_boss', __tb === 'battle_boss', 'got=' + __tb);

      /* (c) 端到端·只交付了基础轨（= 打包产物当下的真实情形）→ 必须退回，且不空转 */
      var __tfb = __startWith([__bossKey], __ONLY_BASE);
      __ok('v0.61.31 未交付 Boss 轨时，startBattle 退回 battle（回退在真实开战路径上生效）',
        __tfb === 'battle', 'got=' + __tfb);
      var __tfe = __startWith([__eliteKey], __ONLY_BASE);
      __ok('v0.61.31 未交付精英轨时，startBattle 退回 battle', __tfe === 'battle', 'got=' + __tfe);
      var __tnb = __startWith([__normalKey], __ONLY_BASE);
      __ok('v0.61.31 普通战不受回退影响，仍是 battle', __tnb === 'battle', 'got=' + __tnb);
    }
    ASSET_MAP = __savE;
    startBGM = __o2;

    /* 6. 开发期 file:// 口径（ASSET_MAP=null，无法预知磁盘上有什么）靠 tryNext 探测，
       探测耗尽后由 startBGM 退回基础轨。**这条分支在冒烟里验不了** —— runner 开头把
       startBGM / startSynthBGM / stopBGM 一起换成了静音桩 __sil（避免测试挂定时器、碰真 Audio），
       真实函数体在沙箱里不可达（实测 String(startBGM) === "function () {}"）。
       硬测只会得到一条恒假的断言，所以这里改成验**决策**：退到哪条轨由纯函数
       bgmFallbackFor 决定，它可验；`if(__fb) return startBGM(__fb)` 那行转发不可达，
       如实记在更新日志里，不假装验过。 */
    __ok('v0.61.31 bgmFallbackFor：三条升级轨 → 各自的基础轨',
      bgmFallbackFor('battle_elite') === 'battle' && bgmFallbackFor('battle_boss') === 'battle'
      && bgmFallbackFor('shop') === 'map');
    __ok('v0.61.31 bgmFallbackFor：基础轨返回 null（关键：否则 startBGM 会自我递归）',
      bgmFallbackFor('menu') === null && bgmFallbackFor('map') === null && bgmFallbackFor('battle') === null);
    __ok('v0.61.31 bgmFallbackFor：未知轨名返回 null（战斗中不抛错）', bgmFallbackFor('nope') === null);

    /* 跨路径一致性：打包期（bgmTrackFor 查 ASSET_MAP）与开发期（探测耗尽走 bgmFallbackFor）
       必须退到**同一条轨**，否则「打包能退、开发退不了」就是两条路径行为分叉。 */
    var __savC = ASSET_MAP;
    ASSET_MAP = {};   // 空清单 = 所有轨都查不到，等价于「全都没交付」
    var __fbList = ['battle_elite', 'battle_boss', 'shop'];
    var __diverged = __fbList.filter(function (t) { return bgmTrackFor(t) !== bgmFallbackFor(t); });
    ASSET_MAP = __savC;
    __ok('v0.61.31 两条路径退回目标一致（打包期 bgmTrackFor == 开发期 bgmFallbackFor）',
      __diverged.length === 0, '分歧的轨：' + JSON.stringify(__diverged));
  })();

  /* ================= v0.61.32：32 条 ⏳ 待接线音效全部接线 ================= */
  (function () {
    var got;
    /* __rec 在 v0.61.25 那一段里是**块内**声明的，跨不出来，这里自带一份 */
    function __rec(fn) {
      var list = [], _s = sfx;
      sfx = function (n) { list.push(n); };
      try { fn(); } finally { sfx = _s; }
      return list;
    }

    /* —— 1. 两张点名表的自洽性 —— 手写 28 条映射，写错一个 id 就是「永远不响」且不抛错 —— */
    var badCard = [], badVal = [];
    for (var cid in CARD_SFX) {
      if (!__card(cid)) badCard.push(cid);
      if (SFX_KEYS.indexOf(CARD_SFX[cid]) < 0) badVal.push(cid + '→' + CARD_SFX[cid]);
    }
    __ok('v0.61.32 CARD_SFX 的键都是真卡 id（没有拼错的卡）', badCard.length === 0, badCard.join(','));
    __ok('v0.61.32 CARD_SFX 的值都是真键名（没有拼错的音）', badVal.length === 0, badVal.join(','));
    var badRelic = [], badRVal = [];
    for (var rid in RELIC_SFX) {
      if (!RELICS.some(function (r) { return r.id === rid; })) badRelic.push(rid);
      if (SFX_KEYS.indexOf(RELIC_SFX[rid]) < 0) badRVal.push(rid + '→' + RELIC_SFX[rid]);
    }
    __ok('v0.61.32 RELIC_SFX 的键都是真遗物 id', badRelic.length === 0, badRelic.join(','));
    __ok('v0.61.32 RELIC_SFX 的值都是真键名', badRVal.length === 0, badRVal.join(','));
    __ok('v0.61.32 三类遗物音都真的用上了（铃/幡、符/笔/剑、镜/录/道心）',
      ['relic_bell', 'relic_fu', 'relic_mirror'].every(function (v) {
        for (var k in RELIC_SFX) if (RELIC_SFX[k] === v) return true;
        return false;
      }));
    __ok('v0.61.32 relicSfxFor：未分化的遗物退回通用 relic（聚宝盆/返魂香），空值也安全',
      relicSfxFor({ id: 'jubaopen' }) === 'relic' && relicSfxFor({ id: 'fanhunxiang' }) === 'relic'
      && relicSfxFor(null) === 'relic');
    __ok('v0.61.32 cardSfxFor：未点名的牌返回 null（不误响），空值也安全',
      cardSfxFor(__card('juling')) === null && cardSfxFor(__card('sheshen')) === null && cardSfxFor(null) === null);

    /* —— 2. 收口点：一处覆盖多张牌 —— */
    got = __rec(function () { G = __base('wuseng'); cardPlayWindow = true; gainBlock(5); cardPlayWindow = false; });
    __ok('v0.61.32 收口·出牌窗口内的格挡 → card_defense（防御牌起盾）',
      got.indexOf('card_defense') >= 0 && got.indexOf('block') < 0, got.join(','));
    got = __rec(function () { G = __base('wuseng'); gainBlock(5); });
    __ok('v0.61.32 收口·窗口外的格挡仍是通用 block（遗物/武僧被动/反震/五通神）—— block 没有退役',
      got.indexOf('block') >= 0 && got.indexOf('card_defense') < 0, got.join(','));
    got = __rec(function () { G = __base('ganshiren'); addSummon({ type: 'zhiren', dur: 2 }); });
    __ok('v0.61.32 收口·召唤己方 → card_summon（纸人/小鬼/五通神/阴兵/尸王/通灵/附灵术 的唯一入口）',
      got.indexOf('card_summon') >= 0, got.join(','));
    got = __rec(function () { G = __base('yincha'); G.xuenu = 0; gainRage(2); });
    __ok('v0.61.32 收口·血怒获取 → card_xuenu（阴差核心资源）', got.indexOf('card_xuenu') >= 0, got.join(','));
    got = __rec(function () { G = __base('yincha'); G.xuenu = G.maxXuenu; gainRage(2); });
    __ok('v0.61.32 收口·血怒满 10 层后不再出声（涨不上去就不该响）', got.indexOf('card_xuenu') < 0, got.join(','));
    got = __rec(function () { G = __base('ganshiren'); G.enemies[0].affixes = []; sealEnemy(G.enemies[0], 1); });
    __ok('v0.61.32 收口·镇魂成功 → card_zhenhun（镇妖铃与钟馗镇魂共用）', got.indexOf('card_zhenhun') >= 0, got.join(','));
    got = __rec(function () { G = __base('ganshiren'); G.enemies[0].affixes = [{ id: 'linghua', tier: 1 }]; sealEnemy(G.enemies[0], 1); });
    __ok('v0.61.32 收口·镇魂被灵化弹开 → kw_linghua，且不响成功音',
      got.indexOf('kw_linghua') >= 0 && got.indexOf('card_zhenhun') < 0, got.join(','));
    got = __rec(function () { G = __base('ganshiren'); G.enemies[0].affixes = []; charmEnemy(G.enemies[0], 0.5); });
    __ok('v0.61.32 收口·魅惑成功 → card_charm（画皮）', got.indexOf('card_charm') >= 0, got.join(','));
    got = __rec(function () { G = __base('ganshiren'); G.enemies[0].affixes = [{ id: 'linghua', tier: 1 }]; charmEnemy(G.enemies[0], 0.5); });
    __ok('v0.61.32 收口·魅惑被灵化弹开 → kw_linghua，且不响成功音',
      got.indexOf('kw_linghua') >= 0 && got.indexOf('card_charm') < 0, got.join(','));
    got = __rec(function () { G = __base('ganshiren'); G.hand = []; addJunkToHand(1); });
    __ok('v0.61.32 收口·怨气塞手牌 → kw_junk', got.indexOf('kw_junk') >= 0, got.join(','));
    got = __rec(function () { G = __base('ganshiren'); G.hand = [junkCard(), junkCard(), junkCard()]; addJunkToHand(1); });
    __ok('v0.61.32 收口·怨气已满 3 张时不响（只记一行日志）', got.indexOf('kw_junk') < 0, got.join(','));
    got = __rec(function () { G = __base('ganshiren'); G.hand = [__card('leifu')]; discardRandomHand(); });
    __ok('v0.61.32 收口·随机弃牌 → card_discard', got.indexOf('card_discard') >= 0, got.join(','));
    got = __rec(function () { G = __base('ganshiren'); G.hand = [__card('leifu')]; enemyRandomDiscard(); });
    __ok('v0.61.32 收口·敌人缠绕弃牌 → card_discard（原先蹭通用 card 音）',
      got.indexOf('card_discard') >= 0 && got.indexOf('card') < 0, got.join(','));

    /* —— 3. 关键词与状态 —— */
    got = __rec(function () { G = __base('ganshiren'); G.burn = 2; G.hp = 50; startTurn(); });
    __ok('v0.61.32 关键词·灼烧跳伤 → kw_burn', got.indexOf('kw_burn') >= 0, got.join(','));
    got = __rec(function () { G = __base('wuseng'); G.hand = [__card('leifu')]; G.wangyouPool = G.hand.slice(); drinkWangyou(0); });
    __ok('v0.61.32 关键词·忘忧饮下 → kw_wangyou（「奉汤」是 enemy_debuff，两者不同）',
      got.indexOf('kw_wangyou') >= 0, got.join(','));
    got = __rec(function () { G = __base('ganshiren'); var e = G.enemies[0]; e.hp = 50; e.maxHp = 50; e.block = 6; dealDamageTo(e, 6); });
    __ok('v0.61.32 关键词·格挡刚好被打光 → kw_shield_break（是「碎」不是「挡」）',
      got.indexOf('kw_shield_break') >= 0, got.join(','));
    got = __rec(function () { G = __base('ganshiren'); var e = G.enemies[0]; e.hp = 50; e.maxHp = 50; e.block = 9; dealDamageTo(e, 6); });
    __ok('v0.61.32 关键词·格挡没打光 → 不响 kw_shield_break', got.indexOf('kw_shield_break') < 0, got.join(','));
    got = __rec(function () { G = __base('ganshiren'); var e = G.enemies[0]; e.hp = 50; e.maxHp = 50; e.block = 0; dealDamageTo(e, 6); });
    __ok('v0.61.32 关键词·本来就没格挡 → 也不响 kw_shield_break', got.indexOf('kw_shield_break') < 0, got.join(','));
    got = __rec(function () {
      G = __base('ganshiren'); G.karmaFire = 2;
      var e = makeEnemy(ENEMIES['xiuluowang'], 'xiuluowang'); e.hp = 200; e.maxHp = 200; e.block = 0;
      G.enemies = [e]; G.target = 0; dealDamageTo(e, 5);
    });
    __ok('v0.61.32 关键词·业火反噬 → kw_yehuo（会响很多次的那个）', got.indexOf('kw_yehuo') >= 0, got.join(','));
    got = __rec(function () { G = __base('ganshiren'); var e = G.enemies[0]; e.hp = 10; e.maxHp = 50; e.affixes = [{ id: 'zaisheng', tier: 1 }]; e.intents = [{ type: 'dormant' }]; e.intent = e.intents[0]; __realEnemyAct(); });
    __ok('v0.61.32 关键词·再生词缀回血 → kw_regen', got.indexOf('kw_regen') >= 0, got.join(','));

    /* —— 4. 敌人词缀（E/F 组） —— */
    got = __rec(function () { G = __base('wuseng'); G.hp = 60; var e = G.enemies[0]; e.hp = 50; e.maxHp = 50; e.affixes = [{ id: 'judu', tier: 1 }]; dealDamageToPlayer(4, e); });
    __ok('v0.61.32 词缀·剧毒 → affix_proc（9 词缀里唯一没有独立音的那个）', got.indexOf('affix_proc') >= 0, got.join(','));
    got = __rec(function () { G = __base('wuseng'); G.hp = 60; var e = G.enemies[0]; e.hp = 50; e.maxHp = 50; e.affixes = [{ id: 'gouhun', tier: 1 }]; dealDamageToPlayer(4, e); });
    __ok('v0.61.32 词缀·勾魂 → kw_gouhun', got.indexOf('kw_gouhun') >= 0, got.join(','));
    got = __rec(function () { G = __base('wuseng'); G.hp = 60; var e = G.enemies[0]; e.hp = 50; e.maxHp = 50; e.affixes = [{ id: 'shixue', tier: 1 }]; dealDamageToPlayer(4, e); });
    __ok('v0.61.32 词缀·蚀血（敌人被动回血）→ kw_regen', got.indexOf('kw_regen') >= 0, got.join(','));

    /* —— 5. Boss 招牌机制 —— */
    /* 词缀「附上」那一刻 —— enemy_buff_self 在 v0.61.32 前只有 yehuo 一个调用点，
       本批 yehuo 改走 boss_yehuo 后它会被架空；而用户在盘上已经交付了
       enemy_buff_self_1.mp3，所以按素材清单第 24 条接到「词缀附上」这一点上，
       保证已交付的素材不会白发。 */
    /* rollAffixes：非无尽下第二幕起非精英带 1 条词缀（第一幕非精英 0 条），
       正好拿 act=2 / act=1 两种情形验「有词缀才响」。 */
    _sfxGate['enemy_buff_self'] = 0;   // 闸门会被前面既有用例点着，先清掉
    got = __rec(function () { G = __base('ganshiren'); G.act = 2; makeEnemy(ENEMIES['youhun'], 'youhun'); });
    __ok('v0.61.32 词缀「附上」那一刻 → enemy_buff_self（保证已交付素材不被架空）',
      got.indexOf('enemy_buff_self') >= 0, got.join(','));
    _sfxGate['enemy_buff_self'] = 0;
    got = __rec(function () { G = __base('ganshiren'); G.act = 1; makeEnemy(ENEMIES['youhun'], 'youhun'); });
    __ok('v0.61.32 无词缀的敌人不响 enemy_buff_self', got.indexOf('enemy_buff_self') < 0, got.join(','));

    got = __rec(function () { G = __base('ganshiren'); var e = makeEnemy(ENEMIES['xiebian'], 'xiebian'); e.hp = 200; e.maxHp = 200; G.enemies = [e]; G.target = 0; splitBoss(e); });
    __ok('v0.61.32 Boss·谢必安分化 → boss_split（原先蹭 relic 音）',
      got.indexOf('boss_split') >= 0 && got.indexOf('relic') < 0, got.join(','));
    got = __rec(function () { G = __base('ganshiren'); var e = makeEnemy(ENEMIES['panguanwang'], 'panguanwang'); e.hp = 200; e.maxHp = 200; e.intents = [{ type: 'jiming' }]; e.intent = e.intents[0]; G.enemies = [e]; G.target = 0; __realEnemyAct(); });
    __ok('v0.61.32 Boss·判官王生死簿记账 → boss_ledger（v0.61.25 时整段静默）', got.indexOf('boss_ledger') >= 0, got.join(','));
    got = __rec(function () { G = __base('ganshiren'); var e = makeEnemy(ENEMIES['xiuluowang'], 'xiuluowang'); e.hp = 200; e.maxHp = 200; e.intents = [{ type: 'yehuo' }]; e.intent = e.intents[0]; G.enemies = [e]; G.target = 0; __realEnemyAct(); });
    __ok('v0.61.32 Boss·修罗王业火附体 → boss_yehuo（从通用 buff 拆出）',
      got.indexOf('boss_yehuo') >= 0 && got.indexOf('enemy_buff_self') < 0, got.join(','));

    /* —— 6. 出牌时的逐张点名音（CARD_SFX 的唯一消费点，走真 doPlayCard） —— */
    var PLAY_CASES = [['leifu', 'atk_talisman'], ['zhanyaojian', 'atk_slash'], ['tiebushan', 'atk_blunt'],
                      ['baigui', 'atk_aoe'], ['kaitianyan', 'card_buff']];
    var playMiss = [];
    PLAY_CASES.forEach(function (pc) {
      var r = __rec(function () {
        G = __base('wuseng'); G.hp = 200; G.enemies[0].hp = 500; G.enemies[0].maxHp = 500;
        G.hand = [__card(pc[0])]; G.drawPile = []; G.discard = []; G.exhausted = []; G.block = 4;
        cardPlayWindow = true; doPlayCard(0); cardPlayWindow = false;
      });
      if (r.indexOf(pc[1]) < 0) playMiss.push(pc[0] + '→' + pc[1]);
    });
    __ok('v0.61.32 出牌·逐张点名音在真 doPlayCard 路径上生效（斩击/符咒/钝击/群伤/自我强化各一例）',
      playMiss.length === 0, playMiss.join(' '));
    /* 未点名的牌不该凭空多出一声 */
    got = __rec(function () {
      G = __base('wuseng'); G.hp = 200; G.enemies[0].hp = 500; G.enemies[0].maxHp = 500;
      G.hand = [__card('juling')]; G.drawPile = []; G.discard = []; G.exhausted = []; G.block = 4;
      cardPlayWindow = true; doPlayCard(0); cardPlayWindow = false;
    });
    var __csv = [];
    for (var __k in CARD_SFX) if (__csv.indexOf(CARD_SFX[__k]) < 0) __csv.push(CARD_SFX[__k]);
    __ok('v0.61.32 出牌·未点名的牌不响 CARD_SFX 里的任何键',
      __csv.every(function (k) { return got.indexOf(k) < 0; }), got.join(','));

    /* —— 7. UI 层 —— */
    got = __rec(function () { G = __base('ganshiren'); G.relicPicks = [RELICS.find(function (r) { return r.id === 'zhaohunfan'; })]; pickRelic(0); });
    __ok('v0.61.32 UI·拾取铃/幡类遗物 → relic_bell', got.indexOf('relic_bell') >= 0, got.join(','));
    got = __rec(function () { G = __base('ganshiren'); G.relicPicks = [RELICS.find(function (r) { return r.id === 'zhushabi'; })]; pickRelic(0); });
    __ok('v0.61.32 UI·拾取符/笔/剑类遗物 → relic_fu', got.indexOf('relic_fu') >= 0, got.join(','));
    got = __rec(function () { G = __base('ganshiren'); G.relicPicks = [RELICS.find(function (r) { return r.id === 'yinyangjing'; })]; pickRelic(0); });
    __ok('v0.61.32 UI·拾取镜/录类遗物 → relic_mirror', got.indexOf('relic_mirror') >= 0, got.join(','));
    got = __rec(function () { G = __base('ganshiren'); G.relicPicks = [RELICS.find(function (r) { return r.id === 'jubaopen'; })]; pickRelic(0); });
    __ok('v0.61.32 UI·拾取未分化的遗物 → 退回通用 relic', got.indexOf('relic') >= 0 && got.indexOf('relic_bell') < 0, got.join(','));
    got = __rec(function () { G = __base('ganshiren'); G.deck = [__card('leifu')]; forgeCard(0); });
    __ok('v0.61.32 UI·锻造升级 → ui_levelup（原先蹭 relic 音）',
      got.indexOf('ui_levelup') >= 0 && got.indexOf('relic') < 0, got.join(','));
    /* ui_unlock / ui_panel 这两个键的**调用点**在冒烟里不可达：runner 开头就把
       unlockBestiary / unlockAchievement / showOverlay / hideOverlay 整体换成了空函数
       （与 v0.61.31 的 startBGM 同一处境）。所以这里改成验**被抽出来的转发函数**：
       音对不对、抛不抛错都验得到；那四行 `unlockSfx()` / `overlaySfx()` 转发本身不可达，
       如实记在更新日志里，不假装验过。 */
    got = __rec(function () { unlockSfx(); });
    __ok('v0.61.32 UI·解锁音（图鉴条目与成就共用）→ ui_unlock', got.indexOf('ui_unlock') >= 0, got.join(','));
    got = __rec(function () { overlaySfx(); });
    __ok('v0.61.32 UI·面板开合音（showOverlay/hideOverlay 共用）→ ui_panel', got.indexOf('ui_panel') >= 0, got.join(','));
    got = __rec(function () { G = __base('ganshiren'); G.endless = true; G.endlessFloor = 2; nextEndlessLap(); });
    __ok('v0.61.32 UI·无尽攀塔过渡 → ui_endless', got.indexOf('ui_endless') >= 0, got.join(','));
  })();

  /* ============ v0.61.33：预伤口径 / 指向机制 / 洗髓经跨关 / 渡魂口径 ============ */
  (function () {
    /* —— A① 预伤按「拖拽所指的那只」算（用户报的「锁A拖B 显示9实际6」） —— */
    /* 注意：CARDS 里的是**共享单例**，本 runner 前面的 forgeCard 用例会把它的 up 置 true，
       所以这里一律显式写 up（与既有 lv()/up() 辅助同一做法），不然断言会读到脏值。 */
    var lf = Object.assign({}, __card('leifu'), { up: false });
    var lfU = Object.assign({}, __card('leifu'), { up: true });
    G = __base('tianshi'); G.enemies[0].curse = 2; G.enemies[1].curse = 0; G.target = 0;
    __ok('v0.61.33 A① 不带目标时预览=当前目标(带诅咒)6+3=9', previewDamage(lf).d === 9, 'd=' + previewDamage(lf).d);
    __ok('v0.61.33 A① 传显式目标(不带诅咒)→6（不再被锁定的那只带偏）',
      previewDamage(lf, G.enemies[1]).d === 6, 'd=' + previewDamage(lf, G.enemies[1]).d);
    __ok('v0.61.33 A① 显式目标=带诅咒那只仍是9，且不污染默认口径',
      previewDamage(lf, G.enemies[0]).d === 9 && previewDamage(lf).d === 9,
      previewDamage(lf, G.enemies[0]).d + '/' + previewDamage(lf).d);
    __ok('v0.61.33 A① 升级雷符同口径（拖到不带诅咒=9 / 带诅咒=9+4=13，v0.61.35 加成升到 +4）',
      previewDamage(lfU, G.enemies[1]).d === 9 && previewDamage(lfU, G.enemies[0]).d === 13,
      previewDamage(lfU, G.enemies[1]).d + '/' + previewDamage(lfU, G.enemies[0]).d);
    var sh = Object.assign({}, __card('shihun'), { up: false });
    G = __base('tianshi'); G.enemies[0].curse = 2; G.enemies[1].curse = 0; G.target = 0;
    __ok('v0.61.33 A① 「落空」分支也按显式目标判定（噬魂术拖到无诅咒身上）',
      previewDamage(sh, G.enemies[1]).miss === '无诅咒' && previewDamage(sh, G.enemies[0]).d === 10,
      JSON.stringify(previewDamage(sh, G.enemies[1])) + ' / d=' + previewDamage(sh, G.enemies[0]).d);
    G = __base('tianshi'); G.enemies[0].curse = 1; G.enemies[1].curse = 5; G.target = 0;
    var xg = Object.assign({}, __card('xiaogui'), { up: false });
    var ybg = Object.assign({}, __card('yinbingguo'), { up: false });
    __ok('v0.61.35 小鬼预览不再借用「诅咒最高」那只（天师目标已改随机）',
      previewDamage(xg, G.enemies[0]).curse === 1, 'curse=' + previewDamage(xg, G.enemies[0]).curse);
    __ok('v0.61.35 阴兵预览仍取「诅咒最高」那只（指向机制未变，防误伤）',
      previewDamage(ybg, G.enemies[0]).curse === 5, 'curse=' + previewDamage(ybg, G.enemies[0]).curse);

    /* —— A② 点击锁定与卡面预伤徽章已下线 —— */
    __ok('v0.61.33 A② selectTarget 已删除', typeof selectTarget === 'undefined', typeof selectTarget);
    G = __base('tianshi'); G.enemies[0].curse = 1;
    var hh = handCardHTML(__card('leifu'), false, 0, 1);
    __ok('v0.61.33 A② 卡面不再含预伤徽章类名',
      hh.indexOf('dmg-buff') < 0 && hh.indexOf('dmg-nerf') < 0 && hh.indexOf('dmg-plain') < 0
      && hh.indexOf('dmg-miss') < 0 && hh.indexOf('dmg-tag') < 0,
      hh.slice(0, 80));
    __ok('v0.61.33 A② 卡面其余信息仍在（费用/卡图/拖拽入口）',
      hh.indexOf('class="cost"') >= 0 && hh.indexOf('card/leifu.png') >= 0 && hh.indexOf('cardPointerDown') >= 0,
      hh.slice(0, 80));
    var eh = enemyPanelHTML(G.enemies[0], 0);
    __ok('v0.61.33 A② 敌人面板不再有 onclick=selectTarget', eh.indexOf('selectTarget') < 0, eh.slice(0, 100));
    __ok('v0.61.33 A② 敌人面板不再有 selected 类，仍带 data-uid（拖拽命中靠它）',
      eh.indexOf(' selected') < 0 && eh.indexOf('data-uid') >= 0, eh.slice(0, 100));

    /* —— B 箭头指向按机制判定 —— */
    G = __base('tianshi');
    __ok('v0.61.33 B 单体攻击牌要箭头（雷符/斩妖剑/天雷正法/铁布衫）',
      needsTarget(__card('leifu')) && needsTarget(__card('zhanyaojian'))
      && needsTarget(__card('tianlei')) && needsTarget(__card('tiebushan')));
    __ok('v0.61.33 B 打全体不要箭头（万剑归宗/百鬼夜行）',
      !needsTarget(__card('wanjian')) && !needsTarget(__card('baigui')));
    __ok('v0.61.33 B 补上要箭头的非攻击牌（钟馗镇魂/镇妖铃/画皮）',
      needsTarget(__card('zhongkui')) && needsTarget(__card('zhenyaoling')) && needsTarget(__card('huapi')),
      [needsTarget(__card('zhongkui')), needsTarget(__card('zhenyaoling')), needsTarget(__card('huapi'))].join(','));
    __ok('v0.61.33 B 防御/技能/无指向牌不要箭头（金刚咒/洗髓经/附灵术）',
      !needsTarget(__card('jingang')) && !needsTarget(__card('xisui')) && !needsTarget(__card('fuling')));
    G = __base('ganshiren');
    __ok('v0.61.33 B 咒印·赶尸人=拿尸气，不要箭头', !needsTarget(__card('zhouyin')));
    G = __base('wuseng');
    __ok('v0.61.33 B 咒印·武僧=给自己挂吸血，不要箭头', !needsTarget(__card('zhouyin')));
    G = __base('tianshi');
    __ok('v0.61.33 B 咒印·天师=定向施咒，要箭头', needsTarget(__card('zhouyin')));
    G = __base('yincha');
    __ok('v0.61.33 B 咒印·阴差=定向施咒，要箭头', needsTarget(__card('zhouyin')));

    /* —— C 数字素材接缝：没素材时走文字且不抛错 —— */
    __ok('v0.61.33 C 无素材时 numProbe() 判定不可用（文字回退）', numProbe() === false);
    var ferr = null;
    try { floatDamage('-9', '', null); floatDamage('+12', 'heal', null); } catch (e2) { ferr = e2; }
    __ok('v0.61.33 C floatDamage 在无素材时不抛错', ferr === null, ferr && ferr.message);

    /* —— v0.61.36 C2 数字图四档接缝（素材/num/{dmg,hurt,block,heal}/0-9.png） —— */
    __ok('v0.61.36 C2 kind → 目录名 映射四档齐全（空串 / to-player / block / heal）',
      numKind('') === 'dmg' && numKind('to-player') === 'hurt' &&
      numKind('block') === 'block' && numKind('heal') === 'heal' &&
      numKind(undefined) === 'dmg' && numKind('没见过的 kind') === 'dmg',
      [numKind(''), numKind('to-player'), numKind('block'), numKind('heal'), numKind('没见过的 kind')].join('/'));
    __ok('v0.61.36 C2 四档各自独立探测：无素材时四档全部判定不可用',
      numProbe('') === false && numProbe('to-player') === false &&
      numProbe('block') === false && numProbe('heal') === false,
      JSON.stringify(NUM_STATE));
    __ok('v0.61.36 C2 探测状态按档存（不是单一标量）',
      typeof NUM_STATE === 'object' && NUM_STATE !== null &&
      typeof NUM_IMG === 'object' && NUM_IMG !== null,
      typeof NUM_STATE);

    /* —— v0.61.36 C3 浮字结构：外层 .fx-dmg（位移）＋内层 .fx-in（抖动/闪烁） —— */
    // v0.61.36：跑到这里时 SETTINGS.lowSpec 已被前面某条测试留在 true，而 floatDamage 首行是 if(!fx())return;
    // 正好顺手把它钉住 —— 「流畅模式不建浮字」是**正确行为**，不是 bug
    (function () {
      var made = [], origCE = document.createElement, keepLow = SETTINGS.lowSpec;
      try {
        document.createElement = function (tag) { var el = origCE(tag); made.push(el); return el; };
        SETTINGS.lowSpec = true; floatDamage = __realFloatDamage;
        floatDamage('-25', '', null, { crit: true });
      } catch (e0) {} finally { document.createElement = origCE; SETTINGS.lowSpec = keepLow; floatDamage = __sil; }
      __ok('v0.61.36 C3 流畅模式（lowSpec）下 floatDamage 不建任何浮字节点（fx() 门槛生效）',
        made.length === 0, 'made=' + made.length);
    })();

    var __made = [], __origCE = document.createElement, __keepFD = floatDamage, __keepLow = SETTINGS.lowSpec;
    var __fdErr = null;
    try {
      document.createElement = function (tag) { var el = __origCE(tag); __made.push(el); return el; };
      SETTINGS.lowSpec = false;              // 临时关掉流畅模式，否则 fx() 为假、断言测不到东西
      floatDamage = __realFloatDamage;        // 换回真的：全局在 :658 已被顶成 __sil
      floatDamage('-25', '', null, { crit: true });
      floatDamage('+7', 'block', null);
    } catch (e4) { __fdErr = e4; } finally {
      document.createElement = __origCE; floatDamage = __keepFD; SETTINGS.lowSpec = __keepLow;
    }
    var __spans = __made.filter(function (e) { return /fx-dmg/.test(String(e.className || '')); });
    var __inners = __made.filter(function (e) { return String(e.className || '') === 'fx-in'; });
    var __crit = __spans.filter(function (e) { return /(^|\s)crit(\s|$)/.test(String(e.className || '')); });
    __ok('v0.61.36 C3 floatDamage 建出「外层 .fx-dmg + 内层 .fx-in」两层，且不抛错',
      __fdErr === null && __spans.length === 2 && __inners.length === 2,
      (__fdErr && __fdErr.message) || ('spans=' + __spans.length + ' inners=' + __inners.length));
    var __sp0 = __spans[0] || {}, __in0 = __inners[0] || {};
    __ok('v0.61.36 C3 只有 crit 那一次加了 .crit 类（opts 省略时不受影响）',
      __crit.length === 1 && /block/.test(String(__sp0.className)) === false,
      __spans.map(function (e) { return e.className; }).join(' | '));
    __ok('v0.61.36 C3 文字回退时字形挂在**内层**（外层 .fx-dmg 自身不带字形）',
      String(__sp0.textContent || '') === '' && String(__in0.textContent || '') === '-25',
      'outer="' + (__sp0.textContent || '') + '" inner="' + (__in0.textContent || '') + '"');

    /* —— v0.61.36 C4 大伤害档阈值与打击音效**同源**（isCritHit 单一来源） —— */
    __ok('v0.61.36 C4 isCritHit：≥20 或击杀；19 不算',
      isCritHit(20, false) === true && isCritHit(19, false) === false &&
      isCritHit(3, true) === true && isCritHit(0, false) === false,
      [isCritHit(20, false), isCritHit(19, false), isCritHit(3, true)].join('/'));
    __ok('v0.61.36 C4 HIT_HEAVY_DMG=10 / HIT_CRIT_DMG=20 且 pickHitSfx 走同一套判据',
      HIT_HEAVY_DMG === 10 && HIT_CRIT_DMG === 20 &&
      pickHitSfx(25, false, false) === 'hit_crit' && pickHitSfx(12, false, false) === 'hit_heavy' &&
      pickHitSfx(5, false, false) === 'hit_light' && pickHitSfx(25, true, false) === 'hit_guard' &&
      pickHitSfx(1, false, true) === 'hit_crit',
      [pickHitSfx(25, false, false), pickHitSfx(12, false, false), pickHitSfx(5, false, false)].join('/'));
    // 行为验证（不看源码文本）：真打一下敌人，看浮字是否带 .crit
    function __critSpansOnHit(dmg) {
      var made = [], origCE = document.createElement, err = null, keepFD = floatDamage, keepLow = SETTINGS.lowSpec;
      try {
        document.createElement = function (tag) { var el = origCE(tag); made.push(el); return el; };
        G = __base('wuseng'); G.enemies[0].hp = 300; G.enemies[0].maxHp = 300;
        SETTINGS.lowSpec = false;        // 同上：不关流畅模式就什么都测不到
        floatDamage = __realFloatDamage; // dealDamageTo 内部调的是全局 floatDamage
        dealDamageTo(G.enemies[0], dmg);
      } catch (e5) { err = e5; } finally {
        document.createElement = origCE; floatDamage = keepFD; SETTINGS.lowSpec = keepLow;
      }
      var sp = made.filter(function (e) { return /fx-dmg/.test(String(e.className || '')); });
      var cr = sp.filter(function (e) { return /(^|\s)crit(\s|$)/.test(String(e.className || '')); });
      return { err: err, spans: sp.length, crits: cr.length };
    }
    var _h25 = __critSpansOnHit(25), _h8 = __critSpansOnHit(8);
    __ok('v0.61.36 C4 对敌 25 伤 → 浮字带 .crit（与 hit_crit 音效同址同判据）',
      _h25.err === null && _h25.spans === 1 && _h25.crits === 1,
      (_h25.err && _h25.err.message) || ('spans=' + _h25.spans + ' crits=' + _h25.crits));
    __ok('v0.61.36 C4 对敌 8 伤 → 浮字不带 .crit（小伤害档不受影响）',
      _h8.err === null && _h8.spans === 1 && _h8.crits === 0,
      (_h8.err && _h8.err.message) || ('spans=' + _h8.spans + ' crits=' + _h8.crits));

    /* —— D 洗髓经不跨关 —— */
    g = __base('tianshi'); G.xisuiTurns = 3;
    var derr = null;
    try { startBattle(['youhun']); } catch (e3) { derr = e3; }
    __ok('v0.61.33 D 上一关末尾打出的洗髓经不带进下一关（startBattle 后 xisuiTurns=0）',
      derr === null && G.xisuiTurns === 0, (derr && derr.message) || ('xisuiTurns=' + G.xisuiTurns));
    g = __base('tianshi'); G.xisuiTurns = 2; G.drawPile = [__card('leifu'), __card('jingang')];
    var derr2 = null;
    try { startTurn(); } catch (e4) { derr2 = e4; }
    __ok('v0.61.33 D 战斗内洗髓经仍按回合递减（本场没被误伤）',
      derr2 === null && G.xisuiTurns === 1, (derr2 && derr2.message) || ('xisuiTurns=' + G.xisuiTurns));

    /* —— E 渡魂归己：按「一批的真实总伤害」结算 —— */
    g = __base('tianshi'); G.hp = 10; G.duhun = { turns: 5, ratio: 0.5 };
    G.enemies[0].hp = 200; G.enemies[1].hp = 200;
    duhunBatchBegin(); dealDamageTo(G.enemies[0], 9); dealDamageTo(G.enemies[1], 9); duhunBatchEnd();
    __ok('v0.61.33 E 群伤按总真实伤害取整（9+9=18 → 回 9，而非逐击 4+4=8）', G.hp === 19, 'hp=' + G.hp);
    g = __base('tianshi'); G.hp = 10; G.duhun = { turns: 5, ratio: 0.5 };
    dealDamageTo(G.enemies[0], 9);
    __ok('v0.61.33 E 批外单发照样结算（9 → 回 4）', G.hp === 14, 'hp=' + G.hp);
    g = __base('tianshi'); G.hp = 10; G.duhun = { turns: 5, ratio: 0.5 }; G.enemies[0].block = 5;
    dealDamageTo(G.enemies[0], 9);
    __ok('v0.61.33 E 只按打完敌人格挡后的真实伤害算（9-5=4 → 回 2）', G.hp === 12, 'hp=' + G.hp);
    g = __base('tianshi'); G.hp = 10; G.duhun = { turns: 5, ratio: 0.5 }; G.enemies[0].hp = 3;
    dealDamageTo(G.enemies[0], 9);
    __ok('v0.61.33 E 斩杀溢出不计入（3 血敌人挨 9 → 按 3 算，回 1）', G.hp === 11, 'hp=' + G.hp);
    g = __base('tianshi'); G.hp = 10; G.duhun = { turns: 0, ratio: 0.5 };
    dealDamageTo(G.enemies[0], 9);
    __ok('v0.61.33 E 渡魂已过期则不回复', G.hp === 10, 'hp=' + G.hp);
    g = __base('tianshi'); G.hp = 10; G.duhun = { turns: 5, ratio: 0.3 };
    duhunBatchBegin(); dealDamageTo(G.enemies[0], 9); duhunBatchEnd();
    __ok('v0.61.33 E 比例 30% 也按总伤 floor（9 → 回 2）', G.hp === 12, 'hp=' + G.hp);
    g = __base('tianshi'); G.hp = 79; G.maxHp = 80; G.duhun = { turns: 5, ratio: 0.5 };
    duhunBatchBegin(); dealDamageTo(G.enemies[0], 9); duhunBatchEnd();
    __ok('v0.61.33 E 回复不超生命上限', G.hp === 80, 'hp=' + G.hp);
    g = __base('tianshi'); G.hp = 10; G.duhun = { turns: 5, ratio: 0.5 };
    G.relics = ['taomujian']; // hasRelic 比对的是**遗物 id 字符串**（G.relics.includes(id)），不是对象
    G.enemies[0].hp = 200;
    duhunBatchBegin(); dealDamageTo(G.enemies[0], 8); duhunBatchEnd();
    __ok('v0.61.33 E 遗物增伤计入真实伤害（桃木剑 8×1.25=10 → 回 5）', G.hp === 15, 'hp=' + G.hp);
    g = __base('tianshi'); G.hp = 10; G.duhun = { turns: 5, ratio: 0.5 };
    G.enemies[0].hp = 200; G.enemies[1].hp = 200;
    G.summons = [{ type: 'shi_wang', v: 7, dur: 3, up: false }];
    summonAct(G.summons[0]);
    __ok('v0.61.33 E 召唤行动也计入（尸王打全体 7+7=14 → 回 7）', G.hp === 17, 'hp=' + G.hp);
  })();

  /* ============ v0.61.34 BGM 六轨：轨名真相源 + 普通/精英必须分开 ============ */
  (function () {
    /* 背景：v0.61.31 已把四类场景接上（普通战 battle / 精英战 battle_elite / Boss 战 battle_boss /
       商店·营地·事件 shop / 地图 map / 菜单 menu），用户 9/23 交付了 6 个 mp3。
       本组不验「接线做没做」（那是 v0.61.31 组的事），只验「素材名与代码轨名不许漂」——
       文件名是人工交付的，拼错不会报错，只会静默走回退轨。 */
    var tr = (typeof BGM_KNOWN_TRACKS !== 'undefined') ? BGM_KNOWN_TRACKS : null;
    __ok('v0.61.34 前置：BGM_KNOWN_TRACKS 存在且非空', !!tr && tr.length > 0);
    if (tr) {
      __ok('v0.61.34 恰好 6 条轨且无重复', tr.length === 6 && new Set(tr).size === 6, tr.join(','));
      __ok('v0.61.34 三条基础轨在册（menu / map / battle）',
        tr.indexOf('menu') >= 0 && tr.indexOf('map') >= 0 && tr.indexOf('battle') >= 0);
      __ok('v0.61.34 三条升级轨在册（battle_elite / battle_boss / shop）',
        tr.indexOf('battle_elite') >= 0 && tr.indexOf('battle_boss') >= 0 && tr.indexOf('shop') >= 0);
      /* 与磁盘命名同口径：verify_dist [2c] 按 bgm_<轨> 抠词干再比对，字符集必须一致 */
      var badch = tr.filter(function (t) { return !/^[a-z][a-z0-9_]*$/.test(t); });
      __ok('v0.61.34 轨名字符集与磁盘命名规则同口径（小写/数字/下划线）',
        badch.length === 0, badch.join(','));
      var fbOut = Object.keys(BGM_FALLBACK).filter(function (k) { return tr.indexOf(k) < 0; });
      __ok('v0.61.34 BGM_FALLBACK 的每个键都在册（否则回退配置自己就是死配置）',
        fbOut.length === 0, fbOut.join(','));
      var stray = ['battle', 'battle_elite', 'battle_boss']
        .filter(function (t) { return tr.indexOf(t) < 0; });
      __ok('v0.61.34 battleBgmFor 可能返回的轨名全部在册', stray.length === 0, stray.join(','));
    }

    /* 用户点名的那条：「普通和精英也要分开」—— 直接断言两者不同轨。
       注意入参形状：battleBgmFor 读的是**敌人对象**上的 .elite/.boss，不是 key 字符串。
       喂 key 进去 strings 上没有这两个字段 → 三档全落 'battle'，看着像「没分开」，
       实际是喂错了东西（本批第一版就踩了这个，红报 battle vs battle）。
       这里按 makeEnemy 的产出形状（`elite:!!def.elite, boss:!!def.boss`）从**真实数据**造对象；
       端到端那条路径（startBattle 建完敌人再选轨）由 v0.61.31 那组验。 */
    var __pre = { normal: 0, elite: 0, boss: 0 };
    Object.keys(ENEMIES).forEach(function (k) {
      __pre[ENEMIES[k].boss ? 'boss' : (ENEMIES[k].elite ? 'elite' : 'normal')]++;
    });
    __ok('v0.61.34 前置：ENEMIES 里普通/精英/Boss 三类都真实存在（否则本节空转）',
      __pre.normal > 0 && __pre.elite > 0 && __pre.boss > 0, JSON.stringify(__pre));
    var __eobj = function (k) { return { elite: !!ENEMIES[k].elite, boss: !!ENEMIES[k].boss }; };
    var __nk = Object.keys(ENEMIES).filter(function (k) { return !ENEMIES[k].elite && !ENEMIES[k].boss; })[0];
    var __ek = Object.keys(ENEMIES).filter(function (k) { return ENEMIES[k].elite && !ENEMIES[k].boss; })[0];
    var __bk = Object.keys(ENEMIES).filter(function (k) { return ENEMIES[k].boss; })[0];
    __ok('v0.61.34 普通战与精英战不是同一条轨（用户要求：分开）',
      battleBgmFor([__eobj(__nk)]) === 'battle' && battleBgmFor([__eobj(__ek)]) === 'battle_elite'
      && battleBgmFor([__eobj(__nk)]) !== battleBgmFor([__eobj(__ek)]),
      battleBgmFor([__eobj(__nk)]) + '（' + __nk + '） vs '
      + battleBgmFor([__eobj(__ek)]) + '（' + __ek + '）');
    __ok('v0.61.34 三档战斗两两不同轨',
      battleBgmFor([__eobj(__nk)]) !== battleBgmFor([__eobj(__bk)])
      && battleBgmFor([__eobj(__ek)]) !== battleBgmFor([__eobj(__bk)]),
      [battleBgmFor([__eobj(__nk)]), battleBgmFor([__eobj(__ek)]),
       battleBgmFor([__eobj(__bk)])].join(','));
    /* 读档恢复 G.enemies 之前可能拿到空/畸形入参，不许炸 */
    __ok('v0.61.34 battleBgmFor 对空数组/undefined/[null] 都回 battle 而不抛错',
      battleBgmFor([]) === 'battle' && battleBgmFor(undefined) === 'battle' && battleBgmFor([null]) === 'battle');

    /* 未登记轨名：setBGM 只警告、不抛错，且仍按原名请求（交给探测/合成兜底） */
    var __savA = ASSET_MAP, __savCUR = CUR_BGM, __o3 = startBGM, __req = [];
    var __ow = console.warn, __warns = [];
    console.warn = function (m) { __warns.push(m); };   // 把提示收进断言，别往 stderr 吐
    ASSET_MAP = null;   // 开发期口径（file://）：透传逻辑轨，不预判磁盘
    startBGM = function (t) { __req.push(t); };
    var __werr = null;
    try { setBGM('bgm_typo'); } catch (e) { __werr = e; }
    var __lastReq = __req[__req.length - 1];
    __ok('v0.61.34 未登记轨名不抛错（战斗中不能因轨名拼错炸掉）', __werr === null, __werr && __werr.message);
    __ok('v0.61.34 未登记轨名仍按原名请求（探测/合成兜底，不是静默丢弃）',
      __lastReq === 'bgm_typo', 'got=' + __lastReq);
    __ok('v0.61.34 CUR_BGM 如实记录逻辑轨（设置页/存档读的就是它）', CUR_BGM === 'bgm_typo', CUR_BGM);
    __ok('v0.61.34 未登记轨名会 console.warn 一条并点名该轨',
      __warns.length === 1 && String(__warns[0]).indexOf('bgm_typo') >= 0, __warns.join('|'));
    __warns = []; __req = [];
    try { setBGM('bgm_typo'); } catch (e) {}
    __ok('v0.61.34 同一条未登记轨名不会反复警告（不刷屏），且仍照旧请求',
      __warns.length === 0 && __req.length === 1 && __req[0] === 'bgm_typo');
    console.warn = __ow; startBGM = __o3; ASSET_MAP = __savA; CUR_BGM = __savCUR;
  })();

  /* ============ v0.61.37 赶尸人（A 列）卡池 18 条 + 被动换「消耗回血」+ 预尸气 + 新牌库 ============ */
  (function () {
    var g, cc;
    function A_(id, up) { return Object.assign({}, __card(id), { up: !!up }); }

    /* —— ① 新被动：每消耗 1 点【尸气】回复 1 点生命（唯一收口 spendShiqi） —— */
    g = __base('ganshiren'); g.尸气 = 5; g.hp = 60;
    __ok('v0.61.37 spendShiqi(3) 扣 3 尸气并回 3 血',
      spendShiqi(3) === true && g.尸气 === 2 && g.hp === 63, '尸气=' + g.尸气 + ' hp=' + g.hp);
    g = __base('ganshiren'); g.尸气 = 5; g.hp = 60;
    __ok('v0.61.37 尸气不足 → spendShiqi 返回 false，分文不扣、也不回血',
      spendShiqi(9) === false && g.尸气 === 5 && g.hp === 60, '尸气=' + g.尸气 + ' hp=' + g.hp);
    g = __base('ganshiren'); g.尸气 = 5; g.hp = 60;
    __ok('v0.61.37 spendShiqi(0) 不消耗也不回血',
      spendShiqi(0) === true && g.hp === 60, 'hp=' + g.hp);
    g = __base('ganshiren'); g.尸气 = 5; g.hp = g.maxHp;
    __ok('v0.61.37 消耗回血不溢出上限', spendShiqi(3) === true && g.hp === g.maxHp, 'hp=' + g.hp);
    g = __base('wuseng'); g.尸气 = 5; g.hp = 60;
    __ok('v0.61.37 非赶尸人（B）消耗尸气不回血',
      spendShiqi(3) === true && g.尸气 === 2 && g.hp === 60, 'hp=' + g.hp);
    g = __base('yincha'); g.尸气 = 5; g.hp = 60;
    __ok('v0.61.37 非赶尸人（C）消耗尸气不回血',
      spendShiqi(3) === true && g.尸气 === 2 && g.hp === 60, 'hp=' + g.hp);

    // 走真实卡牌路径（证明不是只有函数单测过、卡面没接上）
    g = __base('ganshiren'); g.尸气 = 2; g.hp = 60;
    cc = __card('jinguang'); cc.eff(false, cc);
    __ok('v0.61.37 金光罩消耗 2 尸气 → 同时回 2 血',
      g.尸气 === 0 && g.hp === 62, '尸气=' + g.尸气 + ' hp=' + g.hp);
    g = __base('ganshiren'); g.尸气 = 5; g.hp = 60;
    cc = __card('wutong'); cc.eff(false, cc);
    __ok('v0.61.37 五通神强化消耗 5 尸气 → 回 5 血',
      g.尸气 === 0 && g.hp === 65, '尸气=' + g.尸气 + ' hp=' + g.hp);
    g = __base('ganshiren'); g.尸气 = 3; g.hp = 60;
    cc = __card('jianfu'); cc.eff(false, cc);
    __ok('v0.61.37 剑符翻倍消耗 3 尸气 → 回 3 血',
      g.尸气 === 0 && g.hp === 63, '尸气=' + g.尸气 + ' hp=' + g.hp);

    /* —— ② 咒雨：清零算「消耗」→ 清几点回几点（大血敌人避免过量伤害干扰） —— */
    g = __base('ganshiren'); g.尸气 = 12; g.hp = 60;
    g.enemies.forEach(function (e) { e.hp = 500; e.maxHp = 500; });
    var __hpA = __sumHp();
    cc = __card('zhouyu'); cc.eff(false, cc);
    __ok('v0.61.37 咒雨 12 尸气 → 12×5=60 伤 + 清零并回 12 血',
      g.尸气 === 0 && (__hpA - __sumHp()) === 60 && g.hp === 72,
      '尸气=' + g.尸气 + ' dmg=' + (__hpA - __sumHp()) + ' hp=' + g.hp);

    /* —— ③ 预尸气：下回合进账 = 本回合末死亡返还 + 下回合开始每召唤 +1 —— */
    g = __base('ganshiren'); g.summons = [];
    __ok('v0.61.37 预尸气 无召唤 → 0', preShiqiNextTurn() === 0, String(preShiqiNextTurn()));
    __base('tianshi'); G.summons = [{ type: 'zhiren', v: 2, dur: 2 }];
    __ok('v0.61.37 预尸气 非赶尸人恒为 0', preShiqiNextTurn() === 0, String(preShiqiNextTurn()));
    g = __base('ganshiren'); g.summons = [{ type: 'zhiren', v: 2, dur: 0 }];
    __ok('v0.61.37 预尸气 dur=0 不计', preShiqiNextTurn() === 0, String(preShiqiNextTurn()));
    g = __base('ganshiren'); g.summons = [{ type: 'zhiren', v: 2, dur: 2 }];
    __ok('v0.61.37 预尸气 纸人 dur2 下回合仍在场 → +1', preShiqiNextTurn() === 1, String(preShiqiNextTurn()));
    g = __base('ganshiren'); g.summons = [{ type: 'zhiren', v: 2, dur: 1 }];
    __ok('v0.61.37 预尸气 纸人 dur1 本回合末消散 → 死亡返还 2', preShiqiNextTurn() === 2, String(preShiqiNextTurn()));
    g = __base('ganshiren'); g.summons = [{ type: 'xiaogui', v: 2, dur: 1 }, { type: 'xiaogui', v: 4, dur: 1, up: true }];
    __ok('v0.61.37 预尸气 小鬼 dur1 → 2 + 升级 3 = 5', preShiqiNextTurn() === 5, String(preShiqiNextTurn()));
    g = __base('ganshiren'); g.summons = [{ type: 'yinbing', v: 1, dur: 1 }, { type: 'yinbing', v: 1, dur: 1 }];
    __ok('v0.61.37 预尸气 阴兵 dur1 → 1+1 = 2', preShiqiNextTurn() === 2, String(preShiqiNextTurn()));
    g = __base('ganshiren'); g.summons = [{ type: 'wutong', v: 3, dur: 1 }];
    __ok('v0.61.37 预尸气 五通神 dur1 走回合开始 tick → 算 +1、不算死亡', preShiqiNextTurn() === 1, String(preShiqiNextTurn()));
    g = __base('ganshiren'); g.summons = [{ type: 'shi_wang', v: 10, dur: 1 }];
    __ok('v0.61.37 预尸气 尸王消散只回牌、不给尸气 → 计 0', preShiqiNextTurn() === 0, String(preShiqiNextTurn()));
    g = __base('ganshiren'); g.summons = [{ type: 'zhiren', v: 2, dur: 3 }, { type: 'zhiren', v: 2, dur: 1 }];
    __ok('v0.61.37 预尸气 混合：存活 +1、消散返还 2 = 3', preShiqiNextTurn() === 3, String(preShiqiNextTurn()));

    /* —— ④ 预尸气 == 下一回合真实进账（把预览钉死在 startTurn/endTurn 的真实结算上） —— */
    [[{ type: 'zhiren', v: 2, dur: 2 }, { type: 'xiaogui', v: 2, dur: 1 }],
     [{ type: 'yinbing', v: 1, dur: 1 }, { type: 'wutong', v: 3, dur: 1 }],
     [{ type: 'zhiren', v: 2, dur: 3 }, { type: 'xiaogui', v: 2, dur: 2 }, { type: 'shi_wang', v: 10, dur: 4 }]
    ].forEach(function (arr, i) {
      g = __base('ganshiren'); g.尸气 = 0; g.hp = 200; g.maxHp = 200;
      g.enemies.forEach(function (e) { e.hp = 500; e.maxHp = 500; });
      g.summons = arr.map(function (s) { return Object.assign({}, s); });
      var pred = preShiqiNextTurn();
      var before = g.尸气, real = null, err = null;
      try { finishEndTurn(); startTurn(); real = g.尸气 - before; }
      catch (e) { err = e; }
      __ok('v0.61.37 预尸气场景' + i + ' 预览值 == 一整个回合的真实进账',
        err === null && real === pred, err ? String(err && err.message) : ('pred=' + pred + ' real=' + real));
    });

    /* —— ⑤ A 列 18 条数值（卡面文案逐条） —— */
    g = __base('ganshiren');
    function T_(id, up) { return __card(id).t(!!up); }
    __ok('v0.61.37 #1 雷符 5/7 + 击杀 2/3 尸气',
      T_('leifu', false).indexOf('造成 5 伤害') >= 0 && T_('leifu', true).indexOf('造成 7 伤害') >= 0 &&
      T_('leifu', false).indexOf('获得 2 点【尸气】') >= 0 && T_('leifu', true).indexOf('获得 3 点【尸气】') >= 0,
      T_('leifu', false) + ' || ' + T_('leifu', true));
    __ok('v0.61.37 #2 火符 5/7 + 弃鬼怪 2/3 尸气',
      T_('huofu', false).indexOf('造成 5 伤害') >= 0 && T_('huofu', true).indexOf('造成 7 伤害') >= 0 &&
      T_('huofu', false).indexOf('获得 2 点【尸气】') >= 0 && T_('huofu', true).indexOf('获得 3 点【尸气】') >= 0,
      T_('huofu', false) + ' || ' + T_('huofu', true));
    __ok('v0.61.37 #3 剑符 10/14 + 消耗 3 尸气',
      T_('jianfu', false).indexOf('造成 10 伤害') >= 0 && T_('jianfu', true).indexOf('造成 14 伤害') >= 0 &&
      T_('jianfu', false).indexOf('消耗 3 点【尸气】') >= 0,
      T_('jianfu', false) + ' || ' + T_('jianfu', true));
    __ok('v0.61.37 #4 斩妖剑 7/12 + 每召唤 +2',
      T_('zhanyaojian', false).indexOf('造成 7 伤害') >= 0 && T_('zhanyaojian', true).indexOf('造成 12 伤害') >= 0 &&
      T_('zhanyaojian', false).indexOf('额外造成 2 点伤害') >= 0,
      T_('zhanyaojian', false) + ' || ' + T_('zhanyaojian', true));
    __ok('v0.61.37 #5 天雷正法 20/28 + 每 2 点尸气 -1 费 + 消耗减免×2',
      T_('tianlei', false).indexOf('造成 20 伤害') >= 0 && T_('tianlei', true).indexOf('造成 28 伤害') >= 0 &&
      T_('tianlei', false).indexOf('每有 2 点【尸气】') >= 0 && T_('tianlei', false).indexOf('×2') >= 0,
      T_('tianlei', false));
    __ok('v0.61.37 #6 万剑归宗 10/14 + 抽到的牌本回合 -1/-2 费',
      T_('wanjian', false).indexOf('造成 10 伤害') >= 0 && T_('wanjian', true).indexOf('造成 14 伤害') >= 0 &&
      T_('wanjian', false).indexOf('费用 -1）') >= 0 && T_('wanjian', true).indexOf('费用 -2）') >= 0,
      T_('wanjian', false) + ' || ' + T_('wanjian', true));
    __ok('v0.61.37 #8 噬魂术 消耗 4/2 尸气',
      T_('shihun', false).indexOf('消耗 4 点【尸气】') >= 0 && T_('shihun', true).indexOf('消耗 2 点【尸气】') >= 0,
      T_('shihun', false) + ' || ' + T_('shihun', true));
    __ok('v0.61.37 #11 蚀魂咒 4/8 + 文案改「根据召唤物数量回复等额血量」',
      T_('shihunzhou', false).indexOf('造成 4 伤害') >= 0 && T_('shihunzhou', true).indexOf('造成 8 伤害') >= 0 &&
      T_('shihunzhou', false).indexOf('根据场上召唤物的数量回复等额的血量') >= 0,
      T_('shihunzhou', false));
    __ok('v0.61.37 #12 嗜血 每 1 点尸气 +1（上限 +6/+7）',
      T_('shixue', false).indexOf('每有 1 点【尸气】') >= 0 &&
      T_('shixue', false).indexOf('上限 +6') >= 0 && T_('shixue', true).indexOf('上限 +7') >= 0,
      T_('shixue', false) + ' || ' + T_('shixue', true));
    __ok('v0.61.37 #14 钟馗镇魂 获得 4/6 尸气',
      T_('zhongkui', false).indexOf('获得 4 点【尸气】') >= 0 && T_('zhongkui', true).indexOf('获得 6 点【尸气】') >= 0,
      T_('zhongkui', false) + ' || ' + T_('zhongkui', true));
    __ok('v0.61.37 #17 金光罩 9/14 格挡 + 额外 5/7',
      T_('jinguang', false).indexOf('获得 9 点格挡') >= 0 && T_('jinguang', true).indexOf('获得 14 点格挡') >= 0 &&
      T_('jinguang', false).indexOf('额外获得 5 点格挡') >= 0 && T_('jinguang', true).indexOf('额外获得 7 点格挡') >= 0,
      T_('jinguang', false) + ' || ' + T_('jinguang', true));
    __ok('v0.61.37 #21 铜皮铁骨 8/12 格挡 + 反弹 4/5',
      T_('tongpi', false).indexOf('获得 8 点格挡') >= 0 && T_('tongpi', true).indexOf('获得 12 点格挡') >= 0 &&
      T_('tongpi', false).indexOf('反弹 4 点') >= 0 && T_('tongpi', true).indexOf('反弹 5 点') >= 0,
      T_('tongpi', false) + ' || ' + T_('tongpi', true));
    __ok('v0.61.37 #27 易物 换出鬼怪牌 2 尸气',
      T_('yiwu', false).indexOf('获得 2 点【尸气】') >= 0, T_('yiwu', false));
    __ok('v0.61.37 #28 血契 A 列升级 0 费（costU 加 ganshiren:0）',
      cardCost(A_('xueqi')) === 1 && cardCost(A_('xueqi', true)) === 0 &&
      effectiveCost(A_('xueqi', true)) === 0,
      'cost=' + cardCost(A_('xueqi')) + ' upCost=' + cardCost(A_('xueqi', true)));
    __ok('v0.61.37 #31 燃血术 失 8 生命（8/8）',
      T_('ranxue', false).indexOf('失去 8 点生命') >= 0 && T_('ranxue', true).indexOf('失去 8 点生命') >= 0,
      T_('ranxue', false) + ' || ' + T_('ranxue', true));
    __ok('v0.61.37 #32 洗髓经 固定 3 回合 + 每回合 1/2 尸气',
      T_('xisui', false).indexOf('接下来 3 回合') >= 0 && T_('xisui', true).indexOf('接下来 3 回合') >= 0 &&
      T_('xisui', false).indexOf('获得 1 点【尸气】') >= 0 && T_('xisui', true).indexOf('获得 2 点【尸气】') >= 0,
      T_('xisui', false) + ' || ' + T_('xisui', true));
    __ok('v0.61.37 #38 移形换影 1/1 费 + 闪避后 1/3 尸气',
      cardCost(A_('yixing')) === 1 && cardCost(A_('yixing', true)) === 1 &&
      T_('yixing', false).indexOf('获得 1 点【尸气】') >= 0 && T_('yixing', true).indexOf('获得 3 点【尸气】') >= 0,
      T_('yixing', false) + ' || ' + T_('yixing', true));
    __ok('v0.61.37 #40 镇妖铃 10/15 + 尸气 3/4',
      T_('zhenyaoling', false).indexOf('造成 10 伤害') >= 0 && T_('zhenyaoling', true).indexOf('造成 15 伤害') >= 0 &&
      T_('zhenyaoling', false).indexOf('获得 3 点【尸气】') >= 0 && T_('zhenyaoling', true).indexOf('获得 4 点【尸气】') >= 0,
      T_('zhenyaoling', false) + ' || ' + T_('zhenyaoling', true));
    __ok('v0.61.37 #46 咒雨 3 费 + 每层 5/6',
      cardCost(A_('zhouyu')) === 3 && cardCost(A_('zhouyu', true)) === 3 &&
      T_('zhouyu', false).indexOf('5 点伤害') >= 0 && T_('zhouyu', true).indexOf('6 点伤害') >= 0,
      T_('zhouyu', false) + ' || ' + T_('zhouyu', true));

    /* —— ⑥ A 列行为（数值真的走进了分支，不只是文案改字） —— */
    g = __base('ganshiren'); g.尸气 = 2;
    cc = __card('jianfu'); var __b0 = g.enemies[0].hp; cc.eff(false, cc);
    __ok('v0.61.37 剑符 尸气 2 < 3 → 不翻倍（仍 10 伤）', (__b0 - g.enemies[0].hp) === 10, 'dmg=' + (__b0 - g.enemies[0].hp));
    g = __base('ganshiren'); g.尸气 = 3;
    cc = __card('jianfu'); __b0 = g.enemies[0].hp; cc.eff(false, cc);
    __ok('v0.61.37 剑符 尸气 3 → 翻倍 20 伤且清空尸气',
      (__b0 - g.enemies[0].hp) === 20 && g.尸气 === 0, 'dmg=' + (__b0 - g.enemies[0].hp) + ' 尸气=' + g.尸气);
    g = __base('ganshiren'); g.尸气 = 2; g.hand = []; g.drawPile = [];
    cc = __card('shihun'); cc.eff(true, cc);
    __ok('v0.61.37 噬魂术升级 消耗 2 尸气即可打出（原门槛 4）', g.尸气 === 0, '尸气=' + g.尸气);
    g = __base('ganshiren'); g.尸气 = 6;
    cc = __card('tianlei'); var __t0 = g.enemies[0].hp; cc.eff(false, cc);
    __ok('v0.61.37 天雷正法 尸气 6 → 减免 3 费并消耗 6 尸气、造成 20 伤',
      g.尸气 === 0 && (__t0 - g.enemies[0].hp) === 20, '尸气=' + g.尸气 + ' dmg=' + (__t0 - g.enemies[0].hp));
    g = __base('ganshiren'); g.尸气 = 6;
    __ok('v0.61.37 天雷正法 费用 3 - floor(6/2)=0（每 2 点 -1 费）',
      effectiveCost(A_('tianlei')) === 0, 'effCost=' + effectiveCost(A_('tianlei')));
    g = __base('ganshiren'); g.尸气 = 20;
    var __sx = previewDamage(A_('shixue')).d;
    __ok('v0.61.37 嗜血 尸气 20 → 5 + 上限 6 = 11', __sx === 11, 'd=' + __sx);
    var __sxu = previewDamage(A_('shixue', true)).d;
    __ok('v0.61.37 嗜血升级 尸气 20 → 7 + 上限 7 = 14', __sxu === 14, 'd=' + __sxu);

    /* —— ⑦ 万剑归宗：抽到的那张牌本回合 -1/-2 费（用户拍板的口径 + 共享对象不许被污染） —— */
    var __shareLf = __card('leifu');
    g = __base('ganshiren'); g.尸气 = 0; g.hand = [];
    g.deck = [__shareLf]; g.drawPile = [__shareLf];
    g.enemies.forEach(function (e) { e.hp = 3; });
    cc = __card('wanjian'); cc.eff(false, cc);
    __ok('v0.61.37 万剑归宗A 击败 2 → 6 尸气 + 抽 1 张（抽牌堆仅 1）',
      g.尸气 === 6 && g.hand.length === 1, '尸气=' + g.尸气 + ' hand=' + g.hand.length);
    __ok('v0.61.37 万剑归宗A 抽到的牌本回合 -1 费（走 tempCostCut）',
      (g.hand[0].tempCostCut || 0) === 1 && effectiveCost(g.hand[0]) === 0,
      'cut=' + g.hand[0].tempCostCut + ' effCost=' + effectiveCost(g.hand[0]));
    __ok('v0.61.37 万剑归宗A 减费打在**副本**上：CARDS 共享对象未被污染',
      __shareLf.tempCostCut === undefined, 'shared.tempCostCut=' + __shareLf.tempCostCut);
    __ok('v0.61.37 万剑归宗A 副本顶替了 G.deck 里的原对象（indexOf 语义不破）',
      g.deck[0] !== __shareLf && (g.deck[0].tempCostCut || 0) === 1,
      'deckIsSame=' + (g.deck[0] === __shareLf));
    g = __base('ganshiren'); g.尸气 = 0; g.hand = [];
    var __shareLf2 = __card('leifu');
    g.deck = [__shareLf2]; g.drawPile = [__shareLf2];
    g.enemies.forEach(function (e) { e.hp = 3; });
    cc = A_('wanjian', true); cc.eff(true, cc);
    __ok('v0.61.37 万剑归宗A 升级 → 抽到的牌本回合 -2 费',
      (g.hand[0].tempCostCut || 0) === 2 && __shareLf2.tempCostCut === undefined,
      'cut=' + g.hand[0].tempCostCut);
    // 未击败任何敌人 → 不抽牌、不减费、不给尸气
    g = __base('ganshiren'); g.尸气 = 0; g.hand = [];
    g.drawPile = [__card('leifu')];
    g.enemies.forEach(function (e) { e.hp = 500; e.maxHp = 500; });
    cc = __card('wanjian'); cc.eff(false, cc);
    __ok('v0.61.37 万剑归宗A 未击败任何敌人 → 不抽牌/不给尸气',
      g.尸气 === 0 && g.hand.length === 0, '尸气=' + g.尸气 + ' hand=' + g.hand.length);

    /* —— ⑧ 移形换影：闪避结算读 G.dodgeShiqi（修既有断链：值被硬编码 1 吃掉） —— */
    g = __base('ganshiren'); g.尸气 = 0;
    cc = A_('yixing', true); cc.eff(true, cc);
    var __d0 = g.尸气;
    try {
      dealDamageToPlayer(5, { name: '测试怪' });
      __ok('v0.61.37 移形换影A 升级闪避后按 G.dodgeShiqi 给 3 尸气（原先硬编码 1）',
        g.尸气 === __d0 + 3 && g.dodge === 0, '尸气=' + g.尸气 + ' dodge=' + g.dodge);
    } catch (e) { __ok('v0.61.37 移形换影A 闪避结算未抛错', false, String(e && e.message)); }

    /* —— ⑨ 洗髓经：xisuiShiqi 每回合 1/2（并随存档往返） —— */
    g = __base('ganshiren'); g.尸气 = 0; g.energy = 0;
    cc = A_('xisui', true); cc.eff(true, cc);
    __ok('v0.61.37 洗髓经升级 固定 3 回合 + xisuiShiqi=2',
      g.xisuiTurns === 3 && g.xisuiShiqi === 2, 'turns=' + g.xisuiTurns + ' shiqi=' + g.xisuiShiqi);
    var __sb = g.尸气, __eb = g.energy;
    try {
      startTurn();
      __ok('v0.61.37 洗髓经升级 每回合给 2 尸气 + 1 符文（startTurn 真实结算）',
        (g.尸气 - __sb) === 2 && (g.energy - __eb) >= 1, 'Δ尸气=' + (g.尸气 - __sb) + ' Δ符文=' + (g.energy - __eb));
    } catch (e) { __ok('v0.61.37 洗髓经升级 startTurn 未抛错', false, String(e && e.message)); }
    g = __base('ganshiren'); g.尸气 = 0;
    cc = A_('xisui', false); cc.eff(false, cc);
    __ok('v0.61.37 洗髓经未升级 xisuiShiqi=1', g.xisuiShiqi === 1, 'shiqi=' + g.xisuiShiqi);
    try {
      __realSaveRun();
      var __sv = readRun();
      __ok('v0.61.37 存档带上 xisuiShiqi', !!(__sv && __sv.xisuiShiqi === 1), 'v=' + (__sv && __sv.xisuiShiqi));
      g.xisuiShiqi = 0; continueRun();
      __ok('v0.61.37 读档恢复 xisuiShiqi', G.xisuiShiqi === 1, 'v=' + G.xisuiShiqi);
      clearRunSave();
    } catch (e) { __ok('v0.61.37 xisuiShiqi 存档往返未抛错', false, String(e && e.message)); }

    /* —— ⑩ CARD_DMG：A 列新值 + 四条**跨列共用分支**的反误伤 —— */
    function pvA(id, up, setup) {
      g = __base('ganshiren'); if (setup) setup(g);
      var p = previewDamage(A_(id, up)); return p && p.d;
    }
    function pvH(hero, id, up, setup) {
      g = __base(hero); if (setup) setup(g);
      var p = previewDamage(A_(id, up)); return p && p.d;
    }
    __ok('v0.61.37 预览A 火符 5/7', pvA('huofu') === 5 && pvA('huofu', true) === 7,
      pvA('huofu') + '/' + pvA('huofu', true));
    __ok('v0.61.37 预览A 剑符 10 / 尸气3 → 20',
      pvA('jianfu') === 10 && pvA('jianfu', false, function (x) { x.尸气 = 3; }) === 20,
      pvA('jianfu') + '/' + pvA('jianfu', false, function (x) { x.尸气 = 3; }));
    __ok('v0.61.37 预览A 剑符升级 14 / 尸气3 → 28',
      pvA('jianfu', true) === 14 && pvA('jianfu', true, function (x) { x.尸气 = 3; }) === 28,
      pvA('jianfu', true) + '/' + pvA('jianfu', true, function (x) { x.尸气 = 3; }));
    __ok('v0.61.37 预览A 斩妖剑 7 + 2×1召唤 = 9',
      pvA('zhanyaojian', false, function (x) { x.summons = [{ type: 'zhiren', v: 1, dur: 2 }]; }) === 9,
      String(pvA('zhanyaojian', false, function (x) { x.summons = [{ type: 'zhiren', v: 1, dur: 2 }]; })));
    __ok('v0.61.37 预览A 天雷正法 20/28', pvA('tianlei') === 20 && pvA('tianlei', true) === 28,
      pvA('tianlei') + '/' + pvA('tianlei', true));
    __ok('v0.61.37 预览A 万剑归宗 10/14', pvA('wanjian') === 10 && pvA('wanjian', true) === 14,
      pvA('wanjian') + '/' + pvA('wanjian', true));
    __ok('v0.61.37 预览A 蚀魂咒 4/8', pvA('shihunzhou') === 4 && pvA('shihunzhou', true) === 8,
      pvA('shihunzhou') + '/' + pvA('shihunzhou', true));
    __ok('v0.61.37 预览A 嗜血 尸气3 → 5+3=8', pvA('shixue', false, function (x) { x.尸气 = 3; }) === 8,
      String(pvA('shixue', false, function (x) { x.尸气 = 3; })));
    __ok('v0.61.37 预览A 咒雨 尸气5 → 25', pvA('zhouyu', false, function (x) { x.尸气 = 5; }) === 25,
      String(pvA('zhouyu', false, function (x) { x.尸气 = 5; })));
    // ★ 反误伤（记忆里记过两次的 bug 类：改 A 连带改坏别的列）
    __ok('v0.61.37 反误伤 斩妖剑 B 仍 8/12（base 局部量已拆开）',
      pvH('wuseng', 'zhanyaojian') === 8 && pvH('wuseng', 'zhanyaojian', true) === 12,
      pvH('wuseng', 'zhanyaojian') + '/' + pvH('wuseng', 'zhanyaojian', true));
    __ok('v0.61.37 反误伤 万剑归宗 C 仍 10/15、D 仍 14/18（尾支已拆开）',
      pvH('yincha', 'wanjian') === 10 && pvH('yincha', 'wanjian', true) === 15 &&
      pvH('tianshi', 'wanjian') === 14 && pvH('tianshi', 'wanjian', true) === 18,
      [pvH('yincha', 'wanjian'), pvH('yincha', 'wanjian', true), pvH('tianshi', 'wanjian'), pvH('tianshi', 'wanjian', true)].join('/'));
    __ok('v0.61.37 反误伤 镇妖铃 C 仍 10/16、D 仍 10/15（尾支已拆开）',
      pvH('yincha', 'zhenyaoling') === 10 && pvH('yincha', 'zhenyaoling', true) === 16 &&
      pvH('tianshi', 'zhenyaoling') === 10 && pvH('tianshi', 'zhenyaoling', true) === 15,
      [pvH('yincha', 'zhenyaoling'), pvH('yincha', 'zhenyaoling', true), pvH('tianshi', 'zhenyaoling'), pvH('tianshi', 'zhenyaoling', true)].join('/'));
    __ok('v0.61.37 反误伤 咒雨 C/D 预览仍是 null（previewDamage 对非赶尸人提前返回，CARD_DMG 尾支对它们本就不可达）',
      pvH('yincha', 'zhouyu', true, function (x) { x.尸气 = 5; }) === null &&
      pvH('tianshi', 'zhouyu', true, function (x) { x.尸气 = 5; }) === null,
      pvH('yincha', 'zhouyu', true, function (x) { x.尸气 = 5; }) + '/' + pvH('tianshi', 'zhouyu', true, function (x) { x.尸气 = 5; }));
    __ok('v0.61.37 反误伤 火符/蚀魂咒/天雷正法 B/C/D 预览不动',
      pvH('wuseng', 'huofu') === 5 && pvH('tianshi', 'huofu') === 6 &&
      pvH('wuseng', 'shihunzhou') === 5 && pvH('yincha', 'shihunzhou') === 5 && pvH('tianshi', 'shihunzhou') === 3 &&
      pvH('wuseng', 'tianlei') === 15 && pvH('yincha', 'tianlei') === 16 && pvH('tianshi', 'tianlei') === 22,
      [pvH('wuseng', 'huofu'), pvH('tianshi', 'huofu'), pvH('wuseng', 'shihunzhou'),
       pvH('yincha', 'shihunzhou'), pvH('tianshi', 'shihunzhou'), pvH('wuseng', 'tianlei'),
       pvH('yincha', 'tianlei'), pvH('tianshi', 'tianlei')].join('/'));

    /* —— ⑪ 顶栏「预尸气」小标：>0 才渲染 —— */
    var __savedGid = document.getElementById, __cap = null;
    try {
      document.getElementById = function (id) {
        if (id === 'topbar') { if (!__cap) __cap = __savedGid(id); return __cap; }
        return __savedGid(id);
      };
      g = __base('ganshiren'); g.summons = [{ type: 'zhiren', v: 2, dur: 2 }];
      renderTopbar();
      __ok('v0.61.37 顶栏 有召唤时渲染「预+N」小标（data-tip=kw:预尸气）',
        String(__cap && __cap.innerHTML).indexOf('stat-preshiqi') >= 0 &&
        String(__cap && __cap.innerHTML).indexOf('预+1') >= 0 &&
        String(__cap && __cap.innerHTML).indexOf('kw:预尸气') >= 0,
        String(__cap && __cap.innerHTML).slice(0, 160));
      __cap = null;
      g = __base('ganshiren'); g.summons = [];
      renderTopbar();
      __ok('v0.61.37 顶栏 预尸气为 0 时不渲染该节点（同预格挡口径）',
        String(__cap && __cap.innerHTML).indexOf('stat-preshiqi') < 0,
        String(__cap && __cap.innerHTML).slice(0, 160));
      __cap = null;
      g = __base('ganshiren'); g.summons = [{ type: 'zhiren', v: 2, dur: 1 }];
      renderTopbar();
      __ok('v0.61.37 顶栏 纸人 dur1 → 小标显示「预+2」（死亡返还）',
        String(__cap && __cap.innerHTML).indexOf('预+2') >= 0,
        String(__cap && __cap.innerHTML).slice(0, 160));
      __cap = null;
      g = __base('wuseng'); g.summons = [{ type: 'zhiren', v: 2, dur: 2 }];
      renderTopbar();
      __ok('v0.61.37 顶栏 非赶尸人不渲染预尸气（武僧有预格挡但不该有预尸气）',
        String(__cap && __cap.innerHTML).indexOf('stat-preshiqi') < 0,
        String(__cap && __cap.innerHTML).slice(0, 160));
    } catch (e) {
      __ok('v0.61.37 顶栏预尸气渲染用例未抛错', false, String(e && e.message));
    } finally { document.getElementById = __savedGid; }
  })();

  rep.pass = _p; rep.fail = _f;
  try { globalThis.__report = rep; } catch (e) { this.__report = rep; }
})();
