# -*- coding: utf-8 -*-
# v0.61.01 蓄力口径落定（用户 2026-09-19 拍板）：蓄力只加在单体「攻击」意图上，
#          连击(multi)/群体(aoe)不吃加值 —— 文案与代码注释同步，并在冒烟里锁死
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# —— 关键词：说清只惠及单体攻击 ——
EDITS.append((
"""  ['蓄力','敌人本回合不攻击，但下回合的伤害会额外增加。'],""",
"""  ['蓄力','敌人本回合不攻击，下回合的单体「攻击」额外加伤。连击/群体攻击不吃这份加值。'],"""))

# —— 敌人行动：蓄力结算处补注释，锁定口径 ——
EDITS.append((
"""      case 'charge': e.pendingDamage=(e.pendingDamage||0)+e.intent.v; log(`${e.name} 蓄力（下回合伤害 +${e.intent.v}）`); break;""",
"""      // v0.61.01：蓄力只被单体 attack 消费（见 case 'attack'），连击 multi / 群体 aoe 不叠加 —— 用户拍板口径
      case 'charge': e.pendingDamage=(e.pendingDamage||0)+e.intent.v; log(`${e.name} 蓄力（下回合单体攻击 +${e.intent.v}）`); break;"""))

# —— 意图预览 ——
EDITS.append((
"""    case 'charge': return `⏳ 蓄力（下回合 +${e.intent.v} 伤害）`;""",
"""    case 'charge': return `⏳ 蓄力（下回合单体攻击 +${e.intent.v}）`;"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）\n---%s---' % (i + 1, n, old[:120])); sys.exit(1)
    s = s.replace(old, new)

# 版本号 v0.61 → v0.61.01（三处）
for old, new in (("<title>志怪塔 · 原型 v0.61</title>", "<title>志怪塔 · 原型 v0.61.01</title>"),
                 ("<small>· 玩法原型 v0.61</small>", "<small>· 玩法原型 v0.61.01</small>"),
                 ("<h2>志 怪 塔 · v0.61</h2>", "<h2>志 怪 塔 · v0.61.01</h2>")):
    if s.count(old) != 1:
        print('VERSION FAIL: %s → %d 次' % (old, s.count(old))); sys.exit(1)
    s = s.replace(old, new)

mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
if r.returncode != 0:
    os.unlink(tmpp); print('NODE_FAIL（未落盘）:'); print(r.stderr); sys.exit(1)
os.unlink(tmpp)
io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v61_01_charge DONE: %d 处 + 版本号' % len(EDITS))
print('NODE_OK')
