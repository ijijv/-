# -*- coding: utf-8 -*-
"""v0.61.36 冒烟断言：武僧（B 列）8 条改动的旧值改新 + 新增反误伤

旧值改动 11 处（都是「武僧列」的断言，A/C/D 的断言一律不动）：
  荆棘符 反弹 4/5→3/4 · 佛渡 升级 +4→+5 · 舍身 3/5→4/4 · 燃血术 失 6→8
  附灵术 升级 1 个 4→3 与 2 费→2/1 · 五通神 当回合 5→7 · 移形换影 武僧退出「升级 0 费」名单
新增：荆棘符/焚符(升级)/佛渡逐列/舍身逐列/五通神 预格挡/附灵术 A 列/移形换影 canUpgrade 等
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, '_patch', 'smoke_runner.js')

raw = io.open(S, encoding='utf-8').read()
nl = '\r\n' if '\r\n' in raw else '\n'
body = raw.replace('\r\n', '\n')
errs = []


def rep(old, new, tag):
    global body
    n = body.count(old)
    if n != 1:
        errs.append('[%s] 命中 %d 次，期望 1 次' % (tag, n))
        return
    body = body.replace(old, new, 1)


# ── 1. 荆棘符 4/7 + 反弹 3/4（把 thorns 从「只显示」升成真断言）──
rep("""    __ok('B#19 荆棘符 4/7 + 反弹 4/5', blk('jingji') === 4 && blk('jingji', true) === 7,
      'blk=' + blk('jingji') + '/' + blk('jingji', true) + ' 反弹=' + (function () { var g2 = __base('wuseng'); var cc = __card('jingji'); cc.eff(false, cc); return g2.thorns; })() +
      '/' + (function () { var g2 = __base('wuseng'); var cc = Object.assign({}, __card('jingji'), { up: true }); cc.eff(true, cc); return g2.thorns; })());
""",
    """    (function () {
      var j0 = (function () { var g2 = __base('wuseng'); var cc = __card('jingji'); cc.eff(false, cc); return g2.thorns; })();
      var j1 = (function () { var g2 = __base('wuseng'); var cc = Object.assign({}, __card('jingji'), { up: true }); cc.eff(true, cc); return g2.thorns; })();
      // v0.61.36：武僧列反弹 4/5 → 3/4（格挡 4/7 不动）
      __ok('B#19 荆棘符 4/7 + 反弹 3/4', blk('jingji') === 4 && blk('jingji', true) === 7 && j0 === 3 && j1 === 4,
        'blk=' + blk('jingji') + '/' + blk('jingji', true) + ' 反弹=' + j0 + '/' + j1);
    })();
""",
    '荆棘符 4/7')

# ── 2. 荆棘符 thorns 实测 4 → 3 ──
rep("""    __ok('B#19 荆棘符 thorns>=4', (g.thorns || 0) >= 4, 'thorns=' + g.thorns);
""",
    """    __ok('B#19 荆棘符 thorns=3（v0.61.36 武僧列 4 → 3）', (g.thorns || 0) === 3, 'thorns=' + g.thorns);
""",
    '荆棘符 thorns')

# ── 3. 移形换影：武僧退出「升级 0 费」名单，与天师同列 1/1 ──
rep("""    var zeroUp = ['tongling', 'jingxin', 'xueji']; // tiebushan 已按列取费（B 0 费不可升级）；yixing 天师列 v0.61.35 取消 (U:0)，另测
""",
    """    var zeroUp = ['tongling', 'jingxin', 'xueji']; // tiebushan 已按列取费（B 0 费不可升级）；yixing 按列分叉（B/D 1/1），另测
""",
    'zeroUp 注释')
rep("""    // v0.61.35：移形换影「升级 0 费」只对 A/B/C 三列有效；天师列按新卡池文件改为 1/1
    ['ganshiren', 'wuseng', 'yincha'].forEach(function (h) {
      __base(h); var cy = Object.assign({}, __card('yixing'), { up: true });
      __ok('移形换影 ' + h + ' 升级 0 费（v0.61.35 仅天师列取消）',
        cardCost(cy) === 0 && effectiveCost(cy) === 0, 'cost=' + cardCost(cy));
    });
    (function () {
      __base('tianshi'); var cy = Object.assign({}, __card('yixing'), { up: true });
      __ok('移形换影 天师 升级仍 1 费（v0.61.35 取消 (U:0)）',
        cardCost(cy) === 1 && effectiveCost(cy) === 1, 'cost=' + cardCost(cy));
    })();
""",
    """    // v0.61.35 天师列、v0.61.36 武僧列：移形换影取消 (U:0) → 1/1；只剩 A/C 两列仍 1/0
    ['ganshiren', 'yincha'].forEach(function (h) {
      __base(h); var cy = Object.assign({}, __card('yixing'), { up: true });
      __ok('移形换影 ' + h + ' 升级 0 费（A/C 两列仍 1/0）',
        cardCost(cy) === 0 && effectiveCost(cy) === 0, 'cost=' + cardCost(cy));
    });
    ['tianshi', 'wuseng'].forEach(function (h) {
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
""",
    '移形换影 分列')

# ── 4. 五通神(武僧) 当回合 5 → 7 ──
rep("""    // 武僧：基础 1 点（卡）+ 首次触发 4 点（召唤）= 当回合 5 格挡
    g = __base('wuseng'); G.block = 0; c = __card('wutong'); c.eff(false, c);
    __ok('v0.58 五通神(武僧) 当回合 1+4=5 格挡', g.block === 5, 'block=' + g.block);
""",
    """    // 武僧：基础 1 点（卡）+ 首次触发 6 点（召唤）= 当回合 7 格挡（v0.61.36：5 → 7）
    g = __base('wuseng'); G.block = 0; c = __card('wutong'); c.eff(false, c);
    __ok('v0.58 五通神(武僧) 当回合 1+6=7 格挡（v0.61.36）', g.block === 7, 'block=' + g.block);
    // ⚠️ 隐式镜像：顶栏「下回合预格挡」走的是 summonTurnBlock，不走 eff —— 不同步就会两处不一致
    __ok('v0.61.36 五通神(武僧) summonTurnBlock=6 且顶栏预格挡=6（与 eff 同步）',
      summonTurnBlock(g.summons[0]) === 6 && preBlockNextTurn() === 6,
      'stb=' + summonTurnBlock(g.summons[0]) + ' pre=' + preBlockNextTurn());
""",
    '五通神 武僧')

# ── 5. 舍身 3/5 → 4/4 ──
rep("""    // #25 舍身：3/5 格挡
""",
    """    // #25 舍身：4 固定格挡（v0.61.36 武僧列 3/5 → 4/4，升级不再涨）
""",
    '舍身 注释')
rep("""    __ok('v0.58 B#25 舍身 3/5 格挡', s3 === 3 && g.block === 5, s3 + '/' + g.block);
""",
    """    __ok('v0.58 B#25 舍身 4/4 格挡（v0.61.36：3/5 → 4 固定）', s3 === 4 && g.block === 4, s3 + '/' + g.block);
""",
    '舍身 值')

# ── 6. 燃血术 失 6 → 8 ──
rep("""    // #31 燃血术：B 失去 6
    g = __base('wuseng'); cc = __card('ranxue'); cc.eff(false, cc);
    __ok('v0.58 B#31 燃血术 失去 6 点生命', g.hp === 54 && g.energy === 11, 'hp=' + g.hp + ' energy=' + g.energy);
    __ok('v0.58 B#31 燃血术 卡面写 6', __card('ranxue').t(false).indexOf('失去 6 点生命') >= 0, __card('ranxue').t(false));
""",
    """    // #31 燃血术：B 失去 8（v0.61.36：6 → 8，两档同值；+2 符文不动）
    g = __base('wuseng'); cc = __card('ranxue'); cc.eff(false, cc);
    __ok('v0.58 B#31 燃血术 失去 8 点生命', g.hp === 52 && g.energy === 11, 'hp=' + g.hp + ' energy=' + g.energy);
    __ok('v0.58 B#31 燃血术 卡面写 8', __card('ranxue').t(false).indexOf('失去 8 点生命') >= 0, __card('ranxue').t(false));
""",
    '燃血术 武僧')

# ── 7. 焚符(武僧 升级) 每张 4 → 5 ──
rep("""    g = __base('wuseng'); g.hand = [__card('leifu'), __card('leifu'), __card('leifu')];
    c = __card('fenfu'); c.eff(false, c); g.discardSelect.picked = [0, 2]; confirmDiscardSelect();
    __ok('B#34 焚符 弃2张→8格挡(每张4)', (g.blockGainedTurn || 0) === 8, 'blockTurn=' + g.blockGainedTurn);
""",
    """    g = __base('wuseng'); g.hand = [__card('leifu'), __card('leifu'), __card('leifu')];
    c = __card('fenfu'); c.eff(false, c); g.discardSelect.picked = [0, 2]; confirmDiscardSelect();
    __ok('B#34 焚符 弃2张→8格挡(每张4)', (g.blockGainedTurn || 0) === 8, 'blockTurn=' + g.blockGainedTurn);

    // v0.61.36：武僧列升级档 6 → 5（未升级 4 不动，上面那条即是）
    g = __base('wuseng'); g.hand = [__card('leifu'), __card('leifu'), __card('leifu')];
    c = Object.assign({}, __card('fenfu'), { up: true }); c.eff(true, c); g.discardSelect.picked = [0, 2]; confirmDiscardSelect();
    __ok('v0.61.36 B#34 焚符(升级) 弃2张→10格挡(每张5)', (g.blockGainedTurn || 0) === 10, 'blockTurn=' + g.blockGainedTurn);
""",
    '焚符 升级')

# ── 8. 附灵术 升级 1 个 →4 改 →3 ──
rep("""    __ok('v0.58 B#39 附灵术 2 个→6 / 升级 1 个→4', fl3 === 6 && g.block === 4, fl3 + '/' + g.block);
""",
    """    __ok('v0.58 B#39 附灵术 2 个→6 / 升级 1 个→3（v0.61.36：每触发 1 个固定 3）', fl3 === 6 && g.block === 3, fl3 + '/' + g.block);
""",
    '附灵术 数值')

# ── 9. 附灵术(武僧) 2 费 → 2/1 费 ──
rep("""    g = __base('wuseng');
    __ok('#39 附灵术(武僧) 2 费 + 非消耗牌',
      cardCost(fl) === 2 && isOneUse(fl) === false, 'cost=' + cardCost(fl) + ' oneUse=' + isOneUse(fl));
""",
    """    g = __base('wuseng');
    var flB = Object.assign({}, __card('fuling'), { up: true }); // 不改共享卡对象
    __ok('#39 附灵术(武僧) 2 费 / 升级 1 费 + 非消耗牌（v0.61.36：2 → 2/1）',
      cardCost(fl) === 2 && cardCost(flB) === 1 && isOneUse(fl) === false,
      'cost=' + cardCost(fl) + ' up=' + cardCost(flB) + ' oneUse=' + isOneUse(fl));
""",
    '附灵术 武僧费用')

# ── 10. 佛渡 升级附加：武僧 4 → 5 ──
rep("""    __ok('v0.61.35 佛渡 升级附加：天师 5 格挡 / 阴差 3 格挡 / 武僧 4 格挡 / 赶尸人 2 尸气',
      _fdT.indexOf('5 点格挡') >= 0 && _fdC.indexOf('3 点格挡') >= 0 &&
      _fdB.indexOf('4 点格挡') >= 0 && _fdA.indexOf('2 点【尸气】') >= 0,
""",
    """    __ok('v0.61.35/36 佛渡 升级附加：天师 5 格挡 / 阴差 3 格挡 / 武僧 5 格挡 / 赶尸人 2 尸气',
      _fdT.indexOf('5 点格挡') >= 0 && _fdC.indexOf('3 点格挡') >= 0 &&
      _fdB.indexOf('5 点格挡') >= 0 && _fdA.indexOf('2 点【尸气】') >= 0,
""",
    '佛渡 文案列')

# ── 11. 燃血术 其余三列：B 6/6 → 8/8 ──
rep("""    __ok('v0.61.35 燃血术 其余三列各自不变（A 4/4、B 6/6、C 4/6）',
      _rxA[0].indexOf('失去 4 点生命') >= 0 && _rxA[1].indexOf('失去 4 点生命') >= 0 &&
      _rxB[0].indexOf('失去 6 点生命') >= 0 && _rxB[1].indexOf('失去 6 点生命') >= 0 &&
      _rxC[0].indexOf('失去 4 点生命') >= 0 && _rxC[1].indexOf('失去 6 点生命') >= 0,
""",
    """    __ok('v0.61.35 燃血术 三列各自不变（A 4/4、B 8/8、C 4/6；B 于 v0.61.36 改）',
      _rxA[0].indexOf('失去 4 点生命') >= 0 && _rxA[1].indexOf('失去 4 点生命') >= 0 &&
      _rxB[0].indexOf('失去 8 点生命') >= 0 && _rxB[1].indexOf('失去 8 点生命') >= 0 &&
      _rxC[0].indexOf('失去 4 点生命') >= 0 && _rxC[1].indexOf('失去 6 点生命') >= 0,
""",
    '燃血术 其余列')

# ── 12. 新增：v0.61.36 武僧 8 条的反误伤块 ──
rep("""    /* —— 卡面预伤害（诅咒/格挡浮动牌恒定显示） —— */
""",
    """    /* —— v0.61.36 武僧（B 列 / 苦僧）8 条改动的反误伤核对 ——
       本批所有改动都写成 `G.hero==='wuseng'` 分叉或按列常量，A/C/D 三列应逐字不变；
       这里把「没被动过」钉死，免得下次谁顺手把 else 兜底改了没人发现。 */
    (function () {
      // 荆棘符：A 反弹 6/4（本批只动武僧），C 走 hitHeal、D 走 hitCurse —— thorns 都不该有值
      var jA0 = (function () { var g2 = __base('ganshiren'); var cc = __card('jingji'); cc.eff(false, cc); return g2.thorns; })();
      var jA1 = (function () { var g2 = __base('ganshiren'); var cc = Object.assign({}, __card('jingji'), { up: true }); cc.eff(true, cc); return g2.thorns; })();
      var jC = (function () { var g2 = __base('yincha'); var cc = __card('jingji'); cc.eff(false, cc); return { t: g2.thorns, h: g2.hitHeal }; })();
      var jD = (function () { var g2 = __base('tianshi'); var cc = __card('jingji'); cc.eff(false, cc); return { t: g2.thorns, c: g2.hitCurse }; })();
      __ok('v0.61.36 反误伤 荆棘符 赶尸人仍反弹 6/4、阴差仍 hitHeal=2、天师仍 hitCurse=1',
        jA0 === 6 && jA1 === 4 && jC.h === 2 && !jC.t && jD.c === 1 && !jD.t,
        'A=' + jA0 + '/' + jA1 + ' C=' + jC.h + ' D=' + jD.c);

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
      __ok('v0.61.36 反误伤 五通神 立即格挡：武僧 7 / 天师 6 / 阴差 0 / 赶尸人 0',
        wtBlock('wuseng', false) === 7 && wtBlock('tianshi', false) === 6 &&
        wtBlock('yincha', false) === 0 && wtBlock('ganshiren', false) === 0,
        [wtBlock('wuseng', false), wtBlock('tianshi', false), wtBlock('yincha', false), wtBlock('ganshiren', false)].join('/'));
      // 五通神「每回合开始」值：武僧 6（本批）／天师 6
      var wtU = function (h) {
        var g2 = __base(h); var cc = Object.assign({}, __card('wutong'), { up: true }); cc.eff(true, cc);
        return summonTurnBlock(g2.summons[0]);
      };
      __ok('v0.61.36 五通神 每回合开始格挡：武僧 6（4 → 6）/ 天师 6（v0.61.35 4 → 6）',
        wtU('wuseng') === 6 && wtU('tianshi') === 6, 'B=' + wtU('wuseng') + ' D=' + wtU('tianshi'));
    })();

    /* —— 卡面预伤害（诅咒/格挡浮动牌恒定显示） —— */
""",
    'v0.61.36 反误伤块')

if errs:
    print('=== 锚点校验失败，未写入任何文件 ===')
    for e in errs:
        print(' ✗', e)
    sys.exit(1)

io.open(S, 'w', encoding='utf-8', newline='').write(body.replace('\n', nl))
print('OK smoke_runner.js %d 字符' % len(body))