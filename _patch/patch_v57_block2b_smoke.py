# -*- coding: utf-8 -*-
# v0.57 Block2 冒烟同步：A#23 卸甲生元改为「回合末自动结算（敌不攻也转）」
import io, sys

P = r"C:\Users\HP\Desktop\志怪塔\_patch\smoke_runner.js"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []
EDITS.append((  # A 列卸甲 #23：敌后手动 resolveEndBlock -> 回合末自动结算（不再依赖攻击）
"""    g = __base('ganshiren'); c = __card('xiejiashengyuan'); g.hand = [c]; c.eff(false, c);
    finishEndTurn();
    resolveEndBlock();
    __ok('A#23 卸甲 敌后结算 5格挡→2尸气', g.尸气 === 2 && g.block === 0 && g.endBlockKind === null, '尸气=' + g.尸气 + ' block=' + g.block);""",
"""    g = __base('ganshiren'); c = __card('xiejiashengyuan'); g.hand = [c]; c.eff(false, c);
    finishEndTurn(); // A 列回合末自动结算（敌不攻也转），不依赖敌人攻击
    __ok('A#23 卸甲 回合末自动结算 5格挡→2尸气', g.尸气 === 2 && g.block === 0 && g.endBlockKind === null && g.xiejiaUp === false, '尸气=' + g.尸气 + ' block=' + g.block + ' up=' + g.xiejiaUp);
    g = __base('ganshiren'); c = __card('xiejiashengyuan'); c.eff(true, c); // 升级 7 格挡
    finishEndTurn();
    __ok('A#23u 卸甲 回合末自动结算 升级7格挡→6尸气', g.尸气 === 6 && g.block === 0 && g.endBlockKind === null, '尸气=' + g.尸气 + ' block=' + g.block);"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v57_block2b SMOKE DONE')
