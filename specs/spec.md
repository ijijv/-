# spec.md — 志怪塔 v1.1.15 改版（存档单档化 / 战斗数值 / boss_vfx 新规格 / 交付）

项目根：`C:\Users\HP\Desktop\志怪塔 - 副本 (3)`
代码形态：8 段 JS（00_base / 10_audio / 20_data / 30_engine / 40_flow / 50_ui / 55_cloud / 60_boot）
按固定顺序拼接执行，非模块化。每改一段必须 `node --check`。

## 0. 已完成（本会话，已过 node --check，勿重做）

| 项 | 文件 | 变更 |
|---|---|---|
| 复活后本关无 BGM | [40_flow.js](file:///C:/Users/HP/Desktop/志怪塔%20-%20副本%20(3)/js/40_flow.js) `revive()` | 铺回战斗轨：`hideOverlay(); setBg('act'+G.act); setBGM(battleBgmFor(G.enemies)); sfx('heal');` |
| 里程碑蓝线随里程连续变化 | [50_ui.js](file:///C:/Users/HP/Desktop/志怪塔%20-%20副本%20(3)/js/50_ui.js) `mileFillPct` | 档位锚点分段线性插值（不再跨档才跳） |
| 选角符纸移到中下 | [原型.html](file:///C:/Users/HP/Desktop/志怪塔%20-%20副本%20(3)/原型.html) `.hs-talismans` | `bottom:1.5%` → `bottom:20%` |
| 初始牌组 / 我的牌库 6 列铺满横屏 | 原型.html `.hs-prev-row`、`#overlay.deck-scene` + [60_boot.js](file:///C:/Users/HP/Desktop/志怪塔%20-%20副本%20(3)/js/60_boot.js) `starterDeckThumbs` + [50_ui.js](file:///C:/Users/HP/Desktop/志怪塔%20-%20副本%20(3)/js/50_ui.js) `viewDeck` | 6 列网格、卡面等比 |
| 地图关卡图标用类型图（不用锁图） | [50_ui.js](file:///C:/Users/HP/Desktop/志怪塔%20-%20副本%20(3)/js/50_ui.js) `NODE_ICON`/`showMap` | fight/elite/unknown/camp→`guanqia-logo/*`；shop 仍 `shop.png`；boss→`guanqia-logo/boss.png`；保留 `NODE_ICON_LOCKED='locked.png'` 常量与解锁动画 |
| 冒烟断言同步（地图图标） | [smoke_runner.js](file:///C:/Users/HP/Desktop/志怪塔%20-%20副本%20(3)/_patch/smoke_runner.js) ~L5210/L5226 | 断言指向 guanqia-logo 新图 + 不再引用 NODE_ICON_LOCKED 渲染 |

牌堆图标 back.png 与 `素材/ui/card/back.png`、`素材/ui/deck_back.png` 逐字节相同 ⇒ 无需改动（Q11）。

## 1. 存档单档化（Q1–Q7 口径）

### 口径
- **Q1** 石碑：无档 → 灰 + 不可点；有档 → 亮 + 可点。
- **Q2** 旧多档 → **保留最新那个**（按 `startTs` 最大），其余删除，落 0 号槽。
- **续**：不再进存档管理面板，**直接 `continueRun()` 续档**。
- **入塔 → 选角 → 开始游戏**：若已有存档 → 弹提示面板（红色，无边框无底板）：
  - 大号毛笔红：`目前有一个存档，是否继续`
  - 中号毛笔红：`【继续】会掩盖之前的【存档】`
  - 小号毛笔白：旧档信息三段（角色 / 进度 / 血量）
  - 左下绿 `继续`、右下红 `返回`（即原「放弃存档」改名；`返回` 回选角界面）
- **继续**：以当前新选角色开局（覆盖旧档）→ **立即跳「旧档里那个角色」的战败结算动画**，算分 + 里程，删档；该结算页**只有「返回」二字按钮**（无「免费复活」），点「返回」回到选角界面。
- 存档相关 UI 文字一律**无边框、无纯色背景板**。
- 结算页用旧角色（Q3/Q4 的「对应角色」= 旧档里那个角色）的败局视频与 num 配色。

### 实现（decision-complete）

**[40_flow.js](file:///C:/Users/HP/Desktop/志怪塔%20-%20副本%20(3)/js/40_flow.js)（本局存档段 ~L538-650）**
- 保留 `RUN_KEY/RUN_SLOTS(3键)/RUN_SLOT/RUN_FINISHED`（不动 [55_cloud.js](file:///C:/Users/HP/Desktop/志怪塔%20-%20副本%20(3)/js/55_cloud.js) 的 `runs` 数组口径；实际只用 0 号槽）。
- 新增 `newestRunSlot()`：遍历 `RUN_SLOTS`，取 `readRun(i).startTs` 最大者（并列取最小下标，无档返回 -1）。
- 新增 `normalizeSingleRunSave()`：找占位槽；把最新那个的数据复制进 0 号槽；删除 1/2 号槽；`setRunSlot(0)`。空档时仅 `setRunSlot(0)`。
- 删除 `firstFreeSlot`、`slotInfo`（仅被即将删除的存档面板使用）。
- 新增 `rehydrateRunForSettle(d)`：`newState()` 后覆写 `hero/act/mapRow/killNormal/killElite/killBoss/killSummon/totalKills/gold/hp/maxHp/potions/accMs/startTs/t0`，返回一个仅用于结算的临时局。
- 新增 `settleOverwrittenRun(d)`：
  ```
  const savedG=G;                 // 选角界面的新局态（hero=当前新选角色）
  const t=rehydrateRunForSettle(d); if(!t){ clearRunSave(0); showHeroSelect(); return; }
  G=t;
  G.score=calcScore(); G.dead=true; G.battleOver=true;
  recordScoreRun(false); grantRunMilestones();
  const R=settleResultHTML('abandon');
  clearRunSave(0); if(typeof cloudMarkDirty==='function') cloudMarkDirty();
  G=savedG;                       // 还原，保证「返回」落回当前新选角色的选角界面
  settleVideo('lose', ()=>{ showOverlay(R.html, undefined, 'result-scene'); settleAnim(R); });
  ```
  ⚠️ `settleVideo` 必须在 `G=t` 时调用（它同步读 `G.hero` 选片源）—— 故先 `settleVideo(...)` 再 `G=savedG`。
- `settleResultHTML(mode)` 增 `'abandon'` 分支：
  `btns='<button class="btn ghost" onclick="showHeroSelect()">返回</button>';`（无 `reviveFree`）。

**[60_boot.js](file:///C:/Users/HP/Desktop/志怪塔%20-%20副本%20(3)/js/60_boot.js)**
- `startGame()` → `ensureAudio(); confirmNewGame();`（去掉 `firstFreeSlot` 分支与 `showSavesPanel('overwrite')`）。
- `confirmNewGame(opts)`：`if(opts && opts.clear) clearRunSave(0);` 否则**保留旧档**（供覆盖提示）；`setRunSlot(0)`；其余（`newState/seed/buildActs/track/签到奖励/showHeroSelect`）不变。
- `confirmRestart()` 的确定按钮 → `confirmNewGame({clear:true})`。
- 删除 `openSaves / slotRowHTML / showSavesPanel / resumeSlot / newRunInSlot / deleteSlot`。
- 新增 `resumeRun(){ ensureAudio(); continueRun(); }`；`showStartScreen()` 里「续」的 `onclick="steleBreak(this,openSaves)"` → `onclick="steleBreak(this,resumeRun)"`（禁用条件 `hasRunSave()?'':' disabled'` 保留）。
- 新增 `askOverwriteSave(heroId)`：渲染上述提示面板，scene 类 `overwrite-scene`，`继续`→`overwriteAndStart('<heroId>')`，`返回`→`overwriteBack()`。
- 新增 `overwriteBack(){ if(G) G.hero=HS_SEL; showHeroSelect(); }`。
- 新增 `overwriteAndStart(heroId){ const d=readRun(0); if(!d){ showHeroSelect(); return; } settleOverwrittenRun(d); }`（`heroId` 仅用于日志/兜底，实际新局由后续「开始游戏」按 `HS_SEL` 建立）。
- `heroSelectStart()`：在已解锁分支内，**先** `if(hasRunSave()){ askOverwriteSave(HS_SEL); return; }` **再** `pickHero(HS_SEL)`。
- boot：`document.addEventListener('DOMContentLoaded', showStartScreen)` 之前先调 `normalizeSingleRunSave()`。

**[原型.html](file:///C:/Users/HP/Desktop/志怪塔%20-%20副本%20(3)/原型.html)**
- 新增 `#overlay.overwrite-scene` CSS：`#overlayWrap` 透明、`.panel` 无边框无底色；提供 `.ow-title`（大号笔字红）/`.ow-warn`（中号笔字红）/`.ow-info`（小号笔字白，三段）/`.ow-actions`（左绿右红两枚纯笔字按钮，`background:none;border:0`）。字体沿用 `var(--font-kai)`。

**[smoke_runner.js](file:///C:/Users/HP/Desktop/志怪塔%20-%20副本%20(3)/_patch/smoke_runner.js)**
- ~L6779 `must[]`：`'onclick="steleBreak(this,openSaves)"'` → `'onclick="steleBreak(this,resumeRun)"'`。
- 新增断言：
  - `startGame` 源码不含 `showSavesPanel` / `firstFreeSlot`；
  - `askOverwriteSave` 存在且模板含 `目前有一个存档` 与 `【继续】会掩盖之前的【存档】`；
  - `settleResultHTML` 的 `abandon` 分支含 `返回` 且不含 `reviveFree`；
  - `normalizeSingleRunSave` 存在且 `RUN_SLOTS` 长度仍为 3。
- 若既有 `viewDeck` / 初始牌组断言因 6 列改造变红，一并同步。

## 2. 战斗数值（Q8–Q10）

- **开天眼(kaitianyan)**：对**多段攻击牌**每段增伤**减半** —— 升级前每段 `+1`，升级后数值同步减半；卡面写明减半后数值。
- **朱砂笔(zhushabi)**：遗物「攻击 +3」→ 对多段攻击牌**每段只 +1**（当前会每段 +3）。
- 两条机制**只作用于玩家打出的攻击牌**；敌人多段攻击不受影响。
- 落点：`20_data.js` 的牌/遗物定义与描述 + `30_engine.js` 的 `calcDamageTo` / `dealDamageTo({segs,step})` 路径（实施前需精确定位 `turnAtkBuff` 与「攻击 +N」在分段伤害上的消费点，并只对 `G`（玩家）打出的攻击牌生效）。

## 3. boss_vfx 新规格（Q13）

- 素材源：`C:\Users\HP\deepseekharness\boss_vfx`，新规格 **8 列 × 4 行、单帧 480×480**（文件名含 `_8lie4hang_480x480`）。
- 实施前先 `ls` 该目录确认文件命名与尺寸；再改 FX 几何常量（`FX_SHEETS` 的 rows/帧宽高）与 [打包.py](file:///C:/Users/HP/Desktop/志怪塔%20-%20副本%20(3)/打包.py) 的 `FX_SPLIT_ROWS`。
- 后 3 幕（夜王/修罗王/阎罗天子）与前 6 幕复用同一平铺播放器方案。

## 4. 交付与验证

- 打包：`python 打包.py`（单文件）+ `python 打包.py --split`（多文件/PWA）+ `--taptap-split`（TapTap 单文件转 zip）。单次 12~18 分钟，产物覆盖。
- 五道闸（顺序）：`verify_dist.py` → `probe_dist.py` → `verify_web.py` → `_probe_cloud.js` → `run_smoke.py`；基线随本轮新增断言提高（现基线 pass=1502、fail=0）。
- 全部包/闸命令用 `dangerouslyDisableSandbox: true`（沙箱只允许写 Temp）。
- 版本号 bump 至 **v1.1.15**，三处（原型.html 的 `#ver-tag`、打包.py、提交.py 读取处）保持一致。
- 完成后 `git commit`（含新增素材）+ 刷新 memory-bank。

## 5. 风险与约束

- 改 8 段 JS 每段必过 `node --check`。
- 不得自行生成任何美术/特效/音效素材（用户提供）。
- `settleOverwrittenRun` 临时替换全局 `G` 期间，任何异步回调不得读 `G`（结算面板正文与视频源均已在替换期内同步生成）。
- `RUN_SLOTS` 保持 3 键长度：避免触碰 `55_cloud.js` 的 `runs` 与既有产物闸计数断言。
