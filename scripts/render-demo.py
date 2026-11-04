#!/usr/bin/env python3
"""Render a captioned walkthrough from captured app screens, without app data access."""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT, FPS = 1920, 1080, 24
BG, INK, MUTED, ACCENT = '#0b0e14', '#e6eaf0', '#959faf', '#bac9e1'


def font(size: int, serif: bool = False):
    candidates = ([
        '/System/Library/Fonts/Supplemental/Georgia.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf',
    ] if serif else [
        '/System/Library/Fonts/Helvetica.ttc',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        'C:/Windows/Fonts/arial.ttf',
    ])
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default(size=size)


def centered(draw, y, text, size, color=INK, serif=False):
    f = font(size, serif)
    box = draw.textbbox((0, 0), text, font=f)
    draw.text(((WIDTH - (box[2] - box[0])) / 2, y), text, font=f, fill=color)


def scene_image(scene, index, count, frames):
    canvas = Image.new('RGB', (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(canvas)
    if scene['frame'] is None:
        draw.rounded_rectangle((916, 206, 1004, 294), radius=22, fill=ACCENT)
        draw.ellipse((931, 221, 989, 279), outline='#151c27', width=4)
        draw.polygon([(974, 236), (966, 256), (946, 264), (954, 244)], outline='#151c27', width=3)
        centered(draw, 346, 'CAREER AGENT', 19, MUTED)
        centered(draw, 390, 'Your next chapter starts here.', 65, serif=True)
        centered(draw, 498, 'Understand your fit. Tailor your materials. Keep every next step in view.', 27, MUTED)
        centered(draw, 604, 'React + TypeScript     /     Local-first     /     Reviewed by you', 20, ACCENT)
        centered(draw, 936, 'A captioned walkthrough using fictional demo data', 19, MUTED)
        return canvas
    screenshot = Image.open(frames / scene['frame']).convert('RGB')
    if screenshot.size != (1600, 900):
        raise ValueError(f"Expected a 1600×900 capture: {scene['frame']} has {screenshot.size}")
    mask = Image.new('L', screenshot.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, 1599, 899), radius=10, fill=255)
    canvas.paste(screenshot, (160, 54), mask)
    draw.rounded_rectangle((159, 53, 1760, 954), radius=11, outline='#343e4e', width=1)
    draw.text((160, 22), 'CAREER AGENT  /  PRODUCT WALKTHROUGH', font=font(16), fill=MUTED)
    counter = f'{index:02d} / {count - 1:02d}   ·   FICTIONAL DEMO DATA'
    draw.text((1760, 22), counter, font=font(16), fill=MUTED, anchor='ra')
    draw.text((160, 978), scene['title'], font=font(27), fill=INK)
    draw.text((160, 1020), scene['caption'], font=font(21), fill=MUTED)
    draw.rounded_rectangle((160, 1064, 1760, 1068), radius=2, fill='#242d3b')
    return canvas


def timestamp(seconds):
    milliseconds = round(seconds * 1000)
    return f'{milliseconds // 3600000:02}:{milliseconds // 60000 % 60:02}:{milliseconds // 1000 % 60:02}.{milliseconds % 1000:03}'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/demo')
    args = parser.parse_args()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    scenes = json.loads((ROOT / 'docs/demo/storyboard.json').read_text())
    images = [scene_image(scene, i, len(scenes), ROOT / 'docs/demo/frames') for i, scene in enumerate(scenes)]
    total = sum(scene['seconds'] for scene in scenes)
    writer = imageio_ffmpeg.write_frames(
        str(output / 'career-agent-demo.mp4'), (WIDTH, HEIGHT), fps=FPS,
        codec='libx264', pix_fmt_in='rgb24', pix_fmt_out='yuv420p',
        quality=None, ffmpeg_log_level='error', macro_block_size=2,
        output_params=['-crf', '21', '-preset', 'medium', '-tune', 'stillimage',
                       '-movflags', '+faststart', '-metadata', 'title=Career Agent product walkthrough'],
    )
    writer.send(None)
    elapsed, cues = 0, ['WEBVTT', '']
    try:
        for i, (scene, image) in enumerate(zip(scenes, images)):
            print(f"Rendering {i + 1}/{len(scenes)}: {scene['title']}", flush=True)
            cues += [f'{timestamp(elapsed)} --> {timestamp(elapsed + scene["seconds"])}', scene['title'], scene['caption'], '']
            for n in range(round(scene['seconds'] * FPS)):
                frame = image.copy()
                if i and n < 8:
                    frame = Image.blend(images[i - 1], image, (n + 1) / 8)
                progress = (elapsed + n / FPS) / total
                if scene['frame']:
                    draw = ImageDraw.Draw(frame)
                    draw.rounded_rectangle((160, 1064, 160 + max(4, round(1600 * progress)), 1068), radius=2, fill=ACCENT)
                if i == 0 and n < 10:
                    frame = Image.blend(Image.new('RGB', frame.size, BG), frame, (n + 1) / 10)
                writer.send(frame.tobytes())
            elapsed += scene['seconds']
    finally:
        writer.close()
    (output / 'career-agent-demo.vtt').write_text('\n'.join(cues).rstrip() + '\n')
    # A compact, looping overview for GitHub's image-only README renderer.
    preview_indices = [1, 2, 3, 4, 5, 10, 11]
    preview, durations = [], []
    for i in preview_indices:
        preview.append(images[i].resize((880, 495), Image.Resampling.LANCZOS).quantize(colors=128))
        durations.append(2000)
    preview[0].save(output / 'preview.gif', save_all=True, append_images=preview[1:], duration=durations, loop=0, optimize=True, disposal=2)
    poster = images[1]
    poster.save(output / 'video-poster.jpg', quality=92, optimize=True)
    # Contact sheet makes every source capture reviewable without watching the clip.
    sheet = Image.new('RGB', (1200, math.ceil(len(scenes) / 3) * 255), BG)
    for i, image in enumerate(images):
        thumb = image.resize((384, 216), Image.Resampling.LANCZOS)
        x, y = (i % 3) * 400 + 8, (i // 3) * 255 + 4
        sheet.paste(thumb, (x, y))
        ImageDraw.Draw(sheet).text((x, y + 221), f'{i:02d}  {scenes[i]["title"]}', font=font(11), fill=INK)
    sheet.save(output / 'contact-sheet.jpg', quality=90)
    print(f'Created {total}s MP4, captions, poster, and 14s GIF in {output}', flush=True)


if __name__ == '__main__':
    main()
