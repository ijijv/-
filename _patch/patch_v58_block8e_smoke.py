# -*- coding: utf-8 -*-
# v0.58 Block8e 冒烟：焚符 B 数值更新（6→8）+ 功能牌 24~40 B 列新断言
import io, sys, subprocess, tempfile, os

P = r"C:\Users\HP\Desktop\志怪塔\_patch\smoke_runner.js"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# ---------- 更新：焚符 B 由每张 3 改 4（弃 2 张 → 8 格挡） ----------
EDITS.append((
"""    __ok('B#34 焚符 弃2张→6格挡', (g.blockGainedTurn || 0) === 6, 'blockTurn=' + g.blockGainedTurn);""",
"""    __ok('B#34 焚符 弃2张→8格挡(每张4)', (g.blockGainedTurn || 0) === 8, 'blockTurn=' + g.blockGainedTurn);"""))

# ---------- 新增：功能牌 24~40 B 列断言 ----------
ANCHOR = """    __ok('v0.58 钟馗镇魂(武僧) 卡面门槛 12/15/21', zk.t(false).indexOf('12/15/21') >= 0, zk.t(false));
  })();"""
NEW = ANCHOR + """

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

    // #28 血契：1/0(U:0)，把当前格挡全部转化为生命
    var xq = __card('xueqi');
    g = __base('wuseng'); g.block = 7; g.hp = 40;
    xq.eff(false, xq);
    __ok('v0.58 B#28 血契 格挡 7 全转血（格挡清零）', g.block === 0 && g.hp === 47, 'block=' + g.block + ' hp=' + g.hp);
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
  })();"""
EDITS.append((ANCHOR, NEW))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('SMOKE 断言已更新（Block8e）')
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, s.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
