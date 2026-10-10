# -*- coding: utf-8 -*-
"""生成软著登记用《源代码文档》。

规则（《计算机软件著作权登记办法》第十条）：
  - 源程序取「前、后各连续 30 页」= 共 60 页（本作代码 1.1 万行，远超 60 页，取前后）；
  - 每页不少于 50 行（末页除外）；
  - 页眉标注：软件名称 + 版本号（左）+ 页码（右）。

用法：
  python _gen_softcopyright.py
  可用环境变量覆盖：SOFT_NAME / SOFT_VER
产物：
  _out_软著/软著_源代码文档.docx
"""
import os
import sys
import unicodedata

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt

REPO = r"C:\Users\HP\Desktop\志怪塔 - 副本 (3)"
# 按加载顺序拼接（与 原型.html 里 <script src> 顺序一致）
SRC_FILES = [
    'js/00_base.js', 'js/10_audio.js', 'js/20_data.js', 'js/30_engine.js',
    'js/40_flow.js', 'js/50_ui.js', 'js/55_cloud.js', 'js/60_boot.js',
]
SOFT_NAME = os.environ.get('SOFT_NAME', '志怪塔游戏软件')
SOFT_VER = os.environ.get('SOFT_VER', 'V1.0')

LINES_PER_PAGE = 50
PAGES_PER_SIDE = 30          # 前 30 页 + 后 30 页
FONT = '宋体'
FONT_SIZE = Pt(9)            # 小五
LINE_SPACING = Pt(11)        # 固定行距，保证 50 行/页及排版稳定
MAX_UNITS = 96               # 单行最大「半角宽度」：中文按 2、西文按 1；96 单位 ≈ 15.2cm < 16cm 版心

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, '_out_软著')
OUT_DOCX = os.path.join(OUT_DIR, '软著_源代码文档.docx')


def _char_units(ch):
    return 2 if unicodedata.east_asian_width(ch) in ('W', 'F') else 1


def wrap_line(text, max_units=MAX_UNITS):
    """按显示宽度把一行硬折成若干行，避免 Word 自动折行破坏「50 行/页」。"""
    if text.strip() == '':
        return [text if text else '']
    segs = []
    cur = ''
    used = 0
    for ch in text:
        w = _char_units(ch)
        if used + w > max_units and cur:
            segs.append(cur)
            cur, used = '', 0
        cur += ch
        used += w
    if cur:
        segs.append(cur)
    return segs


def read_source_lines():
    """按文件顺序读出全部源码行并硬折行（跳过空尾行，文件之间插一行空行分隔）。"""
    lines = []
    for rel in SRC_FILES:
        path = os.path.join(REPO, rel)
        with open(path, encoding='utf-8') as f:
            body = f.read().replace('\r\n', '\n').replace('\r', '\n').split('\n')
        # 去掉文件末尾多余空行
        while body and body[-1].strip() == '':
            body.pop()
        for ln in body:
            lines.extend(wrap_line(ln))
        lines.append('')
    while lines and lines[-1] == '':
        lines.pop()
    return lines


def set_font(run, name=FONT, size=FONT_SIZE, bold=False):
    run.font.size = size
    run.font.bold = bold
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = OxmlElement('w:rFonts')
        rPr.append(rFonts)
    rFonts.set(qn('w:eastAsia'), name)
    rFonts.set(qn('w:ascii'), name)
    rFonts.set(qn('w:hAnsi'), name)


def add_page_field(paragraph):
    """插入 Word PAGE 域（页码）。"""
    run = paragraph.add_run()
    fld_begin = OxmlElement('w:fldChar')
    fld_begin.set(qn('w:fldCharType'), 'begin')
    instr = OxmlElement('w:instrText')
    instr.set(qn('xml:space'), 'preserve')
    instr.text = ' PAGE '
    fld_end = OxmlElement('w:fldChar')
    fld_end.set(qn('w:fldCharType'), 'end')
    run._r.append(fld_begin)
    run._r.append(instr)
    run._r.append(fld_end)
    set_font(run)
    return run


def add_code_line(doc, text):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.space_before = Pt(0)
    pf.space_after = Pt(0)
    pf.line_spacing_rule = WD_LINE_SPACING.EXACTLY
    pf.line_spacing = LINE_SPACING
    # 制表位左对齐，避免 Word 自作缩进
    r = p.add_run(text if text != '' else ' ')
    set_font(r)
    return p


def add_page_break(doc):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.EXACTLY
    p.paragraph_format.line_spacing = Pt(1)
    r = p.add_run()
    br = OxmlElement('w:br')
    br.set(qn('w:type'), 'page')
    r._r.append(br)


def build_header(section):
    section.header.is_linked_to_previous = False
    hdr = section.header
    p = hdr.paragraphs[0] if hdr.paragraphs else hdr.add_paragraph()
    p.text = ''
    pf = p.paragraph_format
    pf.space_after = Pt(4)
    # 右对齐制表位放页码
    usable = section.page_width - section.left_margin - section.right_margin
    p.paragraph_format.tab_stops.add_tab_stop(usable, WD_TAB_ALIGNMENT.RIGHT)
    run = p.add_run(f'{SOFT_NAME} {SOFT_VER}')
    set_font(run)
    run2 = p.add_run('\t')
    set_font(run2)
    run3 = p.add_run('第 ')
    set_font(run3)
    add_page_field(p)
    run4 = p.add_run(' 页')
    set_font(run4)


def emit_pages(doc, lines, pages):
    """把 lines 按每页 50 行输出，共 pages 页。"""
    need = pages * LINES_PER_PAGE
    if len(lines) < need:
        # 不足时补空行（正常不会触发）
        lines = lines + [''] * (need - len(lines))
    for pi in range(pages):
        chunk = lines[pi * LINES_PER_PAGE:(pi + 1) * LINES_PER_PAGE]
        for ln in chunk:
            add_code_line(doc, ln)
        if pi != pages - 1:
            add_page_break(doc)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    lines = read_source_lines()
    total = len(lines)
    need = PAGES_PER_SIDE * LINES_PER_PAGE
    print(f'源码总行数：{total}')
    if total < need * 2:
        print(f'[警告] 源码不足 {need*2} 行，将全部提交（不取前后裁切）。')
        front = lines
        back = []
    else:
        front = lines[:need]
        back = lines[-need:]

    doc = Document()
    # 页面设置：A4 + 2.5cm 页边距
    sec = doc.sections[0]
    sec.page_width = Cm(21.0)
    sec.page_height = Cm(29.7)
    sec.top_margin = Cm(2.2)
    sec.bottom_margin = Cm(2.2)
    sec.left_margin = Cm(2.5)
    sec.right_margin = Cm(2.5)
    sec.header_distance = Cm(1.2)
    build_header(sec)

    # 正文默认字体
    normal = doc.styles['Normal']
    normal.font.name = FONT
    normal.font.size = FONT_SIZE
    normal.element.rPr.rFonts.set(qn('w:eastAsia'), FONT)

    emit_pages(doc, front, PAGES_PER_SIDE)
    if back:
        add_page_break(doc)
        emit_pages(doc, back, PAGES_PER_SIDE)

    doc.save(OUT_DOCX)
    print(f'已生成：{OUT_DOCX}')
    print(f'页数：{PAGES_PER_SIDE + (PAGES_PER_SIDE if back else 0)} 页 × {LINES_PER_PAGE} 行')


if __name__ == '__main__':
    main()