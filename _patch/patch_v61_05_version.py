# -*- coding: utf-8 -*-
# v0.61.05 版本号 3 处（拆分后 1 处在 js/60_boot.js）+ 结构自检
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OLD, NEW = 'v0.61.01', 'v0.61.05'

TARGETS = [
    (os.path.join(ROOT, '原型.html'), [
        ('<title>志怪塔 · 原型 %s</title>' % OLD, '<title>志怪塔 · 原型 %s</title>' % NEW),
        ('<small>· 玩法原型 %s</small>' % OLD, '<small>· 玩法原型 %s</small>' % NEW),
    ]),
    (os.path.join(ROOT, 'js', '60_boot.js'), [
        ('<h2>志 怪 塔 · %s</h2>' % OLD, '<h2>志 怪 塔 · %s</h2>' % NEW),
    ]),
]

for path, edits in TARGETS:
    s = io.open(path, 'r', encoding='utf-8').read()
    for old, new in edits:
        if s.count(old) != 1:
            print('FAIL %s: %r 匹配 %d 次' % (os.path.basename(path), old, s.count(old))); sys.exit(1)
        s = s.replace(old, new)
    io.open(path, 'w', encoding='utf-8', newline='').write(s)
    print('OK %s' % os.path.relpath(path, ROOT))

# 结构自检：html 里不能再有内联 <script>（只剩 <script src>）
html = io.open(os.path.join(ROOT, '原型.html'), 'r', encoding='utf-8').read()
n_src = html.count('<script src=')
n_all = len(__import__('re').findall(r'<script', html))
if n_src != 7 or n_all != 7:
    print('FAIL 结构：<script src>=%d / 全部 <script>=%d（期望 7/7）' % (n_src, n_all)); sys.exit(1)
print('结构 OK：7 个 <script src>，无内联脚本')
