# -*- coding: utf-8 -*-
"""量卡牌正视图（素材/ui/card/front.png）里两个窗口的精确位置，输出可直接抄进 CSS 的百分比。

为什么要有这个脚本（而不是目测）：
  手牌正面是「木框 + 上深色图窗 + 下米黄铭牌窗」。CSS 要把卡图/卡名/描述分别塞进
  这两个窗里，就得知道窗的 left/top/width/height。目测在 385x583 上误差 ±10px，
  换算成小卡（98 宽）还行，换算成 132 宽就是 3px 偏，卡名会压到金边上。
  **按颜色找米黄窗会失败** —— 窗内的米黄和木框上的金描边是同一个色系（188,154,88 一带），
  实测 bbox 直接圈住整张卡。所以按**亮度**找：图窗是暗的、铭牌窗是亮的，两者天然分离。

做法：先把两个窗口各自在「上一窗口之下」的区域里按行/列找，再做一次连通域收边。
     ——「在上一窗口之下」这条约束是关键：不约束的话铭牌窗那一片亮色会把木框上沿也算进去。

用法： python _patch/measure_card_frame.py [--map]
       --map 额外打一张 60x40 的 ASCII 剖面图（亮度分档），用来肉眼校对。
"""

import argparse
import io
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, '素材', 'ui', 'card', 'front.png')

# 亮度分档（0-255）
DARK = 110      # 图窗内部（墨黑）
LIGHT = 150     # 铭牌窗内部（米黄，明显亮于木质与金边）


def load():
    from PIL import Image
    im = Image.open(SRC).convert('RGBA')
    return im


def lum(px):
    r, g, b, a = px
    if a < 24:
        return None
    return (r * 299 + g * 587 + b * 114) // 1000


def profile(im, axis):
    """按行(axis=0)或列(axis=1)统计：不透明像素里有多少比例是「暗」和「亮」。

    返回 [(index, dark_ratio, light_ratio, opaque_ratio), ...]
    """
    w, h = im.size
    px = im.load()
    n = h if axis == 0 else w
    m = w if axis == 0 else h
    out = []
    for i in range(n):
        d = l = o = 0
        for j in range(m):
            v = lum(px[j, i] if axis == 0 else px[i, j])
            if v is None:
                continue
            o += 1
            if v < DARK:
                d += 1
            elif v > LIGHT:
                l += 1
        out.append((i, d / float(m), l / float(m), o / float(m)))
    return out


def span(rows, key, lo, hi, thresh):
    """在 [lo,hi) 里找 key 比例 >= thresh 的**连续**最长段，返回 (起, 止含)。"""
    best = None
    cur = None
    for i in range(lo, min(hi, len(rows))):
        v = rows[i][key]
        if v >= thresh:
            if cur is None:
                cur = i
            elif i - cur + 1 > (best[1] - best[0] + 1 if best else 0):
                pass
            end = i
        else:
            if cur is not None:
                if best is None or (end - cur) > (best[1] - best[0]):
                    best = (cur, end)
                cur = None
    if cur is not None and (best is None or (end - cur) > (best[1] - best[0])):
        best = (cur, end)
    return best


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--map', action='store_true', help='额外打一张 ASCII 剖面图')
    a = ap.parse_args()

    if not os.path.isfile(SRC):
        sys.exit('找不到 %s' % SRC)
    im = load()
    W, H = im.size
    print('正视图：%s  %dx%d\n' % (os.path.join('素材', 'ui', 'card', 'front.png'), W, H))

    rows = profile(im, 0)
    cols = profile(im, 1)

    if a.map:
        print('—— ASCII 剖面（行 = y/H，列 = x/W）——')
        print('    " "=透明  "."=亮(铭牌窗)  "#"=暗(图窗)  "-"=中间调(木/金边)')
        px = im.load()
        RY, RX = 44, 56
        for ry in range(RY):
            line = []
            for rx in range(RX):
                x = int((rx + .5) * W / RX)
                y = int((ry + .5) * H / RY)
                v = lum(px[x, y])
                line.append(' ' if v is None else ('.' if v > LIGHT else ('#' if v < DARK else '-')))
            print('%4d %s' % (int((ry + .5) * H / RY), ''.join(line)))
        print('')

    # —— 图窗（暗）：整张卡上半部找 ——
    art_v = span(rows, 1, 0, H, 0.45)
    if not art_v:
        sys.exit('找不到图窗的纵向范围 —— 阈值要调（DARK=%d）' % DARK)
    ay0, ay1 = art_v
    art_h = span(cols, 1, 0, W, 0.45)
    if art_h:
        ax0, ax1 = art_h
    else:
        # 整列统计会把框外也算进来，退化成「在图窗那几行里找暗列」
        px = im.load()
        xs = []
        for x in range(W):
            d = m = 0
            for y in range(ay0, ay1 + 1):
                v = lum(px[x, y])
                if v is None:
                    continue
                m += 1
                if v < DARK:
                    d += 1
            if m and d / float(m) >= 0.6:
                xs.append(x)
        ax0, ax1 = (min(xs), max(xs)) if xs else (0, W - 1)

    # —— 铭牌窗（亮）：**只在图窗之下**找 ——
    txt_v = span(rows, 2, ay1 + 1, H, 0.45)
    if not txt_v:
        sys.exit('找不到铭牌窗的纵向范围')
    ty0, ty1 = txt_v
    px = im.load()
    xs = []
    for x in range(W):
        l = m = 0
        for y in range(ty0, ty1 + 1):
            v = lum(px[x, y])
            if v is None:
                continue
            m += 1
            if v > LIGHT:
                l += 1
        if m and l / float(m) >= 0.6:
            xs.append(x)
    tx0, tx1 = (min(xs), max(xs)) if xs else (ax0, ax1)

    def pct(a, b, total):
        return a * 100.0 / total, (b - a + 1) * 100.0 / total

    print('%-10s %-18s %-22s %s' % ('窗口', '像素 (l,t,r,b)', '百分比 l/t/w/h', 'CSS 建议值'))
    for name, (x0, y0, x1, y1) in (('图窗', (ax0, ay0, ax1, ay1)), ('铭牌窗', (tx0, ty0, tx1, ty1))):
        l, w_ = pct(x0, x1, W)
        t, h_ = pct(y0, y1, H)
        print('%-10s %-18s %-22s left:%.2f%%; top:%.2f%%; width:%.2f%%; height:%.2f%%'
              % (name, '%d,%d,%d,%d' % (x0, y0, x1, y1),
                 '%.2f/%.2f/%.2f/%.2f' % (l, t, w_, h_), l, t, w_, h_))

    print('\n比例核对：图窗 %.3f:1（素材/card/*.png 是 256x192 = 1.333:1）'
          % ((ax1 - ax0 + 1) / float(ay1 - ay0 + 1)))
    print('整卡 %.4f:1（.card 现有 132x200 = %.4f:1）' % (W / float(H), 132 / 200.0))


if __name__ == '__main__':
    main()