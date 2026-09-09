# -*- coding: utf-8 -*-
# 尸王试玩三问题修复（原型.html）：saveRun 兜底破坏 limbo / 读档重挂 / 胜利消退回堆 /
# startBattle 每场清零尸气 / summonHTML 显示伤害与 summonAct 规则对齐
import io, sys, subprocess, tempfile, os

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# Fix A1：saveRun 不再把 limbo 中的尸王牌塞回弃牌堆
EDITS.append((
"""  // 尸王召唤存活期间此牌不在手牌/弃牌堆：存档时先让它回到弃牌堆，避免卡牌丢失
  if(G.shiWangCard){ removeCardEverywhere(G.shiWangCard); G.discard.push(G.shiWangCard); G.shiWangCard=null; }
  const s=scene || SCENE || 'map';""",
"""  const s=scene || SCENE || 'map';"""))

# Fix A2：落档记录 limbo 标记（牌仅存于 G.deck 主清单，各堆快照不含它）
EDITS.append((
"""    summons:G.summons.map(x=>({type:x.type, v:x.v, dur:x.dur})),""",
"""    summons:G.summons.map(x=>({type:x.type, v:x.v, dur:x.dur})),
    shiWangOut: !!G.shiWangCard,"""))

# Fix B：continueRun 读档后重挂 limbo
EDITS.append((
"""  G.summons=(d.summons||[]).map(x=>({type:x.type, v:x.v, dur:x.dur}));""",
"""  G.summons=(d.summons||[]).map(x=>({type:x.type, v:x.v, dur:x.dur}));
  // 尸王：召唤存活期间此牌处于“脱离牌库”态——读档后重新挂钩（G.deck 主清单恒含它）
  if(d.shiWangOut && G.summons.some(x=>x.type==='shi_wang' && x.dur>0)){
    const sw = G.deck.find(x=>x.id==='shi_wang' && !G.hand.includes(x) && !G.drawPile.includes(x) && !G.discard.includes(x));
    if(sw) G.shiWangCard = sw;
  }"""))

# Fix C：winFight 时战斗结束，尸王消散 → 牌回弃牌堆
EDITS.append((
"""  log('击败了所有敌人！');
  track('battleWin');""",
"""  log('击败了所有敌人！');
  if(G.shiWangCard) returnShiWangCard(); // 尸王：战斗结束消散，牌回到弃牌堆
  track('battleWin');"""))

# Fix D：startBattle 每场清零尸气（战斗内跨回合累积，符合设计）
EDITS.append((
"""  G.turn=0; G.turnSummary=''; G.daoxinUsed=false; G.skillsPlayedThisTurn=0; G.attackBuff=0; G.totalHpLost=0; G.dodge=0; G.dodgeDraw=0; G.debuffImmune=0; G.xuejiBonus=0; G.xuejiArmed=false; G.xuejiHurt=false; G.burn=0; G.zombieDmg=0; G.pendingSeal=0; G.karmaFire=0; G.duhun=null; G.xiejia=0; G.zhouyuA=false;""",
"""  G.turn=0; G.turnSummary=''; G.daoxinUsed=false; G.skillsPlayedThisTurn=0; G.attackBuff=0; G.totalHpLost=0; G.dodge=0; G.dodgeDraw=0; G.debuffImmune=0; G.xuejiBonus=0; G.xuejiArmed=false; G.xuejiHurt=false; G.burn=0; G.zombieDmg=0; G.pendingSeal=0; G.karmaFire=0; G.duhun=null; G.xiejia=0; G.zhouyuA=false; G.尸气=0;"""))

# Fix E：召唤面板伤害与 summonAct 规则对齐（尸王自身不吃、无尸王不加）
EDITS.append((
"""function summonHTML(s){
  const v = s.v + (G.hero==='ganshiren' ? 1 : 0);""",
"""function summonHTML(s){
  // 尸王在场时其他召唤单位伤害 +1（与 summonAct 结算一致：尸王自身不吃、无尸王不加）
  const v = s.v + ((s.type!=='shi_wang' && G.summons.some(x=>x.type==='shi_wang' && x.dur>0)) ? 1 : 0);"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i, n))
        sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH shi_wang DONE: %d 处替换成功' % len(EDITS))

# node --check 验证 <script>
mm = re_script = None
import re
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
