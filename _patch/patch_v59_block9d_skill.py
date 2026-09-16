# -*- coding: utf-8 -*-
# v0.59 Block9d：防御 #22 反震文案 + 功能牌 24~40 的 C 列重做
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# ---- #22 反震：文案改为「获得血怒并对攻击者造成伤害」（数值不变） ----
EDITS.append((
"""      :G.hero==='yincha'?`反弹 ${u?5:4} 点伤害。本回合每受 1 次攻击，获得 ${u?2:1} 层【血怒】`""",
"""      :G.hero==='yincha'?`本回合每受到 1 次攻击，获得 ${u?2:1} 层【血怒】并对攻击者造成 ${u?5:4} 点伤害`"""))

# ---- #28 血契：扣除全部血怒，按层数 ×2 回血（1/0 费） ----
EDITS.append((
"""  {id:'xueqi', name:'血契', type:'skill', rarity:'blue', cost:1, costU:{wuseng:0},
    t:(u)=>G.hero==='wuseng'?`将目前的格挡转化为血量${u?'（0 符文）':''}`
      :`本回合每失去 1 点生命，获得 ${u?3:2} 点格挡`,
    eff:(u)=>{ if(G.hero==='wuseng'){ const b=G.block||0; if(b>0){ G.block=0; heal(b); floatMsg(`格挡化血 +${b}`); log(`血契：${b} 点格挡转化为生命`); } else log('血契：当前没有格挡'); return; }
      G.bloodPact=(G.bloodPact||0)+(u?3:2); floatMsg('血契：以血换盾'); log(`血契：本回合每失去 1 点生命，获得 ${G.bloodPact} 点格挡`); }},""",
"""  {id:'xueqi', name:'血契', type:'skill', rarity:'blue', cost:1, costU:{wuseng:0, yincha:0},
    t:(u)=>G.hero==='wuseng'?`将目前的格挡转化为血量${u?'（0 符文）':''}`
      :G.hero==='yincha'?`扣除目前所有【血怒】，恢复【血怒】层数 ×2 的生命${u?'（0 符文）':''}`
      :`本回合每失去 1 点生命，获得 ${u?3:2} 点格挡`,
    eff:(u)=>{ if(G.hero==='wuseng'){ const b=G.block||0; if(b>0){ G.block=0; heal(b); floatMsg(`格挡化血 +${b}`); log(`血契：${b} 点格挡转化为生命`); } else log('血契：当前没有格挡'); return; }
      if(G.hero==='yincha'){ const r=rageLayers(); if(r<=0){ floatMsg('没有【血怒】'); log('血契：当前没有【血怒】'); return; } G.xuenu=0; const hh=r*2; heal(hh); floatMsg(`血怒化命 +${hh}`); log(`血契：扣除 ${r} 层【血怒】，恢复 ${hh} 点生命`); return; }
      G.bloodPact=(G.bloodPact||0)+(u?3:2); floatMsg('血契：以血换盾'); log(`血契：本回合每失去 1 点生命，获得 ${G.bloodPact} 点格挡`); }},"""))

# ---- #31 燃血术：失去 4/6 生命 → 获得 1/2 符文（其余英雄仍为 2 符文） ----
EDITS.append((
"""    t:(u)=>{ const l=G.hero==='wuseng'?6:(G.hero==='yincha'?(u?6:4):(G.hero==='tianshi'?(u?3:6):4));
      return `失去 ${l} 点生命。获得 2 点符文`; },
    eff:(u)=>{ const l=G.hero==='wuseng'?6:(G.hero==='yincha'?(u?6:4):(G.hero==='tianshi'?(u?3:6):4));
      loseHp(l); G.energy+=2; floatMsg('符文 +2'); log(`燃血术：失去 ${l} 点生命，获得 2 点符文`); }},""",
"""    t:(u)=>{ const l=G.hero==='wuseng'?6:(G.hero==='yincha'?(u?6:4):(G.hero==='tianshi'?(u?3:6):4));
      const gg=G.hero==='yincha'?(u?2:1):2;
      return `失去 ${l} 点生命。获得 ${gg} 点符文`; },
    eff:(u)=>{ const l=G.hero==='wuseng'?6:(G.hero==='yincha'?(u?6:4):(G.hero==='tianshi'?(u?3:6):4));
      const gg=G.hero==='yincha'?(u?2:1):2;
      loseHp(l); G.energy+=gg; floatMsg(`符文 +${gg}`); log(`燃血术：失去 ${l} 点生命，获得 ${gg} 点符文`); }},"""))

# ---- #32 洗髓经：C 列只失血 + 给符文（去掉血怒） ----
EDITS.append((
"""      :G.hero==='yincha'?`接下来 ${u?4:3} 回合，每回合开始失去 2 点生命，获得 1 层【血怒】和 1 点符文`""",
"""      :G.hero==='yincha'?`接下来 ${u?4:3} 回合，每回合开始失去 2 点生命，获得 1 点符文`"""))
EDITS.append((
"""    else if(G.hero==='yincha'){ loseHp(2); gainRage(1); log('洗髓经：失去 2 点生命，获得 1 层【血怒】与 1 点符文'); }""",
"""    else if(G.hero==='yincha'){ loseHp(2); log('洗髓经：失去 2 点生命，获得 1 点符文'); }"""))

# ---- #36 燃魂：失去 6 生命（固定）；每打技能牌恢复 2/4 生命 ----
EDITS.append((
"""  {id:'ranhun', name:'燃魂', type:'skill', rarity:'purple', cost:0, hpCost:(u)=>G.hero==='yincha'?(u?5:7):(u?4:6),""",
"""  {id:'ranhun', name:'燃魂', type:'skill', rarity:'purple', cost:0, hpCost:(u)=>G.hero==='yincha'?6:(u?4:6),"""))
EDITS.append((
"""      :G.hero==='yincha'?`失去 ${u?5:7} 点生命。抽 3 张牌。本回合每打出 1 张技能牌，恢复 2 点生命`""",
"""      :G.hero==='yincha'?`失去 6 点生命。抽 3 张牌。本回合每打出 1 张技能牌，恢复 ${u?4:2} 点生命`"""))
EDITS.append((
"""    eff:(u,c)=>{ loseHp(G.hero==='yincha'?(u?5:7):(u?4:6));""",
"""    eff:(u,c)=>{ loseHp(G.hero==='yincha'?6:(u?4:6));"""))

# ---- #39 附灵术：每触发 1 个恢复 2/4 生命 ----
EDITS.append((
"""      :G.hero==='yincha'?`立即触发所有召唤单位。每触发 1 个，恢复 2 点生命`""",
"""      :G.hero==='yincha'?`立即触发所有召唤单位。每触发 1 个，恢复 ${u?4:2} 点生命`"""))
EDITS.append((
"""        else if(G.hero==='yincha'){ heal(n*2); log(`附灵术：触发 ${n} 个召唤单位，恢复 ${n*2} 点生命`); }""",
"""        else if(G.hero==='yincha'){ const hh=n*(u?4:2); heal(hh); log(`附灵术：触发 ${n} 个召唤单位，恢复 ${hh} 点生命`); }"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v59_block9d_skill DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
