# -*- coding: utf-8 -*-
# v0.60 Block10b：天师 D 列 · 攻击牌 1~14 对齐《天师版卡池.md》
#   雷符消耗1层 / 火符 5→8 / 天雷 26→30 / 万剑 20→16 / 铁布衫 每层+1→+1+2且清空
#   群鬼 8/6→6/5(上限+8→+4/+6) / 桃木 8/6→7/5 / 蚀魂 4→3 / 嗜血加诅咒100%吸血
#   百鬼 4→7 且引爆全部诅咒 / 钟馗 24/16→20/15 每层 7/5→6/5
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# —— #1 雷符：消耗 1 层诅咒 ——
EDITS.append((
"""      :`造成 ${u?9:6} 伤害。若目标带有【诅咒】，伤害 +3`,""",
"""      :`造成 ${u?9:6} 伤害。若目标带【诅咒】，消耗 1 层，伤害 +3`,"""))
EDITS.append((
"""      else if(t.curse>0) d+=3;""",
"""      else if(t.curse>0){ t.curse-=1; d+=3; }"""))

# —— #2 火符：5/8 ——
EDITS.append((
"""      :`造成 ${u?7:5} 伤害。施加 1 层【诅咒】，随机弃 1 张手牌`,""",
"""      :`造成 ${u?8:5} 伤害。施加 1 层【诅咒】，随机弃 1 张手牌`,"""))
EDITS.append((
"""    eff:(u,c)=>{ const t=curEnemy(); if(!t) return; let d=(u?7:5);""",
"""    eff:(u,c)=>{ const t=curEnemy(); if(!t) return; let d=G.hero==='tianshi'?(u?8:5):(u?7:5);"""))
EDITS.append((
"""  huofu: u=>{ const t=curEnemy(); if(!t) return 0; let d=u?7:5;""",
"""  huofu: u=>{ const t=curEnemy(); if(!t) return 0; let d=G.hero==='tianshi'?(u?8:5):(u?7:5);"""))

# —— #5 天雷正法：20/30 ——
EDITS.append((
"""      :`造成 ${u?26:20} 伤害。目标每有 2 层【诅咒】费用 -1（最低 0），结算后目标失去减免费用×2 层诅咒`,""",
"""      :`造成 ${u?30:20} 伤害。目标每有 2 层【诅咒】此牌费用 -1（最低 0）；结算后目标失去减免费用×2 层【诅咒】`,"""))
EDITS.append((
"""      if(G.hero==='tianshi'){ const red=Math.min(3,Math.floor((t.curse||0)/2)); dealDamageTo(t,u?26:20);""",
"""      if(G.hero==='tianshi'){ const red=Math.min(3,Math.floor((t.curse||0)/2)); dealDamageTo(t,u?30:20);"""))
EDITS.append((
"""    if(G.hero==='tianshi') return u?26:20; // D 诅咒仅作费用减免，不改伤害""",
"""    if(G.hero==='tianshi') return u?30:20; // D 诅咒仅作费用减免，不改伤害"""))

# —— #6 万剑归宗：14/16 ——
EDITS.append((
"""      :`对全体敌人造成 ${u?20:14} 伤害。对所有敌人施加 ${u?2:1} 层【诅咒】。每击败 1 名敌人，恢复 1 点符文`,""",
"""      :`对全体敌人造成 ${u?16:14} 伤害。对所有敌人施加 ${u?2:1} 层【诅咒】。每击败 1 名敌人，恢复 1 点符文`,"""))
EDITS.append((
"""      else if(G.hero==='tianshi'){ const d=u?20:14; targets.forEach(e=>{ if(e.hp>0) dealDamageTo(e,d); }); aliveEnemies().forEach(e=>applyCurse(e,u?2:1)); }""",
"""      else if(G.hero==='tianshi'){ const d=u?16:14; targets.forEach(e=>{ if(e.hp>0) dealDamageTo(e,d); }); aliveEnemies().forEach(e=>applyCurse(e,u?2:1)); }"""))
EDITS.append((
"""  wanjian: u=>G.hero==='wuseng'?(u?14:9):(G.hero==='tianshi'?(u?20:14):(u?15:10)),""",
"""  wanjian: u=>G.hero==='wuseng'?(u?14:9):(G.hero==='tianshi'?(u?16:14):(u?15:10)),"""))

# —— #7 铁布衫：每层额外 +1/+2，并消耗目标全部诅咒 ——
EDITS.append((
"""      :`造成等于当前格挡的伤害。若目标带【诅咒】，每层额外 +1`,""",
"""      :`造成等于当前格挡的伤害。目标每 1 层【诅咒】额外 +${u?2:1}，并消耗其全部【诅咒】`,"""))
EDITS.append((
"""      else if(G.hero==='tianshi') d+=(t.curse||0);""",
"""      else if(G.hero==='tianshi'){ d+=(t.curse||0)*(u?2:1); t.curse=0; }"""))
EDITS.append((
"""    else if(G.hero==='tianshi'){ const t=curEnemy(); if(t) d+=(t.curse||0); }""",
"""    else if(G.hero==='tianshi'){ const t=curEnemy(); if(t) d+=(t.curse||0)*(u?2:1); }"""))

# —— #9 群鬼乱舞：5/6，上限 +4/+6 ——
EDITS.append((
"""      :`造成 ${u?8:6} 伤害。目标每有 1 层【诅咒】，此牌伤害 +1（上限 +8）`,""",
"""      :`造成 ${u?6:5} 伤害。目标每有 1 层【诅咒】此牌伤害 +1（上限 +${u?6:4}）`,"""))
EDITS.append((
"""      const t=curEnemy(); if(!t) return; dealDamageTo(t,(u?8:6)+Math.min(8,t.curse||0)); }},""",
"""      const t=curEnemy(); if(!t) return; dealDamageTo(t,(u?6:5)+Math.min(u?6:4,t.curse||0)); }},"""))
EDITS.append((
"""    if(G.hero==='tianshi') return t?((u?8:6)+Math.min(8,t.curse||0)):0;              // D 直伤""",
"""    if(G.hero==='tianshi') return t?((u?6:5)+Math.min(u?6:4,t.curse||0)):0;         // D 直伤"""))

# —— #10 桃木符：5/7 ——
EDITS.append((
"""      return `造成 ${u?8:6} 伤害。${gh}。施加 1 层【诅咒】`; },""",
"""      return `造成 ${u?7:5} 伤害。${gh}。施加 1 层【诅咒】`; },"""))
EDITS.append((
"""      let d = G.hero==='tianshi'?(u?8:6) : G.hero==='ganshiren'?(u?7:5) : (G.hero==='yincha'?(u?7:4):(u?6:4));""",
"""      let d = G.hero==='tianshi'?(u?7:5) : G.hero==='ganshiren'?(u?7:5) : (G.hero==='yincha'?(u?7:4):(u?6:4));"""))
EDITS.append((
"""  taomufu: u=>{ const t=curEnemy(); if(!t) return 0; let d=G.hero==='tianshi'?(u?8:6):G.hero==='ganshiren'?(u?7:5):(G.hero==='yincha'?(u?7:4):(u?6:4));""",
"""  taomufu: u=>{ const t=curEnemy(); if(!t) return 0; let d=G.hero==='tianshi'?(u?7:5):G.hero==='ganshiren'?(u?7:5):(G.hero==='yincha'?(u?7:4):(u?6:4));"""))

# —— #11 蚀魂咒：3/6 ——
EDITS.append((
"""      :`造成 ${u?6:4} 伤害。施加 2 层【诅咒】`,""",
"""      :`造成 ${u?6:3} 伤害。施加 2 层【诅咒】`,"""))
EDITS.append((
"""      dealDamageTo(t, G.hero==='ganshiren'?(u?6:3):(G.hero==='tianshi'?(u?6:4):(G.hero==='yincha'?(u?8:5):(u?7:5))));""",
"""      dealDamageTo(t, G.hero==='ganshiren'?(u?6:3):(G.hero==='tianshi'?(u?6:3):(G.hero==='yincha'?(u?8:5):(u?7:5))));"""))
EDITS.append((
"""  shihunzhou: u=>G.hero==='ganshiren'?(u?6:3):(G.hero==='tianshi'?(u?6:4):(G.hero==='yincha'?(u?8:5):(u?7:5))),""",
"""  shihunzhou: u=>G.hero==='ganshiren'?(u?6:3):(G.hero==='tianshi'?(u?6:3):(G.hero==='yincha'?(u?8:5):(u?7:5))),"""))

# —— #12 嗜血：诅咒≥3 层时消耗 3 层、吸血 100% ——
EDITS.append((
"""      :`造成 ${u?8:6} 伤害。回复等于造成伤害的 50% 的生命`,""",
"""      :`造成 ${u?8:6} 伤害。回复造成伤害 50% 的生命；目标【诅咒】≥3 层时，消耗 3 层并把比例提升到 100%`,"""))
EDITS.append((
"""      else { d=(u?8:6); const dealt=dealDamageTo(t,d); if(dealt>0){ const h=Math.floor(dealt*0.5); if(h>0){ heal(h); floatMsg('+'+h+' 生命'); log('嗜血：回复 '+h+' 点生命'); } } return; }""",
"""      else { d=(u?8:6); let ratio=0.5;
        if((t.curse||0)>=3){ t.curse-=3; ratio=1; log('嗜血：消耗 3 层【诅咒】，吸血比例提升到 100%'); }
        const dealt=dealDamageTo(t,d); if(dealt>0){ const h=Math.floor(dealt*ratio); if(h>0){ heal(h); floatMsg('+'+h+' 生命'); log('嗜血：回复 '+h+' 点生命'); } } return; }"""))

# —— #13 百鬼夜行：全体 7 伤、每层 +1/+2、并消耗全部诅咒 ——
EDITS.append((
"""      :`对全体敌人造成 4 伤害。敌人每有 1 层【诅咒】，其受到此伤害 +${u?2:1}`,""",
"""      :`对全体敌人造成 7 伤害。每层【诅咒】使该敌人受到此伤害 +${u?2:1}，并消耗其全部【诅咒】`,"""))
EDITS.append((
"""    eff:(u)=>{ if(G.hero==='tianshi'){ aliveEnemies().forEach(e=>dealDamageTo(e,4+(u?2:1)*(e.curse||0))); return; }""",
"""    eff:(u)=>{ if(G.hero==='tianshi'){ aliveEnemies().forEach(e=>{ const cc=e.curse||0; dealDamageTo(e,7+(u?2:1)*cc); e.curse=0; }); return; }"""))
EDITS.append((
"""    const t=curEnemy(); return t?4+(u?2:1)*(t.curse||0):0; }, // D 每目标按自身诅咒独立""",
"""    const t=curEnemy(); return t?7+(u?2:1)*(t.curse||0):0; }, // D 每目标按自身诅咒独立"""))

# —— #14 钟馗镇魂：15/20，每层引爆 5/6 ——
EDITS.append((
"""      :`对目标造成 ${u?24:16} 伤害并【镇魂】。引爆并清空目标全部【诅咒】（每层 ${u?7:5} 伤害）（消耗）`,""",
"""      :`对目标造成 ${u?20:15} 伤害并【镇魂】。引爆并清空目标全部【诅咒】（每层 ${u?6:5} 伤害）（消耗）`,"""))
EDITS.append((
"""      const c=t.curse||0; sealEnemy(t,1); dealDamageTo(t,u?24:16); for(let i=0;i<c;i++) dealDamageTo(t,u?7:5); t.curse=0; if(c>0) log(`钟馗镇魂引爆 ${c} 层【诅咒】`); }},""",
"""      const c=t.curse||0; sealEnemy(t,1); dealDamageTo(t,u?20:15); for(let i=0;i<c;i++) dealDamageTo(t,u?6:5); t.curse=0; if(c>0) log(`钟馗镇魂引爆 ${c} 层【诅咒】`); }},"""))
EDITS.append((
"""    if(G.hero==='tianshi') return (u?24:16)+(t.curse||0)*(u?7:5); // D 引爆全部诅咒""",
"""    if(G.hero==='tianshi') return (u?20:15)+(t.curse||0)*(u?6:5); // D 引爆全部诅咒"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）\n---%s---' % (i + 1, n, old[:120])); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v60_block10b_atk DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
