# -*- coding: utf-8 -*-
"""headless 截图夹具 —— 给「冒烟测不到的 CSS / 几何 / canvas」补一只眼睛。

为什么需要它：`smoke_host.js` 的 DOM 桩是空操作（classList 无效、offsetHeight 恒 0、
getBoundingClientRect 恒 10×10），它只能证明「函数没抛异常」，证明不了「长得对不对」。
而地图/卡牌这类改动，**看错一眼比测错十条断言还贵**（v0.62.0 用户报的
「地图贴图在底层、还有半透明的战斗场景」就是冒烟全绿、肉眼一看就废的典型）。

用法：
    python _patch/shot.py                        # 默认 430 / 360 / 900 三档，出 _patch/_shot_map.png
    python _patch/shot.py --hero wuseng          # 换角色（_drv.js 的 pickHero）
    python _patch/shot.py --widths 430           # 只出一档
    python _patch/shot.py --dump                 # 不开图，只把角标文字打出来（等价 --dump-dom）

它做三件事：
  1. 把 `_drv.js` 拼进 `原型.html` 的副本 → `_shot.html`（放在**仓库根**，因为 js/ 与 素材/
     都是相对路径，放 _patch/ 里会全 404）；
  2. 生成 `_frame.html`：用 **iframe 包出真正的窄布局视口**。
     ⚠️ 这一步是踩出来的 —— Chrome for Windows 的 `--window-size` **有最小宽度**，
     传 430 实际得到 512 的布局（截出来是**裁切**不是窄布局）；`--force-device-scale-factor=2`
     也不改布局宽度（860 窗口仍得 838）。只有 iframe 能给出真的 430/360
     （判据：角标 `K vpW=430 bodyW=430 docW=430`）。
  3. 调 headless Chrome 截图。

⚠️ 两个已知夹具限制，**不是游戏 bug**，别照着改代码：
  - `--virtual-time-budget` 下「**后注册的 rAF 拿不到帧**」（解析期注册的有帧）。`showMap` 的
    `kick()` 是 setTimeout 之后才注册的 ⇒ 进场动画/连线在截图里停在初始态。`_drv.js` 尾部
    手工补了 `mapCamInit` + `setMapCam(tgt,false,0)` 把终态钉出来。
  - `--screenshot` **必须给绝对 Windows 路径**，相对路径会报「系统找不到指定的路径」。
"""
import io
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATCH = os.path.join(ROOT, '_patch')
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'


def arg(name, default=None):
    a = sys.argv
    return a[a.index(name) + 1] if name in a else default


def build_shot(hero, clean):
    src = io.open(os.path.join(ROOT, '原型.html'), encoding='utf-8').read()
    # 驱动脚本放在所有游戏脚本之后：它一开头就悬停 confirmNewGame/pickHero，需要那些函数已存在。
    tag = '<script src="_patch/_drv.js"></script>'
    if tag not in src:
        src = src.replace('</body>', tag + '\n</body>')
    io.open(os.path.join(ROOT, '_shot.html'), 'w', encoding='utf-8').write(src)


def build_frame(widths, hero, clean):
    q = '?hero=%s%s' % (hero, '&clean=1' if clean else '')
    # 不加 &clean 时角标会盖住顶部约 215px —— 只想看图时用 --clean。
    cells = ''.join(
        '<iframe src="_shot.html%s" width="%d" height="932"></iframe>' % (q, w) for w in widths)
    html = ('<!doctype html><meta charset="utf-8">'
            '<style>html,body{margin:0;background:#222;display:flex;gap:10px;padding:8px}'
            'iframe{border:1px solid #555;background:#000}</style>' + cells)
    io.open(os.path.join(ROOT, '_frame.html'), 'w', encoding='utf-8').write(html)


def main():
    widths = [int(w) for w in (arg('--widths', '430,360,900')).split(',')]
    hero = arg('--hero', 'tianshi')
    clean = '--clean' in sys.argv
    out = os.path.join(ROOT, arg('--out', r'_patch\_shot_map.png'))
    build_shot(hero, clean)
    build_frame(widths, hero, clean)
    win_w = sum(widths) + 10 * (len(widths) - 1) + 16
    cmd = [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
           '--allow-file-access-from-files',          # 否则 file:// 父页不许嵌 file:// iframe
           '--window-size=%d,960' % win_w]
    if '--dump' in sys.argv:
        cmd += ['--dump-dom']
    else:
        cmd += ['--virtual-time-budget=12000', '--screenshot=' + out]
    cmd.append('file:///' + os.path.join(ROOT, '_frame.html').replace('\\', '/'))
    r = subprocess.run(cmd, capture_output=True, text=True)
    if '--dump' in sys.argv:
        # 角标是 textContent，--dump-dom 里能看到全部 A~Q 行
        for line in r.stdout.splitlines():
            if '__dbg' in line or line.strip().startswith(('A ', 'B ', 'C ', 'D ', 'E', 'F ', 'G ',
                                                          'H ', 'I ', 'J ', 'L', 'M', 'N ', 'P ', 'Q ')):
                print(line.strip()[:400])
    else:
        print('OK -> %s' % out)
        print('   %s' % (r.stdout or r.stderr).strip().splitlines()[-1:])


if __name__ == '__main__':
    main()