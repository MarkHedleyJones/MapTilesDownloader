#!/usr/bin/env python3

import argparse
from genericpath import isdir
import os
from PIL import Image, UnidentifiedImageError


def parse_args():
    parser = argparse.ArgumentParser(description="Convert images to webp format")
    parser.add_argument("input", help="Input directory")
    parser.add_argument("output", help="Output directory")
    return parser.parse_args()


def convert_to_webp(input_dir, output_dir):
    for root, dirs, files in os.walk(input_dir):
        for file in files:
            if file.endswith(".jpg") or file.endswith(".png"):
                input_path = os.path.join(root, file)
                output_path = (
                    input_path.replace(input_dir, output_dir)
                    .replace(".jpg", ".webp")
                    .replace(".png", ".webp")
                )
                if os.path.exists(output_path):
                    continue
                elif not os.path.exists(os.path.dirname(output_path)):
                    os.makedirs(os.path.dirname(output_path))
                try:
                    img = Image.open(os.path.join(root, file))
                    img.save(output_path, "WEBP")
                except UnidentifiedImageError:
                    print("Error: " + os.path.join(root, file))


if __name__ == "__main__":
    args = parse_args()
    convert_to_webp(args.input, args.output)
