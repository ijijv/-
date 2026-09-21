# -*- coding: utf-8 -*-
r"""
v0.61.31 文档补 —— 素材清单.md 第二节：6 轨**全部接线**，不再是「先挑好存着」

【背景】v0.61.31 代码把精英战 / Boss 战 / 商店三轨接上了，但素材清单.md 第二节
还写着「代码本批只认 3 个文件名」「4~6 轨先挑好存着，等我扩轨道名」——
这正是我这一批刚在骂的那种**文档与代码脱节**（只不过方向反过来：原来是文档超前，
改完代码不及时同步的话又变成文档滞后）。所以代码落地后立刻同步这一节。

【只改「活文档」，不改日志】
  素材清单.md  → 活文档，按当前代码状态改写
  更新日志.md  → 按仓库惯例是**按日期追加**的历史记录，旧条目描述当时状态**不改写**
                 （v0.61.31 新条目已写在最上面，自然覆盖旧说法）

改动要点：
  1. 开头结论：6 轨全部已接线，交付即生效；并写清「没交付就退回基础轨」这个回退行为
  2. 6 轨需求表的「本批」列：4~6 轨 ⏳ 先挑 → ✅ **要**（交付即生效）
  3. 交付规格后补一句：6 个文件名全列出
  4. 文末「第二步：BGM」：去掉「等我扩轨道名」，改成 6 个文件名都可以直接交付

锚点唯一性各校验 count==1。
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
LIST = os.path.join(ROOT, '素材清单.md')

# ---------------------------------------------------------------- 1. 开头结论

A1 = """> **目标 6 轨，代码本批只认 3 个文件名**（`menu` / `map` / `battle`）。
> 所以：**这 3 个名字的曲子现在就可以买/下，交付即生效**；4~6 轨（精英战 / Boss 战 / 商店篝火）按本表先挑好存着，
> 等我把轨道名扩到 6 个再按名字交付 —— **不用改名，挑的时候按本表的文件名存就行**。
> 现状代码：`startBGM(track)` 走 `素材/music/bgm_<轨名>.<ext>`，扩展名探测 mp3→ogg→wav→m4a，**循环播放**，音量 0.32，找不到就回退程序化合成氛围音。
"""
N1 = """> **6 轨全部已接线（v0.61.31 起）—— 6 个文件名都可以直接交付，丢进去即生效。**
> 现状代码：`startBGM(track)` 走 `素材/music/bgm_<轨名>.<ext>`，扩展名探测 mp3→ogg→wav→m4a，**循环播放**，音量 0.32。
>
> **升级轨没交付怎么办？不会出问题，会自动退回基础轨**（v0.61.31 专门处理过）：
>
> | 你还没交付的轨 | 实际播放 | 说明 |
> |---|---|---|
> | `bgm_battle_boss` | `bgm_battle` | Boss 房不会变安静，只是听着和普通战一样 |
> | `bgm_battle_elite` | `bgm_battle` | 同上 |
> | `bgm_shop` | `bgm_map` | 商店/营地/事件听着和地图一样 |
>
> 所以**不用等 6 首都凑齐再交付**，分批丢、随时丢都行 —— 哪天某个文件到位了，进对应场景自动换成它，
> 不需要改代码、不需要告诉我。反过来也成立：交付了 `bgm_battle_boss` 但还没交付 `bgm_map` 也没关系，两者互不影响。
"""

# ---------------------------------------------------------------- 2. 需求表：4~6 轨的行

A2 = "| 4 | `bgm_battle_elite` | 精英战 | 普通战斗的加强版 | 叠低音鼓 + 锣 | 110~120 | 60~90s | ⏳ 先挑 |\n| 5 | `bgm_battle_boss` | Boss 战（9 个 Boss 共用） | 压迫感、燃、有「审判」味 | 大鼓 + 唢呐 / 低沉人声吟唱 | 120~130 | 90~120s | ⏳ 先挑 |\n| 6 | `bgm_shop` | 商店 / 篝火 / 事件 | 安静、放松、诡异中带暖意 | 木鱼 + 笛 + 篝火噼啪 | 60 | 60~90s | ⏳ 先挑 |\n"
N2 = "| 4 | `bgm_battle_elite` | 精英战 | 普通战斗的加强版 | 叠低音鼓 + 锣 | 110~120 | 60~90s | ✅ **要**（缺则退回普通战轨） |\n| 5 | `bgm_battle_boss` | Boss 战（9 个 Boss 共用） | 压迫感、燃、有「审判」味 | 大鼓 + 唢呐 / 低沉人声吟唱 | 120~130 | 90~120s | ✅ **要**（缺则退回普通战轨） |\n| 6 | `bgm_shop` | 商店 / 篝火 / 事件 | 安静、放松、诡异中带暖意 | 木鱼 + 笛 + 篝火噼啪 | 60 | 60~90s | ✅ **要**（缺则退回地图轨） |\n"

# ---------------------------------------------------------------- 3. 交付规格后的文件名清单

A3 = "> 现有 3 轨的文件名：`素材/music/bgm_menu.mp3`、`bgm_map.mp3`、`bgm_battle.mp3` —— 直接丢进去覆盖即可。\n"
N3 = ("> 6 轨的文件名（丢进 `素材/music/`，扩展名也认 ogg/wav/m4a）：\n"
      "> `bgm_menu` · `bgm_map` · `bgm_battle` · `bgm_battle_elite` · `bgm_battle_boss` · `bgm_shop`\n"
      "> 前 3 个对应「主菜单 / 地图 / 普通战」，后 3 个对应「精英战 / Boss 战 / 商店·营地·事件」。\n")

# ---------------------------------------------------------------- 4. 文末第二步

A4 = """- 只先要 **`bgm_menu` / `bgm_map` / `bgm_battle`** 这 3 个文件名（现有代码直接认），
  第 4~6 轨（精英 / Boss / 商店篝火）按第二节的表先挑好存着，等我扩轨道名
"""
N4 = """- **6 个文件名都可以直接交付**（v0.61.31 起全部已接线）：`bgm_menu` / `bgm_map` / `bgm_battle`
  / `bgm_battle_elite` / `bgm_battle_boss` / `bgm_shop`
- 建议顺序：先 `bgm_battle` 与 `bgm_map`（听到的频率最高）→ 再 `bgm_battle_boss`（Boss 战气势差别最大）
  → 最后 `bgm_menu` / `bgm_battle_elite` / `bgm_shop`
- 没交付的轨**自动退回基础轨**（Boss/精英→普通战、商店→地图），不会有任何报错或静音
"""

EDITS = [(LIST, A1, N1), (LIST, A2, N2), (LIST, A3, N3), (LIST, A4, N4)]


def main():
    if '6 轨全部已接线' in io.open(LIST, encoding='utf-8').read():
        print('SKIP 已改过')
        return 0
    cache, bad = {}, []
    for path, a, b in EDITS:
        if path not in cache:
            cache[path] = io.open(path, encoding='utf-8', newline='').read()
        n = cache[path].count(a)
        if n != 1:
            bad.append((os.path.relpath(path, ROOT), n, a.split('\n')[0][:60]))
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