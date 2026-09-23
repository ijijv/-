# -*- coding: utf-8 -*-
"""跑冒烟并打印一行摘要 + 失败清单（给「只能用 python _patch/*.py 形态」的场合用）。"""
import io, json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
host = os.path.join(ROOT, '_patch', 'smoke_host.js')
out = os.path.join(ROOT, '_patch', '_sm.json')

p = subprocess.run(['node', host], cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace')
io.open(out, 'w', encoding='utf-8').write(p.stdout or '')
print('node exit =', p.returncode)
if p.stderr and p.stderr.strip():
    print('--- stderr ---')
    print(p.stderr.strip()[:2000])
try:
    rep = json.loads(p.stdout)
except Exception as e:
    print('!! 无法解析冒烟输出:', e)
    print((p.stdout or '')[:2000])
    sys.exit(2)
print('pass =', rep.get('pass'), ' fail =', rep.get('fail'))
if rep.get('bootError'):
    print('!! bootError:', json.dumps(rep['bootError'], ensure_ascii=False)[:2000])
for e in (rep.get('errors') or []):
    print('  X', e)
sys.exit(0 if rep.get('ok') else 1)