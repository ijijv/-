# -*- coding: utf-8 -*-
# v0.60 Block10d：天师 D 列 · 功能牌 24~40 对齐《天师版卡池.md》
#   血契 2/3 → 1/2 / 镇妖铃 16→14 / 咒雨 固定 1 层 + 费用下限 1（升级后 0）/ 守一 文案
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# —— #26 守一：文案对齐文档 ——
EDITS.append((
"""      :`保留 ${u?2:1} 张手牌。保留的每张【诅咒牌】，下回合首次打出时诅咒额外 +1 层`,""",
"""      :`保留 ${u?2:1} 张手牌。保留的每张【诅咒牌】，下回合首次施咒额外 +1 层（仅一回合）`,"""))

# —— #28 血契：每失去 1 生命得 1/2 格挡 ——
EDITS.append((
"""      :`本回合每失去 1 点生命，获得 ${u?3:2} 点格挡`,""",
"""      :`本回合每失去 1 点生命，获得 ${u?2:1} 点格挡`,"""))
EDITS.append((
"""      G.bloodPact=(G.bloodPact||0)+(u?3:2);""",
"""      G.bloodPact=(G.bloodPact||0)+(u?2:1);"""))

# —— #40 镇妖铃：10/14 ——
EDITS.append((
"""      :`造成 ${u?16:10} 伤害并【镇魂】。若目标带【诅咒】，镇魂持续 2 回合（消耗）`,""",
"""      :`造成 ${u?14:10} 伤害并【镇魂】。若目标带【诅咒】，镇魂持续 2 回合（消耗）`,"""))
EDITS.append((
"""      sealEnemy(t, (t.curse||0)>0?2:1); dealDamageTo(t,u?16:10); }},""",
"""      sealEnemy(t, (t.curse||0)>0?2:1); dealDamageTo(t,u?14:10); }},"""))

# —— #46 咒雨：固定施加 1 层；费用 -1 下限 1（升级后 0） ——
EDITS.append((
"""      :`对所有敌人施加 ${u?2:1} 层【诅咒】。每名敌人每有 1 层【诅咒】，此牌费用 -1（最低 0）`,""",
"""      :`对所有敌人施加 1 层【诅咒】。所有敌人每有 1 层【诅咒】，此牌费用 -1（最低 ${u?0:1}）`,"""))
EDITS.append((
"""      if(G.hero==='tianshi'){ aliveEnemies().forEach(e=>applyCurse(e,u?2:1)); return; }""",
"""      if(G.hero==='tianshi'){ aliveEnemies().forEach(e=>applyCurse(e,1)); return; }"""))
EDITS.append((
"""  // 咒雨(#46) D 天师：敌人身上诅咒总层数每 1 层 -1 费（最低 0）
  if(c.id==='zhouyu' && G.hero==='tianshi'){
    cost=Math.max(0, cost - aliveEnemies().reduce((s,e)=>s+(e.curse||0), 0));
  }""",
"""  // 咒雨(#46) D 天师：敌人身上诅咒总层数每 1 层 -1 费（文档：下限 1，升级后下限 0）
  if(c.id==='zhouyu' && G.hero==='tianshi'){
    const fl=c.up?0:1;
    cost=Math.max(fl, cost - aliveEnemies().reduce((s,e)=>s+(e.curse||0), 0));
  }"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）\n---%s---' % (i + 1, n, old[:120])); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v60_block10d_skill DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
