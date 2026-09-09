# -*- coding: utf-8 -*-
# 四列重做残留清理（原型.html，Task#14-16）：
# ① CARD_DMG 整表为重做前旧值 → 逐行镜像 eff 逐列"当前状态"同式（预览与真实结算对齐）；
# ② 雷符 D 列 eff 基数 u?6:4 与卡面/设计表(6/9)不符 → 修为 tianshi 基数；
# ③ 死代码清理：bloodCost（无调用）、energyBonusTurns（无 setter，被 xisuiTurns 取代）、
#    G.kaitianyanTianshi 两处读取（开天眼已改 turnAtkBuff，此标志永不被赋值）；
# ④ 洗髓经顶部徽章改读 xisuiTurns（原来读死字段 → 洗髓经生效时从不显示）；
# ⑤ KEYWORDS「召唤」时长"持续3回合"与纸人/小鬼(2)不符 → 收敛措辞。
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# ① CARD_DMG 整表重写（镜像 eff；A赶尸人/B武僧/C阴差/D天师）
OLD_DMG = """const CARD_DMG = {
  leifu: u=>G.hero==='tianshi'?((curEnemy()&&curEnemy().curse>0)?(u?9:6)+3:(u?9:6)):(u?9:6),
  huofu: u=>G.hero==='tianshi'?(u?10:7):(u?10:8),
  jianfu: u=>G.hero==='tianshi'?((curEnemy()&&curEnemy().curse>=3)?(u?14:9)*2:(u?14:9)):(u?19:13),
  zhanyaojian: u=>G.hero==='tianshi'?(u?12:8):(((curEnemy()&&curEnemy().curse>0))?(u?24:18):(u?14:10)),
  tianlei: u=>G.hero==='tianshi'?(u?26:20):(u?33:26),
  wanjian: u=>G.hero==='tianshi'?(u?20:14):(u?20:15),
  zhongkui: u=>G.hero==='tianshi'?(u?30:22):(u?29:20),
  tiebushan: u=>G.block,
  shihun: u=>{ const t=curEnemy(); if(!t) return 0; // 四列：预览须与 eff 逐列一致
    if(G.hero==='ganshiren') return u?18:14; // 赶尸人：耗4尸气固定伤，不吃诅咒
    if(G.hero==='wuseng'){ const extra=((G.blockGainedTurn||0)>7)?(u?7:5):0; return ((t.curse||0)*(u?7:5))+extra; } // 武僧：每层5/7+格挡加成
    if(G.hero==='yincha') return (u?13:10)+2*Math.min(10,rageLayers()); // 阴差：血怒每层+2(至多10层=+20)，打出时消耗
    return (t.curse||0)*(u?9:7); },
  qungui: u=>G.hero==='tianshi'?(u?8:6):(G.summons.length*(u?7:5)),
  taomufu: u=>{ const t=curEnemy(); const b=(t&&(t.kind==='ghost'||t.kind==='jiangshi'))?(G.hero==='tianshi'?4:3):0; return (G.hero==='tianshi'?(u?8:6):(u?7:5))+b; },
  shixue: u=>G.hero==='tianshi'?(curEnemy()?(u?8:6)+Math.min(10, curEnemy().curse||0):(u?8:6)):((u?8:6)+Math.min(u?20:15, Math.floor((G.totalHpLost||0)/3))),
  baigui: u=>G.hero==='tianshi'?(u?7:5+(curEnemy()?.curse||0)):(u?9:7)+G.summons.length*2,
  shihunzhou: u=>G.hero==='tianshi'?(u?10:7):(u?9:6),
  zhiren: u=>(u?3:2),
  xiaogui: u=>(u?4:3),
  yinbingguo: u=>(u?3:2)*(u?5:4)
};"""

NEW_DMG = """const CARD_DMG = {
  /* 手牌伤害预览 = eff 逐列"当前状态"同式抄写。重做前旧值已整体废弃，勿再单独补行。
     仅镜像结算数值，不吃副作用、不实际扣资源；四列顺序：A赶尸人/B武僧/C阴差/D天师。 */
  leifu: u=>{ const t=curEnemy(); if(!t) return 0; let d=(G.hero==='tianshi'?(u?9:6):G.hero==='yincha'?(u?7:5):(u?6:4));
    if(G.hero==='ganshiren') d+=G.summons.filter(s=>s.dur>0).length;
    else if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/3));
    else if(G.hero==='yincha') d+=2*Math.min(3,rageLayers()); // eff: 2×rageSpend(2,6) 至多 +6
    else if(t.curse>0) d+=3;
    return d; },
  huofu: u=>{ const t=curEnemy(); if(!t) return 0; let d=u?7:5;
    if(G.hero==='wuseng') d+=Math.min(6,Math.floor((G.block||0)/3));
    if(G.hero==='yincha') d=u?9:7; // C 固定 9/7（本回合有格挡也不加），与 eff 一致
    return d; },
  jianfu: u=>{ const t=curEnemy(); if(!t) return 0; let d;
    if(G.hero==='wuseng') d=(u?10:6)+Math.floor(G.block/2); // 耗全部格挡，每2格挡+1
    else if(G.hero==='yincha') d=(u?14:10)+(G.hpLostTurn||0);
    else if(G.hero==='tianshi'){ d=(u?14:9); if((t.curse||0)>=3) d*=2; }
    else { d=(u?12:8); if(hasShiqi(2)) d*=2; }
    return d; },
  zhanyaojian: u=>{ const t=curEnemy(); if(!t) return 0; const base=u?12:8;
    if(G.hero==='tianshi'){ const boom=Math.min(2,t.curse||0); return base+boom*(u?7:5); } // D 引爆≤2层诅咒
    if(G.hero==='ganshiren') return base+2*G.summons.filter(s=>s.dur>0).length;
    return (t.curse>0)?base+6:base; }, // B/C：目标带诅咒 +6
  tianlei: u=>{ if(!curEnemy()) return 0;
    if(G.hero==='wuseng') return (u?18:14)+Math.min(16,G.blockGainedTurn||0);
    if(G.hero==='yincha') return (u?20:16)+Math.min(20,G.totalHpLost||0); // 近似：未含本牌自扣的5血
    if(G.hero==='tianshi') return u?26:20; // D 诅咒仅作费用减免，不改伤害
    return u?24:18; },
  wanjian: u=>G.hero==='wuseng'?((u?14:10)+Math.min(12,G.block||0)):(G.hero==='tianshi'?(u?20:14):(u?14:10)),
  zhongkui: u=>{ const t=curEnemy(); if(!t) return 0;
    if(G.hero==='tianshi') return (u?24:16)+(t.curse||0)*(u?7:5); // D 引爆全部诅咒
    let d=u?22:16; if(G.hero==='yincha' && G.hp<G.maxHp*0.3) d*=2; // C 残血翻倍
    return d; },
  tiebushan: u=>{ let d=G.block||0;
    if(G.hero==='ganshiren') d+=Math.floor((G.尸气||0)/2);
    else if(G.hero==='tianshi'){ const t=curEnemy(); if(t) d+=(t.curse||0); }
    return d; },
  shihun: u=>{ const t=curEnemy(); if(!t) return 0; // 四列：预览须与 eff 逐列一致
    if(G.hero==='ganshiren') return u?18:14; // 赶尸人：耗4尸气固定伤，不吃诅咒
    if(G.hero==='wuseng'){ const extra=((G.blockGainedTurn||0)>7)?(u?7:5):0; return ((t.curse||0)*(u?7:5))+extra; } // 武僧：每层5/7+格挡加成
    if(G.hero==='yincha') return (u?13:10)+2*Math.min(10,rageLayers()); // 阴差：血怒每层+2(至多10层=+20)，打出时消耗
    return (t.curse||0)*(u?9:7); },
  qungui: u=>{ const t=curEnemy();
    if(G.hero==='wuseng') return t?4+G.summons.filter(s=>s.dur>0).length*(u?2:1):0; // B 直伤
    if(G.hero==='tianshi') return t?((u?8:6)+Math.min(8,t.curse||0)):0;              // D 直伤
    if(G.hero==='yincha') return 0; // C 无直接伤害（增伤buff），数值以召唤面板为准
    // A：数值=全场召唤"立即作用一次"的总伤害（近似总伤），无召唤时 0→显示"无召唤"
    return G.summons.filter(s=>s.dur>0).reduce((a,s)=>a+s.v+(s.type!=='shi_wang'&&isSummon('shi_wang')?1:0),0); },
  taomufu: u=>{ const t=curEnemy(); if(!t) return 0; let d=G.hero==='tianshi'?(u?8:6):G.hero==='ganshiren'?(u?7:5):(u?6:4);
    if(t.kind==='ghost'||t.kind==='jiangshi') d+=(u?6:4);
    if(G.hero==='wuseng' && (G.blockGainedTurn||0)>0) d+=2;
    else if(G.hero==='yincha' && t.hp<t.maxHp*0.5) d+=2;
    return d; },
  shixue: u=>{ const t=curEnemy(); if(!t) return 0; let d;
    if(G.hero==='ganshiren') d=(u?7:5)+Math.min(5,Math.floor((G.尸气||0)/2));
    else if(G.hero==='wuseng') d=(u?6:4)+Math.min(5,Math.floor((G.block||0)/3));
    else if(G.hero==='yincha') d=(u?6:4)+Math.min(u?20:15,Math.floor((G.totalHpLost||0)/3));
    else d=(u?8:6)+Math.min(6,t.curse||0);
    return d; },
  baigui: u=>{ const n=G.summons.filter(s=>s.dur>0).length;
    if(G.hero==='ganshiren') return (u?6:4)+n*(u?3:2);
    if(G.hero==='wuseng') return (u?6:4)+Math.min(u?12:10,Math.floor((G.block||0)/(u?2:3)));
    if(G.hero==='yincha') return (u?7:5)+n*(u?3:2);
    const t=curEnemy(); return t?4+(u?2:1)*(t.curse||0):0; }, // D 每目标按自身诅咒独立
  shihunzhou: u=>G.hero==='tianshi'?(u?6:4):(u?7:5),
  zhiren: u=>{ const bleed=(G.bleedSummons)?Math.floor((G.hpLostTurn||0)/2):0;
    return (u?2:1)+(isSummon('shi_wang')?1:0)+bleed; }, // 每回合末 v（+尸王在场 / +阴差群鬼流血）
  xiaogui: u=>{ const v=G.hero==='tianshi'?(u?4:3):(u?3:2);
    const bleed=(G.bleedSummons)?Math.floor((G.hpLostTurn||0)/2):0;
    return v+(isSummon('shi_wang')?1:0)+bleed; },
  yinbingguo: u=>{ const bleed=(G.bleedSummons)?Math.floor((G.hpLostTurn||0)/2):0;
    return (u?5:4)+(isSummon('shi_wang')?1:0)+bleed; } // 每只阴兵 v
};"""
EDITS.append((OLD_DMG, NEW_DMG))

# ② 雷符 D 基数 4/6→6/9（对齐卡面与设计表）
EDITS.append((
"""    eff:(u)=>{ const t=curEnemy(); if(!t) return; let d=(G.hero==='yincha'?(u?7:5):(u?6:4));""",
"""    eff:(u)=>{ const t=curEnemy(); if(!t) return; let d=(G.hero==='tianshi'?(u?9:6):G.hero==='yincha'?(u?7:5):(u?6:4));"""))

# ③-A 删除真实结算里永不被赋值的开天眼残留（真实伤害 L1634）
EDITS.append((
"""  let d=n+(G.attackBuff||0)+(G.turnAtkBuff||0);
  if(G.kaitianyanTianshi && e.curse>0) d += 2; // 开天眼（天师）：目标带诅咒额外 +2
  if((e.kind==='ghost'||e.kind==='jiangshi') && hasRelic('taomujian')) d=Math.floor(d*1.25);""",
"""  let d=n+(G.attackBuff||0)+(G.turnAtkBuff||0);
  if((e.kind==='ghost'||e.kind==='jiangshi') && hasRelic('taomujian')) d=Math.floor(d*1.25);"""))

# ③-B 预览层同一残留（L1733）
EDITS.append((
"""  const turnBuf = c.type==='attack' && G.turnAtkBuff>0;
  if(turnBuf) d += G.turnAtkBuff;
  if(G.kaitianyanTianshi && e.curse>0) d += 2; // 开天眼（天师）：目标带诅咒额外 +2
  const taomu = (e.kind==='ghost'||e.kind==='jiangshi') && hasRelic('taomujian');""",
"""  const turnBuf = c.type==='attack' && G.turnAtkBuff>0;
  if(turnBuf) d += G.turnAtkBuff;
  const taomu = (e.kind==='ghost'||e.kind==='jiangshi') && hasRelic('taomujian');"""))

# ③-C 死函数 bloodCost 删除（无任何调用，阴差自伤已不做减半）
EDITS.append((
"""];
function bloodCost(n){ return G.hero==='yincha' ? Math.max(1, Math.floor(n/2)) : n; }
function loseHp(n){""",
"""];
function loseHp(n){"""))

# ③-D energyBonusTurns 死字段移除（无 setter，已被 xisuiTurns 取代）
EDITS.append((
"""    energyBonusTurns:0, pendingEnergy:0, pendingDiscard:0, summons:[], enemies:[], target:0, mapRow:0, mapCol:-1, rewardPicks:[],""",
"""    pendingEnergy:0, pendingDiscard:0, summons:[], enemies:[], target:0, mapRow:0, mapCol:-1, rewardPicks:[],"""))
EDITS.append((
"""G.energyBonusTurns=0; G.pendingEnergy=0; G.pendingDiscard=0; G.summons=[];""",
"""G.pendingEnergy=0; G.pendingDiscard=0; G.summons=[];"""))
EDITS.append((
"""  if(G.energyBonusTurns>0){ G.energy+=1; G.energyBonusTurns--; }
  G.pendingEnergy=0;""",
"""  G.pendingEnergy=0;"""))
EDITS.append((
"""energyBonusTurns:G.energyBonusTurns||0, pendingEnergy:G.pendingEnergy||0, pendingDiscard:G.pendingDiscard||0,""",
"""pendingEnergy:G.pendingEnergy||0, pendingDiscard:G.pendingDiscard||0,"""))
EDITS.append((
"""  G.energyBonusTurns=d.energyBonusTurns||0; G.pendingEnergy=d.pendingEnergy||0; G.pendingDiscard=d.pendingDiscard||0;""",
"""  G.pendingEnergy=d.pendingEnergy||0; G.pendingDiscard=d.pendingDiscard||0;"""))

# ④ 洗髓经顶部徽章：死字段→xisuiTurns（否则洗髓经生效时从不显示）
EDITS.append((
"""  if(G.energyBonusTurns>0) s+=`<span class="badge" style="color:#7fb0d8" data-tip="kw:洗髓经">🔮洗髓经 ${G.energyBonusTurns}回合</span>`;""",
"""  if((G.xisuiTurns||0)>0) s+=`<span class="badge" style="color:#7fb0d8" data-tip="kw:洗髓经">🔮洗髓经 ${G.xisuiTurns}回合</span>`;"""))

# ⑤ KEYWORDS「召唤」时长措辞（纸人/小鬼实为 2 回合，非一律 3）
EDITS.append((
"""  ['召唤','场上的友方单位，每回合末自动触发效果（纸人/小鬼/阴兵打伤害、五通神加格挡），持续 3 回合后消失。'],""",
"""  ['召唤','场上的友方单位，每回合末自动触发效果（纸人/小鬼/阴兵打伤害、五通神加格挡）。各牌持续时间不同，结束后消失。'],"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i, n))
        sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH card_dmg_cleanup DONE: %d 处替换成功' % len(EDITS))

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
