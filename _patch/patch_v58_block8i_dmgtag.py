# -*- coding: utf-8 -*-
# v0.58 Block8i：武僧「格挡/诅咒浮动伤害」牌在卡面恒显示实时预伤害
#   （雷符/火符/剑符/噬血/百鬼/镇妖铃/斩妖剑 —— 卡面正文只写基础值，徽章给出实时值）
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

EDITS.append((
"""const DYNAMIC_DMG = ['tiebushan','shihun','qungui','taomufu','shixue','baigui','zhouyu'];""",
"""const DYNAMIC_DMG = ['tiebushan','shihun','qungui','taomufu','shixue','baigui','zhouyu'];
// 苦行武僧：伤害随「当前格挡/目标诅咒」浮动的牌 —— 卡面正文只写基础值，徽章恒定显示实时预伤害
const WUSENG_BLOCK_DMG = ['leifu','huofu','jianfu','shixue','baigui','zhenyaoling','zhanyaojian'];
const WUSENG_NO_CURSE_TAG = ['leifu','huofu','jianfu','shixue','baigui','zhenyaoling']; // 这些牌不吃【诅咒】，徽章不挂诅咒标签"""))

EDITS.append((
"""  return { raw, d, curse:e.curse||0, weak:G.weak>0 && !ignoreWeak, taomu, tongqian, zhusha, turnBuf, dynamic, perTurn };""",
"""  const wbDmg = G.hero==='wuseng' && WUSENG_BLOCK_DMG.indexOf(c.id)>=0;
  const curseTag = (G.hero==='wuseng' && WUSENG_NO_CURSE_TAG.indexOf(c.id)>=0) ? 0 : (e.curse||0);
  return { raw, d, curse:curseTag, weak:G.weak>0 && !ignoreWeak, taomu, tongqian, zhusha, turnBuf, dynamic: dynamic || wbDmg, perTurn };"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v58_block8i_dmgtag DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
