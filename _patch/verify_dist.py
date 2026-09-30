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
          # v0.61.41：背景路径**在游戏作用域里算**（bgRel），python 侧不镜像这条规则 ——
          # 镜像会漂（本批第一版就是这样把 bg_map.jpg 算成了 bg/map.jpg，靠 [1] 才抓出来）
          "bg:['menu'].concat(ACTS.map((a,i)=>'act'+(i+1)))"
          ".concat(Object.keys(MAP_BG).map(k=>MAP_BG[k])).map(bgRel),"
          # v0.61.41：把 bgRel 的两条规则各钉一个样本，规则被改坏时这里立刻红
          "bgRule:['menu','map.jpg','map.jpeg'].map(bgRel),"
          # v0.73.0：八个未知/事件房的专用背景（素材/bg/bg_evt_*.jpg）。
          # 路径**在游戏作用域里算**（与上面 bg 同一范式），python 侧不镜像 ——
          # 表写的是 'evt_well.jpg' 这种**不带 bg_ 前缀**的短名，硬拼必漂。
          # 不加这一条，这八张会被 [2] 误报成「从未被游戏请求 / 可考虑删掉」，
          # 照着删掉事件房就没背景了（同 v0.61.41 卷轴三件踩过的坑）。
          "evtBg:UNKNOWN_EVENTS.map(k=>EVT_BG[k]).map(bgRel),"
          "evtNames:UNKNOWN_EVENTS.slice(),"
          # v0.74.0：六张整屏场景背景（商店/篝火/胜利/失败/选英雄/胜利奖励），
          # 语料就是 10_audio.js 的 SCENE_BG 表 —— 直接取**键**，python 侧不镜像、不重抄。
          # 不加这一条，这六张会被 [2] 误报成「从未被游戏请求 / 可考虑删掉」，
          # 照着删掉这几屏就没背景了（与 v0.73.0 事件房那八张同一处境）。
          "sceneBg:Object.keys(SCENE_BG).map(bgRel),"
          "sceneKeys:Object.keys(SCENE_BG),"
          # v0.61.41：地图素材清单从游戏作用域取（6 种节点 + 未解锁），
          # 改名/漏填会让 [1] 立刻红，而不是等玩到地图页才发现图标 404。
          # v0.61.42：路径回到代码自绘 ⇒ MAP_ROAD_ICON 已退役，两条道路 PNG **仍在磁盘上没删**
          # （用户的素材不擅自删），只是不再被游戏请求；从这份清单里去掉，
          # 否则 Map_ROAD_ICON 是 undefined，这行求值会直接抛错。
          "mapIcons:Object.keys(NODE_ICON).map(k=>MAP_ICON_DIR+NODE_ICON[k])"
          ".concat([MAP_ICON_DIR+NODE_ICON_LOCKED]),"
          # 必须命中：缺任何一个都是 bug
          "music:['menu','map','battle'],"
          # v0.61.31 起代码支持这三条升级轨，但**缺文件时会退回基础轨**（Boss/精英→battle、商店→map），
          # 所以它们不是「必须命中」，而是「交付即生效」。只用于把已交付的从 unused 里排掉。
          "musicOptional:['battle_elite','battle_boss','shop'],"
          # 代码里的已知轨名（唯一真相源）—— 用来断言下面两张 listing 没和代码漂移
          "bgmTracks:BGM_KNOWN_TRACKS,"
          # v0.61.36：「怨气」是**运行时生成**的废牌（junkCard()，由敌人词缀「飞牌」塞进手牌），
          # 不在 CARDS 里，卡图却是真在用的 card/yuanqi.png —— 漏了它就会把它误报成「从未被请求」
          "junk:[junkCard().id],"
          "sfxKeys:SFX_KEYS,sfxExts:AUD_EXTS,"
          # v0.64.0：特效精灵图表。键名与 rows 都在游戏作用域里取（python 侧不镜像），
          # 这样表被改名/改行数时是这里先红，而不是等播出来发现错位。
          # v0.66.0：主菜单轮换背景清单（唯一真相源在游戏作用域，python 侧不镜像）
          "menuBgs:MENU_BGS,"
          # v0.67.0：灵石图标表（道具/灵汁的贴图）+ 灵汁 id 清单。
          # **整表从游戏作用域取、python 侧一个字都不镜像** —— 镜像必漂：
          # v0.69.0：黄泉酒的文件已改名对齐（lingshi_huangquanjiu.png，原来少个 an），
          # 但**表与 id 解耦这条约束仍然成立**，所以照旧整表取、不许硬拼，
          # 硬拼 'lingshi/lingshi_'+id+'.png' 会请求到不存在的路径，
          # 而 artImg 的 onerror 降级是 outerHTML='' ⇒ **静默少一张图**，不报错只碎图（实测就是）。
          "lingshiMap:LINGSHI_FILE,potions:POTIONS.map(p=>p.id),"
          "fxSheets:Object.keys(FX_SHEETS),"
          "fxRows:Object.keys(FX_SHEETS).reduce(function(o,k){ o[k]=FX_SHEETS[k].rows; return o; },{}),"
          # v0.69.0 §D5：KEYWORDS 的键（唯一真相源在游戏作用域）。用来数「零引用词条」——
          # 见下面那条反向钉。
          "kw:KEYWORDS.map(function(k){return k[0];})})")
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
    # v0.67.0：遗物图标不再一律 relic/<id>.png —— 有灵石图的 3 个（朱砂笔/护身符/返魂香）
    # 走 lingshi/。规则**不镜像**：按 lingshiMap 有没有这个 id 决定，表在游戏作用域里。
    # ⚠️ relic/ 下那 3 张同名图**仍在磁盘、没删**（用户的素材不擅自删），只是不再被请求 ——
    # 所以它们会落进 [2] 的「从未被请求」提示里，下面显式豁免，否则会诱导以后真去删。
    _lm = ids.get('lingshiMap') or {}
    _relic_switched = sorted(i for i in ids['relics'] if _lm.get(i))
    check(len(_relic_switched) == 3,
          '恰好 3 个遗物改用灵石图（%s）' % ','.join(_relic_switched))
    want += [(_lm.get(i) or ('relic/%s.png' % i)) for i in ids['relics']]
    # v0.67.0：灵汁图标 —— 只有表里有图的才请求。
    # v0.69.0：4 瓶灵汁**全部有图**了（还阳露/孟婆汤由用户 2026-09-28 补齐，此前走字牌占位）。
    # 原断言写死「恰好 2 瓶」＝ v0.67.0 的交付状态，补齐图之后必然假红；改成断「全部有图」，
    # 跟着 ids['potions'] 走：以后再加灵汁若没配套出图，这里立刻响（这正是要守的东西）。
    # 另断「表里的灵汁 id 必须真的是灵汁」，防止把某个遗物 id 误塞进灵汁那半截。
    _potion_icon = sorted(_lm.get(i) for i in ids['potions'] if _lm.get(i))
    check(len(_potion_icon) == len(ids['potions']),
          '灵汁全部有灵石图（%d/%d：%s）'
          % (len(_potion_icon), len(ids['potions']), ','.join(_potion_icon)))
    _potion_only = [i for i in _potion_icon if i not in set(_lm.get(r) for r in ids['relics'])]
    check(len(_potion_only) == len(_potion_icon),
          '灵石图不与遗物那 3 张重名（%s）' % ','.join(_potion_only))
    want += _potion_icon
    want += [('enemy/%s.png' % i) for i in ids['enemies']]
    # BGM 不能只认 .mp3 —— BGM_EXTS 的顺序是 ogg 优先，交付格式变了不该假红（v0.61.34）
    # v0.61.41：这份源码提前到 bg 之前读，因为背景路径规则（bgRel）也在里面
    _audio = io.open(os.path.join(ROOT, 'js', '10_audio.js'), 'r', encoding='utf-8').read()
    # v0.61.41：背景路径**全部由游戏作用域的 bgRel 算好**（见 dump_ids），python 侧不做镜像 ——
    # 本批第一版就是镜像漂了：python 认「带扩展名走原名」⇒ bg/map.jpg，而磁盘上是 素材/bg/bg_map.jpg
    check(ids.get('bgRule') == ['bg/bg_menu.png', 'bg/bg_map.jpg', 'bg/bg_map.jpeg'],
          'bgRel 两条规则：带扩展名只补 bg_ 前缀 / 不带补 bg_<name>.png（%s）'
          % ','.join(ids.get('bgRule') or []))
    want += ids['bg']
    # v0.73.0：八个事件房背景。断言「八条齐、互不重复、且每个事件都有键」——
    # 表里漏一个键就少一条路径（want 少一条 ⇒ [2] 把那张图误报成 unused），
    # 这条正面断言让「漏键」在 [1] 就红，而不是等玩到那个事件发现没背景。
    _evt_keys = ids.get('evtNames') or []
    _evt = ids.get('evtBg') or []
    check(len(_evt_keys) == 8 and len(_evt) == 8 and len(set(_evt)) == 8
          and all(isinstance(x, str) and x.startswith('bg/bg_evt_') for x in _evt),
          '八个事件房背景清单 8 条、互不重复、都在 bg/bg_evt_ 下（%s）' % ','.join(_evt))
    check(len(set(_evt_keys)) == 8, '八个事件 id 互不重复（%s）' % ','.join(_evt_keys))
    want += _evt
    # v0.74.0：六张整屏场景背景（商店/篝火/胜利/失败/选英雄/胜利奖励）。与上面那八张同构，
    # 清单同样从**游戏作用域的 SCENE_BG 表**取（python 侧不镜像）。断「六条齐、互不重复、
    # 都是 bg/bg_*.jpg」—— 表里漏一个键就少一条路径，want 少一条 ⇒ [2] 会把那张图
    # 误报成「从未被游戏请求 / 可考虑删掉」，照着删掉这几屏就没背景了。
    # ⚠️ 必须是 .jpg：这六张交付的就是 jpg（八张事件房也是），若哪天换成 png，
    #    bgRel 对**带扩展名**的只补 bg_ 前缀 ⇒ 路径跟着变，这里要一起改，不是漏报。
    _sc_keys = ids.get('sceneKeys') or []
    _sc = ids.get('sceneBg') or []
    check(len(_sc_keys) == 6 and len(_sc) == 6 and len(set(_sc)) == 6
          and all(isinstance(x, str) and x.startswith('bg/bg_') and x.endswith('.jpg')
                  for x in _sc),
          '六张整屏场景背景清单 6 条、互不重复、都是 bg/bg_*.jpg（%s）' % ','.join(_sc))
    want += _sc
    # v0.61.41：地图图标（6 种节点 + 未解锁）—— 清单来自游戏作用域，改名/漏填会被抓
    # v0.61.42：9 → 7（两条道路贴图随「路径回到代码自绘」退役，见 dump_ids）
    check(len(ids['mapIcons']) == 7 and len(set(ids['mapIcons'])) == 7,
          '地图图标清单 7 条且互不重复（%s）' % ','.join(ids['mapIcons']))
    want += ids['mapIcons']
    # v0.61.36：运行时废牌「怨气」的卡图（旧版漏掉 → 真在用的图被误报为 unused）
    want += [('card/%s.png' % i) for i in ids['junk']]
    _mb = re.search(r'const BGM_EXTS\s*=\s*\[([^\]]*)\]', _audio)
    bgm_exts = re.findall(r"'([^']+)'", _mb.group(1)) if _mb else []
    check(bool(bgm_exts), '从 10_audio.js 解析到 BGM_EXTS（%s）' % ','.join(bgm_exts))
    miss_music = ['music/bgm_%s{%s}' % (i, ','.join(bgm_exts)) for i in ids['music']
                  if not any(('music/bgm_%s%s' % (i, e)) in keys for e in bgm_exts)]
    want += ['rune.png']
    # v0.62.0：**源码 CSS 里声明了 url(素材/…) 的，就是必需素材**。
    # 卷轴三件（上木轴 / 下木轴 / 画心纸）只走这条路：`原型.html` 的 .map-roller/.map-sheet
    # 写了开发期兜底 url()，产物里由 showMap→applyMapTextures() 用 assetURL() 覆盖。
    # 它们**不进任何 ids 清单**，所以早先被 [2] 误报成「从未被游戏请求 / 可考虑删掉」——
    # 照那句删了地图就没卷轴了。这里从源码反推，新增同类素材自动被覆盖。
    # （判据与 [5] 的 url 覆盖守卫互为正反面：那边查「CSS 的 url 有没有 JS 加载路径」，
    #   这边查「这条路径有没有真的打进产物」。）
    _css_want = sorted(set(re.findall(r'url\(\s*素材/([^)\s"\']+)\s*\)', src)))
    want += _css_want
    # v0.66.0：主菜单真美术。**不加这两条，[2] 会把它们报成「从未被游戏请求 / 可考虑删掉」**
    # ——照那句删了主菜单就整屏空了，正是 _css_want 当初被加进来的同一个坑。
    #   · 三张轮换背景：MENU_BGS 从**游戏作用域**取（路径规则不在 python 侧镜像，与 bgRel 同理）
    #   · 六张 UI 图：showStartScreen 的模板串里以 artImg('ui/menu/…') 字面量出现，从源码反推
    want += list(ids.get('menuBgs') or [])
    _boot = io.open(os.path.join(ROOT, 'js', '60_boot.js'), 'r', encoding='utf-8').read()
    _ui_menu = sorted(set(re.findall(r"artImg\(\s*'(ui/menu/[^']+)'", _boot)))
    check(len(_ui_menu) == 6, '从 60_boot.js 反推出 6 张主菜单 UI 图（%s）' % ','.join(_ui_menu))
    want += _ui_menu
    # 石碑碎片的 5 片必须复用**同一张**石碑图（clip-path 切 5 块、同一个 src ⇒ 浏览器复用解码
    # 结果，零额外体积）。碎片要是指向别的/不存在的文件，演出时就是 5 块空白。
    _shard_src = sorted(set(re.findall(r"menuShardsHTML\(\s*'([^']+)'", _boot)))
    check(_shard_src and set(_shard_src) <= set(_ui_menu),
          '石碑碎片复用主菜单 UI 图（%s ⊆ %s）' % (','.join(_shard_src), ','.join(_ui_menu)))
    # v0.74.0：**三处版本号必须同步**。
    # 起因：主菜单标题那一处（60_boot.js 里的 `<small>· v…</small>`）从 v0.69.0 起就
    # **再没跟着升过**，一路停在 v0.69.0 直到本批才发现 —— 整整落后五个版本。
    # 既有那条冒烟断言只查**格式**（`menu-title` 之后 200 字符内出现 `v0.`），不查**取值**，
    # 所以它看着是绿的、什么也没守住。「三处版本号同步」是项目惯例却没有一条闸看着它 ⇒ 补上。
    # ⚠️ 取值必须从**源码树**取，不能从 dist 取：主菜单那处在 60_boot.js 的模板串里，
    #   产物里已被混淆（中文串进 base64 表，见 _patch/_diststr.py 那笔旧账）
    #   ⇒ 在 dist 上 grep 那个串是 grep 不到的，拿 dist 当判据会**假红**。
    #   产物侧的版本号另外单独查（只查 title 那条能存活下来的），用来抓「改了源码忘了重打包」。
    _vers = [
        ('原型.html <title>', re.search(r'<title>[^<]*?v(\d+\.\d+\.\d+)</title>', src)),
        ('原型.html 顶栏 h1', re.search(r'玩法原型 v(\d+\.\d+\.\d+)', src)),
        ('60_boot.js 主菜单', re.search(r'<small>· v(\d+\.\d+\.\d+)</small>', _boot)),
    ]
    _miss = [k for k, m in _vers if not m]
    check(not _miss, '三处版本号都还在（缺：%s）' % ','.join(_miss))
    _vals = sorted(set(m.group(1) for _, m in _vers if m))
    check(len(_vals) == 1,
          '三处版本号同步（%s）'
          % ','.join('%s=v%s' % (k, m.group(1)) for k, m in _vers if m))
    _dv = re.search(r'<title>[^<]*?v(\d+\.\d+\.\d+)</title>', html)
    check(bool(_dv) and len(_vals) == 1 and _dv.group(1) == _vals[0],
          '产物版本号与源码一致（产物 v%s / 源码 v%s）—— 不一致说明改了源码没重新打包'
          % (_dv.group(1) if _dv else '缺失', _vals[0] if len(_vals) == 1 else '?'))
    # v0.68.0：真美术牌框。**不加这条，[2] 会把 ui/card/front.png 报成「从未被游戏请求 /
    # 可考虑删掉」** —— 照那句删了，卡面就整块散架：`cardFrameFail` 会连 `.has-frame`
    # 一起摘掉、静默退回纯 CSS 版面，不报错、不抛异常、冒烟也读不到 CSS。与 v0.66.0 的
    # _ui_menu 是同一个坑（走的是 `assetURL('…')` 字面量，不进任何 ids 清单）。
    # v0.69.0 §C：原来只从 `cardFrame()` 往后 400 字符里反推（牌框正视图只有一张）。
    # 现在**三张都接线了**（正视图 cardFrame()；背视图/侧视图在紧随其后的 pileInit()，
    # 写进 CSS 变量 --pile-back-img / --pile-side-img）—— 旧那个「锚点 + 400 字符窗」
    # 的写法只能捞到锚点后的**第一个** assetURL，三张里必然漏两张 ⇒ 直接扫全文件的
    # `assetURL('ui/card/…')` 字面量。语义没变（仍然是「从源码反推游戏真正请求了什么」），
    # 只是不再依赖函数位置。
    _aud = io.open(os.path.join(ROOT, 'js', '10_audio.js'), 'r', encoding='utf-8').read()
    _ui_card = sorted(set(re.findall(r"assetURL\(\s*'(ui/card/[^']+)'", _aud)))
    check('ui/card/front.png' in _ui_card,
          '从 10_audio.js 反推出牌框正视图（%s）' % ','.join(_ui_card))
    want += _ui_card
    want = list(dict.fromkeys(want))   # MAP_BG 四档同名 map.jpg，去重后再报数
    miss = [w for w in want if w not in keys]
    check(not miss, '游戏请求的 %d 个素材全部命中' % len(want))
    for w in miss[:20]:
        print('       缺: %s' % w)
    check(not miss_music, '%d 首基础 BGM 各有一个扩展名命中' % len(ids['music']))
    for w in miss_music:
        print('       缺: %s' % w)

    # ---- 1d. 数字图（素材/num）四档交付单：目录名从代码取 ----
    # v0.61.41：四档（dmg/hurt/block/heal）已全部交付，且伤害飘字与拖拽预伤害共用这套字形。
    # 缺一张不会崩（numGlyphSrc 返 null → 回落文字），但玩家看到的就是「浮字时有时无」，所以这里升级成硬闸。
    print('\n[1d] 数字图 素材/num 四档')
    _base = io.open(os.path.join(ROOT, 'js', '00_base.js'), 'r', encoding='utf-8').read()
    _mn = re.search(r'const NUM_KIND_DIR\s*=\s*\{([^}]*)\}', _base)
    num_dirs = sorted(set(re.findall(r":\s*'([^']+)'", _mn.group(1)))) if _mn else []
    check(len(num_dirs) == 4,
          '从 00_base.js 的 NUM_KIND_DIR 解析到 4 档目录名（%s）' % ','.join(num_dirs))
    num_want = ['num/%s/%d.png' % (d, i) for d in num_dirs for i in range(10)]
    got = [n for n in num_want if n in keys]
    check(len(num_want) == 40, '四档 × 10 = 40 条数字图路径（%d）' % len(num_want))
    check(len(got) == len(num_want), '四档数字图 40 张全部打进产物（%d / %d）' % (len(got), len(num_want)))
    for n in num_want:
        if n not in keys:
            print('       缺: %s —— 该档整档回落成文字飘字' % n)

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

    # ---- 2d. v0.64.0 特效精灵图（命名 + 像素几何） ----
    # 今天之前 fx/ 前缀**没有任何闸门**：拼错名字 ⇒ playFx 拿不到表项，静默什么都不播；
    # 换错图（列数/单元边长不对）⇒ background-position 步进错位，播出来是斜切的花屏。
    # 两条都只能在产物侧拦（冒烟用的是 DOM 桩，没有布局也没有位图）。
    print('\n[2d] 素材/fx/ 精灵图命名与像素几何')
    _fxset = set(ids.get('fxSheets') or [])
    diskfx = sorted(d for d in disk if d.startswith('fx/'))
    badfxname, badfxkey, badfxpng, badfxgeom = [], [], [], []
    FX_COLS, FX_CELL = 8, 480          # 与 _patch/mk_fx_sheets.py 的 COLS/CELL 一致；要改两边一起改
    # 精灵图**只收 PNG**（要 alpha 合成；jpg 没有透明通道，压过一遍就是黑底方块），
    # 与 [1b] 同款的两源一致性：打包.py 的 IMG_EXT 必须包含 .png，否则这些图根本不会进产物。
    _pkimg = re.search(r'IMG_EXT\s*=\s*\{([^}]*)\}', io.open(os.path.join(ROOT, '打包.py'), encoding='utf-8').read())
    _pkimg_ext = set(re.findall(r"'([^']+)'", _pkimg.group(1))) if _pkimg else set()
    check('.png' in _pkimg_ext, '打包.py 的 IMG_EXT 含 .png（%s）' % ','.join(sorted(_pkimg_ext)))
    for d in diskfx:
        base, ext = os.path.splitext(os.path.basename(d))
        if ext.lower() != '.png':
            badfxname.append(d); continue
        if not re.match(r'^[a-z][a-z0-9_]*$', base):
            badfxname.append(d); continue
        if base not in _fxset:
            badfxkey.append(d); continue
        p = os.path.join(ASSD, d.replace('/', os.sep))
        with open(p, 'rb') as fh:
            head = fh.read(24)
        if head[:8] != b'\x89PNG\r\n\x1a\n' or head[12:16] != b'IHDR':
            badfxpng.append(d); continue
        w = int.from_bytes(head[16:20], 'big'); h = int.from_bytes(head[20:24], 'big')
        # 宽必须正好 8 格；高必须是整数格；行数不能超过表里登记的行数（多出来的排是空白，
        # 但少于登记行数 = FX_SHEETS 的 rows 写大了，f ≤ 8×rows 的护栏会失效）
        rows = int(ids['fxRows'][base]) if base in (ids.get('fxRows') or {}) else 0
        if w != FX_COLS * FX_CELL or h % FX_CELL != 0 or h // FX_CELL < rows:
            badfxgeom.append('%s %dx%d（期望宽 %d、高为 %d 的整数倍、至少 %d 排）'
                             % (d, w, h, FX_COLS * FX_CELL, FX_CELL, rows))
    check(not badfxname, 'fx/ 下都是 <小写键名>.png（坏 %d）' % len(badfxname))
    check(not badfxkey, '%d 张精灵图的键名都已登记在 FX_SHEETS（未登记 %d）'
          % (len(diskfx), len(badfxkey)))
    check(not badfxpng, 'fx/ 下都是真 PNG（签名与 IHDR 头可解析，坏 %d）' % len(badfxpng))
    check(not badfxgeom, '精灵图几何全部合规：宽 == %d、高 %% %d == 0 且排数 ≥ FX_SHEETS.rows（坏 %d）'
          % (FX_COLS * FX_CELL, FX_CELL, len(badfxgeom)))
    for x in badfxname[:8]:
        print('       命名: %s —— 代码请求的是 fx/<FX_SHEETS 的键>.png，这个永远不会被取到' % x)
    for x in badfxkey[:8]:
        print('       未登记: %s —— 在磁盘上占体积，但 playFx 永远不会请求它' % x)
    for x in badfxgeom[:8]:
        print('       几何: %s —— background-position 会错位（8 列的步进量是按 480 单元算的）' % x)
    _missingfx = sorted(_fxset - set(re.sub(r'\.[^.]+$', '', os.path.basename(d)) for d in diskfx))
    check(not _missingfx, 'FX_SHEETS 登记的 %d 个特效都有对应精灵图打进产物（缺 %d）'
          % (len(_fxset), len(_missingfx)))
    for x in _missingfx[:20]:
        print('       缺: fx/%s.png —— playFx 会静默不播：不是崩溃，是「这张牌打了没反应」' % x)
    # 登记在册的 fx 文件都是「游戏真的会请求的」，别让它们在末尾的 unused 报告里
    # 被误报成「可考虑删掉」——照那句删了特效就没了（与 v0.62.0 卷轴三件同一类陷阱）。
    want.extend(d for d in diskfx)
    if diskfx:
        _fsz = sum(os.path.getsize(os.path.join(ASSD, d.replace('/', os.sep))) for d in diskfx)
        print('  注: 素材/fx/ 共 %d 张 %.1f MB，FX_SHEETS 登记 %d 个'
              % (len(diskfx), _fsz / 1048576.0, len(_fxset)))

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
    # 关键 CSS 必须活到产物里 —— 混淆只碰 <script> 正文，CSS 是纯文本，
    # 但「CSS 被误删/误并」这种事冒烟查不到（冒烟在 VM 里跑，不读文件），只能在这里钉住：
    #   .map-scene    = v0.62.0 起改成「**完全不透明**的整屏地图场景」
    #                   （v0.61.42 它是半透明底，那正是用户报「透出半透明战斗场景」的根因）
    #   mapGlowGrow   = 沿路径延长的淡黄光边动画
    #   .fx-sign      = 浮字正负号的配色（用户报的「加号减号颜色没变」）
    #   .map-viewport / .map-sheet / .map-roller = v0.62.0 卷轴骨架：木轴固定、画心靠 --camY 滑动
    #   .o-reached / .o-past / .o-locked = v0.62.0 图标描边三态（达到的淡白描边、过去的消失）
    for _need in ('.map-scene', 'mapGlowGrow', '.fx-sign',
                  '.map-viewport', '.map-sheet', '.map-roller',
                  '.o-reached', '.o-past', '.o-locked'):
        check(_need in html, '产物保留 %s 样式' % _need)
    # v0.64.1：地图的原生拖拽护栏（-webkit-user-drag:none）。冒烟读不到 CSS，只能在这里拦 ——
    # 被误删则节点图标又变回「天生可拖」，左键拖地图会被浏览器抢去当拖图并抛 pointercancel
    # ⇒ 症状是「左键拖不动、得按住中键」，非常难联想到，所以必须有一条自动化守住。
    check('-webkit-user-drag:none' in html,
          '产物保留 -webkit-user-drag:none（地图原生拖图护栏，删了左键又拖不动）')
    # ⚠️ 这里**故意不**去产物里找 draggable="false"：它在 artImg 的**模板字符串**里，而 _build/obf.js
    #    开了 stringArray + base64 编码（阈值 0.75）⇒ 产物里是字符串数组里的一串 base64，明文搜不到。
    #    那条护栏由冒烟在**源码**层面钉（__code(artImg) 含 draggable="false"），这里只守 CSS 那条
    #    （CSS 不参与混淆，明文可搜）。两条各守一层，别把「搜不到」误判成「被删了」。
    # v0.62.0：地图不再是不透明面板，必须是**实心**底色 —— 半透明就是 Image#6 那个 bug 本身。
    # 这条防的是「以后有人手滑把 #overlay.map-scene 的 background 改回 rgba(...)」。
    import re as _re
    _m = _re.search(r'#overlay\.map-scene\s*\{[^}]*\}', html)
    check(_m is not None, '产物里 #overlay.map-scene 规则还在')
    if _m:
        check('rgba' not in _m.group(0).replace(' ', ''),
              '#overlay.map-scene 的底色是**实心**的（不是半透明）: %s' % _m.group(0)[:90])

    # ---- v0.65.0：主菜单整屏场景 + 小窗开合过渡 + 按钮交互态 ----
    # 冒烟在 VM 里跑、**读不到 原型.html**（这批改动 90% 是 CSS，它一无所知）⇒ 只能在这里钉。
    # ⚠️ 只钉 **CSS 明文**：JS 标识符（ov-enter 等类名出现在 JS 里）会被 _build/obf.js 的
    #    stringArray+base64 编码，明文搜不到 ≠ 被删了（同第 361 行 draggable="false" 的注释）。
    #    CSS 不参与混淆，所以下面这些字符串在产物里一定是明文。
    for _need in ('.menu-root', '.menu-col', '.menu-title', '.menu-tier', '.menu-sep', '.menu-tip',
                  '.is-daily', '.is-main', '.is-list', '.is-foot',
                  '.ov-enter', '@keyframes menuRise', '@keyframes overlayIn',
                  '#overlay:not(.hidden)', 'prefers-reduced-motion',
                  'button.btn:active', 'button.btn:focus-visible', 'button.btn:disabled'):
        check(_need in html, '产物保留 %s 样式' % _need)
    # ---- v0.66.0：主菜单全屏横屏重做 + 点击演出 ----
    # 同上：只钉 **CSS 明文**（JS 标识符会被 _build/obf.js 编码，搜不到 ≠ 被删）。
    # ⚠️ 这 8 条 keyframes 是本批「零新增素材」的全部本钱 —— 石碑崩碎 / 符纸飘动 / 背景呼吸 /
    #    卷轴落下全靠它们，少一条对应的演出就直接不动（而且是被 CSS 静默吞掉，不报错）。
    for _need in ('.menu-root', '.menu-bgwrap', '.menu-bgimg', '.menu-veil', '.menu-stage',
                  '.menu-hit', '.menu-artbox', '.menu-shard', '.menu-flash', '.menu-fb',
                  '.scroll-scene',
                  '@keyframes menuBgBreathe', '@keyframes menuBreathe', '@keyframes menuSway',
                  '@keyframes menuTug', '@keyframes menuShardBurst', '@keyframes menuFlash',
                  '@keyframes scrollDrop'):
        check(_need in html, '产物保留 %s 样式' % _need)
    # 这批的核心就是「把 #overlay.hidden 从 display:none 改成 opacity+visibility 延迟翻」——
    # 退回 display:none 就等于整批白做（小窗又变硬切），所以反向钉一条：任何 #overlay.hidden
    # 规则里都不许再出现 display:none。_css = 去掉注释后的 CSS（第 257 行那段注释里就写着这四个字，
    # 不剥注释会假红 —— 这是本文件里唯一一处注释本身包含被禁字符串的地方）。
    _css = _re.sub(r'/\*[\s\S]*?\*/', ' ', html)

    # ---- v0.68.2：CSS 注释必须配平 ----
    # ⚠️ 真踩过：给 `body.at-menu #app{display:none}` 写的说明注释里有「（act*/map/camp…）」——
    #    那半截 `act*/` 被 CSS 当成**注释终止符**，注释提前关闭，后面整段说明变成垃圾选择器、
    #    把紧随其后的规则一起吞掉 ⇒ 规则写在文件里、浏览器里根本不生效。
    #    最阴的是它**处处绿灯**：文件里有这行字（grep 得到）、CSS 里括号也配平、冒烟读不到 CSS、
    #    verify_dist 当时也没有任何一条能发现。只有实拍才看出来（#app display 仍是 block）。
    #    所以这里加一条最便宜的通用闸：注释开闭数量必须相等。
    _style_seg = html
    _s0 = html.find('<style>')
    if _s0 >= 0:
        _s1 = html.find('</style>', _s0)
        if _s1 > _s0:
            _style_seg = html[_s0:_s1]
    check(_style_seg.count('/*') == _style_seg.count('*/'),
          'CSS 注释开闭配平（不等 = 有注释被 `*/` 提前截断，它后面那条规则会被静默吞掉）'
          ' [/*=%d */=%d]' % (_style_seg.count('/*'), _style_seg.count('*/')))

    # ---- v0.71.0：上面那条只会说「不配平」，不说是**哪一条**注释截断了 ----
    # ⚠️ 真踩过（v0.71.0 §四-①）：`.reward-cards .card.selected` 的说明注释里多写了一个
    #    注释结束符 ⇒ 注释提前关闭，紧跟的「选择器必须是…」整段变成**非法选择器前奏**，
    #    解析器一路吞到规则真身的 `{`，把规则本身判无效丢弃 ⇒ 金环根本没生效。
    #    数量闸确实报了红（193/194），但从「不配平」到「找到那一条」全靠人工二分 ——
    #    这次是自己写坏自己找。所以补一条**结构性扫描**：逐字符走一遍，深度掉到 0 之后
    #    再遇到终止符就是**游离终止符**，直接报行号；收尾时深度 >0 就是**未闭合**，报起始行。
    #    （比数量闸强在：能定位，也能抓住「又写了一对 `/* */` 把总数凑平」这种数量闸看不见的。）
    _depth = 0
    _opens = []          # 每个未闭合注释的起始行
    _stray = []          # 深度已为 0 时遇到的终止符所在行
    _i = 0
    _line = 1
    # _style_seg 是从 `<style>` 起截的，行号要换算回整个 html 文件才有意义
    _base = html[:_s0].count('\n') if _s0 >= 0 else 0
    while _i < len(_style_seg):
        # ⚠️ 必须照**浏览器的语义**走，不是「配对括号」的语义：CSS 注释**不支持嵌套**，
        #    进了注释之后 `/*` 只是**惰性文本**，只有 `*/` 能把它关掉。
        #    踩过的坑：注释正文里写了那两个符号（`/*` 与 `*/`）⇒ 浏览器在**正文里那个** `*/`
        #    就收工了，正文后面那半句 + 原本的结束符全变成裸 CSS，把紧随其后的规则一起吞掉。
        #    而此时「配对括号」式扫描会把正文里的 `/*` 当成**嵌套开**、于是深度又归位 ⇒ 报绿。
        #    `.exhaust-tag` 就是这么被吞的（原型.html:439-453），靠这条闸才发现。
        if _depth == 0 and _style_seg.startswith('/*', _i):
            _depth = 1
            _opens.append(_line + _base)
            _i += 2
            continue
        if _style_seg.startswith('*/', _i):
            if _depth == 0:
                _stray.append(_line + _base)
            else:
                _depth = 0
                _opens.pop()
            _i += 2
            continue
        if _style_seg[_i] == '\n':
            _line += 1
        _i += 1
    check(_depth == 0 and not _stray,
          'CSS 注释结构性配平（**照浏览器语义**：注释不嵌套，进了注释只有 `*/` 能关掉它。'
          '游离终止符 = 注释被正文里那个提前截断并留下裸露的终止符；'
          '未闭合 = 后面整段 CSS 被吞）'
          ' [未闭合深度=%d 起点行=%s 游离终止符行=%s]'
          % (_depth, _opens[-3:], _stray[:6]))

    # ---- v0.69.0 §C6：`.hand-area` / `#hand` 的规则体里不许出现 transform/filter/will-change ----
    # 为什么钉：带 transform（同理 filter / will-change / perspective / backdrop-filter）的元素
    # 会成为其后代 `position:fixed` 元素的**包含块**。`#fx-layer` 是 `position:fixed; inset:0`
    # 且挂在 body 上（js/00_base.js），§A 整套「特效跟着面板走」的坐标都建立在「它的坐标系 = 视口」。
    # 今天 #fx-layer 不是这两个元素的后代，所以还没坏 —— 这条钉的是**以后别这么写**：
    # 一旦谁给 `.hand-area` 加个 `transform` 做入场动画，特效坐标会全错，而且冒烟读不到 CSS、
    # 实拍也只在特定场合才看得出来。
    # 只认**主体**命中的规则：`.hand-area .endcol{transform:…}` 的主语是 .endcol，不拦
    # （它不改变 .hand-area/#hand 自身的包含块语义）。
    # **不拦** `transition:transform .13s` —— 那不是 transform 声明；下面的正则要求属性名后紧跟 `:`。
    # `.pile-slab` 那几个 `transform-origin` / `rotate` / `translate` 也都不在主语上。
    _style_clean = _re.sub(r'/\*[\s\S]*?\*/', ' ', _style_seg)

    # ---- v0.71.0：**选择器前奏里不许出现中文**（= 注释被截断，说明文字裸露成裸 CSS）----
    # 为什么非有这条不可：上面「注释配平」那条只会说「不配平」，而 v0.71.0 §四-① 踩的坑里，
    #    裸露的那段散文会被 CSS 解析器当成**非法选择器前奏**一路吞到下一个 `{`，
    #    把**紧随其后的那条真规则一起判无效丢弃** —— 规则文本还在文件里，浏览器里不生效。
    # ⚠️ 最要命的是：这一节下面那两条「`.card.selected` 必须有样式」的闸**照样全绿** ——
    #    它们是拿正则 `([^{}]+)\{([^{}]*)\}` 做**子串**匹配的，而那段散文前奏里正好也写着
    #    `.card.selected` 和 `.reward-cards`，body 里也正好有 border-color / box-shadow。
    #    ⇒ 文本匹配永远证明不了「这条规则是合法的」。必须有几何上更强的一条：合法性。
    # 判据：CSS 选择器前奏**只能是 ASCII**。任何 CJK 字符都不可能是合法选择器的一部分
    #    （`content:"已选"` 这类中文只出现在 **body** 里，不在前奏里，所以不会误伤）。
    _cjk_prelude = [ _s.strip()[:60] for _s, _b in _re.findall(r'([^{}]+)\{([^{}]*)\}', _style_clean)
                     if _re.search(r'[　-〿一-鿿＀-￯]', _s) ]
    check(not _cjk_prelude,
          'CSS 选择器前奏里没有中文（有 = 某条注释被提前截断，说明文字裸露成了非法选择器，'
          '会把**紧随其后的真规则一起吞掉**） [命中=%d 例=%s]'
          % (len(_cjk_prelude), _cjk_prelude[:2]))

    _HAND_SUBJ = {('.', 'hand-area'), ('#', 'hand')}
    _bad_hand = []
    for _sel, _body in _re.findall(r'([^{}]+)\{([^{}]*)\}', _style_clean):
        _sel = _sel.strip()
        if not _sel or _sel.startswith('@'):
            continue
        for _one in _sel.split(','):
            _one = _one.strip()
            if not _one:
                continue
            _last = _one.split()[-1]                    # 只看最后一个复合选择器 = 真正命中的那个元素
            _names = set(_re.findall(r'([.#])([\w-]+)', _last))
            if not (_names & _HAND_SUBJ):
                continue
            _m = _re.search(r'[\w-]*(?:transform|filter|will-change|perspective)\s*:', _body)
            if _m:
                _bad_hand.append('%s { %s… }' % (_sel, _body.strip()[:50]))
    check(not _bad_hand,
          '`.hand-area` / `#hand` 的规则体里没有 transform/filter/will-change（有 = 它成为 '
          '`position:fixed` 后代的包含块，#fx-layer 坐标系当场失效）: %s' % ' | '.join(_bad_hand))

    # ---- v0.71.0 §一：`#enemy-panel` 必须自带层叠上下文（isolation:isolate）----
    # 为什么钉：每个 .enemy 带**内联** `z-index:2000-上抬量`（js/50_ui.js 的 refreshRiseK），
    # 1500+ 的内联 z-index 与 #log(9)、#hand(1) 同处 #app 这一个层叠上下文里 ⇒ **完胜**。
    # 矮屏档 #log 是 position:fixed 覆盖层、#enemy-panel 又是 row-reverse（敌人靠右），
    # 抽屉一拉开正好压在敌人上 —— 用户 v0.70.0 实机报的「战报背景透明、字与敌人画面重叠、
    # 卡牌盖不住敌人」就是这一条（**不是背景色问题**，#log 背景是实心 var(--ink2)）。
    # isolate 把内部那个 2000 关在 #enemy-panel 自己家里，只在敌人之间排序，对外整体落到 0 级。
    # ⚠️ 此前冒烟读不到 CSS、全套工具链也没有任何 z-index 断言 ⇒ 那个 2000 引入后一直全绿。
    # 只认 isolation 这一种写法：等价写法（position:relative+z-index 等）会改 .enemy::after
    # 热区的定位解析链，本批明确不采用；真要换写法时按这条提示同步改，别让它静默失效。
    _ep_rule = []
    for _sel, _body in _re.findall(r'([^{}]+)\{([^{}]*)\}', _style_clean):
        if '#enemy-panel' in [o.strip() for o in _sel.split(',')]:
            _ep_rule.append(_body)
    check(any(_re.search(r'isolation\s*:\s*isolate', _b) for _b in _ep_rule),
          '`#enemy-panel` 带 isolation:isolate（少了它 = .enemy 的内联 z-index:2000 会盖住 '
          '#log 与手牌 —— 用户实机报的「战报/卡牌被敌人覆盖」当场复现）')

    # ---- v0.71.0 §四：`.card.selected` 必须真的有样式 ----
    # 为什么钉：选牌小窗（焚符/火符/守一/忘忧汤/易物 五处共用 `.reward-cards` 模板）里
    # `renderXxxSelect()` 拼的是 `.card.selected`（js/30_engine.js:442 / :582），
    # 而在 v0.71.0 之前**全项目没有任何 .card.selected 规则** —— 全仓 `.selected` 只有
    # `.enemy.selected`。⇒ 点一张牌除了右下角一行 9.5px 的「✓ 已选」小字之外卡面零反馈。
    # 这正是用户说的「弃牌的界面（= 战斗里的选牌小窗）看着奇怪」最可能的根因。
    # ⚠️ 五处弹窗共用同一个类名 ⇒ 这条 CSS 被删掉时**没有任何别的闸会响**（冒烟读不到 CSS、
    #    实拍要正好点到选牌小窗才看得出来），所以必须在这里钉住。
    # ⚠️ 用**子串**匹配而不是等值：选择器必须是 `.reward-cards .card.selected`（0,3,0）——
    # 写成 `.card.selected`（0,2,0）会被后面 `.card.r-blue/.r-purple/.r-gold` 那三条同特异度
    # 规则盖掉（稀有度边框赢），只有白卡看得出选中。等值匹配会把这个更宽的写法判红。
    _sel_hit = [ _b for _sel, _b in _re.findall(r'([^{}]+)\{([^{}]*)\}', _style_clean)
                 if any('.card.selected' in o for o in _sel.split(',')) ]
    check(bool(_sel_hit) and any(
              _re.search(r'border-color\s*:', _b) and _re.search(r'box-shadow\s*:', _b)
              for _b in _sel_hit),
          '`.card.selected` 有样式且同时给了 border-color 与 box-shadow（少了它 = 选牌小窗里'
          '选中一张牌在卡面上没有任何反馈，只有一行 9.5px 小字）')
    # 光有规则还不够 —— 还得**压得过稀有度边框**：`.card.r-*` 是 (0,2,0) 且写在后面。
    # 只认写了 `.reward-cards` 前缀的那一条（或更高特异度的写法），否则金边在非白卡上不可见。
    check(any('.reward-cards' in o for _sel, _b in _re.findall(r'([^{}]+)\{([^{}]*)\}', _style_clean)
              if '.card.selected' in _sel for o in _sel.split(',') if '.card.selected' in o),
          '`.card.selected` 的选择器带 `.reward-cards` 前缀（抬到 0,3,0）—— 否则被 :414-416 的 '
          '`.card.r-blue/.r-purple/.r-gold` 同特异度后写盖掉，只有白卡看得见选中金边')

    # ---- v0.71.0 §三-11：`hero-scene` 必须**成对**存在（CSS 放宽 + JS 摘除）----
    # 为什么钉两处：选英雄屏的 700px 放宽限宽是靠 `#overlay.hero-scene` 生效的，
    # 而 `hero-scene` 是 showOverlay 的**场景类**之一。只加 CSS 不加 JS 摘除的话，
    # 这个类会粘在 #overlay 上 ⇒ 之后每一个面板（战斗奖励/商店/结算）都继承 700px 限宽，
    # 而且**不会报错**（限宽变宽不是崩溃）。反过来只加 JS 不加 CSS 则是白挂一个类、屏还是挤。
    # ⇒ 一边一条，缺哪条都红。
    check(bool(_re.search(r'#overlay\.hero-scene\s+#overlayWrap\s*\{[^}]*max-width', _style_clean)),
          '`#overlay.hero-scene #overlayWrap` 的放宽限宽还在（少了它 = 选英雄屏在 1280×720 上'
          '四张英雄卡折成 3+1 两行、面板溢出 20px，用户报的「选英雄显示不完全」复现）')
    _scenes_m = _re.search(r"const\s+SCENES\s*=\s*\[([^\]]*)\]", js_src)
    _scenes = [s.strip().strip("'\"") for s in _scenes_m.group(1).split(',')] if _scenes_m else []
    check('hero-scene' in _scenes,
          '`hero-scene` 在 showOverlay 的 SCENES 名单里（少了它 = 场景类粘在 #overlay 上，'
          '之后所有面板都继承 700px 限宽且不报错）: %s' % _scenes)
    check('hero-scene' in js_src and bool(
              _re.search(r"classList\.remove\('hero-scene'\)", js_src)),
          "showOverlay 开头有 `classList.remove('hero-scene')`（同 map/menu/scroll-scene 那三条，"
          '少了它 = 开完选英雄再开任何面板都会被放宽限宽）')

    # ---- v0.72.0 §四：`pick-scene`（桌面档选牌小窗：去纯色底 + 卡牌 1.25 倍）----
    # 为什么一下子钉八条：这一节的形态是「新场景类 + 一道 @media 门 + 六处显式调用」，
    # 每一处漏掉都是**静默失效** —— CSS 少一条只是小窗还是纯色底；JS 少摘一次是类粘在 #overlay 上，
    # 之后每个面板都变无底；门写错是手机横屏也吃到无底样式（用户明确否掉的那一档）。
    # 顺序：先证明门在、且规则全在门里 → 再证明副作用（全局卡宽）没被动 → 最后证明 JS 成对 + 调用点数。
    _pick_cond = _re.search(r'@media\s*\(min-width:\s*521px\)\s*and\s*\(min-height:\s*561px\)\s*\{', _style_clean)
    check(bool(_pick_cond),
          '存在 `@media (min-width:521px) and (min-height:561px)` 这道桌面门 —— 它是 ≤520 宽 / ≤360 宽 / '
          'T-short（max-height 560）三个还原档的**补集**：矮屏与窄屏里本节一条都不匹配，'
          '那些档的 .panel 原样生效、实心面板零像素变化')
    _pick_block = ''
    if _pick_cond:
        _pi, _pd = _pick_cond.end() - 1, 0
        for _pk in range(_pi, len(_style_clean)):
            if _style_clean[_pk] == '{':
                _pd += 1
            elif _style_clean[_pk] == '}':
                _pd -= 1
                if _pd == 0:
                    _pick_block = _style_clean[_pi + 1:_pk]
                    break
    check('pick-scene' in _pick_block and 'width:165px' in _pick_block,
          '桌面门里同时有 `#overlay.pick-scene` 与 1.25 倍卡宽 165px（少一个 = 去底与放大只剩一半）')
    check(bool(_re.search(r'#overlay\.pick-scene\s+#overlayWrap\s*\{[^}]*max-width\s*:\s*none', _pick_block)),
          '`#overlay.pick-scene #overlayWrap` 解开了限宽（少了它 = 桌面 .panel 内容宽只有 568，'
          '5×165 加 4×10 间距共 865 会折成两行 —— 1.25 倍名义上生效、观感反而更差）')
    check(bool(_re.search(r'#overlay\.pick-scene\s+\.panel\s*\{[^}]*background\s*:\s*none', _pick_block)),
          '桌面门里 `#overlay.pick-scene .panel` 去掉了纯色底（--ink2 不透明，不去它小窗仍是实心块）')
    # ⚠️ 反过来也要钉：pick-scene 的规则**一条都不许漏到门外**。漏出去就等于绕开了桌面门，
    #    手机横屏会跟着吃到「无底 + 165px」—— 正是用户明确否掉的那一档，而且不报错。
    #    做法是拿门内块做减法，而不是数出现次数：场景类在 JS 的 SCENES/remove 里也会出现。
    _outside = _style_clean.replace(_pick_block, ' ') if _pick_block else _style_clean
    check('pick-scene' not in _outside,
          'CSS 里没有漏在桌面门外的 pick-scene 规则（漏一条 = 矮屏档也去底，用户否掉的形态）')
    # ⚠️ 全局卡宽是**红线**：`.card` 的 132×200 是手牌 / 锻造 / 图鉴 / 奖励三选一共用的，
    #    改它等于全站卡牌变形。1.25 倍只能挂在场景选择器上（见本节 CSS 注释）。
    check(bool(_re.search(r'\.card\s*\{\s*width\s*:\s*132px', _style_clean)),
          '全局 `.card` 仍是 132px 宽（它一改，手牌/锻造/图鉴/奖励三选一全部跟着变形）')
    check('pick-scene' in _scenes,
          '`pick-scene` 在 showOverlay 的 SCENES 名单里: %s' % _scenes)
    check(bool(_re.search(r"classList\.remove\('pick-scene'\)", js_src)),
          "showOverlay 开头有 `classList.remove('pick-scene')`（少了它 = 类粘在 #overlay 上，"
          '之后每个面板都继承无底样式）')
    _pick_calls = _re.findall(r"undefined\s*,\s*'pick-scene'\s*\)", js_src)
    check(len(_pick_calls) == 6,
          '六处选牌小窗（忘忧 / 焚符 / 火符 / 易物·选出手牌 / 易物·选入牌 / 守一）都**显式**传了'
          '第三实参 pick-scene（实测 %d 处）—— 漏传 = 既没有场景类，从别的弹窗进来也不再重播进场'
          % len(_pick_calls))

    # ---- v0.75.0 §四：`forge-scene`（锻造页：满屏宽 + 每两列一组「当前 ▸ 升级后」）----
    # 形态与 pick-scene 同构（新场景类 + 显式调用 + 满屏宽 + 一道 @media 门），但有一处
    # **刻意相反**：锻造页**保留 .panel 的纯色底**（那一页整屏是卡牌与说明文字）。所以除了
    # 那几条「漏一处就静默失效」的钉子，这里再加一条**反向闸** —— 谁顺手把 pick-scene 的
    # background:none 抄过来，当场红。
    def _media_blocks(cond_pat):
        """把某个 @media 条件的**所有**块体抠出来 —— 同一条件在本文件里出现多次
        （max-height:560px 就有基档与矮屏档两块），所以不能只取第一个。"""
        blocks = []
        for m in _re.finditer(cond_pat + r'\s*\{', _style_clean):
            i, depth = m.end() - 1, 0
            for k in range(i, len(_style_clean)):
                if _style_clean[k] == '{':
                    depth += 1
                elif _style_clean[k] == '}':
                    depth -= 1
                    if depth == 0:
                        blocks.append(_style_clean[i + 1:k])
                        break
        return blocks

    check('forge-scene' in _scenes,
          '`forge-scene` 在 showOverlay 的 SCENES 名单里: %s' % _scenes)
    # ⚠️ 数**两处**而不是「在不在」：showOverlay（js/50_ui.js）与 showCardZoom（js/60_boot.js）
    #    各要摘一次。js_src 是七个文件的拼接，所以这里用计数来区分。
    _forge_rm = js_src.count("classList.remove('forge-scene')")
    check(_forge_rm == 2,
          'showOverlay 与 showCardZoom **两处**都摘了 forge-scene（实测 %d 处）—— 少了 '
          'showCardZoom 那次，从锻造页长按放大，详情会变成满屏宽、描述吃锻造那条红色' % _forge_rm)
    _forge_calls = _re.findall(r"undefined\s*,\s*'forge-scene'\s*\)", js_src)
    check(len(_forge_calls) == 2,
          '两处锻造（道观 unknownForge / 篝火·营地 showForgePicker）都**显式**传了第三实参 '
          'forge-scene（实测 %d 处）—— 漏传 = 整页仍是 620px 窄版，六列必然折行' % len(_forge_calls))
    check(bool(_re.search(r'#overlay\.forge-scene\s+#overlayWrap\s*\{[^}]*max-width\s*:\s*none', _style_clean)),
          '`#overlay.forge-scene #overlayWrap` 解开了限宽（基档是 max-width:620px，'
          '三组 932px 锁在里面必然折行 —— 六列不成立）')
    check(bool(_re.search(r'#overlay\.forge-scene\s+\.reward-cards\s*\{[^}]*display\s*:\s*grid', _style_clean)),
          '`#overlay.forge-scene .reward-cards` 改成了 grid（flex-wrap 只保证「放不下才换行」，'
          '给不出「三组一行」这个列数承诺）')
    check(bool(_re.search(r'#overlay\.forge-scene\s+\.reward-cards\s*\{[^}]*repeat\(3,\s*max-content\)', _style_clean)),
          '基档是三组一行 `repeat(3, max-content)`（= 用户要的六列）')
    # ⚠️ 这两条要的是「规则在**门里**」而不是「文件里有」：@media 不加特异度、靠书写顺序取胜，
    #    一条裸写在门外的 repeat(2,…) 会把**所有**档一起降成四列，而且不报错。
    check(any('forge-scene' in b and 'repeat(2, max-content)' in b
              for b in _media_blocks(r'@media\s*\(max-width:\s*700px\)')),
          '`max-width:700px` 门里有 forge-scene 的 `repeat(2, max-content)`（= 四列那档，'
          '矩阵里只剩 640×360；844×390 按用户追加的要求必须留在六列）')
    check(any('forge-scene' in b and 'repeat(1, max-content)' in b
              for b in _media_blocks(r'@media\s*\(max-width:\s*560px\)')),
          '`max-width:560px` 门里有 forge-scene 的 `repeat(1, max-content)`（一组一行，防溢出）')
    check(any('forge-scene' in b and 'padding:12px 10px' in b
              for b in _media_blocks(r'@media\s*\(max-height:\s*560px\)')),
          '`max-height:560px` 门里有 forge-scene 的 `.panel{padding:12px 10px}` —— 基档那条 '
          '(1,2,0) 压得过矮屏档的 .panel(0,1,0)，没有这条，844×390 会在 22px 内边距上白丢 20px 内容高')
    # ⚠️ 顺序闸：@media 不加特异度 ⇒ 书写顺序就是全部。降列的两条必须排在基档之后。
    _i3 = _style_clean.find('repeat(3, max-content)')
    _i2 = _style_clean.find('repeat(2, max-content)')
    _i1 = _style_clean.find('repeat(1, max-content)')
    check(-1 < _i3 < _i2 < _i1,
          '三档列数的书写顺序是 3 → 2 → 1（实际位置 %d / %d / %d）—— @media 不加特异度，'
          '顺序一反，窄屏那档就盖不住基档' % (_i3, _i2, _i1))
    # ---- 反向闸：锻造页**不许**去纯色底（与 pick-scene 刻意相反）----
    check(not _re.search(r'#overlay\.forge-scene\s+\.panel\s*\{[^}]*background\s*:\s*none', _style_clean),
          '`#overlay.forge-scene .panel` **没有**去纯色底（本批明确保留 —— 锻造页整屏是卡牌与'
          '说明文字，那层底是可读性的依托；照抄 pick-scene 的 background:none 会让正文糊在背景图上）')
    # ---- 「红色 = 升级后的效果」这条语汇的两半 ----
    # ① 既有那条卡内红字规则必须原样在（showCardZoom 也在用它，动它 = 长按详情跟着变）。
    check(bool(_re.search(r'\.upgrade-preview\s*\{[^}]*color\s*:\s*#8c2b21', _style_clean)),
          '全局 `.upgrade-preview{color:#8c2b21}` 原样在（长按放大弹窗 js/60_boot.js 也在用它）')
    # ② 锻造作用域里必须有那条**高特异度**规则。⚠️ 这不是修饰：`.card .cdesc`(0,2,0) 压得过
    #    `.upgrade-preview`(0,1,0)，不给它就没有红色，而 grep 与子串闸全绿 —— 典型的静默失效。
    check(bool(_re.search(r'#overlay\.forge-scene\s+\.reward-cards\s+\.cdesc\.upgrade-preview\s*\{[^}]*color', _style_clean)),
          '锻造作用域里有 `#overlay.forge-scene .reward-cards .cdesc.upgrade-preview` 的取色规则 '
          '（没有它 = 左右两栏一个色，「红色 = 升级后的效果」当场失效且不报错）')
    # ---- 两组对照的结构 ----
    check('forge-pair' in js_src and 'forge-arrow' in js_src,
          'forgeCardHTML 里有两组对照的容器 .forge-pair 与箭头 .forge-arrow')
    check(bool(_re.search(r'\.forge-arrow\s+path\s*\{[^}]*stroke\s*:\s*var\(--gold\)', _style_clean)),
          '箭头的描边由 **CSS** 给（`stroke:var(--gold)`）—— SVG 的表现属性不接受 var()，'
          '写在 `<path stroke="var(--gold)">` 上会被当非法值丢掉，实拍是一支暗红箭头')

    # ---- v0.69.0 §D5：KEYWORDS 的零引用词条不能变多 ----
    # 背景：卡面上的 `【X】` 是**唯一**能把玩家引到词条解释的入口（wrapKw 只认方括号，
    # 见 js/20_data.js 的 `text.replace(/【([^】]+)】/g,…)`），UI 上另有零散的 `data-tip="kw:X"`。
    # 冒烟里有一条**正向**闸（全卡【】⊆KEYWORDS），但**反向没有** —— 删掉一张牌的【X】不会让
    # 任何断言转红，词条会变成「没人链接得到、只在关键词面板里挂着」的孤词。
    # §D 把 384 条卡面文案全部重写过，正是最容易顺手删掉一两个【X】的时候 ⇒ 把数字钉住。
    # ⚠️ 断的是「不新增」而不是「== 0」：这 8 条是**本批之前就存在**的孤词（格挡/召唤/引爆…），
    #    它们大多出现在敌人意图、机制说明等**非方括号**的裸文本里，属于既有口径；
    #    §D5 明文规定本批**不删任何 KEYWORDS**（删了会动到关键词面板的内容面）。
    #    所以这里只把「孤词数」变成可见数字，谁新增一条就红，并直接把新增的那条打出来。
    # ⚠️ 判据是「源码里搜得到 `【X】` 或 `kw:"X"`」，**扫描含注释** ⇒ 只在注释里被提到的词条
    #    也算「有引用」（会漏报）。这是刻意的宽松：产物里 JS 已被混淆 + base64 化（明文搜不到），
    #    扫产物等于全盲；而扫源码至少能抓住最常见的回归（从卡面文案里删掉一个【X】且别处也没有）。
    # 基线是**快照**（v0.69.0 打包时实测），不是对游戏数据的镜像 —— 故意写死这 8 个名字，
    # 因为「数不变但换了一条」这种漂移单靠计数抓不到。词条真被改名/新增时按提示更新这里。
    _KW_BASE = set(['格挡', '引爆', '召唤', '立即触发', '记名', '清算', '召唤寿命', '灵化'])
    _kw_keys = ids.get('kw') or []
    _src_all = _style_seg + ''.join(
        io.open(os.path.join(ROOT, 'js', f), 'r', encoding='utf-8').read()
        for f in sorted(os.listdir(os.path.join(ROOT, 'js'))) if f.endswith('.js'))
    # 把 KEYWORDS 自己的定义段剔掉，否则每条词条都会"引用"它自己
    _kw_def = _src_all.find('const KEYWORDS')
    if _kw_def >= 0:
        _end = _src_all.find('\n];', _kw_def)
        if _end > _kw_def:
            _src_all = _src_all[:_kw_def] + _src_all[_end + 3:]
    # 引用形态有三种，缺一种就会把活词条误判成孤词（实测：只认前两种时孤词从 8 涨到 21）：
    #   · 卡面/描述里的 `【X】`（wrapKw 唯一认的形态）
    #   · `data-tip="kw:X"` —— HTML 属性里是**裸**写法（js/50_ui.js、60_boot.js 那几处就是）
    #   · `data-tip="kw:'+k+'"` 这类拼串 —— 由前两种覆盖不到，靠上面「扫含注释」的宽松度兜
    _kw_orphan = [k for k in _kw_keys
                  if ('【%s】' % k) not in _src_all
                  and ('kw:"%s"' % k) not in _src_all
                  and ("kw:'%s'" % k) not in _src_all
                  and ('kw:%s' % k) not in _src_all]
    _kw_new = sorted(set(_kw_orphan) - _KW_BASE)
    _kw_gone = sorted(_KW_BASE - set(_kw_orphan))
    check(len(_kw_keys) > 0 and not _kw_new,
          'KEYWORDS 零引用词条没有新增（基线 %d 条，现 %d 条）%s'
          % (len(_KW_BASE), len(_kw_orphan),
             ('；新增: ' + ','.join(_kw_new)) if _kw_new else ''))
    # 另一半：基线里那几条**重新被引用上了**（说明有人把【X】加回去了）—— 这是好事，
    # 不是回归，所以只提示、不断言，免得每次清理孤词都要改这个快照。
    if _kw_gone:
        print('  注: 基线里的 %d 条孤词已被重新引用（可考虑从快照里删掉）: %s'
              % (len(_kw_gone), ','.join(_kw_gone)))

    # ---- v0.68.1：主菜单五项调整 ----
    # 石碑横排+放大 / 符纸收小飘轻 / 标题放大描边 / 符纸下拉回弹 / 卷轴坠落回弹。
    # 同上面两段的理由：这五项**全是 CSS**，冒烟在 VM 里跑读不到 原型.html，只能在这里钉。
    # 钉的是「意图」不是「数值恰好等于几」—— 数值以后可以调，意图被改回去才是回归。
    def _block_after(src, anchor):
        """取 anchor 之后**括号配对完整**的第一个 {...} 体。
        非贪婪 `\\{([\\s\\S]*?)\\}` 会停在第一个 } 上，而 keyframes 体里每一档自己就带一对
        花括号 ⇒ 只能取到 `0%{...}` 那一段（同第 446 行 .ricon 那个坑的变体）。"""
        i = src.find(anchor)
        if i < 0:
            return None
        i = src.find('{', i)
        if i < 0:
            return None
        d = 0
        for j in range(i, len(src)):
            if src[j] == '{':
                d += 1
            elif src[j] == '}':
                d -= 1
                if d == 0:
                    return src[i + 1:j]
        return None

    check('@keyframes menuTitleEdge' in html, '产物保留 @keyframes menuTitleEdge（标题字迹边框呼吸）')
    # ① 石碑左右并排。旧版是 flex-direction:column 的竖列 —— 改回 column 这版就白做
    _st = _re.search(r'\.menu-col-stele\s*\{([^}]*)\}', _css)
    check(_st is not None, '产物里 .menu-col-stele 规则还在')
    if _st:
        _sb = _st.group(1).replace(' ', '').replace('\n', '')
        check('flex-direction:row' in _sb, '.menu-col-stele 是左右并排（flex-direction:row）: %s' % _sb[:90])
        check('align-items:flex-end' in _sb, '.menu-col-stele 两块石碑底沿对齐（谁高谁大才一眼可读）: %s' % _sb[:90])
    # ② 两块石碑都放大到两倍，且入塔明显压过续。比的是**下限**：只比上限的话，
    #    有人把 vh 系数改小（矮屏又变小）照样能"通过"。
    _sz = {}
    for _k in ('is-start', 'is-continue'):
        _m = _re.search(r'\.menu-hit\.%s \.menu-art\s*\{\s*height:\s*clamp\((\d+)px,\s*([\d.]+)vh,\s*(\d+)px\)' % _k, _css)
        check(_m is not None, '产物里 .menu-hit.%s .menu-art 的 height:clamp(...) 仍是原形（没被换成别的写法）' % _k)
        if _m:
            _sz[_k] = (int(_m.group(1)), float(_m.group(2)), int(_m.group(3)))
    if len(_sz) == 2:
        check(_sz['is-start'][0] >= 240 and _sz['is-start'][2] >= 600,
              '入塔石碑放大到两倍（下限 ≥240px、上限 ≥600px）: %s' % (_sz['is-start'],))
        check(_sz['is-continue'][0] >= 184 and _sz['is-continue'][2] >= 452,
              '续石碑放大到两倍（下限 ≥184px、上限 ≥452px）: %s' % (_sz['is-continue'],))
        check(_sz['is-start'][1] > _sz['is-continue'][1] and _sz['is-start'][2] > _sz['is-continue'][2],
              '入塔明显比续大（vh 系数与上限都更大）: %s vs %s' % (_sz['is-start'], _sz['is-continue']))
    # ③ 三符纸收小（旧上限 250）
    _tl = _re.search(r'\.menu-hit\.is-collection \.menu-art,[\s\S]{0,240}?height:\s*clamp\((\d+)px,\s*([\d.]+)vh,\s*(\d+)px\)', _css)
    check(_tl is not None, '产物里三符纸的 height:clamp(...) 还在')
    if _tl:
        check(int(_tl.group(3)) <= 170, '三符纸收小到 ≤170px 上限（旧 250，用户：可以再小一点）: %s' % _tl.group(3))
        check(float(_tl.group(2)) <= 16, '三符纸的 vh 系数也一并收小（≤16vh，旧 23vh）: %s' % _tl.group(2))
    # ④ 卷轴起点必须是 vh。用 % 的话是相对**元素自身高度**算的：图鉴这类短面板在 1080 高的屏上
    #    -110% 只有 -330px 左右，面板顶沿仍留在屏幕里 ⇒「从上方坠落」变成「从中间冒出来」。
    _sdb = _block_after(_css, '@keyframes scrollDrop')
    check(_sdb is not None, '产物里 @keyframes scrollDrop 体取到了')
    if _sdb:
        _sdn = _sdb.replace(' ', '').replace('\n', '')
        check('translateY(-120vh)' in _sdn, '卷轴起点在屏外（translateY(-120vh)，与面板高度无关）: %s' % _sdn[:70])
        check('-26px' in _sdn and '-9px' in _sdn,
              '卷轴有「回弹 26px + 余震 9px」两级（只回一次就是旧版）: %s' % _sdn[:130])
    # ⑤ 符纸下拉回弹的时长。CSS 与 js/50_ui.js 的 talisOpen 定时器**必须**对齐，
    #    对不齐的两种错法都不报错：CSS 长了会在回弹中途切走场景（纸卡半途），短了就是白等。
    #    （JS 那半边由冒烟断，这里只断 CSS 这半边 —— 产物里的 JS 会过 _build/obf.js，正则不可靠。）
    _tg = _re.search(r'\.menu-hit\.tug \.menu-art\s*\{\s*animation:\s*menuTug\s+([\d.]+)s', _css)
    check(_tg is not None, '产物里 .menu-hit.tug .menu-art 还挂着 menuTug 动画')
    if _tg:
        check(float(_tg.group(1)) >= 0.4,
              '符纸下拉回弹够长（≥.4s，旧的 .15s 在真美术上几乎看不见）: %s' % _tg.group(1))
    # ---- v0.68.2：主菜单背后的战斗界面不渲染 ----
    # `#app` 从开局起就挂在 DOM 里、z-index:1 压着 #bg；v0.65.0 之前全靠主菜单那层不透明底挡住。
    # 图鉴/排行榜/设置走半透明底 ⇒ 战斗 HUD（结束回合 / 灵气珠 / 出牌提示）直接透出来。
    # 反向钉：这条规则一旦被删/被注释吞掉，战斗界面又会从主菜单背后冒出来，而且**不报错**。
    check(_re.search(r'body\.at-menu\s+#app\s*\{[^}]*display\s*:\s*none', _css) is not None,
          '产物里 body.at-menu #app{display:none} 还在（没了 ⇒ 主菜单背后透出战斗 HUD）')
    # 注释配平那条（上面）只能证明**全局**配平；这一条证明**规则本身**没被吞 ——
    # 两者都要：配平也可能把规则挪进某个被注释掉的区域里。
    check('#app{display:none' in _css.replace(' ', ''),
          '`#app{display:none}` 真的落在生效的 CSS 里（不是被注释吞掉）')
    # ---- v0.67.0：道具图标框（.ricon 由横板改方框）+ 无图道具的「字牌」占位 ----
    # ⚠️ 必须放在 `_css` 赋值**之后**（本批第一版放在上面那两段 for 循环后面，_css 还没定义，
    #    直接 UnboundLocalError 崩在启动上 —— 门禁脚本自己崩比断言失败更难查）。
    # 冒烟读不到 原型.html，这批 CSS 它一无所知（同上面两段 v0.66.0 的理由）。
    # 反向钉比正向钉更要紧：`width:100%` 一旦回潮，128×128 的素材又会被 object-fit 压成
    # 56 高塞进 130 宽的横板里 —— 图只占 43%，四周一圈空底，而且**不报错、只是变丑**。
    # ⚠️ 不能直接 `search(r'\.ricon\s*\{...')` 取第一个 —— **`.prelic-chip .ricon{...}` 排在更前面**
    #    （顶栏那几条覆写在样式表开头），会抓到 width:24px 那条覆写、而不是基础规则。
    #    这里要求 `.ricon` 前面的选择器部分是**空的**（即选择器恰好就是 `.ricon`）。
    _rc = None
    for _m in _re.finditer(r'([^{}]*?)\.ricon\s*\{([^}]*)\}', _css):
        if _m.group(1).strip() == '':
            _rc = _m
            break
    check(_rc is not None, '产物里 .ricon 基础规则还在（选择器恰为 .ricon，不是某条覆写）')
    if _rc:
        _rcb = _rc.group(2).replace(' ', '')
        check('width:76px' in _rcb and 'height:76px' in _rcb,
              '.ricon 是 76×76 的方框（方图才不会被压扁）: .ricon{%s}' % _rc.group(2)[:90])
        # ⚠️ 下面这条消息里有 `width:100%%` —— 字面量里的 % 必须写成 %%，
        #    否则 % 后的那个空格被当格式标志、再吃掉后面一个汉字当转换符，直接 ValueError 崩掉。
        check('width:100%' not in _rcb,
              '.ricon 不许退回 width:100%% 的横板（那会把方图压成小图 + 一圈空底）: .ricon{%s}' % _rc.group(2)[:90])
        check('object-fit:contain' in _rcb and 'margin:0auto6px' in _rcb,
              '.ricon 仍然 contain + 居中（.relic 是 flex 列，显式 width 后靠 margin:auto 才居中）: .ricon{%s}'
              % _rc.group(2)[:90])
    _rf = _re.search(r'\.ricon-fb\s*\{[^}]*\}', _css)
    check(_rf is not None, '产物里 .ricon-fb（无图道具的字牌占位）规则还在')
    if _rf:
        _rfb = _rf.group(0).replace(' ', '')
        check('display:flex' in _rfb and 'align-items:center' in _rfb and 'justify-content:center' in _rfb,
              '.ricon-fb 把那个字居中（否则字会贴在左上角，比空白更难看）: %s' % _rf.group(0)[:90])
    # 两档窄屏必须各自跟着 .relic 一起缩：卡缩到 120/100 宽时 76 的图框会占掉七成高度。
    for _w, _why in (('60px', '卡缩到 120 宽'), ('48px', '卡缩到 100 宽')):
        check(_re.search(r'\.relic\s+\.ricon\s*\{[^}]*width\s*:\s*%s' % _w, _css) is not None,
              '@media 里 .relic .ricon 有 %s 档（%s 时图框跟着缩）' % (_w, _why))
    # v0.66.0：「演出期间封住舞台」这条丢了 ⇒ 1 秒演出窗口里连点会调两次 startGame()。
    # 冒烟测不到 CSS（它读不到 原型.html），只能在这儿钉；反向钉比正向钉有效 —— 少了这条，
    # 前端的 MENU_BUSY 闸还在，但那只是 JS 侧的一道闸，pointer-events 才是挡住第二次 pointerdown 的那道。
    _mb = _re.search(r'\.menu-stage\.is-busy\s*\{[^}]*\}', _css)
    check(_mb is not None and 'pointer-events:none' in _mb.group(0).replace(' ', ''),
          '演出期间 .menu-stage.is-busy 关掉 pointer-events（否则连点会重复触发开始/继续）: %s'
          % (_mb.group(0)[:90] if _mb else '(无该规则)'))
    _mh = _re.search(r'#overlay\.hidden\s*\{[^}]*\}', _css)
    check(_mh is None or 'display:none' not in _mh.group(0).replace(' ', ''),
          '#overlay.hidden 不再用 display:none（否则开合过渡整批失效，小窗又变硬切）: %s'
          % (_mh.group(0)[:90] if _mh else '(无该规则)'))
    # 地图整屏**必须**不吃开合动画：drawMapLinks() 靠 getBoundingClientRect 相减定位连线，
    # 相机进场（mapCamInit 2000ms）也不该被叠一层；这条选择器是唯一的护栏。
    check(_re.search(r'#overlay\.ov-enter\.map-scene\s*#overlayWrap\s*\{[^}]*animation\s*:\s*none', _css) is not None,
          '地图整屏显式关闭入场推入动画（transform 会干扰 drawMapLinks 与相机进场）')
    # 与上面 map-scene 同理：整屏场景的底色必须是**实心**的（主菜单那层 88% 黑幕正是本轮要修的东西）。
    _mm = _re.search(r'#overlay\.menu-scene\s*\{[^}]*\}', _css)
    check(_mm is not None, '产物里 #overlay.menu-scene 规则还在')
    if _mm:
        check('rgba' not in _mm.group(0).replace(' ', ''),
              '#overlay.menu-scene 的底色是**实心**的（主菜单背景图不该再被黑幕压掉）: %s' % _mm.group(0)[:90])
    # v0.66.0：标题栏曾被 menuRise 的 `to{transform:none}` + forwards 永久压掉自己的
    # translateX(-50%) —— 实测 1280×720 下标题左沿落在 640（=left:50% 处），等于「只居中了一半
    # 身位」，肉眼明显偏右。现在改用 left:0;right:0 + text-align:center，**不依赖 transform**。
    # 这条只能钉在 CSS 上：冒烟的 DOM 桩里 getBoundingClientRect 恒 10×10，量不出偏没偏。
    _mtb = _re.search(r'\.menu-titlebar\s*\{[^}]*\}', _css)
    check(_mtb is not None, '产物里 .menu-titlebar 规则还在')
    if _mtb:
        check('translateX' not in _mtb.group(0).replace(' ', ''),
              '.menu-titlebar 不靠 translateX 居中（menuRise 的 to{transform:none} 会永久压掉它）: %s'
              % _mtb.group(0)[:90])
    # v0.66.0：`prefers-reduced-motion` 里关动画的选择器**必须够特异度**。@media 不加特异度，
    # 而基样式 `.menu-hit.is-start .menu-art`（石碑呼吸）/ `.menu-hit.is-collection .menu-art`
    # （符纸飘动）都是 (0,3,0)——原来写成 `.menu-hit .menu-art`（0,2,0）**压不过**，
    # 等于开了「减弱动态效果」石碑照呼吸、符纸照飘，这条形同没写。抬 `#overlay` 前缀到 (1,2,0)。
    # 冒烟读不到 CSS（DOM 桩里 getComputedStyle 是空壳），只能在这儿钉。
    _rmi = _css.find('@media (prefers-reduced-motion: reduce)')
    check(_rmi >= 0, '产物里 @media (prefers-reduced-motion: reduce) 块还在')
    if _rmi >= 0:
        _rmb = _css[_rmi:_rmi + 1600].replace(' ', '')
        check('#overlay.menu-hit.menu-art' in _rmb,
              '减弱动态效果下关 .menu-art 动画的选择器带 #overlay 前缀（不带就压不过基样式 (0,3,0)）'
              ': %s' % _rmb[:80])
    # v0.66.0：成就 toast 收起态原写 -140%，而空元素高度只有 26px ⇒ 只上移 36.4px，配 top:14px
    # 后底边停在 y≈+4，在主菜单顶边漏出**一条 4px 宽的金色圆角边**（全屏主菜单后被实拍抓出来）。
    # 换成 calc(-100% - 24px)：与自身高度无关，恒停在视口上方 10px。
    _at = _re.search(r'#achieve-toast\s*\{[^}]*\}', _css)
    check(_at is not None, '产物里 #achieve-toast 规则还在')
    if _at:
        check('calc(-100%' in _at.group(0).replace(' ', ''),
              '#achieve-toast 收起态用 calc(-100%% ...) 而非百分比（空元素只有 26px 高，-140%% 会漏 4px 金边）: %s'
              % _at.group(0)[:90])
    # 提示项，不作断言：stringArrayThreshold=0.75 意味着约 1/4 的字符串保留明文，
    # 哪些字符串被编码随输入变化（同样输入 + 固定 seed 才稳定），命中与否都不影响功能与隐私。
    print('  注: 产物中 %s "%s" 明文' % ('存在' if '素材/' in html else '不存在', '素材/'))

    # v0.62.0：CSS 里的 `url(素材/xxx)` 在单文件产物里**会 404** —— 打包.py 只把 素材/ 收进
    # ASSET_MAP（base64），并不重写 CSS 的 url()（唯一特判是 <img src="素材/rune.png">）。
    # 所以每条 CSS 相对路径都必须有一条 JS 走 assetURL() 的加载路径去覆盖它。
    # 判据：把 url() 里的 '素材/' 前缀去掉，看这个相对路径有没有作为字符串出现在 <script> 里。
    # （开发期 原型.html 与 素材/ 同级所以能看；产物是发出去的，必须自包含。）
    _css_urls = _re.findall(r'url\(\s*素材/([^)\s"\']+)\s*\)', html)
    _script = html[html.find('<script'):]
    _uncovered = sorted({u for u in _css_urls if ('%s' % u) not in _script})
    check(not _uncovered,
          'CSS 里 %d 条 url(素材/…) 都有对应的 assetURL 加载路径（否则产物里 404）: %s'
          % (len(_css_urls), _uncovered[:5]))

    # 「可选覆盖」的两类，没文件都有兜底，故不算未使用：
    #   · 音效 sfx/：没文件就走程序化合成
    #   · 三条升级轨：没文件就退回基础轨（v0.61.31，Boss/精英→battle、商店→map）
    # 其余素材缺一个就是真缺（[1] 会报），这里只盘点「打进来但游戏永远不会请求」的。
    # BGM 六条轨**全部**算「可选覆盖」：基础三首没文件走合成、三条升级轨没文件走回退轨。
    # 注意别只排 musicOptional —— 基础三首自 [1] 起不再进 want（改为任一扩展名判定），
    # 漏排会让它们在这里假报「从未被请求」（本批第一版就是这个假警报）。
    optional_music = set('music/bgm_%s%s' % (t, e)
                         for t in (ids['music'] + ids['musicOptional']) for e in bgm_exts)
    # v0.61.36：数字图（交付即生效）与 musicOptional 同理 —— 只用来排重，不做「必须命中」
    # v0.62.0：原先这里有个 retired = {'map/path-left.png','map/path-right.png'} 的排除集，
    # 语义是「已退役但**仍在磁盘上**」。本批用户明确授权删掉，文件已真的删除 ⇒ 排除集一并撤销。
    # **不要把它加回来**：现在若有人再放一份同名贴图进 素材/map/，它就应当照常报「从未被请求」，
    # 那是真信号；一个排除集会把这份信号静默吃掉（本批清理它的理由就在这）。
    # v0.67.0：被灵石图顶替的那 3 张旧遗物图**仍在磁盘上**，且**故意不加排除集**。
    # 它们必然落进下面那句「从未被请求 / 可考虑删掉」—— 那句话对这三张是**错的建议**：
    # 灵石那 5 张一旦被改名或撤回，回落路径就是 relic/<id>.png。
    # 但也不能把它们从 unused 里静默掉（见上面 retired 那段：排除集会吃掉真信号，
    # 本批清理它的理由就在这）。折中：让提示照常报出来（真信号：这三张确实不再被请求），
    # 另用一条正面断言钉住「文件还在」，谁删了这里立刻红。
    _superseded = ['relic/%s.png' % i for i in _relic_switched]
    check(all(os.path.exists(os.path.join(ASSD, p)) for p in _superseded),
          '被灵石图顶替的 3 张旧遗物图仍在磁盘（它们是 lingshi 缺失时的回落，别删）: %s'
          % ','.join(_superseded))
    # v0.68.0：卡牌的**侧视图 / 背视图**是同批交付、但要等抽牌堆·弃牌堆那一批才接线的素材。
    # 它们当下必然落进下面那句「从未被游戏请求 / 可考虑删掉」—— 那句话对这两张是**错的建议**：
    # 删了就是把用户刚给的牌面美术丢了。与 _superseded 同样处理：照常报出来（真信号），
    # 另用一条正面断言钉住「文件还在」。front.png 已在 want 里，不会出现在这。
    # v0.69.0 §C：**接线那一批到了** —— 抽牌堆/弃牌堆已在 `pileInit()` 里把这两张
    # 写进 CSS 变量（见上面 _ui_card 那段），它们现在进 want。照 v0.68.0 那条自我提醒
    # 把 _reserved 清空：豁免留着就会把「这两张真丢了」的信号静默吃掉。
    _reserved = []
    for _p in ('ui/card/side.png', 'ui/card/back.png'):
        check(_p in want and os.path.exists(os.path.join(ASSD, _p)),
              '卡牌侧视图/背视图已接线且仍在磁盘: %s' % _p)
    unused = sorted(k for k in (keys - set(want) - set(num_want))
                    if not k.startswith('sfx/') and k not in optional_music
                    and k not in _reserved)
    if unused:
        tot = sum(os.path.getsize(os.path.join(ASSD, u)) for u in unused if os.path.exists(os.path.join(ASSD, u)))
        print('\n  注: %d 个素材从未被游戏请求（可考虑从 素材/ 删掉，省 %.0f KB）: %s'
              % (len(unused), tot/1024.0, unused))

    print('\n===== %s =====' % ('全部通过' if not fails else '%d 项失败' % len(fails)))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
