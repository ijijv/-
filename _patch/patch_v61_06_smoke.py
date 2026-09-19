# -*- coding: utf-8 -*-
"""
v0.61.06 冒烟补充：Store / rng / AdSlot 三个接缝各来几条断言。

顺带在 runner 顶部补一个 `__realSaveRun` 捕获（saveRun 被 stub 成空函数了，
但「存档里带没带随机态」这件事只有真函数才测得出来）。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, '_patch', 'smoke_runner.js')


def sub1(s, old, new, tag):
    n = s.count(old)
    if n != 1:
        print('FAIL %s: 锚点出现 %d 次（期望 1）' % (tag, n)); sys.exit(1)
    return s.replace(old, new, 1)


BLOCK = r"""  /* ============ v0.61.06：三个接缝（Store / rng / AdSlot） ============ */
  (function () {
    __base('tianshi');

    /* --- 随机：同种子同序列、快照可续 --- */
    function draw(n) { var a = []; for (var i = 0; i < n; i++) a.push(rng()); return a; }
    function uniq(a) { var m = {}, k = 0; a.forEach(function (x) { if (!m[x]) { m[x] = 1; k++; } }); return k; }
    seedRng(20260919); var A = draw(20);
    seedRng(20260919); var B = draw(20);
    __ok('v0.61.06 rng 同种子 → 同序列（对局可复现）', JSON.stringify(A) === JSON.stringify(B));
    seedRng(20260920); var C = draw(20);
    __ok('v0.61.06 rng 换种子 → 换序列', JSON.stringify(A) !== JSON.stringify(C));
    __ok('v0.61.06 rng 取值落在 [0,1)', A.every(function (x) { return x >= 0 && x < 1; }));
    __ok('v0.61.06 rng 不是常量', uniq(A) > 15, uniq(A));

    seedRng(777); draw(5); var snap = rngSnapshot(); var D = draw(10);
    seedRng(777); draw(5); rngRestore(snap); var E = draw(10);
    __ok('v0.61.06 rngSnapshot/rngRestore 中途续流一致', JSON.stringify(D) === JSON.stringify(E));
    __ok('v0.61.06 旧存档没有随机态 → 退回新种子且不抛',
      rngRestore(undefined) === false && rngRestore({}) === false);

    /* 玩法随机确实改走 rng（同种子 → 同掉落） */
    seedRng(31337); var w1 = [weightedCard().id, weightedCard().id, weightedCard().id].join(',');
    seedRng(31337); var w2 = [weightedCard().id, weightedCard().id, weightedCard().id].join(',');
    __ok('v0.61.06 卡牌掉落走 rng（同种子同结果）', w1 === w2 && w1.length > 0, w1);
    seedRng(31338); var w3 = [weightedCard().id, weightedCard().id, weightedCard().id].join(',');
    __ok('v0.61.06 卡牌掉落随种子变化', w1 !== w3, w1 + ' / ' + w3);

    /* --- 随机态确实落进存档 --- */
    seedRng(4242); draw(3);
    var want = rngSnapshot();
    var _sv = saveRun; saveRun = __realSaveRun;
    var threw = null;
    try { __realSaveRun('map'); } catch (e) { threw = String((e && e.message) || e); }
    saveRun = _sv;
    var pay = Store.getJSON(RUN_KEY);
    __ok('v0.61.06 存档写入随机态 rng{s,n}',
      !threw && pay && pay.rng && pay.rng.s === want.s && pay.rng.n === want.n,
      threw || JSON.stringify(pay && pay.rng));
    __ok('v0.61.06 续档会恢复随机态', continueRun.toString().indexOf('rngRestore(d.rng)') >= 0);
    __ok('v0.61.06 新局/无尽开局各自播种',
      confirmNewGame.toString().indexOf('seedRng(rngSeedNow())') >= 0 &&
      startEndless.toString().indexOf('seedRng(rngSeedNow())') >= 0);
    Store.del(RUN_KEY);

    /* --- 存储薄封装 --- */
    Store.setJSON('__v616', { a: 1, b: 'x' });
    var r1 = Store.getJSON('__v616');
    __ok('v0.61.06 Store JSON 往返', !!(r1 && r1.a === 1 && r1.b === 'x'));
    Store.del('__v616');
    __ok('v0.61.06 Store.del 生效', Store.get('__v616') === null);
    Store.set('__v616', '{坏数据');
    __ok('v0.61.06 Store.getJSON 遇坏数据返回 null 不抛', Store.getJSON('__v616') === null);
    Store.del('__v616');
    __ok('v0.61.06 键名与旧版一致（老存档仍能读）',
      RUN_KEY === 'zhiguaitower_run_v1' && SAVE_KEY === 'zhiguaitower_save_v1' &&
      loadSettings.toString().indexOf('zhiguaitower_settings_v1') >= 0 &&
      tutorialSeen.toString().indexOf('zhiguaitower_tutorial_v1') >= 0);
    __ok('v0.61.06 玩法代码不再直接摸 localStorage',
      __realSaveRun.toString().indexOf('localStorage') < 0 &&
      hasRunSave.toString().indexOf('localStorage') < 0 &&
      readRun.toString().indexOf('localStorage') < 0 &&
      clearRunSave.toString().indexOf('localStorage') < 0 &&
      persistSave.toString().indexOf('localStorage') < 0);

    /* --- 广告位唯一入口 --- */
    var SLOT4 = ['奖励翻倍', '复活', '签到翻倍', '开局重随'];
    __ok('v0.61.06 AD_SLOTS 覆盖 4 个激励点位',
      AD_SLOTS.length === 4 && SLOT4.every(function (x) { return AD_SLOTS.indexOf(x) >= 0; }));
    var __h1 = 0; AdSlot.request('复活', function () { __h1++; });
    __ok('v0.61.06 AdSlot.request 回放奖励', __h1 === 1);
    var __h2 = 0; adPlaceholder('奖励翻倍', function () { __h2++; });
    __ok('v0.61.06 adPlaceholder 转发到 AdSlot', __h2 === 1);
    var __h3 = 0; adPlaceholder('签到翻倍', function () { __h3++; });
    __ok('v0.61.06 签到翻倍点位仍可用', __h3 === 1);
  })();

"""

s = io.open(P, 'r', encoding='utf-8', newline='').read()

# 必须在 saveRun 被 stub 之前捕获（stub 在第 11 行附近，比 __realEnemyAct 更早）
s = sub1(s, '  var __sil = function () {};',
         '  var __sil = function () {};\n'
         '  var __realSaveRun = saveRun; // v0.61.06：saveRun 会被 stub，但「存档里带没带随机态」只有真函数测得出',
         'runner 捕获 __realSaveRun')

s = sub1(s, '  rep.pass = _p; rep.fail = _f;',
         BLOCK + '  rep.pass = _p; rep.fail = _f;',
         'runner 追加 v0.61.06 断言')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('SMOKE v0.61.06 OK')
