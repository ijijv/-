# -*- coding: utf-8 -*-
# v0.55 → v0.56：噬魂术（武僧版）每层 7/5 → 6/5，与天师版统一为「5/6」
#   用户口径：「武僧也这样改」（接 v0.55 天师版 7/9 → 5/6）
#   注意：base(5) 两版本来就没变，实际只有**升级态**从 7 降到 6
import io, sys, subprocess, tempfile, os, re

P  = r"C:\Users\HP\Desktop\志怪塔\原型.html"
SR = r"C:\Users\HP\Desktop\志怪塔\_patch\smoke_runner.js"
s  = io.open(P, 'r', encoding='utf-8').read()
sm = io.open(SR, 'r', encoding='utf-8').read()

EDITS, SEDITS = [], []

# ============ 一、原型.html：武僧版三处 u?7:5 → u?6:5 ============

# 1.1 卡面文案（同句里「每层造成」与「额外造成」两个数一起改，保持该列内部一致）
EDITS.append((
"""      :G.hero==='wuseng'?`消耗目标全部【诅咒】，每层造成 ${u?7:5} 伤害。若本回合获得过 7 点以上格挡，额外造成 ${u?7:5} 伤害`""",
"""      :G.hero==='wuseng'?`消耗目标全部【诅咒】，每层造成 ${u?6:5} 伤害。若本回合获得过 7 点以上格挡，额外造成 ${u?6:5} 伤害`"""))

# 1.2 eff：格挡加成与每层倍率同步
EDITS.append((
"""      if(G.hero==='wuseng'){ const c=t.curse||0; const extra=((G.blockGainedTurn||0)>7)?(u?7:5):0; if(c<=0 && !extra){ log('噬魂术：目标没有诅咒，落空'); return false; } t.curse=0; dealDamageTo(t,c*(u?7:5)+extra); return; }""",
"""      if(G.hero==='wuseng'){ const c=t.curse||0; const extra=((G.blockGainedTurn||0)>7)?(u?6:5):0; if(c<=0 && !extra){ log('噬魂术：目标没有诅咒，落空'); return false; } t.curse=0; dealDamageTo(t,c*(u?6:5)+extra); return; }"""))

# 1.3 CARD_DMG 预览（须与 eff 逐列一致）
EDITS.append((
"""    if(G.hero==='wuseng'){ const extra=((G.blockGainedTurn||0)>7)?(u?7:5):0; return ((t.curse||0)*(u?7:5))+extra; } // 武僧：每层5/7+格挡加成""",
"""    if(G.hero==='wuseng'){ const extra=((G.blockGainedTurn||0)>7)?(u?6:5):0; return ((t.curse||0)*(u?6:5))+extra; } // 武僧：每层5/6+格挡加成"""))

# ============ 二、smoke_runner.js ============

# 2.1 旧标签里的「(非×6)」现在会误导（升级态确实就是 ×6），改为「基础」
SEDITS.append((
"""    __ok('噬魂术预览 武僧=诅咒×5(非×6)', pv().d === 10, 'd=' + pv().d);""",
"""    __ok('噬魂术预览 武僧=基础诅咒×5', pv().d === 10, 'd=' + pv().d);"""))

NEWBLOCK = """  /* ============ v0.56 噬魂术(武僧) 每层 7→6，与天师统一为 5/6 ============ */
  (function () {
    __base('wuseng');
    var shW = __card('shihun'), shWU = Object.assign({}, shW, { up: true });
    var txtW = shW.t(false), txtWU = shW.t(true);
    __ok('v0.56 噬魂术(武僧) 卡面每层5', txtW.indexOf('每层造成 5') >= 0, txtW);
    __ok('v0.56 噬魂术(武僧) 升级卡面每层6', txtWU.indexOf('每层造成 6') >= 0, txtWU);
    __ok('v0.56 噬魂术(武僧) 升级卡面额外6', txtWU.indexOf('额外造成 6') >= 0, txtWU);
    __ok('v0.56 噬魂术(武僧) 卡面不再出现 7', txtWU.indexOf('7 伤害') < 0, txtWU);

    // 升级态预览：2 层诅咒 → 12
    G.enemies[0].curse = 2; G.enemies[0].block = 0; G.blockGainedTurn = 0;
    __ok('v0.56 噬魂术(武僧) 升级预览 2层诅咒 → 12', previewDamage(shWU).d === 12, 'd=' + previewDamage(shWU).d);
    // 升级态 + 格挡加成：无诅咒也打 6 且不落空
    G.enemies[0].curse = 0; G.blockGainedTurn = 10;
    __ok('v0.56 噬魂术(武僧) 升级预览 格挡加成6', previewDamage(shWU).d === 6 && !previewDamage(shWU).miss,
      JSON.stringify(previewDamage(shWU)));

    // 实测升级态：3 层诅咒 → 18 伤，诅咒清零
    G.blockGainedTurn = 0;
    G.enemies[0].curse = 3; G.enemies[0].block = 0;
    G.enemies[0].maxHp = 300; G.enemies[0].hp = 300;
    var hw0 = G.enemies[0].hp;
    G.hand = [shWU]; G.deck = [shWU]; G.drawPile = []; G.discard = []; G.exhausted = [];
    doPlayCard(0);
    __ok('v0.56 噬魂术(武僧) 升级 3层诅咒 → 18 伤害', hw0 - G.enemies[0].hp === 18, 'dealt=' + (hw0 - G.enemies[0].hp));
    __ok('v0.56 噬魂术(武僧) 打出后诅咒清零', G.enemies[0].curse === 0, 'curse=' + G.enemies[0].curse);
    __ok('v0.56 噬魂术(武僧) 非消耗牌 正常进弃牌堆', (G.exhausted || []).length === 0 && G.discard.indexOf(shWU) >= 0);
  })();

"""
SEDITS.append(("  rep.pass = _p; rep.fail = _f;", NEWBLOCK + "  rep.pass = _p; rep.fail = _f;"))

# ============ 应用 ============
for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)
for i, (old, new) in enumerate(SEDITS):
    n = sm.count(old)
    if n != 1:
        print('SMOKE EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    sm = sm.replace(old, new)

nv = s.count('v0.55')
if nv != 3:
    print('VER FAIL: v0.55 匹配 %d 次（期望 3）' % nv); sys.exit(1)
s = s.replace('v0.55', 'v0.56')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
io.open(SR, 'w', encoding='utf-8', newline='').write(sm)
print('PATCH s_wuseng DONE: 原型 %d 处 + 冒烟 %d 处 + 版本号 v0.56' % (len(EDITS), len(SEDITS)))

mm = re.search(r'<script>([\s\S]*?)</script>', s)
js = mm.group(1)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, js.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK (%d chars)' % len(js))
print('残留噬魂术 u?7:5: %d' % s.count('c*(u?7:5)'))
