# -*- coding: utf-8 -*-
# v0.57 Block4 功能批冒烟追加（#24/25/28/35/36/38/40，赶尸人列 A 数值断言）
import io, sys

P = r"C:\Users\HP\Desktop\志怪塔\_patch\smoke_runner.js"
s = io.open(P, 'r', encoding='utf-8').read()

ANCHOR = "      __ok('D#23u 卸甲 升级7格+xiejiaUp', g.block === 7 && g.xiejiaUp === true, 'block=' + g.block + ' up=' + g.xiejiaUp); })();"
NEW = ANCHOR + """
    // ===== Block4 功能批 A 列修正（聚灵/舍身/血契 升级倍率；燃魂抽2+符文；移形换影2尸气；镇妖铃无条件3尸气）=====
    g = __base('ganshiren'); g.hand = []; g.drawPile = [__card('leifu'), __card('zhiren')];
    (function () { var cc = __card('juling'); cc.eff(true, cc);
      __ok('F#24u 聚灵 升级抽到鬼怪→2尸气', g.尸气 === 2, '尸气=' + g.尸气); })();
    g = __base('ganshiren'); G.drawPile = ['leifu', 'jingang', 'zhiren'].map(__card); g.hand = [];
    (function () { var cc = __card('sheshen'); cc.eff(false, cc);
      __ok('F#25 舍身 失4血+1尸气', g.hp === 56 && g.尸气 === 1, 'hp=' + g.hp + ' 尸气=' + g.尸气); })();
    g = __base('ganshiren'); G.drawPile = ['leifu', 'jingang', 'zhiren'].map(__card); g.hand = []; g.尸气 = 0;
    (function () { var cc = __card('sheshen'); cc.eff(true, cc);
      __ok('F#25u 舍身 升级→2尸气', g.尸气 === 2, '尸气=' + g.尸气); })();
    g = __base('ganshiren');
    (function () { var cc = __card('xueqi'); cc.eff(false, cc);
      __ok('F#28 血契 基础每失1血+2格挡', G.bloodPact === 2, 'pact=' + G.bloodPact); })();
    (function () { G.bloodPact = 0; var cc = __card('xueqi'); cc.eff(true, cc);
      __ok('F#28u 血契 升级每失1血+3格挡', G.bloodPact === 3, 'pact=' + G.bloodPact); })();
    g = __base('ganshiren');
    __ok('F#35 血祭 文本上限3张', __card('xueji').t(false).indexOf('上限 3张') >= 0, __card('xueji').t(false));
    g = __base('ganshiren'); G.drawPile = ['leifu', 'jingang', 'zhiren'].map(__card); g.hand = []; g.energy = 0;
    (function () { var cc = __card('ranhun'); cc.eff(false, cc);
      __ok('F#36 燃魂 失6血+抽2张+1符文', g.hp === 54 && g.hand.length === 2 && g.energy === 1, 'hp=' + g.hp + ' hand=' + g.hand.length + ' en=' + g.energy); })();
    g = __base('ganshiren'); G.drawPile = ['leifu', 'jingang', 'zhiren'].map(__card); g.hand = []; g.energy = 0;
    (function () { var cc = __card('ranhun'); cc.eff(true, cc);
      __ok('F#36u 燃魂 升级失4血+2符文', g.hp === 56 && g.energy === 1, 'hp=' + g.hp + ' en=' + g.energy); })();
    g = __base('ganshiren');
    (function () { var cc = __card('yixing'); cc.eff(false, cc);
      __ok('F#38 移形换影 闪避+成功后2尸气', G.dodge === 1 && G.dodgeShiqi === 2, 'dodge=' + G.dodge + ' shiqi=' + G.dodgeShiqi); })();
    g = __base('ganshiren');
    (function () { var cc = __card('zhenyaoling'); cc.eff(false, cc);
      __ok('F#40 镇妖铃 无条件获3尸气', g.尸气 === 3, '尸气=' + g.尸气); })();
"""

n = s.count(ANCHOR)
if n != 1:
    print('ANCHOR FAIL: 匹配 %d 次（期望 1）' % n); sys.exit(1)
s = s.replace(ANCHOR, NEW)
io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v57_block4d SMOKE DONE')
