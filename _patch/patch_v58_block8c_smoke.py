# -*- coding: utf-8 -*-
# v0.58 Block8c 冒烟：更新过时断言 + 新增 B 列攻击牌断言
import io, sys, subprocess, tempfile, os

P = r"C:\Users\HP\Desktop\志怪塔\_patch\smoke_runner.js"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# 1) 铁布衫 0 费按列，移出「全英雄升级 0 费」清单
EDITS.append((
"""    var zeroUp = ['tiebushan', 'tongling', 'jingxin', 'xueji', 'yixing'];""",
"""    var zeroUp = ['tongling', 'jingxin', 'xueji', 'yixing']; // tiebushan 已按列取费（B 0 费不可升级）"""))

# 2) 噬魂术预览（武僧）→ 每层 2/3
EDITS.append((
"""    g = __base('wuseng'); g.enemies[0].curse = 2;
    __ok('噬魂术预览 武僧=基础诅咒×5', pv().d === 10, 'd=' + pv().d);
    g = __base('wuseng'); g.blockGainedTurn = 10; g.enemies[0].curse = 0;
    __ok('噬魂术预览 武僧=格挡加成5(无诅咒不落空)', pv().d === 5 && !pv().miss, JSON.stringify(pv()));""",
"""    g = __base('wuseng'); g.enemies[0].curse = 2;
    __ok('噬魂术预览 武僧=诅咒×2=4', pv().d === 4, 'd=' + pv().d);
    g = __base('wuseng'); g.blockGainedTurn = 10; g.enemies[0].curse = 0;
    __ok('噬魂术预览 武僧=格挡不参与伤害(无诅咒落空)', pv().miss === '无诅咒', JSON.stringify(pv()));"""))

# 3) 百鬼预览 B：全体 5 + 每 2 格挡 +1（6 格挡 → 8）
EDITS.append((
"""    g = __base('wuseng'); g.block = 6;
    __ok('百鬼预览 B=4+6/3=6', lv('baigui').d === 6, 'd=' + lv('baigui').d);""",
"""    g = __base('wuseng'); g.block = 6;
    __ok('百鬼预览 B=5+min(8,6/2)=8', lv('baigui').d === 8, 'd=' + lv('baigui').d);"""))

# 4) v0.56 噬魂术(武僧) 整块 → v0.58 新口径
EDITS.append((
"""  /* ============ v0.56 噬魂术(武僧) 每层 7→6，与天师统一为 5/6 ============ */
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
  })();""",
"""  /* ============ v0.58 噬魂术(武僧) 按《武僧版卡池.md》重做：每层 2/3 伤 + 每层 1/2 格挡 ============ */
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
    __ok('v0.58 铁布衫(天师) 1 费不可升级', cardCost(tb) === 1 && canUpgrade(tb) === false, 'cost=' + cardCost(tb));

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
  })();"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('SMOKE 断言已更新（Block8c）')
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, s.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
