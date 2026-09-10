# -*- coding: utf-8 -*-
# 设计表同步（带重试，抗 OneDrive/杀软瞬时占用）：#12 嗜血 / #33 渡魂归己 / #45 五通神
import io, sys, time

T = r"C:\Users\HP\Desktop\新建文件夹\卡牌特性整合表.md"

ROWS = [
    ('#12 嗜血',
     '造成 6/8 伤害。目标每有 1 层【诅咒】，此牌伤害 +1（上限 +6）',
     '造成 6/8 伤害。回复等于造成伤害的 50% 的生命'),

    ('#33 渡魂归己',
     '| 33 | 渡魂归己 | 1 | 对敌人造成伤害的 30%/50% 转化为生命 | 对敌人造成伤害的 30%/50% 转化为生命 | 对敌人造成伤害的 30%/50% 转化为生命 | 对敌人造成伤害的 30%/50% 转化为生命 |',
     '| 33 | 渡魂归己 | 1 | 消耗。接下来 5 回合，对敌人造成伤害的 30%/50% 转化为生命 | 消耗。接下来 5 回合，对敌人造成伤害的 30%/50% 转化为生命 | 消耗。接下来 5 回合，对敌人造成伤害的 30%/50% 转化为生命 | 消耗。接下来 5 回合，对敌人造成伤害的 30%/50% 转化为生命 |'),

    ('#45 五通神',
     '| 45 | 五通神 | 2 | 召唤五通神。每回合开始时获得 3 格挡，并获得 1 点【尸气】（持续 2/3 回合） | 召唤五通神。立即获得 4 点格挡。之后每回合开始获得 3 格挡（持续 2/3 回合） | 召唤五通神。立即恢复 4 点生命。之后每回合开始获得 3 格挡（持续 2/3 回合） | 召唤五通神。每回合开始时获得 3 格挡，并对随机敌人施加 1 层【诅咒】（持续 2/3 回合） |',
     '| 45 | 五通神 | 2 | 召唤五通神。立即获得 3 格挡与 1 点【尸气】，之后每回合开始重复一次（持续 2/3 回合） | 召唤五通神。立即获得 7 点格挡（4 点基础 + 首次触发 3 点）；之后每回合开始获得 3 格挡（持续 2/3 回合） | 召唤五通神。立即恢复 4 点生命并获得 3 格挡；之后每回合开始获得 3 格挡（持续 2/3 回合） | 召唤五通神。立即获得 3 格挡并对随机敌人施加 1 层【诅咒】，之后每回合开始重复一次（持续 2/3 回合） |'),
]

for attempt in range(1, 6):
    try:
        t = io.open(T, 'r', encoding='utf-8').read()
    except PermissionError as e:
        print('第 %d 次：读取被拒（%s）' % (attempt, e)); time.sleep(1.5); continue

    changed = 0
    fail = None
    for tag, old, new in ROWS:
        c = t.count(old)
        if c == 1:
            t = t.replace(old, new); changed += 1
        elif c == 0:
            pass          # 已同步
        else:
            fail = '%s 匹配 %d 次' % (tag, c)
            break
    if fail:
        print('FAIL: ' + fail); sys.exit(1)

    if changed == 0:
        print('设计表已是最新，无需写入'); sys.exit(0)

    try:
        io.open(T, 'w', encoding='utf-8', newline='').write(t)
        print('PATCH m_table DONE: %d 处同步（第 %d 次尝试）' % (changed, attempt))
        sys.exit(0)
    except PermissionError as e:
        print('第 %d 次：写入被拒（%s），1.5 秒后重试…' % (attempt, e))
        time.sleep(1.5)

print('FAIL: 设计表被占用（重试 5 次仍失败）。请关闭正在打开该文件的编辑器（WPS/Typora/VSCode/记事本）后重跑本脚本。')
sys.exit(1)
