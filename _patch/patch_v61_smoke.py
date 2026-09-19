# -*- coding: utf-8 -*-
# v0.61 冒烟：为批1 的 29 处改动补断言（B1/B2/B3/B4/B5/B6/B7/B8/B9/B11/B12 + B13/C1/C2）
import io, sys

P = r"C:\Users\HP\Desktop\志怪塔\_patch\smoke_runner.js"
s = io.open(P, 'r', encoding='utf-8').read()

ANCHOR1 = """  var __sil = function () {};"""
NEW1 = """  var __sil = function () {};
  var __gcInit = goldCompensation; // v0.61 B6：捕获金卡补偿初值（后续用例会改动这个全局）"""

ANCHOR2 = """  rep.pass = _p; rep.fail = _f;"""
BLOCK = r"""  /* ============ v0.61 批1 评审整改（B1~B12 + B13/C1/C2） ============ */
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
      floatMsg.toString().indexOf('textContent=msg') < 0, floatMsg.toString().slice(0, 90));
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

""" + ANCHOR2

for name, old, new in (('gcInit', ANCHOR1, NEW1), ('block', ANCHOR2, BLOCK)):
    n = s.count(old)
    if n != 1:
        print('ANCHOR %s FAIL: 匹配 %d 次' % (name, n)); sys.exit(1)
    s = s.replace(old, new, 1)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v61_smoke DONE')
