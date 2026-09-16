# -*- coding: utf-8 -*-
# v0.59 Block9b：攻击牌 1~14 的 C 列（阴差）按《阴差版卡池.md》重做
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# ---- #1 雷符：5/8 伤害；击杀敌人 +2 血怒 ----
EDITS.append((
"""      :G.hero==='yincha'?`造成 ${u?7:5} 伤害。每层【血怒】使此牌伤害 +2（上限 +6），打出时消耗对应层数`""",
"""      :G.hero==='yincha'?`造成 ${u?8:5} 伤害。每层【血怒】使此牌伤害 +2（上限 +6），打出时消耗对应【血怒】；若以此牌击杀敌人，获得 2 层【血怒】`"""))
EDITS.append((
"""    eff:(u)=>{ const t=curEnemy(); if(!t) return; let d=(G.hero==='tianshi'?(u?9:6):G.hero==='yincha'?(u?7:5):(u?6:4));""",
"""    eff:(u)=>{ const t=curEnemy(); if(!t) return; let d=(G.hero==='tianshi'?(u?9:6):G.hero==='yincha'?(u?8:5):(u?6:4));"""))
EDITS.append((
"""      if(G.hero==='ganshiren' && before>0 && t.hp<=0){ gainShiqi(2); log('雷符：击杀敌人，获得 2 点【尸气】'); } }},""",
"""      if(before>0 && t.hp<=0){
        if(G.hero==='ganshiren'){ gainShiqi(2); log('雷符：击杀敌人，获得 2 点【尸气】'); }
        else if(G.hero==='yincha'){ gainRage(2); log('雷符：击杀敌人，获得 2 层【血怒】'); }
      } }}, """.rstrip() + ","))

# ---- #2 火符：8/11 伤害；失去 2 点生命；不弃牌 ----
EDITS.append((
"""  {id:'huofu', name:'火符', type:'attack', rarity:'white', cost:1, hpCost:(u)=>G.hero==='yincha'?1:0,""",
"""  {id:'huofu', name:'火符', type:'attack', rarity:'white', cost:1, hpCost:(u)=>G.hero==='yincha'?2:0,"""))
EDITS.append((
"""      :G.hero==='yincha'?`造成 ${u?9:7} 伤害。失去 1 点生命，随机弃 1 张手牌`""",
"""      :G.hero==='yincha'?`造成 ${u?11:8} 伤害。失去 2 点生命`"""))
EDITS.append((
"""      if(G.hero==='yincha'){ d=(u?9:7); loseHp(1); }""",
"""      if(G.hero==='yincha'){ d=(u?11:8); loseHp(2); }"""))
EDITS.append((
"""      if(G.hero==='ganshiren'){ startHuofuSelect(c, u); return; } // A 列：由玩家挑选要弃的手牌
      discardRandomHand(); }},""",
"""      if(G.hero==='ganshiren'){ startHuofuSelect(c, u); return; } // A 列：由玩家挑选要弃的手牌
      if(G.hero==='yincha') return; // C 列：只造成伤害并失去生命，不弃牌
      discardRandomHand(); }},"""))

# ---- #3 剑符：固定 10 伤害，本回合每失 1 血 +1/+2 ----
EDITS.append((
"""      :G.hero==='yincha'?`造成 ${u?14:10} 伤害。本回合每失去过 1 点生命，此牌伤害 +1`""",
"""      :G.hero==='yincha'?`造成 10 伤害。本回合每失去 1 点生命，此牌伤害 +${u?2:1}`"""))
EDITS.append((
"""      else if(G.hero==='yincha'){ d=(u?14:10)+(G.hpLostTurn||0); }""",
"""      else if(G.hero==='yincha'){ d=10+(G.hpLostTurn||0)*(u?2:1); }"""))

# ---- #4 斩妖剑：9/14 伤害 + 带诅咒额外 4/6 ----
EDITS.append((
"""      :(G.hero==='wuseng'||G.hero==='yincha')?`造成 ${u?12:8} 伤害。若目标带有【诅咒】，额外造成 6 点伤害`""",
"""      :G.hero==='wuseng'?`造成 ${u?12:8} 伤害。若目标带有【诅咒】，额外造成 6 点伤害`
      :G.hero==='yincha'?`造成 ${u?14:9} 伤害。若目标带有【诅咒】，额外造成 ${u?6:4} 伤害`"""))
EDITS.append((
"""      let d=(u?12:8);
      if(G.hero==='ganshiren') d+=2*G.summons.filter(s=>s.dur>0).length;
      else if(t.curse>0) d+=6;
      dealDamageTo(t,d); }},""",
"""      if(G.hero==='yincha'){ let dc=(u?14:9); if((t.curse||0)>0) dc+=(u?6:4); dealDamageTo(t,dc); return; }
      let d=(u?12:8);
      if(G.hero==='ganshiren') d+=2*G.summons.filter(s=>s.dur>0).length;
      else if(t.curse>0) d+=6;
      dealDamageTo(t,d); }},"""))

# ---- #5 天雷正法：16/21 伤害 + 本场每失 1 血 +1/+2 ----
EDITS.append((
"""      :G.hero==='yincha'?`造成 ${u?20:16} 伤害。失去 5 点生命，本场每失去过 1 点生命，此牌伤害 +1（上限 +20）`""",
"""      :G.hero==='yincha'?`造成 ${u?21:16} 伤害。失去 5 点生命，本场每失去过 1 点生命，此牌伤害 +${u?2:1}（上限 +20）`"""))
EDITS.append((
"""      if(G.hero==='yincha'){ loseHp(5); dealDamageTo(t,(u?20:16)+Math.min(20,G.totalHpLost||0)); return; }""",
"""      if(G.hero==='yincha'){ loseHp(5); dealDamageTo(t,(u?21:16)+Math.min(20,(G.totalHpLost||0)*(u?2:1))); return; }"""))

# ---- #6 万剑归宗：10/15 伤害；斩杀恢复 8/12 生命 + 1 符文 ----
EDITS.append((
"""      :G.hero==='yincha'?`对全体敌人造成 ${u?14:10} 伤害。失去 3 点生命。每击败 1 名敌人，恢复 8 点生命`""",
"""      :G.hero==='yincha'?`对全体敌人造成 ${u?15:10} 伤害。失去 3 点生命。每击败 1 名敌人，恢复 ${u?12:8} 点生命并获得 1 点符文`"""))
EDITS.append((
"""      else if(G.hero==='yincha'){ loseHp(3); const d=u?14:10; targets.forEach(e=>{ if(e.hp>0) dealDamageTo(e,d); }); }""",
"""      else if(G.hero==='yincha'){ loseHp(3); const d=u?15:10; targets.forEach(e=>{ if(e.hp>0) dealDamageTo(e,d); }); }"""))
EDITS.append((
"""        else if(G.hero==='yincha'){ heal(killed*8); log(`万剑归宗：击败 ${killed} 名敌人，恢复 ${killed*8} 点生命`); }""",
"""        else if(G.hero==='yincha'){ const hk=killed*(u?12:8); heal(hk); G.energy+=killed; log(`万剑归宗：击败 ${killed} 名敌人，恢复 ${hk} 点生命并获得 ${killed} 点符文`); }"""))

# ---- #8 噬魂术：10/15 伤害 + 血怒每层 +2（上限 +20） ----
EDITS.append((
"""      :G.hero==='yincha'?`对目标造成 ${u?13:10} 伤害。每层【血怒】使此牌伤害 +2（上限 +20），打出时消耗对应层数（非消耗牌）`""",
"""      :G.hero==='yincha'?`对目标造成 ${u?15:10} 伤害。每层【血怒】使此牌伤害 +2（上限 +20），打出时消耗对应【血怒】`"""))
EDITS.append((
"""      if(G.hero==='yincha'){ dealDamageTo(t,(u?13:10)+2*rageSpend(2,20)); return; }""",
"""      if(G.hero==='yincha'){ dealDamageTo(t,(u?15:10)+2*rageSpend(2,20)); return; }"""))

# ---- #9 群鬼乱舞：召唤单位伤害 +1/+2 ----
EDITS.append((
"""      :G.hero==='yincha'?`失去 2 点生命。本回合每失去 2 点生命，召唤单位伤害 +1`""",
"""      :G.hero==='yincha'?`失去 2 点生命。本回合每失去 2 点生命，召唤单位伤害 +${u?2:1}`"""))
EDITS.append((
"""      if(G.hero==='yincha'){ loseHp(2); G.bleedSummons=true; log('群鬼乱舞：本回合每失去 2 点生命，召唤单位伤害 +1'); return; }""",
"""      if(G.hero==='yincha'){ loseHp(2); G.bleedSummons=true; G.bleedSummonsBonus=u?2:1; log(`群鬼乱舞：本回合每失去 2 点生命，召唤单位伤害 +${u?2:1}`); return; }"""))

# ---- #10 桃木符：4/7 伤害 ----
EDITS.append((
"""      if(G.hero==='yincha') return `造成 ${u?6:4} 伤害。${gh}。若目标生命低于 50%，额外 +2`;""",
"""      if(G.hero==='yincha') return `造成 ${u?7:4} 伤害。${gh}。若目标生命低于 50%，额外 +2`;"""))
EDITS.append((
"""      let d = G.hero==='tianshi'?(u?8:6) : G.hero==='ganshiren'?(u?7:5) : (u?6:4);""",
"""      let d = G.hero==='tianshi'?(u?8:6) : G.hero==='ganshiren'?(u?7:5) : (G.hero==='yincha'?(u?7:4):(u?6:4));"""))

# ---- #11 蚀魂咒：5/8 伤害；补上漏掉的「失去 2 点生命」 ----
EDITS.append((
"""      :G.hero==='yincha'?`造成 ${u?7:5} 伤害。失去 2 点生命，施加 2 层【诅咒】`""",
"""      :G.hero==='yincha'?`造成 ${u?8:5} 伤害。失去 2 点生命，施加 2 层【诅咒】`"""))
EDITS.append((
"""    eff:(u)=>{ const t=curEnemy(); if(!t) return;
      dealDamageTo(t, G.hero==='ganshiren'?(u?6:3):(G.hero==='tianshi'?(u?6:4):(u?7:5)));""",
"""    eff:(u)=>{ const t=curEnemy(); if(!t) return;
      if(G.hero==='yincha') loseHp(2); // C 列卡面写明「失去 2 点生命」，原先只扣了格挡/血量前置却没实扣
      dealDamageTo(t, G.hero==='ganshiren'?(u?6:3):(G.hero==='tianshi'?(u?6:4):(G.hero==='yincha'?(u?8:5):(u?7:5))));"""))

# ---- #12 嗜血：本场每失 4/3 点生命 +1 ----
EDITS.append((
"""      :G.hero==='yincha'?`造成 ${u?6:4} 伤害。本场每失去 3 点生命，此牌伤害 +1（上限 +${u?20:15}）`""",
"""      :G.hero==='yincha'?`造成 ${u?6:4} 伤害。本场每失去 ${u?3:4} 点生命，此牌伤害 +1（上限 +${u?20:15}）`"""))
EDITS.append((
"""      else if(G.hero==='yincha') d=(u?6:4)+Math.min(u?20:15,Math.floor((G.totalHpLost||0)/3));""",
"""      else if(G.hero==='yincha') d=(u?6:4)+Math.min(u?20:15,Math.floor((G.totalHpLost||0)/(u?3:4)));"""))

# ---- #14 钟馗镇魂：16/24 伤害；生命低于 40% 翻倍 ----
EDITS.append((
"""      :G.hero==='yincha'?`对目标造成 ${u?22:16} 伤害并【镇魂】。失去 4 点生命；若生命低于 30%，伤害翻倍（消耗）`""",
"""      :G.hero==='yincha'?`对目标造成 ${u?24:16} 伤害并【镇魂】。失去 4 点生命；若生命低于 40%，伤害翻倍。消耗牌（一次性）`"""))
EDITS.append((
"""      if(G.hero==='yincha'){ sealEnemy(t,1); loseHp(4); let d=u?22:16; if(G.hp < G.maxHp*0.3){ d*=2; log('钟馗镇魂：生命低于 30%，伤害翻倍'); } dealDamageTo(t,d); return; }""",
"""      if(G.hero==='yincha'){ sealEnemy(t,1); loseHp(4); let d=u?24:16; if(G.hp < G.maxHp*0.4){ d*=2; log('钟馗镇魂：生命低于 40%，伤害翻倍'); } dealDamageTo(t,d); return; }"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v59_block9b_atk DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
