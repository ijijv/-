# -*- coding: utf-8 -*-
"""敌人台词气泡（v0.76.0 的 #enemy-say）八视口夹具。

为什么非有它不可：**这一项的三条断法，冒烟与子串闸一条都证不了。**
  - 冒烟跑在 vm 沙箱里，`animLive()` 恒假 ⇒ `pumpSay` 一句都不执行、节点一个都不建
    （这正是它「照常打印并退出」的代价）。所以冒烟只证了数据面与一次性语义；
  - `verify_dist.py` 只能证明规则**文本**在产物里 —— 而 CSS 是静默失败的：
    规则在文件里、grep 得到、子串闸绿，浏览器却可能整条丢弃（本仓 `.exhaust-tag` 就这么被吞过）；
  - 真正会「台词写了、气泡永远不出现」的三条路（`makeEnemy` 漏透传 / 锚点按下标找 /
    挂错父节点被 `isolation:isolate` 夹到底层）**全都是 DOM 层面的事**。
⇒ 唯一能证明这套气泡真的成立的，是让真浏览器跑一遍真实路径再读 DOM 与计算样式。

五例（每例对应一个真会发生的错法）：
    elite_in     精英在场 ⇒ 恰好一条、挂 body、fixed/34/pointer-events:none、锚在第一只头顶
    dismiss      点一下 ⇒ 立刻收掉（不能挡拖拽落点）
    normal_none  普通敌人 ⇒ 一条都不建
    lowspec_none 低配 ⇒ 一条都不建
    reduced_none 系统「减弱动态效果」⇒ 一条都不建

用法：
    python _patch/probe_say.py                  # 八视口
    python _patch/probe_say.py --only=844x390   # 只跑一档

⚠️ 视口 ≠ `--window-size`：new headless 恒定少 22px 宽、98px 高，照 `probe_forge.py` 反补。
   每个视口**都开一个全新的 user-data-dir**（复用会被上一次的缓存/单例搅出假读数）。
"""
import html
import io
import os
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATCH = os.path.join(ROOT, '_patch')
sys.path.insert(0, PATCH)
from shot import CHROME  # noqa: E402  —— chrome.exe 的路径只维护在 shot.py 一处

DRV = '_patch/_drvsay.js'
SHOT = os.path.join(ROOT, '_shot.html')

# 横屏验收矩阵，**永远不含 430x932**（已成既定前提）。
VIEWPORTS = [(1920, 1080), (1440, 900), (1366, 768), (1280, 720),
             (1024, 768), (960, 540), (844, 390), (640, 360)]

# 规格：行 id → 期望条数（`show` 的那一例另有文字与几何判据）
ROWS = [
    ('elite_in', 'show'),
    ('dismiss', 'none'),
    ('normal_none', 'none'),
    ('lowspec_none', 'none'),
    ('reduced_none', 'none'),
]

# ⚠️ 期望值**写死在这里**，不回头去读 `ENEMIES.baiwuchang.sayIn` —— 那是让被测代码自己出题：
#    改坏了目录也照样全绿。改台词时**两处都要改**（这条与本文件头的告警是同一件事）。
WANT_TEXT = '一见生财——名字，我记下了。'
WANT_Z = '34'
# 纵向区间：`top:r.top` + `translate(-50%,-100%)` 的契约是「下边缘正好落在立绘顶边」。
# 但 `#enemy-say` 从 `translateY(6px)` 过渡到 0，而无头下 CSS 过渡**冻在起始帧**
# ⇒ 无头读到 6、真浏览器读 0，两个都得算过。横向没有过渡 ⇒ 仍是 ±2 的硬判据。
DY_LO, DY_HI = -2, 8
DX_TOL = 2

BUDGET = 30000


def launch(w, h, tmpdir):
    url = 'file:///' + SHOT.replace('\\', '/')
    return [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
            '--allow-file-access-from-files',
            '--window-size=%d,%d' % (w + 22, h + 98),
            '--dump-dom', '--virtual-time-budget=%d' % BUDGET,
            '--user-data-dir=' + tmpdir,
            '--no-first-run', '--no-default-browser-check',
            '--disable-extensions', '--disable-background-networking',
            url]


def run_one(w, h):
    tmpdir = tempfile.mkdtemp(prefix='say_')
    try:
        r = subprocess.run(launch(w, h, tmpdir), capture_output=True, text=True,
                           encoding='utf-8', errors='replace')
        m = re.search(r'<pre id="__out"[^>]*>(.*?)</pre>', r.stdout or '', re.S)
        return (html.unescape(m.group(1)) if m else ''), r
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def raw_dump(r):
    out = (r.stdout or '')
    print('    stdout %d 字节 / stderr %d 字节；有 __out=%s'
          % (len(out), len(r.stderr or ''), '__out' in out))
    print('    stderr 头：%s' % (r.stderr or '(空)')[:400].replace('\n', ' | '))


def main():
    global BUDGET
    vps = VIEWPORTS
    for a in sys.argv[1:]:
        if a.startswith('--budget='):
            BUDGET = int(a.split('=', 1)[1])
        elif a.startswith('--only='):
            want = set(a.split('=', 1)[1].split(','))
            vps = [v for v in VIEWPORTS if '%dx%d' % v in want]
    # 驱动脚本拼进 原型.html 的副本 —— 与 probe_dragblock.py 同一手法（_shot.html 在仓库根，
    # 因为 js/ 与 素材/ 都是相对路径，放 _patch/ 里会全 404）。
    src = io.open(os.path.join(ROOT, '原型.html'), encoding='utf-8').read()
    tag = '<script src="%s"></script>' % DRV
    if tag not in src:
        src = src.replace('</body>', tag + '\n</body>')
    io.open(SHOT, 'w', encoding='utf-8').write(src)

    bad = 0
    total = 0
    for (w, h) in vps:
        print('=' * 74)
        print('%dx%d' % (w, h))
        body, r = run_one(w, h)
        if not body:
            print('  ✗ 没读到 #__out —— 页面没跑起来，或驱动抛在了 emit() 之前')
            raw_dump(r)
            bad += 1
            continue
        lines = body.split('\n')
        if not lines[0].startswith('vp='):
            print('  ✗ 报告头不对（驱动中途抛出？）：\n%s' % body[:600])
            bad += 1
            continue
        head = dict(x.split('=', 1) for x in lines[0:2] if '=' in x)
        if head.get('vp') != '%dx%d' % (w, h):
            print('  ✗ 实际视口 = %s（期望 %dx%d）—— 反补算错了' % (head.get('vp'), w, h))
            bad += 1
            total += 1
        rows = lines[3:]
        if len(rows) != len(ROWS):
            print('  ✗ 数据行数不是 %d（拿到 %d 行）：\n%s' % (len(ROWS), len(rows), body[:600]))
            bad += 1
            total += 1
            continue

        for ln, (rid, want) in zip(rows, ROWS):
            parts = [p.strip() for p in ln.split('|')]
            total += 1
            if len(parts) != 12:
                print('  ✗ 行格式不对（该 12 段）：%s' % ln)
                bad += 1
                continue
            (gid, gw, n, parent, pos, z, pe, dx, dy, dx2, dy2, text) = parts
            if gid != rid or gw != want:
                print('  ✗ 行 id/期望与规格不符：%s（规格 %s | %s）' % (ln, rid, want))
                bad += 1
                continue
            if want == 'none':
                if n != '0':
                    print('  ✗ %s 该一条都不建，实际 %s 条（文字「%s」，挂 %s）'
                          % (rid, n, text, parent))
                    bad += 1
                else:
                    print('  ✓ %s 一条都没建' % rid)
                continue

            # ---- elite_in：结构 / 几何 / 文字 ----
            total += 9
            if n != '1':
                print('  ✗ %s 同屏应有且只有 **1** 条（多只精英要排队），实际 %s 条' % (rid, n))
                bad += 1
            if parent != 'body':
                print('  ✗ %s 的父节点是 %s（必须是 body —— 挂进 #enemy-panel 会被 '
                      'isolation:isolate 夹到 0 层，气泡根本看不见）' % (rid, parent))
                bad += 1
            if pos != 'fixed':
                print('  ✗ %s 的 position = %s（期望 fixed —— 规则可能整条被解析器丢弃）' % (rid, pos))
                bad += 1
            if z != WANT_Z:
                print('  ✗ %s 的 z-index = %s（期望 %s，与 #drag-dmg 同一层）' % (rid, z, WANT_Z))
                bad += 1
            if pe != 'none':
                print('  ✗ %s 的 pointer-events = %s（必须 none —— 气泡压在敌人头顶，'
                      '而敌人就是拖拽落点）' % (rid, pe))
                bad += 1
            if text != WANT_TEXT:
                print('  ✗ %s 的文字 = 「%s」（期望「%s」）' % (rid, text, WANT_TEXT))
                bad += 1
            try:
                gdx, gdy = int(dx), int(dy)
            except ValueError:
                print('  ✗ %s 的几何读不出来：dx=%s dy=%s' % (rid, dx, dy))
                bad += 2
            else:
                if abs(gdx) > DX_TOL:
                    print('  ✗ %s 的水平中心差 %d px（期望 |Δ|≤%d）—— 锚点不在立绘正中'
                          % (rid, gdx, DX_TOL))
                    bad += 1
                if not (DY_LO <= gdy <= DY_HI):
                    print('  ✗ %s 的下边缘离立绘顶边 %d px（期望 %d~%d）—— 没落在头顶'
                          % (rid, gdy, DY_LO, DY_HI))
                    bad += 1
                # 对照：锚错了敌人（比如按 DOM 下标取到了第二只）时，这一对数字会反过来
                if dx2 != 'NA' and dy2 != 'NA':
                    try:
                        far = abs(int(dx2)) > abs(gdx) or abs(int(dy2) - gdy) > 2
                    except ValueError:
                        far = False
                    if not far:
                        print('  · %s 提示：第二只敌人的相对量（%s,%s）与第一只（%s,%s）'
                              '几乎一样，本档两敌靠得太近，「锚错敌人」这个错法在这里抓不到'
                              % (rid, dx2, dy2, dx, dy))
                print('  ✓ %s 一条 · 挂 %s · %s · z=%s · pe=%s · 锚第一只头顶 (Δx=%s, Δy=%s) · 「%s」'
                      % (rid, parent, pos, z, pe, dx, dy, text))

    print('=' * 74)
    print('台词气泡 %d 视口 × %d 例：%d 项断言，bad=%d' % (len(vps), len(ROWS), total, bad))
    if bad == 0:
        print('全部通过 ✓')
    return bad


if __name__ == '__main__':
    sys.exit(main())