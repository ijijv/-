# -*- coding: utf-8 -*-
"""一次性取证：产物（dist/志怪塔.html）在 **file:// 双击打开**时音效到底能不能用。

`_drvdist.js` 是同步跑完就 return 的，验不了要等异步解码的音效路径；本文件补的就是这一块。
外层页里只有 `_drvsfx.js`，产物在 iframe 里 —— 产物是单文件自包含的，往里注入任何东西都会改变被验对象。

用法：`python _patch/probe_sfx.py`   退出码 = 失败条数（0 = 全绿）
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

PAGE = os.path.join(ROOT, '_test_out', '_sfxprobe.html')
DIST = os.path.join(ROOT, 'dist', '志怪塔.html')

SRC = """<!doctype html><meta charset="utf-8"><title>sfxprobe</title>
<style>html,body{margin:0;background:#111;color:#0f0;font:12px/1.4 monospace}
iframe{width:1280px;height:720px;border:0;position:absolute;left:-5000px;top:0}</style>
<pre id="__out">running…</pre>
<script src="../_patch/_drvsfx.js"></script>
"""


def main():
    if not os.path.exists(DIST):
        print('没有产物：先跑 `python 打包.py`')
        return 1
    os.makedirs(os.path.dirname(PAGE), exist_ok=True)
    io.open(PAGE, 'w', encoding='utf-8').write(SRC)

    url = 'file:///' + PAGE.replace('\\', '/')
    cmd = [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
           '--allow-file-access-from-files',   # 否则 file:// 父页不许读 file:// 子帧
           '--autoplay-policy=no-user-gesture-required',   # 无头里没有真手势，AudioContext 要能起
           '--window-size=1400,900',
           '--dump-dom', '--virtual-time-budget=120000', url]
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