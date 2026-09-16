# -*- coding: utf-8 -*-
# v0.57 Block4 防御批冒烟追加（D#15~23，赶尸人列 A 数值断言）
import io, sys

P = r"C:\Users\HP\Desktop\志怪塔\_patch\smoke_runner.js"
s = io.open(P, 'r', encoding='utf-8').read()

ANCHOR = "      __ok('A#14u 钟馗 升级24伤+5尸气', bh - t.hp === 24 && g.尸气 === 5, 'taken=' + (bh - t.hp) + ' 尸气=' + g.尸气); })();"
NEW = ANCHOR + """
    // ===== Block4 防御批 A 列修正（金刚/隐身/金光/金钟/荆棘/铜皮/卸甲，佛渡加赶尸人分支）=====
    g = __base('ganshiren');
    (function () { var c = __card('jingang'); c.eff(false, c);
      __ok('D#15 金刚符 基础4格+1尸气', g.block === 4 && g.尸气 === 1, 'block=' + g.block + ' 尸气=' + g.尸气); })();
    (function () { G.block = 0; G.尸气 = 0; var c = __card('jingang'); c.eff(true, c);
      __ok('D#15u 金刚符 升级7格+2尸气', g.block === 7 && g.尸气 === 2, 'block=' + g.block + ' 尸气=' + g.尸气); })();
    g = __base('ganshiren'); G.summons = [{type:'zhiren', v:1, dur:2}];
    (function () { var c = __card('jingang'); c.eff(false, c);
      __ok('D#15s 金刚符 召唤不再加格挡', g.block === 4, 'block=' + g.block); })();
    g = __base('ganshiren');
    (function () { var c = __card('yinshen'); c.eff(false, c);
      __ok('D#16 隐身符 基础3格挡', g.block === 3, 'block=' + g.block); })();
    (function () { var c = __card('yinshen'); c.eff(true, c);
      __ok('D#16u 隐身符 升级6格挡', g.block === 6, 'block=' + g.block); })();
    g = __base('ganshiren'); g.尸气 = 2;
    (function () { var c = __card('jinguang'); c.eff(false, c);
      __ok('D#17 金光罩 基础10格+耗2尸气+4格', g.block === 14 && g.尸气 === 0, 'block=' + g.block + ' 尸气=' + g.尸气); })();
    g = __base('ganshiren'); g.尸气 = 2;
    (function () { var c = __card('jinguang'); c.eff(true, c);
      __ok('D#17u 金光罩 升级15格+耗2尸气+5格', g.block === 20 && g.尸气 === 0, 'block=' + g.block + ' 尸气=' + g.尸气); })();
    g = __base('ganshiren');
    (function () { var c = __card('jinzhong'); c.eff(false, c);
      __ok('D#18 金钟罩 基础10格挡', g.block === 10, 'block=' + g.block); })();
    (function () { var c = __card('jinzhong'); c.eff(true, c);
      __ok('D#18u 金钟罩 升级16格挡', g.block === 16, 'block=' + g.block); })();
    g = __base('ganshiren');
    (function () { var c = __card('jingji'); c.eff(false, c);
      __ok('D#19 荆棘符 基础3格+反弹4', g.block === 3 && G.thorns === 4, 'block=' + g.block + ' thorns=' + G.thorns); })();
    (function () { var c = __card('jingji'); c.eff(true, c);
      __ok('D#19u 荆棘符 升级6格+反弹6', g.block === 6 && G.thorns === 6, 'block=' + g.block + ' thorns=' + G.thorns); })();
    g = __base('ganshiren');
    (function () { var c = __card('fodu'); c.eff(false, c);
      __ok('D#20 佛渡 基础免疫+无尸气', G.debuffImmune === 1 && g.尸气 === 0, '免疫=' + G.debuffImmune + ' 尸气=' + g.尸气); })();
    (function () { var c = __card('fodu'); c.eff(true, c);
      __ok('D#20u 佛渡 升级获2尸气+免疫', g.尸气 === 2 && G.debuffImmune === 1, '尸气=' + g.尸气 + ' 免疫=' + G.debuffImmune); })();
    g = __base('ganshiren'); G.summons = [{type:'zhiren', v:1, dur:2}];
    (function () { var c = __card('tongpi'); c.eff(false, c);
      __ok('D#21 铜皮 基础9格+反弹4+召唤1', g.block === 9 && G.thorns === 5, 'block=' + g.block + ' thorns=' + G.thorns); })();
    (function () { var c = __card('tongpi'); c.eff(true, c);
      __ok('D#21u 铜皮 升级12格+反弹6+召唤1', g.block === 12 && G.thorns === 7, 'block=' + g.block + ' thorns=' + G.thorns); })();
    g = __base('ganshiren');
    (function () { var c = __card('xiejiashengyuan'); c.eff(false, c);
      __ok('D#23 卸甲 基础4格+开A转化', g.block === 4 && G.endBlockKind === 'A' && !g.xiejiaUp, 'block=' + g.block + ' kind=' + G.endBlockKind); })();
    (function () { var c = __card('xiejiashengyuan'); c.eff(true, c);
      __ok('D#23u 卸甲 升级7格+xiejiaUp', g.block === 7 && g.xiejiaUp === true, 'block=' + g.block + ' up=' + g.xiejiaUp); })();
"""

n = s.count(ANCHOR)
if n != 1:
    print('ANCHOR FAIL: 匹配 %d 次（期望 1）' % n); sys.exit(1)
s = s.replace(ANCHOR, NEW)
io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v57_block4c SMOKE DONE')
