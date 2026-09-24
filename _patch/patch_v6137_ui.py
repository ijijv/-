# -*- coding: utf-8 -*-
"""v0.61.37 · 顶栏「预尸气」小标 + CSS + 三处版本号（v0.61.36 → v0.61.37）。"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EDITS = []


def ed(path, old, new, label, n=1):
    EDITS.append((path, old, new, n, label))


B = 'js/60_boot.js'
H = '原型.html'

# ── 顶栏：预尸气小标（紧挨「尸气: N/12」右侧；0 就不渲染，与预格挡同口径）──
ed(B,
   "  // 如果当前角色是茅山赶尸人，显示尸气\n"
   "  if(G.hero === 'ganshiren') {\n"
   "    html += `<span class=\"stat stat-shiqi\">尸气: <b>${G.尸气}/${G.maxShiQi}</b></span>`;\n"
   "  }",
   "  // 预尸气：下一回合召唤物将带来的【尸气】进账（仅茅山赶尸人；0 就不显示）\n"
   "  const preShiqi=preShiqiNextTurn();\n"
   "  // 如果当前角色是茅山赶尸人，显示尸气\n"
   "  if(G.hero === 'ganshiren') {\n"
   "    html += `<span class=\"stat stat-shiqi\">尸气: <b>${G.尸气}/${G.maxShiQi}</b>${preShiqi>0?`<span class=\"stat-preshiqi\" data-tip=\"kw:预尸气\">预+${preShiqi}</span>`:''}</span>`;\n"
   "  }",
   '顶栏 预尸气小标')

# ── 版本号 ──
ed(B, '<h2>志 怪 塔 · v0.61.36</h2>', '<h2>志 怪 塔 · v0.61.37</h2>', '60_boot 版本号')
ed(H, '<title>志怪塔 · 原型 v0.61.36</title>', '<title>志怪塔 · 原型 v0.61.37</title>', 'title 版本号')
ed(H, '<small>· 玩法原型 v0.61.36</small>', '<small>· 玩法原型 v0.61.37</small>', 'h1 版本号')

# ── CSS：尸气数字紫色 + 预尸气小标 ──
ed(H,
   "  .stat-xuenu b{color:var(--red);}",
   "  .stat-xuenu b{color:var(--red);}\n"
   "  /* v0.61.37：赶尸人尸气数字走紫色（原先吃通用金色 .stat b，与阴差有专属色不对称） */\n"
   "  .stat-shiqi b{color:#b98bff;}\n"
   "  /* 预尸气：紧挨「尸气: N/12」的紫色小标 —— 下回合召唤物将带来的尸气进账。0 时不渲染（同预格挡口径） */\n"
   "  .stat-preshiqi{display:inline-block; margin-left:4px; font-size:12px; font-weight:bold; color:#b98bff; border-bottom:1px dashed rgba(185,139,255,.55); cursor:help;}",
   'CSS 尸气紫色 + 预尸气小标')

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