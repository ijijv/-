# -*- coding: utf-8 -*-
# 两处新 bug 修复（原型.html）：
# ① 易物(换牌)取消后牌消失 —— 仿焚符：eff 传 srcCard，取消时从弃牌堆取回手牌；
# ② 噬魂术卡面预览与四列真实结算错位 —— CARD_DMG.shihun 逐列对齐 eff；
#    另删 previewDamage 里阴差"有血怒所有攻击+1"的陈旧残留（引擎已无全局血怒加伤）；
#    关键词「诅咒」文案仍写着已删除的 +20% 伤害加成，一并改掉。
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# ①-A 易物 eff 传递源卡引用（焚符同款）
EDITS.append((
"""    eff:(u)=>{ startExchangeSelect(1); }},""",
"""    eff:(u,c)=>{ startExchangeSelect(1, c); }},"""))

# ①-B startExchangeSelect 记录 srcCard + 成交计数；新增 cancelExchangeSelect 取消回退
EDITS.append((
"""function startExchangeSelect(times){
  if(!G.hand.length){ floatMsg('没有手牌可交换'); return; }
  G.exchange={ times, phase:'pickHand', handIndex:null, pool:null };
  renderExchange();
}""",
"""function startExchangeSelect(times, srcCard){
  if(!G.hand.length){ floatMsg('没有手牌可交换'); return; }
  G.exchange={ times, phase:'pickHand', handIndex:null, pool:null, card:srcCard||null, done:0 };
  renderExchange();
}
function cancelExchangeSelect(){
  const ex=G.exchange; if(!ex) return;
  // 打出后未成交即放弃：把易物牌从弃牌堆取回手牌（与焚符"放弃"一致），不吞牌
  if(ex.card && ex.done===0){ const di=G.discard.lastIndexOf(ex.card); if(di>=0){ G.discard.splice(di,1); G.hand.push(ex.card); log('放弃【易物】，牌已回手'); } }
  G.exchange=null; hideOverlay(); render();
}"""))

# ①-C 两个取消按钮改走 cancelExchangeSelect
EDITS.append((
"""onclick="G.exchange=null; hideOverlay(); render();">放弃继续交易</button>""",
"""onclick="cancelExchangeSelect()">放弃继续交易</button>"""))
EDITS.append((
"""onclick="G.exchange=null; hideOverlay(); render();">放弃交换</button>""",
"""onclick="cancelExchangeSelect()">放弃交换</button>"""))

# ①-D pickExchangeNew 成交一次后记 done（已成交则后续取消不再回退）
EDITS.append((
"""  removeCardFromPiles(c);
  G.hand.push(c);
  // 易物(#27)：若换出的是特定类型，按英雄给奖""",
"""  removeCardFromPiles(c);
  G.hand.push(c);
  ex.done=(ex.done||0)+1; // 已完成一次交换：此后取消不再把易物回退
  // 易物(#27)：若换出的是特定类型，按英雄给奖"""))

# ②-A CARD_DMG.shihun 逐列对齐 eff（A固定耗尸气/B诅咒+格挡/C固定+血怒/D诅咒）
EDITS.append((
"""  shihun: u=>G.hero==='tianshi'?(curEnemy()?((curEnemy().curse||0)*(u?9:7)):0):(curEnemy()?((curEnemy().curse||0)*(u?8:6)):0),""",
"""  shihun: u=>{ const t=curEnemy(); if(!t) return 0; // 四列：预览须与 eff 逐列一致
    if(G.hero==='ganshiren') return u?18:14; // 赶尸人：耗4尸气固定伤，不吃诅咒
    if(G.hero==='wuseng'){ const extra=((G.blockGainedTurn||0)>7)?(u?7:5):0; return ((t.curse||0)*(u?7:5))+extra; } // 武僧：每层5/7+格挡加成
    if(G.hero==='yincha') return (u?13:10)+2*Math.min(10,rageLayers()); // 阴差：血怒每层+2(至多10层=+20)，打出时消耗
    return (t.curse||0)*(u?9:7); },"""))

# ②-B previewDamage 删除阴差“有血怒所有攻击+1”的陈旧残留（引擎无全局血怒加伤，各牌自行消耗）
EDITS.append((
"""  // 血祭阴差：攻击牌伤害增加血怒层数
  let previewXuenuBonus = 0;
  if(G.hero === 'yincha' && c.type === 'attack' && G.xuenu > 0) {
    previewXuenuBonus = 1; // 预览时显示如果有血怒加成的伤害
    d += previewXuenuBonus;
  }

  return { raw, d, curse:e.curse||0, weak:G.weak>0 && !ignoreWeak, taomu, tongqian, zhusha, turnBuf, dynamic, perTurn, xuenuBonus:previewXuenuBonus };""",
"""  return { raw, d, curse:e.curse||0, weak:G.weak>0 && !ignoreWeak, taomu, tongqian, zhusha, turnBuf, dynamic, perTurn };"""))

# ②-C 手牌标签删除血怒+1（随 ②-B 一同下线）
EDITS.append((
"""      if(pv.weak) tags.push('虚弱');
      if(pv.xuenuBonus && G.hero === 'yincha') tags.push(`血怒+${pv.xuenuBonus}`);
      const cls = pv.d>pv.raw ? 'dmg-buff' : pv.d<pv.raw ? 'dmg-nerf' : 'dmg-plain';""",
"""      if(pv.weak) tags.push('虚弱');
      const cls = pv.d>pv.raw ? 'dmg-buff' : pv.d<pv.raw ? 'dmg-nerf' : 'dmg-plain';"""))

# ②-D 关键词「诅咒」去掉已删除的 +20% 伤害加成文案，改为现行机制
EDITS.append((
"""  ['诅咒','叠加在敌人身上的负面标记，每层使敌人受到的伤害 +20%，每回合末减少 1 层。可被「斩妖剑」「噬魂术」等牌联动。'],""",
"""  ['诅咒','叠加在敌人身上的负面标记（上限 6 层），每回合末自动减少 1 层。诅咒本身不再提升敌人受到的伤害，而是作为层数资源被联动：「斩妖剑」「噬魂术」吞噬引爆换取伤害，「剑符」「天雷正法」等消耗层数强化。'],"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i, n))
        sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH exchange/preview DONE: %d 处替换成功' % len(EDITS))

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
