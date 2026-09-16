# -*- coding: utf-8 -*-
# v0.57 Block3 冒烟同步：尸王 每关开局在手牌 / 回合末留手 / 死亡后回弃牌堆进循环 / 三处删卡拦截
import io, sys

P = r"C:\Users\HP\Desktop\志怪塔\_patch\smoke_runner.js"
s = io.open(P, 'r', encoding='utf-8').read()

ANCHOR = "    __ok('A#48 尸王 同场唯一', g.summons.filter(function (s) { return s.type === 'shi_wang'; }).length === 1);"
NEW = ANCHOR + """
    // 尸王 常驻手牌 / 不可删除（Block3）
    g = __base('ganshiren'); g.deck = [__card('leifu'), __card('shi_wang')];
    try {
      startBattle(['youhun']);
      __ok('A#48b 尸王 每关开始在手牌', g.hand.some(function(c){ return c.id === 'shi_wang'; }), 'hand=' + g.hand.map(function(c){return c.id;}).join(','));
    } catch (e) { __ok('A#48b 尸王 每关开始在手牌', false, e.message); }
    g = __base('ganshiren'); g.hand = [__card('leifu'), __card('shi_wang')]; g.drawPile = [__card('jingang')];
    try { finishEndTurn();
      __ok('A#48c 尸王 回合末留手', g.hand.some(function(c){ return c.id === 'shi_wang'; }) && !g.discard.some(function(c){ return c.id === 'shi_wang'; }), 'handLen=' + g.hand.length + ' disc=' + g.discard.map(function(c){return c.id;}).join(','));
    } catch (e) { __ok('A#48c 尸王 回合末留手', false, e.message); }
    g = __base('ganshiren'); g.shiWangCard = __card('shi_wang'); g.summons = [{type:'shi_wang', v:10, dur:0}];
    try { onSummonDeath({type:'shi_wang', v:10, dur:0});
      __ok('A#48d 尸王 死亡后回弃牌堆进循环', g.shiWangCard === null && g.discard.some(function(c){ return c.id === 'shi_wang'; }), 'shiWangCard=' + g.shiWangCard + ' disc=' + g.discard.map(function(c){return c.id;}).join(','));
    } catch (e) { __ok('A#48d 尸王 死亡后回弃牌堆进循环', false, e.message); }
    g = __base('ganshiren'); g.deck = [__card('leifu'), __card('shi_wang')]; doUnknownRemove(1);
    __ok('A#48e 尸王 净坛不可删', g.deck.length === 2 && g.deck[1].id === 'shi_wang', 'len=' + g.deck.length);
    g = __base('ganshiren'); g.deck = [__card('leifu'), __card('shi_wang')]; doCampRemove(1);
    __ok('A#48f 尸王 篝火不可删', g.deck.length === 2 && g.deck[1].id === 'shi_wang', 'len=' + g.deck.length);
    g = __base('ganshiren'); g.deck = [__card('leifu'), __card('shi_wang')]; doRemove(1);
    __ok('A#48g 尸王 商店不可删', g.deck.length === 2 && g.deck[1].id === 'shi_wang', 'len=' + g.deck.length);
"""

n = s.count(ANCHOR)
if n != 1:
    print('ANCHOR FAIL: 匹配 %d 次（期望 1）' % n); sys.exit(1)
s = s.replace(ANCHOR, NEW)
io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH v57_block3b SMOKE DONE')
