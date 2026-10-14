# Current Context

> 本文件 2026-10-14 由接手 agent **四次刷新**（v1.1.15 落地后）。
> 工程根：`C:\Users\HP\Desktop\志怪塔 - 副本 (3)`（换机整文件夹连同 .git 一起拷）。
> 版本 **v1.1.15**，分支 main（HEAD 见 `git log`，本版提交在 e8e2a23 之后）。

## 当前快照（2026-10-14 v1.1.15）

按 `specs/spec.md` + `specs/tasks.md`（A→H）整轮落地，三块主线 + 一批低耦合：

- **存档单档化（Q1~Q7）**：`js/40_flow.js` 新增 `newestRunSlot / normalizeSingleRunSave /
  rehydrateRunForSettle / settleOverwrittenRun`，`settleResultHTML` 增 `'abandon'` 分支
  （只有「返回」回选角界面，无免费复活）；`js/60_boot.js` 的 `startGame` 收敛为
  `ensureAudio + confirmNewGame`，旧多槽面板六函数（openSaves/slotRowHTML/showSavesPanel/
  resumeSlot/newRunInSlot/deleteSlot）整块删除；`原型.html` 新增 `#overlay.overwrite-scene`
  纯文字样式族（ow-title/ow-warn/ow-info/ow-actions/ow-btn，无边框无纯色底板）。
- **多段攻击牌逐段平增减半（Q8/Q9/Q10）**：`js/30_engine.js` 新增全局 `SEG_HALVE`（L107），
  `calcDamageTo` 窗口内 attackBuff/turnAtkBuff 各 ⌊/2⌋；`CARD_SEGS`（L386-390）给预览段数。
  三张多段牌（雷谴符 / 斩妖剑·天师列 / 钟馗镇魂·天师列）eff 结算窗口 try/finally 置位
  （`js/20_data.js`）。敌人 multi 走 dealDamageToPlayer 天然免疫（Q10）。
  开天眼 t()/ts()、焚身咒 t()、金刚酒/朱砂笔 desc 均写明减半后数值。
- **boss_vfx 换新规格**：46 张精灵图全部换成 3840×1920（8 列 × 4 行、单帧 480×480），
  `FX_SHEETS` 46 条的 `ch` 字段删除（正方形格不写 ch）；`打包.py` 的 `FX_SPLIT_ROWS`
  显式给 4 不变（防未来换非方格静默错切）；lightning/damage_reflect 仍 480×720 保留 ch:1.5。
- **低耦合批**：复活 BGM 修复、里程碑进度条连续插值、符纸位置上移、初始牌组+牌库 6 列、
  锦囊/牌堆图标、地图类型图标换 `素材/map/guanqia-logo/`（旧 map/{boss,combat,ellite,rest,unknown}.png 已删）。
- **版本号**：`原型.html` <title> = v1.1.15（唯一落点；提交.py 从这里读；README.txt 里程碑表同步）。

## 产物与五道闸（2026-10-14 全绿基线）

- 单文件 `dist/志怪塔.html`：**90.36 MB**（素材 883 → 66.21 MB；fx 85 张按排 390 键；脚本 940→783 KB 混淆）。
- 多文件 `dist/web/`：**70.3 MB**（index.html 1,316,126 B；sw 版本 66b8b4f8de；图标 4 张）。
- TapTap 多文件 `dist/志怪塔_TapTap包体_多文件.zip`：**67.64 MB / 593 文件**（game/* 相对路径，自检通过）。
- **五道闸基线 = 全绿**：verify_dist 全部通过（37 个「未引用」为动态引用假报，见下）/
  probe_dist bad=0 / verify_web 全部通过 / _probe_cloud 全部通过 / run_smoke **pass=1519 fail=0**
  （旧基线 1502；+17 = 11 条 SEG_HALVE + 6 条存档单档化）。
- 注：verify_dist 的「37 个素材从未被游戏请求」是**静态扫描假报**——选角图/logo/deck 图/结局视频海报等
  经 `assetURL(...)` 动态引用，扫描器看不到字符串字面量，**不是真未引用**，闸仍判通过。

## 待用户定稿 / 给料（不动设计）

- **6 个排行榜 ID 已逐字核对**（`js/55_cloud.js` L536-554 `RANK_IDS`）与用户给定完全一致。
  **线上「榜不存在」是 TapTap 开发者中心尚未建这 6 个榜**（平台侧动作，需用户去建）。
- **TapTap 多文件 zip**：本轮已随 v1.1.15 重产（67.64 MB），**待用户真机试传**；
  若不认 SW，第一排查方向 = 剥离 PWA 组件。
- boss_vfx 的 scale 暂用 **2.47**，等真机看效果再调。

## 外部资源与文档

- ffmpeg 在 WinGet 包路径下（音频转 mp3 用）。
- 设计文档（工程根）：美术设计要求.md、特效接入对照表.md、遗物设计.md、里程碑奖励设计.md、
  数值表.md、卡牌机制数据总表_v062.md、9大Boss设计表.md、敌人数据总表.md。
- 本轮改版规格：`specs/spec.md` + `specs/tasks.md`（A→H 依赖序，含 Q1~Q13 用户口径）。
- 构建日志：`_build_log_single.txt` / `_build_log_split.txt`（未跟踪临时文件）。
- ⚠️ `gen_fx_pack.py / gen_rank_font.py / gen_summon_smoke.py / gen_thorns_fx.py` 会生成已被删除的
  孤立 fx，**不要随便运行**，保持未跟踪、不提交。

## 沙箱注意（本机 Trae）

- 工程目录**不在**沙箱可写白名单内：凡写工程目录（`python 打包.py …`、写 dist/、改 js/、git add/commit）
  的命令都需 `dangerouslyDisableSandbox: true`；纯读可留在沙箱。
- 打包请用**后台**执行（12~18 分钟/单文件，拆包更久）；`Tee-Object | Select-Object -Last` 组合的
  日志要等进程结束才落盘，中途看 output.log 为空属正常。

## Next Steps

1. **待用户真机试传 TapTap 多文件 zip**，结果回填 decision-log 与 progress。
2. 用户侧：在 TapTap 开发者中心建 6 个排行榜（ID 见上），线上榜单即可显示。
3. 每轮改完：8 段 JS 各自 `node --check` → 重打产物 → 五道闸 → git 保存。
