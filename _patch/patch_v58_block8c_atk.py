# -*- coding: utf-8 -*-
# v0.58 Block8c：武僧 B 列 · 攻击牌 1~14 按《武僧版卡池.md》重做
#   1 雷符 4/6 每 3/2 格挡+1(上限6) ｜ 2 火符 5/7 同款 ｜ 5 天雷正法 15/20 + 获等量格挡
#   6 万剑归宗 全体 9/14 + 获 10/12 格挡 + 斩杀刷新 0 费万剑 ｜ 7 铁布衫 0 费(不可升级)
#   8 噬魂术 每层 2/3 伤 + 每层 1/2 格挡 ｜ 11 蚀魂咒 耗 2 格挡施 1/2 诅咒 ｜ 12 嗜血 4/6 每 3/2 +1
#   13 百鬼夜行 全体 5/6 每 2/1 +1(上限 +8/+11) ｜ 14 钟馗 减费门槛改 12/15/21
#   3 剑符 / 4 斩妖剑 / 9 群鬼乱舞 / 10 桃木符 经比对与文档一致，不动
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# ---------- #1 雷符 ----------
EDITS.append((
""":G.hero==='wuseng'?`造成 ${u?6:4} 伤害。每有 3 点当前格挡，伤害 +1（上限 +6）`""",
""":G.hero==='wuseng'?`造成 ${u?6:4} 伤害。每有 ${u?2:3} 点当前格挡，伤害 +1（上限 +6）`"""))
EDITS.append((
"""      if(G.hero==='ganshiren'){ d=(u?7:4)+G.summons.filter(s=>s.dur>0).length; }
      else if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/3));
      else if(G.hero==='yincha') d+=2*rageSpend(2,6);""",
"""      if(G.hero==='ganshiren'){ d=(u?7:4)+G.summons.filter(s=>s.dur>0).length; }
      else if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/(u?2:3)));
      else if(G.hero==='yincha') d+=2*rageSpend(2,6);"""))
EDITS.append((
"""    else if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/3));
    else if(G.hero==='yincha') d+=2*Math.min(3,rageLayers()); // eff: 2×rageSpend(2,6) 至多 +6""",
"""    else if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/(u?2:3)));
    else if(G.hero==='yincha') d+=2*Math.min(3,rageLayers()); // eff: 2×rageSpend(2,6) 至多 +6"""))

# ---------- #2 火符 ----------
EDITS.append((
""":G.hero==='wuseng'?`造成 ${u?7:5} 伤害。每有 3 点当前格挡，伤害 +1（上限 +6），随机弃 1 张手牌`""",
""":G.hero==='wuseng'?`造成 ${u?7:5} 伤害。每有 ${u?2:3} 点当前格挡，伤害 +1（上限 +6），随机弃 1 张手牌`"""))
EDITS.append((
"""      if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/3));
      if(G.hero==='yincha'){ d=(u?9:7); loseHp(1); }""",
"""      if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/(u?2:3)));
      if(G.hero==='yincha'){ d=(u?9:7); loseHp(1); }"""))
EDITS.append((
"""    if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/3));
    if(G.hero==='yincha') d=u?9:7; // C 固定 9/7（本回合有格挡也不加），与 eff 一致""",
"""    if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/(u?2:3)));
    if(G.hero==='yincha') d=u?9:7; // C 固定 9/7（本回合有格挡也不加），与 eff 一致"""))

# ---------- #5 天雷正法 ----------
EDITS.append((
""":G.hero==='wuseng'?`造成 ${u?18:14} 伤害。本回合每获得过 1 点格挡，此牌伤害 +1（上限 +16）`""",
""":G.hero==='wuseng'?`造成 ${u?20:15} 伤害，并获得等于造成伤害的格挡`"""))
EDITS.append((
"""      if(G.hero==='wuseng'){ dealDamageTo(t,(u?18:14)+Math.min(16,G.blockGainedTurn||0)); return; }""",
"""      if(G.hero==='wuseng'){ const dealt=dealDamageTo(t,u?20:15); if(dealt>0){ gainBlock(dealt); log(`天雷正法：获得 ${dealt} 点格挡`); } return; }"""))
EDITS.append((
"""    if(G.hero==='wuseng') return (u?18:14)+Math.min(16,G.blockGainedTurn||0);""",
"""    if(G.hero==='wuseng') return u?20:15; // 获得格挡是副效果，不进伤害预览（与 eff 的主伤害一致）"""))

# ---------- #6 万剑归宗 ----------
EDITS.append((
""":G.hero==='wuseng'?`对全体敌人造成 ${u?14:10} 伤害。每有 1 点格挡，此牌伤害 +1（上限 +12）`""",
""":G.hero==='wuseng'?`对全体敌人造成 ${u?14:9} 伤害，并获得 ${u?12:10} 点格挡。每用此牌斩杀 1 名敌人，将 1 张 0 费的万剑归宗加入手牌`"""))
EDITS.append((
"""    eff:(u)=>{ const before=G.turnStats.kills.length; const targets=aliveEnemies().slice();
      if(G.hero==='wuseng'){ const d=(u?14:10)+Math.min(12,G.block||0); targets.forEach(e=>{ if(e.hp>0) dealDamageTo(e,d); }); }""",
"""    eff:(u,c)=>{ const before=G.turnStats.kills.length; const targets=aliveEnemies().slice();
      if(G.hero==='wuseng'){ const d=u?14:9; targets.forEach(e=>{ if(e.hp>0) dealDamageTo(e,d); }); const bb=u?12:10; gainBlock(bb); log(`万剑归宗：获得 ${bb} 点格挡`); }"""))
EDITS.append((
"""        else if(G.hero==='tianshi'){ G.energy+=killed; log(`万剑归宗：击败 ${killed} 名敌人，恢复 ${killed} 点符文`); }""",
"""        else if(G.hero==='tianshi'){ G.energy+=killed; log(`万剑归宗：击败 ${killed} 名敌人，恢复 ${killed} 点符文`); }
        else if(G.hero==='wuseng' && c){ for(let i=0;i<killed;i++) G.hand.push(Object.assign({}, c, {cost:0, costU:null})); log(`万剑归宗：斩杀 ${killed} 名敌人，获得 ${killed} 张 0 费万剑归宗`); }"""))
EDITS.append((
"""  wanjian: u=>G.hero==='wuseng'?((u?14:10)+Math.min(12,G.block||0)):(G.hero==='tianshi'?(u?20:14):(u?15:10)),""",
"""  wanjian: u=>G.hero==='wuseng'?(u?14:9):(G.hero==='tianshi'?(u?20:14):(u?15:10)),"""))

# ---------- #7 铁布衫：B 列 0 费且不可升级 ----------
EDITS.append((
"""  {id:'tiebushan', name:'铁布衫', type:'attack', rarity:'blue', cost:1, costU:0, hpCost:(u)=>G.hero==='yincha'?2:0,""",
"""  {id:'tiebushan', name:'铁布衫', type:'attack', rarity:'blue', cost:{wuseng:0, default:1}, costU:{wuseng:0, tianshi:1, default:0}, hpCost:(u)=>G.hero==='yincha'?2:0,"""))
EDITS.append((
""":G.hero==='wuseng'?`造成等于当前格挡的伤害。不消耗格挡${u?'（0 费）':''}`""",
""":G.hero==='wuseng'?`造成等于当前格挡的伤害。不消耗格挡`"""))

# ---------- #8 噬魂术 ----------
EDITS.append((
""":G.hero==='wuseng'?`消耗目标全部【诅咒】，每层造成 ${u?6:5} 伤害。若本回合获得过 7 点以上格挡，额外造成 ${u?6:5} 伤害`""",
""":G.hero==='wuseng'?`消耗目标全部【诅咒】：每层造成 ${u?3:2} 点伤害，并获得 ${u?2:1} 点格挡`"""))
EDITS.append((
"""      if(G.hero==='wuseng'){ const c=t.curse||0; const extra=((G.blockGainedTurn||0)>7)?(u?6:5):0; if(c<=0 && !extra){ log('噬魂术：目标没有诅咒，落空'); return false; } t.curse=0; dealDamageTo(t,c*(u?6:5)+extra); return; }""",
"""      if(G.hero==='wuseng'){ const c=t.curse||0; if(c<=0){ log('噬魂术：目标没有诅咒，落空'); return false; } t.curse=0; dealDamageTo(t,c*(u?3:2)); const bb=c*(u?2:1); gainBlock(bb); log(`噬魂术：引爆 ${c} 层【诅咒】，获得 ${bb} 点格挡`); return; }"""))
EDITS.append((
"""    if(G.hero==='wuseng'){ const extra=((G.blockGainedTurn||0)>7)?(u?6:5):0; return ((t.curse||0)*(u?6:5))+extra; } // 武僧：每层5/6+格挡加成""",
"""    if(G.hero==='wuseng') return (t.curse||0)*(u?3:2); // 武僧：每层 2/3 伤害（另按每层获 1/2 格挡）"""))

# ---------- #11 蚀魂咒 ----------
EDITS.append((
""":G.hero==='wuseng'?`造成 ${u?7:5} 伤害。消耗 3 点格挡，施加 2 层【诅咒】`""",
""":G.hero==='wuseng'?`造成 ${u?7:5} 伤害。消耗 2 点格挡，施加 ${u?2:1} 层【诅咒】`"""))
EDITS.append((
"""      else if(G.hero==='wuseng'){ if((G.block||0)>=3){ G.block-=3; applyCurse(t,2); } else log('蚀魂咒：格挡不足 3，未施加诅咒'); }""",
"""      else if(G.hero==='wuseng'){ if((G.block||0)>=2){ G.block-=2; applyCurse(t,u?2:1); } else log('蚀魂咒：格挡不足 2，未施加诅咒'); }"""))

# ---------- #12 嗜血 ----------
EDITS.append((
""":G.hero==='wuseng'?`造成 ${u?6:4} 伤害。每有 3 点格挡，此牌伤害 +1（上限 +5）`""",
""":G.hero==='wuseng'?`造成 ${u?6:4} 伤害。每有 ${u?2:3} 点格挡，此牌伤害 +1（上限 +5）`"""))
EDITS.append((
"""      else if(G.hero==='wuseng') d=(u?6:4)+Math.min(5,Math.floor((G.block||0)/3));""",
"""      else if(G.hero==='wuseng') d=(u?6:4)+Math.min(5,Math.floor((G.block||0)/(u?2:3)));"""))
EDITS.append((
"""    else if(G.hero==='wuseng') d=(u?6:4)+Math.min(5,Math.floor((G.block||0)/3));""",
"""    else if(G.hero==='wuseng') d=(u?6:4)+Math.min(5,Math.floor((G.block||0)/(u?2:3)));"""))

# ---------- #13 百鬼夜行 ----------
EDITS.append((
""":G.hero==='wuseng'?`对全体敌人造成 ${u?6:4} 伤害。每有 ${u?2:3} 点格挡，此牌伤害 +1（上限 +${u?12:10}）`""",
""":G.hero==='wuseng'?`对全体敌人造成 ${u?6:5} 伤害。每有 ${u?1:2} 点格挡，此牌伤害 +1（上限 +${u?11:8}）`"""))
EDITS.append((
"""      if(G.hero==='wuseng'){ dealDamageToAll((u?6:4)+Math.min(u?12:10,Math.floor((G.block||0)/(u?2:3)))); return; }""",
"""      if(G.hero==='wuseng'){ dealDamageToAll((u?6:5)+Math.min(u?11:8,Math.floor((G.block||0)/(u?1:2)))); return; }"""))
EDITS.append((
"""    if(G.hero==='wuseng') return (u?6:4)+Math.min(u?12:10,Math.floor((G.block||0)/(u?2:3)));""",
"""    if(G.hero==='wuseng') return (u?6:5)+Math.min(u?11:8,Math.floor((G.block||0)/(u?1:2)));"""))

# ---------- #14 钟馗镇魂：减费门槛 12/15/21 ----------
EDITS.append((
""":G.hero==='wuseng'?`对目标造成 ${u?22:16} 伤害并【镇魂】。格挡达 10/20/30 时费用 -1/-2/-3（消耗）`""",
""":G.hero==='wuseng'?`对目标造成 ${u?22:16} 伤害并【镇魂】。格挡达 12/15/21 时费用 -1/-2/-3（消耗）`"""))
EDITS.append((
"""  // 钟馗镇魂(#14) B 武僧：格挡分别达到 10/20/30 时费用 -1/-2/-3
  if(c.id==='zhongkui' && G.hero==='wuseng'){
    const blk=G.block||0;
    const red = blk>=30 ? 3 : blk>=20 ? 2 : blk>=10 ? 1 : 0;""",
"""  // 钟馗镇魂(#14) B 武僧：格挡分别达到 12/15/21 时费用 -1/-2/-3
  if(c.id==='zhongkui' && G.hero==='wuseng'){
    const blk=G.block||0;
    const red = blk>=21 ? 3 : blk>=15 ? 2 : blk>=12 ? 1 : 0;"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v58_block8c_atk DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
