# -*- coding: utf-8 -*-
"""素材清单.md §1.6 交付单：✅ 标记从 26 个同步到 69 个（用户已交付）。

依据（本次现场核对，不是推断）：
  · `python _patch/verify_sfx_doc.py` → 「素材/sfx/ 实际文件键 69 个」，70 条里只有
    已退役的 `hit` 没有文件（该行本就是 🚫），即**可交付键 100% 到位**。
  · §1.6 里 ` 🔗 |` 结尾的行 43 条、` ✅🔗 |` 结尾的行 26 条（43+26=69），
    故本批把 43 条补上 ✅，总数归 69。
  · 变体数亦已达标：65 键正好等于建议变体数，`hit_guard` 多给 1 个（3 / 建议 2），
    **0 键低于建议**（用一次性脚本按 §1.6「建议 N 变体」逐行比对 素材/sfx/ 实际文件数）。

只改「你已交付多少」这一个事实，不改任何别的口径：
  · §1.5 / §1.3 / 文末「先按第一批 26 条去搜」的 **26 是「第一批优先采购 26 个键」**，
    与「已交付数」是两码事，**一律不动**（grep 已确认这 4 处在 732/736/1057/1058 行）。
  · 无游戏代码变更 → 不动版本号、不写更新日志（不谎报新版本）。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOC = os.path.join(ROOT, '素材清单.md')

raw = io.open(DOC, encoding='utf-8').read()
nl = '\r\n' if '\r\n' in raw else '\n'
body = raw.replace('\r\n', '\n')
orig = body

errs = []


def rep(old, new, want=1, tag=''):
    global body
    n = body.count(old)
    if n != want:
        errs.append('%s 锚点命中 %d 次，期望 %d 次' % (tag or old[:40].replace('\n', '\\n'), n, want))
        return
    body = body.replace(old, new)


# ── 0. 幂等：已同步过（43 条已补完、✅ 归 69）就直接报平安退出，别报成「锚点失效」──
if body.count(' 🔗 |') == 0 and body.count(' ✅🔗 |') == 69:
    print('=== 已经同步过了（✅ 69 条 = 全部可交付键），无需重跑 ===')
    sys.exit(0)

# ── 1. 43 条未标 ✅ 的交付行补标（已标的行是 ` ✅🔗 |`，前一位不是空格，不会误伤）──
n_gap = body.count(' 🔗 |')
if n_gap != 43:
    errs.append('§1.6 未标 ✅ 的交付行有 %d 条，期望 43 条' % n_gap)
else:
    body = body.replace(' 🔗 |', ' ✅🔗 |')

# 复算：补完后带 ✅ 的行必须是 69（= 全部可交付键）
n_done = body.count(' ✅🔗 |')
if n_done != 69:
    errs.append('补标后 ✅ 行有 %d 条，期望 69 条' % n_done)

# ── 2. §1.6 图例里的已交付数 ──
rep('> ｜ **✅** 你已经有这个文件了（26 个，`verify_dist.py` 的 [2b] 已机器确认键名全部合法）',
    '> ｜ **✅** 你已经有这个文件了 —— 现为 **69 个 = 全部可交付键**（70 条里唯一的遗留键 `hit` 已退役不用交，'
    '`verify_dist.py` 的 [2b] 已机器确认键名全部合法）\n'
    '> ｜ 变体数也已达标：65 键正好等于建议变体数，`hit_guard` 多给 1 个（3 / 建议 2），**0 键低于建议**。',
    tag='§1.6 图例 ✅ 数')

# ── 3. 「怎么开始」第 1 条里的已交付数 ──
rep('   你已经放好了其中 26 个（标 ✅ 的）。',
    '   你已经放好了**全部 69 个**（标 ✅ 的）—— 只剩已退役的 `hit` 无需交付，音效这一块已经收工。',
    tag='怎么开始 第1条 ✅ 数')

if errs:
    print('=== 锚点校验失败，未写入 ===')
    for e in errs:
        print(' ✗', e)
    sys.exit(1)

if body == orig:
    print('=== 没有任何改动（可能已跑过）===')
    sys.exit(1)

try:
    io.open(DOC, 'w', encoding='utf-8', newline='').write(body.replace('\n', nl))
except PermissionError:
    print('=== 写入失败：文件被占用（编辑器打开着《素材清单.md》？）关掉后重跑本脚本即可 ===')
    sys.exit(2)

print('OK 素材清单.md 已更新：%d → %d 字符' % (len(orig), len(body)))
print('  §1.6 补标 ✅ ：%d 条（补完后共 %d 条 = 全部可交付键）' % (n_gap, n_done))