# Project Progress

## Completed Milestones
- [Milestone 1] - [Date]
- [Milestone 2] - [Date]

## Pending Milestones
- [Milestone 3] - [Expected date]
- [Milestone 4] - [Expected date]

## Update History

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
