# -*- coding: utf-8 -*-
"""产物的**功能性**验证跑法 —— 建外层页 + 调 headless Chrome，读回 `_patch/_drvdist.js` 的结论。

为什么要有这只（而不是往 verify_dist.py 里塞几条文本闸）：`verify_dist.py` 全是「产物里有没有
这段文本」式的检查，而产物是混淆过的 —— 大量串（含中文明文与一部分 ASCII 串）被搬进 base64 串表，
注释被整个删掉 ⇒ **文本闸在产物这一层会系统性地撒谎**。本文件补的正是「跑一遍看行为」那半边：
`_drvdist.js` 里每一条断言，都是文本闸无论如何证不了的东西（CSS 规则是否被解析器接受、
data-new 有没有真的产出、render 尾部的 flush 有没有被调到）。

为什么用 iframe 而不是直接开产物：产物是**单文件自包含**的，往里注入任何东西都会改变被验对象。
`--allow-file-access-from-files` 下 file:// 父页可以读子帧，所以从外面往里看是干净的。

⚠️ 外层页与上游产物都必须在**仓库根**的相对路径上（`_test_out/` 与 `dist/`），否则 js/ 与 素材/
全 404。中转页丢 `_test_out/`（.gitignore 已忽略），别落在 `_patch/` 里被 git add -A 裹走。

用法：`python _patch/probe_dist.py`   退出码 = 失败条数（0 = 全绿）
"""
import html
import io
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATCH = os.path.join(ROOT, '_patch')
sys.path.insert(0, PATCH)
from shot import CHROME  # noqa: E402  —— chrome.exe 的路径只维护在 shot.py 一处

PAGE = os.path.join(ROOT, '_test_out', '_distprobe.html')
DIST = os.path.join(ROOT, 'dist', '志怪塔.html')

SRC = """<!doctype html><meta charset="utf-8"><title>distprobe</title>
<style>html,body{margin:0;background:#111;color:#0f0;font:12px/1.4 monospace}
iframe{width:1280px;height:720px;border:0;position:absolute;left:-5000px;top:0}</style>
<pre id="__out">running…</pre>
<script src="../_patch/_drvdist.js"></script>
"""


def main():
    if not os.path.exists(DIST):
        print('没有产物：先跑 `python 打包.py`')
        return 1
    os.makedirs(os.path.dirname(PAGE), exist_ok=True)
    io.open(PAGE, 'w', encoding='utf-8').write(SRC)

    url = 'file:///' + PAGE.replace('\\', '/')
    cmd = [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
           '--allow-file-access-from-files',      # 否则 file:// 父页不许读 file:// 子帧
           '--window-size=1400,900',
           # 产物 32MB、213 张图内联，加载本身就慢；虚时钟要给够，否则 dump 时 __out 还是空
           '--dump-dom', '--virtual-time-budget=20000', url]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    m = re.search(r'<pre id="__out">(.*?)</pre>', r.stdout or '', re.S)
    if not m:
        print('(没读到 __out —— 页面没跑起来)\n' + (r.stdout or r.stderr or '')[:800])
        return 1
    text = html.unescape(m.group(1))
    print(text)
    bad = re.search(r'^bad=(\d+)$', text, re.M)
    return int(bad.group(1)) if bad else 1


if __name__ == '__main__':
    sys.exit(main())