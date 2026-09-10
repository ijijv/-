# -*- coding: utf-8 -*-
# v0.53 → v0.54：单文件打包支持
# 给素材加载加一层 ASSET_MAP 间接层：
#   开发时 ASSET_MAP = null  → assetURL() 返回 '素材/xxx'，行为与改动前完全一致
#   打包时 打包.py 把 null 换成 { '相对路径': 'data:...' } → 单文件离线可玩
import io, sys, subprocess, tempfile, os, re

P = r"C:\Users\HP\Desktop\志怪塔\原型.html"
s = io.open(P, 'r', encoding='utf-8').read()

EDITS = []

# 1. 间接层本体
EDITS.append((
"""const ASSET_BASE = '素材/';""",
"""const ASSET_BASE = '素材/';
/* 单文件打包：打包.py 把下面这行的 null 换成 { '相对路径': 'data:...' }；开发时保持 null，照常读本地 素材/ */
var ASSET_MAP = null;
function assetURL(rel){ return (ASSET_MAP && ASSET_MAP[rel]) ? ASSET_MAP[rel] : ASSET_BASE + rel; }"""))

# 2. artImg（卡图 / 遗物 / 敌人 / 主角立绘 全走这一个口）
EDITS.append((
"""  return `<img class="${cls||''}" src="${ASSET_BASE}${src}" data-fallback=""",
"""  return `<img class="${cls||''}" src="${assetURL(src)}" data-fallback="""))

# 3. 背景
EDITS.append((
"""  var path=ASSET_BASE+'bg/bg_'+name+'.png';""",
"""  var path=assetURL('bg/bg_'+name+'.png');"""))

# 4. BGM：单文件里只有 mp3，按 ASSET_MAP 实际有的后缀收窄探测列表，省掉无谓的 404
EDITS.append((
"""  const exts=['.ogg','.mp3','.wav'];
  let idx=0, active=true;""",
"""  let exts=['.ogg','.mp3','.wav'];
  if(ASSET_MAP){ const _av=exts.filter(e=>ASSET_MAP['music/bgm_'+track+e]); if(_av.length) exts=_av; }
  let idx=0, active=true;"""))

EDITS.append((
"""    const a=new Audio(ASSET_BASE+'music/bgm_'+track+exts[idx++]);""",
"""    const a=new Audio(assetURL('music/bgm_'+track+exts[idx++]));"""))

for i, (old, new) in enumerate(EDITS):
    n = s.count(old)
    if n != 1:
        print('EDIT #%d FAIL: 匹配 %d 次（期望 1）' % (i+1, n)); sys.exit(1)
    s = s.replace(old, new)

# 版本号 v0.53 → v0.54
nv = s.count('v0.53')
if nv != 3:
    print('VER FAIL: v0.53 匹配 %d 次（期望 3）' % nv); sys.exit(1)
s = s.replace('v0.53', 'v0.54')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('PATCH p_singlefile DONE: %d 处替换 + 版本号 v0.54' % len(EDITS))

mm = re.search(r'<script>([\s\S]*?)</script>', s)
if not mm:
    print('FAIL: 找不到 <script>'); sys.exit(1)
js = mm.group(1)
fd, tmpp = tempfile.mkstemp(suffix='.js')
os.write(fd, js.encode('utf-8')); os.close(fd)
r = subprocess.run(['node', '--check', tmpp], capture_output=True, text=True)
os.unlink(tmpp)
if r.returncode != 0:
    print('NODE_FAIL:'); print(r.stderr); sys.exit(1)
print('NODE_OK (%d chars)' % len(js))
print('assetURL 调用点: %d' % s.count('assetURL('))
