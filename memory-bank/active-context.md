# Current Context

> 本文件 2026-10-14 由接手 agent **三次刷新**。
> 工程根：`C:\Users\HP\Desktop\志怪塔 - 副本 (3)`（换机整文件夹连同 .git 一起拷）。
> 版本 **v1.1.13**，分支 main，HEAD = `e599f09`。

## 当前快照（2026-10-14 实测）

- HEAD `e599f09` = v1.1.13 **选角界面全面重构 + 排行榜导航回弹修复 + 选角音效接入**。
  上一提交 `3a0fa4d` = v1.1.12（boss_vfx 后 3 幕 b7/b8/b9 接入）。
- **本轮已提交改动（18 文件，+361/-122）**：
  - `js/60_boot.js`：重写 `showHeroSelect` 全套（`HS_ORDER=['tianshi','wuseng','ganshiren','yincha']`、
    `hsRootHTML/hsTalismansHTML/hsDeckHTML/hsApplyHero/hsPickTalisman/heroSelectStart/pickHero` 等），
    删除旧的 `askUnlockHero` / `showStarterDeckChoice` / `askChooseStarterDeck` / `chooseStarterDeck` /
    `backToStarterDeck`；`showOpeningChoice` 的 backFn 改指 `backToHeroSelect()`。
    排行榜导航回弹修复：`showClearTimes` 重排前捕获 `#rk-nav` scrollTop 并回填。
  - `原型.html`：新增 `.hs-*` CSS 段（L2677-2762，含 `--hs-move/--hs-drop=.46s`、`#overlay.hero-scene` 全屏去底、
    `hsBgDrop` 顶降落+回弹）；`.ml-flyimg` 52px → 80px（里程碑飞图标放大 2 倍）。
    ⚠️ 保留基档 L842 `#overlay.hero-scene #overlayWrap{max-width:700px;}`（verify_dist L810 要求成对）。
  - `js/10_audio.js`：注册 `talisman_click` / `talisman_slide` / `key_press` / `poster_bounce_land`；
    `SFX_KEYS` 113 → **117**。
  - `_patch/smoke_runner.js`：SFX 计数断言 113→117；旧 4 条 starter-deck 断言改为新 8 条选角断言。
- 新素材已入库：`素材/hero_sel/{tianshi,wuseng,ganshiren,yincha}-s.jpg`、
  `素材/ui/deck_back.png|deck_card1.png|deck_card2.png`、
  `素材/sfx/{key_press,poster_bounce_land,talisman_click,talisman_slide}.mp3`；
  另有 `素材/num/{block/2,hurt/1,hurt/2}.png` 被用户覆盖更新。

## 产物与五道闸（2026-10-14 全绿基线）

- 单文件 `dist/志怪塔.html`：96.38 MB，重打于 00:34:19。
- 多文件 `dist/web/index.html`：1,312,649 B，重打于 00:58:08（8 段 js + 素材/ + manifest + sw.js + icons/）。
- **五道闸基线 = 全绿**：
  1. `python _patch/run_smoke.py` → node exit 0，**pass=1502 fail=0**（旧基线 1499）。
  2. `python _patch/verify_dist.py` → 全部通过（EXIT=0）。
  3. `python _patch/probe_dist.py` → bad=0，A~G 全部通过（EXIT=0）。
  4. `python _patch/verify_web.py` → 全部通过（EXIT=0）。
  5. `node _patch/_probe_cloud.js` → 全部通过（EXIT=0）。
- 注：verify_dist 的「37 个素材从未被游戏请求」是**静态扫描假报**——新选角图/logo/deck 图经
  `const HS_BG/HS_LOGO` 映射 + `assetURL(...)` 动态引用，扫描器看不到字符串字面量，**不是真未引用**，闸仍判通过。

## 待用户定稿 / 给料（不动设计）

- **6 个排行榜 ID 已逐字核对**（`js/55_cloud.js` L536-554 `RANK_IDS`）与用户给定完全一致：
  total_score=`k74rffqopia2pn6tsb` / clear_tianshi=`xc3t2r13go0t8ykcma` /
  clear_ganshiren=`kxb793ucsscio9ol1l` / clear_wuseng=`u45n8mhpyr8eyvzop2` /
  clear_yincha=`n0uxtpk2vde3xt4mc1` / clear_total=`dgakiqz3gn7lb847ss`。
  **结论：代码侧无需改；线上「榜不存在」是 TapTap 开发者中心尚未建这 6 个榜**（平台侧动作，需用户去建）。
- **TapTap 多文件包**：脚本 `--taptap-split` 已就位、zip 已产出（62.71 MB / 557 文件），**待用户真机试传**。
  确认相对路径能跑后再定「是否切为默认口径」；若不认 SW，第一排查方向 = 剥离 PWA 组件。
- boss_vfx 的 scale 暂用 **2.47**，等真机看效果再调。

## 外部资源与文档

- ffmpeg 在 WinGet 包路径下（音频转 mp3 用）。
- 设计文档（工程根）：美术设计要求.md、特效接入对照表.md、遗物设计.md、里程碑奖励设计.md、
  数值表.md、卡牌机制数据总表_v062.md、9大Boss设计表.md、敌人数据总表.md。
- 构建日志：`_build_log_split.txt` / `_build_log_taptap.txt` / `_build_log_v1110.txt` / `_gates_log.txt`
  （均为未跟踪的临时文件；`_gates_log.txt` 是 v1.0.0 期的旧记录，别当成当前基线）。
- ⚠️ `gen_fx_pack.py / gen_rank_font.py / gen_summon_smoke.py / gen_thorns_fx.py` 会生成已被删除的
  孤立 fx，**不要随便运行**，保持未跟踪、不提交。

## 沙箱注意（本机 Trae）

- 工程目录**不在**沙箱可写白名单内：凡写工程目录（`python 打包.py …` 重定向日志、写 dist/、改 js/）
  的命令都需 `dangerouslyDisableSandbox: true`；纯读（git status、verify_dist 等）可留在沙箱。

## Next Steps

1. **待用户真机试传 TapTap 多文件 zip**，结果回填 decision-log 与 progress。
2. 用户侧：在 TapTap 开发者中心建 6 个排行榜（ID 见上），线上榜单即可显示。
3. **接入 boss_vfx 后 3 幕**（若尚未接入；v1.1.12 记录称已接，需与真机效果核对）：
   - b7 夜王、b8 修罗王、b9 阎罗天子的精灵图 + 专属音效，照前 6 幕接法；
     入库时 `打包.py` 的 `FX_SPLIT_ROWS` 照 4 追加这 12 条。
4. 每轮改完：8 段 JS 各自 `node --check` → 重打产物 → 五道闸 → git 保存。
