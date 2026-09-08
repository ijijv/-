# -*- coding: utf-8 -*-
import json, difflib, re

d = json.load(open('_cards_dump.json', encoding='utf-8'))
heroes = d['heroes']
cards = d['cards']

RN = {'white': '白', 'blue': '蓝', 'purple': '紫', 'gold': '金'}
TN = {'attack': '攻击', 'defense': '防御', 'skill': '技能', 'spirit': '鬼怪', 'junk': '废牌'}
TYPE_ORDER = ['attack', 'defense', 'skill', 'spirit', 'junk']
# 各类型的中文标题
TYPE_TITLE = {'attack': '⚔ 攻击牌', 'defense': '🛡 防御牌', 'skill': '🌀 技能牌', 'spirit': '👻 鬼怪牌(召唤/诅咒/魅惑)', 'junk': '🗑 废牌'}

# 卡牌在源码里的顺序索引（用于排序参考）
CARDS_ORDER = [c['id'] for c in cards]

def _toks(s):
    """切成 token：数字为独立 token，其余按连续文本切，避免中文粘连导致数字误切。"""
    return re.findall(r'\d+(?:\.\d+)?|[^0-9]+', s)

def _trim(x):
    return x.strip()

def diff_summary(base, up):
    """基础句 vs 升级句，返回『变化点』摘要（token 级比较，数字能正确对齐）。整句改写则给全文对比。"""
    if base == up:
        return ''
    # 特判：把数字全部替换为 # 后两侧结构完全相同 → 只是若干数值变了，数字逐位配对即可
    nb = re.findall(r'\d+(?:\.\d+)?', base)
    nu = re.findall(r'\d+(?:\.\d+)?', up)
    if re.sub(r'\d+(?:\.\d+)?', '#', base) == re.sub(r'\d+(?:\.\d+)?', '#', up) and len(nb) == len(nu):
        pairs = [f'「{a}」→「{b}」' for a, b in zip(nb, nu) if a != b]
        return '；'.join(pairs)
    tb, tu = _toks(base), _toks(up)
    sm = difflib.SequenceMatcher(None, tb, tu, autojunk=False)
    parts = []
    raw = 0  # 原始改动文本量（不含格式符号）
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            continue
        a = _trim(''.join(tb[i1:i2]))
        b = _trim(''.join(tu[j1:j2]))
        if not a and not b:
            continue
        raw += len(a) + len(b)
        if tag == 'replace':
            if a == b:
                continue
            parts.append(f'「{a}」→「{b}」')
        elif tag == 'insert':
            parts.append(f'新增「{b}」')
        elif tag == 'delete':
            parts.append(f'删除「{a}」')
    # 原始改动量过半（属于整段重写）时，给全文而非零碎 diff
    if raw > (len(base) + len(up)) * 0.55:
        return '（整段重写：效果从 `' + base + '` 变为 `' + up + '`）'
    return '；'.join(parts)

def hero_desc_of(c, hero):
    return c['desc'][hero]

def fmt_static(c):
    """静态元信息字符串"""
    bits = []
    bits.append(f"{RN.get(c.get('rarity'), '?')}·{TN.get(c.get('type'), c.get('type'))}")
    bits.append(f"费用 {c.get('cost', '?')}")
    if c.get('costU') is not None and c['costU'] < c.get('cost', 0):
        bits.append(f"升级后 {c['costU']} 费")
    if c.get('exhaust'):
        bits.append('消耗')
    return ' | '.join(bits)

def card_section(c, idx, prefix):
    o = []
    o.append(f"\n### {prefix}{idx:02d} · {c['name']}　`{c['id']}`")
    o.append(f"> {fmt_static(c)}")
    # 需求 / 备注
    notes = []
    if c.get('needs'):
        m = {'curse': '【诅咒】来源牌', 'summon': '【召唤】来源牌'}.get(c['needs'], c['needs'])
        notes.append(f"抽卡条件：牌组须含{m}")
    if c.get('exhaust'):
        notes.append('打出后本场移出（消耗）')
    if notes:
        o.append('> ' + '；'.join('🏷 ' + n for n in notes))
    o.append('')
    # 通用版
    gen = hero_desc_of(c, 'wuseng')          # 武僧=阴差
    o.append('**〔通用版 · 赶尸人/武僧/阴差〕**')
    o.append('')
    o.append('| | 效果 |')
    o.append('|---|---|')
    o.append('| **基础** | ' + gen['0'].replace('|', '\\|') + ' |')
    o.append('| **升级** | ' + gen['1'].replace('|', '\\|') + ' |')
    o.append('| **提升** | ' + (diff_summary(gen['0'], gen['1']) or '无（仅费用见上）') + ' |')
    o.append('')
    # 天师变体（若不同）
    ts = hero_desc_of(c, 'tianshi')
    if ts['0'] != gen['0'] or ts['1'] != gen['1']:
        o.append('**〔天师变体 · 符箓天师专属效果〕**')
        o.append('')
        o.append('| | 效果 |')
        o.append('|---|---|')
        o.append('| **基础** | ' + ts['0'].replace('|', '\\|') + ' |')
        o.append('| **升级** | ' + ts['1'].replace('|', '\\|') + ' |')
        o.append('| **提升** | ' + (diff_summary(ts['0'], ts['1']) or '无') + ' |')
        o.append('')
    # 赶尸人尸气强化（若 ganshiren 文本不同）
    gs = hero_desc_of(c, 'ganshiren')
    if gs['0'] != gen['0'] or gs['1'] != gen['1']:
        o.append('> 💡 **赶尸人额外**（纸人/小鬼等召唤牌）：' + gs['0'] + '')
        o.append('')
    return o

# ============ 文档组装 ============
L = []
L.append('# 志怪塔 · 卡牌机制与数值总表（从代码 v0.47 导出）')
L.append('')
L.append('> 本文件由脚本从 `原型.html` 的 `CARDS`/`HEROES` 数组自动导出，是玩家可读的「成品效果文案」。')
L.append('> 你直接改本表里的数值/效果后发给我，我按新表回改代码即可。改完我会重新导出覆盖本文件，保持基线同步。')
L.append('> 生成时间：2026-09-05。共 %d 张卡（另有「怨气」废牌由运行时生成，不在此表）。' % len(cards))
L.append('')
L.append('**图例**')
L.append('- 「升级」列相对「基础」的变化用【提升】行高亮：`「旧」→「新」`表示改值、`新增「…」`表示加了新效果、`删除「…」`表示去掉效果。')
L.append('- 部分效果写法用 `X/Y` 斜杠**同时表示基础/升级两档**（前=升级前，后=升级后，多为天师变体文案），如 `1/2 层`、`30%/50%`、`3/4 格挡`。此时【提升】行可能显示「无」，因升级变化已含在斜杠里。')
L.append('- 同一张卡在**天师**手里效果大多与其他人不同（诅咒联动流）；赶尸人/武僧/阴差三者共用「通用版」（仅纸人/小鬼等召唤牌对赶尸人多一条【尸气】强化提示）。')
L.append('- 通用升级若文本无变化但费用降低，会在标题行标注（如 `升级后 0 费`）。实际结算升级藏在 `eff:` 里、文案可能未完全反映，改数值时务必按附二行号回代码核对 `eff:`。')
L.append('')
L.append('---')
L.append('')

# 一、角色总览
L.append('## 一、四角色总览（起始牌组 / 被动 / 机制）')
L.append('')
for h in heroes:
    L.append(f"### {h['name']}　`{h['id']}`　—— {h['mech']}")
    L.append('')
    L.append('**被动：**' + h['passive'])
    L.append('')
    L.append('**起始牌组：**' + '、'.join(f"{cid}×{n}" for cid, n in h['deck']))
    L.append('')
L.append('---')
L.append('')

# 二、卡牌总表
L.append('## 二、卡牌总表（按类型分组，共 %d 张）' % len(cards))
L.append('')

grouped = {}
for c in cards:
    grouped.setdefault(c.get('type', 'skill'), []).append(c)

idx_all = 0
prefix_map = {'attack': '攻', 'defense': '防', 'skill': '技', 'spirit': '灵', 'junk': '废'}
for t in TYPE_ORDER:
    if t not in grouped:
        continue
    L.append(f"### {TYPE_TITLE.get(t, t)}")
    L.append('')
    for n, c in enumerate(grouped[t], 1):
        idx_all += 1
        for line in card_section(c, n, prefix_map.get(t, '卡')):
            L.append(line)
    L.append('')
L.append('---')
L.append('')

# 附注：已存在的机制常量 + 源码定位
L.append('## 附一：代码里相关机制表')
L.append('')
L.append('- **升级费用为 0 的牌**（`costU`）：铁布衫、静心诀、血祭、移形换影')
L.append('- **消耗牌**（`exhaust:true`）：噬魂术、钟馗镇魂、镇妖铃')
L.append('- **需前置机制才出现的牌**（`needs`）：噬魂术(诅咒来源)、群鬼乱舞(召唤来源)、附灵术(召唤来源)')
L.append('- 铁布衫/噬魂术/群鬼乱舞/桃木符/嗜血/百鬼夜行 的伤害是**动态值**（受当前格挡/诅咒/召唤数/失血影响），文案里给的是示例。')
L.append('- 每张卡的实际结算逻辑在 `eff:` 里（可能与文案细节有出入，改数值时两处要一起动）。')
L.append('')
L.append('## 附二：卡牌源码行号（原型.html，快速定位）')
L.append('')
src_lines = open('原型.html', encoding='utf-8').read().split('\n')
id_map = {}
for ln, text in enumerate(src_lines, 1):
    m = re.search(r"\{id:'([a-z_0-9]+)'", text)
    if m:
        id_map.setdefault(m.group(1), ln)
L.append('| 卡牌 | 行号 | 卡牌 | 行号 | 卡牌 | 行号 |')
L.append('|---|---|---|---|---|---|')
ids = [c['id'] for c in cards]
for i in range(0, len(ids), 3):
    cells = []
    for cid in ids[i:i + 3]:
        nm = next((c['name'] for c in cards if c['id'] == cid), cid)
        cells.append(f'`{cid}` {nm} · {id_map.get(cid, "?")}')
    while len(cells) < 3:
        cells.append('')
    L.append('| ' + ' | '.join(cells) + ' |')
L.append('')

open('卡牌机制数据总表_v047.md', 'w', encoding='utf-8').write('\n'.join(L))
print('written, sections:', idx_all)
