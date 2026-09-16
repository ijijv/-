# -*- coding: utf-8 -*-
# v0.57 Block4 召唤批冒烟追加（纸人强化/咒魂/小鬼升级档/五通神/咒雨引爆/尸王死亡）
import io, sys

P = r"C:\Users\HP\Desktop\志怪塔\_patch\smoke_runner.js"
s = io.open(P, 'r', encoding='utf-8').read()

ANCHOR = "      __ok('F#40 镇妖铃 无条件获3尸气', g.尸气 === 3, '尸气=' + g.尸气); })();"
NEW = ANCHOR + """
    // ===== Block4 召唤批 A 列修正（纸人强化/咒魂/小鬼/五通神/咒雨引爆/尸王）=====
    g = __base('ganshiren'); g.尸气 = 3;
    (function () { var cc = __card('zhiren'); cc.eff(false, cc);
      __ok('S#41 纸人 尸气不足3→基础v=2不消耗', g.summons[0].v === 2 && g.尸气 === 3, 'v=' + g.summons[0].v + ' 尸气=' + g.尸气); })();
    g = __base('ganshiren'); g.尸气 = 4;
    (function () { var cc = __card('zhiren'); cc.eff(false, cc);
      __ok('S#41b 纸人 尸气≥4→耗4强化v=5', g.summons[0].v === 5 && g.尸气 === 0, 'v=' + g.summons[0].v + ' 尸气=' + g.尸气); })();
    g = __base('ganshiren'); g.尸气 = 4;
    (function () { var cc = __card('zhiren'); cc.eff(true, cc);
      __ok('S#41c 纸人 升级强化v=7', g.summons[0].v === 7, 'v=' + g.summons[0].v); })();
    g = __base('ganshiren'); g.summons = [{ type: 'zhiren', v: 2, dur: 2 }]; G.enemies.forEach(function (e) { e.curse = 0; });
    (function () { summonAct(g.summons[0]);
      __ok('S#41d 纸人(赶尸人) 攻击不叠诅咒', __sumCurse() === 0, 'curse=' + __sumCurse()); })();
    g = __base('ganshiren');
    (function () { var cc = __card('zhouyin'); cc.eff(false, cc);
      __ok('S#42 咒印 召唤咒魂+获3尸气', g.summons.some(function (x) { return x.type === 'zhouhun'; }) && g.尸气 === 3, '尸气=' + g.尸气); })();
    g = __base('ganshiren');
    (function () { var cc = __card('zhouyin'); cc.eff(true, cc);
      __ok('S#42u 咒印 升级获5尸气', g.尸气 === 5, '尸气=' + g.尸气); })();
    g = __base('ganshiren');
    (function () { var cc = __card('xiaogui'); cc.eff(false, cc);
      __ok('S#43 小鬼 基础v=2', g.summons[0].v === 2, 'v=' + g.summons[0].v); })();
    g = __base('ganshiren');
    (function () { var cc = __card('xiaogui'); cc.eff(false, cc); onSummonDeath(g.summons[0]);
      __ok('S#43d 小鬼死亡 基础给2尸气', g.尸气 === 2, '尸气=' + g.尸气); })();
    g = __base('ganshiren');
    (function () { var cc = __card('xiaogui'); cc.eff(true, cc); onSummonDeath(g.summons[0]);
      __ok('S#43u 小鬼升级 v=4/死亡给3尸气', g.summons[0].v === 4 && g.尸气 === 3, 'v=' + g.summons[0].v + ' 尸气=' + g.尸气); })();
    g = __base('ganshiren');
    (function () { var cc = __card('wutong'); cc.eff(false, cc);
      __ok('S#45 五通神 基础立即5格挡(无尸气)', g.block === 5 && g.尸气 === 0, 'block=' + g.block + ' 尸气=' + g.尸气); })();
    g = __base('ganshiren'); g.尸气 = 5;
    (function () { var cc = __card('wutong'); cc.eff(false, cc);
      __ok('S#45b 五通神 尸气≥5→耗5强化6格挡', g.block === 6 && g.尸气 === 0, 'block=' + g.block + ' 尸气=' + g.尸气); })();
    g = __base('ganshiren'); g.尸气 = 6; var __hp0 = __sumHp();
    (function () { var cc = __card('zhouyu'); cc.eff(false, cc);
      __ok('S#46 咒雨 引爆6尸气→36伤害+清零', g.尸气 === 0 && (__hp0 - __sumHp()) === 36, '尸气=' + g.尸气 + ' dmg=' + (__hp0 - __sumHp())); })();
    g = __base('ganshiren'); g.尸气 = 0;
    (function () { onSummonDeath({ type: 'shi_wang', v: 10, dur: 0 });
      __ok('S#48 尸王消散 不再给2尸气', g.尸气 === 0, '尸气=' + g.尸气); })();
"""

n = s.count(ANCHOR)
if n != 1:
    print('ANCHOR FAIL: 匹配 %d 次（期望 1）' % n); sys.exit(1)
s = s.replace(ANCHOR, NEW)
io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v57_block4e SMOKE DONE')
