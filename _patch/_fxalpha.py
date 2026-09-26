# -*- coding: utf-8 -*-
"""诊断：对照图里「看不见」的格子，是**素材本身淡**还是**尺寸算小了**？

这两件事的修法完全不同：
  · 尺寸算小了 ⇒ 改 FX_SHEETS 的 scale（我的锅，能修）
  · 素材本身淡 ⇒ 是出图时的透明度约定（用户已定「原样加入」），只该如实报告

对每个特效，取**实播区间里覆盖率最高的那一帧**，统计该帧的：
    maxA   最大 alpha（255 = 实心；若只有 60，贴到屏幕上就是一层雾）
    meanA  alpha>8 的像素的平均 alpha
    d128   alpha ≥ 128 的像素占该帧的比例（真正「看得见」的实心部分）
并把它在 900 宽下**实际屏幕像素**里的实心面积算出来（d128 × 内容框面积）。
用法: python _patch/_fxalpha.py
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, '_patch'))
from shot_fx import fx_keys, coverage, live_range, peak_frame, CELL, COLS   # noqa: E402
import numpy as np                                                          # noqa: E402
from PIL import Image                                                       # noqa: E402

ASSD = os.path.join(ROOT, '素材', 'fx')


def main():
    ks = fx_keys()
    cov = coverage()
    print('%-13s %4s %4s | %5s %6s %6s | %s' % ('key', 'i0', 'f', 'maxA', 'meanA', 'd128', '判读'))
    print('-' * 78)
    faint = []
    for k in sorted(ks):
        f0, rows, sc = ks[k]
        c = cov.get(k) or []
        i0, f = live_range(c)
        pk = peak_frame(c, i0, f)
        a = np.array(Image.open(os.path.join(ASSD, k + '.png')).convert('RGBA').split()[3])
        r, col = divmod(pk, COLS)
        cell = a[r * CELL:(r + 1) * CELL, col * CELL:(col + 1) * CELL]
        nz = cell[cell > 8]
        maxA = int(cell.max())
        meanA = float(nz.mean()) if nz.size else 0.0
        d128 = float((cell >= 128).sum()) / float(cell.size)
        note = ''
        if maxA < 160 or meanA < 60:
            note = '素材本身淡（不是尺寸问题）'
            faint.append(k)
        elif d128 < 0.004:
            note = '实心部分很少（多为薄雾/细线）'
        print('%-13s %4d %4d | %5d %6.1f %6.3f | %s' % (k, i0, f, maxA, meanA, d128, note))
    print('-' * 78)
    print('素材本身偏淡的：%s' % (', '.join(faint) or '无'))


if __name__ == '__main__':
    main()