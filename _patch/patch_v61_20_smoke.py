# -*- coding: utf-8 -*-
# v0.61.20 批3 冒烟：为 9 项里「VM 里测得出」的 6 项加断言
#   P1 playableCount / P2 mapPath 往返 / P3 预览函数存在且无 DOM 不炸
#   P4 bossPhaseIntro 被 enterPhase2 触发 / P5 logCat 分类 / P8 tipOnce 只弹一次
#   P6/P7/P9 基本靠目视 —— 写进 更新日志.md 的浏览器复核清单
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

BLOCK = r"""
    /* ============================================================
     * v0.61.20 批3 手机端/UI
     * ============================================================ */

    /* —— P1 结束回合软提示 —— */
    var _pc = CARDS.find(function (c) { return !c.costU && cardCost(c) >= 2; });
    __ok('v0.61.20 P1 找得到一张 ≥2 费的基准牌（用例前提）', !!_pc, 'card=' + (_pc && _pc.id));
    if (_pc) {
      var _c2 = cardCost(_pc);
      g = __base('wuseng'); SCENE = 'battle'; g.energy = _c2;
      g.hand = [Object.assign({}, _pc)];
      __ok('v0.61.20 P1 能量刚好够 → 1 张可打', playableCount() === 1, 'cost=' + _c2 + ' n=' + playableCount());
      g.energy = _c2 - 1;
      __ok('v0.61.20 P1 差 1 点能量 → 不计入可打', playableCount() === 0, 'n=' + playableCount());
      g.energy = 9;
      g.hand = [Object.assign({}, _pc, { sealed: 1 })];
      __ok('v0.61.20 P1 被忘忧封印的牌不算可打', playableCount() === 0, 'n=' + playableCount());
      g.hand = [Object.assign({}, _pc), Object.assign({}, _pc), Object.assign({}, _pc)];
      __ok('v0.61.20 P1 三张同名牌 → 3 张可打', playableCount() === 3, 'n=' + playableCount());
      SCENE = 'map';
      __ok('v0.61.20 P1 非战斗场景不提示', playableCount() === 0, 'n=' + playableCount());
      SCENE = 'battle';
      __ok('v0.61.20 P1 软提示默认开（设置项默认 true）', SETTINGS.endTurnHint !== false, String(SETTINGS.endTurnHint));
    }

    /* —— P2 地图路径历史：记一笔 / 存档往返 / 老存档降级 —— */
    var __realStartBattle = startBattle;
    var __savedMAP = MAP;
    try {
      startBattle = __sil;
      MAP = [[{ t: 'fight', e: ['youhun'] }, { t: 'fight', e: ['youhun'] }],
             [{ t: 'fight', e: ['youhun'] }],
             [{ t: 'fight', e: ['youhun'] }]];
      g = __base('wuseng'); g.mapRow = 0; g.mapCol = -1; g.mapPath = []; SCENE = 'map';
      chooseNode(1);
      __ok('v0.61.20 P2 chooseNode 走一步记一笔路径',
        g.mapPath.length === 1 && g.mapPath[0].r === 0 && g.mapPath[0].c === 1, JSON.stringify(g.mapPath));

      g.mapRow = 2; g.mapCol = 1; g.mapPath = [{ r: 0, c: 1 }, { r: 1, c: 1 }];
      __realSaveRun();
      var _raw = readRun();
      __ok('v0.61.20 P2 存档带上 mapPath',
        !!(_raw && _raw.mapPath && _raw.mapPath.length === 2 && _raw.mapPath[1].c === 1),
        JSON.stringify(_raw && _raw.mapPath));

      g.mapPath = [];              // 打乱内存里的路径，验证是「从存档恢复」而不是「碰巧还在」
      continueRun();
      __ok('v0.61.20 P2 续档恢复 mapPath',
        Array.isArray(G.mapPath) && G.mapPath.length === 2 && G.mapPath[1].c === 1, JSON.stringify(G.mapPath));

      // 老存档：字段整个不存在 —— 必须降级成空数组，不能是 undefined（连线代码会 .length）
      var _old = readRun(); delete _old.mapPath;
      Store.setJSON(RUN_KEY, _old);
      continueRun();
      __ok('v0.61.20 P2 老存档无 mapPath → 降级为空数组',
        Array.isArray(G.mapPath) && G.mapPath.length === 0, String(G.mapPath));
      clearRunSave();
    } catch (exP2) {
      __ok('v0.61.20 P2 地图路径用例执行未抛错', false, String(exP2 && exP2.message));
    } finally {
      startBattle = __realStartBattle; MAP = __savedMAP; SCENE = 'map';
    }
    __ok('v0.61.20 P2 newState 自带空 mapPath', Array.isArray(newState().mapPath) && newState().mapPath.length === 0);

    /* —— P3 拖拽受击预览：无 DOM 时不炸、函数在位 —— */
    __ok('v0.61.20 P3 showDragPreview / hideDragPreview 已定义',
      typeof showDragPreview === 'function' && typeof hideDragPreview === 'function');
    var _p3threw = false;
    try { hideDragPreview(); } catch (e3) { _p3threw = true; }
    __ok('v0.61.20 P3 hideDragPreview 在无 DOM 环境下安全返回', !_p3threw);
    var _p3threw2 = false;
    try { showDragPreview(0); } catch (e3b) { _p3threw2 = true; }
    __ok('v0.61.20 P3 showDragPreview 无 DRAG/无 DOM 时不抛错', !_p3threw2);
    __ok('v0.61.20 P3 受击预览与卡面徽章同源（previewDamage 仍在位）', typeof previewDamage === 'function');

    /* —— P4 Boss 二阶段转场 —— */
    var __realBPI = bossPhaseIntro, __bpiName = null;
    try {
      bossPhaseIntro = function (n) { __bpiName = n; };
      g = __base('wuseng');
      g.enemies = [makeEnemy(ENEMIES.yanluotianzi, 'yanluotianzi')];
      var _bz = G.enemies[0]; _bz.hp = _bz.maxHp;
      enterPhase2(_bz);
      __ok('v0.61.20 P4 enterPhase2 触发裂印过场且带上 Boss 名讳',
        __bpiName === '阎罗天子', String(__bpiName));
      __ok('v0.61.20 P4 二阶段数值不受过场影响（return 到 60% 血）',
        _bz.phase2 === true && _bz.hp === Math.floor(_bz.maxHp * 0.6), 'hp=' + _bz.hp + '/' + _bz.maxHp);
    } catch (exP4) {
      __ok('v0.61.20 P4 二阶段用例执行未抛错', false, String(exP4 && exP4.message));
    } finally { bossPhaseIntro = __realBPI; }
    __ok('v0.61.20 P4 bossPhaseIntro 是独立的非阻塞函数', typeof bossPhaseIntro === 'function' && bossPhaseIntro.length === 1);

    /* —— P5 战报分类 —— */
    __ok('v0.61.20 P5 分类·伤害', logCat('对 游魂 造成 5 点伤害') === 'dmg', logCat('对 游魂 造成 5 点伤害'));
    __ok('v0.61.20 P5 分类·获得', logCat('获得 4 点格挡') === 'gain', logCat('获得 4 点格挡'));
    __ok('v0.61.20 P5 分类·状态', logCat('对 游魂 施加 2 层诅咒') === 'buff', logCat('对 游魂 施加 2 层诅咒'));
    __ok('v0.61.20 P5 分类·分隔线', logCat('—— 第 2 回合 ——') === 'sep', logCat('—— 第 2 回合 ——'));
    __ok('v0.61.20 P5 认不出的行保持空类（筛选时永远显示）',
      logCat('阎罗天子堕入轮回') === '', '[' + logCat('阎罗天子堕入轮回') + ']');
    __ok('v0.61.20 P5 伤害优先于状态（一句话里两者都有的归伤害）',
      logCat('造成 5 点伤害并施加 2 层诅咒') === 'dmg', logCat('造成 5 点伤害并施加 2 层诅咒'));
    var _lf = { dmg: true, gain: false, buff: false };
    var _keys = LOG_CATS.map(function (p) { return p[0]; }).filter(function (k) { return _lf[k]; });
    __ok('v0.61.20 P5 筛选键提取（只留勾中的）', _keys.length === 1 && _keys[0] === 'dmg', JSON.stringify(_keys));
    __ok('v0.61.20 P5 日志渲染函数在位', typeof renderLogBox === 'function' && typeof toggleLogFilter === 'function');

    /* —— P8 条件引导气泡：每个键只弹一次、落盘、四类触发点都接上 —— */
    function __tipReset() { TIPS_SEEN = null; try { Store.set(TIPS_KEY, '{}'); } catch (e) {} TIPS_SEEN = null; }
    SCENE = 'battle';
    __tipReset();
    __ok('v0.61.20 P8 首次触发返回 true', tipOnce('block', 'x') === true);
    __ok('v0.61.20 P8 同键第二次不再弹', tipOnce('block', 'x') === false);
    __ok('v0.61.20 P8 不同键各自独立', tipOnce('curse', 'x') === true);
    __ok('v0.61.20 P8 已落盘（换局不重弹）',
      (Store.getJSON(TIPS_KEY) || {}).block === 1, JSON.stringify(Store.getJSON(TIPS_KEY)));

    __tipReset(); SCENE = 'battle';
    g = __base('wuseng');
    gainBlock(3);
    __ok('v0.61.20 P8 gainBlock 触发「格挡」提示', (Store.getJSON(TIPS_KEY) || {}).block === 1);

    __tipReset(); SCENE = 'battle';
    g = __base('tianshi'); __fresh();
    applyCurse(G.enemies[0], 2);
    __ok('v0.61.20 P8 applyCurse 触发「诅咒」提示', (Store.getJSON(TIPS_KEY) || {}).curse === 1);

    __tipReset(); SCENE = 'battle';
    g = __base('ganshiren');
    gainShiqi(1);
    __ok('v0.61.20 P8 gainShiqi 触发「尸气」提示', (Store.getJSON(TIPS_KEY) || {}).shiqi === 1);

    __tipReset(); SCENE = 'battle';
    g = __base('ganshiren');
    addSummon({ type: 'zhiren', v: 3, dur: 2 });
    __ok('v0.61.20 P8 addSummon 触发「召唤物」提示', (Store.getJSON(TIPS_KEY) || {}).summon === 1);

    // 气泡只在战斗里弹：非战斗场景不写盘、不画 DOM，但仍返回 true（提示「已消费」）
    __tipReset(); SCENE = 'map';
    __ok('v0.61.20 P8 非战斗场景仍消费提示位（返回 true）', tipOnce('summon', 'x') === true);
    __ok('v0.61.20 P8 非战斗场景不画气泡（DOM 无 #tip-bubble）',
      !document.getElementById('tip-bubble') || !document.getElementById('tip-bubble').classList
        || !document.getElementById('tip-bubble').classList.contains('show'));
    SCENE = 'map';
    __tipReset();

    /* —— P2 连线 / P6 / P7 / P9 —— 无 DOM，只能确认入口在位 —— */
    __ok('v0.61.20 P2 drawMapLinks 已定义且在无 svg 环境下安全返回',
      typeof drawMapLinks === 'function' && (function () { try { drawMapLinks(); return true; } catch (e) { return false; } })());
    __ok('v0.61.20 P6 长按放大的「升级后」对比行有内容可比（升级前后文案不同）',
      (function () { var cu = __card('leifu'); return !!cu && cu.t(true) !== cu.t(false); })());
    // P7 敌人热区 / P9 色弱微调是纯 CSS，列进 更新日志.md 的浏览器复核清单

"""

sub('  rep.pass = _p; rep.fail = _f;\n', BLOCK + '  rep.pass = _p; rep.fail = _f;\n', '批3 断言块')

P2 = P + '.check.js'
io.open(P2, 'w', encoding='utf-8', newline='').write(s)
r = subprocess.run(['node', '--check', P2], capture_output=True, text=True)
if r.returncode != 0:
    os.remove(P2); print('NODE CHECK FAIL'); print(r.stdout, r.stderr); sys.exit(1)
os.replace(P2, P)
print('OK', ' / '.join(log))
