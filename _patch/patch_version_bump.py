# -*- coding: utf-8 -*-
# 版本号 v0.47 → v0.48（血祭阴差增强批）
import io, sys

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = [
    ("<title>志怪塔 · 原型 v0.47</title>", "<title>志怪塔 · 原型 v0.48</title>"),
    ("<h1 class=\"title\">志 怪 塔 <small>· 玩法原型 v0.47</small></h1>", "<h1 class=\"title\">志 怪 塔 <small>· 玩法原型 v0.48</small></h1>"),
    ("<h2>志 怪 塔 · v0.47</h2>", "<h2>志 怪 塔 · v0.48</h2>"),
]

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH version_bump v0.48 DONE: %d 处替换成功' % len(EDITS))
