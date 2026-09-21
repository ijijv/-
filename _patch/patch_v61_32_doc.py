# -*- coding: utf-8 -*-
"""v0.61.32 文档收口：素材清单.md 从「🔗37 / ⏳32」更新为「🔗69 / ⏳0」。

依据（全部本次 grep 复核过，不是推断）：
  32 条待接线键**逐条 grep 到了真实调用点**（含表驱动与三元的那 14 条）：
    · CARD_SFX / cardSfxFor → atk_slash atk_talisman atk_blunt atk_aoe card_buff（30_engine.js:964）
    · RELIC_SFX / relicSfxFor → relic_bell relic_fu relic_mirror（50_ui.js:170/394）
    · gainBlock 的三元 → card_defense（30_engine.js:355）
    · 其余 20 条为直接 sfx('key') 调用
  故 §1.3 的 32 个 ◻ 与 §1.6 的 32 行 ⏳ 一并翻成 🔗，正文声明的条数同步改成 69/0。
  verify_sfx_doc.py 会核对「🔗+⏳+🚫 == 70」与正文声明的 69/0/1，所以三处必须同批改。

顺带修掉 3 处文档与代码不符（以代码为准，如实记进 §1.4 脚注，不改代码）：
  · 敌人意图表 weak/gouhun 仍写 enemy_debuff → 实为 kw_weak / kw_gouhun
  · 敌人意图表 yehuo 仍写 enemy_buff_self → 实为 boss_yehuo（本次唯一真正的过时行）
  · §1.4(a) 噬魂术/嗜血/万剑归宗 三行的键名与 CARD_SFX 不一致

并如实标注 2 处**故意不接**（不谎报为已接线）：
  · kw_curse 的「每回合末 -2」—— 本作诅咒不自动跳伤，无此机制
  · ui_panel 的「自动存档提示」—— persistSave 调用极频繁，挂上去会吵
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOC = os.path.join(ROOT, '素材清单.md')

raw = io.open(DOC, encoding='utf-8').read()
nl = '\r\n' if '\r\n' in raw else '\n'
body = raw.replace('\r\n', '\n')
orig = body

errs = []


def rep(old, new, want=1, tag=''):
    global body
    n = body.count(old)
    if n != want:
        errs.append('%s 锚点命中 %d 次，期望 %d 次' % (tag or old[:40].replace('\n', '\\n'), n, want))
        return
    body = body.replace(old, new)


# ── 1. §1.3 的 32 个 ◻ → 🔗（只改条目标题，`** ◻` 全库仅这 32 处）──
n_box = body.count('** ◻')
if n_box != 32:
    errs.append('§1.3 的 ** ◻ 有 %d 处，期望 32 处' % n_box)
else:
    body = body.replace('** ◻', '** 🔗')

# ── 2. §1.6 的 32 行 ⏳ → 🔗（` ⏳ |` 只出现在交付行的标记格里，正文那 3 处不带「 |」）──
n_todo = body.count(' ⏳ |')
if n_todo != 32:
    errs.append('§1.6 的 ` ⏳ |` 有 %d 处，期望 32 处' % n_todo)
else:
    body = body.replace(' ⏳ |', ' 🔗 |')

# ── 3. §1.3 legend（原文说「其余为待接线」，现已归零）──
rep('> 条目标题里的反引号词 = 交付文件名前缀。标 🔗 的是**本批已接线、交付即生效**；其余为待接线。',
    '> 条目标题里的反引号词 = 交付文件名前缀。标 🔗 的是**代码里已有调用点、交付即生效**；\n'
    '> v0.61.32 起 69 条**全部接线完毕**，仅遗留键 `hit` 没有调用点（见 §1.6 说明）。',
    tag='§1.3 legend')

# ── 4. §1.6 正文声明的条数（verify_sfx_doc.py 逐字核对这三行）──
rep('> 其中 **🔗 已接线 37 条**（交付即生效）、**⏳ 待接线 32 条**（采样先能到位，缺的只是触发点）、',
    '> 其中 **🔗 已接线 69 条**（交付即生效）、**⏳ 待接线 0 条**（v0.61.32 已把余下 32 条全部接线完毕）、',
    tag='§1.6 条数声明')

rep('> 图例：**🔗** 代码里已有调用点，交付同名文件立刻能听到 ｜ **⏳** 已入表待接线',
    '> 图例：**🔗** 代码里已有调用点，交付同名文件立刻能听到 ｜ **⏳** 已入表待接线（本清单已归零）',
    tag='§1.6 图例')

# ── 5. 「合计本批真出声」段：补 v0.61.32 追平说明 ──
rep('> **合计本批真出声 = 26 新增 + 11 现有 = 37 条**（其余 33 条入表待接线 = 32 条待接线 + 1 条退役的遗留键 `hit`，交付后我按第二批补接线）。',
    '> **合计本批真出声 = 26 新增 + 11 现有 = 37 条**。\n'
    '>\n'
    '> **v0.61.32 追平**：余下 **32 条已全部接线**，收口在 8 个点上 ——\n'
    '> `gainBlock`（11 张防御牌 → `card_defense`）、`addSummon`（→ `card_summon`）、`gainRage`（→ `card_xuenu`，\n'
    '> 且满 10 层不再发声）、`sealEnemy`/`charmEnemy`（→ `card_zhenhun`/`card_charm` + `kw_linghua`）、\n'
    '> `addJunkToHand`（→ `kw_junk`）、`CARD_SFX`（22 张牌点名的施法/斩击/钝击/群伤/自我强化）、\n'
    '> `RELIC_SFX`（12 件遗物分铃/符/镜三类）、`dealDamageTo` 碎盾（→ `kw_shield_break`）。\n'
    '> 加上 1 条退役的遗留键 `hit`，70 条里 **69 条已有调用点** —— 交付同名文件立刻能听到，不必再等第二批。',
    tag='合计真出声段')

# ── 6. §1.5 优先级表：第二/三批的「需要我先补接线代码」已不成立 ──
rep('| **第一批** | **26 条** | **本批代码已接线**，见下表 —— 拿到文件**立刻能听到** | 覆盖玩家 90% 的操作反馈；且每条都已有代码调用点，零额外改动 |\n'
    '| 第二批 | 约 20 条 | 卡牌机制细分（B1~B4）、状态 tick（E 组）、Boss 专属（G3/G4/G5）、遗物分化（I 组） | 需要我先补接线代码；建议等第一批听过、确定风格后再买 |\n'
    '| 第三批 | 约 24 条 | 面板/升级/成就/无尽（H 组剩余）、魅惑/镇魂/消耗等长尾 | 长尾，可以最后用 AI 批量生成补齐 |',
    '| **第一批** | **26 条** | **代码已接线**，见下表 —— 拿到文件**立刻能听到** | 覆盖玩家 90% 的操作反馈；且每条都已有代码调用点，零额外改动 |\n'
    '| 第二批 | 约 20 条 | 卡牌机制细分（B1~B4）、状态 tick（E 组）、Boss 专属（G3/G4/G5）、遗物分化（I 组） | **v0.61.32 起也已接线**（交付即生效）；排第二批只是「建议等第一批听过、定下风格后再买」 |\n'
    '| 第三批 | 约 24 条 | 面板/升级/成就/无尽（H 组剩余）、魅惑/镇魂/消耗等长尾 | **v0.61.32 起也已接线**；长尾，可以最后用 AI 批量生成补齐 |',
    tag='§1.5 优先级表')

# ── 7. 「怎么开始」1~3 条重写：32 条不再是「待接线」──
rep('1. **先只做 🔗 那 37 条** —— 交付同名文件立刻能听到，零额外代码改动。你已经放好了其中 26 个（标 ✅ 的）。\n'
    '2. 补掉 🔗 里还缺的 11 条：`hurt` `block` `death` `card` `heal` `gold` `relic` `win` `lose` `boss` `error`。\n'
    '3. **⏳ 那 32 条可以现在就做**：采样层是先试文件、没有再回退合成，**文件放进去就有声**，\n'
    '   缺的只是「触发点」—— 我补完接线它们立刻全部生效。所以先做不吃亏。',
    '1. **70 条现在全部可做**（唯一例外是遗留键 `hit`）—— 采样层是先试文件、没有再回退合成，**文件放进去就有声**。\n'
    '   你已经放好了其中 26 个（标 ✅ 的）。\n'
    '2. 补掉还缺的 11 条高频键：`hurt` `block` `death` `card` `heal` `gold` `relic` `win` `lose` `boss` `error`。\n'
    '3. **其余 32 条 v0.61.32 已全部接线**（原计划排在第二/三批）—— 交付同名文件立刻能听到，不必再等。',
    tag='怎么开始 1~3')

# ── 8. §1.4(b) 敌人意图表：weak / gouhun 拆键 ──
rep('| `weak` | `enemy_debuff` | 狐妖、判官、夜王（暗夜威压） |\n'
    '| `gouhun` | `enemy_debuff` | 白无常、必安、谢必安、忘川鬼、拘魂使、阎罗 |',
    '| `weak` | `kw_weak` | 狐妖、判官、夜王（暗夜威压） |\n'
    '| `gouhun` | `kw_gouhun` | 白无常、必安、谢必安、忘川鬼、拘魂使、阎罗 |',
    tag='意图表 weak/gouhun')

# ── 9. §1.4(b) wangyou 补注 + yehuo 改键（本次唯一真正的过时行）+ 表尾脚注 ──
rep('| `wangyou` | `enemy_debuff` | 孟婆 |\n'
    '| `yehuo` | `enemy_buff_self` | 修罗王 |',
    '| `wangyou` | `enemy_debuff`（奉汤）+ `kw_wangyou`（你饮下那一刻） | 孟婆 |\n'
    '| `yehuo` | `boss_yehuo` | 修罗王 |',
    tag='意图表 wangyou/yehuo')

rep('| `aoe` | 预留（复用 `enemy_attack`） | **当前无敌人使用** |',
    '| `aoe` | 预留（复用 `enemy_attack`） | **当前无敌人使用** |\n'
    '\n'
    '> **v0.61.32 拆键说明**：`weak` / `gouhun` 原本笼统走 `enemy_debuff`，现各自独立（一条键覆盖全部同类敌人）；\n'
    '> `yehuo` 从 `enemy_buff_self` 改走 Boss 专属 `boss_yehuo`；`jiming` 从静默改走 `boss_ledger`。\n'
    '> 连带结果是 `enemy_buff_self` **只**在词缀（再生 / 屏壁 / 刚体 / 灵化）附上那一刻响，见 C9。\n'
    '> 原 `enemy_debuff` 仍由 `discard` / `burn` / `wangyou`（奉汤）三条使用。',
    tag='意图表脚注')

# ── 10. C9 范围重写（yehuo/jiming 已各有其声）──
rep('**C9 · `enemy_buff_self` · 敌人自我强化 / 附体** 🔗\n'
    '- 范围：`yehuo`（修罗王业火附体）、`jiming`（判官王记名——见 G4）、以及 再生 / 屏壁 / 刚体 / 灵化 词缀生效的那一刻',
    '**C9 · `enemy_buff_self` · 敌人自我强化 / 附体** 🔗\n'
    '- 范围：**只**在 再生 / 屏壁 / 刚体 / 灵化 词缀附上那一刻（`makeEnemy`；同场多敌用 `sfxOnce` 限流，免得叠成和弦）\n'
    '- v0.61.32 拆键：`yehuo`（修罗王业火附体）改走 Boss 专属 `boss_yehuo`、`jiming`（判官王记名）改走 `boss_ledger`\n'
    '  —— 这两条原本借本键出声，现在各有其声，本键不再覆盖它们（否则修罗王附体会同时响两个音）',
    tag='C9 范围')

# ── 11. §1.6 第 24 行用途同步 ──
rep('| 24 | `enemy_buff_self_1.mp3` ✅🔗 | 敌人自我强化/附体：`yehuo`(修罗王)、`jiming`(判官王)，以及再生/屏壁/刚体/灵化词缀生效那一刻 |',
    '| 24 | `enemy_buff_self_1.mp3` ✅🔗 | 词缀附上那一刻：再生 / 屏壁 / 刚体 / 灵化（v0.61.32 拆键后；`yehuo`→`boss_yehuo`、`jiming`→`boss_ledger` 各有专属音） |',
    tag='§1.6 第24行')

# ── 12. §1.4(a) 三行与 CARD_SFX 对齐（以代码为准）──
rep('| 万剑归宗 | 攻 | `atk_slash` + `atk_aoe` + `card_curse` |',
    '| 万剑归宗 | 攻 | `atk_talisman` + `atk_aoe` + `card_curse` |',
    tag='§1.4(a) 万剑归宗')

rep('| 噬魂术 | 攻 | `atk_talisman` + `kw_curse`(引爆) |',
    '| 噬魂术 | 攻 | `atk_slash` + `kw_curse`(引爆) |',
    tag='§1.4(a) 噬魂术')

rep('| 嗜血 | 攻 | `hit_heavy` + `heal` |',
    '| 嗜血 | 攻 | `atk_slash` + `heal` |',
    tag='§1.4(a) 嗜血')

rep('> **诅咒牌 8 张**（`KEYWORDS` 明列）：火符、万剑归宗、桃木符、蚀魂咒、舍身、焚符、咒印、咒雨 —— 全部用 `card_curse`。',
    '> **诅咒牌 8 张**（`KEYWORDS` 明列）：火符、万剑归宗、桃木符、蚀魂咒、舍身、焚符、咒印、咒雨 —— 全部用 `card_curse`。\n'
    '\n'
    '> **v0.61.32 归组判断（3 条，以代码为准）**：`噬魂术` / `嗜血` 归 `atk_slash`（夺魂、吸血都是贴身一击，\n'
    '> 不是符纸法术）；`万剑归宗` 归 `atk_talisman`（全屏剑雨，按法术段处理）。三处都与本节原写法不同。\n'
    '> **不影响你要交付的文件**：`atk_slash` 与 `atk_talisman` 本来就在清单里、且都另有牌在用。',
    tag='§1.4(a) 脚注')

# ── 13. E2 kw_curse：如实标注「每回合末 -2」没接 ──
rep('**E2 · `kw_curse` · 诅咒结算 / 引爆** 🔗\n'
    '- 范围：诅咒（上限 6 层、每回合末 -2）、被 斩妖剑 / 噬魂术 / 咒印 引爆换伤害、蚀魂咒的层数转化',
    '**E2 · `kw_curse` · 诅咒结算 / 引爆** 🔗\n'
    '- 范围：被 斩妖剑 / 铁布衫(天师) / 噬魂术 / 百鬼夜行 / 钟馗镇魂 引爆换伤害、蚀魂咒的层数转化 —— **5 处已全部接线**\n'
    '- ⚠ v0.61.32 如实标注：原文写的「每回合末 -2」**没接**，因为**本作诅咒本来就不会自动跳伤**\n'
    '  （只在被引爆 / 转化时结算），没有这个机制可供挂钩 —— 不是漏做，是无处可做。',
    tag='E2 kw_curse')

# ── 14. H3 ui_panel：如实标注「自动存档提示」故意不接 ──
rep('**H3 · `ui_panel` · 面板开合 / 存档** 🔗\n'
    '- 范围：设置/图鉴/成就/牌库 面板的开与合、自动存档提示',
    '**H3 · `ui_panel` · 面板开合 / 存档** 🔗\n'
    '- 范围：设置/图鉴/成就/牌库 面板的开与合（`showOverlay` / `hideOverlay` 各一处转发，**已接线**）\n'
    '- ⚠ v0.61.32 如实标注：「自动存档提示」**故意没接** —— `persistSave()` 每次状态变更都调，\n'
    '  挂上去会不停响（抽一张牌、扣一点血都响），体验是噪音不是反馈。想要的话随时能加，一行的事。',
    tag='H3 ui_panel')

if errs:
    print('=== 锚点校验失败，未写入 ===')
    for e in errs:
        print(' ✗', e)
    sys.exit(1)

if body == orig:
    print('=== 没有任何改动（可能已跑过）===')
    sys.exit(1)

io.open(DOC, 'w', encoding='utf-8', newline='').write(body.replace('\n', nl))
print('OK 素材清单.md 已更新：%d → %d 字符' % (len(orig), len(body)))
print('  §1.3 ◻ → 🔗 ：%d 处' % n_box)
print('  §1.6 ⏳ → 🔗 ：%d 处' % n_todo)