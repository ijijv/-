# -*- coding: utf-8 -*-
"""上线前版面体检的跑批器：把 _sweep.js 拼进 原型.html 的副本，逐界面 × 逐视口取回 #__dbg 的文本。
用法：
    python _patch/_sweep.py                 # 全部界面 × 三档视口
    python _patch/_sweep.py --only menu,battle --vp 1280
    python _patch/_sweep.py --ui menu --vp 430
    python _patch/_sweep.py --shots          # 顺带出关键界面截图（直连档）
说明：
  1280x720 / 844x390 走 **--direct**（顶层文档，--dump-dom 才读得到 #__dbg）——
     --direct 下视口 = 窗口 −22 宽 −98 高，这里反补（与 shot.py 同规则）。
  430x932 走 **iframe 包裹**（Chrome for Windows 的窗口最小宽 ~512，直连会得到裁切不是窄布局）；
     --dump-dom 只序列化外层文档 ⇒ 外层页放一段「把 iframe 的 #__dbg 抄进外层 #__out」的脚本。
"""
import io
import os
import re
import html
import subprocess
import sys
import tempfile
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATCH = os.path.join(ROOT, '_patch')
sys.path.insert(0, PATCH)
from shot import CHROME  # noqa

SHOT = os.path.join(ROOT, '_shot.html')
FRAME = os.path.join(ROOT, '_sweepframe.html')
DRV = '_patch/_sweep.js'
BUDGET = 9000

UIS = ['menu', 'heroselect', 'opening', 'map', 'battle', 'battlemany', 'piledraw', 'pilediscard',
       'shop', 'campfire', 'restconfirm', 'event', 'forge', 'bestiary', 'leaderboard', 'deck',
       'reward', 'relicreward', 'bossreward', 'result', 'victory', 'defeat', 'settings', 'log', 'logopen']
VPS = {'1280': (1280, 720, 'direct'), '844': (844, 390, 'direct'), '430': (430, 932, 'frame')}


def build_shot():
    src = io.open(os.path.join(ROOT, '原型.html'), encoding='utf-8').read()
    tag = '<script src="%s"></script>' % DRV
    if tag not in src:
        src = src.replace('</body>', tag + '\n</body>')
    io.open(SHOT, 'w', encoding='utf-8').write(src)


def build_frame(w, h, ui, clean=False):
    src = '_shot.html?ui=%s%s' % (ui, '&clean=1' if clean else '')
    doc = ('<!doctype html><meta charset="utf-8">'
           '<style>html,body{margin:0;background:#222}iframe{border:0;display:block}'
           '#__out{white-space:pre;font:10px monospace;color:#0f0}</style>'
           '<iframe id="f" src="%s" width="%d" height="%d"></iframe>'
           '<div id="__out"></div>'
           '<script>var f=document.getElementById("f");'
           'function poll(n){try{var d=f.contentDocument;var b=d&&d.getElementById("__dbg");'
           'if(b&&b.textContent){document.getElementById("__out").textContent="__COPY__\\n"+b.textContent;return;}}'
           'catch(e){document.getElementById("__out").textContent="__COPYERR__ "+e.message;return;}'
           'if(n>80){document.getElementById("__out").textContent="__TIMEOUT__ ("+(f.contentDocument?f.contentDocument.title:"no-doc")+")";return;}'
           'setTimeout(function(){poll(n+1);},200);}'
           'f.addEventListener("load",function(){setTimeout(function(){poll(0);},900);});'
           '</script>') % (src, w, h)
    io.open(FRAME, 'w', encoding='utf-8').write(doc)


COARSE = ['--blink-settings=primaryPointerType=2,availablePointerTypes=2']


def run_direct(w, h, ui, tmp, coarse=False):
    url = 'file:///' + SHOT.replace('\\', '/') + '?ui=' + ui
    cmd = [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
           '--allow-file-access-from-files',
           '--window-size=%d,%d' % (w + 22, h + 98),
           '--dump-dom', '--virtual-time-budget=%d' % BUDGET,
           '--user-data-dir=' + tmp, '--no-first-run', '--no-default-browser-check',
           '--disable-extensions', '--disable-background-networking', url]
    if coarse:
        cmd[1:1] = COARSE
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    m = re.search(r'<div id="__dbg"[^>]*>(.*?)</div>', r.stdout or '', re.S)
    if m:
        return html.unescape(m.group(1))
    return ''


def run_frame(w, h, ui, tmp, coarse=False):
    build_frame(w, h, ui)
    url = 'file:///' + FRAME.replace('\\', '/')
    cmd = [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
           '--allow-file-access-from-files',
           '--window-size=%d,%d' % (w + 40, h + 60),
           '--dump-dom', '--virtual-time-budget=%d' % BUDGET,
           '--user-data-dir=' + tmp, '--no-first-run', '--no-default-browser-check',
           '--disable-extensions', '--disable-background-networking', url]
    if coarse:
        cmd[1:1] = COARSE
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    m = re.search(r'<div id="__out"[^>]*>(.*?)</div>', r.stdout or '', re.S)
    if not m:
        return ''
    body = html.unescape(m.group(1))
    if body.startswith('__COPY__'):
        return body[len('__COPY__'):]
    return body


def main():
    uis = UIS
    vps = list(VPS.values())
    shots = '--shots' in sys.argv
    args = sys.argv[1:]
    if '--only' in args:
        want = set(args[args.index('--only') + 1].split(','))
        uis = [u for u in UIS if u in want]
    if '--vp' in args:
        want = set(args[args.index('--vp') + 1].split(','))
        vps = [v for k, v in VPS.items() if k in want]
    coarse = '--coarse' in sys.argv
    build_shot()
    if '--shotsonly' in sys.argv:
        shoot(uis, vps)
        return
    results = {}
    for (w, h, mode) in vps:
        for ui in uis:
            tmp = tempfile.mkdtemp(prefix='sweep_')
            try:
                if mode == 'direct':
                    body = run_direct(w, h, ui, tmp, coarse)
                else:
                    body = run_frame(w, h, ui, tmp, coarse)
            finally:
                shutil.rmtree(tmp, ignore_errors=True)
            tag = '%s@%dx%d%s' % (ui, w, h, ' [coarse]' if coarse else '')
            results[tag] = body or '(没读到 #__dbg)'
            print('=' * 70)
            print(tag + ('  [frame]' if mode == 'frame' else ''))
            print(body or '(没读到 #__dbg —— 驱动没跑起来)')
    rname = '_sweep_report_coarse.txt' if coarse else '_sweep_report.txt'
    io.open(os.path.join(PATCH, rname), 'w', encoding='utf-8').write(
        '\n'.join('%s\n%s' % (k, v) for k, v in results.items()))
    print('\n总 %d 组，已写入 _patch/%s' % (len(results), rname))
    if shots:
        shoot(uis, vps)


def shoot(uis, vps):
    """关键界面出图：走 iframe 模式（shot.py 头说过，--direct 出图对 fixed/曾提层元素会漏栅格）。"""
    for ui in uis:
        for (w, h, mode) in vps:
            out = os.path.join(PATCH, '_sweep_%s_%d.png' % (ui, w))
            build_frame(w, h, ui, clean=True)
            cmd = [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
                   '--allow-file-access-from-files',
                   '--window-size=%d,%d' % (w + 40, h + 60),
                   '--virtual-time-budget=9000', '--screenshot=' + out,
                   'file:///' + FRAME.replace('\\', '/')]
            subprocess.run(cmd, capture_output=True, text=True)
            try:
                from PIL import Image
                im = Image.open(out)
                if im.size != (w, h):
                    im.crop((0, 0, w, h)).save(out)   # 裁掉外层 iframe 页的黑边
            except Exception as ex:
                print('   (裁边失败，保留原图：%s)' % ex)
            print('shot -> %s' % out)


if __name__ == '__main__':
    main()