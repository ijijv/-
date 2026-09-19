# -*- coding: utf-8 -*-
# v0.61.06 更新日志条目（三个 Cocos 接缝 + 可播种随机）
import io, sys

P = r"C:\Users\HP\Desktop\志怪塔\更新日志.md"
s = io.open(P, 'r', encoding='utf-8').read()

ANCHOR = """> 每条对应一次 git 提交。查看方式：`git log --oneline`，或 `python 提交.py --log`。

"""
NEW = ANCHOR + """## v0.61.06 三个接缝收口：存储 / 随机 / 广告位（2026-09-19）
> 批1.5 挂账的那部分。v0.61.05 是**纯搬移**，这一版**是真改行为**，所以单独提交 —— 这样重构那次提交仍然可二分定位。

**① 存储薄封装 `Store`**（`js/00_base.js`）
12 处 `localStorage` 读写全部收进 `Store.get/set/del/getJSON/setJSON`，**键名一字未变**（`zhiguaitower_run_v1` / `_save_v1` / `_settings_v1` / `_tutorial_v1`），老存档照常能读。微信/Cocos 阶段只换这一个对象，游戏逻辑不用动。
- 顺带好处：原先 5 处 `JSON.parse(...)` 各自散落在 `try/catch` 里，现在坏数据统一返回 `null`（有断言守着）

**② 可播种随机 `rng()`**（`js/00_base.js`，mulberry32）
25 处**玩法**随机（洗牌 / 卡牌掉落稀有度 / 遗物掉落 / 药水 / 词缀 / 无尽层随机 / 咒雨伤害分配 / 随机弃牌 / 生死簿记罪状 …）从 `Math.random` 改走 `rng()`。
- **唯一保留 `Math.random` 的是 `js/10_audio.js` 的噪声缓冲**——那是纯听感的白噪声，跟对局无关，也**不该**被种子影响
- 取种子那一下用真随机（`Date.now() ^ Math.random()`），种子本身不参与复现
- **种子随存档落盘**：`saveRun` 多写一个 `rng:{s,n}`，`continueRun` 先 `rngRestore` 再重放判定 → 续档前后牌序与掉落一致
- 老存档没有 `rng` 字段 → 退回新种子，不报错（只是那一局不再可复现）
- **调试接缝**：地址后加 `?seed=12345` 即可复现同一副牌序（复现玩家报障 / 批2 仿真器都要用）

**③ 广告位唯一入口 `AdSlot`**（`js/00_base.js`）
4 个激励点位（奖励翻倍 / 复活 / 签到翻倍 / 开局重随）全部经 `AdSlot.request(id, reward)`；`adPlaceholder()` 退化成它的转发壳，**调用点一行没动**。`AD_SLOTS` 登记了这 4 个 id，来路不明的 id 会在日志里提示。Cocos 版只换 `request` 内部为 `wx.createRewardedVideoAd(id)`。

**验收**
- 冒烟 **582 → 604 全绿**（新增 22 条：同种子同序列、快照续流、`?seed=` 解析、存档带随机态、续档恢复、Store 往返/坏数据/del、键名未变、玩法代码不再直接摸 `localStorage`、4 个广告位齐全）
- 真浏览器（headless Chrome，`file://`）打开 `原型.html`：7 个脚本全加载、控制台无报错、起始界面完整渲染（版本已是 v0.61.06）
- 反向确认：`python _patch/verify_v61_05.py` **现在如预期失败**（首差 @25 = 新增的基础设施段）—— 说明代码真的变了，不再是纯搬移；v0.61.05 那次提交的重构结论不受影响
- 版本号 v0.61.05 → **v0.61.06**

**下一小步**：批2 平衡（P1~P15 已逐条拍板）+ 轻量战斗仿真器（`rng` 就位后仿测可复现）

"""
if s.count(ANCHOR) != 1:
    print('ANCHOR FAIL: %d 次' % s.count(ANCHOR)); sys.exit(1)
io.open(P, 'w', encoding='utf-8', newline='').write(s.replace(ANCHOR, NEW, 1))
print('CHANGELOG v0.61.06 DONE')
