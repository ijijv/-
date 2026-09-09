# -*- coding: utf-8 -*-
# 【血祭阴差增强】(原型.html) —— 用户 2026-09-09 拍板：
#   ① 血怒=整局累积（仅开新局清零，引擎现状已满足，不加清零逻辑）
#   ② 新被动：打出扣血牌时每失去1点生命 → 自动 +1【血怒】
#   ③ 顶栏血怒计数徽章 + KEYWORDS【血怒】词条 + 阴差被动文案更新
# 共 10 处（E1..E10）。node --check 内置于脚本。
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# E1 module 级出牌窗口标记（HEROES `];` 与 function loseHp 之间）
EDITS.append((
"""];
function loseHp(n){""",
"""];
let cardPlayWindow=false; // 阴差被动·以血引怒：doPlayCard 执行 c.eff 期间为 true
function loseHp(n){"""))

# E2 loseHp 产怒钩子（在失血计数之后、血契天师注释之前插入）
EDITS.append((
"""  G.hpLostTurn=(G.hpLostTurn||0)+c;

  // 血契（天师版）""",
"""  G.hpLostTurn=(G.hpLostTurn||0)+c;
  // 阴差被动·以血引怒：仅当「正在打出扣血牌」（doPlayCard 窗口内）失血时，每失去 1 点生命 +1【血怒】
  if(cardPlayWindow && G.hero==='yincha' && c>0){ const _b4=rageLayers(); gainRage(c); const _got=rageLayers()-_b4; if(_got>0){ floatMsg('🩸 血怒 +'+_got); log('以血引怒：失去 '+c+' 点生命，获得 '+_got+' 层【血怒】（现 '+rageLayers()+' 层）'); } }

  // 血契（天师版）"""))

# E3 doPlayCard：给 eff 调用包出牌窗口
EDITS.append((
"""  const effResult = c.eff(c.up, c, xuenuBonus);
  // 若 eff 明确返回 false，则视为打出失败，回滚消耗与卡牌状态""",
"""  cardPlayWindow=true;
  const effResult = c.eff(c.up, c, xuenuBonus);
  cardPlayWindow=false;
  // 若 eff 明确返回 false，则视为打出失败，回滚消耗与卡牌状态"""))

# E4 铁布衫 eff：删掉卡面自带 gainRage(2)（由被动按 1:1 给，避免双算）
EDITS.append((
"""      else if(G.hero==='yincha'){ loseHp(2); gainRage(2); }""",
"""      else if(G.hero==='yincha'){ loseHp(2); }"""))

# E5 铁布衫 t：删「，获得 2 层【血怒】」
EDITS.append((
"""失去 2 点生命，获得 2 层【血怒】""",
"""失去 2 点生命"""))

# E6 金光罩 eff：删 gainRage(2)
EDITS.append((
"""      else if(G.hero==='yincha'){ loseHp(3); gainRage(2); gainBlock(u?14:10); }""",
"""      else if(G.hero==='yincha'){ loseHp(3); gainBlock(u?14:10); }"""))

# E7 金光罩 t：删「，获得 2 层【血怒】」（3 血版）
EDITS.append((
"""失去 3 点生命，获得 2 层【血怒】""",
"""失去 3 点生命"""))

# E8 阴差被动文案更新
EDITS.append((
"""跨战斗保留。以【失去生命】换力：""",
"""整局累积（开新局才清零）。打出扣血牌时每失去 1 点生命，自动 +1 层【血怒】；"""))

# E9 顶栏血怒徽章（尸气块之后）
EDITS.append((
"""  // 如果当前角色是茅山赶尸人，显示尸气
  if(G.hero === 'ganshiren') {
    html += `<span class="stat stat-shiqi">尸气: <b>${G.尸气}/${G.maxShiQi}</b></span>`;
  }""",
"""  // 如果当前角色是茅山赶尸人，显示尸气
  if(G.hero === 'ganshiren') {
    html += `<span class="stat stat-shiqi">尸气: <b>${G.尸气}/${G.maxShiQi}</b></span>`;
  }
  // 如果当前角色是血祭阴差，显示血怒（整局累积资源）
  if(G.hero === 'yincha') {
    html += `<span class="stat stat-xuenu">血怒: <b>${G.xuenu||0}/${G.maxXuenu||10}</b></span>`;
  }"""))

# E10 CSS：血怒徽章红字
EDITS.append((
"""  .stat b{color:var(--gold); font-size:16px;}""",
"""  .stat b{color:var(--gold); font-size:16px;}
  .stat-xuenu b{color:var(--red);}"""))

# E11 KEYWORDS：新增【血怒】词条
EDITS.append((
"""  ['血祭','下回合多摸牌；本回合若受伤，再多摸 1 张。'],""",
"""  ['血祭','下回合多摸牌；本回合若受伤，再多摸 1 张。'],
  ['血怒','阴差专属资源，上限 10 层、整局累积（开新局清零）。打出扣血牌时每失去 1 点生命自动 +1 层；带“每层 +N（上限 M）”的牌打出时消耗实际用到的层数。'],"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i+1, n))
        sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH xuenu_passive DONE: %d 处替换成功' % len(EDITS))

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
