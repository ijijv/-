# -*- coding: utf-8 -*-
# 补 v0.57.10 小节（附灵术按列取费修正）+ 记忆
import io

LOG = r"C:\Users\HP\Desktop\志怪塔\更新日志.md"
MEM = r"C:\Users\HP\.claude\projects\C--Users-HP\memory\zhiguai-tower-game.md"

ANCHOR = "## v0.57.9 逐块复核 + 4 处按文档补齐（2026-09-17 第 9 块·复核）"
NEW = """## v0.57.10 附灵术「按列取费」修正（2026-09-17 第 10 块·越界回修）
- **问题**：v0.57.9 把附灵术改成「0 费 + 消耗牌」是**卡级**字段，四份文档里只有《赶尸人版卡池.md》#39 写 0 费；《武僧版卡池.md》《阴差版卡池.md》都是 **2 费、无消耗**，《天师版卡池.md》是 **2/1**（升级 1 费）→ 三个角色的附灵术被连带改错
- **新增机制「按英雄取费用」**：`_costPick(v)` —— 数值＝全英雄通用；对象＝`{ganshiren:0, default:2}`。`cardCost` / `canUpgrade` / 卡面高亮（`eff<cardCost(c)`）三处同步改用
- **新增 `exhaustOnly`**：`isOneUse` 支持「仅指定英雄算消耗牌」，附灵术用 `exhaustOnly:['ganshiren']`（阴差/武僧/天师仍是普通牌）
- 附灵术现状：`cost:{ganshiren:0, default:2}` + `costU:{tianshi:1}` + `exhaustOnly:['ganshiren']`；天师升级卡面补「（1 符文）」
- 冒烟 335 → **339 项全绿**（结构校验放宽 cost 可为对象；新增 5 条按列断言：赶尸人 0 费+消耗+不可升级、阴差/武僧 2 费非消耗、天师 2 费/升级 1 费）

""" + ANCHOR

s = io.open(LOG, 'r', encoding='utf-8').read()
assert s.count(ANCHOR) == 1, 'LOG ANCHOR %d' % s.count(ANCHOR)
io.open(LOG, 'w', encoding='utf-8', newline='').write(s.replace(ANCHOR, NEW))
print('更新日志已补 v0.57.10')

tail = """**v0.57#10 已落地（2026-09-17，附灵术按列取费，冒烟 335→339）**：
- 教训：**改卡级字段前先查四份文档**——v0.57#9 把 `fuling.cost` 改成 0 是越界（B/C 文档 2 费、D 文档 2/1）。新增 `_costPick(v)` 机制：cost/costU 支持「数值＝通用；对象＝{ganshiren:0, default:2}」，`cardCost`/`canUpgrade`/卡面高亮三处同步；`isOneUse` 支持 `exhaustOnly:['ganshiren']`。
- 附灵术终值：`cost:{ganshiren:0, default:2}, costU:{tianshi:1}, exhaustOnly:['ganshiren']`。
- 冒烟断言坑：`__card(id)` 返回**共享卡对象**，`c.up=true` 会污染全局卡定义——要改升级态请用 `Object.assign({}, __card(id), {up:true})`。
- 下一步：按《阴差版卡池.md》核对 C 列（阴差）。抽查已知 C 列已不符：#2 火符 文档 8/11 伤 + 失去 2 生命 + **不弃牌**，代码是 9/7 伤 + 失 1 + 随机弃；#39 附灵术 文档「每触发 1 个恢复 2/4 点生命」，代码是固定 2 点。
"""
m = io.open(MEM, encoding='utf-8').read()
io.open(MEM, 'w', encoding='utf-8', newline='').write(m.rstrip() + "\n" + tail)
print('memory 已追加 v0.57#10')
