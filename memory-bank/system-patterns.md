# System Patterns

## Architecture Patterns

- 纯前端单页，无构建工具、无 npm 依赖链（`_build/` 仅打包时混淆用）。
  入口 `原型.html`，只含 8 个 `<script src="js/*.js">` 外链：
  `00_base → 10_audio → 20_data → 30_engine → 40_flow → 50_ui → 55_cloud → 60_boot`。
- 8 段 JS 是**同作用域顺序拼接执行，不是模块**：顶层函数/变量跨段直接可见，没有 import/export。
  改完**每一段**都必须 `node --check js/<文件名>`。
- 无头冒烟（node 沙箱）下 `window.innerWidth` 不存在 ⇒ `animLive()` 恒假；
  任何 DOM/定时器/raf 代码都必须有 animLive 类守卫，保证沙箱能干净退出。
- 存档：localStorage 三槽 + 云存档适配层（55_cloud.js，72 个顶层函数，打包时有"全部在产物里"自检）。
- 素材寻址：开发树走相对路径（要 http 服务，file:// 会被拦）；
  打包单文件走 ASSET_MAP 的 data: URI（file:// 下也能取到）；
  --split 走 `ASSET_WEBP=true` + 图片改名 .webp 的相对路径。

## 每轮工作流（硬规矩）

1. 改 JS → 8 段逐一 `node --check`。
2. 重打产物（三口径按需）：
   - `python 打包.py`        单文件 → `dist/志怪塔.html`（自包含，双击可玩）
   - `python 打包.py --split` 多文件 + PWA → `dist/web/`（必须 http，不能 file://）
   - `python 打包.py --taptap` 先单文件再压 → `dist/志怪塔_TapTap包体.zip`（zip 内仅 game/index.html）
   - `python 打包.py --taptap-split`（v1.1.11 新增）把 `dist/web/` 整体压 → `dist/志怪塔_TapTap包体_多文件.zip`
     （zip 内 game/* 相对路径：js/ + 素材/(webp) + manifest + sw.js + icons/）；单文件口径不受影响。
     合规自检同单文件版（第一级唯一纯英文/数字文件夹 + game/index.html）。**待真机验证相对路径可用性**。
   注意：重定向日志是块缓冲，进程不结束看不到输出；耗时以 2026-10-13 实测约 29 分钟/口径为准。
3. 五道闸（工程根按序跑，当前冒烟基线 pass=1499 fail=0）：
   `python _patch/verify_dist.py`（单文件静态闸）
   → `python _patch/probe_dist.py`（单文件行为闸）
   → `python _patch/verify_web.py`（拆包产物闸）
   → `node _patch/_probe_cloud.js`（云存档适配层 VM 断言）
   → `python _patch/run_smoke.py`（冒烟）
4. 每轮更新后 git 保存；正式验收前抹去游戏内开发者痕迹。

## 平台硬约束

- 同时支持手机端与网页端；关键操作手机端必须可达。
- 强制横屏：manifest `display:fullscreen + orientation:landscape`，
  首次点按尝试 screen.orientation.lock（失败静默），兜底 CSS 竖屏闸 #rotate-tip。
- PWA：manifest.webmanifest + sw.js（js/素材 cache-first，index 网络优先；
  注册后必须主动 reg.update()，换代后 reload 一次）。
- 游戏内含「性能读数」开关（SETTINGS.perfReadout，默认关；#perf-hud fixed + pointer-events:none，
  只用量帧间隔算 FPS，禁止包裹 render）。

## Code Patterns

- 数据在 20_data.js（CARDS/ENEMIES/RELICS…，makeEnemy 逐字段构造，新字段必须显式补上否则静默丢失）；
  机制在 30_engine.js；流程在 40_flow.js；DOM/UI 在 50_ui.js；接线在 60_boot.js。
- 事件接线优先 addEventListener 走闭包；HTML 内联 onclick 依赖打包时的全局名保护，易漏。
- 特效配置 FX_SHEETS（scale 必须 >0）；fx 整图 3840×2880 在单文件产物里按排切小图
  （FX_SPLIT_ROWS 控行数），手机端避免每出牌重解 11 Mpx。
- boss_vfx：`_cast` 挂 Boss、`_hit` 挂玩家、`_self` 挂 Boss、`_link` 两点间按 §1.3 公式横向平铺
  （N=ceil(d/480)，+X 指向 Boss，接缝像素一致可循环）。素材已按 Boss 在右朝左出图，不 flipX。
- 新增/改 CSS 后注意历史教训：CSS 注释不嵌套，注释里写出起止符会吞掉后续规则；
  verify_dist 有注释结构闸 + 「选择器前奏不许中文」闸，证合法性而非文本存在。

## Documentation Patterns

- `更新日志.md` 每条对应一次 git 提交（最权威历史，但 2026-10-13 时正文只到 v0.76.0，
  之后版本看 git log）。README.txt 的「版本里程碑」每版重写、只留一行摘要。
- 设计决定文档化在工程根各 md（数值表、卡牌机制数据总表_v062、遗物设计、里程碑奖励设计等）；
  原型本身也承担「设计规格书」角色（未来进 Cocos 只能搬设计决定，搬不了 CSS/JS）。
- memory-bank/ 随工程目录走（换机随文件夹/.git 带走）：active-context 记当前态，
  progress 按时间倒序追加，decision-log 记重大取舍。
