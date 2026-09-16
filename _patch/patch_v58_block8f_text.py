# -*- coding: utf-8 -*-
# v0.58 Block8f：燃魂 回血文案与实际数值对齐（B 2/3、D 2/3 —— 升级分支已改，文案须同步）
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# B 列：恢复 2 → 2/3
EDITS.append((
"""      :G.hero==='wuseng'?`失去 ${u?4:6} 点生命。抽 3 张牌。本回合每打出 1 张防御牌，恢复 2 点生命`""",
"""      :G.hero==='wuseng'?`失去 ${u?4:6} 点生命。抽 3 张牌。本回合每打出 1 张防御牌，恢复 ${u?3:2} 点生命`"""))

# D 列（天师）：恢复 2 → 2/3
EDITS.append((
"""      :`失去 ${u?4:6} 点生命。抽 3 张牌。本回合每打出 1 张攻击牌，恢复 2 点生命`,""",
"""      :`失去 ${u?4:6} 点生命。抽 3 张牌。本回合每打出 1 张攻击牌，恢复 ${u?3:2} 点生命`,"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v58_block8f_text DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
