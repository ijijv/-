# -*- coding: utf-8 -*-
# v0.61.01 续：把「蓄力只加在单体攻击」的口径补全到最后一处不一致（attackBlock 预览），
#           并加冒烟断言锁死：attack 加+清蓄力；multi/aoe/attackBlock 既不叠加也不消耗
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
SP = r"C:\Users\HP\Desktop\志怪塔\_patch\smoke_runner.js"
s = io.open(P, 'r', encoding='utf-8').read()
EDITS = []

# —— 1. enemyAct：连击处补注释（口径落定）——
EDITS.append((
"""      case 'multi': for(let i=0;i<e.intent.n;i++){ if(G.hp<=0) break; dealDamageToPlayer(e.intent.v,e,i*140); } break;""",
"""      // v0.61.01：连击不吃蓄力加值，也不消耗已存的蓄力（用户拍板口径）
      case 'multi': for(let i=0;i<e.intent.n;i++){ if(G.hp<=0) break; dealDamageToPlayer(e.intent.v,e,i*140); } break;"""))

# —— 2. intentText：拆出「不吃蓄力」的预览基数 ——
EDITS.append((
"""function intentText(e){
  const st=(e.strength||0); // v0.61 C2：力量每点 +1
  const atk=e.intent.v+(e.pendingDamage||0)+st;""",
"""function intentText(e){
  const st=(e.strength||0); // v0.61 C2：力量每点 +1
  const atkPlain=e.intent.v+st; // v0.61.01：不吃蓄力的意图（连击 / 群体 / 攻击并格挡）
  const atk=e.intent.v+(e.pendingDamage||0)+st; // v0.61.01：只有单体「攻击」会消费蓄力"""))

EDITS.append((
"""    case 'multi': return `⚔️ 连击 ${e.intent.n}×${e.intent.v+st}`; // v0.61 C2：连击不吃蓄力加值（与实际结算一致，原先预览偏高）""",
"""    case 'multi': return `⚔️ 连击 ${e.intent.n}×${atkPlain}`; // v0.61 C2/C2.01：连击不吃蓄力加值（与实际结算一致，原先预览偏高）"""))

EDITS.append((
"""    case 'attackBlock': return `⚔️ 攻击 ${atk} · 🛡️ 格挡 ${e.intent.block}`;""",
"""    case 'attackBlock': return `⚔️ 攻击 ${atkPlain} · 🛡️ 格挡 ${e.intent.block}`; // v0.61.01：该意图既不叠加也不消耗蓄力（原预览虚高）"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）\n---%s---' % (i + 1, n, old[:150])); sys.exit(1)
    s = s.replace(old, new)

mm = re.search(r'<script>([\s\S]*?)</script>', s)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, mm.group(1).encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
if r.returncode != 0:
    os.unlink(tmpp); print('NODE_FAIL（未落盘）:'); print(r.stderr); sys.exit(1)
os.unlink(tmpp)
io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v61_01b 代码 DONE: %d 处' % len(EDITS))

# ============ 冒烟断言 ============
sm = io.open(SP, 'r', encoding='utf-8').read()
ANCHOR = """  rep.pass = _p; rep.fail = _f;"""
BLOCK = r"""  /* ============ v0.61.01 蓄力口径：只惠及单体攻击 ============ */
  (function () {
    function seg(src, key) { var i = src.indexOf(key); return i < 0 ? '' : src.slice(i, i + 260); }
    var src = __realEnemyAct.toString();
    var mMulti = seg(src, "case 'multi'"), mAoe = seg(src, "case 'aoe'"), mAtk = seg(src, "case 'attack'"), mChg = seg(src, "case 'charge'");
    __ok('v0.61.01 连击结算不含蓄力（multi 分支不读 pendingDamage）', mMulti.indexOf('pendingDamage') < 0, mMulti.slice(0, 80));
    __ok('v0.61.01 群体攻击结算不含蓄力（aoe 分支不读 pendingDamage）', mAoe.indexOf('pendingDamage') < 0, mAoe.slice(0, 80));
    __ok('v0.61.01 单体攻击既叠加又清空蓄力',
      mAtk.indexOf('e.pendingDamage||0') >= 0 && mAtk.indexOf('e.pendingDamage=0') >= 0, mAtk.slice(0, 90));
    __ok('v0.61.01 蓄力只累加不消费', mChg.indexOf('e.pendingDamage=(e.pendingDamage||0)+e.intent.v') >= 0, mChg.slice(0, 90));

    /* 动态：单体攻击吃满蓄力并清账 */
    var g = __base('tianshi'); G.hp = 60; G.block = 0;
    var e = makeEnemy(ENEMIES['youhun'], 'youhun');
    e.charm = 0; e.charmUsed = false; e.strength = 0; e.pendingDamage = 5; e.affixes = null;
    e.intent = { type: 'attack', v: 10 };
    G.enemies = [e]; G.target = 0;
    __realEnemyAct();
    __ok('v0.61.01 单体攻击 = 10 + 蓄力 5 = 15 伤害，且蓄力清零',
      (60 - G.hp) === 15 && e.pendingDamage === 0, 'lost=' + (60 - G.hp) + ' pend=' + e.pendingDamage);

    /* 动态：连击不吃蓄力、也不清账 */
    g = __base('tianshi'); G.hp = 60; G.block = 0;
    e = makeEnemy(ENEMIES['youhun'], 'youhun');
    e.charm = 0; e.charmUsed = false; e.strength = 0; e.pendingDamage = 5; e.affixes = null;
    e.intent = { type: 'multi', n: 2, v: 6 };
    G.enemies = [e]; G.target = 0;
    __realEnemyAct();
    __ok('v0.61.01 连击 2×6 = 12 伤害（不叠加蓄力 5），且蓄力原样保留',
      (60 - G.hp) === 12 && e.pendingDamage === 5, 'lost=' + (60 - G.hp) + ' pend=' + e.pendingDamage);

    /* 动态：群体攻击同理 */
    g = __base('tianshi'); G.hp = 60; G.block = 0;
    e = makeEnemy(ENEMIES['youhun'], 'youhun');
    e.charm = 0; e.charmUsed = false; e.strength = 0; e.pendingDamage = 5; e.affixes = null;
    e.intent = { type: 'aoe', v: 7 };
    G.enemies = [e]; G.target = 0;
    __realEnemyAct();
    __ok('v0.61.01 群体攻击 7 伤害（不叠加蓄力），蓄力保留',
      (60 - G.hp) === 7 && e.pendingDamage === 5, 'lost=' + (60 - G.hp) + ' pend=' + e.pendingDamage);

    /* 预览与实际一致 */
    var p = makeEnemy(ENEMIES['youhun'], 'youhun');
    p.strength = 2; p.pendingDamage = 5;
    p.intent = { type: 'attack', v: 10 };
    __ok('v0.61.01 预览·攻击 含蓄力（10+5+2=17）', intentText(p).indexOf('攻击 17') >= 0, intentText(p));
    p.intent = { type: 'multi', n: 3, v: 6 };
    __ok('v0.61.01 预览·连击 不含蓄力（3×8）', intentText(p).indexOf('连击 3×8') >= 0, intentText(p));
    p.intent = { type: 'attackBlock', v: 6, block: 4 };
    __ok('v0.61.01 预览·攻击并格挡 不含蓄力（攻击 8 · 格挡 4）',
      intentText(p).indexOf('攻击 8') >= 0 && intentText(p).indexOf('攻击 13') < 0, intentText(p));

    /* 文案 */
    var kw = KEYWORDS.filter(function (k) { return k[0] === '蓄力'; }).map(function (k) { return k[1]; }).join('');
    __ok('v0.61.01 关键词写明「只加单体攻击、连击/群体不吃」',
      kw.indexOf('单体') >= 0 && kw.indexOf('连击') >= 0 && kw.indexOf('群体') >= 0, kw);
    __ok('v0.61.01 蓄力日志文案同步', log_charge_text_ok(), '');
  })();

""" + ANCHOR

# log_charge_text_ok 需要真实存在的辅助：改成直接静态检查日志串
BLOCK = BLOCK.replace("""    __ok('v0.61.01 蓄力日志文案同步', log_charge_text_ok(), '');""",
"""    var __chg = seg(__realEnemyAct.toString(), '蓄力（下回合');
    __ok('v0.61.01 蓄力行动日志写明「单体攻击」', __chg.indexOf('下回合单体攻击 +') >= 0, __chg.slice(0, 60));""")

n = sm.count(ANCHOR)
if n != 1:
    print('SMOKE ANCHOR FAIL: 匹配 %d 次' % n); sys.exit(1)
sm = sm.replace(ANCHOR, BLOCK, 1)
io.open(SP, 'w', encoding='utf-8', newline='').write(sm)
print('PATCH v61_01b 冒烟 DONE')
