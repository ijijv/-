# -*- coding: utf-8 -*-
"""
v0.61.25 步骤 5 —— 打包链路与产物校验

设计决定（比原计划更省）：
  原计划要在 打包.py 里**再注入一张** SFX_SAMPLE_MAP。但 打包.py 的素材遍历
  （`ext in AUD_MIME`）本来就会把 素材/sfx/*.mp3 按相对路径塞进 ASSET_MAP
  （key 形如 'sfx/hit_light_1.mp3'）。再注入一张一模一样的表 = 把 base64 体积翻倍。
  → 改成让 sampleURL/loadSfxSamples 直接查 ASSET_MAP，**打包.py 一行注入逻辑都不用改**，
    顺带消灭「两张表漂移」这个隐患。

① js/10_audio.js：SFX_SAMPLE_MAP → ASSET_MAP（3 处 + 删声明）
② 打包.py        ：素材统计里加一行音效计数（仅可观测性，不改行为）
③ verify_dist.py ：新增
     [1b] 打包.py 的 AUD_MIME 与 10_audio.js 的 AUD_EXTS 扩展名集合必须一致（bug B 漂移闸）
     [2b] 素材/sfx/ 下每个文件名都要能被解析成 <键名>[_<变体号>].<ext>，
          且键名必须真在 SFX_TABLE 里（拼错就静默回退合成，这条拦住它）
   并把 sfx/ 从「从未被请求」的提示里排除（音效本来就是可选覆盖）

锚点唯一性各校验 count==1。
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')

AUD = os.path.join(ROOT, 'js', '10_audio.js')
PACK = os.path.join(ROOT, '打包.py')
VD = os.path.join(HERE, 'verify_dist.py')

# ---------- ① 10_audio.js ----------
A1 = "var SFX_SAMPLE_MAP = null;       // 单文件打包：打包.py 注入 { 'sfx/hit_light_1.mp3': 'data:...' }；开发时保持 null\n"
N1 = ("/* 采样不走单独的注入表：打包.py 的素材遍历本来就按相对路径收 AUD_MIME 文件，\n"
      "   所以 sfx/hit_light_1.mp3 这类 key 已在 ASSET_MAP 里。再注入一张重复表只会把 base64 翻倍。 */\n")

A2 = "  if(SFX_SAMPLE_MAP) return SFX_SAMPLE_MAP[rel] || null;   // 有注入表：没登记就是没有，不去试\n"
N2 = "  if(ASSET_MAP) return ASSET_MAP[rel] || null;   // 打包产物：没登记就是没有，不去试\n"

A3 = "  if(sfxMode==='auto' && !SFX_SAMPLE_MAP && !SFX_FETCH_OK) return;   // 开发期双击本地打开：没注入表且取不到文件\n"
N3 = "  if(sfxMode==='auto' && !ASSET_MAP && !SFX_FETCH_OK) return;   // 开发期双击本地打开：无注入表且取不到文件\n"

# ---------- ② 打包.py ----------
A4 = ("    print('素材 %d 个（图 %d / 音 %d）: %s → %s'\n"
      "          % (len(amap), stat['n_img'], stat['n_aud'], human(stat['in']), human(stat['out'])))\n")
N4 = ("    _sfx = sorted(k for k in amap if k.startswith('sfx/'))\n"
      "    _sfxsz = sum(os.path.getsize(os.path.join(ASSD, k.replace('/', os.sep))) for k in _sfx)\n"
      "    print('素材 %d 个（图 %d / 音 %d，含音效 sfx/ %d 个 %.0f KB）: %s → %s'\n"
      "          % (len(amap), stat['n_img'], stat['n_aud'], len(_sfx), _sfxsz / 1024.0,\n"
      "             human(stat['in']), human(stat['out'])))\n")

# ---------- ③ verify_dist.py ----------
A5 = "          \"bg:['menu'].concat(ACTS.map((a,i)=>'act'+(i+1))),music:['menu','map','battle']})\")\n"
N5 = ("          \"bg:['menu'].concat(ACTS.map((a,i)=>'act'+(i+1))),music:['menu','map','battle'],\"\n"
      "          \"sfxKeys:SFX_KEYS,sfxExts:AUD_EXTS})\")\n")

A6 = "    # ---- 2. 磁盘上的素材没被漏掉 ----\n"
N6 = ("    # ---- 1b. 音效扩展名：两个真相源必须一致（bug B 漂移闸） ----\n"
      "    print('\\n[1b] 音效扩展名真相源一致')\n"
      "    _aud = io.open(os.path.join(ROOT, 'js', '10_audio.js'), 'r', encoding='utf-8').read()\n"
      "    _m = re.search(r'const AUD_EXTS\\s*=\\s*\\[([^\\]]*)\\]', _aud)\n"
      "    exts_code = sorted(re.findall(r\"'([^']+)'\", _m.group(1))) if _m else []\n"
      "    _pk = io.open(os.path.join(ROOT, '打包.py'), 'r', encoding='utf-8').read()\n"
      "    _m2 = re.search(r'AUD_MIME\\s*=\\s*\\{([^}]*)\\}', _pk)\n"
      "    exts_pack = sorted(set(re.findall(r\"'([^']+)'\", _m2.group(1)))) if _m2 else []\n"
      "    check(bool(exts_code) and bool(exts_pack),\n"
      "          '两边都解析到扩展名表（代码 %s / 打包 %s）' % (','.join(exts_code), ','.join(exts_pack)))\n"
      "    check(exts_code == exts_pack,\n"
      "          'AUD_EXTS == 打包.py AUD_MIME（%s vs %s）' % (','.join(exts_code), ','.join(exts_pack)))\n"
      "    check('.m4a' in exts_code, '扩展名表含 .m4a（bug B：打包会收但播放探测不到）')\n"
      "    check(sorted(exts_code) == sorted(ids['sfxExts']), '产物内 AUD_EXTS 与源码一致')\n"
      "\n"
      "    # ---- 2. 磁盘上的素材没被漏掉 ----\n")

A7 = ("    check(disk <= keys, '磁盘 %d 个素材全部打进产物（漏 %d）' % (len(disk), len(disk - keys)))\n"
      "    for d in sorted(disk - keys)[:10]:\n"
      "        print('       漏: %s' % d)\n")
N7 = (A7 +
      "\n"
      "    # ---- 2b. 音效文件命名（键名拼错会静默回退合成，这里拦住） ----\n"
      "    print('\\n[2b] 素材/sfx/ 命名合规')\n"
      "    sfxkeys = set(ids['sfxKeys'])\n"
      "    disksfx = sorted(d for d in disk if d.startswith('sfx/'))\n"
      "    badname, badkey, badvar, badext = [], [], [], []\n"
      "    for d in disksfx:\n"
      "        base, ext = os.path.splitext(os.path.basename(d))\n"
      "        if ext.lower() not in exts_code:\n"
      "            badext.append(d); continue\n"
      "        stem = base\n"
      "        mm = re.match(r'^(.*)_(\\d+)$', base)\n"
      "        if mm:\n"
      "            stem, var = mm.group(1), int(mm.group(2))\n"
      "            if var < 1 or var > 3:\n"
      "                badvar.append(d); continue\n"
      "        if not re.match(r'^[a-z][a-z0-9_]*$', stem):\n"
      "            badname.append(d); continue\n"
      "        if stem not in sfxkeys:\n"
      "            badkey.append(d)\n"
      "    check(not badext, '扩展名都在 %s 内（坏 %d）' % (','.join(exts_code), len(badext)))\n"
      "    check(not badvar, '变体号都在 1..3（坏 %d）' % len(badvar))\n"
      "    check(not badname, '键名部分只用小写/数字/下划线（坏 %d）' % len(badname))\n"
      "    check(not badkey, '%d 个音效文件的键名都在 SFX_TABLE 里（未知 %d）' % (len(disksfx), len(badkey)))\n"
      "    for lbl, lst in (('扩展名', badext), ('变体号', badvar), ('文件名字符', badname), ('未知键名', badkey)):\n"
      "        for x in lst[:8]:\n"
      "            print('       %s: %s' % (lbl, x))\n"
      "    if disksfx:\n"
      "        _sz = sum(os.path.getsize(os.path.join(ASSD, d.replace('/', os.sep))) for d in disksfx)\n"
      "        _named = set(re.sub(r'_\\d+$', '', os.path.splitext(os.path.basename(d))[0]) for d in disksfx)\n"
      "        print('  注: 素材/sfx/ 共 %d 个文件 %.0f KB，覆盖 %d / %d 个键（其余走合成）'\n"
      "              % (len(disksfx), _sz / 1024.0, len(_named), len(sfxkeys)))\n"
      "    else:\n"
      "        print('  注: 素材/sfx/ 不存在或为空 —— 全部音效走 WebAudio 合成（可接受）')\n")

A8 = "    unused = sorted(keys - set(want))\n"
N8 = ("    # 音效是「可选覆盖」：没文件就走合成，所以不算未使用\n"
      "    unused = sorted(k for k in (keys - set(want)) if not k.startswith('sfx/'))\n")


def edit(path, pairs, tag):
    """锚点校验 count==1 才落盘。文件行尾可能是 LF 也可能是 CRLF（本仓两种都有），
    所以 LF 锚点不中就自动试 CRLF 版，替换体也同步换行尾，避免混进半截 CRLF。"""
    src = io.open(path, encoding='utf-8', newline='').read()
    for a, b in pairs:
        if src.count(a) == 1:
            src = src.replace(a, b, 1)
            continue
        a2, b2 = a.replace('\n', '\r\n'), b.replace('\n', '\r\n')
        if src.count(a2) == 1:
            src = src.replace(a2, b2, 1)
            continue
        print('FAIL [%s] count=%d (expect 1): %r' % (tag, src.count(a), a[:64]))
        return None
    io.open(path, 'w', encoding='utf-8', newline='').write(src)
    print('OK %s' % tag)
    return True


def main():
    if 'SFX_SAMPLE_MAP' not in io.open(AUD, encoding='utf-8').read():
        print('SKIP 10_audio.js 已改')
    elif edit(AUD, [(A1, N1), (A2, N2), (A3, N3)], 'js/10_audio.js: SFX_SAMPLE_MAP → ASSET_MAP') is None:
        return 1

    if '含音效 sfx/' in io.open(PACK, encoding='utf-8').read():
        print('SKIP 打包.py 已改')
    elif edit(PACK, [(A4, N4)], '打包.py: 素材统计加音效计数') is None:
        return 1

    if '[2b] 素材/sfx/ 命名合规' in io.open(VD, encoding='utf-8').read():
        print('SKIP verify_dist.py 已改')
    elif edit(VD, [(A5, N5), (A6, N6), (A7, N7), (A8, N8)], 'verify_dist.py: 加音效校验') is None:
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
