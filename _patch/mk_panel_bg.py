# -*- coding: utf-8 -*-
"""生成选英雄面板的背景图 素材/ui/hero_panel_bg.png（程序化，可重复运行）。

为什么自绘而不是等美术：用户口径「该面板背景都弄好看点，你可以生一些简单的面板图，
现在的纯色面板有点low」。目标只有一个 —— 把 `.panel` 的纯色底换成**有质感的纸张**：
  墨底(#221c17) + 中央一层暖色晕 + 细颗粒 + 四角淡金纹 + 四周压暗。
全部是低对比度叠加 ⇒ 面板上的文字/卡片仍然清楚。

⚠️ 尺寸刻意压到 640×480：它会被 `background-size:100% 100%` 拉到面板大小，
   颗粒感靠的是频率不是绝对像素，再大只是徒增包体。噪声图 PNG 压不动，
   所以颗粒幅度取小（±4/255），既看不出色带、又不会让包体爆。

用法： python _patch/mk_panel_bg.py
"""
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, '素材', 'ui', 'hero_panel_bg.png')

W, H = 640, 480
INK2 = (0x22, 0x1c, 0x17)     # --ink2
INK3 = (0x2c, 0x25, 0x1e)     # --ink3
GOLD = (0xe0, 0xb3, 0x41)     # --gold


def fbm(shape, seed, octaves=4, base=6):
    """多倍频平滑噪声（每层把小网格放大插值），归一到 0..1。"""
    rng = np.random.default_rng(seed)
    h, w = shape
    out = np.zeros(shape, np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        gh = max(2, base << o)
        gw = max(2, int(round(base * w / float(h))) << o)
        g = rng.random((gh, gw)).astype(np.float32)
        im = Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        out += amp * (np.asarray(im).astype(np.float32) / 255.0)
        tot += amp
        amp *= 0.5
    return out / tot


def build():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    u = (xx / (W - 1)) * 2 - 1
    v = (yy / (H - 1)) * 2 - 1

    # ① 底色：中央暖、四周冷，用椭圆径向做一层柔和的中心提亮。
    r = np.sqrt((u / 1.15) ** 2 + (v / 1.25) ** 2)
    center = np.clip(1.0 - r, 0.0, 1.0) ** 1.4
    rgb = np.zeros((H, W, 3), np.float32)
    for c in range(3):
        rgb[..., c] = INK2[c] + (INK3[c] - INK2[c]) * center

    # ② 颗粒：两层不同频率的噪声，幅度很小（±4/255），只为了破掉纯色的"塑料感"。
    grain = (fbm((H, W), 11, octaves=5, base=8) - 0.5) * 2.0
    fine = (fbm((H, W), 29, octaves=3, base=64) - 0.5) * 2.0
    rgb += (grain * 5.0 + fine * 2.5)[..., None]

    # ③ 四周压暗（暗角），让面板边缘沉下去、同屏卡片浮起来。
    vig = np.clip(1.0 - (u * u * 0.34 + v * v * 0.42), 0.0, 1.0)
    rgb *= (0.72 + 0.28 * vig)[..., None]

    base = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), 'RGB').convert('RGBA')

    # ④ 淡金纹饰：一圈内嵌细线 + 四角如意云纹（全部低透明度，只是"边"上的点缀）。
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    gold_line = GOLD + (46,)
    inset = 9
    d.rectangle([inset, inset, W - 1 - inset, H - 1 - inset], outline=gold_line, width=2)
    d.rectangle([inset + 5, inset + 5, W - 6 - inset, H - 6 - inset], outline=GOLD + (22,), width=1)

    # 四角云纹：三层同心弧（圆心钉在角点上，只画朝内的那一象限）+ 一枚小圆点，
    # 再按角位镜像。全部低透明度 —— 只是"边"上的点缀，不抢中间的内容。
    C = 72
    corner = Image.new('RGBA', (C, C), (0, 0, 0, 0))
    cd = ImageDraw.Draw(corner)
    for rr in (26, 40, 54):
        cd.arc([-rr, -rr, rr, rr], 0, 90, fill=GOLD + (54,), width=2)
    cd.ellipse([9, 9, 15, 15], fill=GOLD + (64,))
    for fx, fy in ((False, False), (True, False), (False, True), (True, True)):
        t = corner.transpose(Image.FLIP_LEFT_RIGHT) if fx else corner
        t = t.transpose(Image.FLIP_TOP_BOTTOM) if fy else t
        px = inset + 3 if not fx else W - inset - 3 - t.width
        py = inset + 3 if not fy else H - inset - 3 - t.height
        ov.alpha_composite(t, (px, py))

    ov = ov.filter(ImageFilter.GaussianBlur(0.6))
    base.alpha_composite(ov)

    base.convert('RGB').save(OUT, 'PNG', optimize=True)
    print('OK -> 素材/ui/hero_panel_bg.png  %dx%d  %.1f KB'
          % (W, H, os.path.getsize(OUT) / 1024.0))


if __name__ == '__main__':
    build()