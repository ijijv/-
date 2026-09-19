# -*- coding: utf-8 -*-
# v0.61.06 收尾：把「战斗仿真器」写进更新日志（批2 的前置工具，同版本号内）
import io, sys

P = r"C:\Users\HP\Desktop\志怪塔\更新日志.md"
s = io.open(P, 'r', encoding='utf-8').read()

OLD = """**下一小步**：批2 平衡（P1~P15 已逐条拍板）+ 轻量战斗仿真器（`rng` 就位后仿测可复现）
"""
NEW = """### 同批工具：战斗仿真器（`_patch/sim.js`）—— 批2 的尺子
> 平衡改数值不能靠感觉。这个工具让「改前 / 改后」跑同一批场景，用胜率说话。

```bash
node _patch/sim.js                                    # 四英雄 × 第一幕普通遭遇，各 200 场
node _patch/sim.js --hero all --scene all --fights 120 --json > 基线.json
node _patch/sim.js --up 1 --relics zhushabi           # 全升级牌组 + 指定遗物
```

- **口径（别当唯一依据）**：这是**贪心 AI 的下限**，不是人类水平；只覆盖**单场战斗**（不含地图/商店/事件）。用途是同一场景下的改前/改后对照
- **自动裁决**：交互式选牌由脚本代打——焚符/血契弃牌「先弃废牌、否则弃最便宜的」，火符弃最便宜的，守一保留最贵的 N 张；**易物直接跳过**（贪心会陷入「打→取消→回手」死循环）
- **每场独立**：卡牌按 `cardById` 浅拷贝一份（引擎会改 `c.up`/`c.sealed`，共用 `CARDS` 对象会跨场污染）
- **可复现**：全走 `seedRng`，同命令跑两遍字节一致（已验）；这也是 v0.61.06 做 `rng` 的直接原因
- **灵敏度自检**（证明这把尺子量得出东西）：天师 act1-普通，未升级 77.3% / 平均掉血 34.9 → **全升级 100.0% / 掉血 8.0**；武僧带【助杀笔】97.9% / 掉血 17.2（无遗物 95.3% / 20.2）
- **基线存档**：`_patch/sim_baseline_v06106.json`（4 英雄 × 三幕普通/精英/Boss，28,320 场，0 异常）
- 复用 `_patch/vm_host.js`（本次顺带从 `smoke_host.js` 抽出的公共 VM 宿主，冒烟仍 604/0）

**下一小步**：批2 平衡（P1~P15 已逐条拍板），改一条跑一次仿真，前后对照表进本文件
"""
if s.count(OLD) != 1:
    print('ANCHOR FAIL: %d 次' % s.count(OLD)); sys.exit(1)
io.open(P, 'w', encoding='utf-8', newline='').write(s.replace(OLD, NEW, 1))
print('CHANGELOG sim 段 DONE')
