# -*- coding: utf-8 -*-
# v0.57 Block6 复核修正（Block1~5 复核发现的 4 类不符，按《赶尸人版卡池.md》修正）：
#   #2  火符   A 列「随机弃」→「挑选弃 1 张手牌」（新增 picker，仅赶尸人分支）
#   #39 附灵术 2 费 → 0 费 + 加 exhaust（消耗牌，一次性）
#   #38 移形换影 A 列补「（0 符文）」文案（costU:0 早已生效，仅卡面缺失）
#   需求⑤ CARD_DMG 补 zhenyaoling / zhouyu / shi_wang 三个预览键
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# ---------- #2 火符 A 列文案：随机弃 → 挑选弃 ----------
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`造成 ${u?8:5} 伤害。随机弃 1 张手牌；若弃掉的是【鬼怪牌】，获得 ${u?2:1} 点【尸气】`""",
"""    t:(u)=>G.hero==='ganshiren'?`造成 ${u?8:5} 伤害。挑选弃 1 张手牌；若弃掉的是【鬼怪牌】，获得 ${u?2:1} 点【尸气】`"""))

# ---------- #2 火符 eff：赶尸人走挑选弃（其余三列维持随机弃） ----------
EDITS.append((
"""    eff:(u)=>{ const t=curEnemy(); if(!t) return; let d=(u?7:5);
      if(G.hero==='ganshiren') d=(u?8:5);
      if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/3));
      if(G.hero==='yincha'){ d=(u?9:7); loseHp(1); }
      dealDamageTo(t,d);
      if(G.hero==='tianshi') applyCurse(t,1);
      const dropped=discardRandomHand();
      if(dropped && G.hero==='ganshiren' && isGhostCard(dropped)){ gainShiqi(u?2:1); log(`火符：弃掉鬼怪牌，获得 ${u?2:1} 点【尸气】`); } }},""",
"""    eff:(u,c)=>{ const t=curEnemy(); if(!t) return; let d=(u?7:5);
      if(G.hero==='ganshiren') d=(u?8:5);
      if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/3));
      if(G.hero==='yincha'){ d=(u?9:7); loseHp(1); }
      dealDamageTo(t,d);
      if(G.hero==='tianshi') applyCurse(t,1);
      if(G.hero==='ganshiren'){ startHuofuSelect(c, u); return; } // A 列：由玩家挑选要弃的手牌
      discardRandomHand(); }},"""))

# ---------- #39 附灵术：0 费 + 消耗 ----------
EDITS.append((
"""  {id:'fuling', name:'附灵术', type:'skill', rarity:'purple', cost:2, needs:'summon',
    t:(u)=>G.hero==='ganshiren'?`立即触发所有召唤单位。`
      :G.hero==='wuseng'?`立即触发所有召唤单位。每触发 1 个，获得 2 点格挡`
      :G.hero==='yincha'?`立即触发所有召唤单位。每触发 1 个，恢复 2 点生命`
      :`立即触发所有召唤单位。每触发 1 个，对随机敌人施加 1 层【诅咒】`,""",
"""  {id:'fuling', name:'附灵术', type:'skill', rarity:'purple', cost:0, exhaust:true, needs:'summon',
    t:(u)=>G.hero==='ganshiren'?`立即触发所有召唤单位。消耗牌（一次性）`
      :G.hero==='wuseng'?`立即触发所有召唤单位。每触发 1 个，获得 2 点格挡（消耗）`
      :G.hero==='yincha'?`立即触发所有召唤单位。每触发 1 个，恢复 2 点生命（消耗）`
      :`立即触发所有召唤单位。每触发 1 个，对随机敌人施加 1 层【诅咒】（消耗）`,"""))

# ---------- #38 移形换影 A 列补「（0 符文）」 ----------
EDITS.append((
"""    t:(u)=>G.hero==='ganshiren'?`闪避下一次攻击。闪避成功后，获得 2 点【尸气】`""",
"""    t:(u)=>G.hero==='ganshiren'?`闪避下一次攻击。闪避成功后，获得 2 点【尸气】${u?'（0 符文）':''}`"""))

# ---------- 火符 picker：随选中弃牌一起结算 ----------
EDITS.append((
"""function cancelDiscardSelect(){
  const s=G.discardSelect; if(!s) return;
  if(s.card){ const di=G.discard.lastIndexOf(s.card); if(di>=0) G.discard.splice(di,1); G.hand.push(s.card); log('放弃【焚符】，未弃牌、未获得符文'); }
  G.discardSelect=null;
  hideOverlay(); render();
}""",
"""function cancelDiscardSelect(){
  const s=G.discardSelect; if(!s) return;
  if(s.card){ const di=G.discard.lastIndexOf(s.card); if(di>=0) G.discard.splice(di,1); G.hand.push(s.card); log('放弃【焚符】，未弃牌、未获得符文'); }
  G.discardSelect=null;
  hideOverlay(); render();
}
/* 火符(#2，赶尸人 A 列)：挑选弃 1 张手牌；弃到鬼怪牌额外获得尸气（其余三列仍为随机弃） */
function startHuofuSelect(srcCard, up){
  if(!G.hand.length){ log('火符：没有可弃的手牌'); return; }
  G.huofuSelect={ card:srcCard||null, up:!!up };
  renderHuofuSelect();
}
function renderHuofuSelect(){
  const s=G.huofuSelect; if(!s) return;
  const cards=G.hand.map((c,i)=>`<div class="card ${RCOLOR[c.rarity]}" onclick="pickHuofuDiscard(${i})">${cardBody(c)}</div>`).join('');
  showOverlay(`<h2>火 符 · 弃 牌</h2><p style="color:var(--red)">挑选 <b>1</b> 张手牌弃掉；若弃掉的是【鬼怪牌】，获得 ${s.up?2:1} 点【尸气】</p><div class="reward-cards">${cards}</div>`);
}
function pickHuofuDiscard(i){
  const s=G.huofuSelect; if(!s) return;
  const c=G.hand.splice(i,1)[0]; if(!c){ renderHuofuSelect(); return; }
  if(c.type!=='junk') G.discard.push(c);
  log(`弃掉【${c.name}】`);
  let gain=0;
  if(isGhostCard(c)){ gain=s.up?2:1; gainShiqi(gain); log(`火符：弃掉鬼怪牌，获得 ${gain} 点【尸气】`); }
  G.huofuSelect=null; hideOverlay(); render();
  floatMsg(gain>0?`+${gain} 尸气`:'已弃牌');
}"""))

# ---------- 需求⑤ 预览键补齐（镇妖铃 / 咒雨 / 尸王） ----------
EDITS.append((
"""  yinbingguo: u=>{ const bleed=(G.bleedSummons)?Math.floor((G.hpLostTurn||0)/2):0;
    return (u?5:4)+(isSummon('shi_wang')?1:0)+bleed; } // 每只阴兵 v
};""",
"""  yinbingguo: u=>{ const bleed=(G.bleedSummons)?Math.floor((G.hpLostTurn||0)/2):0;
    return (u?5:4)+(isSummon('shi_wang')?1:0)+bleed; }, // 每只阴兵 v
  zhenyaoling: u=>{ const t=curEnemy(); if(!t) return 0; const base=u?16:10;
    if(G.hero==='wuseng') return base+(((G.block||0)>=5)?10:0);   // 耗 5 格挡 → +10
    if(G.hero==='yincha') return base+2*Math.min(10,rageLayers()); // 血怒每层 +2（至多 10 层）
    return base; },
  zhouyu: u=>(G.尸气||0)*(u?7:6), // 每层尸气换算伤害（引爆总伤）
  shi_wang: ()=>10                // 尸王自身每回合末全体 10（不吃自身 +1）
};"""))

EDITS.append((
"""const DYNAMIC_DMG = ['tiebushan','shihun','qungui','taomufu','shixue','baigui'];""",
"""const DYNAMIC_DMG = ['tiebushan','shihun','qungui','taomufu','shixue','baigui','zhouyu'];"""))

EDITS.append((
"""const PER_TURN_SUMMONS = ['zhiren','xiaogui','yinbingguo'];""",
"""const PER_TURN_SUMMONS = ['zhiren','xiaogui','yinbingguo','shi_wang'];"""))

EDITS.append((
"""      const why = c.id==='tiebushan' ? '无格挡' : c.id==='shihun' ? '无诅咒' : '无召唤';""",
"""      const why = c.id==='tiebushan' ? '无格挡' : c.id==='shihun' ? '无诅咒' : c.id==='zhouyu' ? '无尸气' : '无召唤';"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v57_block6_recheck DONE: 原型 %d 处' % len(EDITS))

mm = re.search(r'<script>([\s\S]*?)</script>', s)
js = mm.group(1)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, js.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK (%d chars)' % len(js))
