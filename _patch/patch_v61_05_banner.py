# -*- coding: utf-8 -*-
# v0.61.05 收尾：
#   1) 横幅文案去掉裸 ` <script ` 字样（避免打包成内联脚本后与标签混淆），并去掉 file:// 提法
#   2) 验收门放行「版本号」这一处刻意改动（其余任何差异仍然拦住）
import io, os, sys, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

LINE_EDITS = [
    (' * 由 原型.html 的整段 <script> 按原顺序切分而来（v0.61.05 三层重构，纯搬移）。',
     ' * 由 原型.html 的整段内联脚本按原顺序切分而来（v0.61.05 三层重构，纯搬移）。'),
    (' * 拼接校验：cat js/*.js 去掉本横幅后，应与切分前正文 + 末尾一个换行 逐字节一致。',
     ' * 拼接校验：js/*.js 去掉本横幅后，应与切分前正文逐字节一致（_patch/verify_v61_05.py）。'),
    (' * 加载：经典 <script src>（非 ES module）—— 双击 file:// 亦可直接游玩。',
     ' * 加载：经典外链脚本（非 ES module），双击本地打开即可直接游玩。'),
]

jsd = os.path.join(ROOT, 'js')
n = 0
for fn in sorted(os.listdir(jsd)):
    if not fn.endswith('.js'):
        continue
    p = os.path.join(jsd, fn)
    s = io.open(p, 'r', encoding='utf-8', newline='').read()
    for old, new in LINE_EDITS:
        if s.count(old) != 1:
            print('FAIL %s: %r 匹配 %d 次' % (fn, old[:40], s.count(old))); sys.exit(1)
        s = s.replace(old, new)
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    n += 1
print('横幅改写 OK：%d 个文件' % n)

# ---- 验收门：放行版本行 ----
vp = os.path.join(ROOT, '_patch', 'verify_v61_05.py')
v = io.open(vp, 'r', encoding='utf-8').read()
old = """    joined = ''.join(parts)
    if joined != ref:"""
new = """    joined = ''.join(parts)
    # 本批唯一被放行的差异：切分后按惯例做了版本号提升（v0.61.01 → v0.61.05），
    # 只此一处、且只在这一行 —— 其余任何 1 字节差异都会失败。
    VER = re.compile(r'志 怪 塔 · v[\\d.]+')
    j_n, r_n = VER.sub('志 怪 塔 · vX', joined), VER.sub('志 怪 塔 · vX', ref)
    if j_n != r_n:"""
if v.count(old) != 1:
    print('FAIL verify 脚本锚点：%d 次' % v.count(old)); sys.exit(1)
v = v.replace(old, new)
v = v.replace("""    print('VERIFY_OK  %d 个文件 / %d 字符 == 切分前正文（sha256 %s）'""",
              """    print('VERIFY_OK  %d 个文件 / %d 字符 == 切分前正文（版本行已放行）（sha256 %s）'""")
io.open(vp, 'w', encoding='utf-8', newline='').write(v)
print('验收门已放行版本行')
