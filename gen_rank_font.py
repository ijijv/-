# -*- coding: utf-8 -*-
"""
gen_rank_font.py —— 风云榜毛笔体离线子集（**工程脚本，不提交**）

作用：把 MaShanZheng-Regular.ttf（5.86MB / 7015 字形）按「本工程实际用到的字」
      子集化 + woff2 压缩，base64 塞进 原型.html 的 /*__RANK_FONT_BEGIN__*/ … /*__RANK_FONT_END__*/
      两个标记之间，成为内联 @font-face。

为什么走内联 base64 而不是放 素材/：
  · 打包.py 的 IMG_EXT 不含 .ttf/.woff2 ⇒ 放进素材目录既不会被打包也不会报错（静默失效）。
  · 单文件产物里任何 `url(素材/…)` 都会 404，而 verify_dist.py 的 CSS url 闸正是查这个。
  · 打包.py 切片保留 <style>，CSS 不参与混淆，base64 又不匹配 `url(素材/` ⇒ 三道闸全绿。

字符集口径：原型.html + js/*.js 里出现的**全部字符**（含中文/标点/ASCII）。
  ⇒ 代码里写死的文案（榜名、角色名、表头、空态、按钮…）一定命中；
  ⇒ TapTap 玩家的**动态昵称**必然有命不中的字，由 @font-face 的 KaiTi 回退兜底
     （GAME_MIGRATION.md §4「字体离线化」即此口径）。
"""
import base64
import glob
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(ROOT, '原型.html')
SRC_TTF = r'c:\Users\HP\.trae-cn\attachments\0777ef8b-1cdc-4d01-b31d-c1a79a579a00_8972733b-d8d2-44b5-a2f1-3672c71d1154_MaShanZheng-Regular.ttf'

BEGIN = '/*__RANK_FONT_BEGIN__*/'
END = '/*__RANK_FONT_END__*/'


def collect_chars():
    buf = []
    with io.open(HTML, 'r', encoding='utf-8') as f:
        buf.append(f.read())
    for p in sorted(glob.glob(os.path.join(ROOT, 'js', '*.js'))):
        with io.open(p, 'r', encoding='utf-8') as f:
            buf.append(f.read())
    text = ''.join(buf)
    # 去掉 base64 大块（避免把图片字节当字符集，白白撑大子集）
    text = re.sub(r'base64,[A-Za-z0-9+/=]+', '', text)
    chars = set(text)
    # 补齐常用标点 / 数字 / 拉丁，防止动态数字换行符等漏网
    chars |= set('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
                 ' ·—…×÷幺〇一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾'
                 '，。、；：？！“”‘’（）《》〈〉【】〔〕％＋－／＃＠＆＊'
                 ',.;:?!"\'()[]{}<>%+-/#@&*_=|\\~`^$\n\r\t ')
    chars.discard('\n')
    chars.discard('\r')
    chars.discard('\t')
    return ''.join(sorted(chars))


def main():
    try:
        from fontTools.ttLib import TTFont
        from fontTools.subset import Subsetter, Options
    except ImportError:
        print('[x] 缺 fontTools：python -m pip install fonttools brotli')
        return 1

    chars = collect_chars()
    print('[i] 字符集 %d 个' % len(chars))

    font = TTFont(SRC_TTF, fontNumber=0)
    opts = Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']          # 保留全部 OpenType 特性（毛笔体的连笔/标点定位）
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    opts.hinting = True
    opts.desubroutinize = False
    opts.recalc_bounds = False
    ss = Subsetter(options=opts)
    ss.populate(text=chars)
    ss.subset(font)

    buf = io.BytesIO()
    font.flavor = 'woff2'
    font.save(buf)
    raw = buf.getvalue()
    print('[i] woff2 %d 字节（%.2f MB）' % (len(raw), len(raw) / 1048576.0))

    b64 = base64.b64encode(raw).decode('ascii')
    face = ("@font-face{font-family:'MaShanZheng';font-style:normal;font-weight:400;"
            "font-display:swap;src:url(data:font/woff2;base64,%s) format('woff2');}" % b64)

    with io.open(HTML, 'r', encoding='utf-8') as f:
        html = f.read()
    if html.count(BEGIN) != 1 or html.count(END) != 1:
        print('[x] 原型.html 里的字体标记不唯一（BEGIN=%d END=%d）' % (html.count(BEGIN), html.count(END)))
        return 1
    head, rest = html.split(BEGIN, 1)
    _, tail = rest.split(END, 1)
    html = head + BEGIN + '\n  ' + face + '\n  ' + END + tail
    with io.open(HTML, 'w', encoding='utf-8') as f:
        f.write(html)
    print('[✓] 已注入 原型.html（@font-face %d 字节 base64）' % len(b64))
    return 0


if __name__ == '__main__':
    sys.exit(main())