# -*- coding: utf-8 -*-
"""
v0.61.25 步骤 3 —— 高频接线：把 26 个新键名接到真实调用点

收口策略（一处覆盖一批，别满地撒）：
  dealDamageTo          → hit_light / hit_heavy / hit_crit / hit_guard / atk_multi_each（按伤害量分级）
  dealDamageToPlayer    → hurt 带变调；连击段改 enemy_multi；格挡吃满也出声
  enemyAct 出招分发     → enemy_attack / multi / charge / block / heal / strength / summon / debuff / buff_self / qingsuan / dormant
  applyCurse            → card_curse        （天师核心，25+ 调用点收口在此）
  gainShiqi             → card_shiji        （赶尸人核心，40+ 调用点收口在此）
  drawCards             → card_draw
  doPlayCard 消耗处      → card_exhaust
  enterPhase2           → boss_phase2（替换原 relic）
  directDamage          → atk_true（真实伤害唯一入口，替换原 hurt）
  全局点击委托           → ui_click（原本全项目零按钮音）
  pickReward / chooseNode → ui_reward / ui_map

全部锚点校验 count==1；任何一条对不上就整体不落盘。
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')

EDITS = []  # (文件, 锚点, 替换)


def E(f, a, b):
    EDITS.append((f, a, b))


AUD = 'js/10_audio.js'
ENG = 'js/30_engine.js'
DAT = 'js/20_data.js'
UI = 'js/50_ui.js'

# ==================== 10_audio.js：节流助手 ====================
E(AUD,
  "function sfxWarnUnknown(name){\n"
  "  if(_sfxWarned[name]) return; _sfxWarned[name]=1;\n"
  "  try{ console.warn('[sfx] 未知键名（已忽略）:', name); }catch(e){}\n"
  "}\n",
  "function sfxWarnUnknown(name){\n"
  "  if(_sfxWarned[name]) return; _sfxWarned[name]=1;\n"
  "  try{ console.warn('[sfx] 未知键名（已忽略）:', name); }catch(e){}\n"
  "}\n"
  "/* 同一键的最小间隔节流：给「一帧内会被连调很多次」的键用（如回合开始逐个召唤物加尸气），\n"
  "   免得同一个音叠成和弦。**不全局生效** —— 连击那种 60ms 一发是故意要密的。 */\n"
  "const _sfxGate = {};\n"
  "function sfxOnce(name, ms){\n"
  "  const now = (typeof performance!=='undefined' && performance.now) ? performance.now() : Date.now();\n"
  "  if(_sfxGate[name] && now-_sfxGate[name] < (ms||80)) return false;\n"
  "  _sfxGate[name]=now; sfx(name); return true;\n"
  "}\n")

# ==================== 30_engine.js：dealDamageTo ====================
E(ENG,
  "  if(!ignoreBlock && e.block>0){ const absorbed=Math.min(e.block,d); e.block-=absorbed; d-=absorbed; if(e.pingbi>0) e.pingbi=Math.min(e.pingbi, e.block); }\n",
  "  let absorbed=0;\n"
  "  if(!ignoreBlock && e.block>0){ absorbed=Math.min(e.block,d); e.block-=absorbed; d-=absorbed; if(e.pingbi>0) e.pingbi=Math.min(e.pingbi, e.block); }\n")

E(ENG,
  "  const viz=()=>{ sfx('hit');\n",
  "  /* v0.61.25：打击层按「打在什么上 / 打了多少 / 有没有打死」分级；\n"
  "     point=true 是连击的逐段调用，改用极短的 atk_multi_each（60ms 一发也不糊）。 */\n"
  "  const __blockedAll=(absorbed>0 && d<=0), __killed=(hpBefore>0 && e.hp<=0);\n"
  "  const __hk=__blockedAll ? 'hit_guard' : (point ? 'atk_multi_each' : pickHitSfx(actual, false, __killed));\n"
  "  const __hopt=(__hk==='hit_guard' || __hk==='atk_multi_each') ? null : { rate:sfxDamageRate(actual) };\n"
  "  const viz=()=>{ sfx(__hk, __hopt);\n")

# ==================== 30_engine.js：dealDamageToPlayer ====================
E(ENG,
  "function dealDamageToPlayer(n, attacker, floatDelay){\n",
  "function dealDamageToPlayer(n, attacker, floatDelay, opt){\n")

E(ENG,
  "  if(loss>0){\n"
  "    const doFx=()=>{ sfx('hurt'); hurtVignette(); heroAnim('hit'); const bar=document.querySelector('#player-panel .hpbar'); floatDamage('-'+loss, 'to-player', bar); };\n"
  "    if(floatDelay) setTimeout(doFx, floatDelay); else doFx();\n"
  "  }\n",
  "  /* v0.61.25：连击每段改响 enemy_multi（短促），单次攻击仍响 hurt 但按伤害量变调；\n"
  "     这一段的伤害被格挡吃光也出声（否则整轮连击全被挡下会一片死寂）。 */\n"
  "  const doFx=()=>{\n"
  "    if(opt && opt.multi) sfx('enemy_multi'); else sfx('hurt', { rate:sfxDamageRate(loss) });\n"
  "    if(loss<=0) return;\n"
  "    hurtVignette(); heroAnim('hit'); const bar=document.querySelector('#player-panel .hpbar'); floatDamage('-'+loss, 'to-player', bar);\n"
  "  };\n"
  "  if(loss>0 || (opt && opt.multi)){ if(floatDelay) setTimeout(doFx, floatDelay); else doFx(); }\n")

E(ENG,
  "    if((G.thorns||0)>0){ attacker.hp-=G.thorns; log(`荆棘/反震：反弹 ${G.thorns} 点伤害给 ${attacker.name}`); afterEnemyDamaged(attacker); }\n",
  "    if((G.thorns||0)>0){ sfx('thorns'); attacker.hp-=G.thorns; log(`荆棘/反震：反弹 ${G.thorns} 点伤害给 ${attacker.name}`); afterEnemyDamaged(attacker); }\n")

# ==================== 30_engine.js：applyCurse / drawCards / 消耗 / 二阶段 / 真伤 ====================
E(ENG,
  "  if(n>0) tipOnce('curse', '<b>【诅咒】</b>",
  "  if(n>0) sfx('card_curse');   // v0.61.25：施用诅咒的听感（天师整套牌的核心动作）\n"
  "  if(n>0) tipOnce('curse', '<b>【诅咒】</b>")

E(ENG,
  "  if(drawn.length) log(`摸 ${drawn.length} 张：${drawn.join('、')}`);\n",
  "  if(drawn.length){ sfx('card_draw'); log(`摸 ${drawn.length} 张：${drawn.join('、')}`); }\n")

E(ENG,
  "  sfx('card');\n  cardPlayFx(c);\n",
  "  sfx('card'); if(exNow) sfx('card_exhaust');   // v0.61.25：消耗牌额外给一声\n  cardPlayFx(c);\n")

E(ENG,
  "  e.intentIndex=0;\n  sfx('relic');\n  floatMsg('轮回 · 第二阶段');\n",
  "  e.intentIndex=0;\n  sfx('boss_phase2');   // v0.61.25：二阶段专用转场（原来是蹭遗物音）\n  floatMsg('轮回 · 第二阶段');\n")

E(ENG,
  "  sfx('hurt'); hurtVignette(); floatDamage('-'+n, 'to-player', document.querySelector('#player-panel .hpbar'));\n",
  "  sfx('atk_true');   // v0.61.25：真实伤害（忘忧拒饮 / 判官王清算）专用听感\n"
  "  hurtVignette(); floatDamage('-'+n, 'to-player', document.querySelector('#player-panel .hpbar'));\n")

# ==================== 30_engine.js：enemyAct 15 处出招音 ====================
E(ENG,
  "      case 'attack': { const d=e.intent.v+(e.pendingDamage||0);",
  "      case 'attack': { sfx('enemy_attack'); const d=e.intent.v+(e.pendingDamage||0);")
E(ENG,
  "      case 'charge': e.pendingDamage=(e.pendingDamage||0)+e.intent.v;",
  "      case 'charge': sfx('enemy_charge'); e.pendingDamage=(e.pendingDamage||0)+e.intent.v;")
E(ENG,
  "      case 'block': e.block+=e.intent.v; log(`",
  "      case 'block': sfx('enemy_block'); e.block+=e.intent.v; log(`")
E(ENG,
  "      case 'heal': e.hp=Math.min(e.maxHp, e.hp+e.intent.v); log(`",
  "      case 'heal': sfx('enemy_heal'); e.hp=Math.min(e.maxHp, e.hp+e.intent.v); log(`")
E(ENG,
  "      case 'weak': if(!G.debuffImmune){",
  "      case 'weak': sfx('enemy_debuff'); if(!G.debuffImmune){")
E(ENG,
  "      case 'gouhun': if(!G.debuffImmune){",
  "      case 'gouhun': sfx('enemy_debuff'); if(!G.debuffImmune){")
E(ENG,
  "      case 'strength': { const _sB4=e.strength||0;",
  "      case 'strength': { sfx('enemy_strength'); const _sB4=e.strength||0;")
E(ENG,
  "      case 'multi': for(let i=0;i<e.intent.n;i++){ if(G.hp<=0) break; dealDamageToPlayer(e.intent.v,e,i*140); } break;\n",
  "      case 'multi': for(let i=0;i<e.intent.n;i++){ if(G.hp<=0) break; dealDamageToPlayer(e.intent.v,e,i*140,{multi:true}); } break;\n")
E(ENG,
  "      case 'discard': if(!G.debuffImmune){",
  "      case 'discard': sfx('enemy_debuff'); if(!G.debuffImmune){")
E(ENG,
  "      case 'attackBlock': { dealDamageToPlayer(e.intent.v,e); e.block+=e.intent.block; log(`",
  "      case 'attackBlock': { sfx('enemy_attack'); dealDamageToPlayer(e.intent.v,e); if(e.intent.block>0) sfx('enemy_block'); e.block+=e.intent.block; log(`")
E(ENG,
  "      case 'summon': { const uk=e.intent.unit||'xiaojianshi';",
  "      case 'summon': { sfx('enemy_summon'); const uk=e.intent.unit||'xiaojianshi';")
E(ENG,
  "      case 'burn': if(!G.debuffImmune){",
  "      case 'burn': sfx('enemy_debuff'); if(!G.debuffImmune){")
E(ENG,
  "      case 'qingsuan': { const ledger=e.ledgerDmg||0;",
  "      case 'qingsuan': { sfx('enemy_qingsuan'); const ledger=e.ledgerDmg||0;")
E(ENG,
  "      case 'yehuo': if(!G.debuffImmune){",
  "      case 'yehuo': sfx('enemy_buff_self'); if(!G.debuffImmune){")
E(ENG,
  "      case 'wangyou': G.wangyouTurns=2;",
  "      case 'wangyou': sfx('enemy_debuff'); G.wangyouTurns=2;")
E(ENG,
  "      case 'dormant': log(`${e.name} 在观望`); break;\n",
  "      case 'dormant': sfx('enemy_dormant'); log(`${e.name} 在观望`); break;\n")

# ==================== 20_data.js：尸气 / 全局点击音 ====================
E(DAT,
  "  G.尸气 = Math.min(G.maxShiQi||12, (G.尸气||0)+n); }\n",
  "  const __before=(G.尸气||0);\n"
  "  G.尸气 = Math.min(G.maxShiQi||12, __before+n);\n"
  "  if(G.尸气>__before) sfxOnce('card_shiji', 120); }   // v0.61.25：尸气真的涨了才出声，且防同帧叠音\n")

E(DAT,
  "document.addEventListener('click', function(e){\n"
  "  if(!(e.target && e.target.closest && e.target.closest('[data-tip]'))) hideTip();\n"
  "});\n",
  "document.addEventListener('click', function(e){\n"
  "  /* v0.61.25：全局按钮点击音 —— 原来全项目零按钮音。只对可点元素出声，\n"
  "     免得拖卡、点空白也响；40ms 节流防抖。 */\n"
  "  try{\n"
  "    const bt=e.target && e.target.closest ? e.target.closest('button,.btn,[onclick],.map-node,[role=\"button\"]') : null;\n"
  "    if(bt) sfxOnce('ui_click', 40);\n"
  "  }catch(err){}\n"
  "  if(!(e.target && e.target.closest && e.target.closest('[data-tip]'))) hideTip();\n"
  "});\n")

# ==================== 50_ui.js：三选一 / 地图选点 ====================
E(UI,
  "function pickReward(i){\n  const c=G.rewardPicks[i];\n",
  "function pickReward(i){\n  sfx('ui_reward');   // v0.61.25：三选一翻牌音\n  const c=G.rewardPicks[i];\n")

E(UI,
  "function chooseNode(c){\n  const node=MAP[G.mapRow][c];\n",
  "function chooseNode(c){\n  sfx('ui_map');   // v0.61.25：地图选点音\n  const node=MAP[G.mapRow][c];\n")


def main():
    cache = {}
    bad = []
    for f, a, b in EDITS:
        if f not in cache:
            cache[f] = io.open(os.path.join(ROOT, f), encoding='utf-8', newline='').read()
        n = cache[f].count(a)
        if n != 1:
            bad.append((f, n, a[:60]))
            continue
        cache[f] = cache[f].replace(a, b, 1)

    if bad:
        print('FAIL 锚点不唯一/缺失，整体未落盘：')
        for f, n, s in bad:
            print('  [%s] count=%d  %r' % (f, n, s))
        return 1

    for f, s in cache.items():
        io.open(os.path.join(ROOT, f), 'w', encoding='utf-8', newline='').write(s)
        print('OK %s' % f)
    print('OK 共落地 %d 处改动' % len(EDITS))
    return 0


if __name__ == '__main__':
    sys.exit(main())
