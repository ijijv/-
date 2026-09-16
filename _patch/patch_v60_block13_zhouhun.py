# -*- coding: utf-8 -*-
# v0.60 Block13：#42 咒印（A 赶尸人）—— 「咒魂」是氛围说法，不是召唤物
#   文档：召唤携带尸气的咒魂，立马获得3/5点尸气
#   正解：咒魂纯属描述，实际作用只有「立即获得 3/5 点尸气」，不产生任何召唤单位
#   旧实现：addSummon({type:'zhouhun', v:0, dur:3}) —— 凭空造出一个 3 回合的
#           幽灵召唤物（summonAct 只认 zhiren/xiaogui/yinbing/shi_wang，根本
#           不处理这个 type，所以只占位不打伤害），却被 A 列「场上每有 1 个召唤
#           单位 +N」的牌当成真召唤物吃满加成。
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# —— 1) 卡面文字：只留机制，不写召唤 ——
EDITS.append((
'''    t:(u)=>G.hero==='ganshiren'?`召唤咒魂。立即获得 ${u?5:3} 点【尸气】`''',
'''    t:(u)=>G.hero==='ganshiren'?`立即获得 ${u?5:3} 点【尸气】`'''))

# —— 2) 结算：删掉幽灵召唤物 ——
EDITS.append((
'''    eff:(u)=>{ if(G.hero==='ganshiren'){ addSummon({type:'zhouhun', v:0, dur:3}); gainShiqi(u?5:3); log(`咒印：召唤咒魂，获得 ${u?5:3} 点【尸气】`); return; }''',
'''    eff:(u)=>{ if(G.hero==='ganshiren'){ gainShiqi(u?5:3); log(`咒印：获得 ${u?5:3} 点【尸气】`); return; }'''))

# —— 3) 召唤面板：删掉 zhouhun 展示分支（已无产生点） ——
# 用「连同下一行一起匹配、只留下一行」的方式删除，避免空串替换
EDITS.append((
'''    : s.type==='zhouhun'?`咒魂：携带尸气`
    : s.type==='xiaogui'?''',
'''    : s.type==='xiaogui'?'''))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）\n---%s---' % (i + 1, n, old[:120])); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v60_block13_zhouhun DONE: %d 处' % len(EDITS))
print('残留 zhouhun 产生/展示点: %d（应为 0）' % len(re.findall(r'zhouhun', s)))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
