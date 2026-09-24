# -*- coding: utf-8 -*-
"""v0.61.36 主代码补丁 · 武僧（B 列 / 苦僧）卡池按《武僧版卡池 - 副本.md》重做

副本相对原版逐行 diff 只有 **8 行**变化（攻击段 1~14 与全部备注一字未动）：
  19 荆棘符 · 20 佛渡 · 25 舍身 · 31 燃血术 · 34 焚符 · 38 移形换影 · 39 附灵术 · 45 五通神

⚠️ 两处 grep `wuseng` 抓不到的隐式落点（本脚本必须显式改）：
  1. 佛渡 eff 的 `fb` 三元 —— 武僧的 4 是 else 兜底，行内没有 'wuseng' 字样
  2. `summonTurnBlock()` 里五通神硬编码 4 —— 不同步就会让顶栏「下回合预格挡」与实际结算不一致

铁律：count==1 锚点、全或无（任一锚点未命中则一个字节都不写）、换行归一。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
errs = []
_files = {}


def load(rel):
    if rel not in _files:
        raw = io.open(os.path.join(ROOT, rel), encoding='utf-8').read()
        _files[rel] = {'nl': '\r\n' if '\r\n' in raw else '\n', 'body': raw.replace('\r\n', '\n')}
    return _files[rel]


def rep(rel, old, new, tag):
    body = load(rel)['body']
    n = body.count(old)
    if n != 1:
        errs.append('[%s] %s 命中 %d 次，期望 1 次' % (rel, tag, n))
        return
    load(rel)['body'] = body.replace(old, new, 1)


# ════════════════════════ js/20_data.js ════════════════════════
D = 'js/20_data.js'

# ── #19 荆棘符：反弹伤害 4/5 → 3/4（格挡 4/7 不动）──
rep(D, ":G.hero==='wuseng'?`获得 ${u?7:4} 点格挡。本回合每受 1 次攻击，反弹 ${u?5:4} 点伤害`",
    ":G.hero==='wuseng'?`获得 ${u?7:4} 点格挡。本回合每受 1 次攻击，反弹 ${u?4:3} 点伤害`   // v0.61.36 武僧列：反弹 4/5 → 3/4",
    '荆棘符 t')
rep(D, "      else if(G.hero==='wuseng'){ G.thorns+=u?5:4; }\n",
    "      else if(G.hero==='wuseng'){ G.thorns+=u?4:3; }   // v0.61.36 武僧列：反弹 4/5 → 3/4\n",
    '荆棘符 eff')

# ── #20 佛渡：升级附加格挡 4 → 5（⚠️ 隐式 else 兜底，显式补 wuseng 分支）──
rep(D, "      :`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，额外获得 4 点格挡':''}。消耗（一次性）`,\n",
    "      :G.hero==='wuseng'?`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，额外获得 5 点格挡':''}。消耗（一次性）`   // v0.61.36 武僧列：升级附加 4 → 5\n"
    "      :`清除所有状态牌与自身负面状态，本回合免疫敌人施加的负面效果${u?'，额外获得 4 点格挡':''}。消耗（一次性）`,\n",
    '佛渡 t')
rep(D, "      const fb=(G.hero==='yincha')?3:(G.hero==='tianshi'?5:4);   // v0.61.35 天师列升级格挡 4 → 5（其余列不动）\n",
    "      const fb=(G.hero==='yincha')?3:((G.hero==='tianshi'||G.hero==='wuseng')?5:4);   // v0.61.35 天师列 4→5；v0.61.36 武僧列 4→5（阴差 3；赶尸人走上面 2 尸气分支）\n",
    '佛渡 eff')

# ── #25 舍身：获得格挡 3/5 → 4 固定（升级不再涨）──
rep(D, ":G.hero==='wuseng'?`失去 4 点生命。获得 ${u?5:3} 点格挡，抽 ${u?2:1} 张牌`",
    ":G.hero==='wuseng'?`失去 4 点生命。获得 4 点格挡，抽 ${u?2:1} 张牌`   // v0.61.36 武僧列：3/5 → 4 固定",
    '舍身 t')
rep(D, "      else if(G.hero==='wuseng'){ gainBlock(u?5:3); }\n",
    "      else if(G.hero==='wuseng'){ gainBlock(4); }   // v0.61.36 武僧列：3/5 → 4 固定\n",
    '舍身 eff')

# ── #31 燃血术：失去生命 6 → 8（两档同值；符文 2 不动）—— hpCost / t / eff 三处 ──
rep(D, "    hpCost:(u)=>G.hero==='wuseng'?6:(G.hero==='yincha'?(u?6:4):(G.hero==='tianshi'?8:4)),\n",
    "    hpCost:(u)=>G.hero==='wuseng'?8:(G.hero==='yincha'?(u?6:4):(G.hero==='tianshi'?8:4)),   // v0.61.36 武僧列：6 → 8\n",
    '燃血术 hpCost')
rep(D, "    t:(u)=>{ const l=G.hero==='wuseng'?6:(G.hero==='yincha'?(u?6:4):(G.hero==='tianshi'?8:4));\n",
    "    t:(u)=>{ const l=G.hero==='wuseng'?8:(G.hero==='yincha'?(u?6:4):(G.hero==='tianshi'?8:4));   // v0.61.36 武僧列：6 → 8\n",
    '燃血术 t')
rep(D, "    eff:(u)=>{ const l=G.hero==='wuseng'?6:(G.hero==='yincha'?(u?6:4):(G.hero==='tianshi'?8:4));\n",
    "    eff:(u)=>{ const l=G.hero==='wuseng'?8:(G.hero==='yincha'?(u?6:4):(G.hero==='tianshi'?8:4));   // v0.61.36 武僧列：6 → 8\n",
    '燃血术 eff')

# ── #34 焚符：每弃 1 张格挡 4/6 → 4/5（未升级 4 不动）──
rep(D, ":G.hero==='wuseng'?`弃任意张手牌：每弃 1 张，获得 ${u?6:4} 点格挡`",
    ":G.hero==='wuseng'?`弃任意张手牌：每弃 1 张，获得 ${u?5:4} 点格挡`   // v0.61.36 武僧列：升级 6 → 5",
    '焚符 t')

# ── #38 移形换影：费用 1 / 升级 0 → 1/1（取消 (U:0)），文案去掉「0 符文」后缀 ──
rep(D, "cost:1, costU:{tianshi:1, default:0},   // v0.61.35 天师列取消 0 费升级\n",
    "cost:1, costU:{tianshi:1, wuseng:1, default:0},   // v0.61.35 天师列取消 0 费升级；v0.61.36 武僧列同（1/1）\n",
    '移形换影 costU')
rep(D, ":G.hero==='wuseng'?`闪避下一次攻击。闪避成功后，下一回合获得 5 点格挡${u?'（0 符文）':''}`",
    ":G.hero==='wuseng'?`闪避下一次攻击。闪避成功后，下一回合获得 5 点格挡`   // v0.61.36 武僧列：1/1，不再有 0 费升级",
    '移形换影 t')

# ── #39 附灵术：费用 2 → 2/1；每触发 1 个格挡 3/4 → 3 固定 ──
rep(D, "cost:{ganshiren:0, default:2}, costU:{tianshi:1}, exhaustOnly:['ganshiren'], needs:'summon',\n",
    "cost:{ganshiren:0, default:2}, costU:{tianshi:1, wuseng:1}, exhaustOnly:['ganshiren'], needs:'summon',   // v0.61.36 武僧列：2 → 2/1\n",
    '附灵术 costU')
rep(D, ":G.hero==='wuseng'?`立即触发所有召唤单位。每触发 1 个，获得 ${u?4:3} 点格挡`",
    ":G.hero==='wuseng'?`立即触发所有召唤单位。每触发 1 个，获得 3 点格挡${u?'（1 符文）':''}`   // v0.61.36 武僧列：3/4 → 3 固定，升级改为 2→1 费",
    '附灵术 t')
rep(D, "        if(G.hero==='wuseng'){ const bb=n*(u?4:3); gainBlock(bb); log(`附灵术：触发 ${n} 个召唤单位，获得 ${bb} 点格挡`); }\n",
    "        if(G.hero==='wuseng'){ const bb=n*3; gainBlock(bb); log(`附灵术：触发 ${n} 个召唤单位，获得 ${bb} 点格挡`); }   // v0.61.36 武僧列：每触发 1 个固定 3\n",
    '附灵术 eff')

# ── #45 五通神：立即 5/6 → 7 固定；每回合开始 4 → 6 ──
rep(D, "eff:(u)=>{ // 现形即结算首回合：第一次「回合开始」效果落在当前回合（武僧 = 基础 1/2 + 首次触发 4 = 5/6 格挡）\n",
    "eff:(u)=>{ // 现形即结算首回合：第一次「回合开始」效果落在当前回合（v0.61.36 武僧 = 基础 1 + 首次触发 6 = 立即 7 格挡）\n",
    '五通神 注释')
rep(D, ":G.hero==='wuseng'?`召唤五通神。立即获得 ${u?6:5} 点格挡（${u?2:1} 点基础 + 首次触发 4 点）；之后每回合开始获得 4 点格挡（持续 ${u?3:2} 回合）`",
    ":G.hero==='wuseng'?`召唤五通神。立即获得 7 点格挡（1 点基础 + 首次触发 6 点）；之后每回合开始获得 6 点格挡（持续 ${u?3:2} 回合）`   // v0.61.36 武僧列：立即 5/6 → 7 固定、每回合 4 → 6",
    '五通神 t')
rep(D, "      let wv=G.hero==='wuseng'?4:(G.hero==='tianshi'?6:3), wdur=u?3:2;   // v0.61.35 天师列：立即/每回合格挡 4 → 6（武僧仍 4）\n",
    "      let wv=G.hero==='wuseng'?6:(G.hero==='tianshi'?6:3), wdur=u?3:2;   // v0.61.35 天师列 4 → 6；v0.61.36 武僧列每回合 4 → 6\n",
    '五通神 wv')
rep(D, "      if(G.hero==='wuseng'){ gainBlock(u?2:1); }\n",
    "      if(G.hero==='wuseng'){ gainBlock(1); }   // v0.61.36：立即合计 7 = 基础 1 + 首触 6（wv 已在上行按列定值）\n",
    '五通神 预格挡')

# ── ⚠️ 隐式落点 2：summonTurnBlock 里五通神硬编码 4 ──
rep(D, "/* 苦行武僧：某个召唤单位在「回合开始」时会带来的格挡（纸人/阴兵看升级态，五通神固定 4） */\n",
    "/* 苦行武僧：某个召唤单位在「回合开始」时会带来的格挡（纸人/阴兵看升级态，五通神固定 6） */\n",
    'summonTurnBlock 注释')
rep(D, "  if(s.type==='wutong') return 4;\n",
    "  if(s.type==='wutong') return 6;   // v0.61.36 武僧列：五通神每回合 4 → 6（与五通神 eff 的 wv 必须一致）\n",
    'summonTurnBlock 值')

# ════════════════════════ js/30_engine.js ════════════════════════
E = 'js/30_engine.js'

# ── #34 焚符：弃牌结算里武僧每张格挡 4/6 → 4/5 ──
rep(E, "    if(G.hero==='ganshiren'){ gainShiqi(1); gainBlock(u?3:2); }\n    else if(G.hero==='wuseng'){ gainBlock(u?6:4); }\n",
    "    if(G.hero==='ganshiren'){ gainShiqi(1); gainBlock(u?3:2); }\n    else if(G.hero==='wuseng'){ gainBlock(u?5:4); }   // v0.61.36 武僧列：升级 6 → 5\n",
    '焚符 discard 结算')

# ════════════════════════ 版本号 3 处 → v0.61.36 ════════════════════════
rep('原型.html', '<title>志怪塔 · 原型 v0.61.35</title>', '<title>志怪塔 · 原型 v0.61.36</title>', '版本 title')
rep('原型.html', '玩法原型 v0.61.35', '玩法原型 v0.61.36', '版本 h1')
rep('js/60_boot.js', '<h2>志 怪 塔 · v0.61.35</h2>', '<h2>志 怪 塔 · v0.61.36</h2>', '版本 开局画面')

# ════════════════════════ 落盘（全或无） ════════════════════════
if errs:
    print('=== 锚点校验失败，未写入任何文件 ===')
    for e in errs:
        print('  ✗', e)
    sys.exit(1)

for rel, d in _files.items():
    io.open(os.path.join(ROOT, rel), 'w', encoding='utf-8', newline='').write(d['body'].replace('\n', d['nl']))
    print('OK 写入 %s（%d 字符）' % (rel, len(d['body'])))