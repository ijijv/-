# -*- coding: utf-8 -*-
# v0.58 Block8g：武僧 B 列 · 召唤牌 41~48 按《武僧版卡池.md》重做
#   41 纸人 2/3 伤害（去掉诅咒）+ 存活时每回合开始 2/3 格挡
#   42 咒印 招咒魂：本回合下一张攻击牌 100% 吸血（消耗牌）
#   43 小鬼 2/3 伤害 + 死亡时 5/7 格挡
#   45 五通神 立即 5/6（1/2 基础 + 首次 4）+ 之后每回合开始 4 格挡
#   46 咒雨 0 费：本回合格挡全转血（消耗）
#   47 阴兵过境 4/5 伤害 + 存活时每回合开始 3/4 格挡
#   44 画皮 / 48 尸王：已与文档一致，不动
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# ---------- 状态字段：咒印吸血 ----------
EDITS.append((
"""    shiWangCard:null, ranhunType:null, ranhunSelf:null, endBlockKind:null, xiejiaUp:false,
    exhausted:[] };""",
"""    shiWangCard:null, ranhunType:null, ranhunSelf:null, endBlockKind:null, xiejiaUp:false,
    zhouhunSteal:0, stealWatch:false, stealAccum:0,   // 咒印(#42B)：咒魂吸血监视
    exhausted:[] };"""))
EDITS.append((
"""  G.boostCurse=0; G.junkPlayedThisTurn=0; G.ranhunType=null; G.ranhunSelf=null; G.ranhunHeal=0; G.shouyiUp=false;""",
"""  G.boostCurse=0; G.junkPlayedThisTurn=0; G.ranhunType=null; G.ranhunSelf=null; G.ranhunHeal=0; G.shouyiUp=false;
  G.zhouhunSteal=0; G.stealWatch=false; G.stealAccum=0; // 咒印：吸血只在本回合内有效"""))

# ---------- dealDamageTo：记录本张牌的实际伤害 ----------
EDITS.append((
"""  e.hp-=d; G.turnStats.dealt+=d; afterEnemyDamaged(e);""",
"""  if(G.stealWatch){ G.stealAccum=(G.stealAccum||0)+actual; } // 咒印(#42B)：累计这张攻击牌的实际伤害，供 100% 吸血
  e.hp-=d; G.turnStats.dealt+=d; afterEnemyDamaged(e);"""))

# ---------- doPlayCard：咒印吸血的开/结算 ----------
EDITS.append((
"""  cardPlayWindow=true;
  const effResult = c.eff(c.up, c, xuenuBonus);
  cardPlayWindow=false;""",
"""  // 咒印(#42 B)：咒魂为「本回合内打出的一张攻击牌」附加 100% 吸血
  const __stealPending = !!G.zhouhunSteal;
  if(G.hero==='wuseng' && G.zhouhunSteal && c.type==='attack'){ G.stealWatch=true; G.stealAccum=0; }
  cardPlayWindow=true;
  const effResult = c.eff(c.up, c, xuenuBonus);
  cardPlayWindow=false;
  if(G.stealWatch){
    G.stealWatch=false; const __sh=G.stealAccum||0; G.stealAccum=0; G.zhouhunSteal=0;
    if(__sh>0){ heal(__sh); floatMsg('咒魂吸血 +'+__sh); log(`咒印：吸血回复 ${__sh} 点生命`); }
    else log('咒印：这张攻击牌没有造成伤害');
  }"""))
EDITS.append((
"""  if(effResult===false){
    // 回退符文
    G.energy += cost;""",
"""  if(effResult===false){
    if(__stealPending) G.zhouhunSteal=1; // 咒印：打出失败不消耗吸血
    // 回退符文
    G.energy += cost;"""))

# ---------- #41 纸人 ----------
EDITS.append((
"""      :G.hero==='wuseng'?`召唤纸人。每回合末造成 ${u?2:1} 伤害并施加 1 层【诅咒】。存活时每回合获得 2 点格挡（持续 2 回合）`""",
"""      :G.hero==='wuseng'?`召唤纸人。每回合末造成 ${u?3:2} 伤害。纸人存活时，每回合开始获得 ${u?3:2} 点格挡（持续 2 回合）`"""))
EDITS.append((
"""    eff:(u)=>{ let v=u?4:2;
      if(G.hero==='ganshiren' && hasShiqi(4)){ spendShiqi(4); v=u?7:5; log('纸人：消耗 4 点【尸气】强化'); }
      addSummon({type:'zhiren', v, dur:2}); floatMsg('纸人 · 受命而起'); }},""",
"""    eff:(u)=>{ let v = G.hero==='wuseng' ? (u?3:2) : (u?4:2);
      if(G.hero==='ganshiren' && hasShiqi(4)){ spendShiqi(4); v=u?7:5; log('纸人：消耗 4 点【尸气】强化'); }
      addSummon({type:'zhiren', v, dur:2, up:!!u}); floatMsg('纸人 · 受命而起'); }},"""))
EDITS.append((
"""    } else {
      // 武僧/阴差：#41B/C 造成伤害并施加 1 层诅咒；阴差额外回 1 血
      const t=randomAlive();
      if(t){ dealDamageTo(t, v); applyCurse(t,1); if(G.hero==='yincha'){ heal(1); log('纸人攻击，恢复 1 点生命'); } }
    }""",
"""    } else if(G.hero==='wuseng'){
      // 武僧 #41B：只造成伤害，不再附带诅咒
      const t=randomAlive(); if(t) dealDamageTo(t, v);
    } else {
      // 阴差 #41C：造成伤害并施加 1 层诅咒，攻击时回 1 血
      const t=randomAlive();
      if(t){ dealDamageTo(t, v); applyCurse(t,1); heal(1); log('纸人攻击，恢复 1 点生命'); }
    }"""))

# ---------- #42 咒印 ----------
EDITS.append((
"""  {id:'zhouyin', name:'咒印', type:'spirit', rarity:'white', cost:1,
    t:(u)=>G.hero==='ganshiren'?`召唤咒魂。立即获得 ${u?5:3} 点【尸气】`
      :G.hero==='tianshi'?`施加 ${u?3:2} 层【诅咒】。若目标已有【诅咒】，额外施加 1 层`
      :`施加 ${u?3:2} 层【诅咒】`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ addSummon({type:'zhouhun', v:0, dur:3}); gainShiqi(u?5:3); log(`咒印：召唤咒魂，获得 ${u?5:3} 点【尸气】`); return; }
      const t=curEnemy(); if(!t) return; let n=u?3:2;""",
"""  {id:'zhouyin', name:'咒印', type:'spirit', rarity:'white', cost:1, exhaustOnly:['wuseng'],
    t:(u)=>G.hero==='ganshiren'?`召唤咒魂。立即获得 ${u?5:3} 点【尸气】`
      :G.hero==='wuseng'?`招来咒魂：本回合打出的下一张攻击牌获得 100% 吸血（按其实际伤害回复生命）。消耗牌（一次性）`
      :G.hero==='tianshi'?`施加 ${u?3:2} 层【诅咒】。若目标已有【诅咒】，额外施加 1 层`
      :`施加 ${u?3:2} 层【诅咒】`,
    eff:(u)=>{ if(G.hero==='ganshiren'){ addSummon({type:'zhouhun', v:0, dur:3}); gainShiqi(u?5:3); log(`咒印：召唤咒魂，获得 ${u?5:3} 点【尸气】`); return; }
      if(G.hero==='wuseng'){ G.zhouhunSteal=1; floatMsg('咒魂 · 已伏于刃上'); log('咒印：本回合下一张攻击牌获得 100% 吸血'); return; }
      const t=curEnemy(); if(!t) return; let n=u?3:2;"""))

# ---------- #43 小鬼 ----------
EDITS.append((
"""      :G.hero==='wuseng'?`召唤小鬼。每回合末造成 ${u?3:2} 伤害。死亡时获得 6 点格挡（持续 2 回合）`""",
"""      :G.hero==='wuseng'?`召唤小鬼。每回合末造成 ${u?3:2} 伤害。小鬼死亡时，获得 ${u?7:5} 点格挡（持续 2 回合）`"""))
EDITS.append((
"""    eff:(u)=>{ const v=G.hero==='tianshi'?(u?4:3):(u?4:2); addSummon({type:'xiaogui', v, dur:2, up:!!u}); floatMsg('小鬼 · 奉命出巡'); }},""",
"""    eff:(u)=>{ const v=G.hero==='wuseng'?(u?3:2):(G.hero==='tianshi'?(u?4:3):(u?4:2)); addSummon({type:'xiaogui', v, dur:2, up:!!u}); floatMsg('小鬼 · 奉命出巡'); }},"""))
EDITS.append((
"""    else if(G.hero==='wuseng'){ gainBlock(6); log('小鬼死亡，获得 6 点格挡'); }""",
"""    else if(G.hero==='wuseng'){ const xb=s.up?7:5; gainBlock(xb); log(`小鬼死亡，获得 ${xb} 点格挡`); }"""))

# ---------- #45 五通神 ----------
EDITS.append((
"""      :G.hero==='wuseng'?`召唤五通神。立即获得 7 点格挡；之后每回合开始获得 3 点格挡（持续 ${u?3:2} 回合）`""",
"""      :G.hero==='wuseng'?`召唤五通神。立即获得 ${u?6:5} 点格挡（${u?2:1} 点基础 + 首次触发 4 点）；之后每回合开始获得 4 点格挡（持续 ${u?3:2} 回合）`"""))
EDITS.append((
"""    eff:(u)=>{ // 现形即结算首回合：第一次「回合开始」效果落在当前回合（武僧 = 立即 4 + 首次 3 = 7 格挡）
      if(G.hero==='wuseng'){ gainBlock(4); }
      else if(G.hero==='yincha'){ heal(4); }
      let wv=3, wdur=u?3:2;""",
"""    eff:(u)=>{ // 现形即结算首回合：第一次「回合开始」效果落在当前回合（武僧 = 基础 1/2 + 首次触发 4 = 5/6 格挡）
      if(G.hero==='wuseng'){ gainBlock(u?2:1); }
      else if(G.hero==='yincha'){ heal(4); }
      let wv=G.hero==='wuseng'?4:3, wdur=u?3:2;"""))

# ---------- #46 咒雨 ----------
EDITS.append((
"""  {id:'zhouyu', name:'咒雨', type:'spirit', rarity:'purple', cost:2, exhaust:true,""",
"""  {id:'zhouyu', name:'咒雨', type:'spirit', rarity:'purple', cost:{wuseng:0, default:2}, exhaust:true,"""))
EDITS.append((
"""      :G.hero==='wuseng'?`对所有敌人施加 ${u?3:2} 层【诅咒】。每施加 1 层，获得 2 点格挡`""",
"""      :G.hero==='wuseng'?`将本回合积累的格挡值全部转化为血量。消耗牌（一次性）`"""))
EDITS.append((
"""      let n=0; aliveEnemies().forEach(e=>{ n+=applyCurse(e,u?3:2); });
      if(G.hero==='wuseng'){ gainBlock(n*2); log(`咒雨：施加 ${n} 层诅咒，获得 ${n*2} 点格挡`); }
      else { heal(n*2); log(`咒雨：施加 ${n} 层诅咒，恢复 ${n*2} 点生命`); } }},""",
"""      if(G.hero==='wuseng'){ const b=G.block||0; if(b>0){ G.block=0; heal(b); floatMsg(`格挡化血 +${b}`); log(`咒雨：${b} 点格挡转化为生命`); } else log('咒雨：当前没有格挡'); return; }
      let n=0; aliveEnemies().forEach(e=>{ n+=applyCurse(e,u?3:2); });
      heal(n*2); log(`咒雨：施加 ${n} 层诅咒，恢复 ${n*2} 点生命`); }},"""))

# ---------- #47 阴兵过境 ----------
EDITS.append((
"""      :G.hero==='wuseng'?`召唤 ${u?3:2} 只阴兵。每回合末造成 ${u?5:4} 伤害。存活时每回合获得 3 点格挡（持续 3 回合）`""",
"""      :G.hero==='wuseng'?`召唤 ${u?3:2} 只阴兵。每回合末造成 ${u?5:4} 伤害。阴兵存活时，每回合开始获得 ${u?4:3} 点格挡（持续 3 回合）`"""))
EDITS.append((
"""      for(let i=0;i<count;i++) addSummon({type:'yinbing', v, dur:3, healV:u?2:1});""",
"""      for(let i=0;i<count;i++) addSummon({type:'yinbing', v, dur:3, healV:u?2:1, up:!!u});"""))

# ---------- previewDamage：B 咒雨不显示伤害预览 ----------
EDITS.append((
"""function previewDamage(c){
  const rawFn = CARD_DMG[c.id];
  if(!rawFn) return null;""",
"""function previewDamage(c){
  const rawFn = CARD_DMG[c.id];
  if(!rawFn) return null;
  if(c.id==='zhouyu' && G.hero==='wuseng') return null; // B 咒雨是「格挡转化」，本身无伤害"""))

# ---------- CARD_DMG 预览同步 ----------
EDITS.append((
"""  zhiren: u=>{ const base = G.hero==='ganshiren' ? (hasShiqi(4)?(u?7:5):(u?4:2)) : (u?2:1);""",
"""  zhiren: u=>{ const base = G.hero==='ganshiren' ? (hasShiqi(4)?(u?7:5):(u?4:2)) : (G.hero==='wuseng'?(u?3:2):(u?2:1));"""))
EDITS.append((
"""  zhouyu: u=>(G.尸气||0)*(u?7:6), // 每层尸气换算伤害（引爆总伤）""",
"""  zhouyu: u=>G.hero==='wuseng'?0:(G.尸气||0)*(u?7:6), // B 咒雨无伤害（格挡转化），预览不显示"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v58_block8g_summon DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
