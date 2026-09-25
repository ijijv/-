# -*- coding: utf-8 -*-
"""v0.61.39 · 冒烟：重钉 27 条被 C 列重做打翻的旧断言 + 新增 21 条（含三个 bug 的行为对拍）。

重钉原则：每一条新数值都先回《阴差版卡池 - 副本.md》核过，不是「代码现在吐什么就钉什么」。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, '_patch', 'smoke_runner.js')

raw = io.open(S, encoding='utf-8').read()
nl = '\r\n' if '\r\n' in raw else '\n'
body = raw.replace('\r\n', '\n')

errs = []


def ed(old, new, label, n=1):
    global body
    c = body.count(old)
    if c != n:
        errs.append('%s —— 锚点命中 %d 次（期望 %d）' % (label, c, n))
    body = body.replace(old, new)


# ═════════ 血祭：阴差阈值 每失 2 → 每失 4 ═════════
ed("    var expect = { ganshiren: 3, wuseng: 2, yincha: 3, tianshi: 4 };",
   "    var expect = { ganshiren: 3, wuseng: 2, yincha: 4, tianshi: 4 };",
   '血祭 expect')
ed("      yincha: function () { G.hpLostTurn = 7; },",
   "      yincha: function () { G.hpLostTurn = 16; },   // v0.61.39 阴差列：每失 2 → 每失 4；16/4=4（同时压到上限 +4）",
   '血祭 yincha 用量')

# ═════════ 移形换影：阴差也取消 (U:0) ═════════
ed("    // v0.61.35 天师列、v0.61.36 武僧列、v0.61.37 赶尸人列：移形换影取消 (U:0) → 1/1；只剩 C 列仍 1/0\n"
   "    ['yincha'].forEach(function (h) {\n"
   "      __base(h); var cy = Object.assign({}, __card('yixing'), { up: true });\n"
   "      __ok('移形换影 ' + h + ' 升级 0 费（仅剩 C 列 1/0）',\n"
   "        cardCost(cy) === 0 && effectiveCost(cy) === 0, 'cost=' + cardCost(cy));\n"
   "    });\n"
   "    ['tianshi', 'wuseng', 'ganshiren'].forEach(function (h) {",
   "    // v0.61.35 天师列、v0.61.36 武僧列、v0.61.37 赶尸人列、v0.61.39 阴差列：\n"
   "    // 移形换影取消 (U:0) → 四列统一 1/1（阴差列原先还带「（0 符文）」文案，一并去掉）\n"
   "    ['tianshi', 'wuseng', 'ganshiren', 'yincha'].forEach(function (h) {",
   '移形换影 1/1 并组')

# ═════════ 五通神(阴差)：5 → 6、门槛 ≥4/耗4 → ≥3/耗3 ═════════
ed("    // 阴差：改成回血 —— 当回合 = 立即 5 + 首次触发 5 = +10 生命，不给格挡\n"
   "    g = __base('yincha'); G.block = 0; c = __card('wutong'); c.eff(false, c);\n"
   "    __ok('v0.59 五通神(阴差) 当回合 +10生命+0格挡', g.hp === 70 && g.block === 0, 'hp=' + g.hp + ' block=' + g.block);",
   "    // 阴差：改成回血 —— 当回合 = 立即 6 + 首次触发 6 = +12 生命，不给格挡（v0.61.39：5 → 6）\n"
   "    g = __base('yincha'); G.block = 0; c = __card('wutong'); c.eff(false, c);\n"
   "    __ok('v0.61.39 五通神(阴差) 当回合 +12生命+0格挡', g.hp === 72 && g.block === 0, 'hp=' + g.hp + ' block=' + g.block);",
   '五通神 阴差 当回合')
ed("    // 阴差：血怒 ≥4 → 消耗 4 层，持续 2 → 3 回合\n"
   "    g = __base('yincha'); G.block = 0; g.xuenu = 4; c = __card('wutong'); c.eff(false, c);\n"
   "    __ok('v0.59 五通神(阴差) 血怒4 → 消耗4层、剩2回合(共3)', g.xuenu === 0 && g.summons[0].dur === 2,",
   "    // 阴差：血怒 ≥3 → 消耗 3 层，持续 2 → 3 回合（v0.61.39：门槛 4 → 3、消耗 4 → 3）\n"
   "    g = __base('yincha'); G.block = 0; g.xuenu = 4; c = __card('wutong'); c.eff(false, c);\n"
   "    __ok('v0.61.39 五通神(阴差) 血怒4 → 消耗3层、剩2回合(共3)', g.xuenu === 1 && g.summons[0].dur === 2,",
   '五通神 阴差 强化档')

# ═════════ 阴差初始卡池 11 → 8 张 ═════════
ed("    /* —— 初始卡池：雷符×3 金刚符×2 火符×1 佛渡×1 聚灵×1 血契×1 守一×1 渡魂归己×1 = 11 张 —— */",
   "    /* —— 初始卡池（v0.61.39 按《阴差版卡池 - 副本.md》重定）：\n"
   "       雷符×3 金刚符×1 火符×1 焚符×1 血契×1 守一×1 燃血术×1 纸人×1 = 8 张 —— */",
   '阴差卡池 注释')
ed("    __ok('v0.59 阴差初始卡池 11 张且组成正确',\n"
   "      cnt === 11 && got === 'leifux3 jingangx2 huofux1 fodux1 julingx1 xueqix1 shouyix1 duhunguijix1', got);",
   "    __ok('v0.61.39 阴差初始卡池 8 张且组成正确',\n"
   "      cnt === 8 && got === 'leifux3 jingangx1 huofux1 fenfux1 xueqix1 shouyix1 ranxuex1 zhirenx1', got);\n"
   "    // 反误伤：被换下的 3 张（佛渡/聚灵/渡魂归己）不该还留在牌库里\n"
   "    __ok('v0.61.39 阴差初始卡池 已移出 fodu/juling/duhunguiji',\n"
   "      !h.deck.some(function (p) { return ['fodu', 'juling', 'duhunguiji'].indexOf(p[0]) >= 0; }), got);",
   '阴差卡池 断言')

# ═════════ 48 张费用表：yixing [1,0] → [1,1] ═════════
ed("      kaitianyan: [1, 1], yixing: [1, 0], fuling: [2, 2], zhenyaoling: [2, 2], zhiren: [1, 1], zhouyin: [1, 1],",
   "      kaitianyan: [1, 1], yixing: [1, 1], fuling: [2, 2], zhenyaoling: [2, 2], zhiren: [1, 1], zhouyin: [1, 1],   // v0.61.39：yixing 阴差列 1/0 → 1/1",
   'COST_WANT yixing')

# ═════════ C#1 雷符 ═════════
ed("    /* —— 攻击 1：雷符 5/8 + 每层血怒 +2（上限 +6）+ 击杀得 2 血怒 —— */",
   "    /* —— 攻击 1：雷符 4/8 + 每层血怒 +3（上限 +6）+ 击杀得 2 血怒 —— */",
   'C#1 注释')
ed("    __ok('v0.59 C#1 雷符 5+2×3=11 伤并消耗 3 层血怒', g.enemies[0].hp === 489 && g.xuenu === 0,",
   "    __ok('v0.61.39 C#1 雷符 4+3×2=10 伤并消耗 2 层血怒（上限 +6 → 至多 2 层）', g.enemies[0].hp === 490 && g.xuenu === 1,",
   'C#1 断言1')
ed("    g = gy(); g.xuenu = 0; g.enemies[0].hp = 5;\n"
   "    g.hand = [__card('leifu')]; g.drawPile = []; g.discard = []; g.exhausted = [];\n"
   "    doPlayCard(0);\n"
   "    __ok('v0.59 C#1 雷符 击杀 → 获得 2 层血怒', g.enemies[0].hp <= 0 && g.xuenu === 2, 'xuenu=' + g.xuenu);",
   "    g = gy(); g.xuenu = 0; g.enemies[0].hp = 4;   // v0.61.39：基础伤 5 → 4，血量同步下调才仍能一击致死\n"
   "    g.hand = [__card('leifu')]; g.drawPile = []; g.discard = []; g.exhausted = [];\n"
   "    doPlayCard(0);\n"
   "    __ok('v0.61.39 C#1 雷符 击杀 → 获得 2 层血怒', g.enemies[0].hp <= 0 && g.xuenu === 2, 'xuenu=' + g.xuenu);",
   'C#1 断言2')

# ═════════ C#2 火符 ═════════
ed("    /* —— 攻击 2：火符 8/11 + 失去 2 生命（不弃牌） —— */",
   "    /* —— 攻击 2：火符 6/10 + 失去 2 生命（不弃牌） —— */",
   'C#2 注释')
ed("    __ok('v0.59 C#2 火符 8 伤 + 失去 2 生命(被动再给 2 血怒)',\n"
   "      g.enemies[0].hp === 492 && g.hp === 58 && g.xuenu === 2,",
   "    __ok('v0.61.39 C#2 火符 6 伤 + 失去 2 生命(被动再给 2 血怒)',\n"
   "      g.enemies[0].hp === 494 && g.hp === 58 && g.xuenu === 2,",
   'C#2 断言')
ed("    __ok('v0.59 C#2 火符 升级 11 伤', r.e.hp === 489, 'ehp=' + r.e.hp);",
   "    __ok('v0.61.39 C#2 火符 升级 10 伤', r.e.hp === 490, 'ehp=' + r.e.hp);",
   'C#2 升级断言')

# ═════════ C#4 斩妖剑 ═════════
ed("    /* —— 攻击 4：斩妖剑 9/14 + 带诅咒额外 4/6 —— */",
   "    /* —— 攻击 4：斩妖剑 10/14 + 带诅咒额外 4/6 —— */",
   'C#4 注释')
ed("    __ok('v0.59 C#4 斩妖剑 9+4=13 伤（带诅咒）', g.enemies[0].hp === 487, 'ehp=' + g.enemies[0].hp);",
   "    __ok('v0.61.39 C#4 斩妖剑 10+4=14 伤（带诅咒）', g.enemies[0].hp === 486, 'ehp=' + g.enemies[0].hp);",
   'C#4 断言1')
ed("    __ok('v0.59 C#4 斩妖剑 无诅咒 = 9 伤', g.enemies[0].hp === 491, 'ehp=' + g.enemies[0].hp);",
   "    __ok('v0.61.39 C#4 斩妖剑 无诅咒 = 10 伤', g.enemies[0].hp === 490, 'ehp=' + g.enemies[0].hp);",
   'C#4 断言2')

# ═════════ C#5 天雷正法 ═════════
ed("    /* —— 攻击 5：天雷正法 16/21 + 失 5 + 本场每失 1 血 +1/+2（上限 +20） —— */",
   "    /* —— 攻击 5：天雷正法 16/21 + 失 5 + 本场每失 1 血 +1/+2（上限 +20/+26） —— */",
   'C#5 注释')
ed("    __ok('v0.59 C#5 天雷正法 升级 21+上限20=41 伤', g.enemies[0].hp === 459, 'ehp=' + g.enemies[0].hp);",
   "    __ok('v0.61.39 C#5 天雷正法 升级 21+上限26=47 伤', g.enemies[0].hp === 453, 'ehp=' + g.enemies[0].hp);",
   'C#5 断言')

# ═════════ C#6 万剑归宗（数值恰好抵消，只需改文案/表达） ═════════
ed("    /* —— 攻击 6：万剑归宗 全体 10/15 + 失 3 + 斩杀回 8/12 与 1 符文 —— */",
   "    /* —— 攻击 6：万剑归宗 全体 10/15 + 失 5 + 斩杀回 10/15 与 1 符文 —— */",
   'C#6 注释')
ed("    __ok('v0.59 C#6 万剑归宗 全体 10 伤 + 斩杀回 8 血 + 1 符文',\n"
   "      g.enemies[0].hp === 490 && g.hp === 50 - 3 + 8 && g.energy === 9 - 3 + 1,",
   "    __ok('v0.61.39 C#6 万剑归宗 全体 10 伤 + 失 5 回 10 血 + 1 符文',\n"
   "      g.enemies[0].hp === 490 && g.hp === 50 - 5 + 10 && g.energy === 9 - 3 + 1,",
   'C#6 断言')

# ═════════ C#8 噬魂术 ═════════
ed("    __ok('v0.59 C#8 噬魂术 升级 15+上限20=35 伤（10 层全消耗）', g.enemies[0].hp === 465 && g.xuenu === 0,",
   "    __ok('v0.61.39 C#8 噬魂术 升级 16+3×6=34 伤（每层 +3、上限 +18 → 消耗 6 层）', g.enemies[0].hp === 466 && g.xuenu === 4,",
   'C#8 断言')

# ═════════ C#12 嗜血 ═════════
ed("    /* —— 攻击 12：嗜血 4/6 + 本场每失 4/3 点血 +1（上限 +15/20） —— */",
   "    /* —— 攻击 12：嗜血 固定 5 + 本场每失 4/3 点血 +1（上限 +15/20） —— */",
   'C#12 注释')
ed("    __ok('v0.59 C#12 嗜血 4+floor(12/4)=7 伤', g.enemies[0].hp === 493, 'ehp=' + g.enemies[0].hp);",
   "    __ok('v0.61.39 C#12 嗜血 5+floor(12/4)=8 伤', g.enemies[0].hp === 492, 'ehp=' + g.enemies[0].hp);",
   'C#12 断言1')
ed("    __ok('v0.59 C#12 嗜血 升级 6+floor(12/3)=10 伤', g.enemies[0].hp === 490, 'ehp=' + g.enemies[0].hp);",
   "    __ok('v0.61.39 C#12 嗜血 升级 5+floor(12/3)=9 伤（基础伤升级不再变）', g.enemies[0].hp === 491, 'ehp=' + g.enemies[0].hp);",
   'C#12 断言2')

# ═════════ C#14 钟馗镇魂：只改注释（数值 16/24 未变，自扣 4 → 5 不改变翻倍判定） ═════════
ed("    /* —— 攻击 14：钟馗镇魂 16/24 + 失 4 + 生命 <40% 翻倍 —— */",
   "    /* —— 攻击 14：钟馗镇魂 16/24 + 失 5 + 生命 <40% 翻倍 —— */",
   'C#14 注释')

# ═════════ C#31 燃血术 ═════════
ed("    __ok('v0.59 C#31 燃血术 升级 失6血 +2 符文', g.hp === 54 && g.energy === 11, 'hp=' + g.hp + ' energy=' + g.energy);",
   "    __ok('v0.61.39 C#31 燃血术 阴差固定 失4血 +1 符文（升级不再 失6/+2）', g.hp === 56 && g.energy === 10, 'hp=' + g.hp + ' energy=' + g.energy);",
   'C#31 断言')

# ═════════ C#41 纸人 ═════════
ed("    /* —— 召唤 41：纸人 失 2 + 1/2 伤 + 攻击回 2/3；血怒 ≥4 消耗 4 强化为 4/5、回 3/4 —— */",
   "    /* —— 召唤 41：纸人 失 2 + 1/2 伤 + 攻击回 2/3；血怒 ≥3 消耗 3 强化为 4/5、回 3/4 —— */",
   'C#41 注释')
ed("    __ok('v0.59 C#41 纸人 血怒4 → 消耗4层、{v:4,healV:3}',\n"
   "      g.xuenu === 0 && g.summons[0].v === 4 && g.summons[0].healV === 3, JSON.stringify(g.summons[0]));",
   "    __ok('v0.61.39 C#41 纸人 血怒4 → 消耗3层、{v:4,healV:3}',\n"
   "      g.xuenu === 1 && g.summons[0].v === 4 && g.summons[0].healV === 3, JSON.stringify(g.summons[0]));",
   'C#41 断言')

# ═════════ C 列预伤害 ═════════
ed("    __ok('v0.59 C 预伤害 雷符 血怒3 → 5+6=11 且恒显', p.d === 11 && p.dynamic === true, 'd=' + p.d + ' dyn=' + p.dynamic);",
   "    __ok('v0.61.39 C 预伤害 雷符 血怒3 → 4+3×2=10 且恒显', p.d === 10 && p.dynamic === true, 'd=' + p.d + ' dyn=' + p.dynamic);",
   '预伤害 雷符')
ed("    __ok('v0.59 C 预伤害 斩妖剑 带诅咒 → 9+4=13', p.d === 13, 'd=' + p.d);",
   "    __ok('v0.61.39 C 预伤害 斩妖剑 带诅咒 → 10+4=14', p.d === 14, 'd=' + p.d);",
   '预伤害 斩妖剑')
ed("    __ok('v0.59 C 预伤害 嗜血 本场失12血 → 4+3=7', p.d === 7, 'd=' + p.d);",
   "    __ok('v0.61.39 C 预伤害 嗜血 本场失12血 → 5+3=8', p.d === 8, 'd=' + p.d);",
   '预伤害 嗜血')

# ═════════ 佛渡：阴差升级附加改为「回复 5 点生命」 ═════════
ed("    __ok('v0.61.35/36 佛渡 升级附加：天师 5 格挡 / 阴差 3 格挡 / 武僧 5 格挡 / 赶尸人 2 尸气',\n"
   "      _fdT.indexOf('5 点格挡') >= 0 && _fdC.indexOf('3 点格挡') >= 0 &&",
   "    __ok('v0.61.39 佛渡 升级附加：天师 5 格挡 / 阴差 回复 5 生命 / 武僧 5 格挡 / 赶尸人 2 尸气',\n"
   "      _fdT.indexOf('5 点格挡') >= 0 && _fdC.indexOf('回复 5 点生命') >= 0 &&",
   '佛渡 升级附加')

# ═════════ 燃血术 A 列断言 + 补阴差符文 ═════════
ed("    __ok('v0.61.37 燃血术 A 列 4 → 8（与武僧同值）；B 8/8、C 4/6 不动',\n"
   "      _rxA[0].indexOf('失去 8 点生命') >= 0 && _rxA[1].indexOf('失去 8 点生命') >= 0 &&\n"
   "      _rxB[0].indexOf('失去 8 点生命') >= 0 && _rxB[1].indexOf('失去 8 点生命') >= 0 &&\n"
   "      _rxC[0].indexOf('失去 4 点生命') >= 0 && _rxC[1].indexOf('失去 6 点生命') >= 0,\n"
   "      _rxA.join('/') + ' | ' + _rxB.join('/') + ' | ' + _rxC.join('/'));",
   "    __ok('v0.61.39 燃血术 A 8/8、B 8/8、C 固定 4/4（阴差列取消升级减血）',\n"
   "      _rxA[0].indexOf('失去 8 点生命') >= 0 && _rxA[1].indexOf('失去 8 点生命') >= 0 &&\n"
   "      _rxB[0].indexOf('失去 8 点生命') >= 0 && _rxB[1].indexOf('失去 8 点生命') >= 0 &&\n"
   "      _rxC[0].indexOf('失去 4 点生命') >= 0 && _rxC[1].indexOf('失去 4 点生命') >= 0,\n"
   "      _rxA.join('/') + ' | ' + _rxB.join('/') + ' | ' + _rxC.join('/'));\n"
   "    __ok('v0.61.39 燃血术 阴差列符文固定 1（升级不再 2）',\n"
   "      _rxC[0].indexOf('获得 1 点符文') >= 0 && _rxC[1].indexOf('获得 1 点符文') >= 0, _rxC.join(' / '));",
   '燃血术 A/C 断言')

# ═════════ 反误伤：佛渡 fb 三元里阴差已移出 ═════════
ed("      // 佛渡 eff 的 fb 三元：武僧 5 / 天师 5 / 阴差 3（赶尸人走上面的尸气分支，不给格挡）",
   "      // 佛渡 eff 的 fb 三元：武僧 5 / 天师 5（v0.61.39 阴差列改为「升级回复 5 点生命」，已移出 fb）\n"
   "      // 赶尸人走上面的尸气分支，四列里只有阴差/赶尸人不给格挡",
   '佛渡 fb 注释')
ed("      __ok('v0.61.36 反误伤 佛渡 升级附加格挡逐列：武僧 5 / 天师 5 / 阴差 3 / 赶尸人 0',\n"
   "        fdBlock('wuseng', true) === 5 && fdBlock('tianshi', true) === 5 &&\n"
   "        fdBlock('yincha', true) === 3 && fdBlock('ganshiren', true) === 0,",
   "      __ok('v0.61.39 反误伤 佛渡 升级附加格挡逐列：武僧 5 / 天师 5 / 阴差 0 / 赶尸人 0',\n"
   "        fdBlock('wuseng', true) === 5 && fdBlock('tianshi', true) === 5 &&\n"
   "        fdBlock('yincha', true) === 0 && fdBlock('ganshiren', true) === 0,",
   '佛渡 反误伤')

# ═════════ 易物：5 条断言翻面 ═════════
ed("      __ok('v0.61.10 P11 易物 换入的牌本回合费用 -1',\n"
   "        inHand && inHand.tempCostCut === 1 && effectiveCost(inHand) === cardCost(inHand) - 1,\n"
   "        'id=' + (inHand && inHand.id) + ' cost=' + (inHand && cardCost(inHand)) + ' eff=' + (inHand && effectiveCost(inHand)));\n"
   "      // 关键：不能污染 CARDS 里的共享对象（同名牌的另外几张不该一起减费）\n"
   "      __ok('v0.61.10 P11 易物 减费标记不落到共享卡牌对象上',\n"
   "        __card('zhongkui').tempCostCut === undefined, String(__card('zhongkui').tempCostCut));\n"
   "      // 消耗牌回牌库靠 G.deck.indexOf —— 副本必须已在牌库里顶替原对象\n"
   "      __ok('v0.61.10 P11 易物 副本在 G.deck 里顶替原对象（保住 indexOf 语义）',\n"
   "        g.deck.indexOf(inHand) >= 0, 'deckLen=' + g.deck.length);\n"
   "      // 到期清除：进入下一回合后标记消失（牌此时可能已在弃牌堆，也要清）\n"
   "      startTurn();\n"
   "      __ok('v0.61.10 P11 易物 减费「本回合」到期即失效', !inHand.tempCostCut && effectiveCost(inHand) === cardCost(inHand),\n"
   "        'cut=' + inHand.tempCostCut + ' eff=' + effectiveCost(inHand));",
   "      __ok('v0.61.39 易物 换入的牌不再费用 -1',\n"
   "        inHand && inHand.tempCostCut === undefined && effectiveCost(inHand) === cardCost(inHand),\n"
   "        'id=' + (inHand && inHand.id) + ' cost=' + (inHand && cardCost(inHand)) + ' eff=' + (inHand && effectiveCost(inHand)));\n"
   "      // 仍必须是副本：不能污染 CARDS 里的共享对象（同名牌的另外几张不该被连带改动）\n"
   "      __ok('v0.61.39 易物 换入的是副本、不落到共享卡牌对象上',\n"
   "        inHand !== __card('zhongkui') && __card('zhongkui').tempCostCut === undefined,\n"
   "        'same=' + (inHand === __card('zhongkui')));\n"
   "      // 消耗牌回牌库靠 G.deck.indexOf —— 副本必须已在牌库里顶替原对象\n"
   "      __ok('v0.61.39 易物 副本在 G.deck 里顶替原对象（保住 indexOf 语义）',\n"
   "        g.deck.indexOf(inHand) >= 0, 'deckLen=' + g.deck.length);\n"
   "      // 万剑归宗 A 列仍靠同一套副本顶替发 -1/-2 费，到期清理不能一起删掉\n"
   "      startTurn();\n"
   "      __ok('v0.61.39 反误伤 与万剑归宗共用的 tempCostCut 到期清理仍有效',\n"
   "        !inHand.tempCostCut && effectiveCost(inHand) === cardCost(inHand),\n"
   "        'cut=' + inHand.tempCostCut + ' eff=' + effectiveCost(inHand));",
   '易物 断言翻面')
ed("    __ok('v0.61.10 P11 易物 四列卡面都写明「换入的牌本回合费用 -1」',\n"
   "      ['ganshiren', 'wuseng', 'yincha', 'tianshi'].every(function (h) {\n"
   "        __base(h); return __card('yiwu').t(false).indexOf('换入的牌本回合费用 -1') >= 0;\n"
   "      }));",
   "    __ok('v0.61.39 易物 四列卡面都不再写「换入的牌本回合费用 -1」',\n"
   "      ['ganshiren', 'wuseng', 'yincha', 'tianshi'].every(function (h) {\n"
   "        __base(h); return __card('yiwu').t(false).indexOf('换入的牌本回合费用 -1') < 0\n"
   "          && __card('yiwu').t(false).indexOf('选择 1 张手牌与弃牌堆交换') >= 0;\n"
   "      }));\n"
   "    // 反误伤：万剑归宗 A 列的减费文案仍在（别把共用的消费端一起删了）\n"
   "    __base('ganshiren');\n"
   "    __ok('v0.61.39 反误伤 万剑归宗 A 列「抽到的牌本回合费用 -N」文案仍在',\n"
   "      __card('wanjian').t(false).indexOf('本回合费用 -') >= 0, __card('wanjian').t(false));",
   '易物 四列文案')

# ═════════ 新增：三个 bug 的行为对拍 ═════════
NEW = """    /* ============ v0.61.39 新增：三个 bug 的行为对拍 ============ */

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
      var g1 = __base('yincha'); g1.hp = 40; g1.xuenu = 0;
      var c1 = __card('yixing'); c1.eff(false, c1);
      var g2 = __base('yincha'); g2.hp = 40; g2.xuenu = 0;
      var c2 = Object.assign({}, __card('yixing'), { up: true }); c2.eff(true, c2);
      dealDamageToPlayer(5, { name: '测试妖' });
      dealDamageToPlayer(5, { name: '测试妖' });
      __ok('v0.61.39 移形换影(阴差未升级) 闪避结算 → 回 2 血 + 1 层血怒',
        g1.hp === 42 && g1.xuenu === 1 && g1.dodge === 0,
        'hp=' + g1.hp + ' xuenu=' + g1.xuenu + ' dodge=' + g1.dodge);
      __ok('v0.61.39 移形换影(阴差升级) 闪避结算 → 回 4 血 + 2 层血怒',
        g2.hp === 44 && g2.xuenu === 2 && g2.dodge === 0,
        'hp=' + g2.hp + ' xuenu=' + g2.xuenu + ' dodge=' + g2.dodge);
    })();

"""
ed("    /* —— 未勾选项必须原样保留（防误改） —— */\n",
   NEW + "    /* —— 未勾选项必须原样保留（防误改） —— */\n",
   '新增 v0.61.39 对拍块')

if errs:
    print('!! 有锚点未命中，一个字节都不写：')
    for m in errs:
        print('   -', m)
    sys.exit(1)

io.open(S, 'w', encoding='utf-8', newline='').write(body.replace('\n', nl))
print('OK smoke_runner.js %d 字符' % len(body))