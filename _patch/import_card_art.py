# -*- coding: utf-8 -*-
"""把卡牌三视图（正面 / 侧面 / 背面）从设计目录导入 素材/ui/card/ 并改成英文名。

为什么要有这个脚本（而不是手拖）：
  1. 源文件是中文名 + `-v4-透明` 后缀，**v5 / v6 导出后名字会变**，手拖每次都要对名字；
  2. 侧视图四周有大量透明边距（内容只在 x158..385），不裁掉的话
     「堆叠偏移量」要按 385 算而不是按卡片真实厚度 227 算 —— 布局算式会全部偏掉；
  3. 三张图的**导出比例不一致**：正面/侧面 385x583，背面只有 257x389（正好是 2/3）。
     在游戏里卡片高度只有 100~200px，三张都是**降采样**显示，所以不用归一
     —— 但这件事得写下来，否则以后看到背面文件小会以为是漏了图。

可重复运行：只覆盖本脚本自己的三个目标文件，不删任何既有素材。
用法： python _patch/import_card_art.py [--dry] [--no-trim]
"""

import argparse
import io
import os
import struct
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = r'C:\Users\HP\Desktop\志怪塔UI重设计\素材'
DST_DIR = os.path.join(ROOT, '素材', 'ui', 'card')

# 源名 -> 目标名。源名带版本后缀（v4），换图后改这里。
# 目标名是英文：这三个会在 CSS/JS 里被反复引用，中文路径在混淆/打包环节是噪音。
MAP = [
    ('卡牌正视图-v4-透明.png', 'front.png'),   # 手牌正面：木框 + 上深色图窗 + 下米黄铭牌窗
    ('卡牌侧视图-v4-透明.png', 'side.png'),    # 卡牌厚度（抽牌堆 / 弃牌堆的侧面）
    ('卡牌背视图-v4-透明.png', 'back.png'),    # 牌背：暗底 + 金色八卦太极
]

MAGIC = [
    (b'\x89PNG\r\n\x1a\n', 'png'),
    (b'\xff\xd8', 'jpeg'),
    (b'GIF', 'gif'),
    (b'BM', 'bmp'),
]


def sniff(blob):
    """按魔数判定真实格式，不信任扩展名（菜单那批踩过：.jpg 里装的是 PNG）。"""
    head = bytes(blob[:12])
    for magic, name in MAGIC:
        if head.startswith(magic):
            return name
    if head[:4] == b'RIFF' and head[8:12] == b'WEBP':
        return 'webp'
    return '?'


def png_size(blob):
    return struct.unpack('>II', blob[16:24])


def trim_alpha(blob):
    """裁掉四周全透明边距，返回 (新字节, 新尺寸, alpha bbox)。

    ⚠️ 必须在**原 mode** 上 crop：这些是调色板 PNG（mode 'P'），
    先 convert('RGBA') 再存会让体积翻几倍。alpha 的 bbox 只在 RGBA 副本上算。
    """
    from PIL import Image
    im = Image.open(io.BytesIO(blob))
    box = im.convert('RGBA').getchannel('A').getbbox()
    if not box:
        return blob, im.size, None
    if box == (0, 0, im.size[0], im.size[1]):
        return blob, im.size, box
    out = im.crop(box)
    buf = io.BytesIO()
    out.save(buf, 'PNG', optimize=True)
    return buf.getvalue(), out.size, box


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry', action='store_true', help='只报告，不写盘')
    ap.add_argument('--no-trim', action='store_true', help='不裁透明边距（默认裁）')
    a = ap.parse_args()

    if not os.path.isdir(SRC_DIR):
        sys.exit('找不到设计目录：%s' % SRC_DIR)
    missing = [s for s, _ in MAP if not os.path.isfile(os.path.join(SRC_DIR, s))]
    if missing:
        sys.exit('设计目录里缺这些文件：%s\n该目录现有内容：%s'
                 % (', '.join(missing), ', '.join(sorted(os.listdir(SRC_DIR)))))
    if not a.dry:
        os.makedirs(DST_DIR, exist_ok=True)

    print('源：%s' % SRC_DIR)
    print('目标：%s%s\n' % (os.path.join('素材', 'ui', 'card'), '（--dry，未写盘）' if a.dry else ''))
    print('  %-12s %-5s %-14s %-14s %10s  %s' % ('目标名', '格式', '原尺寸', '入库尺寸', '大小', '说明'))
    total = 0
    for src_name, dst_name in MAP:
        src = os.path.join(SRC_DIR, src_name)
        with open(src, 'rb') as f:
            blob = f.read()
        fmt = sniff(blob)
        if fmt != 'png':
            print('!! %s 真实格式是 %s，不是 png —— 请核对' % (src_name, fmt))
        orig = png_size(blob) if fmt == 'png' else (0, 0)
        out, size, box = ((blob, orig, None) if a.no_trim else trim_alpha(blob))
        total += len(out)
        note = '无透明边距，原样' if (box and box == (0, 0) + orig) else (
            '裁掉边距 %s' % (box,) if box and box != (0, 0) + orig else '')
        if not a.dry:
            with open(os.path.join(DST_DIR, dst_name), 'wb') as f:
                f.write(out)
        print('  %-12s %-5s %-14s %-14s %9.1fKB  %s'
              % (dst_name, fmt, '%dx%d' % orig, '%dx%d' % size, len(out) / 1024.0, note))
    print('\n三张合计 %.1f KB（进包后 base64 约 +33%%）' % (total / 1024.0))
    print('打包.py 的 os.walk(素材) 会自动收集，无需额外打包步骤。')
    print('\n⚠️ 背面是正面的 2/3 尺寸（257x389 vs 385x583），**不是漏图**：')
    print('   游戏里卡片高度只有 100~200px，三张都是降采样显示，不必归一。')


if __name__ == '__main__':
    main()