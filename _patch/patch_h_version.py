# -*- coding: utf-8 -*-
# 版本号 v0.48 → v0.49（title / h1 / 主菜单 overlay 三处）
import io, sys

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
n = s.count('0.48')
if n != 3:
    print('VER FAIL: 0.48 匹配 %d 次（期望 3）' % n); sys.exit(1)
s = s.replace('0.48', '0.49')
io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH h_version DONE: v0.48 → v0.49（%d 处）' % n)
