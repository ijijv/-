# -*- coding: utf-8 -*-
# v0.60 Block10c：天师 D 列 · 防御牌 15~23 对齐《天师版卡池.md》
#   金刚符 每层+1 → 每层 +1/+2 / 隐身符 5→6 且诅咒牌 +2 → +3/+4 / 金光罩 14/10→17/12
#   荆棘符·铜皮铁骨 文案统一「每受到 1 次攻击」/ 铜皮 11→12 / 反震 改为反击 3 伤（不再给格挡）
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# —— #15 金刚符：每施加 1 层诅咒额外 +1/+2（上限 +6） ——
EDITS.append((
"""      :`获得 ${u?6:4} 点格挡。本回合每施加过 1 层【诅咒】，额外获得 1 点格挡（上限 +6）`,""",
"""      :`获得 ${u?6:4} 点格挡。本回合每施加 1 层【诅咒】额外 +${u?2:1} 格挡（上限 +6）`,"""))
EDITS.append((
"""      else { b=(u?6:4)+Math.min(6,CURSE_THIS_TURN||0); }""",
"""      else { b=(u?6:4)+Math.min(6,(u?2:1)*(CURSE_THIS_TURN||0)); }"""))

# —— #16 隐身符：3/6 格挡，抽到诅咒牌再 +3/+4 ——
EDITS.append((
"""      :`获得 ${u?5:3} 点格挡，抽 1 张牌。若抽到【诅咒牌】，额外获得 2 点格挡`,""",
"""      :`获得 ${u?6:3} 点格挡，抽 1 张牌。若抽到【诅咒牌】，再获得 ${u?4:3} 点格挡`,"""))
EDITS.append((
"""    eff:(u)=>{ const b=G.hero==='ganshiren'?(u?6:3):(G.hero==='wuseng'?(u?6:4):(u?5:3));""",
"""    eff:(u)=>{ const b=G.hero==='ganshiren'?(u?6:3):(G.hero==='wuseng'?(u?6:4):(G.hero==='yincha'?(u?5:3):(u?6:3)));"""))
EDITS.append((
"""      else if(G.hero==='tianshi'){ const hit=G.lastDrawnCards&&G.lastDrawnCards.find(x=>isCanCurse(x)); if(hit){ gainBlock(2); log('隐身诀：抽到【诅咒牌】，额外获得 2 点格挡'); } } }},""",
"""      else if(G.hero==='tianshi'){ const hit=G.lastDrawnCards&&G.lastDrawnCards.find(x=>isCanCurse(x)); if(hit){ const b2=u?4:3; gainBlock(b2); log(`隐身诀：抽到【诅咒牌】，额外获得 ${b2} 点格挡`); } } }},"""))

# —— #17 金光罩：12/17 格挡 ——
EDITS.append((
"""      :`获得 ${u?14:10} 点格挡。本回合每施加过 1 层【诅咒】，额外获得 1 点格挡`,""",
"""      :`获得 ${u?17:12} 点格挡。本回合每施加 1 层【诅咒】额外 +1 格挡`,"""))
EDITS.append((
"""      else { gainBlock((u?14:10)+(CURSE_THIS_TURN||0)); } }},""",
"""      else { gainBlock((u?17:12)+(CURSE_THIS_TURN||0)); } }},"""))

# —— #19 荆棘符：文案统一 ——
EDITS.append((
"""      :`获得 ${u?5:3} 点格挡。本回合每受 1 次攻击，对攻击者施加 1 层【诅咒】`,""",
"""      :`获得 ${u?5:3} 点格挡。本回合每受到 1 次攻击，对攻击者施加 1 层【诅咒】`,"""))

# —— #21 铜皮铁骨：8/12 格挡 ——
EDITS.append((
"""      :`获得 ${u?11:8} 点格挡。本回合每受 1 次攻击，对攻击者施加 1 层【诅咒】`,""",
"""      :`获得 ${u?12:8} 点格挡。本回合每受到 1 次攻击，对攻击者施加 1 层【诅咒】`,"""))
EDITS.append((
"""      else { gainBlock(u?11:8); G.hitCurse=1; } }},""",
"""      else { gainBlock(u?12:8); G.hitCurse=1; } }},"""))

# —— #22 反震：每受击反击 3 伤并施咒（不再给格挡） ——
EDITS.append((
"""      :`本回合每受 1 次攻击，获得 ${u?2:1} 点格挡并对攻击者施加 ${u?2:1} 层【诅咒】`,""",
"""      :`本回合每受到 1 次攻击，反击 3 点伤害并对攻击者施加 ${u?2:1} 层【诅咒】`,"""))
EDITS.append((
"""      else { G.hitBlock=Math.max(G.hitBlock||0,u?2:1); G.hitCurse=Math.max(G.hitCurse||0,u?2:1); } }},""",
"""      else { G.thorns+=3; G.hitCurse=Math.max(G.hitCurse||0,u?2:1); } }},"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）\n---%s---' % (i + 1, n, old[:120])); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v60_block10c_def DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
