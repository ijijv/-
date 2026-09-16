# -*- coding: utf-8 -*-
# v0.57 Block5 全局 UI（需求第 7 点）：
#   ① 战斗画面上移腾位（压缩 h1/.battle 下边距）
#   ② 结束回合钮移到手牌右侧（竖排）
#   ③ 牌库/菜单按钮移到标题行（顶部）
#   ④ 战斗胜利三选一：同类聚拢排序（保留原索引）
#   ⑤ 锻造列表：可升级的排前、已升级/不可升级排后
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# ---------- ① 战斗画面上移 ----------
EDITS.append((
"""  h1.title{font-family:var(--font-kai); font-size:28px; letter-spacing:6px; color:var(--gold); margin-bottom:10px; text-align:center; text-shadow:0 0 18px rgba(224,179,65,.25);}""",
"""  h1.title{font-family:var(--font-kai); font-size:28px; letter-spacing:6px; color:var(--gold); margin-bottom:6px; text-align:center; text-shadow:0 0 18px rgba(224,179,65,.25); position:relative;}"""))
EDITS.append((
"""  .battle{display:flex; gap:14px; align-items:flex-end; margin-bottom:10px;}""",
"""  .battle{display:flex; gap:14px; align-items:flex-end; margin-bottom:4px;}"""))

# ---------- ②③ 手牌右侧结束回合 + 顶部牌库/菜单（样式）----------
EDITS.append((
"""  .hand-area{display:flex; align-items:flex-end; gap:8px;}
  .hand-area #hand{flex:1 1 auto; min-width:0;}""",
"""  .hand-area{display:flex; align-items:flex-end; gap:8px;}
  .hand-area #hand{flex:1 1 auto; min-width:0;}
  .hand-area #endTurn{flex:0 0 auto; align-self:center; writing-mode:vertical-rl; letter-spacing:5px; font-size:17px; padding:16px 10px; min-height:132px;}
  .title-actions{position:absolute; right:4px; top:50%; transform:translateY(-50%); display:flex; gap:8px;}
  .title-actions .btn{min-width:0; padding:6px 12px; font-size:13px;}"""))

# ---------- 移动端适配 ----------
EDITS.append((
"""    h1.title{font-size:22px; letter-spacing:3px;}
    h1.title small{font-size:11px;}""",
"""    h1.title{font-size:22px; letter-spacing:3px;}
    h1.title small{font-size:11px;}
    .title-actions{position:static; transform:none; justify-content:center; margin-top:6px;}"""))
EDITS.append((
"""    #actions{gap:8px; padding:8px 0 10px;}
    #actions button{min-width:48px; min-height:44px; padding:8px 14px; font-size:14px;}
    #actions button#endTurn{font-size:16px; padding:10px 22px; letter-spacing:2px;}""",
"""    .hand-area #endTurn{writing-mode:horizontal-tb; min-height:0; align-self:flex-end; font-size:15px; padding:10px 14px; letter-spacing:2px;}"""))

# ---------- ③ 标题行按钮 ----------
EDITS.append((
"""  <h1 class="title">志 怪 塔 <small>· 玩法原型 v0.57</small></h1>""",
"""  <h1 class="title">志 怪 塔 <small>· 玩法原型 v0.57</small><span class="title-actions"><button class="btn ghost" id="viewDeck">牌库</button><button class="btn ghost" id="menuBtn">菜单</button></span></h1>"""))

# ---------- ② 结束回合移入手牌区 ----------
EDITS.append((
"""        <div id="hand"></div>
      </div>
      <div id="actions">
        <button class="btn ghost" id="viewDeck">牌库</button>
        <button class="btn ghost" id="menuBtn">菜单</button>
        <button class="btn" id="endTurn">结束回合</button>
      </div>""",
"""        <div id="hand"></div>
        <button class="btn" id="endTurn">结束回合</button>
      </div>"""))

# ---------- ④ 战斗胜利三选一：同类聚拢 ----------
EDITS.append((
"""  const cards=picks.map((c,i)=>`<div class="card ${RCOLOR[c.rarity]}" onclick="pickReward(${i})">${cardBody(c)}</div>`).join('');""",
"""  const _TYPE_ORD={attack:0,defense:1,skill:2,spirit:3,junk:4};
  const cards=picks.map((c,i)=>({c,i})).sort((a,b)=>(_TYPE_ORD[a.c.type]??9)-(_TYPE_ORD[b.c.type]??9)||a.i-b.i)
    .map(({c,i})=>`<div class="card ${RCOLOR[c.rarity]}" onclick="pickReward(${i})">${cardBody(c)}</div>`).join('');"""))

# ---------- ⑤ 锻造排序（道观）----------
EDITS.append((
"""  if(!G.deck.length){ unknownEmpty(); return; }
  const cards=G.deck.map((c,i)=>forgeCardHTML(c,i)).join('');""",
"""  if(!G.deck.length){ unknownEmpty(); return; }
  const _fo=G.deck.map((c,i)=>({c,i})).sort((a,b)=>{ const ra=(a.c.up||!canUpgrade(a.c))?1:0, rb=(b.c.up||!canUpgrade(b.c))?1:0; return ra-rb||a.i-b.i; });
  const cards=_fo.map(({c,i})=>forgeCardHTML(c,i)).join('');"""))

# ---------- ⑤ 锻造排序（篝火）----------
EDITS.append((
"""  G.forgeFrom=from||'camp';
  const cards=G.deck.map((c,i)=>forgeCardHTML(c,i)).join('');""",
"""  G.forgeFrom=from||'camp';
  const _fo=G.deck.map((c,i)=>({c,i})).sort((a,b)=>{ const ra=(a.c.up||!canUpgrade(a.c))?1:0, rb=(b.c.up||!canUpgrade(b.c))?1:0; return ra-rb||a.i-b.i; });
  const cards=_fo.map(({c,i})=>forgeCardHTML(c,i)).join('');"""))

# ---------- 新手引导文案 ----------
EDITS.append((
"""3:'第三步 · 点底部<b>「结束回合」</b>结束本回合'""",
"""3:'第三步 · 点手牌右侧<b>「结束回合」</b>结束本回合'"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v57_block5_ui DONE: 原型 %d 处' % len(EDITS))

mm = re.search(r'<script>([\s\S]*?)</script>', s)
js = mm.group(1)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, js.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK (%d chars)' % len(js))
