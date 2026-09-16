# -*- coding: utf-8 -*-
# Block7 冒烟断言：附灵术「按列取费 + 按列消耗」，结构校验允许对象型 cost
import io, sys, subprocess, tempfile, os

P = r"C:\Users\HP\Desktop\志怪塔\_patch\smoke_runner.js"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# 1) 结构校验：cost 允许「数值 或 按英雄对象」
EDITS.append((
"""      okType.indexOf(c.type) >= 0 && okRar.indexOf(c.rarity) >= 0 && typeof c.cost === 'number');""",
"""      okType.indexOf(c.type) >= 0 && okRar.indexOf(c.rarity) >= 0 &&
      (typeof c.cost === 'number' || (c.cost && typeof c.cost === 'object'))); // cost 可为按英雄对象（_costPick）"""))

# 2) #39 附灵术：按列取费 + 按列消耗
EDITS.append((
"""    // ---- #39 附灵术：0 费 + 消耗牌 ----
    g = __base('ganshiren');
    var fl = __card('fuling');
    __ok('#39 附灵术 0 费 + 消耗牌', fl.cost === 0 && fl.exhaust === true, 'cost=' + fl.cost + ' exhaust=' + fl.exhaust);
    __ok('#39 附灵术 A 文案含「消耗牌（一次性）」', fl.t(false).indexOf('消耗牌（一次性）') >= 0, fl.t(false));""",
"""    // ---- #39 附灵术：按列取费 + 按列消耗（A 免费且消耗；B/C 2 费非消耗；D 2 费/升级 1 费）----
    var fl = __card('fuling');
    g = __base('ganshiren');
    __ok('#39 附灵术(赶尸人) 0 费 + 消耗牌',
      cardCost(fl) === 0 && isOneUse(fl) === true && canUpgrade(fl) === false,
      'cost=' + cardCost(fl) + ' oneUse=' + isOneUse(fl) + ' canUp=' + canUpgrade(fl));
    __ok('#39 附灵术 A 文案含「消耗牌（一次性）」', fl.t(false).indexOf('消耗牌（一次性）') >= 0, fl.t(false));

    g = __base('yincha');
    __ok('#39 附灵术(阴差) 2 费 + 非消耗牌',
      cardCost(fl) === 2 && isOneUse(fl) === false, 'cost=' + cardCost(fl) + ' oneUse=' + isOneUse(fl));

    g = __base('wuseng');
    __ok('#39 附灵术(武僧) 2 费 + 非消耗牌',
      cardCost(fl) === 2 && isOneUse(fl) === false, 'cost=' + cardCost(fl) + ' oneUse=' + isOneUse(fl));

    g = __base('tianshi');
    var flU = Object.assign({}, __card('fuling'), { up: true }); // 不改共享卡对象
    __ok('#39 附灵术(天师) 2 费 / 升级 1 费',
      cardCost(fl) === 2 && cardCost(flU) === 1 && isOneUse(fl) === false,
      'cost=' + cardCost(fl) + ' up=' + cardCost(flU) + ' oneUse=' + isOneUse(fl));

    g = __base('ganshiren');
    __ok('#39 附灵术(赶尸人) 不可升级', canUpgrade(__card('fuling')) === false);"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i + 1, n)); sys.exit(1)
    s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('SMOKE 断言已更新（Block7）')
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, s.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
