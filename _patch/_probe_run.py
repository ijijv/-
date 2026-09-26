# -*- coding: utf-8 -*-
"""一次性量尺（临时夹具）：把卷轴各级元素的实测宽度 dump 出来。
为什么不用肉眼看截图：木轴 792 与画心 760 只差 32px，靠盯图分不出来。"""
import io
import os
import subprocess

ROOT = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(ROOT)
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

src = io.open(os.path.join(ROOT, '原型.html'), encoding='utf-8').read()
for tag in ['<script src="_patch/_drv.js"></script>', '<script src="_probe.js"></script>']:
    if tag not in src:
        src = src.replace('</body>', tag + '\n</body>')
io.open(os.path.join(ROOT, '_probe.html'), 'w', encoding='utf-8').write(src)

url = 'file:///' + os.path.join(ROOT, '_probe.html').replace(os.sep, '/')
for w in (900, 430, 360):
    r = subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
                        '--window-size=%d,900' % w, '--virtual-time-budget=14000', '--dump-dom', url],
                       capture_output=True, text=True)
    hit = [l for l in r.stdout.splitlines() if 'PROBE' in l]
    print('win=%d -> %s' % (w, (hit[0].strip()[:500] if hit else 'NO PROBE LINE')))