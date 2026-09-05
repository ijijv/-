#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""志怪塔 · 敌人立绘批处理：去暗底 + 去豆包水印 + 缩放 <200KB
规则：绿底(偏青)图按「绿度」自适应阈值去背景；角色偏青的图退化为亮度去背景；
再从中心洪泛取角色主体（顺带去水印/散点噪声），最后羽化+缩放+量化。
"""
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, os, sys, glob

def border(x, bd=6):
    return np.concatenate([x[:bd,:].ravel(), x[-bd:,:].ravel(), x[:,:bd].ravel(), x[:,-bd:].ravel()])

def largest_component(char_mask):
    """闭运算连通碎块后，从中心洪泛取角色主体（顺带去水印/散点噪声）。"""
    h,w = char_mask.shape
    # 闭运算：先膨胀后腐蚀，填洞 + 连碎块（半径1）
    C = Image.fromarray((char_mask*255).astype('uint8'), 'L')
    C = C.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    cm = np.array(C) > 0
    # 从中心找种子
    cy,cx = h//2, w//2
    seed = None
    if cm[cy,cx]:
        seed = (cx,cy)
    else:
        for rad in range(2, min(h,w)//3, 2):
            for dx in range(-rad, rad+1, 2):
                for dy in range(-rad, rad+1, 2):
                    x,y = cx+dx, cy+dy
                    if 0<=x<w and 0<=y<h and cm[y,x]:
                        seed=(x,y); break
                if seed: break
            if seed: break
    if seed is None:
        return np.zeros((h,w), bool)
    L = Image.fromarray(np.stack([cm*255]*3, axis=-1).astype('uint8'), 'RGB')
    ImageDraw.floodfill(L, seed, (128,128,128), thresh=0)
    return np.array(L)[:,:,0] == 128

def process(name, out_path):
    im = Image.open(name).convert('RGB')
    a = np.array(im)
    h,w,_ = a.shape
    r,g,b = a[:,:,0].astype(int), a[:,:,1].astype(int), a[:,:,2].astype(int)
    lum = a.mean(axis=2); gr = g-r
    bg_gr = float(np.median(border(gr)))
    bg_lum = float(np.median(border(lum)))
    cy,cx = h//2, w//2
    ch_gr = float(np.median(gr[cy-h//6:cy+h//6, cx-w//6:cx+w//6]))
    ch_lum = float(np.median(lum[cy-h//6:cy+h//6, cx-w//6:cx+w//6]))

    if bg_gr - ch_gr >= 1:   # 背景更绿 -> 绿度分割
        margin = min(3.0, max(1.0, (bg_gr - ch_gr)/2))
        th = bg_gr - margin
        bgmask = (gr >= th) & (lum <= bg_lum + 35)
        method = 'green'
    else:                    # 角色偏青/不暖 -> 亮度分割
        bgmask = lum < (bg_lum + ch_lum)/2
        method = 'lum'

    char = ~bgmask
    # 去豆包水印：右下角（底部7% × 右侧28%）的近白文字从前景剔除
    # 只动右下角，避免误删白无常/纸扎人/小僵尸等白角色的身体
    _sat = a.max(axis=2).astype(int) - a.min(axis=2).astype(int)
    _y0 = int(h*0.93)
    _x0 = int(w*0.72)
    _wm = (lum[_y0:, _x0:] > 80) & (_sat[_y0:, _x0:] < 65)
    char[_y0:, _x0:][_wm] = False
    blob = largest_component(char)
    # 羽化
    alpha = Image.fromarray((blob*255).astype('uint8'), 'L').filter(ImageFilter.GaussianBlur(1.0))
    rgba = Image.fromarray(np.dstack([a, np.array(alpha)]), 'RGBA')
    bbox = rgba.getbbox()
    if bbox is None:
        print('  !! empty %s' % os.path.basename(name)); return False
    rgba = rgba.crop(bbox)
    # 自适应缩放+量化到 <200KB
    final = None
    for md in [640, 512, 448, 400, 360, 320]:
        W,H = rgba.size
        sc = min(1.0, md/max(W,H))
        r = rgba.resize((max(1,int(W*sc)), max(1,int(H*sc))), Image.LANCZOS)
        rgb = r.convert('RGB'); al = r.getchannel('A')
        q = rgb.quantize(colors=256, method=Image.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
        q.putalpha(al)
        q.save(out_path, 'PNG', optimize=True)
        kb = os.path.getsize(out_path)/1024
        final = (q.size, kb)
        if kb <= 200: break
    print('  %-16s %-5s blob=%4.1f%% %dx%d %3.0fKB' % (
        os.path.basename(name)[:-4], method, 100*blob.sum()/(h*w), final[0][0], final[0][1], final[1]))
    return True

if __name__=='__main__':
    files = sys.argv[1:] or sorted(glob.glob('素材/enemy/*.png'))
    for f in files:
        process(f, f)
