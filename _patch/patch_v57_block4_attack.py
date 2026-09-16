# -*- coding: utf-8 -*-
# v0.57 赶尸人卡池重写 — 第 4 块·攻击批（1~14）：按《赶尸人版卡池.md》修正 A 列差异 7 张
#   修：雷符(4/7+击杀2尸气) 火符(5/8+弃鬼1/2) 剑符(8/13) 万剑(10/15) 铁布衫(每2尸气+1/+2)
#       蚀魂咒(3/6+每召唤回1血) 钟馗镇魂(16/24+无条件获4/5尸气)
#   每张同步 t / eff / CARD_DMG 三处（铁律：预览与 eff 逐列一致）
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# ========== #1 雷符 ==========
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`造成 ${u?6:4} 伤害。场上每有 1 个召唤单位，伤害 +1`""",
"""    t:(u)=>G.hero==='ganshiren'?`造成 ${u?7:4} 伤害。场上每有 1 个召唤单位，伤害 +1；若击杀敌人，获得 2 点【尸气】`"""))
EDITS.append((
"""    eff:(u)=>{ const t=curEnemy(); if(!t) return; let d=(G.hero==='tianshi'?(u?9:6):G.hero==='yincha'?(u?7:5):(u?6:4));
      if(G.hero==='ganshiren') d+=G.summons.filter(s=>s.dur>0).length;
      else if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/3));
      else if(G.hero==='yincha') d+=2*rageSpend(2,6);
      else if(t.curse>0) d+=3;
      dealDamageTo(t,d); }},""",
"""    eff:(u)=>{ const t=curEnemy(); if(!t) return; let d=(G.hero==='tianshi'?(u?9:6):G.hero==='yincha'?(u?7:5):(u?6:4));
      if(G.hero==='ganshiren'){ d=(u?7:4)+G.summons.filter(s=>s.dur>0).length; }
      else if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/3));
      else if(G.hero==='yincha') d+=2*rageSpend(2,6);
      else if(t.curse>0) d+=3;
      const before=t.hp;
      dealDamageTo(t,d);
      if(G.hero==='ganshiren' && before>0 && t.hp<=0){ gainShiqi(2); log('雷符：击杀敌人，获得 2 点【尸气】'); } }},"""))
EDITS.append((
"""  leifu: u=>{ const t=curEnemy(); if(!t) return 0; let d=(G.hero==='tianshi'?(u?9:6):G.hero==='yincha'?(u?7:5):(u?6:4));
    if(G.hero==='ganshiren') d+=G.summons.filter(s=>s.dur>0).length;
    else if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/3));
    else if(G.hero==='yincha') d+=2*Math.min(3,rageLayers()); // eff: 2×rageSpend(2,6) 至多 +6
    else if(t.curse>0) d+=3;
    return d; },""",
"""  leifu: u=>{ const t=curEnemy(); if(!t) return 0; let d=(G.hero==='tianshi'?(u?9:6):G.hero==='yincha'?(u?7:5):(u?6:4));
    if(G.hero==='ganshiren') d=(u?7:4)+G.summons.filter(s=>s.dur>0).length;
    else if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/3));
    else if(G.hero==='yincha') d+=2*Math.min(3,rageLayers()); // eff: 2×rageSpend(2,6) 至多 +6
    else if(t.curse>0) d+=3;
    return d; },"""))

# ========== #2 火符 ==========
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`造成 ${u?7:5} 伤害。随机弃 1 张手牌；若弃掉的是【鬼怪牌】，获得 1 点【尸气】`""",
"""    t:(u)=>G.hero==='ganshiren'?`造成 ${u?8:5} 伤害。随机弃 1 张手牌；若弃掉的是【鬼怪牌】，获得 ${u?2:1} 点【尸气】`"""))
EDITS.append((
"""    eff:(u)=>{ const t=curEnemy(); if(!t) return; let d=(u?7:5);
      if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/3));
      if(G.hero==='yincha'){ d=(u?9:7); loseHp(1); }
      dealDamageTo(t,d);
      if(G.hero==='tianshi') applyCurse(t,1);
      const dropped=discardRandomHand();
      if(dropped && G.hero==='ganshiren' && isGhostCard(dropped)){ gainShiqi(1); log('火符：弃掉鬼怪牌，获得 1 点【尸气】'); } }},""",
"""    eff:(u)=>{ const t=curEnemy(); if(!t) return; let d=(u?7:5);
      if(G.hero==='ganshiren') d=(u?8:5);
      if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/3));
      if(G.hero==='yincha'){ d=(u?9:7); loseHp(1); }
      dealDamageTo(t,d);
      if(G.hero==='tianshi') applyCurse(t,1);
      const dropped=discardRandomHand();
      if(dropped && G.hero==='ganshiren' && isGhostCard(dropped)){ gainShiqi(u?2:1); log(`火符：弃掉鬼怪牌，获得 ${u?2:1} 点【尸气】`); } }},"""))
EDITS.append((
"""  huofu: u=>{ const t=curEnemy(); if(!t) return 0; let d=u?7:5;
    if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/3));
    if(G.hero==='yincha') d=u?9:7; // C 固定 9/7（本回合有格挡也不加），与 eff 一致
    return d; },""",
"""  huofu: u=>{ const t=curEnemy(); if(!t) return 0; let d=u?7:5;
    if(G.hero==='ganshiren') d=u?8:5;
    if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/3));
    if(G.hero==='yincha') d=u?9:7; // C 固定 9/7（本回合有格挡也不加），与 eff 一致
    return d; },"""))

# ========== #3 剑符 ==========
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`造成 ${u?12:8} 伤害。消耗 2 点【尸气】则伤害翻倍`""",
"""    t:(u)=>G.hero==='ganshiren'?`造成 ${u?13:8} 伤害。消耗 2 点【尸气】，伤害翻倍`"""))
EDITS.append((
"""      else { d=(u?12:8); if(hasShiqi(2)){ spendShiqi(2); d*=2; log('剑符：消耗 2 点【尸气】，伤害翻倍'); } }""",
"""      else { d=(u?13:8); if(hasShiqi(2)){ spendShiqi(2); d*=2; log('剑符：消耗 2 点【尸气】，伤害翻倍'); } }"""))
EDITS.append((
"""    else { d=(u?12:8); if(hasShiqi(2)) d*=2; }
    return d; },""",
"""    else { d=(u?13:8); if(hasShiqi(2)) d*=2; }
    return d; },"""))

# ========== #6 万剑归宗 ==========
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`对全体敌人造成 ${u?14:10} 伤害。每击败 1 名敌人，获得 3 点【尸气】并抽 1 张牌`""",
"""    t:(u)=>G.hero==='ganshiren'?`对全体敌人造成 ${u?15:10} 伤害。每击败 1 名敌人，获得 3 点【尸气】并抽 1 张牌`"""))
EDITS.append((
"""      else { const d=u?14:10; targets.forEach(e=>{ if(e.hp>0) dealDamageTo(e,d); }); }""",
"""      else { const d=u?15:10; targets.forEach(e=>{ if(e.hp>0) dealDamageTo(e,d); }); }"""))
EDITS.append((
"""  wanjian: u=>G.hero==='wuseng'?((u?14:10)+Math.min(12,G.block||0)):(G.hero==='tianshi'?(u?20:14):(u?14:10)),""",
"""  wanjian: u=>G.hero==='wuseng'?((u?14:10)+Math.min(12,G.block||0)):(G.hero==='tianshi'?(u?20:14):(u?15:10)),"""))

# ========== #7 铁布衫 ==========
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`造成等于当前格挡的伤害。每有 2 点【尸气】，额外 +1${u?'（0 费）':''}`""",
"""    t:(u)=>G.hero==='ganshiren'?`造成等于当前格挡的伤害。每有 2 点【尸气】，额外 +${u?2:1}${u?'（0 费）':''}`"""))
EDITS.append((
"""      if(G.hero==='ganshiren') d+=Math.floor((G.尸气||0)/2);
      else if(G.hero==='yincha'){ loseHp(2); }""",
"""      if(G.hero==='ganshiren') d+=Math.floor((G.尸气||0)/2)*(u?2:1);
      else if(G.hero==='yincha'){ loseHp(2); }"""))
EDITS.append((
"""  tiebushan: u=>{ let d=G.block||0;
    if(G.hero==='ganshiren') d+=Math.floor((G.尸气||0)/2);""",
"""  tiebushan: u=>{ let d=G.block||0;
    if(G.hero==='ganshiren') d+=Math.floor((G.尸气||0)/2)*(u?2:1);"""))

# ========== #11 蚀魂咒 ==========
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`造成 ${u?7:5} 伤害。若场上存在召唤单位，施加 1 层【诅咒】`""",
"""    t:(u)=>G.hero==='ganshiren'?`造成 ${u?6:3} 伤害。若场上有召唤单位，每有 1 个恢复 1 点生命`"""))
EDITS.append((
"""    eff:(u)=>{ const t=curEnemy(); if(!t) return;
      dealDamageTo(t, G.hero==='tianshi'?(u?6:4):(u?7:5));
      if(G.hero==='ganshiren'){ if(G.summons.filter(s=>s.dur>0).length>0) applyCurse(t,1); }
      else if(G.hero==='wuseng'){ if((G.block||0)>=3){ G.block-=3; applyCurse(t,2); } else log('蚀魂咒：格挡不足 3，未施加诅咒'); }
      else applyCurse(t,2); }},""",
"""    eff:(u)=>{ const t=curEnemy(); if(!t) return;
      dealDamageTo(t, G.hero==='ganshiren'?(u?6:3):(G.hero==='tianshi'?(u?6:4):(u?7:5)));
      if(G.hero==='ganshiren'){ const n=G.summons.filter(s=>s.dur>0).length; if(n>0){ heal(n); log(`蚀魂咒：场上 ${n} 个召唤单位，恢复 ${n} 点生命`); } }
      else if(G.hero==='wuseng'){ if((G.block||0)>=3){ G.block-=3; applyCurse(t,2); } else log('蚀魂咒：格挡不足 3，未施加诅咒'); }
      else applyCurse(t,2); }},"""))
EDITS.append((
"""  shihunzhou: u=>G.hero==='tianshi'?(u?6:4):(u?7:5),""",
"""  shihunzhou: u=>G.hero==='ganshiren'?(u?6:3):(G.hero==='tianshi'?(u?6:4):(u?7:5)),"""))

# ========== #14 钟馗镇魂 ==========
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`对目标造成 ${u?22:16} 伤害并【镇魂】。若目标此前已被【镇魂】，获得 ${u?5:4} 点【尸气】（消耗）`""",
"""    t:(u)=>G.hero==='ganshiren'?`对目标造成 ${u?24:16} 伤害并【镇魂】。获得 ${u?5:4} 点【尸气】（消耗牌）`"""))
EDITS.append((
"""      if(G.hero==='ganshiren'){ const was=wasSealedBefore(t); sealEnemy(t,1); dealDamageTo(t,u?22:16); if(was){ gainShiqi(u?5:4); log('钟馗镇魂：目标曾被镇魂，获得【尸气】'); } return; }""",
"""      if(G.hero==='ganshiren'){ sealEnemy(t,1); dealDamageTo(t,u?24:16); gainShiqi(u?5:4); log(`钟馗镇魂：造成 ${u?24:16} 伤害并获得 ${u?5:4} 点【尸气】`); return; }"""))
EDITS.append((
"""  zhongkui: u=>{ const t=curEnemy(); if(!t) return 0;
    if(G.hero==='tianshi') return (u?24:16)+(t.curse||0)*(u?7:5); // D 引爆全部诅咒
    let d=u?22:16; if(G.hero==='yincha' && G.hp<G.maxHp*0.3) d*=2; // C 残血翻倍
    return d; },""",
"""  zhongkui: u=>{ const t=curEnemy(); if(!t) return 0;
    if(G.hero==='tianshi') return (u?24:16)+(t.curse||0)*(u?7:5); // D 引爆全部诅咒
    if(G.hero==='ganshiren') return u?24:16; // A 固定 16/24（无条件获尸气，不改伤害）
    let d=u?22:16; if(G.hero==='yincha' && G.hp<G.maxHp*0.3) d*=2; // C 残血翻倍
    return d; },"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v57_block4_attack DONE: 原型 %d 处' % len(EDITS))

mm = re.search(r'<script>([\s\S]*?)</script>', s)
js = mm.group(1)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, js.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK (%d chars)' % len(js))
