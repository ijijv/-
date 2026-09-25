# -*- coding: utf-8 -*-
"""v0.61.39 · 三个 bug：
 ①五通神在附灵术 / 群鬼乱舞后不触发（summonAct 的 type 白名单把它挡了）
 ②易物换来牌白送 -1 费（v0.61.10(P11) 加料，四份卡池 md 从没写过）
 ③续档不恢复生命/上限/金币（40_flow.js:224 被同行 `//` 注释吞掉）

铁律：count==1 锚点 + 全或无 + 换行归一。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D_PATH = os.path.join(ROOT, 'js', '20_data.js')
E_PATH = os.path.join(ROOT, 'js', '30_engine.js')
F_PATH = os.path.join(ROOT, 'js', '40_flow.js')
H_PATH = os.path.join(ROOT, '原型.html')
B_PATH = os.path.join(ROOT, 'js', '60_boot.js')

errs = []


def ed(body, old, new, label, n=1):
    c = body.count(old)
    if c != n:
        errs.append('%s —— 锚点命中 %d 次（期望 %d）' % (label, c, n))
    return body.replace(old, new)


def load(p):
    raw = io.open(p, encoding='utf-8').read()
    nl = '\r\n' if '\r\n' in raw else '\n'
    return nl, raw.replace('\r\n', '\n')


def save(p, body, nl):
    io.open(p, 'w', encoding='utf-8', newline='').write(body.replace('\n', nl))


D_nl, D = load(D_PATH)
E_nl, E = load(E_PATH)
F_nl, F = load(F_PATH)
H_nl, H = load(H_PATH)
B_nl, B = load(B_PATH)

# ══════════ ① 五通神：附灵术 / 群鬼乱舞 后不再触发 ══════════
# 根因：summonAct 只认 ['zhiren','xiaogui','yinbing','shi_wang']，五通神的结算在
#       wutongTick 里（寿命挂在「回合开始」）。于是 triggerSummons 走到它时直接 return。
# 修法：decay===false（附灵术/群鬼乱舞/回合末手动触发）时把 wutong 交给 wutongTick，
#       且**不扣寿命**——寿命仍只由 startTurn 那一次结算负责，保持既有解耦，不出现一回合扣两次。
E = ed(E,
       "function triggerSummons(decay){\n"
       "  for(const s of G.summons.slice()){ if(s.dur>0) summonAct(s); }",
       "function triggerSummons(decay){\n"
       "  for(const s of G.summons.slice()){\n"
       "    if(s.dur<=0) continue;\n"
       "    /* v0.61.39：五通神此前被 summonAct 的 type 白名单挡掉，附灵术/群鬼乱舞永远触发不到它。\n"
       "       decay===false 时才补触发（decay===true 是回合末，五通神的寿命归 startTurn 管，\n"
       "       再走一次会变成一回合扣两次寿命）。noDecay=true → 只结算效果、不扣 dur。 */\n"
       "    if(s.type==='wutong'){ if(!decay) wutongTick(s,true); }\n"
       "    else summonAct(s);\n"
       "  }",
       '30_engine triggerSummons 补触发五通神')

D = ed(D,
       "function wutongTick(s){",
       "function wutongTick(s, noDecay){   // v0.61.39：noDecay=true 时只结算效果、不扣寿命（附灵术/群鬼乱舞用）",
       '20_data wutongTick 加 noDecay 形参')
D = ed(D,
       "  if(!s.indefinite) s.dur--;\n}",
       "  if(!s.indefinite && !noDecay) s.dur--;\n}",
       '20_data wutongTick 寿命扣减加 noDecay 守卫')

# ══════════ ② 易物：删掉「换入的牌本回合费用 -1」 ══════════
# 四份卡池 md / 卡牌特性整合表 / 数值表 / 机制总表 全都没写过这条 —— 是 v0.61.10(P11)
# 采纳外部评审建议后加的料，且四列都带。按你的裁定：完全删掉。
# 保留：副本 + 在 G.deck 里顶替原对象（保住 indexOf 语义），以及
#       20_data.js 的 tempCostCut 消费端（万剑归宗 A 列独立在用，不能一起删）。
E = ed(E,
       "  /* v0.61.10(P11)：换入的牌本回合费用 -1。\n"
       "     不能直接给 c 打标记 —— cardById() 返回的是 CARDS 里的**共享对象**，同一张牌的 3 张副本\n"
       "     会一起被减费。所以往手牌放一个副本，并让它在 G.deck 里**顶替原对象**\n"
       "     （保住 indexOf 语义：消耗牌本关结束要靠 G.deck.indexOf 回牌库）。 */\n"
       "  const cNew=Object.assign({}, c); cNew.tempCostCut=1;",
       "  /* v0.61.39：删除 v0.61.10(P11) 的「换入的牌本回合费用 -1」。四份卡池 md / 卡牌特性整合表 /\n"
       "     数值表 / 卡牌机制数据总表 全都没写过这条（原为采纳外部评审建议后加的料）。\n"
       "     仍保留副本 + 在 G.deck 里顶替原对象 —— cardById() 返回的是 CARDS 里的共享对象，\n"
       "     直接改属性会连带改掉同名牌的另外几份；副本顶替同时保住 indexOf 语义\n"
       "     （消耗牌本关结束要靠 G.deck.indexOf 回牌库）。 */\n"
       "  const cNew=Object.assign({}, c);",
       '30_engine 易物 删减费标记')

D = ed(D,
       "`选择 1 张手牌与弃牌堆交换，换入的牌本回合费用 -1。若换出的是【鬼怪牌】，获得 2 点【尸气】`",
       "`选择 1 张手牌与弃牌堆交换。若换出的是【鬼怪牌】，获得 2 点【尸气】`",
       '20_data 易物 t A 列')
D = ed(D,
       "`选择 1 张手牌与弃牌堆交换，换入的牌本回合费用 -1。若换出的是防御牌，获得 4 点格挡`",
       "`选择 1 张手牌与弃牌堆交换。若换出的是防御牌，获得 4 点格挡`",
       '20_data 易物 t B 列')
D = ed(D,
       "`选择 1 张手牌与弃牌堆交换，换入的牌本回合费用 -1。若换出的是技能牌，恢复 5 点生命`",
       "`选择 1 张手牌与弃牌堆交换。若换出的是技能牌，恢复 5 点生命`",
       '20_data 易物 t C 列')
D = ed(D,
       "`选择 1 张手牌与弃牌堆交换，换入的牌本回合费用 -1。若换出的是攻击牌，额外抽 1 张牌`",
       "`选择 1 张手牌与弃牌堆交换。若换出的是攻击牌，额外抽 1 张牌`",
       '20_data 易物 t D 列')
# 回合开始那条「到期清理」的注释也点了 v0.61.10(P11)，改成说明它是万剑归宗 A 列在用
E = ed(E,
       "  // v0.61.10(P11)：易物换入牌的「本回合 -1 费」到期。手里、抽牌堆、弃牌堆、牌库都扫一遍\n"
       "  // （牌可能已被弃掉，只在手牌上清会漏，下回合再抽回来就白赚一次减费）。",
       "  // tempCostCut 到期清理：易物已不再发这个标记（v0.61.39 删除），现在只剩\n"
       "  // 万剑归宗 A 列（20_data.js 击败敌人后抽到的牌 -1/-2 费）在用，故保留。\n"
       "  // 手里、抽牌堆、弃牌堆、牌库都扫一遍（牌可能已被弃掉，只在手牌上清会漏，下回合再抽回来就白赚一次减费）。",
       '30_engine tempCostCut 清理点注释')

# ══════════ ③ 续档不恢复生命/上限/金币 ══════════
F = ed(F,
       "G.hero=d.hero; // 老存档没 mapPath → 空数组，连线退化成只有「可达」 G.hp=d.hp; G.maxHp=d.maxHp; G.gold=d.gold;\n",
       "G.hero=d.hero; // 老存档没 mapPath → 空数组，连线退化成只有「可达」\n"
       "  // v0.61.39 修 bug：G.hp/G.maxHp/G.gold 原先写在同一行末尾，被上面那句 `//` 注释整段吞掉，\n"
       "  //             导致续档后三项回落到 newState() 的默认值（生命 60、金币 0）。\n"
       "  G.hp=d.hp; G.maxHp=d.maxHp; G.gold=d.gold;\n",
       '40_flow 续档恢复生命/上限/金币')

# ══════════ ④ 版本号三处同步 ══════════
H = ed(H, '<title>志怪塔 · 原型 v0.61.38</title>', '<title>志怪塔 · 原型 v0.61.39</title>',
       '原型.html <title>')
H = ed(H, '<small>· 玩法原型 v0.61.38</small>', '<small>· 玩法原型 v0.61.39</small>',
       '原型.html 副标题')
B = ed(B, '<h2>志 怪 塔 · v0.61.38</h2>', '<h2>志 怪 塔 · v0.61.39</h2>',
       '60_boot.js 标题')

if errs:
    print('!! 有锚点未命中，一个字节都不写：')
    for m in errs:
        print('   -', m)
    sys.exit(1)

save(D_PATH, D, D_nl)
save(E_PATH, E, E_nl)
save(F_PATH, F, F_nl)
save(H_PATH, H, H_nl)
save(B_PATH, B, B_nl)
print('OK 五个文件已写')