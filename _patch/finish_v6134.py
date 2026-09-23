# -*- coding: utf-8 -*-
"""v0.61.34 收尾：冒烟 → 清理 → 白名单校验 → 提交（本地，不 push）。

提交信息里**不写任何署名行**（用户 2026-09-24 指示，覆盖工具自身的署名指引）。
"""
import glob, json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def run(cmd):
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True,
                          encoding='utf-8', errors='replace')


# ── 1. 冒烟（必须全绿才继续）──
p = run(['node', os.path.join('_patch', 'smoke_host.js')])
try:
    rep = json.loads(p.stdout)
except Exception as e:
    print('!! 冒烟输出无法解析：', e)
    print((p.stdout or '')[:1500])
    print((p.stderr or '')[:1500])
    sys.exit(1)
print('冒烟 pass=%s fail=%s' % (rep.get('pass'), rep.get('fail')))
for e in (rep.get('errors') or []):
    print('  X', e)
if not rep.get('ok'):
    print('!! 冒烟未全绿，收尾中止')
    sys.exit(1)

# ── 2. 清理临时文件 ──
removed = []
for pat in (os.path.join(ROOT, '*.tmp'), os.path.join(ROOT, '_patch', '_pre_*.js')):
    for f in glob.glob(pat):
        os.remove(f)
        removed.append(os.path.relpath(f, ROOT))
print('清理临时文件：', removed or '（无）')

# ── 3. 白名单（防 git add -A 把杂物带进提交）──
ALLOW = {
    '原型.html', '更新日志.md',
    'js/10_audio.js', 'js/60_boot.js',
    '_patch/verify_dist.py', '_patch/smoke_runner.js',
    '_patch/patch_v6134_bgmtracks.py', '_patch/patch_v6134_smokefix.py',
    '_patch/patch_v6134_changelog.py', '_patch/finish_v6134.py',
}
st = run(['git', '-c', 'core.quotepath=false', 'status', '--porcelain'])
lines = [l for l in (st.stdout or '').splitlines() if l.strip()]
print('--- git status --short ---')
for l in lines:
    print(' ', l)
bad = []
for l in lines:
    path = l[3:].strip().strip('"')
    if ' -> ' in path:
        path = path.split(' -> ')[-1]
    if path not in ALLOW:
        bad.append(l)
if bad:
    print('!! 有白名单外的改动，未提交：')
    for l in bad:
        print('   ', l)
    sys.exit(1)

# ── 4. 提交（提交.py 自己从 原型.html 读版本号做前缀；本地不 push）──
MSG = ('BGM 六轨接线核实：v0.61.31 早已接通（普通/精英/Boss/商店四条路由），'
       '更正上条提交信息里"代码仍只认三轨、接线未做"的错误表述；'
       '新增 BGM_KNOWN_TRACKS 轨名真相源 + verify_dist [2c] 逐文件核对磁盘文件名（拼错硬红）、'
       '[1c] 真相源一致、[1] 基础 BGM 改为任一扩展名命中；setBGM 未登记轨名只警告不抛错；'
       '冒烟 846→862 全绿；dist 重建 15.01MB、verify_dist 全绿')
c = run([sys.executable, '提交.py', '-m', MSG])
print('--- 提交.py ---')
print((c.stdout or '').strip()[-1500:])
if c.returncode != 0:
    print((c.stderr or '').strip()[-1500:])
    sys.exit(1)
print('--- git log ---')
print((run(['git', 'log', '--oneline', '-3']).stdout or '').strip())

# ── 5. 提交后工作区是否干净 ──
st2 = run(['git', 'status', '--porcelain'])
left = [l for l in (st2.stdout or '').splitlines() if l.strip()]
print('提交后剩余未提交改动：', left or '（干净）')