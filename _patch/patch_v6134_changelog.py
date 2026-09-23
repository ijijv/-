# -*- coding: utf-8 -*-
"""v0.61.34 收尾：verify_dist 未使用清单的假警报 + 更新日志

1. verify_dist [1] 改动带来一个**我自己引入的**假警报：基础三首 BGM 原先在 `want` 里，
   所以不会出现在「从未被游戏请求」清单；把它们挪到 miss_music 之后，清单里就冒出了
   music/bgm_{menu,map,battle}.mp3（3249 KB）。BGM 本来就都算「可选覆盖」
   （基础三首有合成兜底、三条升级轨有回退轨），把六条轨一并从清单里排掉。
2. 更新日志：新增 v0.61.34 段；并给 v0.61.25 那条作废的挂账加注。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = os.path.join(ROOT, '_patch', 'verify_dist.py')
L = os.path.join(ROOT, '更新日志.md')

files = {}
for p in (V, L):
    raw = io.open(p, encoding='utf-8').read()
    files[p] = {'nl': '\r\n' if '\r\n' in raw else '\n', 'body': raw.replace('\r\n', '\n')}

errs = []


def rep(path, old, new, tag=''):
    b = files[path]['body']
    if b.count(old) != 1:
        errs.append('[%s] %s：命中 %d 次，期望 1 次' % (os.path.basename(path), tag, b.count(old)))
        return
    files[path]['body'] = b.replace(old, new, 1)


# ═══════════════════ 1. 未使用清单：六条 BGM 全部排除 ═══════════════════
rep(V,
    "    optional_music = set('music/bgm_%s.mp3' % i for i in ids['musicOptional'])\n",
    "    # BGM 六条轨**全部**算「可选覆盖」：基础三首没文件走合成、三条升级轨没文件走回退轨。\n"
    "    # 注意别只排 musicOptional —— 基础三首自 [1] 起不再进 want（改为任一扩展名判定），\n"
    "    # 漏排会让它们在这里假报「从未被请求」（本批第一版就是这个假警报）。\n"
    "    optional_music = set('music/bgm_%s%s' % (t, e)\n"
    "                         for t in (ids['music'] + ids['musicOptional']) for e in bgm_exts)\n",
    tag='未使用清单排除 BGM')

# ═══════════════════ 2. 旧挂账加注（v0.61.25 那条已作废） ═══════════════════
rep(L,
    "- BGM 文档写 6 轨，**代码仍只认 `menu`/`map`/`battle` 三轨**\n",
    "- BGM 文档写 6 轨，**代码仍只认 `menu`/`map`/`battle` 三轨**"
    "（→ **v0.61.31 已落地，此条作废**；v0.61.34 又补了「文件名词干必须在册」的闸，"
    "防人工交付拼错时静默失效）\n",
    tag='旧挂账加注')

# ═══════════════════ 3. 新增 v0.61.34 段 ═══════════════════
NEW = """## v0.61.34 BGM 六轨接线核实 + 轨名真相源（防「文件拼错」静默失效）（2026-09-24）

> 你 9/23 把 6 首 BGM 放进 `素材/music/`，要我「接上、普通和精英也要分开」。
> 核实结论：**接线在 v0.61.31 就已经做完了** —— 我上一条提交信息里写的
> 「代码仍只认三轨，接线未做」是**错的**（照抄了 v0.61.25 的旧挂账，没回查 v0.61.31 的落地情况），
> 在此更正。本批**没有重写接线**，做的是「核实 + 补一个防拼错的闸」。

### 六轨实际映射（现状，v0.61.31 起就生效，本批只做核实）

| 场景 | 逻辑轨 | 素材文件 | 触发点 |
|---|---|---|---|
| 主菜单 | `menu` | `bgm_menu.mp3` | `60_boot.js` 开局画面 |
| 地图 | `map` | `bgm_map.mp3` | `showMap` |
| **普通战斗** | `battle` | `bgm_battle.mp3` | `startBattle` → `battleBgmFor(G.enemies)` |
| **精英战** | `battle_elite` | `bgm_battle_elite.mp3` | 同上（敌人带 `elite`） |
| Boss 战 | `battle_boss` | `bgm_battle_boss.mp3` | 同上（敌人带 `boss`） |
| 商店 / 营地 / 事件节点 | `shop` | `bgm_shop.mp3` | `50_ui.js` 三处 |

- 判定优先级 **Boss > 精英 > 普通**，且判定发生在**建敌人之后**（`G.enemies = keys.map(...)` 的下一行）——
  v0.61.31 修的就是这个次序：原先 `setBGM('battle')` 写在建敌人之前，那一刻 `e.elite` 根本还不存在
- 读档进 Boss 房同样走 Boss 轨（`40_flow.js`）
- 缺文件时自动回退：精英/Boss → `battle`、商店 → `map`（`BGM_FALLBACK` + `startBGM` 探测耗尽后转发），
  所以「素材还没到位」不会比原来更安静

### 本批新增：轨名真相源（真正补的那个洞）

**问题**：BGM 文件名是**人工按名交付**的。拼成 `bgm_elite.mp3`、`bgm_battle_Elite.mp3`，
代码**不会报任何错** —— 探测不到就走回退轨，你在游戏里听到的是普通战斗曲，
只会得出「还是没接上」的结论，而问题在文件名上。

**做法**：

- `10_audio.js` 新增 `BGM_KNOWN_TRACKS = ['menu','map','battle','battle_elite','battle_boss','shop']` 作唯一真相源
- `verify_dist.py` 三段新增/收紧：
  - **[2c]（新）** 磁盘上每个 `music/bgm_*.<ext>` 的词干必须在册 —— 拼错**硬红**；不在册的轨名逐条点名
  - **[1c]（新）** 代码的 `BGM_KNOWN_TRACKS` 必须等于脚本里的 必需/可选 两张 listing（防**校验脚本自身**漂移）
  - **[1]（收紧）** 基础三首 BGM 的命中改为**任一扩展名**。原来硬写 `.mp3`，而 `BGM_EXTS` 的顺序是 **ogg 优先** ——
    哪天你改交 `.ogg`，产物校验会假红
- `setBGM` 收到未登记轨名时 `console.warn` **一条**（同轨不重复刷屏），**不抛错** ——
  战斗中不能因为一个轨名拼错就炸结算
- 顺带修掉 [1] 改动引入的一个假警报：基础三首 BGM 一度在「从未被游戏请求」清单里冒出来

### 冒烟与产物校验

- 冒烟 **846 → 862 全绿**（+16：轨名表完整性、字符集与磁盘命名同口径、`BGM_FALLBACK` 键在册、
  三档战斗两两不同轨、空/畸形入参不抛错、未登记轨名不抛错且仍按原名请求、警告恰好一条且不刷屏）
- 写断言时先踩了一次自己的坑：`battleBgmFor` 读的是**敌人对象**的 `.elite/.boss`，
  我一开始喂的是 key 字符串 → 三档全落 `battle`，红报「普通战与精英战不是同一条轨 | battle vs battle」。
  是**测试喂错了**，不是接线错。已改为按 `makeEnemy` 的产出形状从真实数据造对象，并补一条「三类敌人真实存在」的前置断言
- `dist/志怪塔.html` 重建后 `verify_dist.py` **全绿**（236 素材 / 15.01 MB）。
  此前那条红是 **9/21 的旧产物没收录 9/23 到的素材**，不是代码问题
- 产物体积提醒：单文件产物 15 MB 里有 **≈7.2 MB 是 6 首 BGM**。原型阶段无所谓；
  到 Cocos/小游戏阶段 BGM 应走 `InnerAudioContext` + CDN，**不要再 base64 内联**

### 请你在浏览器里听一遍（VM 里没有扬声器，这几条只能耳朵验）

1. 主菜单 → 地图 → 进**普通**战斗：三处应各是不同曲子
2. 回地图进**精英**节点（地图上标 ☠ 精英）：应换成**与普通战不同**的一首 —— 这就是你点名要分开的那条
3. 进 Boss 房：第三首战斗曲
4. 进商店 / 营地 / 事件节点：非战斗曲
5. 若某处听着和上一场景一样：打开控制台看有没有 `未登记的 BGM 轨名：…`，
   有的话就是交付的文件名对不上表（`素材/music/bgm_<轨>.<ext>`），改文件名即可，代码不用动

### 仍未做（挂账，不谎报）

- **伤害数字图片（`素材/num/0.png…9.png`）还没到**，接缝照旧空转（`NUM_STATE` 保持 -1，全程走文本浮字）。
  连带「造成伤害浮字的震动 + 闪烁」也在等图片，按你原话是**之后**做
- `verify_dist.py` 盘点出 `card/yuanqi.png` 从未被游戏请求（3249 KB 那批已随本次修正消失）—— **我没动**，等你发话

---

"""
rep(L, "## v0.61.33 显示口径与指向机制整改 + 洗髓经跨关 + 渡魂按真实总伤（2026-09-24）\n",
    NEW + "## v0.61.33 显示口径与指向机制整改 + 洗髓经跨关 + 渡魂按真实总伤（2026-09-24）\n",
    tag='新增 v0.61.34 段')

# ═══════════════════ 落盘 ═══════════════════
if errs:
    print('=== 锚点校验失败，未写入任何文件 ===')
    for e in errs:
        print(' ✗', e)
    sys.exit(1)

for p, d in files.items():
    io.open(p, 'w', encoding='utf-8', newline='').write(d['body'].replace('\n', d['nl']))
    print('OK %-16s %d 字符' % (os.path.basename(p), len(d['body'])))
print('注: 更新日志.md 全文含 `,,`（正文引用了 grep -n ",," 这句），故本脚本不对它整篇跑 ,, 守卫')