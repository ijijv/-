# -*- coding: utf-8 -*-
# v0.60 Block10f：天师 D 列 · 卡面预伤害徽章
#   TIANSHI_DYN_DMG：伤害随【诅咒】层数/格挡/召唤浮动的牌，徽章常显实时预伤害
#   咒雨（天师）无直伤 → 不显示徽章；落空理由按英雄措辞
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

EDITS.append((
"""const YINCHA_NO_CURSE_TAG = ['leifu','huofu','jianfu','tianlei','shihun','shixue','baigui','zhenyaoling','taomufu','zhongkui']; // C 列不吃诅咒，徽章不挂诅咒标签""",
"""const YINCHA_NO_CURSE_TAG = ['leifu','huofu','jianfu','tianlei','shihun','shixue','baigui','zhenyaoling','taomufu','zhongkui']; // C 列不吃诅咒，徽章不挂诅咒标签
// 天师：伤害随【诅咒】层数 / 当前格挡 / 召唤物浮动的牌 —— 卡面正文只写基础值，徽章恒定显示实时预伤害
const TIANSHI_DYN_DMG = ['leifu','jianfu','zhanyaojian','tiebushan','shihun','qungui','taomufu','baigui','zhongkui','zhiren'];"""))

EDITS.append((
"""  if(c.id==='zhouyu' && (G.hero==='wuseng'||G.hero==='yincha')) return null; // B 咒雨是「格挡转化」、C 咒雨只施加诅咒，本身无伤害""",
"""  if(c.id==='zhouyu' && (G.hero==='wuseng'||G.hero==='yincha'||G.hero==='tianshi')) return null; // B 格挡转化 / C 只施咒 / D 只施咒，本身都无伤害"""))

EDITS.append((
"""      const why = c.id==='tiebushan' ? '无格挡' : c.id==='shihun' ? '无诅咒' : c.id==='zhouyu' ? '无尸气' : '无召唤';""",
"""      const why = c.id==='tiebushan' ? '无格挡'
        : c.id==='shihun' ? ((G.hero==='wuseng'||G.hero==='tianshi')?'无诅咒':'无目标')
        : c.id==='zhouyu' ? (G.hero==='ganshiren'?'无尸气':'无目标')
        : (G.hero==='tianshi' ? '无目标' : '无召唤');"""))

EDITS.append((
"""  const ycDmg = G.hero==='yincha' && YINCHA_DYN_DMG.indexOf(c.id)>=0; // 阴差流血/血怒浮动牌：徽章常显""",
"""  const ycDmg = G.hero==='yincha' && YINCHA_DYN_DMG.indexOf(c.id)>=0; // 阴差流血/血怒浮动牌：徽章常显
  const tsDmg = G.hero==='tianshi' && TIANSHI_DYN_DMG.indexOf(c.id)>=0; // 天师诅咒/格挡浮动牌：徽章常显"""))

EDITS.append((
"""  return { raw, d, curse:curseTag, weak:G.weak>0 && !ignoreWeak, taomu, tongqian, zhusha, turnBuf, dynamic: dynamic || wbDmg || ycDmg, perTurn };""",
"""  return { raw, d, curse:curseTag, weak:G.weak>0 && !ignoreWeak, taomu, tongqian, zhusha, turnBuf, dynamic: dynamic || wbDmg || ycDmg || tsDmg, perTurn };"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）\n---%s---' % (i + 1, n, old[:120])); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v60_block10f_preview DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
