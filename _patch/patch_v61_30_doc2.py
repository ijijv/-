# -*- coding: utf-8 -*-
r"""
v0.61.30 文档补 —— 更新日志条目 + README.txt 指路 + .gitignore 说明

本批**不动任何代码**，所以游戏版本号仍是 v0.61.30（原型.html ×2、60_boot.js ×1 三处不动）。
日志标题写成「v0.61.30 文档补」，以区别于已提交的那个 v0.61.30 代码批。

锚点唯一性各校验 count==1。
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
LOG = os.path.join(ROOT, '更新日志.md')
RTXT = os.path.join(ROOT, 'README.txt')

ENTRY = """## v0.61.30 文档补 · 素材清单 §1.6「按文件平铺交付单」+ .gitignore 修正（2026-09-21）

> **本批不动代码，游戏版本号仍为 v0.61.30。** 只加交付文档、一个校验脚本，和一处 .gitignore 修正。

### 新增 §1.6 按文件平铺交付单（70 行）

原来的 §1.3 是**按复用组**的深度工作单（有搜词、自录法、为什么这么归组）。你要的是能一行一行
照着做的形态，所以把同一批内容**按文件名平铺**成 9 张小表（A~I 组），**一个交付文件一行**：

| 列 | 内容 |
|---|---|
| `#` | 1~70 连续编号 |
| 交付文件名 | `` `<键名>_<变体号>.mp3` `` —— 照抄即可，代码零映射 |
| 用途（谁会响） | 这张牌/这个敌人/这个机制触发时它响，写清组内范围 |
| 提示词（直接粘给 AI） | 英文 prompt，可直接复制去生成 |
| 要求 | 时长 / 建议变体数 / 单声道 / 音色要点 |

**底数**：70 键 = 69 条复用组（A 8 + B 6 + C 11 + D 13 + E 10 + F 1 + G 5 + H 12 + I 3）
+ 1 个遗留键 `hit`。逐条标记 **🔗 已接线 37**（交付同名文件立刻出声）、
**⏳ 入表待接线 32**（采样先能到位，缺的只是触发点）、**🚫 不必买 1**（`hit`）、
**✅ 你已交付 26**。

每组表下另有**复用说明**，把「省下来的条数」列清楚：F 组 9 词缀里 8 个复用（省 8 条）、
G 组 6 个 Boss 机制复用（省 6 条）、聚宝盆→`gold`、返魂香→`heal`。

### 新增 `_patch/verify_sfx_doc.py` —— 交付单与代码逐键对齐

交付单**写了什么文件名，你就会去做什么文件**：多写一个 = 你白做一个；少写一个 = 那个键永远没素材。
所以这里做**机器对齐**，不靠眼看，也避免「文档写好了但和代码脱节」这种最常见的老化方式。

它自己跑冒烟宿主导出 `SFX_KEYS`（不依赖预先存在的中间文件），然后校验：

- 交付行数 = 70，编号 1~70 连续无重复
- §1.6 的键集合与 `SFX_TABLE` **双向求差** —— 两个方向都报「谁会白做」
- 剔除遗留键 `hit` 后，次序与 `SFX_TABLE` **逐位一致**
  （`hit` 归在 A 组打击层、表里排末尾，整体错位 1 格属有意排布）
- 🔗+⏳+🚫 = 70，且正文声明的三个条数与实际相符
- 标 ✅ 的条数与 `素材/sfx/` 下**实际文件**互相对得上（多标、少标、命名不符都报）

**先证明它会红**：临时往表里注入 `hit_fake`（表里有、文档没写）、删掉 `boss_ledger`
（文档写了、表里没有），跑出 3 项 FAIL；还原后全绿。不会红的校验等于没有校验。

```
python _patch/verify_sfx_doc.py            # 重新导出键名表并校验
python _patch/verify_sfx_doc.py --cached   # 用上次导出的表，省一次 node 启动
```

### 修正 `.gitignore`：三条模式**从来没生效过**

`.gitignore` **不支持行尾注释** —— `~$*   # 说明文字` 会被当成**整条模式**，永远匹配不上。
本仓库有三条踩了这个坑：

| 行 | 写的 | 实际效果 |
|---|---|---|
| `~$*          # Office 锁文件…` | 想忽略锁文件 | **一直没生效** |
| `_patch/_*.json      # 运行产物…` | 想忽略中间产物 | **一直没生效** |
| `_patch/_pre/        # 改前树…` | 想忽略还原目录 | **一直没生效** |

后果是实打实的：`素材/~$README.md`（Word 的 162 字节锁文件）**自 V36 起一直被跟踪**，
每次改 `素材/README.md` 都会把它一起提交；另有 5 个 `_patch/_*.json` 产物被跟踪。
（v0.61.30 提交时我以为是新混进去的，查了提交史才发现是老账。）

修法：注释移到独立行，模式单独成行。然后 `git rm --cached` 取消跟踪 6 个文件 ——
**`--cached` 只从版本库移除，磁盘上的文件原样保留**（素材目录下的东西不擅自删）。

### 仍未做（挂账，不谎报）

- 70 键里 **32 键入表待接线**：采样先能到位，缺的只是调用点触发
- BGM 文档写 6 轨，**代码仍只认 `menu`/`map`/`battle` 三轨**

---

"""

# 插在已有的 v0.61.30 代码批条目之前
A1 = "## v0.61.30 修「复活后打死最后一个敌人，战斗永远不结算」+ 本地试玩入口（2026-09-21）\n"
N1 = ENTRY + A1

A2 = "  · 素材清单.md  → 音效/BGM/角色动画/背景的素材平台 + 搜索关键词\n"
N2 = ("  · 素材清单.md  → 音效/BGM/角色动画/背景的素材平台 + 搜索关键词\n"
      "                   （音效不用读全篇：直接跳 §1.6「按文件平铺交付单」，一文件一行、带提示词）\n")

EDITS = [(LOG, A1, N1), (RTXT, A2, N2)]


def main():
    if 'v0.61.30 文档补' in io.open(LOG, encoding='utf-8').read():
        print('SKIP 已加过')
        return 0
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