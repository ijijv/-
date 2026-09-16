# -*- coding: utf-8 -*-
# v0.58 Block8i 冒烟：武僧卡面预伤害徽章（格挡/诅咒浮动牌恒显实时值）
import io, sys, subprocess, tempfile, os

P = r"C:\Users\HP\Desktop\志怪塔\_patch\smoke_runner.js"
s = io.open(P, 'r', encoding='utf-8').read()

NEWBLOCK = """  /* ============ v0.58 武僧卡面预伤害徽章（格挡/诅咒浮动牌恒显实时值） ============ */
  (function () {
    function pv(id, block, curse, up) {
      var g2 = __base('wuseng'); g2.block = block || 0;
      g2.enemies[0].curse = curse || 0; g2.enemies[0].hp = 500; g2.enemies[0].maxHp = 500;
      return previewDamage(Object.assign({}, __card(id), { up: !!up }));
    }
    var p;
    p = pv('leifu', 6);
    __ok('v0.58 B 预伤害 雷符 格挡6 → 4+2=6 且恒显', p.d === 6 && p.dynamic === true, 'd=' + p.d + ' dyn=' + p.dynamic);
    p = pv('huofu', 6);
    __ok('v0.58 B 预伤害 火符 格挡6 → 5+2=7 / 升级 7+3=10',
      p.d === 7 && pv('huofu', 6, 0, true).d === 10, p.d + '/' + pv('huofu', 6, 0, true).d);
    p = pv('jianfu', 6);
    __ok('v0.58 B 预伤害 剑符 格挡6 → 6+3=9', p.d === 9 && p.dynamic === true, 'd=' + p.d);
    p = pv('shixue', 6);
    __ok('v0.58 B 预伤害 嗜血 格挡6 → 4+2=6', p.d === 6, 'd=' + p.d);
    p = pv('baigui', 6);
    __ok('v0.58 B 预伤害 百鬼夜行 格挡6 → 5+3=8', p.d === 8, 'd=' + p.d);
    p = pv('zhenyaoling', 12);
    __ok('v0.58 B 预伤害 镇妖铃 格挡12 → 10+8=18', p.d === 18 && p.dynamic === true, 'd=' + p.d);
    p = pv('zhanyaojian', 0, 3);
    __ok('v0.58 B 预伤害 斩妖剑 带诅咒 8+6=14 且挂诅咒标签', p.d === 14 && p.curse === 3, 'd=' + p.d + ' curse=' + p.curse);
    p = pv('leifu', 6, 3);
    __ok('v0.58 B 预伤害 雷符 不吃诅咒（不挂诅咒标签）', p.curse === 0, 'curse=' + p.curse);
    p = pv('tianlei', 6);
    __ok('v0.58 B 预伤害 天雷正法 无浮动 → 不挂徽章', p.dynamic === false && p.d === p.raw, 'dyn=' + p.dynamic);
  })();

  rep.pass = _p; rep.fail = _f;"""

old = """  rep.pass = _p; rep.fail = _f;"""
n = s.count(old)
if n != 1:
    print('EDIT FAIL: 匹配 %d 次' % n); sys.exit(1)
s = s.replace(old, NEWBLOCK)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('SMOKE 断言已更新（Block8i）')
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, s.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK')
