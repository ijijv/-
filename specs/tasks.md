# tasks.md — 志怪塔 v1.1.15 实施清单

> 每改一段 JS 必须 `node --check`。写工程目录的命令一律 `dangerouslyDisableSandbox: true`。
> 依赖顺序：A → B → C → D（数值）→ E（fx）→ F（打包）→ G（五道闸）→ H（提交）。

## A. 存档单档化 · 基础设施（js/40_flow.js）
- [x] A1 新增 `newestRunSlot()` / `normalizeSingleRunSave()`
- [x] A2 删除 `firstFreeSlot` / `slotInfo`
- [x] A3 新增 `rehydrateRunForSettle(d)` / `settleOverwrittenRun(d)`
- [x] A4 `settleResultHTML` 增 `'abandon'` 分支（仅 `返回`，无 `reviveFree`）
- [x] A5 `node --check js/40_flow.js`

## B. 存档单档化 · 入口与面板（js/60_boot.js）
- [x] B1 `startGame()` 收敛为 `ensureAudio(); confirmNewGame();`
- [x] B2 `confirmNewGame(opts)` 支持 `clear`，去掉无条件清档
- [x] B3 `confirmRestart()` 确定按钮 → `confirmNewGame({clear:true})`
- [x] B4 删除 `openSaves / slotRowHTML / showSavesPanel / resumeSlot / newRunInSlot / deleteSlot`
- [x] B5 新增 `resumeRun()`；「续」onclick → `steleBreak(this,resumeRun)`
- [x] B6 新增 `askOverwriteSave / overwriteBack / overwriteAndStart`；接入 `heroSelectStart()`
- [x] B7 DOMContentLoaded 前调 `normalizeSingleRunSave()`
- [x] B8 `node --check js/60_boot.js`

## C. 存档面板样式（原型.html）
- [x] C1 新增 `#overlay.overwrite-scene` 规则（透明、无边框、无底色、大中小笔字、左绿右红按钮）
- [x] C2 确认 `.hs-talismans` / `.sd-thumb` / `.deck-grid` 既有改动仍在

## D. 战斗数值（js/20_data.js + js/30_engine.js）
- [x] D1 定位 `kaitianyan`(开天眼) 与 `zhushabi`(朱砂笔) 的生效点及 `turnAtkBuff`/「攻击+N」在分段伤害上的消费路径
- [x] D2 开天眼：多段攻击牌每段增伤减半（升级前 +1/段、升级后同步减半），卡面写减半后数值
- [x] D3 朱砂笔：多段攻击牌每段只 +1（不再每段 +3）
- [x] D4 两条机制限定「玩家打出的攻击牌」；敌人多段不受影响
- [x] D5 `node --check` 涉及段

## E. boss_vfx 新规格（js/00_base.js 或 FX 段 + 打包.py）
- [x] E1 `ls` `C:\Users\HP\deepseekharness\boss_vfx` 确认 8列×4行 / 单帧 480×480
- [x] E2 改 FX 几何常量（rows / 帧宽高）与 `打包.py` 的 `FX_SPLIT_ROWS`
- [x] E3 `node --check`

## F. 冒烟断言同步（_patch/smoke_runner.js）
- [x] F1 ~L6779 `must[]` 改 `onclick="steleBreak(this,resumeRun)"`
- [x] F2 新增：`startGame` 无 `showSavesPanel`/`firstFreeSlot`；`askOverwriteSave` 含两段红字；`abandon` 分支含 `返回` 不含 `reviveFree`；`normalizeSingleRunSave` 存在且 `RUN_SLOTS.length===3`
- [x] F3 同步所有因 6 列牌库 / 地图图标 / fx 改动而变红的既有断言
- [x] F4 `node --check _patch/smoke_runner.js` + `node _patch/smoke_runner.js`（源码冒烟）

## G. 打包与五道闸
- [x] G1 `python 打包.py`（单文件，12~18 分钟）
- [x] G2 `python 打包.py --split`（多文件/PWA）
- [x] G3 `python 打包.py --taptap-split`（TapTap zip，含结构自检）
- [x] G4 `python _patch/verify_dist.py`
- [x] G5 `python _patch/probe_dist.py`
- [x] G6 `python _patch/verify_web.py`
- [x] G7 `node _patch/_probe_cloud.js`
- [x] G8 `python _patch/run_smoke.py`（记录 pass/fail 新基线）

## H. 版本号与提交
- [x] H1 版本号 bump 至 v1.1.15（原型.html `<title>` 为唯一落点，提交.py 从此读取；README.txt 里程碑表同步；`#ver-tag` 已作为开发者痕迹删除）
- [x] H2 `git status` + `git diff` 复核，仅暂存本轮改动与新增素材
- [x] H3 `git commit`（conventional，中文说明）→ 提交 d34a7a3，已推送 origin/main
- [x] H4 刷新 memory-bank（项目状态 + 本轮决策）
