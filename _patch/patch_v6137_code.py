# -*- coding: utf-8 -*-
"""v0.61.37 · 赶尸人（A 列）卡池重做 + 被动换「消耗回血」+ 预尸气 + 新初始牌库。

铁律：锚点 count 必须等于期望值、**全或无**（任一未命中就一个字节都不写）、换行归一。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

EDITS = []  # (relpath, old, new, expected_count, label)


def ed(path, old, new, label, n=1):
    EDITS.append((path, old, new, n, label))


# ════════════════════════════════════════════════════════════════════
# js/20_data.js
# ════════════════════════════════════════════════════════════════════
D = 'js/20_data.js'

# ── 关键词：新增【预尸气】+ 改写【召唤寿命】 ──
ed(D,
   "  ['预格挡','下一回合开始时，场上召唤单位将为你带来的预计格挡值（格挡旁蓝色 ↑）。仅苦行武僧显示，用于提前规划攻防。'],\n",
   "  ['预格挡','下一回合开始时，场上召唤单位将为你带来的预计格挡值（格挡旁蓝色 ↑）。仅苦行武僧显示，用于提前规划攻防。'],\n"
   "  ['预尸气','下一回合开始时，场上召唤物将为你带来的预计【尸气】总量（＝本回合末消散的召唤物的死亡返还 ＋ 下回合开始的「每个存活召唤物 +1」）。仅茅山赶尸人显示，用于提前规划召唤节奏。'],\n",
   'KW 预尸气 新增')

ed(D,
   '赶尸人召唤纸人/小鬼/五通神/阴兵时，寿命额外 +1 回合（尸王不受影响）。',
   '五通神按「回合开始」结算寿命，其余按「回合结束」结算。',
   'KW 召唤寿命 改写')

# ── #1 雷符 ──
ed(D,
   '`造成 ${u?7:4} 伤害。场上每有 1 个召唤单位，伤害 +1；若击杀敌人，获得 2 点【尸气】`',
   '`造成 ${u?7:5} 伤害。场上每有 1 个召唤单位，伤害 +1；若击杀敌人，获得 ${u?3:2} 点【尸气】`',
   '雷符 t 5/7 + 尸气 2/3')
ed(D,
   "if(G.hero==='ganshiren'){ d=(u?7:4)+G.summons.filter(s=>s.dur>0).length; }",
   "if(G.hero==='ganshiren'){ d=(u?7:5)+G.summons.filter(s=>s.dur>0).length; }",
   '雷符 eff 伤害 4 → 5')
ed(D,
   "if(G.hero==='ganshiren'){ gainShiqi(2); log('雷符：击杀敌人，获得 2 点【尸气】'); }",
   "if(G.hero==='ganshiren'){ const __q=u?3:2; gainShiqi(__q); log(`雷符：击杀敌人，获得 ${__q} 点【尸气】`); }",
   '雷符 击杀尸气 2 → 2/3')

# ── #2 火符 ──
ed(D,
   '`造成 ${u?8:5} 伤害。挑选弃 1 张手牌；若弃掉的是【鬼怪牌】，获得 ${u?2:1} 点【尸气】`',
   '`造成 ${u?7:5} 伤害。挑选弃 1 张手牌；若弃掉的是【鬼怪牌】，获得 ${u?3:2} 点【尸气】`',
   '火符 t 5/7 + 尸气 2/3')
ed(D,
   "if(G.hero==='ganshiren') d=(u?8:5);",
   "if(G.hero==='ganshiren') d=(u?7:5);",
   '火符 eff 伤害 8 → 7')

# ── #3 剑符 ──
ed(D,
   '`造成 ${u?13:8} 伤害。消耗 2 点【尸气】，伤害翻倍`',
   '`造成 ${u?14:10} 伤害。消耗 3 点【尸气】，伤害翻倍`',
   '剑符 t 10/14 + 消耗 3')
ed(D,
   "else { d=(u?13:8); if(hasShiqi(2)){ spendShiqi(2); d*=2; log('剑符：消耗 2 点【尸气】，伤害翻倍'); } }",
   "else { d=(u?14:10); if(hasShiqi(3)){ spendShiqi(3); d*=2; log('剑符：消耗 3 点【尸气】，伤害翻倍'); } }",
   '剑符 eff 10/14 + 消耗 3')

# ── #4 斩妖剑（基础值 A/B 共用，必须拆） ──
ed(D,
   '`造成 ${u?12:8} 伤害。场上每有 1 个召唤单位，额外造成 2 点伤害`',
   '`造成 ${u?12:7} 伤害。场上每有 1 个召唤单位，额外造成 2 点伤害`',
   '斩妖剑 t 基础 8 → 7')
ed(D,
   '      let d=(u?12:8);\n      if(G.hero===\'ganshiren\') d+=2*G.summons.filter(s=>s.dur>0).length;',
   '      let d=(G.hero===\'ganshiren\')?(u?12:7):(u?12:8);   // v0.61.37 A 列基础 8 → 7（B 列仍 8）\n'
   '      if(G.hero===\'ganshiren\') d+=2*G.summons.filter(s=>s.dur>0).length;',
   '斩妖剑 eff A 基础 8 → 7（B 不动）')

# ── #5 天雷正法 ──
ed(D,
   '`造成 ${u?24:18} 伤害。每有 3 点【尸气】此牌费用 -1（最低 0），打出时消耗减免费用×3 尸气`',
   '`造成 ${u?28:20} 伤害。每有 2 点【尸气】此牌费用 -1（最低 0），打出时消耗减免费用×2 尸气`',
   '天雷正法 t 20/28 + 每 2 点 + ×2')
ed(D,
   'const red=Math.min(3,Math.floor((G.尸气||0)/3)); if(red>0){ spendShiqi(red*3); log(`天雷正法：消耗 ${red*3} 点【尸气】`); }\n'
   '      dealDamageTo(t,u?24:18); }},',
   'const red=Math.min(3,Math.floor((G.尸气||0)/2)); if(red>0){ spendShiqi(red*2); log(`天雷正法：消耗 ${red*2} 点【尸气】`); }\n'
   '      dealDamageTo(t,u?28:20); }},',
   '天雷正法 eff 20/28 + 每 2 点 + ×2')
ed(D,
   "    if(G.hero==='ganshiren'){ cost=Math.max(0, cost - Math.floor((G.尸气||0)/3)); }",
   "    if(G.hero==='ganshiren'){ cost=Math.max(0, cost - Math.floor((G.尸气||0)/2)); }",
   '天雷正法 费用预览 /3 → /2')
ed(D,
   '  // 天雷正法(#5) A 赶尸人：每 3 点【尸气】-1 费（最低 0）；D 天师：目标每 2 层【诅咒】-1 费（最低 0）',
   '  // 天雷正法(#5) A 赶尸人：每 2 点【尸气】-1 费（最低 0）；D 天师：目标每 2 层【诅咒】-1 费（最低 0）   // v0.61.37 A：每 3 点 → 每 2 点',
   '天雷正法 费用预览注释')

# ── #6 万剑归宗（升级档 15 → 14 + 新增「抽到的牌本回合减费」） ──
ed(D,
   '`对全体敌人造成 ${u?15:10} 伤害。每击败 1 名敌人，获得 3 点【尸气】并抽 1 张牌`',
   '`对全体敌人造成 ${u?14:10} 伤害。每击败 1 名敌人，获得 3 点【尸气】并抽 1 张牌（抽到的牌本回合费用 -${u?2:1}）`',
   '万剑归宗 t 10/14 + 减费条款')
ed(D,
   '      else { const d=u?15:10; targets.forEach(e=>{ if(e.hp>0) dealDamageTo(e,d); }); }',
   '      else { const d=u?14:10; targets.forEach(e=>{ if(e.hp>0) dealDamageTo(e,d); }); }   // v0.61.37 A 列升级 15 → 14',
   '万剑归宗 eff A 升级 15 → 14')
ed(D,
   "        if(G.hero==='ganshiren'){ gainShiqi(killed*3); drawCards(killed); log(`万剑归宗：击败 ${killed} 名敌人，获 ${killed*3} 尸气并抽 ${killed} 张`); }",
   "        if(G.hero==='ganshiren'){ gainShiqi(killed*3); const __hb=G.hand.length; drawCards(killed); const __cut=u?2:1;\n"
   "          // v0.61.37：抽到的那张牌本回合 -1/-2 费。照易物(#27)先例——CARDS 里的对象是共享的，\n"
   "          // 不能就地打标记，必须换成一个副本，并让它在 G.deck 里顶替原对象（保住 indexOf 语义）。\n"
   "          for(let __i=__hb;__i<G.hand.length;__i++){ const __o=G.hand[__i]; if(!__o || (__o.tempCostCut||0)>=__cut) continue;\n"
   "            const __n=Object.assign({}, __o); __n.tempCostCut=__cut;\n"
   "            const __di=G.deck.indexOf(__o); if(__di>=0) G.deck[__di]=__n;\n"
   "            G.hand[__i]=__n; }\n"
   "          log(`万剑归宗：击败 ${killed} 名敌人，获 ${killed*3} 尸气并抽 ${killed} 张（本回合 -${__cut} 费）`); }",
   '万剑归宗 抽到的牌本回合减费')

# ── #8 噬魂术 ──
ed(D,
   '`消耗 4 点【尸气】，对目标造成 ${u?18:14} 伤害。若本回合召唤过单位，费用 -1`',
   '`消耗 ${u?2:4} 点【尸气】，对目标造成 ${u?18:14} 伤害。若本回合召唤过单位，费用 -1`',
   '噬魂术 t 消耗 4/2')
ed(D,
   "if(G.hero==='ganshiren'){ if(!hasShiqi(4)){ floatMsg('尸气不足'); return false; } spendShiqi(4); dealDamageTo(t,u?18:14); return; }",
   "if(G.hero==='ganshiren'){ const __sc=u?2:4; if(!hasShiqi(__sc)){ floatMsg('尸气不足'); return false; } spendShiqi(__sc); dealDamageTo(t,u?18:14); return; }",
   '噬魂术 eff 消耗 4/2')

# ── #11 蚀魂咒 ──
ed(D,
   '`造成 ${u?6:3} 伤害。若场上有召唤单位，每有 1 个恢复 1 点生命`',
   '`造成 ${u?8:4} 伤害。根据场上召唤物的数量回复等额的血量`',
   '蚀魂咒 t 4/8 + 新文案')
ed(D,
   "dealDamageTo(t, G.hero==='ganshiren'?(u?6:3):(G.hero==='tianshi'?(u?8:3):(G.hero==='yincha'?(u?8:5):(u?7:5))));",
   "dealDamageTo(t, G.hero==='ganshiren'?(u?8:4):(G.hero==='tianshi'?(u?8:3):(G.hero==='yincha'?(u?8:5):(u?7:5))));",
   '蚀魂咒 eff 4/8')

# ── #12 嗜血 ──
ed(D,
   '`造成 ${u?7:5} 伤害。每有 2 点【尸气】，此牌伤害 +1（上限 +5）`',
   '`造成 ${u?7:5} 伤害。每有 1 点【尸气】，此牌伤害 +1（上限 +${u?7:6}）`',
   '嗜血 t 每 1 点 + 上限 6/7')
ed(D,
   "if(G.hero==='ganshiren') d=(u?7:5)+Math.min(5,Math.floor((G.尸气||0)/2));",
   "if(G.hero==='ganshiren') d=(u?7:5)+Math.min(u?7:6,(G.尸气||0));",
   '嗜血 eff 每 1 点 + 上限 6/7')

# ── #14 钟馗镇魂 ──
ed(D,
   '`对目标造成 ${u?24:16} 伤害并【镇魂】。获得 ${u?5:4} 点【尸气】（消耗牌）`',
   '`对目标造成 ${u?24:16} 伤害并【镇魂】。获得 ${u?6:4} 点【尸气】（消耗牌）`',
   '钟馗镇魂 t 尸气 4/6')
ed(D,
   "if(G.hero==='ganshiren'){ sealEnemy(t,1); dealDamageTo(t,u?24:16); gainShiqi(u?5:4); log(`钟馗镇魂：造成 ${u?24:16} 伤害并获得 ${u?5:4} 点【尸气】`); return; }",
   "if(G.hero==='ganshiren'){ sealEnemy(t,1); dealDamageTo(t,u?24:16); gainShiqi(u?6:4); log(`钟馗镇魂：造成 ${u?24:16} 伤害并获得 ${u?6:4} 点【尸气】`); return; }",
   '钟馗镇魂 eff 尸气 4/6')

# ── #17 金光罩 ──
ed(D,
   '`获得 ${u?15:10} 点格挡。再消耗 2 点【尸气】额外获得 ${u?5:4} 点格挡`',
   '`获得 ${u?14:9} 点格挡。再消耗 2 点【尸气】额外获得 ${u?7:5} 点格挡`',
   '金光罩 t 9/14 + 额外 5/7')
ed(D,
   "if(G.hero==='ganshiren'){ gainBlock(u?15:10); if(hasShiqi(2)){ spendShiqi(2); gainBlock(u?5:4); log(`金光罩：消耗 2 点尸气，额外获得 ${u?5:4} 点格挡`); } }",
   "if(G.hero==='ganshiren'){ gainBlock(u?14:9); if(hasShiqi(2)){ spendShiqi(2); gainBlock(u?7:5); log(`金光罩：消耗 2 点尸气，额外获得 ${u?7:5} 点格挡`); } }",
   '金光罩 eff 9/14 + 额外 5/7')

# ── #21 铜皮铁骨 ──
ed(D,
   '`获得 ${u?12:9} 点格挡。反弹 ${u?6:4} 点伤害。每有 1 个召唤单位，额外反弹 1 点`',
   '`获得 ${u?12:8} 点格挡。反弹 ${u?5:4} 点伤害。每有 1 个召唤单位，额外反弹 1 点`',
   '铜皮铁骨 t 8/12 + 反弹 4/5')
ed(D,
   "if(G.hero==='ganshiren'){ gainBlock(u?12:9); G.thorns+=(u?6:4)+G.summons.filter(s=>s.dur>0).length; }",
   "if(G.hero==='ganshiren'){ gainBlock(u?12:8); G.thorns+=(u?5:4)+G.summons.filter(s=>s.dur>0).length; }",
   '铜皮铁骨 eff 8/12 + 反弹 4/5')

# ── #27 易物 ──
ed(D,
   '选择 1 张手牌与弃牌堆交换，换入的牌本回合费用 -1。若换出的是【鬼怪牌】，获得 1 点【尸气】',
   '选择 1 张手牌与弃牌堆交换，换入的牌本回合费用 -1。若换出的是【鬼怪牌】，获得 2 点【尸气】',
   '易物 t 尸气 1 → 2')

# ── #28 血契（A 列升级 0 费） ──
ed(D,
   "{id:'xueqi', name:'血契', type:'skill', rarity:'blue', cost:1, costU:{wuseng:0, yincha:0},",
   "{id:'xueqi', name:'血契', type:'skill', rarity:'blue', cost:1, costU:{wuseng:0, yincha:0, ganshiren:0},   // v0.61.37 赶尸人列升级 0 费",
   '血契 costU 加 ganshiren:0')
ed(D,
   "      :`本回合每失去 1 点生命，获得 ${u?3:2} 点格挡`,",
   "      :`本回合每失去 1 点生命，获得 ${u?3:2} 点格挡${u?'（0 符文）':''}`,",
   '血契 A 文案补 0 符文后缀')

# ── #31 燃血术（A 列 4 → 8；同一子串共 3 处） ──
# 先落注释（必须排在下面 count==3 的裸子串替换**之前**，否则锚点已被改写）
ed(D,
   "hpCost:(u)=>G.hero==='wuseng'?8:(G.hero==='yincha'?(u?6:4):(G.hero==='tianshi'?8:4)),",
   "hpCost:(u)=>G.hero==='wuseng'?8:(G.hero==='yincha'?(u?6:4):(G.hero==='tianshi'?8:4)),   // v0.61.37 赶尸人列：4 → 8（与武僧/天师同为 8）",
   '燃血术 hpCost 注释')
ed(D,
   "(G.hero==='yincha'?(u?6:4):(G.hero==='tianshi'?8:4))",
   "(G.hero==='yincha'?(u?6:4):8)",
   '燃血术 A 列 4 → 8（hpCost / t / eff 三处同串）', 3)

# ── #32 洗髓经 ──
ed(D,
   '`接下来 ${u?4:3} 回合，每回合开始获得 1 点【尸气】和 1 点符文`',
   '`接下来 3 回合，每回合开始获得 ${u?2:1} 点【尸气】和 1 点符文`',
   '洗髓经 t 3 回合 + 尸气 1/2')
ed(D,
   'eff:(u)=>{ G.xisuiTurns=u?4:3; floatMsg(`洗髓经：接下来 ${G.xisuiTurns} 回合生效`); }},',
   "eff:(u)=>{ G.xisuiTurns=3; G.xisuiShiqi=u?2:1; floatMsg('洗髓经：接下来 3 回合生效'); }},   // v0.61.37 A 列：持续固定 3 回合，升级改为尸气 1 → 2",
   '洗髓经 eff 3 回合 + xisuiShiqi')

# ── #38 移形换影 ──
ed(D,
   "{id:'yixing', name:'移形换影', type:'skill', rarity:'purple', cost:1, costU:{tianshi:1, wuseng:1, default:0},   // v0.61.35 天师列取消 0 费升级；v0.61.36 武僧列同（1/1）",
   "{id:'yixing', name:'移形换影', type:'skill', rarity:'purple', cost:1, costU:{tianshi:1, wuseng:1, ganshiren:1, default:0},   // v0.61.35 天师列取消 0 费升级；v0.61.36 武僧列同（1/1）；v0.61.37 赶尸人列同（1/1）",
   '移形换影 costU 加 ganshiren:1')
ed(D,
   "`闪避下一次攻击。闪避成功后，获得 2 点【尸气】${u?'（0 符文）':''}`",
   "`闪避下一次攻击。闪避成功后，获得 ${u?3:1} 点【尸气】`",
   '移形换影 t 尸气 1/3')
ed(D,
   "if(G.hero==='ganshiren'){ G.dodgeShiqi=2; }",
   "if(G.hero==='ganshiren'){ G.dodgeShiqi=u?3:1; }   // v0.61.37：1/3（原先死写 2，且结算处硬编码 1，值是断的）",
   '移形换影 eff dodgeShiqi 1/3')

# ── #40 镇妖铃 ──
ed(D,
   '`造成 ${u?16:10} 伤害并【镇魂】。获得 3 点【尸气】。消耗牌（一次性）`',
   '`造成 ${u?15:10} 伤害并【镇魂】。获得 ${u?4:3} 点【尸气】。消耗牌（一次性）`',
   '镇妖铃 t 10/15 + 尸气 3/4')
ed(D,
   "if(G.hero==='ganshiren'){ sealEnemy(t,1); dealDamageTo(t,u?16:10); gainShiqi(3); log(`镇妖铃：造成 ${u?16:10} 伤害并获得 3 点【尸气】`); return; }",
   "if(G.hero==='ganshiren'){ const __zq=u?4:3; sealEnemy(t,1); dealDamageTo(t,u?15:10); gainShiqi(__zq); log(`镇妖铃：造成 ${u?15:10} 伤害并获得 ${__zq} 点【尸气】`); return; }",
   '镇妖铃 eff 10/15 + 尸气 3/4')

# ── #46 咒雨 ──
ed(D,
   "{id:'zhouyu', name:'咒雨', type:'spirit', rarity:'purple', cost:{wuseng:0, default:2}, exhaust:true,",
   "{id:'zhouyu', name:'咒雨', type:'spirit', rarity:'purple', cost:{ganshiren:3, wuseng:0, default:2}, exhaust:true,   // v0.61.37 赶尸人列 2 → 3",
   '咒雨 cost 加 ganshiren:3')
ed(D,
   '每层尸气转化为 ${u?7:6} 点伤害，随机分配给所有敌人',
   '每层尸气转化为 ${u?6:5} 点伤害，随机分配给所有敌人',
   '咒雨 t 每层 5/6')
ed(D,
   '        G.尸气=0; const total=q*(u?7:6); const al=aliveEnemies(); if(!al.length) return;',
   "        G.尸气=0; if(G.hero==='ganshiren' && q>0){ heal(q); log(`咒雨：引爆 ${q} 点【尸气】，回复 ${q} 点生命`); }   // v0.61.37：清零＝消耗，按新被动等量回血\n"
   '        const total=q*(u?6:5); const al=aliveEnemies(); if(!al.length) return;',
   '咒雨 eff 每层 5/6 + 清零回血')

# ── 被动替换：删 SUMMON_LIFE_TYPES ──
ed(D,
   '/* v0.61.10(P6)：赶尸人新被动 —— 召唤【纸人/小鬼/五通神/阴兵】时寿命 +1 回合。\n'
   '   收口在这一处，所以「升级版卡面自带的 dur 提升」与被动**叠算**，但被动只加一次（不会 +2）。\n'
   '   尸王（shi_wang）是亡灵本体、不属召来的役使，明确排除在外。 */\n'
   "const SUMMON_LIFE_TYPES = ['zhiren','xiaogui','wutong','yinbing'];\n"
   'function addSummon(o){ G.summonsMadeTurn=(G.summonsMadeTurn||0)+1;\n'
   "  if(G.hero==='ganshiren' && SUMMON_LIFE_TYPES.indexOf(o.type)>=0) o.dur=(o.dur||0)+1;",
   '/* v0.61.37：删除 v0.61.10(P6) 的「召唤 4 种召唤物寿命 +1」被动，改为【每消耗 1 点尸气回复 1 点生命】\n'
   '   （落在 spendShiqi）。寿命偏移的唯一来源没了，A 列召唤物 dur 从此与卡面完全一致\n'
   '   （纸人 2 / 小鬼 2 / 五通神 2-3 / 阴兵 3）。 */\n'
   'function addSummon(o){ G.summonsMadeTurn=(G.summonsMadeTurn||0)+1;',
   '删除 SUMMON_LIFE_TYPES 与寿命 +1 钩子')

# ── 尸气基元：spendShiqi 回血 + gainShiqi 提示 ──
ed(D,
   'function spendShiqi(n){ if(!hasShiqi(n)) return false; G.尸气 -= n; return true; }',
   'function spendShiqi(n){ if(!hasShiqi(n)) return false; G.尸气 -= n;\n'
   "  if(G.hero==='ganshiren' && n>0) heal(n);   // v0.61.37 新被动：每消耗 1 点【尸气】回复 1 点生命\n"
   '  return true; }',
   'spendShiqi 加消耗回血')
ed(D,
   '场上每有 1 个召唤物，回合开始就 +1；攒着可以强化【五通神】，或用【咒雨】一次引爆。',
   '场上每有 1 个召唤物，回合开始就 +1；攒着可以强化【五通神】，或用【咒雨】一次引爆。每消耗 1 点【尸气】会回复 1 点生命。',
   'gainShiqi 提示补「消耗回血」')

# ── 预尸气：新增函数（紧接 preBlockNextTurn） ──
ed(D,
   'function preBlockNextTurn(){\n'
   "  if(G.hero!=='wuseng') return 0;\n"
   '  let n=0;\n'
   '  for(const s of G.summons){ if(s.dur>0) n+=summonTurnBlock(s); }\n'
   '  return n;\n'
   '}',
   'function preBlockNextTurn(){\n'
   "  if(G.hero!=='wuseng') return 0;\n"
   '  let n=0;\n'
   '  for(const s of G.summons){ if(s.dur>0) n+=summonTurnBlock(s); }\n'
   '  return n;\n'
   '}\n'
   '/* 预尸气：下一回合开始时，场上召唤物将带来的【尸气】合计（仅茅山赶尸人，供顶栏显示）。\n'
   '   ＝ ①本回合末会消散的召唤物的死亡返还（纸人 2 / 小鬼 2 或 3 / 阴兵 1）\n'
   '     ＋ ②下回合开始仍在场的召唤物，每个 +1（＝「养尸为用」被动）。\n'
   '   ⚠ 与 startTurn() 的真实结算顺序对齐：尸气被动跑在 wutongTick **之前**，所以 dur=1 的五通神\n'
   '   **算 +1**、且它消散**不给**尸气；尸王消散只回牌、不给尸气，故两边都不计。 */\n'
   'function preShiqiNextTurn(){\n'
   "  if(G.hero!=='ganshiren') return 0;\n"
   '  let n=0;\n'
   '  for(const s of G.summons){\n'
   '    if((s.dur||0)<=0) continue;\n'
   "    const diesThisEnd = (s.type!=='wutong') && s.dur<=1;   // 回合末消散（五通神走回合开始的 tick）\n"
   '    if(diesThisEnd){\n'
   "      if(s.type==='zhiren') n+=2;\n"
   "      else if(s.type==='xiaogui') n+=s.up?3:2;\n"
   "      else if(s.type==='yinbing') n+=1;\n"
   '      /* 尸王消散不给尸气 → 不计 */\n'
   '    } else n+=1;   // 下回合开始仍在场 → 每个 +1\n'
   '  }\n'
   '  return n;\n'
   '}',
   '新增 preShiqiNextTurn')

# ── 英雄被动文案 ──
ed(D,
   "passive:'每回合开始时，场上每有 1 个召唤单位，获得 1 点【尸气】。召唤单位死亡时，获得 2 点【尸气】。召唤纸人/小鬼/五通神/阴兵时，它们额外获得 1 回合寿命（尸王不受影响）。【尸气】可用于加强召唤系卡牌效果。',",
   "passive:'每回合开始时，场上每有 1 个召唤单位，获得 1 点【尸气】。召唤单位死亡时，获得 2 点【尸气】。每消耗 1 点【尸气】，回复 1 点生命。【尸气】可用于加强召唤系卡牌效果。',",
   'HEROES A passive 文案')

# ── 初始牌库 ──
ed(D,
   "   deck:[['leifu',2],['jingang',2],['fodu',1],['sheshen',1],['xueqi',1],['zhiren',1],['shi_wang',1],['shouyi',1],['xiaogui',1]]},  // v0.60.02 赶尸人初始卡池：雷符×2 金刚符×2 佛渡×1 舍身×1 血契×1 纸人×1 尸王×1 守一×1 小鬼×1（共 11 张）",
   "   deck:[['leifu',2],['jingang',1],['zhouyin',1],['sheshen',1],['fuling',1],['zhiren',1],['shi_wang',1],['shouyi',1],['xiaogui',1],['wutong',1]]},  // v0.61.37 赶尸人初始卡池：雷符×2 金刚符×1 咒印×1 舍身×1 附灵术×1 纸人×1 尸王×1 守一×1 小鬼×1 五通神×1（共 11 张；金刚符 2→1、去佛渡/血契、加咒印/附灵术/五通神）",
   'HEROES A deck 新牌库')

# ════════════════════════════════════════════════════════════════════
# js/30_engine.js
# ════════════════════════════════════════════════════════════════════
E = 'js/30_engine.js'

# ── CARD_DMG：A 列 10 条（其中 4 条是跨列共用分支，必须拆开） ──
ed(E,
   "if(G.hero==='ganshiren') d=(u?7:4)+G.summons.filter(s=>s.dur>0).length;",
   "if(G.hero==='ganshiren') d=(u?7:5)+G.summons.filter(s=>s.dur>0).length;   // v0.61.37 A：4 → 5",
   'CARD_DMG 雷符')
ed(E,
   "    if(G.hero==='ganshiren') d=u?8:5;",
   "    if(G.hero==='ganshiren') d=u?7:5;   // v0.61.37 A：8 → 7",
   'CARD_DMG 火符')
ed(E,
   "    else { d=(u?13:8); if(hasShiqi(2)) d*=2; }",
   "    else { d=(u?14:10); if(hasShiqi(3)) d*=2; }   // v0.61.37 A：13/8 → 14/10，门槛 2 → 3",
   'CARD_DMG 剑符')
ed(E,
   "  zhanyaojian: (u,e)=>{ const t=e||curEnemy(); if(!t) return 0; const base=u?12:8;",
   "  zhanyaojian: (u,e)=>{ const t=e||curEnemy(); if(!t) return 0;\n"
   "    // v0.61.37：base 原与 A/B 共用 —— A 列基础 8 → 7，B 列仍 8，故 A 单独取值\n"
   "    if(G.hero==='ganshiren') return (u?12:7)+2*G.summons.filter(s=>s.dur>0).length;\n"
   "    const base=u?12:8;",
   'CARD_DMG 斩妖剑（拆 A/B 共用 base）')
ed(E,
   "    if(G.hero==='ganshiren') return base+2*G.summons.filter(s=>s.dur>0).length;\n",
   "",
   'CARD_DMG 斩妖剑 旧 A 行删除')
ed(E,
   "    return u?24:18; },",
   "    return u?28:20; },   // v0.61.37 A：24/18 → 28/20",
   'CARD_DMG 天雷正法')
ed(E,
   "  wanjian: u=>G.hero==='wuseng'?(u?14:9):(G.hero==='tianshi'?(u?18:14):(u?15:10)),   // v0.61.35 D：14/16 → 14/18",
   "  wanjian: u=>G.hero==='wuseng'?(u?14:9):(G.hero==='tianshi'?(u?18:14):(G.hero==='yincha'?(u?15:10):(u?14:10))),   // v0.61.35 D：14/16 → 14/18；v0.61.37 尾支原与 C 共用 → 拆开，A 升级 15 → 14（C 仍 15/10）",
   'CARD_DMG 万剑归宗（拆 A/C 共用尾支）')
ed(E,
   "  shihunzhou: u=>G.hero==='ganshiren'?(u?6:3):",
   "  shihunzhou: u=>G.hero==='ganshiren'?(u?8:4):",
   'CARD_DMG 蚀魂咒')
ed(E,
   "    if(G.hero==='ganshiren') d=(u?7:5)+Math.min(5,Math.floor((G.尸气||0)/2));",
   "    if(G.hero==='ganshiren') d=(u?7:5)+Math.min(u?7:6,(G.尸气||0));   // v0.61.37 A：每 1 点尸气 +1，上限 6/7",
   'CARD_DMG 嗜血')
ed(E,
   "    const base = G.hero==='wuseng'?(u?15:10):(G.hero==='tianshi'?(u?15:10):(u?16:10));   // v0.61.35 D：10/14 → 10/15",
   "    const base = G.hero==='wuseng'?(u?15:10):(G.hero==='tianshi'?(u?15:10):(G.hero==='yincha'?(u?16:10):(u?15:10)));   // v0.61.35 D：10/14 → 10/15；v0.61.37 尾支原与 C 共用 → 拆开，A 升级 16 → 15（C 仍 16/10）",
   'CARD_DMG 镇妖铃（拆 A/C 共用尾支）')
ed(E,
   "  zhouyu: u=>G.hero==='wuseng'?0:(G.尸气||0)*(u?7:6), // B 咒雨无伤害（格挡转化），预览不显示",
   "  // v0.61.37：尾支原与 C/D 共用。A 列每层 7/6 → 6/5；C/D 出的是别的效果（咒雨对它们本就不造成伤害），\n"
   "  //          既有缺陷本批不动、也不弄得更糟，故保持原值走尾支。\n"
   "  zhouyu: u=>G.hero==='wuseng'?0:(G.hero==='ganshiren'?(G.尸气||0)*(u?6:5):(G.尸气||0)*(u?7:6)),",
   'CARD_DMG 咒雨（拆 A/C/D 共用尾支）')

# ── 火符弃鬼怪牌尸气 ──
ed(E,
   "if(isGhostCard(c)){ gain=s.up?2:1; gainShiqi(gain); log(`火符：弃掉鬼怪牌，获得 ${gain} 点【尸气】`); }",
   "if(isGhostCard(c)){ gain=s.up?3:2; gainShiqi(gain); log(`火符：弃掉鬼怪牌，获得 ${gain} 点【尸气】`); }   // v0.61.37 A：1/2 → 2/3",
   '火符 弃鬼怪牌 2/3')

# ── 易物换出鬼怪牌尸气 ──
ed(E,
   "if(G.hero==='ganshiren' && isGhostCard(old)){ gainShiqi(1); log('易物：换出鬼怪牌，获得 1 点【尸气】'); }",
   "if(G.hero==='ganshiren' && isGhostCard(old)){ gainShiqi(2); log('易物：换出鬼怪牌，获得 2 点【尸气】'); }   // v0.61.37 A：1 → 2",
   '易物 换出鬼怪牌 2 尸气')

# ── 移形换影闪避给尸气（修既有断链：值存在 G.dodgeShiqi 却硬编码 1） ──
ed(E,
   "if(G.dodgeShiqi){ gainShiqi(1); log(`移形换影：闪避了 ${attacker.name} 的攻击，获得 1 点【尸气】`); }",
   "if(G.dodgeShiqi){ const __dq=G.dodgeShiqi; gainShiqi(__dq); log(`移形换影：闪避了 ${attacker.name} 的攻击，获得 ${__dq} 点【尸气】`); }   // v0.61.37：原先硬编码 1，与卡面/eff 存的 G.dodgeShiqi 断开",
   '移形换影 闪避给尸气读 G.dodgeShiqi')

# ── 洗髓经每回合尸气（读 G.xisuiShiqi） ──
ed(E,
   "if(G.hero==='ganshiren'){ gainShiqi(1); log('洗髓经：获得 1 点【尸气】与 1 点符文'); }",
   "if(G.hero==='ganshiren'){ const __sq=G.xisuiShiqi||1; gainShiqi(__sq); log(`洗髓经：获得 ${__sq} 点【尸气】与 1 点符文`); }   // v0.61.37 A：尸气 1 → 1/2",
   '洗髓经 tick 尸气 1/2')

# ════════════════════════════════════════════════════════════════════
# js/40_flow.js —— 存档：xisuiShiqi 需随存读（洗髓经升级档 2 点）
# ════════════════════════════════════════════════════════════════════
F = 'js/40_flow.js'
ed(F,
   "shiqi:G.尸气||0, xuenu:G.xuenu||0, xisuiTurns:G.xisuiTurns||0,",
   "shiqi:G.尸气||0, xuenu:G.xuenu||0, xisuiTurns:G.xisuiTurns||0, xisuiShiqi:G.xisuiShiqi||0,",
   '存档 加 xisuiShiqi')
ed(F,
   "G.尸气=d.shiqi||0; G.xuenu=d.xuenu||0; G.xisuiTurns=d.xisuiTurns||0;",
   "G.尸气=d.shiqi||0; G.xuenu=d.xuenu||0; G.xisuiTurns=d.xisuiTurns||0; G.xisuiShiqi=d.xisuiShiqi||0;",
   '读档 加 xisuiShiqi')

# ════════════════════════════════════════════════════════════════════
# 校验 + 落地
# ════════════════════════════════════════════════════════════════════
raws = {}
bodies = {}
nls = {}
for p in {e[0] for e in EDITS}:
    raw = io.open(os.path.join(ROOT, p), encoding='utf-8').read()
    raws[p] = raw
    nls[p] = '\r\n' if '\r\n' in raw else '\n'
    bodies[p] = raw.replace('\r\n', '\n')

errs = []
for path, old, new, n, label in EDITS:
    c = bodies[path].count(old)
    if c != n:
        errs.append('[%s] 锚点命中 %d 次（期望 %d）：%s' % (path, c, n, label))
if errs:
    print('!! 有锚点未命中，一个字节都不写：')
    for e in errs:
        print('   ', e)
    sys.exit(1)

for path, old, new, n, label in EDITS:
    bodies[path] = bodies[path].replace(old, new, n)

for p, body in bodies.items():
    io.open(os.path.join(ROOT, p), 'w', encoding='utf-8', newline='').write(body.replace('\n', nls[p]))
    print('OK %s  (%d 处)' % (p, sum(1 for e in EDITS if e[0] == p)))
print('合计 %d 处改动' % len(EDITS))