# -*- coding: utf-8 -*-
"""志怪塔 · 卡牌机制与数值总表 生成器（v0.62.0）

用法：
    # 1) 先从**游戏作用域**导出三份事实 JSON（唯一权威 = js/20_data.js 的 CARDS/HEROES）
    #    这三个文件是**输入**，跟 _patch/ 下其它 _cards_*.json 一样要留着，--check 也依赖它们。
    cd <repo>
    SMOKE_DUMP='(function(){function s(v){if(typeof v==="function")return "[fn]";if(v&&typeof v==="object")return JSON.parse(JSON.stringify(v));return v;}var out=CARDS.map(function(c){var o={};for(var k in c)o[k]=s(c[k]);return o;});return JSON.stringify(out);})()' \
        node _patch/smoke_host.js | sed 's/^__DUMP__//' > _patch/_cards_meta_v620.json
    SMOKE_DUMP='(function(){var out=[];var hs=["ganshiren","wuseng","yincha","tianshi"];for(var i=0;i<hs.length;i++){G.hero=hs[i];for(var j=0;j<CARDS.length;j++){var c=CARDS[j];out.push({h:hs[i],id:c.id,name:c.name,type:c.type,rarity:c.rarity,cost:c.cost,sealed:c.sealed,t0:c.t(false),t1:c.t(true)});}}return JSON.stringify(out);})()' \
        node _patch/smoke_host.js | sed 's/^__DUMP__//' > _patch/_cards_4col_v620.json
    SMOKE_DUMP='JSON.stringify(HEROES.map(function(h){return {id:h.id,name:h.name,desc:h.desc,mech:h.mech,passive:h.passive,deck:h.deck};}))' \
        node _patch/smoke_host.js | sed 's/^__DUMP__//' > _patch/_heroes_v620.json
    # 2) 生成 / 核对
    python _patch/gen_card_doc.py --refresh   # 重新导出三份事实 JSON + 覆盖写入总表（一条命令搞定）
    python _patch/gen_card_doc.py             # 只按现有 JSON 覆盖写入总表
    python _patch/gen_card_doc.py --check     # 只比对，过期则 exit 1（收尾核对时跑这个）

下面 DUMP_EXPR 里存了那三条表达式，所以 --refresh 不用你手敲 —— 见 refresh_dumps()。

为什么要有这个脚本：v0.47 那份总表自称「由脚本从 原型.html 的 CARDS 自动导出」，但
自 v0.61.05 起 原型.html 已经没有内联 <script> 了（只有 <script src="js/xx.js">），
那份导出脚本（_patch/dump_cards.js）早就失效 —— 文档于是漂了 19 个版本没人发现。
本脚本走 smoke_host.js 的 SMOKE_DUMP（在 Node VM 里按 原型.html 的 <script src> 顺序
拼装 7 个脚本后求值），是这条链路上**唯一还活着**的取数方式。

⚠️ 一律**覆盖写入**。不要手改产物 —— 下次导出就没了。
"""
import io
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATCH = os.path.join(ROOT, '_patch')
OUT = os.path.join(ROOT, '卡牌机制数据总表_v062.md')

HERO_ORDER = ['ganshiren', 'wuseng', 'yincha', 'tianshi']
HERO_NAME = {'ganshiren': '赶尸人', 'wuseng': '武僧', 'yincha': '阴差', 'tianshi': '天师'}
TYPE_SEC = [
    ('attack', '⚔ 攻击牌', '攻'),
    ('defense', '🛡 防御牌', '防'),
    ('skill', '🌀 技能牌', '技'),
    ('spirit', '👻 鬼怪牌(召唤/诅咒/魅惑)', '灵'),
]
TYPE_CN = {'attack': '攻击', 'defense': '防御', 'skill': '技能', 'spirit': '鬼怪'}
RARITY_CN = {'white': '白', 'blue': '蓝', 'purple': '紫', 'gold': '金'}


def load(name):
    """SMOKE_DUMP 打出来的东西是**再 JSON 编码过一次**的字符串（__DUMP__"{\\"...")，
    sed 掉前缀后还是带引号的 JSON 字符串 ⇒ 要 loads 两次。踩过。"""
    raw = io.open(os.path.join(PATCH, name), 'r', encoding='utf-8').read().strip()
    return json.loads(json.loads(raw))


# 三份事实 JSON 各自的 SMOKE_DUMP 表达式（与文件头的用法说明保持一致）
DUMP_EXPR = {
    '_cards_meta_v620.json':
        '(function(){function s(v){if(typeof v==="function")return "[fn]";'
        'if(v&&typeof v==="object")return JSON.parse(JSON.stringify(v));return v;}'
        'var out=CARDS.map(function(c){var o={};for(var k in c)o[k]=s(c[k]);return o;});'
        'return JSON.stringify(out);})()',
    '_cards_4col_v620.json':
        '(function(){var out=[];var hs=["ganshiren","wuseng","yincha","tianshi"];'
        'for(var i=0;i<hs.length;i++){G.hero=hs[i];for(var j=0;j<CARDS.length;j++){var c=CARDS[j];'
        'out.push({h:hs[i],id:c.id,name:c.name,type:c.type,rarity:c.rarity,cost:c.cost,'
        'sealed:c.sealed,t0:c.t(false),t1:c.t(true)});}}return JSON.stringify(out);})()',
    '_heroes_v620.json':
        'JSON.stringify(HEROES.map(function(h){return {id:h.id,name:h.name,desc:h.desc,'
        'mech:h.mech,passive:h.passive,deck:h.deck};}))',
}


def refresh_dumps():
    """重新从游戏作用域导出三份事实 JSON。
    有了这个，重新导出就是一条命令 —— v0.47 那份总表之所以能漂 19 个版本没人发现，
    一半原因就是「重新导出」当时得手敲三条长命令。"""
    env = dict(os.environ)
    for fname, expr in DUMP_EXPR.items():
        env['SMOKE_DUMP'] = expr
        r = subprocess.run(['node', os.path.join(PATCH, 'smoke_host.js')],
                           cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        out = r.stdout.decode('utf-8', 'replace').strip()
        if not out.startswith('__DUMP__'):
            sys.stderr.write('导出 %s 失败（node 返回 %d）：\n%s\n'
                             % (fname, r.returncode, (out + r.stderr.decode('utf-8', 'replace'))[:800]))
            return 1
        payload = out[len('__DUMP__'):]
        json.loads(json.loads(payload))   # 先校验能解析，别把垃圾写进事实源
        io.open(os.path.join(PATCH, fname), 'w', encoding='utf-8', newline='\n').write(payload + '\n')
        print('导出 %s  %.1f KB' % (fname, len(payload) / 1024.0))
    return 0


def cost_of(v, hero):
    """cost/costU 可能是数字，也可能是 {hero: n, default: n} 的按角色表。"""
    if isinstance(v, dict):
        if hero in v:
            return v[hero]
        return v.get('default')
    return v


def hero_list_of(v):
    """把 {hero:..} 形式的键按固定顺序排出来（用于「仅某角色」这类说明）。"""
    return [HERO_NAME[h] for h in HERO_ORDER if h in v]


def num_diff(t0, t1):
    """给「提升」行做**朴素**数字差分：两边数字个数一样就逐个配对，不同的写成「a」→「b」。
    个数不一样（升级多了/少了一句）就老实说「文案变化」—— 编一个假差分比不写更糟。"""
    a = re.findall(r'\d+', t0)
    b = re.findall(r'\d+', t1)
    if not a and not b:
        return '升级无文案变化'
    if len(a) != len(b):
        return '升级**文案变化**（数字个数不同，见上两行）'
    ch = ['「%s」→「%s」' % (x, y) for x, y in zip(a, b) if x != y]
    return '、'.join(ch) if ch else '升级无文案变化'


def variant_blocks(t0s, t1s):
    """把 4 个角色的 (基础,升级) 文案按**实际取值**分组。
    v0.47 版只假设「天师 vs 其余三家」两栏 —— 实测 48 张里有 42 张的文案随角色变，
    分组数不固定，所以这里按真值动态分组，别写死两栏。"""
    groups = []
    for h in HERO_ORDER:
        key = (t0s[h], t1s[h])
        for g in groups:
            if g['key'] == key:
                g['heroes'].append(h)
                break
        else:
            groups.append({'key': key, 'heroes': [h]})
    return groups


def main():
    if '--refresh' in sys.argv:
        rc = refresh_dumps()
        if rc:
            return rc
    cards = load('_cards_meta_v620.json')
    cols = load('_cards_4col_v620.json')
    heroes = load('_heroes_v620.json')

    by_id = {c['id']: c for c in cards}
    name_of = {c['id']: c['name'] for c in cards}
    t0s = {}
    t1s = {}
    for r in cols:
        t0s.setdefault(r['id'], {})[r['h']] = r['t0']
        t1s.setdefault(r['id'], {})[r['h']] = r['t1']

    L = []
    w = L.append

    w('# 志怪塔 · 卡牌机制与数值总表（从代码 v0.62.0 导出）')
    w('')
    w('> ⚠️ **本文件由 `_patch/gen_card_doc.py` 从 `js/20_data.js` 的 `CARDS`/`HEROES` 自动导出，'
      '每次运行**覆盖写入**。**不要手改本文件** —— 手改会在下次导出时丢失。**要改数值请改代码。**')
    w('> 生成时间：2026-09-26。共 **%d** 张卡（另有「怨气」废牌由运行时生成，不在此表）。' % len(cards))
    w('> 编号按 `js/20_data.js` 里 `CARDS` 的数组顺序，**与 v0.47 版编号不同**（旧版顺序是手排的）。')
    w('> 取代 `卡牌机制数据总表_v047.md` —— 那份自称 v0.47 导出，实际停在 19 个版本前。')
    w('')
    w('**图例**')
    w('- 「基础」= 未升级文案，「升级」= 升级后文案（都取自卡牌自己的 `t(upgrade)` 函数，是**成品文案**）。')
    w('- 「提升」行是**朴素数字差分**：只在两边数字个数相同时逐个配对比较；个数不同就写「文案变化」，'
      '不去猜哪个数字对应哪个。')
    w('- **文案随角色变**：同一张卡在不同角色手里的效果大多不同（天师整套围着【诅咒】转，'
      '赶尸人围着【尸气】，阴差围着【血怒】）。所以下面按**实测的变体分组**列，可能 1 组也可能 4 组，'
      '没有固定栏数。')
    w('- 实际结算逻辑在代码的 `eff:` 里，**可能与文案有出入**；改数值时两处要一起动。')
    w('')
    w('---')
    w('')

    # ---- 一、四角色总览 ----
    w('## 一、四角色总览（起始牌组 / 被动 / 机制）')
    w('')
    for h in heroes:
        w('### %s　`%s`　—— %s' % (h['name'], h['id'], h['mech']))
        w('')
        w('**描述：**%s' % h['desc'])
        w('')
        w('**被动：**%s' % h['passive'])
        w('')
        deck = '、'.join('%s×%d' % (name_of.get(cid, cid), n) for cid, n in h['deck'])
        w('**起始牌组（共 %d 张）：**%s' % (sum(n for _, n in h['deck']), deck))
        w('')

    # ---- 二、卡牌总表 ----
    w('---')
    w('')
    w('## 二、卡牌总表（按类型分组，共 %d 张）' % len(cards))
    w('')

    for tkey, tsec, tpre in TYPE_SEC:
        w('### %s' % tsec)
        w('')
        n = 0
        for c in cards:
            if c['type'] != tkey:
                continue
            n += 1
            cid = c['id']
            w('### %s%02d · %s　`%s`' % (tpre, n, c['name'], cid))
            # 标题行：稀有度·类型 | 费用
            cost = c.get('cost')
            if isinstance(cost, dict):
                cs = ' / '.join('%s %s' % (HERO_NAME[h], cost_of(cost, h)) for h in HERO_ORDER)
                w('> %s·%s | 费用**按角色**：%s' % (RARITY_CN.get(c['rarity'], c['rarity']), TYPE_CN[tkey], cs))
            else:
                w('> %s·%s | 费用 %s' % (RARITY_CN.get(c['rarity'], c['rarity']), TYPE_CN[tkey], cost))
            if c.get('exhaust'):
                w('> 🏷 **消耗**：打出后本场移出')
            if c.get('exhaustOnly'):
                w('> 🏷 **消耗**（仅 %s）：打出后本场移出' % '、'.join(hero_list_of(c['exhaustOnly'])))
            w('')
            for g in variant_blocks(t0s[cid], t1s[cid]):
                label = '、'.join(HERO_NAME[h] for h in g['heroes'])
                tag = '通用版' if len(g['heroes']) == 4 else ('仅 %s' % label)
                w('**〔%s〕**' % tag)
                w('')
                w('| | 效果 |')
                w('|---|---|')
                w('| **基础** | %s |' % g['key'][0])
                w('| **升级** | %s |' % g['key'][1])
                w('| **提升** | %s |' % num_diff(g['key'][0], g['key'][1]))
                w('')

    # ---- 附一 ----
    w('---')
    w('')
    w('## 附一：代码里相关机制表（本表也由脚本导出）')
    w('')
    exh = [name_of[c['id']] for c in cards if c.get('exhaust')]
    w('- **消耗牌**（`exhaust:true`，打出后本场移出，共 %d 张）：%s' % (len(exh), '、'.join(exh)))
    eo = ['%s（%s）' % (name_of[c['id']], '、'.join(hero_list_of(c['exhaustOnly'])))
          for c in cards if c.get('exhaustOnly')]
    w('- **只对特定角色消耗**（`exhaustOnly`，共 %d 张）：%s' % (len(eo), '、'.join(eo)))
    nd = [name_of[c['id']] for c in cards if c.get('needs')]
    w('- **需前置机制才出现**（`needs`，共 %d 张）：%s' % (len(nd), '、'.join(nd) if nd else '无'))
    hpc = [name_of[c['id']] for c in cards if c.get('hpCost')]
    w('- **有生命代价**（`hpCost`，共 %d 张）：%s —— 代价是**动态值**（随角色/升级浮动，由函数算出），'
      '本表不给具体数' % (len(hpc), '、'.join(hpc)))
    rt = [name_of[c['id']] for c in cards if c.get('retain')]
    rt_key = [name_of[c['id']] for c in cards if 'retain' in c]
    w('- **有保留标记**（`retain` 为**真**，共 %d 张）：%s'
      % (len(rt), '、'.join(rt) if rt else '无'))
    if len(rt_key) != len(rt):
        w('  （另有 %d 张卡带 `retain` 字段但值为 false，行为上**等于没有**：%s）'
          % (len(rt_key) - len(rt), '、'.join(x for x in rt_key if x not in rt)))
    sl = [name_of[c['id']] for c in cards if c.get('sealed')]
    sl_key = [name_of[c['id']] for c in cards if 'sealed' in c]
    w('- **封印牌**（`sealed` 为**真**，共 %d 张）：%s'
      % (len(sl), '、'.join(sl) if sl else '无'))
    if len(sl_key) != len(sl):
        w('  （另有 %d 张卡带 `sealed` 字段但值为 0，行为上**等于没有**：%s）'
          % (len(sl_key) - len(sl), '、'.join(x for x in sl_key if x not in sl)))
    w('')
    w('**基础费 / 升级费随角色变的牌**（`cost`/`costU` 是对象而不是数字）：')
    w('')
    w('| 卡牌 | 角色 | 基础费 | 升级费 |')
    w('|---|---|---|---|')
    for c in cards:
        if not (isinstance(c.get('cost'), dict) or isinstance(c.get('costU'), dict)):
            continue
        for h in HERO_ORDER:
            # costU 缺该角色且没有 default ⇒ 升级费**就是基础费**（不是 0！0 是个合法费用，
            # 用 `or` 兜会把「升级免费」和「没有折扣」混成一谈 —— 这里显式判 None）。
            cu = cost_of(c.get('costU'), h) if c.get('costU') is not None else None
            w('| %s `%s` | %s | %s | %s |'
              % (c['name'], c['id'], HERO_NAME[h],
                 cost_of(c.get('cost'), h),
                 '—' if cu is None else cu))
    w('')
    w('> 「升级费 = —」表示 `costU` 没有为该角色定义 ⇒ **升级不改变费用**。'
      '`costU: 0` 才是「升级后免费」，两者别混。')
    w('')
    w('> 其余牌的升级费 = 基础费（`costU` 未定义）。')
    w('')

    body = '\n'.join(L) + '\n'
    # --check：只比对，不写盘。存在的意义就是防止这份文档**再次静默腐烂** ——
    # v0.47 那份就是这么死的：导出脚本（dump_cards.js）在 v0.61.05 拆文件后失效，
    # 没人发现，文档漂了 19 个版本。现在把它挂进收尾核对清单即可。
    if '--check' in sys.argv:
        old = io.open(OUT, 'r', encoding='utf-8').read() if os.path.exists(OUT) else ''
        if old == body:
            print('OK  %s 与代码一致（%d 行）' % (OUT, len(L)))
            return 0
        print('STALE  %s 已过期 —— 重新跑 `python _patch/gen_card_doc.py`' % OUT)
        return 1
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(body)
    print('写入 %s  %d 行  %.1f KB' % (OUT, len(L), os.path.getsize(OUT) / 1024.0))
    print('卡数 %d  消耗 %d  仅角色消耗 %d  needs %d  hpCost %d  retain %d  sealed %d'
          % (len(cards), len(exh), len(eo), len(nd), len(hpc), len(rt), len(sl)))
    return 0


if __name__ == '__main__':
    sys.exit(main() or 0)