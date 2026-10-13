# Project Progress

## Completed Milestones
- [Milestone 1] - [Date]
- [Milestone 2] - [Date]

## Pending Milestones
- [Milestone 3] - [Expected date]
- [Milestone 4] - [Expected date]

## Update History

### [Oct 13, 2026] ✅ Feature: 拆包产物重打 + 五道闸全绿 + TapTap 多文件 zip 产出（接手 agent）
<!-- ID: p_2026-10-13_handover2b -->

- `python 打包.py --split` 重打完成，`dist/web/` 完整（8 段 js + 素材/ + index.html +
  manifest.webmanifest + sw.js + icons/ 4 张）。
- **五道闸全绿确认基线**：verify_dist「全部通过」/ probe_dist bad=0 / verify_web「全部通过」/
  `_probe_cloud.js` 全部通过 / run_smoke **pass=1499 fail=0**。
- `python 打包.py --taptap-split` 产出 `dist/志怪塔_TapTap包体_多文件.zip`（62.71 MB / 557 文件）。
  包内自检：第一级唯一 `game`（纯英文）/ `game/index.html` 在 / `js/*.js` 相对外链 /
  `manifest.webmanifest`+`sw.js`+`icons/`+`素材/`（374 webp / 154 sfx）均在 game/ 下 /
  `ASSET_WEBP=true` / 无绝对路径泄漏。
- **下一步**：交用户真机试传；通过后决定是否切为默认口径；不认 SW 则剥离 PWA 组件。

**Affected files:**
- `打包.py`（本轮已提交于 0a9b33c）、`memory-bank/*`

**Tags:** `v1.1.11`, `TapTap多文件`, `五道闸`, `拆包`

---


### [Oct 13, 2026] 📌 Handover 二刷：焚牌音效接入 + TapTap 多文件包脚本就位（接手 agent）
<!-- ID: p_2026-10-13_handover2 -->

**修正上一版交接文的滞后**：12:30 那条写「工作区无已跟踪文件改动」不实。实测 git status 显示
`js/10_audio.js`、`_patch/smoke_runner.js` 有改动，且 `dist/web/` 不完整（仅 素材/）。

已完成：
- 复核并确认未提交的**焚牌音效**是完整功能：`fx_forge`/`fx_burn` 注册于 `js/10_audio.js` L187-195
  （SFX_KEYS 102→104），接点 `js/50_ui.js` `cardFxAnim` L1496，调用点
  forgeCard(L1486)/doUnknownRemove(L853)/doCampRemove(L1454)，CSS 类在 `原型.html` L1644-1672，
  真采样 `素材/sfx/fx_forge.mp3`+`fx_burn.mp3`，冒烟断言同步。
- 单文件产物 `dist/志怪塔.html`（88.1 MB，ASSET_MAP 811 / 154 sfx）四道闸全绿：
  verify_dist 全部通过 / probe_dist bad=0 / `_probe_cloud.js` 全部通过 / run_smoke **1499/0**。
- `打包.py` 新增 `--taptap-split`：dist/web/* → `dist/志怪塔_TapTap包体_多文件.zip`（zip 内 game/*），
  保留合规自检；单文件 `--taptap` 口径不动。
- 重跑 `python 打包.py --split`（后台）补全 dist/web/，待其完成跑 verify_web。

**Affected files:**
- `js/10_audio.js`、`_patch/smoke_runner.js`（上一轮遗留的未提交改动，本轮复核）
- `打包.py`（新增 `--taptap-split` / `build_taptap_split` / `TAPTAP_SPLIT_OUT`）
- `memory-bank/active-context.md`（二刷）

**Tags:** `v1.1.11`, `交接`, `焚牌音效`, `TapTap多文件`, `五道闸`

---


### [Oct 13, 2026, 12:30] 📌 Handover: v1.1.10 接手基线确认与交接沉淀
<!-- ID: p_2026-10-13_handover -->

接手确认：main 分支 HEAD=`95af340`（v1.1.10 boss_vfx 前 6 幕：34 张精灵图 + 19 条专属音效 +
_link 平铺播放器；FX_SPLIT_ROWS 扩展；verify_dist 按 ch 几何闸），工作区无已跟踪文件改动。
12:02:31 起跑的 `打包.py --taptap`（PID 30456）12:31:40 完成（实测 29 分钟；资产增至
811 个 / fx 73 张→342 排；单文件 84.06 MB、zip 61.51 MB），随后自动串联 `--split`。
发现两处文档滞后并记入 active-context：更新日志.md 正文只到 v0.76.0、README 里程碑只到 v1.0.0，
v1.0.0→v1.1.10 历史只在 git commit message。

接手第一批未做：(a) TapTap 包改多文件——复用 build_split 的 dist/web/ 打进 zip 的 game/*，
先出最小多文件 zip 真机试传相对路径，保留包名自检，改造前先留 git 回退点；
(b) boss_vfx 后 3 幕 b7 夜王 / b8 修罗王 / b9 阎罗天子共 12 段特效，照 b1~b6 接法。
待用户：纯色背景板风格定稿、两类焚牌音效给料（cardFxAnim 已留挂点）、boss_vfx scale 2.47 真机验收。

**Affected files:**
- `memory-bank/active-context.md`（占位模板 → 实际当前态）
- `memory-bank/system-patterns.md`（占位模板 → 8 段拼接/五道闸/三口径/平台约束）
- `memory-bank/product-context.md`（占位模板 → 项目概况）
- `memory-bank/progress.md`、`memory-bank/decision-log.md`（本条交接记录）

**Tags:** `v1.1.10`, `交接`, `boss_vfx`, `TapTap多文件`, `五道闸`

---


### [Sep 29, 2026, 1:42 PM] ✨ Feature: v0.72.0 步 6 完成：卡牌动画地基（零接入）
<!-- ID: p_2026-09-29_mum91vmg -->

§一 步 3/4/5 里程碑已封（打包 141 ok / 0 fail，冒烟 1340/0）。

步 6 内容：
- js/00_base.js 末尾新增动画地基，**纯新增 198 行、0 删行**（git diff --numstat 实证）⇒ fx 代码路径逐字节未动 ⇒ _drvfx 帧号不可能变（实测唯一差异是 #enemy-panel 宽度，属步 4/5 的既定几何，非本步）。
- NEW_CARDS(WeakSet) / animLive() / animLayer() / flyCardHTML() / flyFaceHTML() / animBindSkip() / Anim{flights,pending,busy,push,flush,skip,stop,play} / _animItem()。
- 原型.html 新增 #anim-layer(z-index 12) + .fly-card/.fly-inner/.fly-face/.fly-back/.fx-pulse 规则。
- 无头判据 = window.innerWidth（沙箱没有该属性 ⇒ animLive() 恒假）。

新增两只夹具：
- _patch/probe_anim.js（node，13 ok/0 fail）：证明无头下 push/flush/skip 全空转、**新增定时器数 = 0**、不建 #anim-layer、不绑 pointerdown。
- _patch/_drvfly.js（浏览器，8 视口 × 42 ok / 0 fail）：A 克隆与手牌逐像素同构 / B 翻转结构 + 手牌容器红线 / C #anim-layer(12) > #overlay(10) > #fx-layer(5) / D 真飞一次 + skip 到终态 / E pending 是数组 / F .fx-pulse 规则活性。

**本步挖出的坑（对步 7 直接有效）**：窄档 5 张牌时 #hand 装不下，.card 作为 flex 项被 flex-shrink 压成**小数宽**（960×540 实测 103.5px）；offsetWidth 会四舍五入成整数 ⇒ 克隆按整数建会让内部百分比定位的 .cart-wrap/.cplate 差整整 1px（夹具第一版就在 960×540 报 4 条 FAIL、844×390 报 2 条）。定论：**动画的尺寸一律取 getComputedStyle().width/height，不要 offsetWidth**；_animItem 也已改成不取整（只压两位小数）。附带确认：矩形绕任意点旋转后，其 AABB 中心 **等于** 旋转后的形心 ⇒ getBoundingClientRect 的中心可以直接当锚点用。

**Affected files:**
- `js/00_base.js`
- `原型.html`
- `_patch/probe_anim.js`
- `_patch/_drvfly.js`

**Tags:** `v0.72.0`, `动画`, `步6`

---


### [Sep 29, 2026, 1:14 PM] ✨ Feature: v0.72.0 步 3–5：敌人弧线构图（dy 表 + rank 序）与玩家左内缩，全部逐档验证
<!-- ID: p_2026-09-29_mum82pci -->

步 3（dy 弧线）：SLOT_SHAPE 的 dy 定为 0/14/28/42/54/62（62 是 v0.71.0 已有的净空封套 ⇒ 高度零变化）；秩 rank = 存活数-1-pos 由 60_boot.js:254 传 filter 后的 pos 算出。T-short 的 --rise-unit 从 .45 改 .05（实测：T-short 的 padding-top 只有 2px，最高的那只最多只能抬 4px；老 .45 会让最深那只顶进 #topbar 9px）。--headroom = 2+max(battleHeadroom, slotHeadroom)，slotHeadroom 按当前敌人数取 max（单敌不再白吃 62px）。

步 4（dx 弧线）：SLOT_SHAPE 的 dx 定为 0/-14/-28/-42/-54/-64（rank 越小越小）。**方向是最初反过来的**：先按「浅的拉最多（朝玩家探）」写，实测 960×540 五敌（2 elite+3 normal，一行 786/790 只剩 4px 余量）最前排那只被拉 29px 后压进 #player-panel（左沿 131 vs 玩家面板右沿 146）。改成「最浅恒 0、越深拉越多」⇒ 与玩家面板相交这条风险**由构造排除**（最前排钉在 flex 位上，按定义就在面板内）。#enemy-panel 的 padding-right 2→8px 当「不贴角」。

步 5（玩家左内缩）：--player-inset-x = 基档 24px / T-mid 14px / T-short 0 / ≤520·≤360 0，挂 #player-panel{margin-left:var()|0}。T-short 必须显式 0（自定义属性继承，省了就继承 24px，会把 960×540 的五敌一行挤成两行）。实测面板左沿：1920/1280 +24、1024×640 +14、960×540 与 640×360 不变。

验证：冒烟 1340/0；CSS 注释 203/203 配平、brace 2/0 与 HEAD 同、四种禁串 none；10 视口 BUDGET 与 HEAD **逐字节相同**；8 视口 × n=1~6 + 单 boss 共 28 组的换行行数与 HEAD 全一致；⚠（顶进顶栏 / 顶出右沿 / 与玩家面板相交）在 24+42 组里 0 次。夹具新增 &quiet=1（不铺全屏日志盒，给实拍看构图用）。

已知非回归：n=2 的 _drvland 行底 top 在两棵树里都是 7:1 抖（438/459，intent 文本换行竞态），与本次改动无关。

**Affected files:**
- `js/50_ui.js`
- `js/60_boot.js`
- `原型.html`
- `_patch/_drvclip.js`
- `_patch/_drvland.js`

**Tags:** `v0.72.0`, `敌人布局`, `弧线`, `CSS`, `验证`

---


- [2026-09-28 17:23:09] [HP] - Decision Made: CSS 闸必须证「合法性」而非「文本存在」——新增注释结构闸 + 选择器前奏中文闸
### [Sep 29, 2026, 1:22 AM] 🐛 Fix: v0.71.0 版面收口：整页锁死 + 战报栏全档抽屉 + 敌人尺寸 vh 连续公式 + 修两个「CSS 写了但没生效」的静默失效
<!-- ID: p_2026-09-28_mulin20o -->

提交 a9d0663（162 文件；一并扫掉 v0.65.0–v0.71.0 未提交积压，HEAD 原停在 v0.64.2）。

版面（用户实机点名）：整页锁死（html/body height:100% + overflow:hidden，定高弹性列提到全局）＋逐屏滚动分配（只有图鉴/地图/锻造/战报/弹窗可内部滚）＋战报栏全档统一为右侧抽屉（基档常驻左栏被证伪：3 敌时每个桌面分辨率都竖滚）＋矮屏档买余量。

真 bug：① #enemy-panel 缺层叠上下文，.enemy 内联 z-index:2000 盖住 #log 与手牌（用户报的「战报透明、卡牌盖不住敌人」）⇒ isolation:isolate。② 敌人立绘高度是定值 ⇒ vh 650~860 顶穿整页 ⇒ 一条 vh 连续公式（锚点 880，1920×1080/1440×900 像素恒等）。③ 矮屏档按钮特异度塌陷（button.btn 0,2,1 打败 .btn 0,1,0）⇒ 数条规则是死代码。④ 选英雄屏放不下（640×360 溢 62px、1280×720 也溢 20px）⇒ hero-scene 场景类 + #overlayWrap 放宽 700px。

两个「写了但没生效」的静默失效（本批最值钱）：① .card.selected 是全项目空规则 ⇒ 选牌小窗选中零反馈；补样式时连踩两坑——说明注释里写出注释起止符 ⇒ 注释提前截断把规则本身吞掉；改好后发现 .card.has-frame{border:0} 让 border-color 成死属性，真正生效的是 box-shadow 扩散环。② .exhaust-tag 整条规则被 v0.69.0 给该修复写的说明注释吃掉（CSS 注释不嵌套）⇒「被封印的牌描述看不全」悄悄回来了，数月无人发现。已用 rules= 模式读 getComputedStyle 证明修好，不是只证明文本在。另：矮屏档 .reward-cards .card 收到 104px，选牌小窗 5 张一排放得下（内部溢出 45/74px → 0）。

闸：verify_dist 133 → 141 ok / 0 fail。新增 8 条，治本两条＝注释结构性配平（照浏览器语义）＋「选择器前奏不许有中文」（证明合法性；文本/子串匹配在此坑上全是绿的）。夹具 _drvclip.js 新增 dialog=N / screen=hero / rules= 三模式。冒烟 1340 pass / 0 fail；8 视口 × 3 编制 × 2 形态 × 2 手牌数 = 96 组，仅 640×360+10 张手牌为 1px。

**Affected files:**
- `原型.html`
- `js/50_ui.js`
- `js/60_boot.js`
- `_patch/verify_dist.py`
- `_patch/_drvclip.js`
- `更新日志.md`

**Tags:** `v0.71.0`, `整页锁死`, `战报抽屉`, `CSS静默失败`, `验证闸`

---


### [Sep 8, 2026, 9:54 PM] ✨ Feature: 引擎机制改造（Task #11）全部完成，三批补丁 NODE_OK
<!-- ID: p_2026-09-08_mtsqdy7i -->

Batch A（新资源助手 gainShiqi/gainRage/rageSpend/addSummon/charmEnemy/sealEnemy/魅惑比例、newState 计数域 hpLostTurn/blockGainedTurn/summonsMadeTurn/CURSE_THIS_TURN、makeEnemy+序列化补全）。Batch B1（effectiveCost 按列减费、dealDamageToPlayer 逐英雄闪避奖励+命中骑手、焚符/守一/易物按英雄奖励、weightedCard 尸王过滤、saveRun/continueRun 补 shiqi/xuenu/xisuiTurns）。Batch B2（startTurn 整段重写：回合计数清零+洗髓经按列+xisuiTurns、triggerSummons 重写+summonAct/onSummonDeath 助手、finishEndTurn 血祭按列口径+#23卸甲生元按列、doPlayCard 移除自动烧血怒/尸王不进弃牌堆/燃魂泛化/守一boost）。node --check 全绿。遗留：kaitianyanTianshi 两处伤害骑手读(L1336/L1431)待 Batch D 按新开天眼效果保留或删；xuejiHurt 为无害残留。

**Tags:** `engine`, `refactor`, `zhiguai-tower`

---


### [Aug 27, 2026, 2:47 PM] 🐛 Fix: v0.44 补丁：背景图 z-index 修复 + 存档 bug 根治
<!-- ID: p_2026-08-27_mtb5u7cs -->

①背景图修复：z-index 从 -1 改 0（之前被 body 不透明渐变遮挡），body 加 .has-bg 类在图片加载成功时去背景色，onload 事件加类+显示，onerror 隐藏+去类，setBg 加 4 秒超时回退。②存档 bug 根治：startGame 确认对话框改用 hideOverlay 先关主菜单→再 showOverlay 确认框，按钮从 onclick 改为 addEventListener 直接绑定（id=btn-confirm-new/btn-back-menu），避免嵌套 innerHTML 导致 onclick 丢失。confirmNewGame 去掉 hideOverlay 调用（showHeroSelect 里的 showOverlay 会自动替换内容），保留 try-catch 兜底。

**Tags:** `fix`, `background`, `save-bug`

---


### [Aug 27, 2026, 10:28 AM] 🐛 Fix: v0.44：修手机适配+存档bug+补素材规格
<!-- ID: p_2026-08-27_mtawm2ot -->

①手机端适配：viewport 加 user-scalable=no+maximum-scale=1.0+viewport-fit=cover；body 加 touch-action:manipulation+overscroll-behavior:none；card/hand 加 touch-action:none 防止拖拽时页面滚动；新增 @media(max-width:520px) 和 @media(max-width:360px) 两档响应式（地图节点缩小、卡牌缩小、手牌重叠缩小、面板 padding 缩小、按钮/弹窗/过场动画适配手机屏）。②修复有存档时开始新游戏失败：confirmNewGame 加 try-catch+hideOverlay 再 showHeroSelect，防止覆盖层冲突导致卡死。③素材/README.md 补全格式/分辨率/大小限制总表（BGM 44.1kHz/≤2MB、背景 1920×1080/≤500KB、敌人立绘 512×512/≤200KB、卡牌插画 256×256/≤80KB、遗物图标 128×128/≤50KB）+ 包体总量预估（微信小游戏首包≤4MB/总包≤20MB，素材总量目标 10~15MB）。

**Tags:** `fix`, `mobile`, `assets`, `docs`

---

- [Date] - [Update]
- [Date] - [Update]
