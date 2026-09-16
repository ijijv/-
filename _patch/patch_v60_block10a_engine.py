# -*- coding: utf-8 -*-
# v0.60 Block10a：引擎级改动
#   ① 【诅咒】每回合末掉 2 层（原 -1）② 关键词文本同步 ③ 赶尸人初始卡池改为新版 10 张
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# ① 诅咒自然消退 1 → 2 层/回合
EDITS.append((
"""  aliveEnemies().forEach(e=>{ if(e.curse>0) e.curse--; });""",
"""  aliveEnemies().forEach(e=>{ if(e.curse>0) e.curse=Math.max(0,e.curse-2); }); // v0.60：诅咒每回合末掉 2 层"""))

# ② 关键词【诅咒】同步掉层速度
EDITS.append((
"""  ['诅咒','叠加在敌人身上的资源标记（上限 6 层，每回合末 -1）。本身不增伤，而是被「斩妖剑」「噬魂术」等引爆换取伤害。'],""",
"""  ['诅咒','叠加在敌人身上的资源标记（上限 6 层，每回合末 -2）。本身不增伤，而是被「斩妖剑」「噬魂术」等引爆换取伤害。'],"""))

# ③ 赶尸人初始卡池：雷符×3 金刚符×1 佛渡×1 聚灵×1 渡魂归己×1 咒印×1 画皮×1 守一×1（共 10 张）
EDITS.append((
"""   deck:[['leifu',2],['jingang',2],['fodu',1],['sheshen',1],['xueqi',1],['zhiren',1],['shi_wang',1],['shouyi',1],['xiaogui',1]]},  // v0.57 赶尸人初始卡池：雷符×2 金刚符×2 佛渡×1 舍身×1 血契×1 纸人×1 尸王×1 守一×1 小鬼×1""",
"""   deck:[['leifu',3],['jingang',1],['fodu',1],['juling',1],['duhunguiji',1],['zhouyin',1],['huapi',1],['shouyi',1]]},  // v0.60 赶尸人初始卡池：雷符×3 金刚符×1 佛渡×1 聚灵×1 渡魂归己×1 咒印×1 画皮×1 守一×1（共 10 张）"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v510_block10a_engine DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
