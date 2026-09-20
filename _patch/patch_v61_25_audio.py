# -*- coding: utf-8 -*-
"""
v0.61.25 步骤 1/2 —— 重写 js/10_audio.js 的音效层

改动（全部锚点校验 count==1）：
  ① [音效段整体替换] 12 键 switch → 70 键 SFX_TABLE + 采样通路 + sfxVol=0 真静音
  ② [外置素材段开头] 新增 AUD_EXTS / BGM_EXTS（扩展名唯一真相源，含 .m4a）
  ③ [startBGM]       exts 改用 BGM_EXTS（顺序不变，仅补 .m4a）
  ④ [unlockAudio]    顺手启动采样预解码（非阻塞）

替换正文来自 _patch/_new_audio_block.js。
"""
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = os.path.join(HERE, '..', 'js', '10_audio.js')
BLOCK = os.path.join(HERE, '_new_audio_block.js')

A_START = "/* ===================== 音效（Web Audio，无外部资源） ===================== */\n"
A_END = "/* ===================== 外置素材（有则增强，无则优雅回退） ===================== */\n"

A_ASSET = "/* ===================== 外置素材（有则增强，无则优雅回退） ===================== */\nconst ASSET_BASE = '素材/';\n"
N_ASSET = A_ASSET + (
    "/* 音频扩展名的唯一真相源：打包.py 的 AUD_MIME 必须与此集合一致（漂移由 verify_dist 断言拦住）。\n"
    "   音效探测顺序 mp3 优先；BGM 沿用历史优先级 ogg 优先 —— 避免同名多格式并存时被选中的曲子变了。 */\n"
    "const AUD_EXTS = ['.mp3','.ogg','.wav','.m4a'];\n"
    "const BGM_EXTS = ['.ogg','.mp3','.wav','.m4a'];\n"
)

A_EXTS = "  let exts=['.ogg','.mp3','.wav'];\n"
N_EXTS = "  let exts=BGM_EXTS.slice();\n"

A_UNLOCK = "function unlockAudio(){ ensureAudio(); if(BGM && SETTINGS.sound){ try{ BGM.play().catch(()=>{}); }catch(e){} } }\n"
N_UNLOCK = "function unlockAudio(){ ensureAudio(); loadSfxSamples(); if(BGM && SETTINGS.sound){ try{ BGM.play().catch(()=>{}); }catch(e){} } }\n"


def main():
    src = io.open(TARGET, encoding='utf-8', newline='').read()

    if 'const SFX_TABLE' in src:
        print('SKIP 音效层已是新版')
        return 0

    for name, a in (('A_START', A_START), ('A_END', A_END), ('A_ASSET', A_ASSET),
                    ('A_EXTS', A_EXTS), ('A_UNLOCK', A_UNLOCK)):
        n = src.count(a)
        if n != 1:
            print('FAIL %s anchor count=%d (expect 1)' % (name, n))
            return 1

    block = io.open(BLOCK, encoding='utf-8', newline='').read()
    if not block.endswith('\n'):
        block += '\n'
    block += '\n'   # 与下一段留一个空行

    i = src.index(A_START)
    j = src.index(A_END)
    if i >= j:
        print('FAIL 锚点顺序异常')
        return 1
    src = src[:i] + block + src[j:]

    src = src.replace(A_ASSET, N_ASSET, 1)
    src = src.replace(A_EXTS, N_EXTS, 1)
    src = src.replace(A_UNLOCK, N_UNLOCK, 1)

    io.open(TARGET, 'w', encoding='utf-8', newline='').write(src)
    print('OK 已重写音效层（%d 行）' % (src.count('\n') + 1))
    return 0


if __name__ == '__main__':
    sys.exit(main())
