# -*- coding: utf-8 -*-
"""
v0.61.30 文档 —— 更新日志条目 + README.txt 补 试玩.py

锚点唯一性各校验 count==1。
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
LOG = os.path.join(ROOT, '更新日志.md')
RTXT = os.path.join(ROOT, 'README.txt')

ENTRY = """## v0.61.30 修「复活后打死最后一个敌人，战斗永远不结算」+ 本地试玩入口（2026-09-21）

> 玩家实测报的卡死。**这是 v0.61 B4 引入的回归**，不是老问题。另加一个起本地 http 服务的
> `试玩.py`，解决「把 mp3 放进 素材/sfx/ 却听不到」这个反复踩的坑。

### 卡死是怎么来的

v0.61 B4 给 `winFight()` 加了重入守卫 `if(G.battleOver) return;`，同时在 `loseGame()` 里
统一置 `G.dead=true; G.battleOver=true;`。**但 `revive()` 只清了 `G.dead`，没清 `G.battleOver`。**

于是「死亡 → 复活 → 继续同一场战斗」之后，`battleOver` 恒为 `true`：打死最后一个敌人时
`winFight()` 在守卫处直接 `return`，结算面板永远不出。屏幕表现就是**「（敌人已清）」但界面卡死**，
结束回合按钮还在，点什么都没反应。

**怎么确认是这一条、而不是别处抛异常**：战斗日志里**没有「击败了所有敌人！」这一行** ——
那是 `winFight()` 的第 4 句，若是中途抛错，这行早该打出来了。所以它是**在守卫那一行就返回了**，
说明进来时 `battleOver` 已经是 `true`。

**修法**：`revive()` 里补一句 `G.battleOver=false;` —— 复活回到的是**同一场战斗**，终局旗标必须一并清掉。

### 回归用例（先复现，再验修好）

冒烟里加了一组用例，并把修复**临时撤掉跑过一遍**确认它真会红：

| 用例 | 撤掉修复时 | 修好后 |
|---|---|---|
| `revive 后 battleOver 已清` | ❌ `battleOver=true` | ✅ |
| `复活后清场 → 胜利结算执行` | ❌ `result=null`（＝玩家看到的卡死态） | ✅ `result={...}` |

### 顺带：双击打开时不再「静默不生效」

`file://` 双击打开时，外置音效采样探测本来就被**有意跳过**（浏览器拦 fetch，试也白试），
但一直是无声的 —— 把 mp3 放进 `素材/sfx/` 却听不到，只会以为「素材没生效」。
现在这种情况会在**控制台说明一次**原因并给出路。随时可在控制台执行 `sfxSamples()` 查采样状态。

### 新增 `试玩.py`

```
python 试玩.py          # 起本地 http 服务并自动开浏览器（默认 8181）
python 试玩.py 9000     # 换端口
python 试玩.py --no-open
```

- **关缓存**（`no-store`）：换了 mp3 刷新即生效，不会还听到旧的 —— 否则很容易误判成「没生效」
- **静音访问日志**：一次加载要对每个键试 4 种扩展名，几百条 404 刷屏没意义
- 打包产物 **不需要**它（音效已 base64 内联进那一个文件）

### 验收
- 源码冒烟 **731 → 738 全绿**（新增 7 条）
- 产物冒烟 **731 / 7**：那 7 条仍是既有的「查源码文本」类断言，与本次无关，**数量未变**
- `python _patch/verify_dist.py` **全部通过**，其中 `[2b]` **机器确认了已放的 26 个音效文件键名全部合法**
- `python 打包.py` 产物 6.85 MB，音效 `sfx/` 26 个共 1829 KB 已内联
- `node --check` 干净；`grep -n ",,"` 干净；版本号 v0.61.25 → **v0.61.30**

---

"""

A1 = "## v0.61.25 批4 前置：音效规格文档 69 组 + 采样通路 + 26 键高频接线（2026-09-20）\n"
N1 = ENTRY + A1

A2 = "  · 原型.html    → 可玩原型（双击用浏览器打开）\n"
N2 = ("  · 原型.html    → 可玩原型（双击用浏览器打开；但想让 素材/sfx/ 里的音效生效，用 python 试玩.py 起本地服务再开）\n"
      "  · 试玩.py      → 起本地 http 服务并打开原型（外置音效/素材探测需要 http，file:// 下浏览器会拦）\n")

EDITS = [(LOG, A1, N1), (RTXT, A2, N2)]


def main():
    cache, bad = {}, []
    for path, a, b in EDITS:
        if path not in cache:
            cache[path] = io.open(path, encoding='utf-8', newline='').read()
        n = cache[path].count(a)
        if n != 1:
            bad.append((os.path.basename(path), n, a.split('\n')[0][:56]))
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