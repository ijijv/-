# -*- coding: utf-8 -*-
r"""
v0.61.32 —— 冒烟：更新旧的意图映射断言 + 新增 32 条接线的断言组

【为什么必须改旧断言】v0.61.25 那条「15 种敌人出招各有其声」把
    weak→enemy_debuff / gouhun→enemy_debuff / yehuo→enemy_buff_self
写死进了 IMAP。本批按素材清单.md 把这三种拆成专属键（kw_weak / kw_gouhun / boss_yehuo），
所以那条断言**必须**跟着改 —— 它不是「被我改坏了」，是它 pin 的正是本批要改的行为。
顺带把 jiming（判官王记账，v0.61.25 时整段静默、根本没进 IMAP）补进去，15 种变 16 种。

【新增断言组的设计口径】
  · 先验两张表的**自洽性**（卡 id 真不真、键名真不真）—— 手写 28 条映射，写错一个 id 就是
    「永远不响」，而且不会抛错，只能靠这条断言抓。
  · 再逐个收口点验**触发**，并尽量验**不触发**的边界（血怒满层不响、怨气满 3 张不响、
    格挡没打光不响碎盾、灵化弹开时不响成功音）—— 只验「响了」会放过「响错时候」。
  · 用 __rec() 把 sfx 换成记录器，只看调用序列，不看真实出声（VM 里没有 WebAudio）。
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
RUNNER = os.path.join(HERE, 'smoke_runner.js')

# —— 1) 旧断言：IMAP 更新 + 名字里的「15 种」→「16 种」 ——
A1 = """      var IMAP = { attack: 'enemy_attack', multi: 'enemy_multi', charge: 'enemy_charge', block: 'enemy_block',
                   heal: 'enemy_heal', strength: 'enemy_strength', summon: 'enemy_summon', weak: 'enemy_debuff',
                   gouhun: 'enemy_debuff', discard: 'enemy_debuff', burn: 'enemy_debuff', wangyou: 'enemy_debuff',
                   yehuo: 'enemy_buff_self', qingsuan: 'enemy_qingsuan', dormant: 'enemy_dormant' };
"""
N1 = """      /* v0.61.32：weak / gouhun / yehuo 按素材清单.md 拆成专属键；
         jiming（判官王生死簿记账）在 v0.61.25 时整段静默、根本没进这张表，一并补上。 */
      var IMAP = { attack: 'enemy_attack', multi: 'enemy_multi', charge: 'enemy_charge', block: 'enemy_block',
                   heal: 'enemy_heal', strength: 'enemy_strength', summon: 'enemy_summon', weak: 'kw_weak',
                   gouhun: 'kw_gouhun', discard: 'enemy_debuff', burn: 'enemy_debuff', wangyou: 'enemy_debuff',
                   yehuo: 'boss_yehuo', jiming: 'boss_ledger', qingsuan: 'enemy_qingsuan', dormant: 'enemy_dormant' };
"""
A2 = "      __ok('v0.61.25 接线·15 种敌人出招各有其声', missing.length === 0, missing.join(' '));"
N2 = "      __ok('v0.61.32 接线·16 种敌人出招各有其声（v0.61.32 拆键后）', missing.length === 0, missing.join(' '));"

# —— 2) 新增 v0.61.32 断言组，插在收尾之前 ——
A3 = "  rep.pass = _p; rep.fail = _f;"
N3 = """  /* ================= v0.61.32：32 条 ⏳ 待接线音效全部接线 ================= */
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
    got = __rec(function () { unlockBestiary('youhun'); });
    __ok('v0.61.32 UI·图鉴收录新条目 → ui_unlock', got.indexOf('ui_unlock') >= 0, got.join(','));
    got = __rec(function () { showOverlay('<p>x</p>', true); });
    __ok('v0.61.32 UI·面板开 → ui_panel', got.indexOf('ui_panel') >= 0, got.join(','));
    got = __rec(function () { hideOverlay(); });
    __ok('v0.61.32 UI·面板合 → ui_panel', got.indexOf('ui_panel') >= 0, got.join(','));
    got = __rec(function () { G = __base('ganshiren'); G.endless = true; G.endlessFloor = 2; nextEndlessLap(); });
    __ok('v0.61.32 UI·无尽攀塔过渡 → ui_endless', got.indexOf('ui_endless') >= 0, got.join(','));
  })();

  rep.pass = _p; rep.fail = _f;"""

EDITS = [(RUNNER, A1, N1), (RUNNER, A2, N2), (RUNNER, A3, N3)]


def main():
    if 'v0.61.32 接线·16 种敌人出招各有其声' in io.open(RUNNER, encoding='utf-8').read():
        print('SKIP 已改过')
        return 0
    cache, bad = {}, []
    for path, a, b in EDITS:
        if path not in cache:
            cache[path] = io.open(path, encoding='utf-8', newline='').read()
        raw = cache[path]
        nl = '\r\n' if '\r\n' in raw else '\n'
        a2, b2 = a.replace('\n', nl), b.replace('\n', nl)
        n = raw.count(a2)
        if n != 1:
            bad.append((os.path.relpath(path, ROOT), n, a.split('\n')[0][:70]))
            continue
        cache[path] = raw.replace(a2, b2, 1)
    if bad:
        print('FAIL 锚点不唯一/缺失，整体未落盘：')
        for f, n, s in bad:
            print('  [%s] count=%d  %r' % (f, n, s))
        return 1
    for path, s in cache.items():
        io.open(path, 'w', encoding='utf-8', newline='').write(s)
        print('OK %s' % os.path.relpath(path, ROOT))
    print('OK 共落地 %d 处' % len(EDITS))
    return 0


if __name__ == '__main__':
    sys.exit(main())