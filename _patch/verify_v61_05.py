# -*- coding: utf-8 -*-
"""
批1.5 重构的**可重跑验收门**：js/*.js（去掉每文件头部横幅）拼接后，
必须与切分前的 <script> 正文快照逐字节一致。

用法：
    python _patch/verify_v61_05.py

注意：只在本批「纯搬移」提交上前提成立。此后任何一次对 js/*.js 的正常改动
都会让这个门失败 —— 那是预期行为（说明代码真的变了，不再是纯搬移）。
"""
import io, os, re, sys, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BANNER_END = ' * ' + '=' * 76 + ' */\n'


def main():
    ref_p = os.path.join(ROOT, '_patch', '_orig_script_body.js')
    if not os.path.exists(ref_p):
        print('缺快照 %s —— 先跑 _patch/split_v61_05.py' % ref_p); return 2
    ref = io.open(ref_p, 'r', encoding='utf-8', newline='').read()

    html = io.open(os.path.join(ROOT, '原型.html'), 'r', encoding='utf-8', newline='').read()
    srcs = re.findall(r'<script\s+src="([^"]+)"\s*>\s*</script>', html)
    if not srcs:
        print('FAIL: 原型.html 里没有 <script src>'); return 1

    parts, bad = [], []
    for rel in srcs:
        p = os.path.join(ROOT, rel.replace('/', os.sep))
        if not os.path.exists(p):
            bad.append('%s 不存在' % rel); continue
        txt = io.open(p, 'r', encoding='utf-8', newline='').read()
        if BANNER_END not in txt:
            bad.append('%s 缺横幅（无法剥离）' % rel); continue
        parts.append(txt.split(BANNER_END, 1)[1])
    if bad:
        print('FAIL:\n  ' + '\n  '.join(bad)); return 1

    joined = ''.join(parts)
    # 本批唯一被放行的差异：切分后按惯例做了版本号提升（v0.61.01 → v0.61.05），
    # 只此一处、且只在这一行 —— 其余任何 1 字节差异都会失败。
    VER = re.compile(r'志 怪 塔 · v[\d.]+')
    j_n, r_n = VER.sub('志 怪 塔 · vX', joined), VER.sub('志 怪 塔 · vX', ref)
    if j_n != r_n:
        print('VERIFY FAIL: 拼接结果与切分前正文不一致')
        print('  快照 %d 字符 / 拼接 %d 字符' % (len(ref), len(joined)))
        for i in range(min(len(joined), len(ref))):
            if joined[i] != ref[i]:
                print('  首个差异 @ %d:\n    快照 %r\n    拼接 %r'
                      % (i, ref[max(0, i - 40):i + 60], joined[max(0, i - 40):i + 60]))
                break
        return 1

    print('VERIFY_OK  %d 个文件 / %d 字符 == 切分前正文（版本行已放行）（sha256 %s）'
          % (len(parts), len(joined), hashlib.sha256(joined.encode('utf-8')).hexdigest()[:16]))
    print('  文件：%s' % ' → '.join(srcs))
    return 0


if __name__ == '__main__':
    sys.exit(main())
