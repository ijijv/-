# -*- coding: utf-8 -*-
# v0.54 → v0.55：噬魂术 ①四英雄都不再是消耗牌 ②天师版数值 7/9 → 5/6
#   用户口径：「噬魂术都不是消耗牌，天师的噬魂术的数值改低一点即可，
#              消耗目标全部【诅咒】，每层造成 5/6 伤害」
import io, sys, subprocess, tempfile, os, re

P  = r"C:\Users\HP\Desktop\志怪塔\原型.html"
SR = r"C:\Users\HP\Desktop\志怪塔\_patch\smoke_runner.js"
s  = io.open(P, 'r', encoding='utf-8').read()
sm = io.open(SR, 'r', encoding='utf-8').read()

EDITS = []      # 原型.html
SEDITS = []     # smoke_runner.js

# ============ 一、原型.html ============

# 1.1 摘掉天师专属消耗标记（这是它成为消耗牌的唯一原因）
EDITS.append((
"""  {id:'shihun', name:'噬魂术', type:'attack', rarity:'blue', cost:2, heroExhaust:'tianshi',""",
"""  {id:'shihun', name:'噬魂术', type:'attack', rarity:'blue', cost:2,"""))

# 1.2 天师卡面：7/9 → 5/6，并删掉「（消耗牌）」
EDITS.append((
"""      :`消耗目标全部【诅咒】，每层造成 ${u?9:7} 伤害（消耗牌）`,""",
"""      :`消耗目标全部【诅咒】，每层造成 ${u?6:5} 伤害`,"""))

# 1.3 天师 eff：同步倍数
EDITS.append((
"""      const c=t.curse||0; if(c<=0){ log('噬魂术：目标没有诅咒，落空'); return false; } t.curse=0; dealDamageTo(t,c*(u?9:7)); }},""",
"""      const c=t.curse||0; if(c<=0){ log('噬魂术：目标没有诅咒，落空'); return false; } t.curse=0; dealDamageTo(t,c*(u?6:5)); }},"""))

# 1.4 CARD_DMG 伤害预览（须与 eff 逐列一致）
EDITS.append((
"""    if(G.hero==='yincha') return (u?13:10)+2*Math.min(10,rageLayers()); // 阴差：血怒每层+2(至多10层=+20)，打出时消耗
    return (t.curse||0)*(u?9:7); },""",
"""    if(G.hero==='yincha') return (u?13:10)+2*Math.min(10,rageLayers()); // 阴差：血怒每层+2(至多10层=+20)，打出时消耗
    return (t.curse||0)*(u?6:5); },"""))

# 1.5 isOneUse 注释已过时（噬魂术不再是例子）
EDITS.append((
"""/* 消耗牌判定：牌自带 exhaust，或该英雄专属消耗（如噬魂术仅天师） */""",
"""/* 消耗牌判定：牌自带 exhaust，或 heroExhaust 指定的英雄专属消耗 */"""))

# ============ 二、smoke_runner.js ============

# 2.1 天师预览数值
SEDITS.append((
"""    __ok('噬魂术预览 天师=诅咒×7', pv().d === 14, 'd=' + pv().d);""",
"""    __ok('噬魂术预览 天师=诅咒×5', pv().d === 10, 'd=' + pv().d);"""))

SEDITS.append((
"""    __ok('噬魂术预览 升级天师=诅咒×9', previewDamage(shU).d === 18, 'd=' + previewDamage(shU).d);""",
"""    __ok('噬魂术预览 升级天师=诅咒×6', previewDamage(shU).d === 12, 'd=' + previewDamage(shU).d);"""))

# 2.2 消耗牌判定：天师版不再消耗
SEDITS.append((
"""    __ok('v0.53 噬魂术(天师) 是消耗牌', isOneUse(__card('shihun')) === true);""",
"""    __ok('v0.55 噬魂术(天师) 非消耗牌', isOneUse(__card('shihun')) === false);"""))

SEDITS.append((
"""    __ok('v0.53 噬魂术(天师) 手牌有标记', handCardHTML(__card('shihun'), false, 0, 1).indexOf('oneuse-bar') >= 0);""",
"""    __ok('v0.55 噬魂术(天师) 手牌无标记', handCardHTML(__card('shihun'), false, 0, 1).indexOf('oneuse') < 0);"""))

# 2.3 新增 v0.55 断言块
NEWBLOCK = """  /* ============ v0.55 噬魂术：取消消耗牌 + 天师版降到 5/6 ============ */
  (function () {
    // 四个英雄都不再是消耗牌
    ['ganshiren', 'wuseng', 'yincha', 'tianshi'].forEach(function (h) {
      __base(h);
      __ok('v0.55 噬魂术(' + h + ') 非消耗牌', isOneUse(__card('shihun')) === false);
      __ok('v0.55 噬魂术(' + h + ') 卡面无消耗标记', handCardHTML(__card('shihun'), false, 0, 1).indexOf('oneuse') < 0);
    });

    // 天师版卡面：每层 5（升级 6），且不再出现「消耗牌」字样
    __base('tianshi');
    var shT = __card('shihun');
    var txtB = shT.t(false), txtU = shT.t(true);
    __ok('v0.55 噬魂术(天师) 卡面每层5', txtB.indexOf('每层造成 5') >= 0, txtB);
    __ok('v0.55 噬魂术(天师) 升级卡面每层6', txtU.indexOf('每层造成 6') >= 0, txtU);
    __ok('v0.55 噬魂术(天师) 卡面不再写「消耗牌」', txtB.indexOf('消耗牌') < 0, txtB);

    // 天师版机制：消耗目标全部诅咒，每层 5；不是消耗牌，正常进弃牌堆
    G.enemies[0].curse = 3; G.enemies[0].block = 0;
    G.enemies[0].maxHp = 300; G.enemies[0].hp = 300;
    G.hand = [shT]; G.deck = [shT]; G.drawPile = []; G.discard = []; G.exhausted = [];
    var hp0 = G.enemies[0].hp;
    doPlayCard(0);
    __ok('v0.55 噬魂术(天师) 3层诅咒 → 15 伤害', hp0 - G.enemies[0].hp === 15, 'dealt=' + (hp0 - G.enemies[0].hp));
    __ok('v0.55 噬魂术(天师) 打出后诅咒清零', G.enemies[0].curse === 0, 'curse=' + G.enemies[0].curse);
    __ok('v0.55 噬魂术(天师) 不进本关消耗区', (G.exhausted || []).length === 0);
    __ok('v0.55 噬魂术(天师) 正常进弃牌堆', G.discard.indexOf(shT) >= 0);
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

nv = s.count('v0.54')
if nv != 3:
    print('VER FAIL: v0.54 匹配 %d 次（期望 3）' % nv); sys.exit(1)
s = s.replace('v0.54', 'v0.55')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
io.open(SR, 'w', encoding='utf-8', newline='').write(sm)
print('PATCH q_shihun DONE: 原型 %d 处 + 冒烟 %d 处 + 版本号 v0.55' % (len(EDITS), len(SEDITS)))

mm = re.search(r'<script>([\s\S]*?)</script>', s)
js = mm.group(1)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, js.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK (%d chars)' % len(js))
print('残留 shihun heroExhaust: %d  |  残留 噬魂术 9:7: %d'
      % (s.count("heroExhaust"), s.count('t,c*(u?9:7)')))
