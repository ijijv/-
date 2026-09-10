# -*- coding: utf-8 -*-
# ⑧b 阴兵过境(天师#47)：索敌锚点 G.ybTarget（上一次施咒的敌人）+ 🎯阴兵目标徽章/卡面/词条/召唤标签
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# F1 状态字段：复用它残留的 curseOverflowBlock 槽 → ybTarget（-1 = 尚未锁定；敌人 uid 从 0 起，不能用 0 当哨兵）
EDITS.append((
"""    curseOverflowBlock:0,""",
"""    ybTarget:-1,  // 阴兵过境(天师#47)：🎯阴兵目标 = 你上一次施加诅咒的敌人 uid；-1 表示尚未锁定"""))

# F2 每场战斗重置
EDITS.append((
"""  G.target=0;
  PLAYER_HP_PREV=null; ENEMY_HP_PREV={};""",
"""  G.target=0;
  G.ybTarget=-1; // 阴兵索敌标记：本场战斗从头锁（-1=无目标，落到带诅咒随机）
  PLAYER_HP_PREV=null; ENEMY_HP_PREV={};"""))

# F3 applyCurse 尾部：天师每对某敌施咒（含溢出/0 层尝试）即把阴兵索敌标记切到它
EDITS.append((
"""  const applied = e.curse - currentCurse;
  if(G.hero==='tianshi'){ CURSE_THIS_TURN = (CURSE_THIS_TURN||0) + Math.max(0, applied); }
  // 返回实际生效的层数（调用方可据此判断是否有变化）
  return applied;""",
"""  const applied = e.curse - currentCurse;
  if(G.hero==='tianshi'){ CURSE_THIS_TURN = (CURSE_THIS_TURN||0) + Math.max(0, applied); }
  // 阴兵过境(天师#47)：每次对某敌施咒（含溢出尝试）即把下回合阴兵索敌标记🎯切到它
  if(G.hero==='tianshi' && e.hp>0) G.ybTarget=e.uid;
  // 返回实际生效的层数（调用方可据此判断是否有变化）
  return applied;"""))

# F4 summonAct 阴兵分支：优先打标记敌；标记敌死亡/消失则回落带诅咒随机
EDITS.append((
"""  else if(s.type==='yinbing'){
    // #47：天师优先打带诅咒的敌人；其余随机。阴差(武僧/阴兵每只)按各自列结算回血在召唤处处理
    const t = G.hero==='tianshi' ? summonTarget(true) : randomAlive();""",
"""  else if(s.type==='yinbing'){
    // #47：天师优先攻击🎯阴兵目标（上一次被施咒的敌人）；标记敌已死则回落带诅咒随机。其余列随机。
    const t = G.hero==='tianshi' ? (aliveEnemies().find(x=>x.uid===G.ybTarget) || summonTarget(true)) : randomAlive();"""))

# F5 卡面 D 列 t 文案：说明锁定逻辑与🎯标记
EDITS.append((
"""      :`召唤 ${u?3:2} 只阴兵。每回合末优先攻击带【诅咒】的敌人，造成 ${u?5:4} 伤害（持续 3 回合）`,""",
"""      :`召唤 ${u?3:2} 只阴兵。每回合末优先攻击你上一次施加【诅咒】的敌人（带🎯阴兵目标标记），造成 ${u?5:4} 伤害（持续 3 回合；标记敌死亡则转随机）`,"""))

# F6 KEYWORDS：阴兵口径微调 + 新增「阴兵目标」词条
EDITS.append((
"""  ['阴兵','召唤单位的一种，每回合末对随机敌人造成伤害（持续 3 回合）。'],""",
"""  ['阴兵','召唤单位的一种，每回合末对敌人造成伤害（持续 3 回合）：天师以外随机索敌；天师列【阴兵过境】会锁定🎯阴兵目标。'],
  ['阴兵目标','被天师【阴兵过境】锁定的敌人（🎯标记）：每回合末阴兵优先攻击你上一次施加【诅咒】的敌人；再对其它敌人施咒会把标记移过去；标记敌死亡则转随机。'],"""))

# F7 enemyPanelHTML 徽章：天师列且场上有存活阴兵时，给标记敌显示🎯
EDITS.append((
"""  if(e.affixes && e.affixes.length) e.affixes.forEach(a=>{ const af=AFFIXES.find(x=>x.id===a.id); badges+=`<span class="badge affix" data-tip="affix:${a.id}" style="cursor:help">${af?af.name:a.id}${a.tier>1?'·'+a.tier:''}</span>`; });
  return `<div class="enemy ${eSize}""",
"""  if(e.affixes && e.affixes.length) e.affixes.forEach(a=>{ const af=AFFIXES.find(x=>x.id===a.id); badges+=`<span class="badge affix" data-tip="affix:${a.id}" style="cursor:help">${af?af.name:a.id}${a.tier>1?'·'+a.tier:''}</span>`; });
  if(G.hero==='tianshi' && G.ybTarget===e.uid && G.summons.some(x=>x.type==='yinbing' && x.dur>0)) badges+=`<span class="badge ybtarget" data-tip="kw:阴兵目标" style="cursor:help">🎯阴兵目标</span>`;
  return `<div class="enemy ${eSize}"""))

# F8 summonHTML 阴兵标签：天师注明🎯锁定
EDITS.append((
"""    : s.type==='yinbing'?`阴兵：每回合末对随机敌人造成 ${v} 点伤害`""",
"""    : s.type==='yinbing'?`阴兵：每回合末${G.hero==='tianshi'?'优先攻击🎯标记敌（上一次施咒的敌人）':'对随机敌人'}造成 ${v} 点伤害`"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i+1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH f_yinbing DONE: %d 处替换成功' % len(EDITS))

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
