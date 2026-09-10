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
          "bg:['menu'].concat(ACTS.map((a,i)=>'act'+(i+1))),music:['menu','map','battle']})")
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
    want += [('music/bgm_%s.mp3' % i) for i in ids['music']]
    want += ['rune.png']
    miss = [w for w in want if w not in keys]
    check(not miss, '游戏请求的 %d 个素材全部命中' % len(want))
    for w in miss[:20]:
        print('       缺: %s' % w)

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

    # ---- 3. 内联处理器依赖的全局名在混淆后仍存在 ----
    print('\n[3] 内联 onclick 全局名存活')
    names = set()
    for attr in re.findall(r'\son[a-z]+\s*=\s*"([^"]*)"', src):
        names |= set(re.findall(r'[A-Za-z_$][\w$]*', attr))
    js_src = re.search(r'<script>([\s\S]*?)</script>', src).group(1)
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
        '盘符路径': r'[A-Za-z]:\\\\|[A-Za-z]:/',
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
    # ASSET_BASE 常量的字面量也被混淆进字符串表了，产物里连素材目录名都不以明文出现
    check('素材/' not in html, '产物中无明文的 素材/ 引用（回退常量已进字符串表）')

    unused = sorted(keys - set(want))
    if unused:
        tot = sum(os.path.getsize(os.path.join(ASSD, u)) for u in unused if os.path.exists(os.path.join(ASSD, u)))
        print('\n  注: %d 个素材从未被游戏请求（可考虑从 素材/ 删掉，省 %.0f KB）: %s'
              % (len(unused), tot/1024.0, unused))

    print('\n===== %s =====' % ('全部通过' if not fails else '%d 项失败' % len(fails)))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
