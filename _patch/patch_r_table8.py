# -*- coding: utf-8 -*-
# 设计表 #8 噬魂术 D 列同步 v0.55：7/9 + 「消耗」 → 5/6，且不再是消耗牌
import io, sys

T = r"C:\Users\HP\Desktop\新建文件夹\卡牌特性整合表.md"

try:
    s = io.open(T, 'r', encoding='utf-8').read()
except Exception as e:
    print('READ FAIL: %s' % e); sys.exit(1)

EDITS = [
    ("| 消耗目标全部【诅咒】，每层造成 7/9 伤害。消耗 |",
     "| 消耗目标全部【诅咒】，每层造成 5/6 伤害 |"),
]

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

try:
    io.open(T, 'w', encoding='utf-8', newline='').write(s)
except PermissionError as e:
    print('WRITE LOCKED（编辑器仍占用该文件）: %s' % e); sys.exit(2)

print('PATCH r_table8 DONE: #8 噬魂术 D 列 → 5/6 且非消耗牌')
print('复核 D 列: %s' % [l for l in s.splitlines() if l.startswith('| 8 |')][0][-40:])
