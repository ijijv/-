# -*- coding: utf-8 -*-
# v0.59 Block9j：阴兵回血日志带数值 + C 列「不吃诅咒」的牌不挂诅咒标签（避免误导预伤害）
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# ① 阴兵（阴差）攻击回血：带数值日志 + 兜底 healV=2
EDITS.append((
"""      if(G.hero==='yincha'){ heal(s.healV||1); log('阴兵攻击，为你恢复生命'); }""",
"""      if(G.hero==='yincha'){ const yh=s.healV||2; heal(yh); log(`阴兵攻击，为你恢复 ${yh} 点生命`); }"""))

# ② C 列不吃【诅咒】的牌：徽章不挂诅咒标签（只有斩妖剑把诅咒换成伤害；蚀魂咒是「施加」不是「消耗」）
EDITS.append((
"""const YINCHA_DYN_DMG = ['leifu','jianfu','tianlei','shihun','shixue','baigui','zhenyaoling','zhanyaojian','taomufu','zhongkui'];""",
"""const YINCHA_DYN_DMG = ['leifu','jianfu','tianlei','shihun','shixue','baigui','zhenyaoling','zhanyaojian','taomufu','zhongkui'];
const YINCHA_NO_CURSE_TAG = ['leifu','huofu','jianfu','tianlei','shihun','shixue','baigui','zhenyaoling','taomufu','zhongkui']; // C 列不吃诅咒，徽章不挂诅咒标签"""))
EDITS.append((
"""  const curseTag = (G.hero==='wuseng' && WUSENG_NO_CURSE_TAG.indexOf(c.id)>=0) ? 0 : (e.curse||0);""",
"""  const curseTag = ((G.hero==='wuseng' && WUSENG_NO_CURSE_TAG.indexOf(c.id)>=0)
    || (G.hero==='yincha' && YINCHA_NO_CURSE_TAG.indexOf(c.id)>=0)) ? 0 : (e.curse||0);"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v59_block9j_tag DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
