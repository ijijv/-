# -*- coding: utf-8 -*-
# 更新日志补 v0.57.8 小节（Block5 全局 UI）
import io

P = r"C:\Users\HP\Desktop\志怪塔\更新日志.md"
s = io.open(P, 'r', encoding='utf-8').read()

ANCHOR = "- 冒烟新增 13 条召唤断言（含 3 条旧断言按新设计更正）；冒烟 309 → **322 项全绿**"
NEW = ANCHOR + """

## v0.57.8 全局 UI 改造（2026-09-16 第 8 块·需求第 7 点）
- **① 战斗画面上移腾位**：`h1.title` 下边距 10→6px、`.battle` 下边距 10→4px
- **② 结束回合钮移到手牌右侧**：移出原底部按钮条，放入 `.hand-area` 内 `#hand` 之后；桌面**竖排**（`writing-mode:vertical-rl`，高 132px），移动端横向贴右下
- **③ 牌库 / 菜单移到顶部**：放入标题行 `h1.title` 右侧（`.title-actions` absolute 定位），移动端回落为标题下方居中一行；原 `#actions` 容器已删除
- **④ 战斗胜利三选一：同类聚拢**：按 攻击 → 防御 → 技能 → 鬼怪 排序展示；排序保留原数组下标，`pickReward(i)` 仍取 `G.rewardPicks[i]`（不会选错牌）
- **⑤ 锻造列表排序**：可升级且未锻造的排前，已升级 / 不可升级的排后（道观 `unknownForge` + 篝火 `showForgePicker` 两处）；「升级无变化置灰不可锻造」沿用原有逻辑
- 新手引导第三步文案改为「点手牌右侧『结束回合』」
- 冒烟 322 项全绿（UI 改动不涉及引擎结算）；**布局需浏览器 Ctrl+F5 硬刷新目视验证**"""
