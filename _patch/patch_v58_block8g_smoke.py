# -*- coding: utf-8 -*-
# v0.58 Block8g 冒烟：五通神(武僧) 数值更新 + 召唤牌 41~48 B 列新断言
import io, sys, subprocess, tempfile, os

P = r"C:\Users\HP\Desktop\志怪塔\_patch\smoke_runner.js"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

EDITS.append((
"""    // 武僧：立即 4 点（卡）+ 首次触发 3 点（召唤）= 当回合 7 格挡
    g = __base('wuseng'); G.block = 0; c = __card('wutong'); c.eff(false, c);
    __ok('v0.51 五通神(武僧) 当回合 +7 格挡', g.block === 7, 'block=' + g.block);""",
"""    // 武僧：基础 1 点（卡）+ 首次触发 4 点（召唤）= 当回合 5 格挡
    g = __base('wuseng'); G.block = 0; c = __card('wutong'); c.eff(false, c);
    __ok('v0.58 五通神(武僧) 当回合 1+4=5 格挡', g.block === 5, 'block=' + g.block);"""))

NEWBLOCK = """  /* ============ v0.58 武僧召唤牌（41~48）按《武僧版卡池.md》重做 ============ */
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

    // #46 咒雨：0 费 / 格挡全转血 / 无伤害预览
    g = __base('wuseng'); g.block = 12; g.hp = 40; c = __card('zhouyu'); c.eff(false, c);
    __ok('v0.58 B#46 咒雨 12 格挡 → 12 生命且格挡清零', g.block === 0 && g.hp === 52, 'block=' + g.block + ' hp=' + g.hp);
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
    __ok('v0.58 B#42 咒印 攻击牌吸血（雷符 3 伤 → 回 3 血）',
      g.hp === 43 && g.enemies[0].hp === 297 && g.zhouhunSteal === 0,
      'hp=' + g.hp + ' ehp=' + g.enemies[0].hp + ' steal=' + g.zhouhunSteal);
    __ok('v0.58 B#42 咒印 武僧视为消耗牌、赶尸人不', isOneUse(__card('zhouyin')) === true &&
      (function () { __base('ganshiren'); return isOneUse(__card('zhouyin')); })() === false);
  })();

  rep.pass = _p; rep.fail = _f;"""

EDITS.append(("""  rep.pass = _p; rep.fail = _f;""", NEWBLOCK))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('SMOKE 断言已更新（Block8g）')
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, s.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
