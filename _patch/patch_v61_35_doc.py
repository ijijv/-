# -*- coding: utf-8 -*-
r"""
v0.61.35 —— 素材清单.md 新增 §1.6「按文件平铺交付单」（70 行 · 一个文件一行）

用户要的是「能一行一行照着做/喂给 AI」的形态：§1.3 是按复用组的深度工作单，
这一节把同一批内容**按文件名平铺**成 9 张小表，一行一个交付文件。

数据全部来自 §1.3 已核对过的内容，并与 js/10_audio.js 的 SFX_TABLE 逐键对齐
（70 键 = 69 组 + 遗留键 hit；🔗37 已接线 / ⏳32 待接线 / 🚫1 不必买）。
另在 §1.1 与 §1.3 开头加指路。

锚点唯一性各校验 count==1。
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
LIST = os.path.join(ROOT, '素材清单.md')

SECTION = r'''### 1.6 按文件平铺交付单（70 行 · 照着这一张做就够）

> §1.3 是**按复用组**的深度工作单（有搜词、自录法、为什么这么归组）；这一节是同一批内容的**平铺版**：
> **一个交付文件一行**，按组切成 9 张小表，提示词可直接复制去生成 / 下单。
>
> **底数**：70 个键名 = 69 条复用组（A~I）+ 1 个遗留键 `hit`。
> 其中 **🔗 已接线 37 条**（交付即生效）、**⏳ 待接线 32 条**（采样先能到位，缺的只是触发点）、
> **🚫 不必买 1 条**（`hit`）。
>
> 图例：**🔗** 代码里已有调用点，交付同名文件立刻能听到 ｜ **⏳** 已入表待接线
> ｜ **✅** 你已经有这个文件了（26 个，`verify_dist.py` 的 [2b] 已机器确认键名全部合法）
> ｜ **🚫** 不用买
>
> 变体号：文件名里的 `_1` 是变体序号，最多 `_3`。表里「要求」栏写的是**建议做几个变体**；
> 只做 1 个也能用（`<键名>_1` 就够）。

#### A 组 · 打击层（8 条）——全游戏最高频，值得外包/自录

| # | 交付文件名 | 用途（谁会响） | 提示词（直接粘给 AI） | 要求 |
|---|---|---|---|---|
| 1 | `hit_light_1.mp3` ✅🔗 | 轻击命中 · 低伤 1~5 点：雷符/剑符/桃木符/噬魂术的常规段，普通小怪每一段 | `short dry light impact hit, clean punch, no reverb, 0.2 seconds, game sfx` | 0.12~0.2s · 建议 **3** 变体 · 单声道 · 中频干击，**无混响** |
| 2 | `hit_heavy_1.mp3` ✅🔗 | 重击命中 · 高伤 ≥10 点：天雷正法/万剑归宗/斩妖剑全力/嗜血，修罗将的重击 | `heavy deep impact thud with short tail, dark and weighty, game sfx, 0.4 seconds` | 0.3~0.45s · 3 变体 · 单声道 · 低频冲击 + 短尾，要听出「压」 |
| 3 | `hit_crit_1.mp3` ✅🔗 | 暴击/斩杀一击：开天眼增伤段、咒印引爆、钟馗镇魂终结、一拳清空血条 | `sharp metallic critical hit with crack, punchy and bright, game sfx, 0.4 seconds` | 0.35~0.5s · 2 变体 · 单声道 · 金属亮音，**辨识度要最高的一档** |
| 4 | `hit_guard_1.mp3` ✅🔗 | 打在格挡上：敌人带格挡、屏壁词缀、金钟罩/金刚符/铜皮铁骨生效期间 | `dull blocked hit on wooden shield, no pain, muted, game sfx, 0.2 seconds` | 0.15~0.25s · 2 变体 · 单声道 · 闷、**无痛感**，要和命中血肉分得开 |
| 5 | `hurt_1.mp3` 🔗 | 玩家受击（`dealDamageToPlayer` 全路径）；Boss 二连击时每段各响一次 | `heavy player hurt impact with low thud, ominous warning tone, game sfx` | 0.2~0.3s · 2 变体 · 单声道 · 比敌人受击更重，带警示感 |
| 6 | `block_1.mp3` 🔗 | 获得格挡：金刚符/金光罩/金钟罩/铜皮铁骨/守一/五通神/聚灵(武僧升级) | `soft rising shield shimmer, protective and light, game sfx, 0.2 seconds` | 0.1~0.2s · 2 变体 · 单声道 · 上升的「护住」感，不能盖过打击音 |
| 7 | `death_1.mp3` 🔗 | 敌人 HP 归零（含召唤物、Boss 分化体） | `eerie ghost dissolve into smoke whoosh, supernatural, game sfx, 0.4 seconds` | 0.3~0.5s · 2 变体 · 单声道 · 鬼怪「咻」地散去，**不是肉体倒地** |
| 8 | `thorns_1.mp3` ✅🔗 | 反伤/反震：荆棘符、反震牌、反震词缀 —— 被反弹伤害时 | `short sharp spike reflect thorns, retaliate ping, game sfx, 0.2 seconds` | 0.15~0.25s · 2 变体 · 单声道 · 刺/针状，短促尖锐 |
| 9 | `hit_1.mp3` 🚫 | **不用买**：唯一的 0 调用遗留键，保留只为老存档/外部调用不至于哑掉 | — | — |

#### B 组 · 玩家输出细分（6 条）——「音效可以相似的牌」靠这一组叠差异

| # | 交付文件名 | 用途（谁会响） | 提示词（直接粘给 AI） | 要求 |
|---|---|---|---|---|
| 10 | `atk_slash_1.mp3` ⏳ | 斩击：剑符、斩妖剑、噬魂术；遗物 桃木剑/铜钱剑 | `sword slash swoosh with light impact, sharp and fast, game sfx, 0.25 seconds` | 0.2~0.3s · 3 变体 · 刀锋破空 + 轻命中 |
| 11 | `atk_talisman_1.mp3` ⏳ | 符咒/法术：火符、雷符、剑符、桃木符、咒印；天雷正法、万剑归宗的法术段 —— **天师列核心听感** | `chinese taoist talisman magic cast, paper rustle with mystical hum, eerie, game sfx` | 0.3~0.5s · 3 变体 · 纸质 + 嗡鸣/电流，**志怪味最关键的一条** |
| 12 | `atk_blunt_1.mp3` ⏳ | 钝击：铁布衫、群鬼乱舞、百鬼夜行的冲撞、钟馗镇魂的钟击段 | `blunt wooden club strike with slight metal ring, game sfx, 0.3 seconds` | 0.25~0.35s · 2 变体 · 木质/金属钝响 |
| 13 | `atk_aoe_1.mp3` ⏳ | 群伤：群鬼乱舞、百鬼夜行、阴兵过境、尸王全体伤害、咒雨的群体段 | `wide area attack burst sweeping across all enemies, game sfx, 0.5 seconds` | 0.4~0.6s · 2 变体 · 扩散感，要听出「打的是全场」 |
| 14 | `atk_multi_each_1.mp3` ✅🔗 | 连击每段：咒雨（最多二十几下）、斩妖剑（≤3）、钟馗镇魂（≤7） | `very short rapid hit tick, 0.1 seconds, designed for fast repeating combo, game sfx` | 0.08~0.15s · **3 变体** · **必须极短**（点数 >12 时每发间隔仅 60ms） |
| 15 | `atk_true_1.mp3` ✅🔗 | 真实伤害：忘忧未饮的 8 点、咒雨真伤段、判官王清算反弹 | `dark life drain hit bypassing armor, cold and eerie, game sfx, 0.35 seconds` | 0.3~0.4s · 2 变体 · 阴沉、**无冲击感**，像生命被抽走 |

#### C 组 · 敌人出招（11 条）——一条键名改一批敌人的出招听感

| # | 交付文件名 | 用途（谁会响） | 提示词（直接粘给 AI） | 要求 |
|---|---|---|---|---|
| 16 | `enemy_attack_1.mp3` ✅🔗 | 敌人普通攻击（`attack` / `attackBlock`）—— 几乎全部敌人 | `monster melee attack swipe, eerie and dull, distinct from player hit, game sfx, 0.25 seconds` | 0.2~0.3s · 3 变体 · 要比玩家打击层**更闷更阴** |
| 17 | `enemy_multi_1.mp3` ✅🔗 | 敌人连击（`multi`）—— 全部 Boss 与多数精英，**最常见形态是 2 连发** | `short rapid monster strike, designed to be played twice in quick succession, game sfx, 0.15 seconds` | 0.12~0.18s · 3 变体 · 比普通攻击短促 |
| 18 | `enemy_charge_1.mp3` ✅🔗 | 蓄力（`charge`）：游魂、夜叉、血尸 —— 玩家必须听出「它要放大招了」 | `rising charge up power buildup, tense and sustained, ends unresolved, game sfx, 0.8 seconds` | 0.6~0.9s · 2 变体 · **上升蓄势，尾巴收住**（不能有释放感） |
| 19 | `enemy_block_1.mp3` ✅🔗 | 敌人上盾（`block`）：纸扎人、牛头、幽冥守卫；屏壁词缀进场自带 8 点 | `enemy raising dark barrier shield, heavy and ominous, game sfx, 0.25 seconds` | 0.2~0.3s · 2 变体 · 比玩家的 `block` 更阴沉厚重 |
| 20 | `enemy_heal_1.mp3` ✅🔗 | 敌人回血/吸血（`heal`）：僵尸、罗刹、血尸 80% 吸血、蚀血词缀、僵王吸食、孟婆汲血 | `dark life drain into enemy, vampiric absorb, unsettling, game sfx, 0.4 seconds` | 0.3~0.5s · 2 变体 · **「生命被抽走」的方向感**，与 `heal` 必须完全不同 |
| 21 | `enemy_strength_1.mp3` ✅🔗 | 力量增长（`strength`）：黑无常/僵王/夜王/旱魃/血尸/孟婆/修罗王/阎罗天子/牛头马面/修罗；刚体词缀 | `sinister power up, dissonant swell, enemy getting stronger, game sfx, 0.35 seconds` | 0.3~0.4s · 2 变体 · **越叠越危险的暗示**，可用不谐和音程 |
| 22 | `enemy_summon_1.mp3` ✅🔗 | 召唤（`summon`）：僵王召 2 只小僵尸、阎罗天子召 1 阴差（场上上限 5，可能连响） | `eerie summoning, dark energy gathering and forming a creature, ritual, game sfx, 0.5 seconds` | 0.4~0.6s · 2 变体 · **阴气聚拢成形的过程感**，别「啪」一下就出现 |
| 23 | `enemy_debuff_1.mp3` ✅🔗 | 敌人施负面 —— **一条覆盖 5 种意图**：`weak`(狐妖/判官/夜王)、`gouhun`、`discard`、`wangyou`、`burn` | `dark curse inflicted on player, clinging unease, eerie, game sfx, 0.4 seconds` | 0.3~0.45s · 2 变体 · 「被下了东西」的黏腻不适，不刺耳 |
| 24 | `enemy_buff_self_1.mp3` ✅🔗 | 敌人自我强化/附体：`yehuo`(修罗王)、`jiming`(判官王)，以及再生/屏壁/刚体/灵化词缀生效那一刻 | `dark aura enveloping enemy, possession ritual, ominous swell, game sfx, 0.5 seconds` | 0.4~0.6s · 2 变体 · 一次性附上，与「力量增长」的持续叠加区分 |
| 25 | `enemy_qingsuan_1.mp3` ✅🔗 | 清算/大招（`qingsuan`）：判官王打出记录的词缀 + 反弹记账伤害的 30%（上限 24） | `ominous judgment slam, gavel and deep gong, doom, game sfx, 0.6 seconds` | 0.5~0.7s · 2 变体 · **审判落锤的压迫感**，C 组最重的一条 |
| 26 | `enemy_dormant_1.mp3` ✅🔗 | 休眠观望（`dormant`）：非 aggressive 的敌人首回合不行动 | `subtle eerie lurk presence, very quiet, barely audible, game sfx, 0.2 seconds` | 0.15~0.25s · 1 变体 · **极轻**，几乎无感，不能抢戏 |

> `aoe`（群攻）已实现但当前无敌人使用，将来用了直接复用 16 + 17，不单列。

#### D 组 · 卡牌机制（13 条）——48 张牌的听觉辨识度全靠这一组

| # | 交付文件名 | 用途（谁会响） | 提示词（直接粘给 AI） | 要求 |
|---|---|---|---|---|
| 27 | `card_1.mp3` 🔗 | 任何牌打出的瞬间（48 张全部）—— 叠在具体效果音之前 | `quick card play flip, paper card swoosh, very short, game sfx, 0.12 seconds` | 0.08~0.15s · **3 变体** · 全游戏最高频之一，**必须极短** |
| 28 | `card_draw_1.mp3` ✅🔗 | 抽牌：每回合开始、通灵(抽2)、聚灵(抽1)、血祭多摸、易物换入 | `card draw from deck, sliding paper, game sfx, 0.2 seconds` | 0.15~0.25s · 2 变体 · 「抽出来」的方向感，与出牌相反 |
| 29 | `card_discard_1.mp3` ⏳ | 弃牌：水鬼/孟婆鬼的 `discard`、忘忧饮下、手牌上限溢出、洗髓经 | `card tossed away, loose paper flutter, game sfx, 0.2 seconds` | 0.15~0.25s · 2 变体 · **丢开**的松散感 |
| 30 | `card_exhaust_1.mp3` ✅🔗 | 消耗/焚符：钟馗镇魂、佛渡、渡魂归己、镇妖铃、尸王；焚符的焚烧段 | `paper talisman burning to ash, ritual sacrifice, mystical, game sfx, 0.5 seconds` | 0.4~0.6s · 2 变体 · 燃烧 + 消散，**重**要的牌要有仪式感 |
| 31 | `card_curse_1.mp3` ✅🔗 | 诅咒施加 —— **天师列核心**（`applyCurse` 一处收口，25+ 调用）：火符/万剑归宗/桃木符/蚀魂咒/舍身/焚符/咒印/咒雨 | `chinese talisman slapped onto target, dry paper crack with faint eerie ring, game sfx, 0.35 seconds` | 0.3~0.4s · 2 变体 · 符纸贴上去的「啪嗒」+ 轻微耳鸣，**别加混响** |
| 32 | `card_zhenhun_1.mp3` ⏳ | 镇魂/封印：镇妖铃、钟馗镇魂（灵化词缀免疫时改播 `kw_linghua`） | `chinese bell toll sealing a spirit, long ringing decay, ritual, game sfx, 0.7 seconds` | 0.5~0.8s · 2 变体 · **铃/钟一声定住，余音要长** |
| 33 | `card_charm_1.mp3` ⏳ | 魅惑：画皮（对目标施加 1 层，其下回合伤害 -50%） | `enchanting charm spell, alluring and hypnotic, faint female whisper, game sfx, 0.5 seconds` | 0.4~0.6s · 1 变体 · 妩媚/迷幻，全游戏唯一一条，可做记忆点 |
| 34 | `card_defense_1.mp3` ⏳ | 防御牌起盾：金刚符/隐身符/金光罩/金钟罩/荆棘符/佛渡(升级)/铜皮铁骨/反震/卸甲生元/守一/聚灵(武僧升级) | `casting a protective ward, thick golden barrier, chinese taoist, game sfx, 0.25 seconds` | 0.2~0.3s · 2 变体 · 比 `block` 更「厚」（主动起盾 vs 结果叠加） |
| 35 | `card_buff_1.mp3` ⏳ | 自我强化：开天眼/血祭/燃血术/燃魂/静心诀/移形换影/附灵术/洗髓经/卸甲 | `self empowering buff, righteous energy surge, taoist, game sfx, 0.35 seconds` | 0.3~0.4s · 2 变体 · 上扬且**正气**，与敌人的力量增长相反 |
| 36 | `heal_1.mp3` 🔗 | 治疗：渡魂归己、五通神回血、阴差列卡面回血、篝火休息、遗物回血 | `warm healing chime, gentle rising, restorative, game sfx, 0.25 seconds` | 0.2~0.3s · 2 变体 · 温暖向上，**与敌人吸血必须听感相反** |
| 37 | `card_summon_1.mp3` ⏳ | 召唤己方 —— **赶尸人核心**：纸人/小鬼/五通神/阴兵过境/尸王；通灵、附灵术 | `summoning a paper spirit servant, taoist ritual, lively not sinister, game sfx, 0.45 seconds` | 0.4~0.5s · 2 变体 · 比敌人召唤更「正」：是自己唤出的帮手 |
| 38 | `card_shiji_1.mp3` ✅🔗 | 尸气获取 —— **赶尸人专属资源**（`G.shiji` 收口，40+ 调用）：雷符击杀等 | `gathering corpse qi, dark viscous energy accumulating, eerie, game sfx, 0.3 seconds` | 0.25~0.35s · 2 变体 · **黏稠的聚气感**，与血怒区分 |
| 39 | `card_xuenu_1.mp3` ⏳ | 血怒获取 —— **阴差专属资源**（上限 10 层，整局累积） | `blood rage accumulating, searing hot anger buildup, game sfx, 0.3 seconds` | 0.25~0.35s · 2 变体 · 灼热的积攒，比尸气更烈更红 |

#### E 组 · 关键词与状态（10 条）——带时序触发的关键词才发声

| # | 交付文件名 | 用途（谁会响） | 提示词（直接粘给 AI） | 要求 |
|---|---|---|---|---|
| 40 | `kw_burn_1.mp3` ⏳ | 灼烧跳伤：旱魃招牌，每层每回合开始 -2 生命，永久可叠加 | `flesh burn sizzle, short painful sear, game sfx, 0.25 seconds` | 0.2~0.3s · 2 变体 · 持续灼痛，**同回合可能连响，别太长** |
| 41 | `kw_curse_1.mp3` ⏳ | 诅咒结算/引爆：每回合末 -2、被斩妖剑/噬魂术/咒印引爆、蚀魂咒转化 | `talisman curse detonating, paper tearing with dark burst, game sfx, 0.3 seconds` | 0.25~0.35s · 2 变体 · 符纸崩解，与 `card_curse`(贴上去) 成对 |
| 42 | `kw_weak_1.mp3` ⏳ | 虚弱：夜王的暗夜威压、狐妖、判官（你伤害 -25%，持续 2 回合） | `weakening hex, energy draining downward, soft sinister, game sfx, 0.35 seconds` | 0.3~0.4s · 1 变体 · 力量被压住的**下沉感** |
| 43 | `kw_gouhun_1.mp3` ⏳ | 勾魂：白无常/必安/谢必安/忘川鬼/拘魂使/阎罗 + 勾魂词缀（下回合少抽 1） | `soul snatched by hook and chain, supernatural dread, game sfx, 0.35 seconds` | 0.3~0.4s · 1 变体 · **魂魄被拉走的一瞬**（钩/锁链的暗喻） |
| 44 | `kw_wangyou_1.mp3` ⏳ | 忘忧饮下：孟婆的汤（不饮则受 8 点真伤，播 `atk_true`） | `eerie potion being drunk, forgetfulness, hypnotic gentle dread, game sfx, 0.6 seconds` | 0.5~0.7s · 1 变体 · 一碗汤/遗忘的意象，温柔的危险 |
| 45 | `kw_yehuo_1.mp3` ⏳ | 业火反噬：修罗王附体期间，**每次**对它造成伤害反噬 1 点 —— 会响很多次 | `short searing fire backfire tick, hot sting, very short, game sfx, 0.15 seconds` | 0.12~0.2s · 2 变体 · **必须极短**（密集触发） |
| 46 | `kw_shield_break_1.mp3` ⏳ | 格挡/屏壁被击碎：格挡打光、屏壁 8 点盾碎、金钟罩失效 —— **是「碎」不是「挡」** | `shield shattering into pieces, brittle break, game sfx, 0.25 seconds` | 0.2~0.3s · 2 变体 · 碎裂崩散，与 `hit_guard` 的闷挡形成明确对比 |
| 47 | `kw_regen_1.mp3` ⏳ | 再生回血：再生词缀（每回合 +4），及一切敌人被动回血 | `undead regeneration, dark flesh healing, eerie subtle, game sfx, 0.3 seconds` | 0.25~0.35s · 1 变体 · 阴冷回升，**与 `heal` 的温暖相反** |
| 48 | `kw_linghua_1.mp3` ⏳ | 灵化抵抗：敌人免疫镇魂/诅咒/魅惑时 —— **全清单唯一新增的词缀音** | `spell deflected by immunity, bright repelling sparkle, clear rejection, game sfx, 0.25 seconds` | 0.2~0.3s · 1 变体 · 「被弹开了」的清脆拒绝音，要一听就明白打不进去 |
| 49 | `kw_junk_1.mp3` ⏳ | 怨气塞手牌：怨气缠身词缀每次攻击塞 1 张【怨气】（手牌最多 3 张） | `unwanted cursed card shoved in, dirty clogging insert, irritating, game sfx, 0.3 seconds` | 0.25~0.35s · 1 变体 · 「多了一张没用的东西」的讨厌感 |

> 纯名词解释的关键词（格挡/召唤/阴兵/消耗/预格挡等）不发声，它们的音由施加它的那张牌（D 组）负责。

#### F 组 · 敌人词缀（1 条）——9 个词缀里 8 个复用，只新增 1 条

| # | 交付文件名 | 用途（谁会响） | 提示词（直接粘给 AI） | 要求 |
|---|---|---|---|---|
| 50 | `affix_proc_1.mp3` ⏳ | 词缀生效通用提示：剧毒（攻击额外 +2，是没有独立音的那一个）；同回合多词缀一起触发时 | `subtle dark proc tick, ominous background hint, quiet, game sfx, 0.2 seconds` | 0.15~0.25s · 2 变体 · **轻、不抢戏**：它是背景提示，不是事件音 |

> 其余 8 个词缀**全部复用**：勾魂→`kw_gouhun`、反震→`thorns`、再生→`kw_regen`、刚体→`enemy_strength`、
> 屏壁→`enemy_block`、蚀血→`enemy_heal`、怨气缠身→`kw_junk`、灵化→`kw_linghua`。**这就是省下的 8 条。**

#### G 组 · Boss 招牌机制（5 条）——Boss 战的记忆点，最值得花预算

| # | 交付文件名 | 用途（谁会响） | 提示词（直接粘给 AI） | 要求 |
|---|---|---|---|---|
| 51 | `boss_1.mp3` 🔗 | Boss 出场印章：每次进入 Boss 房 | `boss entrance, deep taiko drum hit with low drone, oppressive, game sfx, 0.7 seconds` | 0.5~0.8s · 1 变体 · **重低音 + 鼓，全游戏最重的一击** |
| 52 | `boss_phase2_1.mp3` ✅🔗 | 二阶段/轮回转场：阎罗天子血条首次打空（也是所有 Boss 二阶段的通用转场） | `dark rebirth phase transition, ritual swell with reversed power, cinematic, game sfx, 1 second` | 0.8~1.2s · 1 变体 · **逆转/重生**的仪式感，本组最长最重 |
| 53 | `boss_split_1.mp3` ⏳ | 分化：谢必安血量低于 50% 分化为两个「必安」（要全击败才判胜） | `entity splitting into two, echoing duplication, supernatural horror, game sfx, 0.8 seconds` | 0.6~0.9s · 1 变体 · **一分为二**的分裂感，可带重影/回声 |
| 54 | `boss_ledger_1.mp3` ⏳ | 生死簿记账：判官王 `jiming`，随机记 1 条词缀并开始记录你打出的伤害 | `chinese brush writing on paper ledger, ominous record keeping, game sfx, 0.5 seconds` | 0.4~0.6s · 1 变体 · 毛笔写字/翻簿子 —— **最容易自录又最出彩的一条** |
| 55 | `boss_yehuo_1.mp3` ⏳ | 业火附体：修罗王 `yehuo`（持续 2 回合，伤 -30%，反噬播 `kw_yehuo`） | `hellfire aura engulfing, sustained burning flames, ominous, game sfx, 0.8 seconds` | 0.6~0.9s · 1 变体 · **火焰缠身**的持续燃烧，与业火反噬的短刺区分 |

> 其余 6 个 Boss 专属机制**复用**：僵王召唤→`enemy_summon`、判官王清算→`enemy_qingsuan`、
> 孟婆忘忧→`kw_wangyou`、夜王虚弱→`kw_weak`、旱魃灼烧→`kw_burn`、血尸吸血→`enemy_heal`。

#### H 组 · 系统与 UI（12 条）——玩家每天听几百次的一层

| # | 交付文件名 | 用途（谁会响） | 提示词（直接粘给 AI） | 要求 |
|---|---|---|---|---|
| 56 | `ui_click_1.mp3` ✅🔗 | **全部按钮**（document 级点击委托一次覆盖）：主菜单、开始/继续、结束回合、地图节点、商店买卡/删卡、锻造、图鉴翻页、设置面板 | `soft ui click, wooden tap, very short and unobtrusive, game ui sfx, 0.08 seconds` | 0.05~0.1s · 2 变体 · **全游戏最高频的一条**（比出牌还高频）· 极轻的木质「嗒」 |
| 57 | `error_1.mp3` 🔗 | 错误提示：能量不足、牌不可出、非法目标、未开局点牌库 | `soft error deny buzz, low descending, unobtrusive rejection, game ui sfx, 0.15 seconds` | 0.1~0.2s · 2 变体 · **低沉下行，要「闷」不要「刺耳」**（现有合成音是 200→120Hz 下行方波，方向是对的） |
| 58 | `ui_panel_1.mp3` ⏳ | 面板开合/存档：设置/图鉴/成就/牌库面板的开与合、自动存档提示 | `paper scroll unfolding, soft ui panel open, game ui sfx, 0.2 seconds` | 0.15~0.25s · 2 变体 · 纸卷展开/收起的轻微摩擦 |
| 59 | `ui_map_1.mp3` ✅🔗 | 地图选点/移动：爬塔地图选下一个节点、进入战斗/事件/商店/篝火节点 | `single footstep on stone, forward progress, game ui sfx, 0.25 seconds` | 0.2~0.3s · 2 变体 · 脚步/印章落地的推进感 |
| 60 | `ui_reward_1.mp3` ✅🔗 | 奖励三选一：战后三选一、Boss 奖励、事件奖励的卡片出现 | `reward reveal shimmer, three choices appear, bright and inviting, game sfx, 0.4 seconds` | 0.3~0.5s · 2 变体 · **宝贝现世**的亮音，与遗物呼应但更轻 |
| 61 | `ui_levelup_1.mp3` ⏳ | 升级/锻造：篝火处升级卡牌、锻造页操作 | `upgrade success, rising bright chord, satisfying, game sfx, 0.35 seconds` | 0.3~0.4s · 1 变体 · **变强了**的上行音 |
| 62 | `ui_unlock_1.mp3` ⏳ | 成就/图鉴解锁：成就达成、图鉴新条目、首次遇敌的引导气泡 | `achievement unlocked ding, bright chime, rewarding, game sfx, 0.5 seconds` | 0.4~0.6s · 1 变体 · **「点亮」**的满足感 |
| 63 | `gold_1.mp3` 🔗 | 金币入账：战后金币、商店买卖、聚宝盆遗物、事件给钱（现有 6 处调用） | `coin pickup, bright metallic chime, short, game ui sfx, 0.2 seconds` | 0.15~0.25s · 2 变体 · 清脆金属，**连续入账时会连响** |
| 64 | `relic_1.mp3` 🔗 | 遗物获得：现有 8 处调用（全项目最高频的现有音之一） | `ancient relic acquired, mystical double chime, game sfx, 0.25 seconds` | 0.2~0.3s · 2 变体 · 法器「叮咚」，比金币更沉稳（细分见 I 组） |
| 65 | `win_1.mp3` 🔗 | 战斗胜利（`winFight`） | `victory fanfare, four note ascending, chinese instruments, game sfx, 0.8 seconds` | 0.6~0.9s · 1 变体 · **四音上行**（现有是 523/659/784/1047 琶音，方向对，换真乐器即可） |
| 66 | `lose_1.mp3` 🔗 | 战斗失败/死亡 | `defeat sting, four note descending, somber, game sfx, 0.8 seconds` | 0.6~0.9s · 1 变体 · **四音下行**（现有是 400/300/220/150） |
| 67 | `ui_endless_1.mp3` ⏳ | 无尽攀塔过渡：无尽模式进入下一层时的过渡 | `descending into an abyss, deep downward drone, ominous, game sfx, 0.7 seconds` | 0.5~0.8s · 1 变体 · **深不见底**的下潜感，可做 1 条 + 按层数变调 |

#### I 组 · 遗物分化（3 条）——中式法器是最出彩的一类音

| # | 交付文件名 | 用途（谁会响） | 提示词（直接粘给 AI） | 要求 |
|---|---|---|---|---|
| 68 | `relic_bell_1.mp3` ⏳ | 铃/幡类法器：摄魂铃、招魂幡 | `ritual bell with long ringing decay, mystical, game sfx, 0.7 seconds` | 0.5~0.8s · 1 变体 · **长余音的铃，余韵是主角** —— 这条**自录远好于 AI** |
| 69 | `relic_fu_1.mp3` ⏳ | 符/笔/剑类法器：朱砂笔、疾风符、护身符、桃木剑、铜钱剑 | `taoist ritual paper rustle with sword shimmer, mystical, game sfx, 0.35 seconds` | 0.3~0.4s · 1 变体 · 符纸抖动 + 一点金属锋（既纸又剑） |
| 70 | `relic_mirror_1.mp3` ⏳ | 镜/录/道心类：阴阳镜、道心、百鬼录 | `mystic mirror resonance, glassy echoing shimmer, game sfx, 0.5 seconds` | 0.4~0.6s · 1 变体 · 通透的回响（镜面反射感），与铃区分 |

> `聚宝盆` → 复用 `gold`；`返魂香` → 复用 `heal`。

#### 怎么开始（最短路径）

1. **先只做 🔗 那 37 条** —— 交付同名文件立刻能听到，零额外代码改动。你已经放好了其中 26 个（标 ✅ 的）。
2. 补掉 🔗 里还缺的 11 条：`hurt` `block` `death` `card` `heal` `gold` `relic` `win` `lose` `boss` `error`。
3. **⏳ 那 32 条可以现在就做**：采样层是先试文件、没有再回退合成，**文件放进去就有声**，
   缺的只是「触发点」—— 我补完接线它们立刻全部生效。所以先做不吃亏。
4. 文件名**必须**是 `<键名>_<变体号>.mp3`（`_1`/`_2`/`_3`）。拼错不会报错，只会**静默回退合成音**；
   `python _patch/verify_dist.py` 的 [2b] 会替你抓拼错 —— 放完跑一次就知道对不对。
5. 试听要用**本地 http 服务**（`python 试玩.py`）。双击 `file://` 打开时浏览器会拦 fetch，
   采样探测被有意跳过，只能听到合成音。

'''

A1 = "## 二、🎵 BGM（国风 / 古风背景音乐）\n"
N1 = SECTION + A1

# §1.1 指路
A2 = ("三条路**可以混用，也可以只做其中一条**。最省事的组合：先用 ① 把 1.5 节「第一批」凑齐能玩，\n"
      "缺的用 ② 补，③ 只留给最关键的十几个打击音（打击感是三条里唯一 AI 和素材站都做不好的）。\n")
N2 = (A2 +
      "\n> 📋 **不想读整份文档？直接跳到 [1.6 按文件平铺交付单](#16-按文件平铺交付单70-行--照着这一张做就够)** ——\n"
      "> 一个交付文件一行、带提示词，照着从头做到尾就够。本节 1.3~1.5 是它的深度版。\n")

# §1.3 指路
A3 = ("> 每条五栏：**范围**（组内包含哪些牌/敌人/机制）· **规格**（时长/变体/声道/音色要求）· **搜词**（中英）· **AI**（英文 prompt）· **自录/外包**。\n"
      "> 条目标题里的反引号词 = 交付文件名前缀。标 🔗 的是**本批已接线、交付即生效**；其余为待接线。\n")
N3 = (A3 +
      "> 只想照着做、不关心归组理由的话，用 **§1.6 按文件平铺交付单**，内容与本节一致但是一文件一行。\n")

EDITS = [(LIST, A1, N1), (LIST, A2, N2), (LIST, A3, N3)]


def main():
    if '### 1.6 按文件平铺交付单' in io.open(LIST, encoding='utf-8').read():
        print('SKIP 已加过 1.6')
        return 0
    cache, bad = {}, []
    for path, a, b in EDITS:
        if path not in cache:
            cache[path] = io.open(path, encoding='utf-8', newline='').read()
        n = cache[path].count(a)
        if n != 1:
            bad.append((os.path.basename(path), n, a.split('\n')[0][:60]))
            continue
        cache[path] = cache[path].replace(a, b, 1)
    if bad:
        print('FAIL 锚点不唯一/缺失，整体未落盘：')
        for f, n, s in bad:
            print('  [%s] count=%d  %r' % (f, n, s))
        return 1
    for path, s in cache.items():
        io.open(path, 'w', encoding='utf-8', newline='').write(s)
        print('OK %s' % os.path.relpath(path, ROOT))
    print('OK 共落地 %d 处' % len(EDITS))
    return 0


if __name__ == '__main__':
    sys.exit(main())