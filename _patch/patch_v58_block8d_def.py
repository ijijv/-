# -*- coding: utf-8 -*-
# v0.58 Block8d：武僧 B 列 · 防御牌 15~23 按《武僧版卡池.md》重做
#   15 金刚符 6/9 ｜ 17 金光罩 14/19 ｜ 18 金钟罩 12/17（A/C/D 按其文档同步拆列）
#   19 荆棘符 4/7（反弹 4/5 已对） ｜ 20 佛渡 升级 +4 格挡（C 仍 +3）
#   21 铜皮铁骨 10/15（反弹 6/8 已对） ｜ 22 反震 1/0(U:0) 反弹 4/5（去掉「下回合 +格挡」）
#   23 卸甲生元 5/8 ｜ 16 隐身符 4/6 已与文档一致，不动
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# ---------- #15 金刚符：B 6 → 9 ----------
EDITS.append((
"""      :G.hero==='wuseng'?`获得 ${u?8:6} 点格挡`
      :G.hero==='yincha'?`获得 ${u?9:7} 点格挡。失去 2 点生命`""",
"""      :G.hero==='wuseng'?`获得 ${u?9:6} 点格挡`
      :G.hero==='yincha'?`获得 ${u?9:7} 点格挡。失去 2 点生命`"""))
EDITS.append((
"""      else if(G.hero==='wuseng'){ b=u?8:6; }""",
"""      else if(G.hero==='wuseng'){ b=u?9:6; }"""))

# ---------- #17 金光罩：B 18 → 19 ----------
EDITS.append((
"""      :G.hero==='wuseng'?`获得 ${u?18:14} 点格挡`""",
"""      :G.hero==='wuseng'?`获得 ${u?19:14} 点格挡`"""))
EDITS.append((
"""      else if(G.hero==='wuseng'){ gainBlock(u?18:14); }""",
"""      else if(G.hero==='wuseng'){ gainBlock(u?19:14); }"""))

# ---------- #18 金钟罩：拆列（A 10/16 ｜ B 12/17 ｜ C 10/15 ｜ D 12/17） ----------
EDITS.append((
"""  {id:'jinzhong', name:'金钟罩', type:'defense', rarity:'purple', cost:2,
    t:(u)=>`获得 ${u?16:10} 点格挡。清除自身所有负面状态与手牌中的状态牌`,
    eff:(u)=>{ gainBlock(u?16:10); clearJunk(); clearPlayerDebuffs(); floatMsg('负面状态已清除'); }},""",
"""  {id:'jinzhong', name:'金钟罩', type:'defense', rarity:'purple', cost:2,
    t:(u)=>`获得 ${G.hero==='ganshiren'?(u?16:10):G.hero==='yincha'?(u?15:10):(u?17:12)} 点格挡。清除自身所有负面状态与手牌中的状态牌`,
    eff:(u)=>{ gainBlock(G.hero==='ganshiren'?(u?16:10):G.hero==='yincha'?(u?15:10):(u?17:12)); clearJunk(); clearPlayerDebuffs(); floatMsg('负面状态已清除'); }},"""))

# ---------- #19 荆棘符：B 格挡 6 → 7 ----------
EDITS.append((
"""      :G.hero==='wuseng'?`获得 ${u?6:4} 点格挡。本回合每受 1 次攻击，反弹 ${u?5:4} 点伤害`""",
"""      :G.hero==='wuseng'?`获得 ${u?7:4} 点格挡。本回合每受 1 次攻击，反弹 ${u?5:4} 点伤害`"""))
EDITS.append((
"""    eff:(u)=>{ const b=G.hero==='ganshiren'?(u?6:3):(G.hero==='wuseng'?(u?6:4):(u?5:3)); gainBlock(b);""",
"""    eff:(u)=>{ const b=G.hero==='ganshiren'?(u?6:3):(G.hero==='wuseng'?(u?7:4):(u?5:3)); gainBlock(b);"""))

# ---------- #20 佛渡：B/D 升级 +4 格挡（C 仍 +3） ----------
EDITS.append((
"""      :`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，额外获得 3 点格挡':''}`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ clearJunk(); clearPlayerDebuffs(); G.debuffImmune=1; floatMsg('本回合免疫负面效果'); if(u){ gainShiqi(2); log(`佛渡：升级后获得 2 点【尸气】`); } return; }
      clearJunk(); clearPlayerDebuffs(); G.debuffImmune=1; floatMsg('本回合免疫负面效果'); if(u) gainBlock(3); }},""",
"""      :G.hero==='yincha'?`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，额外获得 3 点格挡':''}`
      :`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，额外获得 4 点格挡':''}`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ clearJunk(); clearPlayerDebuffs(); G.debuffImmune=1; floatMsg('本回合免疫负面效果'); if(u){ gainShiqi(2); log(`佛渡：升级后获得 2 点【尸气】`); } return; }
      const fb=(G.hero==='yincha')?3:4;
      clearJunk(); clearPlayerDebuffs(); G.debuffImmune=1; floatMsg('本回合免疫负面效果'); if(u){ gainBlock(fb); log(`佛渡：升级后获得 ${fb} 点格挡`); } }},"""))

# ---------- #21 铜皮铁骨：B 格挡 12 → 10 ----------
EDITS.append((
"""      :G.hero==='wuseng'?`获得 ${u?15:12} 点格挡。反弹 ${u?8:6} 点伤害`""",
"""      :G.hero==='wuseng'?`获得 ${u?15:10} 点格挡。反弹 ${u?8:6} 点伤害`"""))
EDITS.append((
"""      else if(G.hero==='wuseng'){ gainBlock(u?15:12); G.thorns+=u?8:6; }""",
"""      else if(G.hero==='wuseng'){ gainBlock(u?15:10); G.thorns+=u?8:6; }"""))

# ---------- #22 反震：B 改 1/0(U:0) + 只反弹 4/5 ----------
EDITS.append((
"""  {id:'fanzhen', name:'反震', type:'defense', rarity:'blue', cost:1,""",
"""  {id:'fanzhen', name:'反震', type:'defense', rarity:'blue', cost:1, costU:{wuseng:0},"""))
EDITS.append((
"""      :G.hero==='wuseng'?`反弹 ${u?5:4} 点伤害。下回合开始获得 ${u?3:2} 点格挡`""",
"""      :G.hero==='wuseng'?`本回合每受 1 次攻击，对攻击者造成 ${u?5:4} 点伤害`"""))
EDITS.append((
"""      else if(G.hero==='wuseng'){ G.thorns+=u?5:4; G.nextBlock+=u?3:2; }""",
"""      else if(G.hero==='wuseng'){ G.thorns+=u?5:4; } // B 文档：只反弹，不再给「下回合格挡」"""))

# ---------- #23 卸甲生元：B 格挡 6 → 5 ----------
EDITS.append((
"""      :G.hero==='wuseng'?`获得 ${u?8:6} 点格挡。使【卸甲】持续 ${u?3:2} 回合：期间格挡不清零，到期后剩余格挡转为生命`""",
"""      :G.hero==='wuseng'?`获得 ${u?8:5} 点格挡。使【卸甲】持续 ${u?3:2} 回合：期间格挡不清零，到期后剩余格挡转为生命`"""))
EDITS.append((
"""      else if(G.hero==='wuseng'){ gainBlock(u?8:6); G.xiejia=u?3:2; floatMsg('【卸甲】已启动，格挡不再清零'); }""",
"""      else if(G.hero==='wuseng'){ gainBlock(u?8:5); G.xiejia=u?3:2; floatMsg('【卸甲】已启动，格挡不再清零'); }"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v58_block8d_def DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
