# -*- coding: utf-8 -*-
import io
p = r"C:\Users\HP\.claude\projects\C--Users-HP\memory\zhiguai-tower-game.md"
s = io.open(p, encoding='utf-8').read()
tail = """**v0.57#2 已落地（2026-09-16，卸甲生元 A 列回合末自动转化，提交 6aedd91，node --check + 冒烟 269→270/270 全绿）**：
- 卸甲生元 **A 列（赶尸人）**改「回合结束自动把剩余格挡换算为【尸气】：每保留 2 点获得 1/2 点（升级翻倍）」，**无论敌人是否攻击**——不再只在敌人攻击后结算剩余量。
- 实现：eff 登记 `G.xiejiaUp=!!u`（升级态），finishEndTurn 末尾（enemyAct 之前）加 A 分支 `Math.floor(block/2)*(xiejiaUp?2:1)` 全额换算并清零 block/endBlockKind/xiejiaUp。
- 卡面 t 与 floatMsg 同步；newState 加 `xiejiaUp:false`。
- 冒烟 A#23 改锁新口径 + 加升级态断言（7 格挡→6 尸气）。
- 版本号维持 v0.57（本批次统一不逐块升号）；更新日志已补 v0.57.2 小节。
- 教训：bash -c 里含反引号(`<title>` 之类)会被命令替换破坏，写文档/记忆用脚本文件方式走 python，别用 python -c 内嵌反引号。
"""
s = s.rstrip() + "\n" + tail
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('memory 已追加 Block2 记录')
