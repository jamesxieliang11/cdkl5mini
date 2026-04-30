#!/usr/bin/env python3
"""
从 xlsx 文件中物理移除所有嵌入图片，生成一个纯数据的轻量版本。
xlsx 本质是 zip 包，图片存储在 xl/media/ 目录下。
本脚本通过重新打包 zip，跳过 xl/media/ 中的图片文件来实现瘦身。
"""

import sys
import os
import zipfile
import re

IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.tif', '.emf', '.wmf', '.svg'}

def strip_images(input_path, output_path):
    if not os.path.exists(input_path):
        print(f"❌ 文件不存在: {input_path}")
        sys.exit(1)

    input_size_mb = os.path.getsize(input_path) / 1024 / 1024
    print(f"📂 原始文件: {input_path} ({input_size_mb:.1f} MB)")

    skipped_count = 0
    skipped_size = 0
    copied_count = 0

    with zipfile.ZipFile(input_path, 'r') as zin:
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                name_lower = item.filename.lower()
                file_ext = os.path.splitext(name_lower)[1]

                # 跳过所有图片文件（可能在 xl/media/ 或 xl/drawings/media/ 下）
                is_media_image = (
                    (name_lower.startswith('xl/media/') or name_lower.startswith('xl/drawings/media/'))
                    and file_ext in IMAGE_EXTENSIONS
                )
                if is_media_image:
                    skipped_count += 1
                    skipped_size += item.file_size
                    continue

                # 跳过 xl/drawings/ 下的绘图 XML 文件（图片锚点/引用定义）
                if name_lower.startswith('xl/drawings/') and name_lower.endswith('.xml'):
                    skipped_count += 1
                    skipped_size += item.file_size
                    continue

                # 跳过 drawing 的 rels 文件（图片关系引用）
                if '_rels' in name_lower and 'drawing' in name_lower:
                    skipped_count += 1
                    skipped_size += item.file_size
                    continue

                # 复制其他所有文件
                data = zin.read(item.filename)
                zout.writestr(item, data)
                copied_count += 1

    output_size_mb = os.path.getsize(output_path) / 1024 / 1024
    saved_mb = input_size_mb - output_size_mb
    saved_pct = (saved_mb / input_size_mb * 100) if input_size_mb > 0 else 0

    print(f"✅ 输出文件: {output_path} ({output_size_mb:.1f} MB)")
    print(f"📊 跳过 {skipped_count} 个图片/绘图文件 ({skipped_size / 1024 / 1024:.1f} MB)")
    print(f"📋 保留 {copied_count} 个数据文件")
    print(f"🎉 瘦身 {saved_pct:.0f}%，减少 {saved_mb:.1f} MB")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("用法: python3 scripts/strip-images-from-xlsx.py <输入xlsx> [输出xlsx]")
        print("示例: python3 scripts/strip-images-from-xlsx.py ./data/big.xlsx ./data/big-noimg.xlsx")
        sys.exit(0)

    input_file = sys.argv[1]
    if len(sys.argv) >= 3:
        output_file = sys.argv[2]
    else:
        base, ext = os.path.splitext(input_file)
        output_file = f"{base}-noimg{ext}"

    strip_images(input_file, output_file)
