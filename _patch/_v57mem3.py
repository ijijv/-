# -*- coding: utf-8 -*-
import io
p = r"C:\Users\HP\.claude\projects\C--Users-HP\memory\zhiguai-tower-game.md"
s = io.open(p, encoding='utf-8').read()
tail = """**v0.57#3 已落地（2026-09-16，尸王常驻手牌+不可删除，提交 3fdf191，node --check + 冒烟 270→276/276 全绿）**：
- **每关开始尸王在手牌**：startBattle 内 `beginBattle` 洗牌后，赶尸人把 drawPile 里的 shi_wang 取回 hand（`G.drawPile.filter(c=>c!==_sw)` + `G.hand.push(_sw)`）。
- **未打出则留手**：finishEndTurn 弃牌处 kept 判定加 `G.hero==='ganshiren' && c.id==='shi_wang'`（不清零不弃），配合 `G.shiWangCard` 状态机实现「打出且死亡后才回弃牌堆进循环」（returnShiWangCard 沿用）。
- **不可删除**：三处删卡入口（篝火 doCampRemove / 商店 doRemove / 净坛 doUnknownRemove）开头 guard `if(c && c.id==='shi_wang'){ floatMsg('【尸王】不可删除'); return; }`，不 splice deck。
- 冒烟新增 6 条（开局在手牌/回合末留手/死亡回弃牌堆/三处删卡拦截）。A#48 原断言（召唤唯一/满尸气清空/不可升级）不动。
- 版本号维持 v0.57；更新日志已补 v0.57.3 小节。
"""
s = s.rstrip() + "\n" + tail
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('memory 已追加 Block3 记录')
