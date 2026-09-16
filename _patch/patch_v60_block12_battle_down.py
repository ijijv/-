# -*- coding: utf-8 -*-
# v0.60 Block12：战斗区下移 —— 修复「后排错落上抬」把大敌人顶进顶部栏
#   根因：.enemy 是 flex item（z-index 生效）且内联 transform:translateY(-liftY)，
#         RISE 最大 60px；v0.50 把 Boss 立绘放大到 372px 后，后排 Boss/精英的上沿
#         会抬到 .battle 之上，盖住同为普通文档流的 #topbar。
#   修法：把 RISE 提到模块作用域，render() 里按「当前实际在场上抬幅度」给
#         #enemy-panel 动态补 padding-top（单敌=0 抬升 → 不浪费纵向空间）。
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# —— 1) RISE 提到模块作用域 + 新增 battleHeadroom() 供 render 复用同一份数据 ——
EDITS.append((
"""function enemyPanelHTML(e, idx){""",
"""// 纵深错落：idx 0 最低(0)、右→左逐级抬高；liftY 越大越靠后（见 enemyPanelHTML）
const RISE_LIFT=[0,42,20,60,30];
// 当前场上「后排上抬」的最大幅度 —— 用作 #enemy-panel 的 padding-top，
// 保证被抬起的后排敌人不会越过 .battle 上沿去盖住 #topbar（v0.60 修）
function battleHeadroom(){
  let mx=0;
  (G.enemies||[]).forEach((e,i)=>{ if(alive(e)||e.dying) mx=Math.max(mx, RISE_LIFT[i%RISE_LIFT.length]); });
  return mx;
}
function enemyPanelHTML(e, idx){"""))

# —— 2) 函数内改用模块常量 ——
EDITS.append((
"""  const RISE=[0,42,20,60,30]; const liftY=(idx>=0?RISE[idx%RISE.length]:0); // 纵深错落：Boss/首敌最低(0)，右→左逐级抬高；liftY 越大越靠后""",
"""  const liftY=(idx>=0?RISE_LIFT[idx%RISE_LIFT.length]:0); // 纵深错落（振幅见 RISE_LIFT）"""))

# —— 3) render()：按当前场面动态下移敌方面板 ——
EDITS.append((
"""  document.getElementById('enemy-panel').innerHTML=G.enemies.filter(e=>alive(e)||e.dying).map(e=>enemyPanelHTML(e, G.enemies.indexOf(e))).join('') || '<div style="color:var(--dim)">（敌人已清）</div>';""",
"""  const _epEl=document.getElementById('enemy-panel');
  _epEl.innerHTML=G.enemies.filter(e=>alive(e)||e.dying).map(e=>enemyPanelHTML(e, G.enemies.indexOf(e))).join('') || '<div style="color:var(--dim)">（敌人已清）</div>';
  _epEl.style.paddingTop=(2+battleHeadroom())+'px'; // v0.60：给后排错落留出净空，别顶到顶部栏"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）\n---%s---' % (i + 1, n, old[:120])); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v60_block12_battle_down DONE: %d 处' % len(EDITS))
mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
