# -*- coding: utf-8 -*-
# v0.57 Block4 防御批（15~23）：按《赶尸人版卡池.md》修正 A 列差异 8 张
#   金刚符 4/7格挡+1/2尸气(删每召唤+1); 隐身 3/6格挡+抽鬼怪1/2尸气; 金光 10/15+耗2尸气额外4/5
#   金钟 10/16; 荆棘 3/6格挡+反弹4/6; 佛渡 加ganshiren分支(升级获2尸气); 铜皮 9/12格挡;
#   卸甲 4/7格挡(尸气档Block2已对齐)。防御卡无 CARD_DMG 预览键，无需动预览。
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# ========== #15 金刚符 ==========
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`获得 ${u?6:4} 点格挡。场上每有 1 个召唤单位，额外获得 1 点格挡`""",
"""    t:(u)=>G.hero==='ganshiren'?`获得 ${u?7:4} 点格挡。获得 ${u?2:1} 点【尸气】`"""))
EDITS.append((
"""    eff:(u)=>{ let b;
      if(G.hero==='ganshiren'){ b=(u?6:4)+G.summons.filter(s=>s.dur>0).length; }""",
"""    eff:(u)=>{ let b;
      if(G.hero==='ganshiren'){ b=u?7:4; gainShiqi(u?2:1); }"""))

# ========== #16 隐身符 ==========
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`获得 ${u?5:3} 点格挡，抽 1 张牌。若抽到【鬼怪牌】，获得 1 点【尸气】`""",
"""    t:(u)=>G.hero==='ganshiren'?`获得 ${u?6:3} 点格挡，抽 1 张牌。若抽到【鬼怪牌】，获得 ${u?2:1} 点【尸气】`"""))
EDITS.append((
"""    eff:(u)=>{ const b=G.hero==='wuseng'?(u?6:4):(u?5:3);
      if(G.hero==='yincha'){ gainBlock(b); drawCards((G.hpLostTurn||0)>0?2:1); return; }""",
"""    eff:(u)=>{ const b=G.hero==='ganshiren'?(u?6:3):(G.hero==='wuseng'?(u?6:4):(u?5:3));
      if(G.hero==='yincha'){ gainBlock(b); drawCards((G.hpLostTurn||0)>0?2:1); return; }"""))
EDITS.append((
"""      else if(G.hero==='ganshiren'){ const hit=G.lastDrawnCards&&G.lastDrawnCards.find(x=>isGhostCard(x)); if(hit){ gainShiqi(1); log('隐身诀：抽到鬼怪牌，获得 1 点【尸气】'); } }""",
"""      else if(G.hero==='ganshiren'){ const hit=G.lastDrawnCards&&G.lastDrawnCards.find(x=>isGhostCard(x)); if(hit){ gainShiqi(u?2:1); log(`隐身诀：抽到鬼怪牌，获得 ${u?2:1} 点【尸气】`); } }"""))

# ========== #17 金光罩 ==========
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`获得 ${u?14:10} 点格挡。再消耗 2 点【尸气】额外获得 4 点格挡`""",
"""    t:(u)=>G.hero==='ganshiren'?`获得 ${u?15:10} 点格挡。再消耗 2 点【尸气】额外获得 ${u?5:4} 点格挡`"""))
EDITS.append((
"""    eff:(u)=>{ if(G.hero==='ganshiren'){ gainBlock(u?14:10); if(hasShiqi(2)){ spendShiqi(2); gainBlock(4); log('金光咒：消耗 2 点尸气，额外获得 4 点格挡'); } }""",
"""    eff:(u)=>{ if(G.hero==='ganshiren'){ gainBlock(u?15:10); if(hasShiqi(2)){ spendShiqi(2); gainBlock(u?5:4); log(`金光罩：消耗 2 点尸气，额外获得 ${u?5:4} 点格挡`); } }"""))

# ========== #18 金钟罩 ==========
EDITS.append((
"""    t:(u)=>`获得 ${u?15:10} 点格挡。清除自身所有负面状态与手牌中的状态牌`,""",
"""    t:(u)=>`获得 ${u?16:10} 点格挡。清除自身所有负面状态与手牌中的状态牌`,"""))
EDITS.append((
"""    eff:(u)=>{ gainBlock(u?15:10); clearJunk(); clearPlayerDebuffs(); floatMsg('负面状态已清除'); }},""",
"""    eff:(u)=>{ gainBlock(u?16:10); clearJunk(); clearPlayerDebuffs(); floatMsg('负面状态已清除'); }},"""))

# ========== #19 荆棘符 ==========
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`获得 ${u?5:3} 点格挡。本回合每受 1 次攻击，反弹 ${u?5:4} 点伤害`""",
"""    t:(u)=>G.hero==='ganshiren'?`获得 ${u?6:3} 点格挡。本回合每受 1 次攻击，反弹 ${u?6:4} 点伤害`"""))
EDITS.append((
"""    eff:(u)=>{ const b=G.hero==='wuseng'?(u?6:4):(u?5:3); gainBlock(b);
      if(G.hero==='wuseng'||G.hero==='ganshiren'){ G.thorns+=u?5:4; }""",
"""    eff:(u)=>{ const b=G.hero==='ganshiren'?(u?6:3):(G.hero==='wuseng'?(u?6:4):(u?5:3)); gainBlock(b);
      if(G.hero==='ganshiren'){ G.thorns+=u?6:4; }
      else if(G.hero==='wuseng'){ G.thorns+=u?5:4; }"""))

# ========== #20 佛渡（加赶尸人分支：升级获 2 尸气）==========
EDITS.append((
"""    t:(u)=>`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，额外获得 3 点格挡':''}`,""",
"""    t:(u)=>G.hero==='ganshiren'?`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，并获得 2 点【尸气】':''}`
      :`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，额外获得 3 点格挡':''}`,"""))
EDITS.append((
"""    eff:(u)=>{ clearJunk(); clearPlayerDebuffs(); G.debuffImmune=1; floatMsg('本回合免疫负面效果'); if(u) gainBlock(3); }},""",
"""    eff:(u)=>{ if(G.hero==='ganshiren'){ clearJunk(); clearPlayerDebuffs(); G.debuffImmune=1; floatMsg('本回合免疫负面效果'); if(u){ gainShiqi(2); log(`佛渡：升级后获得 2 点【尸气】`); } return; }
      clearJunk(); clearPlayerDebuffs(); G.debuffImmune=1; floatMsg('本回合免疫负面效果'); if(u) gainBlock(3); }},"""))

# ========== #21 铜皮铁骨 ==========
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`获得 ${u?11:8} 点格挡。反弹 ${u?6:4} 点伤害。每有 1 个召唤单位，额外反弹 1 点`""",
"""    t:(u)=>G.hero==='ganshiren'?`获得 ${u?12:9} 点格挡。反弹 ${u?6:4} 点伤害。每有 1 个召唤单位，额外反弹 1 点`"""))
EDITS.append((
"""    eff:(u)=>{ if(G.hero==='ganshiren'){ gainBlock(u?11:8); G.thorns+=(u?6:4)+G.summons.filter(s=>s.dur>0).length; }""",
"""    eff:(u)=>{ if(G.hero==='ganshiren'){ gainBlock(u?12:9); G.thorns+=(u?6:4)+G.summons.filter(s=>s.dur>0).length; }"""))

# ========== #23 卸甲生元（仅格挡 5/7 → 4/7；尸气档 Block2 已对齐）==========
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`获得 ${u?7:5} 点格挡。回合结束自动将剩余格挡换算为【尸气】：每保留 2 点，获得 ${u?2:1} 点（无论敌人是否攻击）`""",
"""    t:(u)=>G.hero==='ganshiren'?`获得 ${u?7:4} 点格挡。回合结束自动将剩余格挡换算为【尸气】：每保留 2 点，获得 ${u?2:1} 点（无论敌人是否攻击）`"""))
EDITS.append((
"""    eff:(u)=>{ if(G.hero==='ganshiren'){ gainBlock(u?7:5); G.endBlockKind='A'; G.xiejiaUp=!!u; floatMsg('回合结束格挡将自动转为尸气'); }""",
"""    eff:(u)=>{ if(G.hero==='ganshiren'){ gainBlock(u?7:4); G.endBlockKind='A'; G.xiejiaUp=!!u; floatMsg('回合结束格挡将自动转为尸气'); }"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v57_block4_defense DONE: 原型 %d 处' % len(EDITS))

mm = re.search(r'<script>([\s\S]*?)</script>', s)
js = mm.group(1)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, js.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK (%d chars)' % len(js))
