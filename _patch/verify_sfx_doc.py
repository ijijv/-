# -*- coding: utf-8 -*-
"""
校验 素材清单.md 的 §1.6 与 js/10_audio.js 的 SFX_TABLE 是否逐键对齐。

§1.6 是交付单 —— 它写了什么文件名，用户就会去做什么文件。
**多写一个键名 = 用户白做一个文件；少写一个 = 那个键永远没素材。**
所以这里做机器对齐，不靠眼看。

做法：从 §1.6 里抓 `key_N.mp3` 形式的文件名 → 得键集合；
与 SFX_KEYS（从 js/10_audio.js 的 SFX_TABLE 现场导出）求差集；再盘点 🔗/⏳/🚫 标记是否自洽。

键名表由本脚本**自己跑冒烟宿主导出**，不依赖预先存在的中间文件
（`_patch/_*.json` 已在 .gitignore 里，不能要求它有）。

用法：
    python _patch/verify_sfx_doc.py            # 重新导出键名表并校验
    python _patch/verify_sfx_doc.py --cached   # 用上次导出的表（省一次 node 启动）
"""
import io
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
LIST = os.path.join(ROOT, '素材清单.md')
KEYS_JSON = os.path.join(HERE, '_sfx_keys.json')

BAD = 0


def bad(msg):
    global BAD
    BAD += 1
    print('  FAIL %s' % msg)


def dump_keys(use_cache):
    """跑冒烟宿主，导出 SFX_TABLE 的键名顺序（即 SFX_KEYS）。"""
    if use_cache and os.path.exists(KEYS_JSON):
        raw = io.open(KEYS_JSON, encoding='utf-8').read()
        print('键名表：用缓存的 %s' % os.path.relpath(KEYS_JSON, ROOT))
    else:
        env = dict(os.environ, SMOKE_DUMP='JSON.stringify(SFX_KEYS)')
        host = os.path.join(HERE, 'smoke_host.js')
        print('键名表：跑 %s 现场导出…' % os.path.relpath(host, ROOT))
        try:
            p = subprocess.run(['node', host], cwd=ROOT, env=env,
                               stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        except OSError as e:
            print('FAIL 跑不了 node（%s）' % e)
            return None
        out = p.stdout.decode('utf-8', 'replace')
        m = re.search(r'__DUMP__(.*)', out)
        if not m:
            print('FAIL 冒烟宿主没吐出 __DUMP__（SFX_KEYS 取不到）')
            return None
        raw = m.group(1).strip()
        io.open(KEYS_JSON, 'w', encoding='utf-8', newline='').write(raw)

    try:
        keys = json.loads(raw)
    except ValueError as e:
        print('FAIL 键名表不是合法 JSON：%s' % e)
        return None
    # SMOKE_DUMP 打印的是 __DUMP__ + JSON.stringify(值)，值本身是字符串时会再套一层引号
    if isinstance(keys, str):
        keys = json.loads(keys)
    if not isinstance(keys, list) or not keys or not all(isinstance(k, str) for k in keys):
        print('FAIL 键名表读出来不是非空字符串数组')
        return None
    print('SFX_TABLE 键名 %d 个' % len(keys))
    return keys


def main():
    doc = io.open(LIST, encoding='utf-8', newline='').read()
    keys = dump_keys('--cached' in sys.argv)
    if keys is None:
        return 1

    # 只取 §1.6 这一段（到下一个 "## " 为止）
    m = re.search(r'^### 1\.6 .*?(?=^## )', doc, re.S | re.M)
    if not m:
        print('FAIL 找不到 §1.6')
        return 1
    sec = m.group(0)
    print('§1.6 长度 %d 字符' % len(sec))

    # 表格行：| n | `key_v.mp3` 标记 | ... |
    rows = re.findall(r'^\|\s*(\d+)\s*\|\s*`([a-z0-9_]+)_\d+\.mp3`\s*([^|]*)\|', sec, re.M)
    print('抓到交付行 %d 条' % len(rows))

    if len(rows) != 70:
        bad('交付行数 %d ≠ 70' % len(rows))

    nums = [int(n) for n, _, _ in rows]
    if nums != list(range(1, 71)):
        bad('编号不连续：%s' % nums)

    doc_keys = [k for _, k, _ in rows]
    dup = [k for k in set(doc_keys) if doc_keys.count(k) > 1]
    if dup:
        bad('重复键名：%s' % dup)

    missing = [k for k in keys if k not in doc_keys]
    extra = [k for k in doc_keys if k not in keys]
    if missing:
        bad('SFX_TABLE 里有、§1.6 没写（用户不会做）: %s' % missing)
    if extra:
        bad('§1.6 写了、SFX_TABLE 里没有（用户白做）: %s' % extra)

    # 顺序：§1.6 按「组」排，遗留键 hit 被放回 A 组打击层（表里它在末尾），
    # 所以整体会错位 1 格。**要看的是相对次序**：剔除 hit 后两条序列必须逐位相同。
    d2 = [k for k in doc_keys if k != 'hit']
    k2 = [k for k in keys if k != 'hit']
    if d2 != k2:
        first = next(i for i, (a, b) in enumerate(zip(d2, k2)) if a != b)
        bad('剔除 hit 后次序仍不一致：第 %d 位 doc=%s vs tbl=%s' % (first + 1, d2[first], k2[first]))
    else:
        print('顺序：剔除遗留键 hit 后与 SFX_TABLE 逐位一致（hit 归 A 组打击层、表里在末尾，'
              '整体错位 1 格属有意排布）')

    # 标记自洽：🔗 / ⏳ / 🚫 / ✅ 计数
    flags = {'link': 0, 'todo': 0, 'nah': 0, 'have': 0}
    for _, _, tag in rows:
        if '🔗' in tag:
            flags['link'] += 1
        if '⏳' in tag:
            flags['todo'] += 1
        if '🚫' in tag:
            flags['nah'] += 1
        if '✅' in tag:
            flags['have'] += 1
    print('标记：🔗%d  ⏳%d  🚫%d  ✅%d' % (flags['link'], flags['todo'], flags['nah'], flags['have']))
    if flags['link'] + flags['todo'] + flags['nah'] != 70:
        bad('🔗+⏳+🚫 = %d ≠ 70（有条目既没接线也没待接线）'
            % (flags['link'] + flags['todo'] + flags['nah']))

    # 文档里声明的底数必须与实际相符
    for pat, want, name in [(r'🔗 已接线 (\d+) 条', flags['link'], '🔗'),
                            (r'⏳ 待接线 (\d+) 条', flags['todo'], '⏳'),
                            (r'🚫 不必买 (\d+) 条', flags['nah'], '🚫')]:
        mm = re.search(pat, sec)
        if not mm:
            bad('正文没声明 %s 的条数' % name)
        elif int(mm.group(1)) != want:
            bad('正文声明 %s=%s，实际 %d' % (name, mm.group(1), want))

    # 已交付的 26 个 ✅ 文件必须真的在 素材/sfx/ 下
    sfxdir = os.path.join(ROOT, '素材', 'sfx')
    on_disk = set()
    if os.path.isdir(sfxdir):
        for f in os.listdir(sfxdir):
            mm = re.match(r'^([a-z0-9_]+)_\d+\.(mp3|ogg|wav|m4a)$', f)
            if mm:
                on_disk.add(mm.group(1))
    print('素材/sfx/ 实际文件键 %d 个' % len(on_disk))
    if flags['have'] != len(on_disk):
        bad('§1.6 标 ✅ 的有 %d 个，磁盘上实际 %d 个（标注与实际不符）'
            % (flags['have'], len(on_disk)))
    not_marked = sorted(on_disk - set(k for _, k, t in rows if '✅' in t))
    if not_marked:
        bad('磁盘上有却没标 ✅：%s' % not_marked)
    marked_missing = sorted(set(k for _, k, t in rows if '✅' in t) - on_disk)
    if marked_missing:
        bad('标了 ✅ 但磁盘上没有：%s' % marked_missing)

    # 没标 ✅ 的键，磁盘上也不该有（否则是重复交付/命名不符）
    extra_disk = sorted(on_disk - set(k for _, k, t in rows if '✅' in t))
    if extra_disk and not not_marked:
        bad('磁盘上多出未在 ✅ 里的键：%s' % extra_disk)

    # 指向 §1.6 的交叉引用
    for anchor in ['1.6 按文件平铺交付单']:
        n = doc.count(anchor)
        print('交叉引用「%s」出现 %d 次' % (anchor, n))
        if n < 3:
            bad('交叉引用过少（应 ≥3：标题 + §1.1 指路 + §1.3 指路）')

    print()
    if BAD:
        print('=== %d 项不合格 ===' % BAD)
        return 1
    print('=== §1.6 与 SFX_TABLE 逐键对齐，全部合格 ===')
    return 0


if __name__ == '__main__':
    sys.exit(main())