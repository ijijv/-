# -*- coding: utf-8 -*-
# v0.57 Block4 功能批（24~40）：按《赶尸人版卡池.md》修正 A 列差异
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# ========== #24 聚灵 ==========
# t: 抽 ${u?2:1} 张牌。若抽到【鬼怪牌】，获得 ${u?2:1} 点【尸气】
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`抽 ${u?2:1} 张牌。若抽到【鬼怪牌】，获得 1 点【尸气】`""",
"""    t:(u)=>G.hero==='ganshiren'?`抽 ${u?2:1} 张牌。若抽到【鬼怪牌】，获得 ${u?2:1} 点【尸气】`"""))
# eff: need to adjust gainShiqi to use u
EDITS.append((
"""      if(G.hero==='ganshiren'){ if(drew.some(x=>isGhostCard(x))){ gainShiqi(1); log('聚灵：抽到鬼怪牌，获得 1 点【尸气】'); } }""",
"""      if(G.hero==='ganshiren'){ if(drew.some(x=>isGhostCard(x))){ gainShiqi(u?2:1); log(`聚灵：抽到鬼怪牌，获得 ${u?2:1} 点【尸气】`); } }"""))

# ========== #25 舍身 ==========
# t: 失去 4 点生命。抽 ${u?2:1} 张牌。获得 ${u?2:1} 点【尸气】
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`失去 4 点生命。抽 ${u?2:1} 张牌。获得 1 点【尸气】`""",
"""    t:(u)=>G.hero==='ganshiren'?`失去 4 点生命。抽 ${u?2:1} 张牌。获得 ${u?2:1} 点【尸气】`"""))
# eff: adjust gainShiqi
EDITS.append((
"""      if(G.hero==='ganshiren'){ gainShiqi(1); log('舍身：获得 1 点【尸气】'); }""",
"""      if(G.hero==='ganshiren'){ gainShiqi(u?2:1); log(`舍身：获得 ${u?2:1} 点【尸气】`); }"""))

# ========== #26 守一 ==========
# t: 保留 ${u?2:1} 张手牌。每保留 1 张【鬼怪牌】，获得 1 点【尸气】 (no change needed)
# eff: no t change, but ensure eff matches? eff currently: G.retain+=(u?2:1); floatMsg(...)
# That's fine.

# ========== #27 易物 ==========
# t: no change
# eff: no t change.

# ========== #28 血契 ==========
# t: 本回合每失去 1 点生命，获得 ${u?3:2} 点格挡
EDITS.append((
"""    t:(u)=>`本回合每失去 1 点生命，获得 ${u?2:1} 点格挡`""",
"""    t:(u)=>`本回合每失去 1 点生命，获得 ${u?3:2} 点格挡`"""))
# eff: adjust G.bloodPact increment
EDITS.append((
"""    eff:(u)=>{ G.bloodPact=(G.bloodPact||0)+(u?2:1); floatMsg('血契：以血换盾'); log(`血契：本回合每失去 1 点生命，获得 ${G.bloodPact} 点格挡`); }},""",
"""    eff:(u)=>{ G.bloodPact=(G.bloodPact||0)+(u?3:2); floatMsg('血契：以血换盾'); log(`血契：本回合每失去 1 点生命，获得 ${G.bloodPact} 点格挡`); }},"""))

# ========== #29 通灵 ==========
# t: 抽 2 张牌${u?'（0 符文）':''} (keep as is, no functional change)
# eff: drawCards(2); (no change)

# ========== #30 静心诀 ==========
# t: 下回合获得 1 点符文${u?'（0 符文）':''} (keep as is)
# eff: G.pendingEnergy+=1; floatMsg(...); (no change)

# ========== #31 燃血术 ==========
# t: 失去 4 点生命。获得 2 点符文 (no change)
# eff: loseHp(4); G.energy+=2; floatMsg(...); (no change)

# ========== #32 洗髓经 ==========
# t: 已正确
# eff: G.xisuiTurns=u?4:3; floatMsg(...); (no change)

# ========== #33 渡魂归己 ==========
# t: 已正确
# eff: G.duhun={turns:5, ratio:u?0.5:0.3}; ... (no change)

# ========== #34 焚符 ==========
# t: 已正确
# eff: startDiscardSelect(G.hand.length, c); (no change)

# ========== #35 血祭 ==========
# t: 失去 3 点生命。本回合每召唤 1 个单位，下回合多摸 1 张牌（上限 3张）${u?'（0 符文）':''}
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`失去 3 点生命。本回合每召唤 1 个单位，下回合多摸 1 张牌（上限 +4）${u?'（0 符文）':''}`""",
"""    t:(u)=>G.hero==='ganshiren'?`失去 3 点生命。本回合每召唤 1 个单位，下回合多摸 1 张牌（上限 3张）${u?'（0 符文）':''}`"""))
# Note: we changed 上限 +4 to 上限 3张. The eff line does not involve the limit; it just sets G.xuejiArmed=true.
# No eff change needed.

# ========== #36 燃魂 ==========
# t: 失去 ${u?4:6} 点生命。抽 2 张牌。本回合每打出 1 张【鬼怪牌】，恢复 ${u?4:2} 点生命。获得 1 点符文
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`失去 ${u?4:6} 点生命。抽 3 张牌。本回合每打出 1 张【鬼怪牌】，恢复 2 点生命`""",
"""    t:(u)=>G.hero==='ganshiren'?`失去 ${u?4:6} 点生命。抽 2 张牌。本回合每打出 1 张【鬼怪牌】，恢复 ${u?4:2} 点生命。获得 1 点符文`"""))
# eff: need to adjust drawCards to 2, add G.energy+=1, adjust loseHp to use u?4:6 (already), adjust log message.
EDITS.append((
"""    eff:(u,c)=>{ loseHp(G.hero==='yincha'?(u?5:7):(u?4:6)); drawCards(3);
      G.ranhunType = G.hero==='ganshiren'?'ghost' : G.hero==='wuseng'?'defense' : G.hero==='yincha'?'skill' : 'attack';
      G.ranhunSelf=c; floatMsg('燃魂 · 已点燃'); }""",
"""    eff:(u,c)=>{ loseHp(G.hero==='yincha'?(u?5:7):(u?4:6)); drawCards(2); G.energy+=1;
      G.ranhunType = G.hero==='ganshiren'?'ghost' : G.hero==='wuseng'?'defense' : G.hero==='yincha'?'skill' : 'attack';
      G.ranhunSelf=c; floatMsg('燃魂 · 已点燃'); }"""))

# ========== #37 开天眼 ==========
# t: 已正确
# eff: no t change, but eff uses val calculation; should be fine.

# ========== #38 移形换影 ==========
# t: 闪避下一次攻击。闪避成功后，获得 2 点【尸气】
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`闪避下一次攻击。闪避成功后，获得 1 点【尸气】${u?'（0 符文）':''}`""",
"""    t:(u)=>G.hero==='ganshiren'?`闪避下一次攻击。闪避成功后，获得 2 点【尸气】`"""))
# eff: need to adjust G.dodgeShiqi from 1 to 2
EDITS.append((
"""      if(G.hero==='ganshiren'){ G.dodgeShiqi=1; }""",
"""      if(G.hero==='ganshiren'){ G.dodgeShiqi=2; }"""))

# ========== #39 附灵术 ==========
# t: 立即触发所有召唤单位。 (no change)
# eff: no t change.

# ========== #40 镇妖铃 ==========
# t: 造成 ${u?16:10} 伤害并【镇魂】。获得 3 点【尸气】。消耗牌（一次性）
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`造成 ${u?16:10} 伤害并【镇魂】。若目标此前已被【镇魂】，获得 3 点【尸气】（消耗）`""",
"""    t:(u)=>G.hero==='ganshiren'?`造成 ${u?16:10} 伤害并【镇魂】。获得 3 点【尸气】。消耗牌（一次性）`"""))
# eff: need to simplify the ganshiren branch to just seal and deal damage and gainShiqi(3) without condition.
# Also remove the "(消耗)" note from t, but eff should reflect gainShiqi(3) unconditionally.
# Let's replace the entire ganshiren branch in eff.
# We'll need to replace a larger chunk. Let's capture from line 1084 to 1088.
# We'll do a multi-line edit.
EDITS.append((
"""    eff:(u)=>{ const t=curEnemy(); if(!t) return;
      if(G.hero==='ganshiren'){ const was=wasSealedBefore(t); sealEnemy(t,1); dealDamageTo(t,u?16:10); if(was){ gainShiqi(3); log('镇妖铃：目标曾被镇魂，获得 3 点【尸气】'); } return; }
      if(G.hero==='wuseng'){ if((G.block||0)>=5){ G.block-=5; dealDamageTo(t,(u?16:10)+10); log('镇妖铃：消耗 5 点格挡，伤害 +10'); } else dealDamageTo(t,u?16:10); sealEnemy(t,1); return; }
      if(G.hero==='yincha'){ loseHp(3); sealEnemy(t,1); dealDamageTo(t,(u?16:10)+2*rageSpend(2,20)); return; }
      sealEnemy(t, (t.curse||0)>0?2:1); dealDamageTo(t,u?16:10); }""",
"""    eff:(u)=>{ const t=curEnemy(); if(!t) return;
      if(G.hero==='ganshiren'){ sealEnemy(t,1); dealDamageTo(t,u?16:10); gainShiqi(3); log('镇妖铃：造成 ${u?16:10} 伤害并获得 3 点【尸气】'); return; }
      if(G.hero==='wuseng'){ if((G.block||0)>=5){ G.block-=5; dealDamageTo(t,(u?16:10)+10); log('镇妖铃：消耗 5 点格挡，伤害 +10'); } else dealDamageTo(t,u?16:10); sealEnemy(t,1); return; }
      if(G.hero==='yincha'){ loseHp(3); sealEnemy(t,1); dealDamageTo(t,(u?16:10)+2*rageSpend(2,20)); return; }
      sealEnemy(t, (t.curse||0)>0?2:1); dealDamageTo(t,u?16:10); }"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v57_block4_func DONE: 原型 %d 处' % len(EDITS))

mm = re.search(r'<script>([\s\S]*?)</script>', s)
js = mm.group(1)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, js.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK (%d chars)' % len(js))