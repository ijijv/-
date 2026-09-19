# -*- coding: utf-8 -*-
# 记忆追加：战斗仿真器（批2 的尺子）
import io

P = r"C:\Users\HP\.claude\projects\C--Users-HP\memory\zhiguai-tower-game.md"
s = io.open(P, 'r', encoding='utf-8').read()

ADD = r"""

**战斗仿真器已就位（2026-09-19，批2 的前置工具）**：`_patch/sim.js`（node 驱动）+ `_patch/sim_runner.js`（VM 内追加，和引擎同作用域）+ `_patch/vm_host.js`（**从 smoke_host.js 抽出的公共 VM 宿主**，冒烟与仿真共用；抽完冒烟仍 604/0）。
用法：`node _patch/sim.js` 出四英雄 × 第一幕普通遭遇胜率表；`--hero/--scene/--enemies/--fights/--up/--relics/--json` 可调；`--scene all` 跑三幕普通+精英+Boss。
**口径（重要，别把它当唯一依据）**：贪心 AI 的**下限**，不是人类水平；只覆盖**单场战斗**（无地图/商店/事件）；用来做**改前/改后对照**。交互式选牌由脚本代打（焚符/血契全弃最便宜的先弃、火符弃最便宜、守一保留最贵的 N 张），**易物 `yiwu` 进 SIM_SKIP**（贪心会「打→取消→回手」死循环）。
**每场必须浅拷贝卡牌**：`cardById()` 返回的是 `CARDS` 里的共享对象，引擎会改 `c.up`/`c.sealed`，多场连跑会跨场污染——`sim_runner` 里的 `__card()` 就是干这个的。
**全走 seedRng → 同命令两遍字节一致**（已验），这正是 v0.61.06 做 `rng` 的直接原因。
**灵敏度自检**（证明量得出东西）：天师 act1-普通 未升级 77.3%/掉血 34.9 → 全升级 100%/掉血 8.0；武僧带助杀笔 97.9%/17.2（无遗物 95.3%/20.2）。
**基线存档**：`_patch/sim_baseline_v06106.json`（4 英雄 × 三幕，28,320 场，0 异常）。
**踩过的坑**：场景表里 `keys` 必须是**数组**（`startBattle` 要 `keys.map`），一度传成 `"youhun,youhun"` 字符串 → 全部 ERR×N、胜率 0%、平均回合 0（看到这个特征就是 keys 传错了）。
"""

io.open(P, 'a', encoding='utf-8', newline='').write(ADD)
print('MEMORY sim APPENDED')
