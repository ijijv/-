# -*- coding: utf-8 -*-
# v0.57 Block4 攻击批冒烟同步：7 张差异卡 A 列新数值断言
import io, sys

P = r"C:\Users\HP\Desktop\志怪塔\_patch\smoke_runner.js"
s = io.open(P, 'r', encoding='utf-8').read()

ANCHOR = "    __ok('A#48g 尸王 商店不可删', g.deck.length === 2 && g.deck[1].id === 'shi_wang', 'len=' + g.deck.length);"
NEW = ANCHOR + """
    // ===== Block4 攻击批 A 列修正（雷符4/7+击杀2尸气 / 蚀魂3/6+回血 / 钟馗16/24+无条件4/5）=====
    g = __base('ganshiren'); G.summons = [{type:'zhiren', v:1, dur:2}];
    (function () { var c = __card('leifu'); var t = G.enemies[0]; var bh = t.hp; c.eff(false, c);
      __ok('A#1 雷符 基础4+召唤1=5伤', bh - t.hp === 5, 'taken=' + (bh - t.hp)); })();
    (function () { var c = __card('leifu'); var t = G.enemies[0]; var bh = t.hp; c.eff(true, c);
      __ok('A#1u 雷符 升级7+召唤1=8伤', bh - t.hp === 8, 'taken=' + (bh - t.hp)); })();
    g = __base('ganshiren'); G.summons = [];
    (function () { var c = __card('leifu'); var t = G.enemies[0]; t.hp = 2; c.eff(false, c);
      __ok('A#1k 雷符 击杀获2尸气', g.尸气 === 2 && G.enemies[0].hp <= 0, '尸气=' + g.尸气); })();
    g = __base('ganshiren'); G.summons = [{type:'zhiren', v:1, dur:2}];
    (function () { var c = __card('shihunzhou'); var t = G.enemies[0]; var bh = t.hp; var hp0 = g.hp; c.eff(false, c);
      __ok('A#11 蚀魂 基础3伤+每召唤回1血', bh - t.hp === 3 && g.hp === hp0 + 1, 'taken=' + (bh - t.hp) + ' hp=' + g.hp); })();
    g = __base('ganshiren');
    (function () { var c = __card('zhongkui'); var t = G.enemies[0]; var bh = t.hp; c.eff(false, c);
      __ok('A#14 钟馗 16伤+无条件4尸气', bh - t.hp === 16 && g.尸气 === 4, 'taken=' + (bh - t.hp) + ' 尸气=' + g.尸气); })();
    g.尸气 = 0;
    (function () { var c = __card('zhongkui'); var t = G.enemies[0]; var bh = t.hp; c.eff(true, c);
      __ok('A#14u 钟馗 升级24伤+5尸气', bh - t.hp === 24 && g.尸气 === 5, 'taken=' + (bh - t.hp) + ' 尸气=' + g.尸气); })();
"""

n = s.count(ANCHOR)
if n != 1:
    print('ANCHOR FAIL: 匹配 %d 次（期望 1）' % n); sys.exit(1)
s = s.replace(ANCHOR, NEW)
io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v57_block4b SMOKE DONE')
