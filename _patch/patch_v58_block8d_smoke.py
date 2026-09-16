# -*- coding: utf-8 -*-
# v0.58 Block8d 冒烟：更新卸甲生元 B 数值 + 新增防御牌 B 列断言
import io, sys, subprocess, tempfile, os

P = r"C:\Users\HP\Desktop\志怪塔\_patch\smoke_runner.js"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

EDITS.append((
"""    __ok('B#23 卸甲 只置 xiejia 不清格挡', g.xiejia === 2 && g.endBlockKind === null && g.block >= 6, 'xiejia=' + g.xiejia + ' endBlockKind=' + g.endBlockKind);
    g = __base('wuseng'); c = __card('xiejiashengyuan'); c.eff(false, c); finishEndTurn();
    __ok('B#23 卸甲 回合末格挡保留', g.block === 6 && g.xiejia === 2, 'block=' + g.block);""",
"""    __ok('B#23 卸甲 只置 xiejia 不清格挡', g.xiejia === 2 && g.endBlockKind === null && g.block === 5, 'xiejia=' + g.xiejia + ' endBlockKind=' + g.endBlockKind + ' block=' + g.block);
    g = __base('wuseng'); c = __card('xiejiashengyuan'); c.eff(false, c); finishEndTurn();
    __ok('B#23 卸甲 回合末格挡保留', g.block === 5 && g.xiejia === 2, 'block=' + g.block);

    // ---- v0.58 防御牌（15~23）按《武僧版卡池.md》 ----
    function blk(id, up) { var g2 = __base('wuseng'); var cc = Object.assign({}, __card(id), { up: !!up }); cc.eff(!!up, cc); return g2.block; }
    __ok('B#15 金刚符 6/9', blk('jingang') === 6 && blk('jingang', true) === 9, blk('jingang') + '/' + blk('jingang', true));
    __ok('B#16 隐身符 4/6', blk('yinshen') === 4 && blk('yinshen', true) === 6, blk('yinshen') + '/' + blk('yinshen', true));
    __ok('B#17 金光罩 14/19', blk('jinguang') === 14 && blk('jinguang', true) === 19, blk('jinguang') + '/' + blk('jinguang', true));
    __ok('B#18 金钟罩 12/17', blk('jinzhong') === 12 && blk('jinzhong', true) === 17, blk('jinzhong') + '/' + blk('jinzhong', true));
    __ok('B#19 荆棘符 4/7 + 反弹 4/5', blk('jingji') === 4 && blk('jingji', true) === 7,
      'blk=' + blk('jingji') + '/' + blk('jingji', true) + ' 反弹=' + (function () { var g2 = __base('wuseng'); var cc = __card('jingji'); cc.eff(false, cc); return g2.thorns; })() +
      '/' + (function () { var g2 = __base('wuseng'); var cc = Object.assign({}, __card('jingji'), { up: true }); cc.eff(true, cc); return g2.thorns; })());
    __ok('B#20 佛渡 升级 +4 格挡', blk('fodu') === 0 && blk('fodu', true) === 4, blk('fodu') + '/' + blk('fodu', true));
    __ok('B#21 铜皮铁骨 10/15 + 反弹 6/8',
      blk('tongpi') === 10 && blk('tongpi', true) === 15 &&
      (function () { var g2 = __base('wuseng'); var cc = __card('tongpi'); cc.eff(false, cc); return g2.thorns === 6; })() &&
      (function () { var g2 = __base('wuseng'); var cc = Object.assign({}, __card('tongpi'), { up: true }); cc.eff(true, cc); return g2.thorns === 8; })(),
      blk('tongpi') + '/' + blk('tongpi', true));
    var fz = __card('fanzhen');
    g = __base('wuseng'); __card('fanzhen').eff(false, __card('fanzhen'));
    __ok('B#22 反震 反弹 4/5 且不再给下回合格挡',
      G.thorns === 4 && (G.nextBlock || 0) === 0 && cardCost(fz) === 1 && cardCost(Object.assign({}, fz, { up: true })) === 0,
      'thorns=' + G.thorns + ' nextBlock=' + G.nextBlock + ' cost=' + cardCost(fz) + ' costU=' + cardCost(Object.assign({}, fz, { up: true })));
    __ok('B#22 反震 升级反弹 5', (function () { var g2 = __base('wuseng'); var cc = Object.assign({}, __card('fanzhen'), { up: true }); cc.eff(true, cc); return g2.thorns === 5; })());
    __ok('B#23 卸甲生元 5/8', blk('xiejiashengyuan') === 5 && blk('xiejiashengyuan', true) === 8,
      blk('xiejiashengyuan') + '/' + blk('xiejiashengyuan', true));"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('SMOKE 断言已更新（Block8d）')
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, s.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
