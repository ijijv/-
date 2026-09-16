# -*- coding: utf-8 -*-
# v0.59 Block9f：CARD_DMG 的 C 列镜像 + 阴差「随血怒/失血浮动」徽章常显
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# ---- ① 徽章常显名单（与 DYNAMIC_DMG 并列） ----
EDITS.append((
"""const WUSENG_NO_CURSE_TAG = ['leifu','huofu','jianfu','shixue','baigui','zhenyaoling']; // 这些牌不吃【诅咒】，徽章不挂诅咒标签""",
"""const WUSENG_NO_CURSE_TAG = ['leifu','huofu','jianfu','shixue','baigui','zhenyaoling']; // 这些牌不吃【诅咒】，徽章不挂诅咒标签
// 阴差：伤害随【血怒】/本场失血/本回合失血/召唤数/目标状态浮动的牌 —— 卡面正文只写基础值，徽章恒定显示实时预伤害
const YINCHA_DYN_DMG = ['leifu','jianfu','tianlei','shihun','shixue','baigui','zhenyaoling','zhanyaojian','taomufu','zhongkui'];"""))

# ---- ② CARD_DMG 逐条镜像 C 列新数值 ----
EDITS.append((
"""  leifu: u=>{ const t=curEnemy(); if(!t) return 0; let d=(G.hero==='tianshi'?(u?9:6):G.hero==='yincha'?(u?7:5):(u?6:4));""",
"""  leifu: u=>{ const t=curEnemy(); if(!t) return 0; let d=(G.hero==='tianshi'?(u?9:6):G.hero==='yincha'?(u?8:5):(u?6:4));"""))
EDITS.append((
"""    if(G.hero==='yincha') d=u?9:7; // C 固定 9/7（本回合有格挡也不加），与 eff 一致""",
"""    if(G.hero==='yincha') d=u?11:8; // C 固定 11/8（本回合有格挡也不加），与 eff 一致"""))
EDITS.append((
"""    else if(G.hero==='yincha') d=(u?14:10)+(G.hpLostTurn||0);
    else if(G.hero==='tianshi'){ d=(u?14:9); if((t.curse||0)>=3) d*=2; }""",
"""    else if(G.hero==='yincha') d=10+(G.hpLostTurn||0)*(u?2:1); // C 固定 10，本回合每失 1 血 +1/+2
    else if(G.hero==='tianshi'){ d=(u?14:9); if((t.curse||0)>=3) d*=2; }"""))
EDITS.append((
"""    if(G.hero==='ganshiren') return base+2*G.summons.filter(s=>s.dur>0).length;
    return (t.curse>0)?base+6:base; }, // B/C：目标带诅咒 +6""",
"""    if(G.hero==='ganshiren') return base+2*G.summons.filter(s=>s.dur>0).length;
    if(G.hero==='yincha') return (u?14:9)+((t.curse||0)>0?(u?6:4):0); // C：9/14 且带诅咒额外 4/6
    return (t.curse>0)?base+6:base; }, // B：目标带诅咒 +6"""))
EDITS.append((
"""    if(G.hero==='yincha') return (u?20:16)+Math.min(20,G.totalHpLost||0); // 近似：未含本牌自扣的5血""",
"""    if(G.hero==='yincha') return (u?21:16)+Math.min(20,(G.totalHpLost||0)*(u?2:1)); // 近似：未含本牌自扣的5血"""))
EDITS.append((
"""    let d=u?22:16; if(G.hero==='yincha' && G.hp<G.maxHp*0.3) d*=2; // C 残血翻倍
    return d; },""",
"""    let d=u?22:16; if(G.hero==='yincha' && G.hp<G.maxHp*0.4) d*=2; // C 残血（<40%）翻倍
    return d; },"""))
EDITS.append((
"""    if(G.hero==='yincha') return (u?13:10)+2*Math.min(10,rageLayers()); // 阴差：血怒每层+2(至多10层=+20)，打出时消耗""",
"""    if(G.hero==='yincha') return (u?15:10)+2*Math.min(10,rageLayers()); // 阴差：血怒每层+2(至多10层=+20)，打出时消耗"""))
EDITS.append((
"""  taomufu: u=>{ const t=curEnemy(); if(!t) return 0; let d=G.hero==='tianshi'?(u?8:6):G.hero==='ganshiren'?(u?7:5):(u?6:4);""",
"""  taomufu: u=>{ const t=curEnemy(); if(!t) return 0; let d=G.hero==='tianshi'?(u?8:6):G.hero==='ganshiren'?(u?7:5):(G.hero==='yincha'?(u?7:4):(u?6:4));"""))
EDITS.append((
"""    else if(G.hero==='yincha') d=(u?6:4)+Math.min(u?20:15,Math.floor((G.totalHpLost||0)/3));""",
"""    else if(G.hero==='yincha') d=(u?6:4)+Math.min(u?20:15,Math.floor((G.totalHpLost||0)/(u?3:4)));"""))
EDITS.append((
"""  shihunzhou: u=>G.hero==='ganshiren'?(u?6:3):(G.hero==='tianshi'?(u?6:4):(u?7:5)),""",
"""  shihunzhou: u=>G.hero==='ganshiren'?(u?6:3):(G.hero==='tianshi'?(u?6:4):(G.hero==='yincha'?(u?8:5):(u?7:5))),"""))
EDITS.append((
"""  zhiren: u=>{ const base = G.hero==='ganshiren' ? (hasShiqi(4)?(u?7:5):(u?4:2)) : (G.hero==='wuseng'?(u?3:2):(u?2:1));""",
"""  zhiren: u=>{ const base = G.hero==='ganshiren' ? (hasShiqi(4)?(u?7:5):(u?4:2)) : (G.hero==='wuseng'?(u?3:2):(G.hero==='yincha'?(rageLayers()>=4?(u?5:4):(u?2:1)):(u?2:1)));"""))
EDITS.append((
"""  xiaogui: u=>{ const v=G.hero==='tianshi'?(u?4:3):(G.hero==='ganshiren'?(u?4:2):(u?3:2));""",
"""  xiaogui: u=>{ const v=G.hero==='tianshi'?(u?4:3):(G.hero==='ganshiren'?(u?4:2):(G.hero==='yincha'?(u?2:1):(u?3:2)));"""))

# ---- ③ previewDamage：C 列无伤害牌的徽章隐藏 + 阴差浮动伤害徽章常显 ----
EDITS.append((
"""  if(c.id==='zhouyu' && G.hero==='wuseng') return null; // B 咒雨是「格挡转化」，本身无伤害""",
"""  if(c.id==='zhouyu' && (G.hero==='wuseng'||G.hero==='yincha')) return null; // B 咒雨是「格挡转化」、C 咒雨只施加诅咒，本身无伤害
  if(c.id==='qungui' && G.hero==='yincha') return null; // C 群鬼乱舞是召唤增伤 buff，本身无直伤（数值看召唤面板）"""))
EDITS.append((
"""  const wbDmg = G.hero==='wuseng' && WUSENG_BLOCK_DMG.indexOf(c.id)>=0;""",
"""  const wbDmg = G.hero==='wuseng' && WUSENG_BLOCK_DMG.indexOf(c.id)>=0;
  const ycDmg = G.hero==='yincha' && YINCHA_DYN_DMG.indexOf(c.id)>=0; // 阴差流血/血怒浮动牌：徽章常显"""))
EDITS.append((
"""  return { raw, d, curse:curseTag, weak:G.weak>0 && !ignoreWeak, taomu, tongqian, zhusha, turnBuf, dynamic: dynamic || wbDmg, perTurn };""",
"""  return { raw, d, curse:curseTag, weak:G.weak>0 && !ignoreWeak, taomu, tongqian, zhusha, turnBuf, dynamic: dynamic || wbDmg || ycDmg, perTurn };"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v59_block9f_dmg DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
