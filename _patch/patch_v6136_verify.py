# -*- coding: utf-8 -*-
"""v0.61.36 · ④ verify_dist.py 误报修正：card/yuanqi.png + 数字图四档 listing

两件事，性质完全不同，别混：

 ① `card/yuanqi.png` 是**真误报**（我上一批报错了）——
    `yuanqi`（怨气）是**运行时生成**的废牌（`20_data.js` 的 `junkCard()`，由敌人词缀「飞牌」塞进手牌），
    它**不在 CARDS 里**；而 `want` 是从 `CARDS.map(c=>c.id)` 拼的 → 永远漏掉它 →
    一张**真在用**的图被报成「从未被请求」。修法：`dump_ids()` 补一个来源 `junk:[junkCard().id]`，
    并把它加进 `want`（这张图磁盘上确实有，属于「必须命中」）。

 ② 数字图 `素材/num/{四档}/0-9.png`（40 张）**一张都还没交付** ——
    所以它们**绝不能进 `want`**：`want` 是「必须命中」清单（`check(not miss, ...)`），
    图不在就会直接 FAIL 掉打包校验。计划里写的「补进 want 的 40 条」在这里必须改成
    **只喂 unused 排重**的清单（照 `musicOptional` 的先例：「不是必须命中，而是交付即生效」）。
    这样图一到手就自动从「从未被请求」里消失，没到手也不会假红。

    顺带按本脚本既有的「真相源」风格，四档目录名从 `00_base.js` 的 `NUM_KIND_DIR` 里解析，
    不在校验脚本里重抄一遍字符串 —— 代码改了目录名，这里跟着走。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = os.path.join(ROOT, '_patch', 'verify_dist.py')

raw = io.open(V, encoding='utf-8').read()
nl = '\r\n' if '\r\n' in raw else '\n'
body = raw.replace('\r\n', '\n')
errs = []


def rep(old, new, tag):
    global body
    n = body.count(old)
    if n != 1:
        errs.append('[%s] 命中 %d 次，期望 1 次' % (tag, n))
        return
    body = body.replace(old, new, 1)


# ── 1. dump_ids：补 junkCard()（运行时废牌「怨气」，不在 CARDS 里） ──
rep('''          "sfxKeys:SFX_KEYS,sfxExts:AUD_EXTS})")''',
    '''          # v0.61.36：「怨气」是**运行时生成**的废牌（junkCard()，由敌人词缀「飞牌」塞进手牌），
          # 不在 CARDS 里，卡图却是真在用的 card/yuanqi.png —— 漏了它就会把它误报成「从未被请求」
          "junk:[junkCard().id],"
          "sfxKeys:SFX_KEYS,sfxExts:AUD_EXTS})")''',
    'dump_ids 补 junkCard')

# ── 2. want 补 card/yuanqi.png（必须命中） ──
rep('''    want += [('bg/bg_%s.png' % i) for i in ids['bg']]
''',
    '''    want += [('bg/bg_%s.png' % i) for i in ids['bg']]
    # v0.61.36：运行时废牌「怨气」的卡图（旧版漏掉 → 真在用的图被误报为 unused）
    want += [('card/%s.png' % i) for i in ids['junk']]
''',
    'want 补 yuanqi')

# ── 3. 数字图四档 listing：只喂 unused 排重，不做「必须命中」──
rep('''    check(not miss_music, '%d 首基础 BGM 各有一个扩展名命中' % len(ids['music']))
    for w in miss_music:
        print('       缺: %s' % w)
''',
    '''    check(not miss_music, '%d 首基础 BGM 各有一个扩展名命中' % len(ids['music']))
    for w in miss_music:
        print('       缺: %s' % w)

    # ---- 1d. 数字图（素材/num）四档交付单：目录名从代码取，只用于 unused 排重 ----
    print('\\n[1d] 数字图 素材/num 四档（交付即生效，不算「必须命中」）')
    _base = io.open(os.path.join(ROOT, 'js', '00_base.js'), 'r', encoding='utf-8').read()
    _mn = re.search(r'const NUM_KIND_DIR\\s*=\\s*\\{([^}]*)\\}', _base)
    num_dirs = sorted(set(re.findall(r":\\s*'([^']+)'", _mn.group(1)))) if _mn else []
    check(len(num_dirs) == 4,
          '从 00_base.js 的 NUM_KIND_DIR 解析到 4 档目录名（%s）' % ','.join(num_dirs))
    num_want = ['num/%s/%d.png' % (d, i) for d in num_dirs for i in range(10)]
    got = [n for n in num_want if n in keys]
    check(len(num_want) == 40, '四档 × 10 = 40 条数字图路径（%d）' % len(num_want))
    print('       交付进度: %d / 40 张已打进产物' % len(got))
''',
    '新增 1d 数字图 listing')

# ── 4. unused 排重：把数字图四档也算进「已知会被请求」 ──
rep('''    unused = sorted(k for k in (keys - set(want))
                    if not k.startswith('sfx/') and k not in optional_music)
''',
    '''    # v0.61.36：数字图（交付即生效）与 musicOptional 同理 —— 只用来排重，不做「必须命中」
    unused = sorted(k for k in (keys - set(want) - set(num_want))
                    if not k.startswith('sfx/') and k not in optional_music)
''',
    'unused 排重')

if errs:
    print('=== 锚点校验失败，未写入任何文件 ===')
    for e in errs:
        print(' ✗', e)
    sys.exit(1)

io.open(V, 'w', encoding='utf-8', newline='').write(body.replace('\n', nl))
print('OK verify_dist.py %d 字符' % len(body))