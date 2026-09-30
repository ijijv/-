# 为什么需要这只：`打包.py` 用 javascript-obfuscator 混淆，**大部分中文串被搬进了
# base64 字符串表**（源码里的 `'well':'古井许愿'` 到产物里成了 `'well':_0x43778e(0x380)`），
# 所以直接 grep 产物中文一律查不到 —— 实测「古」在产物原文里出现 **0 次**，
# 而「鬼市黑商」却是明文（有一部分串没进表）。拿 grep 当"改动没进产物"的证据会**假报警**。
#
# 这里把产物里的三块原样抠出来交给 node（① base64 表 ② 解码器 ③ 轮转 IIFE），
# 再把指定函数体里所有 `_0x???(0x???)` 取出来逐个解码 —— 相当于让混淆器自己回答。
import io, os, re, subprocess, sys

# 中转文件丢进 _test_out/（.gitignore 已忽略），别落在 _patch/ 里被 git add -A 裹走
_TMP = os.path.join('_test_out', '_diststr_tmp.js')
os.makedirs('_test_out', exist_ok=True)

s = io.open('dist/志怪塔.html', encoding='utf-8', errors='replace').read()


def _block_after(src, anchor):
    """从 anchor 之后第一个 `{` 起做花括号配平 —— 正则非贪婪 `\\{.*?\\}` 会在函数体里
    第一个 `}` 就停（本仓库 verify_dist.py 踩过同一个坑）。"""
    i = src.index('{', src.index(anchor))
    d, j = 0, i
    while j < len(src):
        if src[j] == '{':
            d += 1
        elif src[j] == '}':
            d -= 1
            if d == 0:
                return src[i:j + 1]
        j += 1
    raise ValueError('unbalanced')


def grab_fn(name):
    a = s.index('function ' + name + '(')
    p = s.index('(', a)
    q = s.index(')', p)
    head = s[a:q + 1]
    return head + _block_after(s, head)


# ---- 锚点自动发现 -------------------------------------------------------------
# javascript-obfuscator 每跑一次都会给「字符串表 / 解码器 / 轮转 IIFE」重新生成**随机的** `_0x` 名字，
# 所以下面一律按**形状**找，不写任何 `_0x????` 字面量。写死的名字下次打包必然过期，表现是
# `ValueError: substring not found` —— 一个完全不说明问题的报错。本文件就是这么挂的：
# v0.75.0 产物里的名字已经是 表=_0x5020 / 解码器=_0x50e0 / 偏移=0x9ec13，而这里还写着
# _0x4c50 / _0x2179 / 0x61cc0。


def _die(what, hint):
    """锚点发现失败时**响亮地**退出：说清找的是哪一条形状、该去核对什么。
    绝不用裸 ValueError —— 那个报错让人以为是脚本坏了，而不是「混淆器配置变了」。"""
    print('!! 锚点发现失败：%s' % what)
    print('   %s' % hint)
    print('   产物：dist/志怪塔.html（%d 字节）' % len(s))
    sys.exit(2)


def _fn_head(src, at):
    """从 `function` 关键字处切出「`function _0x名(形参)`」那一小段。"""
    p = src.index('(', at)
    q = src.index(')', p)
    return src[at:q + 1]


def _discover_anchors(src):
    """返回 (表函数名, 解码器名, 表源码, 解码器源码, 轮转 IIFE 源码, 轮转偏移)。

    三条判据都**不随混淆配置漂**：
      ① 轮转 IIFE —— 那段 `(function(_0xa,_0xb){…}(_0xT,0xHEX));` 自调用
      ② 表函数   —— 名字由 ① 的**第一个实参**给出（不猜、不遍历）
      ③ 解码器   —— ① 的函数体里 `const _0xX=_0xY` 的那个 Y（轮转循环就是靠 Y(0x…) 取值的）
    ⚠️ **不能**拿「函数体里含 base64 字母表」当**索引**：实测 v0.75.0 产物里字母表是
        `abcdefghijklmnopqrstuvwxyzABC…`（小写在前，自定义顺序）且只出现在解码器**内部**，
        按标准表 `ABC…abc…` 去找会得到 0 个候选。字母表只能当校验，不能当指路牌。"""
    tail_re = re.compile(r'\}\((_0x[0-9a-fA-F]+),0x([0-9a-fA-F]+)\)\);')
    cands = []
    for m in re.finditer(r'\(function\(_0x[0-9a-fA-F]+,_0x[0-9a-fA-F]+\)\{', src):
        t = tail_re.search(src, m.start())
        if not t:
            continue
        # 尾部的名字必须**真的是个表函数定义**，才认这段自调用是轮转 IIFE
        if src.find('function ' + t.group(1) + '(') < 0:
            continue
        cands.append((src[m.start():t.end()], t.group(1), t.group(2)))
    if len(cands) != 1:
        _die('轮转 IIFE（`(function(_0xa,_0xb){…}(_0xT,0xHEX));`，且尾部名字确实是个表函数）',
             '候选 %d 个（期望恰好 1 个）。核对 打包.py 的 obfuscator 是否仍开着 '
             '`stringArray` + `rotateStringArray`。' % len(cands))
    rot, table_name, rot_off = cands[0]

    ta = src.find('function ' + table_name + '(')
    th = _fn_head(src, ta)
    tbl = th + _block_after(src, th)

    dm = re.search(r'const _0x[0-9a-fA-F]+=(_0x[0-9a-fA-F]+)', rot)
    if not dm:
        _die('轮转 IIFE 里的解码器引用（`const _0xX=_0xY`）',
             '轮转循环靠 Y(0x…) 取值，找不到它就无从解码。混淆器版本可能变了。')
    dec_name = dm.group(1)
    da = src.find('function ' + dec_name + '(')
    if da < 0:
        _die('解码器函数 `function %s(`' % dec_name,
             '轮转 IIFE 引用了它，但定义没找到 —— 产物可能被截断。')
    dhead = _fn_head(src, da)
    dec = dhead + _block_after(src, dhead)
    # 校验（只当断言、不当索引）：解码器必须引用表函数。对不上说明 ③ 推错了，别硬跑。
    if table_name not in dec:
        _die('解码器 `%s` 的函数体里出现表函数 `%s`' % (dec_name, table_name),
             '两者对不上 ⇒ 轮转 IIFE 里那个 `const` 不是解码器。混淆器结构变了。')
    return table_name, dec_name, tbl, dec, rot, rot_off


TABLE_NAME, DEC_NAME, tbl, dec, rot, ROT_OFF = _discover_anchors(s)
print('锚点（自动发现）：表=function %s() / 解码器=function %s(…) / 轮转 IIFE %d 字节 / 偏移=0x%s'
      % (TABLE_NAME, DEC_NAME, len(rot), ROT_OFF))

names = sys.argv[1:] or ['unknownWell', 'unknownBlackMarket', 'resolveEndBlock', 'showOverlay']

idx = set()
bodies = {}
for n in names:
    try:
        b = grab_fn(n)
    except ValueError:
        print('!! 产物里找不到 function %s' % n)
        continue
    bodies[n] = b
    idx |= {int(m, 16) for m in re.findall(r'_0x[0-9a-fA-F]+\(0x([0-9a-fA-F]+)\)', b)}

print('函数体抓取：' + ', '.join('%s=%d字节' % (k, len(v)) for k, v in bodies.items()))
print('合计 %d 个不同字符串下标' % len(idx))

probe = tbl + '\n' + dec + '\n' + rot + '\n'
# 解码器的名字是上面**发现**出来的（每次混淆都随机），不能再写死字面量
probe += 'var o={};[%s].forEach(function(i){try{o[i]=%s(i);}catch(e){o[i]="<ERR>";}});\n' % (
    ','.join(str(i) for i in sorted(idx)), DEC_NAME)
probe += 'console.log(JSON.stringify(o));\n'
io.open(_TMP, 'w', encoding='utf-8').write(probe)
r = subprocess.run(['node', _TMP], capture_output=True, text=True, encoding='utf-8')
if r.returncode:
    print('node 失败:', (r.stderr or '')[:600]); sys.exit(1)

import json
d = json.loads(r.stdout)
for n in names:
    if n not in bodies:
        continue
    used = sorted({int(m, 16) for m in re.findall(r'_0x[0-9a-fA-F]+\(0x([0-9a-fA-F]+)\)', bodies[n])})
    print('\n=== %s 用到的串 ===' % n)
    for i in used:
        v = d.get(str(i), '?')
        if re.search(r'[一-鿿]', v):
            print('  0x%03x  %s' % (i, v))