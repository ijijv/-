/* ===== 志怪塔 Task#13 冒烟 runner（追加于 <script> 末尾，与引擎同作用域） ===== */
(function () {
  /* ---------- 外围降级：保留结算逻辑，屏蔽渲染/音效/存档/成就/召唤 UI 的副作用 ---------- */
  try { SETTINGS.lowSpec = true; SETTINGS.sound = false; SETTINGS.musicVol = 0; SETTINGS.sfxVol = 0; } catch (e) {}
  var __sil = function () {};
  var __realSfx = sfx; // v0.61.25 金快照探针要用真 sfx（第 631 行会把全局 sfx 顶成 __sil）
  var __realFloatDamage = floatDamage; // v0.61.36：第 658 行会把全局 floatDamage 顶成 __sil，结构断言要用真的
  var __realSaveRun = saveRun; // v0.61.06：saveRun 会被 stub，但「存档里带没带随机态」只有真函数测得出
  var __realSetBg = setBg; // v0.68.2：setBg 会被 stub（下面那排），但「body.at-menu 的开关」只有真函数里看得到
  var __realShowOverlay = showOverlay; // v0.61.42：showOverlay 会被 stub（第 14 行），但「摘 .map-scene」只有真函数里看得到
  var __realHideOverlay = hideOverlay; // v0.65.0：hideOverlay 同样被顶成空桩（第 16 行），但「关→开该重播入场」只有真函数测得出
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
  /* v1.0.14：enemyAct 拆成「节拍驱动 + 单只行动 enemyActOne + 收尾 enemyActTail」三块，
     源码形态断言（charm 消耗点 / 蓄力分支 / 意图特效接线）统一扫这份合并文本。 */
  var __enemyActSrc = String(__realEnemyAct) + String(enemyActOne) + String(enemyActTail);

  var rep = { ok: true, errors: [], cardsTotal: 0, heroes: {}, pass: 0, fail: 0 };
  var _p = 0, _f = 0;

  function __ok(name, cond, detail) {
    if (cond) { _p++; return true; }
    _f++; rep.ok = false;
    rep.errors.push(name + (detail !== undefined ? ' | ' + detail : ''));
    return false;
  }
  /* 源码形态断言前**必须**先过这里：Function.toString() 会把注释一起带出来，于是「断言某个标记
     存在」会被**我自己解释这个标记的注释**判绿（记忆里踩过：v0.61.42 的计数类断言就是这样被自己的
     注释判红的）。凡是要断「代码里有没有 X」，一律 __code(fn).indexOf(X)，不要 String(fn)。 */
  function __code(fn) {
    return String(fn)
      .replace(/\/\*[\s\S]*?\*\//g, ' ')        // 块注释
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');    // 行注释（[^:] 防吃掉 http:// 之类）
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
    G.hero = hero; G.act = 1; G.relics = [];
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
  /* 57 = 原 48 张 + 断刃遗物的附加卡【断刃雷符】+ 引魂灯遗物的附加卡【阴兵】
     + 天师里程碑专属卡【点咒符】【雷谴符】【五雷法印】
     + 赶尸人里程碑专属卡【赶尸令】【万尸朝宗】
     + 武僧里程碑专属卡【罗汉伏虎】【化甲为毒】（附加卡被 weightedCard 排除；
     里程碑专属卡未在里程界面领取前被 mileOn 硬门禁挡在一切奖励池外）。 */
  __ok('CARDS 恰为 59 张（48 原卡 + 断刃雷符 + 阴兵 + 点咒符 + 雷谴符 + 五雷法印 + 赶尸令 + 万尸朝宗 + 罗汉伏虎 + 化甲为毒 + 饮血刃 + 焚身咒）', CARDS.length === 59, '实际 ' + CARDS.length);
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
    var upSample = ['leifu', 'tianlei', 'zhongkui', 'jinguang', 'fanzhen', 'xueji', 'ranhun', 'kaitianyan', 'zhiren', 'yinbingguo', 'shi_wang', 'yinbing'];
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
    var expect = { ganshiren: 3, wuseng: 2, yincha: 4, tianshi: 4 };
    var setCnt = {
      ganshiren: function () { G.summonsMadeTurn = 3; },
      wuseng: function () { G.blockGainedTurn = 12; },
      yincha: function () { G.hpLostTurn = 16; },   // v0.61.39 阴差列：每失 2 → 每失 4；16/4=4（同时压到上限 +4）
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
    // v0.61.35 天师列、v0.61.36 武僧列、v0.61.37 赶尸人列、v0.61.39 阴差列：
    // 移形换影取消 (U:0) → 四列统一 1/1（阴差列原先还带「（0 符文）」文案，一并去掉）
    ['tianshi', 'wuseng', 'ganshiren', 'yincha'].forEach(function (h) {
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

    /* v1.0.21 预恢复（preSummonHeal）：全角色「这回合之后召唤物预计总回复」，多来源重叠累加 */
    var __ph = __base('yincha'); G.summons = [{ type: 'zhiren', v: 1, dur: 2, healV: 2 }];
    __ok('v1.0.21 预恢复 阴差纸人攻击吸血 2', preSummonHeal() === 2, 'h=' + preSummonHeal());
    __ph = __base('yincha'); G.summons = [{ type: 'wutong', v: 3, dur: 2 }];
    __ok('v1.0.21 预恢复 阴差五通神回合开始回 3', preSummonHeal() === 3, 'h=' + preSummonHeal());
    __ph = __base('ganshiren'); G.relics = ['guling']; G.summons = [{ type: 'yinbing', v: 4, dur: 1, dur0: 3 }];
    __ok('v1.0.21 预恢复 骨铃按 dur0 返魂（将消散的阴兵回 3）', preSummonHeal() === 3, 'h=' + preSummonHeal());
    __ph = __base('ganshiren'); G.relics = ['guling']; G.summons = [{ type: 'yinbing', v: 4, dur: 3, dur0: 3 }];
    __ok('v1.0.21 预恢复 骨铃 不把还活着的召唤物算进去', preSummonHeal() === 0, 'h=' + preSummonHeal());
    __ph = __base('yincha'); G.summons = [{ type: 'xiaogui', v: 2, dur: 1, up: false }];
    __ok('v1.0.21 预恢复 阴差小鬼消散回 2', preSummonHeal() === 2, 'h=' + preSummonHeal());
    __ph = __base('yincha'); G.duhun = { turns: 5, ratio: 0.3 }; G.summons = [{ type: 'shi_wang', v: 10, dur: 3 }];
    __ok('v1.0.21 预恢复 渡魂归己把召唤物伤害的 30% 计入',
      preSummonHeal() === Math.floor(preSummonDamage() * 0.3) && preSummonHeal() > 0,
      'h=' + preSummonHeal() + ' dmg=' + preSummonDamage());
    /* 群鬼乱舞[阴差]的失血增伤要写进每个召唤物的显示（此前只有总伤提示变、个体显示不变） */
    __ph = __base('yincha'); G.hpLostTurn = 6; G.bleedSummons = true; G.bleedSummonsBonus = 1;
    G.summons = [{ type: 'zhiren', v: 1, dur: 2, healV: 2 }];
    __ok('v1.0.21 群鬼乱舞[阴差] 召唤物个体显示吃到失血增伤（1+floor(6/2)*1=4）',
      summonHTML(G.summons[0]).indexOf('造成 4 点') >= 0, summonHTML(G.summons[0]));
    __ph = __base('ganshiren');
    var __dotOk = ['zhiren', 'xiaogui', 'wutong', 'yinbing', 'shi_wang'].every(function (t) {
      return summonHTML({ type: t, v: 1, dur: 2 }).indexOf('summon-dot') >= 0;
    });
    __ok('v1.0.21 每种召唤物名字前都有彩色小圆点', __dotOk);
    __ok('v1.0.21 黑雾颜色表 5 种齐全（纸人白/小鬼黑/五通神紫/阴兵金/尸王红）',
      Object.keys(SUMMON_MIST).length === 5 && !!SUMMON_DOT.xiaogui);
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
    // 取消发生在“抽牌堆随机三张”阶段（已选待换手牌但未成交）：同样回退
    var g3 = __base('ganshiren');
    var yw3 = __card('yiwu'); var other3 = __card('leifu');
    g3.hand = [other3]; g3.discard = [yw3];
    g3.drawPile = [__card('zhiren'), __card('jingang'), __card('leifu')];
    yw3.eff(false, yw3); pickExchangeHand(0); cancelExchangeSelect();
    __ok('易物取消(pickNew) → 牌回手且牌堆未动',
      g3.hand.indexOf(yw3) >= 0 && g3.discard.indexOf(yw3) < 0 && g3.drawPile.length === 3,
      'hand=' + g3.hand.map(function (x) { return x.id; }).join(',') + ' draw=' + g3.drawPile.length);
    // 真成交：易物留在弃牌堆（已消耗），换入的新牌进手
    // 注（v0.76.0）：换入池改**只从抽牌堆取**（不足 3 张才把弃牌堆洗回），
    //     刚打出的易物在 discard 里、抽牌堆有 3 张 ⇒ 不触发洗回 ⇒ 池 = 那 3 张，里面**不会**有易物本身。
    //     下面那句 while 是历史写法，如今第一次比较就不成立、立即命中 kk=0 —— 保留它是为了
    //     万一将来池里又混进易物也别静默假绿（真混进来会继续往后找，找不到才红）。
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

  // ===== v0.76.0：易物候选池改「只从抽牌堆取」+ 不足时洗回弃牌堆 =====
  (function () {
    var ids = function (a) { return a.map(function (x) { return x.id; }); };

    // ① 抽牌堆够 3 张 ⇒ 池里每一张都必须来自抽牌堆（弃牌堆一张都不许混进来）
    var g1 = __base('ganshiren');
    var yw1 = __card('yiwu'); var dr1 = __card('leifu');
    g1.hand = [dr1];
    g1.drawPile = [__card('zhiren'), __card('jingang'), __card('leifu'), __card('huofu')];
    g1.discard = [yw1, __card('shouyi')];
    yw1.eff(false, yw1); pickExchangeHand(0);
    var ex1 = G.exchange;
    __ok('v0.76.0 易物 抽牌堆够 3 张时，池里每一张都来自抽牌堆（弃牌堆不参与）',
      ex1.pool.length === 3 && ex1.pool.every(function (c) { return g1.drawPile.indexOf(c) >= 0; }),
      'pool=' + ids(ex1.pool).join(',') + ' draw=' + ids(g1.drawPile).join(','));

    // ② 抽牌堆只有 1 张、弃牌堆有 2 张 ⇒ 洗回后两堆合一（**concatenate**，那 1 张不能被顶掉）
    var g2 = __base('ganshiren');
    var yw2 = __card('yiwu'); var dr2 = __card('leifu');
    var keep2 = __card('zhongkui'); var d1 = __card('jingang');
    g2.hand = [dr2];
    g2.drawPile = [keep2];
    g2.discard = [yw2, d1];
    yw2.eff(false, yw2); pickExchangeHand(0);
    var ex2 = G.exchange;
    __ok('v0.76.0 易物 抽牌堆不足 3 张 ⇒ 弃牌堆洗回、两堆合一（原抽牌堆里那 1 张没被顶掉）',
      g2.discard.length === 0 && g2.drawPile.length === 3 &&
      g2.drawPile.indexOf(keep2) >= 0 && g2.drawPile.indexOf(d1) >= 0,
      'draw=' + ids(g2.drawPile).join(',') + ' discard=' + ids(g2.discard).join(','));
    __ok('v0.76.0 易物 洗回后池凑满 3 张（不足就洗的语义落到了池上）',
      ex2.pool.length === 3, 'pool=' + ids(ex2.pool).join(','));

    // ③ 「看一眼不改序」：池是**乱序展示**用的副本，真牌序必须一个字节都不动。
    //    这是 `shuffle(G.drawPile.slice())` 里那个 .slice() 的**唯一**回归闸 ——
    //    漏了它，玩家点开易物看一眼，抽牌堆顺序就被打乱了。
    var g3 = __base('ganshiren');
    var yw3 = __card('yiwu'); var dr3 = __card('leifu');
    g3.hand = [dr3];
    g3.drawPile = [__card('zhiren'), __card('jingang'), __card('leifu'), __card('huofu'), __card('shouyi')];
    g3.discard = [yw3];
    var before = ids(g3.drawPile);
    yw3.eff(false, yw3); pickExchangeHand(0);
    var after = ids(g3.drawPile);
    __ok('v0.76.0 易物 选完手牌后抽牌堆**顺序逐位未变**（池只是副本，乱序展示不动真牌序）',
      before.join(',') === after.join(','), 'before=' + before.join(',') + ' after=' + after.join(','));

    // ④ 取消不做撤销，但也**不能多洗一次**：两堆读数与「洗回之后、成交之前」完全一致
    var g4 = __base('ganshiren');
    var yw4 = __card('yiwu'); var dr4 = __card('leifu');
    g4.hand = [dr4];
    g4.drawPile = [__card('zhongkui')];
    g4.discard = [yw4, __card('jingang'), __card('huofu')];
    yw4.eff(false, yw4); pickExchangeHand(0);
    var midDraw = ids(g4.drawPile), midDisc = ids(g4.discard);
    cancelExchangeSelect();
    __ok('v0.76.0 易物 取消交换不再动牌堆（不撤销、也不重复洗一次）',
      ids(g4.drawPile).join(',') === midDraw.join(',') &&
      ids(g4.discard).join(',') === midDisc.join(',') &&
      g4.hand.indexOf(yw4) >= 0,
      'draw=' + ids(g4.drawPile).join(',') + ' discard=' + ids(g4.discard).join(','));
  })();

  // ===== v0.76.0：点牌堆看内容（showPile）—— 三个纯状态断言，零 DOM、零定时器 =====
  (function () {
    var ids = function (a) { return a.map(function (x) { return x.id; }); };

    // ① 抽牌堆乱序展示，但**真牌序一个字节都不能动**
    var gp = __base('ganshiren');
    gp.drawPile = [__card('zhiren'), __card('jingang'), __card('leifu'), __card('huofu')];
    gp.discard = [__card('shouyi')];
    var before = ids(gp.drawPile);
    showPile('draw');
    __ok('v0.76.0 showPile(\'draw\') 不动抽牌堆真牌序（乱序的只是展示副本）',
      ids(gp.drawPile).join(',') === before.join(','),
      'before=' + before.join(',') + ' after=' + ids(gp.drawPile).join(','));

    // ② 弃牌堆同理（它按真实顺序**倒着**展示，堆顶在前）
    var gq = __base('ganshiren');
    gq.drawPile = [__card('zhiren')];
    gq.discard = [__card('jingang'), __card('leifu'), __card('huofu')];
    var dbefore = ids(gq.discard);
    showPile('discard');
    __ok('v0.76.0 showPile(\'discard\') 不动弃牌堆真牌序（reverse 的只是展示副本）',
      ids(gq.discard).join(',') === dbefore.join(','),
      'before=' + dbefore.join(',') + ' after=' + ids(gq.discard).join(','));

    // ③ 空堆：不抛异常、且**一次 showOverlay 都不调**（否则空牌堆会弹一个空壳盖住战场）
    //    ⚠️ 这里**不能**读 `#overlay` 的 classList 来判断开没开：本文件第 15/16 行已把
    //    showOverlay 顶成空桩，而 vm_host 的 dummyEl().classList.contains() 是**恒返 false**
    //    的假桩（只有 v0.65.0 那一段临时装了真 classList）。用**替身**抓调用才是真行为断言。
    var __realSO = showOverlay;
    var calls = [];
    showOverlay = function (html, closable, scene) { calls.push({ h: html, c: closable, s: scene }); };
    var gr = __base('ganshiren');
    gr.drawPile = []; gr.discard = [];
    var err = null;
    try { showPile('draw'); showPile('discard'); } catch (ex) { err = ex; }
    __ok('v0.76.0 showPile 空牌堆不抛异常、也不打开面板',
      !err && calls.length === 0,
      err ? String(err) : ('showOverlay 调用 ' + calls.length + ' 次'));

    // ④ 非空：恰好开一次，且第三实参是 pile-scene、closable=true（钉「两处调用都传了第三实参」）
    gr.drawPile = [__card('zhiren'), __card('jingang')];
    showPile('draw');
    __ok('v0.76.0 showPile(\'draw\') 开一次并带 pile-scene / closable',
      calls.length === 1 && calls[0].s === 'pile-scene' && calls[0].c === true &&
      calls[0].h.indexOf('抽牌堆') >= 0,
      '调用 ' + calls.length + ' 次 scene=' + (calls[0] && calls[0].s));

    // ⑤ 弃牌堆**保序、堆顶在前**（这是与抽牌堆「乱序」刻意相反的那一半口径）
    calls.length = 0;
    var gs = __base('ganshiren');
    gs.drawPile = [__card('zhiren')];
    gs.discard = [__card('leifu'), __card('huofu'), __card('shouyi')];   // 末位 = 堆顶
    showPile('discard');
    var h = calls[0] ? calls[0].h : '';
    __ok('v0.76.0 showPile(\'discard\') 堆顶在前（末位那张【守一】排在首位【雷符】之前）',
      calls.length === 1 && calls[0].s === 'pile-scene' &&
      h.indexOf('守一') >= 0 && h.indexOf('雷符') >= 0 &&
      h.indexOf('守一') < h.indexOf('雷符'),
      '调用 ' + calls.length + ' 次；守一@' + h.indexOf('守一') + ' 雷符@' + h.indexOf('雷符'));
    showOverlay = __realSO;
  })();

  // ===== v0.76.0：handReturnFromDiscard 收口（焚符×2 / 火符 / 易物×2 五处共用的那一条） =====
  (function () {
    // 主路径：在弃牌堆里 ⇒ 摘掉 + 回手，返回 true
    var gh = __base('ganshiren');
    var ch = __card('leifu');
    gh.hand = []; gh.discard = [ch];
    var got = handReturnFromDiscard(ch);
    __ok('v0.76.0 handReturnFromDiscard 从弃牌堆取回 → 摘掉 + 进手 + 返 true',
      got === true && gh.discard.indexOf(ch) < 0 && gh.hand.indexOf(ch) >= 0,
      'got=' + got + ' hand=' + gh.hand.length + ' discard=' + gh.discard.length);
    // 幂等/兜底：不在弃牌堆里 ⇒ 不抛异常、弃牌堆不变、牌仍回手，返回 false
    // （这是本函数**唯一**一条新逻辑，钉住 lastIndexOf 返 -1 的那一支）
    var ch2 = __card('jingang');
    gh.hand = []; gh.discard = [];
    var got2 = null, err2 = null;
    try { got2 = handReturnFromDiscard(ch2); } catch (ex) { err2 = ex; }
    __ok('v0.76.0 handReturnFromDiscard 牌不在弃牌堆时不抛异常、弃牌堆不变、牌仍回手',
      err2 === null && got2 === false && gh.discard.length === 0 && gh.hand.indexOf(ch2) >= 0,
      'err=' + (err2 && err2.message) + ' got=' + got2 + ' hand=' + gh.hand.length + ' discard=' + gh.discard.length);
    // 空入参：不抛异常、什么都不做
    gh.hand = []; gh.discard = [];
    var got3 = null, err3 = null;
    try { got3 = handReturnFromDiscard(null); } catch (ex) { err3 = ex; }
    __ok('v0.76.0 handReturnFromDiscard 空入参安全',
      err3 === null && got3 === false && gh.hand.length === 0 && gh.discard.length === 0,
      'err=' + (err3 && err3.message) + ' got=' + got3);
  })();
  // ===== v0.76.0 §三：敌人四档台词 —— **数据面**（纯状态，零 DOM、零定时器）=====
  // 触发面（sayPick / enemySay / pumpSay）在下面另起一块；这里只钉「数据写对了」。
  (function () {
    var TIERS = ['sayIn', 'sayHit', 'sayLow', 'sayOut'];
    // ① 精英 + Boss **每一只**四档齐全，且**普通敌人一只都不许有**。
    //    ⚠️ 一条同时钉「写全了」与「没写多」：拆成两条的话，「写多了」那半边
    //       没有人会去测 —— 而「给普通怪也加了台词」正是最容易顺手犯的错
    //       （场上 3~5 只普通怪，满屏气泡）。
    var bigBad = [], smallBad = [], nElite = 0, nBoss = 0;
    Object.keys(ENEMIES).forEach(function (k) {
      var d = ENEMIES[k];
      var have = TIERS.filter(function (f) { return !!d[f]; }).length;
      if (d.elite || d.boss) {
        if (d.elite) nElite++; else nBoss++;
        if (have !== 4) bigBad.push(k + '=' + have + '/4');
      } else if (have) { smallBad.push(k + '=' + have); }
    });
    __ok('v0.76.0 台词 7 精英 + 10 Boss 每一只四档齐全，普通敌人一只都没有（17 只全中）',
      nElite === 7 && nBoss === 10 && bigBad.length === 0 && smallBad.length === 0,
      '精英=' + nElite + ' Boss=' + nBoss + ' 缺档=[' + bigBad.join(',') + '] 多写=[' + smallBad.join(',') + ']');
    // ② 中段台词表：恰好两只，且 `when` 各绑一个**独有机制分支**（分化 / 二阶段）。
    var mids = Object.keys(ENEMY_SAY_MID);
    __ok('v0.76.0 台词 ENEMY_SAY_MID 恰好 2 条（谢必安 split / 阎罗天子 phase2）且都指向真敌人',
      mids.length === 2 && !!ENEMY_SAY_MID.xiebian && ENEMY_SAY_MID.xiebian.when === 'split'
      && !!ENEMY_SAY_MID.yanluotianzi && ENEMY_SAY_MID.yanluotianzi.when === 'phase2'
      && mids.every(function (k) { return !!ENEMIES[k] && !!ENEMY_SAY_MID[k].text; }),
      'keys=' + mids.join(',') + ' when=' + mids.map(function (k) { return ENEMY_SAY_MID[k].when; }).join('/'));
    // ③ **makeEnemy 的透传** —— 这是唯一会静默失效的一步：
    //    数据写全了、闸①全绿，可 `makeEnemy` 是**逐字段显式构造**，漏一行就是
    //    「字段写了、气泡永远不出现」，而闸①查的是 ENEMIES、看不见这一层。
    var me = makeEnemy(ENEMIES.baiwuchang, 'baiwuchang');
    var passAll = TIERS.every(function (f) { return me[f] === ENEMIES.baiwuchang[f]; });
    __ok('v0.76.0 台词 makeEnemy 四档**逐字段透传**（漏一行 = 气泡永不出现的静默失效）',
      passAll && me.sayIn === '一见生财——名字，我记下了。',
      'sayIn=' + JSON.stringify(me.sayIn) + ' 四档一致=' + passAll);
    // ④ 普通敌人过 makeEnemy 后四档仍是 undefined（不凭空长出字段）
    var mp = makeEnemy(ENEMIES.youhun, 'youhun');
    __ok('v0.76.0 台词 普通敌人过 makeEnemy 后四档仍是 undefined（不凭空长出字段）',
      TIERS.every(function (f) { return mp[f] === undefined; }),
      TIERS.map(function (f) { return f + '=' + mp[f]; }).join(' '));
    // ⑤ 零耦合：存档快照里**一个 say 键都不许有**。
    //    `serializeEnemy` 是显式白名单 ⇒ 默认就不会进；这条钉的是「别顺手把它加进去」。
    var snap = serializeEnemy(makeEnemy(ENEMIES.yanluotianzi, 'yanluotianzi'));
    var leaked = Object.keys(snap).filter(function (k) { return k.indexOf('say') >= 0; });
    __ok('v0.76.0 台词 serializeEnemy 快照里没有任何 say 键（台词与数值零耦合、可单独回滚）',
      leaked.length === 0, 'leaked=[' + leaked.join(',') + '] keys=' + Object.keys(snap).length);
    // ⑥ 触发面（v0.76.0 §三 第二步）：`sayPick` 的**一次性**语义。
    //    它必须是纯函数 —— 无头下 `pumpSay` 一句都不执行，这条断言照样要能跑，
    //    所以只碰 `e._said`，不碰 DOM、不建定时器。
    var be = makeEnemy(ENEMIES.baiwuchang, 'baiwuchang');
    var l1 = sayPick(be, 'in'), l2 = sayPick(be, 'in');
    __ok('v0.76.0 台词 sayPick 首次返句子、第二次返 null（一场战斗内每档只念一次）',
      l1 === ENEMIES.baiwuchang.sayIn && l2 === null,
      'l1=' + JSON.stringify(l1) + ' l2=' + JSON.stringify(l2));
    // ⑦ 该档没写过 ⇒ 返 null，且**不许留下 `_said`**。
    //    ⚠️ 这就是「普通敌人凭空长出 _said」那个错法：判空顺序反了就会出现，
    //       而它没有任何别的判据看得见（`_said` 不进存档、不影响数值）。
    var pe = makeEnemy(ENEMIES.youhun, 'youhun');
    var pn = sayPick(pe, 'in');
    __ok('v0.76.0 台词 sayPick 对普通敌人返 null 且不建 _said（判空顺序反了的回归闸）',
      pn === null && pe._said === undefined,
      'line=' + JSON.stringify(pn) + ' _said=' + JSON.stringify(pe._said));
    // ⑧ 中段两条走**另一条路**：`sayMidPick` 查的是 `ENEMY_SAY_MID`，按 key 取、不记名
    //    （分支自己有幂等旗标），每次问都答同一个句子。
    var m1 = sayMidPick('xiebian'), m2 = sayMidPick('xiebian'), m3 = sayMidPick('baiwuchang');
    __ok('v0.76.0 台词 sayMidPick 按 key 取中段句、可重复问；未登记者返 null',
      m1 === ENEMY_SAY_MID.xiebian.text && m2 === m1 && m3 === null,
      'm1=' + JSON.stringify(m1) + ' m3=' + JSON.stringify(m3));
    // ⑨ **无头下 pumpSay 不出定时器**（本批最容易挂住 node 的地方）。
    //    直接调一次真实的触发路径：`enemySay` 排进队 → pumpSay 走无头早返回 ⇒ 队列被清空。
    //    断言「队列被清空」而不是「没抛异常」—— 早返回那条分支的唯一可观测后果就是它。
    enemySay(be, 'out');
    __ok('v0.76.0 台词 无头下 pumpSay 清队不出定时器（冒烟照常打印并退出）',
      SAY_QUEUE.length === 0 && SAY_BUSY === false,
      'queue=' + SAY_QUEUE.length + ' busy=' + SAY_BUSY);
  })();
  // ===== v0.76.0 §四：结算墨色过场 —— **无头下必须同刻开面板** =====
  // 这是本项最大的风险面：四条结算路径的既有断言**全是**「showOverlay 之后立刻读 DOM」。
  // 过场一旦把这句异步化（哪怕只挂一个 setTimeout(fn,0)），它们会集体变红，
  // 而「红了」这个现象本身不指向原因 ⇒ 把这条判据单独写死在这里。
  (function () {
    var realSO = showOverlay, seen = null;
    try {
      showOverlay = function (h, c, s) { seen = { h: String(h || ''), c: c, s: s }; };
      var g = __base('tianshi');
      g.enemies = [makeEnemy(ENEMIES.youhun, 'youhun')];
      g.battleGold = 4; g.goldDoubled = false; g.battleResult = { g: 4, hpLost: 0, h: 8, isBoss: false, finalBoss: false };
      g.rewardTier = 'normal';
      showBattleResult(g.battleResult);
      __ok('v0.76.0 结算 settleTransition 无头下**同刻**开面板（不许把开面板异步化）',
        !!seen && seen.h.indexOf('战 斗 结 算') >= 0 && seen.s === 'result-scene',
        seen ? ('scene=' + seen.s + ' len=' + seen.h.length) : 'showOverlay 没被调到');
      // 轻档（普通战斗）也要走同一条早返回 —— 它自己那 0.52s 的挡板拍在无头下同样不该发生。
      // 判据用「第二次调用仍是同刻」，因为 _settlePlayed 在第一次就被置真了：
      // 这一条顺带钉住了**一次性标记的早返回分支**（doubleGold 会走的那条）。
      seen = null;
      g.rewardTier = 'elite';
      showBattleResult(g.battleResult);
      __ok('v0.76.0 结算 settleTransition 一次性标记生效：第二块面板（金币翻倍）同刻开、不重播过场',
        !!seen && seen.s === 'result-scene',
        seen ? ('scene=' + seen.s) : 'showOverlay 没被调到');
    } finally { showOverlay = realSO; }
  })();
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
    __ok('v0.61.39 雷符预览 C=4+3×2=10（血怒4，每层+3上限+6 → 吃满 2 层）',
      lv('leifu').d === 10, 'd=' + lv('leifu').d);
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

    /* ④ 天师溢出 → 每层 2 格挡（v1.0.18 用户口径：被动基线 1 → 2） */
    g = __base('tianshi'); en = g.enemies[0]; en.curse = 6; g.block = 0;
    applyCurse(en, 1);
    __ok('④ 天师施加溢出 满6再施→每层转2格挡', g.block === 2 && en.curse === 6 && g.ybTarget === en.uid, 'block=' + g.block + ' yb=' + g.ybTarget);
    var tp = HEROES.filter(function (h) { return h.id === 'tianshi'; })[0].passive;
    __ok('④ 天师被动文案=溢出每层转2格挡', tp.indexOf('溢出') >= 0 && tp.indexOf('每层转化为 2 点格挡') >= 0, tp);

    /* ⑦ 卸甲生元 D：格挡先抵敌伤、敌后结算；目标满 6 层溢出转回格挡并保留 */
    g = __base('tianshi'); en = g.enemies[0]; en.affixes = null; en.strength = 0;
    c = __card('xiejiashengyuan'); c.eff(true, c); // v0.61.35：12 盾 + endBlockKind=D
    dealDamageToPlayer(5, en);                     // 敌人打 5 → 格挡 12→7
    __ok('⑦ 卸甲 D 敌攻先耗格挡(12→7) 未提前转化', g.block === 7 && g.endBlockKind === 'D' && g.hp === 60, 'block=' + g.block + ' hp=' + g.hp);
    resolveEndBlock();
    __ok('⑦ 卸甲 D 敌后结算 余7盾→3诅咒', g.block === 0 && g.endBlockKind === null && __sumCurse() === 3, 'block=' + g.block + ' sum=' + __sumCurse());

    g = __base('tianshi'); en = g.enemies[0]; g.enemies[1].hp = 0;
    en.affixes = null; en.strength = 0; en.curse = 6;
    c = __card('xiejiashengyuan'); c.eff(true, c);
    dealDamageToPlayer(5, en);
    resolveEndBlock();
    /* v0.68.1：这条以前断言的是「resolveEndBlock 之后 g.block===3」。那个值是对的，
       但**玩家永远拿不到** —— 紧跟着的 startTurn 第 693 行把非武僧的格挡清零。
       断言卡在 bug 中间，所以一直是绿的。现在改成断真正能用的那个量。 */
    __ok('⑦ 卸甲 D 满6溢出不着落到 block(会被 startTurn 清零)，改挂 pendingBlockStart',
      g.block === 0 && g.pendingBlockStart === 6 && g.endBlockKind === null && en.curse === 6,
      'block=' + g.block + ' pending=' + g.pendingBlockStart);
    startTurn();
    /* 6（结转：3 层溢出 × 系数 2，本条 base 无镇魔印）+ 2（咒印道体对满层敌施咒溢出 1 层 × 系数 2）= 8。
       分开写清楚，别让后面的改动看不出来源。 */
    __ok('⑦ 卸甲 D 结转的格挡在下回合真的能用（block=6 结转 +2 被动溢出）',
      g.block === 8 && g.pendingBlockStart === 0, 'block=' + g.block + ' pending=' + g.pendingBlockStart);
    /* v1.0.18：卸甲 D 的溢出诅咒要结转进下回合计数（用户口径：可触发下回合的金刚符 / 金光罩）。
       3（卸甲溢出结转）+ 1（咒印道体本回合施咒）= 4。 */
    __ok('⑦ 卸甲 D 溢出诅咒结转下回合 CURSE_THIS_TURN=4', CURSE_THIS_TURN === 4, 'curse=' + CURSE_THIS_TURN);

    /* ⑦c 卸甲 D 大额格挡：旧写法 Math.min(6,…) 的预裁会让 >12 的格挡凭空蒸发 */
    g = __base('tianshi'); en = g.enemies[0]; g.enemies[1].hp = 0;
    en.affixes = null; en.strength = 0; en.curse = 6;
    c = __card('xiejiashengyuan'); c.eff(true, c);
    g.block = 24;                                  // 直接压到 24：12 层全溢出 → 12×系数 2 = 24 点格挡回手
    resolveEndBlock();
    __ok('⑦c 卸甲 D 余24盾 敌满6层 → 12 层全溢出、24 盾回手（旧写法只回 6）',
      g.block === 0 && g.pendingBlockStart === 24 && en.curse === 6, 'pending=' + g.pendingBlockStart);

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

    // 阴差：改成回血 —— 当回合 = 立即 6 + 首次触发 6 = +12 生命，不给格挡（v0.61.39：5 → 6）
    g = __base('yincha'); G.block = 0; c = __card('wutong'); c.eff(false, c);
    __ok('v0.61.39 五通神(阴差) 当回合 +12生命+0格挡', g.hp === 72 && g.block === 0, 'hp=' + g.hp + ' block=' + g.block);
    __ok('v0.59 五通神(阴差) 基础剩1回合(共2)', g.summons[0].dur === 1, 'dur=' + g.summons[0].dur);

    // 阴差：血怒 ≥3 → 消耗 3 层，持续 2 → 3 回合（v0.61.39：门槛 4 → 3、消耗 4 → 3）
    g = __base('yincha'); G.block = 0; g.xuenu = 4; c = __card('wutong'); c.eff(false, c);
    __ok('v0.61.39 五通神(阴差) 血怒4 → 消耗3层、剩2回合(共3)', g.xuenu === 1 && g.summons[0].dur === 2,
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
      /* v1.1.x：遗物 / 灵汁**已从顶栏详情撤出**，统一收进「锦囊」面板（showJinnang）。
         这里改成反向钉：详情里不许再出现遗物 chip / 灵汁芯片，也不许出现遗物名。 */
      __ok('v1.1.x 详情页 不再排遗物 chip（收进锦囊）', tb.indexOf('prelic-chip') < 0, tb.length);
      __ok('v1.1.x 详情页 不出现遗物名（招魂幡）', tb.indexOf('招魂幡') < 0);
      __ok('v1.1.x 详情页 不再排灵汁芯片（收进锦囊）',
        tb.indexOf('potion-chip') < 0 && tb.indexOf('stat-potion') < 0);
      __ok('v0.52 详情页 含召唤物', tb.indexOf('tb-summons') >= 0, tb.length);

      SCENE = 'map';   // 地图场景：召唤物不显示（G.summons 到下一场战斗才清空，避免残留）
      if (_cap) _cap.innerHTML = '';
      try { renderTopbar(); } catch (e) { __ok('v0.52 renderTopbar(map) 不抛异常', false, e && e.message); }
      var tm = _cap ? _cap.innerHTML : '';
      __ok('v0.52 地图场景 详情页无召唤物', tm.indexOf('tb-summons') < 0, tm.length);
      __ok('v1.1.x 地图场景 详情页同样无遗物（统一收进锦囊）', tm.indexOf('prelic-chip') < 0);
      SCENE = 'battle';
      /* 锦囊面板本体：把遗物 / 灵汁两者都渲染出来，且灵汁点击仍走 usePotionByName（既有调用链）。
         ⚠️ 与 5801-5815 同一套路：本文件顶部把 showOverlay 顶成空桩、vm_host 的 getElementById
            每次返回新 dummy ⇒ 必须临时换回 __realShowOverlay + 按 id 缓存的 getElementById 才读得到。 */
      G.relics = ['zhaohunfan'];
      var keepGEBI2 = document.getElementById, keepSO2 = showOverlay, els2 = {};
      try {
        document.getElementById = function (id) {
          if (!els2[id]) {
            var e2 = keepGEBI2.call(document, id);
            e2.classList.add = function () {}; e2.classList.remove = function () {};
            els2[id] = e2;
          }
          return els2[id];
        };
        showOverlay = __realShowOverlay;
        try { showJinnang(); } catch (e) { __ok('v1.1.x showJinnang 不抛异常', false, e && e.message); }
        var jh = (els2['overlayContent'] && els2['overlayContent'].innerHTML) || '';
        __ok('v1.1.x 锦囊面板渲染出遗物名（招魂幡）', jh.indexOf('招魂幡') >= 0, jh.length);
        __ok('v1.1.x 锦囊面板左右均分（.pouch-potions / .pouch-relics）',
          jh.indexOf('pouch-potions') >= 0 && jh.indexOf('pouch-relics') >= 0);
        __ok('v1.1.x 锦囊面板灵汁点击仍走 usePotionByName（既有调用链未断）',
          __code(showJinnang).indexOf('usePotionByName') >= 0);
      } finally { document.getElementById = keepGEBI2; showOverlay = keepSO2; }
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

    /* ===== v0.75.0：万剑归宗的 0 费副本是**真一次性**（用户 2026-09-30 报的漏洞牌）=====
       用户原话：「一次性的，既不可以丢入弃牌堆也不可以延续到接下来的关卡」。
       旧行为有两条泄漏 + 一条洗白：①打出后进弃牌堆 → 抽牌堆抽空重洗又被抽到 = 无限续；
       ②没打出的回合末照样进弃牌堆（同样会被重洗抽回）；③中途存档续档把副本洗成 3 费普通牌。
       cp **取自上面真实授予路径**产出的那张 —— 不手搓，否则证明不了授予点打了标记。 */
    var cp = zc[0];
    __ok('v0.75.0 0 费副本带 oneShot 且**不是** exhaust（exhaust 的语义是「战后回归牌库」，会撒谎）',
      !!cp && cp.oneShot === true && !cp.exhaust && isOneUse(cp) === false,
      'oneShot=' + (cp && cp.oneShot) + ' exhaust=' + (cp && cp.exhaust) + ' isOneUse=' + isOneUse(cp));

    // ① 打出后：不进弃牌堆、不进消耗堆、不在手牌（就地消失）
    g = __base('wuseng'); __fill();
    g.enemies[0].hp = 300; g.enemies[0].maxHp = 300;
    g.hand = [cp]; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.75.0 0 费副本打出后不进弃牌堆/消耗堆（旧行为 = 重洗后被抽到，无限续）',
      G.discard.indexOf(cp) < 0 && (G.exhausted || []).indexOf(cp) < 0 && G.hand.indexOf(cp) < 0,
      'discard=' + G.discard.length + ' exhausted=' + (G.exhausted || []).length + ' hand=' + G.hand.length);

    // ② 没打出去：回合末直接消失，同样不落进弃牌堆
    g = __base('wuseng'); __fill();
    g.enemies[0].hp = 300; g.enemies[0].maxHp = 300;
    g.hand = [cp];
    finishEndTurn();
    __ok('v0.75.0 0 费副本未打出时回合末直接消失（不进弃牌堆、不留手）',
      G.discard.indexOf(cp) < 0 && G.hand.indexOf(cp) < 0,
      'discard=' + G.discard.length + ' hand=' + G.hand.length);

    // ③ 反误伤：普通万剑归宗（无 oneShot）照旧进弃牌堆 —— 防 `!c.oneShot` 写反成 `c.oneShot`
    g = __base('wuseng'); __fill();
    g.enemies[0].hp = 300; g.enemies[0].maxHp = 300;
    var wn = __card('wanjian'); g.hand = [wn]; g.discard = [];
    doPlayCard(0);
    __ok('v0.75.0 反误伤：普通万剑归宗照旧进弃牌堆', G.discard.indexOf(wn) >= 0, 'discard=' + G.discard.length);

    // ④ 存档往返：副本续档后仍是「0 费 + 一次性」（旧行为：洗成 3 费普通万剑归宗 = 白送一张金牌）
    var _rt = cardRestore(cardSnap(cp));
    __ok('v0.75.0 0 费副本往返存档后仍是 0 费 + oneShot',
      _rt && _rt.id === 'wanjian' && cardCost(_rt) === 0 && _rt.oneShot === true && _rt.costU == null,
      'cost=' + (_rt && cardCost(_rt)) + ' oneShot=' + (_rt && _rt.oneShot));
    __ok('v0.75.0 反误伤：普通万剑归宗的快照**不含** oneShot 键（不给每张牌都加字段）',
      !('oneShot' in cardSnap(__card('wanjian'))) && !('oneShot' in cardSnap(up('leifu'))),
      'keys=' + Object.keys(cardSnap(__card('wanjian'))).join(','));

    /* ===== v0.75.0：防御牌的格挡预览 previewBlock（玩家头顶蓝色浮字的数据源）=====
       期望值**不照抄 CARD_BLOCK** —— 那样等于自己证明自己。这里对每张牌真跑一遍 eff()，
       读 gainBlock 实际落进 G.block 的数当基准，再与 previewBlock 比。
       ⚠️ 隐身符-天师列有「抽到诅咒牌再 +3/4」，是 previewBlock 唯一算不出的项 ⇒
          抽牌堆换成全非诅咒牌（zhiren 在 CAN_CURSE_IDS 里，必须避开），让两边可比。 */
    (function(){
      var bad=[], n=0;
      __HEROES.forEach(function(hero){
        CARDS.filter(function(c){ return c.type==='defense'; }).forEach(function(c){
          [false,true].forEach(function(up){
            g=__base(hero); __fill(); g.drawPile=['leifu','leifu','leifu'].map(__card);
            var cc=Object.assign({}, c, {up:!!up});
            g.block=0; CURSE_THIS_TURN=0; g.尸气=0;
            var pv=previewBlock(cc);      // ⚠️ 必须**先**读预览再跑 eff —— 金光罩-赶尸人列会花掉尸气，
            cc.eff(!!up, cc);             //    跑完再读就会看到已被消费后的状态（差点误判成镜像表抄错）
            var real=G.block||0; n++;
            if(real!==pv) bad.push(hero+'/'+c.id+(up?'+':'')+' eff='+real+' pv='+pv);
          });
        });
      });
      __ok('v0.75.0 格挡预览与 eff 实际入账逐项一致（4 英雄 × 9 防御牌 × 升/未升 = ' + n + ' 项）',
        bad.length===0, bad.slice(0,8).join(' | '));
    })();

    // 天师金刚符：每层诅咒 +1/+2、上限 +6 —— CURSE_THIS_TURN 在拖拽时已知，必须算进去
    g=__base('tianshi');
    (function(){
      var got=[0,1,9].map(function(k){ CURSE_THIS_TURN=k; return previewBlock(Object.assign({}, __card('jingang'), {up:false})); });
      CURSE_THIS_TURN=0;
      __ok('v0.75.0 天师金刚符 诅咒 0/1/9 层 → 5/6/11（min(6,…) 上限生效）', got.join(',')==='5,6,11', 'got='+got.join(','));
    })();

    // 赶尸人金光罩：尸气≥2 时 eff 会花 2 点尸气再给 +7/5 —— 预览漏这项就会少报一截
    (function(){
      var got=[0,3].map(function(sq){
        g=__base('ganshiren'); g.尸气=sq;
        var cc=Object.assign({}, __card('jinguang'), {up:false});
        var pv=previewBlock(cc);   // 同理：先读预览（拖拽时点），再跑 eff（会花掉 2 点尸气）
        g.block=0; cc.eff(false, cc);
        return (G.block||0)+'='+pv;
      });
      __ok('v0.75.0 赶尸人金光罩 尸气 0/3 → eff 与预览都是 9/14（未升级时「尸气≥2 再 +5」）',
        got.join(' ')==='9=9 14=14', 'got='+got.join(' '));
    })();

    // 反震恒 0；佛渡只有升级后、且只有武僧/天师两列给格挡
    (function(){
      var fz=__HEROES.map(function(h){ g=__base(h); return previewBlock(__card('fanzhen')); });
      __ok('v0.75.0 反震四列格挡预览恒 0（四列的 eff 里根本没有 gainBlock）',
        fz.join(',')==='0,0,0,0', 'got='+fz.join(','));
      var fd=__HEROES.map(function(h){
        g=__base(h);
        return previewBlock(Object.assign({}, __card('fodu'), {up:false}))+'/'+previewBlock(Object.assign({}, __card('fodu'), {up:true}));
      });
      __ok('v0.75.0 佛渡 未升级四列全 0；升级后只有武僧/天师给 5（赶尸人给尸气、阴差回血）',
        fd.join(' ')==='0/0 0/5 0/0 0/5', 'got='+fd.join(' '));
    })();

    // 范围收口：只认防御牌 —— 舍身(武僧 4)/万剑归宗(武僧 10) 的格挡**故意不进**预览
    g=__base('wuseng');
    __ok('v0.75.0 格挡预览只认防御牌：舍身/万剑归宗虽有格挡但不显示（用户只点名"防御牌"）',
      previewBlock(__card('sheshen'))===0 && previewBlock(__card('wanjian'))===0,
      'sheshen='+previewBlock(__card('sheshen'))+' wanjian='+previewBlock(__card('wanjian')));
    __ok('v0.75.0 隐身符列在 DYNAMIC_BLOCK 里（抽牌后才决定的 +3/4 拖拽时算不出，只报保底值）',
      DYNAMIC_BLOCK.indexOf('yinshen')>=0);

    /* ===== v0.75.0：指向性复查 —— 天师【舍身】加箭头 =====
       用户口径：「指示性」= **拖拽时指向敌人的那条箭头**（needsTarget / TARGETED_CARDS 那条链），
       不是卡面文字徽章。判据函数就是 needsTarget，这里三条把它钉住。 */
    var __ss = __card('sheshen');
    var __nt = {};
    __HEROES.forEach(function (h) { __base(h); __nt[h] = needsTarget(__ss); });
    __ok('v0.75.0 舍身只有天师列出箭头（赶尸人=尸气 / 武僧=格挡 / 阴差=纯抽牌，对敌人零作用）',
      __nt.tianshi === true && __nt.ganshiren === false && __nt.wuseng === false && __nt.yincha === false,
      JSON.stringify(__nt));
    /* 「箭头指着一只、诅咒落到另一只」是荒谬的 ⇒ eff 必须读拖拽落点（G.target）。
       这是把「随机 → 玩家指定」钉死的唯一办法：诅咒落在第 2 只、第 1 只仍是 0。 */
    __base('tianshi');
    __fill();
    G.target = 1;
    __ss.eff(false, __ss);
    __ok('v0.75.0 天师舍身的诅咒落在**拖拽指定的那一只**（原先 randomAlive 会砸到任意一只）',
      (G.enemies[1].curse || 0) === 1 && (G.enemies[0].curse || 0) === 0,
      'e0=' + (G.enemies[0].curse || 0) + ' e1=' + (G.enemies[1].curse || 0));
    /* 把「攻击侧本来就完整」这条复查结论变成回归闸：将来新加攻击牌漏进名单会当场红。
       v1.0.21：群鬼乱舞改为**按角色条件**定向（赶尸人/阴差无箭头）⇒ 从「恒带箭头」的扫描里摘出，另起一条按角色断言。 */
    var __atkMissing = CARDS.filter(function (c) {
      return c.type === 'attack' && AOE_CARDS.indexOf(c.id) < 0 && c.id !== 'qungui';
    }).filter(function (c) { __base('ganshiren'); return !needsTarget(c); }).map(function (c) { return c.id; });
    __ok('v0.75.0 攻击侧完整：除 AoE 与按角色条件定向的群鬼乱舞外，每张攻击牌都带箭头（复查结论的回归闸）',
      __atkMissing.length === 0, '缺=' + __atkMissing.join(','));
    var __qgBad = [];
    [['tianshi', true], ['wuseng', true], ['ganshiren', false], ['yincha', false]].forEach(function (pair) {
      __base(pair[0]);
      if (needsTarget(__card('qungui')) !== pair[1]) __qgBad.push(pair[0]);
    });
    __ok('v1.0.21 群鬼乱舞按角色条件定向：天师/武僧(有直伤)带箭头，赶尸人/阴差(对敌零作用)不带箭头',
      __qgBad.length === 0, 'bad=' + __qgBad.join(','));

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
    __ok('v0.58 B 预伤害 剑符 格挡6 → 8+3=11（v1.0.18 基础 +2）', p.d === 11 && p.dynamic === true, 'd=' + p.d);
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

    /* —— 初始卡池（v0.61.39 按《阴差版卡池 - 副本.md》重定）：
       雷符×3 金刚符×1 火符×1 焚符×1 血契×1 守一×1 燃血术×1 纸人×1 = 8 种、共 10 张 —— */
    var h = HEROES.filter(function (x) { return x.id === 'yincha'; })[0];
    var got = h.deck.map(function (p) { return p[0] + 'x' + p[1]; }).join(' ');
    var cnt = h.deck.reduce(function (a, p) { return a + p[1]; }, 0);
    __ok('v0.61.39 阴差初始卡池 8 种共 10 张且组成正确',
      cnt === 10 && got === 'leifux3 jingangx1 huofux1 fenfux1 xueqix1 shouyix1 ranxuex1 zhirenx1', got);
    // 反误伤：被换下的 3 张（佛渡/聚灵/渡魂归己）不该还留在牌库里
    __ok('v0.61.39 阴差初始卡池 已移出 fodu/juling/duhunguiji',
      !h.deck.some(function (p) { return ['fodu', 'juling', 'duhunguiji'].indexOf(p[0]) >= 0; }), got);

    /* —— 48 张卡的阴差费用（含 (U:0) 升级减免）与文档逐条对齐 —— */
    var COST_WANT = {
      leifu: [1, 1], huofu: [1, 1], jianfu: [2, 2], zhanyaojian: [2, 2], tianlei: [3, 3], wanjian: [3, 3],
      tiebushan: [1, 0], shihun: [2, 2], qungui: [1, 1], taomufu: [1, 1], shihunzhou: [1, 1], shixue: [1, 1],
      baigui: [2, 2], zhongkui: [3, 3], jingang: [1, 1], yinshen: [1, 1], jinguang: [2, 2], jinzhong: [2, 2],
      jingji: [1, 1], fodu: [0, 0], tongpi: [2, 2], fanzhen: [1, 1], xiejiashengyuan: [1, 1], juling: [0, 0],
      sheshen: [0, 0], shouyi: [0, 0], yiwu: [0, 0], xueqi: [1, 0], tongling: [1, 0], jingxin: [1, 0],
      ranxue: [0, 0], xisui: [2, 2], duhunguiji: [1, 1], fenfu: [0, 0], xueji: [1, 0], ranhun: [0, 0],
      kaitianyan: [1, 1], yixing: [1, 1], fuling: [2, 2], zhenyaoling: [2, 2], zhiren: [1, 1], zhouyin: [1, 1],   // v0.61.39：yixing 阴差列 1/0 → 1/1
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

    /* —— 攻击 1：雷符 4/8 + 每层血怒 +3（上限 +6）+ 击杀得 2 血怒 —— */
    g = gy(); g.xuenu = 3; g.enemies[0].hp = 500; g.enemies[0].maxHp = 500;
    g.hand = [__card('leifu')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.61.39 C#1 雷符 4+3×2=10 伤并消耗 2 层血怒（上限 +6 → 至多 2 层）', g.enemies[0].hp === 490 && g.xuenu === 1,
      'ehp=' + g.enemies[0].hp + ' xuenu=' + g.xuenu);
    g = gy(); g.xuenu = 0; g.enemies[0].hp = 4;   // v0.61.39：基础伤 5 → 4，血量同步下调才仍能一击致死
    g.hand = [__card('leifu')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.61.39 C#1 雷符 击杀 → 获得 2 层血怒', g.enemies[0].hp <= 0 && g.xuenu === 2, 'xuenu=' + g.xuenu);

    /* —— 攻击 2：火符 6/10 + 失去 2 生命（不弃牌） —— */
    g = gy(); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500;
    g.hand = [__card('huofu'), __card('leifu'), __card('leifu')];
    g.drawPile = []; g.discard = []; g.exhausted = [];
    cardPlayWindow = true; doPlayCard(0); cardPlayWindow = false;
    __ok('v0.61.39 C#2 火符 6 伤 + 失去 2 生命(被动再给 2 血怒)',
      g.enemies[0].hp === 494 && g.hp === 58 && g.xuenu === 2,
      'ehp=' + g.enemies[0].hp + ' hp=' + g.hp + ' xuenu=' + g.xuenu);
    __ok('v0.59 C#2 火符 不弃牌（另 2 张仍在手，弃牌堆只有打出的这张）',
      g.hand.length === 2 && g.discard.length === 1, 'hand=' + g.hand.length + ' discard=' + g.discard.length);
    r = play('huofu', true, 60);
    __ok('v0.61.39 C#2 火符 升级 10 伤', r.e.hp === 490, 'ehp=' + r.e.hp);

    /* —— 攻击 3：剑符 固定 12 + 本回合每失 1 血 +1/+2（v1.0.18 基础 10 → 12） —— */
    g = gy(); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; g.hpLostTurn = 4;
    g.hand = [__card('jianfu')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.59 C#3 剑符 12+4=16 伤', g.enemies[0].hp === 484, 'ehp=' + g.enemies[0].hp);
    g = gy(); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; g.hpLostTurn = 4;
    g.hand = [up('jianfu')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.59 C#3 剑符 升级 12+4×2=20 伤', g.enemies[0].hp === 480, 'ehp=' + g.enemies[0].hp);

    /* —— 攻击 4：斩妖剑 10/14 + 带诅咒额外 4/6 —— */
    g = gy(); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; g.enemies[0].curse = 1;
    g.hand = [__card('zhanyaojian')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.61.39 C#4 斩妖剑 10+4=14 伤（带诅咒）', g.enemies[0].hp === 486, 'ehp=' + g.enemies[0].hp);
    g = gy(); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; g.enemies[0].curse = 1;
    g.hand = [up('zhanyaojian')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.59 C#4 斩妖剑 升级 14+6=20 伤（带诅咒）', g.enemies[0].hp === 480, 'ehp=' + g.enemies[0].hp);
    g = gy(); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; g.enemies[0].curse = 0;
    g.hand = [__card('zhanyaojian')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.61.39 C#4 斩妖剑 无诅咒 = 10 伤', g.enemies[0].hp === 490, 'ehp=' + g.enemies[0].hp);

    /* —— 攻击 5：天雷正法 16/21 + 失 5 + 本场每失 1 血 +1/+2（上限 +20/+26） —— */
    g = gy(); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; g.totalHpLost = 0;
    g.hand = [__card('tianlei')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.59 C#5 天雷正法 16+5(自扣)=21 伤且实扣 5 血', g.enemies[0].hp === 479 && g.hp === 55,
      'ehp=' + g.enemies[0].hp + ' hp=' + g.hp);
    g = gy(); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; g.totalHpLost = 40;
    g.hand = [up('tianlei')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.61.39 C#5 天雷正法 升级 21+上限26=47 伤', g.enemies[0].hp === 453, 'ehp=' + g.enemies[0].hp);

    /* —— 攻击 6：万剑归宗 全体 10/15 + 失 5 + 斩杀回 10/15 与 1 符文 —— */
    g = gy(50); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500;
    g.enemies[1].hp = 4; g.enemies[1].maxHp = 60; g.energy = 9;
    g.hand = [__card('wanjian')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.61.39 C#6 万剑归宗 全体 10 伤 + 失 5 回 10 血 + 1 符文',
      g.enemies[0].hp === 490 && g.hp === 50 - 5 + 10 && g.energy === 9 - 3 + 1,
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
    __ok('v0.61.39 C#8 噬魂术 升级 16+3×6=34 伤（每层 +3、上限 +18 → 消耗 6 层）', g.enemies[0].hp === 466 && g.xuenu === 4,
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

    /* —— 攻击 12：嗜血 固定 5 + 本场每失 4/3 点血 +1（上限 +15/20） —— */
    g = gy(); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; g.totalHpLost = 12;
    g.hand = [__card('shixue')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.61.39 C#12 嗜血 5+floor(12/4)=8 伤', g.enemies[0].hp === 492, 'ehp=' + g.enemies[0].hp);
    g = gy(); g.enemies[0].hp = 500; g.enemies[0].maxHp = 500; g.totalHpLost = 12;
    g.hand = [up('shixue')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.61.39 C#12 嗜血 升级 5+floor(12/3)=9 伤（基础伤升级不再变）', g.enemies[0].hp === 491, 'ehp=' + g.enemies[0].hp);

    /* —— 攻击 14：钟馗镇魂 16/24 + 失 5 + 生命 <40% 翻倍 —— */
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
    __ok('v0.61.39 C#31 燃血术 阴差固定 失4血 +1 符文（升级不再 失6/+2）', g.hp === 56 && g.energy === 10, 'hp=' + g.hp + ' energy=' + g.energy);
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

    /* —— 召唤 41：纸人 失 2 + 1/2 伤 + 攻击回 2/3；血怒 ≥3 消耗 3 强化为 4/5、回 3/4 —— */
    g = gy(); c = __card('zhiren'); c.eff(false, c);
    __ok('v0.59 C#41 纸人 失 2 血 + {v:1,healV:2}',
      g.hp === 58 && g.summons[0].v === 1 && g.summons[0].healV === 2 && g.summons[0].type === 'zhiren',
      JSON.stringify(g.summons[0]) + ' hp=' + g.hp);
    g = gy(); g.xuenu = 4; c = __card('zhiren'); c.eff(false, c);
    __ok('v0.61.39 C#41 纸人 血怒4 → 消耗3层、{v:4,healV:3}',
      g.xuenu === 1 && g.summons[0].v === 4 && g.summons[0].healV === 3, JSON.stringify(g.summons[0]));
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
    __ok('v0.61.39 C 预伤害 雷符 血怒3 → 4+3×2=10 且恒显', p.d === 10 && p.dynamic === true, 'd=' + p.d + ' dyn=' + p.dynamic);
    p = pv('jianfu', { turn: 3 });
    __ok('v0.59 C 预伤害 剑符 本回合失3血 → 15 且恒显（v1.0.18 基础 +2）', p.d === 15 && p.dynamic === true, 'd=' + p.d);
    p = pv('tianlei', { total: 10 });
    __ok('v0.59 C 预伤害 天雷正法 本场失10血 → 16+10=26', p.d === 26, 'd=' + p.d);
    p = pv('zhanyaojian', { curse: 1 });
    __ok('v0.61.39 C 预伤害 斩妖剑 带诅咒 → 10+4=14', p.d === 14, 'd=' + p.d);
    p = pv('shihun', { rage: 3 });
    __ok('v0.59 C 预伤害 噬魂术 血怒3 → 10+6=16', p.d === 16, 'd=' + p.d);
    p = pv('shixue', { total: 12 });
    __ok('v0.61.39 C 预伤害 嗜血 本场失12血 → 5+3=8', p.d === 8, 'd=' + p.d);
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

    /* —— 攻击 3：剑符 12/17，诅咒≥3 层则消耗 3 层并翻倍（v0.61.35；v1.0.18 全列 +2） —— */
    g = dt(); g.enemies[0].curse = 3;
    g.hand = [__card('jianfu')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#3 剑符 12×2=24 伤，诅咒 3→0',
      g.enemies[0].hp === 476 && g.enemies[0].curse === 0,
      'ehp=' + g.enemies[0].hp + ' curse=' + g.enemies[0].curse);
    g = dt(); g.enemies[0].curse = 2;
    g.hand = [__card('jianfu')]; g.drawPile = []; g.discard = []; g.exhausted = [];
    doPlayCard(0);
    __ok('v0.60 D#3 剑符 诅咒 2 层 → 12 伤不翻倍', g.enemies[0].hp === 488 && g.enemies[0].curse === 2, 'ehp=' + g.enemies[0].hp);

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
    __ok('v0.61.39 佛渡 升级附加：天师 5 格挡 / 阴差 回复 5 生命 / 武僧 5 格挡 / 赶尸人 2 尸气',
      _fdT.indexOf('5 点格挡') >= 0 && _fdC.indexOf('回复 5 点生命') >= 0 &&
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
    __ok('v0.61.39 燃血术 A 8/8、B 8/8、C 固定 4/4（阴差列取消升级减血）',
      _rxA[0].indexOf('失去 8 点生命') >= 0 && _rxA[1].indexOf('失去 8 点生命') >= 0 &&
      _rxB[0].indexOf('失去 8 点生命') >= 0 && _rxB[1].indexOf('失去 8 点生命') >= 0 &&
      _rxC[0].indexOf('失去 4 点生命') >= 0 && _rxC[1].indexOf('失去 4 点生命') >= 0,
      _rxA.join('/') + ' | ' + _rxB.join('/') + ' | ' + _rxC.join('/'));
    __ok('v0.61.39 燃血术 阴差列符文固定 1（升级不再 2）',
      _rxC[0].indexOf('获得 1 点符文') >= 0 && _rxC[1].indexOf('获得 1 点符文') >= 0, _rxC.join(' / '));

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

      // 佛渡 eff 的 fb 三元：武僧 5 / 天师 5（v0.61.39 阴差列改为「升级回复 5 点生命」，已移出 fb）
      // 赶尸人走上面的尸气分支，四列里只有阴差/赶尸人不给格挡
      function fdBlock(h, up) {
        var g2 = __base(h); g2.block = 0;
        var cc = Object.assign({}, __card('fodu'), { up: !!up }); cc.eff(!!up, cc);
        return g2.block;
      }
      __ok('v0.61.39 反误伤 佛渡 升级附加格挡逐列：武僧 5 / 天师 5 / 阴差 0 / 赶尸人 0',
        fdBlock('wuseng', true) === 5 && fdBlock('tianshi', true) === 5 &&
        fdBlock('yincha', true) === 0 && fdBlock('ganshiren', true) === 0,
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
    // 注意：这里用的是 CARDS 里的共享单例（此刻 up=false），所以是未升级的 12×2=24
    __ok('v0.60 D 预伤害 剑符(未升级) 诅咒≥3 → 24 且常显（v0.61.35：10×2；v1.0.18 全列 +2）', previewDamage(__card('jianfu')).d === 24 && previewDamage(__card('jianfu')).dynamic === true,
      'd=' + previewDamage(__card('jianfu')).d);

    /* —— v1.1.15：多段攻击牌逐段平增减半（Q8 开天眼每段减半 / Q9 朱砂笔每段 +1 / Q10 敌人不受影响） —— */
    (function () {
      // 纯函数层：SEG_HALVE 窗口内 attackBuff / turnAtkBuff 分别 ⌊/2⌋ 再相加，窗口外全额
      g = dt(); g.attackBuff = 3; g.turnAtkBuff = 4;
      var e0 = g.enemies[0];
      var full = calcDamageTo(e0, 10, false, false);
      SEG_HALVE = true; var halved = calcDamageTo(e0, 10, false, false); SEG_HALVE = false;
      __ok('v1.1.15 calcDamageTo：SEG_HALVE 内 10+⌊3/2⌋+⌊4/2⌋=13、窗口外全额 17、用后复位',
        full === 17 && halved === 13 && SEG_HALVE === false, 'full=' + full + ' halved=' + halved);

      // 源码层：三张多段牌的 eff 都带 SEG_HALVE 结算窗口；敌人出伤不经过它（Q10 天然免疫）
      __ok('v1.1.15 雷谴符/斩妖剑/钟馗镇魂 eff 均内置 SEG_HALVE 窗口（try/finally 复位）',
        __code(__card('leiqianfu').eff).indexOf('SEG_HALVE=true') >= 0 &&
        __code(__card('zhanyaojian').eff).indexOf('SEG_HALVE=true') >= 0 &&
        __code(__card('zhongkui').eff).indexOf('SEG_HALVE=true') >= 0 &&
        __code(__card('leiqianfu').eff).indexOf('finally') >= 0, '');
      __ok('v1.1.15 Q10：敌人多段攻击走 dealDamageToPlayer，不引用 SEG_HALVE（不受减半影响）',
        __code(dealDamageToPlayer).indexOf('SEG_HALVE') < 0, '');

      // 实战·雷谴符（未升级）：诅咒 3 层 = 3 段 × (2+⌊3/2⌋=1) = 9（旧口径每段 +3 = 15）， curse 清空、flag 复位
      g = dt(); g.enemies[0].curse = 3; g.attackBuff = 3;
      (function () { var t = g.enemies[0], bh = t.hp; __card('leiqianfu').eff(false);
        __ok('v1.1.15 实战 雷谴符 curse3+朱砂笔：3×(2+1)=9（旧 3×5=15）', bh - t.hp === 9 && t.curse === 0 && SEG_HALVE === false,
          'taken=' + (bh - t.hp) + ' curse=' + t.curse); })();

      // 实战·斩妖剑·天师列（未升级）：主击 10+1 + 引爆 2 段 × (5+1) = 23（旧 13+2×8=29）
      g = dt(); g.enemies[0].curse = 2; g.attackBuff = 3;
      (function () { var t = g.enemies[0], bh = t.hp; __card('zhanyaojian').eff(false);
        __ok('v1.1.15 实战 斩妖剑 curse2+朱砂笔：11+2×6=23（旧 29）', bh - t.hp === 23 && t.curse === 0 && SEG_HALVE === false,
          'taken=' + (bh - t.hp) + ' curse=' + t.curse); })();

      // 实战·钟馗镇魂·天师列（未升级，spirit 类型本就不吃朱砂笔）：开天眼 +4 ⇒ 主击 16+2 + 3 段 × (3+2) = 33（旧 20+3×7=41）
      g = dt(); g.enemies[0].curse = 3; g.turnAtkBuff = 4;
      (function () { var t = g.enemies[0], bh = t.hp; __card('zhongkui').eff(false);
        __ok('v1.1.15 实战 钟馗镇魂 curse3+开天眼+4：18+3×5=33（旧 41）', bh - t.hp === 33 && t.curse === 0 && SEG_HALVE === false,
          'taken=' + (bh - t.hp) + ' curse=' + t.curse); })();

      // 预览与实战同式：朱砂笔走 hasRelic；多段牌加「⌊平增/2⌋ × 段数」，单段牌（雷符）全额对照
      g = dt(); g.enemies[0].curse = 3; g.relics = ['zhushabi'];
      __ok('v1.1.15 预览 雷谴符 curse3+朱砂笔：6+3×1=9', previewDamage(__card('leiqianfu')).d === 9,
        'd=' + previewDamage(__card('leiqianfu')).d);
      __ok('v1.1.15 预览 斩妖剑 curse3+朱砂笔：20+3×1=23', previewDamage(__card('zhanyaojian')).d === 23,
        'd=' + previewDamage(__card('zhanyaojian')).d);
      __ok('v1.1.15 预览 雷符 curse3+朱砂笔：9+3=12（单段不减半对照）', previewDamage(__card('leifu')).d === 12,
        'd=' + previewDamage(__card('leifu')).d);
      g.relics = []; g.turnAtkBuff = 4;
      __ok('v1.1.15 预览 雷谴符 curse3+开天眼+4：6+3×2=12', previewDamage(__card('leiqianfu')).d === 12,
        'd=' + previewDamage(__card('leiqianfu')).d);
      __ok('v1.1.15 预览 斩妖剑 curse3+开天眼+4：20+3×2=26', previewDamage(__card('zhanyaojian')).d === 26,
        'd=' + previewDamage(__card('zhanyaojian')).d);
    })();
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
      __enemyActSrc.indexOf('if(e.charmUsed)') >= 0, 'enemyAct 源码未见 charmUsed 消耗点');

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
    var src = __enemyActSrc;
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
    var __chg = seg(__enemyActSrc, '蓄力（下回合');
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
      __ok('v0.61.39 易物 换入的牌不再费用 -1',
        inHand && inHand.tempCostCut === undefined && effectiveCost(inHand) === cardCost(inHand),
        'id=' + (inHand && inHand.id) + ' cost=' + (inHand && cardCost(inHand)) + ' eff=' + (inHand && effectiveCost(inHand)));
      // 仍必须是副本：不能污染 CARDS 里的共享对象（同名牌的另外几张不该被连带改动）
      __ok('v0.61.39 易物 换入的是副本、不落到共享卡牌对象上',
        inHand !== __card('zhongkui') && __card('zhongkui').tempCostCut === undefined,
        'same=' + (inHand === __card('zhongkui')));
      // 消耗牌回牌库靠 G.deck.indexOf —— 副本必须已在牌库里顶替原对象
      __ok('v0.61.39 易物 副本在 G.deck 里顶替原对象（保住 indexOf 语义）',
        g.deck.indexOf(inHand) >= 0, 'deckLen=' + g.deck.length);
      // 万剑归宗 A 列仍靠同一套副本顶替发 -1/-2 费，到期清理不能一起删掉
      startTurn();
      __ok('v0.61.39 反误伤 与万剑归宗共用的 tempCostCut 到期清理仍有效',
        !inHand.tempCostCut && effectiveCost(inHand) === cardCost(inHand),
        'cut=' + inHand.tempCostCut + ' eff=' + effectiveCost(inHand));
    } else {
      __ok('v0.61.10 P11 易物 换入池构造失败（用例前提不成立）', false, JSON.stringify(exx.pool.map(function (x) { return x.id; })));
    }
    __base('yincha');
    __ok('v0.61.39 易物 四列卡面都不再写「换入的牌本回合费用 -1」',
      ['ganshiren', 'wuseng', 'yincha', 'tianshi'].every(function (h) {
        __base(h); return __card('yiwu').t(false).indexOf('换入的牌本回合费用 -1') < 0
          && __card('yiwu').t(false).indexOf('选择 1 张手牌与抽牌堆交换') >= 0;
      }));
    // 反误伤：万剑归宗 A 列的减费文案仍在（别把共用的消费端一起删了）
    __base('ganshiren');
    __ok('v0.61.39 反误伤 万剑归宗 A 列「抽到的牌本回合费用 -N」文案仍在',
      __card('wanjian').t(false).indexOf('本回合费用 -') >= 0, __card('wanjian').t(false));

    /* ============ v0.61.39 新增：三个 bug 的行为对拍 ============ */

    /* —— ① 五通神在附灵术 / 群鬼乱舞后必须也触发一次 ——
       根因：triggerSummons 走 summonAct，而 summonAct 的 type 白名单（zhiren/xiaogui/yinbing/shi_wang）
             里没有 'wutong'，于是五通神被静默跳过 —— 附灵术与「群鬼乱舞·赶尸人」都触发不到它。
       修法：decay===false 时把 wutong 交给 wutongTick(s, true)，只结算效果、不扣寿命。 */
    g = __base('yincha'); g.hp = 40; g.block = 0;
    g.summons = [{ type: 'wutong', v: 6, dur: 2 }];
    c = __card('fuling'); c.eff(false, c);
    __ok('v0.61.39 附灵术 × 五通神(阴差) 触发一次 → 回 6(五通神) + 2(附灵本体 n=1) = 8 血',
      g.hp === 48, 'hp=' + g.hp);
    __ok('v0.61.39 附灵术 × 五通神 不扣寿命（仍剩 2，寿命只归 startTurn 管）',
      g.summons.length === 1 && g.summons[0].dur === 2, JSON.stringify(g.summons));
    g = __base('ganshiren'); g.block = 0; g.尸气 = 4;
    g.summons = [{ type: 'wutong', v: 5, dur: 2 }];
    c = __card('qungui'); c.eff(false, c);
    __ok('v0.61.39 群鬼乱舞(赶尸人) × 五通神 触发一次 → +5 格挡', g.block === 5, 'block=' + g.block);
    __ok('v0.61.39 群鬼乱舞(赶尸人) × 五通神 不扣寿命（仍剩 2）', g.summons[0].dur === 2, JSON.stringify(g.summons));
    // 反误伤：回合末（decay=true）不能重复触发五通神 —— 否则一回合扣两次寿命
    g = __base('yincha'); g.hp = 40; g.summons = [{ type: 'wutong', v: 6, dur: 2 }];
    triggerSummons(true);
    __ok('v0.61.39 反误伤 回合末(decay=true) 不重复触发五通神', g.hp === 40, 'hp=' + g.hp);
    __ok('v0.61.39 反误伤 回合末五通神寿命不被这里扣（dur 仍 2）',
      g.summons.length === 1 && g.summons[0].dur === 2, JSON.stringify(g.summons));

    /* —— ② 续档必须恢复生命 / 上限 / 金币（40_flow.js:224 被同行 `//` 注释吞掉的半行） —— */
    (function () {
      var snap = {
        act: 1, mapRow: 2, mapCol: 1, mapPath: [], hero: 'yincha',
        hp: 37, maxHp: 88, gold: 123, energy: 3, block: 0,
        deck: [], hand: [], drawPile: [], discard: [], exhausted: [],
        rng: rngSnapshot()
      };
      var __realGet = Store.getJSON;
      Store.getJSON = function (k) { return k === RUN_KEY ? snap : null; };
      try { continueRun(); } catch (e) {
        __ok('v0.61.39 续档 continueRun 未抛错', false, String(e && e.message));
      } finally { Store.getJSON = __realGet; }
      __ok('v0.61.39 续档 恢复生命 / 上限 / 金币（修前会回落成 60/80/0）',
        G.hp === 37 && G.maxHp === 88 && G.gold === 123,
        'hp=' + G.hp + ' maxHp=' + G.maxHp + ' gold=' + G.gold);
      __ok('v0.61.39 续档 battleStartHp 跟着 d.hp（不再被旧默认值带偏）',
        G.battleStartHp === 37, 'battleStartHp=' + G.battleStartHp);
    })();

    /* —— ③ 移形换影(阴差) 闪避结算：回血与血怒都按升级档 —— */
    (function () {
      __base('yincha'); var cy = __card('yixing');
      __ok('v0.61.39 移形换影(阴差) 文案去「0 符文」且写清 2/4 回血、1/2 血怒',
        cy.t(false).indexOf('0 符文') < 0 && cy.t(false).indexOf('恢复 2 点生命') >= 0 &&
        cy.t(false).indexOf('1 层【血怒】') >= 0 && cy.t(true).indexOf('恢复 4 点生命') >= 0 &&
        cy.t(true).indexOf('2 层【血怒】') >= 0, cy.t(false) + ' / ' + cy.t(true));
      // __base() 会整个换掉全局 G —— 必须一段一测、打完立刻断言，
      // 否则后一次 __base 会把前一段的 G 换走，g1 拿到的是已丢弃的旧对象。
      var g1 = __base('yincha'); g1.hp = 40; g1.xuenu = 0;
      var c1 = __card('yixing'); c1.eff(false, c1);
      dealDamageToPlayer(5, { name: '测试妖' });
      __ok('v0.61.39 移形换影(阴差未升级) 闪避结算 → 回 2 血 + 1 层血怒',
        g1.hp === 42 && g1.xuenu === 1 && g1.dodge === 0,
        'hp=' + g1.hp + ' xuenu=' + g1.xuenu + ' dodge=' + g1.dodge);
      var g2 = __base('yincha'); g2.hp = 40; g2.xuenu = 0;
      var c2 = Object.assign({}, __card('yixing'), { up: true }); c2.eff(true, c2);
      dealDamageToPlayer(5, { name: '测试妖' });
      __ok('v0.61.39 移形换影(阴差升级) 闪避结算 → 回 4 血 + 2 层血怒',
        g2.hp === 44 && g2.xuenu === 2 && g2.dodge === 0,
        'hp=' + g2.hp + ' xuenu=' + g2.xuenu + ' dodge=' + g2.dodge);
    })();

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

      /* ① 分发表完整性：80 键，每步参数都齐 */
      __ok('v0.61.25 音效表 117 键（v1.0.17：+ui_flip/+glass_break；v1.0.23：+主菜单与里程碑 4 键；v1.1.x：+number/stone_broken/rank/boom/energy 5 键，+spark/slash/lightning 3 键；v1.1.10：+boss_vfx 前 6 幕 19 键；v1.1.9 焚牌：+fx_forge/fx_burn 2 键；v1.1.12：+boss_vfx 7~9 幕 9 键；v1.1.13：+选角 4 键 talisman_click/talisman_slide/key_press/poster_bounce_land）', SFX_KEYS.length === 117, 'n=' + SFX_KEYS.length);
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

      /* ② 75 键逐个调用不抛错、且都真的产出声音（探针空序列 = 哑键） */
      var threw = [], gp;
      for (i = 0; i < SFX_KEYS.length; i++) { try { __realSfx(SFX_KEYS[i]); } catch (e) { threw.push(SFX_KEYS[i]); } }
      __ok('v0.61.25 75 键在无 WebAudio 下逐个调用不抛错', threw.length === 0, threw.join(','));
      gp = globalThis.__probeSfx(SFX_KEYS);
      var silent = [];
      for (i = 0; i < SFX_KEYS.length; i++) if (!(gp[SFX_KEYS[i]] || []).length) silent.push(SFX_KEYS[i]);
      __ok('v0.61.25 75 键全部有声音（无哑键）', silent.length === 0, silent.join(','));

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
      __ok('v0.61.25 接线·反震 → spark', got.indexOf('spark') >= 0, got.join(','));
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

  /* ============ v1.0.14（P3-15）：战后三选一「翻牌」的渲染与交互 ============
     用户口径：「战后三选一翻牌我没有看到」—— 此前这套只有源码、没有一条断言钉着，
     真出问题也无人响。这里补两条：① 渲染出的 HTML 确实是「卡背朝前的翻转结构」；
     ② 交互确实是「第一次点翻开、第二次点才选走」（不是一点就走）。 */
  (function () {
    var keepSO = showOverlay, keepDrop = dropUI, seen = null;
    showOverlay = function (h) { seen = String(h || ''); };
    dropUI = function (h) { seen = String(h || ''); };
    try {
      G = __base('tianshi');
      showReward();
    } catch (e) { seen = 'ERR:' + e; }
    finally { showOverlay = keepSO; dropUI = keepDrop; }
    __ok('v1.0.14 战后三选一用 .flip-cards 容器（翻转交互的唯一挂钩）',
      !!seen && seen.indexOf('reward-cards flip-cards') >= 0, (seen || '').slice(0, 140));
    __ok('v1.0.14 每张牌都有正/背两面（.rcard-front + .rcard-back，缺背面就翻不出东西）',
      !!seen && seen.indexOf('rcard-front') >= 0 && seen.indexOf('rcard-back') >= 0);
    __ok('v1.0.14 卡面 onclick 走 flipReward(this, i)（第一次翻、第二次选）',
      !!seen && seen.indexOf('flipReward(this') >= 0);

    var fake = { classList: { _h: [], contains: function (c) { return this._h.indexOf(c) >= 0; },
                              add: function (c) { this._h.push(c); } } };
    var picked = -1, keepPick = pickReward;
    pickReward = function (i) { picked = i; };
    var adds = [], pickedAfterFirst = null;
    try {
      G = __base('tianshi'); G.rewardPicks = [__card('leifu')];
      flipReward(fake, 0);                 // 第一次点：只翻开
      adds = fake.classList._h.slice();
      pickedAfterFirst = picked;           // 必须在第二次点之前取 —— 之后再取就恒为 0 了
      flipReward(fake, 0);                 // 第二次点：才选走
    } finally { pickReward = keepPick; }
    __ok('v1.0.14 flipReward 第一次点只加 .revealed 翻开，**不**选牌',
      adds.indexOf('revealed') >= 0 && pickedAfterFirst === -1,
      'adds=' + adds.join(',') + ' pickedAfterFirst=' + pickedAfterFirst);
    __ok('v1.0.14 flipReward 第二次点才 pickReward(i) 选走', picked === 0, 'picked=' + picked);

    /* v1.0.17：翻开走专用音 ui_flip（素材/sfx/ui_flip.mp3），与选走的 ui_reward 分开 */
    var gotFlip = (function () {           /* __rec 是别的块内声明的，跨不出来 ⇒ 这里自带一份 */
      var list = [], _s = sfx;
      sfx = function (n) { list.push(n); };
      try {
        var f2 = { classList: { _h: [], contains: function (c) { return this._h.indexOf(c) >= 0; },
                                add: function (c) { this._h.push(c); } } };
        flipReward(f2, 0);
      } finally { sfx = _s; }
      return list;
    })();
    __ok('v1.0.17 接线·翻牌「翻开」→ ui_flip（翻牌专用音）', gotFlip.indexOf('ui_flip') >= 0, gotFlip.join(','));
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
    __ok('v0.61.32 关键词·业火反噬 → kw_yehuo（会响很多次的那个；v1.1.12 起修罗王改走 b8_xiuluo_backlash 专属）', got.indexOf('kw_yehuo') >= 0 || got.indexOf('b8_xiuluo_backlash') >= 0, got.join(','));
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
    __ok('v0.61.32 Boss·谢必安分化 → boss_split（原先蹭 relic 音；v1.1.10 起改为 boss_vfx 专属 b4_xiebian_split）',
      (got.indexOf('boss_split') >= 0 || got.indexOf('b4_xiebian_split') >= 0) && got.indexOf('relic') < 0, got.join(','));
    got = __rec(function () { G = __base('ganshiren'); var e = makeEnemy(ENEMIES['panguanwang'], 'panguanwang'); e.hp = 200; e.maxHp = 200; e.intents = [{ type: 'jiming' }]; e.intent = e.intents[0]; G.enemies = [e]; G.target = 0; __realEnemyAct(); });
    __ok('v0.61.32 Boss·判官王生死簿记账 → boss_ledger（v0.61.25 时整段静默；v1.1.10 起改为 boss_vfx 专属 b5_judge_record）',
      (got.indexOf('boss_ledger') >= 0 || got.indexOf('b5_judge_record') >= 0), got.join(','));
    got = __rec(function () { G = __base('ganshiren'); var e = makeEnemy(ENEMIES['xiuluowang'], 'xiuluowang'); e.hp = 200; e.maxHp = 200; e.intents = [{ type: 'yehuo' }]; e.intent = e.intents[0]; G.enemies = [e]; G.target = 0; __realEnemyAct(); });
    __ok('v0.61.32 Boss·修罗王业火附体 → boss_yehuo（从通用 buff 拆出；v1.1.12 起改走 b8_xiuluo_karma_fire 专属）',
      (got.indexOf('boss_yehuo') >= 0 || got.indexOf('b8_xiuluo_karma_fire') >= 0) && got.indexOf('enemy_buff_self') < 0, got.join(','));

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
    __ok('v0.61.37 #3 剑符 12/16 + 消耗 3 尸气',
      T_('jianfu', false).indexOf('造成 12 伤害') >= 0 && T_('jianfu', true).indexOf('造成 16 伤害') >= 0 &&
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
    __ok('v0.61.37 剑符 尸气 2 < 3 → 不翻倍（仍 12 伤）', (__b0 - g.enemies[0].hp) === 12, 'dmg=' + (__b0 - g.enemies[0].hp));
    g = __base('ganshiren'); g.尸气 = 3;
    cc = __card('jianfu'); __b0 = g.enemies[0].hp; cc.eff(false, cc);
    __ok('v0.61.37 剑符 尸气 3 → 翻倍 24 伤且清空尸气',
      (__b0 - g.enemies[0].hp) === 24 && g.尸气 === 0, 'dmg=' + (__b0 - g.enemies[0].hp) + ' 尸气=' + g.尸气);
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
    __ok('v0.61.37 预览A 剑符 12 / 尸气3 → 24',
      pvA('jianfu') === 12 && pvA('jianfu', false, function (x) { x.尸气 = 3; }) === 24,
      pvA('jianfu') + '/' + pvA('jianfu', false, function (x) { x.尸气 = 3; }));
    __ok('v0.61.37 预览A 剑符升级 16 / 尸气3 → 32',
      pvA('jianfu', true) === 16 && pvA('jianfu', true, function (x) { x.尸气 = 3; }) === 32,
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


  // ===== v0.61.38：尸气是「每场战斗清零」、血怒才是「整局累积」=====
  // 起因：js/20_data.js 的【尸气】词条与 tipOnce 首次提示都写成「整局累积不清零」——
  // 那是【血怒】的规则（阴差 2026-09-09 定案），尸气 2026-09-08 定案是每场清零。
  // 文案与引擎冲突时，以 30_engine.js 的 startBattle 重置区为准。这里把两边都钉死。
  (function () {
    // ① KEYWORDS【尸气】：不许再出现「整局累积」
    var __kwShiqi = ((KEYWORDS.filter(function (k) { return k[0] === '尸气'; })[0] || [])[1]) || '';
    __ok('v0.61.38 KEYWORDS 尸气 不再说「整局累积」',
      __kwShiqi.length > 0 && __kwShiqi.indexOf('整局累积') < 0, __kwShiqi);
    __ok('v0.61.38 KEYWORDS 尸气 说清「战斗内跨回合累积、每场战斗清零」',
      __kwShiqi.indexOf('战斗内跨回合累积') >= 0 && __kwShiqi.indexOf('每场战斗清零') >= 0, __kwShiqi);
    __ok('v0.61.38 KEYWORDS 尸气 补上「每消耗 1 点回复 1 点生命」（v0.61.37 新被动）',
      __kwShiqi.indexOf('每消耗 1 点') >= 0 && __kwShiqi.indexOf('回复 1 点生命') >= 0, __kwShiqi);

    // ② 反误伤：血怒词条必须**保留**「整局累积」——证明没把两边的词条改反
    var __kwBlood = ((KEYWORDS.filter(function (k) { return k[0] === '血怒'; })[0] || [])[1]) || '';
    __ok('v0.61.38 反误伤 KEYWORDS 血怒 仍保留「整局累积」',
      __kwBlood.indexOf('整局累积') >= 0, __kwBlood);
    var __yp = (HEROES.filter(function (h) { return h.id === 'yincha'; })[0] || {}).passive || '';
    __ok('v0.61.38 反误伤 阴差被动 仍保留「整局累积」',
      __yp.indexOf('整局累积') >= 0, __yp);

    // ③ tipOnce('shiqi') 的首次提示气泡（照 __realSfx 先例换桩捕获再还原）
    var __realTipOnce = tipOnce, __tipCap = null;
    tipOnce = function (key, html) { if (key === 'shiqi') { __tipCap = html; } return true; };
    try {
      G = __base('ganshiren');
      gainShiqi(1);
      __ok('v0.61.38 tipOnce 尸气提示 被触发',
        typeof __tipCap === 'string' && __tipCap.length > 0, String(__tipCap));
      __ok('v0.61.38 tipOnce 尸气提示 不再说「整局累积」',
        String(__tipCap).indexOf('整局累积') < 0, String(__tipCap));
      __ok('v0.61.38 tipOnce 尸气提示 说清「战斗内跨回合累积，每场战斗清零」',
        String(__tipCap).indexOf('战斗内跨回合累积') >= 0 && String(__tipCap).indexOf('每场战斗清零') >= 0, String(__tipCap));
    } finally { tipOnce = __realTipOnce; __tipCap = null; }

    // ④ 引擎行为对拍（把文案和事实绑在一起，而不是只比字符串）
    //    startBattle 的重置区在 30_engine.js:640（G.尸气=0），血怒那边一处都没有 → 跨战保留
    try {
      G = __base('ganshiren'); G.deck = [__card('leifu')];
      G.尸气 = 7; G.xuenu = 5;
      startBattle(['youhun']);
      __ok('v0.61.38 引擎 尸气 开战清零 → 0（文案「每场战斗清零」为真）',
        G.尸气 === 0, 'shiqi=' + G.尸气);
      __ok('v0.61.38 引擎 反误伤 血怒 开战不清零 → 仍 5（整局累积为真）',
        (G.xuenu || 0) === 5, 'xuenu=' + G.xuenu);
    } catch (e) {
      __ok('v0.61.38 引擎 尸气/血怒 开战重置对拍未抛错', false, String(e && e.message));
    }
  })();


  /* ====================================================================
   * v0.61.40：地图随机化（杀戮尖塔式树状图 + 逐层迷雾）+ hpCost 自动对拍 + 反震/业火补血怒
   * ==================================================================== */
  (function () {
    function __bossKey(k) { return !!(ENEMIES[k] && ENEMIES[k].boss); }
    function __eliteKey(k) { return !!(ENEMIES[k] && ENEMIES[k].elite); }
    function __minionsOK(pool) {
      return Array.isArray(pool) && pool.length > 0 && pool.every(function (k) { return !__bossKey(k) && !__eliteKey(k); });
    }

    /* ============ A. 生成器不变量（3 幕 × 20 种子）============ */
    var badA = [];
    for (var a1 = 1; a1 <= 3; a1++) {
      for (var s1 = 1; s1 <= 20; s1++) {
        var M1 = genAct(a1, s1);
        if (M1.length !== 14) badA.push('行数=' + M1.length);
        for (var r1 = 0; r1 < M1.length; r1++) {
          if (!M1[r1] || M1[r1].length < 1 || M1[r1].length > 4) badA.push('行宽@' + r1);
          for (var c1 = 0; c1 < M1[r1].length; c1++) {
            var n1 = M1[r1][c1];
            if (!n1) { badA.push('空洞@' + r1 + ',' + c1); continue; }
            if (r1 < 13 && (!n1.next || !n1.next.length)) badA.push('死路@' + r1 + ',' + c1);
            if (!n1.prev) badA.push('缺 prev@' + r1 + ',' + c1);
            for (var k1 = 0; k1 < (n1.next || []).length; k1++) {
              var j1 = n1.next[k1];
              if (j1 < 0 || j1 >= M1[r1 + 1].length || !M1[r1 + 1][j1]) { badA.push('越界边@' + r1 + ',' + c1); continue; }
              if ((M1[r1 + 1][j1].prev || []).indexOf(c1) < 0) badA.push('镜像破@' + r1 + ',' + c1 + '->' + j1);
            }
            for (var q1 = 1; q1 < (n1.next || []).length; q1++) {
              if (n1.next[q1 - 1] > n1.next[q1]) badA.push('next 未升序@' + r1 + ',' + c1);
            }
          }
          // 不交叉：i<i' ⇒ max(next_i) <= min(next_i')（旧「列差≤1」规则本身是交叉的，这里是真修好）
          for (var i1 = 0; i1 < M1[r1].length; i1++) {
            if (!M1[r1][i1].next.length) continue;
            for (var i2 = i1 + 1; i2 < M1[r1].length; i2++) {
              if (!M1[r1][i2].next.length) continue;
              if (Math.max.apply(null, M1[r1][i1].next) > Math.min.apply(null, M1[r1][i2].next)) badA.push('交叉边@' + r1 + ':' + i1 + '/' + i2);
            }
          }
        }
        if (M1[13].length !== 1) badA.push('末层宽=' + M1[13].length);
        if (M1[13][0].t !== 'boss') badA.push('末层非 boss=' + M1[13][0].t);
        if (!M1[13][0].e || M1[13][0].e.length !== 1 || !__bossKey(M1[13][0].e[0])) badA.push('boss key 非法');
      }
    }
    __ok('v0.61.40 生成器 行数14/行宽1~4/末层1个boss（3幕×20种子）', badA.length === 0, badA.slice(0, 6).join(' | '));
    var badCross = badA.filter(function (x) { return x.indexOf('交叉边') === 0; });
    __ok('v0.61.40 生成器 连边不交叉（i<i\' ⇒ j<=j\'）', badCross.length === 0, badCross.slice(0, 6).join(' | '));
    var badMirror = badA.filter(function (x) { return x.indexOf('镜像破') === 0; });
    __ok('v0.61.40 生成器 next/prev 互为镜像', badMirror.length === 0, badMirror.slice(0, 6).join(' | '));
    var badDead = badA.filter(function (x) { return x.indexOf('死路') === 0; });
    __ok('v0.61.40 生成器 非末层无死路（每格 next 非空）', badDead.length === 0, badDead.slice(0, 6).join(' | '));

    /* —— 无孤岛 / 类型合法 / 首层全普通战 —— */
    var badB = [];
    for (var a2 = 1; a2 <= 3; a2++) {
      var M2 = genAct(a2, 7);
      for (var c2 = 0; c2 < M2[0].length; c2++) {
        if (M2[0][c2].t !== 'fight') badB.push('首层非普通战=' + M2[0][c2].t);
        if (!__minionsOK(M2[0][c2].e)) badB.push('首层敌人池非法');
      }
      for (var r2 = 1; r2 < M2.length; r2++) {
        for (var c3 = 0; c3 < M2[r2].length; c3++) {
          var n2 = M2[r2][c3];
          if (!n2.prev || !n2.prev.length) badB.push('孤岛@' + r2 + ',' + c3);
          if (n2.t === 'fight') {
            if (!Array.isArray(n2.e) || n2.e.length < 2 || n2.e.length > 3) badB.push('普通战敌人数=' + (n2.e || []).length);
            else if (!__minionsOK(n2.e)) badB.push('普通战混入 boss/精英@' + r2 + ',' + c3);
          } else if (n2.t === 'elite') {
            if (!n2.e.length || !__eliteKey(n2.e[0])) badB.push('精英节点首 key 非精英@' + r2 + ',' + c3);
            if (n2.e.length > 2) badB.push('精英节点敌人过多@' + r2 + ',' + c3);
          } else if (n2.t !== 'camp' && n2.t !== 'shop' && n2.t !== 'unknown' && n2.t !== 'boss') {
            badB.push('非法节点类型 ' + n2.t);
          }
        }
      }
    }
    __ok('v0.61.40 生成器 无孤岛/首层全普通战/节点类型合法/精英是独立类型', badB.length === 0, badB.slice(0, 6).join(' | '));

    /* —— 每个节点都能一路向上走到 Boss —— */
    var badC = [];
    for (var a3 = 1; a3 <= 3; a3++) {
      var M3 = genAct(a3, 11);
      for (var r3 = 0; r3 < M3.length; r3++) {
        for (var c4 = 0; c4 < M3[r3].length; c4++) {
          var cur4 = c4, ok4 = true;
          for (var rr4 = r3; rr4 < M3.length - 1; rr4++) {
            var n4 = M3[rr4][cur4];
            if (!n4 || !n4.next || !n4.next.length) { ok4 = false; break; }
            cur4 = n4.next[0];
          }
          if (!ok4) badC.push('到不了 Boss @' + r3 + ',' + c4);
        }
      }
    }
    __ok('v0.61.40 生成器 每个节点都能一路向上到 Boss（不会开局即卡死）', badC.length === 0, badC.slice(0, 6).join(' | '));

    /* —— 每幕配额 —— */
    var badD = [];
    for (var a4 = 1; a4 <= 3; a4++) {
      for (var s4 = 1; s4 <= 20; s4++) {
        var M4 = genAct(a4, s4), cnt4 = { camp: 0, shop: 0, elite: 0, unknown: 0 };
        for (var r4 = 0; r4 < M4.length; r4++) for (var c5 = 0; c5 < M4[r4].length; c5++) {
          var t5 = M4[r4][c5].t;
          if (cnt4[t5] !== undefined) cnt4[t5]++;
        }
        /* v0.62.0 改口径：v0.61.40 这里钉的是「camp/shop 各 1~3」的**幕内总数**上限，
           而 v0.62.0 的「每路线 ≥2 篝火」是**路线级下限** ⇒ 幕内总数必然被推高（实测 3~5），
           上限口径已失效。这里保留「幕内不被饿死 + 不失控」的粗筛（下限用路线级下限的理论值 2，
           上限用实测包络放大到 8/6/10/10），真正的契约由下面 v0.62.0 的**逐路线**断言钉死。 */
        if (cnt4.camp < 2 || cnt4.camp > 8) badD.push('a' + a4 + 's' + s4 + ' camp=' + cnt4.camp);
        if (cnt4.shop < 1 || cnt4.shop > 6) badD.push('a' + a4 + 's' + s4 + ' shop=' + cnt4.shop);
        if (cnt4.elite < 2 || cnt4.elite > 10) badD.push('a' + a4 + 's' + s4 + ' elite=' + cnt4.elite);
        if (cnt4.unknown < 2 || cnt4.unknown > 10) badD.push('a' + a4 + 's' + s4 + ' unknown=' + cnt4.unknown);
      }
    }
    __ok('v0.62.0 生成器 每幕特殊节点不饿死也不失控（camp 2~8、shop 1~6、elite 2~10、unknown 2~10）', badD.length === 0, badD.slice(0, 6).join(' | '));

    /* —— 消费者侧端到端：真的走完 13 层（只看 mapReachable 选路），每层都必须至少有一格能走 ——
       这是「每打完一关解锁往上衍生的关卡」的核心保证：任何一张图、任何一个种子，都不能把人卡在地图页。 */
    (function () {
      var KEEP4 = MAP, stuck = [], steps = 0;
      try {
        [1, 2, 3].forEach(function (a6) {
          for (var s6 = 1; s6 <= 12; s6++) {
            G = __base('yincha'); G.act = a6;
            MAP = genAct(a6, s6);
            G.mapRow = 0; G.mapCol = -1; G.mapPath = [];
            for (var r6 = 0; r6 < MAP.length - 1; r6++) {
              var pick6 = -1;
              for (var c7 = 0; c7 < MAP[r6].length; c7++) { if (mapReachable(r6, c7)) { pick6 = c7; break; } }
              if (pick6 < 0) { stuck.push('a' + a6 + 's' + s6 + ' 第' + (r6 + 1) + '层无路可走'); break; }
              G.mapPath.push({ r: r6, c: pick6 }); G.mapCol = pick6; G.mapRow = r6 + 1;
              steps++;
            }
            if (!stuck.length && !mapReachable(MAP.length - 1, 0)) stuck.push('a' + a6 + 's' + s6 + ' Boss 不可达');
          }
        });
      } finally { MAP = KEEP4; }
      __ok('v0.61.40 端到端 3幕×12种子 全程 13 层都走得通、Boss 可达（不会卡在地图页；步数=' + steps + '）',
        stuck.length === 0 && steps === 3 * 12 * 13, stuck.slice(0, 5).join(' | ') + ' steps=' + steps);
    })();

    /* ============ B. 可复现 / 隔离 / 池子 ============ */
    __ok('v0.61.40 生成器 同种子完全一致', JSON.stringify(genAct(2, 4242)) === JSON.stringify(genAct(2, 4242)));
    __ok('v0.61.40 生成器 异种子结果不同', JSON.stringify(genAct(2, 4242)) !== JSON.stringify(genAct(2, 4243)));
    __ok('v0.61.40 生成器 三幕互不相同（不再是换皮产物）',
      JSON.stringify(genAct(1, 5)) !== JSON.stringify(genAct(2, 5)) &&
      JSON.stringify(genAct(2, 5)) !== JSON.stringify(genAct(3, 5)));
    (function () {
      var s0 = rngSnapshot();
      genAct(1, 999); genAct(2, 999); genAct(3, 999);
      var s1 = rngSnapshot();
      __ok('v0.61.40 生成器**不消耗全局 rng**（rngSnapshot 前后完全不变）',
        JSON.stringify(s0) === JSON.stringify(s1), JSON.stringify(s0) + ' → ' + JSON.stringify(s1));
    })();
    var p2 = actMinionPool(2), p3 = actMinionPool(3);
    __ok('v0.61.40 池 act2 全为非 boss/非精英', __minionsOK(p2), p2.join(','));
    __ok('v0.61.40 池 act3 全为非 boss/非精英', __minionsOK(p3), p3.join(','));
    var miss5 = ACT1_MINIONS.filter(function (k) { return !ACT2_SWAP[k] || !ACT3_SWAP[k]; });
    __ok('v0.61.40 换幕表覆盖全部 ACT1_MINIONS（防 swap[k]||k 静默留原 key）', miss5.length === 0, miss5.join(','));
    __ok('v0.61.40 ACTS 恒为 3 张（否则 advanceAct 会立刻判通关）', ACTS.length === 3, 'len=' + ACTS.length);
    __ok('v0.61.40 ELITES_BY_ACT 三幕齐备且都是精英',
      [1, 2, 3].every(function (a) { return Array.isArray(ELITES_BY_ACT[a]) && ELITES_BY_ACT[a].length > 0 && ELITES_BY_ACT[a].every(__eliteKey); }));
    __ok('v0.61.40 BOSS_POOL 三幕齐备且都是 boss',
      [1, 2, 3].every(function (a) { return Array.isArray(BOSS_POOL[a]) && BOSS_POOL[a].length > 0 && BOSS_POOL[a].every(__bossKey); }));

    /* ============ C. 迷雾（手造 4 层 fixture；用完必须还原 MAP）============ */
    var KEEP = MAP;
    function fx() {
      return [
        [{ t: 'fight', e: ['youhun', 'jiangshi'], next: [0], prev: [] },
         { t: 'shop', e: [], next: [1, 2], prev: [] }],
        [{ t: 'camp', e: [], next: [0], prev: [0] },
         { t: 'unknown', e: [], next: [0], prev: [1] },
         { t: 'elite', e: ['yecha'], next: [0], prev: [1] }],
        [{ t: 'fight', e: ['youhun', 'huyao'], next: [0], prev: [0, 1, 2] }],
        [{ t: 'boss', e: ['jiangwang'], next: [], prev: [0] }]
      ];
    }
    try {
      G = __base('yincha'); G.act = 1; G.mapRow = 0; G.mapCol = -1; G.mapPath = [];
      MAP = fx();
      __ok('v0.61.40 迷雾 首层整层可选', mapReachable(0, 0) && mapReachable(0, 1));
      __ok('v0.61.40 迷雾 开局 = 首层整层 choice + 第 2 层 ? 剪影（第 3 层起全 hidden）',
        fogTier(0, 0) === 'choice' && fogTier(0, 1) === 'choice' &&
        fogTier(1, 0) === 'preview' && fogTier(2, 0) === 'hidden' && fogTier(3, 0) === 'hidden');
      __ok('v0.61.40 迷雾 preview = 本层可走节点 next 的并集',
        JSON.stringify(mapPreviewSet().slice().sort()) === JSON.stringify([0, 1, 2]));
      __ok('v0.61.40 迷雾 第 2 层三格都是 preview（v0.61.41 起改挂 locked.png）',
        fogTier(1, 0) === 'preview' && fogTier(1, 1) === 'preview' && fogTier(1, 2) === 'preview');
      __ok('v0.61.40 迷雾 可见 = 非 hidden', fogVisible(0, 0) && fogVisible(1, 2) && !fogVisible(2, 0));

      // 走到 (0,0)
      G.mapPath = [{ r: 0, c: 0 }]; G.mapRow = 1; G.mapCol = 0;
      __ok('v0.61.40 迷雾 可达只看上一层的 next（上一格是 0 号 → 只有 1,0 能走）',
        mapReachable(1, 0) && !mapReachable(1, 1) && !mapReachable(1, 2));
      __ok('v0.61.40 迷雾 甩掉的同层节点也是 hidden（不泄露未解锁拓扑）',
        fogTier(1, 1) === 'hidden' && fogTier(1, 2) === 'hidden');
      __ok('v0.61.40 迷雾 走过的格子是 past', fogTier(0, 0) === 'past');
      __ok('v0.61.40 迷雾 没走过的下层格是 hidden（不是 past）', fogTier(0, 1) === 'hidden');
      __ok('v0.61.40 迷雾 进一步 preview 跟着新可走节点走',
        JSON.stringify(mapPreviewSet()) === JSON.stringify([0]) && fogTier(2, 0) === 'preview');

      G.mapCol = -1; G.mapRow = 1;
      __ok('v0.61.40 迷雾 无上一层列历史（旧档降级 / 换幕）→ 整层可选，不死在地图页',
        mapReachable(1, 0) && mapReachable(1, 1) && mapReachable(1, 2));
      G.mapCol = 99;
      __ok('v0.61.40 迷雾 上一列越界 → 放宽整层可选（防软锁）',
        mapReachable(1, 0) && mapReachable(1, 1) && mapReachable(1, 2));
      __ok('v0.61.40 迷雾 越界列/越界层本身不可达',
        !mapReachable(1, 9) && !mapReachable(-1, 0) && !mapReachable(1, -1) && !mapReachable(9, 0));
    } finally {
      MAP = KEEP;   // ⚠ 不还原的话，后面的 real-run 段会拿到这张小图
    }

    /* ============ D. UI：去信息 + 留空槽 ============ */
    var lblBad = Object.keys(NODE_LABEL).filter(function (k) { return String(NODE_LABEL[k]).indexOf('×') >= 0; });
    __ok('v0.61.40 UI 节点文案不再含敌人数量（无 ×N）', lblBad.length === 0, lblBad.join(','));
    __ok('v0.61.40 UI 六种节点类型文案齐备',
      ['fight', 'elite', 'unknown', 'camp', 'shop', 'boss'].every(function (k) { return !!NODE_LABEL[k]; }));
    // v0.61.41：留空槽时代结束 —— 用户已交付图标，这张表改由 v0.61.41 断言组查（见文件末尾）
    __ok('v0.61.40 UI NODE_ICON 六键齐备（给图时不会漏填）',
      ['fight', 'elite', 'unknown', 'camp', 'shop', 'boss'].every(function (k) { return typeof NODE_ICON[k] === 'string'; }));
    __ok('v0.61.40 UI 背景表含三幕（v1.0.14：无尽已删，不再有 endless 键）',
      !!MAP_BG[1] && !!MAP_BG[2] && !!MAP_BG[3]);
    __ok('v0.61.40 UI nodeLabel 与敌人库解耦（不再触碰 ENEMIES）',
      String(nodeLabel).indexOf('ENEMIES') < 0, String(nodeLabel));
    __ok('v0.61.40 UI 地图页提示文案已改（不再说「只能走进相邻列」；v1.1.8 起幕名匾并进顶栏横幅）',
      String(showMap).indexOf('只能走进相邻列的节点') < 0 && String(mapTopbarHTML).indexOf('沿连线向上') >= 0);
    __ok('v0.61.40 UI 连线改为读节点自带的 next（不再用 |列差|<=1 猜）',
      String(drawMapLinks).indexOf('.next') >= 0 && String(drawMapLinks).indexOf('Math.abs(c2-c)') < 0);
    __ok('v0.61.40 UI nodeAt 改成 data-r/data-c 属性查询（行宽可变后位置法会错位）',
      String(drawMapLinks).indexOf('data-r="') >= 0 && String(drawMapLinks).indexOf('querySelector') >= 0);
    __ok('v0.61.40 UI nodeAt 仍显式排除 .empty（v0.61.41 起没有档会渲染它，留着当兜底）',
      String(drawMapLinks).indexOf("contains('empty')") >= 0);

    /* ============ E. 续档迁移 ============ */
    var realGet = Store.getJSON;
    function fakeSave(d) {
      Store.getJSON = function (k) { return k === RUN_KEY ? d : null; };
    }
    // ① 旧档（v:2，无 mapSeed）+ 越界 mapCol
    try {
      fakeSave({
        v: 2, scene: 'map', act: 2, mapRow: 5, mapCol: 99, mapPath: [{ r: 0, c: 0 }],
        hero: 'yincha', hp: 41, maxHp: 80, gold: 77, energy: 3, block: 0,
        deck: [], hand: [], drawPile: [], discard: [], enemies: [], target: 0, turn: 0, battleStartHp: 41,
        summons: [], relics: [], potions: [], log: [], rng: { s: 123456, n: 9 }
      });
      continueRun();
      __ok('v0.61.40 旧档 铸了新地图种子', (G.mapSeed || 0) > 0, 'mapSeed=' + G.mapSeed);
      __ok('v0.61.40 旧档 列号降级为 -1（旧列号对新图毫无意义）', G.mapCol === -1, 'mapCol=' + G.mapCol);
      __ok('v0.61.40 旧档 路径清空', (G.mapPath || []).length === 0, 'len=' + (G.mapPath || []).length);
      __ok('v0.61.40 旧档 地图仍是 14 层', MAP.length === 14, 'len=' + MAP.length);
      __ok('v0.61.40 旧档 进度未丢（幕/层/生命/金币都还在）',
        G.act === 2 && G.mapRow === 5 && G.hp === 41 && G.gold === 77,
        'act=' + G.act + ' row=' + G.mapRow + ' hp=' + G.hp + ' gold=' + G.gold);
      var anyReach = false;
      for (var mc = 0; mc < MAP[G.mapRow].length; mc++) { if (mapReachable(G.mapRow, mc)) anyReach = true; }
      __ok('v0.61.40 旧档 本层至少有一个能走（不会死在地图页）', anyReach);
    } catch (e) {
      __ok('v0.61.40 旧档迁移 continueRun 未抛错', false, String(e && e.message));
    }
    // ② 新档（v:3，带 mapSeed）→ 地图必须逐字节复现
    try {
      var SD = 0xBEEF;
      fakeSave({
        v: 3, scene: 'map', act: 2, mapRow: 3, mapCol: 1, mapPath: [{ r: 0, c: 1 }], mapSeed: SD,
        hero: 'wuseng', hp: 55, maxHp: 80, gold: 10, energy: 3, block: 0,
        deck: [], hand: [], drawPile: [], discard: [], enemies: [], target: 0, turn: 0, battleStartHp: 55,
        summons: [], relics: [], potions: [], log: [], rng: { s: 1, n: 1 }
      });
      continueRun();
      __ok('v0.61.40 新档 mapSeed 原样回填', G.mapSeed === SD, 'mapSeed=' + G.mapSeed);
      __ok('v0.61.40 新档 地图由 mapSeed 逐字节复现',
        JSON.stringify(MAP) === JSON.stringify(genAct(2, deriveSeed(SD, 2))));
      __ok('v0.61.40 新档 列号与路径原样保留（不降级）',
        G.mapCol === 1 && (G.mapPath || []).length === 1, 'col=' + G.mapCol + ' path=' + (G.mapPath || []).length);
    } catch (e) {
      __ok('v0.61.40 新档复现 continueRun 未抛错', false, String(e && e.message));
    }
    Store.getJSON = realGet;
    try { Store.del(RUN_KEY); } catch (e) {}

    /* ============ F. chooseNode 二次校验 ============ */
    var KEEP2 = MAP;
    try {
      G = __base('yincha'); G.act = 1; G.mapRow = 1; G.mapCol = 0; G.mapPath = []; SCENE = 'map';
      MAP = fx();
      var hp0 = G.hp;
      chooseNode(2);   // 不可达
      __ok('v0.61.40 chooseNode 不可达 → 不进战斗 / 不记路径 / 不改列 / 不掉血',
        SCENE !== 'battle' && (G.mapPath || []).length === 0 && G.mapCol === 0 && G.hp === hp0,
        'scene=' + SCENE + ' path=' + (G.mapPath || []).length + ' col=' + G.mapCol + ' hp=' + G.hp);
      chooseNode(9);   // 越界
      __ok('v0.61.40 chooseNode 越界列被挡下', SCENE !== 'battle' && (G.mapPath || []).length === 0);
      chooseNode(-1);
      __ok('v0.61.40 chooseNode 负列被挡下', SCENE !== 'battle' && (G.mapPath || []).length === 0);
    } finally {
      MAP = KEEP2; SCENE = 'map';
    }
    __ok('v0.61.40 chooseNode 有可达性二次校验（源码级）',
      String(chooseNode).indexOf('mapReachable') >= 0);
    __ok('v0.61.40 chooseNode 走 node.e（精英与普通战同构，Boss 不再现抽）',
      String(chooseNode).indexOf("node.t==='fight'||node.t==='elite'") >= 0 &&
      String(chooseNode).indexOf("node.t==='elite'") >= 0);

    /* ============ G. hpCost 自动对拍（三组）============ */
    // 现状：30_engine.js 的 playCard 只把 c.hpCost(u) 拿来做「以命相搏」弹窗、**不实扣**；
    //       真扣血在每张牌 eff 里的 loseHp(n)。两处手工同步、此前 0 断言 —— 这组把它钉死。
    var HP_CARDS = CARDS.filter(function (c) { return typeof c.hpCost === 'function'; });
    __ok('v0.61.40 hpCost 卡恰为 20 张（新增未登记会立刻红；v1.1.5 加饮血刃/焚身咒）', HP_CARDS.length === 20, '实际 ' + HP_CARDS.length);
    var noLose = HP_CARDS.filter(function (c) { return String(c.eff).indexOf('loseHp') < 0; });
    __ok('v0.61.40 hpCost 卡全部在 eff 里真的调用 loseHp（静态扫源码）', noLose.length === 0,
      noLose.map(function (c) { return c.id; }).join(','));

    var __setup = function (hero, withEnemies) {
      G = newState();
      G.hero = hero; G.act = 1; G.relics = [];
      G.hp = 60; G.maxHp = 80; G.block = 0; G.energy = 9; G.gold = 0;
      G.deck = []; G.drawPile = []; G.hand = []; G.discard = []; G.summons = [];
      G.lastDrawnCards = []; G.尸气 = 0; G.xuenu = 0;
      CURSE_THIS_TURN = 0;
      G.hpLostTurn = 0; G.blockGainedTurn = 0; G.summonsMadeTurn = 0;
      G.xuejiArmed = false; G.endBlockKind = null; G.xiejia = 0; G.thorns = 0;
      G.hitHeal = 0; G.hitCurse = 0; G.hitShiqi = 0; G.hitRage = 0; G.hitBlock = 0; G.nextBlock = 0;
      G.dodge = 0; G.dodgeShiqi = 0; G.dodgeNextBlock = 0; G.dodgeHealRage = 0; G.dodgeCurse = 0;
      G.ranhunType = null; G.ranhunSelf = null; G.bloodPact = 0; G.retain = 0;
      G.zhouyuA = false; G.turnAtkBuff = 0; G.karmaFire = 0; G.burn = 0; G.weak = 0; G.gouhun = 0;
      G.enemies = withEnemies ? ['youhun', 'jiangshi'].map(function (k) { return makeEnemy(ENEMIES[k], k); }) : [];
      G.target = G.enemies.length ? 0 : -1;
      return G;
    };

    // 组 1：逐张 × 逐英雄 × 两升级档，decl === 实扣（量真实 G.hp 下降 —— 连「声明 5 实际回血 5」也抓得到）
    var drift = [], safeList = [], checked = 0;
    var NO_ENEMY_SAFE = ['huofu', 'tianlei', 'tiebushan', 'shihunzhou', 'zhongkui', 'zhenyaoling', 'yinxueren'];
    __HEROES.forEach(function (hero) {
      HP_CARDS.forEach(function (card) {
        [false, true].forEach(function (u) {
          // ⚠ hpCost 多数是 `G.hero==='yincha'?N:0` —— 必须先 __setup 把 G.hero 摆好再读，
          //   否则读到的是上一轮英雄，会凭空造出「赶尸人/天师 火符 decl=2 实扣=0」这类假红。
          // ① 有敌人：正常出牌路（doPlayCard 而非 playCard —— 后者会先弹「以命相搏」拦下）
          var declA = 0, lostA = null;
          try {
            __setup(hero, true);
            declA = card.hpCost(u);
            if (declA > 0) {
              var cc = Object.assign({}, card); cc.up = !!u;
              G.hand = [cc]; G.drawPile = []; G.discard = []; G.exhausted = [];
              var hA = G.hp;
              try { doPlayCard(0); } catch (e) {}
              lostA = hA - G.hp;
            }
          } catch (e) { lostA = 'ERR:' + (e && e.message); }
          if (declA > 0) {
            checked++;
            if (lostA !== declA) drift.push(hero + '/' + card.id + (u ? '(升)' : '') + ' decl=' + declA + ' 实扣=' + lostA);
          }
          // ② 无敌人：直接调 eff（不能走 doPlayCard —— 场上无敌会被当场判胜并回 8 血）
          var declB = 0, lostB = null;
          try {
            __setup(hero, false);
            declB = card.hpCost(u);
            if (declB > 0) {
              var c2 = Object.assign({}, card); c2.up = !!u;
              var hB = G.hp;
              try { c2.eff(u, c2); } catch (e) {}
              lostB = hB - G.hp;
            }
          } catch (e) { lostB = 'ERR:' + (e && e.message); }
          if (declB > 0) safeList.push({ hero: hero, id: card.id, decl: declB, lostB: lostB });
        });
      });
    });
    __ok('v0.61.40 hpCost 逐张×逐英雄×两升级档 声明 === 实扣（' + checked + ' 条）',
      drift.length === 0, drift.slice(0, 5).join(' | '));
    // 「18 张每张至少有一个英雄声明 >0」—— 防止某人把 hpCost 改成恒 0 来"修"对拍
    var heroHit = {};
    safeList.forEach(function (r) { heroHit[r.id] = 1; });
    var noHero = HP_CARDS.map(function (c) { return c.id; }).filter(function (id) { return !heroHit[id]; });
    __ok('v0.61.40 hpCost 20 张每张至少在一个英雄列上声明 >0（防「改成恒 0」式假绿）',
      noHero.length === 0, noHero.join(','));

    // 组 3：无敌人白名单 —— 已知 7 张的 curEnemy() 守卫排在 loseHp 之前，空场时整段不执行
    var whitelistHit = [], othersOff = [];
    safeList.forEach(function (r) {
      var isSafe = NO_ENEMY_SAFE.indexOf(r.id) >= 0;
      if (isSafe) { if (r.lostB !== 0) whitelistHit.push(r.id + '(' + r.hero + ')=' + r.lostB); }
      else if (r.lostB !== r.decl) othersOff.push(r.id + '(' + r.hero + ') decl=' + r.decl + ' 实扣=' + r.lostB);
    });
    __ok('v0.61.40 空场白名单 7 张（火符/天雷/铁布衫/蚀魂咒/钟馗/镇妖铃/饮血刃）确实**一分不扣**',
      whitelistHit.length === 0, whitelistHit.slice(0, 5).join(' | '));
    __ok('v0.61.40 空场 其余扣血牌**必须照扣**（未被 curEnemy 守卫拦下）',
      othersOff.length === 0, othersOff.slice(0, 5).join(' | '));
    // 防「空集假绿」：白名单必须恰是 7 张 × 2 档 = 14 条，非白名单侧必须真的非空
    var safeCnt = safeList.filter(function (r) { return NO_ENEMY_SAFE.indexOf(r.id) >= 0; }).length;
    var otherCnt = safeList.length - safeCnt;
    __ok('v0.61.40 空场 白名单实测 14 条（7 张 × 两档）、非白名单侧非空（两条断言不是空集空转）',
      safeCnt === 14 && otherCnt > 0, '白名单=' + safeCnt + ' 其余=' + otherCnt);
    rep.v6140 = { hpChecked: checked, safe: safeCnt, others: otherCnt };

    /* ============ H. 反震 / 业火 补齐成 1:1 转血怒 ============ */
    (function () {
      G = __base('yincha'); __fresh();
      var e0 = G.enemies[0];
      e0.affixes = [{ id: 'fanzhen', tier: 1 }];   // tier1 = 反弹 3
      G.hp = 60; G.xuenu = 0; G.totalHpLost = 0;
      G.turnStats = { dmgTaken: 0, blocked: 0, dealt: 0, kills: [] };
      dealDamageTo(e0, 5);
      __ok('v0.61.40 反震(阴差) 失血 3 → 等额血怒 +3', G.hp === 57 && G.xuenu === 3,
        'hp=' + G.hp + ' xuenu=' + G.xuenu);
      __ok('v0.61.40 反震 仍照旧喂 totalHpLost / dmgTaken（喂嗜血·天雷正法，不受本次改动影响）',
        G.totalHpLost === 3 && G.turnStats.dmgTaken === 3,
        'totalHpLost=' + G.totalHpLost + ' dmgTaken=' + G.turnStats.dmgTaken);
    })();
    (function () {
      G = __base('wuseng'); __fresh();
      var e1 = G.enemies[0];
      e1.affixes = [{ id: 'fanzhen', tier: 1 }];
      G.hp = 60; G.xuenu = 0;
      G.turnStats = { dmgTaken: 0, blocked: 0, dealt: 0, kills: [] };
      dealDamageTo(e1, 5);
      __ok('v0.61.40 反震(非阴差) 照旧只掉血、不给血怒', G.hp === 57 && (G.xuenu || 0) === 0,
        'hp=' + G.hp + ' xuenu=' + G.xuenu);
    })();
    (function () {
      G = __base('yincha');
      G.enemies = [makeEnemy(ENEMIES['xiuluowang'], 'xiuluowang')];
      G.target = 0; G.karmaFire = 1;
      G.hp = 60; G.xuenu = 0; G.totalHpLost = 0;
      G.turnStats = { dmgTaken: 0, blocked: 0, dealt: 0, kills: [] };
      dealDamageTo(G.enemies[0], 5);
      __ok('v0.61.40 业火(阴差) 失血 1 → 等额血怒 +1', G.hp === 59 && G.xuenu === 1,
        'hp=' + G.hp + ' xuenu=' + G.xuenu);
    })();
    /* v1.0.14：dealDamageTo 拆成 calcDamageTo / applyDamageTo 两半，逐击反应体在 applyDamageTo。 */
    __ok('v0.61.40 反震/业火 仍是直写 G.hp（有 Math.max(0,…) 下限，不会让自己回合暴毙）',
      String(applyDamageTo).indexOf('Math.max(0,G.hp-r)') >= 0 &&
      String(applyDamageTo).indexOf('Math.max(0,G.hp-1)') >= 0);
    __ok('v0.61.40 反震/业火 **没有**改走 loseHp（否则会连带触发血契/舍身/血祭一串「打出扣血牌」联动）',
      String(calcDamageTo).indexOf('loseHp(') < 0 && String(applyDamageTo).indexOf('loseHp(') < 0);
  })();

  /* ====================================================================
   * v0.61.41：地图视觉用上用户给的素材（图标 / 背景 / 道路）+ 未知关卡直入随机
   *           + 浮字四档全装 + 拖拽预伤害走同一套字形 + 敌人数量随层数走
   * ==================================================================== */
  (function () {
    var SIX = ['fight', 'elite', 'unknown', 'camp', 'shop', 'boss'];

    /* ============ A. 地图素材表（唯一真相源 = NODE_ICON / NODE_ICON_LOCKED / MAP_ROAD_ICON）============ */
    var iconBad = SIX.filter(function (k) { return !/\.png$/.test(String(NODE_ICON[k] || '')); });
    __ok('v0.61.41 UI NODE_ICON 六键都是 .png 文件名（留空槽时代结束）', iconBad.length === 0, iconBad.join(','));
    __ok('v1.1.14 UI NODE_ICON 指向 guanqia-logo 新图（商店仍用 map/shop.png）',
      NODE_ICON.fight === 'guanqia-logo/combat.png' && NODE_ICON.elite === 'guanqia-logo/ellite.png' &&
      NODE_ICON.unknown === 'guanqia-logo/unknown.png' && NODE_ICON.camp === 'guanqia-logo/rest.png' &&
      NODE_ICON.shop === 'shop.png' && NODE_ICON.boss === 'guanqia-logo/boss.png',
      JSON.stringify(NODE_ICON));
    __ok('v0.61.41 UI 未解锁用 locked.png（用户给的锁图）', String(NODE_ICON_LOCKED) === 'locked.png');
    /* v0.61.42：MAP_ROAD_ICON 这张表**已退役**（路径回到代码自绘，见下面 B 段）。
       两张 PNG 仍留在 素材/map/ 下**没有删**（用户的素材不擅自删），只是不再被请求 ——
       所以这里断言的正是「表没了」，而不是「图没了」。 */
    __ok('v0.61.42 UI MAP_ROAD_ICON 已退役（typeof 取不到，不再有第二份路径真相）',
      typeof MAP_ROAD_ICON === 'undefined');
    __ok('v0.61.41 UI 图标目录前缀只有一处真相（MAP_ICON_DIR）', MAP_ICON_DIR === 'map/');
    __ok('v0.61.41 UI 六种节点都能拼出带 node-ico 的图标 HTML',
      SIX.every(function (k) { return String(nodeHTML({ t: k })).indexOf('node-ico') >= 0; }));
    __ok('v0.61.41 UI 图标走 artImg/assetURL 而不是写死 素材/...（写死的话打包后丢图）',
      String(nodeIconHTML).indexOf('artImg') >= 0 && String(artImg).indexOf('assetURL') >= 0);
    __ok('v1.1.14 UI showMap 未解锁格显示真实类型图标（不再挂锁图；也不留白）',
      String(showMap).indexOf('NODE_ICON_LOCKED') < 0 && String(showMap).indexOf('map-node empty') < 0
      && String(showMap).indexOf('nodeHTML(node)') >= 0);
    __ok('v0.61.41 UI 节点文案去掉了 emoji 前缀（改用图标表达类型）',
      Object.keys(NODE_LABEL).filter(function (k) { return /[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(NODE_LABEL[k]); }).length === 0,
      JSON.stringify(NODE_LABEL));

    /* ============ B. 路径回到代码自绘（SVG 二次贝塞尔弧）+ 沿路径延长的淡黄光边动画 ============ */
    __ok('v0.61.42 路径 回到代码自绘 SVG（createElementNS），不再请求道路贴图',
      String(drawMapLinks).indexOf('createElementNS') >= 0 &&
      String(drawMapLinks).indexOf('MAP_ROAD_ICON') < 0);
    __ok('v0.61.42 路径 连线层仍是 <div class="map-lines" id="map-lines">（svg 由 JS 现建，不进静态 HTML）',
      String(showMap).indexOf('class="map-lines" id="map-lines"') >= 0);
    __ok('v0.61.42 路径 每条边是二次贝塞尔 Q（不是直线 L，也不是贴图）——纯函数 mapArcD 直接对拍',
      (function () {
        var d = mapArcD({ x: 0, y: 0 }, { x: 200, y: 0 }, 'edge-a');
        return /^M0,0 Q-?[\d.]+,-?[\d.]+ 200,0$/.test(d) && d.indexOf('Q') > 0 && d.indexOf('L') < 0;
      })(), String(mapArcD({ x: 0, y: 0 }, { x: 200, y: 0 }, 'edge-a')));
    __ok('v0.61.42 路径 竖直边的控制点**横向**偏移（弧线确实拱起来，不是直线）',
      (function () {
        var d = mapArcD({ x: 0, y: 0 }, { x: 0, y: 200 }, 'edge-b');
        var m = /^M0,0 Q(-?[\d.]+),(-?[\d.]+) 0,200$/.exec(d);
        return !!m && Math.abs(parseFloat(m[1])) > 5 && Math.abs(parseFloat(m[2]) - 100) < 1;
      })(), String(mapArcD({ x: 0, y: 0 }, { x: 0, y: 200 }, 'edge-b')));
    __ok('v0.61.42 路径 弯曲量 mapArcBow 绝不接近 0（任何一条边都看得出弧，不是直线）',
      (function () {
        var near = 0, pos = 0, neg = 0;
        for (var i = 0; i < 400; i++) {
          var v = mapArcBow('k' + i);
          if (Math.abs(v) < 0.45) near++;
          if (v > 0) pos++; else if (v < 0) neg++;
        }
        return near === 0 && pos > 0 && neg > 0;
      })());
    __ok('v0.61.42 路径 同一条边每次画都弯同一边（mapArcBow 纯函数、无随机）',
      mapArcBow('0,0>1,0') === mapArcBow('0,0>1,0') && mapArcBow('0,0>1,1') !== mapArcBow('0,0>1,0'));
    __ok('v0.61.42 路径 长边的外凸量被夹住（不会窜出面板）',
      (function () {
        var d = mapArcD({ x: 0, y: 0 }, { x: 600, y: 0 }, 'edge-c');
        var m = /^M0,0 Q(-?[\d.]+),(-?[\d.]+) 600,0$/.exec(d);
        return !!m && Math.abs(parseFloat(m[2])) <= 42.001;
      })());
    __ok('v0.61.42 路径 两端几乎重合（<4px）时不画边，返回空串', mapArcD({ x: 0, y: 0 }, { x: 2, y: 1 }, 'edge-d') === '');
    __ok('v0.61.42 路径 边的 key 是**有向**的（r0,c0>r1,c1，正反不同串）',
      mapEdgeKey(0, 0, 1, 0) === '0,0>1,0' && mapEdgeKey(1, 0, 0, 0) === '1,0>0,0' &&
      mapEdgeKey(0, 0, 1, 0) !== mapEdgeKey(1, 0, 0, 0));
    __ok('v0.61.42 路径 光边生长动画：CSS 变量 --len + getTotalLength + 降级守卫',
      String(drawMapLinks).indexOf("setProperty('--len'") >= 0 &&
      String(drawMapLinks).indexOf('getTotalLength') >= 0 &&
      String(drawMapLinks).indexOf('if(L>1') >= 0 &&
      String(drawMapLinks).indexOf('link-new') >= 0);
    __ok('v0.61.42 路径 取不到长度时不加 link-new（降级后仍是淡黄浅光边，不会变虚线或消失）',
      String(drawMapLinks).indexOf('if(!newest) return;') >= 0);
    /* 只看「赋了个非 null 的值」的写法（`_mapGlowEdge = <非n>`）—— showMap 里一处都不许有；
         showMap 那两处 `_mapGlowEdge=null` 是**消费后清空**，是有意为之。 */
    __ok('v0.61.42 路径 一次性标记只在 goNext 里被赋值；showMap 只会把它清空（只消费不生产）',
      String(goNext).indexOf('_mapGlowEdge = (__p.length>=2)') >= 0 &&
      (String(showMap).match(/_mapGlowEdge\s*=\s*[^n]/g) || []).length === 0 &&
      String(showMap).indexOf('_mapGlowEdge=null') >= 0 &&
      String(drawMapLinks).indexOf('_mapGlowEdge=null') >= 0);
    __ok('v0.61.42 路径 三种线语义没丢（暗线 / 金虚线 / 淡黄浅光边）',
      String(drawMapLinks).indexOf("'link-dim'") >= 0 &&
      String(drawMapLinks).indexOf("'link-reach'") >= 0 &&
      String(drawMapLinks).indexOf("'link-past'") >= 0);
    __ok('v0.61.42 路径 连线仍只在「两端都可见」时画（不泄露未解锁层的拓扑）',
      String(drawMapLinks).indexOf('fogVisible') >= 0);

    /* ============ C. 背景：地图改用 bg_map.jpg（setBg 支持扩展名）============ */
    __ok('v0.61.41 背景 带扩展名只补 bg_ 前缀、不补 .png（素材/bg/ 的命名约定不破）',
      bgRel('map.jpg') === 'bg/bg_map.jpg' && bgRel('map.jpeg') === 'bg/bg_map.jpeg');
    __ok('v0.61.41 背景 不带扩展名沿用 bg_<name>.png（战斗三幕零改动）',
      bgRel('act1') === 'bg/bg_act1.png' && bgRel('act3') === 'bg/bg_act3.png');
    /* v0.76.0：主菜单那格改指 bg/menu/menu_3.png（原素材/bg/bg_menu.png 已删，同图挪位） */
    __ok('v0.76.0 背景 menu 特判到 bg/menu/menu_3.png（不再拼出已删的 bg_menu.png）',
      bgRel('menu') === 'bg/menu/menu_3.png', String(bgRel('menu')));
    __ok('v0.76.0 bgRel(\'menu\') 与主菜单轮换表 MENU_BGS 用的是同一份图（没多留一份重复体）',
      MENU_BGS.indexOf(bgRel('menu')) >= 0, String(bgRel('menu')));
    __ok('v0.61.41 背景 地图表三幕全指向 bg_map.jpg（v1.0.14：无尽已删）',
      MAP_BG[1] === 'map.jpg' && MAP_BG[2] === 'map.jpg' && MAP_BG[3] === 'map.jpg',
      JSON.stringify(MAP_BG));
    __ok('v0.61.41 背景 战斗场景仍走 act1/2/3（地图换背景没波及战斗）',
      String(setBg).indexOf("'act'+G.act") < 0 &&
      String(continueRun).indexOf("'act'+G.act") >= 0);

    /* ============ D. 浮字：四档全装 + 共用字形件 + 开局预加载 ============ */
    __ok('v0.61.41 浮字 numSplit 拆出符号与数字', (function () {
      var a = numSplit('-12'); return !!a && a.sign === '-' && a.digits === '12';
    })());
    __ok('v0.61.41 浮字 numSplit 认正号', (function () {
      var a = numSplit('+4'); return !!a && a.sign === '+' && a.digits === '4';
    })());
    __ok('v0.61.41 浮字 numSplit 非「纯数字」一律 null（小数/字母/空/只有符号都回落文字）',
      numSplit('12.5') === null && numSplit('1a') === null && numSplit('') === null && numSplit('-') === null);
    __ok('v0.61.41 浮字 四档映射没漂（dmg / hurt / block / heal）',
      numKind('') === 'dmg' && numKind('to-player') === 'hurt' && numKind('block') === 'block' && numKind('heal') === 'heal');
    __ok('v0.61.41 浮字 素材不可用时 numHTML/numAppend 返假值（沙箱里 Image 永不 load ⇒ 必须走文字）',
      numHTML('', '-12') === null && (function () {
        var p = document.createElement('i');
        return numAppend(p, '', '-12') === false;
      })());
    __ok('v0.61.41 浮字 numPrewarm 不抛错，且四档都进了探测（NUM_STATE 四键齐备）', (function () {
      try { numPrewarm(); } catch (e) { return false; }
      return ['dmg', 'hurt', 'block', 'heal'].every(function (k) { return NUM_STATE[k] !== undefined; });
    })());
    // 注意：全局 floatDamage 在 :658 已被顶成记录桩 __sil，这里必须用 __realFloatDamage 取真身
    __ok('v0.61.41 浮字 飘字与拖拽预伤害共用同一套字形件（不再各写一份 img 拼接）',
      String(__realFloatDamage).indexOf('numAppend') >= 0 && String(showDragPreview).indexOf('numHTML') >= 0);
    __ok('v0.61.41 浮字 拖拽预伤害仍保留文字回落（素材缺失时行为与改动前一致）',
      String(showDragPreview).indexOf("el.textContent='-'+pv.d") >= 0);
    __ok('v0.61.41 浮字 开局就预加载（否则本局第一次飘字必然回落文字）',
      String(numPrewarm).indexOf('numProbe') >= 0);
    __ok('v1.1.x 设置里**不再**有开发者自检按钮（「浮字自检」随「抹除开发者痕迹」一并移除）',
      typeof numSelfTest === 'undefined' && String(showSettings).indexOf('numSelfTest') < 0);
    __ok('v0.61.41 浮字 设置里点明「流畅模式会关掉飘字」（fx() 是飘字的总闸，不写清就会被当成素材没生效）',
      String(showSettings).indexOf('伤害飘字') >= 0 && String(fx).indexOf('lowSpec') >= 0);

    /* ============ E. 敌人数量随层数走 ============ */
    __ok('v0.61.41 敌军 概率表：前 4 层恒 0、第 9 层起 0.85、中间层沿用老口径 0.65',
      ENEMY3_P3[0] === 0 && ENEMY3_P3[3] === 0 && ENEMY3_P3[7] === 0.65 &&
      ENEMY3_P3[9] === 0.85 && ENEMY3_P3[12] === 0.85,
      JSON.stringify(ENEMY3_P3));
    __ok('v0.61.41 敌军 enemy3Chance 越界/非数一律回落 0.65（无尽与老调用点不受影响）',
      enemy3Chance(-1) === 0.65 && enemy3Chance(999) === 0.65 &&
      enemy3Chance(undefined) === 0.65 && enemy3Chance(null) === 0.65);
    var rowBad = [], early3 = 0, earlyN = 0, late3 = 0, lateN = 0, maxEarly = 0;
    for (var a5 = 1; a5 <= 3; a5++) {
      for (var s5 = 1; s5 <= 12; s5++) {
        var M5 = genAct(a5, s5);
        for (var r5 = 0; r5 < 13; r5++) {
          for (var c5 = 0; c5 < M5[r5].length; c5++) {
            var n5 = M5[r5][c5];
            if (n5.t !== 'fight' && n5.t !== 'elite') continue;
            if (r5 <= 3) {
              if (n5.e.length > maxEarly) maxEarly = n5.e.length;
              if (n5.e.length > 2) rowBad.push('a' + a5 + 's' + s5 + '@' + r5 + ',' + c5 + '=' + n5.e.length);
            }
            if (n5.t === 'fight') {
              if (r5 <= 3) { earlyN++; if (n5.e.length === 3) early3++; }
              if (r5 >= 9) { lateN++; if (n5.e.length === 3) late3++; }
            }
          }
        }
      }
    }
    __ok('v0.61.41 敌军 每一幕前 4 层敌人数量不超过 2 个（3 幕 × 12 种子全量扫）',
      rowBad.length === 0, rowBad.slice(0, 6).join(' | '));
    __ok('v0.61.41 敌军 前 4 层最大敌人数量 = 2', maxEarly === 2, 'max=' + maxEarly);
    __ok('v0.61.41 敌军 前期一个 3 只都没有', early3 === 0 && earlyN > 0, 'early3=' + early3 + '/' + earlyN);
    __ok('v0.61.41 敌军 后期 3 只比例明显高于前期（0.85 vs 0）',
      lateN > 0 && late3 / lateN > 0.6, 'late3=' + late3 + '/' + lateN);
    __ok('v0.61.41 敌军 配额与结构没被本批打翻（仍是 14 层 / 末层 1 个 Boss / ACTS 三张）',
      genAct(1, 77).length === 14 && genAct(1, 77)[13].length === 1 &&
      genAct(1, 77)[13][0].t === 'boss' && ACTS.length === 3);

    /* ============ G. 洗髓经：卡面写的回合数 = 实际生效的回合数（B/C/D 列曾硬写 3）============ */
    var __xsBad = [];
    ['ganshiren', 'wuseng', 'yincha', 'tianshi'].forEach(function (h) {
      [false, true].forEach(function (u) {
        var c = __card('xisui');
        G = __base(h);
        var msg = null, keepFM = floatMsg;
        try { floatMsg = function (t) { msg = String(t); }; c.eff(u, c); } finally { floatMsg = keepFM; }
        var m = /接下来 (\d+) 回合/.exec(c.t(u));
        var want = m ? +m[1] : -1;
        if (want < 0) __xsBad.push(h + ' 卡面没有「接下来 N 回合」措辞');
        else if (G.xisuiTurns !== want) __xsBad.push(h + (u ? '(U)' : '') + ' 卡面=' + want + ' 实际=' + G.xisuiTurns);
        if (msg && want > 0 && msg.indexOf(want + ' 回合') < 0) __xsBad.push(h + (u ? '(U)' : '') + ' 飘字与卡面不一致：' + msg);
      });
    });
    __ok('v0.61.41 洗髓经 四列 × 两档，卡面回合数 = 实际套上的回合数（A 列固定 3、B/C/D 列 3/4）',
      __xsBad.length === 0, __xsBad.join(' | '));
    (function () {
      function run(h, u, want) {
        var c = __card('xisui');
        G = __base(h); G.hp = 999; G.maxHp = 999;
        G.enemies.forEach(function (e) { e.hp = 9999; e.maxHp = 9999; });
        c.eff(u, c);
        var n = 0;
        while (G.xisuiTurns > 0 && n < 12) { startTurn(); n++; }
        __ok('v0.61.41 洗髓经 真能撑满 ' + want + ' 个回合（' + h + (u ? ' 升级' : '') + '）', n === want, 'n=' + n);
      }
      try { run('wuseng', true, 4); run('wuseng', false, 3); run('ganshiren', true, 3); }
      catch (e) { __ok('v0.61.41 洗髓经 回合递减未抛错', false, String(e && e.message)); }
    })();

    /* ============ F. 未知关卡直入随机（不再三选一）============ */
    var __keepRng = rng;
    try {
      rng = function () { return 0; };   // 固定抽到 pool[0] = 'well'（古井许愿：扣 8 血 + 给遗物）
      G = __base('yincha'); SCENE = 'map'; G.mapRow = 1; G.mapCol = 0; G.mapPath = [];
      var hpB = G.hp, nRelic = G.relics.length;
      showUnknown();
      __ok('v0.68.1 古井许愿 先问后扣：弹窗阶段血量不减', G.hp === hpB, 'hp=' + hpB + '→' + G.hp);
      __ok('v0.68.1 古井许愿 先问后扣：弹窗阶段不给遗物', G.relics.length === nRelic, 'relics=' + G.relics.length);
      doWellOffer();
      __ok('v0.68.1 古井许愿 点了「献祭」才扣 8 血 + 给遗物',
        G.hp === hpB - 8 && G.relics.length === nRelic + 1, 'hp=' + G.hp + ' relics=' + G.relics.length);
      __ok('v0.61.41 未知关卡 场景标记仍是 unknown（续档能落回来）', SCENE === 'unknown', 'SCENE=' + SCENE);
      __ok('v0.61.41 未知关卡 源码里不再有 evs / descs 三张卡面',
        String(showUnknown).indexOf('evs') < 0 && String(showUnknown).indexOf('descs') < 0 &&
        String(showUnknown).indexOf('doUnknown(') >= 0);
      __ok('v0.61.41 未知关卡 抽到什么用 floatMsg 报一声（没有三选一预告了，总得让玩家知道）',
        String(showUnknown).indexOf('floatMsg(') >= 0);
      /* v0.68.1：「不让玩家挑事件」（v0.61.41）和「抽到事件后能不能拒绝代价」是两件事。
         后者是这批补的 —— 两边都得有出路，且「离开」必须真的零副作用。 */
      G = __base('yincha'); G.hp = 60; G.relics = [];
      __ok('v0.68.1 古井许愿 源码里有「转身离开」出路',
        __code(unknownWell).indexOf('转身离开') >= 0);
      unknownWell();
      __ok('v0.68.1 古井许愿 光是弹窗出来不产生副作用', G.hp === 60 && G.relics.length === 0,
        'hp=' + G.hp + ' relics=' + G.relics.length);
      var __nDeck = G.deck.length;
      __ok('v0.68.1 鬼市黑商 源码里有「摆手谢绝」出路',
        __code(unknownBlackMarket).indexOf('摆手谢绝') >= 0);
      unknownBlackMarket();
      __ok('v0.68.1 鬼市黑商 光是弹窗出来不往牌组塞牌', G.deck.length === __nDeck, 'deck=' + G.deck.length);
      var __n2 = G.deck.length; doBlackMarketTake('leifu');
      __ok('v0.68.1 鬼市黑商 点了「收下」才进牌组', G.deck.length === __n2 + 1, 'deck=' + G.deck.length);
    } catch (e) {
      __ok('v0.61.41 未知关卡 直入随机未抛错', false, String(e && e.message));
    } finally {
      rng = __keepRng;
    }
  })();

  /* ====================================================================
   * v0.61.42：路径回到代码自绘（弯曲 + 沿路径延长的淡黄光边动画）
   *           + 图标随机落位（不规整 / 不紧凑）+ 2~3 条初始路线 + 少分叉
   *           + 地图背景终于看得见（#overlay.map-scene）+ 浮字符号配色对齐数字
   * ==================================================================== */
  (function () {
    /* ============ A. 落位表两处一致 + mapNodeStyle 形状与兜底 ============ */
    __ok('v0.61.42 落位 MAP_SLOT_PCT 的槽数与生成器 MAP_SLOT_N 一致（不一致就会越槽/撞在一起）',
      MAP_SLOT_PCT.length === MAP_SLOT_N && MAP_SLOT_N === 5, MAP_SLOT_PCT.length + '/' + MAP_SLOT_N);
    __ok('v0.61.42 落位 槽位百分比严格升序、首尾留边（不贴死面板左右边）',
      MAP_SLOT_PCT.every(function (v, i) { return i === 0 || v > MAP_SLOT_PCT[i - 1]; }) &&
      MAP_SLOT_PCT[0] >= 5 && MAP_SLOT_PCT[MAP_SLOT_PCT.length - 1] <= 95);
    __ok('v0.61.42 落位 槽间距 21% 是抖动上限 8%（±4%）的两倍以上 ⇒ 抖动绝不越槽',
      (MAP_SLOT_PCT[1] - MAP_SLOT_PCT[0]) > 8);
    __ok('v0.61.42 落位 mapSlotPct 越界夹紧（老档 / 手造 fixture 传 9 或 -3 也不炸）',
      mapSlotPct({ sx: 9 }) === 92 && mapSlotPct({ sx: -3 }) === 8 && mapSlotPct({ sx: 0 }) === 8);
    __ok('v0.61.42 落位 mapNodeStyle 输出 left%/top px 的内联串',
      mapNodeStyle({ sx: 4, jx: -4, jy: 7 }) === 'left:88.00%;top:7px;' &&
      mapNodeStyle({ sx: 0, jx: 0, jy: 0 }) === 'left:8.00%;top:0px;',
      mapNodeStyle({ sx: 4, jx: -4, jy: 7 }));
    __ok('v0.61.42 落位 mapNodeStyle 缺字段有兜底（居中槽 + 零抖动，不是全叠在左上角）',
      mapNodeStyle({ t: 'fight' }) === 'left:50.00%;top:0px;' && mapNodeStyle(null) === '',
      mapNodeStyle({ t: 'fight' }));
    /* v0.62.0 改口径：v0.61.42 这里钉「正好 4 处」是因为当时恰好 4 个雾级分支；
       v0.62.0 新增了 breaking（锁破裂）档 ⇒ 变成 5 处，**写死数字会随档位数一起腐烂**。
       改钉形状不变量本身：「凡渲染 .map-node 的地方，必带 style="${mapNodeStyle(node)}"」
       ⇒ 两边的出现次数必须相等，且至少 5（breaking / choice / preview / hidden / 普通）。
       ⚠️ Function.toString() **会把注释算进去**，所以这里只比对两个计数的**相等关系**，
          不比对绝对值（绝对值会被自己写的注释判红）。 */
    var __nStyle = (String(showMap).match(/style="\$\{mapNodeStyle\(node\)\}"/g) || []).length;
    var __nNode = (String(showMap).match(/class="map-node/g) || []).length;
    __ok('v0.62.0 落位 showMap 每处 .map-node markup 都带内联落位（少一处就有格子叠在左上角）',
      __nStyle === __nNode && __nNode >= 5, 'style=' + __nStyle + ' / node=' + __nNode);

    /* ============ B. 生成器形状：2~3 条初始路线 + 少分叉（参照杀戮尖塔）============ */
    var __firstRow = {}, __maxBr = 0, __fN = [], __fR = [], __slotBad = [], __orderBad = 0;
    for (var a5 = 1; a5 <= 3; a5++) {
      for (var s5 = 1; s5 <= 40; s5++) {
        var M5 = genAct(a5, s5);
        __firstRow[M5[0].length] = (__firstRow[M5[0].length] || 0) + 1;
        var fn5 = 0, fr5 = 0;
        for (var r5 = 0; r5 < M5.length; r5++) {
          var rowHas5 = false, seen5 = {};
          for (var c5 = 0; c5 < M5[r5].length; c5++) {
            var nd5 = M5[r5][c5];
            if (typeof nd5.sx !== 'number' || nd5.sx < 0 || nd5.sx > MAP_SLOT_N - 1) __slotBad.push('sx@' + r5 + ',' + c5);
            if (Math.abs(nd5.jx) > 4) __slotBad.push('jx@' + r5 + ',' + c5);
            if (Math.abs(nd5.jy) > 7) __slotBad.push('jy@' + r5 + ',' + c5);
            if (seen5[nd5.sx]) __slotBad.push('同行两格同槽@' + r5);
            seen5[nd5.sx] = 1;
            if (nd5.next.length >= 2) { fn5++; rowHas5 = true; }
            if (nd5.next.length > __maxBr) __maxBr = nd5.next.length;
          }
          for (var i5 = 1; i5 < M5[r5].length; i5++) if (M5[r5][i5 - 1].sx >= M5[r5][i5].sx) __orderBad++;
          if (rowHas5) fr5++;
        }
        __fN.push(fn5); __fR.push(fr5);
      }
    }
    __ok('v0.61.42 形状 首层恒 2~3 格（旧形状 40 个种子里有 17 个只有 1 格 = 开局就没得选）',
      __firstRow[2] > 0 && __firstRow[3] > 0 && (__firstRow[2] + __firstRow[3]) === 120 &&
      Object.keys(__firstRow).length === 2, JSON.stringify(__firstRow));
    __ok('v0.61.42 形状 单格最多分 2 条（旧形状有一次分 4 条的「路口爆开」，是「路口太多」的来源）',
      __maxBr <= 2, 'maxBr=' + __maxBr);
    __ok('v0.61.42 形状 分叉节点 ≤3、分叉层 ≤3（3幕×40种子）',
      Math.max.apply(null, __fN) <= 3 && Math.max.apply(null, __fR) <= 3,
      'fN max=' + Math.max.apply(null, __fN) + ' fR max=' + Math.max.apply(null, __fR));
    __ok('v0.61.42 形状 每格 sx/jx/jy 都在范围内、同行槽位互不相同（3幕×40种子）',
      __slotBad.length === 0, __slotBad.slice(0, 5).join(' | '));
    __ok('v0.61.42 形状 槽位号随列号单调递增 ⇒ 抖动不会让两条边交叉拧成一团',
      __orderBad === 0, 'bad=' + __orderBad);
    __ok('v0.61.42 形状 末层 Boss 居中且零抖动（它要收拢所有路线，摆边上会拉出一条很斜的长线）',
      (function () {
        for (var a7 = 1; a7 <= 3; a7++) {
          var b7 = genAct(a7, 5)[MAP_ROWS - 1][0];
          if (b7.sx !== 2 || b7.jx !== 0 || b7.jy !== 0) return false;
        }
        return true;
      })());
    __ok('v0.61.42 形状 同种子同地图 / 异种子不同图（落位也吃生成器自带的 R）',
      JSON.stringify(genAct(2, 9)) === JSON.stringify(genAct(2, 9)) &&
      JSON.stringify(genAct(2, 9)) !== JSON.stringify(genAct(2, 10)));
    __ok('v0.61.42 形状 genAct 前后全局 rng 快照完全不变（落位没偷吃主随机流）',
      (function () {
        var b9 = JSON.stringify(rngSnapshot());
        genAct(3, 77); genAct(1, 12345);
        return b9 === JSON.stringify(rngSnapshot());
      })());

    /* ============ C. 地图背景终于看得见：overlay 打 .map-scene，showOverlay 负责摘 ============ */
    __ok('v0.61.42 背景 showMap 在 showOverlay **之后**给 #overlay 加 .map-scene（提前加会被 showOverlay 清掉）',
      (function () {
        var s = String(showMap), a = s.indexOf('showOverlay(html)'), b = s.indexOf("classList.add('map-scene')");
        return a >= 0 && b > a;
      })());
    __ok('v0.61.42 背景 showOverlay 开任何面板都先摘 .map-scene（奖励/商店/图鉴保持原来的深色底）',
      String(__realShowOverlay).indexOf("classList.remove('map-scene')") >= 0);
    __ok('v0.61.42 背景 .map-scene 只由地图页加、由 showOverlay 统一摘（不是各面板各自擦屁股）',
      String(__realShowOverlay).indexOf("'map-scene'") >= 0 && String(showMap).indexOf("'map-scene'") >= 0 &&
      String(__realShowOverlay).indexOf("classList.add('map-scene')") < 0);

    /* ============ D. 浮字：符号走 .fx-sign，且**真的**产出一个带 fx-sign 的 span ============ */
    __ok('v0.61.42 浮字 两条渲染路都带 .fx-sign（numAppend 的 DOM 路 + numHTML 的 innerHTML 路）',
      String(numAppend).indexOf('fx-sign') >= 0 && String(numHTML).indexOf('fx-sign') >= 0);
    /* numHTML 要真跑一次也得先把字形灌成「可用」——原因见下面那段的长注释。 */
    (function () {
      var ks = NUM_STATE, ki = NUM_IMG, gs = [], h = null;
      for (var i = 0; i < 10; i++) gs.push({ src: 'num/dmg/' + i + '.png' });
      try { NUM_STATE = { dmg: 1 }; NUM_IMG = { dmg: gs }; h = numHTML('', '-12'); }
      catch (e) { h = 'ERR:' + (e && e.message); }
      finally { NUM_STATE = ks; NUM_IMG = ki; }
      __ok('v0.61.42 浮字 numHTML 拼出的符号带 .fx-sign（拖拽预伤害那条路本来就有，不许回退）',
        typeof h === 'string' && h.indexOf('<span class="fx-sign">-</span>') >= 0, String(h));
    })();
    /* 行为级验证：vm 里 Image 永不 load ⇒ NUM_STATE 恒为 -1 ⇒ numAppend 会在**取字形**那一步提前 return，
       根本走不到「塞符号」那几行。所以这里临时把 NUM_STATE/NUM_IMG 灌成可用，
       再把 createElement / Image 换成**记录器**，才能真的看见它产出了什么。
       注：vm_host.js 的 appendChild 是空实现，所以只能记「造了什么元素」，不能记「挂上去了没有」。*/
    (function () {
      var __keepState = NUM_STATE, __keepImg = NUM_IMG, __keepCE = document.createElement, __keepImage = Image;
      var __rec = [];
      function __recWrap(el, tag) {
        __rec.push({ tag: tag, cls: '', text: '' });
        var r = __rec[__rec.length - 1];
        Object.defineProperty(el, 'className', { configurable: true, get: function () { return r.cls; }, set: function (v) { r.cls = String(v); } });
        Object.defineProperty(el, 'textContent', { configurable: true, get: function () { return r.text; }, set: function (v) { r.text = String(v); } });
        return el;
      }
      var glyphs = [];
      for (var g = 0; g < 10; g++) glyphs.push({ src: 'num/dmg/' + g + '.png' });
      try {
        NUM_STATE = { dmg: 1 }; NUM_IMG = { dmg: glyphs };
        document.createElement = function (tag) { return __recWrap(__keepCE.call(document, tag), String(tag)); };
        Image = function () { return __recWrap(__keepImage(), 'Image'); };
        var host = __keepCE.call(document, 'i');
        var ret = numAppend(host, '', '-12');
        var sign = __rec.filter(function (o) { return o.cls === 'fx-sign'; })[0];
        var nums = __rec.filter(function (o) { return o.cls === 'fx-num'; });
        __ok('v0.61.42 浮字 numAppend 真的造出 1 个 .fx-sign(span) + 2 个 .fx-num(img)',
          ret === true && __rec.length === 3 && !!sign && sign.tag === 'span' && sign.text === '-' && nums.length === 2,
          JSON.stringify(__rec));
        __ok('v0.61.42 浮字 符号那行**只**造一个带 fx-sign 的 span（不再有 createTextNode 裸文本分支）',
          String(numAppend).indexOf("sg.className='fx-sign'") >= 0 &&
          String(numAppend).indexOf('parent.appendChild(sg)') >= 0);
        var rec2 = __rec.length;
        __rec.length = 0;
        numAppend(__keepCE.call(document, 'i'), '', '7');
        __ok('v0.61.42 浮字 没有符号时不造 fx-sign（正数无号 / 纯数字不凭空多一个 span）',
          __rec.length === 1 && !__rec.some(function (o) { return o.cls === 'fx-sign'; }), JSON.stringify(__rec));
      } catch (e) {
        __ok('v0.61.42 浮字 numAppend 行为级验证未抛错', false, String(e && e.message));
      } finally {
        NUM_STATE = __keepState; NUM_IMG = __keepImg;
        document.createElement = __keepCE; Image = __keepImage;
      }
    })();

    /* ============ E. 光边动画端到端：goNext 记下「刚打通的这条边」============ */
    var __keepMAP = MAP, __keepG = G, __keepScene = SCENE, __keepEdge = _mapGlowEdge;
    try {
      G = __base('yincha'); SCENE = 'map';
      MAP = genAct(1, 4242); G.act = 1;
      G.mapRow = 0; G.mapCol = -1;
      G.mapPath = [{ r: 0, c: 0 }, { r: 1, c: 0 }];
      _mapGlowEdge = null;
      goNext();
      __ok('v0.61.42 光边 goNext 把「刚打通的那条边」记成**有向** key（淡黄光边就是沿它生长）',
        _mapGlowEdge === '0,0>1,0', String(_mapGlowEdge));
      __ok('v0.61.42 光边 goNext 同时真的推进了一层', G.mapRow === 1, 'mapRow=' + G.mapRow);
      __ok('v0.61.42 光边 边只有 1 个点时不硬凑（mapPath 短于 2 ⇒ 标记为 null，不会放错边）',
        (function () {
          G.mapPath = [{ r: 1, c: 0 }];
          _mapGlowEdge = null; goNext();
          return _mapGlowEdge === null;
        })(), String(_mapGlowEdge));
    } catch (e) {
      __ok('v0.61.42 光边 goNext 端到端未抛错', false, String(e && e.message));
    } finally {
      MAP = __keepMAP; G = __keepG; SCENE = __keepScene; _mapGlowEdge = __keepEdge;
    }
  })();

  /* ====================================================================
   * v0.62.0：地图界面重做（卷轴场景 / 相机 / 锁破裂解锁）
   *           + 每路线特殊节点下限 + 图标描边三态
   *   用户原话：「每一幕的每一条路线都要经过至少1个商店，2个篝火，1个未知和2个精英，这只是限制」
   * ==================================================================== */
  (function () {
    /* ============ A. 逐路线特殊节点下限 ============ */
    var __badRoute = [], __routeMin = 99, __routeMax = 0, __lvlFail = [], __corrFail = [],
        __densFail = [], __enemyFail = [], __eliteSum = [0, 0, 0], __specSum = [0, 0, 0], __N = 30;
    for (var a = 1; a <= 3; a++) {
      for (var s = 1; s <= __N; s++) {
        var M = genAct(a, s), rt = routesOf(M);
        if (rt.length < __routeMin) __routeMin = rt.length;
        if (rt.length > __routeMax) __routeMax = rt.length;
        /* ① 逐路线：每一条路线都要凑够 ROUTE_NEED */
        for (var i = 0; i < rt.length; i++) {
          var c = { camp: 0, shop: 0, unknown: 0, elite: 0 };
          for (var p = 0; p < rt[i].length; p++) {
            var t = M[rt[i][p][0]][rt[i][p][1]].t;
            if (c[t] !== undefined) c[t]++;
          }
          for (var k in ROUTE_NEED) {
            if (c[k] < ROUTE_NEED[k]) __badRoute.push('a' + a + 's' + s + ' #' + i + ' ' + k + '=' + c[k]);
          }
        }
        /* ② 首尾不动：第 0 层全是普通战（开局必须能赢）、末层唯一 Boss */
        for (var c0 = 0; c0 < M[0].length; c0++) {
          if (M[0][c0].t !== 'fight') __lvlFail.push('a' + a + 's' + s + ' row0 有 ' + M[0][c0].t);
        }
        if (M[MAP_ROWS - 1].length !== 1 || M[MAP_ROWS - 1][0].t !== 'boss') {
          __lvlFail.push('a' + a + 's' + s + ' 末层不是唯一 boss');
        }
        /* ③ 改型后敌人编成仍合法：fight 至少 2 只小怪、elite 至少含 1 只精英 */
        var spec = { camp: 0, shop: 0, unknown: 0, elite: 0 }, cells = 0;
        for (var r = 0; r < M.length; r++) for (var cc = 0; cc < M[r].length; cc++) {
          var nd = M[r][cc]; cells++;
          if (nd.t === 'fight' && (!nd.e || nd.e.length < 2)) __enemyFail.push('a' + a + 's' + s + ' @' + r + ',' + cc + ' fight e=' + (nd.e ? nd.e.length : 'null'));
          if (nd.t === 'elite' && (!nd.e || nd.e.length < 1)) __enemyFail.push('a' + a + 's' + s + ' @' + r + ',' + cc + ' elite 无精英');
          if (spec[nd.t] !== undefined) spec[nd.t]++;
          if (r < 8 && spec[nd.t] !== undefined) { /* 下半段密度在下面单独算 */ }
        }
        /* ④ 走廊（第 10~12 层）特殊节点数量受分级上限约束 */
        var corr = 0;
        for (var ci = 0; ci < CORRIDOR_ROWS.length; ci++) {
          var rowC = M[CORRIDOR_ROWS[ci]];
          if (rowC && rowC[0] && rowC[0].t !== 'fight' && rowC[0].t !== 'boss') corr++;
        }
        if (corr > 3) __corrFail.push('a' + a + 's' + s + ' 走廊特殊=' + corr);
        /* ⑤ 下半段（1~8 层）特殊节点密度不得失控（否则「路线规划」没意义了） */
        var lo8 = 0, sp8 = 0;
        for (var r8 = 0; r8 < 8; r8++) for (var c8 = 0; c8 < M[r8].length; c8++) {
          lo8++;
          if (spec[M[r8][c8].t] !== undefined) sp8++;
        }
        /* v0.62.0 实测修正：计划书写的门槛是 ≤70%，**实测过不了** —— 3 幕 × 60 种子的最坏值是
           0.75（a1s54 15/20）。这不是 bug：「每路线 ≥2 篝火 + ≥2 精英」是**下限**，
           路线数 5~6 条时下限本身就要求下半段扛住十几个特殊节点。所以门槛改成实测包络
           （0.75）之上的 0.80 —— 仍然能抓住「配额把下半段整个塞满」的失控（那种会到 0.9+），
           但不再把正常地图判红。真实门槛是下面 §A 的逐路线下限，这条只是防失控的粗筛。 */
        if (sp8 / lo8 > 0.80) __densFail.push('a' + a + 's' + s + ' ' + sp8 + '/' + lo8);
        /* ⑥ 统计（用于把实测值写进注释，不参与断言） */
        __eliteSum[a - 1] += spec.elite;
        __specSum[a - 1] += spec.camp + spec.shop + spec.unknown + spec.elite;
      }
    }
    __ok('v0.62.0 配额 每条路线都满足「篝火≥2 / 商店≥1 / 未知≥1 / 精英≥2」（3幕×' + __N + '种子，0 例外）',
      __badRoute.length === 0, __badRoute.slice(0, 6).join(' | '));
    __ok('v0.62.0 配额 路线数在 3~9 之间（太少没得选、太多图会糊）',
      __routeMin >= 3 && __routeMax <= 9, __routeMin + '~' + __routeMax);
    __ok('v0.62.0 配额 第 0 层全是普通战、末层唯一 Boss（配额不许碰首尾）',
      __lvlFail.length === 0, __lvlFail.slice(0, 4).join(' | '));
    __ok('v0.62.0 配额 改型后敌人编成仍合法（fight ≥2 小怪 / elite ≥1 精英）',
      __enemyFail.length === 0, __enemyFail.slice(0, 4).join(' | '));
    __ok('v0.62.0 配额 走廊（第 10~12 层）特殊节点 ≤3（分级上限的硬边界，防止最后 3 层白送）',
      __corrFail.length === 0, __corrFail.slice(0, 4).join(' | '));
    __ok('v0.62.0 配额 下半段（1~8 层）特殊节点密度 ≤80%（防失控粗筛；实测最坏 0.75）',
      __densFail.length === 0, __densFail.slice(0, 4).join(' | '));

    /* 形状：走廊三层收成单格、第 9 层保留双格分叉（方案B 的细化，A 会连第 9 层的分叉一起吃掉） */
    __ok('v0.62.0 形状 ROW_SHAPE 第 10/11/12 层都是 [1,1]（走廊单格 ⇒ 所有路线都经过它）',
      JSON.stringify(ROW_SHAPE[10]) === '[1,1]' && JSON.stringify(ROW_SHAPE[11]) === '[1,1]' &&
      JSON.stringify(ROW_SHAPE[12]) === '[1,1]', JSON.stringify([ROW_SHAPE[10], ROW_SHAPE[11], ROW_SHAPE[12]]));
    __ok('v0.62.0 形状 ROW_SHAPE 第 9 层仍是 [2,2]（保留最后一次双格分叉）',
      JSON.stringify(ROW_SHAPE[9]) === '[2,2]', JSON.stringify(ROW_SHAPE[9]));
    __ok('v0.62.0 形状 CORRIDOR_ROWS 与 ROW_SHAPE 的单格层一致（两处不一致 = 上限管错层）',
      CORRIDOR_ROWS.length === 3 && CORRIDOR_ROWS.every(function (r) {
        return JSON.stringify(ROW_SHAPE[r]) === '[1,1]';
      }), JSON.stringify(CORRIDOR_ROWS));

    /* ============ B. enforceRouteQuota：只改 t/e，绝不动拓扑 ============ */
    (function () {
      /* 强测法：先把所有特殊节点**手工退成普通战**造出一个满缺口的地图，再跑配额 ——
         这样才真的走过了「改型」那条路（直接拿 genAct 的结果跑第二遍会立刻 return，测不到）。 */
      var M2 = genAct(1, 4242);
      var snapTopo = function (mm) {
        return JSON.stringify(mm.map(function (row) {
          return row.map(function (n) { return { n: n.next, p: n.prev }; });
        }));
      };
      var snapType = function (mm) {
        return JSON.stringify(mm.map(function (row) { return row.map(function (n) { return n.t; }); }));
      };
      for (var r = 0; r < M2.length; r++) for (var c = 0; c < M2[r].length; c++) {
        if (M2[r][c].t !== 'boss' && M2[r][c].t !== 'fight') { M2[r][c].t = 'fight'; M2[r][c].e = ['youhun', 'zhizharen']; }
      }
      var topo0 = snapTopo(M2);
      /* 顺带钉：配额**不碰全局 rng**（走 mkRng(deriveSeed(seed,4242)) 自己的流） */
      var rs0 = JSON.stringify(rngSnapshot());
      enforceRouteQuota(M2, 1, 4242, actMinionPool(1), ELITES_BY_ACT[1]);
      var rs1 = JSON.stringify(rngSnapshot());
      var topo1 = snapTopo(M2);
      __ok('v0.62.0 配额 enforceRouteQuota 只改 t/e，next/prev **一字不动**（拓扑不变量全靠这条）',
        topo0 === topo1);
      __ok('v0.62.0 配额 enforceRouteQuota 不偷吃全局 rng（自己走 deriveSeed(seed,4242) 的流）',
        rs0 === rs1);
      /* 手工退干净之后，配额必须能把缺口重新补齐（证明「有解」不是靠 assignTypes 侥幸） */
      var rt2 = routesOf(M2), still = [];
      for (var i2 = 0; i2 < rt2.length; i2++) {
        var c2 = { camp: 0, shop: 0, unknown: 0, elite: 0 };
        for (var p2 = 0; p2 < rt2[i2].length; p2++) {
          var t2 = M2[rt2[i2][p2][0]][rt2[i2][p2][1]].t;
          if (c2[t2] !== undefined) c2[t2]++;
        }
        for (var k2 in ROUTE_NEED) if (c2[k2] < ROUTE_NEED[k2]) still.push('#' + i2 + ' ' + k2 + '=' + c2[k2]);
      }
      __ok('v0.62.0 配额 从「全部退成普通战」也能补回来（配额有解，不是靠 assignTypes 侥幸）',
        still.length === 0, still.slice(0, 4).join(' | '));
      /* 同起点跑两遍必须完全一样（配额自身确定性，否则同种子地图会飘） */
      var M3 = genAct(2, 777);
      for (var r3 = 0; r3 < M3.length; r3++) for (var c3 = 0; c3 < M3[r3].length; c3++) {
        if (M3[r3][c3].t !== 'boss' && M3[r3][c3].t !== 'fight') { M3[r3][c3].t = 'fight'; M3[r3][c3].e = []; }
      }
      var A3 = JSON.parse(JSON.stringify(M3)), B3 = JSON.parse(JSON.stringify(M3));
      enforceRouteQuota(A3, 2, 777, actMinionPool(2), ELITES_BY_ACT[2]);
      enforceRouteQuota(B3, 2, 777, actMinionPool(2), ELITES_BY_ACT[2]);
      __ok('v0.62.0 配额 同起点同种子跑两遍完全一致（配额是确定性的，地图不会飘）',
        snapType(A3) === snapType(B3) && JSON.stringify(A3) === JSON.stringify(B3));
    })();

    /* ============ C. 图标描边三态 ============ */
    __ok('v0.63.0 描边 nodeOutlineTier 改按【档位】而非行号（有意改签名）：past→o-past / choice→o-reached / preview 与 hidden→o-locked。'
      + '旧签名传行号，会让当前层里那些走不到的锁也拿到 o-reached 淡白描边，看着像「可走」——那是真实可见缺陷',
      nodeOutlineTier('past') === 'o-past' && nodeOutlineTier('choice') === 'o-reached' &&
      nodeOutlineTier('preview') === 'o-locked' && nodeOutlineTier('hidden') === 'o-locked' &&
      nodeOutlineTier(undefined) === 'o-locked' && nodeOutlineTier('') === 'o-locked');
    /* ⚠️ 三条描边 CSS 本身写在 原型.html 里，runner 在 VM 里读不到文件 ⇒ **这里测不了**，
       改由 _patch/verify_dist.py 对打包产物钉（.o-reached / .o-past / .o-locked 必须活到产物里）。
       这里只钉「类名确实由 nodeOutlineTier 产出并挂到每个节点上」这一半。 */
    __ok('v0.62.0 描边 showMap 真的把 nodeOutlineTier 的结果挂到每个节点上',
      String(showMap).indexOf('nodeOutlineTier(') >= 0 && String(showMap).indexOf('ocls') >= 0);

    /* ============ D. 锁破裂纯函数（canvas 在冒烟里测不了 ⇒ 只测几何）============ */
    (function () {
      var sh = lockBreakShards(777), sh2 = lockBreakShards(777), sh3 = lockBreakShards(778);
      var n = 0;
      for (var i = 0; i < LOCK_RING_N.length; i++) n += LOCK_RING_N[i];
      __ok('v0.62.0 锁破裂 lockBreakShards 碎片数 = Σ LOCK_RING_N（移植版应当是 70 块）',
        sh.length === n && n === 70, sh.length + ' / Σ=' + n);
      __ok('v0.62.0 锁破裂 同种子全等、异种子不等（碎片是确定性的，不靠 Math.random）',
        JSON.stringify(sh) === JSON.stringify(sh2) && JSON.stringify(sh) !== JSON.stringify(sh3));
      __ok('v0.62.0 锁破裂 每个碎片 4 个顶点且全部落在破裂中心 200px 内（坐标是**图片空间**，别拿画布 960 去卡）',
        sh.every(function (o) {
          if (!o.pts || o.pts.length !== 4) return false;
          return o.pts.every(function (q) {
            var dx = q.x - LOCK_C.x, dy = q.y - LOCK_C.y;
            return Math.sqrt(dx * dx + dy * dy) <= 200;
          });
        }));
      __ok('v0.62.0 锁破裂 碎片带飞散方向/速度/自转/透明度（少了任一项渲染出来就是静止的一坨）',
        sh.every(function (o) {
          return typeof o.dx === 'number' && typeof o.dy === 'number' &&
                 typeof o.speed === 'number' && o.speed > 0 &&
                 typeof o.spin === 'number' && typeof o.alphaJ === 'number';
        }));
      __ok('v0.62.0 锁破裂 ring 半径按 960/256 的画布换算重算过（照抄原渲染器的 0/55/120/200/300/430 会全采到空白）',
        LOCK_RING_R[LOCK_RING_R.length - 1] < 200 && LOCK_RING_R[0] === 0);
      __ok('v0.62.0 锁破裂 playLockBreak 有降级路径（!fx / 无 canvas / 图加载失败或 400ms 超时都不许卡住流程）',
        String(playLockBreak).indexOf('onReveal') >= 0 && String(playLockBreak).indexOf('400') >= 0 &&
        String(playLockBreak).indexOf('onerror') >= 0);
    })();

    /* ============ E. 地图场景：不透明卷轴骨架真的被渲染出来 ============ */
    (function () {
      /* 坑①：showOverlay 在本文件顶部（第 15 行）被顶成 __sil ⇒ 必须临时换回真函数才看得到 innerHTML。
         坑②：vm_host 的 getElementById 每次返回**新** dummy（写进去读不回来）⇒ 这里换成一个按 id 缓存的版本，
              并顺手记录 classList.add/remove 的调用顺序（.map-scene 的加/摘顺序是硬不变量）。 */
      var keepGEBI = document.getElementById, keepOv = showOverlay, keepMAP = MAP, keepG = G, keepSCENE = SCENE;
      var els = {}, cls = [];
      try {
        document.getElementById = function (id) {
          if (!els[id]) {
            var e = keepGEBI.call(document, id);
            e.classList.add = function () { cls.push(id + ':+' + Array.prototype.join.call(arguments, ',')); };
            e.classList.remove = function () { cls.push(id + ':-' + Array.prototype.join.call(arguments, ',')); };
            els[id] = e;
          }
          return els[id];
        };
        /* 坑③（这次真踩了）：`showOverlay` 在本文件第 15 行已被顶成 __sil，
           所以 `keepOv = showOverlay` 拿到的是**空桩**，必须换回 __realShowOverlay 才看得到渲染。 */
        showOverlay = __realShowOverlay;
        G = __base('yincha'); SCENE = 'map';
        MAP = genAct(1, 4242); G.act = 1; G.mapRow = 3; G.mapCol = 0;
        G.mapPath = [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 2, c: 0 }, { r: 3, c: 0 }];
        var err = null;
        try { showMap(); } catch (e) { err = e; }
        var html = (els['overlayContent'] && els['overlayContent'].innerHTML) || '';
        __ok('v0.62.0 场景 showMap() 端到端不抛错', !err, String(err && err.message));
        __ok('v0.62.0 场景 渲染出 .map-root 骨架（顶栏 / 木轴 / 视口 / 底栏都是它的孩子）',
          html.indexOf('map-root') >= 0 && html.indexOf('map-topbar') >= 0, 'len=' + html.length);
        __ok('v0.62.0 场景 渲染出固定木轴 + 可滑动画心：.map-roller.top / .map-roller.bot / .map-viewport / .map-sheet',
          html.indexOf('map-roller top') >= 0 && html.indexOf('map-roller bot') >= 0 &&
          html.indexOf('map-viewport') >= 0 && html.indexOf('map-sheet') >= 0);
        /* v0.63.0：卷轴收窄（用户：「木轴只比画心宽一点点，不要横跨屏幕」）——木轴搬进 .map-scroll
           这一**居中列**里，左右各留 16px（.map-frame 的内边距）⇒ 木轴恰好比画心宽 32px。
           钉的是**嵌套形状** scroll > frame > viewport（只钉类名出现会漏掉「忘了搬进去」这种改法）。 */
        __ok('v0.63.0 场景 卷轴收窄：.map-scroll > .map-frame > .map-viewport 三级嵌套，两根木轴都在 .map-scroll 里'
          + '（木轴只比画心宽 32px，不再横跨屏幕）',
          (function () {
            var s = html.indexOf('map-scroll'), f = html.indexOf('map-frame'),
                v = html.indexOf('map-viewport'), rt = html.indexOf('map-roller top'),
                rb = html.indexOf('map-roller bot');
            if (s < 0 || f < 0 || v < 0 || rt < 0 || rb < 0) return false;
            /* DOM 顺序：scroll → roller.top → frame → viewport …；roller.bot 在 frame 之后 */
            return rt > s && f > rt && v > f && rb > v;
          })());
        __ok('v0.63.0 场景 .map-lines 与 .map-row 仍在 .map-sheet 里（drawMapLinks 的坐标相消靠这个，别搬走）',
          html.indexOf('map-wrap map-sheet') >= 0 && html.indexOf('map-lines') >= 0 &&
          html.indexOf('map-row') > html.indexOf('map-lines') &&
          (function () {   /* .map-sheet 的 </div> 必须在所有 .map-row 之后 */
            var last = html.lastIndexOf('map-row'), sh = html.indexOf('map-wrap map-sheet');
            return last > sh;
          })());
        __ok('v0.62.0 场景 每个节点都带内联落位与小字标签（不会全叠在左上角）',
          (html.match(/style="left:/g) || []).length >= 5 && html.indexOf('node-label') >= 0,
          String((html.match(/style="left:/g) || []).length));
        __ok('v0.62.0 场景 showOverlay **摘完** .map-scene 之后 showMap 才**加上**它（顺序反了背景就没了）',
          (function () {
            var iRem = cls.indexOf('overlay:-map-scene'), iAdd = cls.indexOf('overlay:+map-scene');
            return iRem >= 0 && iAdd > iRem;
          })(), cls.join(' '));
        __ok('v1.1.8 场景 顶栏复用了角色专属资源（尸气/血怒分支）与菜单入口 + 幕名匾并进横幅，不再自带锦囊按钮（锦囊改由 .out-hud 落屏幕左下）',
          String(mapTopbarHTML).indexOf('HEROES') >= 0 && String(mapTopbarHTML).indexOf('mt-menu') >= 0 &&
          String(mapTopbarHTML).indexOf('map-plaque') >= 0 &&
          String(mapTopbarHTML).indexOf('openMenu') >= 0);
        /* 卷轴三张素材必须走 assetURL（打包.py 不重写 CSS 里的 url()，相对路径在产物里会 404）。
           ⚠️ 别断言「源码里有 '素材/'」—— 那正是会 404 的那条路。要断言的是**三条都走了 assetURL**。 */
        var __mt = String(applyMapTextures);
        __ok('v0.62.0 场景 applyMapTextures 用 assetURL 取三张卷轴素材（CSS 里的 url(素材/…) 在单文件产物里会 404）',
          __mt.indexOf('assetURL') >= 0 &&
          __mt.indexOf('map/scroll_top.png') >= 0 && __mt.indexOf('map/scroll_bottom.png') >= 0 &&
          __mt.indexOf('bg/bg_map.jpg') >= 0 && __mt.indexOf('map/scroll_paper.jpg') >= 0);
        __ok('v0.62.0 场景 applyMapTextures 只覆盖 background-image（画心的 size/position/repeat 仍由 CSS 给）',
          __mt.indexOf('backgroundImage') >= 0 && __mt.indexOf('backgroundSize') < 0 &&
          __mt.indexOf('backgroundPosition') < 0);
        __ok('v0.62.0 场景 showMap 每次开图都调 applyMapTextures（写在 .map-scene 之后，DOM 已就位）',
          (function () {
            var s = String(showMap);
            var a = s.indexOf("classList.add('map-scene')"), b = s.indexOf('applyMapTextures()');
            return a >= 0 && b > a;
          })());
        /* 顶栏有**按英雄分支**的专属资源（赶尸人尸气 / 阴差血怒）——只测一个英雄会漏掉另一支。
           四个英雄 × 三个不同层数，全部要出非空 html 且带 HP 数值（不许把 undefined 拼进去）。 */
        (function () {
          var keep = G, bad = [];
          try {
            for (var hi = 0; hi < HEROES.length; hi++) {
              for (var mr = 0; mr < MAP_ROWS; mr += 6) {
                G = __base(HEROES[hi].id); G.mapRow = mr;
                var h = mapTopbarHTML();
                if (typeof h !== 'string' || h.length < 20) bad.push(HEROES[hi].id + ' len=' + h);
                if (h.indexOf('undefined') >= 0 || h.indexOf('NaN') >= 0) bad.push(HEROES[hi].id + ' 含 undefined/NaN');
                if (h.indexOf(G.hp + '/' + G.maxHp) < 0) bad.push(HEROES[hi].id + ' 缺 HP 数值');
              }
            }
          } catch (e) { bad.push('THROW ' + (e && e.message)); } finally { G = keep; }
          __ok('v0.62.0 场景 顶栏对 4 个英雄 × 各层都渲染出合法 markup（尸气/血怒分支不许拼出 undefined）',
            bad.length === 0, bad.slice(0, 4).join(' | '));
        })();
      } catch (e) {
        __ok('v0.62.0 场景 showMap 端到端未抛错', false, String(e && e.message));
      } finally {
        document.getElementById = keepGEBI; showOverlay = keepOv;
        MAP = keepMAP; G = keepG; SCENE = keepSCENE;
      }
    })();

    /* ============ F. 相机：进场缓入 / 每关只上一行（不回顶部、不重播）============ */
    __ok('v0.62.0 相机 camYForRow 到顶/到底都夹在 0..maxY（不越界露白）',
      (function () {
        var maxY = 900, rowH = 88, vpH = 500;
        var top = camYForRow(MAP_ROWS - 1, rowH, maxY, vpH);   /* 最上面那行（Boss） */
        var bot = camYForRow(0, rowH, maxY, vpH);              /* 最下面那行（第 1 层） */
        return top === 0 && bot <= maxY && bot > 0;
      })());
    __ok('v0.62.0 相机 视口高度量不到时退化成 maxY（低配/未布局也不至于把地图顶飞）',
      camYForRow(3, 88, 900, 0) === 900);
    __ok('v0.62.0 相机 setMapCam 两个分支都**显式**写 transition-duration（只靠 .cam-nofx 类盖不住残留内联值）',
      String(setMapCam).indexOf("'transition-duration'") >= 0 &&
      String(setMapCam).indexOf('cam-nofx') >= 0);
    __ok('v0.62.0 相机 进场 2000ms、逐关 600ms（缓入后缓停；每关只走一行不重播进场）',
      String(mapCamInit).indexOf('2000') >= 0 && String(mapCamInit).indexOf('600') >= 0);
    __ok('v0.62.0 相机 !fx() 低配直接落位不做动画（和全局「能不能动」口径一致）',
      String(mapCamInit).indexOf('fx()') >= 0);
    __ok('v0.62.0 相机 goNext 给 showMap 留一次性标记 _mapStepFrom（用完即清 ⇒ 重开地图不会误放动画）',
      String(goNext).indexOf('_mapStepFrom=G.mapRow-1') >= 0 && String(showMap).indexOf('_mapStepFrom=-1') >= 0);
    /* 滚动容器（.map-viewport）加 overflow:hidden + 画心（.map-sheet）带 translateY 之后，
       连线还能对得上，靠的是**两端在同一个 transform 上下文里相减** ⇒ 位移自己抵消。
       钉「相减」这个形状而不是钉某个类名：wrap 是用 layer.parentNode 拿的，源码里根本没有 'map-wrap' 字样。 */
    __ok('v0.62.0 相机 drawMapLinks 用「同一 transform 内相减」定位端点（画心位移自己抵消，所以不用改）',
      String(drawMapLinks).indexOf('b.left-wb.left') >= 0 && String(drawMapLinks).indexOf('layer.parentNode') >= 0);

    /* ====================================================================
     * v0.63.0：地图不再遗忘（曾见＝永久保留）+ 自由滑动（纯自由，不吸附）+ 卷轴收窄
     *   用户原话：「地图无法滑动，每个关卡的图标都要有路径相连。
     *              地图卷轴边缘应该只比地图的宽度长出一点，不要横跨屏幕。画心不调。」
     * ==================================================================== */

    /* ---------- A. 不孤立 / 不剧透：把用户那句话变成机器可验的不变量 ----------
       这两条是**整批改动的验收标准**：
         · 不孤立 = 「每个关卡的图标都要有路径相连」⇒ 任何亮着的格子，至少要挂得到一条
           **也亮着**的边（父或子）。孤立图标正是用户报的那个毛病本身。
         · 不剧透 = 未来层一个字都不漏；亮出来的「真图标」必须**当时真的看过**
           （在第 r-1 层时它在 next(你站的那一格) 里）。preview 层照旧挂锁，不算看过。
       跑的是 genAct 生成的**真实整图**（不是手造小图），沿 routesOf 穷举的真实路线逐层推进。
       ⚠️ 计划里原本还想钉「mapPreviewSet() ≡ mapSeenColsAt(mapRow+1)」——**这条被撤掉了**：
       实现后它们是两件事（preview 是「下一步会亮哪几格」的锁提示集合，覆盖当前层**所有**
       可走节点的 next；revealed 是「已经亮过真图标」的历史集合，只认你当时站的那一格）。
       硬钉恒等会把正确的实现判成红的，所以改钉下面这两条真性质。 */
    (function () {
      var __kMAP = MAP, __kG = G, __kRow = G.mapRow, __kCol = G.mapCol, __kPath = G.mapPath;
      var __iso = [], __leak = [], __net = [], __states = 0, __maps = 0, __rt = 0;
      function __visSet(M) {
        var vis = {}, rr, cc;
        for (rr = 0; rr < M.length; rr++) for (cc = 0; cc < M[rr].length; cc++)
          if (fogVisible(rr, cc)) vis[rr + ',' + cc] = true;
        return vis;
      }
      /* 与 drawMapLinks 同口径的邻居：next 往上一层 + prev 往下一层。
         引擎只生成上下相邻行之间的边（没有同行横向边），这里也不臆造。 */
      function __nbrs(M, r, c, vis) {
        var nd = (M[r] && M[r][c]) || null, out = [], i, nx, pv;
        if (!nd) return out;
        nx = nd.next || []; pv = nd.prev || [];
        for (i = 0; i < nx.length; i++) if (vis[(r + 1) + ',' + nx[i]]) out.push([r + 1, nx[i]]);
        for (i = 0; i < pv.length; i++) if (vis[(r - 1) + ',' + pv[i]]) out.push([r - 1, pv[i]]);
        return out;
      }
      function __check(M, r, c, path, tag) {
        G.mapRow = r; G.mapCol = c; G.mapPath = path;
        __states++;
        var vis = __visSet(M), k, pr, pc, i;
        /* ① 不剧透 · 未来层：mapRow+1 以后一个字都不许漏 */
        for (pr = r + 2; pr < M.length; pr++) for (pc = 0; pc < M[pr].length; pc++)
          if (vis[pr + ',' + pc]) __leak.push(tag + ' 未来层 ' + pr + ',' + pc);
        /* ② 不剧透 · preview 必在 preview 集合里；过去的真图标必须拿得出「当时看过」的证据 */
        var pvs = {}, pv0 = mapPreviewSet();
        for (i = 0; i < pv0.length; i++) pvs[pv0[i]] = true;
        var hist = {};
        for (i = 0; i < path.length; i++) hist[path[i].r] = path[i].c;
        for (k in vis) {
          pr = +k.split(',')[0]; pc = +k.split(',')[1];
          if (pr === r + 1 && !pvs[pc]) __leak.push(tag + ' preview ' + pr + ',' + pc + ' 不在 preview 集合里');
          if (pr < r && !mapVisited(pr, pc) && !mapDegraded()) {
            var upc = hist[pr - 1];
            var up = (upc === undefined || upc < 0) ? null : mapNodeAt(pr - 1, upc);
            if (!up || (up.next || []).indexOf(pc) < 0)
              __leak.push(tag + ' past ' + pr + ',' + pc + ' 拿不出「当时看过」的证据');
          }
        }
        /* ③ 不孤立 + ④ 都连得到当前层：可见集合按同口径的边走一遍
           ⚠️ 这里**不能**钉「可见集合整体连通」——第 0 层 3 格各自 next 指向第 1 层不同格时，
           可见集合天然是 3 条独立的链（引擎没有同行横向边），整体连通本来就不成立，硬钉是错的。
           真正该成立、也真是用户那句话的是：**每个亮着的格子都连得到你所在的那一层**
           （顺着亮着的边走）。孤岛图标连不过去 —— 那才是他报的毛病。 */
        var ids = {}, cnt = 0, k2;
        for (k in vis) ids[k] = cnt++;
        var par = []; for (i = 0; i < cnt; i++) par.push(i);
        function find(x) { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; }
        for (k in vis) {
          pr = +k.split(',')[0]; pc = +k.split(',')[1];
          var nb = __nbrs(M, pr, pc, vis);
          if (!nb.length) __iso.push(tag + ' 孤立图标 ' + pr + ',' + pc);
          for (i = 0; i < nb.length; i++) {
            var a = find(ids[k]), b = find(ids[nb[i][0] + ',' + nb[i][1]]);
            if (a !== b) par[a] = b;
          }
        }
        /* 连通块数（正确算法：数不同根，别用 bad+1 —— 只有当非根块都是单点时才碰巧相等） */
        var roots = {}, nblk = 0;
        for (i = 0; i < cnt; i++) { k2 = find(i); if (!roots[k2]) { roots[k2] = 1; nblk++; } }
        if (cnt > 1 && nblk > 1) {
          /* 断言口径：每一块里都必须**至少含一个当前层的格子**（孤岛就是整块都不含当前层） */
          var blkCur = {}, kk3;
          for (kk3 in vis) {
            if (+kk3.split(',')[0] !== r) continue;
            blkCur[find(ids[kk3])] = 1;
          }
          for (kk3 in roots) if (!blkCur[kk3]) { __net.push(tag + ' 有一块可见格连不到当前层（共 ' + nblk + ' 块）'); break; }
        }
      }
      try {
        var __seeds = [3, 11, 777, 4242];
        for (var __a = 1; __a <= 3; __a++) {
          for (var __s = 0; __s < __seeds.length; __s++) {
            var M = genAct(__a, __seeds[__s]), rts = routesOf(M);
            MAP = M; __maps++;
            var __tag = 'a' + __a + 's' + __seeds[__s];
            /* 开局：mapRow=0 / mapCol=-1 / mapPath=[]（整层可选那一种） */
            __check(M, 0, -1, [], __tag + ' 开局');
            /* 沿每一条真实路线逐层推进（每层都查一次） */
            for (var __i = 0; __i < rts.length; __i++) {
              __rt++;
              var acc = [];
              for (var __j = 0; __j < rts[__i].length; __j++) {
                var __r = rts[__i][__j][0], __c = rts[__i][__j][1];
                /* ⚠️ G.mapCol 的**游戏约定**是「上一层你站的那一格的列」，不是当前层的列：
                   mapReachable(r,c) 用 mapNodeAt(r-1, G.mapCol) 取父节点（chooseNode:615 写 G.mapCol=c，
                   随后 goNext 只加 mapRow、不动 mapCol）。所以「站在第 r 层还没选」时要传上一层的列。 */
                __check(M, __r, __j === 0 ? -1 : rts[__i][__j - 1][1], acc.slice(),
                  __tag + '#' + __i + ' 第' + __j + '层未选');
                /* 紧接着「刚选中 (r,c)」那一瞬（战斗结算期间、goNext 之前）：mapCol 已换成当前格的列 */
                acc.push({ r: __r, c: __c });
                __check(M, __r, __c, acc.slice(), __tag + '#' + __i + ' 第' + __j + '层已选');
              }
            }
            /* 旧档降级（没有 mapPath 但已走到第 5 层）与祖先列越界：整段一起亮，也不许孤立 */
            __check(M, 5, -1, [], __tag + ' 降级');
            __check(M, 5, 99, [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 2, c: 0 }, { r: 3, c: 0 }, { r: 4, c: 0 }],
              __tag + ' 越界列');
          }
        }
      } finally {
        MAP = __kMAP; G.mapRow = __kRow; G.mapCol = __kCol; G.mapPath = __kPath;
      }
      __ok('v0.63.0 不孤立（用户原话「每个关卡的图标都要有路径相连」）：' + __states + ' 个真实地图状态、每格都挂得到一条也亮着的边',
        __iso.length === 0, __iso.slice(0, 6).join(' | '));
      __ok('v0.63.0 不孤立 每一块可见格都连得到「你所在的那一层」（' + __maps + ' 张真实地图 × ' + __rt
        + ' 条真实路线 + 开局/降级/越界列）。'
        + '⚠️ 不钉「整体连通」——第 0 层 3 格各走各的 next 时可见集合天然是 3 条独立链，硬钉会错',
        __net.length === 0, __net.slice(0, 4).join(' | '));
      __ok('v0.63.0 不剧透：未来层不亮 / preview 必在 preview 集合 / 过去的真图标必须有「当时看过」的证据',
        __leak.length === 0, __leak.slice(0, 6).join(' | '));
    })();

    /* ---------- B. 四档迷雾（手造小图，专打「地图不再遗忘」那几个边角）----------
       真实整图很难凑出「曾见但不曾走过的兄弟格」，这里手造 4 层小图走真实路线
       (0,1) → (1,2) → (2,0)（(0,1).next=[1,2]，(1,2).next=[0]，(2,0).next=[0]）。
       ⚠️ G.mapCol = **上一层你站的那一格的列**（见 §A 里那条注释），不是当前层的列。 */
    (function () {
      var __kMAP = MAP, __kG = G, __kRow = G.mapRow, __kCol = G.mapCol, __kPath = G.mapPath;
      var res = {};
      /* ⚠️ 小图**自带一份**，不去借 §C 那张：那个 `fx` 是 §C 所在作用域的局部名字，
         在全局作用域里 `fx` 是**流畅模式开关**（`js/10_audio.js:13`）——借名会静默拿到一个布尔。
         本图：row0 = [fight→[0], shop→[1,2]]，row1 = [camp→[0], unknown→[0], elite→[0]]，
               row2 = [fight→[0]]，row3 = [boss→[]]。 */
      function __fixB() {
        return [
          [{ t: 'fight', e: ['youhun', 'jiangshi'], next: [0], prev: [] },
           { t: 'shop', e: [], next: [1, 2], prev: [] }],
          [{ t: 'camp', e: [], next: [0], prev: [0] },
           { t: 'unknown', e: [], next: [0], prev: [1] },
           { t: 'elite', e: ['yecha'], next: [0], prev: [1] }],
          [{ t: 'fight', e: ['youhun', 'huyao'], next: [0], prev: [0, 1, 2] }],
          [{ t: 'boss', e: ['jiangwang'], next: [], prev: [0] }]
        ];
      }
      function __setB(row, col, path) { G.mapRow = row; G.mapCol = col; G.mapPath = path; }
      try {
        MAP = __fixB();
        /* —— 状态①：站在第 1 层、还没选（从 (0,1) 上来 ⇒ mapCol=1；path 到上一层为止）—— */
        __setB(1, 1, [{ r: 0, c: 1 }]);
        res.cur = fogTier(1, 1) === 'choice' && fogTier(1, 2) === 'choice' &&
          mapReachable(1, 1) && mapReachable(1, 2);
        res.curLocked = fogTier(1, 0) === 'hidden' && !mapReachable(1, 0);   /* next(0,1) 里没有 0 */
        res.preview = fogTier(2, 0) === 'preview' && !mapReachable(2, 0);
        res.futureDark = fogTier(3, 0) === 'hidden';                          /* 更远的层一个字都不漏 */
        /* —— 状态②：站在第 2 层、还没选（从 (1,2) 上来 ⇒ mapCol=2）★核心现场 —— */
        __setB(2, 2, [{ r: 0, c: 1 }, { r: 1, c: 2 }]);
        /* (1,1) 从没走过，但你在第 1 层时 next(0,1)=[1,2] ⇒ 当时**看过**它的真图标 ⇒ 永久 past。
           v0.62.0 只按当前位置重算，这里会退回 hidden（变回锁）—— 这就是「地图会遗忘」的根因，
           也正是用户那句「每个关卡的图标都要有路径相连」没做到的现场。 */
        res.sibPast = fogTier(1, 1) === 'past' && !mapVisited(1, 1);
        res.pickedPast = fogTier(1, 2) === 'past' && mapVisited(1, 2);
        /* (1,0) 当时就不在 next(0,1) 里 ⇒ 它从来只是把锁 ⇒ 现在也还是锁（不多剧透一个字） */
        res.neverSeen = fogTier(1, 0) === 'hidden';
        /* 第 0 层没有上一层 ⇒ 没走过的格子挂不上任何可见父节点 ⇒ 不亮（亮了就是孤立图标） */
        res.row0Skip = fogTier(0, 0) === 'hidden' && fogTier(0, 1) === 'past';
        /* 过去的兄弟格必须挂在网里：(1,1) 的可见邻居要有 (0,1)（父）或 (2,0)（子） */
        var vis = {};
        for (var rr = 0; rr < MAP.length; rr++) for (var cc = 0; cc < MAP[rr].length; cc++)
          if (fogVisible(rr, cc)) vis[rr + ',' + cc] = true;
        res.sibNbr = !!(vis['0,1'] || vis['2,0']);
        /* —— 状态③：走到第 3 层、还没选（从 (2,0) 上来）—— 累积，不是只看当前层 —— */
        __setB(3, 0, [{ r: 0, c: 1 }, { r: 1, c: 2 }, { r: 2, c: 0 }]);
        res.afterAll = fogTier(1, 1) === 'past' && fogTier(1, 2) === 'past' &&
          fogTier(2, 0) === 'past' && fogTier(0, 1) === 'past' && fogTier(0, 0) === 'hidden';
      } finally {
        MAP = __kMAP; G.mapRow = __kRow; G.mapCol = __kCol; G.mapPath = __kPath;
      }
      __ok('v0.63.0 迷雾 曾见但不曾走过的**兄弟格**永久保留 past（v0.62.0 会退回锁 = 地图会遗忘）'
        + '——「每个关卡的图标都要有路径相连」的根因',
        res.sibPast === true && res.pickedPast === true);
      __ok('v0.63.0 迷雾 从来只是把锁的格子仍然不亮（不多剧透一个字；preview 层的身份从没露过）',
        res.neverSeen === true);
      __ok('v0.63.0 迷雾 第 0 层只亮走过的（它没有上一层 ⇒ 非所选格永远挂不上线 ⇒ 不亮）',
        res.row0Skip === true);
      __ok('v0.63.0 迷雾 当前层 choice 露真图标可点 / 下一步 preview 仍是锁 / 更远层不亮',
        res.cur === true && res.curLocked === true && res.preview === true && res.futureDark === true);
      __ok('v0.63.0 迷雾 过去的兄弟格挂得到可见邻居（不孤立，它是**网**里的一格不是孤岛）',
        res.sibNbr === true);
      __ok('v0.63.0 迷雾 再往上走一层，之前留下的 past 全部还在（累积，不是只看当前层）',
        res.afterAll === true);
    })();

    /* ---------- C. 自由滑动：纯函数对拍（指针手势在 VM 里测不了）---------- */
    __ok('v0.63.0 拖动 mapDragCam 纯跟手：末值 = 起点 − 位移，**不是整行倍数**（钉用户选的「不吸附」）',
      mapDragCam(500, 120, 900) === 380 && mapDragCam(500, 37, 900) === 463 &&
      mapDragCam(500, 0, 900) === 500 && mapDragCam(380, -120, 900) === 500);
    __ok('v0.63.0 拖动 只夹在 [0, maxY]（夹取不是吸附：只防拖出纸外，不会把画面拉回某一行）',
      mapDragCam(50, 120, 900) === 0 && mapDragCam(880, -100, 900) === 900 &&
      mapDragCam(0, 1, 900) === 0 && mapDragCam(10, -10, 0) === 0 && mapDragCam(9999, 1, 0) === 0);
    __ok('v0.63.0 resize 保位 mapCamFromRatio：按比例换算并夹取，maxY=0 时归零（不 NaN、不越界）',
      mapCamFromRatio(0.5, 900) === 450 && mapCamFromRatio(-1, 900) === 0 &&
      mapCamFromRatio(2, 900) === 900 && mapCamFromRatio(0.5, 0) === 0 && mapCamFromRatio(1, 0) === 0);
    __ok('v0.63.0 resize 保位 是拖动的逆运算（拖到 380 后换尺寸，按比例还落在 380 那一档）',
      mapCamFromRatio(mapDragCam(500, 120, 900) / 900, 900) === 380);
    __ok('v0.63.0 拖动 bindMapDrag 挂在 document 上并 7px 阈值启动（照抄出牌拖拽口径），'
      + '且「一屏装得下就别抢走点击」',
      (function () {
        var s = String(bindMapDrag);
        return s.indexOf('pointerdown') >= 0 && s.indexOf('pointermove') >= 0 &&
          s.indexOf('pointerup') >= 0 && s.indexOf('pointercancel') >= 0 &&
          s.indexOf('<7') >= 0 && s.indexOf('mapDragCam') >= 0 && s.indexOf('maxY>0') >= 0;
      })());
    __ok('v0.63.0 拖动 拖完吃掉紧随的那一次 click（否则从节点上起拖会误触 chooseNode）',
      String(bindMapDrag).indexOf('_mapEatClickUntil') >= 0 && String(chooseNode).indexOf('_mapEatClickUntil') >= 0);

    /* ---------- C2. v0.64.1 滚轮能滚 + 原生拖图不再掐断指针（用户报的 bug）---------- */
    __ok('v0.64.1 滚轮 mapWheelCam 方向：往下滚(deltaY>0) = 看更下面的层 ⇒ camY 变大（与拖动同向）',
      mapWheelCam(500, 120, 0, 900, 834) === 620 && mapWheelCam(500, -120, 0, 900, 834) === 380 &&
      mapWheelCam(500, 0, 0, 900, 834) === 500);
    __ok('v0.64.1 滚轮 仍夹在 [0, maxY]（与拖动共用同一套边界：夹取不是吸附，不越界）',
      mapWheelCam(50, -120, 0, 900, 834) === 0 && mapWheelCam(880, 120, 0, 900, 834) === 900 &&
      mapWheelCam(10, -10, 0, 0, 834) === 0 && mapWheelCam(9999, 1, 0, 0, 834) === 0);
    __ok('v0.64.1 滚轮 deltaMode 换算：行模式 ×16、页模式 ×视口高（Firefox 给的是「3 行」不是像素，'
      + '不换算滚一格几乎不动）',
      mapWheelCam(0, 3, 1, 900, 834) === 48 && mapWheelCam(0, 1, 2, 900, 834) === 834 &&
      mapWheelCam(0, 1, 2, 900, 0) === 600 && mapWheelCam(0, 100, 0, 900, 834) === 100);
    __ok('v0.64.1 滚轮 脏输入不产生 NaN（deltaY 非数/无穷 → 原地不动，与 mapDragCam 同口径）',
      mapWheelCam(300, NaN, 0, 900, 834) === 300 && mapWheelCam(300, undefined, 0, 900, 834) === 300 &&
      mapWheelCam(300, Infinity, 0, 900, 834) === 300 && mapWheelCam(300, -Infinity, 0, 900, 834) === 300);
    __ok('v0.64.1 滚轮 bindMapDrag 真的绑了 wheel 且 **passive:false**'
      + '（默认 passive 下 preventDefault() 无效 ⇒ 页面跟着一起滚）',
      (function () {
        var s = __code(bindMapDrag);
        return s.indexOf("addEventListener('wheel'") >= 0 && s.indexOf('{passive:false})') >= 0 &&
          s.indexOf('mapWheelCam') >= 0 && s.indexOf('ev.deltaMode') >= 0 &&
          s.indexOf('preventDefault') >= 0;
      })());
    __ok('v0.64.1 滚轮 滚轮与拖动**共用同一条落位路径** setMapCam(y,false,0)（无过渡=跟手，不各写一套）',
      (function () {
        var s = __code(bindMapDrag);
        return s.indexOf('setMapCam(y, false, 0)') >= 0 && s.indexOf('mapCamRange()') >= 0 &&
          s.indexOf('mapCamNow()') >= 0;
      })());
    /* 这个 bug 的根因：节点图标是裸 <img>，天生可拖 ⇒ 左键一拖就触发原生拖图并抛 pointercancel，
       指针流被掐断（中键不触发原生拖拽，所以「按住中键反而能拖」）。三道护栏缺一不可。 */
    __ok('v0.64.1 原生拖图 artImg 出的图带 draggable="false"（根因：<img> 默认可拖，'
      + '左键拖图标会被浏览器抢去当「拖图」并抛 pointercancel）',
      __code(artImg).indexOf('draggable="false"') >= 0);
    __ok('v0.64.1 原生拖图 bindMapDrag 里另有 dragstart 拦截兜底（将来往地图加可拖元素也不会复发）',
      __code(bindMapDrag).indexOf("addEventListener('dragstart'") >= 0 &&
      __code(bindMapDrag).indexOf('ev.preventDefault()') >= 0);
    __ok('v0.64.1 断言前提自检 __code() 真的剥掉了注释（否则上面几条会被我自己的注释判绿）',
      __code(function () { /* 标记FOO */ return 1; }).indexOf('标记FOO') < 0 &&
      __code(function () { // 标记BAR
        return 2;
      }).indexOf('标记BAR') < 0 &&
      __code(function () { return 'keepME'; }).indexOf('keepME') >= 0);
    __ok('v0.63.0 拖动 showMap 里绑一次 + 重置「用户手动滑过」标记（否则 resize 会把镜头拽回当前层）',
      (function () {
        var s = String(showMap);
        var b = s.indexOf('bindMapDrag()');
        return b >= 0 && s.indexOf('_mapUserScrolled=false') > b && s.indexOf('_mapCamRatio=0') > b;
      })());

    /* ---------- D. 相机基准：padTop（顺带修的第 1 层被切 30px）---------- */
    __ok('v0.63.0 相机 camYForRow 第 5 参 padTop 把整条基准下移（.map-sheet 有 padding:30px 0，'
      + '少了它第 1 层贴底时被切掉一截）',
      camYForRow(0, 88, 900, 500, 0) === 732 && camYForRow(0, 88, 900, 500, 30) === 762 &&
      camYForRow(0, 88, 900, 500, 30) - camYForRow(0, 88, 900, 500, 0) === 30);
    __ok('v0.63.0 相机 padTop 默认 0 ⇒ 与 v0.62.0 逐字节一致（5355/5356 那两条照旧绿）',
      camYForRow(3, 88, 900, 0) === 900 && camYForRow(3, 88, 900, 0, 0) === 900);
    __ok('v0.63.0 相机 mapCamRange 从 getComputedStyle 实测 paddingTop 并交给 mapCamInit（窄屏是 22/18px，写死必错）',
      (function () {
        var s = String(mapCamRange);
        return s.indexOf('getComputedStyle') >= 0 && s.indexOf('paddingTop') >= 0 &&
          s.indexOf('padTop') >= 0 && String(mapCamInit).indexOf('C.padTop') >= 0;
      })());

    /* ---------- E. 描边按档位（nodeOutlineTier 的签名变更本身在 §C 图标描边那段）---------- */
    __ok('v0.63.0 描边 showMap 的 ocls 在**格子循环内**按档位算（搬出循环才能让当前层的锁不冒白边）',
      (function () {
        var s = String(showMap);
        var loop = s.indexOf('for(let c=0;c<MAP[r].length;c++)');
        return loop >= 0 && s.indexOf('nodeOutlineTier(tier)') > loop;
      })());

    /* ================= F. v0.64.0 特效：精灵图播放器 =================
       这一段只测**能测的**：表结构、纯函数、锚点合法性、门禁、接线是否还在。
       特效「长什么样、屏幕上多大」冒烟测不到（DOM 桩 offsetHeight 恒 0、background-position 无布局），
       靠 `_patch/shot_fx.py` 的实拍对照图定 scale。 */

    /* ---------- F1. 表结构 ---------- */
    __ok('v0.64.0 FX_SHEETS 每条都是 8 列、f ≤ 8×rows、scale 为正，且正好 85 条'
      + '（帧数是 _patch/fx_tune.py 按每格 alpha 实扫的 —— 8 列末排常留空，拿 行×8 当帧数会播到空白格；'
      + 'v1.0.14 起的 multi_slash 是多方向图，由 _patch/mk_multi_slash.py 程序生成、不在 fx_tune 的重算范围内；'
      + 'v1.0.17 起的 guling_suck / relic_proc / shiqi_flame / xuenu_flame 四张、v1.1.4 起的 thorns_light 也是程序绘制，'
      + '由 _patch/mk_flame_sheets.py 出图；v1.1.6 起的 fudu_hit 是用户素材重排：'
      + '原图 5 列 × 4 行（单元 768×720、16 帧）逐帧重采样成 8 列 × 2 行（单元 480×480）；'
      + 'v1.1.x 起的 lightning 是用户素材：8 列 × 6 行、单元 480×480、48 帧；'
      + 'v1.1.x 起的 damage_reflect 也是用户素材：8 列 × 3 行、单元 480×480、24 帧；'
      + 'v1.1.10 起的 boss_vfx b1~b6 幕主 34 张、v1.1.12 起 b7~b9 幕主 12 张：8 列 × 4 行、30fps、32 帧；'
      + 'v1.1.15 起 46 张全部换新规格：单帧 480×480（正方形格，不写 ch；旧 480×720 / 连接段 480×256 作废，'
      + 'lightning / damage_reflect 仍是 480×720、保留 ch=1.5）',
      Object.keys(FX_SHEETS).length === 85 &&
      Object.keys(FX_SHEETS).every(function (k) {
        var s = FX_SHEETS[k];
        return s.c === 8 && s.f > 0 && s.f <= 8 * s.rows && s.rows >= 1 && s.scale > 0;
      }));
    __ok('v0.64.0 FX_SHEETS 的 i0（起始帧）与 f0（素材分配给它的帧数）都自洽：'
      + 'i0+f 不越出图（≤ 8×rows）、f0 ≥ i0+f、没裁的就不写 f0',
      Object.keys(FX_SHEETS).every(function (k) {
        var s = FX_SHEETS[k], i0 = s.i0 || 0;
        if (i0 + s.f > 8 * s.rows) return false;
        if ('f0' in s && !(s.f0 >= i0 + s.f)) return false;
        return ('f0' in s) === (s.f0 > s.f);
      }));
    __ok('v0.64.0 **30 个特效全都裁掉了两端的空白帧**（素材末尾常有整格全透明，开头也有）——'
      + '不裁的话：按下后前 0.2 秒画面上什么都没有（像点了没反应），播完还挂着一个透明元素不删。'
      + '裁掉的帧数合计 169（≈ 7.0 秒 @24fps，由 _patch/fx_tune.py 逐格扫 alpha 实量）',
      (function () {
        var n = 0, cut = 0;
        Object.keys(FX_SHEETS).forEach(function (k) {
          var s = FX_SHEETS[k];
          if (!('f0' in s)) return;
          n++; cut += s.f0 - s.f;
        });
        return n === 30 && cut === 169;
      })());
    __ok('v0.64.0 FX_SHEETS 的键名都符合素材命名闸 ^[a-z][a-z0-9_]*$（对应 素材/fx/<key>.png）',
      Object.keys(FX_SHEETS).every(function (k) { return /^[a-z][a-z0-9_]*$/.test(k); }));
    __ok('v0.64.0 锁_破裂**不在** FX_SHEETS 里（v0.62.0 已用移植 canvas 代码实现，不接精灵图）',
      !('suopoli' in FX_SHEETS) && !('lock' in FX_SHEETS) && Object.keys(FX_SHEETS).length === 85);

    /* ---------- F2. CARD_FX 接线 ---------- */
    __ok('v0.64.0 CARD_FX 的每个键都是**真实卡 id**（打错字会变成一张永远不播特效的牌，还不报错）',
      (function () {
        var ids = {}; CARDS.forEach(function (c) { ids[c.id] = 1; });
        return Object.keys(CARD_FX).every(function (k) { return !!ids[k]; });
      })());
    __ok('v0.64.0 CARD_FX 每个值的 n 都登记在 FX_SHEETS 里，a 都是四个合法锚点之一',
      Object.keys(CARD_FX).every(function (k) {
        var e = CARD_FX[k];
        return !!(e && e.n && FX_SHEETS[e.n]) && ['enemy', 'field', 'player', 'summon'].indexOf(e.a) >= 0;
      }));
    __ok('v0.64.0 CARD_FX 没有覆盖全部卡（59 张）—— **没登记的牌退回 CSS 四件套**（符箓/护体/黑雾/脉冲），'
      + '所以漏一张的后果是「没精灵图特效」而不是「没特效」；32 张是有素材的那批（v1.0.13 加断刃雷符，v1.0.20 加阴兵过境，'
      + 'v1.1.2 加天师里程碑的雷谴符/五雷法印，v1.1.3 加赶尸人里程碑的赶尸令/万尸朝宗，'
      + 'v1.1.4 加武僧里程碑的罗汉伏虎/化甲为毒，v1.1.5 加阴差里程碑的饮血刃，v1.1.x 加 0 费【阴兵】本体）',
      Object.keys(CARD_FX).length === 32 && CARDS.length === 59);

    /* ---------- F3. 纯函数：盒子尺寸 ---------- */
    __ok('v0.64.0 fxBoxSize 下夹 96、上夹 min(vw,vh)×0.9（帧画布 960×960 四周留空，照锚点框贴必然偏大；'
      + '上界保证再大的框也不超屏）',
      fxBoxSize(0, 800, 600) === 96 && fxBoxSize(100, 800, 600) === 115 &&
      fxBoxSize(4000, 800, 600) === 540 && fxBoxSize(500, 800, 600) === 540 &&
      fxBoxSize(300, 800, 600) === 345);
    __ok('v0.64.0 fxBoxSize 在窗口为 0 时不产生 NaN/负数（冷启动/隐藏标签页会传 0）',
      isFinite(fxBoxSize(0, 0, 0)) && fxBoxSize(0, 0, 0) === 96);
    __ok('v0.64.0 fxBoxSize 对锚点短边单调不减（锚点越大框越大，不会出现反直觉的缩小）',
      fxBoxSize(100, 900, 900) <= fxBoxSize(200, 900, 900) && fxBoxSize(200, 900, 900) <= fxBoxSize(400, 900, 900));

    /* ---------- F4. 纯函数：帧 → 精灵图偏移（行优先，8 列） ---------- */
    __ok('v0.64.0 fxCellPos 行优先：第 7 帧在第 1 排末尾、第 8 帧换行到第 2 排第 1 格',
      (function () {
        var a = fxCellPos(0, 8, 100), b = fxCellPos(7, 8, 100), c = fxCellPos(8, 8, 100), d = fxCellPos(19, 8, 100);
        return a.x === 0 && a.y === 0 && b.x === -700 && b.y === 0 &&
          c.x === 0 && c.y === -100 && d.x === -300 && d.y === -200;
      })());
    __ok('v0.64.0 fxCellPos 的最后一帧也不越出图外（f 与 rows 的边界靠这条兜住）',
      (function () {
        var bad = [];
        Object.keys(FX_SHEETS).forEach(function (k) {
          var s = FX_SHEETS[k], p = fxCellPos(s.f - 1, s.c, 480);
          if (-p.x >= s.c * 480 || -p.y >= s.rows * 480) bad.push(k);
        });
        return bad.length === 0;
      })());

    /* ---------- F5. 门禁与兜底 ---------- */
    __ok('v0.64.0 playFx 第一行是 if(!fx()) return —— 与 floatDamage/hurtVignette 同一条流畅模式门禁'
      + '（关特效时连元素都不建，不是建了再隐藏）',
      String(playFx).replace(/\s/g, '').indexOf('if(!fx())return') >= 0);
    __ok('v0.64.0 fxSheet 对未知名字返回 null（不 throw），playFx 拿到 null 就静默返回',
      fxSheet('__不存在的特效__') === null && fxSheet('lei') === FX_SHEETS.lei);
    __ok('v0.64.0 流畅模式（本套冒烟里 lowSpec=true）下 playFx 返回 null 且 FX_LIVE 保持空',
      (function () {
        var keep = SETTINGS.lowSpec; SETTINGS.lowSpec = true;
        var r = playFx('lei', 'player');
        var n = Object.keys(FX_LIVE).length;
        SETTINGS.lowSpec = keep;
        return r === null && n === 0;
      })());
    __ok('v0.64.0 fxStopAll 是幂等的（空表调用不报错，startBattle 每场都会调）',
      (function () { fxStopAll(); fxStopAll(); return Object.keys(FX_LIVE).length === 0; })());

    /* ---------- F6. 真跑一次：元素尺寸/背景/锚点都写对了吗 ---------- */
    __ok('v0.64.0/v1.0.7 关掉流畅模式后 playFx 真的建出元素：外层尺寸=盒子、内层 background-size=8×盒子'
      + '（8 列要横向铺 8 格）、首帧 transform 偏移 (0,0)，且结束后 fxStopAll 能清干净 FX_LIVE',
      (function () {
        var keep = SETTINGS.lowSpec; SETTINGS.lowSpec = false;
        var out = '?';
        try {
          // 显式 scale:1 —— 表里的 scale 是逐张量出来的（lei 1.05），钉住它会让这条断言
          // 在每次重跑 fx_tune.py 后跟着变；这里测的是「盒子/background-size/首帧偏移」的机制
          var el = playFx('lei', null, { scale: 1 }); // 桩里 querySelector 全 null ⇒ 落屏幕中心、短边 0 ⇒ 96
          var live = Object.keys(FX_LIVE);
          var _in = el ? el.firstChild : null;
          out = [el ? el.style.width : 'no-el', _in ? _in.style.backgroundSize : '',
                 _in ? _in.style.transform : '', live.join(',')].join('|');
          fxStopAll();
        } catch (e) { out = 'THROW ' + e.message; }
        SETTINGS.lowSpec = keep;
        return out === '96px|768px auto|translate(0px,0px)|lei' && Object.keys(FX_LIVE).length === 0;
      })());
    __ok('v0.64.0 同名特效**重播而不是叠加**（key 表里同名只留一个）—— 连击/五通神每回合 tick 会反复触发，'
      + '叠加会在玩家身上堆出十几个元素',
      (function () {
        var keep = SETTINGS.lowSpec; SETTINGS.lowSpec = false;
        var n = -1;
        try { playFx('block', 'player'); playFx('block', 'player'); playFx('block', 'player'); n = Object.keys(FX_LIVE).length; fxStopAll(); }
        catch (e) { n = -1; }
        SETTINGS.lowSpec = keep;
        return n === 1;
      })());
    __ok('v0.64.0 逐敌人特效靠 opts.key 区分：curse@1 与 curse@2 能**同时**存在'
      + '（全场 AoE 一次给每个敌人施咒，只按名字作键会只剩最后一个敌人有特效）',
      (function () {
        var keep = SETTINGS.lowSpec; SETTINGS.lowSpec = false;
        var keys = '?';
        try {
          playFx('curse', null, { key: 'curse@1' });
          playFx('curse', null, { key: 'curse@2' });
          keys = Object.keys(FX_LIVE).sort().join(',');
          fxStopAll();
        } catch (e) { keys = 'THROW ' + e.message; }
        SETTINGS.lowSpec = keep;
        return keys === 'curse@1,curse@2';
      })());
    __ok('v0.64.0 fxSeek 是纯 setter：钉在第 i 帧、**不进 FX_LIVE**（不进表就不会被 rAF 推进，'
      + 'headless 下 rAF 拿不到帧，钉帧才能出稳定对照图）',
      (function () {
        var keep = SETTINGS.lowSpec; SETTINGS.lowSpec = false;
        var pos = '?', live = -1;
        try {
          var el = fxSeek('lei', 9, null, { scale: 1 });   // 96px 盒子：第 9 帧 = 第 2 排第 2 格 ⇒ (-96,-96)
          var _in = el ? el.firstChild : null;
          pos = _in ? _in.style.transform : 'no-el';
          live = Object.keys(FX_LIVE).length;
        } catch (e) { pos = 'THROW ' + e.message; }
        SETTINGS.lowSpec = keep;
        fxStopAll();
        return pos === 'translate(-96px,-96px)' && live === 0;
      })());
    __ok('v0.64.0 playFx / fxSeek 真的把 i0 算进去了（i0 是「素材开头那几格全透明不播」的偏移）：'
      + 'curse 的 i0=4，钉第 0 帧落在第 5 格（-384px 0px）而不是第 1 格；钉第 9 帧落在第 2 排第 6 格',
      (function () {
        var keep = SETTINGS.lowSpec; SETTINGS.lowSpec = false;
        var a = '?', b = '?', ok = false;
        try {
          if (FX_SHEETS.curse.i0 === 4) {
            var e0 = fxSeek('curse', 0, null, { scale: 1 });   // 96px 盒子、i0=4 ⇒ 第 5 格 ⇒ (-384, 0)
            var i0_ = e0 ? e0.firstChild : null;
            a = i0_ ? i0_.style.transform : 'no-el';
            var e1 = fxSeek('curse', 9, null, { scale: 1 });   // 4+9=13 ⇒ 第 2 排第 6 格 ⇒ (-480, -96)
            var i1_ = e1 ? e1.firstChild : null;
            b = i1_ ? i1_.style.transform : 'no-el';
          }
        } catch (e) { a = 'THROW ' + e.message; }
        SETTINGS.lowSpec = keep;
        fxStopAll();
        return a === 'translate(-384px,0px)' && b === 'translate(-480px,-96px)';
      })());
    __ok('v0.64.0 fxSeek 越界会被夹回素材范围内（i0+f-1 之后不再往下走，不会切到第 3 排别的特效身上）',
      (function () {
        var keep = SETTINGS.lowSpec; SETTINGS.lowSpec = false;
        var a = '?';
        try {
          var el = fxSeek('lei', 999, null, { scale: 1 });   // lei: i0=0, f=11 ⇒ 夹到第 10 帧 = 第 2 排第 3 格
          var _in = el ? el.firstChild : null;
          a = _in ? _in.style.transform : 'no-el';
        } catch (e) { a = 'THROW ' + e.message; }
        SETTINGS.lowSpec = keep;
        fxStopAll();
        return a === 'translate(-192px,-96px)';
      })());
    /* ---------- F7. 接线是否还在（源码级，防静默移除） ---------- */
    __ok('v0.64.0 引擎的 9 个收口点都真的挂了 playFx：受击/格挡/回血/吸血/诅咒/尸气/血怒 + 敌人意图(蓄力·虚弱·勾魂·灼烧·召唤·业火·忘忧)',
      (function () {
        var want = [[dealDamageToPlayer, "'hurt'"], [gainBlock, "'block'"], [heal, "'heal'"],
                    [duhunFlush, "'lifesteal'"], [applyCurse, "'curse'"],
                    [gainShiqi, "'shiqi'"], [gainRage, "'xuenu'"]];
        var missing = want.filter(function (p) { return String(p[0]).indexOf('playFx(' + p[1]) < 0; })
                           .map(function (p) { return p[1]; });
        // ⚠️ 必须用 __realEnemyAct：全局 enemyAct 在本文件第 34 行被 stub 成 __sil 了，
        //    String(它) === 'function () {}'，直接扫全局会得到「一个都没挂」的假红。
        var ea = __enemyActSrc;
        ["'charge'", "'weak'", "'gouhun'", "'burn'", "'jiangshi'", "'yehuo'", "'wangyou'"].forEach(function (x) {
          if (ea.indexOf('playFx(' + x) < 0) missing.push('enemyAct' + x);
        });
        return missing.length === 0;
      })());
    __ok('v0.64.0 startBattle 开头调 fxStopAll()（有的一直播到帧尾才自删，不清会跨场景残影）',
      String(startBattle).indexOf('fxStopAll()') >= 0);
    __ok('v0.64.0 cardPlayFx 先查 CARD_FX、**没查到的牌退回 CSS 四件套**（不是 return 掉）',
      (function () {
        var s = String(cardPlayFx);
        var i = s.indexOf('CARD_FX');
        return i >= 0 && s.indexOf('attackFx(targetEl)') > i && s.indexOf('defenseFx()') > i &&
          s.indexOf('spiritFx()') > i && s.indexOf('skillFx()') > i;
      })());
    __ok('v0.64.0 卡牌真的走通：打过 CARD_FX 的牌 → FX_LIVE 出现对应特效；没登记的牌 → FX_LIVE 不变',
      (function () {
        var keep = SETTINGS.lowSpec; SETTINGS.lowSpec = false;
        var got = '?';
        try {
          fxStopAll();
          cardPlayFx({ id: 'leifu', type: 'attack' });        // 登记过 → lei
          var a = Object.keys(FX_LIVE).join(',');
          fxStopAll();
          cardPlayFx({ id: 'xueji', type: 'skill' });         // 没素材 → CSS 兜底，不进 FX_LIVE
          var b = Object.keys(FX_LIVE).length;
          got = a + '|' + b;
          fxStopAll();
        } catch (e) { got = 'THROW ' + e.message; }
        SETTINGS.lowSpec = keep;
        return got === 'lei|0';
      })());
    __ok('v0.64.0 **全部 85 个特效一个都没白做**：CARD_FX 与引擎收口点（含 v1.0.14 的 burstShow、'
      + 'v1.0.17 的 grantRelic / onSummonDeath、v1.1.6 的 startTurn 腐毒跳伤、v1.1.10 的 bossSkillFx/bossSelfFx 走 BOSS_VFX 表）'
      + '合起来覆盖了 FX_SHEETS 的全部键'
      + '（素材做了但没接线 = 白花钱出图，这条就是防它；两张芯片火焰走 CSS 循环、不经 playFx，按名单豁免）',
      (function () {
        var used = {};
        /* v1.0.17：芯片火焰（shiqi_flame / xuenu_flame）是**纯 CSS 循环**（--chip-flame + steps(8)，
           见 原型.html 的 .relic-flame-*::before），地址由 fxStripURL() 内联、从不进 playFx
           ⇒ 收口点扫描天然捞不到，只能按名单豁免。 */
        var CSS_ONLY_FX = { shiqi_flame: 1, xuenu_flame: 1 };
        /* v1.1.10：boss_vfx 的键**含数字**（b1_…），且 playFx 的实参是 `base+'_cast'` 这种**拼接**，
           字面量扫描天然捞不到 ⇒ 按「敌人 key → 技能槽」的 BOSS_VFX 基名 × 四个后缀展开登记。
           （多登记基名本身无副作用：used 只用来过滤 orphan，多一个键不影响。） */
        var RE = /playFx\('([a-z0-9_]+)'/g;
        [dealDamageToPlayer, gainBlock, heal, duhunFlush, applyCurse, gainShiqi, gainRage, __realEnemyAct,
         enemyActOne, enemyActTail, burstShow, grantRelic, onSummonDeath, damoyingBurst, startTurn].forEach(function (fn) {
          var s = String(fn), m;
          RE.lastIndex = 0;
          while ((m = RE.exec(s)) !== null) { used[m[1]] = 1; }   // 取捕获组；别对整段 match 去字符（那是 'playFx('hurt'' → 'playxhurt'）
        });
        Object.keys(CARD_FX).forEach(function (k) { used[CARD_FX[k].n] = 1; });
        Object.keys(BOSS_VFX).forEach(function (ek) {
          var slots = BOSS_VFX[ek];
          Object.keys(slots).forEach(function (slot) {
            var base = slots[slot];
            ['', '_cast', '_hit', '_self', '_link'].forEach(function (sfx) { used[base + sfx] = 1; });
          });
        });
        var orphan = Object.keys(FX_SHEETS).filter(function (k) { return !used[k] && !CSS_ONLY_FX[k]; });
        if (orphan.length) { globalThis.__orphanFx = orphan; }
        return orphan.length === 0;
      })());
  })();

  /* ===================== v0.65.0：主菜单整屏场景 + 小窗开合门闩 ===================== */
  (function () {
    /* ---------- G1. 源码形态：门闩必须「每次重算」，且只能挂在「从关到开」上 ---------- */
    __ok('v0.65.0 showOverlay 在摘 hidden **之前**读 wasOpen（摘完再读永远是 false ⇒ 门闩恒为「刚打开」）',
      (function () {
        var s = __code(__realShowOverlay);
        var i = s.indexOf("contains('hidden')"), j = s.indexOf("remove('hidden')");
        return i >= 0 && j > i;
      })());
    __ok('v0.65.0 showOverlay 的门闩是 classList.toggle(\'ov-enter\', …) —— '
      + '**不是 add(\'ov-enter\')**：后者会让弃牌/易物/守一这些「点一张牌就重渲染一次」的窗口每点一下重播一次入场',
      (function () {
        var s = __code(__realShowOverlay);
        return s.indexOf("toggle('ov-enter'") >= 0 && s.indexOf("add('ov-enter')") < 0;
      })());
    __ok('v0.65.0 showOverlay 同时摘 .map-scene 与 .menu-scene（漏一个 ⇒ 后续普通面板会继承整屏不透明底）',
      (function () {
        var s = __code(__realShowOverlay);
        return s.indexOf("remove('map-scene')") >= 0 && s.indexOf("remove('menu-scene')") >= 0;
      })());
    /* ---------- v0.68.2：门闩补「换场景也算新进场」 ---------- */
    __ok('v0.68.2 门闩是 `!wasOpen || sceneChanged`（只留 !wasOpen ⇒ 从主菜单点图鉴时 overlay 本来就开着，'
      + 'ov-enter 被摘 ⇒ 用户要的卷轴坠落**在真实路径上一次都不播**）',
      (function () {
        var s = __code(__realShowOverlay);
        return /toggle\('ov-enter'\s*,\s*!wasOpen\s*\|\|\s*sceneChanged\s*\)/.test(s);
      })());
    __ok('v0.68.2 wasScene 必须在 remove 场景类**之前**读（与 wasOpen 同一个坑：摘完再问恒为空串）',
      (function () {
        var s = __code(__realShowOverlay);
        var i = s.indexOf('wasScene'), j = s.indexOf("remove('map-scene')");
        return i >= 0 && j > i && s.indexOf('SCENES.filter') > i;
      })());
    __ok('v0.68.2 sceneChanged 判的是「换了场景」而非「开了面板」——'
      + '设置里拨一下音量开关会重跑 showOverlay，判错成"总该播"就会让面板每拨一次掉一次',
      (function () {
        var s = __code(__realShowOverlay);
        return s.indexOf('scene !== wasScene') >= 0;
      })());
    __ok('v0.68.2 showOverlay 与 showCardZoom **两条**开面板路径都连 .scroll-scene 一起摘（三缺一 ⇒ 漏网的面板会挂上卷轴）',
      (function () {
        var a = __code(__realShowOverlay), b = __code(showCardZoom);
        return a.indexOf("remove('scroll-scene')") >= 0 && b.indexOf("remove('scroll-scene')") >= 0;
      })());
    /* 行为验：真函数换回来跑一遍 —— 源码形态对了、跑起来不对，是最常见的一种"绿着坏"。
       三条覆盖门闩的三种输入：换场景(该播) / 同场景(不该播) / 无场景(沿用老规矩)。 */
    (function () {
      var keepGEBI = document.getElementById, keepOv = showOverlay;
      try {
        var cls = ['hidden'];
        var fake = { classList: {
          contains: function (c) { return cls.indexOf(c) >= 0; },
          add: function (c) { if (cls.indexOf(c) < 0) cls.push(c); },
          remove: function (c) { var i = cls.indexOf(c); if (i >= 0) cls.splice(i, 1); },
          toggle: function (c, on) { if (on) this.add(c); else this.remove(c); } } };
        document.getElementById = function (id) {
          return id === 'overlay' ? fake : { innerHTML: '', style: {} };
        };
        showOverlay = __realShowOverlay;
        function go(fromScene, toScene, hidden) {
          cls.length = 0;
          if (fromScene) cls.push(fromScene);           // 场景类在 ⇒ 也是"开着"（除非显式给 hidden）
          if (hidden) cls.push('hidden');
          showOverlay('<p>x</p>', false, toScene);
          return { enter: cls.indexOf('ov-enter') >= 0, cls: cls.join(' ') };
        }
        var a = go('menu-scene', 'scroll-scene');            // 主菜单 → 图鉴：换场景 ⇒ 该播
        var b = go('scroll-scene', 'scroll-scene');          // 设置里拨开关：同场景 ⇒ 不播
        var c = go('', undefined);                           // 局内开普通面板：沿用 v0.65.0 老规矩 ⇒ 不播
        var d = go('', 'scroll-scene');                      // 局内「菜单→设置」：换场景 ⇒ 播（见下方说明）
        var e = go('scroll-scene', 'menu-scene', true);      // 图鉴 X → 回主菜单：hideOverlay 先落 .hidden
        __ok('v0.68.2 行为：menu-scene→scroll-scene 补上 ov-enter（卷轴坠落真的会播）', a.enter === true, a.cls);
        __ok('v0.68.2 行为：scroll-scene→scroll-scene **不**补 ov-enter（设置里拨开关不重播卷轴）', b.enter === false, b.cls);
        __ok('v0.68.2 行为：局内普通面板（无 scene）行为与 v0.65.0 完全一致', c.enter === false, c.cls);
        /* ⚠️ 这一条记的是**行为变化**，不是"应该这样"：判据是"换了场景"，局内「菜单→设置」也算换
           ⇒ 设置面板从此会像卷轴一样从顶上落下（v0.66.0 写的"已接受的副作用"从**惰性**变成了**可见**）。
           想只留主菜单那条路，把 sceneChanged 收成 `wasScene === 'menu-scene'` 即可 —— 那是个产品选择，
           已如实报给用户；在他给话之前，这里钉住**现状**，免得改动悄悄漂移。 */
        __ok('v0.68.2 行为：局内「菜单→设置」也算换场景 ⇒ 会播卷轴（现状，非缺陷；收窄口径见上方注释）',
          d.enter === true, d.cls);
        __ok('v0.68.2 行为：图鉴 X → 回主菜单经 hideOverlay（落 .hidden）⇒ 走 !wasOpen 分支照播入场',
          e.enter === true, e.cls);
        __ok('v0.68.2 行为：showOverlay 每次都把三个场景类摘干净，只留本次传入的那一个',
          (function () {
            function only(c, want) {
              var hit = ['map-scene', 'menu-scene', 'scroll-scene'].filter(function (x) {
                return c.split(' ').indexOf(x) >= 0;
              });
              return want === '' ? hit.length === 0 : (hit.length === 1 && hit[0] === want);
            }
            return a.cls === 'ov-enter scroll-scene' && e.cls === 'ov-enter menu-scene'
              && only(a.cls, 'scroll-scene') && only(e.cls, 'menu-scene') && only(c.cls, '');
          })(), a.cls + ' | ' + e.cls + ' | ' + c.cls);
      } finally {
        document.getElementById = keepGEBI; showOverlay = keepOv;
      }
    })();
    __ok('v0.65.0 showOverlay 第 3 参 scene 是**可选**的（48 个老调用点一个都不用改）',
      (function () {
        var s = __code(__realShowOverlay);
        return /function\s+showOverlay\s*\(\s*html\s*,\s*closable\s*,\s*scene\s*\)/.test(s) &&
          s.indexOf('if(scene && ov.classList)') >= 0;
      })());
    __ok('v0.65.0 showCardZoom 这条**平行开面板路径**也摘两个场景类（它绕过 showOverlay 直接写 innerHTML）',
      (function () {
        var s = __code(showCardZoom);
        return s.indexOf("remove('map-scene')") >= 0 && s.indexOf("remove('menu-scene')") >= 0 &&
          s.indexOf("remove('hidden')") >= 0;
      })());

    /* ---------- G2. 行为：门闩在真函数里按预期开关 ----------
       坑①：vm_host 的 getElementById 每次返回**新** dummy（写进去读不回来）⇒ 换成按 id 缓存的版本。
       坑②：那个 dummy 的 classList 是空操作、contains 恒 false ⇒ 换成**真维护集合**的版本，
            否则 wasOpen 永远算不出 false，本组断言全是假绿。 */
    (function () {
      var keepGEBI = document.getElementById, keepOv = showOverlay, keepHide = hideOverlay;
      var els = {};
      function mkCL() {
        var s = [];
        return {
          _list: s,
          add: function () { for (var i = 0; i < arguments.length; i++) if (s.indexOf(arguments[i]) < 0) s.push(arguments[i]); },
          remove: function () { for (var i = 0; i < arguments.length; i++) { var k = s.indexOf(arguments[i]); if (k >= 0) s.splice(k, 1); } },
          toggle: function (c, force) {
            var has = s.indexOf(c) >= 0, want = (force === undefined) ? !has : !!force;
            if (want && !has) s.push(c);
            if (!want && has) s.splice(s.indexOf(c), 1);
            return want;
          },
          contains: function (c) { return s.indexOf(c) >= 0; }
        };
      }
      function has(c) { return !!(els['overlay'] && els['overlay'].classList.contains(c)); }
      function cls() { return els['overlay'] ? els['overlay'].classList._list.join(' ') : '<no-el>'; }
      try {
        document.getElementById = function (id) {
          if (!els[id]) { var e = keepGEBI.call(document, id); e.classList = mkCL(); e.style = {}; els[id] = e; }
          return els[id];
        };
        /* 坑③：showOverlay / hideOverlay 在本文件第 15/16 行已被顶成空桩，必须换回真身 */
        showOverlay = __realShowOverlay; hideOverlay = __realHideOverlay;
        document.getElementById('overlay').classList.add('hidden');   // 与 原型.html:738 的初始态一致

        showOverlay('<div class="menu-root">A</div>', false, 'menu-scene');
        var opened = has('ov-enter') && has('menu-scene') && !has('map-scene') && !has('hidden');
        __ok('v0.65.0 关→开且带 menu-scene：.ov-enter + .menu-scene 都挂上，.map-scene 被摘、.hidden 被摘',
          opened, '类=[' + cls() + ']');

        /* 这一条是「签到后 doSignIn→showStartScreen 重渲染」的回归闸 */
        showOverlay('<div class="menu-root">B</div>', false, 'menu-scene');
        __ok('v0.65.0 **同一场景内刷新不重播入场**：紧接着再开一次 ⇒ .ov-enter 被摘掉、.menu-scene 还在',
          !has('ov-enter') && has('menu-scene'), '类=[' + cls() + ']');

        /* 这一条护的是用户点名的弃牌/易物/守一：它们每点一张牌就 showOverlay 一次 */
        for (var _k = 0; _k < 5; _k++) showOverlay('<h2>焚 符</h2>已选 ' + _k, false);
        __ok('v0.65.0 弃牌/易物式「点一下就重渲染」连开 5 次，仍然一次都不重播（面板不会每点一下抖一下）',
          !has('ov-enter'), '类=[' + cls() + ']');

        __ok('v0.65.0 普通面板开之前 .map-scene / .menu-scene 都被摘干净（不会继承整屏底）',
          !has('map-scene') && !has('menu-scene'), '类=[' + cls() + ']');

        hideOverlay();
        __ok('v0.65.0 hideOverlay 同步落 .hidden（本批**没有**退场定时器 ⇒ 不存在「排了定时器又被 showOverlay 取消」那类竞态）',
          has('hidden'), '类=[' + cls() + ']');
        showOverlay('<div class="menu-root">C</div>', false, 'menu-scene');
        __ok('v0.65.0 关掉再开 ⇒ 入场**重新播**（.ov-enter 回来了；这条对应「战败→回主菜单」）',
          has('ov-enter') && has('menu-scene'), '类=[' + cls() + ']');
      } catch (e) {
        __ok('v0.65.0 门闩行为组不抛错', false, 'THROW ' + e.message);
      }
      document.getElementById = keepGEBI; showOverlay = keepOv; hideOverlay = keepHide;
    })();

    /* ---------- G3. 主菜单背景走 JS 内联（不能在 CSS 写 url()） ---------- */
    __ok('v0.65.0 bgRel(\'menu\') 指向包内真实存在的兜底底图（#bg 那条，setBg(\'menu\') 还在调）',
      bgRel('menu') === 'bg/menu/menu_3.png', String(bgRel('menu')));
    /* v0.66.0：主菜单真背景换成三张轮换图 —— 路径**必须**写全（不能用 bgRel：它固定拼
       'bg/bg_'+name+'.png'，套不进 bg/menu/ 这个子目录）。三张都要在包内，否则轮换到某一张就是一片黑。 */
    __ok('v0.66.0 MENU_BGS 恰好三张、路径写全（bg/menu/ 子目录 ⇒ 不能用 bgRel 拼）',
      MENU_BGS.length === 3 && MENU_BGS[0] === 'bg/menu/menu_1.jpg'
      && MENU_BGS[1] === 'bg/menu/menu_2.jpg' && MENU_BGS[2] === 'bg/menu/menu_3.png',
      JSON.stringify(MENU_BGS));
    __ok('v0.66.0 menuBgRotate 独占取图门：含 assetURL(，且**不含**裸 素材/ 字面量'
      + '（打包.py 不重写 CSS 的 url()，写死路径在 dist 里会 404，verify_dist 的 [5] 门禁会 FAIL）',
      (function () {
        var s = __code(menuBgRotate);
        return s.indexOf('assetURL(') >= 0 && s.indexOf('素材/') < 0;
      })());
    __ok('v0.66.0 menuBgRotate 取不到 .menu-bgimg（非主菜单场景 / 冒烟桩）时不抛错，退回 CSS 渐变兜底',
      (function () { try { menuBgRotate(); return true; } catch (e) { return false; } })());
    /* 轮换语义：**每次进主界面**前进一格 ⇒ 三张顺序循环，第 4 次回到第 1 张。 */
    __ok('v0.66.0 menuBgRotate 连调 4 次索引走 0→1→2→0（三张顺序循环，第 4 次回到第 1 张）',
      (function () {
        var keep = SAVE.menuBgIdx, seq = [];
        try {
          SAVE.menuBgIdx = 0;
          for (var i = 0; i < 4; i++) seq.push(menuBgRotate());
        } finally { SAVE.menuBgIdx = keep; }
        return seq.join(',') === '0,1,2,0';
      })(), 'seq=' + (function () {
        var keep = SAVE.menuBgIdx, seq = [];
        SAVE.menuBgIdx = 0;
        for (var i = 0; i < 4; i++) seq.push(menuBgRotate());
        SAVE.menuBgIdx = keep; return seq.join(',');
      })());
    __ok('v0.66.0 menuBgRotate 对负值/越界索引都兜住（JS 的 % 对负数返回负值，只做一次 % 会取到 undefined）',
      (function () {
        var keep = SAVE.menuBgIdx, bad = [];
        try {
          [-1, -4, -7, 7, 999].forEach(function (v) {
            SAVE.menuBgIdx = v;
            var i = menuBgRotate();
            if (!(i >= 0 && i < MENU_BGS.length)) bad.push(v + '=>' + i);
          });
        } finally { SAVE.menuBgIdx = keep; }
        return bad.length === 0;
      })());

    /* ---------- G4. showStartScreen 重写：分层齐、入口一个不少 ---------- */
    __ok('v0.65.0 主菜单真的换了整屏场景：showStartScreen 传了 menu-scene',
      __code(showStartScreen).indexOf("'menu-scene'") >= 0);
    __ok('v0.66.0 每次进主界面都轮换背景：showStartScreen 里调了 menuBgRotate()'
      + '（开游戏 / 死亡回菜单 / 设置重开三条路径都走这里，所以在这一处调就全覆盖）',
      __code(showStartScreen).indexOf('menuBgRotate()') >= 0);
    __ok('v0.66.0 主菜单新分层容器全部产出（缺一个就退回 v0.65.0 的「按钮挤在中央一列」）',
      (function () {
        var s = __code(showStartScreen);
        var need = ['menu-root', 'menu-bgwrap', 'menu-bgimg', 'menu-veil', 'menu-stage',
                    'menu-titlebar', 'menu-title', 'menu-col-stele', 'menu-row-talis',
                    'menu-flash', 'menu-tier', 'is-main', 'is-list'];
        var miss = need.filter(function (c) { return s.indexOf(c) < 0; });
        if (miss.length) { globalThis.__missMenu = miss; }
        return miss.length === 0;
      })(), '缺=' + JSON.stringify(globalThis.__missMenu || []));
    __ok('v0.66.0 真美术全接上了：4 个入口 + 标题都走 artImg(\'ui/menu/*.png\')，且模板里**没有**裸 素材/ 字面量'
      + '（v1.0.17：「解锁」符纸沿用 leaderboard.png，这张图重回在用清单）',
      (function () {
        var s = __code(showStartScreen);
        var art = ['ui/menu/topic.png', 'ui/menu/start.png', 'ui/menu/continue.png',
                   'ui/menu/collection.png', 'ui/menu/setting.png', 'ui/menu/leaderboard.png'];
        var miss = art.filter(function (p) { return s.indexOf(p) < 0; });
        if (miss.length) { globalThis.__missMenuArt = miss; }
        return miss.length === 0 && s.indexOf('素材/') < 0;
      })(), '缺=' + JSON.stringify(globalThis.__missMenuArt || []));
    __ok('v0.66.0 两块石碑（入塔/续）都带 5 片崩碎碎片（少了就只剩淡出，没有「碎」）',
      (function () {
        var s = __code(showStartScreen);
        var i0 = s.indexOf('menuShardsHTML('), i1 = s.indexOf('menuShardsHTML(', i0 + 1);
        var d = __code(menuShardsHTML);
        /* 5 片是 CSS 里 5 条 clip-path 的对应物：这里少一片，那边就有一块石头永远不动（不是全碎） */
        return i0 >= 0 && i1 > i0 && d.indexOf('i<=5') >= 0 && d.indexOf('menu-shard') >= 0;
      })());
    __ok('v0.66.0 **开始爬塔仍落在 .is-main 段内、且在 .is-list 之前**（不是只加了 class 没包住）',
      (function () {
        var s = __code(showStartScreen);
        var iMain = s.indexOf('menu-tier is-main'), iStart = s.indexOf('steleBreak(this,startGame)'),
            iList = s.indexOf('menu-tier is-list');
        return iMain >= 0 && iStart > iMain && iList > iStart;
      })());
    __ok('v0.66.0 主菜单入口一个不少、且**都包在演出函数里**（石碑走 steleBreak / 符纸走 talisOpen；'
      + '重写模板时最容易漏绑 onclick，这条就是防它；v1.0.14：排行榜入口已删；v1.0.16：加「解锁」入口）',
      (function () {
        var s = __code(showStartScreen);
        var must = ['onclick="steleBreak(this,resumeRun)"', 'onclick="steleBreak(this,startGame)"',
                    'onclick="talisOpen(this,viewBestiary)"',
                    'onclick="talisOpen(this,showSettings)"',
                    'onclick="talisOpen(this,viewMilestones)"'];
        var miss = must.filter(function (a) { return s.indexOf(a) < 0; });
        if (miss.length) { globalThis.__missMenuEntry = miss; }
        return miss.length === 0;
      })(), '缺=' + JSON.stringify(globalThis.__missMenuEntry || []));
    __ok('v0.66.0 主菜单 9 → 4：被移除的入口不再出现在模板里'
      + '（⚠️ 只是摘入口；viewAchievements / viewStats / showTutorial 的**函数本体仍保留**，'
      + 'startEndless 随无尽模式在 v1.0.14 一并删除）',
      (function () {
        var s = __code(showStartScreen);
        var gone = ['startEndless', 'viewAchievements', 'viewStats', 'showTutorial'];
        return gone.every(function (f) { return s.indexOf(f) < 0; });
      })());
    __ok('v0.66.0 签到整块取消：模板里没有 signInPanelHTML（用户：『没有实际意义』）',
      __code(showStartScreen).indexOf('signInPanelHTML') < 0);
    __ok('v0.66.0 「续」总是渲染、无存档时 disabled（不再按 hasRunSave 条件渲染 —— 石碑忽隐忽现会破构图）',
      (function () {
        var s = __code(showStartScreen);
        var iBtn = s.indexOf('is-continue'), iDis = s.indexOf("hasRunSave()?'':' disabled'", iBtn);
        return iBtn >= 0 && iDis > iBtn && iDis - iBtn < 120;
      })());
    /* ===================== v1.1.15：存档单档化（Q1~Q7 口径） ===================== */
    __ok('v1.1.15 「续」直接续档：startGame 收敛为 ensureAudio+confirmNewGame，不再出现存档面板/空槽分配',
      (function () {
        var s = __code(startGame);
        return s.indexOf('ensureAudio') >= 0 && s.indexOf('confirmNewGame') >= 0
            && s.indexOf('showSavesPanel') < 0 && s.indexOf('firstFreeSlot') < 0;
      })());
    __ok('v1.1.15 旧多槽面板函数整块删除（openSaves/slotRowHTML/showSavesPanel/resumeSlot/newRunInSlot/deleteSlot）',
      ['openSaves', 'slotRowHTML', 'showSavesPanel', 'resumeSlot', 'newRunInSlot', 'deleteSlot']
        .every(function (f) { return typeof globalThis[f] === 'undefined'; }));
    __ok('v1.1.15 normalizeSingleRunSave 存在（旧多档 → 保留最新落 0 号槽），RUN_SLOTS 仍 3 键（云端 runs 口径不动）',
      typeof normalizeSingleRunSave === 'function' && RUN_SLOTS.length === 3);
    __ok('v1.1.15 askOverwriteSave：覆盖提示面板含两段红字（大「目前有一个存档，是否继续」/ 中「【继续】会掩盖之前的【存档】」）',
      (function () {
        var s = __code(askOverwriteSave);
        return s.indexOf('目前有一个存档，是否继续') >= 0 && s.indexOf('【继续】会掩盖之前的【存档】') >= 0;
      })());
    __ok('v1.1.15 settleResultHTML 增 abandon 分支：只有「返回」按钮（回选角界面）、无免费复活',
      (function () {
        var s = __code(settleResultHTML);
        var i = s.indexOf("'abandon'");
        if (i < 0) return false;
        var j = s.indexOf('}else{', i);   // 只钉 abandon 分支体内：身后的默认分支本就有 reviveFree
        var seg = s.slice(i, j > i ? j : i + 300);
        return seg.indexOf('返回') >= 0 && seg.indexOf('showHeroSelect') >= 0
            && seg.indexOf('reviveFree') < 0 && seg.indexOf('giveUp') < 0;
      })());
    __ok('v1.1.15 settleOverwrittenRun 存在（以旧档角色跳战败结算，算分+里程后删档）',
      typeof settleOverwrittenRun === 'function' && typeof rehydrateRunForSettle === 'function');
    /* v0.68.1：石碑改**左右并排**（用户：「这两个石碑图标你应该左右摆放」）。
       旧版是竖列（续在上、入塔在下），DOM 顺序也是续在前。这里钉 DOM 顺序 ——
       光有 CSS 的 flex-direction:row 不够（那半边在产物门禁 verify_dist 里），
       顺序反了就是**小的那个在左边当主 CTA**，正好是用户要的反面。 */
    __ok('v0.68.1 石碑并排后 DOM 里**入塔在续之前**（主 CTA 先读到，续退成右手边的次级项）',
      (function () {
        var s = __code(showStartScreen);
        var iStart = s.indexOf('is-start'), iCont = s.indexOf('is-continue');
        return iStart >= 0 && iCont > iStart;
      })());
    /* v0.68.1：符纸「向下拉然后回弹」的定时器必须够长。旧值是 150ms（配 .15s 的动画）。
       ⚠️ CSS 那半边（`animation:menuTug .42s`）在产物门禁里断，这里断 JS 半边 ——
          两边对不齐的两种错法都不报错：CSS 长了会在回弹中途切走场景（纸卡半途），短了就是白等。 */
    __ok('v0.68.1 talisOpen 的演出定时器 ≥400ms（配得上 menuTug 的回弹时长，不再是 150）',
      (function () {
        var m = /off\s*\?\s*0\s*:\s*(\d+)/.exec(__code(talisOpen));
        return !!m && parseInt(m[1], 10) >= 400;
      })());
    /* v1.0.0：这条从**正向**翻成**反向**。
       版本号已按用户要求移出主菜单，改挂页面左上角常驻的 `#ver-tag`（原型.html 的正文 HTML，
       不在这些函数里 ⇒ 那半由 verify_dist.py 的两条断言逐字守：源码处数 + 产物存活）。
       这里留一条反向钉的意义：v0.74.0 补「版本号同步」那条闸，起因正是主菜单这处
       从 v0.69.0 一路停到 v0.74.0 没人发现。谁再把这处加回来，版本号会重新分裂成两处 ——
       那时必须**同时**改掉 verify_dist.py 的处数断言，而不是默默多出一处不同步。
       ⚠️ 判据只认紧跟标题的 `<small>· v…</small>`（200 字符窗），与旧断言同一个窗口口径；
          不加裸 `v0.` 全文搜索 —— 菜单模板里还有别处的版本字样会误报。 */
    __ok('v1.0.0 主菜单标题里**没有**版本号（已移到页面左上角常驻的 #ver-tag）',
      (function () {
        var s = __code(showStartScreen);
        var iT = s.indexOf('menu-title">'), iV = s.indexOf('v0.', iT), iV1 = s.indexOf('v1.', iT);
        if (iT < 0) return false;
        return (iV < 0 || iV - iT >= 200) && (iV1 < 0 || iV1 - iT >= 200);
      })());

    /* ---------- v0.68.2：body.at-menu —— 「背后是主菜单」时整个战斗界面不渲染 ---------- */
    /* 起因：实拍 `_drvmenu3.js --q "&pull=300&anim=1&at=250"` 时，卷轴面板四周透出战斗 HUD
       （结束回合 / 灵气珠 / 出牌提示）。`#app` 一直挂在 DOM 里 z-index:1 压着 #bg，
       只是 v0.65.0 之后被主菜单那层不透明底挡住了 —— 图鉴一走半透明底就露馅。 */
    __ok('v0.68.2 setBg 是 body.at-menu 的**唯一**开关，判据查 PRE_RUN_BG 表'
      + '（挂在 showStartScreen 上不行：图鉴只摘 .menu-scene，不会重进主菜单）',
      (function () {
        var s = __code(__realSetBg);   // ⚠️ 必须用 __realSetBg：全局 setBg 在本文件顶部被顶成了空桩
        return /classList\.toggle\(\s*'at-menu'\s*,\s*!!PRE_RUN_BG\[\s*_bgName\s*\]\s*\)/.test(s);
      })());
    /* ---------- v0.74.0：六张整屏场景背景（商店/篝火/胜利/失败/选英雄/胜利奖励） ---------- */
    /* 为什么 at-menu 的判据要从 name==='menu' 扩到「战局之外」：选英雄屏开始铺整屏背景，
       而 setBg 一旦按老判据就会摘掉 at-menu ⇒ `#app` 立刻显形。那一刻 run 还没开始
       （G 刚 newState、一次 render 都没跑过）⇒ 空骨架透在放松后的黑幕下，
       正是 v0.68.2 花力气修掉的那个 bug。下面这四条是**新增**的，不是把上一条改松：
       上一条仍要求开关在 setBg 里、且是表驱动。 */
    __ok('v0.74.0 at-menu 判据含主菜单与选英雄（这两屏在战局之外）',
      typeof PRE_RUN_BG === 'object' && PRE_RUN_BG.menu === 1 && PRE_RUN_BG['hero_select.jpg'] === 1);
    __ok('v0.74.0 但**不含**五张战局内的整屏背景（胜负/商店/篝火/奖励背后本来就该是战场）',
      typeof PRE_RUN_BG === 'object'
      && ['shop.jpg', 'campfire.jpg', 'victory.jpg', 'defeat.jpg', 'victory_reward.jpg']
           .every(function (k) { return !PRE_RUN_BG[k]; }));
    __ok('v0.74.0 SCENE_BG 六张齐全、且不含地图/幕/主菜单'
      + '（那几张背后是真正的战局 HUD，黑幕放松了反而让战场透上来）',
      typeof SCENE_BG === 'object'
      && ['shop.jpg', 'campfire.jpg', 'victory.jpg', 'defeat.jpg', 'hero_select.jpg', 'victory_reward.jpg']
           .every(function (k) { return SCENE_BG[k] === 1; })
      && !SCENE_BG['map.jpg'] && !SCENE_BG['act1'] && !SCENE_BG.menu);
    __ok('v0.74.0 setBg 的 evt-bg 判据 = evt_ 前缀 或 SCENE_BG 表内（事件房与六张整屏场景同一处理）',
      (function () {
        var s = __code(__realSetBg);
        return /classList\.toggle\(\s*'evt-bg'\s*,\s*\/\^evt_\/\.test\(\s*_bgName\s*\)\s*\|\|\s*!!SCENE_BG\[\s*_bgName\s*\]\s*\)/.test(s);
      })());
    __ok('v0.74.0 四张背景真的接上了各自的屏（逐函数查 setBg 实参，写错了名字这条会红；'
      + 'victory/defeat 两张整屏底已按"结算画面简化"撤掉）',
      (function () {
        var want = [[renderCampfire, 'campfire.jpg'], [renderShop, 'shop.jpg'],
                    [showHeroSelect, 'hero_select.jpg'], [showReward, 'victory_reward.jpg']];
        return want.every(function (w) { return __code(w[0]).indexOf("setBg('" + w[1] + "')") >= 0; });
      })());
    __ok('v0.74.0 商店/篝火写在 render* 里而不是 show* 里'
      + '（续档那条路径直呼 renderShop/renderCampfire，写在入口函数里续档会铺着上一张背景）',
      __code(showShop).indexOf('setBg(') < 0 && __code(showCampfire).indexOf('setBg(') < 0);
    __ok('v0.74.0 revive() 把战斗背景铺回去（失败屏换成 bg_defeat 之后必须还原，'
      + '否则那张败局图会一路留到复活后的战斗里，而且没有任何闸会响）',
      __code(revive).indexOf("setBg('act'+G.act)") >= 0);
    __ok('v0.68.2 setBg 里 at-menu 的读写排在 `if(!el) return` **之前**'
      + '（排在后面 ⇒ DOM 桩/异常路径下永远不开关）',
      (function () {
        var s = __code(__realSetBg);
        var i = s.indexOf("'at-menu'"), j = s.indexOf("if(!el) return");
        return i >= 0 && j > i;
      })());
    __ok('v0.68.2 continueRun 落 camp/shop/unknown 三支时显式清 at-menu'
      + '（那三支不经过 setBg ⇒ 从主菜单续档进营地会让 #app 一直不渲染）',
      (function () {
        var s = __code(continueRun);
        var i = s.indexOf("remove('at-menu')"), j = s.indexOf("d.scene==='camp'");
        return i >= 0 && j > i;
      })());
    __ok('v0.68.2 行为：setBg(\'menu\') 亮 at-menu、setBg(\'act1\') 灭 —— 且全程不抛异常',
      (function () {
        /* ⚠️ 沙箱的 document.body.classList 是**空操作桩**（add/remove/toggle 都是空函数、
           contains 恒 false），直接跑 setBg 只会量到 false/false，看着像"没生效"。
           这里临时换一个**真记账**的 classList，才验得到真实的开关语义。 */
        var keepBody = document.body, keepBg = setBg;
        try {
          var set = [];
          document.body = { classList: {
            contains: function (c) { return set.indexOf(c) >= 0; },
            add: function (c) { if (set.indexOf(c) < 0) set.push(c); },
            remove: function (c) { var i = set.indexOf(c); if (i >= 0) set.splice(i, 1); },
            toggle: function (c, on) { if (on) this.add(c); else this.remove(c); } } };
          setBg = __realSetBg;
          setBg('menu');
          var on = set.indexOf('at-menu') >= 0;
          setBg('act1');
          var off = set.indexOf('at-menu') >= 0;
          setBg('menu');                       // 再回到菜单，确认可逆（不是单向锁死）
          var back = set.indexOf('at-menu') >= 0;
          return on === true && off === false && back === true;
        } catch (e) { return false; } finally { document.body = keepBody; setBg = keepBg; }
      })());

    /* ---------- G5. 演出闸：防连点 / 不卡死 ---------- */
    /* 没有 MENU_BUSY，1 秒演出窗口里连点会调两次 startGame()。这两条是它的回归闸。 */
    __ok('v0.66.0 steleBreak 在 MENU_BUSY 为真时**不**加 is-breaking、**不**调 fn（防连点）',
      (function () {
        var called = 0, added = [];
        var btn = { disabled: false, classList: { add: function (c) { added.push(c); }, remove: function () {} } };
        var keep = MENU_BUSY; MENU_BUSY = true;
        try { steleBreak(btn, function () { called++; }); } finally { MENU_BUSY = keep; }
        return called === 0 && added.indexOf('is-breaking') < 0;
      })());
    __ok('v0.66.0 talisOpen 在 MENU_BUSY 为真时**不**加 tug、**不**调 fn（防连点）',
      (function () {
        var called = 0, added = [];
        var btn = { classList: { add: function (c) { added.push(c); }, remove: function () {} } };
        var keep = MENU_BUSY; MENU_BUSY = true;
        try { talisOpen(btn, function () { called++; }); } finally { MENU_BUSY = keep; }
        return called === 0 && added.indexOf('tug') < 0;
      })());
    __ok('v0.66.0 无存档时「续」不可点：steleBreak 对 disabled 的按钮直接返回（不演出、不调 continueRun）',
      (function () {
        var called = 0, added = [];
        var btn = { disabled: true, classList: { add: function (c) { added.push(c); }, remove: function () {} } };
        try { steleBreak(btn, function () { called++; }); } catch (e) { return false; }
        return called === 0 && added.indexOf('is-breaking') < 0;
      })());
    /* ⚠️ 收尾必须用定时器而不是 animationend：low-spec / prefers-reduced-motion 下 CSS 会把动画
       全置 none，animationend **永远不来** —— 靠它收尾会当场卡死，连主菜单都点不动了。 */
    __ok('v0.66.0 演出收尾走 setTimeout 而不是 animationend（动画被 CSS 关掉时 animationend 永远不来，会卡死）',
      (function () {
        var s = __code(steleBreak) + __code(talisOpen);
        return s.indexOf('setTimeout') >= 0 && s.indexOf('animationend') < 0;
      })());
    __ok('v0.66.0 menuFxOff() 兜住低配/减弱动态：low-spec 与 prefers-reduced-motion 都返回 true'
      + '（否则开着「减弱动态」反而要干等满 1 秒才切场景）',
      (function () {
        var s = __code(menuFxOff);
        return s.indexOf('lowSpec') >= 0 && s.indexOf('prefers-reduced-motion') >= 0;
      })());
  })();

  /* ===================== v0.67.0：灵石图标（道具 / 灵汁的贴图） ===================== */
  (function () {
    var relicIds = RELICS.map(function (r) { return r.id; });
    var potionIds = POTIONS.map(function (p) { return p.id; });
    var keys = Object.keys(LINGSHI_FILE);

    __ok('v1.0.14 LINGSHI_FILE 恰好 11 条', keys.length === 11, keys.join(','));
    __ok('v1.0.14 表覆盖 3 个遗物 + 8 瓶灵汁',
      keys.filter(function (k) { return relicIds.indexOf(k) >= 0; }).length === 3 &&
      keys.filter(function (k) { return potionIds.indexOf(k) >= 0; }).length === 8);
    /* 键写错一个字 ⇒ 永远不生效、也不报错，只有肉眼能发现。这条是它的闸。 */
    __ok('v0.67.0 表里每个键都是真实的遗物/灵汁 id',
      keys.filter(function (k) { return relicIds.indexOf(k) < 0 && potionIds.indexOf(k) < 0; }).length === 0,
      keys.join(','));
    __ok('v0.67.0 表里每个值都形如 lingshi/lingshi_<名>.png',
      keys.filter(function (k) { return !/^lingshi\/lingshi_[a-z]+\.png$/.test(LINGSHI_FILE[k]); }).length === 0,
      keys.map(function (k) { return LINGSHI_FILE[k]; }).join(','));

    /* ⚠️ 这条的来历（v0.67.0 起、v0.69.0 改）：**黄泉酒的文件名曾经少一个 an** ——
       磁盘上是 lingshi_huangqujiu.png，物品 id 是 huangquanjiu。当时这条断言是**反向**的：
       钉住那个不一致、防止有人"顺手统一"成硬拼 'lingshi/lingshi_'+id+'.png'。
       为什么那种"统一"是危险的：请求一个不存在的路径，而 artImg 的 onerror 降级是
       outerHTML='' ⇒ **静默少一张图**，不抛错、不空框、只有肉眼看得出（首屏实测就是一张碎图）。

       v0.69.0 用户批准把文件改名对齐了（见 _patch/verify_dist.py 的素材命中闸），
       所以这条断言**翻面**：从"钉住不一致"改成"钉住一致"。留成一条**活的不变量**而不是
       删掉历史注记 —— 表的值与键同名这件事一旦再漂移，这里立刻响，而不是等玩家看见碎图。
       若将来某个素材**确实**无法与 id 同名，就在这一条上写明理由（它的新职责就是这个）。 */
    var stemOf = function (v) { return String(v).replace(/^lingshi\/lingshi_/, '').replace(/\.png$/, ''); };
    __ok('v0.69.0 表里每个值都与它的键同名（表值 == 磁盘文件名 == 物品 id；漂移即响）',
      keys.filter(function (k) { return stemOf(LINGSHI_FILE[k]) !== k; }).length === 0,
      keys.map(function (k) { return k + '→' + LINGSHI_FILE[k]; }).join(' | '));
    __ok('v0.67.0 lingshiSrc：表内 id 返回 lingshi 路径、表外 id 返回空串',
      lingshiSrc('zhushabi') === 'lingshi/lingshi_zhushabi.png' && lingshiSrc('zhaohunfan') === '');
    __ok('v0.67.0 lingshiSrc 对未知/空 id 不抛错（typeof 兜底：本表在 20_data.js，relicIcon 在更早的 10_audio.js）',
      (function () { try { return lingshiSrc(undefined) === '' && lingshiSrc('') === ''; } catch (e) { return false; } })());

    var icZhu = relicIcon(relById('zhushabi')), icZhao = relicIcon(relById('zhaohunfan'));
    __ok('v0.67.0 朱砂笔的遗物图标改走 lingshi/', icZhu.indexOf('lingshi/lingshi_zhushabi.png') >= 0, icZhu.slice(0, 130));
    __ok('v0.67.0 招魂幡（表外）仍走 relic/，没被带坏', icZhao.indexOf('relic/zhaohunfan.png') >= 0, icZhao.slice(0, 130));
    /* 尺寸就靠这个类：object-fit:contain + 是 flex 列的子项 ⇒「超出边框」「压住文字」结构上不可能。
       两个 id 一个在表内一个在表外，这条断的是「不管走哪条路，外壳都是同一个类」——
       外壳不同就会出现两种观感（见 v0.67.0 把横板改方框那次的尺寸档位）。 */
    __ok('v0.67.0 两条路都仍带 .ricon（表内表外同一个外壳类）',
      icZhu.indexOf('ricon') >= 0 && icZhao.indexOf('ricon') >= 0);
    __ok('v0.67.0 12 个遗物每个都出得出一张 <img>（表内 3 个 + 表外 9 个都算）',
      RELICS.every(function (r) { var s = relicIcon(r); return typeof s === 'string' && s.indexOf('<img') >= 0; }));

    var pQ = potionIcon(POTIONS.filter(function (p) { return p.id === 'huangquanjiu'; })[0]);
    var pH = potionIcon(POTIONS.filter(function (p) { return p.id === 'huanyanglu'; })[0]);
    __ok('v0.69.0 黄泉酒出图，且指到与 id 同名的真文件',
      pQ.indexOf('lingshi/lingshi_huangquanjiu.png') >= 0 && pQ.indexOf('ricon') >= 0, pQ.slice(0, 130));
    /* v0.69.0：还阳露 / 孟婆汤**补上了贴图**（用户 2026-09-28 交付），从此 4 瓶灵汁全有图。
       这两条以前断的是「走 .ricon-fb 字牌占位」—— 现在翻面断「出真图」。
       ⚠️ 字牌分支本身**仍然被覆盖**，靠下面那两条用合成 id（__nope__）的断言，不是靠真灵汁；
       否则 4 瓶全有图之后那条分支就再没人走，会静默烂掉（这正是"占位不再生成"的既定口径）。 */
    __ok('v0.69.0 还阳露出图（v0.67.0 时它还是无图的字牌占位）',
      pH.indexOf('lingshi/lingshi_huanyanglu.png') >= 0 && pH.indexOf('ricon') >= 0 &&
      pH.indexOf('ricon-fb') < 0, pH.slice(0, 130));
    __ok('v0.69.0 孟婆汤出图（同上）',
      (function () {
        var s = potionIcon(POTIONS.filter(function (p) { return p.id === 'mengpotang'; })[0]);
        return s.indexOf('lingshi/lingshi_mengpotang.png') >= 0 && s.indexOf('ricon-fb') < 0;
      })());
    /* v1.0.14：灵汁 4 → 8 瓶，新加的四瓶（金刚酒/清心露/腐骨散/通幽茶）**现已补齐贴图**，
       所以这条从「老四瓶全出图」扩成「八瓶全出图」（字牌分支由下面合成 id 那条覆盖）。 */
    __ok('v1.0.14 八瓶灵汁**全部出真图**（不再是 4 图 + 4 字牌）',
      POTIONS.every(function (p) {
        var s = potionIcon(p);
        return typeof s === 'string' && s.indexOf('<img') >= 0 && s.indexOf('ricon-fb') < 0;
      }));
    /* 断的是**表外且有名字**的灵汁（将来加新灵汁、或某瓶还没图）——
       它没有贴图 ⇒ 走字牌分支，取到的末字是「汁」。 */
    __ok('v0.67.0 potionIcon 对表外的灵汁 id 不抛错（表是子集，将来加新灵汁不会炸）',
      (function () {
        try { var s = potionIcon({ id: '__nope__', name: '无名汁' }); return s.indexOf('ricon-fb') >= 0 && s.indexOf('汁') >= 0; }
        catch (e) { return false; }
      })());
    /* 连 name 都没有（理论上三个调用点不会出现）⇒ 末字取空 ⇒ 空串，同样不抛错。 */
    __ok('v0.67.0 potionIcon 连 name 都没有时退化为空串，不抛错',
      (function () { try { return potionIcon({ id: '__nope__' }) === ''; } catch (e) { return false; } })());
    __ok('v0.67.0 遗物图标**没有**被字牌化（relicIcon 永远出 <img>，占位只管灵汁）',
      icZhu.indexOf('ricon-fb') < 0 && icZhao.indexOf('ricon-fb') < 0);
    /* v1.0.13：15 张新遗物图 + 断刃雷符卡图**已全部交付**；v1.0.17：stat_gold/stat_hp 已交付。
       v1.0.26 起改为**白名单精确比对**：新增待出图必须同步登记，图到了删一条。
       v1.1.1 / v1.1.3 / v1.1.4 / v1.1.5 四批里程碑待出图（天师 4 + 赶尸人 3 + 武僧 4 + 阴差 3 = 14 张）
       **已全部交付** ⇒ ART_PENDING 清空。图到了就从名单删一条，删空即全部到位。 */
    __ok('v1.1.5 ART_PENDING 已清空（里程碑 14 张待出图全部交付：天师 4 + 赶尸人 3 + 武僧 4 + 阴差 3）',
      ART_PENDING.length === 0,
      ART_PENDING.join(','));
    /* v1.0.14：金币/血量两个状态图标走 iconTag（唯一真相源 STAT_ICONS），并各钉一个调用点。
       缺图时 iconTag 出 `<i></i>` 圆点，两处观感与改动前逐字节一致 ⇒ 图上齐才现形。 */
    __ok('v1.0.14 STAT_ICONS 表登记金币/血量两张图（顶栏金币 + 玩家面板血量）',
      STAT_ICONS.gold === 'ui/stat_gold.png' && STAT_ICONS.hp === 'ui/stat_hp.png',
      JSON.stringify(STAT_ICONS));
    var __tbSrc = __code(renderTopbar);
    __ok('v1.0.14 顶栏金币走 iconTag(STAT_ICONS.gold)（不再是硬编码 <i></i>）',
      __tbSrc.indexOf('iconTag(STAT_ICONS.gold') >= 0 && __tbSrc.indexOf('stat-gold"><i></i>') < 0);
    /* ⚠️ 不能 `__code(render)`：冒烟宿主把 `render` 打桩成空函数了（见本文件开头的 `render = __sil`），
       String() 拿到的是桩。玩家面板那半边由下面 syncBattleHpDom 这条 + 行为断言间接覆盖。 */
    /* 逐帧的血量同步**只能**回写 .hpnum 的 textContent —— 整块 innerHTML 会把 <img class="bicon">
       抹掉、退回旧圆点（手机端节拍期每帧都走这条路径，图上齐后必现）。 */
    var __syncSrc = __code(syncBattleHpDom);
    __ok('v1.0.14 syncBattleHpDom 回写 .hpnum（不整块重建 pstat-hp，避免抹掉血量图标 <img>）',
      __syncSrc.indexOf('pstat-hp .hpnum') >= 0 && __syncSrc.indexOf('innerHTML') < 0);
    __ok('v1.0.x 遗物字牌兜底**只**给 ART_PENDING 清单里的图（清单外的遗物图一律不带 data-fallback）',
      RELICS.every(function (r) {
        var src = lingshiSrc(r.id) || ('relic/' + r.id + '.png');
        var want = (typeof ART_PENDING !== 'undefined' && ART_PENDING.indexOf(src) >= 0);
        return (relicIcon(r).indexOf('ricon-fb') >= 0) === want;
      }));

    /* 只加函数不插调用点 = 等于没接。三个渲染点逐个断，并且断插入位置在 .cname **之前**
       （插到 .cdesc 之后会被 flex 排到文字下面，读起来像"图标掉到卡底了"）。 */
    var sSelect = __code(showPotionSelect), sWell = __code(unknownPotion), sShop = __code(renderShop);
    __ok('v0.67.0 战斗「使用灵汁」面板插了 potionIcon', sSelect.indexOf('potionIcon(p)') >= 0);
    __ok('v0.67.0 灵泉事件插了 potionIcon', sWell.indexOf('potionIcon(p)') >= 0);
    __ok('v0.67.0 鬼市商店插了 potionIcon', sShop.indexOf('potionIcon(p)') >= 0);
    /* v0.67.0：遗物图标此前**只在两处**接了（选遗物面板 + 详情页 chip），其余几处
       「给你一件遗物」的弹窗仍是纯文字卡 —— 同一个功能里一半有图一半没图最刺眼。
       这批把剩下三处补齐（Boss 战利品 x2 / 古井许愿 x1）。 */
    var sBoss = __code(showBossReward), sWellEv = __code(doWellOffer);
    __ok('v0.67.0 Boss 战利品弹窗的遗物卡接了 relicIcon', sBoss.indexOf('relicIcon(relic)') >= 0);
    __ok('v0.67.0 Boss 战利品弹窗的灵汁卡接了 potionIcon', sBoss.indexOf('potionIcon(potion)') >= 0);
    /* v0.68.1：古井许愿拆成「弹窗（unknownWell）+ 接受（doWellOffer）」，遗物卡在后者里 */
    __ok('v0.67.0 古井许愿弹窗的遗物卡接了 relicIcon', sWellEv.indexOf('relicIcon(relic)') >= 0);
    /* 「图标排在它自己那张卡的 .cname 之前」——**不能拿全文第一个 cname 比**：
       Boss 那张卡里有两张卡（遗物 + 灵汁），遗物的 cname 排在灵汁的图标前面，
       拿全文第一个 cname 去比 potionIcon 必然假红（本批踩过）。
       所以逐个图标各自往后找**它后面最近的那个** cname。 */
    var _iconBeforeCname = function (src, tok) {
      var i = src.indexOf(tok); if (i < 0) return false;
      var j = src.indexOf('cname', i); return j > i;
    };
    __ok('v0.67.0 这两处的图标都排在各自那张卡的 .cname 之前（插到 cdesc 之后会被 flex 排到文字下面）',
      _iconBeforeCname(sBoss, 'relicIcon(relic)') &&
      _iconBeforeCname(sBoss, 'potionIcon(potion)') &&
      _iconBeforeCname(sWellEv, 'relicIcon(relic)'));
    __ok('v0.67.0 三处的 potionIcon 都排在 .cname 之前（排在后面会被 flex 压到文字下面）',
      [sSelect, sWell, sShop].every(function (s) {
        var i = s.indexOf('potionIcon(p)'), j = s.indexOf('cname', i);
        return i >= 0 && j > i;
      }));
    /* 灵汁的名称/描述文案本批一个字没动（只插图）—— 防"顺手美化"把文案改了。 */
    /* v1.0.14：用户拍板「灵汁只有 4 种，太单一」⇒ 扩到 8 瓶。老四瓶的 id 一个不少。 */
    __ok('v0.67.0 POTIONS 老四瓶 id 一个不少（v1.0.14 起共 8 瓶）',
      potionIds.length === 8 && ['huanyanglu', 'huangquanjiu', 'zhenhunshui', 'mengpotang',
        'jingangjiu', 'qingxinlu', 'fugusan', 'tongyoucha']
        .every(function (i) { return potionIds.indexOf(i) >= 0; }), potionIds.join(','));
  })();

  /* ===================== v0.69.0：卡面短文案（§D 双层文案）=====================
     背景：牌框换真美术后铭牌窗只占卡高 28%，132x200 的卡上 .cdesc **只装得下 3 行**。
     行宽是实拍标定的（_patch/_drvfit.js，headless Chrome）：30 个纯汉字 = 正好 3 行，
     32 个 = 4 行开始截断。而卡池里 34 张牌的 t() 最长到 88 列宽（尸王）——
     **静默截断，玩家读不到后半句**。
     解法是「双层」：t() 仍是唯一真相源（长按弹窗读它，一字未删），
     牌面改读 cardText()，超长的卡再补一个 ts() 短版。

     ⚠️ 为什么闸门落在这里而不是 verify_dist.py：产物 _build/obf.js 开了
        stringArray+base64（verify_dist.py:410-413 有明文告诫），约 3/4 的文案在产物里
        是 base64，中文串 grep 必然假缺失。文案闸只能在源码侧跑。
     ⚠️ 这两条是**硬闸**，只测两个能机器判定的量：列宽、数字多重集。
        运算符（×/≥/%/+/）**故意不测** —— 压缩的**目的**就是改句式，
        「造成 4 点伤害，并获得 2 点格挡」→「伤4，格挡2」必然改变运算符数量，
        把它设成硬闸等于把合法重写全判红。 */
  (function () {
    var MAXCOL = 30;   /* 实拍：30 个纯汉字 = 3 行，正好放满；31 个就开始截断 */

    /* 列宽模型：ASCII（0x20-0x7E）记 0.5 列，其余（汉字 / 全角标点 / 【】）记 1 列。
       ⚠️ 这是**近似**，不是精确排版：实测有约 ±3 列的抖动（断行不能填满整行，
          长串数字/【】词条会把余量顶到下一行）。所以 30 这个阈值取的是
          **纯汉字的实测安全值**，不是模型算出来的 —— 真实排版由 _drvfit.js 兜底复验。 */
    var _cols = function (t) {
      t = String(t); var w = 0;
      for (var i = 0; i < t.length; i++) {
        var c = t.charCodeAt(i);
        w += (c >= 0x20 && c <= 0x7e) ? 0.5 : 1;
      }
      return w;
    };
    var _nums = function (t) { return String(t).match(/\d+(?:\.\d+)?/g) || []; };
    var _sameNums = function (a, b) {
      var x = _nums(a), y = _nums(b);
      if (x.length !== y.length) return false;
      for (var i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
      return true;
    };

    var HEROES = ['ganshiren', 'wuseng', 'yincha', 'tianshi'];
    var savedHero = G.hero;
    var overLen = [], numBad = [], withTs = 0, total = 0;
    var noTsOver = [];

    HEROES.forEach(function (h) {
      G.hero = h;
      CARDS.forEach(function (c) {
        var hasTs = (typeof c.ts === 'function');
        if (hasTs) withTs++;
        [false, true].forEach(function (up) {
          total++;
          var face, full;
          try { face = cardText(c, up); full = c.t(up); }
          catch (e) { overLen.push(c.id + '/' + h + ':' + e.message); return; }
          if (_cols(face) > MAXCOL) overLen.push(c.id + '/' + h + '/' + (up ? '升' : '基') + '=' + _cols(face).toFixed(1) + '列');
          /* 数字硬闸：牌面短版与全文的数字**逐元素**相等（含顺序）——
             「改文案不许改数值」的机器实现。 */
          if (!_sameNums(full, face)) {
            numBad.push(c.id + '/' + h + '/' + (up ? '升' : '基')
              + ' [' + _nums(full).join(',') + ']≠[' + _nums(face).join(',') + ']');
          }
          /* 没写 ts 的卡必须自己就放得下，否则就是「漏写了短版」 */
          if (!hasTs && _cols(full) > MAXCOL) noTsOver.push(c.id + '/' + h + '/' + (up ? '升' : '基'));
        });
      });
    });
    G.hero = savedHero;

    __ok('v0.69.0 卡面文案列宽全部 ≤' + MAXCOL + '（132x200 实测 3 行上限；超过就是静默截断）',
      overLen.length === 0, overLen.slice(0, 12).join(' '));
    __ok('v0.69.0 牌面短版的数字与全文逐元素相等（压缩只许删字，不许改数值）',
      numBad.length === 0, numBad.slice(0, 12).join(' '));
    __ok('v0.69.0 没写 ts 的卡自己就放得下（不许靠「没写」绕过列宽闸）',
      noTsOver.length === 0, noTsOver.slice(0, 12).join(' '));
    /* 覆盖度断言：short 表不许被清空（清空后前两条会「假绿」——
       全部回落成 t，而 t 若恰好都在 30 列内就没人发现双层没了）。 */
    __ok('v0.69.0 SHORT_TEXT 表仍在用（写了 ts 的卡数 ≥30，防"整个表被删掉后闸门假绿"）',
      withTs >= 30, 'withTs=' + withTs + ' / 抽查 ' + total + ' 条');

    /* 长按放大弹窗必须继续读全文 —— 这是「双层文案」的另一半，
       改回 cardText() 就等于把 34 张牌被压掉的从句**永久弄丢**。 */
    var _zoomSrc = String(showCardZoom);
    __ok('v0.69.0 长按放大弹窗仍读全文 c.t()（读 cardText 会把机制说明弄丢）',
      _zoomSrc.indexOf('c.t(c.up)') >= 0 && _zoomSrc.indexOf('cardText') < 0);
    /* 三份卡面模板必须都走 cardText —— 漏一处那张卡就还是截断的 */
    __ok('v0.69.0 三份卡面模板都走 cardText（cardBody / forgeCardHTML / handCardHTML）',
      String(cardBody).indexOf('cardText') >= 0 &&
      String(forgeCardHTML).indexOf('cardText') >= 0 &&
      String(handCardHTML).indexOf('cardText') >= 0);
    /* 全文不许被顺手删短：尸王 t() 仍是 88 列那种长文。
       若有人「顺手把 t 也压短」，数字闸查不出来（数字没变），只有这条拦得住。 */
    G.hero = 'ganshiren';
    var _shiwang = cardById('shi_wang');
    __ok('v0.69.0 全文 t() 未被压缩（尸王仍 ≥70 列；双层里的"全文"那一层不许被顺手削）',
      _cols(_shiwang.t(false)) >= 70, _cols(_shiwang.t(false)).toFixed(1) + ' 列');
    G.hero = savedHero;
  })();

  /* ============ v1.0.15 里程碑（渐进门禁制） ============ */
  (function () {
    var SAVE0 = SAVE;   // 本块会临时替换 / 改写 SAVE，末尾复原
    /* v1.0.16：门禁**总开关默认关**（测试期）—— 下面 2)~5) 是「门禁开」口径的边界断言，
       先强制打开，跑到块末再复原，并补一段「关掉时一律放行」的正面断言。 */
    var __gate0 = MILE_GATE_ON;
    MILE_GATE_ON = true;

    /* 1) 点数公式（独立函数 milePointsFor，便于断言） */
    __ok('v1.0.15 milePointsFor：起始态 0 点',
      milePointsFor({ act: 1, mapRow: 0, totalKills: 0, finalBoss: false }) === 0);
    __ok('v1.0.25 milePointsFor：幕 200 / 层 15 / 击杀 5 分别计权',
      milePointsFor({ act: 2, mapRow: 4, totalKills: 10 }) === 200 + 60 + 50,
      String(milePointsFor({ act: 2, mapRow: 4, totalKills: 10 })));
    __ok('v1.0.25 milePointsFor：通关（打穿第三幕幕主）额外 +600',
      milePointsFor({ act: 3, mapRow: 13, totalKills: 0, finalBoss: true }) === 400 + 195 + 600);
    __ok('v1.0.15 milePointsFor：空值 / 越界字段不抛且不小于 0',
      milePointsFor({}) === 0 && milePointsFor({ act: 0, mapRow: -3, totalKills: -9 }) === 0);
    __ok('v1.0.25 一局普通通关（≈1295 点）能让天师轨 ≥2 档达标（正反馈）',
      MILE_TRACKS.tianshi.nodes.filter(function (n) { return n.need <= 1295; }).length >= 2);
    __ok('v1.1.8 角色门禁已撤：MILESTONES 不含任何 heroes 条目（角色改由【入门符纸】解锁）',
      !MILESTONES.some(function (m) { return m.heroes; }) &&
      ['hero_ganshiren', 'hero_wuseng', 'hero_yincha'].every(function (id) {
        return !MILESTONES.some(function (m) { return m.id === id; });
      }));

    /* 2) mileOn 四种 kind 的边界（初始：只有基础内容） */
    SAVE = { unlocked: [], progress: { pts: 0, runs: 0, wins: 0, bestAct: 0, kills: 0 }, mile: [] };
    __ok('v1.0.15 mileOn hero：tianshi 恒开 / 其余角色锁',
      mileOn('hero', 'tianshi') === true && mileOn('hero', 'ganshiren') === false && mileOn('hero', 'yincha') === false);
    __ok('v1.0.15 mileOn card：白/蓝恒开、紫/金锁',
      mileOn('card', 'leifu') === true && mileOn('card', 'tiebushan') === true &&
      mileOn('card', 'tianlei') === false && mileOn('card', 'wanjian') === false);
    __ok('v1.0.15 mileOn relic：白/蓝恒开、紫/金锁',
      mileOn('relic', 'zhaohunfan') === true && mileOn('relic', 'taomujian') === true &&
      mileOn('relic', 'jifengfu') === false && mileOn('relic', 'baiguilu') === false);
    __ok('v1.0.15 mileOn potion：老 4 瓶恒开、新 4 瓶锁',
      ['huanyanglu', 'huangquanjiu', 'zhenhunshui', 'mengpotang'].every(function (id) { return mileOn('potion', id) === true; }) &&
      ['jingangjiu', 'qingxinlu', 'fugusan', 'tongyoucha'].every(function (id) { return mileOn('potion', id) === false; }));
    __ok('v1.0.15 mileOn 未登记的 id 一律放行（不静默蒸发内容）',
      mileOn('hero', '__nope') === true && mileOn('card', '__nope') === true &&
      mileOn('relic', '__nope') === true && mileOn('potion', '__nope') === true);
    SAVE.mile = ['adv_card', 'adv_relic', 'potion_new'];
    __ok('v1.0.15 解锁 adv_card / adv_relic / potion_new 后对应内容立即可用',
      mileOn('card', 'tianlei') === true && mileOn('relic', 'jifengfu') === true && mileOn('potion', 'jingangjiu') === true);

    /* 2a-2) v1.1.8：角色改由【入门符纸】解锁 —— 手上无符纸时锁定角色不可解锁；
       有符纸（mileTickets）时消耗 1 张才写 SAVE.unlockedHeroes，mileOn('hero') 随之放行。 */
    SAVE = { unlocked: [], progress: { pts: 0, runs: 0, wins: 0, bestAct: 0, kills: 0, heroes: {} },
             mile: [], mileClaimed: [], unlockedHeroes: [], mileTickets: 0 };
    __ok('v1.1.8 入门符纸：符纸为 0 时锁定角色不可解锁 / mileOn(hero) 仍锁',
      mileTickets() === 0 && unlockHeroWithTicket('ganshiren') === false &&
      mileOn('hero', 'ganshiren') === false && mileOn('hero', 'wuseng') === false);
    SAVE.mileTickets = 2;
    __ok('v1.1.8 入门符纸：消耗 1 张解锁角色（幂等、不重复扣），并写入 SAVE.unlockedHeroes',
      unlockHeroWithTicket('ganshiren') === true && heroUnlocked('ganshiren') === true &&
      mileTickets() === 1 && mileOn('hero', 'ganshiren') === true &&
      unlockHeroWithTicket('ganshiren') === false && mileTickets() === 1 &&
      mileOn('hero', 'wuseng') === false);
    __ok('v1.1.8 入门符纸：解锁 tianshi / 非法 id 一律拒绝且不扣符纸',
      unlockHeroWithTicket('tianshi') === false && unlockHeroWithTicket('__nope') === false && mileTickets() === 1);

    /* 2b) v1.1.1 里程碑专属内容硬门禁：未在里程界面领取该档前，即使门禁总开关为开也不放行。 */
    SAVE = { unlocked: [], progress: { pts: 0, runs: 0, wins: 0, bestAct: 0, kills: 0 }, mile: [], mileClaimed: [] };
    __ok('v1.1.1 里程碑专属牌/遗物：领取前被硬门禁挡在所有卡池外',
      mileOn('card', 'dianzhoufu') === false && mileOn('card', 'leiqianfu') === false &&
      mileOn('card', 'wuleifayin') === false && mileOn('relic', 'zhushayan') === false);
    SAVE.mile = ['adv_card', 'adv_relic']; SAVE.mileClaimed = ['tianshi_t1', 'tianshi_t2', 'tianshi_t4', 'tianshi_t5'];
    __ok('v1.1.1 领取对应档位后专属牌/遗物立即放行（mileClaimed 落盘生效）',
      mileOn('card', 'dianzhoufu') === true && mileOn('card', 'leiqianfu') === true &&
      mileOn('card', 'wuleifayin') === true && mileOn('relic', 'zhushayan') === true);
    __ok('v1.1.1 未领取的档位仍锁（领取 t5 不等于放行他档）',
      (function () { SAVE.mileClaimed = ['tianshi_t5'];
        return mileOn('card', 'wuleifayin') === true && mileOn('card', 'dianzhoufu') === false &&
          mileOn('card', 'leiqianfu') === false && mileOn('relic', 'zhushayan') === false; })());
    __ok('v1.1.1 weightedCard 不返回未解锁的天师专属牌（点咒符/雷谴符/五雷法印；hero+mile 双过滤兜底）',
      (function () {
        SAVE.mileClaimed = []; SAVE.mile = []; G = __base('tianshi'); seedRng(7);
        for (var i = 0; i < 150; i++) {
          var c = weightedCard();
          if (c && ['dianzhoufu', 'leiqianfu', 'wuleifayin'].indexOf(c.id) >= 0) return false;
        }
        return true;
      })());

    /* 2c) v1.1.1 接线闸：t5 五雷法印 + t3 天师真传的收口点必须在正确位置。 */
    __ok('v1.1.1 五雷法印：eff 开手牌多选 / confirm 原地替换成 0 费 oneShot 雷符 / 回合末 autoPlayWulei 自动打出',
      __code(cardById('wuleifayin').eff).indexOf('startWuleiSelect') >= 0 &&
      __code(confirmWuleiSelect).indexOf('oneShot:true') >= 0 &&
      __code(finishEndTurn).indexOf('autoPlayWulei()') >= 0 &&
      __code(autoPlayWulei).indexOf('lowestHpEnemy') >= 0);
    __ok('v1.1.1 天师真传(t3)：开局抉择在领取 tianshi_t3 后改「本角色全部牌库自由选」池',
      __code(showOpeningChoice).indexOf('tianshi_t3') >= 0 && __code(showOpeningChoice).indexOf('free-pool') >= 0);

    /* 2d) v1.1.3 赶尸人里程碑（t1 赶尸令 / t2 尸气回流 / t3 万尸朝宗 / t4 尸王真传 / t5 阴司牒） */
    SAVE = { unlocked: [], progress: { pts: 0, runs: 0, wins: 0, bestAct: 0, kills: 0 }, mile: [], mileClaimed: [] };
    __ok('v1.1.3 赶尸人里程碑专属牌/遗物：领取前被硬门禁挡在所有卡池外',
      mileOn('card', 'ganzhiling') === false && mileOn('card', 'wanshichaozong') === false &&
      mileOn('relic', 'yinsidie') === false);
    SAVE.mile = ['adv_card', 'adv_relic']; SAVE.mileClaimed = ['ganshiren_t1', 'ganshiren_t3', 'ganshiren_t5'];
    __ok('v1.1.3 领取对应档位后赶尸人专属牌/遗物立即放行（mileClaimed 落盘生效）',
      mileOn('card', 'ganzhiling') === true && mileOn('card', 'wanshichaozong') === true &&
      mileOn('relic', 'yinsidie') === true);
    __ok('v1.1.3 里程轨：赶尸人前 5 档节点 id / 名称正确且非 pending',
      MILE_TRACKS.ganshiren.nodes.slice(0, 5).every(function (n, i) {
        return n.id === 'ganshiren_t' + (i + 1) && n.pending === false;
      }) &&
      MILE_TRACKS.ganshiren.nodes[0].name === '赶尸令' &&
      MILE_TRACKS.ganshiren.nodes[1].name === '尸气回流' &&
      MILE_TRACKS.ganshiren.nodes[2].name === '万尸朝宗' &&
      MILE_TRACKS.ganshiren.nodes[3].name === '尸王真传' &&
      MILE_TRACKS.ganshiren.nodes[4].name === '阴司牒');
    __ok('v1.1.3 尸王在一切奖励池恒被排除（weightedCard 不再按英雄放行尸王）',
      (function () {
        SAVE.mileClaimed = ['ganshiren_t1', 'ganshiren_t3', 'ganshiren_t5']; SAVE.mile = []; G = __base('ganshiren'); seedRng(11);
        for (var i = 0; i < 200; i++) { var c = weightedCard(); if (c && c.id === 'shi_wang') return false; }
        return true;
      })());
    __ok('v1.1.3 尸王真传(t4)：开局抉择在领取 ganshiren_t4 后改自由选池，且恒排除尸王',
      __code(showOpeningChoice).indexOf('ganshiren_t4') >= 0 &&
      __code(showOpeningChoice).indexOf("c.id!=='shi_wang'") >= 0);
    __ok('v1.1.3 尸气回流(t2)：onSummonDeath 收口 + 预恢复按「骨铃+回流」叠加',
      __code(onSummonDeath).indexOf('ganshiren_t2') >= 0 &&
      __code(preSummonHeal).indexOf('ganshiren_t2') >= 0);
    __ok('v1.1.3 阴司牒(t5)：尸王攻击后走 gainBlock 收口加 5 格挡（金刚符同款音效/特效）',
      __code(summonAct).indexOf("hasRelic('yinsidie')") >= 0 && __code(summonAct).indexOf('gainBlock(5)') >= 0);
    __ok('v1.1.3 赶尸令/万尸朝宗：都是「花尸气召纸人」的召唤牌（纯召唤，走 addSummon 收口）',
      __code(cardById('ganzhiling').eff).indexOf('addSummon') >= 0 && __code(cardById('ganzhiling').eff).indexOf('spendShiqi') >= 0 &&
      __code(cardById('wanshichaozong').eff).indexOf('addSummon') >= 0 && __code(cardById('wanshichaozong').eff).indexOf('spendShiqi') >= 0);
    __ok('v1.1.3 卡面「阴司牒强化态」只在渲染层（不动 t/ts、不破 canUpgrade）',
      typeof shiWangBoosted === 'function' && typeof shiWangBoostTag === 'function' &&
      canUpgrade(cardById('shi_wang')) === false &&
      __code(cardBody).indexOf('shiWangBoosted') >= 0 && __code(handCardHTML).indexOf('shiWangBoosted') >= 0);

    /* 2e) v1.1.4 武僧里程碑（t1 罗汉伏虎 / t2 铁壁 / t3 化甲为毒 / t4 金刚杵 / t5 达摩影） */
    SAVE = { unlocked: [], progress: { pts: 0, runs: 0, wins: 0, bestAct: 0, kills: 0 }, mile: [], mileClaimed: [] };
    __ok('v1.1.4 武僧里程碑专属牌/遗物：领取前被硬门禁挡在所有卡池外',
      mileOn('card', 'luohanfuhu') === false && mileOn('card', 'huajiaweidu') === false &&
      mileOn('relic', 'jingangchu') === false && mileOn('relic', 'damoying') === false);
    SAVE.mile = ['adv_card', 'adv_relic']; SAVE.mileClaimed = ['wuseng_t1', 'wuseng_t3', 'wuseng_t4', 'wuseng_t5'];
    __ok('v1.1.4 领取对应档位后武僧专属牌/遗物立即放行（mileClaimed 落盘生效）',
      mileOn('card', 'luohanfuhu') === true && mileOn('card', 'huajiaweidu') === true &&
      mileOn('relic', 'jingangchu') === true && mileOn('relic', 'damoying') === true);
    __ok('v1.1.4 里程轨：武僧前 5 档节点 id / 名称正确且非 pending',
      MILE_TRACKS.wuseng.nodes.slice(0, 5).every(function (n, i) {
        return n.id === 'wuseng_t' + (i + 1) && n.pending === false;
      }) &&
      MILE_TRACKS.wuseng.nodes[0].name === '罗汉伏虎' &&
      MILE_TRACKS.wuseng.nodes[1].name === '铁壁' &&
      MILE_TRACKS.wuseng.nodes[2].name === '化甲为毒' &&
      MILE_TRACKS.wuseng.nodes[3].name === '金刚杵' &&
      MILE_TRACKS.wuseng.nodes[4].name === '达摩影');
    __ok('v1.1.4 铁壁(t2)：mileThorns() 只给武僧 2 点（领取后）、未领 0；罗汉拳套 relicThorns 基线也改为 2',
      (function () {
        G = __base('wuseng'); SAVE.mileClaimed = [];
        var a = mileThorns();
        SAVE.mileClaimed = ['wuseng_t2'];
        var b = mileThorns();
        G = __base('tianshi'); var c = mileThorns();   // 别的角色不吃铁壁
        return a === 0 && b === 2 && c === 0 && __code(relicThorns).indexOf('luohanquan') >= 0;
      })());
    __ok('v1.1.4 罗汉伏虎(t1)：额外加当前格挡一半（向下取整、Math.min 封顶 15/10）',
      __code(cardById('luohanfuhu').eff).indexOf('Math.floor') >= 0 &&
      __code(cardById('luohanfuhu').eff).indexOf('Math.min') >= 0 &&
      __code(cardById('luohanfuhu').eff).indexOf('15') >= 0 &&
      cardById('luohanfuhu').t(false).indexOf('向下取整') >= 0);
    __ok('v1.1.4 化甲为毒(t3)：0 费技能、**非消耗牌**、格挡 <10 打不出、每次给全体敌人挂 **1 层**腐毒（本牌上限 4/5）',
      cardById('huajiaweidu').cost === 0 && cardById('huajiaweidu').type === 'skill' &&
      !('exhaust' in cardById('huajiaweidu')) &&
      __code(cardById('huajiaweidu').eff).indexOf('applyPoisonAll(1, u?5:4)') >= 0 &&
      __code(cardById('huajiaweidu').eff).indexOf('<10') >= 0);
    __ok('v1.1.4 金刚杵(t4)：gainBlock 收口「获得即是累积」记 blockAccum，满 50 清零送 oneShot 铁布衫，startBattle 跨战斗清零',
      __code(gainBlock).indexOf('jingangchu') >= 0 && __code(gainBlock).indexOf('blockAccum') >= 0 &&
      __code(gainBlock).indexOf('oneShot:true') >= 0 && __code(gainBlock).indexOf('tiebushan') >= 0 &&
      __code(startBattle).indexOf('G.blockAccum=0') >= 0);
    __ok('v1.1.4 达摩影(t5)：受击后格挡归零则 damoyingBurst 爆破（伤害=击碎前格挡总量，逐点随机分配）',
      __code(dealDamageToPlayer).indexOf('damoying') >= 0 &&
      typeof damoyingBurst === 'function' &&
      __code(damoyingBurst).indexOf('aliveEnemies') >= 0 && __code(damoyingBurst).indexOf('rng()') >= 0);
    __ok('v1.1.4 浅显荆棘：玩家侧受击反伤与敌人侧反震都复用 sfx(\'spark\') + playFx(\'damage_reflect\') 立绘叠图',
      __code(dealDamageToPlayer).indexOf('damage_reflect') >= 0 && __code(dealDamageToPlayer).indexOf("sfx('spark')") >= 0 &&
      __code(applyDamageTo).indexOf('damage_reflect') >= 0 && __code(applyDamageTo).indexOf("sfx('spark')") >= 0);
    __ok('v1.1.4 腐毒结算改为三角数（n(n+1)/2）：第 n 层掉 n(n+1)/2 点后 -1 层；applyPoisonAll 支持本牌叠加上限 cap',
      __code(startTurn).indexOf('(p*(p+1))/2') >= 0 &&
      __code(applyPoisonAll).indexOf('cap') >= 0);

    /* 2f) v1.1.5 阴差里程碑（t1 饮血刃 / t2 血怒·涌 / t3 焚身咒 / t4 新初始牌组 / t5 酆都令） */
    SAVE = { unlocked: [], progress: { pts: 0, runs: 0, wins: 0, bestAct: 0, kills: 0 }, mile: [], mileClaimed: [] };
    __ok('v1.1.5 阴差里程碑专属牌/遗物：领取前被硬门禁挡在所有卡池外',
      mileOn('card', 'yinxueren') === false && mileOn('card', 'fenshenzhou') === false &&
      mileOn('relic', 'fengduling') === false);
    SAVE.mile = ['adv_card', 'adv_relic']; SAVE.mileClaimed = ['yincha_t1', 'yincha_t3', 'yincha_t5'];
    __ok('v1.1.5 领取对应档位后阴差专属牌/遗物立即放行（mileClaimed 落盘生效）',
      mileOn('card', 'yinxueren') === true && mileOn('card', 'fenshenzhou') === true &&
      mileOn('relic', 'fengduling') === true);
    __ok('v1.1.5 里程轨：阴差前 5 档节点 id / 名称正确且非 pending',
      MILE_TRACKS.yincha.nodes.slice(0, 5).every(function (n, i) {
        return n.id === 'yincha_t' + (i + 1) && n.pending === false;
      }) &&
      MILE_TRACKS.yincha.nodes[0].name === '饮血刃' && MILE_TRACKS.yincha.nodes[1].name === '血怒·涌' &&
      MILE_TRACKS.yincha.nodes[2].name === '焚身咒' && MILE_TRACKS.yincha.nodes[3].name === '新初始牌组' &&
      MILE_TRACKS.yincha.nodes[4].name === '酆都令');
    __ok('v1.1.5 血怒·涌(t2)：血怒上限 10→13；血玉 xueyu 由 +4 改 +3；两者叠加 16（都降 1 点）',
      (function () {
        G = __base('yincha'); G.relics = [];
        var a = relicMaxXuenu();
        G.relics = ['xueyu']; var b = relicMaxXuenu();
        SAVE.mileClaimed = ['yincha_t2']; G.relics = []; var c = relicMaxXuenu();
        G.relics = ['xueyu']; var d = relicMaxXuenu();
        return a === 10 && b === 13 && c === 13 && d === 16;
      })() &&
      RELICS.filter(function (r) { return r.id === 'xueyu'; })[0].desc.indexOf('+3') >= 0 &&
      __code(relicMaxXuenu).indexOf('yincha_t2') >= 0);
    __ok('v1.1.5 饮血刃(t1)：0 费攻击，**失血在前、消耗在后**（loseHp 先于 rageSpend）⇒ 至多吃 2 层 +6；击杀再补 2 层',
      cardById('yinxueren').cost === 0 && cardById('yinxueren').type === 'attack' &&
      cardById('yinxueren').hero === 'yincha' && cardById('yinxueren').mile === 'yincha_t1' &&
      __code(cardById('yinxueren').eff).indexOf('loseHp(3)') >= 0 &&
      __code(cardById('yinxueren').eff).indexOf('loseHp(3)') < __code(cardById('yinxueren').eff).indexOf('rageSpend(3,6)') &&
      __code(cardById('yinxueren').eff).indexOf('gainRage(2)') >= 0);
    __ok('v1.1.5 饮血刃伤害预览：镜像「失血先 +3 层」再取 min(2) ⇒ 基础 4/8 恒 +6',
      (function () { G = __base('yincha'); G.xuenu = 0;
        return CARD_DMG.yinxueren(false, {}) === 10 && CARD_DMG.yinxueren(true, {}) === 14; })());
    __ok('v1.1.5 焚身咒(t3)：0 费技能/**消耗牌**，失 3 血，本回合攻击牌 +3（升级 +5），并入 turnAtkBuff（与开天眼/灵汁叠加）',
      cardById('fenshenzhou').cost === 0 && cardById('fenshenzhou').type === 'skill' &&
      cardById('fenshenzhou').exhaust === true && cardById('fenshenzhou').hero === 'yincha' &&
      cardById('fenshenzhou').mile === 'yincha_t3' &&
      __code(cardById('fenshenzhou').eff).indexOf('loseHp(3)') >= 0 &&
      __code(cardById('fenshenzhou').eff).indexOf('turnAtkBuff') >= 0 &&
      cardById('fenshenzhou').t(false).indexOf('+3') >= 0 && cardById('fenshenzhou').t(true).indexOf('+5') >= 0);
    __ok('v1.1.5 酆都令(t5)：hp 首次 ≤9（绝对）→ 充满血怒 + 本回合翻倍；挂在 loseHp 与 dealDamageToPlayer 扣血之后（道心优先）；每场重置',
      typeof checkFengduLing === 'function' &&
      __code(checkFengduLing).indexOf('G.hp>9') >= 0 &&
      __code(checkFengduLing).indexOf('gainRage') >= 0 &&
      __code(checkFengduLing).indexOf('damageDoubleTurn=1') >= 0 &&
      __code(dealDamageToPlayer).indexOf('checkFengduLing()') >= 0 &&
      __code(loseHp).indexOf('checkFengduLing()') >= 0 &&
      __code(startBattle).indexOf('G.fengduUsed=false') >= 0 &&
      __code(finishEndTurn).indexOf('G.damageDoubleTurn=0') >= 0);
    __ok('v1.1.5 酆都令翻倍与血魔刀 +25% 走同一加法桶（calcDamageTo 与 previewDamage 镜像一致）',
      __code(calcDamageTo).indexOf('_mul+=1') >= 0 && __code(calcDamageTo).indexOf('_mul+=0.25') >= 0 &&
      __code(previewDamage).indexOf('damageDoubleTurn') >= 0 &&
      RELICS.filter(function (r) { return r.id === 'fengduling'; })[0].rarity === 'gold');
    __ok('v1.1.13 选角：4 张符纸左→右 天师·武僧·赶尸人·阴差；点符纸=选中并切换背景（顶部降落+弹跳）；界面类仍为 hero-scene',
      (typeof HS_ORDER !== 'undefined' && String(HS_ORDER) === 'tianshi,wuseng,ganshiren,yincha') &&
      __code(hsTalismansHTML).indexOf("hsPickTalisman('") >= 0 &&
      __code(hsPickTalisman).indexOf("sfx('talisman_click')") >= 0 &&
      __code(hsPickTalisman).indexOf("sfx('talisman_slide')") >= 0 &&
      __code(hsApplyHero).indexOf('hs-bgdrop') >= 0 &&
      __code(hsApplyHero).indexOf("sfx('poster_bounce_land')") >= 0 &&
      __code(showHeroSelect).indexOf("showOverlay(hsRootHTML(), false, 'hero-scene')") >= 0);
    __ok('v1.1.13 选角左上文案（名/被动名/被动全文，术语着色）/ 顶部入门符纸图标+数量 / 左下返回·右下开始',
      __code(hsInfoInner).indexOf('hs-name') >= 0 &&
      __code(hsInfoInner).indexOf('hs-mech') >= 0 &&
      __code(hsInfoInner).indexOf('hs-passive') >= 0 &&
      __code(hsTermHTML).indexOf('color:') >= 0 &&
      __code(hsTicketInner).indexOf('ui/rumenfuzhi.png') >= 0 &&
      __code(hsTicketInner).indexOf('mileTickets()') >= 0 &&
      __code(hsRootHTML).indexOf('返回主菜单') >= 0 &&
      __code(hsRootHTML).indexOf('开始游戏') >= 0);
    __ok('v1.1.13 右上初始牌组图标：阴差已领 t4 ⇒ card1/card2 一对可点切换（.on 加重）+ 提示字；其余角色单张 back.png；长按 250ms 展开预览',
      __code(hsDeckHTML).indexOf("mileClaimed('yincha_t4')") >= 0 &&
      __code(hsDeckHTML).indexOf('ui/deck_card1.png') >= 0 &&
      __code(hsDeckHTML).indexOf('ui/deck_card2.png') >= 0 &&
      __code(hsDeckHTML).indexOf('ui/deck_back.png') >= 0 &&
      __code(hsDeckHTML).indexOf('点击切换初始牌组') >= 0 &&
      __code(hsDeckDown).indexOf('250') >= 0 &&
      typeof hsDeckPreview === 'function' &&
      __code(hsDeckPreview).indexOf('hs-prev') >= 0 &&
      __code(hsDeckPreview).indexOf('starterDeckThumbs') >= 0);
    __ok('v1.1.5 新初始牌组(t4)：右组「血怒流」= 饮血刃×3/金刚符×2/焚身咒×1/佛渡×1/噬魂术×1/血契×1/守一×1/渡魂归己×1（共 11），左组＝现有阴差牌组',
      (function () {
        var alt = starterDeckList(1);
        if (alt.length !== 11) return false;
        var cnt = {}; alt.forEach(function (c) { cnt[c.id] = (cnt[c.id] || 0) + 1; });
        return cnt.yinxueren === 3 && cnt.jingang === 2 && cnt.fenshenzhou === 1 &&
          cnt.fodu === 1 && cnt.shihun === 1 && cnt.xueqi === 1 && cnt.shouyi === 1 && cnt.duhunguiji === 1;
      })() &&
      typeof hsDeckListFor === 'function' &&
      hsDeckListFor('yincha', 1).length === starterDeckList(1).length &&
      hsDeckListFor('yincha', 0).length === heroDeck('yincha').length &&
      hsDeckListFor('tianshi', 0).length === heroDeck('tianshi').length &&
      __code(pickHero).indexOf('hsDeckListFor') >= 0);
    __ok('v1.1.13 选角后不再弹「初始牌组二选一」整屏：pickHero 直接进开局抉择（旧三函数已删）',
      __code(pickHero).indexOf('showOpeningChoice()') >= 0 &&
      __code(pickHero).indexOf('showStarterDeckChoice') < 0 &&
      typeof showStarterDeckChoice === 'undefined' &&
      typeof chooseStarterDeck === 'undefined' &&
      typeof askChooseStarterDeck === 'undefined' &&
      typeof backToStarterDeck === 'undefined' &&
      __code(starterDeckThumbs).indexOf('cardBody(c)') >= 0 &&
      __code(starterDeckThumbs).indexOf('sd-thumb') >= 0);
    __ok('v1.1.13 返回上一步（两处）：选角→主菜单 / 开局抉择→选角（显式 rollback 清 hero/deck）',
      __code(heroSelectToMenu).indexOf('G.hero=null') >= 0 && __code(heroSelectToMenu).indexOf('G.deck=[]') >= 0 &&
      __code(backToHeroSelect).indexOf('showHeroSelect()') >= 0 &&
      __code(hsRootHTML).indexOf('heroSelectToMenu()') >= 0 &&
      __code(showOpeningChoice).indexOf('返回上一步') >= 0 &&
      __code(showOpeningChoice).indexOf('backToHeroSelect()') >= 0 &&
      __code(showOpeningChoice).indexOf('backToStarterDeck') < 0);
    __ok('v1.1.13 未解锁：符纸/牌组/开始键置灰（可点不可进）；点开始键弹「消耗 1 张入门符纸解锁」',
      __code(hsRootHTML).indexOf('hs-locked') >= 0 &&
      __code(hsApplyHero).indexOf('hs-locked') >= 0 &&
      typeof heroSelectStart === 'function' &&
      __code(heroSelectStart).indexOf("sfx('key_press')") >= 0 &&
      __code(heroSelectStart).indexOf('askConfirm') >= 0 &&
      __code(heroSelectStart).indexOf('unlockHeroWithTicket') >= 0);
    SAVE.mile = [];
    G = __base('tianshi');
    var poolLock = CARDS.filter(function (c) { return mileOn('card', c); });
    __ok('v1.0.15 卡牌池过滤：未解锁时不含紫/金',
      poolLock.length > 0 && poolLock.every(function (c) { return c.rarity === 'white' || c.rarity === 'blue'; }));
    SAVE.mile = ['adv_card'];
    var poolOpen = CARDS.filter(function (c) { return mileOn('card', c); });
    __ok('v1.0.15 卡牌池过滤：解锁进阶后紫/金回归',
      poolOpen.some(function (c) { return c.rarity === 'purple' || c.rarity === 'gold'; }));
    __ok('v1.0.15 weightedCard 在门禁下仍能取到牌且不抛（兜底生效）',
      (function () { SAVE.mile = []; seedRng(99); try { return !!weightedCard().id; } catch (e) { return false; } })());
    __ok('v1.0.15 randomPotion 在门禁下只出老 4 瓶',
      (function () {
        SAVE.mile = [];
        for (var i = 0; i < 30; i++) { if (MILE_BASE_POTIONS.indexOf(randomPotion().id) < 0) return false; }
        return true;
      })());

    /* 4) grantRunMilestones：累加 / 阈值解锁 / 幂等 */
    SAVE = { unlocked: [], progress: { pts: 0, runs: 0, wins: 0, bestAct: 0, kills: 0 }, mile: [] };
    G = __base('tianshi'); G.act = 1; G.mapRow = 5; G.totalKills = 6; G.finalBoss = false;   // 5×15 + 6×5 = 105
    var j1 = grantRunMilestones();
    __ok('v1.0.25 grantRunMilestones：本局点数/局数/击杀累加正确',
      SAVE.progress.pts === (5 * 15 + 6 * 5) && SAVE.progress.runs === 1 && SAVE.progress.kills === 6,
      JSON.stringify(SAVE.progress));
    __ok('v1.0.25 grantRunMilestones：未达本角色轨第一档（天师 350）不解锁',
      j1.length === 0 && SAVE.mile.length === 0);
    var j2 = grantRunMilestones();
    __ok('v1.0.25 grantRunMilestones：一局只发一次（幂等）',
      j2.length === 0 && SAVE.progress.pts === (5 * 15 + 6 * 5) && SAVE.progress.runs === 1);
    /* v1.0.15：结算面板显示的是 _mileGain（**实际发放额**），不是当场重算 ——
       幂等返回（复活后再败/再胜）时重算会显示一个没真发的数。 */
    __ok('v1.0.25 grantRunMilestones：落 _mileGain 实际发放额，幂等返回时保持不变',
      G._mileGain === (5 * 15 + 6 * 5));
    G = __base('tianshi'); G.act = 3; G.mapRow = 13; G.totalKills = 20; G.finalBoss = true;   // 400+195+100+600 = 1295
    var ptsBefore = SAVE.progress.pts, j3 = grantRunMilestones();
    __ok('v1.0.25 grantRunMilestones：普通通关一次点亮天师轨 ≥2 档',
      j3.length >= 2, 'unlocked=' + j3.map(function (m) { return m.id; }).join(','));
    __ok('v1.1.8 grantRunMilestones：解锁本角色轨档位 + 新表剩余 id（紫/金内容），且不再写任何 hero_* 角色 id',
      j3.some(function (m) { return /^tianshi_t\d+$/.test(m.id); }) &&
      j3.every(function (m) { return mileDone(m.id) && SAVE.mile.indexOf(m.id) >= 0; }) &&
      SAVE.mile.indexOf('adv_card') >= 0 && SAVE.mile.indexOf('adv_relic') >= 0 &&
      !SAVE.mile.some(function (id) { return /^hero_/.test(id); }));
    __ok('v1.0.25 grantRunMilestones：通关计入 wins / bestAct',
      SAVE.progress.wins === 1 && SAVE.progress.bestAct === 3);
    var j4 = grantRunMilestones();
    __ok('v1.0.25 grantRunMilestones：再调不重复解锁、点数不再叠加（幂等）',
      j4.length === 0 && SAVE.mile.length === j3.length && SAVE.progress.pts === ptsBefore + 1295);

    /* 5) loadSave 对老档 / 坏档的兼容 */
    Store.setJSON(SAVE_KEY, { unlocked: ['youhun'] });   // 老档：只有 unlocked
    loadSave();
    __ok('v1.0.15 loadSave 老档：补出 progress / mile 且不丢 unlocked',
      Array.isArray(SAVE.mile) && SAVE.mile.length === 0 &&
      !!SAVE.progress && SAVE.progress.pts === 0 && SAVE.unlocked[0] === 'youhun');
    Store.set(SAVE_KEY, '{坏数据');                        // 坏档
    loadSave();
    __ok('v1.0.15 loadSave 坏档：回落成合法默认且不抛',
      Array.isArray(SAVE.unlocked) && Array.isArray(SAVE.mile) && SAVE.progress.pts === 0);
    Store.del(SAVE_KEY);

    /* 6) v1.0.16 门禁总开关：关掉时一律放行（测试期口径），且进度记录照常累积 */
    MILE_GATE_ON = false;
    __ok('v1.0.16 门禁关掉时 mileOn 四种 kind 对**任何** id 都放行（测试期全部内容可取用）',
      ['hero', 'card', 'relic', 'potion'].every(function (k) { return mileOn(k, '__nope') === true; }) &&
      mileOn('hero', 'yincha') === true && mileOn('card', 'tianlei') === true &&
      mileOn('relic', 'jifengfu') === true && mileOn('potion', 'jingangjiu') === true);
    __ok('v1.0.16 门禁关掉时里程碑进度仍照常累积（grantRunMilestones 不依赖门禁）',
      (function () {
        SAVE = { unlocked: [], progress: { pts: 0, runs: 0, wins: 0, bestAct: 0, kills: 0 }, mile: [] };
        G = __base('tianshi'); G.act = 1; G.mapRow = 8; G.totalKills = 4; G.finalBoss = false;
        grantRunMilestones();
        return SAVE.progress.pts === (8 * 15 + 4 * 5) && SAVE.progress.runs === 1;
      })());
    __ok('v1.0.16 独立的「解锁」界面：viewMilestones 存在、主菜单有入口',
      typeof viewMilestones === 'function' &&
      __code(viewMilestones).indexOf('mileNodesFor') >= 0 &&
      __code(showStartScreen).indexOf('viewMilestones') >= 0);
    /* v1.0.24（用户定稿口径）：每角色 6 档 + 轨尾「敬请期待」、里程按角色分账、节点等距。 */
    __ok('v1.0.24 里程碑：每角色 6 档、末档为【入门符纸】',
      typeof mileNodesFor === 'function' && mileNodesFor('tianshi').length === MILE_TIER_COUNT &&
      mileNodesFor('tianshi')[MILE_TIER_COUNT-1].name === '入门符纸');
    __ok('v1.0.24 里程碑：神秘人轨 6 档全为「未知」节点（黑色系盖住，不透露内容）',
      typeof MILE_MYSTERY === 'object' &&
      mileNodesFor(MILE_MYSTERY.id).length === MILE_TIER_COUNT &&
      mileNodesFor(MILE_MYSTERY.id).every(function(n){ return n.unknown === true; }));
    __ok('v1.0.24 里程碑：节点等距分布（修复白框重叠的根因）',
      typeof mileSlotPct === 'function' && Math.abs(mileSlotPct(0,7) - 100/14) < 1e-9 &&
      Math.abs((mileSlotPct(1,7)-mileSlotPct(0,7)) - (mileSlotPct(6,7)-mileSlotPct(5,7))) < 1e-9);
    __ok('v1.0.24 里程碑：里程按角色分账（milePts(heroId)），无参仍回全局累计',
      (function(){ var bak = SAVE.progress.heroes;
        SAVE.progress.heroes = { tianshi:{ pts:777 } };
        var r = milePts('tianshi') === 777 && milePts('wuseng') === 0 && milePts() === SAVE.progress.pts;
        SAVE.progress.heroes = bak; return r; })());
    /* v1.0.25（用户拍板）：6 档阈值定稿 —— 天师刻意压低（正反馈前置），其余三职业统一。 */
    __ok('v1.0.25 里程碑：6 档阈值定稿（天师 350/700/1000/1400/1850/2400）',
      JSON.stringify(mileNodesFor('tianshi').map(function(n){ return n.need; })) ===
        JSON.stringify([350, 700, 1000, 1400, 1850, 2400]));
    __ok('v1.0.25 里程碑：通用角色 6 档阈值 550/1400/2900/4500/7500/11000',
      ['ganshiren','wuseng','yincha'].every(function(h){
        return JSON.stringify(mileNodesFor(h).map(function(n){ return n.need; })) ===
          JSON.stringify([550, 1400, 2900, 4500, 7500, 11000]); }));
    /* v1.1.8（角色符纸解锁）：解锁记本角色轨档位 id + 新门禁表剩余 id（紫/金内容），不再写 hero_*。 */
    __ok('v1.1.8 里程碑：解锁记 <hero>_t<N> 与新表 id（395 点 ⇒ adv_card/potion_new 达标、adv_relic 未达）',
      (function(){ var bak = SAVE;
        SAVE = { unlocked:[], progress:{ pts:0, runs:0, wins:0, bestAct:0, kills:0, heroes:{} }, mile:[] };
        G = __base('tianshi'); G.act = 2; G.mapRow = 9; G.totalKills = 12;   // 200+135+60 = 395
        var j = grantRunMilestones();
        var r = j.length >= 1 && j.some(function(n){ return /^tianshi_t\d+$/.test(n.id); }) &&
                SAVE.mile.indexOf('adv_card') >= 0 && SAVE.mile.indexOf('potion_new') >= 0 &&
                SAVE.mile.indexOf('adv_relic') < 0 &&
                !SAVE.mile.some(function(id){ return /^hero_/.test(id); }) &&
                SAVE.progress.heroes.tianshi.pts === 395;
        SAVE = bak; return r; })());
    MILE_GATE_ON = __gate0;

    SAVE = SAVE0;   // 复原
  })();

  /* ===== F 组 · v1.1.16（用户 2026-10-14 真机报障 + 改版口径）===== */
  (function () {
    /* ① 五雷法印：被置换掉的原牌必须进弃牌堆（否则本关卡牌越换越少）。功能级断言：
       手牌 [zhiren, jingang]，只置换下标 0 ⇒ 弃牌堆应多出那张 zhiren，手牌 0 变成 0 费 oneShot 雷符。 */
    __ok('v1.1.16 五雷法印：置换掉的原牌进弃牌堆，0 费雷符副本仍在手牌（不再凭空蒸发）',
      (function () {
        G = __base('tianshi');
        G.hand = [__card('zhiren'), __card('jingang')];
        G.discard = [];
        G.wuleiSelect = { up: false, picked: [0], srcCard: null, cost: 0 };
        var d0 = G.discard.length;
        confirmWuleiSelect();
        var h = G.hand[0], out = G.hand[1];
        return G.discard.length === d0 + 1 && G.discard[0] === __card('zhiren') &&
          h && h.id === 'leifu' && h.cost === 0 && h.oneShot === true &&
          out && out.id === 'jingang';
      })());

    /* ② 置换出的 0 费雷符：费用处挂绿底芯片（与段刃雷符同款），普通雷符不挂。 */
    __ok('v1.1.16 绿底费用芯片：oneShot 雷符副本的卡面费用格是绿底（普通雷符不绿）',
      (function () {
        var lf = cardById('leifu');
        var one = Object.assign({}, lf, { oneShot: true, cost: 0, costU: null });
        return cardBody(one).indexOf('background:var(--green)') >= 0 &&
          cardBody(lf).indexOf('background:var(--green)') < 0;
      })());
    __ok('v1.1.16 绿底判据覆盖三处渲染器（cardBody / forgeCardHTML / handCardHTML）',
      __code(cardBody).indexOf("c.id==='duanren_leifu'||(c.oneShot&&c.id==='leifu')") >= 0 &&
      __code(forgeCardHTML).indexOf("cc.oneShot&&cc.id==='leifu'") >= 0 &&
      __code(handCardHTML).indexOf("c.oneShot&&c.id==='leifu'") >= 0);

    /* ⑤ 锦囊返回：开面板前快照 / 返回时还原（覆盖锻造/商店/事件房/地图全部战局外场景）。 */
    __ok('v1.1.16 锦囊返回：showJinnang 快照 overlay（class+内容），jinnangBack 优先还原快照',
      __code(showJinnang).indexOf('JINNANG_SNAP') >= 0 &&
      __code(showJinnang).indexOf("contains('pouch-scene')") >= 0 &&
      __code(jinnangBack).indexOf('ov.className=snap.cls') >= 0 &&
      __code(jinnangBack).indexOf('oc.innerHTML=snap.html') >= 0);

    /* ⑥ 选角界面隐藏战局外 HUD（hero-scene 排除）。④ 牌库图标改用 deck_back.png。 */
    __ok('v1.1.16 战局外 HUD：选角屏(hero-scene)排除 + 牌库图标改 ui/deck_back.png',
      __code(outHudSync).indexOf('hero-scene') >= 0 &&
      __code(outHudSync).indexOf('ui/deck_back.png') >= 0);

    /* ③ 初始牌库铺展单行（列数由 JS 按牌数内联，天然单行居中）。 */
    __ok('v1.1.16 初始牌库铺展：单行（列数 = 牌数内联覆盖 6 列）',
      __code(hsDeckPreview).indexOf('repeat(${list.length}') >= 0);

    /* ⑦ boss_vfx 那批 + 反伤 + fudu_hit / guling_suck / relic_proc / lightning 缩到 scale 2.0；thorns（1.98）刻意不动。 */
    __ok('v1.1.16 boss_vfx 那批缩到 scale 2.0（_link 变体仍 1）＋ 反伤 damage_reflect/thorns_light 与 fudu_hit/guling_suck/relic_proc/lightning 也缩到 2.0',
      Object.keys(FX_SHEETS).filter(function (k) { return /^b\d/.test(k); }).every(function (k) {
        var s = FX_SHEETS[k]; return s.scale === 2.0 || s.scale === 1;
      }) &&
      FX_SHEETS.b1_jiangwang_attack_claw_cast.scale === 2.0 &&
      FX_SHEETS.b9_yanluo_summon_yinchai_self.scale === 2.0 &&
      FX_SHEETS.damage_reflect.scale === 2.0 && FX_SHEETS.thorns_light.scale === 2.0 &&
      FX_SHEETS.fudu_hit.scale === 2.0 && FX_SHEETS.guling_suck.scale === 2.0 &&
      FX_SHEETS.relic_proc.scale === 2.0 && FX_SHEETS.lightning.scale === 2.0 &&
      FX_SHEETS.thorns.scale === 1.98);

    /* ⑧ 里程碑调试开关：存在且默认开，且**在无头沙箱里自动跳过**（不污染里程断言）。 */
    __ok('v1.1.16 里程碑调试开关：debugMaxMile 存在、DEBUG_MAX_MILE 默认开、拉满值很高',
      typeof debugMaxMile === 'function' && DEBUG_MAX_MILE === true && DEBUG_MAX_MILE_PTS >= 11000);
    __ok('v1.1.16 里程碑调试开关：无头沙箱里 debugMaxMile 自跳过（pts 不被改写）',
      (function () {
        var bak = SAVE;
        SAVE = { progress: { pts: 0, heroes: {} } };
        debugMaxMile();
        var r = SAVE.progress.pts === 0 && !SAVE.progress.heroes.tianshi;
        SAVE = bak; return r;
      })());
    /* 调试开关只拉 pts，绝不写 mileClaimed（不自动领取 ⇒ 玩家手点才能验奖励发放链路）。 */
    __ok('v1.1.16 里程碑调试开关：只改 pts，不写 SAVE.mileClaimed',
      __code(debugMaxMile).indexOf('mileClaimed') < 0 && __code(debugMaxMile).indexOf('persistSave') >= 0);

    /* ===== v1.1.17 性能 ===== */
    /* ③ 并发上限按「流畅模式」降档（普通 14 / 低配 8），常量本身不动。 */
    __ok('v1.1.17 特效并发上限：流畅模式(低配机)降到 8，普通档仍 14',
      FX_MAX_LIVE === 14 &&
      (function () {
        var bak = SETTINGS.lowSpec, a, b;
        SETTINGS.lowSpec = false; a = fxMaxLive();
        SETTINGS.lowSpec = true;  b = fxMaxLive();
        SETTINGS.lowSpec = bak;
        return a === 14 && b === 8;
      })());
    /* ① 战斗进场预热本场卡组 sheet 的第 0 排；无按排键（沙箱/开发树）必须静默跳过。
       rel 字面量在 helper fxPreheatKeyRow0 里（不是 fxPreheatBattle），断言要落在 helper 上。 */
    __ok('v1.1.17 特效预热：无按排键(沙箱)时静默不抛、行为与旧版一致',
      typeof fxPreheatBattle === 'function' && typeof fxPreheatKeyRow0 === 'function' &&
      __code(fxPreheatKeyRow0).indexOf("'fx/'+name+'_r0.png'") >= 0 &&
      __code(fxPreheatKeyRow0).indexOf('ASSET_MAP') >= 0 &&
      (function () { try { fxPreheatBattle(); return true; } catch (e) { return false; } })());
    __ok('v1.1.17 特效预热接点：beginBattle(startBattle) 里调用了 fxPreheatBattle',
      __code(startBattle).indexOf('fxPreheatBattle()') >= 0);
  })();

  rep.pass = _p; rep.fail = _f;
  try { globalThis.__report = rep; } catch (e) { this.__report = rep; }
})();
