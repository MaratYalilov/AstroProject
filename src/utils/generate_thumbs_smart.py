import os
import subprocess
from pathlib import Path
from typing import List
from PIL import Image, ImageStat

ROOT = Path("D:\AstroProject\public\media")

# Таймкоды, на которых берём кадры (можешь подправить)
CANDIDATE_TIMES = [
    "00:00:30",
    "00:10:05",
    "00:0020:10",
]

def run_ffmpeg_frame(video_path: Path, time_code: str, out_path: Path):
    out_path.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "ffmpeg",
        "-y",              # перезаписывать без вопросов
        "-ss", time_code,  # перейти к времени
        "-i", str(video_path),
        "-vframes", "1",   # один кадр
        "-q:v", "2",       # качество (2 — хорошо)
        str(out_path),
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def calc_brightness(image_path: Path) -> float:
    """Средняя яркость картинки 0..255"""
    with Image.open(image_path) as im:
        im = im.convert("L")  # grayscale
        stat = ImageStat.Stat(im)
        return stat.mean[0]

def generate_smart_thumb_for_video(video_path: Path):
    course_dir = video_path.parent.parent       # .../<course>/
    thumbs_dir = course_dir / "thumbs"
    thumbs_dir.mkdir(exist_ok=True)

    final_thumb = thumbs_dir / f"{video_path.stem}.jpg"

    tmp_dir = course_dir / "_thumbs_tmp"
    tmp_dir.mkdir(exist_ok=True)

    candidates: List[Path] = []

    print(f"\nВидео: {video_path}")

    # 1) генерируем несколько кандидатов на разных таймкодах
    for idx, t in enumerate(CANDIDATE_TIMES, start=1):
        cand_path = tmp_dir / f"{video_path.stem}_cand{idx}.jpg"
        run_ffmpeg_frame(video_path, t, cand_path)
        if cand_path.exists():
            candidates.append(cand_path)

    if not candidates:
        print("  ⚠ Не удалось получить ни одного кадра")
        return

    # 2) считаем яркость и выбираем самый светлый
    best_path = None
    best_brightness = -1.0

    for cand in candidates:
        try:
            b = calc_brightness(cand)
            print(f"  кандидат {cand.name}: яркость {b:.1f}")
            if b > best_brightness:
                best_brightness = b
                best_path = cand
        except Exception as e:
            print(f"  ⚠ Ошибка при анализе {cand}: {e}")

    if best_path is None:
        print("  ⚠ Не удалось выбрать лучший кадр")
        return

    # 3) переносим лучший в thumbs/имя_файла.jpg
    final_thumb.write_bytes(best_path.read_bytes())
    print(f"  ✅ выбрано {best_path.name} → {final_thumb}")

    # 4) чистим временные файлы
    for cand in candidates:
        try:
            cand.unlink(missing_ok=True)
        except Exception:
            pass

def main():
    count = 0
    for subject in ROOT.iterdir():
        if not subject.is_dir():
            continue

        for course in subject.iterdir():
            if not course.is_dir():
                continue

            video_dir = course / "video"
            if not video_dir.exists():
                continue

            for video in video_dir.glob("*.mp4"):
                generate_smart_thumb_for_video(video)
                count += 1

    print(f"\n✓ Обработано видеофайлов: {count}")

if __name__ == "__main__":
    main()
