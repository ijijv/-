# -*- coding: utf-8 -*-
"""生成 `素材/fx/multi_slash.png`（多段斩击：8 列 × 6 行 = 6 个方向 × 8 帧）。

用户口径（2026-10-06）：
  「多段斩击只要由方向不同，特效相近的几组特效组成，具体释放特效层数按照斩击段数」
⇒ 一排 = 一个方向的一记斩击（8 帧：起手 → 最亮 → 淡出），6 排 = 6 个方向。
  `js/30_engine.js` 的 `burstShow` 每段换一个方向（i0 = 方向 × 8），段数 = 引爆层数。

为什么不用现成素材旋转（试过，废了）：
  30 张 `素材/fx/*.png` 全是「能量球 + 纹样」的画法，
  最接近斩击的 `jian` 也只是「一颗球 + 一道细亮线」，照中心转 6 个角度之后
  读起来是「球插了根棍子」，不是斩击。
⇒ 改为**程序绘制**：一条带弧度的斩痕（二次贝塞尔脊线 + 两端收锋），
  白热核心 → 青色内缘 → 蓝色外辉光，8 帧做「扫出 → 峰值 → 消散」。

跑法：`python _patch/mk_multi_slash.py`
  （生成图 + 打印可直接粘进 `js/20_data.js` 的实测 FX_SHEETS 行 + 出预览 `_patch/_ms_preview.png`）
"""
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FX = os.path.join(ROOT, u'素材', u'fx')
DST = os.path.join(FX, 'multi_slash.png')
PREVIEW = os.path.join(HERE, '_ms_preview.png')

CELL = 240          # v1.1.20r：与 js/20_data.js 的合成格口径一致（480→240）
COLS = 8
ANGLES = [0, 30, 60, 90, 120, 150]
ALPHA_TH = 8                    # 与 mk_fx_sheets.py / shot_fx.py 同一口径

L = 420.0                       # 斩痕弦长
BULGE = 56.0                    # 弧高（向 -y 凸）
W = 15.0                        # 峰值半厚（核心）
SS = 2                          # 超采样倍数（画完缩回 480，边缘自带抗锯齿）

UMAX = [0.34, 0.55, 0.76, 0.92, 1.00, 1.00, 1.00, 1.00]      # 每一帧扫到哪儿
TK = [0.72, 0.92, 1.10, 1.24, 1.30, 1.34, 1.38, 1.42]        # 厚度倍数
BR = [0.46, 0.72, 0.92, 1.00, 1.00, 0.70, 0.44, 0.20]        # 亮度

CORE = (255, 255, 255)
INNER = (168, 232, 255)         # 青白内缘
GLOW = (96, 148, 255)           # 蓝色外辉光


def spine(u):
    """二次贝塞尔脊线：(0,0)→(L,0)，中点抬到 -BULGE。返回 480 坐标系下的点。"""
    x = (u - 0.5) * L
    y = 2 * u * (1 - u) * (-2 * BULGE)
    return x, y


def mask_of(umax, tk):
    """把 [0, umax] 这段脊线按「两端收锋」的厚度画成灰度掩膜。"""
    n = CELL * SS
    m = Image.new('L', (n, n), 0)
    d = ImageDraw.Draw(m)
    steps = 200
    for j in range(steps + 1):
        u = umax * j / steps
        # sin 包络 = 两端细中间粗；umax<1 时再压一道前缘收锋（不然扫出去的是个钝头）
        r = W * tk * (math.sin(math.pi * u) ** 0.55)
        if umax < 1.0:
            r *= min(1.0, max(0.0, (umax - u) / 0.10))
        if r < 0.6:
            continue
        x, y = spine(u)
        cx, cy = n / 2 + x * SS, n / 2 + y * SS
        rr = r * SS
        d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=255)
    return m.resize((CELL, CELL), Image.LANCZOS)


def frame_of(umax, tk, br):
    """一帧：辉光层 + 核心层。返回 480×480 RGBA（内容按格子中心居中）。"""
    mp = mask_of(umax, tk)
    m = np.array(mp).astype(np.float32) / 255.0
    glow = np.array(mp.filter(ImageFilter.GaussianBlur(13))).astype(np.float32) / 255.0
    edge = np.array(mp.filter(ImageFilter.GaussianBlur(4))).astype(np.float32) / 255.0
    out = np.zeros((CELL, CELL, 4), np.float32)
    out[..., 3] = np.clip(glow * 0.60 * br, 0, 1)
    out[..., 0] = GLOW[0] / 255.0; out[..., 1] = GLOW[1] / 255.0; out[..., 2] = GLOW[2] / 255.0
    core = np.zeros((CELL, CELL, 4), np.float32)
    core[..., 3] = np.clip(m * br, 0, 1)
    # 中心白热 → 边缘青白：用 blur 后的 m 当「离脊线的远近」代理
    t = np.clip(edge, 0, 1)[..., None]
    core[..., :3] = ((1 - t) * np.array(CORE, np.float32) + t * np.array(INNER, np.float32)) / 255.0
    base = Image.fromarray((out * 255).astype(np.uint8), 'RGBA')
    top = Image.fromarray((core * 255).astype(np.uint8), 'RGBA')
    return Image.alpha_composite(base, top)


def fit_rotate(frames, ang):
    """先按外接圆预缩到格子的内切圆里，再原地转 —— 否则转到 45° 时斩痕两端会被格子切掉。"""
    X0 = Y0 = 10 ** 9
    X1 = Y1 = -1
    for f in frames:
        a = np.array(f.split()[3])
        ys, xs = np.where(a > ALPHA_TH)
        if not len(xs):
            continue
        X0 = min(X0, int(xs.min())); X1 = max(X1, int(xs.max()))
        Y0 = min(Y0, int(ys.min())); Y1 = max(Y1, int(ys.max()))
    bw, bh = X1 - X0 + 1, Y1 - Y0 + 1
    half = math.hypot(bw, bh) / 2.0
    s = min(1.0, 0.98 * (CELL / 2.0) / half)
    D = int(math.ceil(half * s * 2)) + 2
    out = []
    for f in frames:
        crop = f.crop((X0, Y0, X1 + 1, Y1 + 1)).resize(
            (max(1, int(round(bw * s))), max(1, int(round(bh * s)))), Image.LANCZOS)
        sq = Image.new('RGBA', (D, D), (0, 0, 0, 0))
        sq.paste(crop, ((D - crop.width) // 2, (D - crop.height) // 2))
        if ang:
            sq = sq.rotate(ang, resample=Image.BICUBIC)
        cell = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
        cell.paste(sq, ((CELL - D) // 2, (CELL - D) // 2))
        out.append(cell)
    return out, (bw, bh, half, s)


def main():
    base = [frame_of(UMAX[i], TK[i], BR[i]) for i in range(8)]
    sheet = Image.new('RGBA', (COLS * CELL, len(ANGLES) * CELL), (0, 0, 0, 0))
    for r, ang in enumerate(ANGLES):
        fr, info = fit_rotate(base, ang)
        if r == 0:
            print(u'源内容框 %dx%d  外接圆半径 %.1f  预缩 %.3f' % info)
        for k, f in enumerate(fr):
            sheet.paste(f, (k * CELL, r * CELL))
    sheet.save(DST, 'PNG')
    print(u'已写出 %s  %dx%d  %.2fMB' % (os.path.relpath(DST, ROOT), sheet.size[0],
                                        sheet.size[1], os.path.getsize(DST) / 1048576.))

    prev = Image.new('RGBA', (COLS * 120, len(ANGLES) * 120), (18, 18, 18, 255))
    for i in range(COLS * len(ANGLES)):
        rr, cc = divmod(i, COLS)
        prev.paste(sheet.crop((cc * CELL, rr * CELL, cc * CELL + CELL, rr * CELL + CELL))
                   .resize((120, 120), Image.LANCZOS), (cc * 120, rr * 120))
    prev.convert('RGB').save(PREVIEW)

    # 实测 FX_SHEETS 参数：逐格量（多方向图不能用整图一次量的口径）
    b = np.array(sheet.split()[3])
    X0 = Y0 = 10 ** 9
    X1 = Y1 = -1
    for i in range(len(ANGLES) * COLS):
        rr, cc = divmod(i, COLS)
        c2 = b[rr * CELL:(rr + 1) * CELL, cc * CELL:(cc + 1) * CELL]
        ys, xs = np.where(c2 > ALPHA_TH)
        if not len(xs):
            continue
        X0 = min(X0, int(xs.min())); X1 = max(X1, int(xs.max()))
        Y0 = min(Y0, int(ys.min())); Y1 = max(Y1, int(ys.max()))
    fw = (X1 - X0 + 1) / float(CELL)
    fh = (Y1 - Y0 + 1) / float(CELL)
    sc = round(min(3.0, 1.0 / max(fw, fh)), 2)
    ox = ((X0 + X1) / 2.0 - CELL / 2.0) / float(CELL)
    oy = ((Y0 + Y1) / 2.0 - CELL / 2.0) / float(CELL)
    ox = 0.0 if abs(ox) < 0.04 else round(ox, 2)
    oy = 0.0 if abs(oy) < 0.04 else round(oy, 2)
    print(u'\n/* 粘进 js/20_data.js 的 FX_SHEETS（放在 lifesteal 与 shiqi 之间）：*/')
    print(u"  multi_slash: { c:8, f:8, rows:%d, i0:0, scale:%.2f%s },"
          % (len(ANGLES), sc, (u', ox:%g, oy:%g' % (ox, oy)) if (ox or oy) else u''))


if __name__ == '__main__':
    main()