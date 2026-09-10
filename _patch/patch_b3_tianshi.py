# -*- coding: utf-8 -*-
# ④ 天师被动统一：始终 applyCurse(1)，溢出每层自动→1 格挡；删死字段 curseOverflowBlock 的写入
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# E1 applyCurse：删掉已死的累计字段写入（gainBlock(overflow) 保留，溢出→格挡逻辑本体在此）
EDITS.append((
"""    G.curseOverflowBlock = (G.curseOverflowBlock || 0) + overflow;
    gainBlock(overflow);""",
"""    gainBlock(overflow);"""))

# E2 被动文案：达上限获 2 格挡 → 溢出每层转 1 格挡
EDITS.append((
"""；已达 6 层上限则改为获得 2 点格挡。""",
"""；施加产生的溢出（超过上限 6 层）每层转化为 1 点格挡。"""))

# E3 startTurn 注释同步
EDITS.append((
"""    // 咒印道体：每回合开始时，对【诅咒】层数最高的敌人施加 1 层诅咒。若该敌人已达 6 层上限，改为获得 2 点格挡。""",
"""    // 咒印道体：每回合开始时，对【诅咒】层数最高的敌人施加 1 层诅咒；施加产生的溢出（超 6 层上限）每层转为 1 点格挡。"""))

# E4 startTurn 被动逻辑：一律 applyCurse（达上限时自然溢出 1→1 格挡，由 applyCurse 内置处理）
EDITS.append((
"""    if(maxCurseEnemy){
      if(maxCurseCount >= 6){ gainBlock(2); log('咒印道体：敌人诅咒已达上限，获得 2 点格挡'); }
      else { applyCurse(maxCurseEnemy, 1); log(`咒印道体：对敌人施加 1 层诅咒（当前最高 ${maxCurseCount} 层）`); }
    }""",
"""    if(maxCurseEnemy){
      applyCurse(maxCurseEnemy, 1);
      if(maxCurseCount < 6) log(`咒印道体：对敌人施加 1 层诅咒（当前最高 ${maxCurseCount} 层）`);
    }"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i+1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH b3_tianshi DONE: %d 处替换成功' % len(EDITS))

mm = re.search(r'<script>([\s\S]*?)</script>', s)
if not mm:
    print('FAIL: 找不到 <script>'); sys.exit(1)
js = mm.group(1)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, js.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK (%d chars)' % len(js))
