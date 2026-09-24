# -*- coding: utf-8 -*-
"""v0.61.35 代码批：天师（D 列）卡池重做落码

依据 `四个角色卡池/4/天师版卡池 - 副本.md`（用户 2026-09-24 指定）。
本脚本只动代码；冒烟断言、更新日志、版本号另见 patch_v6135_rest.py。

覆盖：
  1. js/20_data.js  effectiveCost()：新增守一「该牌自身下回合 -1 费」判定
  2. js/30_engine.js CARD_DMG（手牌预伤唯一权威）逐条对齐 eff
  3. js/30_engine.js summonAct()：纸人改为「伤害 + 施咒」，小鬼改为「随机目标 + 带诅咒增伤」
  4. js/30_engine.js previewDamage()：小鬼不再借用「诅咒最高」目标；删掉纸人的旧增伤
  5. js/30_engine.js confirmRetainSelect()：守一改挂 c.costCutTurn
  6. boostCurse 机制整体退役（init / reset / 生产 / 消费 四处）
  7. js/50_ui.js summonHTML()：纸人 / 小鬼 的召唤面板文案

铁律：锚点 count==1、全或无、换行归一。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'js', '20_data.js')
E = os.path.join(ROOT, 'js', '30_engine.js')
U = os.path.join(ROOT, 'js', '50_ui.js')

files = {}
for p in (D, E, U):
    raw = io.open(p, encoding='utf-8').read()
    files[p] = {'nl': '\r\n' if '\r\n' in raw else '\n', 'body': raw.replace('\r\n', '\n')}

errs = []


def rep(path, old, new, tag):
    b = files[path]['body']
    n = b.count(old)
    if n != 1:
        errs.append('[%s] %s：命中 %d 次，期望 1 次' % (os.path.basename(path), tag, n))
        return
    files[path]['body'] = b.replace(old, new, 1)


# ═══════════════ 1. effectiveCost：守一减费（js/20_data.js） ═══════════════
rep(D,
    "  if(c.tempCostCut) cost=Math.max(0, cost-c.tempCostCut); // v0.61.10(P11)：易物换入的牌本回合费用 -1\n",
    "  if(c.tempCostCut) cost=Math.max(0, cost-c.tempCostCut); // v0.61.10(P11)：易物换入的牌本回合费用 -1\n"
    "  // v0.61.35 守一(#26)天师列：保留的【诅咒牌】**只减自己**、且只减下回合那一回合。\n"
    "  // 用 G.turn 做到期判据（不做显式清零）—— G.turn 已随存档读写（40_flow.js:195/237），\n"
    "  // 而且 startTurn() 开头就把本回合标记清了一遍，写在标记里会被自己在生效前擦掉。\n"
    "  if(c.costCutTurn && c.costCutTurn===G.turn) cost=Math.max(0, cost-1);\n",
    '守一减费判定')

# ═══════════════ 2. CARD_DMG 逐条对齐 eff（js/30_engine.js） ═══════════════
rep(E, "    else if(t.curse>0) d+=3;\n", "    else if(t.curse>0) d+=(u?4:3);   // v0.61.35 D：带诅咒加成 +3 → +3/+4\n", 'CARD_DMG.leifu')
rep(E, "  huofu: (u,e)=>{ const t=e||curEnemy(); if(!t) return 0; let d=G.hero==='tianshi'?(u?8:5):(u?7:5);",
       "  huofu: (u,e)=>{ const t=e||curEnemy(); if(!t) return 0; let d=G.hero==='tianshi'?(u?10:6):(u?7:5);   // v0.61.35 D：5/8 → 6/10",
       'CARD_DMG.huofu')
rep(E, "    else if(G.hero==='tianshi'){ d=(u?14:9); if((t.curse||0)>=3) d*=2; }",
       "    else if(G.hero==='tianshi'){ d=(u?15:10); if((t.curse||0)>=3) d*=2; }   // v0.61.35 D：9/14 → 10/15",
       'CARD_DMG.jianfu')
rep(E, "    if(G.hero==='tianshi'){ const boom=Math.min(2,t.curse||0); return base+boom*(u?7:5); } // D 引爆≤2层诅咒",
       "    if(G.hero==='tianshi'){ const boom=Math.min(2,t.curse||0); return (u?12:10)+boom*(u?7:5); } // v0.61.35 D 主伤 8/12 → 10/12（引爆每层 5/7 不变；base 与 A/B 共用，故 D 另起）",
       'CARD_DMG.zhanyaojian')
rep(E, "    if(G.hero==='tianshi') return u?30:20; // D 诅咒仅作费用减免，不改伤害",
       "    if(G.hero==='tianshi') return u?32:22; // v0.61.35 D：20/30 → 22/32（诅咒仍只减费，不改伤害）",
       'CARD_DMG.tianlei')
rep(E, "  wanjian: u=>G.hero==='wuseng'?(u?14:9):(G.hero==='tianshi'?(u?16:14):(u?15:10)),",
       "  wanjian: u=>G.hero==='wuseng'?(u?14:9):(G.hero==='tianshi'?(u?18:14):(u?15:10)),   // v0.61.35 D：14/16 → 14/18",
       'CARD_DMG.wanjian')
rep(E, "    if(G.hero==='tianshi') return (u?20:15)+(t.curse||0)*(u?6:5); // D 引爆全部诅咒",
       "    if(G.hero==='tianshi') return 16+(t.curse||0)*(u?4:3); // v0.61.35 D：主伤固定 16（升级不变）+ 每层 3/4（原 15/20 + 5/6）",
       'CARD_DMG.zhongkui')
rep(E, "    if(G.hero==='tianshi') return t?((u?6:5)+Math.min(u?6:4,t.curse||0)):0;         // D 直伤",
       "    if(G.hero==='tianshi') return t?((u?9:6)+Math.min(u?6:4,t.curse||0)):0;         // v0.61.35 D：5/6 → 6/9",
       'CARD_DMG.qungui')
rep(E, "    const t=e||curEnemy(); return t?7+(u?2:1)*(t.curse||0):0; }, // D 每目标按自身诅咒独立",
       "    const t=e||curEnemy(); return t?8+(u?2:1)*(t.curse||0):0; }, // v0.61.35 D 全体主伤 7 → 8（每层 +1/+2 不变）",
       'CARD_DMG.baigui')
rep(E, "  shihunzhou: u=>G.hero==='ganshiren'?(u?6:3):(G.hero==='tianshi'?(u?6:3):(G.hero==='yincha'?(u?8:5):(u?7:5))),",
       "  shihunzhou: u=>G.hero==='ganshiren'?(u?6:3):(G.hero==='tianshi'?(u?8:3):(G.hero==='yincha'?(u?8:5):(u?7:5))), // v0.61.35 D：3/6 → 3/8（其余三列不动）",
       'CARD_DMG.shihunzhou')
rep(E, "  xiaogui: u=>{ const v=G.hero==='tianshi'?(u?4:3):(G.hero==='ganshiren'?(u?4:2):(G.hero==='yincha'?(u?2:1):(u?3:2)));",
       "  xiaogui: u=>{ const v=G.hero==='tianshi'?(u?3:2):(G.hero==='ganshiren'?(u?4:2):(G.hero==='yincha'?(u?2:1):(u?3:2)));   // v0.61.35 D：3/4 → 2/3（带诅咒 +2/3 是随机目标的偶发项，不进预览）",
       'CARD_DMG.xiaogui')
rep(E, "    const base = G.hero==='wuseng'?(u?15:10):(G.hero==='tianshi'?(u?14:10):(u?16:10));",
       "    const base = G.hero==='wuseng'?(u?15:10):(G.hero==='tianshi'?(u?15:10):(u?16:10));   // v0.61.35 D：10/14 → 10/15",
       'CARD_DMG.zhenyaoling')

# ═══════════════ 3. previewDamage：指向与旧增伤（js/30_engine.js） ═══════════════
rep(E,
    "  // 召唤牌目标：小鬼/阴兵打「诅咒层数最高」的敌人，纸人打随机敌人（预览用当前选中目标作参照）\n"
    "  let e = targetEnemy || curEnemy();\n"
    "  if(perTurn && (c.id==='xiaogui' || c.id==='yinbingguo')) e = mostCursedEnemy() || e;\n",
    "  // 召唤牌目标：阴兵打「诅咒层数最高」的敌人（预览用当前选中目标作参照）\n"
    "  // v0.61.35 天师：小鬼的目标已从「诅咒最高」改为「随机」，故不再借用 mostCursedEnemy 当参照\n"
    "  let e = targetEnemy || curEnemy();\n"
    "  if(perTurn && c.id==='yinbingguo') e = mostCursedEnemy() || e;\n",
    'previewDamage 小鬼目标参照')
rep(E,
    "  if(G.hero==='tianshi' && c.id==='zhiren' && (e.curse||0)>0) d += (c.up?3:2); // 纸人（天师）：目标带诅咒 +2/+3\n",
    "",
    'previewDamage 纸人旧增伤')

# ═══════════════ 4. summonAct：纸人 / 小鬼（js/30_engine.js） ═══════════════
rep(E,
    "    if(G.hero==='tianshi'){\n"
    "      // 天师：#41D 对随机敌人造成伤害，该敌人每有 1 层诅咒纸人伤害 +1\n"
    "      const t=randomAlive();\n"
    "      if(t){ const zb=(t.curse||0)>0?(s.up?3:2):0; dealDamageTo(t, v + zb); if(zb>0) log(`纸人：目标带【诅咒】，伤害 +${zb}`); }\n"
    "    } else if(G.hero==='ganshiren'){\n"
    "      // 赶尸人 #41A：每回合末造成伤害（不叠诅咒）\n"
    "      const t=randomAlive(); if(t) dealDamageTo(t, v);\n"
    "    } else if(G.hero==='wuseng'){\n"
    "      // 武僧 #41B：只造成伤害，不再附带诅咒\n"
    "      const t=randomAlive(); if(t) dealDamageTo(t, v);\n"
    "    } else {\n",
    "    if(G.hero==='tianshi'){\n"
    "      // v0.61.35 天师 #41D：每回合末对随机敌人造成伤害 **并施加 1/2 层【诅咒】**\n"
    "      // （去掉旧「该敌带诅咒则 +2/3 伤害」；这是全牌池里唯一「无条件可施咒」的召唤物，故计入 isCanCurse）\n"
    "      const t=randomAlive();\n"
    "      if(t){ dealDamageTo(t, v); applyCurse(t, s.up?2:1); }\n"
    "    } else if(G.hero==='ganshiren'){\n"
    "      // 赶尸人 #41A：每回合末造成伤害（不叠诅咒）\n"
    "      const t=randomAlive(); if(t) dealDamageTo(t, v);\n"
    "    } else if(G.hero==='wuseng'){\n"
    "      // 武僧 #41B：只造成伤害，不再附带诅咒\n"
    "      const t=randomAlive(); if(t) dealDamageTo(t, v);\n"
    "    } else {\n",
    'summonAct 纸人·天师')
rep(E,
    "  else if(s.type==='xiaogui'){\n"
    "    // #43：天师打诅咒最高敌人，其余打随机敌人\n"
    "    const t = G.hero==='tianshi' ? (mostCursedEnemy()||randomAlive()) : randomAlive();\n"
    "    if(t) dealDamageTo(t, v);\n"
    "    if(G.hero==='yincha'){ gainRage(1); log('小鬼：获得 1 层【血怒】'); }\n"
    "  }\n",
    "  else if(s.type==='xiaogui'){\n"
    "    // v0.61.35 天师 #43D：目标由「诅咒最高」改为**随机**；命中带【诅咒】的目标则本击 +2/3\n"
    "    const t = randomAlive();\n"
    "    if(t){\n"
    "      const zb=(G.hero==='tianshi' && (t.curse||0)>0)?(s.up?3:2):0;\n"
    "      dealDamageTo(t, v + zb);\n"
    "      if(zb>0) log(`小鬼：目标带【诅咒】，伤害 +${zb}`);\n"
    "    }\n"
    "    if(G.hero==='yincha'){ gainRage(1); log('小鬼：获得 1 层【血怒】'); }\n"
    "  }\n",
    'summonAct 小鬼·天师')

# ═══════════════ 5. 守一：挂 costCutTurn（js/30_engine.js） ═══════════════
rep(E,
    "    else if(G.hero==='tianshi'){ if(isCanCurse(c)) c.curseBoostLayer=1; }\n",
    "    // v0.61.35 守一(#26)天师列：保留到【诅咒牌】→ 该牌**自身**下回合费用 -1（仅一回合）\n"
    "    // 落成 G.turn+1 的时间戳（而不是布尔标记），到期自然失效，不必在任何地方清\n"
    "    else if(G.hero==='tianshi'){ if(isCanCurse(c)){ c.costCutTurn=G.turn+1; log(`守一：保留【${c.name}】，下回合其费用 -1`); } }\n",
    'confirmRetainSelect 守一')

# ═══════════════ 6. boostCurse 退役（js/30_engine.js） ═══════════════
rep(E,
    "    retainHeal:0, pendingBlockStart:0, boostCurse:0, xisuiTurns:0, bleedSummonsBonus:1,\n",
    "    retainHeal:0, pendingBlockStart:0, xisuiTurns:0, bleedSummonsBonus:1,\n",
    'boostCurse 初值移除')
rep(E,
    "  // 守一(天师)强化：本张被强化的可施咒牌额外 +1 层（仅持续一次施加）\n"
    "  if((G.boostCurse||0)>0){ v+=1; G.boostCurse--; log('守一强化：本次诅咒额外 +1 层'); }\n",
    "  // v0.61.35：守一改「减免该牌自身费用」后，旧的「本次施咒 +1 层」不再有生产者，整段退役\n",
    'boostCurse 消费点移除')
rep(E,
    "  G.boostCurse=0; G.junkPlayedThisTurn=0; G.ranhunType=null; G.ranhunSelf=null; G.ranhunHeal=0; G.shouyiUp=false;\n",
    "  G.junkPlayedThisTurn=0; G.ranhunType=null; G.ranhunSelf=null; G.ranhunHeal=0; G.shouyiUp=false;\n",
    'boostCurse 回合重置移除')
rep(E,
    "  if(G.hero==='tianshi' && c.curseBoostLayer){ G.boostCurse=(G.boostCurse||0)+1; c.curseBoostLayer=0; log('守一强化：此牌本次施加的诅咒额外 +1 层'); }\n",
    "  // v0.61.35 守一：减费标记用掉即清（同一回合被换回手里再打出不会二次减免）\n"
    "  if(c.costCutTurn){ c.costCutTurn=0; log('守一：此牌的费用减免已生效'); }\n",
    'boostCurse 生产点移除')

# ═══════════════ 7. 召唤面板文案（js/50_ui.js） ═══════════════
rep(U,
    "      :`纸人：每回合末对随机敌人造成 ${v} 点伤害；目标带【诅咒】再 +${s.up?3:2}`)\n"
    "    : s.type==='xiaogui'?(G.hero==='yincha'?`小鬼：每回合末造成 ${v} 点伤害并 +1【血怒】；死亡时恢复 ${s.up?4:2} 点生命`:`小鬼：每回合末对随机敌人造成 ${v} 点伤害`)\n",
    "      :`纸人：每回合末对随机敌人造成 ${v} 点伤害并施加 ${s.up?2:1} 层【诅咒】`)\n"
    "    : s.type==='xiaogui'?(G.hero==='yincha'?`小鬼：每回合末造成 ${v} 点伤害并 +1【血怒】；死亡时恢复 ${s.up?4:2} 点生命`\n"
    "      :G.hero==='tianshi'?`小鬼：每回合末对随机敌人造成 ${v} 点伤害；若该敌带【诅咒】再 +${s.up?3:2}`\n"
    "      :`小鬼：每回合末对随机敌人造成 ${v} 点伤害`)\n",
    'summonHTML 纸人/小鬼文案')

# ═══════════════ 8. 版本号 3 处 → v0.61.35 ═══════════════
HTML = os.path.join(ROOT, '原型.html')
BOOT = os.path.join(ROOT, 'js', '60_boot.js')
for p in (HTML, BOOT):
    raw = io.open(p, encoding='utf-8').read()
    files[p] = {'nl': '\r\n' if '\r\n' in raw else '\n', 'body': raw.replace('\r\n', '\n')}
rep(HTML, "<title>志怪塔 · 原型 v0.61.34</title>", "<title>志怪塔 · 原型 v0.61.35</title>", '版本 title')
rep(HTML, "玩法原型 v0.61.34</small>", "玩法原型 v0.61.35</small>", '版本 h1')
rep(BOOT, "志 怪 塔 · v0.61.34</h2>", "志 怪 塔 · v0.61.35</h2>", '版本 overlay')

# ═══════════════ 落盘 ═══════════════
if errs:
    print('=== 锚点校验失败，未写入任何文件 ===')
    for e in errs:
        print(' ✗', e)
    sys.exit(1)

for p, d in files.items():
    io.open(p, 'w', encoding='utf-8', newline='').write(d['body'].replace('\n', d['nl']))
    print('OK %-14s %d 字符' % (os.path.basename(p), len(d['body'])))
print('全部 %d 处锚点已落地' % 22)