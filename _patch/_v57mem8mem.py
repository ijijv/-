# -*- coding: utf-8 -*-
import io
p = r"C:\Users\HP\.claude\projects\C--Users-HP\memory\zhiguai-tower-game.md"
s = io.open(p, encoding='utf-8').read()
tail = """**v0.57#8 已落地（2026-09-16，Block5 全局 UI，11 处，冒烟 322 全绿）**：
- 战斗画面上移（h1 下边距 10→6、.battle 10→4）；结束回合钮移入手牌区右侧竖排（.hand-area #endTurn，writing-mode:vertical-rl）；牌库/菜单移标题行右侧（.title-actions absolute，移动端 static 居中）；原 #actions 容器删除（endTurn/menuBtn/viewDeck 事件按 id 绑定，移 DOM 不影响）。
- 战斗胜利三选一按 攻击/防御/技能/鬼怪 聚拢排序（保留原数组下标，pickReward(i) 取 G.rewardPicks[i] 不受影响）；锻造列表可升级的排前、已升级/不可升级排后（unknownForge 道观 + showForgePicker 篝火两处，索引保持原 G.deck 下标）。
- UI 布局类改动无法冒烟断言（VM 无 DOM），需浏览器 Ctrl+F5 目视验证。
- 需求 7 点到此全部落地：①-⑦（⑦ 全角色 UI 即本批）。
"""
s = s.rstrip() + "\n" + tail
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('memory 已追加 Block5 UI 记录')
