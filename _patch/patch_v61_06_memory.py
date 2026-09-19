# -*- coding: utf-8 -*-
# 记忆追加：v0.61.06 三个接缝（Store / rng / AdSlot）
import io

P = r"C:\Users\HP\.claude\projects\C--Users-HP\memory\zhiguai-tower-game.md"
s = io.open(P, 'r', encoding='utf-8').read()

ADD = r"""

**v0.61.06 三个接缝收口已落地（2026-09-19，冒烟 604/0）**：批1.5 挂账的那部分，**单独提交**（v0.61.05 是纯搬移、这版真改行为，分开才可二分定位）。三样都在 `js/00_base.js` 顶部新增的「基础设施」段里：
① **`Store`**：12 处 localStorage 读写全收进来（`get/set/del/getJSON/setJSON`），**键名一字未变**（`zhiguaitower_run_v1`/`_save_v1`/`_settings_v1`/`_tutorial_v1`）→ 老存档照常读；坏 JSON 统一返回 null。
② **`rng()`**（mulberry32）：25 处**玩法**随机从 `Math.random` 改走 rng（洗牌/卡牌稀有度/遗物/药水/词缀/无尽层/咒雨伤害分配/随机弃牌/生死簿记罪状…）。**唯一故意留在 `Math.random` 的是 `js/10_audio.js` 的噪声缓冲**（纯听感，不该被种子影响）——今后有人问「为什么这里还是 Math.random」，答案就是这个，别顺手改掉。取种子那一下也用真随机。种子随存档落盘（`saveRun` 多写 `rng:{s,n}`，`continueRun` 先 `rngRestore`），老存档没这字段就退回新种子不报错。**调试接缝 `?seed=12345`**（`rngSeedNow()` 读 `location.search`）——复现玩家报障和批2 仿真器都靠它。
③ **`AdSlot`**：`AD_SLOTS = ['奖励翻倍','复活','签到翻倍','开局重随']`，4 个激励点位都走 `AdSlot.request(id, reward)`；`adPlaceholder()` 退化成转发壳（**4 个调用点一行没动**）。Cocos 版只换 request 内部。
**反向验收**：`python _patch/verify_v61_05.py` 现在**如预期失败**（首差 @25 = 新增基础设施段）——这不是回归，是「代码真的变了」的证明，勿当 bug 修。
**冒烟 runner 新增**：`var __realSaveRun = saveRun;` 捕获（在 `saveRun = __sil` stub **之前**，位置很关键）；新增 22 条断言，含「玩法代码不再直接摸 localStorage」「键名未变」「?seed= 两局一致」「存档带随机态」。
**下一步**：批2 平衡（P1~P15 已逐条拍板）+ 轻量战斗仿真器（复用 smoke_host 的 VM 桩 + 贪心 AI，rng 就位后可复现）。
"""

io.open(P, 'a', encoding='utf-8', newline='').write(ADD)
print('MEMORY v0.61.06 APPENDED')
