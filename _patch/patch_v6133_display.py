# -*- coding: utf-8 -*-
"""v0.61.33 · 显示与指向整改（用户 5 项需求里的 A/B/D/E）

A. 删「卡面预伤徽章」+「点击敌人锁定目标」；预伤改为只浮在**拖拽所指的那只**敌人头顶，
   并随目标变化（对所有角色生效）。根因：徽章与敌人高亮都走 previewDamage(c) 内部
   的 curEnemy()（= 上次锁定的 G.target），拖到另一只身上时数字不会跟着变 →
   天师「锁定带诅咒的、拖到不带诅咒的身上，头顶显示 9 实际打 6」。
B. needsTarget 改为按**机制**判定（不再看 type）：补上 4 张真正需要指向的单体牌。
D. 洗髓经跨关泄漏：startBattle 的 per-battle 重置漏了 G.xisuiTurns（递减在 startTurn）。
E. 渡魂归己改为按「一次出牌/一次召唤行动对敌人造成的真实总伤害」结算（群伤/多段一次取整），
   镜像既有「咒印 #42B」的 G.stealWatch/G.stealAccum 攒批手法。

不改数值、不改卡牌效果，只改「显示口径 / 目标选择 / 重置遗漏 / 回复口径」。
"""
import io, os, sys, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
E = os.path.join(ROOT, 'js', '30_engine.js')
U = os.path.join(ROOT, 'js', '50_ui.js')
B = os.path.join(ROOT, 'js', '60_boot.js')

files = {}
for p in (E, U, B):
    raw = io.open(p, encoding='utf-8').read()
    files[p] = {'nl': '\r\n' if '\r\n' in raw else '\n', 'body': raw.replace('\r\n', '\n')}

errs = []


def rep(path, old, new, want=1, tag=''):
    """单块替换；命中数不符则记错，不写。"""
    b = files[path]['body']
    n = b.count(old)
    if n != want:
        errs.append('[%s] %s：命中 %d 次，期望 %d 次' % (os.path.basename(path), tag or old[:44].replace('\n', '\\n'), n, want))
        return
    files[path]['body'] = b.replace(old, new, 1 if want == 1 else want)


def cut(path, start_marker, end_marker, new, tag='', must_contain=()):
    """区间替换（对中间内容不敏感）：从 start_marker 到 end_marker 之间的原文整段换掉。"""
    b = files[path]['body']
    if b.count(start_marker) != 1 or b.count(end_marker) != 1:
        errs.append('[%s] %s：区间端点命中数 %d/%d，期望各 1 次'
                    % (os.path.basename(path), tag, b.count(start_marker), b.count(end_marker)))
        return
    a = b.index(start_marker)
    z = b.index(end_marker, a)
    seg = b[a:z]
    for tok in must_contain:
        if tok not in seg:
            errs.append('[%s] %s：待删区间内未找到预期内容 %r（锚点可能已漂移）' % (os.path.basename(path), tag, tok))
            return
    files[path]['body'] = b[:a] + new + b[z:]


# ═══════════════════ A-1 删除 selectTarget（点击锁定） ═══════════════════
rep(E,
    "function selectTarget(i){ if(TUT && TUT.step===2) advanceTut(); G.target=i; render(); document.querySelectorAll('#hand .dmg-buff,#hand .dmg-nerf,#hand .dmg-plain,#hand .dmg-miss').forEach(el=>{ el.classList.remove('dmg-flash'); void el.offsetWidth; el.classList.add('dmg-flash'); }); }\n",
    "/* v0.61.33：删除「点击敌人锁定目标」（原 selectTarget）。目标只由**拖拽落点**决定\n"
    "   （60_boot.js 的 onDragUp 里写 G.target），点敌人不再改目标、卡面也不再有预伤徽章。\n"
    "   原因：徽章与敌人高亮都按「上次锁定的那只」算，拖动改指向另一只时数字不跟着变，会显示错的伤害。\n"
    "   原 selectTarget 兼职的「推进引导第 2 步」改由「把牌拖到敌人身上」触发（见 onDragUp）。 */\n",
    tag='selectTarget 删除')

# ═══════════════════ E-1 渡魂归己：攒批结算助手 ═══════════════════
rep(E,
    "/* ===================== 战斗函数 ===================== */\n",
    "/* ===================== 战斗函数 ===================== */\n"
    "/* 渡魂归己（v0.61.33 改口径）：把「一张牌 / 一次召唤行动」内对敌人造成的**真实总伤害**攒起来一次转化。\n"
    "   真实伤害 = 走完遗物增伤(桃木剑/铜钱剑)、朱砂笔、开天眼、虚弱、敌人格挡之后真正扣在敌人身上的血量\n"
    "   （即 dealDamageTo 里的 actual），所以群伤、增益、遗物、格挡、虚弱全部已被计入。\n"
    "   攒批的理由：群伤/多段（百鬼夜行、尸王全体、多段攻击）逐击 floor 会丢掉零头，\n"
    "   只有对「总伤害」取整一次，才等于用户要求的「真实总伤害 × 比例」。 */\n"
    "let DUHUN_ACC=0, DUHUN_BATCH=false;   // DUHUN_ACC=本批累计真实伤害；DUHUN_BATCH=批已开（回合中）\n"
    "function duhunActive(){ return !!(G.duhun && G.duhun.turns>0); }\n"
    "function duhunFlush(){\n"
    "  const acc=DUHUN_ACC; DUHUN_ACC=0;\n"
    "  if(!duhunActive() || acc<=0) return;\n"
    "  const h=Math.floor(acc*G.duhun.ratio);\n"
    "  if(h>0){\n"
    "    G.hp=Math.min(G.maxHp, G.hp+h);\n"
    "    floatDamage('+'+h, 'heal', document.querySelector('#player-panel .hpbar'));\n"
    "    log(`渡魂归己：回复 ${h} 点生命（本批真实伤害 ${acc} × ${Math.round(G.duhun.ratio*100)}%）`);\n"
    "  }\n"
    "}\n"
    "function duhunBatchBegin(){ DUHUN_BATCH=true; DUHUN_ACC=0; }\n"
    "function duhunBatchEnd(){ DUHUN_BATCH=false; duhunFlush(); }\n",
    tag='渡魂攒批助手')

# ═══════════════════ E-2 dealDamageTo 内改为累计（原来逐击结算） ═══════════════════
rep(E,
    "  if(G.duhun && G.duhun.turns>0 && actual>0){ const h=Math.floor(actual*G.duhun.ratio); if(h>0){ G.hp=Math.min(G.maxHp, G.hp+h); floatDamage('+'+h, 'heal', document.querySelector('#player-panel .hpbar')); log(`渡魂归己：回复 ${h} 点生命`); } }\n",
    "  if(duhunActive() && actual>0){ DUHUN_ACC+=actual; if(!DUHUN_BATCH) duhunFlush(); } // v0.61.33：攒批，批外（如敌人自伤类）单发即结\n",
    tag='渡魂 actual 累计')

# ═══════════════════ E-3 出牌：一次 eff 调用 = 一批 ═══════════════════
rep(E,
    "  cardPlayWindow=true;\n  const effResult = c.eff(c.up, c, xuenuBonus);\n  cardPlayWindow=false;\n",
    "  duhunBatchBegin(); // v0.61.33：渡魂归己按「这一张牌造成的真实总伤害」结算（群伤/多段只取整一次）\n"
    "  cardPlayWindow=true;\n  const effResult = c.eff(c.up, c, xuenuBonus);\n  cardPlayWindow=false;\n"
    "  duhunBatchEnd();\n",
    tag='出牌渡魂批')

# ═══════════════════ E-4 召唤行动：一次 summonAct = 一批 ═══════════════════
rep(E,
    "function summonAct(s){\n  const types=['zhiren','xiaogui','yinbing','shi_wang'];\n  if(!types.includes(s.type)) return;\n",
    "function summonAct(s){\n  const types=['zhiren','xiaogui','yinbing','shi_wang'];\n  if(!types.includes(s.type)) return;\n"
    "  duhunBatchBegin(); // v0.61.33：一次召唤行动算一批（尸王打全体也只取整一次）\n",
    tag='召唤渡魂批开')

rep(E,
    "  else if(s.type==='shi_wang'){\n    for(const e of aliveEnemies()) dealDamageTo(e, s.v);   // 尸王：每回合末对全体造成 10 点伤害\n  }\n}\n",
    "  else if(s.type==='shi_wang'){\n    for(const e of aliveEnemies()) dealDamageTo(e, s.v);   // 尸王：每回合末对全体造成 10 点伤害\n  }\n"
    "  duhunBatchEnd(); // v0.61.33：批收尾→按本批真实总伤害回复一次\n}\n",
    tag='召唤渡魂批收')

# ═══════════════════ E-5 回合开始兜底清零（防治中途 abort 残留） ═══════════════════
rep(E,
    "  G.zhouhunSteal=0; G.stealWatch=false; G.stealAccum=0; // 咒印：吸血只在本回合内有效\n",
    "  G.zhouhunSteal=0; G.stealWatch=false; G.stealAccum=0; // 咒印：吸血只在本回合内有效\n"
    "  DUHUN_ACC=0; DUHUN_BATCH=false; // v0.61.33：渡魂攒批兜底清零（正常应在上一批收尾时已 flush）\n",
    tag='回合并渡魂清零')

# ═══════════════════ D 洗髓经跨关泄漏：startBattle 补重置 ═══════════════════
rep(E,
    "G.pendingSeal=0; G.karmaFire=0; G.duhun=null; G.xiejia=0; G.zhouyuA=false; G.尸气=0; G.exhausted=[];\n",
    "G.pendingSeal=0; G.karmaFire=0; G.duhun=null; G.xiejia=0; G.zhouyuA=false; G.尸气=0; G.exhausted=[];\n"
    "  G.xisuiTurns=0; // v0.61.33：洗髓经是「本场战斗内接下来 N 回合」的增益，原来此处漏重置 → 上一关末尾打出会漏到下一关开头\n",
    tag='洗髓经跨关重置')

# ═══════════════════ A-2 previewDamage 支持显式目标 ═══════════════════
rep(E,
    "function previewDamage(c){\n  const rawFn = CARD_DMG[c.id];\n",
    "function previewDamage(c, targetEnemy){\n"
    "  /* v0.61.33：targetEnemy = 拖拽正指向的那只敌人。传了就用它，没传才回落 curEnemy()（= 当前目标）。\n"
    "     这样「头顶预伤」永远算的是你真正要打的那只，而不是上次锁定的那只（天师 9/6 错的根因）。 */\n"
    "  const rawFn = CARD_DMG[c.id];\n",
    tag='previewDamage 签名')

rep(E,
    "  let e = curEnemy();\n  if(perTurn && (c.id==='xiaogui' || c.id==='yinbingguo')) e = mostCursedEnemy() || e;\n",
    "  let e = targetEnemy || curEnemy();\n  if(perTurn && (c.id==='xiaogui' || c.id==='yinbingguo')) e = mostCursedEnemy() || e;\n",
    tag='previewDamage 取目标')

rep(E,
    "  const raw = rawFn(c.up);\n",
    "  const raw = rawFn(c.up, e); // v0.61.33：把目标透传给 CARD_DMG 的裸伤函数\n",
    tag='previewDamage 透传目标')

# ═══════════════════ A-3 CARD_DMG：13 个裸伤函数接收目标 ═══════════════════
REG_A = "const CARD_DMG = {\n"
REG_Z = "function previewDamage(c, targetEnemy){\n"
_b = files[E]['body']
if _b.count(REG_A) != 1 or _b.count(REG_Z) != 1:
    errs.append('[30_engine.js] CARD_DMG 区间端点命中数异常 %d/%d' % (_b.count(REG_A), _b.count(REG_Z)))
else:
    _a = _b.index(REG_A)
    _z = _b.index(REG_Z, _a)
    seg = _b[_a:_z]
    TARGETED_FNS = ['leifu', 'huofu', 'jianfu', 'zhanyaojian', 'zhongkui', 'tiebushan', 'shihun',
                    'qungui', 'taomufu', 'shixue', 'baigui', 'zhenyaoling']
    for cid in TARGETED_FNS:
        sig = cid + ': u=>{'
        if seg.count(sig) != 1:
            errs.append('[30_engine.js] CARD_DMG.%s 签名锚点命中 %d 次，期望 1 次' % (cid, seg.count(sig)))
            continue
        seg = seg.replace(sig, cid + ': (u,e)=>{')
    # 天雷正法：没有 const t=curEnemy()，只有入口的 !curEnemy() 判定
    tl = "tianlei: u=>{ if(!curEnemy()) return 0;\n"
    if seg.count(tl) != 1:
        errs.append('[30_engine.js] CARD_DMG.tianlei 锚点命中 %d 次，期望 1 次' % seg.count(tl))
    else:
        seg = seg.replace(tl, "tianlei: (u,e)=>{ if(!(e||curEnemy())) return 0;\n")
    # 12 处「取当前目标」→「优先取显式目标」
    if seg.count("const t=curEnemy();") != 12:
        errs.append('[30_engine.js] CARD_DMG 内 const t=curEnemy() 有 %d 处，期望 12 处' % seg.count("const t=curEnemy();"))
    else:
        seg = seg.replace("const t=curEnemy();", "const t=e||curEnemy();")
    if not errs:
        files[E]['body'] = _b[:_a] + seg + _b[_z:]

# ═══════════════════ A-4 卡面不再显示预伤徽章 ═══════════════════
cut(U, "  const pv = previewDamage(c);\n  let dmgHtml = '';\n", "  const sealed = c.sealed>0;\n",
    "  /* v0.61.33：删除卡面「预伤徽章」（含数值 / 落空 / 诅咒×N 等标签）。\n"
    "     原因：徽章按「上次锁定的敌人」算，拖动改指向另一只时数字不跟着变，会显示错伤害。\n"
    "     预伤改为只在拖拽时浮在**目标敌人头顶**（60_boot.js showDragPreview），并跟随所指目标变化。 */\n",
    tag='卡面预伤徽章删除', must_contain=['dmgHtml', 'dmg-miss', 'previewDamage'])

rep(U,
    "${sealTag}${dmgHtml}<div class=\"ctype\">",
    "${sealTag}<div class=\"ctype\">",
    tag='卡面模板去 dmgHtml')

# ═══════════════════ A-5 敌人面板不再有点击锁定 / 选中高亮 ═══════════════════
rep(U,
    "  const selected = (e===curEnemy());\n",
    "  /* v0.61.33：删除「点击锁定」后不再有选中态 —— 目标只由拖拽落点决定（拖拽中的高亮是 .drag-target） */\n",
    tag='敌人 selected 变量')

rep(U,
    "  return `<div class=\"enemy ${eSize} ${liftY>0?'edepth':''} ${selected?'selected':''} ${e.dying?'dying':''} ${HITFX.enemies.has(e)?'hit':''}\" data-uid=\"${e.uid}\" onclick=\"selectTarget(${idx})\" style=\"z-index:${2000-liftY}; transform:translateY(-${liftY}px)\">",
    "  return `<div class=\"enemy ${eSize} ${liftY>0?'edepth':''} ${e.dying?'dying':''} ${HITFX.enemies.has(e)?'hit':''}\" data-uid=\"${e.uid}\" style=\"z-index:${2000-liftY}; transform:translateY(-${liftY}px)\">",
    tag='敌人 onclick/selected 去除')

# ═══════════════════ B needsTarget 改为按机制判定 ═══════════════════
rep(U,
    "const AOE_CARDS = ['wanjian', 'baigui'];\nfunction needsTarget(c){ return c.type==='attack' && !AOE_CARDS.includes(c.id); }\n",
    "const AOE_CARDS = ['wanjian', 'baigui'];   // 打全体：不需要拖拽箭头（咒雨不在此列 —— 它按机制随机分配，不是「全体」，见 P3）\n"
    "/* v0.61.33：是否需要「拖出箭头指向单个敌人」改为**按机制**判定，不再只看 type==='attack'。\n"
    "   原先的判定漏掉 4 张真正要指定目标的牌，删掉「点击锁定」后它们会永远选不了目标：\n"
    "     · 钟馗镇魂 / 镇妖铃 —— type 是 spirit，但走 curEnemy() 打单体（镇妖铃还对带诅咒目标加伤）\n"
    "     · 画皮 —— 定向施加【魅惑】；咒印 —— 定向施加【诅咒】\n"
    "   攻击牌里 万剑归宗 / 百鬼夜行 打全体、无需箭头（已由 AOE_CARDS 排除）。 */\n"
    "const TARGETED_CARDS = ['leifu','huofu','jianfu','zhanyaojian','tianlei','tiebushan','shihun','qungui',\n"
    "  'taomufu','shihunzhou','shixue','zhongkui','zhenyaoling','huapi'];\n"
    "function needsTarget(c){\n"
    "  // 咒印：目标随角色变 —— 赶尸人=拿尸气、武僧=给自己挂吸血，都不指向敌人；天师/阴差才定向施咒\n"
    "  if(c.id==='zhouyin') return G.hero!=='ganshiren' && G.hero!=='wuseng';\n"
    "  return TARGETED_CARDS.includes(c.id);\n"
    "}\n",
    tag='needsTarget 重写')

# ═══════════════════ A-6 拖拽预览按目标算 + 无箭头牌也报预伤 ═══════════════════
rep(B,
    "  const pv=previewDamage(c);\n",
    "  const pv=previewDamage(c, e);   // v0.61.33：按「拖拽正指向的这只」算，跟着目标变（原来是不带目标 → 用上次锁定的那只）\n",
    tag='拖拽预览传目标')

rep(B,
    "  } else {\n    d.el.style.pointerEvents='none';\n    d.el.style.transform='translate('+dx+'px,'+dy+'px) scale(1.12)';\n  }\n}\n",
    "  } else {\n    d.el.style.pointerEvents='none';\n    d.el.style.transform='translate('+dx+'px,'+dy+'px) scale(1.12)';\n"
    "    /* v0.61.33：打全体 / 不指向的牌虽然不出箭头，但拖过敌人头顶时也照样报预伤（跟随所指目标） */\n"
    "    const idx2=enemyAtPoint(ev.clientX, ev.clientY);\n"
    "    if(idx2>=0) showDragPreview(idx2); else hideDragPreview();\n  }\n}\n",
    tag='无箭头牌拖拽预览')

rep(B,
    "    const aoe=(c.id==='wanjian'||c.id==='baigui')?' 全体':'';\n",
    "    const aoe=AOE_CARDS.includes(c.id)?' 全体':'';   // v0.61.33：与 needsTarget 的全体名单同一处真相\n",
    tag='预警全体名单统一')

# ═══════════════════ A-7 只能拖到敌人身上打出 + 引导第 2 步改触发点 ═══════════════════
rep(B,
    "  if(c){\n    if(!d.moved) play=true;\n    else if(d.targetable){\n      const idx=enemyAtPoint(ev.clientX, ev.clientY);\n      if(idx>=0){ G.target=idx; play=true; }\n    } else if(d.sy-ev.clientY>=40){ play=true; }\n  }\n",
    "  if(c){\n"
    "    if(!d.moved){\n"
    "      /* v0.61.33：需要指向敌人的牌不能靠「点一下」打出 —— 那会打到 G.target 残留的那只（正是用户遇到的错伤害来源），\n"
    "         必须拖到敌人身上。非指向牌（防御/技能/全体）点一下照旧可出。 */\n"
    "      if(d.targetable){ floatMsg('把这张牌拖到敌人身上打出'); sfx('error'); }\n"
    "      else play=true;\n"
    "    }\n"
    "    else if(d.targetable){\n      const idx=enemyAtPoint(ev.clientX, ev.clientY);\n"
    "      if(idx>=0){ G.target=idx; play=true; if(TUT && TUT.step===2) advanceTut(); } // v0.61.33：引导第2步改由「拖到敌人身上」推进（原由 selectTarget 推进）\n"
    "    } else if(d.sy-ev.clientY>=40){ play=true; }\n  }\n",
    tag='拖拽落敌才出牌')

# ═══════════════════ A-8 引导文案跟上新交互 ═══════════════════
rep(B,
    "/* —— 交互式新手引导（强制分步：出牌→切换目标→结束回合） —— */\n",
    "/* —— 交互式新手引导（强制分步：出牌→拖拽指向敌人→结束回合） —— */\n",
    tag='引导注释')

rep(B,
    "  const msgs={1:'第一步 · 点一张<b>手牌</b>打出（左上角是符文费用）',2:'第二步 · 点<b>敌人</b>切换攻击目标（金色边框 = 当前目标）',3:'第三步 · 点手牌右侧<b>「结束回合」</b>结束本回合'};\n",
    "  const msgs={1:'第一步 · 把<b>攻击牌拖到敌人身上</b>打出（左上角是符文费用）',2:'第二步 · 箭头指向谁，谁的头顶就会浮出<b>预计伤害</b>（非指向牌点一下即可打出）',3:'第三步 · 点手牌右侧<b>「结束回合」</b>结束本回合'};\n",
    tag='引导步骤文案')

rep(B,
    "  {t:'目标与意图', html:'点<b>敌人</b>切换攻击目标（金色边框 = 当前目标）。<br>敌人头顶 <b>⚠ 意图</b> 预告它下回合要做什么，先看清再决定。'},\n",
    "  {t:'目标与意图', html:'把 <b>攻击牌拖到敌人身上</b>打出 —— 箭头指到谁就打谁，落点会高亮，同时浮出<b>预计伤害</b>（已算上遗物/诅咒/格挡/虚弱）。<br>敌人头顶 <b>⚠ 意图</b> 预告它下回合要做什么，先看清再决定。'},\n",
    tag='引导步骤2文案')

# ═══════════════════ A-9 拖拽预览的注释（徽章已删，说明改为唯一显示处） ═══════════════════
rep(B,
    "/* v0.61.20(P3)：拖拽受击预览 —— 箭头锁定目标时，目标头顶浮出这张牌的预计伤害。\n"
    "   数字直接取自卡面徽章那套 previewDamage()，不另开口径（徽章不显示的「平伤牌」这里也照样给数）。 */\n",
    "/* v0.61.20(P3)：拖拽受击预览 —— 目标头顶浮出这张牌的预计伤害。\n"
    "   v0.61.33：卡面徽章已删，这里是预伤的**唯一**显示处；口径仍只有 previewDamage() 一套，\n"
    "   但按「拖拽所指的那只敌人」算（previewDamage(c, e)），所以数字会跟着目标变；\n"
    "   打全体 / 不指向的牌也照样显示（只是不出箭头）。 */\n",
    tag='拖拽预览注释')

# ═══════════════════ 版本号（第 3 处） ═══════════════════
rep(B,
    "<h2>志 怪 塔 · v0.61.32</h2>",
    "<h2>志 怪 塔 · v0.61.33</h2>",
    tag='版本号 60_boot')

# ═══════════════════ 落盘 ═══════════════════
if errs:
    print('=== 锚点校验失败，未写入任何文件 ===')
    for e in errs:
        print(' ✗', e)
    sys.exit(1)

for p, d in files.items():
    body = d['body']
    if ',,' in body:
        print('=== 出现连续逗号 ,, 未写入 ===', p)
        sys.exit(1)
    io.open(p, 'w', encoding='utf-8', newline='').write(body.replace('\n', d['nl']))
    print('OK %-16s %d 字符' % (os.path.basename(p), len(body)))