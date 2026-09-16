# -*- coding: utf-8 -*-
import io
p = r"C:\Users\HP\.claude\projects\C--Users-HP\memory\zhiguai-tower-game.md"
s = io.open(p, encoding='utf-8').read()
tail = """**v0.57#4 已落地（2026-09-16，攻击批 A 列对齐设计文档，提交 b4e2b9d，node --check + 冒烟 276→282 全绿）**：
- 《赶尸人版卡池.md》攻击 1~14 核对：仅 **7 张与原型不符**（其余 7 张已符合，未盲改）。每张 t / eff / CARD_DMG 三处同步（预览与 eff 逐列一致铁律）。
- **雷符** 4/7 + 每召唤+1，新增「若击杀敌人获 2 尸气」（赶尸人列独立分支，不依赖旧 T/W/Y）；**火符** 5/8，弃鬼怪牌获 1/2 尸气；**剑符** 8/13；**万剑归宗** 10/15，每击败 1 敌获 3 尸气抽 1；**铁布衫** 每 2 尸气额外 +1/+2（升级翻倍）；**蚀魂咒** 3/6，A 列施咒改「每有 1 召唤单位恢复 1 生命」；**钟馗镇魂** 16/24，A 列从「曾被镇魂才获尸气」改**无条件**获 4/5 尸气。
- 教训：写 patch 锚点前必须 grep 确认当前实际值（蚀魂 t 曾误写 u?6:4，实际 u?7:5；钟馗升级冒烟忘了先清 g.尸气导致 9≠5，在 smoke_runner.js 直接 Edit 补 `g.尸气=0;`）。追加载断言必须自含初始条件。
"""
s = s.rstrip() + "\n" + tail
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('memory 已追加 Block4 记录')
