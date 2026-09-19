# -*- coding: utf-8 -*-
# v0.61 批1·引擎层：B1 死亡口径 / B2 死亡先于胜利 / B3 镇妖铃插值 /
#                    B4 battleOver 重入守卫 / B5 rewardTier 泄漏 / B6 pity 初值 /
#                    B9 生死簿截断 / B10 清算注释
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# —— B3：镇妖铃 A 列日志单引号 → 反引号（原来 ${} 不插值）——
EDITS.append((
"""      if(G.hero==='ganshiren'){ sealEnemy(t,1); dealDamageTo(t,u?16:10); gainShiqi(3); log('镇妖铃：造成 ${u?16:10} 伤害并获得 3 点【尸气】'); return; }""",
"""      if(G.hero==='ganshiren'){ sealEnemy(t,1); dealDamageTo(t,u?16:10); gainShiqi(3); log(`镇妖铃：造成 ${u?16:10} 伤害并获得 3 点【尸气】`); return; }  // v0.61 B3：单引号→反引号，日志正常插值"""))

# —— B1：loseHp 末尾统一死亡判定（扣到 ≤0 立即判负并钳 0；loseGame 自带幂等）——
EDITS.append((
"""  if(G.xuejiArmed) G.xuejiHurt=true;
  if(G.bloodPact){
    gainBlock(c*G.bloodPact);
    log(`血契：以 ${c} 点生命换取 ${c*G.bloodPact} 点格挡`);
  }
}""",
"""  if(G.xuejiArmed) G.xuejiHurt=true;
  if(G.bloodPact){
    gainBlock(c*G.bloodPact);
    log(`血契：以 ${c} 点生命换取 ${c*G.bloodPact} 点格挡`);
  }
  if(G.hp<=0){ G.hp=0; loseGame(); } // v0.61 B1：统一失血→判负口径，任何来源（洗髓经/燃血/反噬…）扣到 0 立即判负，不再负血穿牌
}"""))

# —— B2a：doPlayCard 末尾 —— 死亡判定提到胜利判定之前 ——
EDITS.append((
"""  if(aliveEnemies().length===0){ winFight(); return; }
  if(G.hp<=0){ G.hp=0; loseGame(); return; }
  render();
  saveRun();
}""",
"""  if(G.hp<=0){ G.hp=0; loseGame(); return; }   // v0.61 B2：死亡先判 —— 同帧自爆绝杀按判负，不再带 0 血进胜利结算
  if(aliveEnemies().length===0){ winFight(); return; }
  render();
  saveRun();
}"""))

# —— B2b：enemyAct 敌人行动循环内 —— 同样调序 ——
EDITS.append((
"""    if(aliveEnemies().length===0){ winFight(); return; }
    if(G.hp<=0){ G.hp=0; loseGame(); return; }
  }
  if((G.zombieDmg||0)>0){""",
"""    if(G.hp<=0){ G.hp=0; loseGame(); return; } // v0.61 B2：死亡先判（与 doPlayCard 尾部一致）
    if(aliveEnemies().length===0){ winFight(); return; }
  }
  if((G.zombieDmg||0)>0){"""))

# —— B4：winFight 重入守卫 ——
EDITS.append((
"""function winFight(){
  sfx('win');""",
"""function winFight(){
  if(G.battleOver) return; // v0.61 B4：重入守卫 —— 一场战斗只结算一次胜利
  G.battleOver=true;
  sfx('win');"""))

# —— B4：loseGame 一并设旗标 ——
EDITS.append((
"""function loseGame(){
  if(G.dead) return; // 防止重复结算（多张怨气/连续判定）
  G.dead=true;""",
"""function loseGame(){
  if(G.dead) return; // 防止重复结算（多张怨气/连续判定）
  G.dead=true; G.battleOver=true; // v0.61 B4：胜负旗标统一收口"""))

# —— B4：startBattle 复位旗标 ——
EDITS.append((
"""  G.target=0;
  G.ybTarget=-1; // 阴兵索敌标记：本场战斗从头锁（-1=无目标，落到带诅咒随机）""",
"""  G.target=0;
  G.battleOver=false; // v0.61 B4：每场开打重置终局旗标
  G.ybTarget=-1; // 阴兵索敌标记：本场战斗从头锁（-1=无目标，落到带诅咒随机）"""))

# —— B4/B8：newState 字段 ——
EDITS.append((
"""wangyouTurns:0, wangyouDrunk:0, dead:false,""",
"""wangyouTurns:0, wangyouDrunk:0, wangyouPool:null, battleOver:false, dead:false,"""))

# —— B5：Boss 奖励不产卡，rewardTier 立即复位，防止以 60%金/40%紫 泄漏进下一家商店 ——
EDITS.append((
"""function showBossReward(){
  const relic=weightedRelic();""",
"""function showBossReward(){
  G.rewardTier = null; // v0.61 B5：Boss 奖励是遗物/灵汁/锻造、不产卡 —— 就地清空 tier，别让「boss」泄漏到下一场商店的稀有度表
  const relic=weightedRelic();"""))

# —— B6：金卡 pity 初始值 -0.05 → 0（开局前 5 场精英/商店金概率被清零的 bug）——
EDITS.append((
"""let goldCompensation = -0.05; // 初始值为-5%""",
"""let goldCompensation = 0; // v0.61 B6：开局改从 0 起（原 -0.05 会让前 5 场精英/商店金卡概率恒为 0）；出金后仍重置 -0.05 防连金"""))

# —— B9：生死簿只记「实际可扣血量」，斩杀溢出截断 ——
EDITS.append((
"""  if(e.ledgerActive && d>0) e.ledgerDmg=(e.ledgerDmg||0)+d;""",
"""  if(e.ledgerActive && d>0) e.ledgerDmg=(e.ledgerDmg||0)+Math.min(d, e.hp); // v0.61 B9：记账含斩杀溢出会让清算反弹系统性虚高 → 按实际可扣血量截断"""))

# —— B10：清算致死 return 是有意出口，补注释（判定已在 directDamage 内幂等收口）——
EDITS.append((
"""const dead=directDamage(dmg, `${e.name} 清算生死簿：反弹 ${dmg} 点伤害`); if(dead) return; }""",
"""const dead=directDamage(dmg, `${e.name} 清算生死簿：反弹 ${dmg} 点伤害`); if(dead) return; /* v0.61 B10：判负已在 directDamage→loseGame 幂等收口，棋盘停格属正常终局，不再续跑其余敌人 */ }"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）\n---%s---' % (i + 1, n, old[:150])); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v61_blockA_engine DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
