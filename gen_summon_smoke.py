"""
神秘冒烟特效 - 突然从地下/空中冒出的黑烟紫烟
用于敌人/道具突然出现
动画：突然爆发(1-8) -> 烟雾翻涌扭曲(9-32) -> 散开消散(33-48)
6行x8列=48帧，480x480/帧
"""
import math
import random
from PIL import Image, ImageDraw, ImageFilter

random.seed(123)

FW, FH = 480, 480
COLS, ROWS = 8, 6
TOTAL = 48
CX, CY = FW // 2, FH // 2


def draw_smoke_puff(draw, x, y, size, color, alpha):
    """画一团不规则烟雾"""
    n = random.randint(5, 8)
    for i in range(n):
        ox = random.randint(-size//3, size//3)
        oy = random.randint(-size//3, size//3)
        r = size // random.randint(2, 4)
        draw.ellipse([x-r+ox, y-r+oy, x+r+ox, y+r+oy],
                     fill=(*color, alpha))


def draw_frame(idx):
    t = idx / (TOTAL - 1)
    img = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))

    if t < 0.15:
        # 阶段1：突然爆发，地面炸开黑烟
        p = t / 0.15
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        # 地面位置偏下
        ground_y = CY + 80
        # 从地面突然喷出
        num_puffs = int(8 * p)
        for i in range(num_puffs):
            px = CX + random.randint(-80, 80)
            py = ground_y - random.randint(0, int(60 * p))
            size = random.randint(40, 90)
            color = random.choice([(40, 30, 50), (60, 40, 70), (30, 25, 40)])
            draw_smoke_puff(d, px, py, size, color, int(180 * p))
        # 中心紫色微光
        if p > 0.5:
            d.ellipse([CX-15, ground_y-15, CX+15, ground_y+15],
                      fill=(120, 60, 180, int(150 * p)))
        layer = layer.filter(ImageFilter.GaussianBlur(12))
        img = Image.alpha_composite(img, layer)

    elif t < 0.65:
        # 阶段2：烟雾翻涌上升，不规则扭曲
        p = (t - 0.15) / 0.50
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)

        # 烟雾团数量随时间增加
        num_puffs = int(15 + p * 10)
        for i in range(num_puffs):
            # 烟雾从地面螺旋上升
            angle = i * 0.7 + p * 3
            height = p * 200 + random.randint(-30, 30)
            radius = 50 + p * 80 + random.randint(-20, 20)
            px = CX + math.cos(angle) * radius * 0.6 + random.randint(-30, 30)
            py = CY + 80 - height + random.randint(-20, 20)
            size = random.randint(50, 110)
            # 颜色变化：深紫、灰黑、暗紫
            color = random.choice([
                (35, 25, 45),
                (55, 35, 65),
                (75, 45, 90),
                (25, 20, 35),
            ])
            draw_smoke_puff(d, px, py, size, color, random.randint(100, 180))

        # 中心紫色光点闪烁
        if random.random() > 0.3:
            glow = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
            gd = ImageDraw.Draw(glow)
            r = random.randint(20, 50)
            gd.ellipse([CX-r, CY-r+30, CX+r, CY+r+30],
                       fill=(140, 70, 200, random.randint(80, 150)))
            glow = glow.filter(ImageFilter.GaussianBlur(15))
            img = Image.alpha_composite(img, glow)

        layer = layer.filter(ImageFilter.GaussianBlur(15))
        img = Image.alpha_composite(img, layer)

    else:
        # 阶段3：烟雾向四周散开消散
        p = (t - 0.65) / 0.35
        alpha = max(0, 1 - p)
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)

        num_puffs = int(25 - p * 10)
        for i in range(num_puffs):
            angle = i * 0.5 + p * 5
            radius = 100 + p * 200
            px = CX + math.cos(angle) * radius + random.randint(-40, 40)
            py = CY + 50 - p * 100 + math.sin(angle) * radius * 0.6
            size = random.randint(30, 70)
            color = random.choice([(50, 35, 65), (70, 45, 85), (40, 30, 50)])
            draw_smoke_puff(d, px, py, size, color, int(80 * alpha))

        layer = layer.filter(ImageFilter.GaussianBlur(20))
        img = Image.alpha_composite(img, layer)

    return img


# 生成精灵图
sheet = Image.new("RGBA", (FW*COLS, FH*ROWS), (0, 0, 0, 0))
for idx in range(TOTAL):
    frame = draw_frame(idx)
    col = idx % COLS
    row = idx // COLS
    sheet.paste(frame, (col*FW, row*FH))

out = r"C:\Users\HP\Desktop\志怪塔 - 副本 (3)\素材\fx\fx_summon_smoke.png"
sheet.save(out, "PNG")
print(f"Saved: {out}")
print(f"Size: {sheet.size}, {TOTAL} frames")
