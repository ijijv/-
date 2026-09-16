# -*- coding: utf-8 -*-
import io
p = r"C:\Users\HP\.claude\projects\C--Users-HP\memory\zhiguai-tower-game.md"
s = io.open(p, encoding='utf-8').read()
tail = """**v0.57#5 已落地（2026-09-16，防御批 A 列对齐设计文档，17 处替换，冒烟 282→299 全绿）**：
- 《赶尸人版卡池.md》防御 15~23 核对：**8 张与原型不符**（#22 反震已符合未动）。金刚符删每召唤联动改 1/2 尸气；隐身符抽鬼怪尸气 1→1/2；金光罩耗2尸气额外 4→4/5；金钟罩 16；荆棘符反弹 4/5→4/6 且与武僧列拆分（赶尸人独立 6/4）；佛渡加赶尸人分支（升级获 2 尸气代替 3 格挡，清负面/免疫共用）；铜皮 9/12；卸甲格挡 5→4（尸气档 Block2 已对齐）。
- 教训：冒烟追加升级断言必须自含初值重置（上一张基础断言残留累加导致 block/thorns 漂移）；且 Edit 旧行的 old_string 若只含 `__ok` 行不含上方 `(function(){...})()` 开头行，会生成重复函数头→SyntaxError。改脚本要连函数头整个两行一起替换，别只 replace 断言行。
- 防御卡无 CARD_DMG 伤害预览键（走 null 默认），t/eff 同步即可，符合预览与 eff 逐列一致铁律。
"""
s = s.rstrip() + "\n" + tail
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('memory 已追加 Block4 防御批记录')
