# -*- coding: utf-8 -*-
# 阴差被动残留清理（原型.html，Task#15/#16）：
# ① 英雄文案仍承诺"打出扣血牌召唤小妖"，但【失去生命】口径（整合表）早已不喂小妖，
#    引擎也无任何 xiaoyao 创建点 → 文案改述现行机制（血怒+以血换力，不承诺小妖）；
# ② yinchaSummon() 无调用、纯死函数 → 删除（summonAct/summonHTML 的 xiaoyao 分支保留，
#    供旧档/将来重挂，无害）。
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# ① 阴差英雄文案：去除"召唤小妖"自动被动承诺，改述现行【血怒】+失去生命机制
EDITS.append((
"""  {id:'yincha', name:'血祭阴差', desc:'以血为引，燃烧生命换取爆发。', mech:'召唤小妖', passive:'打出扣血牌时，召唤一只小妖（持续 1 回合，伤害 1，重复触发则叠加回合数）。',""",
"""  {id:'yincha', name:'血祭阴差', desc:'以血为引，燃烧生命换取爆发。', mech:'血怒 · 以血换力', passive:'【血怒】上限 10 层、跨战斗保留。以【失去生命】换力：带“每层 +N（上限 M）”的牌打出时消耗对应【血怒】爆发，生命越低部分牌越强。',"""))

# ② 删除死函数 yinchaSummon
EDITS.append((
"""}
// 血祭阴差的扣血卡：召唤一只小妖（保留小妖身份，但仅在显式调用时触发）
function yinchaSummon(){
  const existing=G.summons.find(s=>s.type==='xiaoyao');
  if(existing){ existing.dur+=1; log('小妖嗜血，持续回合 +1'); }
  else { G.summons.push({type:'xiaoyao', v:1, dur:1}); log('血祭阴差：召唤一只小妖'); }
}
const DYNAMIC_DMG =""",
"""}
const DYNAMIC_DMG ="""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i, n))
        sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH yincha_passive DONE: %d 处替换成功' % len(EDITS))

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
