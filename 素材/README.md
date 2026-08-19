# 素材文件夹说明

把素材按下面的**文件名**放进对应子文件夹，游戏会自动检测并使用；**没有素材时游戏会优雅回退**（emoji + CSS + 合成音效），永远能玩。

> ⚠️ 授权要求：本项目**可能商用/发布**，所有素材必须为 **CC0 / 公有领域 / 明确可商用（无需署名）** 授权。放图前请确认授权，避免侵权风险。

## 目录结构

```
素材/
├── music/    背景音乐（.mp3）
├── bg/       背景图（.png）
├── enemy/    敌人/Boss 立绘（.png）
├── card/     卡牌插画（.png）
└── relic/    遗物图标（.png）
```

---

## 1. 背景音乐 `music/`

文件名用 `.mp3`、`.ogg` 或 `.wav` 均可（游戏会按 `mp3 → ogg → wav` 顺序自动探测）。

| 文件名 | 用途 | 当前状态 |
|---|---|---|
| `bgm_menu.ogg` | 主菜单 / 开局 | ✅ 已提供（[OpenGameArt "Asianoriental2"](https://opengameart.org/content/asianoriental2)，CC0，作者 Tozan） |
| `bgm_map.ogg` | 爬塔地图 / 篝火 / 商店（探索） | ✅ 已提供（同 menu 曲目） |
| `bgm_battle.ogg` | 战斗 | ✅ 已提供（[OpenGameArt "Chipnese"](https://opengameart.org/content/chipnese)，CC0，作者 Spring Spring） |

- 建议替换：中式氛围（古筝/埙/箫/木鱼），循环无缝，单曲 60～180 秒。直接覆盖同名文件即可。
- 缺失时回退为 Web Audio 合成氛围音。

## 2. 背景图 `bg/`

| 文件名 | 用途 |
|---|---|
| `bg_menu.png` | 主菜单背景 |
| `bg_act1.png` | 第一幕 · 乱葬岗 |
| `bg_act2.png` | 第二幕 · 黄泉路 |
| `bg_act3.png` | 第三幕 · 幽冥塔 |

- 建议：水墨/剪纸风，横版 1920×1080 左右，暗色为佳（游戏文字是浅色）。
- 缺失时回退为现有 CSS 渐变宣纸背景。

## 3. 敌人 / Boss 立绘 `enemy/`（34 张）

文件名 = `key.png`（下表第一列）。缺失时回退为「种类 emoji + 名字」。

**第一幕 · 乱葬岗**

| key（文件名） | 名称 | 种类 | 备注 |
|---|---|---|---|
| youhun | 游魂 | 👻 鬼 | |
| zhizharen | 纸扎人 | 👻 鬼 | |
| huyao | 狐妖 | 🦊 妖 | |
| jiangshi | 僵尸 | 🧟 僵尸 | |
| shanxiao | 山魈 | 🦊 妖 | |
| shuigui | 水鬼 | 👻 鬼 | |
| mengpo | 孟婆鬼 | 👻 鬼 | |
| baiwuchang | 白无常 | 👻 鬼 | 精英 |
| heiwuchang | 黑无常 | 👻 鬼 | 精英 |
| huapigui | 画皮鬼 | 👻 鬼 | 精英 |
| yecha | 夜叉 | 👻 鬼 | 精英（跨幕） |

**第二幕 · 黄泉路**

| key（文件名） | 名称 | 种类 | 备注 |
|---|---|---|---|
| niutou | 牛头 | 👻 鬼 | |
| mamian | 马面 | 👻 鬼 | |
| wangchuan | 忘川鬼 | 👻 鬼 | |
| panguan | 判官 | 👻 鬼 | |
| juhunshi | 拘魂使 | 👻 鬼 | 精英 |
| niumamian | 牛头马面 | 👻 鬼 | 精英 |

**第三幕 · 幽冥塔**

| key（文件名） | 名称 | 种类 | 备注 |
|---|---|---|---|
| xiuluo | 修罗 | 🦊 妖 | |
| luosha | 罗刹 | 🦊 妖 | |
| mingwei | 幽冥守卫 | 👻 鬼 | |
| yanluo | 阎罗 | 👻 鬼 | |
| xiuluojiang | 修罗将 | 🦊 妖 | 精英 |

**九大 Boss**

| key（文件名） | 名称 | 种类 | 幕 |
|---|---|---|---|
| jiangwang | 僵王 | 🧟 僵尸 | 一 |
| hanba | 旱魃 | 🧟 僵尸 | 一 |
| xueshi | 血尸 | 🧟 僵尸 | 一 |
| xiebian | 谢必安 | 👻 鬼 | 二 |
| bian | 必安（谢必安分化体） | 👻 鬼 | 二 |
| panguanwang | 判官王 | 👻 鬼 | 二 |
| mengpowang | 孟婆 | 👻 鬼 | 二 |
| yewang | 夜王 | 👻 鬼 | 三 |
| xiuluowang | 修罗王 | 🦊 妖 | 三 |
| yanluotianzi | 阎罗天子 | 👻 鬼 | 三 |

**召唤物**

| key（文件名） | 名称 | 种类 |
|---|---|---|
| yinchai | 阴差 | 👻 鬼 |
| xiaojianshi | 小僵尸 | 🧟 僵尸 |

## 4. 卡牌插画 `card/`（47 张）

文件名 = `id.png`。缺失时回退为纯文字卡面（当前样式）。

| id（文件名） | 名称 | 类型 |
|---|---|---|
| leifu | 雷符 | 攻击 |
| huofu | 火符 | 攻击 |
| jianfu | 剑符 | 攻击 |
| zhanyaojian | 斩妖剑 | 攻击 |
| tianlei | 天雷正法 | 攻击 |
| wanjian | 万剑归宗 | 攻击 |
| tiebushan | 铁布衫 | 攻击 |
| shihun | 噬魂术 | 攻击 |
| qungui | 群鬼乱舞 | 攻击 |
| taomufu | 桃木符 | 攻击 |
| shihunzhou | 蚀魂咒 | 攻击 |
| shixue | 嗜血 | 攻击 |
| baigui | 百鬼夜行 | 攻击 |
| jingang | 金刚符 | 防御 |
| yinshen | 隐身符 | 防御 |
| jinguang | 金光罩 | 防御 |
| jinzhong | 金钟罩 | 防御 |
| jingji | 荆棘符 | 防御 |
| fodu | 佛渡 | 防御 |
| tongpi | 铜皮铁骨 | 防御 |
| fanzhen | 反震 | 防御 |
| xiejiashengyuan | 卸甲生元 | 防御 |
| fenfu | 焚符 | 技能 |
| juling | 聚灵 | 技能 |
| sheshen | 舍身 | 技能 |
| shouyi | 守一 | 技能 |
| yiwu | 易物 | 技能 |
| xueqi | 血契 | 技能 |
| tongling | 通灵 | 技能 |
| jingxin | 静心诀 | 技能 |
| ranxue | 燃血术 | 技能 |
| xisui | 洗髓经 | 技能 |
| duhunguiji | 渡魂归己 | 技能 |
| xueji | 血祭 | 技能 |
| ranhun | 燃魂 | 技能 |
| kaitianyan | 开天眼 | 技能 |
| yixing | 移形换影 | 技能 |
| fuling | 附灵术 | 技能 |
| zhiren | 纸人 | 鬼怪 |
| zhouyin | 咒印 | 鬼怪 |
| xiaogui | 小鬼 | 鬼怪 |
| huapi | 画皮 | 鬼怪 |
| wutong | 五通神 | 鬼怪 |
| zhongkui | 钟馗镇魂 | 鬼怪 |
| zhouyu | 咒雨 | 鬼怪 |
| yinbingguo | 阴兵过境 | 鬼怪 |
| zhenyaoling | 镇妖铃 | 鬼怪 |

> 建议卡牌插画统一尺寸（如 256×256 方形或 3:4 竖版），风格统一。

## 5. 遗物图标 `relic/`（12 张）

文件名 = `id.png`。缺失时回退为纯文字遗物卡。

| id（文件名） | 名称 |
|---|---|
| zhaohunfan | 招魂幡 |
| zhushabi | 朱砂笔 |
| jifengfu | 疾风符 |
| taomujian | 桃木剑 |
| yinyangjing | 阴阳镜 |
| jubaopen | 聚宝盆 |
| daoxin | 道心 |
| baiguilu | 百鬼录 |
| hushenfu | 护身符 |
| tongqianjian | 铜钱剑 |
| fanhunxiang | 返魂香 |
| shehunling | 摄魂铃 |

---

## 快速开始

1. 按上表把素材文件放到对应子文件夹（文件名必须完全一致，全小写）。
2. 直接双击 `原型.html` 打开即可——有素材自动用素材，没素材自动回退。
3. 想验证回退态：临时重命名 `素材/` 文件夹，游戏照常运行。
