# -*- coding: utf-8 -*-
"""把主界面美术从设计目录导入 素材/ 并做尺寸归一。

为什么需要这个脚本（而不是手工复制）：
  1. 6 个 UI 元素打包在一个 zip 里，每次换图都要重新解压、对名字；
  2. 三张背景原图 2730x1536，原尺寸进包会让 dist 再涨约 2.2MB
     （collect() 会把每张图 base64 内联，体积 +33%），已贴抖音 30MB 线
     —— 所以入库前统一降到 <=1920 宽（1080p 屏上看不出差别）；
  3. bg_menu_now.jpg 实为 PNG 字节套 .jpg 名。扩展名与内容不符会让 打包.py
     写出 data:image/jpeg;base64,<PNG字节>，而 data URI 里浏览器不一定嗅探
     —— 所以按真实格式改名 .png，零风险。

可重复运行：只覆盖本脚本自己的目标文件，不删任何既有素材。
用法： python _patch/import_menu_art.py [--max-dim 1920] [--dry]
"""

import argparse
import io
import os
import struct
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UI_DIR = os.path.join(ROOT, '素材', 'ui', 'menu')
BG_DIR = os.path.join(ROOT, '素材', 'bg', 'menu')

# 设计目录（仓库外）。换图后把新 zip / 新背景丢进这两个目录再跑本脚本即可。
SRC_ROOT = r'C:\Users\HP\Desktop\志怪塔UI重设计'
SRC_BG = os.path.join(SRC_ROOT, '背景图')

# zip 名带随机后缀，用前缀匹配，避免每次导出后要改脚本
UI_ZIP_PREFIX = '压缩图片_'
UI_ZIP_SUFFIX = '.zip'
UI_NAMES = ['start.png', 'continue.png', 'collection.png', 'leaderboard.png',
            'setting.png', 'topic.png']

# 源背景 -> 目标名。第三个的真实格式是 PNG，见模块 docstring 第 3 条。
BG_MAP = [
    ('main-bg.jpg', 'menu_1.jpg'),
    ('battle-bg.jpg', 'menu_2.jpg'),
    ('bg_menu_now.jpg', 'menu_3.png'),
]

MAGIC = [
    (b'\x89PNG\r\n\x1a\n', 'png'),
    (b'\xff\xd8', 'jpeg'),
    (b'GIF', 'gif'),
    (b'BM', 'bmp'),
]


def sniff(src):
    """按魔数判定真实格式，不信任扩展名。src 可为路径或 bytes。"""
    if isinstance(src, (bytes, bytearray)):
        head = bytes(src[:12])
    else:
        with open(src, 'rb') as f:
            head = f.read(12)
    for magic, name in MAGIC:
        if head.startswith(magic):
            return name
    if head[:4] == b'RIFF' and head[8:12] == b'WEBP':
        return 'webp'
    return '?'


def png_size(blob):
    """从 PNG 的 IHDR 取宽高，不依赖 PIL。"""
    return struct.unpack('>II', blob[16:24])


def find_ui_zip():
    if not os.path.isdir(SRC_ROOT):
        sys.exit('找不到设计目录：%s' % SRC_ROOT)
    hits = []
    for base in (os.path.join(SRC_ROOT, '素材'), SRC_ROOT):
        if not os.path.isdir(base):
            continue
        for fn in sorted(os.listdir(base)):
            if fn.startswith(UI_ZIP_PREFIX) and fn.endswith(UI_ZIP_SUFFIX):
                hits.append(os.path.join(base, fn))
    if not hits:
        sys.exit('在 %s 下找不到 %s*%s' % (SRC_ROOT, UI_ZIP_PREFIX, UI_ZIP_SUFFIX))
    if len(hits) > 1:
        print('!! 找到多个候选 zip，取第一个（按名字排序）：')
        for h in hits:
            print('   ', os.path.basename(h))
    return hits[0]


def trim_alpha(blob):
    """裁掉四周全透明的边距，返回 (新字节, 新尺寸)。

    导出时留的透明边距没有视觉意义，但会让布局算式全部要加补偿、碎片
    clip-path 也对不准石头本体。裁掉后 canvas 就等于可见内容。

    ⚠️ 必须在**原 mode** 上 crop：这些图是调色板 PNG（mode 'P'），先
    convert('RGBA') 再存会让体积翻几倍。alpha 的 bbox 只在 RGBA 副本上
    算，裁剪仍回到原图做。
    """
    from PIL import Image
    im = Image.open(io.BytesIO(blob))
    box = im.convert('RGBA').getchannel('A').getbbox()
    if not box:
        return blob, im.size                      # 整张全透明，原样返回
    if box == (0, 0, im.size[0], im.size[1]):
        return blob, im.size                      # 本来就没边距
    im = im.crop(box)
    buf = io.BytesIO()
    im.save(buf, 'PNG', optimize=True)
    return buf.getvalue(), im.size


def import_ui(zp, dry, trim):
    z = zipfile.ZipFile(zp)
    have = {os.path.basename(i.filename): i for i in z.infolist()}
    missing = [n for n in UI_NAMES if n not in have]
    if missing:
        sys.exit('zip 里缺少这些文件：%s\nzip 实际内容：%s'
                 % (', '.join(missing), ', '.join(sorted(have))))
    extra = sorted(set(have) - set(UI_NAMES))
    if extra:
        print('!! zip 里有计划外的文件（已跳过）：%s' % ', '.join(extra))

    if not dry:
        os.makedirs(UI_DIR, exist_ok=True)
    rows = []
    for name in UI_NAMES:
        blob = z.read(have[name])
        fmt = sniff(blob)
        w0, h0 = png_size(blob) if fmt == 'png' else (0, 0)
        out, size = (trim_alpha(blob) if (trim and fmt == 'png') else (blob, (w0, h0)))
        if not dry:
            with open(os.path.join(UI_DIR, name), 'wb') as f:
                f.write(out)
        rows.append({'to': '素材/ui/menu/' + name, 'fmt': fmt,
                     'size': size, 'orig': (w0, h0), 'bytes': len(out)})
    return rows


def import_bg(max_dim, dry):
    try:
        from PIL import Image
    except Exception as e:
        sys.exit('需要 PIL 来缩放背景：%s' % e)
    if not dry:
        os.makedirs(BG_DIR, exist_ok=True)
    rows = []
    for src_name, dst_name in BG_MAP:
        src = os.path.join(SRC_BG, src_name)
        if not os.path.isfile(src):
            sys.exit('找不到背景：%s' % src)
        fmt = sniff(src)
        want = 'png' if dst_name.endswith('.png') else 'jpeg'
        if fmt != want:
            print('!! %s 真实格式是 %s，但目标名是 .%s —— 名字与内容不符，请核对'
                  % (src_name, fmt, dst_name.rsplit('.', 1)[1]))

        im = Image.open(src)
        orig = im.size
        dst = os.path.join(BG_DIR, dst_name)
        n = 0
        if max_dim and orig[0] > max_dim:
            scale = float(max_dim) / orig[0]
            im = im.resize((max(1, int(round(orig[0] * scale))),
                            max(1, int(round(orig[1] * scale)))), Image.LANCZOS)
            if not dry:
                if want == 'jpeg':
                    im.convert('RGB').save(dst, 'JPEG', quality=88, optimize=True)
                else:
                    im.save(dst, 'PNG', optimize=True)
        else:
            # 不需要缩放就原样复制字节 —— 重新编码只会掉质量、且可能变大
            if not dry:
                with open(src, 'rb') as fi, open(dst, 'wb') as fo:
                    fo.write(fi.read())
        if not dry:
            n = os.path.getsize(dst)
        rows.append({'to': '素材/bg/menu/' + dst_name, 'fmt': fmt,
                     'size': im.size, 'orig': orig, 'bytes': n})
    return rows


def report(title, rows, dry):
    print('\n== %s%s ==' % (title, '（--dry，未写盘）' if dry else ''))
    for r in rows:
        note = '' if r['size'] == r['orig'] else '  (原 %dx%d)' % r['orig']
        print('  %-34s %-5s %5dx%-5d %8.1f KB%s'
              % (r['to'], r['fmt'], r['size'][0], r['size'][1],
                 r['bytes'] / 1024.0, note))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--max-dim', type=int, default=1920,
                    help='背景最大宽度，超过则等比缩小（0 = 不缩）')
    ap.add_argument('--no-trim', action='store_true',
                    help='不裁掉 UI 图的透明边距（默认裁）')
    ap.add_argument('--dry', action='store_true', help='只报告，不写盘')
    a = ap.parse_args()

    zp = find_ui_zip()
    print('UI zip : %s' % zp)
    report('UI 元素', import_ui(zp, a.dry, not a.no_trim), a.dry)
    report('背景', import_bg(a.max_dim, a.dry), a.dry)
    print('\n目标目录：素材/ui/menu/ 与 素材/bg/menu/')
    print('打包.py 的 os.walk(素材) 会自动收集，无需任何额外打包步骤。')


if __name__ == '__main__':
    main()