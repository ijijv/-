# -*- coding: utf-8 -*-
r"""
v0.61.31 修正 —— verify_dist.py：三条升级轨是**可选**，不该进「必须命中」清单

【错在哪】第一版把 `music:` 由 3 条扩成 6 条，想让新轨别被误报为「从未被请求」。
  但 `music:` 这个清单在 [1] 里是**必须命中**的语义：
      want += [('music/bgm_%s.mp3' % i) for i in ids['music']]
      miss = [w for w in want if w not in keys]
      check(not miss, '游戏请求的 %d 个素材全部命中')
  于是跑出 FAIL：缺 `bgm_battle_elite` / `bgm_battle_boss` / `bgm_shop` ——
  用户还没交付这三首（这是**正常状态**，代码会自动退回基础轨），却被判为缺料。
  这是**我把校验器改坏了**，不是产物坏了。

【怎么修】沿用文件里**已有的先例**（不是我新发明的口径）：
       # 音效是「可选覆盖」：没文件就走合成，所以不算未使用
       unused = sorted(k for k in (keys - set(want)) if not k.startswith('sfx/'))
  三条升级轨处境完全相同 —— 缺文件时退回基础轨（v0.61.31 实现），所以：
    · 不进 `want`（不是必须命中，没有也不算缺料）
    · 但要进「已请求」集合，否则用户哪天交付了 `bgm_shop.mp3` 会被误报「从未被游戏请求」
  故新增独立的 `musicOptional` 清单，只用于从 unused 里排掉，不参与必须命中判定。

【注意】这里**不能**沿用第一版思路把它塞进 `music:`。以后再看到这三条轨，
  请记住：`music:` = 缺了就是 bug；`musicOptional:` = 缺了是正常，交付了即生效。

锚点唯一性各校验 count==1。
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
VDIST = os.path.join(HERE, 'verify_dist.py')

A1 = """          "bg:['menu'].concat(ACTS.map((a,i)=>'act'+(i+1))),music:['menu','map','battle','battle_elite','battle_boss','shop'],"
"""
N1 = """          "bg:['menu'].concat(ACTS.map((a,i)=>'act'+(i+1))),"
          # 必须命中：缺任何一个都是 bug
          "music:['menu','map','battle'],"
          # v0.61.31 起代码支持这三条升级轨，但**缺文件时会退回基础轨**（Boss/精英→battle、商店→map），
          # 所以它们不是「必须命中」，而是「交付即生效」。只用于把已交付的从 unused 里排掉。
          "musicOptional:['battle_elite','battle_boss','shop'],"
"""

A2 = """    # 音效是「可选覆盖」：没文件就走合成，所以不算未使用
    unused = sorted(k for k in (keys - set(want)) if not k.startswith('sfx/'))
"""
N2 = """    # 「可选覆盖」的两类，没文件都有兜底，故不算未使用：
    #   · 音效 sfx/：没文件就走程序化合成
    #   · 三条升级轨：没文件就退回基础轨（v0.61.31，Boss/精英→battle、商店→map）
    # 其余素材缺一个就是真缺（[1] 会报），这里只盘点「打进来但游戏永远不会请求」的。
    optional_music = set('music/bgm_%s.mp3' % i for i in ids['musicOptional'])
    unused = sorted(k for k in (keys - set(want))
                    if not k.startswith('sfx/') and k not in optional_music)
"""

EDITS = [(VDIST, A1, N1), (VDIST, A2, N2)]


def main():
    if 'musicOptional' in io.open(VDIST, encoding='utf-8').read():
        print('SKIP 已改过')
        return 0
    cache, bad = {}, []
    for path, a, b in EDITS:
        if path not in cache:
            cache[path] = io.open(path, encoding='utf-8', newline='').read()
        raw = cache[path]
        # 本仓库换行不统一：js/*.js 是 LF，但 _patch/verify_dist.py 整份是 CRLF（190/190）。
        # 锚点按可读性写成 \n，这里按**目标文件实际的换行序列**折算后再匹配，
        # 否则多行锚点会 count=0（第一版就是这么失败的：单行锚点碰巧不含换行，所以没事）。
        nl = '\r\n' if '\r\n' in raw else '\n'
        a2 = a.replace('\n', nl)
        b2 = b.replace('\n', nl)
        n = raw.count(a2)
        if n != 1:
            bad.append((os.path.relpath(path, ROOT), n, a.split('\n')[0][:60]))
            continue
        cache[path] = raw.replace(a2, b2, 1)
        print('  换行序列 %s' % repr(nl))
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