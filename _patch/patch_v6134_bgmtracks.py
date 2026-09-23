# -*- coding: utf-8 -*-
"""v0.61.34 · BGM 六轨「核实 + 轨名真相源」

用户 2026-09-23 交付 6 首 BGM（menu/map/battle 替换，battle_elite/battle_boss/shop 新增），
2026-09-24 要求「接上、普通和精英也要分开」。核实结论：**接线在 v0.61.31 已完成**
（battleBgmFor 普通/精英/Boss 分流 + BGM_FALLBACK 缺轨回退 + 商店/营地/事件走 shop），
我上一条提交信息里写的「代码仍只认三轨，接线未做」是错的。本批不重写接线，做两件事：

1. 新增 `BGM_KNOWN_TRACKS` 作为**轨名唯一真相源** —— BGM 文件是人工按名交付的，
   拼错（bgm_elite.mp3）不会报错、只会静默走回退轨，玩家以为「没接上」。
   `verify_dist.py` 的 [2c] 段拿这张表逐文件核对磁盘。
2. 补 verify_dist 的两处口径问题：[1] 基础 BGM 命中原来硬写 .mp3（BGM_EXTS 实为 ogg 优先，
   交付格式变了会假红）；[1c] 断言代码真相源 == 脚本 listing，防校验脚本自身漂移。

不改任何接线、不改数值、不改卡牌效果。新增冒烟断言 13 条。
"""
import io, os, sys, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'js', '10_audio.js')
B = os.path.join(ROOT, 'js', '60_boot.js')
H = os.path.join(ROOT, '原型.html')
V = os.path.join(ROOT, '_patch', 'verify_dist.py')
S = os.path.join(ROOT, '_patch', 'smoke_runner.js')
L = os.path.join(ROOT, '更新日志.md')

files = {}
for p in (A, B, H, V, S, L):
    raw = io.open(p, encoding='utf-8').read()
    files[p] = {'nl': '\r\n' if '\r\n' in raw else '\n', 'body': raw.replace('\r\n', '\n')}

errs = []


def rep(path, old, new, want=1, tag=''):
    """单块替换；命中数不符则记错，不写。"""
    b = files[path]['body']
    n = b.count(old)
    if n != want:
        errs.append('[%s] %s：命中 %d 次，期望 %d 次'
                    % (os.path.basename(path), tag or old[:44].replace('\n', '\\n'), n, want))
        return
    files[path]['body'] = b.replace(old, new, 1 if want == 1 else want)


# ═══════════════════ 1. 轨名真相源 ═══════════════════
rep(A,
    "const BGM_FALLBACK = { battle_elite:'battle', battle_boss:'battle', shop:'map' };\n",
    "/* 已知轨名的**唯一真相源**：素材/music/ 下的每个文件都该是 bgm_<轨>.<ext>，\n"
    "   且 <轨> 落在这张表里。为什么值得单列一张表：BGM 文件是**人工按名交付**的，\n"
    "   拼错（bgm_elite.mp3 / bgm_battle_Elite.mp3）不会报任何错 —— 代码探不到文件就静默\n"
    "   走回退轨，你听到的是普通战斗曲，还以为「没接上」。_patch/verify_dist.py 的 [2c] 段\n"
    "   拿这张表逐文件核对磁盘（与 AUD_EXTS 同一套「真相源 + 断言」惯例）。 */\n"
    "const BGM_KNOWN_TRACKS = ['menu','map','battle','battle_elite','battle_boss','shop'];\n"
    "const BGM_FALLBACK = { battle_elite:'battle', battle_boss:'battle', shop:'map' };\n",
    tag='BGM_KNOWN_TRACKS')

# ═══════════════════ 2. 未登记轨名只警告不抛错 ═══════════════════
rep(A,
    "function setBGM(track){ CUR_BGM=track; startBGM(bgmTrackFor(track)); }\n",
    "let BGM_WARNED = {};   // 未登记的轨名只提醒一次，不刷屏\n"
    "function setBGM(track){\n"
    "  /* 轨名没登记 → 素材/music/bgm_<轨>.* 就算躺在磁盘上也不会被请求到（拼错 = 静默无声）。\n"
    "     战斗中不能因为一个轨名拼错就抛异常，所以只警告一次、照旧往下走（探测/合成兜底）。 */\n"
    "  if(BGM_KNOWN_TRACKS.indexOf(track)<0 && !BGM_WARNED[track]){\n"
    "    BGM_WARNED[track]=1;\n"
    "    if(typeof console!=='undefined' && console.warn)\n"
    "      console.warn('未登记的 BGM 轨名：'+track+'（素材/music/bgm_'+track+'.* 不会被请求到）');\n"
    "  }\n"
    "  CUR_BGM=track; startBGM(bgmTrackFor(track));\n"
    "}\n",
    tag='setBGM 未登记轨名警告')

# ═══════════════════ 3. verify_dist：dump 出轨名真相源 ═══════════════════
rep(V,
    "          \"sfxKeys:SFX_KEYS,sfxExts:AUD_EXTS})\")",
    "          # 代码里的已知轨名（唯一真相源）—— 用来断言下面两张 listing 没和代码漂移\n"
    "          \"bgmTracks:BGM_KNOWN_TRACKS,\"\n"
    "          \"sfxKeys:SFX_KEYS,sfxExts:AUD_EXTS})\")",
    tag='dump bgmTracks')

# ═══════════════════ 4. verify_dist [1]：BGM 命中改为任一扩展名 ═══════════════════
rep(V,
    "    want += [('music/bgm_%s.mp3' % i) for i in ids['music']]\n",
    "    # BGM 不能只认 .mp3 —— BGM_EXTS 的顺序是 ogg 优先，交付格式变了不该假红（v0.61.34）\n"
    "    _audio = io.open(os.path.join(ROOT, 'js', '10_audio.js'), 'r', encoding='utf-8').read()\n"
    "    _mb = re.search(r'const BGM_EXTS\\s*=\\s*\\[([^\\]]*)\\]', _audio)\n"
    "    bgm_exts = re.findall(r\"'([^']+)'\", _mb.group(1)) if _mb else []\n"
    "    check(bool(bgm_exts), '从 10_audio.js 解析到 BGM_EXTS（%s）' % ','.join(bgm_exts))\n"
    "    miss_music = ['music/bgm_%s{%s}' % (i, ','.join(bgm_exts)) for i in ids['music']\n"
    "                  if not any(('music/bgm_%s%s' % (i, e)) in keys for e in bgm_exts)]\n",
    tag='BGM 任一扩展名')

rep(V,
    "    for w in miss[:20]:\n"
    "        print('       缺: %s' % w)\n",
    "    for w in miss[:20]:\n"
    "        print('       缺: %s' % w)\n"
    "    check(not miss_music, '%d 首基础 BGM 各有一个扩展名命中' % len(ids['music']))\n"
    "    for w in miss_music:\n"
    "        print('       缺: %s' % w)\n",
    tag='BGM 命中断言')

# ═══════════════════ 5. verify_dist [1c]：代码真相源 == 脚本 listing ═══════════════════
rep(V,
    "    # ---- 2. 磁盘上的素材没被漏掉 ----\n",
    "    # ---- 1c. BGM 轨名：代码真相源 vs 本脚本的 必需/可选 两张 listing ----\n"
    "    print('\\n[1c] BGM 轨名真相源一致')\n"
    "    tracks_code = sorted(ids.get('bgmTracks') or [])\n"
    "    tracks_doc = sorted(set(ids['music']) | set(ids['musicOptional']))\n"
    "    check(bool(tracks_code), '代码里取到 BGM_KNOWN_TRACKS（%s）' % ','.join(tracks_code))\n"
    "    check(tracks_code == tracks_doc,\n"
    "          'BGM_KNOWN_TRACKS == 本脚本的 必需+可选 listing（%s vs %s）'\n"
    "          % (','.join(tracks_code), ','.join(tracks_doc)))\n"
    "\n"
    "    # ---- 2. 磁盘上的素材没被漏掉 ----\n",
    tag='[1c] 插入')

# ═══════════════════ 6. verify_dist [2c]：磁盘 BGM 文件名合规 ═══════════════════
rep(V,
    "    # ---- 3. 内联处理器依赖的全局名在混淆后仍存在 ----\n",
    "    # ---- 2c. BGM 文件名（人工交付，拼错 = 静默走回退轨 → 这里拦住） ----\n"
    "    print('\\n[2c] 素材/music/ 命名合规')\n"
    "    _bgmset = set(ids.get('bgmTracks') or [])\n"
    "    diskbgm = sorted(d for d in disk if d.startswith('music/'))\n"
    "    badshape, badstem, have = [], [], set()\n"
    "    for d in diskbgm:\n"
    "        base, ext = os.path.splitext(os.path.basename(d))\n"
    "        if ext.lower() not in bgm_exts or not base.startswith('bgm_'):\n"
    "            badshape.append(d); continue\n"
    "        stem = base[len('bgm_'):]\n"
    "        if stem in _bgmset:\n"
    "            have.add(stem)\n"
    "        else:\n"
    "            badstem.append(d)\n"
    "    check(not badshape, 'music/ 下都是 bgm_<轨>.<%s>（坏 %d）' % (','.join(bgm_exts), len(badshape)))\n"
    "    check(not badstem,\n"
    "          '%d 个 BGM 文件的轨名都在 BGM_KNOWN_TRACKS 里（未知 %d）' % (len(diskbgm), len(badstem)))\n"
    "    for x in badshape[:8]:\n"
    "        print('       命名: %s' % x)\n"
    "    for x in badstem[:8]:\n"
    "        print('       未知轨名: %s —— 代码永远不会请求它，游戏里听到的是回退轨' % x)\n"
    "    print('  注: 磁盘上 %d 条轨（%s）' % (len(have), '、'.join(sorted(have)) or '无'))\n"
    "    _missing = sorted(_bgmset - have)\n"
    "    if _missing:\n"
    "        print('  注: 代码已知但磁盘没有：%s —— 会走回退轨（精英/Boss→battle、商店→map），不算错误'\n"
    "              % '、'.join(_missing))\n"
    "\n"
    "    # ---- 3. 内联处理器依赖的全局名在混淆后仍存在 ----\n",
    tag='[2c] 插入')

# ═══════════════════ 7. 冒烟：13 条新断言 ═══════════════════
rep(S,
    "  rep.pass = _p; rep.fail = _f;\n",
    "  /* ============ v0.61.34 BGM 六轨：轨名真相源 + 普通/精英必须分开 ============ */\n"
    "  (function () {\n"
    "    /* 背景：v0.61.31 已把四类场景接上（普通战 battle / 精英战 battle_elite / Boss 战 battle_boss /\n"
    "       商店·营地·事件 shop / 地图 map / 菜单 menu），用户 9/23 交付了 6 个 mp3。\n"
    "       本组不验「接线做没做」（那是 v0.61.31 组的事），只验「素材名与代码轨名不许漂」——\n"
    "       文件名是人工交付的，拼错不会报错，只会静默走回退轨。 */\n"
    "    var tr = (typeof BGM_KNOWN_TRACKS !== 'undefined') ? BGM_KNOWN_TRACKS : null;\n"
    "    __ok('v0.61.34 前置：BGM_KNOWN_TRACKS 存在且非空', !!tr && tr.length > 0);\n"
    "    if (tr) {\n"
    "      __ok('v0.61.34 恰好 6 条轨且无重复', tr.length === 6 && new Set(tr).size === 6, tr.join(','));\n"
    "      __ok('v0.61.34 三条基础轨在册（menu / map / battle）',\n"
    "        tr.indexOf('menu') >= 0 && tr.indexOf('map') >= 0 && tr.indexOf('battle') >= 0);\n"
    "      __ok('v0.61.34 三条升级轨在册（battle_elite / battle_boss / shop）',\n"
    "        tr.indexOf('battle_elite') >= 0 && tr.indexOf('battle_boss') >= 0 && tr.indexOf('shop') >= 0);\n"
    "      /* 与磁盘命名同口径：verify_dist [2c] 按 bgm_<轨> 抠词干再比对，字符集必须一致 */\n"
    "      var badch = tr.filter(function (t) { return !/^[a-z][a-z0-9_]*$/.test(t); });\n"
    "      __ok('v0.61.34 轨名字符集与磁盘命名规则同口径（小写/数字/下划线）',\n"
    "        badch.length === 0, badch.join(','));\n"
    "      var fbOut = Object.keys(BGM_FALLBACK).filter(function (k) { return tr.indexOf(k) < 0; });\n"
    "      __ok('v0.61.34 BGM_FALLBACK 的每个键都在册（否则回退配置自己就是死配置）',\n"
    "        fbOut.length === 0, fbOut.join(','));\n"
    "      var stray = ['battle', 'battle_elite', 'battle_boss']\n"
    "        .filter(function (t) { return tr.indexOf(t) < 0; });\n"
    "      __ok('v0.61.34 battleBgmFor 可能返回的轨名全部在册', stray.length === 0, stray.join(','));\n"
    "    }\n"
    "\n"
    "    /* 用户点名的那条：「普通和精英也要分开」—— 直接断言两者不同轨 */\n"
    "    var __nk = Object.keys(ENEMIES).filter(function (k) { return !ENEMIES[k].elite && !ENEMIES[k].boss; })[0];\n"
    "    var __ek = Object.keys(ENEMIES).filter(function (k) { return ENEMIES[k].elite && !ENEMIES[k].boss; })[0];\n"
    "    var __bk = Object.keys(ENEMIES).filter(function (k) { return ENEMIES[k].boss; })[0];\n"
    "    __ok('v0.61.34 普通战与精英战不是同一条轨（用户要求：分开）',\n"
    "      battleBgmFor([__nk]) === 'battle' && battleBgmFor([__ek]) === 'battle_elite'\n"
    "      && battleBgmFor([__nk]) !== battleBgmFor([__ek]),\n"
    "      battleBgmFor([__nk]) + ' vs ' + battleBgmFor([__ek]));\n"
    "    __ok('v0.61.34 三档战斗两两不同轨',\n"
    "      battleBgmFor([__nk]) !== battleBgmFor([__bk]) && battleBgmFor([__ek]) !== battleBgmFor([__bk]),\n"
    "      [battleBgmFor([__nk]), battleBgmFor([__ek]), battleBgmFor([__bk])].join(','));\n"
    "    /* 读档恢复 G.enemies 之前可能拿到空/畸形入参，不许炸 */\n"
    "    __ok('v0.61.34 battleBgmFor 对空数组/undefined/[null] 都回 battle 而不抛错',\n"
    "      battleBgmFor([]) === 'battle' && battleBgmFor(undefined) === 'battle' && battleBgmFor([null]) === 'battle');\n"
    "\n"
    "    /* 未登记轨名：setBGM 只警告、不抛错，且仍按原名请求（交给探测/合成兜底） */\n"
    "    var __savA = ASSET_MAP, __savCUR = CUR_BGM, __o3 = startBGM, __req = [];\n"
    "    ASSET_MAP = null;   // 开发期口径（file://）：透传逻辑轨，不预判磁盘\n"
    "    startBGM = function (t) { __req.push(t); };\n"
    "    var __werr = null;\n"
    "    try { setBGM('bgm_typo'); } catch (e) { __werr = e; }\n"
    "    var __lastReq = __req[__req.length - 1];\n"
    "    __ok('v0.61.34 未登记轨名不抛错（战斗中不能因轨名拼错炸掉）', __werr === null, __werr && __werr.message);\n"
    "    __ok('v0.61.34 未登记轨名仍按原名请求（探测/合成兜底，不是静默丢弃）',\n"
    "      __lastReq === 'bgm_typo', 'got=' + __lastReq);\n"
    "    __ok('v0.61.34 CUR_BGM 如实记录逻辑轨（设置页/存档读的就是它）', CUR_BGM === 'bgm_typo', CUR_BGM);\n"
    "    startBGM = __o3; ASSET_MAP = __savA; CUR_BGM = __savCUR;\n"
    "  })();\n"
    "\n"
    "  rep.pass = _p; rep.fail = _f;\n",
    tag='v0.61.34 冒烟块')

# ═══════════════════ 8. 版本号三处 ═══════════════════
rep(H, "<title>志怪塔 · 原型 v0.61.33</title>", "<title>志怪塔 · 原型 v0.61.34</title>", tag='版本号 title')
rep(H, "<small>· 玩法原型 v0.61.33</small>", "<small>· 玩法原型 v0.61.34</small>", tag='版本号 h1')
rep(B, "<h2>志 怪 塔 · v0.61.33</h2>", "<h2>志 怪 塔 · v0.61.34</h2>", tag='版本号 60_boot')

# ═══════════════════ 9. 更新日志：作废旧挂账口径 ═══════════════════
rep(L,
    "- BGM 文档写 6 轨，**代码仍只认 `menu`/`map`/`battle` 三轨**\n",
    "- BGM 文档写 6 轨，**代码仍只认 `menu`/`map`/`battle` 三轨**（→ **v0.61.31 已落地，此条作废**；\n"
    "  v0.61.34 又补了「文件名词干必须在册」的闸，防人工交付拼错时静默失效）\n",
    tag='旧挂账加注')

# ═══════════════════ 落盘 ═══════════════════
if errs:
    print('=== 锚点校验失败，未写入任何文件 ===')
    for e in errs:
        print(' ✗', e)
    sys.exit(1)

for p, d in files.items():
    body = d['body']
    if ',,' in body:
        print('=== 出现连续逗号 ,, 未写入 ===', p)
        sys.exit(1)
    io.open(p, 'w', encoding='utf-8', newline='').write(body.replace('\n', d['nl']))
    print('OK %-16s %d 字符' % (os.path.basename(p), len(body)))