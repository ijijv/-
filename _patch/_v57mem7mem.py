# -*- coding: utf-8 -*-
import io
p = r"C:\Users\HP\.claude\projects\C--Users-HP\memory\zhiguai-tower-game.md"
s = io.open(p, encoding='utf-8').read()
tail = """**v0.57#7 已落地（2026-09-16，召唤批 A 列，18 处替换，冒烟 309→322 全绿）**：
- 召唤 41~48 核对：6 张不符（#44 画皮、#47 阴兵过境已符合）。纸人 2/4 + 尸气≥4 耗4强化 5/7 且不再叠诅咒；咒印改「召唤咒魂 zhouhun + 立即获 3/5 尸气」（zhouhun 不入 summonAct 白名单=不发回合末行动，仅计数）；小鬼 2/4 + 死亡 2/3（升级档经 s.up 传到 onSummonDeath）；五通神立即 5 格挡(强化 6)、持续 2/3(强化 3/4)、去掉尸气（wutongTick 改按 s.v）；咒雨重写为引爆尸气（清零，每层 6/7 伤害随机分配）+ exhaust；尸王删死亡给 2 尸气。
- 教训：改数值后旧冒烟断言（纸人预览 v=1、五通神 +3格挡+1尸气）会失败，属「断言反映旧行为」，按新设计更正断言而非回退代码。
- Block4（A 列 48 张）到此全部完成：攻击批/防御批/功能批/召唤批，冒烟 282→322。剩余 Block5 全局 UI（战斗画面上移、结束回合钮位置、牌库/菜单顶部、同类聚拢、锻造排序置灰）。
"""
s = s.rstrip() + "\n" + tail
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('memory 已追加 Block4 召唤批记录')
