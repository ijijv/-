# -*- coding: utf-8 -*-
# v0.58 Block8e：武僧 B 列 · 功能牌 24~40 按《武僧版卡池.md》重做
#   24 聚灵 纯抽 1/2 ｜ 25 舍身 3/5 格挡 ｜ 26 守一 每保留防御牌 3/4 格挡
#   28 血契 1/0(U:0)：格挡转血 ｜ 31 燃血术 失去 6 ｜ 34 焚符 每弃 1 张 4/6 格挡
#   36 燃魂 抽 3 + 每防御牌回 2/3 ｜ 37 开天眼 +2/+4 每 3/2 格挡 +1(上限5)
#   39 附灵术 每触发 1 个 3/4 格挡 ｜ 40 镇妖铃 10/15 + 格挡≥10 时 +8/+11（不再消耗格挡）
#   27 易物 / 29 通灵 / 30 静心诀 / 32 洗髓经 / 33 渡魂归己 / 35 血祭 / 38 移形换影 已与文档一致
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# ---------- #24 聚灵：B 改为纯抽牌 ----------
EDITS.append((
"""      :G.hero==='wuseng'?`抽 ${u?2:1} 张牌。若本回合获得过格挡，再抽 1 张`""",
"""      :G.hero==='wuseng'?`抽 ${u?2:1} 张牌`"""))
EDITS.append((
"""      else if(G.hero==='wuseng'){ if((G.blockGainedTurn||0)>0){ drawCards(1); log('聚灵：本回合获得过格挡，再抽 1 张'); } }""",
"""      else if(G.hero==='wuseng'){ /* B 文档：只抽牌，无附加 */ }"""))

# ---------- #25 舍身：B 3/5 格挡 ----------
EDITS.append((
"""      :G.hero==='wuseng'?`失去 4 点生命。获得 3 点格挡，抽 ${u?2:1} 张牌`""",
"""      :G.hero==='wuseng'?`失去 4 点生命。获得 ${u?5:3} 点格挡，抽 ${u?2:1} 张牌`"""))
EDITS.append((
"""      else if(G.hero==='wuseng'){ gainBlock(3); }""",
"""      else if(G.hero==='wuseng'){ gainBlock(u?5:3); }"""))

# ---------- #26 守一：B 每保留 1 张防御牌 3/4 格挡 ----------
EDITS.append((
"""      :G.hero==='wuseng'?`保留 ${u?2:1} 张手牌。每保留 1 张防御牌，获得 2 点格挡`""",
"""      :G.hero==='wuseng'?`保留 ${u?2:1} 张手牌。每保留 1 张防御牌，获得 ${u?4:3} 点格挡`"""))
EDITS.append((
"""    eff:(u)=>{ G.retain+=(u?2:1); floatMsg(`回合结束时可保留 ${G.retain} 张手牌`); }},""",
"""    eff:(u)=>{ G.retain+=(u?2:1); G.shouyiUp=!!u; floatMsg(`回合结束时可保留 ${G.retain} 张手牌`); }},"""))
EDITS.append((
"""    else if(G.hero==='wuseng'){ if(c.type==='defense'){ gainBlock(2); log('守一：保留防御牌，获得 2 点格挡'); } }""",
"""    else if(G.hero==='wuseng'){ if(c.type==='defense'){ const sb=G.shouyiUp?4:3; gainBlock(sb); log(`守一：保留防御牌，获得 ${sb} 点格挡`); } }"""))

# ---------- #28 血契：B = 1/0(U:0) 格挡转血 ----------
EDITS.append((
"""  {id:'xueqi', name:'血契', type:'skill', rarity:'blue', cost:1,
    t:(u)=>`本回合每失去 1 点生命，获得 ${u?3:2} 点格挡`,
    eff:(u)=>{ G.bloodPact=(G.bloodPact||0)+(u?3:2); floatMsg('血契：以血换盾'); log(`血契：本回合每失去 1 点生命，获得 ${G.bloodPact} 点格挡`); }},""",
"""  {id:'xueqi', name:'血契', type:'skill', rarity:'blue', cost:1, costU:{wuseng:0},
    t:(u)=>G.hero==='wuseng'?`将目前的格挡转化为血量${u?'（0 符文）':''}`
      :`本回合每失去 1 点生命，获得 ${u?3:2} 点格挡`,
    eff:(u)=>{ if(G.hero==='wuseng'){ const b=G.block||0; if(b>0){ G.block=0; heal(b); floatMsg(`格挡化血 +${b}`); log(`血契：${b} 点格挡转化为生命`); } else log('血契：当前没有格挡'); return; }
      G.bloodPact=(G.bloodPact||0)+(u?3:2); floatMsg('血契：以血换盾'); log(`血契：本回合每失去 1 点生命，获得 ${G.bloodPact} 点格挡`); }},"""))

# ---------- #31 燃血术：B 失去 6（A4 / C 4升级6 / D 6升级3） ----------
EDITS.append((
"""  {id:'ranxue', name:'燃血术', type:'skill', rarity:'purple', cost:0, hpCost:()=>4,
    t:(u)=>`失去 4 点生命。获得 2 点符文`,
    eff:(u)=>{ loseHp(4); G.energy+=2; floatMsg('符文 +2'); log('燃血术：失去 4 点生命，获得 2 点符文'); }},""",
"""  {id:'ranxue', name:'燃血术', type:'skill', rarity:'purple', cost:0,
    hpCost:(u)=>G.hero==='wuseng'?6:(G.hero==='yincha'?(u?6:4):(G.hero==='tianshi'?(u?3:6):4)),
    t:(u)=>{ const l=G.hero==='wuseng'?6:(G.hero==='yincha'?(u?6:4):(G.hero==='tianshi'?(u?3:6):4));
      return `失去 ${l} 点生命。获得 2 点符文`; },
    eff:(u)=>{ const l=G.hero==='wuseng'?6:(G.hero==='yincha'?(u?6:4):(G.hero==='tianshi'?(u?3:6):4));
      loseHp(l); G.energy+=2; floatMsg('符文 +2'); log(`燃血术：失去 ${l} 点生命，获得 2 点符文`); }},"""))

# ---------- #34 焚符：B 每弃 1 张 4/6 格挡 ----------
EDITS.append((
"""      :G.hero==='wuseng'?`弃任意张手牌：每弃 1 张，获得 ${u?4:3} 点格挡`""",
"""      :G.hero==='wuseng'?`弃任意张手牌：每弃 1 张，获得 ${u?6:4} 点格挡`"""))
EDITS.append((
"""    else if(G.hero==='wuseng'){ gainBlock(u?4:3); }""",
"""    else if(G.hero==='wuseng'){ gainBlock(u?6:4); }"""))

# ---------- #36 燃魂：B/C/D 抽 3（A 抽 2 + 1 符文）；回血 2/4(A/C)、2/3(B/D) ----------
EDITS.append((
"""    eff:(u,c)=>{ loseHp(G.hero==='yincha'?(u?5:7):(u?4:6)); drawCards(2); G.energy+=1;
      G.ranhunType = G.hero==='ganshiren'?'ghost' : G.hero==='wuseng'?'defense' : G.hero==='yincha'?'skill' : 'attack';
      G.ranhunSelf=c; floatMsg('燃魂 · 已点燃'); }},""",
"""    eff:(u,c)=>{ loseHp(G.hero==='yincha'?(u?5:7):(u?4:6));
      if(G.hero==='ganshiren'){ drawCards(2); G.energy+=1; } else { drawCards(3); }
      G.ranhunType = G.hero==='ganshiren'?'ghost' : G.hero==='wuseng'?'defense' : G.hero==='yincha'?'skill' : 'attack';
      G.ranhunHeal = u ? ((G.hero==='wuseng'||G.hero==='tianshi')?3:4) : 2; // A/C 2→4；B/D 2→3
      G.ranhunSelf=c; floatMsg('燃魂 · 已点燃'); }},"""))
EDITS.append((
"""    if(mt){ G.hp=Math.min(G.maxHp, G.hp+2); floatMsg('+2 生命'); log(`燃魂：打出【${c.name}】，恢复 2 点生命`); }""",
"""    if(mt){ const rh=(G.ranhunHeal!=null?G.ranhunHeal:2); G.hp=Math.min(G.maxHp, G.hp+rh); floatMsg('+'+rh+' 生命'); log(`燃魂：打出【${c.name}】，恢复 ${rh} 点生命`); }"""))
EDITS.append((
"""  G.boostCurse=0; G.junkPlayedThisTurn=0; G.ranhunType=null; G.ranhunSelf=null;""",
"""  G.boostCurse=0; G.junkPlayedThisTurn=0; G.ranhunType=null; G.ranhunSelf=null; G.ranhunHeal=0; G.shouyiUp=false;"""))

# ---------- #37 开天眼：B +2/+4，每 3/2 点格挡 +1（上限 +5） ----------
EDITS.append((
"""      :G.hero==='wuseng'?`本回合攻击牌伤害 +${u?4:2}。每有 3 点格挡，额外 +1（上限 +6）`""",
"""      :G.hero==='wuseng'?`本回合攻击牌伤害 +${u?4:2}。每有 ${u?2:3} 点格挡，额外 +1（上限 +5）`"""))
EDITS.append((
"""      else if(G.hero==='wuseng') val=(u?4:2)+Math.min(6,Math.floor((G.block||0)/3));""",
"""      else if(G.hero==='wuseng') val=(u?4:2)+Math.min(5,Math.floor((G.block||0)/(u?2:3)));"""))

# ---------- #39 附灵术：B 每触发 1 个 3/4 格挡 ----------
EDITS.append((
"""      :G.hero==='wuseng'?`立即触发所有召唤单位。每触发 1 个，获得 2 点格挡`""",
"""      :G.hero==='wuseng'?`立即触发所有召唤单位。每触发 1 个，获得 ${u?4:3} 点格挡`"""))
EDITS.append((
"""        if(G.hero==='wuseng'){ gainBlock(n*2); log(`附灵术：触发 ${n} 个召唤单位，获得 ${n*2} 点格挡`); }""",
"""        if(G.hero==='wuseng'){ const bb=n*(u?4:3); gainBlock(bb); log(`附灵术：触发 ${n} 个召唤单位，获得 ${bb} 点格挡`); }"""))

# ---------- #40 镇妖铃：B 10/15 + 格挡≥10 时 +8/+11（不消耗格挡） ----------
EDITS.append((
"""      :G.hero==='wuseng'?`造成 ${u?16:10} 伤害并【镇魂】。消耗 5 点格挡，伤害 +10（消耗）`""",
"""      :G.hero==='wuseng'?`造成 ${u?15:10} 伤害并【镇魂】。若此时格挡 ≥10，伤害 +${u?11:8}。消耗牌（一次性）`"""))
EDITS.append((
"""      if(G.hero==='wuseng'){ if((G.block||0)>=5){ G.block-=5; dealDamageTo(t,(u?16:10)+10); log('镇妖铃：消耗 5 点格挡，伤害 +10'); } else dealDamageTo(t,u?16:10); sealEnemy(t,1); return; }""",
"""      if(G.hero==='wuseng'){ sealEnemy(t,1); let d=u?15:10; if((G.block||0)>=10){ d+=(u?11:8); log(`镇妖铃：格挡 ≥10，伤害 +${u?11:8}`); } dealDamageTo(t,d); return; }"""))
EDITS.append((
"""  zhenyaoling: u=>{ const t=curEnemy(); if(!t) return 0; const base=u?16:10;
    if(G.hero==='wuseng') return base+(((G.block||0)>=5)?10:0);   // 耗 5 格挡 → +10""",
"""  zhenyaoling: u=>{ const t=curEnemy(); if(!t) return 0; const base=u?15:10;
    if(G.hero==='wuseng') return base+(((G.block||0)>=10)?(u?11:8):0); // 格挡 ≥10 → +8/+11"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v58_block8e_skill DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
