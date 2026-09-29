# -*- coding: utf-8 -*-
"""v0.73.0 事件房背景的验收矩阵：**8 个横屏视口 × 8 个事件房 = 64 个数据点**。

验的是四件事（每条都对应一个真实会静默失败的失败模式）：
  1. 八张图**真的加载出来**（naturalWidth>0）。只看 src 字符串证明不了 ——
     字符串永远等于你写进去的那个，404 了照样"对"。
  2. `body.has-bg` 有（setBg 的 onerror 会摘掉它 ⇒ 这是 404 的第二条独立证据）。
  3. `body.evt-bg` 有、且 `#overlay` 计算样式**正好是 .55**，摘掉开关**回落到 .88**。
     可逆性是唯一能排除「碰巧命中别的规则」的做法（本项目 CSS 静默失败的老账）。
  4. 页级 `overflow() <= 0` —— 本批没动版面，但事件面板是八个里最高的那类，
     顺手在验收矩阵上兜一遍，防止「铺了背景把页面撑出滚动条」。
  5. `.panel` 底色不透明（刻意没动它，事件正文可读性靠它）。

⚠️ 走 `--direct` 式顶层文档（驱动直接拼进 原型.html 的副本），不套 iframe：
   `--dump-dom` 只序列化外层文档，iframe 里的 `#__out` 读不到（shot.py 文件头 v0.66.0 那条）。
⚠️ `--direct` 下视口 ≠ `--window-size`：new headless 恒定少 22px 宽、98px 高，这里反补。
⚠️ 每个视口只起一次 Chrome（驱动内部循环八个事件）⇒ 8 次进程而不是 64 次。

用法：`python _patch/probe_evtmtx.py`   退出码 = bad 条数（0 = 全绿）
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

DRV = '_patch/_drvevtmtx.js'
SHOT = os.path.join(ROOT, '_shot.html')

# 横屏验收矩阵，**永远不含 430x932**（已成既定前提）。
VIEWPORTS = [(1920, 1080), (1440, 900), (1366, 768), (1280, 720),
             (1024, 768), (960, 540), (844, 390), (640, 360)]

# 面板锚定在桌面档以上才铺满；矮屏档 .panel 仍是实心面板，黑幕放松照样生效
# （规则写在基档、不做桌面档限定 —— 见 原型.html 的那段注释）。
WANT_OVER = 'rgba(10, 8, 6, 0.55)'
WANT_OFF = 'rgba(10, 8, 6, 0.88)'
EVS = ['well', 'blackmarket', 'temple', 'ambush', 'forge', 'empty', 'potion', 'remove']


# 20s 曾经够用，但驱动第一版靠 rAF 轮询等图、冷启动时把预算烧光（只有本次进程的第一个
# 视口失败），改成事件驱动后一帧都不烧；这里仍给到 60s 留余量。
BUDGET = 60000


def launch(w, h, tmpdir):
    url = 'file:///' + SHOT.replace('\\', '/')
    return [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
            '--allow-file-access-from-files',
            '--window-size=%d,%d' % (w + 22, h + 98),
            '--dump-dom', '--virtual-time-budget=%d' % BUDGET,
            # ⚠️ **每次都开一个全新的 user-data-dir**，这是全套跑法的命门。
            # 不给的话八次启动共用默认配置目录，Chrome 还没释放 profile 锁就被下一次
            # 启动撞上 ⇒ 进程直接不出 stdout，`--dump-dom` 抓回来是空串。
            # 症状极具迷惑性：单跑任何一个视口都全绿，连着跑就成片「没读到 #__out」，
            # 而且失败个数每次都不一样（第一版还被我误判成 CPU 竞争、又误判成视口大小相关）。
            '--user-data-dir=' + tmpdir,
            '--no-first-run', '--no-default-browser-check',
            '--disable-extensions', '--disable-background-networking',
            url]


def run_one(w, h):
    tmpdir = tempfile.mkdtemp(prefix='evtmtx_')
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
        if not lines[0].startswith('vp=') or len(lines) < 6:
            # 驱动抛在了 emit() 中途 ⇒ 头几行不是我们约定的样子
            print('  ✗ 报告头不对（驱动中途抛出？）：\n%s' % body[:600])
            bad += 1
            continue
        head = dict(x.split('=', 1) for x in lines[0:2] if '=' in x)
        try:
            ov = int(head.get('overflow', '999'))
        except ValueError:
            ov = 999
        off = lines[2].split('=', 1)[1]
        on = lines[3].split('=', 1)[1]
        panel = lines[4].split('=', 1)[1]
        print('  实际视口 = %s   page overflow = %s px' % (head.get('vp', '?'), head.get('overflow', '?')))
        print('  #overlay 摘开关后 = %s   （期望 %s）' % (off, WANT_OFF))
        print('  #overlay 装开关后 = %s   （期望 %s）' % (on, WANT_OVER))
        print('  .panel  底色      = %s   （期望不透明 —— 刻意没动）' % panel)
        print('  %s' % lines[5])
        for ln in lines[6:]:
            print('  %s' % ln)
        # 断言
        total += 1
        if ov > 0:
            print('  ✗ 页级 overflow > 0，被撑出了竖向滚动')
            bad += 1
        total += 1
        if on != WANT_OVER:
            print('  ✗ 黑幕没被放松到 .55')
            bad += 1
        total += 1
        if off != WANT_OFF:
            print('  ✗ 摘掉 evt-bg 后没回落到 .88（说明命中的不是那条规则）')
            bad += 1
        total += 1
        if panel in ('rgba(0, 0, 0, 0)', 'transparent'):
            print('  ✗ .panel 底色成了透明 —— 事件正文可读性没了')
            bad += 1
        # 八行事件数据
        if len(lines) - 6 != 8:
            print('  ✗ 事件行数不是 8（拿到 %d 行）' % (len(lines) - 6))
            bad += 1
            total += 1
        for ln in lines[6:]:
            parts = [p.strip() for p in ln.split('|')]
            if len(parts) != 7:
                print('  ✗ 事件行格式不对：%s' % ln)
                bad += 1
                total += 1
                continue
            ev, srcinfo, nat, hasbg, evtbg, rgbrgb, why = parts
            total += 6
            if why != 'load':
                print('  ✗ %s 的图没在 load 事件上落定（%s）—— 404 或超时' % (ev, why))
                bad += 1
            if nat == '0x0':
                print('  ✗ %s 的图没加载出来（naturalWidth=0 = 404）' % ev)
                bad += 1
            if hasbg != 'Y':
                print('  ✗ %s 的 body.has-bg 没了（setBg 的 onerror 走过）' % ev)
                bad += 1
            if evtbg != 'Y':
                print('  ✗ %s 的 body.evt-bg 没挂上' % ev)
                bad += 1
            if not srcinfo.startswith('Y:'):
                print('  ✗ %s 的 #bg.src 不是那张图：%s' % (ev, srcinfo))
                bad += 1
            if rgbrgb != '10,8,6,0.55':
                print('  ✗ %s 的 #overlay 黑幕不是 .55（拿到 %s）' % (ev, rgbrgb))
                bad += 1

    print('=' * 74)
    print('八视口 × 八事件房：%d 项断言，bad=%d' % (total, bad))
    if bad == 0:
        print('全部通过 ✓')
    return bad


if __name__ == '__main__':
    sys.exit(main())