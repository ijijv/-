# -*- coding: utf-8 -*-
# ② 「可施加诅咒的牌」→「诅咒牌」+ KEYWORDS 词条；③ 顶栏去掉金卡补偿、详情默认展开
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# ②a 可见文案 5 处整体更名
n = s.count('【可施加诅咒的牌】')
if n != 5:
    print('TERM FAIL: 【可施加诅咒的牌】匹配 %d 次（期望 5）' % n); sys.exit(1)
s = s.replace('【可施加诅咒的牌】', '【诅咒牌】')
print('  · 诅咒牌更名 5 处')

# ②b KEYWORDS 新增【诅咒牌】词条（悬停原解释）
EDITS.append((
"""  ['诅咒','叠加在敌人身上的负面标记（上限 6 层），每回合末自动减少 1 层。诅咒本身不再提升敌人受到的伤害，而是作为层数资源被联动：「斩妖剑」「噬魂术」吞噬引爆换取伤害，「剑符」「天雷正法」等消耗层数强化。'],""",
"""  ['诅咒','叠加在敌人身上的负面标记（上限 6 层），每回合末自动减少 1 层。诅咒本身不再提升敌人受到的伤害，而是作为层数资源被联动：「斩妖剑」「噬魂术」吞噬引爆换取伤害，「剑符」「天雷正法」等消耗层数强化。'],
  ['诅咒牌','即“可施加诅咒的牌”的简称（8 张，无条件主效果）：火符、万剑归宗、桃木符、蚀魂咒、舍身、焚符、咒印、咒雨。条件 / 延时派（荆棘符、铜皮铁骨、反震、移形换影、附灵术、五通神、洗髓经、卸甲生元）不算。供天师列“抽到 / 保留到【诅咒牌】”类触发判定。'],"""))

# ③a 顶栏移除金卡补偿读数
EDITS.append((
"""\n    <span class="stat stat-compensation">金卡补偿: <b>${(goldCompensation * 100).toFixed(2)}%</b></span>""",
"""\n"""))

# ③b 详情默认展开（保留“收起”切换）
EDITS.append((
"""let TOPBAR_OPEN = false;""",
"""let TOPBAR_OPEN = true; // 顶栏详情默认展开（buff/遗物直接可见）"""))

# ③c 折叠注释同步
EDITS.append((
"""/* —— 顶栏折叠：默认精简（生命/格挡/符文/金币），点击展开 buff/debuff 详情 —— */""",
"""/* —— 顶栏折叠：默认展开 buff/遗物详情，点击收起 —— */"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i+1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH b2_terms_topbar DONE: %d 处替换成功' % len(EDITS))

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
