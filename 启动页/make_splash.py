# -*- coding: utf-8 -*-
"""
把谷雨插画做成 HBuilderX 打包 APK 用的安卓启动图。

尺寸按 DCloud 官方 manifest.json 文档的规格：
    ldpi 320x442 / mdpi 240x282 / hdpi 480x762 / xhdpi 720x1242 / xxhdpi 1080x1882

思路：原图是 3:4 的方形构图，而手机启动图是 9:19 左右的细长比例。
直接拉伸会把伞压扁，所以统一做成「白底 + 等比缩放居中」——原图本来就是白底
线稿，多出来的白边完全看不出接缝。
"""

from PIL import Image
import numpy as np
import os

SRC = 'source.jpg'
OUT = 'out'

# DCloud manifest.json 文档里 Android 启动图的规格
SIZES = {
    'ldpi':    (320, 442),
    'mdpi':    (240, 282),
    'hdpi':    (480, 762),
    'xhdpi':   (720, 1242),
    'xxhdpi':  (1080, 1882),
    # 官方表里没有，但部分机型/配置会用到，一并给出
    'xxxhdpi': (1440, 2560),
}

WHITE = (255, 255, 255)


def load_and_trim(path):
    """读图，洗掉 JPG 在白底上的压缩噪点，再裁到实际内容的包围盒。"""
    im = Image.open(path).convert('RGB')
    a = np.array(im)

    # JPG 压缩会让"白底"变成 250~255 的杂色，缩放后容易出现脏灰边。
    # 把接近白的一律压成纯白，线稿本身是深色的，不受影响。
    near_white = a.min(axis=2) >= 244
    a[near_white] = 255
    im = Image.fromarray(a)

    # 裁到内容包围盒，去掉原图本来就留的大片空白，
    # 这样后面能自己控制留白多少，而不是被原图的留白绑死。
    gray = np.array(im.convert('L'))
    ys, xs = (gray < 244).nonzero()
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    return im.crop(box)


def compose(art, w, h, width_ratio=0.94, height_ratio=0.78, y_anchor=0.50):
    """把裁好的插画摆到 w×h 的白底画布上。

    width_ratio  横向最多占画布多宽
    height_ratio 纵向最多占画布多高（细长屏上防止画面顶天立地）
    y_anchor     画面中心落在画布高度的百分之多少（0.50 = 正中）
    """
    max_w = int(w * width_ratio)
    max_h = int(h * height_ratio)
    scale = min(max_w / art.width, max_h / art.height)
    nw, nh = max(1, round(art.width * scale)), max(1, round(art.height * scale))

    resized = art.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new('RGB', (w, h), WHITE)
    x = (w - nw) // 2
    y = int(h * y_anchor) - nh // 2
    y = max(0, min(y, h - nh))
    canvas.paste(resized, (x, y))
    return canvas, (x, y, nw, nh)


def make_nine_patch(art, path):
    """生成 .9.png —— 官方推荐用它，好处是在任何比例的屏幕上
    只有白边被拉伸，插画本身永远不变形。

    .9.png 规则：图片四周各加 1px 边框，
      上边框的黑线段 = 可横向拉伸的列
      左边框的黑线段 = 可纵向拉伸的行
      右/下边框的黑线段 = 内容区（这里让它等于整张图）
      四个角必须透明
    关键：拉伸线段必须落在"整行/整列都是纯白"的地方，否则会拉到画面本身。
    """
    base_w, base_h = 1080, 1500
    canvas, (ax, ay, aw, ah) = compose(art, base_w, base_h,
                                       # .9 这张的画布是 1080x1500（比手机屏矮），插画略收一点，
                                       # 给左右白边留出足够宽的可拉伸区（拉伸线段必须落在纯白列上）
                                       width_ratio=0.90, height_ratio=0.80, y_anchor=0.50)

    # 加 1px 边框
    w, h = base_w + 2, base_h + 2
    np_img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    np_img.paste(canvas.convert('RGBA'), (1, 1))
    px = np_img.load()

    black = (0, 0, 0, 255)

    # 上边框：横向拉伸区 —— 取插画左侧的白边（那几列从上到下都是白的）
    x_stretch_from = max(2, ax // 3)
    x_stretch_to = max(x_stretch_from + 1, ax - 4)
    for x in range(x_stretch_from, x_stretch_to):
        px[x, 0] = black

    # 左边框：纵向拉伸区 —— 取插画上方的白边（那几行从左到右都是白的）
    y_stretch_from = max(2, ay // 3)
    y_stretch_to = max(y_stretch_from + 1, ay - 4)
    for y in range(y_stretch_from, y_stretch_to):
        px[0, y] = black

    # 右/下边框：内容区标满，表示整张图都可以放内容
    for y in range(1, h - 1):
        px[w - 1, y] = black
    for x in range(1, w - 1):
        px[x, h - 1] = black

    np_img.save(path)

    # 自检：拉伸区必须真的是纯白，否则拉伸时会把线条拉糊
    arr = np.array(canvas.convert('L'))
    col_ok = arr[:, x_stretch_from - 1:x_stretch_to - 1].min() >= 250
    row_ok = arr[y_stretch_from - 1:y_stretch_to - 1, :].min() >= 250
    return col_ok, row_ok, (x_stretch_to - x_stretch_from), (y_stretch_to - y_stretch_from)


def make_android12_icon(art, path, size=1152, safe=768):
    """Android 12+ 的新版启动页只显示中间一个图标。
    规范：画布 size，实际图形要收在中间 safe 的范围内，外圈会被系统裁掉。
    """
    scale = min(safe / art.width, safe / art.height)
    nw, nh = round(art.width * scale), round(art.height * scale)
    icon = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    icon.paste(art.resize((nw, nh), Image.LANCZOS).convert('RGBA'),
               ((size - nw) // 2, (size - nh) // 2))
    icon.save(path)


def main():
    os.makedirs(OUT, exist_ok=True)
    art = load_and_trim(SRC)
    print(f'原图裁到内容后: {art.width}x{art.height}')
    print()

    print('--- 固定尺寸启动图 ---')
    for name, (w, h) in SIZES.items():
        canvas, (x, y, nw, nh) = compose(art, w, h)
        p = os.path.join(OUT, f'{name}.png')
        canvas.save(p, optimize=True)
        occupy = nw / w
        print(f'  {name:8s} {w:5d}x{h:<5d}  插画 {nw}x{nh}  占宽 {occupy:.0%}  '
              f'{os.path.getsize(p)/1024:.0f}KB')

    print()
    print('--- .9.png（推荐，任何屏幕比例都不变形）---')
    col_ok, row_ok, xlen, ylen = make_nine_patch(art, os.path.join(OUT, 'splash.9.png'))
    print(f'  splash.9.png  横向拉伸区 {xlen}px（纯白校验 {"通过" if col_ok else "不通过"}）')
    print(f'                纵向拉伸区 {ylen}px（纯白校验 {"通过" if row_ok else "不通过"}）')

    print()
    print('--- Android 12+ 中心图标 ---')
    p = os.path.join(OUT, 'android12-icon.png')
    make_android12_icon(art, p)
    print(f'  android12-icon.png  1152x1152（图形收在中间 768 内）'
          f'  {os.path.getsize(p)/1024:.0f}KB')


if __name__ == '__main__':
    main()
