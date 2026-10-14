"""
志怪塔游戏特效包 v2 - 颜色加深版
每个 8列x6行=48帧，480x480/帧
颜色饱和、不透明，深色背景下可见
"""
import math
import random
from PIL import Image, ImageDraw, ImageFilter

random.seed(42)

FW, FH = 480, 480
COLS, ROWS = 8, 6
TOTAL = 48
CX, CY = FW // 2, FH // 2


def ease_out(t):
    return 1 - (1 - t) ** 2


def make_sheet(draw_frame_func, name):
    sheet = Image.new("RGBA", (FW*COLS, FH*ROWS), (0, 0, 0, 0))
    for idx in range(TOTAL):
        frame = draw_frame_func(idx)
        col = idx % COLS
        row = idx // COLS
        sheet.paste(frame, (col*FW, row*FH))
    out = f"C:\\Users\\HP\\Desktop\\志怪塔 - 副本 (3)\\素材\\fx\\{name}.png"
    sheet.save(out, "PNG")
    print(f"  {name}.png - {sheet.size}")


# ========== 1. 火焰爆发 ==========
def fx_fire(idx):
    t = idx / (TOTAL - 1)
    img = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))

    if t < 0.4:
        p = ease_out(t / 0.4)
        for i in range(5):
            h = 80 + p * 200 + i * 20
            w = 50 + p * 50 - i * 8
            layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
            d = ImageDraw.Draw(layer)
            points = []
            for a in range(20):
                ang = math.pi * a / 19 - math.pi/2
                r_x = max(5, w * (1 - i*0.12))
                r_y = max(5, h * (1 - i*0.1))
                px = CX + math.cos(ang) * r_x * (0.5 + 0.5 * abs(math.sin(ang)))
                py = CY + r_y*0.3 - math.sin(ang) * r_y
                points.append((px, py))
            colors = [
                (255, 250, 200, 255),
                (255, 220, 80, 240),
                (255, 140, 30, 230),
                (220, 50, 15, 200),
                (100, 10, 5, 150),
            ]
            d.polygon(points, fill=colors[i])
            layer = layer.filter(ImageFilter.GaussianBlur(5))
            img = Image.alpha_composite(img, layer)
    elif t < 0.6:
        p = (t - 0.4) / 0.2
        for i in range(5):
            h = 280 + i * 20
            w = 100 - i * 8
            layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
            d = ImageDraw.Draw(layer)
            points = []
            for a in range(20):
                ang = math.pi * a / 19 - math.pi/2
                r_x = w * (1 - i*0.12)
                r_y = h * (1 - i*0.1)
                px = CX + math.cos(ang) * r_x * (0.5 + 0.5 * abs(math.sin(ang)))
                py = CY + r_y*0.3 - math.sin(ang) * r_y
                points.append((px, py))
            colors = [
                (255, 250, 200, 255),
                (255, 220, 80, 240),
                (255, 140, 30, 230),
                (220, 50, 15, 200),
                (100, 10, 5, 150),
            ]
            d.polygon(points, fill=colors[i])
            layer = layer.filter(ImageFilter.GaussianBlur(5))
            img = Image.alpha_composite(img, layer)
    else:
        p = (t - 0.6) / 0.4
        alpha = max(0, 1 - p)
        for i in range(5):
            h = max(10, 280 - p * 250 + i * 20)
            w = max(5, 100 - p * 70 - i * 8)
            layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
            d = ImageDraw.Draw(layer)
            points = []
            for a in range(20):
                ang = math.pi * a / 19 - math.pi/2
                r_x = w * (1 - i*0.12)
                r_y = h * (1 - i*0.1)
                px = CX + math.cos(ang) * r_x * (0.5 + 0.5 * abs(math.sin(ang)))
                py = CY + r_y*0.3 - math.sin(ang) * r_y
                points.append((px, py))
            colors = [
                (255, 250, 200, int(255*alpha)),
                (255, 220, 80, int(240*alpha)),
                (255, 140, 30, int(230*alpha)),
                (220, 50, 15, int(200*alpha)),
                (100, 10, 5, int(150*alpha)),
            ]
            d.polygon(points, fill=colors[i])
            layer = layer.filter(ImageFilter.GaussianBlur(8))
            img = Image.alpha_composite(img, layer)
    return img


# ========== 2. 雷击 ==========
def fx_lightning(idx):
    t = idx / (TOTAL - 1)
    img = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))

    if t < 0.08:
        p = t / 0.08
        glow = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        r = int(250 * p)
        gd.ellipse([CX-r, CY-r, CX+r, CY+r], fill=(100, 180, 255, int(180*p)))
        glow = glow.filter(ImageFilter.GaussianBlur(20))
        img = Image.alpha_composite(img, glow)
    elif t < 0.5:
        p = (t - 0.08) / 0.42
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        x = CX
        y = 10
        pts = [(x, y)]
        while y < FH - 30:
            x += random.randint(-30, 30)
            y += random.randint(25, 45)
            pts.append((x, y))
        d.line(pts, fill=(80, 160, 255, 200), width=10)
        d.line(pts, fill=(255, 255, 255, 255), width=4)
        layer = layer.filter(ImageFilter.GaussianBlur(2))
        img = Image.alpha_composite(img, layer)
    else:
        p = (t - 0.5) / 0.5
        alpha = max(0, 1 - p)
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        x = CX
        y = 10
        pts = [(x, y)]
        while y < FH - 30:
            x += random.randint(-30, 30)
            y += random.randint(25, 45)
            pts.append((x, y))
        d.line(pts, fill=(80, 160, 255, int(150*alpha)), width=8)
        d.line(pts, fill=(255, 255, 255, int(220*alpha)), width=3)
        layer = layer.filter(ImageFilter.GaussianBlur(5))
        img = Image.alpha_composite(img, layer)
    return img


# ========== 3. 治疗圣光 ==========
def fx_heal(idx):
    t = idx / (TOTAL - 1)
    img = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))

    if t < 0.3:
        p = ease_out(t / 0.3)
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        r = 20 + p * 160
        d.ellipse([CX-r, CY-r, CX+r, CY+r], outline=(255, 200, 80, int(255*p)), width=6)
        d.ellipse([CX-25, CY-25, CX+25, CY+25], fill=(255, 240, 180, int(255*p)))
        layer = layer.filter(ImageFilter.GaussianBlur(3))
        img = Image.alpha_composite(img, layer)
    elif t < 0.7:
        p = (t - 0.3) / 0.4
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for i in range(3):
            r = 160 - i*35
            d.ellipse([CX-r, CY-r, CX+r, CY+r], outline=(255, 200, 80, 220-i*40), width=4)
        for i in range(12):
            px = CX + random.randint(-90, 90)
            py = CY + int(60 - p * 120) + random.randint(-20, 20)
            s = random.randint(4, 10)
            d.ellipse([px-s, py-s, px+s, py+s], fill=(255, 230, 150, 240))
        layer = layer.filter(ImageFilter.GaussianBlur(3))
        img = Image.alpha_composite(img, layer)
    else:
        p = (t - 0.7) / 0.3
        alpha = max(0, 1 - p)
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for i in range(3):
            r = 160 - i*35 + p*60
            a = int((220 - i*40) * alpha)
            d.ellipse([CX-r, CY-r, CX+r, CY+r], outline=(255, 200, 80, a), width=4)
        layer = layer.filter(ImageFilter.GaussianBlur(5))
        img = Image.alpha_composite(img, layer)
    return img


# ========== 4. 冰霜 ==========
def fx_ice(idx):
    t = idx / (TOTAL - 1)
    img = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))

    if t < 0.4:
        p = ease_out(t / 0.4)
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        num = 8
        for i in range(num):
            ang = 2 * math.pi * i / num
            length = 20 + p * 170
            ex = CX + math.cos(ang) * length
            ey = CY + math.sin(ang) * length
            d.line([(CX, CY), (ex, ey)], fill=(100, 200, 255, int(255*p)), width=6)
            for side in [-1, 1]:
                mx = CX + math.cos(ang) * length * 0.6
                my = CY + math.sin(ang) * length * 0.6
                sx = mx + math.cos(ang + side*0.6) * length * 0.25
                sy = my + math.sin(ang + side*0.6) * length * 0.25
                d.line([(mx, my), (sx, sy)], fill=(180, 230, 255, int(200*p)), width=3)
        layer = layer.filter(ImageFilter.GaussianBlur(2))
        img = Image.alpha_composite(img, layer)
    elif t < 0.6:
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        num = 8
        for i in range(num):
            ang = 2 * math.pi * i / num
            length = 190
            ex = CX + math.cos(ang) * length
            ey = CY + math.sin(ang) * length
            d.line([(CX, CY), (ex, ey)], fill=(100, 200, 255, 255), width=7)
            for side in [-1, 1]:
                mx = CX + math.cos(ang) * length * 0.6
                my = CY + math.sin(ang) * length * 0.6
                sx = mx + math.cos(ang + side*0.6) * length * 0.25
                sy = my + math.sin(ang + side*0.6) * length * 0.25
                d.line([(mx, my), (sx, sy)], fill=(200, 240, 255, 230), width=4)
        layer = layer.filter(ImageFilter.GaussianBlur(2))
        img = Image.alpha_composite(img, layer)
    else:
        p = (t - 0.6) / 0.4
        alpha = max(0, 1 - p)
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        num = 8
        for i in range(num):
            ang = 2 * math.pi * i / num
            length = max(10, 190 - p*120)
            ex = CX + math.cos(ang) * length
            ey = CY + math.sin(ang) * length
            d.line([(CX, CY), (ex, ey)], fill=(100, 200, 255, int(200*alpha)), width=6)
        layer = layer.filter(ImageFilter.GaussianBlur(5))
        img = Image.alpha_composite(img, layer)
    return img


# ========== 5. 紫色诅咒 ==========
def fx_curse(idx):
    t = idx / (TOTAL - 1)
    img = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))

    if t < 0.3:
        p = ease_out(t / 0.3)
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for i in range(8):
            sx = CX + random.randint(-70, 70)
            sy = FH - 30
            ey = FH - 30 - p * 250 - i * 20
            s = 35 + i*8
            d.ellipse([sx-s, ey-s, sx+s, ey+s], fill=(130, 30, 180, int(150*p)))
        layer = layer.filter(ImageFilter.GaussianBlur(10))
        img = Image.alpha_composite(img, layer)
    elif t < 0.7:
        p = (t - 0.3) / 0.4
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for i in range(10):
            ang = i * 0.7 + p * 2
            r = 30 + i * 18
            sx = CX + math.cos(ang) * r
            sy = CY + math.sin(ang) * r * 0.8
            s = max(8, 28 - i*2)
            d.ellipse([sx-s, sy-s, sx+s, sy+s], fill=(150, 40, 200, 200))
        d.ellipse([CX-20, CY-20, CX+20, CY+20], fill=(220, 120, 255, 255))
        layer = layer.filter(ImageFilter.GaussianBlur(8))
        img = Image.alpha_composite(img, layer)
    else:
        p = (t - 0.7) / 0.3
        alpha = max(0, 1 - p)
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for i in range(10):
            ang = i * 0.7 + p * 4
            r = 30 + i * 18 + p*40
            sx = CX + math.cos(ang) * r
            sy = CY + math.sin(ang) * r * 0.8
            s = 20
            d.ellipse([sx-s, sy-s, sx+s, sy+s], fill=(150, 40, 200, int(120*alpha)))
        layer = layer.filter(ImageFilter.GaussianBlur(10))
        img = Image.alpha_composite(img, layer)
    return img


# ========== 6. 斩击刀光 ==========
def fx_slash(idx):
    t = idx / (TOTAL - 1)
    img = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))

    if t < 0.2:
        p = ease_out(t / 0.2)
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        w = int(25 * p)
        d.arc([60, 60, 420, 420], start=45, end=135, fill=(255, 255, 255, int(255*p)), width=w)
        layer = layer.filter(ImageFilter.GaussianBlur(2))
        img = Image.alpha_composite(img, layer)
    elif t < 0.5:
        p = (t - 0.2) / 0.3
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        offset = p * 60
        d.arc([60-offset, 60-offset, 420+offset, 420+offset], start=45, end=135,
              fill=(80, 200, 255, 200), width=15)
        d.arc([60-offset, 60-offset, 420+offset, 420+offset], start=45, end=135,
              fill=(255, 255, 255, 255), width=6)
        layer = layer.filter(ImageFilter.GaussianBlur(2))
        img = Image.alpha_composite(img, layer)
    else:
        p = (t - 0.5) / 0.5
        alpha = max(0, 1 - p)
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        d.arc([60, 60+p*120, 420, 420+p*120], start=45, end=135,
              fill=(80, 200, 255, int(120*alpha)), width=10)
        layer = layer.filter(ImageFilter.GaussianBlur(5))
        img = Image.alpha_composite(img, layer)
    return img


# ========== 7. 金币拾取 ==========
def fx_gold(idx):
    t = idx / (TOTAL - 1)
    img = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))

    if t < 0.3:
        p = ease_out(t / 0.3)
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        r = 60 * p
        d.ellipse([CX-r, CY-r, CX+r, CY+r], fill=(255, 200, 50, int(255*p)))
        layer = layer.filter(ImageFilter.GaussianBlur(8))
        img = Image.alpha_composite(img, layer)
    elif t < 0.6:
        p = (t - 0.3) / 0.3
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for i in range(18):
            ang = random.uniform(0, 2*math.pi)
            dist = p * random.uniform(60, 200)
            px = CX + math.cos(ang) * dist
            py = CY + math.sin(ang) * dist
            s = random.randint(5, 12)
            d.ellipse([px-s, py-s, px+s, py+s], fill=(255, 210, 60, 255))
        d.ellipse([CX-25, CY-25, CX+25, CY+25], fill=(255, 190, 30, 255))
        layer = layer.filter(ImageFilter.GaussianBlur(2))
        img = Image.alpha_composite(img, layer)
    else:
        p = (t - 0.6) / 0.4
        alpha = max(0, 1 - p)
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for i in range(18):
            ang = i * 0.35
            dist = 170 + p*60
            px = CX + math.cos(ang) * dist
            py = CY + math.sin(ang) * dist
            s = random.randint(4, 8)
            d.ellipse([px-s, py-s, px+s, py+s], fill=(255, 210, 60, int(180*alpha)))
        layer = layer.filter(ImageFilter.GaussianBlur(3))
        img = Image.alpha_composite(img, layer)
    return img


# ========== 8. 烟雾隐匿 ==========
def fx_smoke(idx):
    t = idx / (TOTAL - 1)
    img = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))

    if t < 0.4:
        p = ease_out(t / 0.4)
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for i in range(10):
            ang = i * 0.65
            r = p * (50 + i*18)
            sx = CX + math.cos(ang) * r
            sy = CY + math.sin(ang) * r
            s = 35 + i*5
            d.ellipse([sx-s, sy-s, sx+s, sy+s], fill=(80, 80, 90, int(140*p)))
        layer = layer.filter(ImageFilter.GaussianBlur(15))
        img = Image.alpha_composite(img, layer)
    elif t < 0.7:
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for i in range(12):
            ang = i * 0.52 + 0.3
            r = 120 + i*12
            sx = CX + math.cos(ang) * r
            sy = CY + math.sin(ang) * r
            s = 40 - i*2
            d.ellipse([sx-s, sy-s, sx+s, sy+s], fill=(70, 70, 80, 160))
        layer = layer.filter(ImageFilter.GaussianBlur(18))
        img = Image.alpha_composite(img, layer)
    else:
        p = (t - 0.7) / 0.3
        alpha = max(0, 1 - p)
        layer = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for i in range(12):
            ang = i * 0.52 + p*2
            r = 180 + p*80
            sx = CX + math.cos(ang) * r
            sy = CY + math.sin(ang) * r
            s = 35
            d.ellipse([sx-s, sy-s, sx+s, sy+s], fill=(70, 70, 80, int(100*alpha)))
        layer = layer.filter(ImageFilter.GaussianBlur(20))
        img = Image.alpha_composite(img, layer)
    return img


print("Generating FX pack v2 (darker)...")
make_sheet(fx_fire, "fx_fire")
make_sheet(fx_lightning, "fx_lightning")
make_sheet(fx_heal, "fx_heal")
make_sheet(fx_ice, "fx_ice")
make_sheet(fx_curse, "fx_curse")
make_sheet(fx_slash, "fx_slash")
make_sheet(fx_gold, "fx_gold")
make_sheet(fx_smoke, "fx_smoke")
print("Done!")
