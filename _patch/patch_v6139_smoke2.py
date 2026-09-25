# -*- coding: utf-8 -*-
"""v0.61.39 · 冒烟二次修正：4 条失败里的 3 条根因 + 1 处代码注释笔误。

1) `:579` 雷符 C 预览 —— 上一版重钉漏了这一条（它不叫「C 预伤害」，叫「雷符预览」）。
   md：每层 +3、上限 +6 → 至多吃 2 层。血怒 4 → 4+3×2 = 10（旧式 5+2×3=11）。
2) 阴差初始卡池 «种类 8、张数 10» —— 我把种类数当成了张数，写成 cnt===8。
   3+1+1+1+1+1+1+1 = 10。代码是对的，断言写错了。
3) 移形换影闪避对拍 —— 结构写坏：`__base()` 会整个换掉全局 G，
   两次 __base 之后再连打两次 dealDamageToPlayer，全落到第二个 G 上，
   g1 拿到的是已被丢弃的旧对象。改成「一段一测、打完立刻断言」。
4) js/20_data.js 那条 deck 注释同样把 10 张写成 8 张。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, '_patch', 'smoke_runner.js')
D_PATH = os.path.join(ROOT, 'js', '20_data.js')

errs = []


def load(p):
    raw = io.open(p, encoding='utf-8').read()
    nl = '\r\n' if '\r\n' in raw else '\n'
    return nl, raw.replace('\r\n', '\n')


def save(p, body, nl):
    io.open(p, 'w', encoding='utf-8', newline='').write(body.replace('\n', nl))


def ed(body, old, new, label, n=1):
    c = body.count(old)
    if c != n:
        errs.append('%s —— 锚点命中 %d 次（期望 %d）' % (label, c, n))
    return body.replace(old, new)


S_nl, S_ = load(S)
D_nl, D = load(D_PATH)

# ── 1) 雷符 C 预览：11 → 10（每层 +3、上限 +6 → 至多吃 2 层） ──
S_ = ed(S_,
       "    __ok('雷符预览 C=5+血怒6=11', lv('leifu').d === 11, 'd=' + lv('leifu').d);",
       "    __ok('v0.61.39 雷符预览 C=4+3×2=10（血怒4，每层+3上限+6 → 吃满 2 层）',\n"
       "      lv('leifu').d === 10, 'd=' + lv('leifu').d);",
       '雷符预览 C')

# ── 2) 阴差初始卡池：种类 8 / 张数 10 ──
S_ = ed(S_,
       "    /* —— 初始卡池（v0.61.39 按《阴差版卡池 - 副本.md》重定）：\n"
       "       雷符×3 金刚符×1 火符×1 焚符×1 血契×1 守一×1 燃血术×1 纸人×1 = 8 张 —— */",
       "    /* —— 初始卡池（v0.61.39 按《阴差版卡池 - 副本.md》重定）：\n"
       "       雷符×3 金刚符×1 火符×1 焚符×1 血契×1 守一×1 燃血术×1 纸人×1 = 8 种、共 10 张 —— */",
       '阴差卡池 注释')
S_ = ed(S_,
       "    __ok('v0.61.39 阴差初始卡池 8 张且组成正确',\n"
       "      cnt === 8 && got === 'leifux3 jingangx1 huofux1 fenfux1 xueqix1 shouyix1 ranxuex1 zhirenx1', got);",
       "    __ok('v0.61.39 阴差初始卡池 8 种共 10 张且组成正确',\n"
       "      cnt === 10 && got === 'leifux3 jingangx1 huofux1 fenfux1 xueqix1 shouyix1 ranxuex1 zhirenx1', got);",
       '阴差卡池 断言')

# ── 3) 移形换影闪避对拍：一段一测 ──
S_ = ed(S_,
       "      var g1 = __base('yincha'); g1.hp = 40; g1.xuenu = 0;\n"
       "      var c1 = __card('yixing'); c1.eff(false, c1);\n"
       "      var g2 = __base('yincha'); g2.hp = 40; g2.xuenu = 0;\n"
       "      var c2 = Object.assign({}, __card('yixing'), { up: true }); c2.eff(true, c2);\n"
       "      dealDamageToPlayer(5, { name: '测试妖' });\n"
       "      dealDamageToPlayer(5, { name: '测试妖' });\n"
       "      __ok('v0.61.39 移形换影(阴差未升级) 闪避结算 → 回 2 血 + 1 层血怒',\n"
       "        g1.hp === 42 && g1.xuenu === 1 && g1.dodge === 0,\n"
       "        'hp=' + g1.hp + ' xuenu=' + g1.xuenu + ' dodge=' + g1.dodge);\n"
       "      __ok('v0.61.39 移形换影(阴差升级) 闪避结算 → 回 4 血 + 2 层血怒',\n"
       "        g2.hp === 44 && g2.xuenu === 2 && g2.dodge === 0,\n"
       "        'hp=' + g2.hp + ' xuenu=' + g2.xuenu + ' dodge=' + g2.dodge);",
       "      // __base() 会整个换掉全局 G —— 必须一段一测、打完立刻断言，\n"
       "      // 否则后一次 __base 会把前一段的 G 换走，g1 拿到的是已丢弃的旧对象。\n"
       "      var g1 = __base('yincha'); g1.hp = 40; g1.xuenu = 0;\n"
       "      var c1 = __card('yixing'); c1.eff(false, c1);\n"
       "      dealDamageToPlayer(5, { name: '测试妖' });\n"
       "      __ok('v0.61.39 移形换影(阴差未升级) 闪避结算 → 回 2 血 + 1 层血怒',\n"
       "        g1.hp === 42 && g1.xuenu === 1 && g1.dodge === 0,\n"
       "        'hp=' + g1.hp + ' xuenu=' + g1.xuenu + ' dodge=' + g1.dodge);\n"
       "      var g2 = __base('yincha'); g2.hp = 40; g2.xuenu = 0;\n"
       "      var c2 = Object.assign({}, __card('yixing'), { up: true }); c2.eff(true, c2);\n"
       "      dealDamageToPlayer(5, { name: '测试妖' });\n"
       "      __ok('v0.61.39 移形换影(阴差升级) 闪避结算 → 回 4 血 + 2 层血怒',\n"
       "        g2.hp === 44 && g2.xuenu === 2 && g2.dodge === 0,\n"
       "        'hp=' + g2.hp + ' xuenu=' + g2.xuenu + ' dodge=' + g2.dodge);",
       '移形换影 闪避对拍')

# ── 4) 20_data.js deck 注释：共 8 张 → 8 种、共 10 张 ──
D = ed(D,
       "（共 8 张）",
       "（8 种、共 10 张）",
       '20_data 阴差卡池注释')

if errs:
    print('!! 有锚点未命中，一个字节都不写：')
    for m in errs:
        print('   -', m)
    sys.exit(1)

save(S, S_, S_nl)
save(D_PATH, D, D_nl)
print('OK smoke_runner.js + 20_data.js 已写')