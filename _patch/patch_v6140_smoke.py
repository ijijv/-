# -*- coding: utf-8 -*-
"""v0.61.40 冒烟：①修 1 条被改动的旧断言（播种形式变了）②追加 v0.61.40 断言组。

铁律：锚点 count==1；全或无；换行归一。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, '_patch', 'smoke_runner.js')
raw = io.open(P, encoding='utf-8').read()
nl = '\r\n' if '\r\n' in raw else '\n'
b = raw.replace('\r\n', '\n')
errs = []


def sub(old, new, label, n=1):
    global b
    c = b.count(old)
    if c != n:
        errs.append('%s —— 命中 %d 次（期望 %d）' % (label, c, n))
        return
    b = b.replace(old, new)


# ── ① 旧断言：v0.61.06 检查的是源码字面量 seedRng(rngSeedNow())，v0.61.40 改成
#      先取 __sd、再 seedRng(__sd)、顺手 buildActs(__sd) —— 断言改到今天的形式，意图不变 ──
sub('''    __ok('v0.61.06 新局/无尽开局各自播种',
      confirmNewGame.toString().indexOf('seedRng(rngSeedNow())') >= 0 &&
      startEndless.toString().indexOf('seedRng(rngSeedNow())') >= 0);''',
    '''    __ok('v0.61.06 新局/无尽开局各自播种（v0.61.40：改成先取 __sd 再 seedRng(__sd)，顺带按种子生成地图）',
      confirmNewGame.toString().indexOf('rngSeedNow()') >= 0 &&
      confirmNewGame.toString().indexOf('seedRng(__sd)') >= 0 &&
      confirmNewGame.toString().indexOf('buildActs(__sd)') >= 0 &&
      confirmNewGame.toString().indexOf('G.mapSeed=__sd') >= 0 &&
      startEndless.toString().indexOf('rngSeedNow()') >= 0 &&
      startEndless.toString().indexOf('seedRng(__sd)') >= 0 &&
      startEndless.toString().indexOf('G.mapSeed=__sd') >= 0);''',
    '旧断言 播种形式')

# ── ② 追加 v0.61.40 断言组 ──
BLOCK = r'''
  /* ====================================================================
   * v0.61.40：地图随机化（杀戮尖塔式树状图 + 逐层迷雾）+ hpCost 自动对拍 + 反震/业火补血怒
   * ==================================================================== */
  (function () {
    function __bossKey(k) { return !!(ENEMIES[k] && ENEMIES[k].boss); }
    function __eliteKey(k) { return !!(ENEMIES[k] && ENEMIES[k].elite); }
    function __minionsOK(pool) {
      return Array.isArray(pool) && pool.length > 0 && pool.every(function (k) { return !__bossKey(k) && !__eliteKey(k); });
    }

    /* ============ A. 生成器不变量（3 幕 × 20 种子）============ */
    var badA = [];
    for (var a1 = 1; a1 <= 3; a1++) {
      for (var s1 = 1; s1 <= 20; s1++) {
        var M1 = genAct(a1, s1);
        if (M1.length !== 14) badA.push('行数=' + M1.length);
        for (var r1 = 0; r1 < M1.length; r1++) {
          if (!M1[r1] || M1[r1].length < 1 || M1[r1].length > 4) badA.push('行宽@' + r1);
          for (var c1 = 0; c1 < M1[r1].length; c1++) {
            var n1 = M1[r1][c1];
            if (!n1) { badA.push('空洞@' + r1 + ',' + c1); continue; }
            if (r1 < 13 && (!n1.next || !n1.next.length)) badA.push('死路@' + r1 + ',' + c1);
            if (!n1.prev) badA.push('缺 prev@' + r1 + ',' + c1);
            for (var k1 = 0; k1 < (n1.next || []).length; k1++) {
              var j1 = n1.next[k1];
              if (j1 < 0 || j1 >= M1[r1 + 1].length || !M1[r1 + 1][j1]) { badA.push('越界边@' + r1 + ',' + c1); continue; }
              if ((M1[r1 + 1][j1].prev || []).indexOf(c1) < 0) badA.push('镜像破@' + r1 + ',' + c1 + '->' + j1);
            }
            for (var q1 = 1; q1 < (n1.next || []).length; q1++) {
              if (n1.next[q1 - 1] > n1.next[q1]) badA.push('next 未升序@' + r1 + ',' + c1);
            }
          }
          // 不交叉：i<i' ⇒ max(next_i) <= min(next_i')（旧「列差≤1」规则本身是交叉的，这里是真修好）
          for (var i1 = 0; i1 < M1[r1].length; i1++) {
            if (!M1[r1][i1].next.length) continue;
            for (var i2 = i1 + 1; i2 < M1[r1].length; i2++) {
              if (!M1[r1][i2].next.length) continue;
              if (Math.max.apply(null, M1[r1][i1].next) > Math.min.apply(null, M1[r1][i2].next)) badA.push('交叉边@' + r1 + ':' + i1 + '/' + i2);
            }
          }
        }
        if (M1[13].length !== 1) badA.push('末层宽=' + M1[13].length);
        if (M1[13][0].t !== 'boss') badA.push('末层非 boss=' + M1[13][0].t);
        if (!M1[13][0].e || M1[13][0].e.length !== 1 || !__bossKey(M1[13][0].e[0])) badA.push('boss key 非法');
      }
    }
    __ok('v0.61.40 生成器 行数14/行宽1~4/末层1个boss（3幕×20种子）', badA.length === 0, badA.slice(0, 6).join(' | '));
    var badCross = badA.filter(function (x) { return x.indexOf('交叉边') === 0; });
    __ok('v0.61.40 生成器 连边不交叉（i<i\' ⇒ j<=j\'）', badCross.length === 0, badCross.slice(0, 6).join(' | '));
    var badMirror = badA.filter(function (x) { return x.indexOf('镜像破') === 0; });
    __ok('v0.61.40 生成器 next/prev 互为镜像', badMirror.length === 0, badMirror.slice(0, 6).join(' | '));
    var badDead = badA.filter(function (x) { return x.indexOf('死路') === 0; });
    __ok('v0.61.40 生成器 非末层无死路（每格 next 非空）', badDead.length === 0, badDead.slice(0, 6).join(' | '));

    /* —— 无孤岛 / 类型合法 / 首层全普通战 —— */
    var badB = [];
    for (var a2 = 1; a2 <= 3; a2++) {
      var M2 = genAct(a2, 7);
      for (var c2 = 0; c2 < M2[0].length; c2++) {
        if (M2[0][c2].t !== 'fight') badB.push('首层非普通战=' + M2[0][c2].t);
        if (!__minionsOK(M2[0][c2].e)) badB.push('首层敌人池非法');
      }
      for (var r2 = 1; r2 < M2.length; r2++) {
        for (var c3 = 0; c3 < M2[r2].length; c3++) {
          var n2 = M2[r2][c3];
          if (!n2.prev || !n2.prev.length) badB.push('孤岛@' + r2 + ',' + c3);
          if (n2.t === 'fight') {
            if (!Array.isArray(n2.e) || n2.e.length < 2 || n2.e.length > 3) badB.push('普通战敌人数=' + (n2.e || []).length);
            else if (!__minionsOK(n2.e)) badB.push('普通战混入 boss/精英@' + r2 + ',' + c3);
          } else if (n2.t === 'elite') {
            if (!n2.e.length || !__eliteKey(n2.e[0])) badB.push('精英节点首 key 非精英@' + r2 + ',' + c3);
            if (n2.e.length > 2) badB.push('精英节点敌人过多@' + r2 + ',' + c3);
          } else if (n2.t !== 'camp' && n2.t !== 'shop' && n2.t !== 'unknown' && n2.t !== 'boss') {
            badB.push('非法节点类型 ' + n2.t);
          }
        }
      }
    }
    __ok('v0.61.40 生成器 无孤岛/首层全普通战/节点类型合法/精英是独立类型', badB.length === 0, badB.slice(0, 6).join(' | '));

    /* —— 每个节点都能一路向上走到 Boss —— */
    var badC = [];
    for (var a3 = 1; a3 <= 3; a3++) {
      var M3 = genAct(a3, 11);
      for (var r3 = 0; r3 < M3.length; r3++) {
        for (var c4 = 0; c4 < M3[r3].length; c4++) {
          var cur4 = c4, ok4 = true;
          for (var rr4 = r3; rr4 < M3.length - 1; rr4++) {
            var n4 = M3[rr4][cur4];
            if (!n4 || !n4.next || !n4.next.length) { ok4 = false; break; }
            cur4 = n4.next[0];
          }
          if (!ok4) badC.push('到不了 Boss @' + r3 + ',' + c4);
        }
      }
    }
    __ok('v0.61.40 生成器 每个节点都能一路向上到 Boss（不会开局即卡死）', badC.length === 0, badC.slice(0, 6).join(' | '));

    /* —— 每幕配额 —— */
    var badD = [];
    for (var a4 = 1; a4 <= 3; a4++) {
      for (var s4 = 1; s4 <= 20; s4++) {
        var M4 = genAct(a4, s4), cnt4 = { camp: 0, shop: 0, elite: 0, unknown: 0 };
        for (var r4 = 0; r4 < M4.length; r4++) for (var c5 = 0; c5 < M4[r4].length; c5++) {
          var t5 = M4[r4][c5].t;
          if (cnt4[t5] !== undefined) cnt4[t5]++;
        }
        if (cnt4.camp < 1 || cnt4.camp > 3) badD.push('a' + a4 + 's' + s4 + ' camp=' + cnt4.camp);
        if (cnt4.shop < 1 || cnt4.shop > 3) badD.push('a' + a4 + 's' + s4 + ' shop=' + cnt4.shop);
        if (cnt4.elite < 2) badD.push('a' + a4 + 's' + s4 + ' elite=' + cnt4.elite);
        if (cnt4.unknown < 2) badD.push('a' + a4 + 's' + s4 + ' unknown=' + cnt4.unknown);
      }
    }
    __ok('v0.61.40 生成器 每幕配额（camp/shop 各 1~3、elite ≥2、unknown ≥2）', badD.length === 0, badD.slice(0, 6).join(' | '));

    /* ============ B. 可复现 / 隔离 / 池子 ============ */
    __ok('v0.61.40 生成器 同种子完全一致', JSON.stringify(genAct(2, 4242)) === JSON.stringify(genAct(2, 4242)));
    __ok('v0.61.40 生成器 异种子结果不同', JSON.stringify(genAct(2, 4242)) !== JSON.stringify(genAct(2, 4243)));
    __ok('v0.61.40 生成器 三幕互不相同（不再是换皮产物）',
      JSON.stringify(genAct(1, 5)) !== JSON.stringify(genAct(2, 5)) &&
      JSON.stringify(genAct(2, 5)) !== JSON.stringify(genAct(3, 5)));
    (function () {
      var s0 = rngSnapshot();
      genAct(1, 999); genAct(2, 999); genAct(3, 999); genEndlessMap();
      var s1 = rngSnapshot();
      __ok('v0.61.40 生成器**不消耗全局 rng**（rngSnapshot 前后完全不变）',
        JSON.stringify(s0) === JSON.stringify(s1), JSON.stringify(s0) + ' → ' + JSON.stringify(s1));
    })();
    var p2 = actMinionPool(2), p3 = actMinionPool(3);
    __ok('v0.61.40 池 act2 全为非 boss/非精英', __minionsOK(p2), p2.join(','));
    __ok('v0.61.40 池 act3 全为非 boss/非精英', __minionsOK(p3), p3.join(','));
    __ok('v0.61.40 池 act2 ⊆ 无尽小怪池', p2.every(function (k) { return ENDLESS_MINIONS.indexOf(k) >= 0; }), p2.join(','));
    __ok('v0.61.40 池 act3 ⊆ 无尽小怪池', p3.every(function (k) { return ENDLESS_MINIONS.indexOf(k) >= 0; }), p3.join(','));
    var miss5 = ACT1_MINIONS.filter(function (k) { return !ACT2_SWAP[k] || !ACT3_SWAP[k]; });
    __ok('v0.61.40 换幕表覆盖全部 ACT1_MINIONS（防 swap[k]||k 静默留原 key）', miss5.length === 0, miss5.join(','));
    __ok('v0.61.40 ACTS 恒为 3 张（否则 advanceAct 会立刻判通关）', ACTS.length === 3, 'len=' + ACTS.length);
    __ok('v0.61.40 ELITES_BY_ACT 三幕齐备且都是精英',
      [1, 2, 3].every(function (a) { return Array.isArray(ELITES_BY_ACT[a]) && ELITES_BY_ACT[a].length > 0 && ELITES_BY_ACT[a].every(__eliteKey); }));
    __ok('v0.61.40 BOSS_POOL 三幕齐备且都是 boss',
      [1, 2, 3].every(function (a) { return Array.isArray(BOSS_POOL[a]) && BOSS_POOL[a].length > 0 && BOSS_POOL[a].every(__bossKey); }));

    /* ============ C. 迷雾（手造 4 层 fixture；用完必须还原 MAP）============ */
    var KEEP = MAP;
    function fx() {
      return [
        [{ t: 'fight', e: ['youhun', 'jiangshi'], next: [0], prev: [] },
         { t: 'shop', e: [], next: [1, 2], prev: [] }],
        [{ t: 'camp', e: [], next: [0], prev: [0] },
         { t: 'unknown', e: [], next: [0], prev: [1] },
         { t: 'elite', e: ['yecha'], next: [0], prev: [1] }],
        [{ t: 'fight', e: ['youhun', 'huyao'], next: [0], prev: [0, 1, 2] }],
        [{ t: 'boss', e: ['jiangwang'], next: [], prev: [0] }]
      ];
    }
    try {
      G = __base('yincha'); G.act = 1; G.mapRow = 0; G.mapCol = -1; G.mapPath = [];
      MAP = fx();
      __ok('v0.61.40 迷雾 首层整层可选', mapReachable(0, 0) && mapReachable(0, 1));
      __ok('v0.61.40 迷雾 开局 = 首层整层 choice + 第 2 层 ? 剪影（第 3 层起全 hidden）',
        fogTier(0, 0) === 'choice' && fogTier(0, 1) === 'choice' &&
        fogTier(1, 0) === 'preview' && fogTier(2, 0) === 'hidden' && fogTier(3, 0) === 'hidden');
      __ok('v0.61.40 迷雾 preview = 本层可走节点 next 的并集',
        JSON.stringify(mapPreviewSet().slice().sort()) === JSON.stringify([0, 1, 2]));
      __ok('v0.61.40 迷雾 第 2 层三格都是 preview（只见 ? 剪影）',
        fogTier(1, 0) === 'preview' && fogTier(1, 1) === 'preview' && fogTier(1, 2) === 'preview');
      __ok('v0.61.40 迷雾 可见 = 非 hidden', fogVisible(0, 0) && fogVisible(1, 2) && !fogVisible(2, 0));

      // 走到 (0,0)
      G.mapPath = [{ r: 0, c: 0 }]; G.mapRow = 1; G.mapCol = 0;
      __ok('v0.61.40 迷雾 可达只看上一层的 next（上一格是 0 号 → 只有 1,0 能走）',
        mapReachable(1, 0) && !mapReachable(1, 1) && !mapReachable(1, 2));
      __ok('v0.61.40 迷雾 甩掉的同层节点也是 hidden（不泄露未解锁拓扑）',
        fogTier(1, 1) === 'hidden' && fogTier(1, 2) === 'hidden');
      __ok('v0.61.40 迷雾 走过的格子是 past', fogTier(0, 0) === 'past');
      __ok('v0.61.40 迷雾 没走过的下层格是 hidden（不是 past）', fogTier(0, 1) === 'hidden');
      __ok('v0.61.40 迷雾 进一步 preview 跟着新可走节点走',
        JSON.stringify(mapPreviewSet()) === JSON.stringify([0]) && fogTier(2, 0) === 'preview');

      G.mapCol = -1; G.mapRow = 1;
      __ok('v0.61.40 迷雾 无上一层列历史（旧档降级 / 换幕）→ 整层可选，不死在地图页',
        mapReachable(1, 0) && mapReachable(1, 1) && mapReachable(1, 2));
      G.mapCol = 99;
      __ok('v0.61.40 迷雾 上一列越界 → 放宽整层可选（防软锁）',
        mapReachable(1, 0) && mapReachable(1, 1) && mapReachable(1, 2));
      __ok('v0.61.40 迷雾 越界列/越界层本身不可达',
        !mapReachable(1, 9) && !mapReachable(-1, 0) && !mapReachable(1, -1) && !mapReachable(9, 0));
    } finally {
      MAP = KEEP;   // ⚠ 不还原的话，后面的 real-run 段会拿到这张小图
    }

    /* ============ D. UI：去信息 + 留空槽 ============ */
    var lblBad = Object.keys(NODE_LABEL).filter(function (k) { return String(NODE_LABEL[k]).indexOf('×') >= 0; });
    __ok('v0.61.40 UI 节点文案不再含敌人数量（无 ×N）', lblBad.length === 0, lblBad.join(','));
    __ok('v0.61.40 UI 六种节点类型文案齐备',
      ['fight', 'elite', 'unknown', 'camp', 'shop', 'boss'].every(function (k) { return !!NODE_LABEL[k]; }));
    var iconBad = Object.keys(NODE_ICON).filter(function (k) { return String(NODE_ICON[k]).length > 0; });
    __ok('v0.61.40 UI NODE_ICON 是**留空槽**（全空串；用户给图后只改这一张表）', iconBad.length === 0, iconBad.join(','));
    __ok('v0.61.40 UI NODE_ICON 六键齐备（给图时不会漏填）',
      ['fight', 'elite', 'unknown', 'camp', 'shop', 'boss'].every(function (k) { return typeof NODE_ICON[k] === 'string'; }));
    __ok('v0.61.40 UI 背景表含 endless（否则 act4 会 404 丢背景图）',
      MAP_BG.endless === 'act3' && MAP_BG[1] === 'act1' && MAP_BG[2] === 'act2' && MAP_BG[3] === 'act3');
    __ok('v0.61.40 UI nodeLabel 与敌人库解耦（不再触碰 ENEMIES）',
      String(nodeLabel).indexOf('ENEMIES') < 0, String(nodeLabel));
    __ok('v0.61.40 UI 地图页提示文案已改（不再说「只能走进相邻列」）',
      String(showMap).indexOf('只能走进相邻列的节点') < 0 && String(showMap).indexOf('沿连线向上') >= 0);
    __ok('v0.61.40 UI 连线改为读节点自带的 next（不再用 |列差|<=1 猜）',
      String(drawMapLinks).indexOf('.next') >= 0 && String(drawMapLinks).indexOf('Math.abs(c2-c)') < 0);
    __ok('v0.61.40 UI nodeAt 改成 data-r/data-c 属性查询（行宽可变后位置法会错位）',
      String(drawMapLinks).indexOf('data-r="') >= 0 && String(drawMapLinks).indexOf('querySelector') >= 0);
    __ok('v0.61.40 UI nodeAt 仍显式排除 .empty（它有尺寸，不排除会画到看不见的格子上）',
      String(drawMapLinks).indexOf("contains('empty')") >= 0);

    /* ============ E. 续档迁移 ============ */
    var realGet = Store.getJSON;
    function fakeSave(d) {
      Store.getJSON = function (k) { return k === RUN_KEY ? d : null; };
    }
    // ① 旧档（v:2，无 mapSeed）+ 越界 mapCol
    try {
      fakeSave({
        v: 2, scene: 'map', act: 2, mapRow: 5, mapCol: 99, mapPath: [{ r: 0, c: 0 }],
        hero: 'yincha', hp: 41, maxHp: 80, gold: 77, energy: 3, block: 0,
        deck: [], hand: [], drawPile: [], discard: [], enemies: [], target: 0, turn: 0, battleStartHp: 41,
        summons: [], relics: [], potions: [], log: [], rng: { s: 123456, n: 9 }
      });
      continueRun();
      __ok('v0.61.40 旧档 铸了新地图种子', (G.mapSeed || 0) > 0, 'mapSeed=' + G.mapSeed);
      __ok('v0.61.40 旧档 列号降级为 -1（旧列号对新图毫无意义）', G.mapCol === -1, 'mapCol=' + G.mapCol);
      __ok('v0.61.40 旧档 路径清空', (G.mapPath || []).length === 0, 'len=' + (G.mapPath || []).length);
      __ok('v0.61.40 旧档 地图仍是 14 层', MAP.length === 14, 'len=' + MAP.length);
      __ok('v0.61.40 旧档 进度未丢（幕/层/生命/金币都还在）',
        G.act === 2 && G.mapRow === 5 && G.hp === 41 && G.gold === 77,
        'act=' + G.act + ' row=' + G.mapRow + ' hp=' + G.hp + ' gold=' + G.gold);
      var anyReach = false;
      for (var mc = 0; mc < MAP[G.mapRow].length; mc++) { if (mapReachable(G.mapRow, mc)) anyReach = true; }
      __ok('v0.61.40 旧档 本层至少有一个能走（不会死在地图页）', anyReach);
    } catch (e) {
      __ok('v0.61.40 旧档迁移 continueRun 未抛错', false, String(e && e.message));
    }
    // ② 新档（v:3，带 mapSeed）→ 地图必须逐字节复现
    try {
      var SD = 0xBEEF;
      fakeSave({
        v: 3, scene: 'map', act: 2, mapRow: 3, mapCol: 1, mapPath: [{ r: 0, c: 1 }], mapSeed: SD,
        hero: 'wuseng', hp: 55, maxHp: 80, gold: 10, energy: 3, block: 0,
        deck: [], hand: [], drawPile: [], discard: [], enemies: [], target: 0, turn: 0, battleStartHp: 55,
        summons: [], relics: [], potions: [], log: [], rng: { s: 1, n: 1 }
      });
      continueRun();
      __ok('v0.61.40 新档 mapSeed 原样回填', G.mapSeed === SD, 'mapSeed=' + G.mapSeed);
      __ok('v0.61.40 新档 地图由 mapSeed 逐字节复现',
        JSON.stringify(MAP) === JSON.stringify(genAct(2, deriveSeed(SD, 2))));
      __ok('v0.61.40 新档 列号与路径原样保留（不降级）',
        G.mapCol === 1 && (G.mapPath || []).length === 1, 'col=' + G.mapCol + ' path=' + (G.mapPath || []).length);
    } catch (e) {
      __ok('v0.61.40 新档复现 continueRun 未抛错', false, String(e && e.message));
    }
    Store.getJSON = realGet;
    try { Store.del(RUN_KEY); } catch (e) {}

    /* ============ F. chooseNode 二次校验 ============ */
    var KEEP2 = MAP;
    try {
      G = __base('yincha'); G.act = 1; G.mapRow = 1; G.mapCol = 0; G.mapPath = []; SCENE = 'map';
      MAP = fx();
      var hp0 = G.hp;
      chooseNode(2);   // 不可达
      __ok('v0.61.40 chooseNode 不可达 → 不进战斗 / 不记路径 / 不改列 / 不掉血',
        SCENE !== 'battle' && (G.mapPath || []).length === 0 && G.mapCol === 0 && G.hp === hp0,
        'scene=' + SCENE + ' path=' + (G.mapPath || []).length + ' col=' + G.mapCol + ' hp=' + G.hp);
      chooseNode(9);   // 越界
      __ok('v0.61.40 chooseNode 越界列被挡下', SCENE !== 'battle' && (G.mapPath || []).length === 0);
      chooseNode(-1);
      __ok('v0.61.40 chooseNode 负列被挡下', SCENE !== 'battle' && (G.mapPath || []).length === 0);
    } finally {
      MAP = KEEP2; SCENE = 'map';
    }
    __ok('v0.61.40 chooseNode 有可达性二次校验（源码级）',
      String(chooseNode).indexOf('mapReachable') >= 0);
    __ok('v0.61.40 chooseNode 走 node.e（精英与普通战同构，Boss 不再现抽）',
      String(chooseNode).indexOf("node.t==='fight'||node.t==='elite'") >= 0 &&
      String(chooseNode).indexOf("node.t==='elite'") >= 0);

    /* ============ G. hpCost 自动对拍（三组）============ */
    // 现状：30_engine.js 的 playCard 只把 c.hpCost(u) 拿来做「以命相搏」弹窗、**不实扣**；
    //       真扣血在每张牌 eff 里的 loseHp(n)。两处手工同步、此前 0 断言 —— 这组把它钉死。
    var HP_CARDS = CARDS.filter(function (c) { return typeof c.hpCost === 'function'; });
    __ok('v0.61.40 hpCost 卡恰为 18 张（新增未登记会立刻红）', HP_CARDS.length === 18, '实际 ' + HP_CARDS.length);
    var noLose = HP_CARDS.filter(function (c) { return String(c.eff).indexOf('loseHp') < 0; });
    __ok('v0.61.40 hpCost 卡全部在 eff 里真的调用 loseHp（静态扫源码）', noLose.length === 0,
      noLose.map(function (c) { return c.id; }).join(','));

    var __setup = function (hero, withEnemies) {
      G = newState();
      G.hero = hero; G.act = 1; G.endless = false; G.relics = [];
      G.hp = 60; G.maxHp = 80; G.block = 0; G.energy = 9; G.gold = 0;
      G.deck = []; G.drawPile = []; G.hand = []; G.discard = []; G.summons = [];
      G.lastDrawnCards = []; G.尸气 = 0; G.xuenu = 0;
      CURSE_THIS_TURN = 0;
      G.hpLostTurn = 0; G.blockGainedTurn = 0; G.summonsMadeTurn = 0;
      G.xuejiArmed = false; G.endBlockKind = null; G.xiejia = 0; G.thorns = 0;
      G.hitHeal = 0; G.hitCurse = 0; G.hitShiqi = 0; G.hitRage = 0; G.hitBlock = 0; G.nextBlock = 0;
      G.dodge = 0; G.dodgeShiqi = 0; G.dodgeNextBlock = 0; G.dodgeHealRage = 0; G.dodgeCurse = 0;
      G.ranhunType = null; G.ranhunSelf = null; G.bloodPact = 0; G.retain = 0;
      G.zhouyuA = false; G.turnAtkBuff = 0; G.karmaFire = 0; G.burn = 0; G.weak = 0; G.gouhun = 0;
      G.enemies = withEnemies ? ['youhun', 'jiangshi'].map(function (k) { return makeEnemy(ENEMIES[k], k); }) : [];
      G.target = G.enemies.length ? 0 : -1;
      return G;
    };

    // 组 1：逐张 × 逐英雄 × 两升级档，decl === 实扣（量真实 G.hp 下降 —— 连「声明 5 实际回血 5」也抓得到）
    var drift = [], safeList = [], checked = 0;
    var NO_ENEMY_SAFE = ['huofu', 'tianlei', 'tiebushan', 'shihunzhou', 'zhongkui', 'zhenyaoling'];
    __HEROES.forEach(function (hero) {
      HP_CARDS.forEach(function (card) {
        [false, true].forEach(function (u) {
          var decl = card.hpCost(u);
          if (!(decl > 0)) return;
          checked++;
          // ① 有敌人：正常出牌路（doPlayCard 而非 playCard —— 后者会先弹「以命相搏」拦下）
          var lostA = null;
          try {
            __setup(hero, true);
            var cc = Object.assign({}, card); cc.up = !!u;
            G.hand = [cc]; G.drawPile = []; G.discard = []; G.exhausted = [];
            var hA = G.hp;
            try { doPlayCard(0); } catch (e) {}
            lostA = hA - G.hp;
          } catch (e) { lostA = 'ERR:' + (e && e.message); }
          if (lostA !== decl) drift.push(hero + '/' + card.id + (u ? '(升)' : '') + ' decl=' + decl + ' 实扣=' + lostA);
          // ② 无敌人：直接调 eff（不能走 doPlayCard —— 场上无敌会被当场判胜并回 8 血）
          var lostB = null;
          try {
            __setup(hero, false);
            var c2 = Object.assign({}, card); c2.up = !!u;
            var hB = G.hp;
            try { c2.eff(u, c2); } catch (e) {}
            lostB = hB - G.hp;
          } catch (e) { lostB = 'ERR:' + (e && e.message); }
          safeList.push({ hero: hero, id: card.id, decl: decl, lostB: lostB });
        });
      });
    });
    __ok('v0.61.40 hpCost 逐张×逐英雄×两升级档 声明 === 实扣（' + checked + ' 条）',
      drift.length === 0, drift.slice(0, 5).join(' | '));

    // 组 3：无敌人白名单 —— 已知 6 张的 curEnemy() 守卫排在 loseHp 之前，空场时整段不执行
    var whitelistHit = [], othersOff = [];
    safeList.forEach(function (r) {
      var isSafe = NO_ENEMY_SAFE.indexOf(r.id) >= 0;
      if (isSafe) { if (r.lostB !== 0) whitelistHit.push(r.id + '(' + r.hero + ')=' + r.lostB); }
      else if (r.lostB !== r.decl) othersOff.push(r.id + '(' + r.hero + ') decl=' + r.decl + ' 实扣=' + r.lostB);
    });
    __ok('v0.61.40 空场白名单 6 张（火符/天雷/铁布衫/蚀魂咒/钟馗/镇妖铃）确实**一分不扣**',
      whitelistHit.length === 0, whitelistHit.slice(0, 5).join(' | '));
    __ok('v0.61.40 空场 其余扣血牌**必须照扣**（未被 curEnemy 守卫拦下）',
      othersOff.length === 0, othersOff.slice(0, 5).join(' | '));

    /* ============ H. 反震 / 业火 补齐成 1:1 转血怒 ============ */
    (function () {
      G = __base('yincha'); __fresh();
      var e0 = G.enemies[0];
      e0.affixes = [{ id: 'fanzhen', tier: 1 }];   // tier1 = 反弹 3
      G.hp = 60; G.xuenu = 0; G.totalHpLost = 0;
      G.turnStats = { dmgTaken: 0, blocked: 0, dealt: 0, kills: [] };
      dealDamageTo(e0, 5);
      __ok('v0.61.40 反震(阴差) 失血 3 → 等额血怒 +3', G.hp === 57 && G.xuenu === 3,
        'hp=' + G.hp + ' xuenu=' + G.xuenu);
      __ok('v0.61.40 反震 仍照旧喂 totalHpLost / dmgTaken（喂嗜血·天雷正法，不受本次改动影响）',
        G.totalHpLost === 3 && G.turnStats.dmgTaken === 3,
        'totalHpLost=' + G.totalHpLost + ' dmgTaken=' + G.turnStats.dmgTaken);
    })();
    (function () {
      G = __base('wuseng'); __fresh();
      var e1 = G.enemies[0];
      e1.affixes = [{ id: 'fanzhen', tier: 1 }];
      G.hp = 60; G.xuenu = 0;
      G.turnStats = { dmgTaken: 0, blocked: 0, dealt: 0, kills: [] };
      dealDamageTo(e1, 5);
      __ok('v0.61.40 反震(非阴差) 照旧只掉血、不给血怒', G.hp === 57 && (G.xuenu || 0) === 0,
        'hp=' + G.hp + ' xuenu=' + G.xuenu);
    })();
    (function () {
      G = __base('yincha');
      G.enemies = [makeEnemy(ENEMIES['xiuluowang'], 'xiuluowang')];
      G.target = 0; G.karmaFire = 1;
      G.hp = 60; G.xuenu = 0; G.totalHpLost = 0;
      G.turnStats = { dmgTaken: 0, blocked: 0, dealt: 0, kills: [] };
      dealDamageTo(G.enemies[0], 5);
      __ok('v0.61.40 业火(阴差) 失血 1 → 等额血怒 +1', G.hp === 59 && G.xuenu === 1,
        'hp=' + G.hp + ' xuenu=' + G.xuenu);
    })();
    __ok('v0.61.40 反震/业火 仍是直写 G.hp（有 Math.max(0,…) 下限，不会让自己回合暴毙）',
      String(dealDamageTo).indexOf('Math.max(0,G.hp-r)') >= 0 &&
      String(dealDamageTo).indexOf('Math.max(0,G.hp-1)') >= 0);
    __ok('v0.61.40 反震/业火 **没有**改走 loseHp（否则会连带触发血契/舍身/血祭一串「打出扣血牌」联动）',
      String(dealDamageTo).indexOf('loseHp(') < 0);
  })();

'''

sub('  rep.pass = _p; rep.fail = _f;', BLOCK + '  rep.pass = _p; rep.fail = _f;', '追加 v0.61.40 断言组')

if errs:
    print('!! 有锚点未命中，一个字节都不写：')
    for m in errs:
        print('   -', m)
    sys.exit(1)
io.open(P, 'w', encoding='utf-8', newline='').write(b.replace('\n', nl))
print('OK v0.61.40 冒烟补丁已落地')