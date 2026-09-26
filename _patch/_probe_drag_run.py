# -*- coding: utf-8 -*-
"""跑 _probe_drag.js（地图滚轮/左键拖拽的真浏览器验证），把 PROBEDRAG 那行抓出来。

为什么不用冒烟：滚轮与指针是**事件**，冒烟 VM 里没有真 DOM、没有事件派发，
纯函数对拍只能证明算术，证明不了「事件接到了 / passive:false 生效了 / 真布局里 maxY>0」。
见仓库根 _probe_drag.js 的注释。

用法: python _patch/_probe_drag_run.py [宽 ...]     默认 900 430
"""
import io
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    dist = '--dist' in sys.argv
    if dist:
        # 直接跑**产物**（dist/志怪塔.html，JS 已被 javascript-obfuscator 混淆）——
        # 这是最强的一道：能抓到「混淆把 artImg 的 draggable="false" 弄丢了」这类只有产物才会有的问题，
        # 以及「--camY 那条变换在产物里还通不通」。源码版跑绿了不代表产物绿。
        src = io.open(os.path.join(ROOT, 'dist', '志怪塔.html'), encoding='utf-8').read()
        out_name = '_probedrag_dist.html'
    else:
        src = io.open(os.path.join(ROOT, '原型.html'), encoding='utf-8').read()
        out_name = '_probedrag.html'
    for tag in ['<script src="_patch/_drv.js"></script>', '<script src="_probe_drag.js"></script>']:
        if tag not in src:
            src = src.replace('</body>', tag + '\n</body>')
    io.open(os.path.join(ROOT, out_name), 'w', encoding='utf-8').write(src)
    url = 'file:///' + os.path.join(ROOT, out_name).replace(os.sep, '/')

    widths = [int(a) for a in args] or [900, 430]
    for w in widths:
        r = subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
                            '--window-size=%d,900' % w, '--virtual-time-budget=15000', '--dump-dom', url],
                           capture_output=True, text=True)
        hit = [l for l in r.stdout.splitlines() if 'PROBEDRAG' in l]
        print('=== win=%d ===' % w)
        if not hit:
            print('  NO PROBEDRAG LINE（脚本没跑完 / 报错）')
            for l in r.stdout.splitlines():
                if 'DBG' in l and 'line' in l:
                    print('  ' + l.strip()[:200])
            continue
        body = hit[0].strip().split('PROBEDRAG', 1)[1]
        for part in body.split(' | '):
            print('  ' + part.strip())
    return 0


if __name__ == '__main__':
    sys.exit(main())