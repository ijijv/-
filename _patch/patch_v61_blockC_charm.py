# -*- coding: utf-8 -*-
# v0.61 批1·用户报障三连：
#   B13 易物有时不出现「选择换出的手牌」环节（手牌只剩易物本身时整段静默跳过）
#   C1  魅惑只削减连击的第一段（层数按「每段命中」消耗，与关键词「下回合伤害 -50%」不符）
#   C2  敌人力量每点 +2 伤害，配合蓄力/连击过高 → 降为每点 +1（显示与结算同步）
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# —— B13：出牌前守卫 —— 手牌只剩易物、或牌堆弃牌堆皆空时不出牌 ——
EDITS.append((
"""  if(c.id==='huofu' && G.hand.length<=1){ sfx('error'); floatMsg('没有可弃的手牌'); shakeCard(i); return; }""",
"""  if(c.id==='huofu' && G.hand.length<=1){ sfx('error'); floatMsg('没有可弃的手牌'); shakeCard(i); return; }
  // v0.61 B13：易物在手牌只剩自己时会整段静默跳过（交换界面不出现、白打一张）——改成出牌前拦住
  if(c.id==='yiwu' && G.hand.length<=1){ sfx('error'); floatMsg('没有可交换的手牌'); shakeCard(i); return; }
  if(c.id==='yiwu' && G.drawPile.length===0 && G.discard.length===0){ sfx('error'); floatMsg('牌堆与弃牌堆皆空，无牌可换入'); shakeCard(i); return; }"""))

# —— B13 兜底：异常路径下手牌为空时把易物退回手牌，而不是吞掉 ——
EDITS.append((
"""function startExchangeSelect(times, srcCard){
  if(!G.hand.length){ floatMsg('没有手牌可交换'); return; }""",
"""function startExchangeSelect(times, srcCard){
  if(!G.hand.length){ // v0.61 B13：异常兜底（正常已被 playCard 前置守卫拦住）——易物回手，别白打
    if(srcCard){ const di=G.discard.lastIndexOf(srcCard); if(di>=0){ G.discard.splice(di,1); G.hand.push(srcCard); log('没有可交换的手牌，【易物】已回手'); } }
    floatMsg('没有手牌可交换'); render(); return; }"""))

# —— C1-1：命中时只标记，不当场扣层 ——
EDITS.append((
"""  if(attacker.charm>0){ const cpr=attacker.charmPct!=null?attacker.charmPct:0.5; d=Math.floor(d*cpr); attacker.charm--; if(attacker.charm<=0) attacker.charmPct=0.5; }""",
"""  // v0.61 C1：魅惑只标记、不按段消耗 —— 否则连击/蓄力重击只有第一段被削减（与关键词「下回合伤害 -50%」不符）
  if(attacker.charm>0){ const cpr=attacker.charmPct!=null?attacker.charmPct:0.5; d=Math.floor(d*cpr); attacker.charmUsed=true; }"""))

# —— C1-2：该敌人本次行动收尾时统一消耗 1 层 ——
EDITS.append((
"""    if(G.hp<=0){ G.hp=0; loseGame(); return; } // v0.61 B2：死亡先判（与 doPlayCard 尾部一致）
    if(aliveEnemies().length===0){ winFight(); return; }
  }""",
"""    // v0.61 C1：一次魅惑 = 削减该敌人「一整次行动」的全部伤害（连击各段、蓄力重击都算），行动结束才消耗 1 层
    if(e.charmUsed){ e.charmUsed=false; e.charm--; if(e.charm<=0){ e.charm=0; e.charmPct=0.5; } }
    if(G.hp<=0){ G.hp=0; loseGame(); return; } // v0.61 B2：死亡先判（与 doPlayCard 尾部一致）
    if(aliveEnemies().length===0){ winFight(); return; }
  }"""))

# —— C1-3：新敌人带齐标记字段 ——
EDITS.append((
"""pendingDamage:0, curse:0, charm:0, charmPct:0.5, sealedEver:false,""",
"""pendingDamage:0, curse:0, charm:0, charmPct:0.5, charmUsed:false, sealedEver:false,"""))

# —— C2-1：力量每点 +2 → +1（结算）——
EDITS.append((
"""  let d=n+2*(attacker.strength||0);""",
"""  let d=n+(attacker.strength||0); // v0.61 C2：每点力量 +2 → +1（力量×蓄力×连击的叠乘过高）"""))

# —— C2-2：意图预览同步（含连击不结算蓄力的显示口径修正）——
EDITS.append((
"""function intentText(e){
  const atk=e.intent.v+(e.pendingDamage||0)+2*(e.strength||0);""",
"""function intentText(e){
  const st=(e.strength||0); // v0.61 C2：力量每点 +1
  const atk=e.intent.v+(e.pendingDamage||0)+st;"""))
EDITS.append((
"""    case 'multi': return `⚔️ 连击 ${e.intent.n}×${atk}`;""",
"""    case 'multi': return `⚔️ 连击 ${e.intent.n}×${e.intent.v+st}`; // v0.61 C2：连击不吃蓄力加值（与实际结算一致，原先预览偏高）"""))

# —— C2-3：关键词文案 ——
EDITS.append((
"""  ['力量','每点使该单位的攻击伤害 +2（永久叠加）。'],""",
"""  ['力量','每点使该单位的攻击伤害 +1（永久叠加，上限 8 点）。'],"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）\n---%s---' % (i + 1, n, old[:150])); sys.exit(1)
    s = s.replace(old, new)

mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
if r.returncode != 0:
    os.unlink(tmpp); print('NODE_FAIL（未落盘）:'); print(r.stderr); sys.exit(1)
os.unlink(tmpp)
io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v61_blockC_charm DONE: %d 处' % len(EDITS))
print('NODE_OK')
