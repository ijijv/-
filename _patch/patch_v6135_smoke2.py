# -*- coding: utf-8 -*-
"""v0.61.35 冒烟修补（第二轮）：第一轮漏掉的一处预伤块 + 两处我写错的期望值

我第一轮犯错的地方（记下来，别再犯）：
  1. 燃血术卡面文案是「失去 8 **点**生命」，我按 `失去 8 生命` 去匹配 → 两条断言假红
  2. D 段末尾那条剑符预伤用的是**未升级**的 `__card('jianfu')`（共享单例，此时 up=false），
     期望应是 10×2=20，我按「升级 15×2=30」写了 → 假红
  3. 史上第二处预伤块（lv() 系列，L560-588）整块漏改
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


# —— 1. lv() 预伤块（每层诅咒浮动） ——
rep("    __ok('雷符预览 D升级=9+3=12', lv('leifu', true).d === 12, 'd=' + lv('leifu', true).d);\n",
    "    __ok('雷符预览 D升级=9+4=13', lv('leifu', true).d === 13, 'd=' + lv('leifu', true).d);   // v0.61.35：带诅咒加成 +3/+4\n",
    '雷符预览升级')
rep("    __ok('斩妖剑预览 D=8+引爆2×5=18', lv('zhanyaojian').d === 18, 'd=' + lv('zhanyaojian').d);\n",
    "    __ok('斩妖剑预览 D=10+引爆2×5=20', lv('zhanyaojian').d === 20, 'd=' + lv('zhanyaojian').d);   // v0.61.35：主伤 8→10\n",
    '斩妖剑预览')
rep("    __ok('百鬼预览 D=7+1×3诅咒=10', lv('baigui').d === 10, 'd=' + lv('baigui').d);\n",
    "    __ok('百鬼预览 D=8+1×3诅咒=11', lv('baigui').d === 11, 'd=' + lv('baigui').d);   // v0.61.35：全体主伤 7→8\n",
    '百鬼预览')
rep("    __ok('小鬼预览 天师 v=3', lv('xiaogui').d === 3, 'd=' + lv('xiaogui').d);\n",
    "    __ok('小鬼预览 天师 v=2', lv('xiaogui').d === 2, 'd=' + lv('xiaogui').d);   // v0.61.35：天师列 3/4 → 2/3\n",
    '小鬼预览天师')

# —— 2. 燃血术：卡面文案带「点」字 ——
rep("    __ok('v0.61.35 燃血术 天师列固定失 8 生命（升级不再减到 3）',\n"
    "      _rxT[0].indexOf('失去 8 生命') >= 0 && _rxT[1].indexOf('失去 8 生命') >= 0,\n"
    "      _rxT.join(' / '));\n",
    "    __ok('v0.61.35 燃血术 天师列固定失 8 点生命（升级不再减到 3）',\n"
    "      _rxT[0].indexOf('失去 8 点生命') >= 0 && _rxT[1].indexOf('失去 8 点生命') >= 0,\n"
    "      _rxT.join(' / '));\n",
    '燃血术天师')
rep("    __ok('v0.61.35 燃血术 其余三列各自不变（A 4/4、B 6/6、C 4/6）',\n"
    "      _rxA[0].indexOf('失去 4 生命') >= 0 && _rxA[1].indexOf('失去 4 生命') >= 0 &&\n"
    "      _rxB[0].indexOf('失去 6 生命') >= 0 && _rxB[1].indexOf('失去 6 生命') >= 0 &&\n"
    "      _rxC[0].indexOf('失去 4 生命') >= 0 && _rxC[1].indexOf('失去 6 生命') >= 0,\n"
    "      _rxA.join('/') + ' | ' + _rxB.join('/') + ' | ' + _rxC.join('/'));\n",
    "    __ok('v0.61.35 燃血术 其余三列各自不变（A 4/4、B 6/6、C 4/6）',\n"
    "      _rxA[0].indexOf('失去 4 点生命') >= 0 && _rxA[1].indexOf('失去 4 点生命') >= 0 &&\n"
    "      _rxB[0].indexOf('失去 6 点生命') >= 0 && _rxB[1].indexOf('失去 6 点生命') >= 0 &&\n"
    "      _rxC[0].indexOf('失去 4 点生命') >= 0 && _rxC[1].indexOf('失去 6 点生命') >= 0,\n"
    "      _rxA.join('/') + ' | ' + _rxB.join('/') + ' | ' + _rxC.join('/'));\n",
    '燃血术其余列')

# —— 3. D 段尾：剑符预伤用的是未升级单例，10×2=20 ——
rep("    __ok('v0.60 D 预伤害 剑符 诅咒≥3 → 30 且常显（v0.61.35：15×2）', previewDamage(__card('jianfu')).d === 30 && previewDamage(__card('jianfu')).dynamic === true,\n"
    "      'd=' + previewDamage(__card('jianfu')).d);\n",
    "    // 注意：这里用的是 CARDS 里的共享单例（此刻 up=false），所以是未升级的 10×2=20\n"
    "    __ok('v0.60 D 预伤害 剑符(未升级) 诅咒≥3 → 20 且常显（v0.61.35：10×2）', previewDamage(__card('jianfu')).d === 20 && previewDamage(__card('jianfu')).dynamic === true,\n"
    "      'd=' + previewDamage(__card('jianfu')).d);\n",
    '剑符预伤')

if errs:
    print('=== 锚点校验失败，未写入任何文件 ===')
    for e in errs:
        print(' ✗', e)
    sys.exit(1)

io.open(S, 'w', encoding='utf-8', newline='').write(body.replace('\n', nl))
print('OK smoke_runner.js %d 字符' % len(body))