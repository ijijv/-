# -*- coding: utf-8 -*-
# v0.59 Block9a：阴差初始卡池 + 新状态字段 + 召唤序列化补字段 + 回合重置
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# ① 阴差初始卡池：雷符×3 金刚符×2 火符×1 佛渡×1 聚灵×1 血契×1 守一×1 渡魂归己×1
EDITS.append((
"""   deck:[['leifu',5],['jingang',4],['fodu',1],['sheshen',1]]},
];""",
"""   deck:[['leifu',3],['jingang',2],['huofu',1],['fodu',1],['juling',1],['xueqi',1],['shouyi',1],['duhunguiji',1]]},  // v0.59 阴差初始卡池：雷符×3 金刚符×2 火符×1 佛渡×1 聚灵×1 血契×1 守一×1 渡魂归己×1（共 11 张）
];"""))

# ② newState 新字段（群鬼乱舞 C 的「每 2 点失血 +N」档位）
EDITS.append((
"""    retainHeal:0, pendingBlockStart:0, boostCurse:0, xisuiTurns:0,""",
"""    retainHeal:0, pendingBlockStart:0, boostCurse:0, xisuiTurns:0, bleedSummonsBonus:1,"""))

# ③ 召唤物存档：补 healV / up（原先只存 type/v/dur，读档后升级态与回血值丢失）
EDITS.append((
"""    summons:G.summons.map(x=>({type:x.type, v:x.v, dur:x.dur})),""",
"""    summons:G.summons.map(x=>({type:x.type, v:x.v, dur:x.dur, healV:x.healV, up:x.up})),"""))
EDITS.append((
"""  G.summons=(d.summons||[]).map(x=>({type:x.type, v:x.v, dur:x.dur}));""",
"""  G.summons=(d.summons||[]).map(x=>({type:x.type, v:x.v, dur:x.dur, healV:x.healV, up:x.up}));"""))

# ④ 回合开始重置：群鬼乱舞档位
EDITS.append((
"""  G.bleedSummons=false;""",
"""  G.bleedSummons=false; G.bleedSummonsBonus=1;"""))

# ⑤ summonAct：群鬼乱舞（C）档位参与计算
EDITS.append((
"""  const bleedBonus = G.bleedSummons ? Math.floor((G.hpLostTurn||0)/2) : 0;""",
"""  const bleedBonus = G.bleedSummons ? Math.floor((G.hpLostTurn||0)/2)*(G.bleedSummonsBonus||1) : 0;"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v59_block9a_deck DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
