# -*- coding: utf-8 -*-
# v0.57 Block4 召唤批（41~48）：按《赶尸人版卡池.md》修正赶尸人(A)列
#   #41 纸人：末伤 2/4，尸气>=4 耗4强化→5/7，去掉额外诅咒
#   #42 咒印：改「召唤咒魂 + 立即获 3/5 尸气」（新增 zhouhun 召唤物，不参与回合末行动）
#   #43 小鬼：末伤 2/4，死亡获 2/3 尸气
#   #45 五通神：立即 5 格挡(强化 6)，持续 2/3(强化 3/4)，去掉尸气
#   #46 咒雨：改「清零尸气，每层×6/7 伤害随机分配给所有敌人」+ 消耗
#   #48 尸王：t 删「死亡时获得 2 点尸气」
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# ========== #41 纸人 ==========
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`召唤纸人。每回合末造成 ${u?2:1} 伤害并施加 1 层【诅咒】。死亡时获得 2 点【尸气】（持续 2 回合）`""",
"""    t:(u)=>G.hero==='ganshiren'?`召唤纸人。每回合末造成 ${u?4:2} 伤害。若打出时【尸气】≥4，消耗 4 点【尸气】强化：每回合末造成 ${u?7:5} 伤害。死亡时获得 2 点【尸气】（持续 2 回合）`"""))
EDITS.append((
"""    eff:(u)=>{ addSummon({type:'zhiren', v:u?2:1, dur:2}); floatMsg('纸人 · 受命而起'); }},""",
"""    eff:(u)=>{ let v=u?4:2;
      if(G.hero==='ganshiren' && hasShiqi(4)){ spendShiqi(4); v=u?7:5; log('纸人：消耗 4 点【尸气】强化'); }
      addSummon({type:'zhiren', v, dur:2}); floatMsg('纸人 · 受命而起'); }},"""))

# ========== #42 咒印 ==========
EDITS.append((
"""    t:(u)=>G.hero==='tianshi'?`施加 ${u?3:2} 层【诅咒】。若目标已有【诅咒】，额外施加 1 层`
      :`施加 ${u?3:2} 层【诅咒】`,""",
"""    t:(u)=>G.hero==='ganshiren'?`召唤咒魂。立即获得 ${u?5:3} 点【尸气】`
      :G.hero==='tianshi'?`施加 ${u?3:2} 层【诅咒】。若目标已有【诅咒】，额外施加 1 层`
      :`施加 ${u?3:2} 层【诅咒】`,"""))
EDITS.append((
"""    eff:(u)=>{ const t=curEnemy(); if(!t) return; let n=u?3:2;
      if(G.hero==='tianshi' && (t.curse||0)>0){ n+=1; log('咒印：目标已有诅咒，额外 +1 层'); }
      applyCurse(t,n); }},""",
"""    eff:(u)=>{ if(G.hero==='ganshiren'){ addSummon({type:'zhouhun', v:0, dur:3}); gainShiqi(u?5:3); log(`咒印：召唤咒魂，获得 ${u?5:3} 点【尸气】`); return; }
      const t=curEnemy(); if(!t) return; let n=u?3:2;
      if(G.hero==='tianshi' && (t.curse||0)>0){ n+=1; log('咒印：目标已有诅咒，额外 +1 层'); }
      applyCurse(t,n); }},"""))

# ========== #43 小鬼 ==========
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`召唤小鬼。每回合末造成 ${u?3:2} 伤害。死亡时获得 2 点【尸气】（持续 2 回合）`""",
"""    t:(u)=>G.hero==='ganshiren'?`召唤小鬼。每回合末造成 ${u?4:2} 伤害。死亡时获得 ${u?3:2} 点【尸气】（持续 2 回合）`"""))
EDITS.append((
"""    eff:(u)=>{ const v=G.hero==='tianshi'?(u?4:3):(u?3:2); addSummon({type:'xiaogui', v, dur:2}); floatMsg('小鬼 · 奉命出巡'); }},""",
"""    eff:(u)=>{ const v=G.hero==='tianshi'?(u?4:3):(u?4:2); addSummon({type:'xiaogui', v, dur:2, up:!!u}); floatMsg('小鬼 · 奉命出巡'); }},"""))

# ========== #45 五通神 ==========
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`召唤五通神。立即获得 3 点格挡与 1 点【尸气】，之后每回合开始重复一次（持续 ${u?3:2} 回合）`""",
"""    t:(u)=>G.hero==='ganshiren'?`召唤五通神。立即获得 5 点格挡，之后每回合开始重复一次（持续 ${u?3:2} 回合）。若打出时【尸气】≥5，消耗 5 点【尸气】强化：立即获得 6 点格挡，之后每回合开始重复一次（持续 ${u?4:3} 回合）`"""))
EDITS.append((
"""      const s=addSummon({type:'wutong', v:3, dur:u?3:2});
      wutongTick(s);
      floatMsg('五通神 · 现形'); }},""",
"""      let wv=3, wdur=u?3:2;
      if(G.hero==='ganshiren'){ if(hasShiqi(5)){ spendShiqi(5); wv=6; wdur=u?4:3; log('五通神：消耗 5 点【尸气】强化'); } else { wv=5; } }
      const s=addSummon({type:'wutong', v:wv, dur:wdur});
      wutongTick(s);
      floatMsg('五通神 · 现形'); }},"""))

# ========== wutongTick（改按实例 v 给格挡，赶尸人不再给尸气）==========
EDITS.append((
"""function wutongTick(s){
  gainBlock(3);
  if(G.hero==='ganshiren'){ gainShiqi(1); log('五通神：获得 3 点格挡与 1 点【尸气】'); }
  else if(G.hero==='tianshi'){ const wt=randomAlive(); if(wt) applyCurse(wt,1); log('五通神：获得 3 点格挡并对随机敌人施加 1 层【诅咒】'); }
  else log('五通神：获得 3 点格挡');""",
"""function wutongTick(s){
  const b=s.v||3;
  gainBlock(b);
  if(G.hero==='ganshiren'){ log(`五通神：获得 ${b} 点格挡`); }
  else if(G.hero==='tianshi'){ const wt=randomAlive(); if(wt) applyCurse(wt,1); log(`五通神：获得 ${b} 点格挡并对随机敌人施加 1 层【诅咒】`); }
  else log(`五通神：获得 ${b} 点格挡`);"""))

# ========== #46 咒雨（改引爆尸气 + 消耗）==========
EDITS.append((
"""  {id:'zhouyu', name:'咒雨', type:'spirit', rarity:'purple', cost:2,
    t:(u)=>G.hero==='ganshiren'?`对所有敌人施加 ${u?3:2} 层【诅咒】。每名被诅咒的敌人死亡时，获得 2 点【尸气】`""",
"""  {id:'zhouyu', name:'咒雨', type:'spirit', rarity:'purple', cost:2, exhaust:true,
    t:(u)=>G.hero==='ganshiren'?`引爆当前所有【尸气】：清零尸气，每层尸气转化为 ${u?7:6} 点伤害，随机分配给所有敌人。消耗（一次性）`"""))
EDITS.append((
"""    eff:(u)=>{ if(G.hero==='ganshiren'){ aliveEnemies().forEach(e=>applyCurse(e,u?3:2)); G.zhouyuA=true; log('咒雨：被诅咒的敌人死亡时将获得 2 点【尸气】'); return; }""",
"""    eff:(u)=>{ if(G.hero==='ganshiren'){ const q=G.尸气||0; if(q<=0){ floatMsg('没有尸气可引爆'); log('咒雨：没有尸气可引爆'); return; }
        G.尸气=0; const total=q*(u?7:6); const al=aliveEnemies(); if(!al.length) return;
        const dist=al.map(()=>0);
        for(let i=0;i<total;i++){ dist[Math.floor(Math.random()*al.length)]++; }
        al.forEach((e,i)=>{ if(dist[i]>0) dealDamageTo(e,dist[i]); });
        log(`咒雨：引爆 ${q} 点【尸气】，造成 ${total} 点伤害随机分配`); floatMsg(`咒雨 · 引爆 ${q} 尸气`); return; }"""))

# ========== #48 尸王 t 删「死亡时获得 2 点尸气」==========
EDITS.append((
"""    t:(u)=>`消耗 10 点【尸气】召唤尸王。每回合末对全体敌人造成 10 点伤害。在场时其他召唤单位伤害 +1。持续 5 回合。死亡时获得 2 点【尸气】（不消耗符文，不可升级）`,""",
"""    t:(u)=>`消耗 10 点【尸气】召唤尸王。每回合末对全体敌人造成 10 点伤害。在场时其他召唤单位伤害 +1。持续 5 回合。召唤物存活期间此牌不进入弃牌堆，死亡后才回到弃牌堆（不消耗符文，不可升级）`,"""))

# ========== onSummonDeath：小鬼升级档 / 尸王不再给尸气 ==========
EDITS.append((
"""  } else if(s.type==='xiaogui'){
    if(G.hero==='ganshiren'){ gainShiqi(2); log('小鬼死亡，获得 2 点【尸气】'); }""",
"""  } else if(s.type==='xiaogui'){
    if(G.hero==='ganshiren'){ const q=s.up?3:2; gainShiqi(q); log(`小鬼死亡，获得 ${q} 点【尸气】`); }"""))
EDITS.append((
"""  } else if(s.type==='shi_wang'){
    gainShiqi(2); returnShiWangCard(); log('尸王消散，获得 2 点【尸气】，【尸王】回到弃牌堆');
  }""",
"""  } else if(s.type==='shi_wang'){
    returnShiWangCard(); log('尸王消散，【尸王】回到弃牌堆');
  }"""))

# ========== summonAct 纸人：赶尸人不再叠诅咒 ==========
EDITS.append((
"""    } else {
      // 赶尸人/武僧/阴差：#41A/B/C 造成伤害并施加 1 层诅咒；阴差额外回 1 血
      const t=randomAlive();
      if(t){ dealDamageTo(t, v); applyCurse(t,1); if(G.hero==='yincha'){ heal(1); log('纸人攻击，恢复 1 点生命'); } }
    }""",
"""    } else if(G.hero==='ganshiren'){
      // 赶尸人 #41A：每回合末造成伤害（不叠诅咒）
      const t=randomAlive(); if(t) dealDamageTo(t, v);
    } else {
      // 武僧/阴差：#41B/C 造成伤害并施加 1 层诅咒；阴差额外回 1 血
      const t=randomAlive();
      if(t){ dealDamageTo(t, v); applyCurse(t,1); if(G.hero==='yincha'){ heal(1); log('纸人攻击，恢复 1 点生命'); } }
    }"""))

# ========== 删咒雨旧机制（敌人死亡给尸气）==========
EDITS.append((
"""    if((G.zhouyuA||0)>0 && (e.curse||0)>0){ gainShiqi(2); log('咒雨：被诅咒的敌人死亡，获得 2 点【尸气】'); }
""",
""""""))

# ========== CARD_DMG 预览同步（纸人/小鬼）==========
EDITS.append((
"""  zhiren: u=>{ const bleed=(G.bleedSummons)?Math.floor((G.hpLostTurn||0)/2):0;
    return (u?2:1)+(isSummon('shi_wang')?1:0)+bleed; }, // 每回合末 v（+尸王在场 / +阴差群鬼流血）
  xiaogui: u=>{ const v=G.hero==='tianshi'?(u?4:3):(u?3:2);""",
"""  zhiren: u=>{ const base = G.hero==='ganshiren' ? (hasShiqi(4)?(u?7:5):(u?4:2)) : (u?2:1);
    const bleed=(G.bleedSummons)?Math.floor((G.hpLostTurn||0)/2):0;
    return base+(isSummon('shi_wang')?1:0)+bleed; }, // 每回合末 v（+尸王在场 / +阴差群鬼流血）
  xiaogui: u=>{ const v=G.hero==='tianshi'?(u?4:3):(G.hero==='ganshiren'?(u?4:2):(u?3:2));"""))

# ========== summonHTML 标签 ==========
EDITS.append((
"""  const label = s.type==='zhiren'?`纸人：每回合末对随机敌人造成 ${v} 点伤害 +1诅咒`""",
"""  const label = s.type==='zhiren'?(G.hero==='ganshiren'?`纸人：每回合末对随机敌人造成 ${v} 点伤害`:`纸人：每回合末对随机敌人造成 ${v} 点伤害 +1诅咒`)
    : s.type==='zhouhun'?`咒魂：携带尸气`"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v57_block4_summon DONE: 原型 %d 处' % len(EDITS))

mm = re.search(r'<script>([\s\S]*?)</script>', s)
js = mm.group(1)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, js.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK (%d chars)' % len(js))
