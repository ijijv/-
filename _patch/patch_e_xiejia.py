# -*- coding: utf-8 -*-
# ⑦ 卸甲生元(A/C/D)转化时机修复：从 finishEndTurn 提前结算 → 移到敌人攻击后(resolveEndBlock)
#   格挡先挡伤害；剩余余量再转 A尸气/C生命/D诅咒；D 溢出部分不回清(applyCurse 会当场转回格挡并保留)。
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# E1 finishEndTurn：删掉 endBlockKind 提前结算块；把「苦行武僧保留3格挡」的 else-if 改成独立 if
EDITS.append((
"""  // 卸甲生元(#23)：回合末把剩余格挡结算成对应英雄收益（A→尸气 / C→生命 / D→诅咒）
  if(G.endBlockKind){
    const bk=G.block;
    if(bk>0){
      if(G.endBlockKind==='A'){ const q=Math.floor(bk/2); if(q>0){ gainShiqi(q); log(`卸甲生元：${bk} 点格挡转为 ${q} 点【尸气】`); } }
      else if(G.endBlockKind==='C'){ heal(bk); log(`卸甲生元：${bk} 点格挡转为生命`); }
      else if(G.endBlockKind==='D'){ const cAmt=Math.min(6, Math.floor(bk/2)); if(cAmt>0){ const re=randomAlive(); if(re){ applyCurse(re,cAmt); log(`卸甲生元：${bk} 点格挡转为 ${cAmt} 层【诅咒】`); } } }
    }
    G.block=0; G.endBlockKind=null;
  }
  // 苦行武僧：回合结束时保留最多 3 点格挡（卸甲生元[武僧#23B]持续期间不清零）
  else if(G.hero === 'wuseng' && !(G.xiejia>0)) {
    G.block = Math.min(3, G.block);
  }
  if(G.weak>0) G.weak--;
  enemyAct();
}
function enemyAct(){""",
"""  // 苦行武僧：回合结束时保留最多 3 点格挡（卸甲生元[武僧#23B]持续期间不清零）
  // 卸甲生元(#23 A/C/D)的转化移到敌人攻击之后：格挡先挡伤害，剩余余量再结算（见 enemyAct 内 resolveEndBlock）
  if(G.hero === 'wuseng' && !(G.xiejia>0)) {
    G.block = Math.min(3, G.block);
  }
  if(G.weak>0) G.weak--;
  enemyAct();
}
/* 卸甲生元(#23 A/C/D)：敌人攻击全部结算之后，把没被消耗的剩余格挡转为英雄收益。
   A 赶尸人 每 2 格挡→1 尸气；C 阴差 每 1 格挡→1 生命；D 天师 每 2 格挡→1 诅咒（上限 6）。
   只扣掉结算中消耗的 bk 而不整体清零——D 若目标满 6 层，applyCurse 的溢出会当场转回格挡并保留。 */
function resolveEndBlock(){
  if(!G.endBlockKind) return;
  const bk=G.block;
  if(bk>0){
    if(G.endBlockKind==='A'){ const q=Math.floor(bk/2); if(q>0){ gainShiqi(q); log(`卸甲生元：${bk} 点格挡转为 ${q} 点【尸气】`); } }
    else if(G.endBlockKind==='C'){ heal(bk); log(`卸甲生元：${bk} 点格挡转为生命`); }
    else if(G.endBlockKind==='D'){ const cAmt=Math.min(6, Math.floor(bk/2)); if(cAmt>0){ const re=randomAlive(); if(re){ applyCurse(re,cAmt); log(`卸甲生元：${bk} 点格挡转为 ${cAmt} 层【诅咒】`); } } }
  }
  G.block=Math.max(0, G.block-bk);
  G.endBlockKind=null;
}
function enemyAct(){"""))

# E2 敌人在行动内结算卸甲生元：置于武僧卸甲转化之后、回合总结之前
EDITS.append((
"""  if(G.xiejia>0){ G.xiejia--; if(G.xiejia===0 && G.block>0){ const h=G.block; G.block=0; G.hp=Math.min(G.maxHp, G.hp+h); sfx('heal'); floatMsg(`卸甲生元 · 格挡化血 +${h}`); log(`卸甲生元：${h} 点格挡转化为生命`); } }
  logTurnSummary();""",
"""  if(G.xiejia>0){ G.xiejia--; if(G.xiejia===0 && G.block>0){ const h=G.block; G.block=0; G.hp=Math.min(G.maxHp, G.hp+h); sfx('heal'); floatMsg(`卸甲生元 · 格挡化血 +${h}`); log(`卸甲生元：${h} 点格挡转化为生命`); } }
  resolveEndBlock();
  logTurnSummary();"""))

# E3 卡面文案 A 列：时机改「敌人攻击后，剩余格挡」
EDITS.append((
"""      :G.hero==='wuseng'?`获得 ${u?8:6} 点格挡。使【卸甲】持续 ${u?3:2} 回合：期间格挡不清零，到期后剩余格挡转为生命`
      :G.hero==='yincha'?`获得 ${u?7:5} 点格挡。失去 3 点生命。回合结束时每保留 1 点格挡，恢复 1 点生命`
      :`获得 ${u?8:6} 点格挡。回合结束时，将剩余格挡转为对随机敌人施加【诅咒】（每 2 格挡 = 1 层，上限 6 层）`,""",
"""      :G.hero==='wuseng'?`获得 ${u?8:6} 点格挡。使【卸甲】持续 ${u?3:2} 回合：期间格挡不清零，到期后剩余格挡转为生命`
      :G.hero==='yincha'?`获得 ${u?7:5} 点格挡。失去 3 点生命。敌人攻击后每保留 1 点格挡，恢复 1 点生命`
      :`获得 ${u?8:6} 点格挡。敌人攻击后，将剩余格挡转为对随机敌人施加【诅咒】（每 2 格挡 = 1 层，上限 6 层；敌人满 6 层时溢出部分会转回格挡）`,"""))

# E4 打出时提示浮字同步（A/C/D 三列；整段 eff 一并替换避免行中匹配歧义）
EDITS.append((
"""    eff:(u)=>{ if(G.hero==='ganshiren'){ gainBlock(u?7:5); G.endBlockKind='A'; floatMsg('回合末格挡将转为尸气'); }
      else if(G.hero==='wuseng'){ gainBlock(u?8:6); G.xiejia=u?3:2; floatMsg('【卸甲】已启动，格挡不再清零'); }
      else if(G.hero==='yincha'){ loseHp(3); gainBlock(u?7:5); G.endBlockKind='C'; floatMsg('回合末格挡将转为生命'); }
      else { gainBlock(u?8:6); G.endBlockKind='D'; floatMsg('回合末格挡将转为诅咒'); } }},""",
"""    eff:(u)=>{ if(G.hero==='ganshiren'){ gainBlock(u?7:5); G.endBlockKind='A'; floatMsg('敌人攻击后格挡将转为尸气'); }
      else if(G.hero==='wuseng'){ gainBlock(u?8:6); G.xiejia=u?3:2; floatMsg('【卸甲】已启动，格挡不再清零'); }
      else if(G.hero==='yincha'){ loseHp(3); gainBlock(u?7:5); G.endBlockKind='C'; floatMsg('敌人攻击后格挡将转为生命'); }
      else { gainBlock(u?8:6); G.endBlockKind='D'; floatMsg('敌人攻击后格挡将转为诅咒'); } }},"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i+1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH e_xiejia DONE: %d 处替换成功' % len(EDITS))

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
