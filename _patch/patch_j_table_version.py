# -*- coding: utf-8 -*-
# 设计表同步（#12 嗜血 D、#33 渡魂归己）+ 版本号 v0.49 → v0.50
import io, sys

# ---- 1) 设计表同步 ----
T = r"C:\Users\HP\Desktop\新建文件夹\卡牌特性整合表.md"
t = io.open(T, 'r', encoding='utf-8').read()

# #12 嗜血 D 列：改吸血
old12 = '造成 6/8 伤害。目标每有 1 层【诅咒】，此牌伤害 +1（上限 +6）'
new12 = '造成 6/8 伤害。回复等于造成伤害的 50% 的生命'
n = t.count(old12)
if n != 1:
    print('TBL #12 FAIL: 匹配 %d 次（期望 1）' % n); sys.exit(1)
t = t.replace(old12, new12)

# #33 渡魂归己：整行改「消耗。接下来 5 回合」
old33 = '| 33 | 渡魂归己 | 1 | 对敌人造成伤害的 30%/50% 转化为生命 | 对敌人造成伤害的 30%/50% 转化为生命 | 对敌人造成伤害的 30%/50% 转化为生命 | 对敌人造成伤害的 30%/50% 转化为生命 |'
new33 = '| 33 | 渡魂归己 | 1 | 消耗。接下来 5 回合，对敌人造成伤害的 30%/50% 转化为生命 | 消耗。接下来 5 回合，对敌人造成伤害的 30%/50% 转化为生命 | 消耗。接下来 5 回合，对敌人造成伤害的 30%/50% 转化为生命 | 消耗。接下来 5 回合，对敌人造成伤害的 30%/50% 转化为生命 |'
n = t.count(old33)
if n != 1:
    print('TBL #33 FAIL: 匹配 %d 次（期望 1）' % n); sys.exit(1)
t = t.replace(old33, new33)

io.open(T, 'w', encoding='utf-8', newline='').write(t)
print('PATCH j_table DONE: 设计表 #12/#33 同步')

# ---- 2) 版本号 v0.49 → v0.50 ----
P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
n = s.count('0.49')
if n != 3:
    print('VER FAIL: 0.49 匹配 %d 次（期望 3）' % n); sys.exit(1)
s = s.replace('0.49', '0.50')
io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH j_version DONE: v0.49 → v0.50（%d 处）' % n)
