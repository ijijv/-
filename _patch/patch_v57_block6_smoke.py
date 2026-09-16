# -*- coding: utf-8 -*-
# v0.57 Block6 复核修正的冒烟断言（火符挑选弃 / 附灵术 0 费消耗 / 移形换影文案 / 预览键补齐）
import io, sys, subprocess, tempfile, os

P = r"C:\Users\HP\Desktop\志怪塔\_patch\smoke_runner.js"
s = io.open(P, 'r', encoding='utf-8').read()

ANCHOR = """  rep.pass = _p; rep.fail = _f;"""
NEW = """  /* ============ Block6 复核修正（按《赶尸人版卡池.md》补齐） ============ */
  (function () {
    function ids(arr) { return arr.map(function (c) { return c.id; }).join(','); }

    // ---- #2 火符（赶尸人）：随机弃 → 挑选弃 ----
    g = __base('ganshiren'); g.energy = 9; G.discard = []; G.drawPile = [];
    G.hand = [__card('huofu'), __card('zhiren')]; // 纸人 = 鬼怪牌
    doPlayCard(0);
    __ok('#2 火符A 打出后进入挑选弃牌（手牌不再随机弃）',
      !!G.huofuSelect && G.hand.length === 1 && G.hand[0].id === 'zhiren',
      'sel=' + !!G.huofuSelect + ' hand=' + ids(G.hand));
    pickHuofuDiscard(0);
    __ok('#2 火符A 弃掉鬼怪牌 +1 尸气',
      G.尸气 === 1 && G.huofuSelect === null && G.discard.some(function (c) { return c.id === 'zhiren'; }),
      '尸气=' + G.尸气 + ' sel=' + G.huofuSelect + ' disc=' + ids(G.discard));

    g = __base('ganshiren'); g.energy = 9; G.discard = []; G.drawPile = [];
    G.hand = [__card('huofu'), __card('jingang')]; // 金刚符 = 非鬼怪牌
    doPlayCard(0); pickHuofuDiscard(0);
    __ok('#2 火符A 弃非鬼怪牌 不加尸气', G.尸气 === 0 && G.discard.some(function (c) { return c.id === 'jingang'; }),
      '尸气=' + G.尸气 + ' disc=' + ids(G.discard));

    g = __base('ganshiren'); g.energy = 9; G.discard = []; G.drawPile = [];
    var hfU = __card('huofu'); hfU.up = true;
    G.hand = [hfU, __card('zhiren')];
    doPlayCard(0); pickHuofuDiscard(0);
    __ok('#2 火符A 升级 弃鬼怪牌 +2 尸气', G.尸气 === 2, '尸气=' + G.尸气);

    g = __base('ganshiren');
    __ok('#2 火符A 文案为「挑选弃 1 张手牌」', __card('huofu').t(false).indexOf('挑选弃') >= 0, __card('huofu').t(false));

    // ---- #39 附灵术：0 费 + 消耗牌 ----
    g = __base('ganshiren');
    var fl = __card('fuling');
    __ok('#39 附灵术 0 费 + 消耗牌', fl.cost === 0 && fl.exhaust === true, 'cost=' + fl.cost + ' exhaust=' + fl.exhaust);
    __ok('#39 附灵术 A 文案含「消耗牌（一次性）」', fl.t(false).indexOf('消耗牌（一次性）') >= 0, fl.t(false));

    // ---- #38 移形换影：A 列升级补「（0 符文）」----
    g = __base('ganshiren');
    var yx = __card('yixing');
    __ok('#38 移形换影 A 升级文案含「0 符文」', yx.t(true).indexOf('0 符文') >= 0, yx.t(true));
    __ok('#38 移形换影 A 未升级文案不含「0 符文」', yx.t(false).indexOf('0 符文') < 0, yx.t(false));

    // ---- 需求⑤ 预览键补齐：镇妖铃 / 咒雨 / 尸王 ----
    g = __base('ganshiren'); g.尸气 = 5;
    __ok('⑤ 预览 咒雨 = 尸气 5 × 6 = 30', previewDamage(__card('zhouyu')).d === 30, JSON.stringify(previewDamage(__card('zhouyu'))));
    g.尸气 = 0;
    __ok('⑤ 预览 咒雨 无尸气→miss',
      (function () { var p = previewDamage(__card('zhouyu')); return !!p && p.raw === 0 && p.miss === '无尸气'; })(),
      JSON.stringify(previewDamage(__card('zhouyu'))));

    g = __base('ganshiren');
    __ok('⑤ 预览 镇妖铃 赶尸人 = 10/16',
      previewDamage(__card('zhenyaoling')).d === 10 && previewDamage(Object.assign({}, __card('zhenyaoling'), { up: true })).d === 16,
      'd0=' + previewDamage(__card('zhenyaoling')).d);

    __ok('⑤ 预览 尸王 = 10 且标注每回合',
      (function () { var p = previewDamage(__card('shi_wang')); return !!p && p.d === 10 && p.perTurn === true; })(),
      JSON.stringify(previewDamage(__card('shi_wang'))));
  })();

  rep.pass = _p; rep.fail = _f;"""

n = s.count(ANCHOR)
if n != 1:
    print('SMOKE ANCHOR FAIL: 匹配 %d 次（期望 1）' % n); sys.exit(1)
s = s.replace(ANCHOR, NEW)
io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('SMOKE 断言已追加（Block6）')

fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, s.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
