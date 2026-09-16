# -*- coding: utf-8 -*-
# v0.59 Block9i：关键词【召唤】文案对齐阴差（回血）+ 版本号 v0.58 → v0.59（三处）
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# ① 【召唤】词条：阴差列召唤物按卡面回血，五通神按英雄给格挡/回血
EDITS.append((
"""  ['召唤','场上的友方单位，每回合末自动触发效果（纸人/小鬼/阴兵打伤害、五通神加格挡）。各牌持续时间不同，结束后消失。'],""",
"""  ['召唤','场上的友方单位，每回合末自动触发效果（纸人/小鬼/阴兵打伤害，阴差列还会按卡面为你回血；五通神按英雄给格挡或回血）。各牌持续时间不同，结束后消失。'],"""))

# ② 版本号三处
EDITS.append((
"""<title>志怪塔 · 原型 v0.58</title>""",
"""<title>志怪塔 · 原型 v0.59</title>"""))
EDITS.append((
"""  <h1 class="title">志 怪 塔 <small>· 玩法原型 v0.58</small>""",
"""  <h1 class="title">志 怪 塔 <small>· 玩法原型 v0.59</small>"""))
EDITS.append((
"""  showOverlay(`<h2>志 怪 塔 · v0.58</h2>""",
"""  showOverlay(`<h2>志 怪 塔 · v0.59</h2>"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v59_block9i_ver DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
