# -*- coding: utf-8 -*-
"""生成 §5 剩下的四张 fx 精灵图（用户口径「你自己做，做好了可以先给我看看」）。

产出（8 列 × 每格 480×480、透明底；**帧数分两档**）：
  素材/fx/shiqi_flame.png   尸气「幽蓝火焰包围」—— 尸玉在场时尸气芯片的进阶态（**8 帧 1 行**，循环）
  素材/fx/xuenu_flame.png   血怒「紫焰 + 暗红余烬」—— 血玉在场时血怒芯片的进阶态（**8 帧 1 行**，循环）
  素材/fx/guling_suck.png   骨铃吸血 —— 绿色生魂向内收束（48 帧 6 行，方向交给代码的锚点补间）
  素材/fx/relic_proc.png    遗物触发通用金光 —— 金符纹扩散 + 上浮光点（48 帧 6 行）

为什么纯程序绘制（不拿现成素材）：
  和 `_patch/mk_multi_slash.py` 同一条理由 —— 30 张现成 fx 全是「能量球 + 纹样」的画法，
  没有一张是「从下往上舔的火舌」，也没有「向内收束的生魂束」。照中心缩放/旋转只会得到
  「一颗被拉伸的球」。

跑法：`python _patch/mk_flame_sheets.py`
  生成 4 张图 + 拼版对照图 `_patch/_fx4_preview.png`（4 行 × 8 相位）
  + 两张循环 GIF `_patch/_shiqi_flame.gif` / `_patch/_xuenu_flame.gif`（黑底看动画）
"""
import math
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FX = os.path.join(ROOT, u'素材', u'fx')

CELL = 480
COLS = 8
ROWS = 6
FRAMES = COLS * ROWS          # 48：一次性特效（guling_suck / relic_proc）用整张 6 行
# 尸气 / 血怒两张火焰是**芯片上的无限循环**，不是一次性演出 ⇒ 只出 8 帧（1 行）。
# 为什么不是 48 帧：① 循环只要一个周期，8 帧就够；② 单文件产物里 8 帧是 3840×480（0.6MB），
# 48 帧是 3840×2880（3.4MB），而 `打包.py` 会**按排**切成 `fx/<名>_r0..r5.png`
# —— 多出来的 5 排将永远没人请求（CSS 只循环第 0 排），还会被 verify_dist 的
# 「从未被请求的素材」盯上。8 帧 1 排 = 拆出来正好 `_r0.png` 一张，严丝合缝。
LOOP_FRAMES = 8

# 480×480 的归一化坐标：u ∈ [-1,1] 左→右，v ∈ [-1,1] 下→上
_u = (np.arange(CELL) + 0.5) / CELL * 2.0 - 1.0
U, V = np.meshgrid(_u, _u)          # U 横、V 纵
# ⚠️ meshgrid 的 V 是**沿行号**取的：数组第 0 行（图片顶部）拿到 V=-1，最后一行拿到 V=+1，
# 与「V=+1 在上」的直觉相反。这里翻一次，全脚本统一成「V=+1 在上、V=-1 在下」。
# （不翻就是第一版实拍那副倒挂的冰锥 —— 火苗朝下、底盘在顶。）
V = -V
R = np.hypot(U, V)
TH = np.arctan2(V, U)


def _smooth(x, a, b):
    """smoothstep：x ≤ a 取 0、x ≥ b 取 1，中间三次缓动。"""
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def _blur(field, sigma):
    """给标量场做一次高斯模糊 —— 用来铺「辉光层」，让线条不至于像霓虹灯管。"""
    im = Image.fromarray((np.clip(field, 0, 1) * 255).astype(np.uint8), 'L')
    from PIL import ImageFilter
    return np.asarray(im.filter(ImageFilter.GaussianBlur(sigma))).astype(np.float32) / 255.0


def _ramp(mask, alpha_gate, stops):
    """把 0~1 的标量场按 4 个色标染成 RGBA。

    mask  —— 强度场（0 透明 / 1 最亮）
    stops —— [(位置, (r,g,b)), …] 递增
    返回 float32 的 (H, W, 4)，分量 0~1。"""
    m = np.clip(mask, 0.0, 1.0)
    rgb = np.zeros(m.shape + (3,), np.float32)
    for i in range(len(stops) - 1):
        p0, c0 = stops[i]
        p1, c1 = stops[i + 1]
        w = np.clip((m - p0) / max(1e-6, p1 - p0), 0.0, 1.0)
        band = w * (m >= p0)
        for k in range(3):
            rgb[..., k] += band * (c0[k] + (c1[k] - c0[k]) * w) / 255.0
    # 只在第一段内补底色（低于 p0 的部分按 0 强度淡化）
    a = _smooth(m, 0.0, alpha_gate)
    out = np.concatenate([rgb, a[..., None]], axis=2)
    return out


# ---------------------------------------------------------------------------
# 一、火舌：一张「从下往上舔」的火焰剪影
# ---------------------------------------------------------------------------
def _fbm(ph):
    """4 个倍频的廉价「值噪声」场（正弦相乘叠加）。用来给火焰上缘长毛刺、内部留暗缝。

    ⚠️ 时间项 **只允许整数倍 ph** —— 8 帧循环里任何半周期的相位都会在第 7→0 帧跳一下。
    所有 `ph **` 的系数都取整数（见 `ph * (k + 1)` / `ph * (k + 1) * 2`）。"""
    n = np.zeros_like(U)
    amp, tot = 1.0, 0.0
    for k in range(4):
        fr = 2.0 ** k
        a = amp
        n += a * (np.sin(fr * 2.1 * U + 1.4 * fr * V + ph * (k + 1) + k * 2.3) *
                  np.sin(fr * 2.6 * V - 1.2 * fr * U + ph * (k + 1) * 2 + k * 1.7))
        tot += a
        amp *= 0.58
    return n / tot


def _ramp_t(v, stops):
    """按 0~1 的标量场 v 在色标间插值出 RGB（**不进 alpha**，alpha 交给调用方）。
    与 `_ramp` 的区别：`_ramp` 是「越亮越白」，适合能量球；火焰要的是「底部白、越往上越深」，
    必须把颜色与强度解耦，否则亮度会顺着轮廓爬 —— 那正是 v4 画出一排发光三角山的原因。"""
    v = np.clip(v, 0.0, 1.0)
    xs = [s[0] for s in stops]
    rgb = np.zeros(v.shape + (3,), np.float32)
    for k in range(3):
        ys = [s[1][k] / 255.0 for s in stops]
        rgb[..., k] = np.interp(v, xs, ys)
    return rgb


# (中心, 高度, 底宽, 相位, 摆动频率) —— 高低宽窄刻意不等距；7 根且彼此交叠，
# 5 根时每根都读成独立一「柱」，7 根交叠才连成一片火。
TONGUES = [
    (-0.78, 0.50, 0.150, -1.0, 1),
    (-0.53, 0.74, 0.170,  2.3, 2),
    (-0.26, 0.96, 0.185,  1.7, 1),
    ( 0.02, 0.66, 0.165, -0.4, 1),
    ( 0.29, 0.88, 0.180, -2.1, 1),
    ( 0.55, 0.58, 0.170,  0.9, 2),
    ( 0.79, 0.76, 0.155,  2.6, 1),
]


def flame_frame(f, palette, embers=None, frames=LOOP_FRAMES):
    """f —— 第几帧（0..frames-1）。所有随时间变化的项都取**整数周期** ⇒ 整段无缝循环。

    v2：第一版火舌太细、亮度=高度占比 ⇒ 一排**尖刺/冰锥**。
    v3：V 的上被 meshgrid 反了（见文件头），已翻正。
    v4：`frames=8`；五根等高火舌 ⇒ 拼版出来是**五座等高三角山**。
    v5：换成「宽包络 + 湍流」⇒ 出来是一面**满屏火墙 + 中间一根白柱**（包络太宽、亮度仍顺轮廓爬）。
    v6：颜色与强度解耦 + 上缘用湍流咬毛边 ⇒ 第一次读成「火」。遗留：5 根＝一排柱子、底色是一条白杠。
    v7（本轮定稿）：火舌加到 7 根并交叠、侧摆加大（`t²` 项让苗身弯），
      颜色再叠一点湍流 ⇒ 底色不再是均匀白杠。"""
    ph = 2.0 * math.pi * f / frames
    t = np.clip((V + 1.0) * 0.5, 0.0, 1.0)          # 0=底 1=顶
    nst = _fbm(ph)                                   # ≈[-0.8,0.8] 的湍流场

    mask = np.zeros_like(U)
    for c0, h0, w0, phase, k in TONGUES:
        # 底几乎不动、顶甩得多，再加一个 t² 项让苗身是弯的 ⇒ 火在扭，不是一根根直柱
        c = c0 + (0.05 + 0.20 * t) * math.sin(ph * k + phase) \
               + 0.09 * t * t * math.sin(ph * k * 2 + phase * 1.7)
        w = w0 * (1.0 - 0.30 * t)                               # 越往上越窄
        body = np.exp(-((U - c) / w) ** 2)
        # 上缘：顶端抬到 h0，再用湍流把边界咬成参差（v6 起的关键一行）
        cut = 1.0 - _smooth(t, h0 + 0.16 * nst - 0.10, h0 + 0.16 * nst + 0.06)
        mask = np.maximum(mask, body * cut)
    # 底盘：一条很矮的宽火，只负责把 7 根火苗的根部连成一体
    mask = np.maximum(mask, np.exp(-(U / 0.66) ** 2) * (1.0 - _smooth(t, 0.04, 0.20)))
    mask *= 1.0 - _smooth(np.abs(U), 0.84, 1.00)     # 两侧收口，别顶到格子边

    tt = np.clip(t * 1.15, 0.0, 1.0)
    rgb = _ramp_t(np.clip(1.0 - tt + 0.09 * nst, 0.0, 1.0), palette)   # 底最亮 → 顶最深；湍流打散色带
    a = np.clip(mask * (0.60 + 0.40 * (1.0 - tt)), 0.0, 1.0)
    a = np.clip(a + 0.32 * _blur(a, 6), 0.0, 1.0)    # 一圈柔辉，别像霓虹灯管
    img = np.concatenate([rgb, a[..., None]], axis=2)
    if embers is not None:
        img = _add_embers(img, f, embers, frames)
    return img


def _add_embers(img, f, spec, frames=LOOP_FRAMES):
    """暗红余烬：N 颗火星沿各自正弦轨迹上浮，走到顶就回到根部（一整个 frames 循环）。

    v2：第一版的余烬是 0.04 半径的小点、峰值 alpha 也低，实拍**几乎看不见** ——
      放大到 0.065、提亮、并给每颗加一圈暖色晕。"""
    col, glow, n, rise = spec
    p = (f / float(frames))
    for i in range(n):
        seed = (i * 0.6180339887) % 1.0
        x = -0.82 + 1.64 * seed + 0.06 * math.sin(2 * math.pi * (p * 2 + seed))
        y = -1.0 + 2.2 * ((p * (1 + i % 3) + seed * 3.7) % 1.0) * rise
        life = 1.0 - abs(y) * 0.45
        if life <= 0.08:
            continue
        d2 = (U - x) ** 2 + (V - y) ** 2
        halo = np.exp(-d2 / 0.0120)
        blob = np.exp(-d2 / 0.0042)
        hot = np.exp(-d2 / 0.0006)
        a = np.clip(blob * 0.85 * life + hot * 1.0 * life, 0.0, 1.0)[..., None]
        mixed = np.zeros_like(img[..., :3])
        for k in range(3):
            mixed[..., k] = (col[k] * (1 - hot) + glow[k] * hot) / 255.0
        img[..., :3] = np.clip(img[..., :3] * (1 - a) + mixed * a, 0, 1)
        img[..., 3] = np.clip(img[..., 3] + (a[..., 0] * 0.9 + halo * 0.35 * life), 0.0, 1.0)
    return img


SHIQI_PAL = [(0.00, (10, 30, 96)), (0.42, (40, 104, 232)), (0.76, (128, 208, 255)), (1.00, (238, 253, 255))]
XUENU_PAL = [(0.00, (46, 10, 76)), (0.42, (120, 36, 164)), (0.76, (206, 118, 236)), (1.00, (250, 228, 255))]
EMBER = ((168, 34, 26), (255, 138, 86), 14, 1.05)


# ---------------------------------------------------------------------------
# 二、骨铃吸血：绿色生魂向内收束（圆环收缩 + 螺旋火星）
# ---------------------------------------------------------------------------
GULING_PAL = [(0.00, (8, 62, 36)), (0.42, (36, 176, 84)), (0.78, (146, 250, 186)), (1.00, (238, 255, 246))]
SPARKS = 16


def guling_frame(f):
    """v2（第一版出图后自我否决）：第一版是 r±0.035 的硬环 + 小点火星，
      实拍是**三圈霓虹灯管**，既不像「生魂」也不像「吸血光」。
    v3（v2 拼版后又改）：v2 的三道环 + 大范围核心 + 0.45 的 aura 叠成一坨**实心亮球**，
      环根本分不开。改成：环变细、旧环按 q**2.4 快速褪掉 ⇒ 同屏只看得见一道在收的光；
      核心和 aura 各砍一半，让「收束」这个动作读得出来。"""
    p = f / float(FRAMES)

    # 一道柔软的主收束环 + 一道刚起步的次环（半径从 0.90 收到 0，收到头换下一道）
    # 环上再乘 3 段随相位转动的弧 ⇒ 是「一圈圈往里收的魂气」，而不是同心的洋葱/白菜层
    rings = np.zeros_like(U)
    for i in range(3):
        q = (p + i / 3.0) % 1.0
        r = 0.90 * (1.0 - q)
        wob = 1.0 + 0.09 * np.sin(3.0 * TH + 2.2 * math.pi * q)   # 不是正圆，才像气
        w = 0.075 + 0.11 * q
        arc = 0.40 + 0.60 * np.sin(3.0 * TH + 4.0 * math.pi * q) ** 2
        rings = np.maximum(rings, np.exp(-((R - r * wob) / w) ** 2) * (1.0 - q) ** 2.4 * arc)

    # 螺旋火星：每颗沿自己的螺旋线往中心走，带 4 段尾迹
    sparks = np.zeros_like(U)
    for i in range(SPARKS):
        seed = (i * 0.6180339887) % 1.0
        q0 = (p * (1 + i % 2) + seed) % 1.0
        a0 = seed * 2 * math.pi
        for k in range(4):
            q = q0 - 0.035 * k
            if q < 0.0:
                continue
            th = a0 + 2.6 * q
            rr = 0.14 + 0.72 * (1.0 - q)      # 不落到圆心：否则 16 颗火星全堆在中点，糊成一坨
            sx, sy = rr * math.cos(th), rr * math.sin(th) * 0.92
            d2 = (U - sx) ** 2 + (V - sy) ** 2
            sparks = np.maximum(sparks, np.exp(-d2 / 0.0035) * (0.30 + 0.70 * q) * (1.0 - q) * (1.0 - 0.22 * k))

    # 核心生魂 + 一层很淡的气晕（都压得很低，别盖过收束环）
    core = np.exp(-R ** 2 / (0.048 + 0.016 * math.sin(2 * math.pi * p)))
    aura = np.exp(-R ** 2 / 0.34) * 0.16
    m = np.clip(0.95 * rings + 0.80 * sparks + 0.16 * core + aura, 0.0, 1.0)
    m = np.clip(m + 0.26 * _blur(m, 9), 0.0, 1.0)          # 一层很轻的辉光，去掉「灯管感」
    return _ramp(m, 0.18, GULING_PAL)


# ---------------------------------------------------------------------------
# 三、遗物通用金光：金符纹扩散 + 上浮光点（一次性演出，末段自然淡出）
# ---------------------------------------------------------------------------
RELIC_PAL = [(0.00, (96, 62, 12)), (0.42, (224, 179, 65)), (0.78, (255, 232, 158)), (1.00, (255, 252, 238))]
RUNE_TICKS = 8


def _seg_dist(px, py, ax, ay, bx, by):
    """点到线段的距离（向量化）。"""
    vx, vy = bx - ax, by - ay
    wx, wy = px - ax, py - ay
    t = np.clip((wx * vx + wy * vy) / max(1e-6, vx * vx + vy * vy), 0.0, 1.0)
    return np.hypot(px - (ax + vx * t), py - (ay + vy * t))


def relic_frame(f):
    p = f / float(FRAMES)
    grow = _smooth(p, 0.02, 0.55)                  # 扩散
    fade = 1.0 - _smooth(p, 0.62, 1.0)             # 收尾淡出
    spin = 0.55 * p                                # 整体缓慢旋转

    r = 0.10 + 0.66 * grow
    line = np.zeros_like(U)
    # 主环 + 内环
    line = np.maximum(line, np.exp(-((R - r) / 0.016) ** 2) * 1.00)
    line = np.maximum(line, np.exp(-((R - r * 0.80) / 0.010) ** 2) * 0.62)
    # 八道符纹刻痕（短径向线段，跟着转）
    for i in range(RUNE_TICKS):
        a = spin + i * 2 * math.pi / RUNE_TICKS
        ca, sa = math.cos(a), math.sin(a)
        d = _seg_dist(U, V, ca * r * 0.86, sa * r * 0.86, ca * r * 1.16, sa * r * 1.16)
        line = np.maximum(line, np.exp(-(d / 0.011) ** 2) * 0.95)
    # 内接六芒（两个反向三角的六条边）—— 符纹的「阵」感
    for tri in range(2):
        for e in range(3):
            a0 = spin * 0.5 + tri * math.pi + e * 2 * math.pi / 3
            a1 = a0 + 2 * math.pi / 3
            r0 = r * 0.62
            d = _seg_dist(U, V, r0 * math.cos(a0), r0 * math.sin(a0), r0 * math.cos(a1), r0 * math.sin(a1))
            line = np.maximum(line, np.exp(-(d / 0.009) ** 2) * 0.70)

    # 上浮光点
    dots = np.zeros_like(U)
    for i in range(14):
        seed = (i * 0.6180339887) % 1.0
        x = -0.75 + 1.5 * seed + 0.05 * math.sin(2 * math.pi * (p * 2 + seed))
        y = -0.95 + 2.0 * ((p * (1 + i % 3) + seed * 2.3) % 1.0)
        d2 = (U - x) ** 2 + (V - y) ** 2
        dots = np.maximum(dots, np.exp(-d2 / 0.0006) * 0.9)

    m = np.clip(line + 0.55 * dots, 0.0, 1.0)
    m = np.clip(m + 0.65 * _blur(m, 7), 0.0, 1.0)   # 符纹外面套一道金光，别只有线
    return _ramp(np.clip(m * fade, 0.0, 1.0), 0.12, RELIC_PAL)


# ---------------------------------------------------------------------------
# 四、浅显荆棘 · 立绘叠图：受到反伤（铁壁 / 罗汉拳套 / 敌人反震）时，
#     在**立绘上**叠一道很细的荆棘尖刺 + 微光。
#     「浅显」= 低透明度、细线、不遮挡 —— 与 `thorns`（荆棘符本体那种大特效）分开：
#     它是「受击时叠在立绘上的轻量提示」，不是一张牌打出去的本体演出。
# ---------------------------------------------------------------------------
THORNS_PAL = [(0.00, (28, 46, 20)), (0.42, (104, 150, 62)), (0.78, (196, 228, 140)), (1.00, (244, 255, 224))]
THORN_N = 9


def thorns_frame(f):
    """9 根细刺从中心向外刺出：快速刺出（grow）→ 短暂维持 → 末段淡出（fade）。
    刺根带两侧小分叉 ⇒ 读成「荆棘」而不是「光芒」；低峰值强度 + 细线宽 ⇒ 「浅显」。"""
    p = f / float(FRAMES)
    grow = _smooth(p, 0.04, 0.34)          # 刺出：前 34% 帧迅速张开
    fade = 1.0 - _smooth(p, 0.52, 0.97)    # 收回：后段淡出

    m = np.zeros_like(U)
    for i in range(THORN_N):
        seed = (i * 0.6180339887) % 1.0
        ang = seed * 2.0 * math.pi
        L = (0.42 + 0.46 * ((seed * 7.3) % 1.0)) * grow
        ax0, ay0 = 0.0, -0.05
        bx, by = ax0 + L * math.cos(ang), ay0 + L * math.sin(ang)
        w = 0.010 + 0.020 * (1.0 - grow)   # 起步稍粗、刺出后变细 ⇒ 有「生长」感
        m = np.maximum(m, np.exp(-(_seg_dist(U, V, ax0, ay0, bx, by) / w) ** 2))
        # 刺根两侧各一小段分叉
        mx, my = (ax0 + bx) * 0.5, (ay0 + by) * 0.5
        for k in (-0.6, 0.6):
            t2 = ang + k
            b2x = mx + 0.16 * L * math.cos(t2)
            b2y = my + 0.16 * L * math.sin(t2)
            m = np.maximum(m, 0.70 * np.exp(-(_seg_dist(U, V, mx, my, b2x, b2y) / 0.009) ** 2))

    shimmer = np.exp(-R ** 2 / 0.30) * (0.10 + 0.10 * math.sin(2 * math.pi * p))
    m = np.clip(m * (0.55 + 0.45 * grow) + shimmer, 0.0, 1.0)
    m = np.clip(m + 0.20 * _blur(m, 6), 0.0, 1.0)     # 很轻的一层辉光，避免霓虹灯管感
    m = np.clip(m * 0.86 * fade, 0.0, 1.0)            # 「浅显」：峰值 alpha 压到 ~0.86
    return _ramp(m, 0.12, THORNS_PAL)


# ---------------------------------------------------------------------------
def build(name, frame_fn, frames_n, gif=False):
    """frames_n —— 帧数。行数 = ceil(frames_n / COLS)：48 帧 → 6 行（一次性演出），
    8 帧 → 1 行（芯片循环）。行数必须 ≥ `FX_SHEETS[name].rows`，否则 verify_dist [2d] 咬人。"""
    rows = int(math.ceil(frames_n / float(COLS)))
    sheet = np.zeros((rows * CELL, COLS * CELL, 4), np.float32)
    frames = []
    for i in range(frames_n):
        im = frame_fn(i)
        frames.append(im)
        rr, cc = divmod(i, COLS)
        sheet[rr * CELL:(rr + 1) * CELL, cc * CELL:(cc + 1) * CELL] = im
    path = os.path.join(FX, name + '.png')
    Image.fromarray((np.clip(sheet, 0, 1) * 255).astype(np.uint8), 'RGBA').save(path)
    print(u'已写出 %-34s %dx%d  %d帧/%d行  %.2fMB' % (os.path.relpath(path, ROOT), sheet.shape[1], sheet.shape[0],
                                                    frames_n, rows, os.path.getsize(path) / 1048576.))
    if gif:
        g = os.path.join(HERE, '_' + name + '.gif')
        tiles = []
        for im in frames:
            a = im[..., 3:4]
            rgb = im[..., :3] * a + 0.07 * (1 - a)     # 深灰底，透明处看得见轮廓
            tiles.append(Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8), 'RGB')
                         .resize((240, 240), Image.LANCZOS))
        tiles[0].save(g, save_all=True, append_images=tiles[1:], duration=42, loop=0, optimize=True)
        print(u'       ↳ 循环预览 %s' % os.path.relpath(g, ROOT))
    return frames


def preview(rows_in):
    """拼版对照图：每行一个特效、每行 8 列相位。列的相位按各自动画长度**等比取** ——
    shiqi/xuenu 只有 8 帧（取 0/1/2…7），guling/relic/thorns 是 48 帧（取 0/6/12…42），
    这样一行一眼就能看出整段走势，不会因为帧数不同而错位。"""
    T = 150
    out = Image.new('RGB', (COLS * T, len(rows_in) * T), (18, 18, 18))
    for r, (label, frames) in enumerate(rows_in):
        n = len(frames)
        for c in range(COLS):
            i = int(round(c * n / float(COLS))) % n
            im = frames[i]
            a = im[..., 3:4]
            rgb = im[..., :3] * a + 0.07 * (1 - a)
            out.paste(Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8), 'RGB')
                      .resize((T, T), Image.LANCZOS), (c * T, r * T))
    p = os.path.join(HERE, '_fx_preview.png')
    out.save(p)
    print(u'\n拼版对照图（行序：%s，列 = 8 个等比相位）' % u' / '.join(l for l, _ in rows_in))
    print(u'  %s' % os.path.relpath(p, ROOT))


def main():
    if not os.path.isdir(FX):
        os.makedirs(FX)
    # 前两张：芯片循环火焰 ⇒ 8 帧 1 行（见文件头 LOOP_FRAMES 的说明）
    shiqi = build('shiqi_flame', lambda f: flame_frame(f, SHIQI_PAL), LOOP_FRAMES, gif=True)
    xuenu = build('xuenu_flame', lambda f: flame_frame(f, XUENU_PAL, EMBER), LOOP_FRAMES, gif=True)
    # 后三张：一次性演出 ⇒ 48 帧 6 行
    guling = build('guling_suck', guling_frame, FRAMES)
    relic = build('relic_proc', relic_frame, FRAMES)
    thorns = build('thorns_light', thorns_frame, FRAMES)
    preview([('shiqi_flame', shiqi), ('xuenu_flame', xuenu),
             ('guling_suck', guling), ('relic_proc', relic), ('thorns_light', thorns)])
    print(u'\n/* 粘进 js/20_data.js 的 FX_SHEETS（按 key 排序的位置自行对齐）：*/')
    print(u"  shiqi_flame: { c:8, f:8,  f0:8,  rows:1, i0:0 },   // 芯片循环：8 帧整周期，1 行")
    print(u"  xuenu_flame: { c:8, f:8,  f0:8,  rows:1, i0:0 },   // 芯片循环：8 帧整周期，1 行")
    print(u"  guling_suck: { c:8, f:48, f0:48, rows:6, i0:0 },   // 一次性：48 帧整循环")
    print(u"  relic_proc:  { c:8, f:48, f0:48, rows:6, i0:0 },   // 一次性：48 帧整循环")
    print(u"  thorns_light:{ c:8, f:48, f0:48, rows:6, i0:0 },   // 一次性：浅显荆棘 · 立绘叠图")


if __name__ == '__main__':
    main()