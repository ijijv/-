# -*- coding: utf-8 -*-
"""单文件打包产物校验（冒烟测试测不到的部分）

冒烟用的是 DOM 桩，验证不了：
  1. 素材是不是**真的**能取到（data URI key 与游戏请求的路径是否精确匹配）
  2. 内联 onclick="xxx()" 依赖的全局函数名在混淆后是否还在
  3. 产物里有没有泄漏本地路径 / 仓库文件

用法: python _patch/verify_dist.py [dist/志怪塔.html]
"""
import io, os, re, sys, json, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, '原型.html')
ASSD = os.path.join(ROOT, '素材')
DIST = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', '志怪塔.html')
HOST = os.path.join(ROOT, '_patch', 'smoke_host.js')
SKIP_DIRS = {'enemy_backup'}

fails, warns = [], []


def check(cond, msg):
    if cond:
        print('  ok   %s' % msg)
    else:
        print('  FAIL %s' % msg)
        fails.append(msg)


def dump_ids():
    """在游戏作用域里求值，拿到所有需要素材的 id 清单。"""
    # 注意：smoke_host 会对求值结果自己做 JSON.stringify，所以这里给对象表达式即可
    js = ("({cards:CARDS.map(c=>c.id),heroes:HEROES.map(h=>h.id),"
          "relics:RELICS.map(r=>r.id),enemies:Object.keys(ENEMIES),"
          "bg:['menu'].concat(ACTS.map((a,i)=>'act'+(i+1))),"
          # 必须命中：缺任何一个都是 bug
          "music:['menu','map','battle'],"
          # v0.61.31 起代码支持这三条升级轨，但**缺文件时会退回基础轨**（Boss/精英→battle、商店→map），
          # 所以它们不是「必须命中」，而是「交付即生效」。只用于把已交付的从 unused 里排掉。
          "musicOptional:['battle_elite','battle_boss','shop'],"
          # 代码里的已知轨名（唯一真相源）—— 用来断言下面两张 listing 没和代码漂移
          "bgmTracks:BGM_KNOWN_TRACKS,"
          "sfxKeys:SFX_KEYS,sfxExts:AUD_EXTS})")
    env = dict(os.environ, SMOKE_DUMP=js)
    r = subprocess.run(['node', HOST], capture_output=True, text=True, cwd=ROOT, env=env)
    line = [l for l in r.stdout.splitlines() if l.startswith('__DUMP__')]
    if not line:
        print('取 id 清单失败（SMOKE_DUMP）'); print(r.stdout[-2000:]); print(r.stderr[-2000:]); sys.exit(2)
    return json.loads(line[0][len('__DUMP__'):])


def main():
    html = io.open(DIST, 'r', encoding='utf-8').read()
    src  = io.open(SRC, 'r', encoding='utf-8').read()

    m = re.search(r'var ASSET_MAP=(\{[\s\S]*?\});\s*\n', html)
    if not m:
        print('FAIL: 产物里找不到 ASSET_MAP'); sys.exit(2)
    amap = json.loads(m.group(1))
    keys = set(amap.keys())
    print('产物 %s  %.2f MB, ASSET_MAP 共 %d 个素材\n' % (DIST, os.path.getsize(DIST)/1048576.0, len(keys)))

    # ---- 1. 游戏要的每个素材都在 map 里 ----
    print('[1] 素材覆盖（游戏请求路径 → ASSET_MAP 命中）')
    ids = dump_ids()
    want = []
    want += [('card/%s.png' % i) for i in ids['cards']]
    want += [('hero/%s.png' % i) for i in ids['heroes']]
    want += [('relic/%s.png' % i) for i in ids['relics']]
    want += [('enemy/%s.png' % i) for i in ids['enemies']]
    want += [('bg/bg_%s.png' % i) for i in ids['bg']]
    # BGM 不能只认 .mp3 —— BGM_EXTS 的顺序是 ogg 优先，交付格式变了不该假红（v0.61.34）
    _audio = io.open(os.path.join(ROOT, 'js', '10_audio.js'), 'r', encoding='utf-8').read()
    _mb = re.search(r'const BGM_EXTS\s*=\s*\[([^\]]*)\]', _audio)
    bgm_exts = re.findall(r"'([^']+)'", _mb.group(1)) if _mb else []
    check(bool(bgm_exts), '从 10_audio.js 解析到 BGM_EXTS（%s）' % ','.join(bgm_exts))
    miss_music = ['music/bgm_%s{%s}' % (i, ','.join(bgm_exts)) for i in ids['music']
                  if not any(('music/bgm_%s%s' % (i, e)) in keys for e in bgm_exts)]
    want += ['rune.png']
    miss = [w for w in want if w not in keys]
    check(not miss, '游戏请求的 %d 个素材全部命中' % len(want))
    for w in miss[:20]:
        print('       缺: %s' % w)
    check(not miss_music, '%d 首基础 BGM 各有一个扩展名命中' % len(ids['music']))
    for w in miss_music:
        print('       缺: %s' % w)

    # ---- 1b. 音效扩展名：两个真相源必须一致（bug B 漂移闸） ----
    print('\n[1b] 音效扩展名真相源一致')
    _aud = io.open(os.path.join(ROOT, 'js', '10_audio.js'), 'r', encoding='utf-8').read()
    _m = re.search(r'const AUD_EXTS\s*=\s*\[([^\]]*)\]', _aud)
    exts_code = sorted(re.findall(r"'([^']+)'", _m.group(1))) if _m else []
    _pk = io.open(os.path.join(ROOT, '打包.py'), 'r', encoding='utf-8').read()
    _m2 = re.search(r'AUD_MIME\s*=\s*\{([^}]*)\}', _pk)
    # 只取字典的**键**：值是 'audio/mpeg' 这类 MIME，混进来会假失败
    exts_pack = sorted(set(re.findall(r"'([^']+)'\s*:", _m2.group(1)))) if _m2 else []
    check(bool(exts_code) and bool(exts_pack),
          '两边都解析到扩展名表（代码 %s / 打包 %s）' % (','.join(exts_code), ','.join(exts_pack)))
    check(exts_code == exts_pack,
          'AUD_EXTS == 打包.py AUD_MIME（%s vs %s）' % (','.join(exts_code), ','.join(exts_pack)))
    check('.m4a' in exts_code, '扩展名表含 .m4a（bug B：打包会收但播放探测不到）')
    check(sorted(exts_code) == sorted(ids['sfxExts']), '产物内 AUD_EXTS 与源码一致')

    # ---- 1c. BGM 轨名：代码真相源 vs 本脚本的 必需/可选 两张 listing ----
    print('\n[1c] BGM 轨名真相源一致')
    tracks_code = sorted(ids.get('bgmTracks') or [])
    tracks_doc = sorted(set(ids['music']) | set(ids['musicOptional']))
    check(bool(tracks_code), '代码里取到 BGM_KNOWN_TRACKS（%s）' % ','.join(tracks_code))
    check(tracks_code == tracks_doc,
          'BGM_KNOWN_TRACKS == 本脚本的 必需+可选 listing（%s vs %s）'
          % (','.join(tracks_code), ','.join(tracks_doc)))

    # ---- 2. 磁盘上的素材没被漏掉 ----
    print('\n[2] 磁盘素材完整性（除 enemy_backup）')
    disk = set()
    for dp, dns, fns in os.walk(ASSD):
        dns[:] = [d for d in dns if d not in SKIP_DIRS]
        for fn in fns:
            ext = os.path.splitext(fn)[1].lower()
            if ext in ('.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.mp3', '.ogg', '.wav', '.m4a'):
                disk.add(os.path.relpath(os.path.join(dp, fn), ASSD).replace('\\', '/'))
    check(disk <= keys, '磁盘 %d 个素材全部打进产物（漏 %d）' % (len(disk), len(disk - keys)))
    for d in sorted(disk - keys)[:10]:
        print('       漏: %s' % d)

    # ---- 2b. 音效文件命名（键名拼错会静默回退合成，这里拦住） ----
    print('\n[2b] 素材/sfx/ 命名合规')
    sfxkeys = set(ids['sfxKeys'])
    disksfx = sorted(d for d in disk if d.startswith('sfx/'))
    badname, badkey, badvar, badext = [], [], [], []
    for d in disksfx:
        base, ext = os.path.splitext(os.path.basename(d))
        if ext.lower() not in exts_code:
            badext.append(d); continue
        stem = base
        mm = re.match(r'^(.*)_(\d+)$', base)
        if mm:
            stem, var = mm.group(1), int(mm.group(2))
            if var < 1 or var > 3:
                badvar.append(d); continue
        if not re.match(r'^[a-z][a-z0-9_]*$', stem):
            badname.append(d); continue
        if stem not in sfxkeys:
            badkey.append(d)
    check(not badext, '扩展名都在 %s 内（坏 %d）' % (','.join(exts_code), len(badext)))
    check(not badvar, '变体号都在 1..3（坏 %d）' % len(badvar))
    check(not badname, '键名部分只用小写/数字/下划线（坏 %d）' % len(badname))
    check(not badkey, '%d 个音效文件的键名都在 SFX_TABLE 里（未知 %d）' % (len(disksfx), len(badkey)))
    for lbl, lst in (('扩展名', badext), ('变体号', badvar), ('文件名字符', badname), ('未知键名', badkey)):
        for x in lst[:8]:
            print('       %s: %s' % (lbl, x))
    if disksfx:
        _sz = sum(os.path.getsize(os.path.join(ASSD, d.replace('/', os.sep))) for d in disksfx)
        _named = set(re.sub(r'_\d+$', '', os.path.splitext(os.path.basename(d))[0]) for d in disksfx)
        print('  注: 素材/sfx/ 共 %d 个文件 %.0f KB，覆盖 %d / %d 个键（其余走合成）'
              % (len(disksfx), _sz / 1024.0, len(_named), len(sfxkeys)))
    else:
        print('  注: 素材/sfx/ 不存在或为空 —— 全部音效走 WebAudio 合成（可接受）')

    # ---- 2c. BGM 文件名（人工交付，拼错 = 静默走回退轨 → 这里拦住） ----
    print('\n[2c] 素材/music/ 命名合规')
    _bgmset = set(ids.get('bgmTracks') or [])
    diskbgm = sorted(d for d in disk if d.startswith('music/'))
    badshape, badstem, have = [], [], set()
    for d in diskbgm:
        base, ext = os.path.splitext(os.path.basename(d))
        if ext.lower() not in bgm_exts or not base.startswith('bgm_'):
            badshape.append(d); continue
        stem = base[len('bgm_'):]
        if stem in _bgmset:
            have.add(stem)
        else:
            badstem.append(d)
    check(not badshape, 'music/ 下都是 bgm_<轨>.<%s>（坏 %d）' % (','.join(bgm_exts), len(badshape)))
    check(not badstem,
          '%d 个 BGM 文件的轨名都在 BGM_KNOWN_TRACKS 里（未知 %d）' % (len(diskbgm), len(badstem)))
    for x in badshape[:8]:
        print('       命名: %s' % x)
    for x in badstem[:8]:
        print('       未知轨名: %s —— 代码永远不会请求它，游戏里听到的是回退轨' % x)
    print('  注: 磁盘上 %d 条轨（%s）' % (len(have), '、'.join(sorted(have)) or '无'))
    _missing = sorted(_bgmset - have)
    if _missing:
        print('  注: 代码已知但磁盘没有：%s —— 会走回退轨（精英/Boss→battle、商店→map），不算错误'
              % '、'.join(_missing))

    # ---- 3. 内联处理器依赖的全局名在混淆后仍存在 ----
    print('\n[3] 内联 onclick 全局名存活')
    # 处理器名从**产物**里抓（真正会被浏览器调用的那批）；
    # 顶层声明从**拆分后的 js/*.js 源码**里抓 —— 自 v0.61.05 起 原型.html 已无内联脚本体
    # （只有 <script src="js/xx.js">），旧的 re.search('<script>…</script>', src) 必然返回 None。
    names = set()
    for attr in re.findall(r'\son[a-z]+\s*=\s*"([^"]*)"', html):
        names |= set(re.findall(r'[A-Za-z_$][\w$]*', attr))
    _jsdir = os.path.join(ROOT, 'js')
    js_src = '\n'.join(io.open(os.path.join(_jsdir, f), 'r', encoding='utf-8').read()
                       for f in sorted(os.listdir(_jsdir)) if f.endswith('.js'))
    top = set(re.findall(r'^function\s+([A-Za-z_$][\w$]*)', js_src, re.M))
    top |= set(re.findall(r'^(?:var|let|const)\s+([A-Za-z_$][\w$]*)', js_src, re.M))
    need = sorted(names & top)
    gone = [n for n in need if not re.search(r'\b%s\b' % re.escape(n), html)]
    check(not gone, '内联处理器依赖的 %d 个全局名全部存活' % len(need))
    for g in gone[:20]:
        print('       丢: %s' % g)

    # ---- 4. 隐私 ----
    print('\n[4] 隐私扫描')
    bad = {
        # 前置不能是字母，否则 'http://…' 里的 'p:/' 会假命中
        '盘符路径': r'(?<![A-Za-z])[A-Za-z]:\\\\|(?<![A-Za-z])[A-Za-z]:/',
        '用户目录': r'C:\\\\Users|C:/Users',
        '仓库文件': r'\.git/|\.git\\\\|_patch|memory-bank|enemy_backup',
        '桌面路径': r'Desktop',
    }
    for label, pat in bad.items():
        hit = re.findall(pat, html)
        check(not hit, '不含 %s（%d 处）' % (label, len(hit)))
        if hit:
            print('       样例: %s' % hit[:5])

    # ---- 5. 结构 ----
    print('\n[5] 结构')
    check(html.count('<script>') == 1, '只有 1 个 <script> 标签（实际 %d）' % html.count('<script>'))
    check(html.count('</script>') == 1, '只有 1 个 </script> 标签（实际 %d）' % html.count('</script>'))
    # 提示项，不作断言：stringArrayThreshold=0.75 意味着约 1/4 的字符串保留明文，
    # 哪些字符串被编码随输入变化（同样输入 + 固定 seed 才稳定），命中与否都不影响功能与隐私。
    print('  注: 产物中 %s "%s" 明文' % ('存在' if '素材/' in html else '不存在', '素材/'))

    # 「可选覆盖」的两类，没文件都有兜底，故不算未使用：
    #   · 音效 sfx/：没文件就走程序化合成
    #   · 三条升级轨：没文件就退回基础轨（v0.61.31，Boss/精英→battle、商店→map）
    # 其余素材缺一个就是真缺（[1] 会报），这里只盘点「打进来但游戏永远不会请求」的。
    # BGM 六条轨**全部**算「可选覆盖」：基础三首没文件走合成、三条升级轨没文件走回退轨。
    # 注意别只排 musicOptional —— 基础三首自 [1] 起不再进 want（改为任一扩展名判定），
    # 漏排会让它们在这里假报「从未被请求」（本批第一版就是这个假警报）。
    optional_music = set('music/bgm_%s%s' % (t, e)
                         for t in (ids['music'] + ids['musicOptional']) for e in bgm_exts)
    unused = sorted(k for k in (keys - set(want))
                    if not k.startswith('sfx/') and k not in optional_music)
    if unused:
        tot = sum(os.path.getsize(os.path.join(ASSD, u)) for u in unused if os.path.exists(os.path.join(ASSD, u)))
        print('\n  注: %d 个素材从未被游戏请求（可考虑从 素材/ 删掉，省 %.0f KB）: %s'
              % (len(unused), tot/1024.0, unused))

    print('\n===== %s =====' % ('全部通过' if not fails else '%d 项失败' % len(fails)))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
