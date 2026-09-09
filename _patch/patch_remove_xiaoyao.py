# -*- coding: utf-8 -*-
# 【小妖删去】（原型.html）——用户拍板彻底移除 xiaoyao/小妖 召唤机制。
# xiaoyao 引擎无任何创建点（yinchaSummon 已删、失去生命不喂小妖），纯残留，
# 删除行为安全。4 处：
#   ① loseHp 注释仍提"/小妖" → 只留血怒
#   ② summonAct types 白名单移除 'xiaoyao'
#   ③ summonAct 的 xiaoyao 分支整行删除（原在 yinbing 与 shi_wang 之间）
#   ④ summonHTML 三元链的 xiaoyao 展示行删除
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# ① loseHp 注释去"/小妖"
EDITS.append((
"""不再自动触发血怒/小妖""",
"""不再自动触发血怒"""))

# ② summonAct types 白名单
EDITS.append((
"""  const types=['zhiren','xiaogui','yinbing','xiaoyao','shi_wang'];""",
"""  const types=['zhiren','xiaogui','yinbing','shi_wang'];"""))

# ③ summonAct xiaoyao 分支整行删除（连接 yinbing 与 shi_wang）
EDITS.append((
"""  else if(s.type==='xiaoyao'){ const t=randomAlive(); if(t) dealDamageTo(t, v); }
  else if(s.type==='shi_wang'){""",
"""  else if(s.type==='shi_wang'){"""))

# ④ summonHTML 三元链去 xiaoyao 行（yinbing 与 shi_wang 之间）
EDITS.append((
"""    : s.type==='yinbing'?`阴兵：每回合末对随机敌人造成 ${v} 点伤害`
    : s.type==='xiaoyao'?`小妖：每回合末对随机敌人造成 ${v} 点伤害`
    : s.type==='shi_wang'?`尸王：每回合末对全体敌人造成 ${v} 点伤害`""",
"""    : s.type==='yinbing'?`阴兵：每回合末对随机敌人造成 ${v} 点伤害`
    : s.type==='shi_wang'?`尸王：每回合末对全体敌人造成 ${v} 点伤害`"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i, n))
        sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH remove_xiaoyao DONE: %d 处替换成功' % len(EDITS))

mm = re.search(r'<script>([\s\S]*?)</script>', s)
if not mm:
    print('FAIL: 找不到 <script>'); sys.exit(1)
js = mm.group(1)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, js.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK (%d chars)' % len(js))
