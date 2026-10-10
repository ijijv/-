# -*- coding: utf-8 -*-
"""
志怪塔 · 打包（两种口径，产物互不覆盖）

① 单文件（默认）—— 把 原型.html + 素材/ 打成**一个自包含的离线 HTML**，发给朋友试玩 / 手机双击。
   产物: dist/志怪塔.html
  它做了什么:
    1. 素材图片 PNG → WebP（有损压缩，默认质量 78），体积约降 60~75%
    2. 图片 / 音乐 全部 base64 内联成 data URI，写进源码的 ASSET_MAP
    3. 把 原型.html 里的 <script src="js/*.js"> 按文档顺序合回一段正文，
       经 javascript-obfuscator 压缩混淆（renameGlobals=false，保住内联 onclick 依赖的全局函数名）
    4. 不含 .git / _patch / _build / memory-bank / 立项文档 / 数值表 —— 只有游戏本体

② 拆包（--split）—— 多文件目录，供**网页发布 / PWA / 小游戏上架**用（必须走 http，不能双击 file://）。
   产物: dist/web/（index.html + js/ + 素材/ + manifest + sw.js + icons/）
  它做了什么:
    1. 脚本保持外链（js/*.js 原样拷过去，只把 10_audio.js 的 ASSET_WEBP 置 true）
    2. 图片 PNG/JPG → WebP 落盘，音效/BGM 原样拷（音效已在 mp3，转码无益）
    3. 补 PWA 四件套：manifest.webmanifest（display:fullscreen + orientation:landscape）、
       sw.js（js/素材 缓存优先、index.html 网络优先、版本号随代码变）、icons/ 四张、注册脚本
    4. 横屏锁定（首次点按尽力一试）+ theme-color / apple-touch-icon 等移动端 meta
  用法:
    python 打包.py --split --quality 78

③ TapTap 小游戏（--taptap）—— 先跑①单文件，再把它打成**上传包**。
   产物: dist/志怪塔_TapTap包体.zip
  为什么要单独一个模式：TapTap 的 WebGL 传包有硬性目录规范，不符会被后台拒收 ——
    · 必须是 .zip，且**压缩包内第一级有且仅有一个文件夹**
    · 该文件夹名**只能含英文/数字**（所以固定用 game/，不能写成「志怪塔」）
    · 文件夹下**必须有 index.html**
  ①的产物本身就是自包含单文件（素材 base64 内联、脚本已合并混淆），
  所以包内只有 game/index.html 这一个文件，不需要再带 js/ 与 素材/。
  用法:
    python 打包.py --taptap

通用用法:
  python 打包.py                    # 单文件：WebP q78 + 混淆
  python 打包.py --taptap           # 单文件 + TapTap 小游戏上传包（zip）
  python 打包.py --quality 60       # 更小
  python 打包.py --no-obfuscate     # 跳过混淆（排查问题时用）
  python 打包.py --no-webp          # 保留原 PNG，只内联
"""
import io, os, re, sys, json, base64, argparse, subprocess, tempfile, shutil, hashlib, zipfile

try:
    from PIL import Image
except ImportError:
    print('需要 Pillow:  pip install Pillow'); sys.exit(1)

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(ROOT, '原型.html')
ASSD = os.path.join(ROOT, '素材')
JSD  = os.path.join(ROOT, 'js')
OUTD = os.path.join(ROOT, 'dist')
OUT  = os.path.join(OUTD, '志怪塔.html')
WEB_OUTD = os.path.join(OUTD, 'web')                 # 拆包产物，与单文件互不覆盖
WEB_ICON_SRC = os.path.join(ROOT, '1.ico')           # 应用图标源图（618×618 PNG）
TAPTAP_OUT = os.path.join(OUTD, '志怪塔_TapTap包体.zip')   # TapTap 小游戏上传包（见 --taptap）
TAPTAP_DIR = 'game'                                  # 包内第一级目录名：只许英文/数字
OBF  = os.path.join(ROOT, '_build', 'obf.js')
NODE_MODULES = os.path.join(ROOT, '_build', 'node_modules')

SKIP_DIRS = {'enemy_backup'}          # 抠图前备份原图，游戏从不加载
IMG_EXT = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'}
AUD_MIME = {'.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4'}
# 拆包时**会**转成 .webp 落盘的图片格式 —— 必须与 js/10_audio.js 的 assetURL 正则 (.png|jpe?g|bmp) 同口径，
# 否则 HTML 里换了名、JS 里却没换（或反过来）⇒ 图片整片 404。
WEB_IMG_EXT = {'.png', '.jpg', '.jpeg', '.bmp'}
# v1.0.14：**非精灵图**的整张 fx 素材（fx 目录里但不在 FX_SHEETS 里的），按排切会切错。
# 与 js/00_base.js 的 FX_WHOLE 同口径（那里是唯一真相源）；verify_dist.py 会核对两边相等。
# 例：fx/daoxin_full.png 是 1024×1024 的道心插画，恰好满足「宽 = 8 格、高为整数格」，
# 会被 fx_row_datauris 误拆成 8 行 → 运行时请求的 fx/daoxin_full.png 整键反而消失（破碎动画 404）。
FX_WHOLE_SKIP = {'daoxin_full'}


def human(n):
    return '%.2f MB' % (n / 1048576.0) if n >= 1048576 else '%.0f KB' % (n / 1024.0)


def collect():
    """列出 素材/ 下所有要打包的文件 → [(相对路径, 绝对路径)]，跳过 enemy_backup。"""
    out = []
    for dirpath, dirnames, filenames in os.walk(ASSD):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in sorted(filenames):
            p = os.path.join(dirpath, fn)
            rel = os.path.relpath(p, ASSD).replace('\\', '/')
            out.append((rel, p))
    return out


def img_datauri(path, quality, maxdim):
    """图片 → WebP data URI。返回 (uri, webp字节数, 原始字节数)。"""
    im = Image.open(path)
    if im.mode in ('P', 'LA', 'L'):
        im = im.convert('RGBA' if 'transparency' in im.info or im.mode == 'LA' else 'RGB')
    if maxdim and max(im.size) > maxdim:
        r = maxdim / float(max(im.size))
        im = im.resize((max(1, int(im.width * r)), max(1, int(im.height * r))), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=quality, method=6)
    raw = buf.getvalue()
    return 'data:image/webp;base64,' + base64.b64encode(raw).decode('ascii'), len(raw), os.path.getsize(path)


def fx_row_datauris(path, quality, cols=8):
    """特效精灵图 → **按排**的 WebP data URI 列表；不是 8 列整图就返回 None。

    v1.0.9（手机端性能）：单文件产物原来是「一个特效 = 一张 3840×2880 整图」，
    每次出牌把它当 CSS background 挂上去，浏览器就要解 **11 Mpx / 42 MB** 的位图；
    30 张合计 1195 MB，手机图片缓存根本留不住 ⇒ **每次出牌都重新解一遍 100~200ms**，
    正是用户报的「打出手牌那一瞬间卡」。
    拆成按排小图（3840×480 = 1.8 Mpx）后每次只解 1/6，**像素逐字节不变**（只是切了一刀），
    出牌尖峰随之降到十几毫秒。运行时的取法见 js/00_base.js 的 playFx（<name>_r<行>.png）。
    尺寸全从图自己量（不写死 480）：单元边长 = 宽/8，排数 = 高/单元边长。"""
    im = Image.open(path)
    if im.mode in ('P', 'LA', 'L'):
        im = im.convert('RGBA' if 'transparency' in im.info or im.mode == 'LA' else 'RGB')
    W, H = im.size
    cell = W // cols
    if cell <= 0 or W != cols * cell or H % cell:
        return None
    out = []
    for k in range(H // cell):
        buf = io.BytesIO()
        im.crop((0, k * cell, W, (k + 1) * cell)).save(buf, 'WEBP', quality=quality, method=6)
        raw = buf.getvalue()
        out.append(('data:image/webp;base64,' + base64.b64encode(raw).decode('ascii'), len(raw)))
    return out


def file_datauri(path):
    ext = os.path.splitext(path)[1].lower()
    raw = open(path, 'rb').read()
    return 'data:%s;base64,%s' % (AUD_MIME[ext], base64.b64encode(raw).decode('ascii')), len(raw)


def top_level_names(js):
    names = set(re.findall(r'^function\s+([A-Za-z_$][\w$]*)', js, re.M))
    names |= set(re.findall(r'^(?:var|let|const)\s+([A-Za-z_$][\w$]*)', js, re.M))
    return names


def inline_handler_names(html):
    """内联 on*="..." 里引用到的标识符（这些全局名混淆时绝不能改名）。"""
    ids = set()
    for attr in re.findall(r'\son[a-z]+\s*=\s*"([^"]*)"', html):
        ids |= set(re.findall(r'[A-Za-z_$][\w$]*', attr))
    return ids


# ============================ 拆包（--split） ============================

PWA_HEAD = '''<meta name="theme-color" content="#120e0b">
<meta name="color-scheme" content="dark">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="志怪塔">'''

# ⚠️ 这一段只进拆包产物的 index.html，**不写进 原型.html**：开发树双击 file:// 时注册 SW 会报错。
PWA_BOOT = '''<script>
/* 拆包产物专用（开发树 原型.html 里没有这一段）：PWA 离线注册 + 横屏锁定。
   横屏锁定：manifest 的 orientation:landscape 在"装成 PWA"时由系统直接生效；浏览器里
   screen.orientation.lock 多数要求先进全屏，故首次点按尽力一试、失败静默 ——
   兜底仍是页内既有的 CSS 竖屏闸（#rotate-tip）。 */
(function(){
  if('serviceWorker' in navigator){
    window.addEventListener('load',function(){
      navigator.serviceWorker.register('sw.js').then(function(reg){
        /* v1.0.7（手机端性能）：**必须主动 update()**。浏览器默认只在导航时顺带查一次
           sw.js，而这一查还会被 HTTP 缓存扣住 —— 旧 SW 于是长期把 /js/ 的老脚本
           （fetch 里对 /js/ 是 cache-first）喂给新页面。表现就是：源码改了、产物重打了，
           手机上跑的还是老版本（实测 typeof logRowHTML === 'undefined'，正是这个假象）。
           主动 check 一次，install→skipWaiting→activate→claim 这条链才真的走起来。 */
        try{ reg.update(); }catch(e){}
      }).catch(function(){});
    });
    /* 新 SW 接管后**刷新一次**：本页已经解析过的老脚本不会因为 SW 换代而重来，
       只有 reload 才能从新 cache 里取到新脚本。
       首次安装（此前没有 controller）不刷 —— 那一次页面本来就从网络取的新的，
       刷了只是多一次白闪。 */
    var hadCtrl = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function(){
      if(!hadCtrl) return;
      location.reload();
    });
  }
  window.addEventListener('pointerdown',function(){
    try{ if(screen.orientation&&screen.orientation.lock) screen.orientation.lock('landscape').catch(function(){}); }catch(e){}
  },{once:true});
})();
</script>'''

PWA_MANIFEST = {
    "name": "志怪塔", "short_name": "志怪塔",
    "description": "中式志怪 Roguelike 卡牌爬塔",
    "lang": "zh-CN",
    "start_url": "./index.html", "scope": "./",
    "display": "fullscreen", "orientation": "landscape",
    "background_color": "#120e0b", "theme_color": "#120e0b",
    "icons": [
        {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
        {"src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ],
}

SW_JS = '''/* 志怪塔 · Service Worker（由 打包.py --split 生成，勿手改） */
const VER = 'zhiguaita-%(ver)s';
const CORE = %(core)s;
self.addEventListener('install', function(e){
  self.skipWaiting();
  /* v1.0.7（手机端性能）：CORE 取件必须带 cache:'reload' **绕开 HTTP 缓存**。
     addAll 走的是 fetch，默认吃 HTTP 缓存 —— 若 js 被缓存扣住，新版本的 cache 里
     会灌进**老脚本**：版本号换了、内容却没换，白打一次产物。
     带上 reload 才是真·从网络取新件。 */
  e.waitUntil(caches.open(VER).then(function(c){
    return c.addAll(CORE.map(function(u){ return new Request(u, {cache:'reload'}); }));
  }).catch(function(){}));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k !== VER; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  const req = e.request;
  if(req.method !== 'GET') return;
  if(req.headers.get('range')) return;   /* Range（音频拖动）交给网络，免得 206 与缓存打架 */
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;
  const p = url.pathname;
  if(p.endsWith('/') || p.endsWith('/index.html')){
    e.respondWith(fetch(req).then(function(r){
      const c = r.clone(); caches.open(VER).then(function(x){ x.put(req, c); });
      return r;
    }).catch(function(){ return caches.match(req).then(function(m){ return m || caches.match('./index.html'); }); }));
    return;
  }
  if(p.includes('/js/') || p.includes('/素材/') || /\\.(png|webp|jpg|jpeg|mp3|ogg|wav|m4a)$/.test(p)){
    e.respondWith(caches.match(req).then(function(m){
      if(m) return m;
      return fetch(req).then(function(r){
        if(r && r.status === 200){ const c = r.clone(); caches.open(VER).then(function(x){ x.put(req, c); }); }
        return r;
      });
    }));
  }
});
'''


def web_asset_name(rel):
    """素材相对路径 → 拆包落盘名：图片改 .webp，音频等原样。"""
    e = os.path.splitext(rel)[1].lower()
    return (rel[:-len(e)] + '.webp') if e in WEB_IMG_EXT else rel


def write_icons(dst):
    """从 WEB_ICON_SRC 出 PWA 四张图标：192 / 512 / maskable-512 / apple-touch-180。"""
    if not os.path.exists(WEB_ICON_SRC):
        print('  （找不到图标源 %s，跳过 icons/）' % WEB_ICON_SRC)
        return 0
    base = Image.open(WEB_ICON_SRC).convert('RGBA')
    if not os.path.isdir(dst):
        os.makedirs(dst)
    n = 0

    def save(sz, name, inner_ratio=None, bg=None):
        if inner_ratio:
            canvas = Image.new('RGBA', (sz, sz), bg)
            k = (sz * inner_ratio) / float(max(base.size))
            im = base.resize((max(1, int(base.width * k)), max(1, int(base.height * k))), Image.LANCZOS)
            canvas.paste(im, ((sz - im.width) // 2, (sz - im.height) // 2), im)
            out = canvas
        else:
            out = base.resize((sz, sz), Image.LANCZOS)
        out.save(os.path.join(dst, name), 'PNG')
        return os.path.getsize(os.path.join(dst, name))

    save(192, 'icon-192.png')
    save(512, 'icon-512.png')
    # maskable：内容收进 72% 安全区、底铺主题深色，避免被圆形/方形裁切吃掉边缘
    save(512, 'icon-maskable-512.png', inner_ratio=0.72, bg=(18, 14, 11, 255))
    save(180, 'apple-touch-icon-180.png', inner_ratio=0.86, bg=(18, 14, 11, 255))
    return 4


def build_split(args):
    """拆包：dist/web/ = index.html + js/ + 素材/(webp) + manifest + sw.js + icons/。"""
    for p, what in ((SRC, '原型.html'), (ASSD, '素材目录'), (JSD, '脚本目录')):
        if not os.path.exists(p):
            print('FAIL: 找不到%s %s' % (what, p)); sys.exit(1)

    if os.path.isdir(WEB_OUTD):
        shutil.rmtree(WEB_OUTD)
    os.makedirs(WEB_OUTD)

    # ---- 1. 素材：图片 → WebP 落盘；音频原样拷；enemy_backup 不打包 ----
    files = collect()
    st = {'in': 0, 'out': 0, 'n_img': 0, 'n_aud': 0}
    for rel, path in files:
        ext = os.path.splitext(path)[1].lower()
        if ext not in WEB_IMG_EXT and ext not in AUD_MIME:
            if ext in IMG_EXT:
                print('FAIL: 图片格式 %s 不在 WEB_IMG_EXT 里（assetURL 不会换名成 .webp）: %s' % (ext, rel))
                sys.exit(1)
            print('  跳过非素材文件: %s' % rel)
            continue
        dst = os.path.join(WEB_OUTD, '素材', web_asset_name(rel).replace('/', os.sep))
        if not os.path.isdir(os.path.dirname(dst)):
            os.makedirs(os.path.dirname(dst))
        if ext in WEB_IMG_EXT:
            im = Image.open(path)
            if im.mode in ('P', 'LA', 'L'):
                im = im.convert('RGBA' if 'transparency' in im.info or im.mode == 'LA' else 'RGB')
            if args.max_dim and max(im.size) > args.max_dim:
                r = args.max_dim / float(max(im.size))
                im = im.resize((max(1, int(im.width * r)), max(1, int(im.height * r))), Image.LANCZOS)
            im.save(dst, 'WEBP', quality=args.quality, method=6)
            st['n_img'] += 1
        else:
            shutil.copyfile(path, dst)
            st['n_aud'] += 1
        st['in'] += os.path.getsize(path); st['out'] += os.path.getsize(dst)
    print('素材 %d 个（图 %d → webp / 音 %d 原样）: %s → %s'
          % (st['n_img'] + st['n_aud'], st['n_img'], st['n_aud'], human(st['in']), human(st['out'])))

    # ---- 2. 脚本：原样拷，只把 10_audio.js 的 ASSET_WEBP 置 true ----
    js_files = sorted(f for f in os.listdir(JSD) if f.lower().endswith('.js'))
    if not js_files:
        print('FAIL: %s 下没有 .js' % JSD); sys.exit(1)
    os.makedirs(os.path.join(WEB_OUTD, 'js'))
    stub_webp = 'var ASSET_WEBP = false;'
    seen = []
    for fn in js_files:
        s = io.open(os.path.join(JSD, fn), 'r', encoding='utf-8', newline='').read()
        if stub_webp in s:
            seen.append(fn)
            s = s.replace(stub_webp, 'var ASSET_WEBP = true;')
        io.open(os.path.join(WEB_OUTD, 'js', fn), 'w', encoding='utf-8', newline='').write(s)
    if len(seen) != 1:
        print('FAIL: 期望恰有一个 js 含 "%s"，实际 %s' % (stub_webp, seen)); sys.exit(1)
    print('脚本 %d 段 → js/（%s 的 ASSET_WEBP → true）' % (len(js_files), seen[0]))

    # ---- 3. index.html：脚本保持外链；CSS url()/静态 img 的图片路径换 .webp；注入 PWA ----
    html = io.open(SRC, 'r', encoding='utf-8').read()
    html, n_swap = re.subn(r'素材/([^"\'()\s]+)\.(?:png|jpe?g|bmp)',
                           lambda m: '素材/' + m.group(1) + '.webp', html, flags=re.I)
    html, n_head = re.subn(r'(<meta\s+name="viewport"[^>]*>)',
                           lambda m: m.group(1) + '\n' + PWA_HEAD, html, count=1, flags=re.I)
    if n_head != 1:
        print('FAIL: index.html 里找不到 viewport meta，PWA head 注入失败'); sys.exit(1)
    if '</body>' not in html:
        print('FAIL: index.html 里找不到 </body>'); sys.exit(1)
    html = html.replace('</body>', PWA_BOOT + '\n</body>')
    io.open(os.path.join(WEB_OUTD, 'index.html'), 'w', encoding='utf-8', newline='').write(html)

    # ---- 4. PWA：manifest + sw.js + icons ----
    io.open(os.path.join(WEB_OUTD, 'manifest.webmanifest'), 'w', encoding='utf-8', newline='')\
        .write(json.dumps(PWA_MANIFEST, ensure_ascii=False, indent=2))
    core = ['./', './index.html', './manifest.webmanifest'] + ['./js/' + f for f in js_files]
    digest = hashlib.md5()
    for fn in js_files:
        digest.update(io.open(os.path.join(JSD, fn), 'rb').read())
    digest.update(('|'.join(sorted(f[0] for f in files))).encode('utf-8'))
    ver = digest.hexdigest()[:10]
    io.open(os.path.join(WEB_OUTD, 'sw.js'), 'w', encoding='utf-8', newline='')\
        .write(SW_JS % {'ver': ver, 'core': json.dumps(core, ensure_ascii=False)})
    n_icon = write_icons(os.path.join(WEB_OUTD, 'icons'))

    # ---- 5. 自检 + 统计 ----
    leaks = [p for p in (r'[A-Za-z]:\\\\', r'C:/Users', r'Desktop', r'\.git/', r'_patch', r'记忆', r'enemy_backup')
             if re.search(p, html)]
    if leaks:
        print('!! 自检命中可疑字符串: %s' % leaks)
    total = sum(os.path.getsize(os.path.join(dp, f))
                for dp, _, fs in os.walk(WEB_OUTD) for f in fs)
    print('产物: %s/  共 %.1f MB（sw 版本 %s，图标 %d 张，HTML 路径换名 %d 处）'
          % (WEB_OUTD, total / 1048576.0, ver, n_icon, n_swap))
    print('   发布：把 dist/web/ 整个目录传到 https 站点根（或子目录）；本地预览：cd dist/web && python -m http.server 8090')


# ============================ TapTap 小游戏上传包（--taptap） ============================

def build_taptap(html_path):
    """把①的单文件产物打成 TapTap 小游戏上传包。

    目录规范来自 TapTap 官方传包说明（WebGL 形式）：压缩包内第一级有且仅有一个文件夹、
    文件夹名只可含英文/数字、且该文件夹下必须有 index.html。不符会在后台被直接拒收，
    所以打完立刻自检，不合规就 FAIL —— 与其上传后被退，不如这里就拦下。
    """
    body = io.open(html_path, 'r', encoding='utf-8').read()

    # 自检 1：必须是自包含单文件。还剩外链 <script src=...> 说明脚本合并没有生效，
    #         而包内并不含 js/ 目录 ⇒ 到 TapTap 容器里会整片 404。
    if re.search(r'<script[^>]*\ssrc\s*=', body, re.I):
        print('FAIL: 产物里还有外链 <script src=...>，不是自包含单文件'); sys.exit(1)
    if 'data:image/' not in body or 'base64,' not in body:
        print('FAIL: 产物里找不到内联素材 data URI'); sys.exit(1)

    # 自检 2：云存档模块必须真的在包里（本副本的核心改动）。判据直接从源码的顶层函数名取，
    #         以后 55_cloud.js 增删函数，这条闸跟着自动变，不会变成一句过期的空话。
    cloud_js = os.path.join(JSD, '55_cloud.js')
    if os.path.exists(cloud_js):
        want = top_level_names(io.open(cloud_js, 'r', encoding='utf-8').read())
        missing = sorted(n for n in want if n not in body)
        if missing:
            print('FAIL: 云存档模块的函数没进包: %s' % missing[:10]); sys.exit(1)
        print('云存档自检: 55_cloud.js 的 %d 个顶层函数全部在产物里' % len(want))

    # 打包：先在临时目录摆成 game/index.html 再压 —— 这样 zip 内路径前缀完全可控，
    #      不会把本机绝对路径或暂存目录名带进包。
    tmpd = tempfile.mkdtemp(prefix='zgt_taptap_')
    try:
        inner = os.path.join(tmpd, TAPTAP_DIR)
        os.makedirs(inner)
        shutil.copyfile(html_path, os.path.join(inner, 'index.html'))
        if not os.path.isdir(OUTD):
            os.makedirs(OUTD)
        if os.path.exists(TAPTAP_OUT):
            os.remove(TAPTAP_OUT)
        with zipfile.ZipFile(TAPTAP_OUT, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
            z.write(os.path.join(inner, 'index.html'), '%s/index.html' % TAPTAP_DIR)
        with zipfile.ZipFile(TAPTAP_OUT) as z:
            names = z.namelist()
    finally:
        shutil.rmtree(tmpd, ignore_errors=True)

    # 自检 3：目录规范（TapTap 后台就是按这个判收不收）
    tops = sorted({n.split('/')[0] for n in names})
    if len(tops) != 1 or not re.fullmatch(r'[A-Za-z0-9]+', tops[0]):
        print('FAIL: zip 第一级必须是有且仅有一个纯英文/数字文件夹，实际 %s' % tops); sys.exit(1)
    if '%s/index.html' % TAPTAP_DIR not in names:
        print('FAIL: zip 里找不到 %s/index.html' % TAPTAP_DIR); sys.exit(1)

    print('产物: %s  %s（zip 内: %s）'
          % (TAPTAP_OUT, human(os.path.getsize(TAPTAP_OUT)), ', '.join(names)))
    print('   上传：TapTap 开发者中心 → 你的应用 → 上传包体 → 选这个 zip')


# ============================ 单文件（默认） ============================

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--split', action='store_true',
                    help='拆包模式：产出 dist/web/（多文件 + PWA），与单文件产物互不覆盖')
    ap.add_argument('--taptap', action='store_true',
                    help='TapTap 小游戏模式：先出单文件，再打成 dist/志怪塔_TapTap包体.zip')
    ap.add_argument('--quality', type=int, default=78, help='WebP 质量 1-100（默认 78）')
    ap.add_argument('--max-dim', type=int, default=0, help='图片最长边上限像素，0=不缩放（默认 0）')
    ap.add_argument('--no-webp', action='store_true', help='保留原格式，只做 base64 内联')
    ap.add_argument('--no-obfuscate', action='store_true', help='跳过 JS 混淆')
    args = ap.parse_args()

    if args.split:
        build_split(args)
        return

    if not os.path.exists(SRC):
        print('找不到 %s' % SRC); sys.exit(1)

    html = io.open(SRC, 'r', encoding='utf-8').read()

    # ---- 1. 素材 → ASSET_MAP ----
    if not os.path.isdir(ASSD):
        print('找不到素材目录 %s' % ASSD); sys.exit(1)

    files = collect()
    amap, stat = {}, {'in': 0, 'out': 0, 'n_img': 0, 'n_aud': 0}
    fxsplit = [0, 0]          # [拆了几张精灵图, 一共拆出几排小图]
    for rel, path in files:
        ext = os.path.splitext(path)[1].lower()
        if ext in IMG_EXT:
            # v1.0.9（手机端性能）：`素材/fx/<key>.png` 是 8 列 3840×2880 的整图，
            # 一次挂上去要解 11 Mpx（真机上出牌那一下 100~200ms）⇒ 内联时按排切成小图，
            # 运行时只挂当前那一排（见 js/00_base.js 的 playFx）。画质逐像素不变。
            _fxm = re.match(r'^fx/([a-z][a-z0-9_]*)\.png$', rel)
            if _fxm and not args.no_webp and _fxm.group(1) not in FX_WHOLE_SKIP:
                _rows = fx_row_datauris(path, args.quality)
                if _rows:
                    stat['in'] += os.path.getsize(path)
                    for _k, (_uri, _got) in enumerate(_rows):
                        amap['fx/%s_r%d.png' % (_fxm.group(1), _k)] = _uri
                        stat['out'] += _got; stat['n_img'] += 1
                    fxsplit[0] += 1; fxsplit[1] += len(_rows)
                    continue
            if args.no_webp:
                raw = open(path, 'rb').read()
                mime = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
                        '.webp': 'image/webp', '.gif': 'image/gif', '.bmp': 'image/bmp'}[ext]
                uri = 'data:%s;base64,%s' % (mime, base64.b64encode(raw).decode('ascii'))
                got = len(raw)
            else:
                uri, got, _ = img_datauri(path, args.quality, args.max_dim or None)
            amap[rel] = uri
            stat['in'] += os.path.getsize(path); stat['out'] += got; stat['n_img'] += 1
        elif ext in AUD_MIME:
            uri, got = file_datauri(path)
            amap[rel] = uri
            stat['in'] += os.path.getsize(path); stat['out'] += got; stat['n_aud'] += 1
        else:
            print('  跳过非素材文件: %s' % rel)

    _sfx = sorted(k for k in amap if k.startswith('sfx/'))
    _sfxsz = sum(os.path.getsize(os.path.join(ASSD, k.replace('/', os.sep))) for k in _sfx)
    print('素材 %d 个（图 %d / 音 %d，含音效 sfx/ %d 个 %.0f KB）: %s → %s'
          % (len(amap), stat['n_img'], stat['n_aud'], len(_sfx), _sfxsz / 1024.0,
             human(stat['in']), human(stat['out'])))
    if fxsplit[0]:
        print('  fx 精灵图 %d 张 → 按排 %d 张小图（整图一次解 11 Mpx → 按排 1.8 Mpx）'
              % (fxsplit[0], fxsplit[1]))

    # ---- 2. 收集脚本（v0.61.05：源码已拆成 js/*.js，按文档顺序合回单文件） ----
    #     开发源：<script src="js/xx.js">；产物：内联 <script>（两者共用这一条路径）
    pieces, spans = [], []
    for mm in re.finditer(r'<script(\s[^>]*)?>([\s\S]*?)</script>', html, re.I):
        attrs = mm.group(1) or ''
        src = re.search(r'\bsrc\s*=\s*"([^"]+)"', attrs, re.I)
        if src:
            fp = os.path.join(ROOT, src.group(1).replace('/', os.sep))
            if not os.path.exists(fp):
                print('FAIL: 找不到脚本 %s' % fp); sys.exit(1)
            pieces.append(io.open(fp, 'r', encoding='utf-8', newline='').read())
        else:
            pieces.append(mm.group(2))
        spans.append((mm.start(), mm.end()))
    if not spans:
        print('FAIL: 找不到 <script>'); sys.exit(1)
    js = '\n'.join(pieces)
    print('脚本 %d 段 → %s' % (len(pieces), human(len(js.encode('utf-8')))))

    # ASSET_MAP 改由构建期注入到同一 <script> 开头，所以把源码里的 null 声明摘掉
    stub = 'var ASSET_MAP = null;'
    if js.count(stub) != 1:
        print('FAIL: 源码里 "%s" 出现 %d 次（期望 1）——打包脚本与源码不同步'
              % (stub, js.count(stub))); sys.exit(1)
    js = js.replace(stub, '/* ASSET_MAP 由构建脚本注入在本 <script> 开头 */')

    # ---- 3. 混淆 ----
    reserved = sorted(inline_handler_names(html) & top_level_names(js))
    if args.no_obfuscate:
        js_out = js
        obf_note = '未混淆（--no-obfuscate）'
    else:
        if not os.path.isdir(NODE_MODULES):
            print('缺 javascript-obfuscator，先跑: npm install --prefix _build javascript-obfuscator')
            sys.exit(1)
        fd, tmpjs = tempfile.mkstemp(suffix='.js'); os.close(fd)
        fd, tmpout = tempfile.mkstemp(suffix='.js'); os.close(fd)
        io.open(tmpjs, 'w', encoding='utf-8', newline='').write(js)
        r = subprocess.run(['node', OBF, tmpjs, tmpout, json.dumps(reserved)],
                           capture_output=True, text=True, cwd=ROOT)
        if r.returncode != 0:
            print('NODE_FAIL:'); print(r.stdout); print(r.stderr); sys.exit(1)
        js_out = io.open(tmpout, 'r', encoding='utf-8').read()
        os.unlink(tmpjs); os.unlink(tmpout)
        obf_note = '已混淆，保留 %d 个全局名' % len(reserved)

        # 保险：内联处理器依赖的全局名必须还在混淆产物里
        missing = [n for n in reserved if n not in js_out]
        if missing:
            print('FAIL: 混淆后丢失全局名 %s' % missing[:20]); sys.exit(1)

    # </script> 出现在 JS 里会提前闭合标签；转义成 <\/script>（JS 字符串语义等价）
    js_out = js_out.replace('</script>', '<\\/script>')

    # ---- 4. 拼装（用首段 <script> 的起点到末段 </script> 的终点替换掉全部脚本标签） ----
    prefix = 'var ASSET_MAP=' + json.dumps(amap, ensure_ascii=False, separators=(',', ':')) + ';\n'
    html_out = html[:spans[0][0]] + '<script>\n' + prefix + js_out + '\n</script>' + html[spans[-1][1]:]

    # 静态 HTML 里写死的图标（不在 JS 里，走不了 assetURL）
    rune = amap.get('rune.png')
    if rune:
        n = html_out.count('src="素材/rune.png"')
        html_out = html_out.replace('src="素材/rune.png"', 'src="%s"' % rune)
        print('内联静态图标 rune.png: %d 处' % n)

    # ---- 5. 隐私自检：产物里不该出现任何本地路径 / 仓库文件 ----
    leaks = []
    for pat in (r'[A-Za-z]:\\\\', r'C:/Users', r'C:\\Users', r'Desktop', r'\.git/', r'_patch', r'memory-bank', r'enemy_backup'):
        if re.search(pat, html_out):
            leaks.append(pat)
    if leaks:
        print('!! 隐私自检命中可疑字符串: %s' % leaks)
        print('   （ASSET_MAP 里的 data URI 不含路径；横幅注释里也别写仓库内部路径，'
              '否则每打一次都误报）')

    if not os.path.isdir(OUTD):
        os.makedirs(OUTD)
    io.open(OUT, 'w', encoding='utf-8', newline='').write(html_out)

    print('产物: %s  %s   （%s）' % (OUT, human(os.path.getsize(OUT)), obf_note))
    print('脚本: %s → %s' % (human(len(js.encode('utf-8'))), human(len(js_out.encode('utf-8')))))

    if args.taptap:
        build_taptap(OUT)


if __name__ == '__main__':
    main()
