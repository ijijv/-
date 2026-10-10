from PIL import Image, ImageDraw
import math

SIZE = 64
COLS, ROWS = 10, 10
SPRITE_W, SPRITE_H = SIZE * COLS, SIZE * ROWS

img = Image.new('RGBA', (SPRITE_W, SPRITE_H), (0, 0, 0, 0))
W = (255, 255, 255, 255)

def star(d, cx, cy, r, points=5):
    pts = []
    for i in range(points * 2):
        ang = -math.pi / 2 + i * math.pi / points
        rr = r if i % 2 == 0 else r * 0.45
        pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
    d.polygon(pts, fill=W)

for i in range(100):
    col, row = i % COLS, i // COLS
    ox, oy = col * SIZE, row * SIZE
    d = ImageDraw.Draw(img)
    cx, cy = ox + SIZE // 2, oy + SIZE // 2
    s = 16

    if i < 10:
        if i == 0:  # 圆
            d.ellipse([cx-s, cy-s, cx+s, cy+s], fill=W)
        elif i == 1:  # 方
            d.rectangle([cx-s, cy-s, cx+s, cy+s], fill=W)
        elif i == 2:  # 三角
            d.polygon([(cx, cy-s), (cx-s, cy+s), (cx+s, cy+s)], fill=W)
        elif i == 3:  # 菱形
            d.polygon([(cx, cy-s), (cx+s, cy), (cx, cy+s), (cx-s, cy)], fill=W)
        elif i == 4:  # 五边形
            pts = [(cx+s*math.cos(-math.pi/2+j*2*math.pi/5), cy+s*math.sin(-math.pi/2+j*2*math.pi/5)) for j in range(5)]
            d.polygon(pts, fill=W)
        elif i == 5:  # 六边形
            pts = [(cx+s*math.cos(-math.pi/2+j*2*math.pi/6), cy+s*math.sin(-math.pi/2+j*2*math.pi/6)) for j in range(6)]
            d.polygon(pts, fill=W)
        elif i == 6:  # 五角星
            star(d, cx, cy, s)
        elif i == 7:  # 心形
            d.ellipse([cx-s, cy-s, cx, cy+2], fill=W)
            d.ellipse([cx, cy-s, cx+s, cy+2], fill=W)
            d.polygon([(cx-s, cy), (cx+s, cy), (cx, cy+s)], fill=W)
        elif i == 8:  # 月亮
            d.ellipse([cx-s, cy-s, cx+s, cy+s], fill=W)
            d.ellipse([cx-s+5, cy-s-3, cx+s+7, cy+s-3], fill=(0,0,0,0))
        elif i == 9:  # 太阳
            d.ellipse([cx-6, cy-6, cx+6, cy+6], fill=W)
            for j in range(8):
                ang = j*math.pi/4
                d.line([cx+(s-3)*math.cos(ang), cy+(s-3)*math.sin(ang),
                        cx+s*math.cos(ang), cy+s*math.sin(ang)], fill=W, width=3)

    elif i < 20:
        w = i - 10
        if w == 0:  # 剑
            d.polygon([(cx,cy-s),(cx+3,cy-s+6),(cx+3,cy+s-6),(cx-3,cy+s-6),(cx-3,cy-s+6)], fill=W)
            d.rectangle([cx-6,cy+s-6,cx+6,cy+s-2], fill=W)
        elif w == 1:  # 盾
            d.polygon([(cx-s,cy-s),(cx+s,cy-s),(cx+s,cy),(cx,cy+s),(cx-s,cy)], fill=W)
        elif w == 2:  # 弓
            d.arc([cx-s,cy-s,cx+s,cy+s], 300, 60, fill=W, width=3)
        elif w == 3:  # 箭
            d.line([cx-s,cy,cx+s,cy], fill=W, width=3)
            d.polygon([(cx+s+4,cy),(cx+s-4,cy-4),(cx+s-4,cy+4)], fill=W)
        elif w == 4:  # 矛
            d.line([cx-s,cy+s,cx+s,cy-s], fill=W, width=3)
            d.polygon([(cx+s+4,cy-s-4),(cx+s-2,cy-s+2),(cx+s-2,cy-s-8)], fill=W)
        elif w == 5:  # 斧
            d.line([cx-s,cy+s,cx+s,cy-s], fill=W, width=3)
            d.ellipse([cx-2,cy-s-6,cx+10,cy-s+4], fill=W)
        elif w == 6:  # 锤
            d.line([cx,cy-s,cx,cy+s], fill=W, width=3)
            d.rectangle([cx-s-4,cy-s-6,cx+s+4,cy-s], fill=W)
        elif w == 7:  # 匕首
            d.polygon([(cx,cy-s),(cx+2,cy-s+4),(cx+2,cy+s),(cx-2,cy+s),(cx-2,cy-s+4)], fill=W)
        elif w == 8:  # 法杖
            d.line([cx,cy-s,cx,cy+s], fill=W, width=3)
            d.ellipse([cx-6,cy-s-10,cx+6,cy-s+2], fill=W)
        elif w == 9:  # 双刃斧
            d.line([cx,cy-s,cx,cy+s], fill=W, width=3)
            d.polygon([(cx,cy-s-4),(cx+s+6,cy-s+4),(cx,cy-s+8),(cx-s-6,cy-s+4)], fill=W)

    elif i < 30:
        n = i - 20
        if n == 0:  # 火焰
            d.polygon([(cx,cy-s),(cx+6,cy-2),(cx+8,cy+s),(cx-8,cy+s),(cx-6,cy-2)], fill=W)
        elif n == 1:  # 水滴
            d.polygon([(cx,cy-s),(cx+6,cy-2),(cx+8,cy+4),(cx+4,cy+s),(cx-4,cy+s),(cx-8,cy+4),(cx-6,cy-2)], fill=W)
        elif n == 2:  # 雪花
            for j in range(6):
                ang = j*math.pi/3
                d.line([cx,cy,cx+s*math.cos(ang),cy+s*math.sin(ang)], fill=W, width=2)
        elif n == 3:  # 叶
            d.ellipse([cx-s,cy-s,cx+s,cy+4], fill=W)
        elif n == 4:  # 花
            for j in range(5):
                ang = j*2*math.pi/5
                d.ellipse([cx+s*math.cos(ang)-4, cy+s*math.sin(ang)-4,
                           cx+s*math.cos(ang)+4, cy+s*math.sin(ang)+4], fill=W)
            d.ellipse([cx-3,cy-3,cx+3,cy+3], fill=(0,0,0,0))
        elif n == 5:  # 云
            d.ellipse([cx-s,cy-2,cx-4,cy+6], fill=W)
            d.ellipse([cx-6,cy-s,cx+2,cy+4], fill=W)
            d.ellipse([cx-2,cy-4,cx+s,cy+6], fill=W)
        elif n == 6:  # 闪电
            d.polygon([(cx+2,cy-s),(cx-6,cy+2),(cx,cy+2),(cx-2,cy+s),(cx+6,cy),(cx,cy)], fill=W)
        elif n == 7:  # 山
            d.polygon([(cx-s,cy+s),(cx-4,cy-s+4),(cx+2,cy+2),(cx+8,cy-s+2),(cx+s,cy+s)], fill=W)
        elif n == 8:  # 风
            d.arc([cx-s,cy-2,cx+s,cy+6], 0, 180, fill=W, width=3)
            d.arc([cx-s+2,cy+4,cx+s-4,cy+12], 0, 180, fill=W, width=3)
        elif n == 9:  # 漩涡
            d.arc([cx-s,cy-s,cx+s,cy+s], 0, 270, fill=W, width=3)
            d.arc([cx-8,cy-8,cx+8,cy+8], 90, 270, fill=W, width=3)

    elif i < 40:
        s2 = i - 30
        if s2 == 0:  # 护盾
            d.polygon([(cx-s+4,cy-s),(cx+s-4,cy-s),(cx+s-4,cy+2),(cx,cy+s),(cx-s+4,cy+2)], outline=W, width=3)
        elif s2 == 1:  # 上箭头
            d.polygon([(cx,cy-s),(cx+s,cy),(cx+4,cy),(cx+4,cy+s),(cx-4,cy+s),(cx-4,cy),(cx-s,cy)], fill=W)
        elif s2 == 2:  # 下箭头
            d.polygon([(cx,cy+s),(cx+s,cy),(cx+4,cy),(cx+4,cy-s),(cx-4,cy-s),(cx-4,cy),(cx-s,cy)], fill=W)
        elif s2 == 3:  # 锁
            d.rectangle([cx-s+3,cy-2,cx+s-3,cy+s], fill=W)
            d.arc([cx-s+5,cy-s-2,cx+s-5,cy-s+8], 180, 360, fill=W, width=3)
        elif s2 == 4:  # 钥匙
            d.ellipse([cx-s,cy-s,cx-s+10,cy-s+10], outline=W, width=3)
            d.line([cx-s+5,cy-s+5,cx+s-4,cy+s-4], fill=W, width=3)
            d.line([cx+s-6,cy+s-6,cx+s-6,cy+s-10], fill=W, width=2)
        elif s2 == 5:  # 眼
            d.ellipse([cx-s,cy-4,cx+s,cy+8], outline=W, width=2)
            d.ellipse([cx-4,cy-1,cx+4,cy+5], fill=W)
        elif s2 == 6:  # 心
            d.ellipse([cx-s,cy-s+2,cx,cy+2], fill=W)
            d.ellipse([cx,cy-s+2,cx+s,cy+2], fill=W)
            d.polygon([(cx-s,cy),(cx+s,cy),(cx,cy+s)], fill=W)
        elif s2 == 7:  # 骷髅
            d.ellipse([cx-s,cy-s,cx+s,cy+2], fill=W)
            d.rectangle([cx-s+4,cy+2,cx+s-4,cy+s], fill=W)
        elif s2 == 8:  # 灵魂
            d.ellipse([cx-s,cy-s,cx+s,cy+s-4], fill=W)
            d.polygon([(cx-s,cy+s-4),(cx-s+4,cy+s+2),(cx-s+8,cy+s-4),(cx-s+12,cy+s+2),(cx-s+16,cy+s-4),(cx+s,cy+s-4)], fill=W)
        elif s2 == 9:  # 魔法球
            d.ellipse([cx-s,cy-s,cx+s,cy+s], outline=W, width=3)
            star(d, cx, cy, 6)

    elif i < 50:
        s3 = i - 40
        if s3 == 0:  # 右箭头
            d.polygon([(cx-s,cy-6),(cx+2,cy-6),(cx+2,cy-s),(cx+s+4,cy),(cx+2,cy+s),(cx+2,cy+6),(cx-s,cy+6)], fill=W)
        elif s3 == 1:  # 左箭头
            d.polygon([(cx+s,cy-6),(cx-2,cy-6),(cx-2,cy-s),(cx-s-4,cy),(cx-2,cy+s),(cx-2,cy+6),(cx+s,cy+6)], fill=W)
        elif s3 == 2:  # 上箭头2
            d.polygon([(cx-6,cy+s),(cx-6,cy-2),(cx-s,cy-2),(cx,cy-s-4),(cx+s,cy-2),(cx+6,cy-2),(cx+6,cy+s)], fill=W)
        elif s3 == 3:  # 下箭头2
            d.polygon([(cx-6,cy-s),(cx-6,cy+2),(cx-s,cy+2),(cx,cy+s+4),(cx+s,cy+2),(cx+6,cy+2),(cx+6,cy-s)], fill=W)
        elif s3 == 4:  # 十字
            d.rectangle([cx-3,cy-s,cx+3,cy+s], fill=W)
            d.rectangle([cx-s,cy-3,cx+s,cy+3], fill=W)
        elif s3 == 5:  # 靶心
            d.ellipse([cx-s,cy-s,cx+s,cy+s], outline=W, width=2)
            d.ellipse([cx-7,cy-7,cx+7,cy+7], outline=W, width=2)
            d.ellipse([cx-3,cy-3,cx+3,cy+3], fill=W)
        elif s3 == 6:  # 旗
            d.line([cx-s+4,cy-s,cx-s+4,cy+s], fill=W, width=3)
            d.polygon([(cx-s+4,cy-s),(cx+s,cy-s+4),(cx-s+4,cy-s+8)], fill=W)
        elif s3 == 7:  # 指南针
            d.ellipse([cx-s,cy-s,cx+s,cy+s], outline=W, width=2)
            d.polygon([(cx,cy-s+4),(cx+3,cy),(cx,cy+s-4),(cx-3,cy)], fill=W)
        elif s3 == 8:  # 瞄准
            d.ellipse([cx-s,cy-s,cx+s,cy+s], outline=W, width=2)
            d.line([cx-s-4,cy,cx+s+4,cy], fill=W, width=2)
            d.line([cx,cy-s-4,cx,cy+s+4], fill=W, width=2)
        elif s3 == 9:  # 移动
            d.line([cx-s,cy+s,cx+s,cy-s], fill=W, width=3)
            d.polygon([(cx+s,cy-s),(cx+s-6,cy-s+2),(cx+s-2,cy-s+6)], fill=W)
            d.polygon([(cx-s,cy+s),(cx-s+6,cy+s-2),(cx-s+2,cy+s-6)], fill=W)

    elif i < 60:
        s4 = i - 50
        if s4 == 0:  # 卡牌
            d.rounded_rectangle([cx-s,cy-s+4,cx+s,cy+s], radius=3, outline=W, width=2)
            d.line([cx-s+4,cy,cx+s-4,cy], fill=W, width=2)
        elif s4 == 1:  # 卷轴
            d.rectangle([cx-s,cy-4,cx+s,cy+4], fill=W)
            d.ellipse([cx-s-3,cy-6,cx-s+3,cy+6], fill=W)
            d.ellipse([cx+s-3,cy-6,cx+s+3,cy+6], fill=W)
        elif s4 == 2:  # 骰子
            d.rectangle([cx-s+3,cy-s+3,cx+s-3,cy+s-3], outline=W, width=2)
            d.ellipse([cx-2,cy-2,cx+2,cy+2], fill=W)
        elif s4 == 3:  # 钱币
            d.ellipse([cx-s,cy-s,cx+s,cy+s], outline=W, width=3)
            d.rectangle([cx-4,cy-4,cx+4,cy+4], fill=W)
        elif s4 == 4:  # 宝石
            d.polygon([(cx,cy-s),(cx+s,cy-2),(cx+s-4,cy+s),(cx-s+4,cy+s),(cx-s,cy-2)], outline=W, width=2)
        elif s4 == 5:  # 宝箱
            d.rectangle([cx-s,cy-2,cx+s,cy+s], outline=W, width=2)
            d.arc([cx-s,cy-s,cx+s,cy], 180, 360, fill=W, width=2)
        elif s4 == 6:  # 沙漏
            d.polygon([(cx-s,cy-s),(cx+s,cy-s),(cx+3,cy),(cx+s,cy+s),(cx-s,cy+s),(cx-3,cy)], outline=W, width=2)
            d.polygon([(cx-3,cy-2),(cx+3,cy-2),(cx,cy+4)], fill=W)
        elif s4 == 7:  # 书页
            d.polygon([(cx-s,cy-s+4),(cx,cy-s),(cx+s,cy-s+4),(cx+s,cy+s),(cx,cy+s+4),(cx-s,cy+s)], outline=W, width=2)
        elif s4 == 8:  # 药瓶
            d.rectangle([cx-3,cy-s,cx+3,cy-s+4], fill=W)
            d.ellipse([cx-s+2,cy-s+4,cx+s-2,cy+s], fill=W)
        elif s4 == 9:  # 卷轴2
            d.rectangle([cx-s+4,cy-s,cx+s-4,cy+s], fill=W)
            d.ellipse([cx-s+1,cy-s-3,cx-s+7,cy-s+3], fill=W)
            d.ellipse([cx+s-7,cy+s-3,cx+s-1,cy+s+3], fill=W)

    elif i < 70:
        s5 = i - 60
        if s5 == 0:  # 鬼
            d.ellipse([cx-s,cy-s,cx+s,cy+s-4], fill=W)
            d.polygon([(cx-s,cy+s-4),(cx-s+4,cy+s+2),(cx-s+8,cy+s-4),(cx-s+12,cy+s+2),(cx-s+16,cy+s-4),(cx+s,cy+s-4)], fill=W)
        elif s5 == 1:  # 骷髅
            d.ellipse([cx-s,cy-s,cx+s,cy+2], fill=W)
            d.rectangle([cx-s+4,cy+2,cx+s-4,cy+s], fill=W)
        elif s5 == 2:  # 蝙蝠
            d.polygon([(cx,cy-s),(cx-4,cy-4),(cx-s,cy-2),(cx-s+2,cy+s),(cx-4,cy+2),(cx,cy+6),(cx+4,cy+2),(cx+s-2,cy+s),(cx+s,cy-2),(cx+4,cy-4)], fill=W)
        elif s5 == 3:  # 蜘蛛
            d.ellipse([cx-4,cy-4,cx+4,cy+4], fill=W)
            for j in range(4):
                d.line([cx-4,cy-2+j*2,cx-s,cy-4+j*3], fill=W, width=2)
                d.line([cx+4,cy-2+j*2,cx+s,cy-4+j*3], fill=W, width=2)
        elif s5 == 4:  # 蛇
            d.arc([cx-s,cy-s,cx+s,cy], 0, 270, fill=W, width=3)
            d.ellipse([cx+s-4,cy-s-2,cx+s+4,cy-s+6], fill=W)
        elif s5 == 5:  # 爪印
            d.ellipse([cx-4,cy-2,cx+4,cy+6], fill=W)
            for j in range(4):
                d.ellipse([cx-s+j*8-2,cy-s,cx-s+j*8+2,cy-s+4], fill=W)
        elif s5 == 6:  # 角
            d.polygon([(cx-s,cy-s),(cx-s-4,cy+s),(cx-s+4,cy+s),(cx-s+2,cy-s+4)], fill=W)
            d.polygon([(cx+s,cy-s),(cx+s+4,cy+s),(cx+s-4,cy+s),(cx+s-2,cy-s+4)], fill=W)
        elif s5 == 7:  # 獠牙
            d.polygon([(cx-s,cy-s+2),(cx-s+3,cy+s),(cx-s+6,cy-s+2)], fill=W)
            d.polygon([(cx+s,cy-s+2),(cx+s-3,cy+s),(cx+s-6,cy-s+2)], fill=W)
        elif s5 == 8:  # 单眼
            d.ellipse([cx-s,cy-4,cx+s,cy+8], outline=W, width=3)
            d.ellipse([cx-4,cy-1,cx+4,cy+5], fill=W)
        elif s5 == 9:  # 僵尸脸
            d.rectangle([cx-s+2,cy-s+2,cx+s-2,cy+s-2], fill=W)
            d.rectangle([cx-2,cy-s+2,cx+2,cy-s+6], fill=(0,0,0,0))
            d.ellipse([cx-6,cy-2,cx-2,cy+2], fill=(0,0,0,0))
            d.ellipse([cx+2,cy-2,cx+6,cy+2], fill=(0,0,0,0))

    elif i < 80:
        s6 = i - 70
        if s6 == 0:  # 火
            d.polygon([(cx,cy-s),(cx+5,cy-4),(cx+8,cy),(cx+5,cy+s),(cx-5,cy+s),(cx-8,cy),(cx-5,cy-4)], fill=W)
        elif s6 == 1:  # 水
            d.polygon([(cx,cy-s),(cx+7,cy-1),(cx+9,cy+4),(cx+5,cy+s),(cx-5,cy+s),(cx-9,cy+4),(cx-7,cy-1)], fill=W)
        elif s6 == 2:  # 风
            d.arc([cx-s,cy-4,cx+s,cy+4], 180, 360, fill=W, width=3)
            d.arc([cx-s+3,cy+2,cx+s-5,cy+10], 180, 360, fill=W, width=3)
        elif s6 == 3:  # 山
            d.polygon([(cx-s,cy+s),(cx-3,cy-2),(cx+2,cy+4),(cx+7,cy-s+2),(cx+s,cy+s)], fill=W)
        elif s6 == 4:  # 雷
            d.polygon([(cx+3,cy-s),(cx-5,cy+2),(cx,cy+2),(cx-3,cy+s),(cx+5,cy-2),(cx,cy-2)], fill=W)
        elif s6 == 5:  # 光
            d.ellipse([cx-5,cy-5,cx+5,cy+5], fill=W)
            for j in range(8):
                ang = j*math.pi/4
                d.line([cx+(s-4)*math.cos(ang),cy+(s-4)*math.sin(ang),
                        cx+s*math.cos(ang),cy+s*math.sin(ang)], fill=W, width=2)
        elif s6 == 6:  # 暗
            d.ellipse([cx-s,cy-s,cx+s,cy+s], fill=W)
            d.ellipse([cx-s+5,cy-s-3,cx+s+7,cy+s-3], fill=(0,0,0,0))
        elif s6 == 7:  # 毒
            d.ellipse([cx-3,cy-3,cx+3,cy+3], fill=W)
            d.ellipse([cx-s-2,cy-s-2,cx-4,cy+4], fill=W)
            d.ellipse([cx+4,cy-s-2,cx+s+2,cy+4], fill=W)
        elif s6 == 8:  # 冰
            d.polygon([(cx,cy-s),(cx+3,cy-2),(cx+s,cy-2),(cx+5,cy+2),(cx+6,cy+s),(cx,cy+4),(cx-6,cy+s),(cx-5,cy+2),(cx-s,cy-2),(cx-3,cy-2)], fill=W)
        elif s6 == 9:  # 血
            d.ellipse([cx-4,cy-4,cx+4,cy+4], fill=W)
            d.ellipse([cx-2,cy+2,cx+2,cy+s], fill=W)

    elif i < 90:
        s7 = i - 80
        if s7 == 0:  # 皇冠
            d.polygon([(cx-s,cy+4),(cx-s,cy-s+2),(cx-4,cy),(cx,cy-s),(cx+4,cy),(cx+s,cy-s+2),(cx+s,cy+4),(cx-s,cy+4)], fill=W)
        elif s7 == 1:  # 大星
            star(d, cx, cy, s)
        elif s7 == 2:  # 钻石
            d.polygon([(cx-s,cy-4),(cx+s,cy-4),(cx+4,cy+s),(cx-4,cy+s)], outline=W, width=2)
        elif s7 == 3:  # 奖杯
            d.rectangle([cx-4,cy-s,cx+4,cy+2], outline=W, width=2)
            d.line([cx,cy+2,cx,cy+6], fill=W, width=3)
            d.rectangle([cx-6,cy+6,cx+6,cy+s], fill=W)
        elif s7 == 4:  # 徽章
            d.polygon([(cx,cy-s),(cx+s-2,cy-4),(cx+s,cy+2),(cx+s-4,cy+s),(cx,cy+s+3),(cx-s+4,cy+s),(cx-s,cy+2),(cx-s+2,cy-4)], outline=W, width=2)
        elif s7 == 5:  # 星
            star(d, cx, cy, s)
        elif s7 == 6:  # 太极
            d.ellipse([cx-s,cy-s,cx+s,cy+s], outline=W, width=2)
            d.ellipse([cx-s,cy-s,cx,cy+s], fill=W)
            d.ellipse([cx-2,cy-4,cx+2,cy], fill=(0,0,0,0))
            d.ellipse([cx-2,cy,cx+2,cy+4], fill=W)
        elif s7 == 7:  # 无限
            d.ellipse([cx-s+4,cy-5,cx-2,cy+5], outline=W, width=3)
            d.ellipse([cx+2,cy-5,cx+s-4,cy+5], outline=W, width=3)
        elif s7 == 8:  # 环
            d.ellipse([cx-s,cy-s,cx+s,cy+s], outline=W, width=4)
        elif s7 == 9:  # 螺旋
            for r in [14, 10, 6]:
                d.arc([cx-r,cy-r,cx+r,cy+r], 0, 270, fill=W, width=2)

    else:
        s8 = i - 90
        if s8 == 0:  # 加号
            d.rectangle([cx-3,cy-s,cx+3,cy+s], fill=W)
            d.rectangle([cx-s,cy-3,cx+s,cy+3], fill=W)
        elif s8 == 1:  # 减号
            d.rectangle([cx-s,cy-3,cx+s,cy+3], fill=W)
        elif s8 == 2:  # 叉
            d.line([cx-s,cy-s,cx+s,cy+s], fill=W, width=4)
            d.line([cx+s,cy-s,cx-s,cy+s], fill=W, width=4)
        elif s8 == 3:  # 对勾
            d.line([cx-s,cy,cx-2,cy+s], fill=W, width=4)
            d.line([cx-2,cy+s,cx+s,cy-s], fill=W, width=4)
        elif s8 == 4:  # 问号
            d.arc([cx-s,cy-s,cx+s,cy], 180, 360, fill=W, width=3)
            d.line([cx,cy,cx,cy+4], fill=W, width=3)
            d.ellipse([cx-2,cy+6,cx+2,cy+10], fill=W)
        elif s8 == 5:  # 感叹号
            d.rectangle([cx-2,cy-s,cx+2,cy+2], fill=W)
            d.ellipse([cx-2,cy+4,cx+2,cy+8], fill=W)
        elif s8 == 6:  # 音符
            d.ellipse([cx-s,cy+2,cx-s+6,cy+8], fill=W)
            d.line([cx-s+6,cy+5,cx-s+6,cy-s+2], fill=W, width=2)
            d.line([cx-s+6,cy-s+2,cx+s,cy-s+6], fill=W, width=2)
            d.ellipse([cx+s-6,cy-s-2,cx+s,cy+4], fill=W)
        elif s8 == 7:  # 脚印
            d.ellipse([cx-6,cy-s,cx-1,cy+2], fill=W)
            d.ellipse([cx+1,cy+2,cx+6,cy+s], fill=W)
        elif s8 == 8:  # 羽毛
            d.arc([cx-s+2,cy-s,cx+s,cy+s], 200, 340, fill=W, width=3)
            d.line([cx-s+2,cy-s,cx+s-2,cy+s], fill=W, width=2)
        elif s8 == 9:  # 笔
            d.polygon([(cx-s+2,cy+s),(cx-s+4,cy+s-2),(cx+s-2,cy-s),(cx+s,cy-s+2)], fill=W)
            d.polygon([(cx-s+2,cy+s),(cx-s+4,cy+s-2),(cx-s,cy+s-4)], fill=W)

out = 'C:/Users/HP/Desktop/志怪塔 - 副本 (3)/素材/ui/icons_100.png'
img.save(out, 'PNG')
print(f'Saved: {out} size={img.size}')
