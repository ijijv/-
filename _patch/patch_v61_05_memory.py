# -*- coding: utf-8 -*-
# 记忆追加：v0.61.01 蓄力口径 + v0.61.05 三层重构（用 raw 串防 Windows 路径转义）
import io

P = r"C:\Users\HP\.claude\projects\C--Users-HP\memory\zhiguai-tower-game.md"
s = io.open(P, 'r', encoding='utf-8').read()

ADD = r"""

**v0.61.01 蓄力口径落定（2026-09-19，用户拍板「不要让连击也吃蓄力加值」）**：蓄力只被**单体 `attack`** 消费（`case 'attack'` 里 `d=e.intent.v+(e.pendingDamage||0); e.pendingDamage=0`），连击 `multi`、群体 `aoe`、`攻击并格挡` **既不加也不清**蓄力。原先只是代码事实、文案/预览在说反话，现全部对齐：KEYWORDS 蓄力条目、蓄力行动 log、`intentText` 的 charge 文案都改「下回合单体攻击 +N」；`intentText` 拆出 `atkPlain=e.intent.v+st` 给 multi / attackBlock 用（**attackBlock 原先用含蓄力的 `atk`，是最后一处预览虚高**），`atk` 只留给单体 attack。冒烟 570→582（含动态结算三条：attack 15=10+5 且清零、multi 2×6=12 保留蓄力 5、aoe 7 保留蓄力 5）。**后续若有人问「连击要不要吃蓄力」，答案是不要——这是用户明确口径。**

**v0.61.05 批1.5 三层重构已落地（2026-09-19，冒烟 582/0 全绿，源码与单文件产物各跑一遍）**：`原型.html` 那个 3900 行的巨型 `<script>` 已拆成 **js/ 下 7 个经典外链脚本**，双击 file:// 照样能玩（不是 ES module）。**目录结构与加载顺序即依赖**：`js/00_base.js`（工具/飘字/战斗特效/Boss 过场）→ `js/10_audio.js`（Web Audio sfx+BGM/素材映射）→ `js/20_data.js`（KEYWORDS/CARDS/HEROES/RELICS/POTIONS/ENEMIES/词缀/地图表/稀有度概率）→ `js/30_engine.js`（全局状态/伤害结算/回合流程 `startTurn`·`enemyAct`/`doPlayCard`）→ `js/40_flow.js`（winFight·loseGame/startBattle/节点推进/存档/排行榜）→ `js/50_ui.js`（地图/奖励/商店/图鉴/成就/埋点/`render`/拖拽）→ `js/60_boot.js`（调试工具/开局/菜单/引导/启动尾块 `loadSave` 等）。
**为什么是保序连续切分而不是按层重排**：原文件是按功能段落顺序写的（数据与 tooltip 相邻、卡牌打出与回合流程相邻），按层重排要动 3800 行/约 300 个顶层单元，风险远大于收益；文件名前的数字=**加载顺序**，正文里 `/* ===== 段落 ===== */` 注释原样保留。**验收门 `python _patch/verify_v61_05.py`**：js/*.js 去掉各自 8 行头部横幅后拼接，必须与 `_patch/_orig_script_body.js`（切分前正文快照）**逐字节一致**（唯一放行项=版本号那一行）→ 跑出 `VERIFY_OK 7 个文件 / 213296 字符`。**注意：此后任何对 js/*.js 的正常改动都会让这个门失败，那是预期行为。**
**工具链同步改造（改这些脚本前必读）**：`_patch/smoke_host.js` 已改为按文档顺序读 `<script src>` 再拼接 runner（同时对内联脚本的**单文件产物兼容**，`node _patch/smoke_host.js dist/志怪塔.html` 可直接冒烟产物）；`打包.py` 把 js/* 合回一段再混淆（`</script>` 转义、`ASSET_MAP` 注入、内联 onclick 全局名保护逻辑未变，产物 4.34MB）；`_check.js`、`_make_docs.py` 也改读 js/*（卡牌行号来源=`js/20_data.js`）。**今后 patch 脚本的目标文件是 `js/xx.js` 而不是 原型.html 里的 `<script>`**；版本号仍是 3 处，但第 3 处（主菜单 `<h2>志 怪 塔 · vX</h2>`）现在在 `js/60_boot.js`，另两处（`<title>`/`<h1>`）仍在 原型.html（`提交.py` 也从 `<title>` 读版本，不受影响）。
**真浏览器实测**（不是 VM 桩）：headless Chrome 以 `file://` 打开 原型.html → 7 个脚本全部加载、控制台无报错、起始界面完整渲染；单文件产物 dist/志怪塔.html 同样无报错。
**本批刻意留下的差异**：计划里同批的「`Store` 存储薄封装」与「种子随机 `rng()`」**拆到 v0.61.06 单独提交**（它们是改行为的，混进纯搬移提交会让这次重构不再可二分定位）。
**下一个待办**：v0.61.06 收口（Store 包 localStorage 约 20 处 + rng 可播种 + AdSlot 统一广告入口）→ 批2 平衡（P1~P15 已逐条拍板）→ 批3 UI/手机端 → 批4 等用户素材（音效包/BGM 3轨/画风二选一/字体/真人试玩）。
"""

io.open(P, 'a', encoding='utf-8', newline='').write(ADD)
print('MEMORY v0.61.01/05 APPENDED')
