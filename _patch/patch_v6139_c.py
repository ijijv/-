# -*- coding: utf-8 -*-
"""v0.61.39 · 阴差（C 列）卡池按《阴差版卡池 - 副本.md》重做 22 张。

只动 G.hero==='yincha' 分支；A/B/D 三列一行不碰。
CARD_DMG（30_engine.js:144-228）逐条镜像，防止拖拽预伤说谎。

铁律：count==1（或显式 n）锚点 + 全或无 + 换行归一。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D_PATH = os.path.join(ROOT, 'js', '20_data.js')
E_PATH = os.path.join(ROOT, 'js', '30_engine.js')

errs = []


def ed(body, old, new, label, n=1):
    c = body.count(old)
    if c != n:
        errs.append('%s —— 锚点命中 %d 次（期望 %d）' % (label, c, n))
    return body.replace(old, new)


def load(p):
    raw = io.open(p, encoding='utf-8').read()
    nl = '\r\n' if '\r\n' in raw else '\n'
    return raw, nl, raw.replace('\r\n', '\n')


def save(p, body, nl):
    io.open(p, 'w', encoding='utf-8', newline='').write(body.replace('\n', nl))


D_raw, D_nl, D = load(D_PATH)
E_raw, E_nl, E = load(E_PATH)

# ══════════════ js/20_data.js ══════════════

# ── #1 雷符：5/8 → 4/8，每层 +2 → +3（上限 +6 不变）──
D = ed(D,
       '造成 ${u?8:5} 伤害。每层【血怒】使此牌伤害 +2（上限 +6）',
       '造成 ${u?8:4} 伤害。每层【血怒】使此牌伤害 +3（上限 +6）',
       '20_data leifu t C')
D = ed(D,
       "if(!t) return; let d=(G.hero==='tianshi'?(u?9:6):G.hero==='yincha'?(u?8:5):(u?6:4));",
       "if(!t) return; let d=(G.hero==='tianshi'?(u?9:6):G.hero==='yincha'?(u?8:4):(u?6:4));",
       '20_data leifu eff C base')
D = ed(D,
       "else if(G.hero==='yincha') d+=2*rageSpend(2,6);",
       "else if(G.hero==='yincha') d+=3*rageSpend(3,6);",
       '20_data leifu eff C rage')

# ── #2 火符：8/11 → 6/10 ──
D = ed(D,
       '造成 ${u?11:8} 伤害。失去 2 点生命',
       '造成 ${u?10:6} 伤害。失去 2 点生命',
       '20_data huofu t C')
D = ed(D,
       "if(G.hero==='yincha'){ d=(u?11:8); loseHp(2); }",
       "if(G.hero==='yincha'){ d=(u?10:6); loseHp(2); }",
       '20_data huofu eff C')

# ── #4 斩妖剑：9/14 → 10/14（带诅咒额外 4/6 不变）──
D = ed(D,
       '造成 ${u?14:9} 伤害。若目标带有【诅咒】，额外造成 ${u?6:4} 伤害',
       '造成 ${u?14:10} 伤害。若目标带有【诅咒】，额外造成 ${u?6:4} 伤害',
       '20_data zhanyaojian t C')
D = ed(D,
       "if(G.hero==='yincha'){ let dc=(u?14:9);",
       "if(G.hero==='yincha'){ let dc=(u?14:10);",
       '20_data zhanyaojian eff C')

# ── #5 天雷正法：上限 +20 → +20/+26 ──
D = ed(D,
       '本场每失去过 1 点生命，此牌伤害 +${u?2:1}（上限 +20）',
       '本场每失去过 1 点生命，此牌伤害 +${u?2:1}（上限 +${u?26:20}）',
       '20_data tianlei t C')
D = ed(D,
       'dealDamageTo(t,(u?21:16)+Math.min(20,(G.totalHpLost||0)*(u?2:1)));',
       'dealDamageTo(t,(u?21:16)+Math.min(u?26:20,(G.totalHpLost||0)*(u?2:1)));',
       '20_data tianlei eff C')

# ── #6 万剑归宗：失 3 → 失 5 血；恢复 8/12 → 10/15 ──
D = ed(D,
       "{id:'wanjian', name:'万剑归宗', type:'attack', rarity:'gold', cost:3, hpCost:(u)=>G.hero==='yincha'?3:0,",
       "{id:'wanjian', name:'万剑归宗', type:'attack', rarity:'gold', cost:3, hpCost:(u)=>G.hero==='yincha'?5:0,",
       '20_data wanjian hpCost C')
D = ed(D,
       '对全体敌人造成 ${u?15:10} 伤害。失去 3 点生命。每击败 1 名敌人，恢复 ${u?12:8} 点生命并获得 1 点符文',
       '对全体敌人造成 ${u?15:10} 伤害。失去 5 点生命。每击败 1 名敌人，恢复 ${u?15:10} 点生命并获得 1 点符文',
       '20_data wanjian t C')
D = ed(D,
       "else if(G.hero==='yincha'){ loseHp(3); const d=u?15:10;",
       "else if(G.hero==='yincha'){ loseHp(5); const d=u?15:10;",
       '20_data wanjian eff C loseHp')
D = ed(D,
       "else if(G.hero==='yincha'){ const hk=killed*(u?12:8);",
       "else if(G.hero==='yincha'){ const hk=killed*(u?15:10);",
       '20_data wanjian eff C heal')

# ── #8 噬魂术：10/15 → 10/16；每层 +2 → +2/+3（上限 +20 → +12/+18）──
D = ed(D,
       '对目标造成 ${u?15:10} 伤害。每层【血怒】使此牌伤害 +2（上限 +20）',
       '对目标造成 ${u?16:10} 伤害。每层【血怒】使此牌伤害 +${u?3:2}（上限 +${u?18:12}）',
       '20_data shihun t C')
D = ed(D,
       "if(G.hero==='yincha'){ dealDamageTo(t,(u?15:10)+2*rageSpend(2,20)); return; }",
       "if(G.hero==='yincha'){ dealDamageTo(t,(u?16:10)+(u?3:2)*rageSpend(u?3:2,u?18:12)); return; }",
       '20_data shihun eff C')

# ── #9 群鬼乱舞：语序调整（效果不变，只对齐卡面）──
D = ed(D,
       '失去 2 点生命。本回合每失去 2 点生命，召唤单位伤害 +${u?2:1}',
       '本回合每失去 2 点生命，召唤单位伤害 +${u?2:1}。立刻失去 2 点生命。',
       '20_data qungui t C')

# ── #12 嗜血：4/6 → 5 固定 ──
D = ed(D,
       '造成 ${u?6:4} 伤害。本场每失去 ${u?3:4} 点生命',
       '造成 5 伤害。本场每失去 ${u?3:4} 点生命',
       '20_data shixue t C')
D = ed(D,
       "else if(G.hero==='yincha') d=(u?6:4)+Math.min(u?20:15,Math.floor((G.totalHpLost||0)/(u?3:4)));",
       "else if(G.hero==='yincha') d=5+Math.min(u?20:15,Math.floor((G.totalHpLost||0)/(u?3:4)));",
       '20_data shixue eff C')

# ── #14 钟馗镇魂：失 4 → 失 5 血 ──
D = ed(D,
       "{id:'zhongkui', name:'钟馗镇魂', type:'spirit', rarity:'gold', cost:3, exhaust:true, hpCost:(u)=>G.hero==='yincha'?4:0,",
       "{id:'zhongkui', name:'钟馗镇魂', type:'spirit', rarity:'gold', cost:3, exhaust:true, hpCost:(u)=>G.hero==='yincha'?5:0,",
       '20_data zhongkui hpCost C')
D = ed(D,
       '失去 4 点生命；若生命低于 40%，伤害翻倍',
       '失去 5 点生命；若生命低于 40%，伤害翻倍',
       '20_data zhongkui t C')
D = ed(D,
       "if(G.hero==='yincha'){ sealEnemy(t,1); loseHp(4);",
       "if(G.hero==='yincha'){ sealEnemy(t,1); loseHp(5);",
       '20_data zhongkui eff C')

# ── #15 金刚符：7/9 → 6/9 格挡；失 2 → 失 2/3 ──
D = ed(D,
       "{id:'jingang', name:'金刚符', type:'defense', rarity:'white', cost:1, hpCost:(u)=>G.hero==='yincha'?2:0,",
       "{id:'jingang', name:'金刚符', type:'defense', rarity:'white', cost:1, hpCost:(u)=>G.hero==='yincha'?(u?3:2):0,",
       '20_data jingang hpCost C')
D = ed(D,
       '获得 ${u?9:7} 点格挡。失去 2 点生命',
       '获得 ${u?9:6} 点格挡。失去 ${u?3:2} 点生命',
       '20_data jingang t C')
D = ed(D,
       "else if(G.hero==='yincha'){ loseHp(2); b=u?9:7; }",
       "else if(G.hero==='yincha'){ loseHp(u?3:2); b=u?9:6; }",
       '20_data jingang eff C')

# ── #16 隐身符：3/5 → 3/7 格挡（天师列仍 3/5，故必须从共用支拆出）──
D = ed(D,
       '获得 ${u?5:3} 点格挡，抽 1 张牌。若本回合失去过生命，改为抽 2 张',
       '获得 ${u?7:3} 点格挡，抽 1 张牌。若本回合失去过生命，改为抽 2 张',
       '20_data yinshen t C')
D = ed(D,
       "(G.hero==='wuseng'?(u?6:4):(u?5:3));   // v0.61.35 天师列：3/6 → 3/5（阴差列同为 3/5）",
       "(G.hero==='wuseng'?(u?6:4):(G.hero==='yincha'?(u?7:3):(u?5:3)));   // v0.61.35 天师列：3/6 → 3/5；v0.61.39 阴差列拆出并改 3/5 → 3/7",
       '20_data yinshen eff C 拆支')

# ── #17 金光罩：10/14 → 11/17 格挡；失 3 → 失 4/5 ──
D = ed(D,
       "{id:'jinguang', name:'金光罩', type:'defense', rarity:'blue', cost:2, hpCost:(u)=>G.hero==='yincha'?3:0,",
       "{id:'jinguang', name:'金光罩', type:'defense', rarity:'blue', cost:2, hpCost:(u)=>G.hero==='yincha'?(u?5:4):0,",
       '20_data jinguang hpCost C')
D = ed(D,
       '获得 ${u?14:10} 点格挡。失去 3 点生命',
       '获得 ${u?17:11} 点格挡。失去 ${u?5:4} 点生命',
       '20_data jinguang t C')
D = ed(D,
       "else if(G.hero==='yincha'){ loseHp(3); gainBlock(u?14:10); }",
       "else if(G.hero==='yincha'){ loseHp(u?5:4); gainBlock(u?17:11); }",
       '20_data jinguang eff C')

# ── #18 金钟罩：10/15 → 12/18 格挡 ──
D = ed(D,
       "获得 ${G.hero==='ganshiren'?(u?16:10):G.hero==='yincha'?(u?15:10):(u?17:12)} 点格挡。清除自身所有负面状态与手牌中的状态牌",
       "获得 ${G.hero==='ganshiren'?(u?16:10):G.hero==='yincha'?(u?18:12):(u?17:12)} 点格挡。清除自身所有负面状态与手牌中的状态牌",
       '20_data jinzhong t C')
D = ed(D,
       "gainBlock(G.hero==='ganshiren'?(u?16:10):G.hero==='yincha'?(u?15:10):(u?17:12)); clearJunk();",
       "gainBlock(G.hero==='ganshiren'?(u?16:10):G.hero==='yincha'?(u?18:12):(u?17:12)); clearJunk();",
       '20_data jinzhong eff C')

# ── #19 荆棘符：3/5 → 4/6 格挡；回 2 → 回 2/3 ──
D = ed(D,
       '获得 ${u?5:3} 点格挡。本回合每受 1 次攻击，恢复 2 点生命',
       '获得 ${u?6:4} 点格挡。本回合每受 1 次攻击，恢复 ${u?3:2} 点生命',
       '20_data jingji t C')
D = ed(D,
       "(G.hero==='yincha'?(u?5:3):(u?6:3))); gainBlock(b);",
       "(G.hero==='yincha'?(u?6:4):(u?6:3))); gainBlock(b);",
       '20_data jingji eff C 格挡')
D = ed(D,
       "else if(G.hero==='yincha'){ G.hitHeal=2; }",
       "else if(G.hero==='yincha'){ G.hitHeal=u?3:2; }",
       '20_data jingchi eff C 回血')

# ── #20 佛渡：升级「额外 3 格挡」→「回复 5 点生命」──
D = ed(D,
       "本回合免疫敌人施加的负面效果${u?'，额外获得 3 点格挡':''}。消耗（一次性）",
       "本回合免疫敌人施加的负面效果${u?'，回复 5 点生命':''}。消耗（一次性）",
       '20_data fodu t C')
D = ed(D,
       "      const fb=(G.hero==='yincha')?3:((G.hero==='tianshi'||G.hero==='wuseng')?5:4);   // v0.61.35 天师列 4→5；v0.61.36 武僧列 4→5（阴差 3；赶尸人走上面 2 尸气分支）\n"
       "      clearJunk(); clearPlayerDebuffs(); G.debuffImmune=1; floatMsg('本回合免疫负面效果'); if(u){ gainBlock(fb); log(`佛渡：升级后获得 ${fb} 点格挡`); } }},",
       "      const fb=(G.hero==='tianshi'||G.hero==='wuseng')?5:4;   // v0.61.39 阴差列升级改为「回复 5 点生命」，fb 不再含阴差\n"
       "      clearJunk(); clearPlayerDebuffs(); G.debuffImmune=1; floatMsg('本回合免疫负面效果');\n"
       "      if(G.hero==='yincha'){ if(u){ heal(5); log('佛渡：升级后回复 5 点生命'); } }\n"
       "      else if(u){ gainBlock(fb); log(`佛渡：升级后获得 ${fb} 点格挡`); } }},",
       '20_data fodu eff C')

# ── #21 铜皮铁骨：8/11 → 9/13 格挡；失 3 血+反弹 → 每受攻击回 3/4 血 ──
D = ed(D,
       "{id:'tongpi', name:'铜皮铁骨', type:'defense', rarity:'blue', cost:2, hpCost:(u)=>G.hero==='yincha'?3:0,",
       "{id:'tongpi', name:'铜皮铁骨', type:'defense', rarity:'blue', cost:2,   // v0.61.39 阴差列不再失血，hpCost 整体撤除",
       '20_data tongpi hpCost 撤除')
D = ed(D,
       '获得 ${u?11:8} 点格挡。失去 3 点生命，反弹 ${u?8:6} 点伤害',
       '获得 ${u?13:9} 点格挡。本回合每受到 1 次攻击，恢复 ${u?4:3} 点生命',
       '20_data tongpi t C')
D = ed(D,
       "else if(G.hero==='yincha'){ loseHp(3); gainBlock(u?11:8); G.thorns+=u?8:6; }",
       "else if(G.hero==='yincha'){ gainBlock(u?13:9); G.hitHeal=u?4:3; }",
       '20_data tongpi eff C')

# ── #23 卸甲生元：5/7 → 5/8 格挡；失 3 → 失 2；新增治疗上限 11/14 ──
D = ed(D,
       "{id:'xiejiashengyuan', name:'卸甲生元', type:'defense', rarity:'blue', cost:1, hpCost:(u)=>G.hero==='yincha'?3:0,",
       "{id:'xiejiashengyuan', name:'卸甲生元', type:'defense', rarity:'blue', cost:1, hpCost:(u)=>G.hero==='yincha'?2:0,",
       '20_data xiejiashengyuan hpCost C')
D = ed(D,
       '获得 ${u?7:5} 点格挡。失去 3 点生命。敌人攻击后每保留 1 点格挡，恢复 1 点生命',
       '获得 ${u?8:5} 点格挡。失去 2 点生命。敌人攻击后每保留 1 点格挡，恢复 1 点生命（上限恢复 ${u?14:11} 滴血量）',
       '20_data xiejiashengyuan t C')
D = ed(D,
       "else if(G.hero==='yincha'){ loseHp(3); gainBlock(u?7:5); G.endBlockKind='C';",
       "else if(G.hero==='yincha'){ loseHp(2); gainBlock(u?8:5); G.endBlockKind='C'; G.xiejiaHealCap=u?14:11;",
       '20_data xiejiashengyuan eff C')

# ── #31 燃血术：C 列 失 4/6 + 符文 1/2 → 失 4 固定 + 符文 1 固定 ──
D = ed(D,
       "hpCost:(u)=>G.hero==='wuseng'?8:(G.hero==='yincha'?(u?6:4):8),   // v0.61.37 赶尸人列：4 → 8（与武僧/天师同为 8）   // v0.61.36 武僧列：6 → 8",
       "hpCost:(u)=>G.hero==='wuseng'?8:(G.hero==='yincha'?4:8),   // v0.61.37 赶尸人列：4 → 8（与武僧/天师同为 8）   // v0.61.36 武僧列：6 → 8   // v0.61.39 阴差列固定 4",
       '20_data ranxue hpCost C')
D = ed(D,
       "const l=G.hero==='wuseng'?8:(G.hero==='yincha'?(u?6:4):8);   // v0.61.36 武僧列：6 → 8",
       "const l=G.hero==='wuseng'?8:(G.hero==='yincha'?4:8);   // v0.61.36 武僧列：6 → 8（v0.61.39 阴差列固定 4）",
       '20_data ranxue l（t 与 eff 同串两处）', n=2)
D = ed(D,
       "const gg=G.hero==='yincha'?(u?2:1):2;",
       "const gg=G.hero==='yincha'?1:2;",
       '20_data ranxue gg（t 与 eff 同串两处）', n=2)

# ── #35 血祭：阈值 每失 2 点 → 每失 4 点；语序对齐卡面 ──
D = ed(D,
       '失去 4 点生命。本回合每失去 2 点生命，下回合多摸 1 张牌（上限 +4）',
       '本回合每失去 4 点生命，下回合多摸 1 张牌（上限 +4）。立刻失去 4 点生命',
       '20_data xueji t C')

# ── #37 开天眼：上限 +6 → +8/+10 ──
D = ed(D,
       '本回合攻击牌伤害 +${u?5:3}。每层【血怒】使额外伤害 +1（上限 +6），打出后消耗对应【血怒】',
       '本回合攻击牌伤害 +${u?5:3}。每层【血怒】使额外伤害 +1（上限 +${u?10:8}），打出后消耗对应【血怒】',
       '20_data kaitianyan t C')
D = ed(D,
       "else if(G.hero==='yincha') val=(u?5:3)+rageSpend(1,6);",
       "else if(G.hero==='yincha') val=(u?5:3)+rageSpend(1,u?10:8);",
       '20_data kaitianyan eff C')

# ── #38 移形换影：1/0 → 1/1 费；回 4 → 回 2/4；怒 1 → 怒 1/2 ──
D = ed(D,
       "cost:1, costU:{tianshi:1, wuseng:1, ganshiren:1, default:0},   // v0.61.35 天师列取消 0 费升级；v0.61.36 武僧列同（1/1）；v0.61.37 赶尸人列同（1/1）",
       "cost:1, costU:{tianshi:1, wuseng:1, ganshiren:1, yincha:1, default:1},   // v0.61.35 天师列取消 0 费升级；v0.61.36 武僧列同；v0.61.37 赶尸人列同；v0.61.39 阴差列同（1/1）",
       '20_data yixing costU C')
D = ed(D,
       "闪避下一次攻击。闪避成功后，恢复 4 点生命并获得 1 层【血怒】${u?'（0 符文）':''}",
       '闪避下一次攻击。闪避成功后，恢复 ${u?4:2} 点生命并获得 ${u?2:1} 层【血怒】',
       '20_data yixing t C')
D = ed(D,
       "else if(G.hero==='yincha'){ G.dodgeHealRage=4; }",
       "else if(G.hero==='yincha'){ G.dodgeHealRage=u?4:2; G.dodgeRageGain=u?2:1; }",
       '20_data yixing eff C')

# ── #40 镇妖铃：每层 +2 → +2/+3（上限 +20 → +12/+18）──
D = ed(D,
       '失去 3 点生命，每层【血怒】使此牌伤害 +2（上限 +20）（消耗）',
       '失去 3 点生命，每层【血怒】使此牌伤害 +${u?3:2}（上限 +${u?18:12}）（消耗）',
       '20_data zhenyaoling t C')
D = ed(D,
       "if(G.hero==='yincha'){ loseHp(3); sealEnemy(t,1); dealDamageTo(t,(u?16:10)+2*rageSpend(2,20)); return; }",
       "if(G.hero==='yincha'){ loseHp(3); sealEnemy(t,1); dealDamageTo(t,(u?16:10)+(u?3:2)*rageSpend(u?3:2,u?18:12)); return; }",
       '20_data zhenyaoling eff C')

# ── #41 纸人：血怒门槛 ≥4/耗4 → ≥3/耗3（+ 补 hpCost）──
D = ed(D,
       "{id:'zhiren', name:'纸人', type:'spirit', rarity:'white', cost:1,",
       "{id:'zhiren', name:'纸人', type:'spirit', rarity:'white', cost:1, hpCost:(u)=>G.hero==='yincha'?2:0,",
       '20_data zhiren hpCost 补登')
D = ed(D,
       '若打出时【血怒】≥4，消耗 4 点【血怒】强化：每回合末造成 ${u?5:4} 伤害，攻击时恢复 ${u?4:3} 点生命',
       '若打出时【血怒】≥3，消耗 3 点【血怒】强化：每回合末造成 ${u?5:4} 伤害，攻击时恢复 ${u?4:3} 点生命',
       '20_data zhiren t C')
D = ed(D,
       "if(rageLayers()>=4){ G.xuenu-=4; v=u?5:4; hv=u?4:3; log('纸人：消耗 4 点【血怒】强化'); } }",
       "if(rageLayers()>=3){ G.xuenu-=3; v=u?5:4; hv=u?4:3; log('纸人：消耗 3 点【血怒】强化'); } }",
       '20_data zhiren eff C')

# ── #43 小鬼：补 hpCost（同「怨气」缺登记一类）──
D = ed(D,
       "{id:'xiaogui', name:'小鬼', type:'spirit', rarity:'white', cost:1,",
       "{id:'xiaogui', name:'小鬼', type:'spirit', rarity:'white', cost:1, hpCost:(u)=>G.hero==='yincha'?2:0,",
       '20_data xiaogui hpCost 补登')

# ── #45 五通神：恢复 5 → 6；血怒门槛 ≥4/耗4 → ≥3/耗3 ──
D = ed(D,
       '召唤五通神。立即恢复 5 点生命；之后每回合开始恢复 5 点生命（持续 ${u?3:2} 回合）。若打出时【血怒】≥4，消耗 4 点【血怒】强化：持续 ${u?4:3} 回合',
       '召唤五通神。立即恢复 6 点生命；之后每回合开始恢复 6 点生命（持续 ${u?3:2} 回合）。若打出时【血怒】≥3，消耗 3 点【血怒】强化：持续 ${u?4:3} 回合',
       '20_data wutong t C')
D = ed(D,
       "else if(G.hero==='yincha'){ heal(5); wv=5; if(rageLayers()>=4){ G.xuenu-=4; wdur=u?4:3; log('五通神：消耗 4 点【血怒】强化'); } }",
       "else if(G.hero==='yincha'){ heal(6); wv=6; if(rageLayers()>=3){ G.xuenu-=3; wdur=u?4:3; log('五通神：消耗 3 点【血怒】强化'); } }",
       '20_data wutong eff C')

# ── #46 咒雨：对全体 2/3 层 → 4/6 层随机分配（每层仍回 2 血）──
D = ed(D,
       '对所有敌人施加 ${u?3:2} 层【诅咒】。每施加 1 层，恢复 2 点生命',
       '将 ${u?6:4} 层【诅咒】随机施加在敌人身上。每施加 1 层，恢复 2 点生命',
       '20_data zhouyu t C')
D = ed(D,
       "      let n=0; aliveEnemies().forEach(e=>{ n+=applyCurse(e,u?3:2); });\n"
       "      heal(n*2); log(`咒雨：施加 ${n} 层诅咒，恢复 ${n*2} 点生命`); }},",
       "      let n=0; const __zyl=aliveEnemies(); const __zyt=u?6:4;   // v0.61.39 阴差列：4/6 层随机分配（原为每个敌人各 2/3 层）\n"
       "      for(let i=0;i<__zyt;i++){ if(!__zyl.length) break; const __zye=__zyl[Math.floor(rng()*__zyl.length)]; if(__zye) n+=applyCurse(__zye,1); }\n"
       "      heal(n*2); log(`咒雨：随机施加 ${n} 层诅咒，恢复 ${n*2} 点生命`); }},",
       '20_data zhouyu eff C')

# ── 阴差初始牌库 → 8 张 ──
D = ed(D,
       "   deck:[['leifu',3],['jingang',2],['huofu',1],['fodu',1],['juling',1],['xueqi',1],['shouyi',1],['duhunguiji',1]]},  // v0.59 阴差初始卡池：雷符×3 金刚符×2 火符×1 佛渡×1 聚灵×1 血契×1 守一×1 渡魂归己×1（共 11 张）",
       "   deck:[['leifu',3],['jingang',1],['huofu',1],['fenfu',1],['xueqi',1],['shouyi',1],['ranxue',1],['zhiren',1]]},  // v0.61.39 阴差初始卡池：雷符×3 金刚符×1 火符×1 焚符×1 血契×1 守一×1 燃血术×1 纸人×1（共 8 张）",
       '20_data 阴差初始牌库')

# ══════════════ js/30_engine.js ══════════════

# ── CARD_DMG 镜像（防拖拽预伤说谎）──
E = ed(E,
       "if(!t) return 0; let d=(G.hero==='tianshi'?(u?9:6):G.hero==='yincha'?(u?8:5):(u?6:4));",
       "if(!t) return 0; let d=(G.hero==='tianshi'?(u?9:6):G.hero==='yincha'?(u?8:4):(u?6:4));",
       '30_engine CARD_DMG leifu C base')
E = ed(E,
       "d+=2*Math.min(3,rageLayers()); // eff: 2×rageSpend(2,6) 至多 +6",
       "d+=3*Math.min(2,rageLayers()); // eff: 3×rageSpend(3,6) 至多 +6",
       '30_engine CARD_DMG leifu C rage')
E = ed(E,
       "if(G.hero==='yincha') d=u?11:8; // C 固定 11/8（本回合有格挡也不加），与 eff 一致",
       "if(G.hero==='yincha') d=u?10:6; // C 固定 10/6（本回合有格挡也不加），与 eff 一致",
       '30_engine CARD_DMG huofu C')
E = ed(E,
       "if(G.hero==='yincha') return (u?14:9)+((t.curse||0)>0?(u?6:4):0); // C：9/14 且带诅咒额外 4/6",
       "if(G.hero==='yincha') return (u?14:10)+((t.curse||0)>0?(u?6:4):0); // C：10/14 且带诅咒额外 4/6",
       '30_engine CARD_DMG zhanyaojian C')
E = ed(E,
       "if(G.hero==='yincha') return (u?21:16)+Math.min(20,(G.totalHpLost||0)*(u?2:1)); // 近似：未含本牌自扣的5血",
       "if(G.hero==='yincha') return (u?21:16)+Math.min(u?26:20,(G.totalHpLost||0)*(u?2:1)); // 近似：未含本牌自扣的5血",
       '30_engine CARD_DMG tianlei C')
E = ed(E,
       "if(G.hero==='yincha') return (u?15:10)+2*Math.min(10,rageLayers()); // 阴差：血怒每层+2(至多10层=+20)，打出时消耗",
       "if(G.hero==='yincha') return (u?16:10)+(u?3:2)*Math.min(6,rageLayers()); // 阴差：血怒每层+2/+3(至多6层=+12/+18)，打出时消耗",
       '30_engine CARD_DMG shihun C')
E = ed(E,
       "else if(G.hero==='yincha') d=(u?6:4)+Math.min(u?20:15,Math.floor((G.totalHpLost||0)/(u?3:4)));",
       "else if(G.hero==='yincha') d=5+Math.min(u?20:15,Math.floor((G.totalHpLost||0)/(u?3:4)));",
       '30_engine CARD_DMG shixue C')
E = ed(E,
       "if(G.hero==='yincha') return base+2*Math.min(10,rageLayers()); // 血怒每层 +2（至多 10 层）",
       "if(G.hero==='yincha') return base+(u?3:2)*Math.min(6,rageLayers()); // 血怒每层 +2/+3（至多 6 层）",
       '30_engine CARD_DMG zhenyaoling C')
E = ed(E,
       "G.hero==='yincha'?(rageLayers()>=4?(u?5:4):(u?2:1))",
       "G.hero==='yincha'?(rageLayers()>=3?(u?5:4):(u?2:1))",
       '30_engine CARD_DMG zhiren C 门槛')

# ── 卸甲生元 C：治疗上限 ──
E = ed(E,
       "else if(G.endBlockKind==='C'){ heal(bk); log(`卸甲生元：${bk} 点格挡转为生命`); }",
       "else if(G.endBlockKind==='C'){ const __hc=G.xiejiaHealCap||99; const __hb2=Math.min(__hc,bk); heal(__hb2); log(`卸甲生元：${bk} 点格挡转为 ${__hb2} 点生命（上限 ${__hc}）`); }",
       '30_engine 卸甲 C 治疗上限')
E = ed(E,
       "  G.block=Math.max(0, G.block-bk);\n  G.endBlockKind=null;",
       "  G.block=Math.max(0, G.block-bk);\n  G.endBlockKind=null; G.xiejiaHealCap=0;",
       '30_engine 卸甲 cap 重置')

# ── 血祭 C：阈值 每失 2 点 → 每失 4 点 ──
E = ed(E,
       "else if(G.hero==='yincha') cnt=Math.floor((G.hpLostTurn||0)/2);",
       "else if(G.hero==='yincha') cnt=Math.floor((G.hpLostTurn||0)/4);   // v0.61.39 阴差列：每失 4 点（原每失 2 点）",
       '30_engine xueji C 阈值')

# ── 移形换影 C：血怒层数按升级档 ──
E = ed(E,
       "else if(G.dodgeHealRage){ heal(G.dodgeHealRage); gainRage(1); log(`移形换影：闪避了 ${attacker.name} 的攻击，恢复 ${G.dodgeHealRage} 点生命并获得 1 层【血怒】`); }",
       "else if(G.dodgeHealRage){ const __rg=G.dodgeRageGain||1; heal(G.dodgeHealRage); gainRage(__rg); log(`移形换影：闪避了 ${attacker.name} 的攻击，恢复 ${G.dodgeHealRage} 点生命并获得 ${__rg} 层【血怒】`); }",
       '30_engine 移形换影 C 血怒层数')
E = ed(E,
       "  G.dodgeShiqi=0; G.dodgeNextBlock=0; G.dodgeHealRage=0; G.dodgeCurse=0;",
       "  G.dodgeShiqi=0; G.dodgeNextBlock=0; G.dodgeHealRage=0; G.dodgeRageGain=0; G.dodgeCurse=0;",
       '30_engine dodgeRageGain 重置')

if errs:
    print('!! 有锚点未命中，一个字节都不写：')
    for m in errs:
        print('   -', m)
    sys.exit(1)

save(D_PATH, D, D_nl)
save(E_PATH, E, E_nl)
print('OK 20_data.js %d 字符 / 30_engine.js %d 字符' % (len(D), len(E)))