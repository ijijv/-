"""
棕黑色荆棘反伤特效 v3
三段动画：
 帧1-16: 圆柱圆顶雾蒙蒙屏障从中心向上生成
 帧17-32: 抓痕打在屏障表面，溅射红色血迹
 帧33-48: 屏障边缘扩散淡金色气浪，打散抓痕，逐渐消失
6行x8列=48帧，每帧480x480
"""
import math
import random
from PIL import Image, ImageDraw, ImageFilter

random.seed(99)

FW, FH = 480, 480
COLS, ROWS = 8, 6
TOTAL = COLS * ROWS
CX, CY = FW // 2, FH // 2

# 圆顶屏障底部在画面下方1/3处，圆顶向上拱
BASE_Y = FH - 80
DOME_H = 200  # 圆顶高度


def draw_dome_silhouette(alpha):
    """画一个圆柱圆顶的雾蒙蒙屏障，返回Layer"""
    layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    # 圆柱部分（矩形）
    cyl_w = 200
    cyl_left = CX - cyl_w // 2
    cyl_right = CX + cyl_w // 2
    cyl_top = BASE_Y - DOME_H

    # 圆顶（上半圆）
    dome_r = cyl_w // 2

    # 雾蒙蒙半透明灰棕色（加深）
    haze = (90, 80, 70, int(110 * alpha))

    # 画圆顶：椭圆上半部分
    d.ellipse(
        [cyl_left, cyl_top - dome_r, cyl_right, cyl_top + dome_r],
        fill=haze
    )
    # 画圆柱部分
    d.rectangle(
        [cyl_left, cyl_top, cyl_right, BASE_Y],
        fill=haze
    )

    # 模糊处理
    layer = layer.filter(ImageFilter.GaussianBlur(15))
    return layer


def draw_scratches(frame_progress, intensity):
    """在屏障表面画抓痕和血迹"""
    layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    # 抓痕位置集中在圆顶正面
    num_scratches = int(4 * intensity)
    for i in range(num_scratches):
        # 抓痕起点在圆顶上部
        sx = CX + random.randint(-80, 80)
        sy = BASE_Y - DOME_H + random.randint(10, 80)
        # 向下斜划3-5道平行痕
        angle = random.uniform(0.2, 0.5)  # 倾斜角度
        length = random.randint(60, 120)

        for j in range(3):
            offset = j * 8
            x1 = sx + offset * math.sin(angle)
            y1 = sy + offset * 0.3
            x2 = x1 + length * math.sin(angle)
            y2 = y1 + length * math.cos(angle)
            w = random.randint(2, 4)
            d.line([(x1, y1), (x2, y2)], fill=(60, 15, 10, int(255 * intensity)), width=w)

        # 血迹溅射：抓痕末端附近的红色小点
        for k in range(12):
            bx = x2 + random.randint(-35, 35)
            by = y2 + random.randint(-15, 50)
            br = random.randint(3, 8)
            d.ellipse([bx-br, by-br, bx+br, by+br],
                      fill=(180, 25, 15, int(230 * intensity)))

    return layer


def draw_golden_wave(frame_progress, alpha):
    """屏障边缘扩散出淡金色气浪"""
    layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    # 从圆顶边缘向外扩散的环形气浪
    max_r = 250
    wave_r = int(50 + frame_progress * max_r)
    wave_alpha = int(120 * alpha * (1 - frame_progress))

    # 画弧形气浪（沿圆顶轮廓向外）
    for r_offset in range(0, 40, 5):
        r = wave_r - r_offset
        if r < 20:
            continue
        # 只画圆顶部分的弧
        a = int(200 * alpha * (1 - r_offset / 40))
        d.arc(
            [CX - r, BASE_Y - DOME_H - r + 40, CX + r, BASE_Y - DOME_H + r + 40],
            start=200, end=340,
            fill=(255, 210, 130, a),
            width=4
        )

    # 气浪中心的淡金光晕
    glow = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for r in range(int(wave_r), 0, -5):
        a = int(40 * alpha * (1 - r / wave_r) ** 2)
        gd.ellipse([CX-r, BASE_Y-DOME_H-r//2, CX+r, BASE_Y-DOME_H+r//2],
                   fill=(220, 190, 120, a))
    glow = glow.filter(ImageFilter.GaussianBlur(20))
    layer = Image.alpha_composite(layer, glow)

    return layer


def draw_frame(idx):
    t = idx / (TOTAL - 1)
    img = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))

    if t < 1/3:
        # 阶段1：圆顶雾幕生成
        p = t / (1/3)
        dome_alpha = min(1.0, p * 1.5)
        dome = draw_dome_silhouette(dome_alpha)
        img = Image.alpha_composite(img, dome)

        # 中心微光
        if p > 0.5:
            glow = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
            gd = ImageDraw.Draw(glow)
            r = 30
            gd.ellipse([CX-r, BASE_Y-DOME_H-r, CX+r, BASE_Y-DOME_H+r],
                      fill=(230, 210, 180, int(150 * dome_alpha)))
            glow = glow.filter(ImageFilter.GaussianBlur(15))
            img = Image.alpha_composite(img, glow)

    elif t < 2/3:
        # 阶段2：抓痕打在屏障上
        p = (t - 1/3) / (1/3)
        dome = draw_dome_silhouette(0.9)
        img = Image.alpha_composite(img, dome)

        # 抓痕从浅到深
        scratch = draw_scratches(p, p)
        img = Image.alpha_composite(img, scratch)

    else:
        # 阶段3：金色气浪扩散+消散
        p = (t - 2/3) / (1/3)
        fade = 1.0 - p * 0.8

        # 残留屏障
        dome = draw_dome_silhouette(0.5 * fade)
        img = Image.alpha_composite(img, dome)

        # 残留抓痕逐渐被打散
        scratch = draw_scratches(p, (1 - p) * 0.6)
        img = Image.alpha_composite(img, scratch)

        # 金色气浪
        wave = draw_golden_wave(p, fade)
        img = Image.alpha_composite(img, wave)

    return img


# 生成精灵图
sheet = Image.new("RGBA", (FW*COLS, FH*ROWS), (0, 0, 0, 0))
for idx in range(TOTAL):
    frame = draw_frame(idx)
    col = idx % COLS
    row = idx // COLS
    sheet.paste(frame, (col*FW, row*FH))

out = r"C:\Users\HP\Desktop\志怪塔 - 副本 (3)\素材\fx\thorns_reflect.png"
sheet.save(out, "PNG")
print(f"Saved: {out}")
print(f"Size: {sheet.size}, {TOTAL} frames")
