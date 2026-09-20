# -*- coding: utf-8 -*-
"""v0.61.25 步骤 5b —— 修 verify_dist.py 新加检查里的两个自身缺陷

① AUD_MIME 解析：原正则把字典的**值**（'audio/mpeg' 等 MIME）也当成扩展名收了
   → 改成只取键（`'xxx':`）。
② 盘符路径扫描：`[A-Za-z]:/` 会命中 'http://www.w3.org/2000/svg' 里的 'p:/'
   —— 这是**既有**误报（50_ui.js:85 的 SVG 命名空间），只是今天才被看见。
   → 加前置断言 `(?<![A-Za-z])`，真路径（前面是引号/空格/行首）照样抓得到。

锚点唯一性各校验 count==1。
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, 'verify_dist.py')

A1 = """    exts_pack = sorted(set(re.findall(r"'([^']+)'", _m2.group(1)))) if _m2 else []"""
B1 = """    # 只取字典的**键**：值是 'audio/mpeg' 这类 MIME，混进来会假失败
    exts_pack = sorted(set(re.findall(r"'([^']+)'\\s*:", _m2.group(1)))) if _m2 else []"""

A2 = """        '盘符路径': r'[A-Za-z]:\\\\\\\\|[A-Za-z]:/',"""
B2 = """        # 前置不能是字母，否则 'http://…' 里的 'p:/' 会假命中
        '盘符路径': r'(?<![A-Za-z])[A-Za-z]:\\\\\\\\|(?<![A-Za-z])[A-Za-z]:/',"""


def main():
    src = io.open(P, encoding='utf-8', newline='').read()
    nl = '\r\n' if '\r\n' in src else '\n'
    for tag, a, b in (('AUD_MIME 只取键', A1, B1), ('盘符路径加前置断言', A2, B2)):
        a = a.replace('\n', nl)
        b = b.replace('\n', nl)
        n = src.count(a)
        if n != 1:
            print('FAIL [%s] count=%d (expect 1)' % (tag, n))
            return 1
        src = src.replace(a, b, 1)
    io.open(P, 'w', encoding='utf-8', newline='').write(src)
    print('OK verify_dist.py 两处已修')
    return 0


if __name__ == '__main__':
    sys.exit(main())
