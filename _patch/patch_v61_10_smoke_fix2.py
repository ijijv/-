# -*- coding: utf-8 -*-
# v0.61.10 冒烟再修两处用例前提：
#   1) 五通神现形当回合会走一次 wutongTick → dur 立刻 -1（非赶尸人英雄看到 1，不是 2）。
#      断言改成更有意义的相对口径：赶尸人 = 同一次召唤的其他英雄 + 1。
#   2) 易物换入池 = shuffle(drawPile+discard).slice(0,3)，池子放超过 3 张会把 钟馗 洗出局。
#      把可换池收到 1 张，池子变成确定的两张。
import io, sys, subprocess, os

ROOT = r"C:\Users\HP\Desktop\志怪塔"
P = os.path.join(ROOT, '_patch', 'smoke_runner.js')
s = io.open(P, 'r', encoding='utf-8', newline='').read()
log = []

def sub(old, new, label):
    global s
    c = s.count(old)
    if c != 1:
        print('ANCHOR FAIL [%s] %d 次' % (label, c)); sys.exit(1)
    s = s.replace(old, new, 1); log.append(label)

sub("    // 注意：id 用**卡牌 id**（阴兵是 yinbingguo，'yinbing' 只是召唤物 type）；dur 取卡面基础值\n"
    "    var LIFE = { zhiren: 2, xiaogui: 2, wutong: 2, yinbingguo: 3 };\n"
    "    var badLife = [];\n"
    "    Object.keys(LIFE).forEach(function (id) {\n"
    "      g = __base('ganshiren');\n"
    "      var cc = __card(id); cc.eff(false, cc);\n"
    "      var sm = g.summons[g.summons.length - 1];\n"
    "      if (!sm || sm.dur !== LIFE[id] + 1) badLife.push('A ' + id + ':' + (sm && sm.dur));\n"
    "      g = __base('wuseng');\n"
    "      cc = __card(id); cc.eff(false, cc);\n"
    "      sm = g.summons[g.summons.length - 1];\n"
    "      if (!sm || sm.dur !== LIFE[id]) badLife.push('B ' + id + ':' + (sm && sm.dur));\n"
    "    });\n"
    "    __ok('v0.61.10 P6 赶尸人 纸人/小鬼/五通神/阴兵 寿命 +1，其他英雄不加', badLife.length === 0, badLife.join(' '));",
    "    // 注意：id 用**卡牌 id**（阴兵是 yinbingguo，'yinbing' 只是召唤物 type）；\n"
    "    // BASE 是「非赶尸人英雄打出后立即看到的 dur」——五通神现形当回合会走一次 wutongTick，所以是 1 不是 2。\n"
    "    var BASE = { zhiren: 2, xiaogui: 2, wutong: 1, yinbingguo: 3 };\n"
    "    var badLife = [];\n"
    "    Object.keys(BASE).forEach(function (id) {\n"
    "      g = __base('wuseng');\n"
    "      var cc = __card(id); cc.eff(false, cc);\n"
    "      var sm = g.summons[g.summons.length - 1];\n"
    "      var base = sm && sm.dur;\n"
    "      if (base !== BASE[id]) badLife.push('基准 ' + id + ':' + base + '≠' + BASE[id]);\n"
    "      g = __base('ganshiren');\n"
    "      cc = __card(id); cc.eff(false, cc);\n"
    "      sm = g.summons[g.summons.length - 1];\n"
    "      if (!sm || sm.dur !== base + 1) badLife.push('A ' + id + ':' + (sm && sm.dur) + '≠' + (base + 1));\n"
    "    });\n"
    "    __ok('v0.61.10 P6 赶尸人 纸人/小鬼/五通神/阴兵 寿命恰好 +1，其他英雄不加', badLife.length === 0, badLife.join(' '));",
    'LIFE→相对口径')

sub("    g.drawPile = [__card('zhongkui')];        // 3 费金卡，好验证 -1\n"
    "    while (G.drawPile.length < 3) G.drawPile.push(__card('leifu'));\n",
    "    // 换入池 = shuffle(drawPile + discard).slice(0,3)：可换牌超过 3 张会把 钟馗 洗出局，\n"
    "    // 所以只放 1 张进抽牌堆（池子 = 钟馗 + 刚才打出的易物，两张，确定）。3 费金卡好验证 -1。\n"
    "    g.drawPile = [__card('zhongkui')];\n",
    '易物 换入池收敛')

P2 = P + '.check.js'
io.open(P2, 'w', encoding='utf-8', newline='').write(s)
r = subprocess.run(['node', '--check', P2], capture_output=True, text=True)
if r.returncode != 0:
    os.remove(P2); print('NODE CHECK FAIL'); print(r.stdout, r.stderr); sys.exit(1)
os.replace(P2, P)
print('OK', ' / '.join(log))
