# -*- coding: utf-8 -*-
"""
志怪塔 · 单文件打包

把 原型.html + 素材/ 打成**一个自包含的离线 HTML**，用来发给朋友试玩。

产物: dist/志怪塔.html

它做了什么:
  1. 素材图片 PNG → WebP（有损压缩，默认质量 78），体积约降 60~75%
  2. 图片 / 音乐 全部 base64 内联成 data URI，写进源码的 ASSET_MAP
  3. 把 原型.html 里的 <script src="js/*.js"> 按文档顺序合回一段正文，
     经 javascript-obfuscator 压缩混淆（renameGlobals=false，保住内联 onclick 依赖的全局函数名）
  4. 不含 .git / _patch / _build / memory-bank / 立项文档 / 数值表 —— 只有游戏本体

用法:
  python 打包.py                    # 默认：WebP q78 + 混淆
  python 打包.py --quality 60       # 更小
  python 打包.py --no-obfuscate     # 跳过混淆（排查问题时用）
  python 打包.py --no-webp          # 保留原 PNG，只内联
"""
import io, os, re, sys, json, base64, argparse, subprocess, tempfile

try:
    from PIL import Image
except ImportError:
    print('需要 Pillow:  pip install Pillow'); sys.exit(1)

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(ROOT, '原型.html')
ASSD = os.path.join(ROOT, '素材')
OUTD = os.path.join(ROOT, 'dist')
OUT  = os.path.join(OUTD, '志怪塔.html')
OBF  = os.path.join(ROOT, '_build', 'obf.js')
NODE_MODULES = os.path.join(ROOT, '_build', 'node_modules')

SKIP_DIRS = {'enemy_backup'}          # 抠图前备份原图，游戏从不加载
IMG_EXT = {'.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'}
AUD_MIME = {'.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4'}


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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--quality', type=int, default=78, help='WebP 质量 1-100（默认 78）')
    ap.add_argument('--max-dim', type=int, default=0, help='图片最长边上限像素，0=不缩放（默认 0）')
    ap.add_argument('--no-webp', action='store_true', help='保留原格式，只做 base64 内联')
    ap.add_argument('--no-obfuscate', action='store_true', help='跳过 JS 混淆')
    args = ap.parse_args()

    if not os.path.exists(SRC):
        print('找不到 %s' % SRC); sys.exit(1)

    html = io.open(SRC, 'r', encoding='utf-8').read()

    # ---- 1. 素材 → ASSET_MAP ----
    if not os.path.isdir(ASSD):
        print('找不到素材目录 %s' % ASSD); sys.exit(1)

    files = collect()
    amap, stat = {}, {'in': 0, 'out': 0, 'n_img': 0, 'n_aud': 0}
    for rel, path in files:
        ext = os.path.splitext(path)[1].lower()
        if ext in IMG_EXT:
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


if __name__ == '__main__':
    main()
