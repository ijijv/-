# -*- coding: utf-8 -*-
# v0.58 Block8a 冒烟：武僧格挡顺序修复 + 初始卡池
#   ① 保留真实 enemyAct 引用（runner 原本把它 stub 掉，测不到回合末结算链）
#   ② 新增断言：先消耗、后存留
#   ③ 新增断言：初始卡池 10 张
import io, sys, subprocess, tempfile, os

P = r"C:\Users\HP\Desktop\志怪塔\_patch\smoke_runner.js"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# 1) 捕获真实 enemyAct（供武僧格挡顺序断言使用）
EDITS.append((
"""  try { enemyAct = __sil; } catch (e) {} // 免触发 enemyAct->startTurn 连锁；finishEndTurn 骑乘结算仍原样执行""",
"""  var __realEnemyAct = enemyAct; // 保留真实引用（默认 stub 掉，避免 enemyAct->startTurn 连锁）
  try { enemyAct = __sil; } catch (e) {} // 免触发 enemyAct->startTurn 连锁；finishEndTurn 骑乘结算仍原样执行"""))

# 2) 追加断言
EDITS.append((
"""  rep.pass = _p; rep.fail = _f;""",
"""  /* ============ v0.58 Block8a：武僧（苦僧 B 列） ============ */
  (function () {
    // ---- ① 格挡结算顺序：先由敌人攻击消耗，再算存留最多 3 点 ----
    g = __base('wuseng');
    __fill();
    g.enemies = [g.enemies[0]];
    var _e0 = g.enemies[0]; _e0.hp = 200; _e0.maxHp = 200; _e0.intent = { type: 'attack', v: 6 };
    g.block = 10; g.hp = 60;
    __realEnemyAct();
    // 正确顺序：10 格挡挡下 6 → 剩 4 → 存留压到 3 → 下回合开始 +2 = 5，且没有掉血
    // 旧顺序（bug）：先压到 3 → 6 点攻击打穿 → 掉 3 血 → 下回合开始 +2 = 2
    __ok('B① 苦僧格挡「先消耗后存留」', G.block === 5 && G.hp === 60, 'block=' + G.block + ' hp=' + G.hp);

    // 同场对照：格挡不足以全挡时，多余伤害照常进血
    g = __base('wuseng'); __fill();
    g.enemies = [g.enemies[0]];
    var _e1 = g.enemies[0]; _e1.hp = 200; _e1.maxHp = 200; _e1.intent = { type: 'attack', v: 14 };
    g.block = 10; g.hp = 60;
    __realEnemyAct();
    __ok('B① 苦僧格挡不足时超出部分进血', G.block === 2 && G.hp === 56, 'block=' + G.block + ' hp=' + G.hp);

    // ---- ③ 初始卡池 10 张 ----
    var _wh = HEROES.filter(function (h) { return h.id === 'wuseng'; })[0];
    __ok('B③ 武僧初始卡池 10 张（雷符2 金刚2 金钟罩1 铁布衫1 血契1 反震1 咒雨1 守一1）',
      JSON.stringify(_wh.deck) === JSON.stringify([['leifu', 2], ['jingang', 2], ['jinzhong', 1], ['tiebushan', 1], ['xueqi', 1], ['fanzhen', 1], ['zhouyu', 1], ['shouyi', 1]]),
      JSON.stringify(_wh.deck));
  })();

  rep.pass = _p; rep.fail = _f;"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('SMOKE 断言已更新（Block8a）')
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, s.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
