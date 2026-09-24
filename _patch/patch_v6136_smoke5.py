# -*- coding: utf-8 -*-
"""v0.61.36 冒烟修补（第五轮）：还要把「流畅模式」临时关掉

第四轮换回真 floatDamage 后仍然 spans=0。用 SMOKE_DUMP 直接探了一下：
  {"fx":false,"lowSpec":true,...}
即跑到这里时 **SETTINGS.lowSpec 已被前面某条测试留在 true**（`fx() = !lowSpec`），
而 floatDamage 第一行就是 `if(!fx()) return;` —— 所以在「流畅模式」下它连 span 都不建，这是**正确行为**。
修法：断言期间临时 `SETTINGS.lowSpec = false`，跑完还原（不能把状态留给后面的断言）。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, '_patch', 'smoke_runner.js')

raw = io.open(S, encoding='utf-8').read()
nl = '\r\n' if '\r\n' in raw else '\n'
body = raw.replace('\r\n', '\n')
errs = []


def rep(old, new, tag):
    global body
    n = body.count(old)
    if n != 1:
        errs.append('[%s] 命中 %d 次，期望 1 次' % (tag, n))
        return
    body = body.replace(old, new, 1)


# 1. 顺手钉一条：流畅模式下 floatDamage 什么都不建（这本来就该如此）
rep("""    var __made = [], __origCE = document.createElement, __keepFD = floatDamage;
    var __fdErr = null;
    try {
      document.createElement = function (tag) { var el = __origCE(tag); __made.push(el); return el; };
      floatDamage = __realFloatDamage; // 换回真的：全局在 :658 已被顶成 __sil
      floatDamage('-25', '', null, { crit: true });
      floatDamage('+7', 'block', null);
    } catch (e4) { __fdErr = e4; } finally { document.createElement = __origCE; floatDamage = __keepFD; }
""",
    """    // v0.61.36：跑到这里时 SETTINGS.lowSpec 已被前面某条测试留在 true，而 floatDamage 首行是 if(!fx())return;
    // 正好顺手把它钉住 —— 「流畅模式不建浮字」是**正确行为**，不是 bug
    (function () {
      var made = [], origCE = document.createElement, keepLow = SETTINGS.lowSpec;
      try {
        document.createElement = function (tag) { var el = origCE(tag); made.push(el); return el; };
        SETTINGS.lowSpec = true; floatDamage = __realFloatDamage;
        floatDamage('-25', '', null, { crit: true });
      } catch (e0) {} finally { document.createElement = origCE; SETTINGS.lowSpec = keepLow; floatDamage = __sil; }
      __ok('v0.61.36 C3 流畅模式（lowSpec）下 floatDamage 不建任何浮字节点（fx() 门槛生效）',
        made.length === 0, 'made=' + made.length);
    })();

    var __made = [], __origCE = document.createElement, __keepFD = floatDamage, __keepLow = SETTINGS.lowSpec;
    var __fdErr = null;
    try {
      document.createElement = function (tag) { var el = __origCE(tag); __made.push(el); return el; };
      SETTINGS.lowSpec = false;              // 临时关掉流畅模式，否则 fx() 为假、断言测不到东西
      floatDamage = __realFloatDamage;        // 换回真的：全局在 :658 已被顶成 __sil
      floatDamage('-25', '', null, { crit: true });
      floatDamage('+7', 'block', null);
    } catch (e4) { __fdErr = e4; } finally {
      document.createElement = __origCE; floatDamage = __keepFD; SETTINGS.lowSpec = __keepLow;
    }
""",
    'C3 关流畅模式')

# 2. C4 行为验证同样要关
rep("""      var made = [], origCE = document.createElement, err = null, keepFD = floatDamage;
      try {
        document.createElement = function (tag) { var el = origCE(tag); made.push(el); return el; };
        G = __base('wuseng'); G.enemies[0].hp = 300; G.enemies[0].maxHp = 300;
        floatDamage = __realFloatDamage; // dealDamageTo 内部调的是全局 floatDamage
        dealDamageTo(G.enemies[0], dmg);
      } catch (e5) { err = e5; } finally { document.createElement = origCE; floatDamage = keepFD; }
""",
    """      var made = [], origCE = document.createElement, err = null, keepFD = floatDamage, keepLow = SETTINGS.lowSpec;
      try {
        document.createElement = function (tag) { var el = origCE(tag); made.push(el); return el; };
        G = __base('wuseng'); G.enemies[0].hp = 300; G.enemies[0].maxHp = 300;
        SETTINGS.lowSpec = false;        // 同上：不关流畅模式就什么都测不到
        floatDamage = __realFloatDamage; // dealDamageTo 内部调的是全局 floatDamage
        dealDamageTo(G.enemies[0], dmg);
      } catch (e5) { err = e5; } finally {
        document.createElement = origCE; floatDamage = keepFD; SETTINGS.lowSpec = keepLow;
      }
""",
    'C4 关流畅模式')

if errs:
    print('=== 锚点校验失败，未写入任何文件 ===')
    for e in errs:
        print(' ✗', e)
    sys.exit(1)

io.open(S, 'w', encoding='utf-8', newline='').write(body.replace('\n', nl))
print('OK smoke_runner.js %d 字符' % len(body))