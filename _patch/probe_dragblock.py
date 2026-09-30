# -*- coding: utf-8 -*-
"""v0.75.0 拖拽格挡预演（#drag-block）的验收矩阵：**8 个横屏视口 × 10 行 = 80 个数据点**。

背景：用户要「打出防御牌获得的格挡，在卡牌往上拖拽的时候提前显示出来」，口径澄清为
「显示在**玩家头部**，用**蓝色的浮字**」。做法是新增 `#drag-block`（与预伤 `#drag-dmg` 并列的第二枚浮字）
+ `previewBlock()`（数值口径，纯函数，已由冒烟对着各列的 `eff()` 逐项证过）。

这里验的**不是数值**（数值在冒烟里证明），而是数值之外那四件 grep 与子串闸都证不了的事：
  1. 往上拖够 40px 时元素**真的出现**（没接上 / 懒创建失败都长这样）。
  2. 它的**计算样式**真是 `position:fixed` + 蓝色的 `rgb(3, 152, 250)`
     —— CSS 静默失败是本项目的命门，规则被解析器丢弃时子串闸照样全绿。
  3. 它的**下边缘贴齐** `#player-panel .hero-art-box` 的上边缘（geo 列 ≈ 0）。
     锚点若写成敌人或 hpbar，这一列就是几百像素的偏差 —— 「玩家头部」这句话只有几何能证。
     用**相对量**而不是绝对 top：视口不同、`--player-inset-x` 不同都不影响这条判据。
  4. **阈值与松手同刻**：往上 20px（不足 40）必须藏；松手后必须藏；拖反方向、攻击牌、反震
     （`previewBlock` 恒 0）也一律藏。这一条防的是「看到预演、松手却没打出去」。

⚠️ 驱动把两组数字渲染路径（`<img class="fx-num" alt>` 字形 / 文字回落）归一成同一个字符串，
   所以素材加载时序不会让夹具时红时绿。
⚠️ `--direct` 式顶层文档（驱动拼进 原型.html 的副本），不套 iframe：`--dump-dom` 只序列化外层文档。
⚠️ `--direct` 下视口 ≠ `--window-size`：new headless 恒定少 22px 宽、98px 高，这里反补。
⚠️ 每个视口只起一次 Chrome（驱动内部循环五例）⇒ 8 次进程而不是 40 次。
⚠️ 每次必须换一个全新的 `--user-data-dir`（见 _patch/probe_evtmtx.py 那段长注释）。

用法：`python _patch/probe_dragblock.py`   退出码 = bad 条数（0 = 全绿）
可选：`--budget=N`、`--only=1920x1080,1280x720`
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

DRV = '_patch/_drvdragblock.js'
SHOT = os.path.join(ROOT, '_shot.html')

# 横屏验收矩阵，**永远不含 430x932**（已成既定前提）。
VIEWPORTS = [(1920, 1080), (1440, 900), (1366, 768), (1280, 720),
             (1024, 768), (960, 540), (844, 390), (640, 360)]

# 规格：行 id → (显隐期望, 文字期望)
#   显隐期望来自驱动里 CASES 的 want 字段，在这里独立写一遍 —— 两份规格不一致就该报红。
#   文字期望只有该显的那一例有值：赶尸人金刚符未升级 = 4 格挡（**算出来的**：
#   js/20_data.js 那一列 gainBlock 的实参就是 4，不照抄镜像表）。
ROWS = {
    'jingang_up60':     ('show', '+4格挡'),
    'jingang_up60#rel': ('hide', None),
    'jingang_up20':     ('hide', None),
    'jingang_up20#rel': ('hide', None),
    'jingang_down60':   ('hide', None),
    'jingang_down60#rel': ('hide', None),
    'leifu_up60':       ('hide', None),
    'leifu_up60#rel':   ('hide', None),
    'fanzhen_up60':     ('hide', None),
    'fanzhen_up60#rel': ('hide', None),
}
ORDER = ['jingang_up60', 'jingang_up60#rel', 'jingang_up20', 'jingang_up20#rel',
         'jingang_down60', 'jingang_down60#rel', 'leifu_up60', 'leifu_up60#rel',
         'fanzhen_up60', 'fanzhen_up60#rel']

WANT_BLUE = 'rgb(3, 152, 250)'    # = #0398fa，与 num 素材 block 档同色

# 五例 × 两次探测，纯同步派发，不烧计时器；60s 照 _drvscenebg.py 的余量给。
BUDGET = 60000


def launch(w, h, tmpdir):
    url = 'file:///' + SHOT.replace('\\', '/')
    return [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
            '--allow-file-access-from-files',
            '--window-size=%d,%d' % (w + 22, h + 98),
            '--dump-dom', '--virtual-time-budget=%d' % BUDGET,
            # ⚠️ **每次都开一个全新的 user-data-dir**，不要删（见文件头）。
            '--user-data-dir=' + tmpdir,
            '--no-first-run', '--no-default-browser-check',
            '--disable-extensions', '--disable-background-networking',
            url]


def run_one(w, h):
    tmpdir = tempfile.mkdtemp(prefix='dragblock_')
    try:
        r = subprocess.run(launch(w, h, tmpdir), capture_output=True, text=True,
                           encoding='utf-8', errors='replace')
        m = re.search(r'<pre id="__out"[^>]*>(.*?)</pre>', r.stdout or '', re.S)
        return html.unescape(m.group(1)) if m else '', r
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def raw_dump(r):
    """拿不到报告时把原始输出头一段打出来。最可能的两种原因：Chrome 起不来
    （stdout 全空、stderr 里有 profile/崩溃字样），或页面抛在了 emit() 之前。"""
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
        if not lines[0].startswith('vp=') or len(lines) < 5:
            print('  ✗ 报告头不对（驱动中途抛出？）：\n%s' % body[:600])
            bad += 1
            continue
        head = dict(x.split('=', 1) for x in lines[0:3] if '=' in x)
        print('  实际视口 = %s   hero = %s' % (head.get('vp', '?'), head.get('hero', '?')))
        print('  hero-art-box (l,t,w×h) = %s' % head.get('art_box', '?'))
        # ---- 断言：环境 ----
        total += 1
        if head.get('hero') != 'ganshiren':
            print('  ✗ hero 不是赶尸人 —— 期望值（金刚符 4 格挡）是按那一列算的')
            bad += 1
        # ---- 断言：逐行 ----
        rows = lines[4:]
        if len(rows) != len(ORDER):
            print('  ✗ 数据行数不是 %d（拿到 %d 行）' % (len(ORDER), len(rows)))
            bad += 1
            total += 1
        seen = []
        for ln in rows:
            parts = [p.strip() for p in ln.split('|')]
            if len(parts) != 8:
                print('  ✗ 行格式不对（该 8 段）：%s' % ln)
                bad += 1
                total += 1
                continue
            rid, want, present, off, color, position, geo, shown = parts
            seen.append(rid)
            exp = ROWS.get(rid)
            if not exp:
                print('  ✗ 出现了规格里没有的行 id：%s' % rid)
                bad += 1
                total += 1
                continue
            want_show, want_text = exp
            total += 2
            if want != want_show:
                print('  ✗ %s 的驱动期望 = %s（规格是 %s）—— 两份规格不一致' % (rid, want, want_show))
                bad += 1
            if want_show == 'show':
                if present != 'Y':
                    print('  ✗ %s 该显示，元素却没建出来' % rid)
                    bad += 1
                elif off != 'N':
                    print('  ✗ %s 该显示，却带着 .off' % rid)
                    bad += 1
                total += 3
                if color != WANT_BLUE:
                    print('  ✗ %s 的颜色 = %s（期望蓝色的 %s）' % (rid, color, WANT_BLUE))
                    bad += 1
                if position != 'fixed':
                    print('  ✗ %s 的 position = %s（期望 fixed —— 规则可能没被解析）' % (rid, position))
                    bad += 1
                if want_text is not None and shown != want_text:
                    print('  ✗ %s 显示的文字 = %s（期望 %s）' % (rid, shown, want_text))
                    bad += 1
                else:
                    print('  %s ✓ 显示 · %s · %s · 贴齐头顶 %s px · %s'
                          % (rid, color, position, geo, shown))
                # 几何：下边缘贴齐 hero-art-box 上边缘。±2px 容差（取整 + 字体基线）。
                total += 1
                try:
                    g = int(geo)
                except ValueError:
                    print('  ✗ %s 的几何值读不出来：%s' % (rid, geo))
                    bad += 1
                else:
                    if abs(g) > 2:
                        print('  ✗ %s 的浮字下边缘离玩家头顶 %s px（期望 |Δ|≤2）—— 锚点不对' % (rid, g))
                        bad += 1
            else:
                total += 1
                # 「藏起来了」= 元素不存在 **或** 带 .off（懒创建，从没显示过时是 null）
                if present == 'Y' and off != 'Y':
                    print('  ✗ %s 该藏起来，实际 present=%s off=%s（颜色 %s / 文字 %s）'
                          % (rid, present, off, color, shown))
                    bad += 1
                else:
                    print('  %s ✓ 藏起来（present=%s off=%s）' % (rid, present, off))
        if seen != ORDER:
            print('  ✗ 行顺序与规格不符：%s' % ','.join(seen))
            bad += 1
            total += 1

    print('=' * 74)
    print('八视口 × 十行：%d 项断言，bad=%d' % (total, bad))
    if bad == 0:
        print('全部通过 ✓')
    return bad


if __name__ == '__main__':
    sys.exit(main())