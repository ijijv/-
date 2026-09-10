# -*- coding: utf-8 -*-
# 设计表 #8 噬魂术 B 列（武僧）同步 v0.56：5/7 → 5/6
import io, sys

T = r"C:\Users\HP\Desktop\新建文件夹\卡牌特性整合表.md"
s = io.open(T, 'r', encoding='utf-8').read()

old = "消耗目标全部【诅咒】。每层诅咒引爆造成5/7点伤害，若本回合获得过7点以上格挡，额外造成 5/7点伤害"
new = "消耗目标全部【诅咒】。每层诅咒引爆造成5/6点伤害，若本回合获得过7点以上格挡，额外造成 5/6点伤害"

n = s.count(old)
if n != 1:
    print('EDIT FAIL: 匹配 %d 次（期望 1）' % n); sys.exit(1)
s = s.replace(old, new)

io.open(T, 'w', encoding='utf-8', newline='').write(s)
row = [l for l in s.splitlines() if l.startswith('| 8 |')][0]
print('PATCH t_table8b DONE')
print('复核 #8 武僧列: %s' % row.split('|')[5].strip())
print('复核 #8 天师列: %s' % row.split('|')[7].strip())
