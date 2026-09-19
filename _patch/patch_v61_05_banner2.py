# -*- coding: utf-8 -*-
# v0.61.05 收尾2：横幅里不再写内部路径（打包.py 的隐私自检会命中 `_patch`，
#              而且产物是发给朋友的，不该出现仓库内部文件名）
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OLD = ' * 拼接校验：js/*.js 去掉本横幅后，应与切分前正文逐字节一致（_patch/verify_v61_05.py）。'
NEW = ' * 拼接校验：本文件组去掉各自横幅后，应与切分前的内联脚本正文逐字节一致。'

jsd = os.path.join(ROOT, 'js')
n = 0
for fn in sorted(os.listdir(jsd)):
    if not fn.endswith('.js'):
        continue
    p = os.path.join(jsd, fn)
    s = io.open(p, 'r', encoding='utf-8', newline='').read()
    if s.count(OLD) != 1:
        print('FAIL %s: 匹配 %d 次' % (fn, s.count(OLD))); sys.exit(1)
    io.open(p, 'w', encoding='utf-8', newline='').write(s.replace(OLD, NEW))
    n += 1
print('横幅去内部路径 OK：%d 个文件' % n)

# 顺带把 打包.py 的隐私自检说明写清楚：命中的是横幅注释
pp = os.path.join(ROOT, '打包.py')
t = io.open(pp, 'r', encoding='utf-8').read()
o = "        print('   （ASSET_MAP 里的 data URI 不含路径；若确实误报请人工确认后再发）')"
w = ("        print('   （ASSET_MAP 里的 data URI 不含路径；横幅注释里也别写仓库内部路径，'\n"
     "              '否则每打一次都误报）')")
if t.count(o) != 1:
    print('FAIL 打包.py 提示行匹配 %d 次' % t.count(o)); sys.exit(1)
io.open(pp, 'w', encoding='utf-8', newline='').write(t.replace(o, w))
print('打包.py 提示语已更新')
