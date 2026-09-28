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


tbl = 'function _0x4c50()' + _block_after(s, 'function _0x4c50()')
dh = 'function _0x2179('
di = s.index(dh)
dp = s.index('(', di)
dq = s.index(')', dp)
dec = s[di:dq + 1] + _block_after(s, s[di:dq + 1])
rot_i = s.index('(function(_0x1ce404,_0x3b40eb){')
rot = s[rot_i:s.index('}(_0x4c50,0x61cc0));', rot_i) + len('}(_0x4c50,0x61cc0));')]

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
probe += 'var o={};[%s].forEach(function(i){try{o[i]=_0x2179(i);}catch(e){o[i]="<ERR>";}});\n' % ','.join(str(i) for i in sorted(idx))
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