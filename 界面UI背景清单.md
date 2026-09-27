# 《志怪塔》界面 UI / 背景图 清单

> 用途：为「换每个界面的 UI 和背景图」做底数盘点。
> 口径：**以源码为准**，每行都带 `文件:行号`，可直接 grep 复核。
> 盘点日期：2026-09-27（版本 v0.64.1 源码）。

---

## 〇、先看这三条（它们改变工作性质）

| # | 结论 | 后果 |
|---|---|---|
| 1 | **只有 3 个场景有背景图**（62 个界面中的 59 个背景位是空的） | 「换每个界面的背景」实际是**从 0 新建约 50 张**，不是替换 |
| 2 | **UI 几乎 100% 是 CSS 画的**，不是图 | 换 UI 是**改 CSS 变量与样式**，外加**首次引入**整套 UI 图 |
| 3 | **44 个面板背后压着一层 88% 不透明黑幕** | 新背景图**一张都看不见**，除非照抄 `map-scene` 模式 |

---

## 一、总数

| 分类 | 数量 | 有独立背景图？ |
|---|---|---|
| **全屏主场景**（SCENE 级） | **6** | 只有 **3** 个有（主菜单 / 战斗 / 地图） |
| **全屏 overlay 面板** | **44** | ❌ 全部没有，共用 88% 黑幕 |
| **小弹窗 / 浮层** | **12** | ❌ 全部没有 |
| **合计** | **62** | 有背景的只有 **3 个场景 / 5 张图** |

> 按「独立函数」口径是 **47 个全屏函数**：`showTutorial(i)`、`showForgePicker(from)`、`renderExchange()`
> 各是**一个函数多分支**，不是多个界面。

---

## 二、用户点名的 5 个界面

| 说的 | 实际界面 | 函数 · 位置 | 现在有背景吗 |
|---|---|---|---|
| 主界面 | 主菜单 | `showStartScreen()` `js/60_boot.js:390` | ✅ `bg_menu.png` |
| 选英雄界面 | 选 择 英 雄 | `showHeroSelect()` `js/60_boot.js:294` | ❌ 无 |
| 选卡界面 | 战斗胜利·三选一 | `showReward()` `js/50_ui.js:869` | ❌ 无 |
| 胜利界面 | **两个不同界面**（见下） | `showBattleResult()` `js/40_flow.js:45`／`showVictory()` `js/40_flow.js:171` | ❌ 均无 |
| 失败界面 | 妖气侵蚀了你 | `loseGame()` `js/40_flow.js:128` | ❌ 无 |

> ⚠️ **「战胜」和「战败」在代码里是完全独立的两个函数**（`showBattleResult` / `loseGame`），
> 不是同一个函数传参数 —— 做图时是**两张**，不是一张换色。
> 而「通关」又是**第三个**函数 `showVictory`。三者互不复用。

---

## 三、背景图现状：只有 3 个场景 / 5 张文件

`setBg()` 全项目**只有 4 个调用点**：

| 场景 | 调用点 | 背景文件 | 尺寸 | 体积 |
|---|---|---|---|---|
| 主菜单 | `js/60_boot.js:391` `setBg('menu')` | `bg_menu.png` | **1920×1080** ✅ | 390 KB |
| 战斗（三幕各一张） | `js/30_engine.js:638` `setBg('act'+G.act)` | `bg_act1/2/3.png` | **1920×1080** ✅ | 320 / 357 / 348 KB |
| 战斗（读档恢复） | `js/40_flow.js:282` 同上 | 同上 | — | — |
| 地图 | `js/50_ui.js:413` `setBg(mapBgName())` | `bg_map.jpg` | **1295×3238 竖幅** ⚠️ | 312 KB |

- **好消息**：4 张已是 **1920×1080 横版**，与现行规格（`素材/README.md:13`）**完全一致，零返工**。
- **例外**：`bg_map.jpg` 是**竖幅卷轴**，不符合横版规格 —— 但它是「画心」，已明确「**画心不调**」，
  **不纳入本清单的横版口径**。
- 路径拼法 `bgRel(name)` `js/10_audio.js:333`：名字带扩展名则原样用，否则补 `.png`。
- `MAP_BG = {1:'map.jpg',2:'map.jpg',3:'map.jpg',endless:'map.jpg'}` `js/50_ui.js:43`
  —— **三幕共用同一张地图背景**。
- 代码请求 5 张 ↔ 磁盘 5 张，**零缺口、零孤儿**（无限模式复用 `bg_act3.png`）。

---

## 四、UI 图现状：几乎 100% 是 CSS

**全项目取图出口只有 6 个**：`artImg`（唯一的门）、`cardArt`、`relicIcon`、`nodeIconHTML`、
英雄头像/立绘、敌人立绘。**没有任何按钮图 / 卡框图 / 血条图 / 能量条图 / 金币图 / 标题字图。**

| 出口 | 位置 | 指向 | 现有文件数 |
|---|---|---|---|
| `artImg(src,fallback,cls)` | `js/10_audio.js:325` | **唯一的取图门**（自带 `draggable="false"` + `imgFail` 回退） | — |
| `cardArt(c)` | `js/10_audio.js:328` | `素材/card/<卡id>.png` | 49 |
| `relicIcon(r)` | `js/10_audio.js:329` | `素材/relic/<id>.png` | 12 |
| `nodeIconHTML(file)` | `js/50_ui.js:47` | `素材/map/*.png` | 6 + `locked.png` |
| 英雄头像 / 立绘 | `js/50_ui.js:174`、`js/60_boot.js:232` | `素材/hero/<id>.png` | 4 |
| 敌人立绘 | `js/50_ui.js:1442` | `素材/enemy/<key>.png` | 34 |

**不走 `artImg` 的三处**（新增 UI 图时容易漏）：
- 数字浮字 `assetURL('num/…')` `js/00_base.js:141`
- 特效精灵图 `assetURL('fx/…')` `js/00_base.js:276`
- 锁图 `LOCK_IMG_REL = 'map/locked.png'` `js/00_base.js:502`

**结论**：面板底、按钮、血条、能量条、金币、标题字、边框、图标 —— **全部是 CSS**
（`--ink2` / `--gold` / `.panel` / `.btn`）。**换 UI 不是「换图」，是改 CSS 变量与样式。**

### ⚠️ `applyMapTextures` 陷阱（换地图 UI 必踩）

`原型.html:333/334/354` 那 3 行 CSS 的 `url(素材/…)` **只是开发期兜底**（`原型.html:328-332` 注释明写）：
`打包.py` **只特判** `<img src="素材/rune.png">`（`原型.html:655`），**不重写 CSS 的 `url()`**
⇒ 这 3 条相对路径在 **dist 产物里会 404**。

真正生效的是 `applyMapTextures()`（`js/50_ui.js:401-408`，用 `assetURL()` 写内联 `background-image`）。

> ⇒ **改地图的木轴 / 画纸贴图，改 `applyMapTextures` 才有效，改 CSS 无效。**
> 症状是「本地看着生效、打包后失效」——最阴的一类。
> ⇒ 新增 UI 图必须走 `artImg()`；**不要**在 `原型.html` 写 `url(素材/ui/…)`，
> `_patch/verify_dist.py` 的 `[5]` CSS 门禁只放行已存在的引用，会 FAIL。

---

## 五、最大的坑：44 个面板背后是一层 88% 黑幕

```
原型.html:250  #overlay{position:fixed; inset:0; background:rgba(10,8,6,.88); …}
原型.html:255  .panel  {background:var(--ink2); …}          ← 完全不透明
```

`原型.html:287-291` 的注释已把这个坑写死：**「换哪张背景图都被压成一片黑」**
（88% 黑幕 × 不透明面板 ⇒ 背景全被吃掉）。

v0.62.0 曾试图靠「**调淡**」补救，两层叠出来的合成不透明度仍有 **0.454**
⇒ 用户当场评价「**还有半透明的战斗场景，十分失败**」。**那条路已证伪。**

### 现成的、已被验证的唯一正确解法：`#overlay.map-scene`

`原型.html:296-298`：
```css
#overlay.map-scene{background:#0b0a09;}                                  /* 黑幕 → 全不透明 */
#overlay.map-scene .panel{background:none; border:0; border-radius:0;
                          padding:0; max-height:none; overflow:visible; text-align:left;}
```
**两层同时清零**，背景才透得出来。地图（`js/50_ui.js:470` 加类、`:1332` 摘类）是**唯一**
用这个模式的界面，**跑通了**。

> ⇒ 其余 43 个面板要挂背景，**照抄 `map-scene` 模式**（各给一个 scene className，两层同时清零），
> **而不是去调黑幕透明度**。

---

## 六、`志怪塔UI重设计\` 里什么是能用的

⚠️ **大部分是参考稿，不是切好的成品。**

| 内容 | 数量 | 能否直接用 |
|---|---|---|
| `界面效果图\`（01 主菜单 … 07 阵亡画面） | **7 张** | **参考稿**（效果图），不是可切素材 |
| `assets\`（`main-bg.jpg` 2730×1536 / `battle-bg.jpg` 2730×1536 / `map-bg.jpg` 1182×3547） | 3 张 | 背景**可直接缩到 1920×1080 用** |
| `素材\地图图标\` 单图 | **9 张**（含 `path-left/right`） | **已切好可直接用**，但见下方尺寸坑 |
| `UI元素精灵图\01-按钮卡牌面板合集.jpg` | 1 张 | **未切片的参考稿** |
| `UI元素精灵图\02-图标合集.jpg` | 1 张 | 8 个金色线条图标，**未切片** |
| `ezgif-split\tile*.png` | 40 张 | ❌ **不是九宫格片**（见下） |

**`tile*.png` 的真相**：实测**不是**面板/按钮的九宫格切片，而是
**4 配色 × 10 帧的圆环动画**（各 120×125），且带**品红抠像残边**；源图不在该目录里。

**`01-按钮卡牌面板合集.jpg` 的内容**：3 个按钮（朱砂红实心 / 旧纸棕描边 / 暗色幽灵）
+ 1 张米黄符纸卡牌正面 + 1 个暗金雕花大面板框（可做九宫格）+ 1 个朱砂红能量球
—— **全部未切片，没有对应的透明 PNG。**

### 两个必须知道的坑

1. **`素材\地图图标\` 的 9 张与现役 `素材/map/` 不是同一批**：
   现役 7 张单图标是 **256×256**，重设计里同名图标是 **505×803 ~ 870×1175**，
   **尺寸差一个量级，不能直接覆盖**。
2. **`素材/map/ellite.png` 是故意拼错的名字**（少个 e），`js/50_ui.js:18` 的 `NODE_ICON`
   里写的也正是 `ellite.png` —— **改名会 404**。（重设计目录里那张叫正确的 `elite.png`。）

### 缺口结论

`设计说明.md` 自己明写这批是给制作 AI 的**「样式参考」**（效果图 = 参考、精灵图 = 样式参考、
设计说明 = 色值布局规则），且**只登记了 `界面效果图/` + `UI元素精灵图/` + `设计说明.md` 三项**
（`素材/` 与 `assets/` 是后来追加的）。

> ⇒ **「面板框 / 按钮」目前只有未切片的参考稿，没有任何可直接接入的透明 PNG。**
> 这是「新 UI 能否落地」的真正前置。

### 色板（可直接搬进 CSS 变量）

墨黑底 `#0D0C0A`（占 70%）／旧纸棕 `#1A1714`／朱砂红 `#B82E24`／暗金 `#A88B3A`／米黄符纸 `#E8DCC4`。
**铁律：朱砂红与暗金不要大面积相邻**（「一个是血一个是铜，放一起就脏」）。

---

## 七、完整界面清单（62）

### A 组 · 全屏主场景（6）

| # | 界面 | 函数 · 位置 | 背景 |
|---|---|---|---|
| A1 | 主菜单 | `showStartScreen()` `js/60_boot.js:390` | ✅ `bg_menu.png` |
| A2 | 战斗 | `startBattle()` `js/30_engine.js:635` + `render()` `js/60_boot.js:222` | ✅ `bg_act1/2/3.png` |
| A3 | 地图 / 爬塔选路 | `showMap()` `js/50_ui.js:411` | ✅ `bg_map.jpg` + 卷轴 3 张 |
| A4 | 篝 火 | `showCampfire()` `js/50_ui.js:940` | ❌ |
| A5 | 鬼 市（商店） | `showShop()` `js/50_ui.js:1011` | ❌ |
| A6 | 未知之地 | `showUnknown()` `js/50_ui.js:674` | ❌（**自身不画任何东西**，立刻派发到 F 组，玩家看不到它） |

### B 组 · 开局与局外（7）

| 界面 | 函数 · 位置 |
|---|---|
| 选 择 英 雄 | `showHeroSelect()` `js/60_boot.js:294` |
| 开 局 抉 择 | `showOpeningChoice()` `js/60_boot.js:341` |
| 菜 单 | `openMenu()` `js/60_boot.js:407` |
| 设 置 | `showSettings()` `js/60_boot.js:424` |
| 入门引导（4 步，**一个函数**） | `showTutorial(i)` `js/60_boot.js:504` |
| 重新开始？ | `confirmRestart()` `js/60_boot.js:520` |
| 退出本局？ | `confirmQuit()` `js/60_boot.js:525` |

### C 组 · 图鉴 / 收藏 / 统计（7）

| 界面 | 函数 · 位置 |
|---|---|
| 志 怪 图 鉴 | `viewBestiary()` `js/50_ui.js:1131` |
| 成 就 · 收 藏 | `viewAchievements()` `js/50_ui.js:1192` |
| 数 据 统 计 | `viewStats()` `js/50_ui.js:1270` |
| 关键词说明 | `viewKeywords()` `js/50_ui.js:1288` |
| 遗物图鉴 | `viewRelics()` `js/50_ui.js:1292` |
| 我的牌库 | `viewDeck()` `js/50_ui.js:1303` |
| 周 榜 行 榜 | `viewLeaderboard()` `js/40_flow.js:288` |

### D 组 · 流程与结算（7）

| 界面 | 函数 · 位置 |
|---|---|
| 战 斗 结 算 | `showBattleResult(r)` `js/40_flow.js:45` |
| Boss 战利品 | `showBossReward()` `js/40_flow.js:66` |
| 第 N 幕 · 幕间 | `advanceAct()` `js/40_flow.js:100` |
| 第 N 层 · 无尽 | `nextEndlessLap()` `js/40_flow.js:108` |
| 妖气侵蚀了你（战败） | `loseGame()` `js/40_flow.js:128` |
| 本局结束 | `giveUp()` `js/40_flow.js:143` |
| 通 关 ！ | `showVictory()` `js/40_flow.js:171` |

> D3/D4 **形制相同但是两个函数**，不是同一函数传参。

### E 组 · 奖励（2）

| 界面 | 函数 · 位置 |
|---|---|
| 战斗胜利 · 三选一 | `showReward()` `js/50_ui.js:869` |
| 获得遗物 · 三选一 | `showRelicReward()` `js/50_ui.js:928` |

### F 组 · 未知事件（8，`showUnknown` 随机派发）

| 界面 | 函数 · 位置 |
|---|---|
| 净 坛 | `unknownRemove()` `js/50_ui.js:694` |
| 灵 泉 | `unknownPotion()` `js/50_ui.js:705` |
| 古井许愿 | `unknownWell()` `js/50_ui.js:709` |
| 鬼市黑商 | `unknownBlackMarket()` `js/50_ui.js:718` |
| 无头古庙 | `unknownTemple()` `js/50_ui.js:722` |
| 拦路恶鬼 | `unknownAmbush()` `js/50_ui.js:733` |
| 道 观 | `unknownForge()` `js/50_ui.js:738` |
| 空 坟 | `unknownEmpty()` `js/50_ui.js:744` |

> F7 道观自建卡面 HTML，不走 `showForgePicker`，但共用 `forgeCardHTML()` `js/50_ui.js:1358`。

### G 组 · 篝火子面板（3）

| 界面 | 函数 · 位置 |
|---|---|
| 休息 · 恢复 20 生命 | `showRestConfirm()` `js/50_ui.js:964` |
| 篝火 · 删牌 | `campRemoveCard()` `js/50_ui.js:969` |
| 锻造 · 点击一张牌升级 | `showForgePicker(from)` `js/50_ui.js:980`（**一函数两入口**：`camp` / `boss`） |

### H 组 · 商店子面板（1）

| 界面 | 函数 · 位置 |
|---|---|
| 删除牌组 | `renderRemoveList()` `js/50_ui.js:1050` |

### I 组 · 战斗内小面板（9）

| 界面 | 函数 · 位置 |
|---|---|
| 使 用 灵 汁 | `showPotionSelect()` `js/20_data.js:878` |
| 忘 忧 汤 | `showWangyouChoice()` `js/30_engine.js:403` |
| 焚 符 · 弃 牌 | `startDiscardSelect()` `js/30_engine.js:429` |
| 火 符 · 弃 牌 | `startHuofuSelect()` `js/30_engine.js:483` |
| 易物 · 选一张手牌 ／ 牌堆随机三张（**一函数两分支**） | `renderExchange()` `js/30_engine.js:518` |
| 守一 · 保留手牌 | `renderRetainSelect()` `js/30_engine.js:580` |
| ⚠ 以命相搏（**内联，无函数名**） | `playCard()` 内 `js/30_engine.js:986` |
| 卡牌放大（**绕过 showOverlay**） | `showCardZoom(i)` `js/60_boot.js:146` |

### S 组 · 小弹窗 / 浮层（12）

| 名称 | 函数 · 位置 |
|---|---|
| 悬停 tooltip | `showTip()` `js/20_data.js:931` |
| 条件引导气泡 | `showTipBubble()` `js/00_base.js:95` |
| 成就解锁 toast | `showAchievementToast()` `js/50_ui.js:1161` |
| 飘字提示 | `floatMsg()` `js/00_base.js:66` |
| 拖拽预伤浮标 | `showDragPreview()` `js/60_boot.js:121` |
| 拖拽箭头 | `drawArrow()` `js/50_ui.js:1502` |
| 回合横幅 | `turnBanner()` `js/00_base.js:353` |
| Boss 战前过场 | `bossIntro()` `js/00_base.js:448` |
| Boss 二阶段转场 | `bossPhaseIntro()` `js/00_base.js:461` |
| 交互式引导提示条 | `renderTutHint()` `js/60_boot.js:485` |
| 结束回合软提示 | `renderEndTurnHint()` `js/60_boot.js:287` |
| 原生 `confirm()` | `startGame()` `js/60_boot.js:314` |

---

## 八、包体影响

`素材/README.md` 的预算是**按 4 张背景图**算的（`:33`：4 张 × 500KB = 2MB），
而**实际已有 5 张**，且总预算 `:38` 已自评「**≈25MB（超了）**」、`:40` 要求「控制在 **10~15MB 以内**」。

| 场景 | 背景张数 | 仅背景体积 |
|---|---|---|
| 现状 | 5 张 | ≈ **1.7 MB** |
| 44 个全屏面板各配一张（1920×1080 ≤500KB） | 5 + 44 = 49 张 | ≈ **24 MB** |
| 微信总包线 | — | **20 MB** ❌ 爆 |
| 抖音总包线 | — | **30 MB** ⚠️ 贴近 |

> 现 `dist/志怪塔.html` 已是 **30.82 MB**（v0.64.1 实测），**已经贴着抖音 30MB 线**。

⇒ **「每个界面都配独立背景」在现行规格下不可行。**
可行的是「全屏主场景各一张 + 小面板共用一套」——**范围待拍板。**

---

## 九、复核方法（每一条都可复算）

```bash
# 界面总数：47 个 showOverlay 调用点 + 1 个定义点
grep -c "showOverlay(" js/*.js

# 背景：4 个 setBg 调用点 / 5 个文件
grep -n "setBg(" js/*.js
ls 素材/bg/

# 取图出口只有 6 个
grep -n "artImg(" js/*.js

# 黑幕与 map-scene
sed -n '250p;255p;287,291p;296,298p' 原型.html

# UI重设计 的参考稿数量
ls "C:/Users/HP/Desktop/志怪塔UI重设计/界面效果图/"
ls "C:/Users/HP/Desktop/志怪塔UI重设计/UI元素精灵图/ezgif-split/" | wc -l
```

---

## 十、挂账（未做，不谎报）

- **实际替换任何图 / CSS** —— 等范围拍板。
- **逐界面交付规格文档**（命名/尺寸/风格提示词）—— 本轮只要清单。
- **切 `01-按钮卡牌面板合集.jpg`** 成可用的面板/按钮九宫格 —— 本轮不做；
  这是「新 UI 能否落地」的真正前置。
- **`素材/enemy_backup/` 28 张孤儿图**：零引用，且 3 个文件名（`niutoumamian` /
  `xiaojiangshi` / `yincha`）与现役集（`niumamian` / `xiaojianshi` / `yinchai`）不一致
  —— **是否删除等发话**（既有约定：未经询问不动 `素材/`）。
- **Cocos 竖屏适配** —— 既有决定，全部延后。