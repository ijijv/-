# -*- coding: utf-8 -*-
"""跑 `_patch/_drvshuffle.js`，读回「洗牌动画在真实浏览器里到底放出了什么、占多少像素」。

与 `probe_dist.py` 的区别：那只验**产物**（iframe 套 dist），这只验**源码树**
（把驱动直接拼进 原型.html 的副本 `_shot.html`，不套 iframe）。理由：这里要问的是
「动画有没有真的创建出来」，源码树与产物跑的是同一份 js/00_base.js，而源码树加载快
（产物 32MB base64 内联，起一次要十几秒），迭代更省。

⚠️ 必须 `--direct` 式的顶层文档：`--dump-dom` 只序列化外层文档，iframe 里的 `#__out` 读不到
（见 shot.py 文件头 v0.66.0 那条）。
⚠️ `--direct` 下视口 ≠ `--window-size`：new headless 恒定少 22px 宽、98px 高，这里反补。

用法：`python _patch/probe_shuffle.py`    退出码 0 = 跑通（不代表断言全绿，看正文）
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

DRV = '_patch/_drvshuffle.js'
SHOT = os.path.join(ROOT, '_shot.html')
W, H = 1280, 720          # 桌面基档


def main():
    src = io.open(os.path.join(ROOT, '原型.html'), encoding='utf-8').read()
    tag = '<script src="%s"></script>' % DRV
    if tag not in src:
        src = src.replace('</body>', tag + '\n</body>')
    io.open(SHOT, 'w', encoding='utf-8').write(src)

    url = 'file:///' + SHOT.replace('\\', '/')
    cmd = [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
           '--allow-file-access-from-files',
           '--window-size=%d,%d' % (W + 22, H + 98),
           '--dump-dom', '--virtual-time-budget=20000', url]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    m = re.search(r'<pre id="__out"[^>]*>(.*?)</pre>', r.stdout or '', re.S)
    if not m:
        print('(没读到 #__out —— 页面没跑起来，或驱动抛在了 emit() 之前)')
        print((r.stdout or r.stderr or '')[:1200])
        return 1
    print(html.unescape(m.group(1)))
    return 0


if __name__ == '__main__':
    sys.exit(main())