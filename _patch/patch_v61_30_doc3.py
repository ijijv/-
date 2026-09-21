# -*- coding: utf-8 -*-
r"""
v0.61.30 文档补 2 —— 修正「余下 44 条待接线」这个算错的数字

【错在哪】
  两处写「69 组里减去本批 26，加遗留 hit = 44 条入表待接线」（更新日志.md 197 行、
  素材清单.md 734 行）。但 69 - 26 + 1 = 44 这个算式**把 11 个「现有仍在出声」的旧键
  重复算进了待接线** —— 同一段的上一句才刚写「26 新增 + 11 现有 = 37 条真出声」。

  正确：70 键 = 37 已接线 + 33 未接线；33 里 32 条待接线 + 1 条遗留键 hit（退役，不必做）。
  即 69 - 26 - 11 + 1 = 33。

【怎么发现的】用户追问「⏳ 那 32 条就是 32 键吗」，顺手把 §1.6 的 🔗 标注与
  js/ 里所有能进 sfx() 的键做了双向核对（字面量 + sfxOnce + pickHitSfx 动态分发），
  37 个 🔗 全部有调用点、32 个 ⏳ 全部无调用点、hit 零调用点 —— 数字对得上，
  反倒暴露出旧文案的 44 是错的。

锚点唯一性各校验 count==1。
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
LOG = os.path.join(ROOT, '更新日志.md')
LIST = os.path.join(ROOT, '素材清单.md')

A1 = ("- **剩下 44 条键名入表但未接线**（69 组里减去本批 26，加遗留 `hit`）。"
      "它们**采样先能到位**（丢文件就有声，因为 `sfx()` 是先试采样再回退合成的），"
      "只是**还没有调用点去触发**。")
N1 = ("- **剩下 32 条键名入表但未接线**（70 键 − 37 已接线 − 1 条退役的遗留键 `hit`；"
      "**注意别把上面 11 条「现有仍在出声」的旧键也算进来** —— 它们早就有调用点，"
      "少算这 11 条会得出 44 这个虚高的数）。"
      "它们**采样先能到位**（丢文件就有声，因为 `sfx()` 是先试采样再回退合成的），"
      "只是**还没有调用点去触发**。")

A2 = "> **合计本批真出声 = 26 新增 + 11 现有 = 37 条**（其余 44 条入表待接线，交付后我按第二批补接线）。\n"
N2 = ("> **合计本批真出声 = 26 新增 + 11 现有 = 37 条**（其余 33 条入表待接线 = 32 条待接线 + "
      "1 条退役的遗留键 `hit`，交付后我按第二批补接线）。\n")

EDITS = [(LOG, A1, N1), (LIST, A2, N2)]


def main():
    if '别把上面 11 条' in io.open(LOG, encoding='utf-8').read():
        print('SKIP 已改过')
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