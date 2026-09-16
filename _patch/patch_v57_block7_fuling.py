# -*- coding: utf-8 -*-
# v0.57 Block7 修正 Block6 越界：附灵术「0 费 + 消耗」只属赶尸人 A 列
#   《阴差版卡池.md》/《武僧版卡池.md》#39 = 2 费、无消耗；《天师版卡池.md》#39 = 2/1（升级 1 费）
#   → 新增「按英雄取费用」机制 `_costPick`（数值仍在，对象＝{ganshiren:0, default:2}）
#   → isOneUse 支持 exhaustOnly（仅指定英雄为消耗牌）
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# ---------- 1) 按英雄取费用 ----------
EDITS.append((
"""function cardCost(c){ return c.up && c.costU!=null ? c.costU : c.cost; }""",
"""/* 按英雄取费用：数值＝全英雄通用；对象＝{ganshiren:0, default:2}（如附灵术 A 列免费、D 列升级 1 费） */
function _costPick(v){ if(v==null) return null; if(typeof v!=='object') return v; return v[G.hero]!=null?v[G.hero]:(v.default!==undefined?v.default:null); }
function cardCost(c){ const u=_costPick(c.costU); return c.up && u!=null ? u : _costPick(c.cost); }"""))

# ---------- 2) canUpgrade 同步按英雄取值 ----------
EDITS.append((
"""    return c.costU!=null && c.costU!==c.cost;""",
"""    return c.costU!=null && _costPick(c.costU)!==_costPick(c.cost);"""))

# ---------- 3) 卡面费用高亮基准改用 cardCost ----------
EDITS.append((
"""  const costHtml = eff<c.cost ? `<div class="cost" style="background:var(--green);color:#fff">${eff}</div>` : `<div class="cost">${eff}</div>`;""",
"""  const costHtml = eff<cardCost(c) ? `<div class="cost" style="background:var(--green);color:#fff">${eff}</div>` : `<div class="cost">${eff}</div>`;"""))

# ---------- 4) 消耗牌判定支持 exhaustOnly ----------
EDITS.append((
"""function isOneUse(c){ return !!(c && (c.exhaust || (c.heroExhaust && c.heroExhaust===G.hero))); }""",
"""function isOneUse(c){
  if(!c) return false;
  if(c.exhaustOnly) return c.exhaustOnly.indexOf(G.hero)>=0; // 仅指定英雄视为消耗牌（如附灵术：只有赶尸人是消耗牌）
  return !!(c.exhaust || (c.heroExhaust && c.heroExhaust===G.hero));
}"""))

# ---------- 5) 附灵术：#39 按列取费 / 按列消耗，B/C/D 去掉 Block6 误加的「（消耗）」 ----------
EDITS.append((
"""  {id:'fuling', name:'附灵术', type:'skill', rarity:'purple', cost:0, exhaust:true, needs:'summon',
    t:(u)=>G.hero==='ganshiren'?`立即触发所有召唤单位。消耗牌（一次性）`
      :G.hero==='wuseng'?`立即触发所有召唤单位。每触发 1 个，获得 2 点格挡（消耗）`
      :G.hero==='yincha'?`立即触发所有召唤单位。每触发 1 个，恢复 2 点生命（消耗）`
      :`立即触发所有召唤单位。每触发 1 个，对随机敌人施加 1 层【诅咒】（消耗）`,""",
"""  {id:'fuling', name:'附灵术', type:'skill', rarity:'purple', cost:{ganshiren:0, default:2}, costU:{tianshi:1}, exhaustOnly:['ganshiren'], needs:'summon',
    t:(u)=>G.hero==='ganshiren'?`立即触发所有召唤单位。消耗牌（一次性）`
      :G.hero==='wuseng'?`立即触发所有召唤单位。每触发 1 个，获得 2 点格挡`
      :G.hero==='yincha'?`立即触发所有召唤单位。每触发 1 个，恢复 2 点生命`
      :`立即触发所有召唤单位。每触发 1 个，对随机敌人施加 1 层【诅咒】${u?'（1 符文）':''}`,"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v57_block7_fuling DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
