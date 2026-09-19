# -*- coding: utf-8 -*-
# v0.61.10：冒烟对齐批2 新数值 + 补 8 条新断言的断言
import io, sys, subprocess, os

ROOT = r"C:\Users\HP\Desktop\志怪塔"
P = os.path.join(ROOT, '_patch', 'smoke_runner.js')
s = io.open(P, 'r', encoding='utf-8', newline='').read()
log = []

def sub(old, new, label, n=1):
    global s
    c = s.count(old)
    if c != n:
        print('ANCHOR FAIL [%s] 期望 %d 次，实为 %d' % (label, n, c)); sys.exit(1)
    s = s.replace(old, new)
    log.append(label)

# ---------- 1) 旧断言对齐新数值 ----------

# P6：赶尸人召唤纸人现在带被动 +1 寿命（原 dur 2 → 3）
sub("__ok('A#41 纸人 入召唤槽(计数1/持续2)', g.summonsMadeTurn === 1 && g.summons[0].type === 'zhiren' && g.summons[0].dur === 2, JSON.stringify(g.summons));",
    "__ok('A#41 纸人 入召唤槽(计数1/持续2+被动1=3)', g.summonsMadeTurn === 1 && g.summons[0].type === 'zhiren' && g.summons[0].dur === 3, JSON.stringify(g.summons));",
    'A#41 纸人 寿命 3')

# P2：血契·武僧 7 点格挡 → floor(7×0.6)=4 点生命
sub("    // #28 血契：1/0(U:0)，把当前格挡全部转化为生命\n"
    "    var xq = __card('xueqi');\n"
    "    g = __base('wuseng'); g.block = 7; g.hp = 40;\n"
    "    xq.eff(false, xq);\n"
    "    __ok('v0.58 B#28 血契 格挡 7 全转血（格挡清零）', g.block === 0 && g.hp === 47, 'block=' + g.block + ' hp=' + g.hp);",
    "    // #28 血契：1/0(U:0)，把当前格挡按 60% 转化为生命（v0.61.10 P2）\n"
    "    var xq = __card('xueqi');\n"
    "    g = __base('wuseng'); g.block = 7; g.hp = 40;\n"
    "    xq.eff(false, xq);\n"
    "    __ok('v0.58 B#28 血契 格挡 7 → floor(7×0.6)=4 血（格挡清零）', g.block === 0 && g.hp === 44, 'block=' + g.block + ' hp=' + g.hp);\n"
    "    // P2 边界：10 格挡 → 6 血（恰好整除）、1 格挡 → 0 血（floor 不吃亏血）\n"
    "    g = __base('wuseng'); g.block = 10; g.hp = 40; xq.eff(false, xq); var _hp10 = g.hp;\n"
    "    g = __base('wuseng'); g.block = 1; g.hp = 40; xq.eff(false, xq); var _hp1 = g.hp;\n"
    "    __ok('v0.61.10 P2 血契 10→6 / 1→0（floor 不产生零头血）', _hp10 === 46 && _hp1 === 40, _hp10 + '/' + _hp1);",
    'B#28 血契 60%')

# P3：咒雨·武僧 由「格挡转血」改为「格挡转伤害·逐点结算」
sub("    // #46 咒雨：0 费 / 格挡全转血 / 无伤害预览\n"
    "    g = __base('wuseng'); g.block = 12; g.hp = 40; c = __card('zhouyu'); c.eff(false, c);\n"
    "    __ok('v0.58 B#46 咒雨 12 格挡 → 12 生命且格挡清零', g.block === 0 && g.hp === 52, 'block=' + g.block + ' hp=' + g.hp);",
    "    // #46 咒雨：0 费 / 格挡全转伤害·**逐点结算** / 无伤害预览（v0.61.10 P3 改版）\n"
    "    g = __base('wuseng'); g.block = 12; g.hp = 40; var _hp0 = g.enemies.map(function (e) { return e.hp; });\n"
    "    c = __card('zhouyu'); c.eff(false, c);\n"
    "    __ok('v0.61.10 P3 咒雨(武僧) 12 格挡 → 12 连击 / 合计 12 伤害且格挡清零',\n"
    "      g.block === 0 && g.hp === 40 &&\n"
    "      g.enemies.reduce(function (a, e, i) { return a + (_hp0[i] - e.hp); }, 0) === 12,\n"
    "      'block=' + g.block + ' hp=' + g.hp + ' dmg=' + g.enemies.reduce(function (a, e, i) { return a + (_hp0[i] - e.hp); }, 0));\n"
    "    // 逐点结算必须「跳过整张牌口径的加成」：+2 攻击力只折成 2 点，不是每击 +2（12→14，而非 36）\n"
    "    g = __base('wuseng'); g.block = 12; g.attackBuff = 2;\n"
    "    var _hpB = g.enemies.map(function (e) { return e.hp; });\n"
    "    c = __card('zhouyu'); c.eff(false, c);\n"
    "    __ok('v0.61.10 P3 咒雨(武僧) 攻击力加成折算成点数、不逐击翻倍',\n"
    "      g.enemies.reduce(function (a, e, i) { return a + (_hpB[i] - e.hp); }, 0) === 14,\n"
    "      'dmg=' + g.enemies.reduce(function (a, e, i) { return a + (_hpB[i] - e.hp); }, 0));\n"
    "    // 虚弱 0.75 同样折算在点数上 —— 关键是不能因为 floor(1×0.75)=0 而整场打 0 伤\n"
    "    g = __base('wuseng'); g.block = 12; g.weak = 3;\n"
    "    var _hpW = g.enemies.map(function (e) { return e.hp; });\n"
    "    c = __card('zhouyu'); c.eff(false, c);\n"
    "    __ok('v0.61.10 P3 咒雨(武僧) 虚弱下打成 floor(12×0.75)=9 点（不是 0）',\n"
    "      g.enemies.reduce(function (a, e, i) { return a + (_hpW[i] - e.hp); }, 0) === 9,\n"
    "      'dmg=' + g.enemies.reduce(function (a, e, i) { return a + (_hpW[i] - e.hp); }, 0));\n"
    "    // 逐点结算必须**保留逐击反应**：反震 tier1 每次受击反弹 3 → 12 击共 36 点反噬（用户点名的口径）。\n"
    "    // 两只敌人都挂上词缀，点数落谁身上都触发 → 结果确定。\n"
    "    g = __base('wuseng'); g.block = 12; g.hp = 80; g.maxHp = 80;\n"
    "    g.enemies.forEach(function (e) { e.affixes = [{ id: 'fanzhen', tier: 1 }]; });\n"
    "    c = __card('zhouyu'); c.eff(false, c);\n"
    "    __ok('v0.61.10 P3 咒雨(武僧) 逐点触发反震：12 击 × tier1(3) = 36 点反噬', g.hp === 44, 'hp=' + g.hp);\n"
    "    // 无格挡时不空转、不报错\n"
    "    g = __base('wuseng'); g.block = 0; c = __card('zhouyu'); c.eff(false, c);\n"
    "    __ok('v0.61.10 P3 咒雨(武僧) 无格挡时安全返回', g.block === 0 && g.hp === 60);",
    'B#46 咒雨 逐点结算')

# P5：天师列 蚀魂咒 3→4 伤；钟馗镇魂 15→18 伤
sub("    __ok('v0.60 D#11 蚀魂咒 3 伤 + 2 层诅咒',\n"
    "      g.enemies[0].hp === 497 && g.enemies[0].curse === 2,",
    "    __ok('v0.60 D#11 蚀魂咒 4 伤 + 2 层诅咒（v0.61.10 P5：3→4）',\n"
    "      g.enemies[0].hp === 496 && g.enemies[0].curse === 2,",
    'D#11 蚀魂咒 4 伤')

sub("    __ok('v0.60 D#14 钟馗镇魂 15+2×5=25 伤且清空诅咒',\n"
    "      g.enemies[0].hp === 475 && g.enemies[0].curse === 0 && g.enemies[0].seal === true,",
    "    __ok('v0.60 D#14 钟馗镇魂 18+2×5=28 伤且清空诅咒（v0.61.10 P5：15→18）',\n"
    "      g.enemies[0].hp === 472 && g.enemies[0].curse === 0 && g.enemies[0].seal === true,",
    'D#14 钟馗镇魂 18 伤')

# P1：佛渡 1 费 → 0 费（两张 48 卡费用表各一处）
sub("jingji: [1, 1], fodu: [1, 1], tongpi: [2, 2],",
    "jingji: [1, 1], fodu: [0, 0], tongpi: [2, 2],",
    '48 卡费用表 fodu 0/0', n=2)

# ---------- 2) 追加批2 新断言 ----------
NEW = r"""
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
    var LIFE = { zhiren: 2, xiaogui: 2, wutong: 3, yinbing: 3 };
    var badLife = [];
    Object.keys(LIFE).forEach(function (id) {
      g = __base('ganshiren');
      var cc = __card(id); cc.eff(false, cc);
      var sm = g.summons[g.summons.length - 1];
      if (!sm || sm.dur !== LIFE[id] + 1) badLife.push('A ' + id + ':' + (sm && sm.dur));
      g = __base('wuseng');
      cc = __card(id); cc.eff(false, cc);
      sm = g.summons[g.summons.length - 1];
      if (!sm || sm.dur !== LIFE[id]) badLife.push('B ' + id + ':' + (sm && sm.dur));
    });
    __ok('v0.61.10 P6 赶尸人 纸人/小鬼/五通神/阴兵 寿命 +1，其他英雄不加', badLife.length === 0, badLife.join(' '));

    g = __base('ganshiren'); g.尸气 = 10;
    var sw = __card('shi_wang'); sw.eff(false, sw);
    var sw2 = g.summons[g.summons.length - 1];
    __ok('v0.61.10 P6 尸王 不受被动影响（不是「役使」）', sw2 && sw2.dur === 3, 'dur=' + (sw2 && sw2.dur));

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
    g.drawPile = [__card('zhongkui')];        // 3 费金卡，好验证 -1
    while (G.drawPile.length < 3) G.drawPile.push(__card('leifu'));
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

  rep.pass = _p; rep.fail = _f;
"""
sub("  rep.pass = _p; rep.fail = _f;\n", NEW, 'append v0.61.10 tests')

P2 = P + '.check.js'
io.open(P2, 'w', encoding='utf-8', newline='').write(s)
r = subprocess.run(['node', '--check', P2], capture_output=True, text=True)
if r.returncode != 0:
    os.remove(P2); print('NODE CHECK FAIL'); print(r.stdout, r.stderr); sys.exit(1)
os.replace(P2, P)
print('OK smoke_runner.js')
for i, x in enumerate(log, 1): print('%2d. %s' % (i, x))
