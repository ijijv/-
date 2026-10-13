# Current Context

> 本文件 2026-10-13 由接手 agent **二次刷新**（修正上一版交接文的滞后期）。
> 工程根：`C:\Users\HP\Desktop\志怪塔 - 副本 (3)`（换机整文件夹连同 .git 一起拷）。
> 版本 **v1.1.10**，分支 main，HEAD = `95af340`。

## 当前快照（2026-10-13 接手实测）

- HEAD `95af340` = v1.1.10 boss_vfx 前 6 幕接入（34 张精灵图 + 19 条专属音效 + _link 平铺播放器）、
  打包脚本 FX_SPLIT_ROWS 扩展、verify_dist 按 ch 的几何闸。
- ⚠️ **上一版交接文（进度表里 12:30 那条）已滞后**：它写「工作区无已跟踪文件改动」，
  实际此后又干了活（13:07 起）。以本文件为准。
- **未提交改动（经复核是「完整功能」，不是半成品）—— 焚牌音效**：
  - `js/10_audio.js` L187-195 注册 `fx_forge`（锻造升级·火焰覆盖→风吹散）/ `fx_burn`
    （净坛·篝火删牌·左下烧到右上→化灰），各带合成兜底；`SFX_KEYS` 102 → **104**。
  - 接点 `js/50_ui.js` 的 `cardFxAnim`（L1496，L1503 起手帧出音）；
    调用点：`forgeCard`(L1486 kind=forge) / `doUnknownRemove`(L853 kind=pile) / `doCampRemove`(L1454 kind=pile)。
  - CSS `.card.is-forging/.is-blown/.is-burning/.is-ash` 在 `原型.html` L1644-1672。
  - 真采样已交付：`素材/sfx/fx_forge.mp3`(12.7KB) / `素材/sfx/fx_burn.mp3`(28KB)。
  - 冒烟断言 `_patch/smoke_runner.js` 已同步 102 → 104。
- 单文件产物 `dist/志怪塔.html`（13:43 重打，88.1 MB，ASSET_MAP **811 键** / 154 sfx）已过四道：
  verify_dist「全部通过」/ probe_dist bad=0 / `_probe_cloud.js` 全部通过 / run_smoke **pass=1499 fail=0**。
- `dist/web/` 此前**不完整**（只有 `素材/`，缺 index.html 与 js/ —— 上一轮 `--split` 中途断了）；
  本轮已重跑 `python 打包.py --split`（后台），完成后跑 verify_web。

## 本轮新改动（2026-10-13 接手 agent）

- `打包.py` 新增 `--taptap-split`：把 `dist/web/` 整体压成 `dist/志怪塔_TapTap包体_多文件.zip`
  （zip 内均为 `game/*` 相对路径），保留既有合规自检
  （第一级唯一纯英文/数字文件夹 + 其下 game/index.html）；单文件口径 `--taptap` 不动、互不覆盖。
  触点：`TAPTAP_SPLIT_OUT` 常量、`build_taptap_split()`、`main()`。
  ⚠️ **待真机验证**：TapTap H5 容器对包内相对路径（js/、素材/、manifest、sw.js）的支持尚未证实。

## 进行中

- ✅ `--split` 后台重打完成（dist/web/ 完整：8 段 js + 素材/ + index.html + manifest + sw.js + icons/）。
- ✅ **五道闸全绿确认基线**：verify_dist「全部通过」/ probe_dist bad=0 / verify_web「全部通过」/
  `_probe_cloud.js` 全部通过 / run_smoke **pass=1499 fail=0**。
- ✅ **多文件 TapTap 包已产出**：`dist/志怪塔_TapTap包体_多文件.zip`（62.71 MB / 557 文件）。
  包内自检：第一级唯一 `game`（纯英文）/ `game/index.html` 在 / 脚本 `js/*.js` 相对外链 /
  `manifest.webmanifest`+`sw.js`+`icons/`+`素材/` 均在 game/ 下 / ASSET_WEBP=true / 无绝对路径泄漏。
  **待用户真机试传**（第①步），结果需回填 decision-log。

## 接手第一批（未做 / 更新）

1. ~~**TapTap 多文件包**~~：脚本已就位、zip 已产出，**待真机试传**。
   确认相对路径能跑后再定「是否切为默认口径」；若不认 SW，第一排查方向 = 剥离 PWA 组件
   （只留 index.html + js/ + 素材/）。试传结果回填 decision-log 与 progress。
2. **boss_vfx 后 3 幕接入**（照前 6 幕 b1~b6 的接法）：
   - b7 夜王：`b7_yewang_attack_blade_cast/_hit`、`b7_yewang_pressure_hit`
   - b8 修罗王：`b8_xiuluo_attack_slash_cast/_hit`、`b8_xiuluo_backlash_self`、`b8_xiuluo_karma_fire_self`
   - b9 阎罗天子：`b9_yanluo_affix_self`、`b9_yanluo_attack_smash_cast/_hit`、
     `b9_yanluo_revive_self`、`b9_yanluo_summon_yinchai_self`
   资产源 `C:\Users\HP\deepseekharness\boss_vfx\`，README.md 是权威（接入规则、§1.3 _link 平铺公式、
   46 段特效 + 40 音效清单）。入库时 `打包.py` 的 `FX_SPLIT_ROWS` 照 4 追加这 12 条。

## 待用户定稿 / 给料（不动设计）

- 纯色背景板场景清单：已交付，等用户定风格。
- ~~两类焚牌音效（锻造升级 / 净坛·篝火删牌）~~：**已交付并接入**（见上）。
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

1. 等 `--split` 跑完 → `python _patch/verify_web.py` 全绿，确认基线。
2. `python 打包.py --taptap-split` → 产多文件 zip → 交用户真机试传。
3. git 提交回退点（焚牌音效 + 打包脚本 + memory-bank 刷新）。
4. 接 boss_vfx 后 3 幕。
5. 每轮改完：8 段 JS 各自 `node --check` → 重打产物 → 五道闸 → git 保存。