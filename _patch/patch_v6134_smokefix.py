# -*- coding: utf-8 -*-
"""v0.61.34 冒烟块修正：battleBgmFor 吃的是**敌人对象**，不是 key 字符串。

上一版断言 `battleBgmFor(['baiwuchang'])` —— 字符串上没有 .elite/.boss，于是
`l.some(e=>e&&e.boss)`/`.elite` 全 false，三档都返回 'battle'，
红报「普通战与精英战不是同一条轨 | battle vs battle」，**是被测函数没错、测试喂错了**。
（端到端那条路径由 v0.61.31 组验：它喂的是 startBattle 建出来的 G.enemies。）

改法：按 makeEnemy 的产出形状（`elite:!!def.elite, boss:!!def.boss`）从**真实数据**造对象，
并补一条「三类敌人真实存在」的前置断言，防止本节空转。
顺带把 console.warn 变成断言（未登记轨名警告恰好一条 + 同轨不重复警告），
这样跑冒烟不再往 stderr 吐那行提示。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, '_patch', 'smoke_runner.js')

raw = io.open(S, encoding='utf-8').read()
nl = '\r\n' if '\r\n' in raw else '\n'
body = raw.replace('\r\n', '\n')
errs = []


def rep(old, new, tag=''):
    global body
    n = body.count(old)
    if n != 1:
        errs.append('[%s] 命中 %d 次，期望 1 次' % (tag, n))
        return
    body = body.replace(old, new, 1)


# ── 1. 三类敌人的用例对象（真实数据 + 形状说明 + 前置断言） ──
rep(
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
    "      [battleBgmFor([__nk]), battleBgmFor([__ek]), battleBgmFor([__bk])].join(','));\n",

    "    /* 用户点名的那条：「普通和精英也要分开」—— 直接断言两者不同轨。\n"
    "       注意入参形状：battleBgmFor 读的是**敌人对象**上的 .elite/.boss，不是 key 字符串。\n"
    "       喂 key 进去 strings 上没有这两个字段 → 三档全落 'battle'，看着像「没分开」，\n"
    "       实际是喂错了东西（本批第一版就踩了这个，红报 battle vs battle）。\n"
    "       这里按 makeEnemy 的产出形状（`elite:!!def.elite, boss:!!def.boss`）从**真实数据**造对象；\n"
    "       端到端那条路径（startBattle 建完敌人再选轨）由 v0.61.31 那组验。 */\n"
    "    var __pre = { normal: 0, elite: 0, boss: 0 };\n"
    "    Object.keys(ENEMIES).forEach(function (k) {\n"
    "      __pre[ENEMIES[k].boss ? 'boss' : (ENEMIES[k].elite ? 'elite' : 'normal')]++;\n"
    "    });\n"
    "    __ok('v0.61.34 前置：ENEMIES 里普通/精英/Boss 三类都真实存在（否则本节空转）',\n"
    "      __pre.normal > 0 && __pre.elite > 0 && __pre.boss > 0, JSON.stringify(__pre));\n"
    "    var __eobj = function (k) { return { elite: !!ENEMIES[k].elite, boss: !!ENEMIES[k].boss }; };\n"
    "    var __nk = Object.keys(ENEMIES).filter(function (k) { return !ENEMIES[k].elite && !ENEMIES[k].boss; })[0];\n"
    "    var __ek = Object.keys(ENEMIES).filter(function (k) { return ENEMIES[k].elite && !ENEMIES[k].boss; })[0];\n"
    "    var __bk = Object.keys(ENEMIES).filter(function (k) { return ENEMIES[k].boss; })[0];\n"
    "    __ok('v0.61.34 普通战与精英战不是同一条轨（用户要求：分开）',\n"
    "      battleBgmFor([__eobj(__nk)]) === 'battle' && battleBgmFor([__eobj(__ek)]) === 'battle_elite'\n"
    "      && battleBgmFor([__eobj(__nk)]) !== battleBgmFor([__eobj(__ek)]),\n"
    "      battleBgmFor([__eobj(__nk)]) + '（' + __nk + '） vs '\n"
    "      + battleBgmFor([__eobj(__ek)]) + '（' + __ek + '）');\n"
    "    __ok('v0.61.34 三档战斗两两不同轨',\n"
    "      battleBgmFor([__eobj(__nk)]) !== battleBgmFor([__eobj(__bk)])\n"
    "      && battleBgmFor([__eobj(__ek)]) !== battleBgmFor([__eobj(__bk)]),\n"
    "      [battleBgmFor([__eobj(__nk)]), battleBgmFor([__eobj(__ek)]),\n"
    "       battleBgmFor([__eobj(__bk)])].join(','));\n",
    tag='用例对象形状')

# ── 2. console.warn 变成断言（顺带不再往 stderr 吐提示） ──
rep(
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
    "    startBGM = __o3; ASSET_MAP = __savA; CUR_BGM = __savCUR;\n",

    "    var __savA = ASSET_MAP, __savCUR = CUR_BGM, __o3 = startBGM, __req = [];\n"
    "    var __ow = console.warn, __warns = [];\n"
    "    console.warn = function (m) { __warns.push(m); };   // 把提示收进断言，别往 stderr 吐\n"
    "    ASSET_MAP = null;   // 开发期口径（file://）：透传逻辑轨，不预判磁盘\n"
    "    startBGM = function (t) { __req.push(t); };\n"
    "    var __werr = null;\n"
    "    try { setBGM('bgm_typo'); } catch (e) { __werr = e; }\n"
    "    var __lastReq = __req[__req.length - 1];\n"
    "    __ok('v0.61.34 未登记轨名不抛错（战斗中不能因轨名拼错炸掉）', __werr === null, __werr && __werr.message);\n"
    "    __ok('v0.61.34 未登记轨名仍按原名请求（探测/合成兜底，不是静默丢弃）',\n"
    "      __lastReq === 'bgm_typo', 'got=' + __lastReq);\n"
    "    __ok('v0.61.34 CUR_BGM 如实记录逻辑轨（设置页/存档读的就是它）', CUR_BGM === 'bgm_typo', CUR_BGM);\n"
    "    __ok('v0.61.34 未登记轨名会 console.warn 一条并点名该轨',\n"
    "      __warns.length === 1 && String(__warns[0]).indexOf('bgm_typo') >= 0, __warns.join('|'));\n"
    "    __warns = []; __req = [];\n"
    "    try { setBGM('bgm_typo'); } catch (e) {}\n"
    "    __ok('v0.61.34 同一条未登记轨名不会反复警告（不刷屏），且仍照旧请求',\n"
    "      __warns.length === 0 && __req.length === 1 && __req[0] === 'bgm_typo');\n"
    "    console.warn = __ow; startBGM = __o3; ASSET_MAP = __savA; CUR_BGM = __savCUR;\n",
    tag='console.warn 断言')

if errs:
    print('=== 锚点校验失败，未写入 ===')
    for e in errs:
        print(' ✗', e)
    sys.exit(1)
if ',,' in body:
    print('=== 出现连续逗号 ,, 未写入 ===')
    sys.exit(1)

io.open(S, 'w', encoding='utf-8', newline='').write(body.replace('\n', nl))
print('OK smoke_runner.js %d 字符' % len(body))