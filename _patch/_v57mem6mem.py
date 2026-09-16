# -*- coding: utf-8 -*-
import io
p = r"C:\Users\HP\.claude\projects\C--Users-HP\memory\zhiguai-tower-game.md"
s = io.open(p, encoding='utf-8').read()
tail = """**v0.57#6 已落地（2026-09-16，功能批 A 列对齐设计文档，13 处替换，冒烟 299→309 全绿）**：
- 《赶尸人版卡池.md》功能 24~40 核对：7 张不符。聚灵/舍身尸气升级倍率（1→1/2）；血契格挡 1/2→2/3；血祭多摸上限 +4→3张；燃魂抽 3→2 张 + 新增 1 符文 + 回血 2/4；移形换影尸气 1→2；镇妖铃改无条件获 3 尸气（删 wasSealedBefore 条件分支）。
- 已符合未动：守一/易物/通灵/静心诀/燃血术/洗髓经/渡魂归己/开天眼/附灵术/焚符。
- 冒烟 309 项全绿。剩余：召唤批 41~48（纸人强化需按尸气≥4 消耗 4 尸气改 t/eff，去掉多余的「施加 1 层诅咒」）。
"""
s = s.rstrip() + "\n" + tail
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('memory 已追加 Block4 功能批记录')
