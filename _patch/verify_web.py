# -*- coding: utf-8 -*-
"""拆包产物校验（dist/web/）—— 与 verify_dist.py（单文件产物）**并行共存，互不削弱**。

两个产物验的是**不同契约**，所以各有一套闸：
  verify_dist.py（单文件）：ASSET_MAP 收全了没有、内联全局名还在不在、CSS url() 有没有被 assetURL 覆盖。
  verify_web.py （拆包）  ：素材是否**原样落盘**（图片已转 .webp）、HTML 里有没有指向 .png 的残留、
                            JS 口径（ASSET_MAP 保持 null + ASSET_WEBP 置 true）、PWA 四件套是否齐全。

⚠️ 本脚本**不镜像游戏里的路径规则**（verify_dist 反复强调过：镜像必漂）。
   路径要么从「游戏作用域求值」的结果里取（复用 vd.dump_ids() 的字符串值），
   要么做「源素材 ↔ 产物素材」的 1:1 映射 —— 后者不依赖任何规则，是这里最强的一条。

用法: python _patch/verify_web.py [dist/web]
"""
import io, os, re, sys, json

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import verify_dist as vd          # 复用它的 dump_ids()（在游戏作用域里求值，python 侧零镜像）

WEB = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', 'web')
ASSD = os.path.join(ROOT, '素材')
JSD = os.path.join(ROOT, 'js')
SKIP_DIRS = {'enemy_backup'}

IMG_EXT = {'.png', '.jpg', '.jpeg', '.bmp', '.webp', '.gif'}
WEB_IMG = {'.png', '.jpg', '.jpeg', '.bmp'}            # 拆包时**会**转成 .webp 的
AUD_EXT = {'.mp3', '.ogg', '.wav', '.m4a', '.mp4'}   # v1.1.x：.mp4 = 结局结算视频（拆包原样拷）
# 从 dump_ids() 的字符串值里捞「像素材路径」的那些（游戏作用域算好的，不镜像规则）
PATH_RE = re.compile(r'^[\w\u4e00-\u9fff/\-.]+\.(?:png|jpe?g|webp|bmp|mp3|ogg|wav|m4a)$', re.I)

fails, warns = [], []


def check(cond, msg):
    print(('  ok   ' if cond else '  FAIL ') + msg)
    if not cond:
        fails.append(msg)


def warn(cond, msg):
    if not cond:
        print('  warn %s' % msg)
        warns.append(msg)


def web_name(rel):
    e = os.path.splitext(rel)[1].lower()
    return (rel[:-len(e)] + '.webp') if e in WEB_IMG else rel


def src_assets():
    """源 素材/ 下全部该打包的文件 → [(相对路径, 绝对路径)]（跳过 enemy_backup）。"""
    out = []
    for dp, dn, fn in os.walk(ASSD):
        dn[:] = [d for d in dn if d not in SKIP_DIRS]
        for f in sorted(fn):
            p = os.path.join(dp, f)
            rel = os.path.relpath(p, ASSD).replace('\\', '/')
            out.append((rel, p))
    return out


def dst_assets():
    """产物 素材/ 下全部文件 → {相对路径: 字节数}。"""
    out = {}
    d = os.path.join(WEB, '素材')
    for dp, _, fn in os.walk(d):
        for f in fn:
            p = os.path.join(dp, f)
            out[os.path.relpath(p, d).replace('\\', '/')] = os.path.getsize(p)
    return out


def walk_strings(o, acc):
    if isinstance(o, str):
        acc.append(o)
    elif isinstance(o, dict):
        for v in o.values():
            walk_strings(v, acc)
    elif isinstance(o, list):
        for v in o:
            walk_strings(v, acc)


def main():
    print('拆包产物 %s\n' % WEB)
    if not os.path.isdir(WEB):
        print('FAIL: 找不到 %s（先跑: python 打包.py --split）' % WEB); sys.exit(2)
    has = lambda *p: os.path.exists(os.path.join(WEB, *p))

    # ---- [1] 目录结构 ----
    print('[1] 目录结构')
    check(has('index.html'), 'index.html 存在')
    check(os.path.isdir(os.path.join(WEB, 'js')), 'js/ 存在')
    check(os.path.isdir(os.path.join(WEB, '素材')), '素材/ 存在')
    check(has('manifest.webmanifest'), 'manifest.webmanifest 存在')
    check(has('sw.js'), 'sw.js 存在')
    check(os.path.isdir(os.path.join(WEB, 'icons')), 'icons/ 存在')
    js_files = sorted(f for f in os.listdir(os.path.join(WEB, 'js')) if f.endswith('.js'))
    src_js = sorted(f for f in os.listdir(JSD) if f.endswith('.js'))
    check(js_files == src_js, 'js/ 与源 js/ 逐文件同名（%d 段）: %s' % (len(js_files), js_files))
    check(not os.path.isdir(os.path.join(WEB, '素材', 'enemy_backup')), 'enemy_backup 未被打包')

    # ---- [2] 脚本口径：ASSET_MAP 保持 null，恰有一个 ASSET_WEBP=true ----
    print('\n[2] 脚本口径')
    n_null, webp_on, webp_off, injected = 0, [], [], []
    for fn in js_files:
        s = io.open(os.path.join(WEB, 'js', fn), 'r', encoding='utf-8').read()
        n_null += len(re.findall(r'var\s+ASSET_MAP\s*=\s*null\s*;', s))
        if re.search(r'var\s+ASSET_WEBP\s*=\s*true\s*;', s):
            webp_on.append(fn)
        if re.search(r'var\s+ASSET_WEBP\s*=\s*false\s*;', s):
            webp_off.append(fn)
        if re.search(r'var\s+ASSET_MAP\s*=\s*\{', s):
            injected.append(fn)
    check(not injected, '没有注入 ASSET_MAP（拆包走相对路径，注入反而会让 ASSET_WEBP 失效）: %s' % injected)
    check(n_null == 1, 'ASSET_MAP 声明保持 null（找到 %d 处，期望 1）' % n_null)
    check(len(webp_on) == 1, '恰有一个 js 把 ASSET_WEBP 置 true: %s' % webp_on)
    check(not webp_off, '没有残留 ASSET_WEBP=false 的 js: %s' % webp_off)
    aud = io.open(os.path.join(WEB, 'js', '10_audio.js'), 'r', encoding='utf-8').read()
    check('assetURL' in aud and "replace(/\\.(png|jpe?g|bmp)$/i, '.webp')" in aud,
          'assetURL 的 WebP 换名正则仍在（且只认图片扩展名，不吃掉 BGM 的 .ogg/.mp3）')
    # v1.1.20r4：拆包档也按排拆 fx —— 打包.py 把 00_base.js 的 `var FX_ROW_KEYS = null;` 桩
    # 替换成 {"<fx键>": <排数>, …}（与 ASSET_WEBP 同一套注入手法）。这里正面钉「恰有一个 js 注入」
    # +「不留 null 桩」，并把注入清单解析出来供 [3]/[3b] 与源几何对账。
    frk_on, frk_null = [], []
    for fn in js_files:
        s = io.open(os.path.join(WEB, 'js', fn), 'r', encoding='utf-8').read()
        if re.search(r'var\s+FX_ROW_KEYS\s*=\s*\{', s):
            frk_on.append(fn)
        if re.search(r'var\s+FX_ROW_KEYS\s*=\s*null\s*;', s):
            frk_null.append(fn)
    check(len(frk_on) == 1, '恰有一个 js 把 FX_ROW_KEYS 注入为按排清单: %s' % frk_on)
    check(not frk_null, '没有残留 FX_ROW_KEYS=null 的 js（拆包必须注入）: %s' % frk_null)
    injected_rows = {}
    if frk_on:
        _mfrk = re.search(r'var\s+FX_ROW_KEYS\s*=\s*(\{[\s\S]*?\})\s*;',
                          io.open(os.path.join(WEB, 'js', frk_on[0]), 'r', encoding='utf-8').read())
        if _mfrk:
            injected_rows = json.loads(_mfrk.group(1))
    check(bool(injected_rows), 'FX_ROW_KEYS 是一张非空按排清单（%d 条）' % len(injected_rows))

    # ---- [3] 素材 1:1 映射（最强的一条：源有什么，产物就必须有什么，且图片全 .webp） ----
    # v1.1.20r4：fx 精灵图**按排拆**落盘（与单文件产物同口径，见 打包.py build_split）⇒
    # 源 fx/<键>.png 在产物里不再对应单个整图 .webp，而对应 fx/<键>_r0.._r(n-1).webp
    # （n = FX_SHEETS.rows，从**游戏作用域** dump_ids 取，python 侧不镜像几何）。
    # 整张插画（FX_WHOLE，如 daoxin_full）不拆 ⇒ 仍整图 1:1。
    print('\n[3] 素材落盘（源 ↔ 产物 1:1）')
    ids = vd.dump_ids()
    fxrows = ids.get('fxRows') or {}
    fxwhole = set(ids.get('fxWhole') or [])
    src = [(rel, p) for rel, p in src_assets()
           if os.path.splitext(p)[1].lower() in (IMG_EXT | AUD_EXT)]
    want = {}                 # 期望的产物键 → 源字节数（按排键没有精确源值，置 None）
    split_fx = {}             # {fx键: 排数} —— 判定期望的按排键
    n_exp_webp = 0            # 期望产物里的 .webp 张数
    for rel, p in src:
        ext = os.path.splitext(p)[1].lower()
        stem = os.path.splitext(os.path.basename(rel))[0]
        if rel.startswith('fx/') and ext == '.png' and stem in fxrows and stem not in fxwhole:
            n = int(fxrows[stem])
            split_fx[stem] = n
            for i in range(n):
                want['fx/%s_r%d.webp' % (stem, i)] = None
            n_exp_webp += n
        else:
            k = web_name(rel)
            want[k] = os.path.getsize(p)
            if k.lower().endswith('.webp'):
                n_exp_webp += 1
    got = dst_assets()
    missing = sorted(k for k in want if k not in got)
    extra = sorted(k for k in got if k not in want)
    check(not missing, '游戏素材一个不缺（缺 %d: %s）' % (len(missing), missing[:8]))
    check(not extra, '产物没有多余文件（多 %d: %s）' % (len(extra), extra[:8]))
    leftovers = sorted(k for k in got if os.path.splitext(k)[1].lower() in WEB_IMG)
    check(not leftovers, '图片已全部转成 .webp（残留原格式 %d: %s）' % (len(leftovers), leftovers[:8]))
    n_webp = len([k for k in got if k.lower().endswith('.webp')])
    check(n_webp == n_exp_webp, '.webp 张数与源图片张数一致（%d == %d；其中 fx 按排 %d 张）'
          % (n_webp, n_exp_webp, sum(split_fx.values())))
    check('README.md' not in got, '非素材文件（素材/README.md）未被打包')
    # 抽查体积：webp 必须比原图小（转码真的发生了，不是改个扩展名）——只抽查**整图**那批（fx 按排键不适用）
    split_names = set('fx/%s.webp' % s for s in split_fx)
    shrink = []
    by_rel = {web_name(rel): p for rel, p in src
              if os.path.splitext(p)[1].lower() in WEB_IMG and web_name(rel) not in split_names}
    for k in sorted(by_rel)[:12]:
        if by_rel[k] and os.path.exists(by_rel[k]) and os.path.getsize(by_rel[k]) > 8192:
            shrink.append(got[k] < os.path.getsize(by_rel[k]))
    check(shrink and all(shrink), '抽查的 webp 都比原图小（确实做了转码）: %d/%d' % (sum(shrink), len(shrink)))

    # ---- [3b] fx 按排键几何互核（注入清单 ↔ FX_SHEETS.rows ↔ 单帧高） ----
    print('\n[3b] fx 按排键几何（数量 / 宽 / 行高 与 FX_SHEETS 对账）')
    check(set(injected_rows) == set(split_fx),
          '注入的 FX_ROW_KEYS 键集 == 应拆 fx 键集（多 %d、少 %d）'
          % (len(set(injected_rows) - set(split_fx)), len(set(split_fx) - set(injected_rows))))
    check(injected_rows == split_fx,
          '注入的 FX_ROW_KEYS 排数 == FX_SHEETS.rows（不符：%s）'
          % {k: (injected_rows.get(k), split_fx.get(k)) for k in split_fx
             if injected_rows.get(k) != split_fx.get(k)})
    try:
        from PIL import Image
        badgeom = []
        # 只认 fx/ 下的 png（注意 sfx 里有同名 wav，如 sfx/gouhun.wav ↔ fx/gouhun.png，
        # 按 basename 建索引时别把音频也当精灵图）。
        fx_src = {os.path.splitext(os.path.basename(rel))[0]: p
                  for rel, p in src if rel.startswith('fx/') and p.lower().endswith('.png')}
        for stem, n in sorted(split_fx.items()):
            p = fx_src.get(stem)
            if not p:
                badgeom.append('%s 找不到源 png' % stem); continue
            sw, sh = Image.open(p).size
            if sh % n:
                badgeom.append('%s 源高 %d 不能被排数 %d 整除' % (stem, sh, n)); continue
            for i in range(n):
                q = os.path.join(WEB, '素材', 'fx', '%s_r%d.webp' % (stem, i))
                if not os.path.exists(q):
                    badgeom.append('%s_r%d 缺文件' % (stem, i)); continue
                wq, hq = Image.open(q).size
                if wq != sw or hq != sh // n:
                    badgeom.append('%s_r%d %dx%d（期望 %dx%d）' % (stem, i, wq, hq, sw, sh // n))
        check(not badgeom, '按排图 宽=源宽、行高=源高/排数（不符 %d: %s）' % (len(badgeom), badgeom[:6]))
    except ImportError:
        warn(False, '没装 Pillow，跳过按排图几何校验')

    # ---- [4] index.html 的素材引用（不能有一条指向 .png/.jpg） ----
    print('\n[4] index.html 素材引用')
    html = io.open(os.path.join(WEB, 'index.html'), 'r', encoding='utf-8').read()
    # ⚠️ 先剥掉 HTML 注释再扫：源码注释里有一句 `<img src="素材/…">`（讲打包路径变了的说明），
    #    它不是真实引用，不剥会误报「文件名没有扩展名」。
    htm = re.sub(r'<!--[\s\S]*?-->', '', html)
    refs = re.findall(r'url\(\s*["\']?(素材/[^)"\']+)', htm) + re.findall(r'src="(素材/[^"]+)"', htm)
    bad = [r for r in refs if not r.lower().endswith('.webp')]
    check(bool(refs), 'index.html 里找到了素材引用（%d 条）: %s' % (len(refs), sorted(set(refs))))
    check(not bad, 'CSS url()/静态 <img> 全部指向 .webp: %s' % bad[:8])
    for r in sorted(set(refs)):
        check(os.path.exists(os.path.join(WEB, r)), '引用的文件真实存在: %s' % r)
    check('js/00_base.js' in html and '<script src="js/' in html, 'index.html 仍以外链加载 js/（未合回内联）')

    # ---- [5] PWA 四件套 ----
    print('\n[5] PWA 四件套')
    mf = json.loads(io.open(os.path.join(WEB, 'manifest.webmanifest'), 'r', encoding='utf-8').read())
    check(mf.get('display') == 'fullscreen', 'manifest display=fullscreen（%s）' % mf.get('display'))
    check(mf.get('orientation') == 'landscape', 'manifest orientation=landscape（%s）' % mf.get('orientation'))
    check(mf.get('start_url') and mf.get('scope') == './', 'manifest start_url/scope 正确: %s / %s'
          % (mf.get('start_url'), mf.get('scope')))
    check((mf.get('theme_color') or '').lower() in ('#120e0b',), 'manifest theme_color 与页内一致')
    icons = mf.get('icons') or []
    check(len(icons) == 3, 'manifest 登记 3 张图标: %s' % [i.get('sizes') for i in icons])
    check(any(i.get('purpose') == 'maskable' for i in icons), 'manifest 含 maskable 图标')
    for i in icons:
        check(os.path.exists(os.path.join(WEB, i['src'])), 'manifest 图标存在: %s' % i['src'])
    # 图标实际像素尺寸（声明 512 却给了 192 的话，装到桌面会糊）
    try:
        from PIL import Image
        for rel, sz in (('icons/icon-192.png', 192), ('icons/icon-512.png', 512),
                        ('icons/icon-maskable-512.png', 512), ('icons/apple-touch-icon-180.png', 180)):
            p = os.path.join(WEB, rel)
            if os.path.exists(p):
                check(Image.open(p).size == (sz, sz), '%s 实际尺寸 %dx%d' % (rel, sz, sz))
            else:
                check(False, '图标存在: %s' % rel)
    except ImportError:
        warn(False, '没装 Pillow，跳过图标尺寸校验')
    check('<link rel="manifest" href="manifest.webmanifest">' in html, 'index.html 挂了 manifest')
    check('<meta name="theme-color"' in html, 'index.html 有 theme-color')
    check('<link rel="apple-touch-icon"' in html, 'index.html 有 apple-touch-icon')
    check('viewport-fit=cover' in html, 'index.html 的 viewport 带 viewport-fit=cover（安全区的前提）')
    check("navigator.serviceWorker.register('sw.js')" in html, 'index.html 注册了 sw.js')
    check("screen.orientation.lock('landscape')" in html, 'index.html 有横屏锁定（尽力一试，失败静默）')
    sw = io.open(os.path.join(WEB, 'sw.js'), 'r', encoding='utf-8').read()
    check('const VER' in sw and 'caches.open(VER)' in sw, 'sw.js 有版本号缓存名')
    check("caches.keys()" in sw and 'caches.delete' in sw, 'sw.js activate 里清掉旧版本缓存')
    check("req.headers.get('range')" in sw, 'sw.js 让过 Range 请求（否则音频拖动会坏）')
    check("index.html" in sw and 'js/' in sw and '素材/' in sw, 'sw.js 的缓存范围含 index.html / js/ / 素材/')

    # ---- [6] 安全区（本轮新增的结构，被删掉要立刻红） ----
    print('\n[6] 安全区接入')
    check(html.count('env(safe-area-inset-top,0px)') >= 4, 'index.html 四档 #app 内边距都接了安全区（%d 处）'
          % html.count('env(safe-area-inset-top,0px)'))
    check(re.search(r'#overlay\s*\{[^}]*env\(safe-area-inset-top', html) is not None,
          '#overlay 也避开安全区（关闭✕在右上角）')

    # ---- [7] 隐私 / 内部文件泄漏 ----
    print('\n[7] 隐私自检')
    blob = html + sw + json.dumps(mf, ensure_ascii=False)
    for pat in (r'[A-Za-z]:\\', r'C:/Users', r'Desktop', r'enemy_backup'):
        check(re.search(pat, blob) is None, 'index.html/sw/manifest 里没有 %r' % pat)
    warn(re.search(r'_patch', blob) is None, 'index.html/sw/manifest 里出现了 "_patch"（注释泄漏，不致命）')

    print('\n===== %s =====' % ('全部通过' if not fails else '%d 项失败' % len(fails)))
    if warns:
        print('（%d 条警告，未计入失败）' % len(warns))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()