# -*- coding: utf-8 -*-
"""v0.64.0 特效对照图 + 尺寸实测 —— 给「冒烟测不到的那部分」补一只眼睛。

冒烟用的是 DOM 桩（`getBoundingClientRect` 恒 10×10、`offsetHeight` 恒 0、没有布局也没有位图），
它能证明 `playFx` 不抛异常、`FX_SHEETS` 表结构对、纯函数夹取对；**证明不了两件事**：
  1. 帧切得对不对（8 列纵向图，`background-position` 步进错一格就是斜切花屏）；
  2. **特效在游戏里到底多大** —— 用户本轮特别点名的那条。

所以这个脚本做两件事：
  A. `--measure`：用 PIL **离线量每张精灵图的 alpha 内容占比**（浏览器量不了：canvas 读 file:// 图会 taint）。
     含量 = 「所有帧的并集 bbox」占 960 单元的比例。它是定 `scale` 的唯一依据 ——
     提示词文档要求「特效居中、周围留空」，留空多 ⇒ 照锚点框贴必然偏小，要靠 scale 补。
  B. 截图三张（走 headless Chrome，复用 `_drvfx.js`）：
       `_shot_fx_sheet.png`        30 格对照图，格子边长由 `fxBoxSize` 真算（合成锚点 260×260 ⇒ 299）
       `_shot_fx_battle_900.png`   真开一场战斗，按真实锚点钉住 雷符@敌 / 万剑归宗@场 / 受击@玩家 +
                                   青色虚线锚点框 —— 一眼看出「特效 vs 单位」的比值
       `_shot_fx_battle_430.png`   同上，窄屏（iframe 才是真 430，Chrome 的 --window-size 有最小宽度）

用法:
    python _patch/shot_fx.py --measure          # 只出含量表（不启浏览器，几秒）
    python _patch/shot_fx.py                    # 量 + 出三张图
    python _patch/shot_fx.py --dump             # 只打角标文字（锚点实测尺寸/盒子尺寸）
"""
import io
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATCH = os.path.join(ROOT, '_patch')
ASSD = os.path.join(ROOT, '素材', 'fx')
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
CELL = 240          # v1.1.20r：素材合成格 480→240 后同步减半（截图夹具按它算格位）
COLS = 8


def arg(name, default=None):
    a = sys.argv
    return a[a.index(name) + 1] if name in a else default


def coverage():
    """每张精灵图：**逐格**统计 alpha>8 的像素个数，扫满整张图的所有格子，返回 {key: [个数…]}。

    为什么要逐格像素数（而不是布尔「有/无」）：素材两端的帧是**递弱**的 ——
    最后一两格往往只剩几十个孤立像素（0.0x%，画面上什么都看不见），
    但那几十个像素足以让「有内容」判定成立。所以要分两档阈值：
      · >0 像素        → 这一格**被分配过**（= 素材原本的帧数，与 mk_fx_sheets.py 的 count_frames 同口径）
      · ≥ LIVE_PX 像素 → 这一格**看得见**（= 值得播的帧；两端看不见的格子裁掉）
    """
    import numpy as np
    from PIL import Image
    out = {}
    for k, (_f, _rows, _sc) in fx_keys().items():
        p = os.path.join(ASSD, k + '.png')
        if not os.path.exists(p):
            out[k] = []; continue
        a = np.array(Image.open(p).convert('RGBA').split()[3])
        cov = []
        for i in range((a.shape[0] // CELL) * COLS):        # 扫满：行数以**图**为准，不看表
            r, c = divmod(i, COLS)
            cell = a[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL]
            cov.append(int((cell > 8).sum()))
        while cov and cov[-1] == 0:
            cov.pop()                                        # 尾部的空格子不是帧，去掉
        out[k] = cov
    return out


# 「看得见」的像素下限：0.5% 的格子（480×480=230400 ⇒ 1152 像素）。与 fx_tune.py 共用同一口径。
LIVE_PX = 1152


def live_range(cov):
    """裁掉两端看不见的帧，返回 (i0, f)；全看不见则 (0, len)。"""
    live = [i for i, v in enumerate(cov) if v >= LIVE_PX]
    if not live:
        return 0, len(cov)
    return live[0], live[-1] - live[0] + 1


def peak_frame(cov, i0, f):
    """i0 起的这段里像素最多的那一帧 —— 对照图钉这一帧。原来钉 70%，但过半特效的动作是
    **前重后轻**的，70% 处往往已在消散（实测雷符第 13 帧只剩 184 个像素），钉子钉在尾巴上等于拍不到东西。"""
    seg = cov[i0:i0 + f]
    return i0 + (max(range(len(seg)), key=lambda i: seg[i]) if seg else 0)


def fx_keys():
    """FX_SHEETS 的键 → 帧数/行数，从游戏作用域取（python 侧不镜像这张表）。"""
    host = os.path.join(PATCH, 'smoke_host.js')
    js = ("Object.keys(FX_SHEETS).reduce(function(o,k){ o[k]=[FX_SHEETS[k].f,FX_SHEETS[k].rows,"
          "FX_SHEETS[k].scale]; return o; },{})")
    r = subprocess.run(['node', host], capture_output=True, text=True, cwd=ROOT,
                       env=dict(os.environ, SMOKE_DUMP=js))
    line = [l for l in r.stdout.splitlines() if l.startswith('__DUMP__')]
    if not line:
        print('取 FX_SHEETS 失败'); print(r.stdout[-1500:]); print(r.stderr[-1500:]); sys.exit(2)
    import json
    return json.loads(line[0][len('__DUMP__'):])


def measure():
    """每张精灵图：**实播那些帧**的并集 alpha bbox，返回 {key: (x0,y0,x1,y1)}（单元坐标，480 系）。

    只扫实播区间 [i0, i0+f)。早先扫的是 `range(f)` = 第 0..f-1 格 —— i0>0 时那是个**错位的窗口**：
    既算了不播的开头几格，又漏了实播的尾巴。实测差异很小（lei 0.952→0.950，其余逐行同值，
    见 _patch/_fxdiag.py 的两列对照），但口径必须与播放一致，否则换素材时会算出一个说不清来路的尺寸。
    """
    import numpy as np
    from PIL import Image
    cov = coverage()
    out = {}
    for k, (f, rows, _sc) in sorted(fx_keys().items()):
        p = os.path.join(ASSD, k + '.png')
        if not os.path.exists(p):
            out[k] = None; continue
        im = Image.open(p).convert('RGBA')
        a = np.array(im.split()[3])
        i0, n = live_range(cov.get(k) or [0.0] * f)     # 与播放走同一套 i0/f，不另算一遍
        x0 = y0 = 10 ** 9; x1 = y1 = -1
        for i in range(i0, i0 + n):
            r, c = divmod(i, COLS)
            cell = a[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL]
            ys, xs = np.where(cell > 8)
            if len(xs) == 0:
                continue
            x0 = min(x0, int(xs.min())); x1 = max(x1, int(xs.max()))
            y0 = min(y0, int(ys.min())); y1 = max(y1, int(ys.max()))
        out[k] = None if x1 < 0 else (x0, y0, x1, y1)
    return out


def report(bb):
    """含量表 + 建议 scale。建议值 = 1 / 最大含量（让内容正好顶到 anchor×1.15）。"""
    print('\n%-14s %5s %5s  %-30s %6s  %6s  %s' % ('key', 'f', 'rows', '内容占单元 480 的比例', '建议', '现值', '备注'))
    print('-' * 92)
    suggest = {}
    for k, (f, rows, sc) in sorted(fx_keys().items()):
        b = bb.get(k)
        if b is None:
            print('%-14s %5d %5d  %-22s %6s  %6.2f  %s' % (k, f, rows, '（图缺 / 全透明）', '-', sc, '⚠'))
            continue
        x0, y0, x1, y1 = b
        fw = (x1 - x0 + 1) / float(CELL)
        fh = (y1 - y0 + 1) / float(CELL)
        s = 1.0 / max(fw, fh)
        suggest[k] = round(s, 2)
        note = ''
        if max(fw, fh) < 0.55:
            note = '内容偏小，照框贴会显得小'
        elif max(fw, fh) > 0.95:
            note = '内容几乎满格，scale>1 会溢出屏'
        else:
            note = '留空正常'
        print('%-14s %5d %5d  宽%.0f%% 高%.0f%%（居中偏差 %+.0f,%+.0f）  %6.2f  %6.2f  %s'
              % (k, f, rows, fw * 100, fh * 100,
                 (x0 + x1) / 2.0 - CELL / 2.0, (y0 + y1) / 2.0 - CELL / 2.0, s, sc, note))
    return suggest


_RUN = [0]


def build(mode, hero, clean, anchor='', pin='', viewport=''):
    src = io.open(os.path.join(ROOT, '原型.html'), encoding='utf-8').read()
    tag = '<script src="_patch/_drvfx.js"></script>'
    if tag not in src:
        src = src.replace('</body>', tag + '\n</body>')
    io.open(os.path.join(ROOT, '_shotfx.html'), 'w', encoding='utf-8').write(src)
    # ⚠️ URL 上必须带一个每次调用都变的 `_=` 计数：headless Chrome 复用默认 profile 的磁盘缓存，
    # 同一个 file:// 路径连着取两次会**命中缓存里的上一版页面**（表现为截图里是上一次的模式）。
    _RUN[0] += 1
    q = '?mode=%s&hero=%s&_=%d%s' % (mode, hero, _RUN[0], '&clean=1' if clean else '')
    if anchor:
        q += '&anchor=' + anchor
    if pin:
        q += '&pin=' + pin
    if viewport:                       # 游戏里那个视口，对照图的夹取上限要跟它对齐（见 _drvfx.js 注释）
        q += '&vw=%s&vh=%s' % tuple(viewport.split('x'))
    # 窄屏必须靠 iframe 才拿得到真 430（Chrome for Windows 的 --window-size 有最小宽度，
    # 传 430 实际布局是 512 —— 截出来是**裁切**不是窄布局）。
    # 代价：--dump-dom 只 dump 顶层文档，iframe 里的角标读不到 ⇒ 这里塞一段中继，
    # 把子文档的角标文字搬进父文档的 <pre id="relay">，dump 就能读到窄屏下的实测尺寸。
    relay = ('<script>setInterval(function(){try{'
             'var f=document.querySelector("iframe"),d=f.contentDocument,'
             'b=d.getElementById("__dbg"),'
             'p=document.getElementById("relay");'
             'if(!p){p=document.createElement("pre");p.id="relay";document.body.appendChild(p);}'
             'if(b)p.textContent=b.textContent;}catch(e){}},200);</script>')
    frame = ('<!doctype html><meta charset="utf-8">'
             '<style>html,body{margin:0;background:#222}iframe{border:0;display:block}'
             '#relay{display:none}</style>'
             '<iframe src="_shotfx.html%s" width="%d" height="932"></iframe>%s' % (q, 430, relay))
    io.open(os.path.join(ROOT, '_framefx.html'), 'w', encoding='utf-8').write(frame)
    # ⚠️ 查询串必须**回传**给调用方拼进 URL。之前这里是 return None、shot() 只用裸路径打开
    #    `_shotfx.html`，于是 900 宽那一路（非 iframe）**从来没收到过** anchor / pin / vw：
    #    角标里的锚点尺寸是驱动里的默认值（碰巧等于实测值，所以看不出问题），
    #    钉帧全是 70% 兜底（不是量的峰值），夹取上限用的是截图窗口的 918×2482 而不是游戏的 878×834。
    #    iframe 那一路是好的（q 进了 src），所以这个错只坑了宽屏图。
    return q


def shot(mode, hero, clean, w, h, out, dump=False, anchor='', pin='', viewport=''):
    url = build(mode, hero, clean=False if dump else clean, anchor=anchor, pin=pin, viewport=viewport)   # dump 要角标，所以不能用 clean
    if w == 430:                                   # 真窄布局只能靠 iframe（--window-size 有最小宽度）
        target = '_framefx.html'
    else:
        target = '_shotfx.html'
    cmd = [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars',
           '--allow-file-access-from-files', '--window-size=%d,%d' % (w, h)]
    if dump:
        # ⚠️ --dump-dom 默认**加载完就 dump**，setTimeout(go,400) 与中继的 setInterval 都还没跑
        # ⇒ 角标是空的。必须配 --virtual-time-budget 把定时器推完再 dump。
        cmd.append('--virtual-time-budget=6000')
        cmd.append('--dump-dom')
    else:
        cmd.append('--virtual-time-budget=12000')
        cmd.append('--screenshot=' + os.path.join(ROOT, out))
    cmd.append('file:///' + os.path.join(ROOT, target).replace('\\', '/') + url)
    r = subprocess.run(cmd, capture_output=True, text=True)
    if dump:
        keep = []
        for line in r.stdout.splitlines():
            t = line.strip()
            if t and (t[0] in 'ABCDEFWX' or 'relay' in t) and len(t) < 900:
                keep.append(t[:900])
        return '\n'.join(keep)
    print('OK -> %s' % out)
    return ''


def main():
    hero = arg('--hero', 'tianshi')
    bb = measure()
    report(bb)
    only = '--measure' in sys.argv
    if only:
        print('\n（--measure：只出表，未启浏览器）')
        return
    print('\n===== 锚点实测尺寸（真实战斗 DOM，900 宽） =====')
    d900 = shot('battle', hero, True, 900, 932, '_patch\\_shot_fx_battle_900.png', dump=True)
    print(d900)
    print('\n===== 窄屏 430 =====')
    d430 = shot('battle', hero, True, 430, 932, '_patch\\_shot_fx_battle_430.png', dump=True)
    print(d430)
    # 从角标里把量到的锚点尺寸抠出来，原样喂给对照图 —— 对照图里画的就是**真实战斗里的真实尺寸**
    anchors, vp = [], ''
    for line in d900.splitlines():
        mw = re.search(r'^W vw=(\d+) vh=(\d+)', line)
        if mw:
            vp = '%sx%s' % (mw.group(1), mw.group(2))
        m = re.search(r'^B (\w+) .*?w=(\d+) h=(\d+)', line)   # 注意 --dump-dom 里 '<-' 是 &lt;-，别写死
        if m:
            anchors.append('%s:%sx%s' % (m.group(1), m.group(2), m.group(3)))
    aq = ','.join(anchors)
    print('\n喂给对照图的锚点: %s' % (aq or '(没解析到，用驱动默认值)'))
    # 钉帧位置也一起量出来喂进去：钉「覆盖率最高的那一帧」，而不是写死 70%
    cov = coverage()
    pins = []
    for k, (f0, _r, _s) in sorted(fx_keys().items()):
        i0, f = live_range(cov.get(k) or [0.0] * f0)
        pins.append('%s:%d' % (k, peak_frame(cov.get(k) or [0.0] * f0, i0, f)))
    pq = ','.join(pins)
    print('喂给对照图的钉帧: %s' % pq)
    print('喂给对照图的视口: %s（夹取上限 %s）'
          % (vp or '(没解析到，用截图窗口)', round(min(int(x) for x in vp.split('x')) * 0.9) if vp else '?'))
    if '--dump' in sys.argv:
        return
    print('\n===== 对照图（比例保真：格子 = 该锚点的真实盒子，虚线 = 锚点脚印，caption 里是真 px） =====')
    # ⚠️ 窗口高度要装得下**全部 34 格**（30 个特效 + 4 个分区表头）：3 列 × 约 12 行，
    #    最高的格子（玩家区 box 568 按 ×0.43 显示）连 caption 约 290px ⇒ 约 3500px。
    #    2580 那次把最后 6 个玩家特效和**整个召唤区**截在了画面外（图看着"没有事"，其实是没有）。
    SHEET_H = 3900
    shot('sheet', hero, True, 940, SHEET_H, '_patch\\_shot_fx_sheet.png', dump=True, anchor=aq, pin=pq, viewport=vp)
    shot('sheet', hero, True, 940, SHEET_H, '_patch\\_shot_fx_sheet.png', anchor=aq, pin=pq, viewport=vp)
    shot('battle', hero, True, 900, 932, '_patch\\_shot_fx_battle_900.png')
    shot('battle', hero, True, 430, 932, '_patch\\_shot_fx_battle_430.png')
    print('\n完成。')


if __name__ == '__main__':
    main()