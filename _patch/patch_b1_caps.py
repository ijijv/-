# -*- coding: utf-8 -*-
# ① 血尸成长封顶（原型.html）：力量成长封顶 + 吸血回复封顶(150% maxHp) + 文案
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# E1 模块常量 + 力量叠加助手（插到 makeEnemy 定义之前；JS 顶层 function 提升，3 处调用点先于本行也能用）
EDITS.append((
"""function makeEnemy(def, key){""",
"""const MAX_ENEMY_STRENGTH = 8;          // 敌人力量成长封顶（防血尸无限拉锯/词缀/二阶段叠高）
const LIFESTEAL_HEAL_CAP_RATIO = 1.5;    // 吸血回复封顶 = maxHp×150%（仍可突破 100% 上限）
function addEnemyStrength(e, n){ e.strength = Math.min((e.strength||0) + n, MAX_ENEMY_STRENGTH); }
function makeEnemy(def, key){"""))

# E2 敌人意图 strength：改用封顶助手并记录实际增量
EDITS.append((
"""      case 'strength': { e.strength=(e.strength||0)+e.intent.v; log(`${e.name} 力量 +${e.intent.v}`); if(e.intent.weak){""",
"""      case 'strength': { const _sB4=e.strength||0; addEnemyStrength(e, e.intent.v); const _sGot=(e.strength||0)-_sB4; if(_sGot>0) log(`${e.name} 力量 +${_sGot}`); if(e.intent.weak){"""))

# E3 词缀「刚体」：每回合叠力量同样封顶
EDITS.append((
"""      const gt=e.affixes.find(a=>a.id==='gangti'); if(gt) e.strength=(e.strength||0)+gt.tier;""",
"""      const gt=e.affixes.find(a=>a.id==='gangti'); if(gt) addEnemyStrength(e, gt.tier);"""))

# E4 阎罗二阶段力量 +2 也封顶
EDITS.append((
"""  e.strength=(e.strength||0)+2;""",
"""  addEnemyStrength(e, 2);"""))

# E5 dealDamageToPlayer 吸血回复封顶（唯一带 lifesteal 的敌人=血尸）
EDITS.append((
"""  if(attacker.lifesteal && loss>0){ const hl=Math.floor(loss*attacker.lifesteal); attacker.hp+=hl; log(`${attacker.name} 吸血：回复 ${hl} 点生命`); }""",
"""  if(attacker.lifesteal && loss>0){ const hl=Math.floor(loss*attacker.lifesteal); const _cap=Math.floor((attacker.maxHp||attacker.hp)*LIFESTEAL_HEAL_CAP_RATIO); attacker.hp=Math.min(attacker.hp+hl, _cap); log(`${attacker.name} 吸血：回复 ${hl} 点生命`); }"""))

# E6 BOSS_MECH 文案注明封顶
EDITS.append((
"""  xueshi:'攻击吸血 80%，可突破血量上限。',""",
"""  xueshi:'攻击吸血 80%，可突破血量上限（回复封顶为上限 150%）；力量成长封顶为 8。',"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i+1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH b1_caps DONE: %d 处替换成功' % len(EDITS))

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
