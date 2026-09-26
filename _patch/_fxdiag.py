# -*- coding: utf-8 -*-
"""诊断：度量口径对不对 —— 为什么有些特效钉在峰值帧上还是显得小。

怀疑两条（都在 shot_fx.py 的 measure() 里）：
  A. measure() 扫的是 range(f) = 第 0..f-1 格，**不是实播的 i0..i0+f-1**。
     i0 前面那几格虽然「看不见」（像素数 < LIVE_PX），但**不是 0** ——
     若那几个像素落在格子角落，并集 bbox 就被撑大 ⇒ 含量虚高 ⇒ scale 虚低 ⇒ 特效变小。
  B. 并集 bbox 会被**离群零散像素**（飞沫、孤立火花）撑大，哪怕它只占 0.01%。

本脚本对每个特效打印：
    f0len   素材里有像素的格子数
    i0,f    实播区间
    并集(全) 第 0..f-1 格的并集 bbox 边长（= 现在用的口径）÷480
    并集(实播) 第 i0..i0+f-1 格的并集 ÷480
    峰值帧   峰值帧**自己**的 bbox ÷480
    1%截尾   实播并集裁掉坐标 0.5%/99.5% 分位后的 ÷480
用法: python _patch/_fxdiag.py
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, '_patch'))
from shot_fx import fx_keys, coverage, live_range, LIVE_PX, CELL, COLS   # noqa: E402
import numpy as np                                                        # noqa: E402
from PIL import Image                                                     # noqa: E402

ASSD = os.path.join(ROOT, '素材', 'fx')


def alpha(k):
    return np.array(Image.open(os.path.join(ASSD, k + '.png')).convert('RGBA').split()[3])


def cells(a, idxs):
    for i in idxs:
        r, c = divmod(i, COLS)
        yield a[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL]


def union_fill(cs):
    x0 = y0 = 10 ** 9; x1 = y1 = -1
    for cell in cs:
        ys, xs = np.where(cell > 8)
        if len(xs) == 0:
            continue
        x0 = min(x0, int(xs.min())); x1 = max(x1, int(xs.max()))
        y0 = min(y0, int(ys.min())); y1 = max(y1, int(ys.max()))
    if x1 < 0:
        return 0.0
    return max(x1 - x0 + 1, y1 - y0 + 1) / float(CELL)


def trim_fill(cs, pct=0.005):
    """实播并集裁掉坐标两端 pct 分位后的边长占比 —— 抗离群像素。"""
    xs_all, ys_all = [], []
    for cell in cs:
        ys, xs = np.where(cell > 8)
        if len(xs) == 0:
            continue
        xs_all.append(xs); ys_all.append(ys)
    if not xs_all:
        return 0.0, 0
    xs = np.concatenate(xs_all); ys = np.concatenate(ys_all)
    lo_x, hi_x = np.percentile(xs, [pct * 100, 100 - pct * 100])
    lo_y, hi_y = np.percentile(ys, [pct * 100, 100 - pct * 100])
    return max(hi_x - lo_x + 1, hi_y - lo_y + 1) / float(CELL), len(xs)


def main():
    ks = fx_keys()
    cov = coverage()
    print('%-13s %5s %4s %4s | %8s %8s %8s %8s | %8s %8s' %
          ('key', 'f0len', 'i0', 'f', '全(旧口径)', '实播并集', '峰值帧', '1%截尾', 'scale现', 'scale新'))
    print('-' * 96)
    tot_old = tot_new = 0.0
    for k in sorted(ks):
        f0, rows, sc = ks[k]
        c = cov.get(k) or []
        i0, f = live_range(c)
        a = alpha(k)
        full = union_fill(cells(a, range(max(1, len(c)))))
        played = union_fill(cells(a, range(i0, i0 + f)))
        seg = c[i0:i0 + f]
        pk = i0 + (max(range(len(seg)), key=lambda i: seg[i]) if seg else 0)
        peak = union_fill(cells(a, [pk])) if seg else 0.0
        tr, npx = trim_fill(cells(a, range(i0, i0 + f)))
        s_new = min(3.0, 1.0 / tr) if tr else 1.0
        tot_old += sc; tot_new += round(s_new, 2)
        print('%-13s %5d %4d %4d | %8.3f %8.3f %8.3f %8.3f | %8.2f %8.2f%s' %
              (k, len(c), i0, f, full, played, peak, tr, sc, s_new,
               '  ←' if abs(s_new - sc) >= 0.15 else ''))
    print('-' * 96)
    print('scale 合计 现 %.1f → 新 %.1f' % (tot_old, tot_new))


if __name__ == '__main__':
    main()