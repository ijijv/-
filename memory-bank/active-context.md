# Current Context

> 本文件 2026-10-14 由接手 agent **六次刷新**（v1.1.17 落地后）。
> 工程根：`C:\Users\HP\Desktop\志怪塔 - 副本 (3)`（换机整文件夹连同 .git 一起拷）。
> 版本 **v1.1.17**（上一提交 v1.1.16 = `071a4a9`，已推 origin/main），分支 main。

## 当前快照（2026-10-14 v1.1.17 性能三项，未提交）

- **① 预热解码**：`js/00_base.js` 新增 `FX_PREHEAT` / `fxPreheatKeyRow0()` / `fxPreheatBattle()`；
  `js/30_engine.js` 在 `beginBattle` 内、`render()` 前调用 `fxPreheatBattle()`。只预热**本场卡组**
  （抽/手/弃）CARD_FX 涉及的 sheet 的**第 0 排** ＋ 每场固定几张（hurt/multi_slash/curse/burn/
  damage_reflect/thorns/fudu_hit）；**刻意不全量**（全量 ~数百 MB 挤爆手机图片缓存）。无按排键（开发树/
  冒烟宿主）静默跳过。
- **② 音频缓存池**：核查后确认**早已存在**（`js/10_audio.js` `loadSfxSamples` 预解码进 `SFX_BUF`、
  `playSample` 直读）⇒ 本项**未改动**。
- **③ 并发上限降档**：`FX_MAX_LIVE` 常量仍 14；新增 `fxMaxLive()`（`fxEvictOldest` 改用之），
  **仅「流畅模式（低配机）」降到 8**，普通档仍 14。

## 上一版快照（v1.1.16）

用户真机试玩后逐条报障，8 项一并落地（详见 progress.md 的 v1.1.16 条）：

- **① 五雷法印弃牌**（`js/30_engine.js` L871-879）：手牌置换出的雷符，原牌既不入弃牌堆也不入抽牌堆
  ⇒ 本关卡每换一次净少一张。修法：`doSwap` 把被置换的原牌 `push` 进 `G.discard`。副本仍 isOneShot。
- **② 绿底费用芯片**（`js/50_ui.js`）：判据从 `id==='duanren_leifu'` 扩到 `(oneShot && id==='leifu')`，
  三处渲染器同步：`cardBody` / `forgeCardHTML` / `handCardHTML`。
- **③ 牌库铺展**（`原型.html` deck-grid + `js/60_boot.js` hsDeckPreview）：初始牌库「单行、列数=牌数、
  居中」；所有牌库查看「6 列 + 列隙 16px + 分布区左右各内缩 32px（2×隙）」，卡面随 1fr 缩小；矮屏档同步。
- **④ 图标**（`js/50_ui.js` outHudSync L1108 + `原型.html` .out-ico/.bicon）：牌库图标改
  `素材/ui/deck_back.png`；锦囊/牌库两枚一起放大 1.5×（36px / 39px）。
- **⑤ 锦囊返回**（`js/50_ui.js` showJinnang/jinnangBack L2285-2320）：战局外**所有**场景都渲染在 #overlay 里，
  而 `showOverlay` 整块覆写 `#overlayContent` ⇒ 开锦囊即冲掉底下那层、返回落到 #app 战斗骨架。
  修法：开锦囊前快照（#overlay class + #overlayContent innerHTML），返回原样贴回 —— 一处覆盖
  锻造（篝火/道观）/商店/事件房/地图全部路径；锦囊内「用灵汁」重开本面板时不再覆盖快照。
- **⑥ 选角界面**（`js/50_ui.js` outHudSync）：显隐判据显式排除 `hero-scene`（选角屏挂 #overlay 但不改
  SCENE，只按 SCENE 判必漏）。
- **⑦ 特效尺寸**（`js/20_data.js` FX_SHEETS）：boss_vfx 那批（b1~b9，`_link` 除外）＋ 反伤
  `damage_reflect`/`thorns_light` ＋ `fudu_hit`/`guling_suck`/`relic_proc`/`lightning`，`scale 2.47→2.0`
  （面积约 -34%），fps 仍 30（时长仍约 1.07s）；`thorns`（1.98）低于 2.0，刻意不动。
- **⑧ 里程碑调试拉满（临时·发版必删）**（`js/50_ui.js` + `js/60_boot.js`）：`DEBUG_MAX_MILE` +
  `debugMaxMile()`，只顶 pts=999999、**绝不写 `SAVE.mileClaimed`** ⇒ 每档亮「可领取」，手点领取才验得到
  发放链路；60_boot 正式路径调用，无头沙箱（`window.innerWidth` 为 undefined）自跳过。

## 产物与五道闸（2026-10-14 v1.1.17）

- 单文件 `dist/志怪塔.html`：**90.36 MB**（14:48:46 重打，已含 v1.1.17）。
- 多文件 `dist/web/`（PWA）：`--split` **重打中**；TapTap 多文件 zip 随其后重产。
- **五道闸现状**：verify_dist 全部通过 / probe_dist bad=0 / run_smoke **pass=1532 fail=0** 已绿；
  **verify_web / _probe_cloud 待 --split 完成后再跑**。
- 注：verify_dist 的「36 个素材从未被游戏请求」是**静态扫描假报**（经 `assetURL(...)` 动态引用者扫不到），
  不是真未引用，闸仍判通过。

## 待用户定稿 / 给料（不动设计）

- **手机端卡顿诊断（本轮主线）**：用户真机读数 = longtask「出牌/召唤/众多特效释放那一下蹦几十~300ms」，
  FPS 在 **20~90 之间剧烈跳动**。判定 = **间歇性主线程阻塞尖峰**（图片解码 + DOM 节点构建 + 合成层创建
  在主线程同步做），不是稳态像素填充瓶颈（否则 FPS 会持续低而非跳到 90）。
  → **v1.1.17 已落地代码层三项**（见顶部快照）；② 音频缓存经核查早已存在，故实做 ① 预热 + ③ 降并发。
  待用户拿 **TapTap 多文件包**真机复测 FPS / 最长帧 / longtask 是否收敛。
- **TapTap 多文件 zip**：**待用户真机试传/复测**；若不认 SW，第一排查方向 = 剥离 PWA 组件。
- **里程碑调试开关 `DEBUG_MAX_MILE`**：**正式发版前必须移除**（连同 60_boot 里那行调用）。
- 线上「榜不存在」是 TapTap 开发者中心尚未建 6 个榜（`RANK_IDS` 在 `js/55_cloud.js` L536-554，逐字已核对）。

## 外部资源与文档

- ffmpeg 在 WinGet 包路径下（音频转 mp3 用）。
- 设计文档（工程根）：美术设计要求.md、特效接入对照表.md、遗物设计.md、里程碑奖励设计.md、
  数值表.md、卡牌机制数据总表_v062.md、9大Boss设计表.md、敌人数据总表.md。
- 构建日志：`_build_log_single.txt` / `_build_log_split.txt`（未跟踪临时文件）。
- ⚠️ `gen_fx_pack.py / gen_rank_font.py / gen_summon_smoke.py / gen_thorns_fx.py` 会生成已被删除的
  孤立 fx，**不要随便运行**，保持未跟踪、不提交。

## 沙箱注意（本机 Trae）

- 工程目录**不在**沙箱可写白名单内：凡写工程目录（`python 打包.py …`、写 dist/、改 js/、git add/commit）
  的命令都需 `dangerouslyDisableSandbox: true`；纯读可留在沙箱。
- 打包请用**后台**执行（12~18 分钟/单文件，拆包更久）；`Tee-Object | Select-Object -Last` 组合的
  日志要等进程结束才落盘，中途看 output.log 为空属正常。

## Next Steps

1. 等 `--split` 完成 → 跑 **verify_web** + `_probe_cloud`（补齐第五道闸）。
2. `--taptap-split` 重产 TapTap 多文件 zip → 交用户真机复测卡顿（看 FPS / 最长帧 / longtask）。
3. git 提交 + 推送 **v1.1.17**（**单独提交**，不混进 v1.1.16 `071a4a9`），并一并提交 memory-bank 两份文档。
4. 正式发版前移除 `DEBUG_MAX_MILE` 调试开关（连同 60_boot 里那行调用）。
5. 每轮改完：8 段 JS 各自 `node --check` → 重打产物 → 五道闸 → git 保存。
