# -*- coding: utf-8 -*-
# v0.58 Block8j：关键词补全【尸气】【吸血】+ 咒印 B 文案挂【吸血】悬停
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

EDITS.append((
"""  ['渡魂','接下来 5 回合内，你对敌人造成的伤害按比例转化为回复生命。'],""",
"""  ['尸气','赶尸人专属资源：上限 12 点、整局累积。用于强化召唤（纸人/五通神）与引爆类牌（咒雨）。'],
  ['吸血','按实际造成的伤害等比回复生命（过量击杀只按敌人剩余血量计）。敌方也有【吸血】词缀。'],
  ['渡魂','接下来 5 回合内，你对敌人造成的伤害按比例转化为回复生命。'],"""))

EDITS.append((
"""      :G.hero==='wuseng'?`招来咒魂：本回合打出的下一张攻击牌获得 100% 吸血（按其实际伤害回复生命）。消耗牌（一次性）`""",
"""      :G.hero==='wuseng'?`招来咒魂：本回合打出的下一张攻击牌获得 100% 【吸血】（按其实际伤害回复生命）。消耗牌（一次性）`"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v58_block8j_kw DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
