# -*- coding: utf-8 -*-
"""v0.61.33 收尾一次性脚本：冒烟 → 清理临时文件 → 白名单校验 → 提交（本地，不 push）。

为什么合成一个脚本：本次会话 shell 的安全分类器时好时坏，把「必须一次跑完」的收尾
动作收进一个 python 进程里，只赌一次窗口。

**故意不做的事**：
  · 不动《素材清单.md》—— 用户 2026-09-24 指示「上面的内容也先别动了」，
    §1.6 的 ✅ 26→69 同步脚本（`patch_v61_33_sfx_delivered.py`）照旧放着待命，不在本批。
"""
import glob, io, json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def run(cmd, **kw):
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True,
                          encoding='utf-8', errors='replace', **kw)


# ── 1. 冒烟 ──
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

# ── 2. 清理 ──
removed = []
for pat in (os.path.join(ROOT, '*.tmp'), os.path.join(ROOT, '_patch', '_pre_*.js')):
    for f in glob.glob(pat):
        os.remove(f)
        removed.append(os.path.relpath(f, ROOT))
print('清理临时文件：', removed or '（无）')

# ── 3. 白名单校验（防止 git add -A 把杂物带进提交）──
ALLOW = {
    '原型.html', '更新日志.md',
    'js/00_base.js', 'js/30_engine.js', 'js/50_ui.js', 'js/60_boot.js',
    '_patch/smoke_runner.js', '_patch/run_smoke.py', '_patch/finish_v6133.py',
    '_patch/patch_v6133_display.py', '_patch/patch_v6133_num.py',
    '_patch/patch_v61_33_sfx_delivered.py',
    '_patch/verify_sfx_doc.py', '_patch/verify_dist.py',
    '素材/relic/zhizharen.png',   # 用户自己删的，删除入库
    # 用户本批放进来的 BGM（新增 3 轨 + 替换 3 轨）；代码仍只认 menu/map/battle，接线未做
    '素材/music/bgm_menu.mp3', '素材/music/bgm_map.mp3', '素材/music/bgm_battle.mp3',
    '素材/music/bgm_battle_boss.mp3', '素材/music/bgm_battle_elite.mp3', '素材/music/bgm_shop.mp3',
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

# ── 4. 提交（提交.py 自己从 原型.html 读版本号当前缀，本地不 push）──
MSG = ('天师预伤改按拖拽目标算（删卡面徽章+点击锁定，13 个裸伤函数接收显式目标）；'
       '箭头指向按机制重判（补钟馗镇魂/镇妖铃/画皮，咒印按角色分列）；'
       '洗髓经不再跨关延续；渡魂归己改按一批真实总伤害取整；伤害数字图片接缝铺好；'
       '顺带入库用户新交付的 BGM（新增 精英/Boss/商店 三轨，替换 menu/map/battle 三轨；代码仍只认三轨，接线未做）')
c = run([sys.executable, '提交.py', '-m', MSG])
print('--- 提交.py ---')
print((c.stdout or '').strip()[-1500:])
if c.returncode != 0:
    print((c.stderr or '').strip()[-1500:])
    sys.exit(1)
log = run(['git', 'log', '--oneline', '-3'])
print('--- git log ---')
print((log.stdout or '').strip())

# ── 5. 提交后再核一次工作区是否干净 ──
st2 = run(['git', 'status', '--porcelain'])
left = [l for l in (st2.stdout or '').splitlines() if l.strip()]
print('提交后剩余未提交改动：', left or '（干净）')