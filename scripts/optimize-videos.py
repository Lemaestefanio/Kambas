#!/usr/bin/env python3
"""Create and verify a smaller local MP4 without replacing the original.

Usage: python3 scripts/optimize-videos.py INPUT OUTPUT.mp4

Requires ffmpeg and ffprobe on PATH. No network, upload, or database operations.
The result is installed only when all checks pass AND it is smaller than INPUT.
An existing OUTPUT is never overwritten. A JSON report is printed to stdout.
"""

from __future__ import annotations

import argparse
import json
import math
import os
from pathlib import Path
import shutil
import struct
import subprocess
import sys
import tempfile
from fractions import Fraction


MAX_WIDTH = 540
MAX_HEIGHT = 960
MAX_FPS = Fraction(30)


def command(arguments: list[str]) -> str:
    result = subprocess.run(arguments, stdin=subprocess.DEVNULL, capture_output=True, text=True)
    if result.returncode:
        detail = result.stderr.strip()[-4000:]
        raise RuntimeError(f"{Path(arguments[0]).name} failed ({result.returncode}): {detail}")
    return result.stdout


def number(value: object) -> float | None:
    try:
        result = float(value)  # type: ignore[arg-type]
        return result if math.isfinite(result) else None
    except (TypeError, ValueError):
        return None


def frame_rate(stream: dict) -> Fraction:
    for key in ("avg_frame_rate", "r_frame_rate"):
        try:
            rate = Fraction(str(stream.get(key, "0/1")))
            if rate > 0:
                return rate
        except (ValueError, ZeroDivisionError):
            pass
    raise ValueError("Cannot determine the source frame rate safely.")


def stream_duration(stream: dict) -> float | None:
    duration = number(stream.get("duration"))
    if duration is not None:
        return duration
    ticks = number(stream.get("duration_ts"))
    try:
        if ticks is not None:
            return ticks * float(Fraction(str(stream.get("time_base", "0/1"))))
    except (ValueError, ZeroDivisionError):
        pass
    return None


def probe(path: Path, ffprobe: str) -> dict:
    raw = json.loads(command([
        ffprobe, "-v", "error", "-protocol_whitelist", "file,pipe", "-show_format", "-show_streams", "-of", "json", str(path),
    ]))
    videos = [stream for stream in raw.get("streams", [])
              if stream.get("codec_type") == "video" and not stream.get("disposition", {}).get("attached_pic")]
    if len(videos) != 1:
        raise ValueError("Expected exactly one video stream; multi-angle or video-less files are not changed.")
    video = videos[0]
    width, height = int(video.get("width", 0)), int(video.get("height", 0))
    if min(width, height) < 2:
        raise ValueError("Invalid or unsupported video dimensions.")
    rotation = number(video.get("tags", {}).get("rotate")) or 0
    for side_data in video.get("side_data_list", []):
        if "rotation" in side_data:
            rotation = number(side_data["rotation"]) or 0
    display_width, display_height = (height, width) if round(rotation) % 180 == 90 else (width, height)
    audio = [{
        "index": stream["index"], "codec": stream.get("codec_name"),
        "channels": stream.get("channels"), "sample_rate": number(stream.get("sample_rate")),
        "duration_seconds": stream_duration(stream),
    } for stream in raw.get("streams", []) if stream.get("codec_type") == "audio"]
    duration = number(raw.get("format", {}).get("duration"))
    if duration is None or duration <= 0:
        raise ValueError("Cannot verify the full source duration.")
    fps = frame_rate(video)
    return {
        "bytes": path.stat().st_size,
        "duration_seconds": duration,
        "video": {
            "index": video["index"], "codec": video.get("codec_name"),
            "width": width, "height": height,
            "display_width": display_width, "display_height": display_height,
            "rotation_degrees": rotation, "pixel_format": video.get("pix_fmt"),
            "frame_rate": str(fps), "fps": float(fps),
            "duration_seconds": stream_duration(video),
        },
        "audio_stream_count": len(audio),
        "audio": audio,
    }


def mp4_layout(path: Path) -> dict:
    """Read top-level MP4 box headers, seeking past media bytes."""
    length = path.stat().st_size
    offsets: dict[str, int] = {}
    with path.open("rb") as source:
        offset = 0
        while offset + 8 <= length:
            source.seek(offset)
            size, kind = struct.unpack(">I4s", source.read(8))
            header_size = 8
            if size == 1:
                extended = source.read(8)
                if len(extended) != 8:
                    raise ValueError("Truncated MP4 box header.")
                size = struct.unpack(">Q", extended)[0]
                header_size = 16
            elif size == 0:
                size = length - offset
            if size < header_size or offset + size > length:
                raise ValueError("Invalid MP4 box size.")
            name = kind.decode("ascii", errors="replace")
            offsets.setdefault(name, offset)
            offset += size
    moov, mdat = offsets.get("moov"), offsets.get("mdat")
    return {
        "moov_offset": moov, "mdat_offset": mdat,
        "moov_before_mdat": moov is not None and mdat is not None and moov < mdat,
    }


def verify(source: dict, encoded: dict, layout: dict, target_fps: Fraction) -> dict:
    # AAC padding and the final frame can round durations slightly. This accepts
    # at most two output frames, with a 100ms minimum; it never trims intentionally.
    tolerance = max(0.1, 2 / float(target_fps))
    duration_delta = encoded["duration_seconds"] - source["duration_seconds"]
    source_video, output_video = source["video"], encoded["video"]
    video_delta = None
    if source_video["duration_seconds"] is not None and output_video["duration_seconds"] is not None:
        video_delta = output_video["duration_seconds"] - source_video["duration_seconds"]
    audio_deltas = []
    for before, after in zip(source["audio"], encoded["audio"]):
        audio_deltas.append(None if before["duration_seconds"] is None or after["duration_seconds"] is None
                            else after["duration_seconds"] - before["duration_seconds"])
    checks = {
        "full_duration_preserved": abs(duration_delta) <= tolerance,
        "video_duration_preserved": video_delta is None or abs(video_delta) <= tolerance,
        "audio_stream_count_preserved": source["audio_stream_count"] == encoded["audio_stream_count"],
        "audio_durations_preserved": all(delta is None or abs(delta) <= tolerance for delta in audio_deltas),
        "audio_channels_preserved": all(before["channels"] == after["channels"]
                                        for before, after in zip(source["audio"], encoded["audio"])),
        "h264_video": output_video["codec"] == "h264",
        "aac_audio": all(stream["codec"] == "aac" for stream in encoded["audio"]),
        "yuv420p": output_video["pixel_format"] == "yuv420p",
        "dimensions_within_limit": output_video["display_width"] <= MAX_WIDTH and output_video["display_height"] <= MAX_HEIGHT,
        "no_resolution_upscale": output_video["display_width"] <= source_video["display_width"] and output_video["display_height"] <= source_video["display_height"],
        "fps_within_limit": output_video["fps"] <= min(float(MAX_FPS), source_video["fps"]) + 0.01,
        "moov_before_mdat": layout["moov_before_mdat"],
    }
    return {
        "passed": all(checks.values()), "checks": checks,
        "duration_tolerance_seconds": tolerance, "duration_delta_seconds": duration_delta,
        "video_duration_delta_seconds": video_delta, "audio_duration_deltas_seconds": audio_deltas,
    }


def optimize(input_path: Path, output_path: Path) -> dict:
    source_path = input_path.expanduser().resolve(strict=True)
    destination = output_path.expanduser().resolve()
    if not source_path.is_file():
        raise ValueError("INPUT must be a local regular file.")
    if source_path == destination:
        raise ValueError("INPUT and OUTPUT must differ; originals are never replaced.")
    if destination.suffix.lower() != ".mp4":
        raise ValueError("OUTPUT must have an .mp4 extension.")
    if destination.exists() or destination.is_symlink():
        raise FileExistsError("OUTPUT already exists; it will not be overwritten.")
    if not destination.parent.is_dir():
        raise ValueError("The OUTPUT directory must already exist.")
    ffmpeg, ffprobe = shutil.which("ffmpeg"), shutil.which("ffprobe")
    if not ffmpeg or not ffprobe:
        raise RuntimeError("Install ffmpeg and ffprobe before running this script.")

    before = probe(source_path, ffprobe)
    target_fps = min(Fraction(before["video"]["frame_rate"]), MAX_FPS)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{destination.stem}-", suffix=".mp4", dir=destination.parent)
    os.close(descriptor)
    temporary = Path(temporary_name)
    report = {
        "status": "encoding", "input": str(source_path), "output": str(destination),
        "original_preserved": True, "bytes_before": before["bytes"], "source": before,
        "settings": {
            "max_width": MAX_WIDTH, "max_height": MAX_HEIGHT, "fps": str(target_fps),
            "video_codec": "libx264", "preset": "medium", "crf": 25,
            "maxrate_kbps": 900, "buffer_kbits": 1800, "audio_codec": "aac",
            "audio_bitrate_kbps_per_stream": 64, "pixel_format": "yuv420p", "faststart": True,
        },
    }
    try:
        command([
            ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-protocol_whitelist", "file,pipe", "-i", str(source_path),
            "-map", f"0:{before['video']['index']}", "-map", "0:a?", "-map_metadata", "0", "-map_chapters", "0",
            "-vf", f"scale=w='min({MAX_WIDTH},iw)':h='min({MAX_HEIGHT},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps={target_fps}",
            "-c:v", "libx264", "-preset", "medium", "-crf", "25", "-maxrate", "900k", "-bufsize", "1800k",
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", str(temporary),
        ])
        after = probe(temporary, ffprobe)
        layout = mp4_layout(temporary)
        verification = verify(before, after, layout, target_fps)
        report.update({
            "candidate": after, "bytes_after": after["bytes"],
            "reduction_percent": round((1 - after["bytes"] / before["bytes"]) * 100, 2),
            "mp4": layout, "verification": verification,
        })
        if not verification["passed"]:
            report.update({"status": "rejected", "output_kept": False, "reason": "Verification failed; candidate discarded."})
        elif after["bytes"] >= before["bytes"]:
            report.update({"status": "not_smaller", "output_kept": False, "reason": "Candidate is not smaller; original retained."})
        else:
            # An atomic no-overwrite link prevents a file created during encoding
            # from being replaced. Temporary and destination share a filesystem.
            os.link(temporary, destination)
            report.update({"status": "optimized", "output_kept": True})
        return report
    finally:
        temporary.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input", type=Path, help="Existing local source video (retained unchanged).")
    parser.add_argument("output", type=Path, help="New .mp4 path; existing files are never overwritten.")
    args = parser.parse_args()
    try:
        report = optimize(args.input, args.output)
        code = 2 if report["status"] == "rejected" else 0
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as error:
        report = {"status": "error", "output_kept": False, "error": str(error)}
        code = 1
    except KeyboardInterrupt:
        report = {"status": "cancelled", "output_kept": False}
        code = 130
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return code


if __name__ == "__main__":
    sys.exit(main())
