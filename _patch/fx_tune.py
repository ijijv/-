# -*- coding: utf-8 -*-
"""把「量出来的」特效参数写回 `js/20_data.js` 的 FX_SHEETS（i0 / f / scale / ox / oy）。

为什么要有这一步（用户本轮原话：「只是你要注意特效尺寸放在游戏中」）：
  素材的帧画布是 480×480 的格子，而提示词文档要求「特效居中、周围留空」——
  实测 30 张里有一大半内容只占格子 **35%~50%**。照锚点框直接贴 ⇒ 屏幕上是个小点，
  贴在 184px 宽的敌人身上只有 70~90px，等于白做。所以：

    i0, f = 裁掉**两端连续的空帧**后的起止         让「按下即有画面、播完即消失」
    scale = 1 / max(内容宽, 内容高)                让内容的长边正好填满盒子
    ox/oy = (内容框中心 − 格子中心) / 480           让**内容框的中心**落在锚点中心

  全部是 **PIL 扫 alpha** 量出来的（见 shot_fx.py 的 measure() / coverage()），
  不是拍脑袋；素材换版后重跑本脚本即可复现。

用法:
    python _patch/fx_tune.py            # 量 + 写回 js/20_data.js（干跑请加 --dry）
    python _patch/fx_tune.py --dry      # 只打印将要写入的表，不改文件
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, '_patch'))

from shot_fx import measure, fx_keys, coverage, live_range   # noqa: E402
CELL = 480

# 缩放规则：**一律**把内容的长边撑到盒子边长（scale = 1 / 最大含量），只设一个上限兜底。
# 早先写的是「含量 < 0.5 才放大」，那是个**硬阈值**，结果是含量 0.51 的（僵尸手/荆棘/尸王）
# 保持 1.0、含量 0.49 的却跳到 2.0 —— 同屏两个特效，一个大一倍，纯属阈值划出来的假差异。
# 统一成 1/含量 之后有个好性质：**每个特效的内容长边 ≈ 1.15 × 锚点短边**，
# 于是「多大算对」只有一条规则，不用逐个记。
SCALE_MAX = 3.0


def tuned():
    bb = measure()
    cov = coverage()
    ks = fx_keys()
    out = {}
    for k, (f0, rows, sc) in ks.items():
        b = bb.get(k)
        c = cov.get(k) or []
        # 两端裁掉的帧：**实测**出来的，不是估计。素材两端本来就有整格的空白
        # （开头最长 6 帧、结尾最长 9 帧）——不裁的话：按下后前 0.25 秒画面上什么都没有
        # （像点了没反应），播完又留一个全透明元素在那儿等删除。
        # 注意「素材原本多少帧」也由像素定（c 的长度 = 有像素的格子数），不看表 ——
        # 否则重跑一次就把上一轮裁完的数字当成「原始」记进注释，越滚越假。
        i0, f = live_range(c) if c else (0, f0)
        if b is None:
            out[k] = (sc, 0.0, 0.0, None, i0, f, len(c))
            continue
        x0, y0, x1, y1 = b
        fw = (x1 - x0 + 1) / float(CELL)
        fh = (y1 - y0 + 1) / float(CELL)
        fill = max(fw, fh)
        s = min(SCALE_MAX, 1.0 / fill)          # 内容长边撑到盒子边长（见文件头的 SCALE_MAX 说明）
        ox = ((x0 + x1) / 2.0 - CELL / 2.0) / float(CELL)
        oy = ((y0 + y1) / 2.0 - CELL / 2.0) / float(CELL)
        # 偏移小于 4% 的当 0：写一堆 ±0.01 只让表变脏，屏幕上差不到 1px
        ox = 0.0 if abs(ox) < 0.04 else round(ox, 2)
        oy = 0.0 if abs(oy) < 0.04 else round(oy, 2)
        out[k] = (round(s, 2), ox, oy, (fw, fh), i0, f, len(c))
    return out


def main():
    dry = '--dry' in sys.argv
    t = tuned()
    ks = fx_keys()
    print('%-14s %8s %6s %4s %4s  %-16s %6s %7s %7s' % ('key', '素材帧', '实播', 'i0', '裁掉', '内容占格子', 'scale', 'ox', 'oy'))
    print('-' * 84)
    cut = 0
    for k in sorted(t):
        sc, ox, oy, fill, i0, f, n = t[k]
        fs = ('宽%.0f%% 高%.0f%%' % (fill[0] * 100, fill[1] * 100)) if fill else '（图缺）'
        gone = n - f
        if gone < 0:
            gone = 0
        cut += gone
        print('%-14s %8d %6d %4d %4d  %-16s %6.2f %7.2f %7.2f' % (k, n, f, i0, gone, fs, sc, ox, oy))
    print('-' * 84)
    print('两端共裁掉 %d 帧（%.2f 秒 @24fps）—— 素材两端本来就是空白/看不见的，裁掉才「按下即见、播完即消」' % (cut, cut / 24.0))
    if dry:
        print('\n（--dry：未写回）')
        return

    P = os.path.join(ROOT, 'js', '20_data.js')
    src = io.open(P, encoding='utf-8').read()
    m = re.search(r'const FX_SHEETS = \{.*?\n\};', src, re.S)
    if not m:
        print('找不到 FX_SHEETS 块'); sys.exit(2)
    old = m.group(0)
    lines = []
    ks_sorted = sorted(t)
    for idx, k in enumerate(ks_sorted):
        km = re.search(r'^  %s:\s*\{[^}]*\}\s*,?\s*(//[^\n]*)?$' % re.escape(k), old, re.M)
        # 注释尾巴要剥掉：① 逗号写在注释**之前**（`},   // 名`），带进去会越滚越脏；
        # ② 上一轮追加的注记（旧格式「原始 N 帧→…」与新格式「素材 N 帧，…」）也要先剥掉再重写，
        #    否则重跑一次就多一句。注意别误伤原有注释里的「（帧数最短，17）」——那里「帧」在数字前。
        cmt = (km.group(1) or '').rstrip().rstrip(',') if km else ''
        cmt = re.sub(r'\s*(?:原始|素材)\s*\d+\s*帧[^　]*', '', cmt).rstrip()
        sc, ox, oy, _fill, i0, f, n = t[k]
        fields = 'c:8, f:%d' % f
        # 原始帧数只在**裁掉了**才记：没裁的写了是噪音
        if n - f > 0:
            fields += ', f0:%d' % n          # 素材里分配给这个特效的帧数（有像素的格子数）
        fields += ', rows:%d' % ks[k][1]
        if i0:
            fields += ', i0:%d' % i0          # 起始帧：两端空白已裁，播的第一帧就是有画面的
        fields += ', scale:%.2f' % sc
        if ox or oy:
            fields += ', ox:%s, oy:%s' % (('%g' % ox), ('%g' % oy))
        if n - f > 0:
            cmt = (cmt + '　素材 %d 帧，两端看不见的 %d 帧不播' % (n, n - f)).strip()
        body = '  %-12s { %s }' % (k + ':', fields)
        # 分隔逗号必须在**注释之前**（注释会吃到行尾）；最后一条不要逗号
        line = body + ('' if idx == len(ks_sorted) - 1 else ',')
        if cmt:
            line += '   ' + cmt
        lines.append(line)
    new = ('const FX_SHEETS = {\n' + '\n'.join(lines) + '\n};')
    # 关键词注释块（表头那段说明）在 old 之前，替换范围只到 `};`，所以是安全的
    src = src.replace(old, new, 1)
    io.open(P, 'w', encoding='utf-8').write(src)
    print('\n已写回 %s（%d 条）' % (os.path.relpath(P, ROOT), len(lines)))


if __name__ == '__main__':
    main()