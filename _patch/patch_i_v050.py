# -*- coding: utf-8 -*-
# v0.49 → v0.50 九项反馈批（①比例/错落 ②术语 ③渡魂 ⑤灵化 ⑥嗜血 ⑦吸血实际扣血 ⑧火符）
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# ============ ① 视觉：比例重设 + 错落前后感 ============
EDITS.append((
"""  .hero-art-box{width:100%; height:280px; margin-bottom:4px; border-radius:0; overflow:visible; background:transparent; display:flex; align-items:flex-end; justify-content:center; position:relative;}""",
"""  .hero-art-box{width:100%; height:186px; margin-bottom:4px; border-radius:0; overflow:visible; background:transparent; display:flex; align-items:flex-end; justify-content:center; position:relative;}"""))

EDITS.append((
"""  #player-panel{flex:0 0 200px; background:transparent; border:none; border-radius:0; padding:0; text-align:center; display:flex; flex-direction:column; align-items:center;}""",
"""  #player-panel{flex:0 0 200px; background:transparent; border:none; border-radius:0; padding:0; text-align:center; display:flex; flex-direction:column; align-items:center; position:relative; z-index:2100;}"""))

EDITS.append((
"""  .enemy.e-summon{width:58px;}
  .enemy.e-normal{width:118px;}
  .enemy.e-elite{width:170px;}
  .enemy.e-boss{width:216px;}
  .enemy .eportrait.e-summon{height:56px;}
  .enemy .eportrait.e-normal{height:120px;}
  .enemy .eportrait.e-elite{height:170px;}
  .enemy .eportrait.e-boss{height:220px;}
  .enemy .enemyhpbar{width:86px;}
  .enemy.e-elite .enemyhpbar{width:124px;}
  .enemy.e-boss .enemyhpbar{width:168px;}""",
"""  .enemy.e-summon{width:92px;}
  .enemy.e-normal{width:184px;}
  .enemy.e-elite{width:280px;}
  .enemy.e-boss{width:372px;}
  .enemy .eportrait.e-summon{height:93px;}
  .enemy .eportrait.e-normal{height:186px;}
  .enemy .eportrait.e-elite{height:280px;}
  .enemy .eportrait.e-boss{height:372px;}
  .enemy .enemyhpbar{width:134px;}
  .enemy.e-elite .enemyhpbar{width:194px;}
  .enemy.e-boss .enemyhpbar{width:262px;}
  .enemy.edepth .eportrait{filter:brightness(.86) saturate(.9) drop-shadow(0 4px 8px rgba(0,0,0,.4));}
  .enemy.edepth .ename{opacity:.72;}"""))

EDITS.append((
"""  .eportrait{width:auto; height:120px; max-width:100%; object-fit:contain; object-position:bottom center; border-radius:0; margin-bottom:2px; background:transparent; display:block; filter:drop-shadow(0 6px 12px rgba(0,0,0,.55));}""",
"""  .eportrait{width:auto; height:186px; max-width:100%; object-fit:contain; object-position:bottom center; border-radius:0; margin-bottom:2px; background:transparent; display:block; filter:drop-shadow(0 8px 16px rgba(0,0,0,.6));}"""))

EDITS.append((
"""    .hero-art-box{height:180px;}
    #enemy-panel{gap:12px 14px;}
    .enemy .eportrait.e-normal{height:84px;}
    .enemy .eportrait.e-summon{height:40px;}
    .enemy .eportrait.e-elite{height:118px;}
    .enemy .eportrait.e-boss{height:150px;}
    .enemy.e-normal{width:88px;}
    .enemy.e-elite{width:118px;}
    .enemy.e-boss{width:150px;}
    .enemy .enemyhpbar{width:62px;}
    .enemy.e-elite .enemyhpbar{width:88px;}
    .enemy.e-boss .enemyhpbar{width:112px;}""",
"""    .hero-art-box{height:120px;}
    #enemy-panel{gap:12px 14px;}
    .enemy .eportrait.e-normal{height:120px;}
    .enemy .eportrait.e-summon{height:60px;}
    .enemy .eportrait.e-elite{height:180px;}
    .enemy .eportrait.e-boss{height:240px;}
    .enemy.e-normal{width:120px;}
    .enemy.e-elite{width:180px;}
    .enemy.e-boss{width:240px;}
    .enemy.e-summon{width:60px;}
    .enemy .enemyhpbar{width:90px;}
    .enemy.e-elite .enemyhpbar{width:130px;}
    .enemy.e-boss .enemyhpbar{width:170px;}"""))

EDITS.append((
"""  const RISE=[0,26,14,38,22]; const liftY=(idx>=0?RISE[idx%RISE.length]:0); // 纵深错落：Boss/首敌最低(0)，右→左逐级抬高""",
"""  const RISE=[0,42,20,60,30]; const liftY=(idx>=0?RISE[idx%RISE.length]:0); // 纵深错落：Boss/首敌最低(0)，右→左逐级抬高；liftY 越大越靠后"""))

EDITS.append((
"""  return `<div class="enemy ${eSize} ${selected?'selected':''} ${e.dying?'dying':''} ${HITFX.enemies.has(e)?'hit':''}" data-uid="${e.uid}" onclick="selectTarget(${idx})" style="transform:translateY(-${liftY}px)">""",
"""  return `<div class="enemy ${eSize} ${liftY>0?'edepth':''} ${selected?'selected':''} ${e.dying?'dying':''} ${HITFX.enemies.has(e)?'hit':''}" data-uid="${e.uid}" onclick="selectTarget(${idx})" style="z-index:${2000-liftY}; transform:translateY(-${liftY}px)">"""))

# ============ ② 术语精简 ============
EDITS.append((
"""  ['诅咒','叠加在敌人身上的负面标记（上限 6 层），每回合末自动减少 1 层。诅咒本身不再提升敌人受到的伤害，而是作为层数资源被联动：「斩妖剑」「噬魂术」吞噬引爆换取伤害，「剑符」「天雷正法」等消耗层数强化。'],""",
"""  ['诅咒','叠加在敌人身上的资源标记（上限 6 层，每回合末 -1）。本身不增伤，而是被「斩妖剑」「噬魂术」等引爆换取伤害。'],"""))

EDITS.append((
"""  ['诅咒牌','即“可施加诅咒的牌”的简称（8 张，无条件主效果）：火符、万剑归宗、桃木符、蚀魂咒、舍身、焚符、咒印、咒雨。条件 / 延时派（荆棘符、铜皮铁骨、反震、移形换影、附灵术、五通神、洗髓经、卸甲生元）不算。供天师列“抽到 / 保留到【诅咒牌】”类触发判定。'],""",
"""  ['诅咒牌','可施加诅咒的牌（8 张）：火符、万剑归宗、桃木符、蚀魂咒、舍身、焚符、咒印、咒雨。'],"""))

EDITS.append((
"""  ['血怒','阴差专属资源，上限 10 层、整局累积（开新局清零）。打出扣血牌时每失去 1 点生命自动 +1 层；带“每层 +N（上限 M）”的牌打出时消耗实际用到的层数。'],""",
"""  ['血怒','阴差专属资源，上限 10 层、整局累积。打出扣血牌每失去 1 点生命 +1 层；「每层 +N」类牌打出时消耗实际用到的层数。'],"""))

EDITS.append((
"""  ['渡魂','获得后若干回合内，你对敌人造成的伤害按比例转化为回复生命。'],""",
"""  ['渡魂','接下来 5 回合内，你对敌人造成的伤害按比例转化为回复生命。'],"""))

EDITS.append((
"""  ['灵化','敌人词缀：免疫负面效果（镇魂、诅咒、魅惑等）。'],""",
"""  ['灵化','敌人词缀：免疫负面效果（镇魂、魅惑等）。诅咒仍可叠加。'],"""))

# ============ ⑤ 灵化不再免疫诅咒 ============
EDITS.append((
"""  if(isLinghua(e)){ log(`${e.name} 灵化免疫了【诅咒】`); return 0; }
  let v=n;""",
"""  let v=n;"""))

EDITS.append((
"""  {id:'linghua', name:'灵化', desc:'免疫负面效果（镇魂、诅咒、魅惑等）'}""",
"""  {id:'linghua', name:'灵化', desc:'免疫负面效果（镇魂、魅惑等）'}"""))

# ============ ③ 渡魂归己：5 回合 + 消耗牌 ============
EDITS.append((
"""  {id:'duhunguiji', name:'渡魂归己', type:'skill', rarity:'gold', cost:1,
    t:(u)=>`你对敌人造成伤害的 ${u?50:30}% 转化为生命`,
    eff:(u)=>{ G.duhun={turns:999, ratio:u?0.5:0.3}; floatMsg('渡魂归己 · 吸血化命'); log(`渡魂归己：造成伤害的 ${Math.round(G.duhun.ratio*100)}% 转化为生命`); }},""",
"""  {id:'duhunguiji', name:'渡魂归己', type:'skill', rarity:'gold', cost:1, exhaust:true,
    t:(u)=>`消耗。接下来 5 回合，你对敌人造成伤害的 ${u?50:30}% 转化为生命`,
    eff:(u)=>{ G.duhun={turns:5, ratio:u?0.5:0.3}; floatMsg('渡魂归己 · 吸血化命'); log(`渡魂归己：接下来 5 回合，造成伤害的 ${Math.round(G.duhun.ratio*100)}% 转化为生命`); }},"""))

# ============ ⑥ 嗜血改吸血（天师 D 列） ============
EDITS.append((
"""      :`造成 ${u?8:6} 伤害。目标每有 1 层【诅咒】，此牌伤害 +1（上限 +6）`,""",
"""      :`造成 ${u?8:6} 伤害。回复等于造成伤害的 50% 的生命`,"""))

EDITS.append((
"""      else d=(u?8:6)+Math.min(6,t.curse||0);
      dealDamageTo(t,d); }},""",
"""      else { d=(u?8:6); const dealt=dealDamageTo(t,d); if(dealt>0){ const h=Math.floor(dealt*0.5); if(h>0){ heal(h); floatMsg('+'+h+' 生命'); log('嗜血：回复 '+h+' 点生命'); } } return; }
      dealDamageTo(t,d); }},"""))

EDITS.append((
"""    else d=(u?8:6)+Math.min(6,t.curse||0);
    return d; },""",
"""    else d=(u?8:6);
    return d; },"""))

# ============ ⑦ 吸血按实际扣血（dealDamageTo） ============
EDITS.append((
"""  if(e.ledgerActive && d>0) e.ledgerDmg=(e.ledgerDmg||0)+d;
  e.hp-=d; G.turnStats.dealt+=d; afterEnemyDamaged(e);
  if(G.duhun && G.duhun.turns>0 && d>0){ const h=Math.floor(d*G.duhun.ratio); if(h>0){ G.hp=Math.min(G.maxHp, G.hp+h); floatDamage('+'+h, 'heal', document.querySelector('#player-panel .hpbar')); log(`渡魂归己：回复 ${h} 点生命`); } }""",
"""  if(e.ledgerActive && d>0) e.ledgerDmg=(e.ledgerDmg||0)+d;
  const hpBefore=e.hp; const actual=Math.min(d, hpBefore); // 实际扣除血量：d 可能溢出击杀，回血按 actual 而非打出伤害
  e.hp-=d; G.turnStats.dealt+=d; afterEnemyDamaged(e);
  if(G.duhun && G.duhun.turns>0 && actual>0){ const h=Math.floor(actual*G.duhun.ratio); if(h>0){ G.hp=Math.min(G.maxHp, G.hp+h); floatDamage('+'+h, 'heal', document.querySelector('#player-panel .hpbar')); log(`渡魂归己：回复 ${h} 点生命`); } }"""))

EDITS.append((
"""  log(`对 ${e.name} 造成 ${d} 点伤害`);
}
function dealDamageToTarget(n, ignoreBlock){ const e=curEnemy(); if(e) dealDamageTo(e,n,ignoreBlock); }""",
"""  log(`对 ${e.name} 造成 ${d} 点伤害`);
  return actual;
}
function dealDamageToTarget(n, ignoreBlock){ const e=curEnemy(); if(e) dealDamageTo(e,n,ignoreBlock); }"""))

# ============ ⑧ 火符：没牌可弃禁止打出 ============
EDITS.append((
"""  doPlayCard(i);
}
function confirmPlayCard(i){ hideOverlay(); doPlayCard(i); }""",
"""  if(c.id==='huofu' && G.hand.length<=1){ sfx('error'); floatMsg('没有可弃的手牌'); shakeCard(i); return; }
  doPlayCard(i);
}
function confirmPlayCard(i){ hideOverlay(); doPlayCard(i); }"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i+1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH i_v050 DONE: %d 处替换成功' % len(EDITS))

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
