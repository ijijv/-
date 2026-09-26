# -*- coding: utf-8 -*-
"""
v0.61.41 补丁（冒烟）：更新 4 条被本批改动打翻的旧断言 + 追加 v0.61.41 断言组
锚点一律 count==1；任一锚点缺失则一个字都不写。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EDITS = []


def E(old, new, note):
    EDITS.append((old, new, note))


# ---- ① NODE_ICON 不再是留空槽 ----
E("""    var iconBad = Object.keys(NODE_ICON).filter(function (k) { return String(NODE_ICON[k]).length > 0; });
    __ok('v0.61.40 UI NODE_ICON 是**留空槽**（全空串；用户给图后只改这一张表）', iconBad.length === 0, iconBad.join(','));
    __ok('v0.61.40 UI NODE_ICON 六键齐备（给图时不会漏填）',
      ['fight', 'elite', 'unknown', 'camp', 'shop', 'boss'].every(function (k) { return typeof NODE_ICON[k] === 'string'; }));""",
  """    // v0.61.41：留空槽时代结束 —— 用户已交付图标，这张表改由 v0.61.41 断言组查（见文件末尾）
    __ok('v0.61.40 UI NODE_ICON 六键齐备（给图时不会漏填）',
      ['fight', 'elite', 'unknown', 'camp', 'shop', 'boss'].every(function (k) { return typeof NODE_ICON[k] === 'string'; }));""",
  '① NODE_ICON 留空槽断言退役')

# ---- ② MAP_BG：地图背景改用用户给的 bg_map.jpg ----
E("""    __ok('v0.61.40 UI 背景表含 endless（否则 act4 会 404 丢背景图）',
      MAP_BG.endless === 'act3' && MAP_BG[1] === 'act1' && MAP_BG[2] === 'act2' && MAP_BG[3] === 'act3');""",
  """    __ok('v0.61.40 UI 背景表含 endless（否则 act4 会 404 丢背景图）',
      !!MAP_BG.endless && !!MAP_BG[1] && !!MAP_BG[2] && !!MAP_BG[3]);""",
  '② 背景表含 endless')

# ---- ③ nodeAt 的 .empty 兜底（现在没有档会渲染它） ----
E("""    __ok('v0.61.40 UI nodeAt 仍显式排除 .empty（它有尺寸，不排除会画到看不见的格子上）',
      String(drawMapLinks).indexOf("contains('empty')") >= 0);""",
  """    __ok('v0.61.40 UI nodeAt 仍显式排除 .empty（v0.61.41 起没有档会渲染它，留着当兜底）',
      String(drawMapLinks).indexOf("contains('empty')") >= 0);""",
  '③ .empty 兜底说明')

# ---- ④ preview 档文案：? 剪影 → 挂锁 ----
E("""      __ok('v0.61.40 迷雾 第 2 层三格都是 preview（只见 ? 剪影）',""",
  """      __ok('v0.61.40 迷雾 第 2 层三格都是 preview（v0.61.41 起改挂 locked.png）',""",
  '④ preview 文案')

# ---- ⑤ 追加 v0.61.41 断言组 ----
E("""  rep.pass = _p; rep.fail = _f;""",
  """  /* ====================================================================
   * v0.61.41：地图视觉用上用户给的素材（图标 / 背景 / 道路）+ 未知关卡直入随机
   *           + 浮字四档全装 + 拖拽预伤害走同一套字形 + 敌人数量随层数走
   * ==================================================================== */
  (function () {
    var SIX = ['fight', 'elite', 'unknown', 'camp', 'shop', 'boss'];

    /* ============ A. 地图素材表（唯一真相源 = NODE_ICON / NODE_ICON_LOCKED / MAP_ROAD_ICON）============ */
    var iconBad = SIX.filter(function (k) { return !/\\.png$/.test(String(NODE_ICON[k] || '')); });
    __ok('v0.61.41 UI NODE_ICON 六键都是 .png 文件名（留空槽时代结束）', iconBad.length === 0, iconBad.join(','));
    __ok('v0.61.41 UI NODE_ICON 指向真实交付的文件名（含用户原图的 ellite 拼法）',
      NODE_ICON.fight === 'combat.png' && NODE_ICON.elite === 'ellite.png' &&
      NODE_ICON.unknown === 'unknown.png' && NODE_ICON.camp === 'rest.png' &&
      NODE_ICON.shop === 'shop.png' && NODE_ICON.boss === 'boss.png',
      JSON.stringify(NODE_ICON));
    __ok('v0.61.41 UI 未解锁用 locked.png（用户给的锁图）', String(NODE_ICON_LOCKED) === 'locked.png');
    __ok('v0.61.41 UI 道路贴图左右两张齐备',
      MAP_ROAD_ICON.left === 'map/path-left.png' && MAP_ROAD_ICON.right === 'map/path-right.png',
      JSON.stringify(MAP_ROAD_ICON));
    __ok('v0.61.41 UI 图标目录前缀只有一处真相（MAP_ICON_DIR）', MAP_ICON_DIR === 'map/');
    __ok('v0.61.41 UI 六种节点都能拼出带 node-ico 的图标 HTML',
      SIX.every(function (k) { return String(nodeHTML({ t: k })).indexOf('node-ico') >= 0; }));
    __ok('v0.61.41 UI 图标走 artImg/assetURL 而不是写死 素材/...（写死的话打包后丢图）',
      String(nodeIconHTML).indexOf('artImg') >= 0 && String(artImg).indexOf('assetURL') >= 0);
    __ok('v0.61.41 UI showMap 未解锁的格子挂 locked.png（不再留白 / 不再显示 ? 剪影）',
      String(showMap).indexOf('NODE_ICON_LOCKED') >= 0 && String(showMap).indexOf('map-node empty') < 0);
    __ok('v0.61.41 UI 节点文案去掉了 emoji 前缀（改用图标表达类型）',
      Object.keys(NODE_LABEL).filter(function (k) { return /[\\u{1F300}-\\u{1FAFF}\\u2600-\\u27BF]/u.test(NODE_LABEL[k]); }).length === 0,
      JSON.stringify(NODE_LABEL));

    /* ============ B. 道路贴图取代自绘 SVG ============ */
    __ok('v0.61.41 UI 连线改成道路贴图（不再自绘 SVG 贝塞尔）',
      String(drawMapLinks).indexOf('MAP_ROAD_ICON') >= 0 &&
      String(drawMapLinks).indexOf('createElementNS') < 0);
    __ok('v0.61.41 UI 连线层由 <svg> 改成 <div>（贴图用 <img>）',
      String(showMap).indexOf('class="map-lines" id="map-lines"') >= 0 &&
      String(showMap).indexOf('<svg class="map-lines"') < 0);
    __ok('v0.61.41 UI 走左走右按终点相对起点的左右选（dx<0 用 path-left）',
      String(drawMapLinks).indexOf("dx<0 ? 'left' : 'right'") >= 0);
    __ok('v0.61.41 UI 贴图按两点夹角旋转对齐（贴图本身是 ±45° 斜路）',
      String(drawMapLinks).indexOf('atan2') >= 0 && String(drawMapLinks).indexOf('rotate(') >= 0);
    __ok('v0.61.41 UI 连线仍只在「两端都可见」时画（不泄露未解锁层的拓扑）',
      String(drawMapLinks).indexOf('fogVisible') >= 0);
    __ok('v0.61.41 UI 三种线语义没丢（暗线 / 金虚线 / 金实线）',
      String(drawMapLinks).indexOf("'link-dim'") >= 0 &&
      String(drawMapLinks).indexOf("'link-reach'") >= 0 &&
      String(drawMapLinks).indexOf("'link-past'") >= 0);

    /* ============ C. 背景：地图改用 bg_map.jpg（setBg 支持扩展名）============ */
    __ok('v0.61.41 背景 带扩展名走原名（jpg 不必转码重压）',
      bgRel('map.jpg') === 'bg/map.jpg' && bgRel('map.jpeg') === 'bg/map.jpeg');
    __ok('v0.61.41 背景 不带扩展名沿用 bg_<name>.png（菜单与战斗三幕零改动）',
      bgRel('menu') === 'bg/bg_menu.png' && bgRel('act1') === 'bg/bg_act1.png' && bgRel('act3') === 'bg/bg_act3.png');
    __ok('v0.61.41 背景 地图表三幕 + 无尽全指向 bg_map.jpg 且 endless 有值（不会 404）',
      MAP_BG[1] === 'map.jpg' && MAP_BG[2] === 'map.jpg' && MAP_BG[3] === 'map.jpg' && MAP_BG.endless === 'map.jpg',
      JSON.stringify(MAP_BG));
    __ok('v0.61.41 背景 战斗场景仍走 act1/2/3（地图换背景没波及战斗）',
      String(setBg).indexOf("'act'+G.act") < 0 &&
      String(continueRun).indexOf("'act'+G.act") >= 0);

    /* ============ D. 浮字：四档全装 + 共用字形件 + 开局预加载 ============ */
    __ok('v0.61.41 浮字 numSplit 拆出符号与数字', (function () {
      var a = numSplit('-12'); return !!a && a.sign === '-' && a.digits === '12';
    })());
    __ok('v0.61.41 浮字 numSplit 认正号', (function () {
      var a = numSplit('+4'); return !!a && a.sign === '+' && a.digits === '4';
    })());
    __ok('v0.61.41 浮字 numSplit 非「纯数字」一律 null（小数/字母/空/只有符号都回落文字）',
      numSplit('12.5') === null && numSplit('1a') === null && numSplit('') === null && numSplit('-') === null);
    __ok('v0.61.41 浮字 四档映射没漂（dmg / hurt / block / heal）',
      numKind('') === 'dmg' && numKind('to-player') === 'hurt' && numKind('block') === 'block' && numKind('heal') === 'heal');
    __ok('v0.61.41 浮字 素材不可用时 numHTML/numAppend 返假值（沙箱里 Image 永不 load ⇒ 必须走文字）',
      numHTML('', '-12') === null && (function () {
        var p = document.createElement('i');
        return numAppend(p, '', '-12') === false;
      })());
    __ok('v0.61.41 浮字 numPrewarm 不抛错，且四档都进了探测（NUM_STATE 四键齐备）', (function () {
      try { numPrewarm(); } catch (e) { return false; }
      return ['dmg', 'hurt', 'block', 'heal'].every(function (k) { return NUM_STATE[k] !== undefined; });
    })());
    __ok('v0.61.41 浮字 飘字与拖拽预伤害共用同一套字形件（不再各写一份 img 拼接）',
      String(floatDamage).indexOf('numAppend') >= 0 && String(showDragPreview).indexOf('numHTML') >= 0);
    __ok('v0.61.41 浮字 拖拽预伤害仍保留文字回落（素材缺失时行为与改动前一致）',
      String(showDragPreview).indexOf("el.textContent='-'+pv.d") >= 0);
    __ok('v0.61.41 浮字 开局就预加载（否则本局第一次飘字必然回落文字）',
      String(numPrewarm).indexOf('numProbe') >= 0);
    __ok('v0.61.41 浮字 设置里有自检按钮，四档各放一次并摊开 NUM_STATE',
      String(numSelfTest).indexOf('to-player') >= 0 && String(numSelfTest).indexOf('NUM_STATE') >= 0 &&
      String(showSettings).indexOf('numSelfTest()') >= 0);
    __ok('v0.61.41 浮字 设置里点明「流畅模式会关掉飘字」（fx() 是飘字的总闸，不写清就会被当成素材没生效）',
      String(showSettings).indexOf('伤害飘字') >= 0 && String(fx).indexOf('lowSpec') >= 0);

    /* ============ E. 敌人数量随层数走 ============ */
    __ok('v0.61.41 敌军 概率表：前 4 层恒 0、第 9 层起 0.85、中间层沿用老口径 0.65',
      ENEMY3_P3[0] === 0 && ENEMY3_P3[3] === 0 && ENEMY3_P3[7] === 0.65 &&
      ENEMY3_P3[9] === 0.85 && ENEMY3_P3[12] === 0.85,
      JSON.stringify(ENEMY3_P3));
    __ok('v0.61.41 敌军 enemy3Chance 越界/非数一律回落 0.65（无尽与老调用点不受影响）',
      enemy3Chance(-1) === 0.65 && enemy3Chance(999) === 0.65 &&
      enemy3Chance(undefined) === 0.65 && enemy3Chance(null) === 0.65);
    var rowBad = [], early3 = 0, earlyN = 0, late3 = 0, lateN = 0, maxEarly = 0;
    for (var a5 = 1; a5 <= 3; a5++) {
      for (var s5 = 1; s5 <= 12; s5++) {
        var M5 = genAct(a5, s5);
        for (var r5 = 0; r5 < 13; r5++) {
          for (var c5 = 0; c5 < M5[r5].length; c5++) {
            var n5 = M5[r5][c5];
            if (n5.t !== 'fight' && n5.t !== 'elite') continue;
            if (r5 <= 3) {
              if (n5.e.length > maxEarly) maxEarly = n5.e.length;
              if (n5.e.length > 2) rowBad.push('a' + a5 + 's' + s5 + '@' + r5 + ',' + c5 + '=' + n5.e.length);
            }
            if (n5.t === 'fight') {
              if (r5 <= 3) { earlyN++; if (n5.e.length === 3) early3++; }
              if (r5 >= 9) { lateN++; if (n5.e.length === 3) late3++; }
            }
          }
        }
      }
    }
    __ok('v0.61.41 敌军 每一幕前 4 层敌人数量不超过 2 个（3 幕 × 12 种子全量扫）',
      rowBad.length === 0, rowBad.slice(0, 6).join(' | '));
    __ok('v0.61.41 敌军 前 4 层最大敌人数量 = 2', maxEarly === 2, 'max=' + maxEarly);
    __ok('v0.61.41 敌军 前期一个 3 只都没有', early3 === 0 && earlyN > 0, 'early3=' + early3 + '/' + earlyN);
    __ok('v0.61.41 敌军 后期 3 只比例明显高于前期（0.85 vs 0）',
      lateN > 0 && late3 / lateN > 0.6, 'late3=' + late3 + '/' + lateN);
    __ok('v0.61.41 敌军 配额与结构没被本批打翻（仍是 14 层 / 末层 1 个 Boss / ACTS 三张）',
      genAct(1, 77).length === 14 && genAct(1, 77)[13].length === 1 &&
      genAct(1, 77)[13][0].t === 'boss' && ACTS.length === 3);

    /* ============ F. 未知关卡直入随机（不再三选一）============ */
    var __keepRng = rng;
    try {
      rng = function () { return 0; };   // 固定抽到 pool[0] = 'well'（古井许愿：扣 8 血 + 给遗物）
      G = __base('yincha'); SCENE = 'map'; G.mapRow = 1; G.mapCol = 0; G.mapPath = [];
      var hpB = G.hp, nRelic = G.relics.length;
      showUnknown();
      __ok('v0.61.41 未知关卡 直接结算（抽到古井许愿 → 扣 8 血），不再等玩家三选一',
        G.hp === hpB - 8, 'hp=' + hpB + '→' + G.hp);
      __ok('v0.61.41 未知关卡 事件真的给了东西（遗物 +1）',
        G.relics.length === nRelic + 1, 'relics=' + nRelic + '→' + G.relics.length);
      __ok('v0.61.41 未知关卡 场景标记仍是 unknown（续档能落回来）', SCENE === 'unknown', 'SCENE=' + SCENE);
      __ok('v0.61.41 未知关卡 源码里不再有 evs / descs 三张卡面',
        String(showUnknown).indexOf('evs') < 0 && String(showUnknown).indexOf('descs') < 0 &&
        String(showUnknown).indexOf('doUnknown(') >= 0);
      __ok('v0.61.41 未知关卡 抽到什么用 floatMsg 报一声（没有三选一预告了，总得让玩家知道）',
        String(showUnknown).indexOf('floatMsg(') >= 0);
    } catch (e) {
      __ok('v0.61.41 未知关卡 直入随机未抛错', false, String(e && e.message));
    } finally {
      rng = __keepRng;
    }
  })();

  rep.pass = _p; rep.fail = _f;""",
  '⑤ 追加 v0.61.41 断言组')


def apply_all():
    path = os.path.join(ROOT, '_patch', 'smoke_runner.js')
    raw = io.open(path, 'r', encoding='utf-8', newline='').read()
    nl = '\r\n' if '\r\n' in raw else '\n'
    body = raw.replace('\r\n', '\n')
    for old, new, note in EDITS:
        cnt = body.count(old)
        if cnt != 1:
            print('[FAIL] 锚点命中 %d 次（期望 1）: %s' % (cnt, note))
            return False
        body = body.replace(old, new)
        print('[ok]   %s' % note)
    out = body if nl == '\n' else body.replace('\n', '\r\n')
    io.open(path, 'w', encoding='utf-8', newline='').write(out)
    print('[write] _patch/smoke_runner.js')
    return True


if __name__ == '__main__':
    sys.exit(0 if apply_all() else 1)