# -*- coding: utf-8 -*-
import io
p = r"C:\Users\HP\.claude\projects\C--Users-HP\memory\zhiguai-tower-game.md"
s = io.open(p, encoding='utf-8').read()
tail = """**v0.57#9 已落地（2026-09-17，逐块复核 Block1~5 + 4 处按文档补齐，冒烟 322→335 全绿）**：
- 复核方法：新增 `_patch/dump_cards.js`（复用 smoke_host 的 VM stub，但拼接导出表达式而非 runner；注意游戏里 `G` 初始为 null，须先 `G = newState()`），把 48 张卡 A 列 `t(false)/t(true)` + `CARD_DMG` 覆盖全量导出 JSON，与《赶尸人版卡池.md》逐条比对。45/48 一致；术语 `GHOST_IDS` 6 张 / `CAN_CURSE_IDS` 8 张完全一致。
- 修 4 处（用户选「全部按文档修」）：① #2 火符 A 列「随机弃」→「挑选弃 1 张手牌」，新增 `G.huofuSelect` 挑选面板（`startHuofuSelect/renderHuofuSelect/pickHuofuDiscard`，在 `cancelDiscardSelect` 后），其余三列仍随机弃；② #39 附灵术 2 费→**0 费 + exhaust**（旧表 2 费无消耗，新文档改了没落地）；③ #38 移形换影 A 列补「（0 符文）」（`costU:0` 早生效、仅卡面漏显示）；④ `CARD_DMG` 补 zhenyaoling/zhouyu/shi_wang 三键，并把 zhouyu 加进 `DYNAMIC_DMG`（miss 文案「无尸气」）、shi_wang 加进 `PER_TURN_SUMMONS`（显示「每回合」）。
- 教训：`_v57mem5~8.py` 那几个「更新日志」脚本只定义了 ANCHOR/NEW 却没写 `io.open(...).write`，导致 v0.57.5~.8 四节从未落盘（`_v57mem5mem.py` 那类记忆脚本有写）。本次已补写 v0.57.5~.9 五节；以后脚本末尾必须确认有写入调用再跑。
- 遗留提示：《卡牌特性整合表.md》（旧四列表）的 A 列自 Block4 起就与《赶尸人版卡池.md》脱节，未同步（本次只保证后者实现完整）。
"""
s = s.rstrip() + "\n" + tail
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('memory 已追加 v0.57#9 复核记录')
