# Project Progress

## Completed Milestones
- [Milestone 1] - [Date]
- [Milestone 2] - [Date]

## Pending Milestones
- [Milestone 3] - [Expected date]
- [Milestone 4] - [Expected date]

## Update History

### [Aug 27, 2026, 10:28 AM] 🐛 Fix: v0.44：修手机适配+存档bug+补素材规格
<!-- ID: p_2026-08-27_mtawm2ot -->

①手机端适配：viewport 加 user-scalable=no+maximum-scale=1.0+viewport-fit=cover；body 加 touch-action:manipulation+overscroll-behavior:none；card/hand 加 touch-action:none 防止拖拽时页面滚动；新增 @media(max-width:520px) 和 @media(max-width:360px) 两档响应式（地图节点缩小、卡牌缩小、手牌重叠缩小、面板 padding 缩小、按钮/弹窗/过场动画适配手机屏）。②修复有存档时开始新游戏失败：confirmNewGame 加 try-catch+hideOverlay 再 showHeroSelect，防止覆盖层冲突导致卡死。③素材/README.md 补全格式/分辨率/大小限制总表（BGM 44.1kHz/≤2MB、背景 1920×1080/≤500KB、敌人立绘 512×512/≤200KB、卡牌插画 256×256/≤80KB、遗物图标 128×128/≤50KB）+ 包体总量预估（微信小游戏首包≤4MB/总包≤20MB，素材总量目标 10~15MB）。

**Tags:** `fix`, `mobile`, `assets`, `docs`

---

- [Date] - [Update]
- [Date] - [Update]
