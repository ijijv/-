# -*- coding: utf-8 -*-
"""
v0.61.25 步骤 6a —— 文档同步：第一批 25 → 26 条，并把 `hit` 退役说清楚

为什么是 26 而不是 25：
  `doPlayCard` 里消耗牌额外补了一声 `card_exhaust`（原计划漏了这条，代码已经接线），
  所以本批真出声的新键是 26 个。

为什么「现有 12 键」变成 11：
  `hit` 原本只有 1 处调用（dealDamageTo），v0.61.25 那处改成了按伤害量分级
  （hit_light / hit_heavy / hit_crit / hit_guard / atk_multi_each），
  所以 `hit` 现在 0 调用 —— 表里保留不删（老存档/外部调用不至于哑掉），但不再算「在出声」。
  26 + 11 = 37，总数与原文一致。

改动：素材清单.md 6 处、素材/README.md 4 处。
锚点唯一性各校验 count==1。
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')

LIST = os.path.join(ROOT, '素材清单.md')
AREADME = os.path.join(ROOT, '素材', 'README.md')

EDITS = []


def E(path, a, b):
    EDITS.append((path, a, b))


# ==================== 素材清单.md ====================
E(LIST,
  "| **第一批** | **25 条** | **本批代码已接线**，见下表 —— 拿到文件**立刻能听到** | 覆盖玩家 90% 的操作反馈；且每条都已有代码调用点，零额外改动 |\n",
  "| **第一批** | **26 条** | **本批代码已接线**，见下表 —— 拿到文件**立刻能听到** | 覆盖玩家 90% 的操作反馈；且每条都已有代码调用点，零额外改动 |\n")

E(LIST,
  "**第一批 25 条精确清单（本批代码接线完成，交付同名文件即生效）：**\n",
  "**第一批 26 条精确清单（本批代码接线完成，交付同名文件即生效）：**\n")

E(LIST,
  "| 5 | `thorns` | 10 | `enemy_heal` | 15 | `enemy_qingsuan` | 20 | `ui_reward` | 25 | `enemy_dormant` |\n",
  "| 5 | `thorns` | 10 | `enemy_heal` | 15 | `enemy_qingsuan` | 20 | `ui_reward` | 25 | `enemy_dormant` |\n"
  "| 26 | `card_exhaust` | | | | | | | | |\n")

E(LIST,
  "> 另有 **现有 12 键**（`hit` `hurt` `block` `death` `card` `heal` `gold` `relic` `win` `lose` `boss` `error`）\n"
  "> **早就接好了**，交付同名文件即可替换合成音 —— 这 12 条建议**第一批一起买**，\n"
  "> 因为它们是使用率最高的（40 处调用）。\n"
  "> **合计本批真出声 = 25 新增 + 12 现有 = 37 条**（其余 44 条入表待接线，交付后我按第二批补接线）。\n"
  "> `hit` 是唯一的纯遗留键（只有 1 处调用）—— 它保留可用，但新代码一律走 `hit_light` / `hit_heavy` 按伤害量分级。\n",
  "> 另有 **现有 11 键**（`hurt` `block` `death` `card` `heal` `gold` `relic` `win` `lose` `boss` `error`）\n"
  "> **早就接好了**，交付同名文件即可替换合成音 —— 这 11 条建议**第一批一起买**，\n"
  "> 因为它们的老调用点一条没动，交付即生效。\n"
  "> **合计本批真出声 = 26 新增 + 11 现有 = 37 条**（其余 44 条入表待接线，交付后我按第二批补接线）。\n"
  "> `hit` 是唯一的纯遗留键：原本只有 1 处调用（`dealDamageTo`），v0.61.25 把那一处改成\n"
  "> 按伤害量分级（`hit_light` / `hit_heavy` / `hit_crit` / `hit_guard` / `atk_multi_each`）后，\n"
  "> 它现在**已经 0 调用**。表里保留不删（万一有外部调用不至于哑掉），但**不必花钱买** ——\n"
  "> 真想要一个通用兜底音，买 `hit_light` 就够。\n")

E(LIST,
  "1. 先按 **1.5 第一批的 25 个键名**去搜/生成/录 —— 这 25 条落地即可让「敌人出招有动静、按钮有点击音、抽牌有反馈」，\n"
  "   是本游戏手感提升最明显的 25 条\n",
  "1. 先按 **1.5 第一批的 26 个键名**去搜/生成/录 —— 这 26 条落地即可让「敌人出招有动静、按钮有点击音、抽牌有反馈」，\n"
  "   是本游戏手感提升最明显的 26 条\n")

# ==================== 素材/README.md ====================
E(AREADME,
  "- **音效 120KB/条**：只放**高频键**（第一批约 25 条）≈ 3MB；变体不要无脑拉满，同一键 2 个就够。\n",
  "- **音效 120KB/条**：只放**高频键**（第一批 26 条）≈ 3MB；变体不要无脑拉满，同一键 2 个就够。\n")

E(AREADME,
  "| 音效 | 25 条（第一批） | 120KB | 3MB |\n",
  "| 音效 | 26 条（第一批） | 120KB | 3MB |\n")

E(AREADME,
  "- 键名表（约 60 个）见项目根目录 `素材清单.md` 第一节 —— 那份文档是完整工作单，\n",
  "- 键名表（共 70 个）见项目根目录 `素材清单.md` 第一节 —— 那份文档是完整工作单，\n")

E(AREADME,
  "**第一批优先做的 25 个键名**（做齐这 25 个，手感提升最明显）：\n",
  "**第一批优先做的 26 个键名**（做齐这 26 个，手感提升最明显）：\n")

E(AREADME,
  "| `enemy_dormant` | 敌人休眠 | | |\n",
  "| `enemy_dormant` | 敌人休眠 | `card_exhaust` | 消耗牌打出 |\n")


def main():
    cache, bad = {}, []
    for path, a, b in EDITS:
        if path not in cache:
            cache[path] = io.open(path, encoding='utf-8', newline='').read()
        n = cache[path].count(a)
        if n != 1:
            bad.append((os.path.basename(path), n, a.split('\n')[0][:60]))
            continue
        cache[path] = cache[path].replace(a, b, 1)
    if bad:
        print('FAIL 锚点不唯一/缺失，整体未落盘：')
        for f, n, s in bad:
            print('  [%s] count=%d  %r' % (f, n, s))
        return 1
    for path, s in cache.items():
        io.open(path, 'w', encoding='utf-8', newline='').write(s)
        print('OK %s' % os.path.relpath(path, ROOT))
    print('OK 共落地 %d 处文档改动' % len(EDITS))
    return 0


if __name__ == '__main__':
    sys.exit(main())
