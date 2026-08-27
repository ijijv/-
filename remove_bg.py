#!/usr/bin/env python3
"""
志怪塔 · 透明底批量处理脚本
用法：python remove_bg.py [目录路径]
效果：将该目录下所有 PNG 的白色/浅色背景转为透明，带羽化边缘
"""
from PIL import Image
import collections, os, sys

def is_bg(r, g, b, a, threshold=215):
    if a == 0: return True
    return r > threshold and g > threshold and b > threshold

def is_feather(r, g, b, a, threshold=195):
    if a == 0: return False
    return r > threshold and g > threshold and b > threshold

def remove_white_bg(filepath):
    img = Image.open(filepath).convert('RGBA')
    w, h = img.size
    pixels = img.load()

    # Step 1: Flood-fill from edges to find background pixels
    visited = set()
    queue = collections.deque()
    for x in range(w):
        for y in [0, h-1]:
            r, g, b, a = pixels[x, y]
            if is_bg(r, g, b, a):
                queue.append((x, y))
                visited.add((x, y))
    for y in range(h):
        for x in [0, w-1]:
            r, g, b, a = pixels[x, y]
            if is_bg(r, g, b, a):
                queue.append((x, y))
                visited.add((x, y))

    while queue:
        x, y = queue.popleft()
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                r, g, b, a = pixels[nx, ny]
                if is_bg(r, g, b, a, 215):
                    queue.append((nx, ny))
                    visited.add((nx, ny))

    # Step 2: Apply transparency + feather
    bg_count = 0
    feather_count = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if (x, y) in visited:
                pixels[x, y] = (r, g, b, 0)
                bg_count += 1
            elif is_feather(r, g, b, a, 195):
                has_bg_neighbor = False
                for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and (nx, ny) in visited:
                        has_bg_neighbor = True
                        break
                if has_bg_neighbor:
                    brightness = (r + g + b) / 3
                    alpha = int(255 * (brightness - 195) / 40)
                    alpha = max(0, min(255, alpha))
                    pixels[x, y] = (r, g, b, alpha)
                    feather_count += 1

    img.save(filepath, 'PNG', optimize=True)
    return bg_count, feather_count

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else '.'
    if not os.path.isdir(target):
        print(f'错误：{target} 不是目录')
        return

    pngs = [f for f in os.listdir(target) if f.lower().endswith('.png')]
    if not pngs:
        print(f'{target} 下没有 PNG 文件')
        return

    print(f'处理 {target}，共 {len(pngs)} 个文件...')
    for f in sorted(pngs):
        path = os.path.join(target, f)
        bg, feather = remove_white_bg(path)
        size_kb = os.path.getsize(path) / 1024
        print(f'  {f}: {bg} 背景像素透明 + {feather} 羽化 ({size_kb:.0f} KB)')
    print('完成！')

if __name__ == '__main__':
    main()