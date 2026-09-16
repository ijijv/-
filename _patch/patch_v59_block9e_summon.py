# -*- coding: utf-8 -*-
# v0.59 Block9e：焚符 C 回血 3/4 + 召唤牌 41~48 的 C 列重做 + 召唤引擎按英雄分流
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# ---- #34 焚符：每弃 1 张恢复 3/4 点生命 ----
EDITS.append((
"""      :G.hero==='yincha'?`弃任意张手牌：每弃 1 张，恢复 ${u?3:2} 点生命`""",
"""      :G.hero==='yincha'?`弃任意张手牌：每弃 1 张，恢复 ${u?4:3} 点生命`"""))
EDITS.append((
"""    else if(G.hero==='yincha'){ heal(u?3:2); }""",
"""    else if(G.hero==='yincha'){ heal(u?4:3); }"""))

# ---- #41 纸人：失去 2 生命；1/2 伤害 + 攻击回 2/3 血；血怒≥4 消耗 4 → 4/5 伤害 + 回 3/4 ----
EDITS.append((
"""      :G.hero==='yincha'?`召唤纸人。每回合末造成 ${u?2:1} 伤害并施加 1 层【诅咒】。攻击时恢复 1 点生命（持续 2 回合）`""",
"""      :G.hero==='yincha'?`召唤纸人。失去 2 点生命。每回合末造成 ${u?2:1} 伤害，纸人攻击时为你恢复 ${u?3:2} 点生命（持续 2 回合）。若打出时【血怒】≥4，消耗 4 点【血怒】强化：每回合末造成 ${u?5:4} 伤害，攻击时恢复 ${u?4:3} 点生命`"""))
EDITS.append((
"""    eff:(u)=>{ let v = G.hero==='wuseng' ? (u?3:2) : (u?4:2);
      if(G.hero==='ganshiren' && hasShiqi(4)){ spendShiqi(4); v=u?7:5; log('纸人：消耗 4 点【尸气】强化'); }
      addSummon({type:'zhiren', v, dur:2, up:!!u}); floatMsg('纸人 · 受命而起'); }},""",
"""    eff:(u)=>{ let v = G.hero==='wuseng' ? (u?3:2) : (u?4:2); let hv=0;
      if(G.hero==='ganshiren' && hasShiqi(4)){ spendShiqi(4); v=u?7:5; log('纸人：消耗 4 点【尸气】强化'); }
      else if(G.hero==='yincha'){ loseHp(2); v=u?2:1; hv=u?3:2;
        if(rageLayers()>=4){ G.xuenu-=4; v=u?5:4; hv=u?4:3; log('纸人：消耗 4 点【血怒】强化'); } }
      addSummon({type:'zhiren', v, healV:hv, dur:2, up:!!u}); floatMsg('纸人 · 受命而起'); }},"""))

# ---- #43 小鬼：失去 2 生命；1/2 伤害 + 每回合 +1 血怒；死亡回 2/4 血 ----
EDITS.append((
"""      :G.hero==='yincha'?`召唤小鬼。每回合末造成 ${u?3:2} 伤害。死亡时恢复 4 点生命（持续 2 回合）`""",
"""      :G.hero==='yincha'?`召唤小鬼。失去 2 点生命。每回合末造成 ${u?2:1} 伤害并获得 1 层【血怒】；小鬼死亡时，恢复 ${u?4:2} 点生命（持续 2 回合）`"""))
EDITS.append((
"""    eff:(u)=>{ const v=G.hero==='wuseng'?(u?3:2):(G.hero==='tianshi'?(u?4:3):(u?4:2)); addSummon({type:'xiaogui', v, dur:2, up:!!u}); floatMsg('小鬼 · 奉命出巡'); }},""",
"""    eff:(u)=>{ const v=G.hero==='wuseng'?(u?3:2):(G.hero==='tianshi'?(u?4:3):(G.hero==='yincha'?(u?2:1):(u?4:2)));
      if(G.hero==='yincha') loseHp(2);
      addSummon({type:'xiaogui', v, dur:2, up:!!u}); floatMsg('小鬼 · 奉命出巡'); }},"""))

# ---- #45 五通神：C 列改为回血（立即 5 + 每回合 5）；血怒≥4 消耗 4 → 持续 3/4 回合 ----
EDITS.append((
"""      :G.hero==='yincha'?`召唤五通神。立即恢复 4 点生命并获得 3 点格挡；之后每回合开始获得 3 点格挡（持续 ${u?3:2} 回合）`""",
"""      :G.hero==='yincha'?`召唤五通神。立即恢复 5 点生命；之后每回合开始恢复 5 点生命（持续 ${u?3:2} 回合）。若打出时【血怒】≥4，消耗 4 点【血怒】强化：持续 ${u?4:3} 回合`"""))
EDITS.append((
"""    eff:(u)=>{ // 现形即结算首回合：第一次「回合开始」效果落在当前回合（武僧 = 基础 1/2 + 首次触发 4 = 5/6 格挡）
      if(G.hero==='wuseng'){ gainBlock(u?2:1); }
      else if(G.hero==='yincha'){ heal(4); }
      let wv=G.hero==='wuseng'?4:3, wdur=u?3:2;
      if(G.hero==='ganshiren'){ if(hasShiqi(5)){ spendShiqi(5); wv=6; wdur=u?4:3; log('五通神：消耗 5 点【尸气】强化'); } else { wv=5; } }""",
"""    eff:(u)=>{ // 现形即结算首回合：第一次「回合开始」效果落在当前回合（武僧 = 基础 1/2 + 首次触发 4 = 5/6 格挡）
      let wv=G.hero==='wuseng'?4:3, wdur=u?3:2;
      if(G.hero==='wuseng'){ gainBlock(u?2:1); }
      else if(G.hero==='yincha'){ heal(5); wv=5; if(rageLayers()>=4){ G.xuenu-=4; wdur=u?4:3; log('五通神：消耗 4 点【血怒】强化'); } }
      if(G.hero==='ganshiren'){ if(hasShiqi(5)){ spendShiqi(5); wv=6; wdur=u?4:3; log('五通神：消耗 5 点【尸气】强化'); } else { wv=5; } }"""))

# ---- #47 阴兵过境：攻击时固定恢复 2 点生命 ----
EDITS.append((
"""      :G.hero==='yincha'?`召唤 ${u?3:2} 只阴兵。每回合末造成 ${u?5:4} 伤害。攻击时恢复 ${u?2:1} 点生命（持续 3 回合）`""",
"""      :G.hero==='yincha'?`召唤 ${u?3:2} 只阴兵。每回合末造成 ${u?5:4} 伤害。每只阴兵攻击时，为你恢复 2 点生命（持续 3 回合）`"""))
EDITS.append((
"""      for(let i=0;i<count;i++) addSummon({type:'yinbing', v, dur:3, healV:u?2:1, up:!!u});""",
"""      for(let i=0;i<count;i++) addSummon({type:'yinbing', v, dur:3, healV:2, up:!!u});"""))

# ---- 引擎：summonAct 纸人 C 改为击伤+回血（去掉诅咒/固定回1） ----
EDITS.append((
"""    } else {
      // 阴差 #41C：造成伤害并施加 1 层诅咒，攻击时回 1 血
      const t=randomAlive();
      if(t){ dealDamageTo(t, v); applyCurse(t,1); heal(1); log('纸人攻击，恢复 1 点生命'); }
    }""",
"""    } else {
      // 阴差 #41C：造成伤害，并按召唤时记录的 healV 为你回血（强化版 4/5 伤害 + 回 3/4）
      const t=randomAlive();
      if(t){ dealDamageTo(t, v); const zh=s.healV||2; heal(zh); log(`纸人攻击，恢复 ${zh} 点生命`); }
    }"""))

# ---- 引擎：summonAct 小鬼 C 每回合 +1 血怒 ----
EDITS.append((
"""  else if(s.type==='xiaogui'){
    // #43：天师打诅咒最高敌人，其余打随机敌人
    const t = G.hero==='tianshi' ? (mostCursedEnemy()||randomAlive()) : randomAlive();
    if(t) dealDamageTo(t, v);
  }""",
"""  else if(s.type==='xiaogui'){
    // #43：天师打诅咒最高敌人，其余打随机敌人
    const t = G.hero==='tianshi' ? (mostCursedEnemy()||randomAlive()) : randomAlive();
    if(t) dealDamageTo(t, v);
    if(G.hero==='yincha'){ gainRage(1); log('小鬼：获得 1 层【血怒】'); }
  }"""))

# ---- 引擎：onSummonDeath 小鬼 C 回 2/4 血 ----
EDITS.append((
"""    else if(G.hero==='yincha'){ heal(4); log('小鬼死亡，恢复 4 点生命'); }""",
"""    else if(G.hero==='yincha'){ const xh=s.up?4:2; heal(xh); log(`小鬼死亡，恢复 ${xh} 点生命`); }"""))

# ---- 引擎：wutongTick C 列改为回血 ----
EDITS.append((
"""function wutongTick(s){
  const b=s.v||3;
  gainBlock(b);
  if(G.hero==='ganshiren'){ log(`五通神：获得 ${b} 点格挡`); }
  else if(G.hero==='tianshi'){ const wt=randomAlive(); if(wt) applyCurse(wt,1); log(`五通神：获得 ${b} 点格挡并对随机敌人施加 1 层【诅咒】`); }
  else log(`五通神：获得 ${b} 点格挡`);
  if(!s.indefinite) s.dur--;
}""",
"""function wutongTick(s){
  const b=s.v||3;
  if(G.hero==='yincha'){ heal(b); log(`五通神：恢复 ${b} 点生命`); }
  else {
    gainBlock(b);
    if(G.hero==='ganshiren'){ log(`五通神：获得 ${b} 点格挡`); }
    else if(G.hero==='tianshi'){ const wt=randomAlive(); if(wt) applyCurse(wt,1); log(`五通神：获得 ${b} 点格挡并对随机敌人施加 1 层【诅咒】`); }
    else log(`五通神：获得 ${b} 点格挡`);
  }
  if(!s.indefinite) s.dur--;
}"""))

# ---- 召唤面板：C 列的纸人/小鬼/阴兵/五通神标签 ----
EDITS.append((
"""  const label = s.type==='zhiren'?(G.hero==='ganshiren'?`纸人：每回合末对随机敌人造成 ${v} 点伤害`
      :G.hero==='wuseng'?`纸人：每回合末造成 ${v} 点伤害；存活时每回合开始 +${s.up?3:2} 格挡`
      :`纸人：每回合末对随机敌人造成 ${v} 点伤害 +1诅咒`)
    : s.type==='zhouhun'?`咒魂：携带尸气`
    : s.type==='xiaogui'?`小鬼：每回合末对随机敌人造成 ${v} 点伤害`
    : s.type==='yinbing'?`阴兵：每回合末${G.hero==='tianshi'?'优先攻击🎯标记敌（上一次施咒的敌人）':'对随机敌人'}造成 ${v} 点伤害${G.hero==='wuseng'?`；存活时每回合开始 +${s.up?4:3} 格挡`:''}`
    : s.type==='shi_wang'?`尸王：每回合末对全体敌人造成 ${v} 点伤害`
    : `五通神：每回合开始你 +${v} 格挡`;""",
"""  const label = s.type==='zhiren'?(G.hero==='ganshiren'?`纸人：每回合末对随机敌人造成 ${v} 点伤害`
      :G.hero==='wuseng'?`纸人：每回合末造成 ${v} 点伤害；存活时每回合开始 +${s.up?3:2} 格挡`
      :G.hero==='yincha'?`纸人：每回合末造成 ${v} 点伤害；攻击时为你恢复 ${s.healV||2} 点生命`
      :`纸人：每回合末对随机敌人造成 ${v} 点伤害 +1诅咒`)
    : s.type==='zhouhun'?`咒魂：携带尸气`
    : s.type==='xiaogui'?(G.hero==='yincha'?`小鬼：每回合末造成 ${v} 点伤害并 +1【血怒】；死亡时恢复 ${s.up?4:2} 点生命`:`小鬼：每回合末对随机敌人造成 ${v} 点伤害`)
    : s.type==='yinbing'?`阴兵：每回合末${G.hero==='tianshi'?'优先攻击🎯标记敌（上一次施咒的敌人）':'对随机敌人'}造成 ${v} 点伤害${G.hero==='wuseng'?`；存活时每回合开始 +${s.up?4:3} 格挡`:''}${G.hero==='yincha'?'；攻击时为你恢复 2 点生命':''}`
    : s.type==='shi_wang'?`尸王：每回合末对全体敌人造成 ${v} 点伤害`
    : (G.hero==='yincha'?`五通神：每回合开始你 +${v} 生命`:`五通神：每回合开始你 +${v} 格挡`);"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v59_block9e_summon DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
