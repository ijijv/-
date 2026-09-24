# -*- coding: utf-8 -*-
"""v0.61.35 冒烟批：把 D 列（天师）断言从旧值改到新卡池文件，并补新机制断言

改（旧值→新值）：雷符/火符/剑符/天雷/万剑/群鬼/蚀魂/嗜血/百鬼/钟馗/金刚/隐身/铜皮/反震/
                 镇妖铃/纸人/小鬼/五通神/卸甲/移形换影/初始卡池/预伤徽章/跨关 P5 两条
新增：守一「保留【诅咒牌】→ 该牌自身下回合 -1 费」（时间戳窗口 + 一次性 + 0 费不为负）、
      纸人回合末施咒、小鬼随机目标 + 带诅咒 +2/3、镇妖铃 ≥4 层消耗 4 层、
      佛渡分列（天师 5 / 阴差 3 / 其余 4）、燃血术天师列固定 8、阴兵预览仍取「诅咒最高」
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


# ═══════════ 1. boostCurse 退役（__base 的假状态初始化）═══════════
rep("    G.ranhunType = null; G.ranhunSelf = null; G.bloodPact = 0; G.retain = 0; G.boostCurse = 0;\n",
    "    G.ranhunType = null; G.ranhunSelf = null; G.bloodPact = 0; G.retain = 0;   // v0.61.35：boostCurse 已随守一改为「减费」而退役\n",
    'boostCurse 假状态')

# ═══════════ 2. 早期 D 块：金刚符 / 卸甲 / 移形换影 ═══════════
rep("    __ok('D#15 金刚符 按本回合诅咒+格挡(7)', g.block === 7, 'block=' + g.block);\n",
    "    __ok('D#15 金刚符 按本回合诅咒+格挡(8)', g.block === 8, 'block=' + g.block);   // v0.61.35：基础 4/6 → 5/7\n",
    'D#15 金刚符')

rep("    g = __base('tianshi'); c = __card('xiejiashengyuan'); g.hand = [c]; c.eff(true, c); // 升级 8 格挡\n"
    "    __ok('D#23 卸甲 置 endBlockKind=D(8盾)', g.endBlockKind === 'D' && g.block === 8, 'kind=' + g.endBlockKind + ' block=' + g.block);\n"
    "    g = __base('tianshi'); c = __card('xiejiashengyuan'); c.eff(true, c); finishEndTurn(); resolveEndBlock();\n"
    "    __ok('D#23 卸甲 敌后结算 8格挡→4诅咒', g.block === 0 && g.endBlockKind === null && __sumCurse() === 4 && CURSE_THIS_TURN === 4, 'sumCurse=' + __sumCurse() + ' CURSE=' + CURSE_THIS_TURN);\n",
    "    g = __base('tianshi'); c = __card('xiejiashengyuan'); g.hand = [c]; c.eff(true, c); // v0.61.35：升级 8 → 12 格挡\n"
    "    __ok('D#23 卸甲 置 endBlockKind=D(12盾)', g.endBlockKind === 'D' && g.block === 12, 'kind=' + g.endBlockKind + ' block=' + g.block);\n"
    "    g = __base('tianshi'); c = __card('xiejiashengyuan'); c.eff(true, c); finishEndTurn(); resolveEndBlock();\n"
    "    __ok('D#23 卸甲 敌后结算 12格挡→6诅咒', g.block === 0 && g.endBlockKind === null && __sumCurse() === 6 && CURSE_THIS_TURN === 6, 'sumCurse=' + __sumCurse() + ' CURSE=' + CURSE_THIS_TURN);\n",
    'D#23 卸甲')

rep("    var zeroUp = ['tongling', 'jingxin', 'xueji', 'yixing']; // tiebushan 已按列取费（B 0 费不可升级）\n",
    "    var zeroUp = ['tongling', 'jingxin', 'xueji']; // tiebushan 已按列取费（B 0 费不可升级）；yixing 天师列 v0.61.35 取消 (U:0)，另测\n",
    'zeroUp 列表')

rep("    });\n"
    "    // playCard 能量门槛（L2314 拦截条件 G.energy<cost）：energy=0/1 对 0 费升级牌均放行\n",
    "    });\n"
    "    // v0.61.35：移形换影「升级 0 费」只对 A/B/C 三列有效；天师列按新卡池文件改为 1/1\n"
    "    ['ganshiren', 'wuseng', 'yincha'].forEach(function (h) {\n"
    "      __base(h); var cy = Object.assign({}, __card('yixing'), { up: true });\n"
    "      __ok('移形换影 ' + h + ' 升级 0 费（v0.61.35 仅天师列取消）',\n"
    "        cardCost(cy) === 0 && effectiveCost(cy) === 0, 'cost=' + cardCost(cy));\n"
    "    });\n"
    "    (function () {\n"
    "      __base('tianshi'); var cy = Object.assign({}, __card('yixing'), { up: true });\n"
    "      __ok('移形换影 天师 升级仍 1 费（v0.61.35 取消 (U:0)）',\n"
    "        cardCost(cy) === 1 && effectiveCost(cy) === 1, 'cost=' + cardCost(cy));\n"
    "    })();\n"
    "    // playCard 能量门槛（L2314 拦截条件 G.energy<cost）：energy=0/1 对 0 费升级牌均放行\n",
    '移形换影分列')

# ═══════════ 3. ⑦ 卸甲 D 三连 ═══════════
rep("    c = __card('xiejiashengyuan'); c.eff(true, c); // 8 盾 + endBlockKind=D\n"
    "    dealDamageToPlayer(5, en);                     // 敌人打 5 → 格挡 8→3\n"
    "    __ok('⑦ 卸甲 D 敌攻先耗格挡(8→3) 未提前转化', g.block === 3 && g.endBlockKind === 'D' && g.hp === 60, 'block=' + g.block + ' hp=' + g.hp);\n"
    "    resolveEndBlock();\n"
    "    __ok('⑦ 卸甲 D 敌后结算 余3盾→1诅咒', g.block === 0 && g.endBlockKind === null && __sumCurse() === 1, 'block=' + g.block + ' sum=' + __sumCurse());\n",
    "    c = __card('xiejiashengyuan'); c.eff(true, c); // v0.61.35：12 盾 + endBlockKind=D\n"
    "    dealDamageToPlayer(5, en);                     // 敌人打 5 → 格挡 12→7\n"
    "    __ok('⑦ 卸甲 D 敌攻先耗格挡(12→7) 未提前转化', g.block === 7 && g.endBlockKind === 'D' && g.hp === 60, 'block=' + g.block + ' hp=' + g.hp);\n"
    "    resolveEndBlock();\n"
    "    __ok('⑦ 卸甲 D 敌后结算 余7盾→3诅咒', g.block === 0 && g.endBlockKind === null && __sumCurse() === 3, 'block=' + g.block + ' sum=' + __sumCurse());\n",
    '⑦ 卸甲 D 前两条')

rep("    __ok('⑦ 卸甲 D 满6溢出转回格挡(余1)不清零', g.block === 1 && g.endBlockKind === null && en.curse === 6, 'block=' + g.block);\n",
    "    __ok('⑦ 卸甲 D 满6溢出转回格挡(余7盾→3层全溢出→3盾)不清零', g.block === 3 && g.endBlockKind === null && en.curse === 6, 'block=' + g.block);\n",
    '⑦ 卸甲 D 溢出')

# ═══════════ 4. 五通神（早期块）═══════════
rep("    __ok('v0.60 五通神(天师) 当回合 +4格挡+1诅咒', g.block === 4 && __sumCurse() === 1, 'block=' + g.block + ' curse=' + __sumCurse());\n",
    "    __ok('v0.60 五通神(天师) 当回合 +6格挡+1诅咒', g.block === 6 && __sumCurse() === 1, 'block=' + g.block + ' curse=' + __sumCurse());   // v0.61.35：立即/每回合格挡 4 → 6\n",
    '五通神早期')

# ═══════════ 5. 初始卡池 ═══════════
rep("    /* —— 初始卡池（v0.60.02 修正：此前把两人的名单发反了）\n"
    "          天师 D   ：雷符×3 金刚符×1 佛渡×1 聚灵×1 渡魂归己×1 咒印×1 画皮×1 守一×1 = 10 张\n"
    "          赶尸人 A ：雷符×2 金刚符×2 佛渡×1 舍身×1 血契×1 纸人×1 尸王×1 守一×1 小鬼×1 = 9 张 —— */\n",
    "    /* —— 初始卡池（v0.61.35 换新：天师去佛渡/画皮、金刚符 1→2、加纸人）\n"
    "          天师 D   ：雷符×3 金刚符×2 聚灵×1 渡魂归己×1 咒印×1 纸人×1 守一×1 = 10 张\n"
    "          赶尸人 A ：雷符×2 金刚符×2 佛渡×1 舍身×1 血契×1 纸人×1 尸王×1 守一×1 小鬼×1 = 11 张 —— */\n",
    '初始卡池注释')

rep("      dt_.s === 'leifux3 jingangx1 fodux1 julingx1 duhunguijix1 zhouyinx1 huapix1 shouyix1',\n",
    "      dt_.s === 'leifux3 jingangx2 julingx1 duhunguijix1 zhouyinx1 zhirenx1 shouyix1',\n",
    '天师卡池字符串')

rep("    __ok('v0.60.02 咒印/画皮/聚灵/渡魂归己归天师，纸人/小鬼/舍身归赶尸人',\n"
    "      dt_.s.indexOf('zhouyin') >= 0 && dt_.s.indexOf('huapi') >= 0 && dt_.s.indexOf('juling') >= 0 &&\n"
    "      dt_.s.indexOf('duhunguiji') >= 0 && ga_.s.indexOf('zhiren') >= 0 &&\n"
    "      ga_.s.indexOf('xiaogui') >= 0 && ga_.s.indexOf('sheshen') >= 0, dt_.s + ' || ' + ga_.s);\n",
    "    __ok('v0.61.35 咒印/聚灵/渡魂归己/纸人/守一归天师；佛渡与画皮已退出天师初始牌组',\n"
    "      dt_.s.indexOf('zhouyin') >= 0 && dt_.s.indexOf('juling') >= 0 &&\n"
    "      dt_.s.indexOf('duhunguiji') >= 0 && dt_.s.indexOf('zhiren') >= 0 && dt_.s.indexOf('shouyi') >= 0 &&\n"
    "      dt_.s.indexOf('huapi') < 0 && dt_.s.indexOf('fodu') < 0 &&\n"
    "      ga_.s.indexOf('zhiren') >= 0 && ga_.s.indexOf('xiaogui') >= 0 && ga_.s.indexOf('sheshen') >= 0,\n"
    "      dt_.s + ' || ' + ga_.s);\n",
    '归属断言')

# ═══════════ 6. D_COST 表（yixing 天师列）═══════════
rep("      kaitianyan: [1, 1], yixing: [1, 0], fuling: [2, 1], zhenyaoling: [2, 2], zhiren: [1, 1], zhouyin: [1, 1],\n",
    "      kaitianyan: [1, 1], yixing: [1, 1], fuling: [2, 1], zhenyaoling: [2, 2], zhiren: [1, 1], zhouyin: [1, 1],   // v0.61.35：yixing 天师列取消 (U:0)\n",
    'D_COST yixing')

# ═══════════ 7. 攻击牌逐张 ═══════════
rep("    /* —— 攻击 2：火符 5/8 + 1 层诅咒 + 弃 1 张 —— */\n",
    "    /* —— 攻击 2：火符 6/10 + 1 层诅咒 + 弃 1 张（v0.61.35） —— */\n", '火符注释')
rep("    __ok('v0.60 D#2 火符 5 伤 + 1 层诅咒 + 弃 1 张（2 张→打出 1+弃 1=0）',\n"
    "      g.enemies[0].hp === 495 && g.enemies[0].curse === 1 && g.hand.length === 0,\n",
    "    __ok('v0.60 D#2 火符 6 伤 + 1 层诅咒 + 弃 1 张（2 张→打出 1+弃 1=0）',\n"
    "      g.enemies[0].hp === 494 && g.enemies[0].curse === 1 && g.hand.length === 0,\n", '火符基础')
rep("    __ok('v0.60 D#2u 火符升级 8 伤', g.enemies[0].hp === 492, 'ehp=' + g.enemies[0].hp);\n",
    "    __ok('v0.60 D#2u 火符升级 10 伤', g.enemies[0].hp === 490, 'ehp=' + g.enemies[0].hp);\n", '火符升级')

rep("    /* —— 攻击 3：剑符 9/14，诅咒≥3 层则消耗 3 层并翻倍 —— */\n",
    "    /* —— 攻击 3：剑符 10/15，诅咒≥3 层则消耗 3 层并翻倍（v0.61.35） —— */\n", '剑符注释')
rep("    __ok('v0.60 D#3 剑符 9×2=18 伤，诅咒 3→0',\n"
    "      g.enemies[0].hp === 482 && g.enemies[0].curse === 0,\n",
    "    __ok('v0.60 D#3 剑符 10×2=20 伤，诅咒 3→0',\n"
    "      g.enemies[0].hp === 480 && g.enemies[0].curse === 0,\n", '剑符基础')
rep("    __ok('v0.60 D#3 剑符 诅咒 2 层 → 9 伤不翻倍', g.enemies[0].hp === 491 && g.enemies[0].curse === 2, 'ehp=' + g.enemies[0].hp);\n",
    "    __ok('v0.60 D#3 剑符 诅咒 2 层 → 10 伤不翻倍', g.enemies[0].hp === 490 && g.enemies[0].curse === 2, 'ehp=' + g.enemies[0].hp);\n", '剑符不翻倍')

rep("    /* —— 攻击 5：天雷正法 20/30，每 2 层诅咒 -1 费、结算后失去减免×2 —— */\n",
    "    /* —— 攻击 5：天雷正法 22/32，每 2 层诅咒 -1 费、结算后失去减免×2（v0.61.35） —— */\n", '天雷注释')
rep("    __ok('v0.60 D#5 天雷正法 20 伤，诅咒 5→1（减免 2 层×2）',\n"
    "      g.enemies[0].hp === 480 && g.enemies[0].curse === 1,\n",
    "    __ok('v0.60 D#5 天雷正法 22 伤，诅咒 5→1（减免 2 层×2）',\n"
    "      g.enemies[0].hp === 478 && g.enemies[0].curse === 1,\n", '天雷基础')
rep("    __ok('v0.60 D#5u 天雷正法升级 30 伤', g.enemies[0].hp === 470, 'ehp=' + g.enemies[0].hp);\n",
    "    __ok('v0.60 D#5u 天雷正法升级 32 伤', g.enemies[0].hp === 468, 'ehp=' + g.enemies[0].hp);\n", '天雷升级')

rep("    /* —— 攻击 6：万剑归宗 全体 14/16 + 施加 1/2 层诅咒 + 斩杀回 1 费 —— */\n",
    "    /* —— 攻击 6：万剑归宗 全体 14/18 + 施加 1/2 层诅咒 + 斩杀回 1 费（v0.61.35） —— */\n", '万剑注释')
rep("    __ok('v0.60 D#6u 万剑归宗升级 全体 16 伤 + 每人 2 层诅咒',\n"
    "      g.enemies[0].hp === 484 && __sumCurse() === 4, 'e0=' + g.enemies[0].hp + ' curse=' + __sumCurse());\n",
    "    __ok('v0.60 D#6u 万剑归宗升级 全体 18 伤 + 每人 2 层诅咒',\n"
    "      g.enemies[0].hp === 482 && __sumCurse() === 4, 'e0=' + g.enemies[0].hp + ' curse=' + __sumCurse());\n", '万剑升级')

rep("    /* —— 攻击 9：群鬼乱舞 5/6 + 每层诅咒 +1（上限 +4/+6） —— */\n",
    "    /* —— 攻击 9：群鬼乱舞 6/9 + 每层诅咒 +1（上限 +4/+6）（v0.61.35） —— */\n", '群鬼注释')
rep("    __ok('v0.60 D#9 群鬼乱舞 5+3=8 伤（不消耗诅咒）',\n"
    "      g.enemies[0].hp === 492 && g.enemies[0].curse === 3,\n",
    "    __ok('v0.60 D#9 群鬼乱舞 6+3=9 伤（不消耗诅咒）',\n"
    "      g.enemies[0].hp === 491 && g.enemies[0].curse === 3,\n", '群鬼基础')
rep("    __ok('v0.60 D#9u 群鬼乱舞 6+min(6,6)=12 伤（上限 +6）', g.enemies[0].hp === 488, 'ehp=' + g.enemies[0].hp);\n",
    "    __ok('v0.60 D#9u 群鬼乱舞 9+min(6,6)=15 伤（上限 +6）', g.enemies[0].hp === 485, 'ehp=' + g.enemies[0].hp);\n", '群鬼升级')

rep("    /* —— 攻击 11：蚀魂咒 3/6 + 2 层诅咒 —— */\n",
    "    /* —— 攻击 11：蚀魂咒 3/8 + 2 层诅咒（v0.61.35：天师列由 v0.61.10 P5 的 4/7 改回 3/8） —— */\n", '蚀魂注释')
rep("    __ok('v0.60 D#11 蚀魂咒 4 伤 + 2 层诅咒（v0.61.10 P5：3→4）',\n"
    "      g.enemies[0].hp === 496 && g.enemies[0].curse === 2,\n",
    "    __ok('v0.60 D#11 蚀魂咒 3 伤 + 2 层诅咒（v0.61.35 天师列 3/8）',\n"
    "      g.enemies[0].hp === 497 && g.enemies[0].curse === 2,\n", '蚀魂基础')

rep("    /* —— 攻击 12：嗜血 6/8 吸血 50%，目标诅咒≥3 层则消耗 3 层改 100% —— */\n",
    "    /* —— 攻击 12：嗜血 6/8 吸血 50%，目标诅咒≥2 层则消耗 2 层改 100%（v0.61.35：阈值 3→2） —— */\n", '嗜血注释')
rep("    __ok('v0.60 D#12 嗜血 诅咒3层 → 消耗3层、6伤回6血',\n"
    "      g.enemies[0].hp === 494 && g.hp === 46 && g.enemies[0].curse === 0,\n",
    "    __ok('v0.60 D#12 嗜血 诅咒3层 → 只耗2层、6伤回6血',\n"
    "      g.enemies[0].hp === 494 && g.hp === 46 && g.enemies[0].curse === 1,\n", '嗜血3层')
rep("    g = dt(40); g.enemies[0].curse = 2;\n"
    "    g.hand = [__card('shixue')]; g.drawPile = []; g.discard = []; g.exhausted = [];\n"
    "    doPlayCard(0);\n"
    "    __ok('v0.60 D#12 嗜血 诅咒2层 → 保留诅咒、6伤回3血',\n"
    "      g.hp === 43 && g.enemies[0].curse === 2, 'hp=' + g.hp + ' curse=' + g.enemies[0].curse);\n",
    "    g = dt(40); g.enemies[0].curse = 1;   // v0.61.35：阈值降到 2 层，改用 1 层测「不足阈值」分支\n"
    "    g.hand = [__card('shixue')]; g.drawPile = []; g.discard = []; g.exhausted = [];\n"
    "    doPlayCard(0);\n"
    "    __ok('v0.60 D#12 嗜血 诅咒1层 → 保留诅咒、6伤回3血',\n"
    "      g.hp === 43 && g.enemies[0].curse === 1, 'hp=' + g.hp + ' curse=' + g.enemies[0].curse);\n", '嗜血2层→1层')

rep("    /* —— 攻击 13：百鬼夜行 全体 7 + 每层 +1/+2，并消耗各自全部诅咒 —— */\n",
    "    /* —— 攻击 13：百鬼夜行 全体 8 + 每层 +1/+2，并消耗各自全部诅咒（v0.61.35） —— */\n", '百鬼注释')
rep("    __ok('v0.60 D#13 百鬼夜行 7+3=10 / 7 伤且清空诅咒',\n"
    "      g.enemies[0].hp === 490 && g.enemies[1].hp === 493 && __sumCurse() === 0,\n",
    "    __ok('v0.60 D#13 百鬼夜行 8+3=11 / 8 伤且清空诅咒',\n"
    "      g.enemies[0].hp === 489 && g.enemies[1].hp === 492 && __sumCurse() === 0,\n", '百鬼')

rep("    /* —— 攻击 14：钟馗镇魂 15/20 + 引爆全部诅咒（每层 5/6）+ 消耗牌 —— */\n",
    "    /* —— 攻击 14：钟馗镇魂 主伤 16 固定 + 引爆全部诅咒（每层 3/4）+ 消耗牌（v0.61.35） —— */\n", '钟馗注释')
rep("    __ok('v0.60 D#14 钟馗镇魂 18+2×5=28 伤且清空诅咒（v0.61.10 P5：15→18）',\n"
    "      g.enemies[0].hp === 472 && g.enemies[0].curse === 0 && g.enemies[0].seal === true,\n",
    "    __ok('v0.60 D#14 钟馗镇魂 16+2×3=22 伤且清空诅咒（v0.61.35：18/24+5/6 → 16+3/4）',\n"
    "      g.enemies[0].hp === 478 && g.enemies[0].curse === 0 && g.enemies[0].seal === true,\n", '钟馗')

# ═══════════ 8. 防御牌 ═══════════
rep("    __ok('v0.60 D#15 金刚符 4+1×3=7 格挡', g.block === 7, 'block=' + g.block);\n",
    "    __ok('v0.60 D#15 金刚符 5+1×3=8 格挡', g.block === 8, 'block=' + g.block);\n", 'D#15 金刚')
rep("    __ok('v0.60 D#15u 金刚符升级 6+2×3=12 格挡', g.block === 12, 'block=' + g.block);\n",
    "    __ok('v0.60 D#15u 金刚符升级 7+2×3=13 格挡', g.block === 13, 'block=' + g.block);\n", 'D#15u 金刚')
rep("    __ok('v0.60 D#16u 隐身符升级 6+4=10 格挡', g.block === 10, 'block=' + g.block);\n",
    "    __ok('v0.60 D#16u 隐身符升级 5+4=9 格挡', g.block === 9, 'block=' + g.block);\n", 'D#16u 隐身')
rep("    __ok('v0.60 D#21 铜皮铁骨 8 格挡 + 受击施 1 层诅咒', g.block === 8 && g.hitCurse === 1,\n",
    "    __ok('v0.60 D#21 铜皮铁骨 9 格挡 + 受击施 1 层诅咒', g.block === 9 && g.hitCurse === 1,\n", 'D#21 铜皮')
rep("    __ok('v0.60 D#21u 铜皮铁骨升级 12 格挡', g.block === 12, 'block=' + g.block);\n",
    "    __ok('v0.60 D#21u 铜皮铁骨升级 14 格挡', g.block === 14, 'block=' + g.block);\n", 'D#21u 铜皮')
rep("    __ok('v0.60 D#22u 反震升级 仍反击 3 伤、诅咒 2 层', g.thorns === 3 && g.hitCurse === 2,\n",
    "    __ok('v0.60 D#22u 反震升级 反击 4 伤、诅咒 2 层（v0.61.35）', g.thorns === 4 && g.hitCurse === 2,\n", 'D#22u 反震')

# ═══════════ 9. 镇妖铃 ═══════════
rep("    /* —— 功能 40：镇妖铃 10/14 + 带诅咒镇魂 2 回合 —— */\n"
    "    g = dt(); g.enemies[0].curse = 2;\n"
    "    g.hand = [dup('zhenyaoling')]; g.drawPile = []; g.discard = []; g.exhausted = [];\n"
    "    doPlayCard(0);\n"
    "    __ok('v0.60 D#40 镇妖铃升级 14 伤 + 镇魂 2 回合',\n"
    "      g.enemies[0].hp === 486 && g.enemies[0].seal === true && g.enemies[0].sealTurn === 2,\n"
    "      'ehp=' + g.enemies[0].hp + ' seal=' + g.enemies[0].seal + ' sealTurn=' + g.enemies[0].sealTurn);\n",
    "    /* —— 功能 40：镇妖铃 10/15；【诅咒】≥4 层才消耗 4 层、镇魂 2 回合（v0.61.35） —— */\n"
    "    g = dt(); g.enemies[0].curse = 2;\n"
    "    g.hand = [dup('zhenyaoling')]; g.drawPile = []; g.discard = []; g.exhausted = [];\n"
    "    doPlayCard(0);\n"
    "    __ok('v0.60 D#40 镇妖铃升级 15 伤 + 诅咒<4 层仅镇魂 1 回合',\n"
    "      g.enemies[0].hp === 485 && g.enemies[0].seal === true && g.enemies[0].sealTurn === 1,\n"
    "      'ehp=' + g.enemies[0].hp + ' seal=' + g.enemies[0].seal + ' sealTurn=' + g.enemies[0].sealTurn);\n"
    "    g = dt(); g.enemies[0].curse = 4;\n"
    "    g.hand = [dup('zhenyaoling')]; g.drawPile = []; g.discard = []; g.exhausted = [];\n"
    "    doPlayCard(0);\n"
    "    __ok('v0.61.35 D#40 镇妖铃 诅咒≥4 层 → 消耗 4 层、镇魂 2 回合',\n"
    "      g.enemies[0].hp === 485 && g.enemies[0].curse === 0 && g.enemies[0].seal === true && g.enemies[0].sealTurn === 2,\n"
    "      'ehp=' + g.enemies[0].hp + ' curse=' + g.enemies[0].curse + ' sealTurn=' + g.enemies[0].sealTurn);\n",
    '镇妖铃')

# ═══════════ 10. 纸人 ═══════════
rep("    /* —— 召唤 41：纸人 基础 2/3；目标带诅咒再 +2/+3 —— */\n"
    "    g = dt(); g.hand = [__card('zhiren')]; g.drawPile = []; g.discard = []; g.exhausted = [];\n"
    "    doPlayCard(0);\n"
    "    __ok('v0.60 D#41 纸人 基础每回合 2 伤', g.summons[0] && g.summons[0].v === 2,\n"
    "      'v=' + (g.summons[0] && g.summons[0].v));\n"
    "    g = dt(); g.enemies[0].curse = 4; g.summons = [{ type: 'zhiren', v: 2, dur: 2, up: false }];\n"
    "    summonAct(g.summons[0]);\n"
    "    __ok('v0.60 D#41 纸人 目标带诅咒 2+2=4 伤（不分层数）', g.enemies[0].hp === 496, 'ehp=' + g.enemies[0].hp);\n"
    "    g = dt(); g.enemies[0].curse = 4; g.summons = [{ type: 'zhiren', v: 3, dur: 2, up: true }];\n"
    "    summonAct(g.summons[0]);\n"
    "    __ok('v0.60 D#41u 纸人升级 3+3=6 伤', g.enemies[0].hp === 494, 'ehp=' + g.enemies[0].hp);\n",
    "    /* —— 召唤 41：纸人 每回合末 2/3 伤 **并施加 1/2 层【诅咒】**（v0.61.35 去掉旧「带诅咒增伤」） —— */\n"
    "    g = dt(); g.hand = [__card('zhiren')]; g.drawPile = []; g.discard = []; g.exhausted = [];\n"
    "    doPlayCard(0);\n"
    "    __ok('v0.60 D#41 纸人 基础每回合 2 伤', g.summons[0] && g.summons[0].v === 2,\n"
    "      'v=' + (g.summons[0] && g.summons[0].v));\n"
    "    g = dt(); g.summons = [{ type: 'zhiren', v: 2, dur: 2, up: false }];\n"
    "    summonAct(g.summons[0]);\n"
    "    __ok('v0.61.35 D#41 纸人 回合末 2 伤 + 施 1 层【诅咒】',\n"
    "      g.enemies[0].hp === 498 && g.enemies[0].curse === 1,\n"
    "      'ehp=' + g.enemies[0].hp + ' curse=' + g.enemies[0].curse);\n"
    "    g = dt(); g.summons = [{ type: 'zhiren', v: 3, dur: 2, up: true }];\n"
    "    summonAct(g.summons[0]);\n"
    "    __ok('v0.61.35 D#41u 纸人升级 3 伤 + 施 2 层【诅咒】',\n"
    "      g.enemies[0].hp === 497 && g.enemies[0].curse === 2,\n"
    "      'ehp=' + g.enemies[0].hp + ' curse=' + g.enemies[0].curse);\n",
    '纸人')

# ═══════════ 11. 五通神 / 小鬼 + 新增守一、佛渡、燃血术 ═══════════
rep("    /* —— 召唤 45：五通神 立即 4 格挡 + 1 诅咒 —— */\n",
    "    /* —— 召唤 45：五通神 立即 6 格挡 + 1 诅咒（v0.61.35：天师列 4→6） —— */\n", '五通神注释')
rep("    __ok('v0.60 D#45 五通神 立即 4 格挡 + 1 诅咒、升级剩 3 回合',\n"
    "      g.block === 4 && __sumCurse() === 1 && g.summons[0].dur === 2,\n",
    "    __ok('v0.60 D#45 五通神 立即 6 格挡 + 1 诅咒、升级剩 3 回合',\n"
    "      g.block === 6 && __sumCurse() === 1 && g.summons[0].dur === 2,\n", '五通神断言')

rep("    /* —— 召唤 43：小鬼 3/4 —— */\n"
    "    g = dt(); g.hand = [__card('xiaogui')]; g.drawPile = []; g.discard = []; g.exhausted = [];\n"
    "    doPlayCard(0);\n"
    "    __ok('v0.60 D#43 小鬼 每回合 3 伤', g.summons[0] && g.summons[0].v === 3, 'v=' + (g.summons[0] && g.summons[0].v));\n",
    "    /* —— 召唤 43：小鬼 天师列 2/3；目标改**随机**，命中带【诅咒】则本击 +2/3（v0.61.35） —— */\n"
    "    g = dt(); g.hand = [__card('xiaogui')]; g.drawPile = []; g.discard = []; g.exhausted = [];\n"
    "    doPlayCard(0);\n"
    "    __ok('v0.60 D#43 小鬼 每回合 2 伤', g.summons[0] && g.summons[0].v === 2, 'v=' + (g.summons[0] && g.summons[0].v));\n"
    "    g = dt(); g.enemies[0].curse = 1; g.summons = [{ type: 'xiaogui', v: 2, dur: 2, up: false }];\n"
    "    summonAct(g.summons[0]);\n"
    "    __ok('v0.61.35 D#43 小鬼(天师) 命中带【诅咒】目标 2+2=4 伤',\n"
    "      g.enemies[0].hp === 496, 'ehp=' + g.enemies[0].hp);\n"
    "    g = dt(); g.summons = [{ type: 'xiaogui', v: 3, dur: 2, up: true }];\n"
    "    summonAct(g.summons[0]);\n"
    "    __ok('v0.61.35 D#43u 小鬼升级 命中无诅咒目标 3 伤（不加成）',\n"
    "      g.enemies[0].hp === 497, 'ehp=' + g.enemies[0].hp);\n"
    "\n"
    "    /* —— v0.61.35 守一(#26)天师列：保留【诅咒牌】→ **该牌自身**下回合 -1 费，只持续一回合 —— */\n"
    "    g = __base('tianshi');\n"
    "    var _syCurse = Object.assign({}, __card('huofu')), _syPlain = Object.assign({}, __card('jingang'));\n"
    "    var _turn0 = g.turn || 0;\n"
    "    g.hand = [_syCurse, _syPlain]; g.retainSelect = { need: 1, picked: [0, 1] };\n"
    "    g.enemies.forEach(function (x) { x.hp = 0; });   // 关掉 enemyAct 的干扰，只测保留结算\n"
    "    confirmRetainSelect();\n"
    "    __ok('v0.61.35 守一(天师) 只给保留到的【诅咒牌】挂减免时间戳（普通牌不挂）',\n"
    "      _syCurse.costCutTurn === _turn0 + 1 && !_syPlain.costCutTurn,\n"
    "      'curse=' + _syCurse.costCutTurn + ' plain=' + _syPlain.costCutTurn);\n"
    "    g.turn = _turn0;\n"
    "    __ok('v0.61.35 守一(天师) 结算当回合不减费（下一回合才生效）',\n"
    "      effectiveCost(_syCurse) === cardCost(_syCurse), 'cost=' + effectiveCost(_syCurse));\n"
    "    g.turn = _turn0 + 1;\n"
    "    __ok('v0.61.35 守一(天师) 下回合该牌自身 -1 费',\n"
    "      effectiveCost(_syCurse) === cardCost(_syCurse) - 1, 'cost=' + effectiveCost(_syCurse));\n"
    "    __ok('v0.61.35 守一(天师) 同批保留的普通牌不跟着减费（只减该牌自己）',\n"
    "      effectiveCost(_syPlain) === cardCost(_syPlain), 'cost=' + effectiveCost(_syPlain));\n"
    "    g.turn = _turn0 + 2;\n"
    "    __ok('v0.61.35 守一(天师) 只持续一回合（再下一回合恢复原价）',\n"
    "      effectiveCost(_syCurse) === cardCost(_syCurse), 'cost=' + effectiveCost(_syCurse));\n"
    "    g.turn = _turn0 + 3;\n"
    "    var _syFree = Object.assign({}, __card('juling'), { costCutTurn: _turn0 + 3 });\n"
    "    __ok('v0.61.35 守一(天师) 减费不低于 0（0 费牌挂上标记仍是 0）',\n"
    "      cardCost(_syFree) === 0 && effectiveCost(_syFree) === 0, 'cost=' + effectiveCost(_syFree));\n"
    "    g = dt(); g.turn = 1;\n"
    "    var _syOnce = Object.assign({}, __card('juling'), { costCutTurn: 1 });\n"
    "    g.hand = [_syOnce]; g.drawPile = []; g.discard = []; g.exhausted = [];\n"
    "    doPlayCard(0);\n"
    "    __ok('v0.61.35 守一(天师) 减免是一次性的：打出即清标记（同回合再回手不会二次减免）',\n"
    "      !_syOnce.costCutTurn, 'flag=' + _syOnce.costCutTurn);\n"
    "\n"
    "    /* —— v0.61.35 佛渡 / 燃血术：两张「按列分叉」的牌逐列钉住 —— */\n"
    "    var FD = __card('fodu');\n"
    "    __base('ganshiren'); var _fdA = FD.t(true);\n"
    "    __base('wuseng'); var _fdB = FD.t(true);\n"
    "    __base('yincha'); var _fdC = FD.t(true);\n"
    "    __base('tianshi'); var _fdT = FD.t(true);\n"
    "    __ok('v0.61.35 佛渡 升级附加：天师 5 格挡 / 阴差 3 格挡 / 武僧 4 格挡 / 赶尸人 2 尸气',\n"
    "      _fdT.indexOf('5 点格挡') >= 0 && _fdC.indexOf('3 点格挡') >= 0 &&\n"
    "      _fdB.indexOf('4 点格挡') >= 0 && _fdA.indexOf('2 点【尸气】') >= 0,\n"
    "      _fdT + ' | ' + _fdC + ' | ' + _fdB + ' | ' + _fdA);\n"
    "    var RX = __card('ranxue');\n"
    "    __base('ganshiren'); var _rxA = [RX.t(false), RX.t(true)];\n"
    "    __base('wuseng'); var _rxB = [RX.t(false), RX.t(true)];\n"
    "    __base('yincha'); var _rxC = [RX.t(false), RX.t(true)];\n"
    "    __base('tianshi'); var _rxT = [RX.t(false), RX.t(true)];\n"
    "    __ok('v0.61.35 燃血术 天师列固定失 8 生命（升级不再减到 3）',\n"
    "      _rxT[0].indexOf('失去 8 生命') >= 0 && _rxT[1].indexOf('失去 8 生命') >= 0,\n"
    "      _rxT.join(' / '));\n"
    "    __ok('v0.61.35 燃血术 其余三列各自不变（A 4/4、B 6/6、C 4/6）',\n"
    "      _rxA[0].indexOf('失去 4 生命') >= 0 && _rxA[1].indexOf('失去 4 生命') >= 0 &&\n"
    "      _rxB[0].indexOf('失去 6 生命') >= 0 && _rxB[1].indexOf('失去 6 生命') >= 0 &&\n"
    "      _rxC[0].indexOf('失去 4 生命') >= 0 && _rxC[1].indexOf('失去 6 生命') >= 0,\n"
    "      _rxA.join('/') + ' | ' + _rxB.join('/') + ' | ' + _rxC.join('/'));\n",
    '小鬼+守一+佛渡+燃血术')

# ═══════════ 12. 预伤徽章 ═══════════
rep("    __ok('v0.60 D 预伤害 群鬼乱舞 5+3=8', previewDamage(__card('qungui')).d === 8, 'd=' + previewDamage(__card('qungui')).d);\n"
    "    __ok('v0.60 D 预伤害 百鬼夜行 7+3=10', previewDamage(__card('baigui')).d === 10, 'd=' + previewDamage(__card('baigui')).d);\n"
    "    __ok('v0.60 D 预伤害 钟馗镇魂 15+3×5=30', previewDamage(__card('zhongkui')).d === 30, 'd=' + previewDamage(__card('zhongkui')).d);\n"
    "    __ok('v0.60 D 预伤害 斩妖剑 8+2×5=18', previewDamage(__card('zhanyaojian')).d === 18, 'd=' + previewDamage(__card('zhanyaojian')).d);\n",
    "    __ok('v0.60 D 预伤害 群鬼乱舞 6+3=9', previewDamage(__card('qungui')).d === 9, 'd=' + previewDamage(__card('qungui')).d);\n"
    "    __ok('v0.60 D 预伤害 百鬼夜行 8+3=11', previewDamage(__card('baigui')).d === 11, 'd=' + previewDamage(__card('baigui')).d);\n"
    "    __ok('v0.60 D 预伤害 钟馗镇魂 16+3×3=25（v0.61.35）', previewDamage(__card('zhongkui')).d === 25, 'd=' + previewDamage(__card('zhongkui')).d);\n"
    "    __ok('v0.60 D 预伤害 斩妖剑 10+2×5=20（v0.61.35）', previewDamage(__card('zhanyaojian')).d === 20, 'd=' + previewDamage(__card('zhanyaojian')).d);\n",
    '预伤 群鬼/百鬼/钟馗/斩妖')
rep("    __ok('v0.60 D 预伤害 纸人 2+2(带诅咒)=4', previewDamage(__card('zhiren')).d === 4, 'd=' + previewDamage(__card('zhiren')).d);\n",
    "    __ok('v0.61.35 D 预伤害 纸人 恒为 2（去掉带诅咒增伤后，预览=基础每回合伤）', previewDamage(__card('zhiren')).d === 2, 'd=' + previewDamage(__card('zhiren')).d);\n",
    '预伤 纸人')
rep("    __ok('v0.60 D 预伤害 剑符 诅咒≥3 → 18 且常显', previewDamage(__card('jianfu')).d === 18 && previewDamage(__card('jianfu')).dynamic === true,\n",
    "    __ok('v0.60 D 预伤害 剑符 诅咒≥3 → 30 且常显（v0.61.35：15×2）', previewDamage(__card('jianfu')).d === 30 && previewDamage(__card('jianfu')).dynamic === true,\n",
    '预伤 剑符')

# ═══════════ 13. v0.61.10 P5 两条（蚀魂咒/钟馗的分列断言）═══════════
rep("    __ok('v0.61.10 P5 蚀魂咒 只有天师列升到 4/7，其余三列不动',\n"
    "      _a[0].indexOf('3 伤害') >= 0 && _a[1].indexOf('6 伤害') >= 0 &&\n"
    "      _b[0].indexOf('5 伤害') >= 0 && _b[1].indexOf('7 伤害') >= 0 &&\n"
    "      _c[0].indexOf('5 伤害') >= 0 && _c[1].indexOf('8 伤害') >= 0 &&\n"
    "      _d[0].indexOf('4 伤害') >= 0 && _d[1].indexOf('7 伤害') >= 0,\n"
    "      _d.join(' / '));\n",
    "    __ok('v0.61.35 蚀魂咒 天师列改为 3/8（v0.61.10 P5 的 4/7 作废），其余三列不动',\n"
    "      _a[0].indexOf('3 伤害') >= 0 && _a[1].indexOf('6 伤害') >= 0 &&\n"
    "      _b[0].indexOf('5 伤害') >= 0 && _b[1].indexOf('7 伤害') >= 0 &&\n"
    "      _c[0].indexOf('5 伤害') >= 0 && _c[1].indexOf('8 伤害') >= 0 &&\n"
    "      _d[0].indexOf('3 伤害') >= 0 && _d[1].indexOf('8 伤害') >= 0,\n"
    "      _d.join(' / '));\n",
    'P5 蚀魂咒')
rep("    __ok('v0.61.10 P5 钟馗镇魂 只有天师列升到 18/24，其余三列不动',\n"
    "      _e.indexOf('16 伤害') >= 0 && _f.indexOf('16 伤害') >= 0 && _i.indexOf('16 伤害') >= 0 &&\n"
    "      _j[0].indexOf('18 伤害') >= 0 && _j[1].indexOf('24 伤害') >= 0,\n"
    "      _j.join(' / '));\n",
    "    __ok('v0.61.35 钟馗镇魂 天师列改为主伤 16 固定 + 每层 3/4，其余三列不动',\n"
    "      _e.indexOf('16 伤害') >= 0 && _f.indexOf('16 伤害') >= 0 && _i.indexOf('16 伤害') >= 0 &&\n"
    "      _j[0].indexOf('16 伤害') >= 0 && _j[0].indexOf('每层 3 伤害') >= 0 &&\n"
    "      _j[1].indexOf('16 伤害') >= 0 && _j[1].indexOf('每层 4 伤害') >= 0,\n"
    "      _j.join(' / '));\n",
    'P5 钟馗')

# ═══════════ 14. v0.61.33 A① 预伤指向两条 ═══════════
rep("    __ok('v0.61.33 A① 升级雷符同口径（拖到不带诅咒=9 / 带诅咒=9+3=12）',\n"
    "      previewDamage(lfU, G.enemies[1]).d === 9 && previewDamage(lfU, G.enemies[0]).d === 12,\n"
    "      previewDamage(lfU, G.enemies[1]).d + '/' + previewDamage(lfU, G.enemies[0]).d);\n",
    "    __ok('v0.61.33 A① 升级雷符同口径（拖到不带诅咒=9 / 带诅咒=9+4=13，v0.61.35 加成升到 +4）',\n"
    "      previewDamage(lfU, G.enemies[1]).d === 9 && previewDamage(lfU, G.enemies[0]).d === 13,\n"
    "      previewDamage(lfU, G.enemies[1]).d + '/' + previewDamage(lfU, G.enemies[0]).d);\n",
    'A① 雷符升级')
rep("    G = __base('ganshiren'); G.enemies[0].curse = 1; G.enemies[1].curse = 5; G.target = 0;\n"
    "    var xg = Object.assign({}, __card('xiaogui'), { up: false });\n"
    "    __ok('v0.61.33 A① 小鬼预览仍取「诅咒最高」(5层)，不被显式目标改写',\n"
    "      previewDamage(xg, G.enemies[0]).curse === 5, 'curse=' + previewDamage(xg, G.enemies[0]).curse);\n",
    "    G = __base('tianshi'); G.enemies[0].curse = 1; G.enemies[1].curse = 5; G.target = 0;\n"
    "    var xg = Object.assign({}, __card('xiaogui'), { up: false });\n"
    "    var ybg = Object.assign({}, __card('yinbingguo'), { up: false });\n"
    "    __ok('v0.61.35 小鬼预览不再借用「诅咒最高」那只（天师目标已改随机）',\n"
    "      previewDamage(xg, G.enemies[0]).curse === 1, 'curse=' + previewDamage(xg, G.enemies[0]).curse);\n"
    "    __ok('v0.61.35 阴兵预览仍取「诅咒最高」那只（指向机制未变，防误伤）',\n"
    "      previewDamage(ybg, G.enemies[0]).curse === 5, 'curse=' + previewDamage(ybg, G.enemies[0]).curse);\n",
    'A① 小鬼指向')

# ═══════════ 落盘 ═══════════
if errs:
    print('=== 锚点校验失败，未写入任何文件 ===')
    for e in errs:
        print(' ✗', e)
    sys.exit(1)

io.open(S, 'w', encoding='utf-8', newline='').write(body.replace('\n', nl))
print('OK smoke_runner.js %d 字符' % len(body))
print('注: smoke_runner.js 正文含 `,,`（断言文案里引用了 grep -n ",,"），故不对它跑 ,, 守卫')