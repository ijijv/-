# -*- coding: utf-8 -*-
"""特效精灵图管线（一次性、可重跑）：把 UI 重设计目录里的「8 列精灵图」原样搬进 `素材/fx/`。

**按用户决定：不做任何缩放/降采样**（「可以不要压缩，先原样加入吗，之后需要调整我再说」）。
所以这个脚本只做两件事：①改名（中文目录名 → 下划线小写 key，与音效词汇表同风格）
②数帧（每格扫 alpha，全透明的尾巴格不算帧 —— 8 列的最后一排常常是空的）。
**要调尺寸就调这里**（`RESIZE` 旋钮），别去改 `打包.py`。

跑法：`python _patch/mk_fx_sheets.py`（会打印可直接粘进 `js/20_data.js` 的 FX_SHEETS）。

为什么用精灵图而不是 `<名>_code/alpha/*.png`：那一套是 1301 张散图（一个特效几十个 http 请求），
精灵图是一特效一文件，8 列正好配 background-position 步进。
为什么不用 mp4：全部是 h264/yuv420p、底色纯黑、无 alpha ⇒ 内联管线吃不下，贴上去还是黑方块。
"""
import glob
import io
import os
import shutil
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(os.path.dirname(ROOT), u'志怪塔UI重设计', u'素材', u'特效')
DST = os.path.join(ROOT, u'素材', u'fx')

CELL = 240          # 单元边长（v1.1.20r：全量合成格 480→240；此处按输出图规格写 240）
COLS = 8
RESIZE = 1920       # 源图最长边缩到 1920 ⇒ 3840 的源正好 ×0.5、单元 480→240（与 CELL 配套；0 = 不缩放）

# 目录名 → 特效 key。key 风格跟 `素材/sfx/` 的下划线小写一致。
# `锁_破裂_code` **故意不在表里**：v0.62.0 已用移植 canvas 代码实现，不接精灵图（30 条提示词文档里也没有它）。
FX_MAP = [
    (u'雷符_code', 'lei'),
    (u'火符_code', 'huo'),
    (u'剑符_斩妖剑_code', 'jian'),
    (u'天雷正法_code', 'tianlei'),
    (u'万剑归宗_code', 'wanjian'),
    (u'百鬼夜行_code', 'baigui'),
    (u'钟馗镇魂_code', 'zhongkui'),
    (u'镇妖铃_code', 'zhenyaoling'),
    (u'格挡_金刚符_code', 'block'),
    (u'金光罩_金钟罩_code', 'jinzhong'),
    (u'荆棘符_反震_code', 'thorns'),
    (u'佛渡_净化_code', 'fodu'),
    (u'诅咒_code', 'curse'),
    (u'尸气_code', 'shiqi'),
    (u'血怒_code', 'xuenu'),
    (u'虚弱_code', 'weak'),
    (u'魅惑_code', 'charm'),
    (u'灼烧_code', 'burn'),
    (u'勾魂_code', 'gouhun'),
    (u'纸人召唤_code', 'zhiren'),
    (u'小鬼召唤_code', 'xiaogui'),
    (u'尸王召唤_code', 'shiwang'),
    (u'阴兵过境_code', 'yinbing'),
    (u'玩家受击_code', 'hurt'),
    (u'治疗回血_code', 'heal'),
    (u'吸血_渡魂归己_code', 'lifesteal'),
    (u'蓄力_code', 'charge'),
    (u'召唤_僵尸手_code', 'jiangshi'),
    (u'业火_code', 'yehuo'),
    (u'忘忧汤_code', 'wangyou'),
]


def count_frames(path):
    """数这张精灵图到底有几帧：按行优先扫，全透明的格子不算（末排常留空）。
    返回 (帧数, 列数, 行数)。"""
    im = Image.open(path)
    if im.mode != 'RGBA':
        im = im.convert('RGBA')
    W, H = im.size
    if W != COLS * CELL:
        raise SystemExit(u'%s 宽度 %d ≠ 8×%d，不是 8 列精灵图' % (path, W, CELL))
    rows = H // CELL
    a = np.array(im.split()[3])          # 只取 alpha，比整张 RGBA 省 3/4 内存
    n = 0
    for r in range(rows):
        for c in range(COLS):
            cell = a[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL]
            if cell.max() > 8:           # 阈值 8：抗 JPEG/WebP 残留噪点，不算真内容
                n += 1
    return n, COLS, rows


def main():
    if not os.path.isdir(SRC):
        print(u'找不到源目录 %s' % SRC)
        sys.exit(1)
    if not os.path.isdir(DST):
        os.makedirs(DST)

    out, total_in, total_out = [], 0, 0
    for folder, key in FX_MAP:
        hits = glob.glob(os.path.join(SRC, folder, u'*_精灵图_8列.png'))
        if not hits:
            print(u'!! 缺精灵图: %s' % folder)
            sys.exit(1)
        src = hits[0]
        dst = os.path.join(DST, key + '.png')
        im = Image.open(src)
        if im.mode != 'RGBA':
            im = im.convert('RGBA')
        if RESIZE and max(im.size) > RESIZE:
            r = RESIZE / float(max(im.size))
            im = im.resize((int(im.width * r), int(im.height * r)), Image.LANCZOS)
        # 不用 optimize=True：3840×2880 的 RGBA 跑一遍要十几秒，而这些图是 `打包.py` 的**输入**
        # （产物里它们是 WebP），源 PNG 再瘦也不影响 dist。
        im.save(dst, 'PNG')
        f, c, rows = count_frames(dst)
        a, b = os.path.getsize(src), os.path.getsize(dst)
        total_in += a
        total_out += b
        out.append((key, c, f, rows, im.size))
        print(u'%-12s %-22s %2d 帧 / %d 行  %s  %6.2fMB → %6.2fMB'
              % (key, folder, f, rows, '%dx%d' % im.size, a / 1048576., b / 1048576.))

    print(u'\n共 %d 个特效，%s → %s' % (len(out), human(total_in), human(total_out)))
    print(u'\n/* 粘进 js/20_data.js：*/')
    print(u'const FX_SHEETS = {')
    for key, c, f, rows, size in out:
        print(u"  %s: { c: %d, f: %d, rows: %d, scale: 1.0 }," % (key, c, f, rows))
    print(u'};')
    print(u'\n/* 行优先帧数 = %s */' % ', '.join('%s:%d' % (k, f) for k, _, f, _, _ in out))


def human(n):
    return '%.2f MB' % (n / 1048576.) if n >= 1048576 else '%.0f KB' % (n / 1024.)


if __name__ == '__main__':
    main()