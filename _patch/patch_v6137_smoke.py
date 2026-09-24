# -*- coding: utf-8 -*-
"""v0.61.37 · 冒烟：改掉 32 条过期断言（A 列旧值 / 旧被动 / 旧牌库）+ 新增一批新值·反误伤·预尸气断言。

铁律：count 必须精确、全或无、换行归一。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, '_patch', 'smoke_runner.js')

FIX = []          # (old, new, count, label)
NEW_BLOCK = []    # 一次性插入


def fx(old, new, label, n=1):
    FIX.append((old, new, n, label))


# ══════════════════ A. 过期断言逐条改 ══════════════════
fx("__ok('A#41 纸人 入召唤槽(计数1/持续2+被动1=3)', g.summonsMadeTurn === 1 && g.summons[0].type === 'zhiren' && g.summons[0].dur === 3",
   "__ok('A#41 纸人 入召唤槽(计数1/持续2；v0.61.37 删掉寿命+1 被动 → 与卡面一致)', g.summonsMadeTurn === 1 && g.summons[0].type === 'zhiren' && g.summons[0].dur === 2",
   'A#41 纸人 dur 3 → 2')

fx('// ===== Block4 攻击批 A 列修正（雷符4/7+击杀2尸气 / 蚀魂3/6+回血 / 钟馗16/24+无条件4/5）=====',
   '// ===== Block4 攻击批 A 列修正（雷符5/7+击杀2/3尸气 / 蚀魂4/8+回血 / 钟馗16/24+无条件4/6）· v0.61.37 再调 =====',
   'Block4 攻击批注释')

fx("__ok('A#1 雷符 基础4+召唤1=5伤', bh - t.hp === 5",
   "__ok('A#1 雷符 基础5+召唤1=6伤', bh - t.hp === 6",
   'A#1 雷符 5+1=6')

fx("__ok('A#11 蚀魂 基础3伤+每召唤回1血', bh - t.hp === 3 && g.hp === hp0 + 1",
   "__ok('A#11 蚀魂 基础4伤+每召唤回1血', bh - t.hp === 4 && g.hp === hp0 + 1",
   'A#11 蚀魂 4 伤')

fx("__ok('A#14u 钟馗 升级24伤+5尸气', bh - t.hp === 24 && g.尸气 === 5",
   "__ok('A#14u 钟馗 升级24伤+6尸气', bh - t.hp === 24 && g.尸气 === 6",
   'A#14u 钟馗 6 尸气')

fx("__ok('D#17 金光罩 基础10格+耗2尸气+4格', g.block === 14 && g.尸气 === 0",
   "__ok('D#17 金光罩 基础9格+耗2尸气+5格（=14）', g.block === 14 && g.尸气 === 0",
   'D#17 金光罩 标签(9+5=14)')
fx("__ok('D#17u 金光罩 升级15格+耗2尸气+5格', g.block === 20 && g.尸气 === 0",
   "__ok('D#17u 金光罩 升级14格+耗2尸气+7格（=21）', g.block === 21 && g.尸气 === 0",
   'D#17u 金光罩 20 → 21')

fx("__ok('D#21 铜皮 基础9格+反弹4+召唤1', g.block === 9 && G.thorns === 5",
   "__ok('D#21 铜皮 基础8格+反弹4+召唤1', g.block === 8 && G.thorns === 5",
   'D#21 铜皮 格挡 9 → 8')
fx("__ok('D#21u 铜皮 升级12格+反弹6+召唤1', g.block === 12 && G.thorns === 7",
   "__ok('D#21u 铜皮 升级12格+反弹5+召唤1', g.block === 12 && G.thorns === 6",
   'D#21u 铜皮 反弹 6+1 → 5+1')

fx("__ok('F#38 移形换影 闪避+成功后2尸气', G.dodge === 1 && G.dodgeShiqi === 2",
   "__ok('F#38 移形换影 闪避+成功后1尸气（未升级；v0.61.37 1/3）', G.dodge === 1 && G.dodgeShiqi === 1",
   'F#38 移形换影 1 尸气')

fx("__ok('S#46 咒雨 引爆6尸气→36伤害+清零', g.尸气 === 0 && (__hp0 - __sumHp()) === 36, '尸气=' + g.尸气 + ' dmg=' + (__hp0 - __sumHp())); })();",
   "__ok('S#46 咒雨 引爆6尸气→30伤害+清零+回6血（清零算消耗）', g.尸气 === 0 && (__hp0 - __sumHp()) === 30 && g.hp === 66, '尸气=' + g.尸气 + ' dmg=' + (__hp0 - __sumHp()) + ' hp=' + g.hp); })();",
   'S#46 咒雨 36 → 30 + 回血')

fx("__ok('A#27 易物 换出鬼怪牌→1尸气', g.尸气 === 1",
   "__ok('A#27 易物 换出鬼怪牌→2尸气', g.尸气 === 2",
   'A#27 易物 2 尸气')

# 附灵术：把「目标带诅咒 +2」的随机性去掉 —— 两只敌人全上诅咒，伤害必为 3+2
fx("g = __base('tianshi'); g.summons = [{ type: 'xiaogui', v: 3, dur: 2 }];\n    g.enemies[0].curse = 3; var hp0 = __sumHp();",
   "g = __base('tianshi'); g.summons = [{ type: 'xiaogui', v: 3, dur: 2 }];\n"
   "    // v0.61.37：小鬼目标自 v0.61.35 起是**随机**的，只给 enemies[0] 上诅咒会让本用例随机红/绿。\n"
   "    // 两只都上，则无论随机命中谁都是 3+2=5，断言变确定。\n"
   "    g.enemies.forEach(function (e) { e.curse = 3; }); var hp0 = __sumHp();",
   '附灵术 随机器确定化')
fx("__ok('D#39 附灵 触发小鬼打最诅咒敌人(3伤)', __sumHp() === hp0 - 3",
   "__ok('D#39 附灵 触发小鬼攻击（目标带诅咒 +2 → 5伤）', __sumHp() === hp0 - 5",
   'D#39 附灵 3 → 5')

fx("var zeroUp = ['tongling', 'jingxin', 'xueji']; // tiebushan 已按列取费（B 0 费不可升级）；yixing 按列分叉（B/D 1/1），另测",
   "var zeroUp = ['tongling', 'jingxin', 'xueji']; // tiebushan 已按列取费（B 0 费不可升级）；yixing 按列分叉（B/D/A 1/1），另测",
   'zeroUp 注释')
fx("// v0.61.35 天师列、v0.61.36 武僧列：移形换影取消 (U:0) → 1/1；只剩 A/C 两列仍 1/0\n"
   "    ['ganshiren', 'yincha'].forEach(function (h) {\n"
   "      __base(h); var cy = Object.assign({}, __card('yixing'), { up: true });\n"
   "      __ok('移形换影 ' + h + ' 升级 0 费（A/C 两列仍 1/0）',",
   "// v0.61.35 天师列、v0.61.36 武僧列、v0.61.37 赶尸人列：移形换影取消 (U:0) → 1/1；只剩 C 列仍 1/0\n"
   "    ['yincha'].forEach(function (h) {\n"
   "      __base(h); var cy = Object.assign({}, __card('yixing'), { up: true });\n"
   "      __ok('移形换影 ' + h + ' 升级 0 费（仅剩 C 列 1/0）',",
   '移形换影 0 费名单只剩 C')
fx("['tianshi', 'wuseng'].forEach(function (h) {\n"
   "      __base(h); var cy = Object.assign({}, __card('yixing'), { up: true });\n"
   "      __ok('移形换影 ' + h + ' 升级仍 1 费（取消 (U:0)）',",
   "['tianshi', 'wuseng', 'ganshiren'].forEach(function (h) {\n"
   "      __base(h); var cy = Object.assign({}, __card('yixing'), { up: true });\n"
   "      __ok('移形换影 ' + h + ' 升级仍 1 费（取消 (U:0)）',",
   '移形换影 1 费名单加 A')

fx("__ok('雷符预览 A=4+2召唤=6', lv('leifu').d === 6",
   "__ok('雷符预览 A=5+2召唤=7', lv('leifu').d === 7",
   '雷符预览 A 6 → 7')

fx("__ok('v0.58 B#40 镇妖铃 赶尸人预览仍 10/16',\n"
   "      previewDamage(__card('zhenyaoling')).d === 10 && previewDamage(Object.assign({}, __card('zhenyaoling'), { up: true })).d === 16,",
   "__ok('v0.58 B#40 镇妖铃 赶尸人预览 10/15（v0.61.37 升级 16 → 15）',\n"
   "      previewDamage(__card('zhenyaoling')).d === 10 && previewDamage(Object.assign({}, __card('zhenyaoling'), { up: true })).d === 15,",
   '镇妖铃 A 预览 16 → 15')

fx("__ok('#2 火符A 弃掉鬼怪牌 +1 尸气',\n      G.尸气 === 1",
   "__ok('#2 火符A 弃掉鬼怪牌 +2 尸气（v0.61.37 1 → 2）',\n      G.尸气 === 2",
   '火符A 弃鬼怪 2 尸气')
fx("__ok('#2 火符A 升级 弃鬼怪牌 +2 尸气', G.尸气 === 2",
   "__ok('#2 火符A 升级 弃鬼怪牌 +3 尸气（v0.61.37 2 → 3）', G.尸气 === 3",
   '火符A 升级 3 尸气')

fx("// ---- #38 移形换影：A 列升级补「（0 符文）」----\n"
   "    g = __base('ganshiren');\n"
   "    var yx = __card('yixing');\n"
   "    __ok('#38 移形换影 A 升级文案含「0 符文」', yx.t(true).indexOf('0 符文') >= 0, yx.t(true));\n"
   "    __ok('#38 移形换影 A 未升级文案不含「0 符文」', yx.t(false).indexOf('0 符文') < 0, yx.t(false));",
   "// ---- #38 移形换影：v0.61.37 A 列改 1/1（取消 (U:0)）→ 升级档不再有「0 符文」后缀，改核尸气 1/3 ----\n"
   "    g = __base('ganshiren');\n"
   "    var yx = __card('yixing');\n"
   "    __ok('#38 移形换影 A 1/1：费用升级前后都是 1（cardCost/effectiveCost 双路径）',\n"
   "      cardCost(yx) === 1 && cardCost(Object.assign({}, yx, { up: true })) === 1 &&\n"
   "      effectiveCost(Object.assign({}, yx, { up: true })) === 1,\n"
   "      'cost=' + cardCost(yx) + ' upCost=' + cardCost(Object.assign({}, yx, { up: true })));\n"
   "    __ok('#38 移形换影 A 文案分档 1/3 点【尸气】且已去掉「0 符文」',\n"
   "      yx.t(false).indexOf('获得 1 点【尸气】') >= 0 && yx.t(true).indexOf('获得 3 点【尸气】') >= 0 &&\n"
   "      yx.t(true).indexOf('0 符文') < 0,\n"
   "      yx.t(false) + ' || ' + yx.t(true));",
   '#38 移形换影 A 1/1 文案')

fx("__ok('⑤ 预览 咒雨 = 尸气 5 × 6 = 30', previewDamage(__card('zhouyu')).d === 30",
   "__ok('⑤ 预览 咒雨 = 尸气 5 × 5 = 25（v0.61.37 每层 6 → 5）', previewDamage(__card('zhouyu')).d === 25",
   '咒雨预览 30 → 25')

fx("__ok('⑤ 预览 镇妖铃 赶尸人 = 10/16',\n"
   "      previewDamage(__card('zhenyaoling')).d === 10 && previewDamage(Object.assign({}, __card('zhenyaoling'), { up: true })).d === 16,",
   "__ok('⑤ 预览 镇妖铃 赶尸人 = 10/15（v0.61.37 升级 16 → 15）',\n"
   "      previewDamage(__card('zhenyaoling')).d === 10 && previewDamage(Object.assign({}, __card('zhenyaoling'), { up: true })).d === 15,",
   '咒雨旁 镇妖铃 预览')

fx("__ok('v0.58 B#46 咒雨(赶尸人) 仍 2 费', cardCost(__card('zhouyu')) === 2",
   "__ok('v0.61.37 咒雨(赶尸人) 3 费（原 2 费；B 仍 0 费不受影响）', cardCost(__card('zhouyu')) === 3",
   '咒雨 A 费 2 → 3')

fx("          赶尸人 A ：雷符×2 金刚符×2 佛渡×1 舍身×1 血契×1 纸人×1 尸王×1 守一×1 小鬼×1 = 11 张 —— */",
   "          赶尸人 A ：雷符×2 金刚符×1 咒印×1 舍身×1 附灵术×1 纸人×1 尸王×1 守一×1 小鬼×1 五通神×1 = 11 张（v0.61.37 换新） —— */",
   '初始卡池注释')

fx("__ok('v0.60.02 赶尸人初始卡池 11 张且组成正确', ga_.n === 11 &&\n"
   "      ga_.s === 'leifux2 jingangx2 fodux1 sheshenx1 xueqix1 zhirenx1 shi_wangx1 shouyix1 xiaoguix1',",
   "__ok('v0.61.37 赶尸人初始卡池 11 张且组成正确（金刚符 2→1、去佛渡/血契、加咒印/附灵术/五通神）', ga_.n === 11 &&\n"
   "      ga_.s === 'leifux2 jingangx1 zhouyinx1 sheshenx1 fulingx1 zhirenx1 shi_wangx1 shouyix1 xiaoguix1 wutongx1',",
   '赶尸人卡池串')

fx("__ok('v0.61.35 燃血术 三列各自不变（A 4/4、B 8/8、C 4/6；B 于 v0.61.36 改）',\n"
   "      _rxA[0].indexOf('失去 4 点生命') >= 0 && _rxA[1].indexOf('失去 4 点生命') >= 0 &&",
   "__ok('v0.61.37 燃血术 A 列 4 → 8（与武僧同值）；B 8/8、C 4/6 不动',\n"
   "      _rxA[0].indexOf('失去 8 点生命') >= 0 && _rxA[1].indexOf('失去 8 点生命') >= 0 &&",
   '燃血术 A 8/8')

fx("__ok('v0.61 B7 确认弃牌后才结算伤害（5 伤）+ 鬼怪牌 1 尸气',\n"
   "      e.hp === 55 && G.尸气 === 1 && G.huofuSelect === null, 'hp=' + e.hp + ' 尸气=' + G.尸气);",
   "__ok('v0.61 B7 确认弃牌后才结算伤害（5 伤）+ 鬼怪牌 2 尸气（v0.61.37）',\n"
   "      e.hp === 55 && G.尸气 === 2 && G.huofuSelect === null, 'hp=' + e.hp + ' 尸气=' + G.尸气);",
   'B7 火符 2 尸气')

fx("__ok('v0.61.35 蚀魂咒 天师列改为 3/8（v0.61.10 P5 的 4/7 作废），其余三列不动',\n"
   "      _a[0].indexOf('3 伤害') >= 0 && _a[1].indexOf('6 伤害') >= 0 &&",
   "__ok('v0.61.37 蚀魂咒 A 列 3/6 → 4/8；天师 3/8、B 5/7、C 5/8 不动',\n"
   "      _a[0].indexOf('4 伤害') >= 0 && _a[1].indexOf('8 伤害') >= 0 &&",
   '蚀魂咒 A 4/8')

fx("    /* —— P6 赶尸人新被动：4 种召唤物寿命 +1；尸王排除；其他英雄不受影响 —— */\n"
   "    // 注意：id 用**卡牌 id**（阴兵是 yinbingguo，'yinbing' 只是召唤物 type）；\n"
   "    // BASE 是「非赶尸人英雄打出后立即看到的 dur」——五通神现形当回合会走一次 wutongTick，所以是 1 不是 2。\n"
   "    var BASE = { zhiren: 2, xiaogui: 2, wutong: 1, yinbingguo: 3 };\n"
   "    var badLife = [];\n"
   "    Object.keys(BASE).forEach(function (id) {\n"
   "      g = __base('wuseng');\n"
   "      var cc = __card(id); cc.eff(false, cc);\n"
   "      var sm = g.summons[g.summons.length - 1];\n"
   "      var base = sm && sm.dur;\n"
   "      if (base !== BASE[id]) badLife.push('基准 ' + id + ':' + base + '≠' + BASE[id]);\n"
   "      g = __base('ganshiren');\n"
   "      cc = __card(id); cc.eff(false, cc);\n"
   "      sm = g.summons[g.summons.length - 1];\n"
   "      if (!sm || sm.dur !== base + 1) badLife.push('A ' + id + ':' + (sm && sm.dur) + '≠' + (base + 1));\n"
   "    });\n"
   "    __ok('v0.61.10 P6 赶尸人 纸人/小鬼/五通神/阴兵 寿命恰好 +1，其他英雄不加', badLife.length === 0, badLife.join(' '));",
   "    /* —— v0.61.37：v0.61.10 P6 的「4 种召唤物寿命 +1」被动**已删除**（换成「每消耗 1 尸气回 1 血」）。\n"
   "          寿命偏移的唯一来源没了 → A 列 dur 从此与**卡面完全一致**，与非赶尸人英雄逐字相同。\n"
   "          注意：id 用**卡牌 id**（阴兵是 yinbingguo，'yinbing' 只是召唤物 type）；\n"
   "          BASE 是「打出后立即看到的 dur」——五通神现形当回合会走一次 wutongTick，所以是 1 不是 2。 */\n"
   "    var BASE = { zhiren: 2, xiaogui: 2, wutong: 1, yinbingguo: 3 };\n"
   "    var badLife = [];\n"
   "    Object.keys(BASE).forEach(function (id) {\n"
   "      g = __base('wuseng');\n"
   "      var cc = __card(id); cc.eff(false, cc);\n"
   "      var sm = g.summons[g.summons.length - 1];\n"
   "      var base = sm && sm.dur;\n"
   "      if (base !== BASE[id]) badLife.push('基准 ' + id + ':' + base + '≠' + BASE[id]);\n"
   "      g = __base('ganshiren');\n"
   "      cc = __card(id); cc.eff(false, cc);\n"
   "      sm = g.summons[g.summons.length - 1];\n"
   "      if (!sm || sm.dur !== base) badLife.push('A ' + id + ':' + (sm && sm.dur) + '≠' + base + '（被动已删，应与基准相同）');\n"
   "    });\n"
   "    __ok('v0.61.37 删掉寿命+1 被动后：A 列 纸人/小鬼/五通神/阴兵 dur 与卡面（非赶尸人）完全一致', badLife.length === 0, badLife.join(' '));",
   'P6 寿命+1 → 已删（dur 相等）')

fx("    // 升级版只叠「卡面自带的 dur 提升」，被动不双计：阴兵 3 → 升级仍 3 → 被动 +1 = 4\n"
   "    g = __base('ganshiren'); g.尸气 = 0;\n"
   "    var ybg = __card('yinbingguo'); ybg.eff(true, ybg);\n"
   "    __ok('v0.61.10 P6 被动只加一次（升级阴兵 3 → 4，不是 5）',\n"
   "      g.summons.every(function (s) { return s.dur === 4; }) && g.summons.length === 3,",
   "    // 升级阴兵本就不加 dur（卡面 3/3），旧被动删除后仍是 3\n"
   "    g = __base('ganshiren'); g.尸气 = 0;\n"
   "    var ybg = __card('yinbingguo'); ybg.eff(true, ybg);\n"
   "    __ok('v0.61.37 升级阴兵 dur 仍为 3（卡面不变；旧被动 +1 已删）',\n"
   "      g.summons.every(function (s) { return s.dur === 3; }) && g.summons.length === 3,",
   'P6 升级阴兵 4 → 3')

fx("    __ok('v0.61.10 P6 英雄被动文案已写明寿命 +1、尸王除外',\n"
   "      HEROES.filter(function (h) { return h.id === 'ganshiren'; })[0].passive.indexOf('额外获得 1 回合寿命') >= 0 &&\n"
   "      HEROES.filter(function (h) { return h.id === 'ganshiren'; })[0].passive.indexOf('尸王不受影响') >= 0);\n"
   "    __ok('v0.61.10 P6 关键词新增【召唤寿命】',\n"
   "      KEYWORDS.some(function (k) { return k[0] === '召唤寿命' && k[1].indexOf('尸王不受影响') >= 0; }));",
   "    var __pa = HEROES.filter(function (h) { return h.id === 'ganshiren'; })[0].passive;\n"
   "    __ok('v0.61.37 英雄被动文案改为「每消耗 1 点【尸气】，回复 1 点生命」',\n"
   "      __pa.indexOf('每消耗 1 点【尸气】，回复 1 点生命') >= 0 &&\n"
   "      __pa.indexOf('额外获得 1 回合寿命') < 0 && __pa.indexOf('尸王不受影响') < 0, __pa);\n"
   "    __ok('v0.61.37 关键词【召唤寿命】已删掉「寿命 +1」尾句（词条本身保留）',\n"
   "      KEYWORDS.some(function (k) { return k[0] === '召唤寿命' && k[1].indexOf('尸王不受影响') < 0; }));\n"
   "    __ok('v0.61.37 关键词新增【预尸气】',\n"
   "      KEYWORDS.some(function (k) { return k[0] === '预尸气' && k[1].indexOf('召唤物') >= 0 && k[1].indexOf('死亡返还') >= 0; }));",
   'P6 被动文案 + 关键词')

# ══════════════════ B. 新增断言块 ══════════════════
NEW_BLOCK.append(r"""  /* ============ v0.61.37 赶尸人（A 列）卡池 18 条 + 被动换「消耗回血」+ 预尸气 + 新牌库 ============ */
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
    __ok('v0.61.37 #3 剑符 10/14 + 消耗 3 尸气',
      T_('jianfu', false).indexOf('造成 10 伤害') >= 0 && T_('jianfu', true).indexOf('造成 14 伤害') >= 0 &&
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
    __ok('v0.61.37 剑符 尸气 2 < 3 → 不翻倍（仍 10 伤）', (__b0 - g.enemies[0].hp) === 10, 'dmg=' + (__b0 - g.enemies[0].hp));
    g = __base('ganshiren'); g.尸气 = 3;
    cc = __card('jianfu'); __b0 = g.enemies[0].hp; cc.eff(false, cc);
    __ok('v0.61.37 剑符 尸气 3 → 翻倍 20 伤且清空尸气',
      (__b0 - g.enemies[0].hp) === 20 && g.尸气 === 0, 'dmg=' + (__b0 - g.enemies[0].hp) + ' 尸气=' + g.尸气);
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
    __ok('v0.61.37 预览A 剑符 10 / 尸气3 → 20',
      pvA('jianfu') === 10 && pvA('jianfu', false, function (x) { x.尸气 = 3; }) === 20,
      pvA('jianfu') + '/' + pvA('jianfu', false, function (x) { x.尸气 = 3; }));
    __ok('v0.61.37 预览A 剑符升级 14 / 尸气3 → 28',
      pvA('jianfu', true) === 14 && pvA('jianfu', true, function (x) { x.尸气 = 3; }) === 28,
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

""")

# ══════════════════ 校验 + 落地 ══════════════════
raw = io.open(P, encoding='utf-8').read()
nl = '\r\n' if '\r\n' in raw else '\n'
body = raw.replace('\r\n', '\n')

errs = []
for old, new, n, label in FIX:
    c = body.count(old)
    if c != n:
        errs.append('锚点命中 %d 次（期望 %d）：%s' % (c, n, label))
ANCHOR = '  rep.pass = _p; rep.fail = _f;\n'
if body.count(ANCHOR) != 1:
    errs.append('尾部锚点命中 %d 次（期望 1）' % body.count(ANCHOR))
if errs:
    print('!! 有锚点未命中，一个字节都不写：')
    for e in errs:
        print('   ', e)
    sys.exit(1)

for old, new, n, label in FIX:
    body = body.replace(old, new, n)
body = body.replace(ANCHOR, NEW_BLOCK[0] + ANCHOR, 1)

io.open(P, 'w', encoding='utf-8', newline='').write(body.replace('\n', nl))
print('OK smoke_runner.js：改了 %d 条 + 插入新断言块（%d 字符）' % (len(FIX), len(NEW_BLOCK[0])))