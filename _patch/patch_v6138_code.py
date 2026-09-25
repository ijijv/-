# -*- coding: utf-8 -*-
"""v0.61.38 · 修掉两处把「整局累积不清零」错挂在【尸气】名下的文案（那是【血怒】的规则）
+ 三处版本号 v0.61.37 → v0.61.38。"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EDITS = []


def ed(path, old, new, label, n=1):
    EDITS.append((path, old, new, n, label))


D = 'js/20_data.js'
B = 'js/60_boot.js'
H = '原型.html'

# ── ① KEYWORDS【尸气】词条：尸气是「战斗内跨回合累积、每场战斗清零」，不是整局累积 ──
ed(D,
   "  ['尸气','赶尸人专属资源：上限 12 点、整局累积。用于强化召唤（纸人/五通神）与引爆类牌（咒雨）。'],",
   "  ['尸气','赶尸人专属资源：上限 12 点，战斗内跨回合累积、每场战斗清零。用于强化召唤（纸人/五通神）与引爆类牌（咒雨）；每消耗 1 点回复 1 点生命。'],",
   '20_data KEYWORDS 尸气词条')

# ── ② gainShiqi 的首次提示气泡：同一处错误口径 ──
ed(D,
   '上限 12 点、<b>整局累积不清零</b>。场上每有 1 个召唤物',
   '上限 12 点、<b>战斗内跨回合累积，每场战斗清零</b>。场上每有 1 个召唤物',
   '20_data tipOnce 尸气提示')

# ── ③ 版本号 ──
ed(H, '<title>志怪塔 · 原型 v0.61.37</title>', '<title>志怪塔 · 原型 v0.61.38</title>', 'title 版本号')
ed(H, '<small>· 玩法原型 v0.61.37</small>', '<small>· 玩法原型 v0.61.38</small>', 'h1 版本号')
ed(B, '<h2>志 怪 塔 · v0.61.37</h2>', '<h2>志 怪 塔 · v0.61.38</h2>', '60_boot 版本号')

raws, bodies, nls = {}, {}, {}
for p in {e[0] for e in EDITS}:
    raw = io.open(os.path.join(ROOT, p), encoding='utf-8').read()
    raws[p] = raw
    nls[p] = '\r\n' if '\r\n' in raw else '\n'
    bodies[p] = raw.replace('\r\n', '\n')

errs = []
for path, old, new, n, label in EDITS:
    c = bodies[path].count(old)
    if c != n:
        errs.append('[%s] 锚点命中 %d 次（期望 %d）：%s' % (path, c, n, label))
if errs:
    print('!! 有锚点未命中，一个字节都不写：')
    for e in errs:
        print('   ', e)
    sys.exit(1)

for path, old, new, n, label in EDITS:
    bodies[path] = bodies[path].replace(old, new, n)

for p, body in bodies.items():
    io.open(os.path.join(ROOT, p), 'w', encoding='utf-8', newline='').write(body.replace('\n', nls[p]))
    print('OK %s  (%d 处)' % (p, sum(1 for e in EDITS if e[0] == p)))
print('合计 %d 处改动' % len(EDITS))