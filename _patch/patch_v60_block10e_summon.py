# -*- coding: utf-8 -*-
# v0.60 Block10e：天师 D 列 · 召唤牌 41~48 对齐《天师版卡池.md》
#   纸人 基础 2/3，目标带诅咒再 +2/+3（原为「每层 +1」+ 基础值错写成 4/2）
#   五通神 立即格挡 3 → 4
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# —— #41 纸人（天师）：基础 2/3；目标带诅咒改为固定 +2/+3 ——
EDITS.append((
"""      :`召唤纸人。每回合末对随机敌人造成 ${u?2:1} 伤害；该敌人每有 1 层【诅咒】，伤害 +1（持续 2 回合）`,""",
"""      :`召唤纸人。每回合末对随机敌人造成 ${u?3:2} 伤害；若该敌人带【诅咒】，伤害 +${u?3:2}（持续 2 回合）`,"""))
EDITS.append((
"""    eff:(u)=>{ let v = G.hero==='wuseng' ? (u?3:2) : (u?4:2); let hv=0;""",
"""    eff:(u)=>{ let v = G.hero==='wuseng' ? (u?3:2) : (G.hero==='tianshi' ? (u?3:2) : (u?4:2)); let hv=0;"""))
EDITS.append((
"""      const t=randomAlive();
      if(t){ dealDamageTo(t, v + (t.curse||0)); log(`纸人：因敌人 ${t.curse||0} 层诅咒，伤害 +${t.curse||0}`); }""",
"""      const t=randomAlive();
      if(t){ const zb=(t.curse||0)>0?(s.up?3:2):0; dealDamageTo(t, v + zb); if(zb>0) log(`纸人：目标带【诅咒】，伤害 +${zb}`); }"""))
EDITS.append((
"""  zhiren: u=>{ const base = G.hero==='ganshiren' ? (hasShiqi(4)?(u?7:5):(u?4:2)) : (G.hero==='wuseng'?(u?3:2):(G.hero==='yincha'?(rageLayers()>=4?(u?5:4):(u?2:1)):(u?2:1)));""",
"""  zhiren: u=>{ const base = G.hero==='ganshiren' ? (hasShiqi(4)?(u?7:5):(u?4:2)) : (G.hero==='wuseng'||G.hero==='tianshi'?(u?3:2):(G.hero==='yincha'?(rageLayers()>=4?(u?5:4):(u?2:1)):(u?2:1)));"""))

# —— #45 五通神（天师）：立即 4 点格挡 ——
EDITS.append((
"""      :`召唤五通神。立即获得 3 点格挡并对随机敌人施加 1 层【诅咒】，之后每回合开始重复一次（持续 ${u?3:2} 回合）`,""",
"""      :`召唤五通神。立即获得 4 点格挡并对随机敌人施加 1 层【诅咒】，之后每回合开始重复一次（持续 ${u?3:2} 回合）`,"""))
EDITS.append((
"""      let wv=G.hero==='wuseng'?4:3, wdur=u?3:2;""",
"""      let wv=(G.hero==='wuseng'||G.hero==='tianshi')?4:3, wdur=u?3:2;"""))

# —— 预伤害：纸人（天师）改为「目标带诅咒 +2/+3」 ——
EDITS.append((
"""  if(G.hero==='tianshi' && c.id==='zhiren') d += (e.curse||0); // 纸人（天师）：目标每层诅咒 +1""",
"""  if(G.hero==='tianshi' && c.id==='zhiren' && (e.curse||0)>0) d += (c.up?3:2); // 纸人（天师）：目标带诅咒 +2/+3"""))

# —— 召唤面板文案（天师纸人） ——
EDITS.append((
"""      :`纸人：每回合末对随机敌人造成 ${v} 点伤害 +1诅咒`)""",
"""      :`纸人：每回合末对随机敌人造成 ${v} 点伤害；目标带【诅咒】再 +${s.up?3:2}`)"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）\n---%s---' % (i + 1, n, old[:120])); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v60_block10e_summon DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
