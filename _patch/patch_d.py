# -*- coding: utf-8 -*-
import io, re, sys, subprocess, tempfile, os
P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

# 1) 读出 4 个分块文件中的新 CARDS 卡牌对象文本
parts = []
for f in ['cards1_attack.txt','cards2_defense.txt','cards3_skill.txt','cards4_spirit.txt']:
    txt = io.open(os.path.join(os.path.dirname(__file__), 'cards', f), 'r', encoding='utf-8').read()
    txt = txt.strip().rstrip('\r\n')
    parts.append(txt)
new_body = '\n'.join(parts)

# 2) 定位旧 CARDS 数组：从 'const CARDS = [' 到 其后的 '\n];\nconst RCOLOR'
m = re.search(r'const CARDS = \[.*?\n\];\nconst RCOLOR', s, re.S)
if not m:
    print('FAIL: 找不到 CARDS 数组边界'); sys.exit(1)
old_len = len(m.group(0))
new_block = 'const CARDS = [\n' + new_body + '\n];\nconst RCOLOR'
s = s[:m.start()] + new_block + s[m.end():]

# 3) 断言新旧卡数 = 48
n_new = len(re.findall(r"\{id:'", new_body))
print('new cards count =', n_new)
if n_new != 48:
    print('FAIL: 期望 48 张卡，实得 %d' % n_new); sys.exit(1)

# 4) 写回
io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH D (CARDS replaced) DONE, bytes %d -> %d' % (old_len, len(new_block)))

# 5) node --check 验证 <script>
mm = re.search(r'<script>([\s\S]*?)</script>', s)
if not mm:
    print('FAIL: 找不到 <script>'); sys.exit(1)
js = mm.group(1)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, js.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr)
    sys.exit(1)
print('NODE_OK (%d chars)' % len(js))
