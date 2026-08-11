#!/usr/bin/env bash
#
# extract-hero-frames.sh
# -----------------------------------------------------------------------------
# Turns the composited hero film into the image sequence the landing's canvas
# scrubs through on scroll, and writes a manifest so the frame count, format and
# dimensions are never hardcoded in the app.
#
# WHY IMAGES AND NOT THE MP4. Driving `video.currentTime` from scroll is smaller
# to download and it is what the reference site does — but it is unreliable on
# iOS Safari, which throttles and coalesces seeks on a video element and can sit
# on a stale frame for a whole gesture. A decoded image drawn to a canvas has no
# such behaviour: every frame is addressable, on every browser, at the cost of
# bytes. The loader below streams them so the page is usable long before the
# last one lands.
#
# Usage:  npm run frames:extract          (source defaults to the master below)
#         MASTER=/path/to/other.mp4 npm run frames:extract
#
# Requires: ffmpeg, and one of avifenc (preferred) or cwebp.
# -----------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")/.."

MASTER="${MASTER:-public/media/hero-scrub.mp4}"

DESKTOP_DIR="public/hero-frames"
DESKTOP_FPS=24
DESKTOP_WIDTH=1280        # the master's own width — upscaling adds bytes, not detail
MOBILE_DIR="public/hero-frames-mobile"
MOBILE_FPS=12
MOBILE_WIDTH=720

MANIFEST="src/features/landing/heroManifest.json"
PAR=8                     # parallel encode workers

command -v ffmpeg >/dev/null || { echo "ffmpeg not found (brew install ffmpeg)" >&2; exit 1; }
[ -f "$MASTER" ] || { echo "master video not found at $MASTER" >&2; exit 1; }

if command -v avifenc >/dev/null; then
  FORMAT="avif"; DQ=62; MQ=52
elif command -v cwebp >/dev/null; then
  FORMAT="webp"; DQ=82; MQ=72
else
  echo "no AVIF or WebP encoder (brew install libavif  or  brew install webp)" >&2
  exit 1
fi
echo "→ encoder: $FORMAT"

# <dir> <fps> <width> <quality>
extract_set() {
  local dir="$1" fps="$2" width="$3" q="$4"
  echo "→ $dir  (fps=$fps, width=$width, $FORMAT q=$q)"
  rm -rf "$dir"; mkdir -p "$dir"

  ffmpeg -hide_banner -loglevel error -y -i "$MASTER" \
    -vf "fps=${fps},scale=${width}:-2:flags=lanczos" \
    "$dir/frame_%04d.png"

  if [ "$FORMAT" = "avif" ]; then
    find "$dir" -name 'frame_*.png' -print0 \
      | xargs -0 -P "$PAR" -I {} sh -c 'avifenc -q '"$q"' -s 6 -j 1 "$1" "${1%.png}.avif" >/dev/null 2>&1' _ {}
  else
    find "$dir" -name 'frame_*.png' -print0 \
      | xargs -0 -P "$PAR" -I {} sh -c 'cwebp -quiet -q '"$q"' -m 6 "$1" -o "${1%.png}.webp"' _ {}
  fi
  rm -f "$dir"/frame_*.png
}

extract_set "$DESKTOP_DIR" "$DESKTOP_FPS" "$DESKTOP_WIDTH" "$DQ"
extract_set "$MOBILE_DIR"  "$MOBILE_FPS"  "$MOBILE_WIDTH"  "$MQ"

# Every number below is measured from what was actually produced, so the
# manifest cannot drift from the files.
d_count=$(find "$DESKTOP_DIR" -name "frame_*.${FORMAT}" | wc -l | tr -d ' ')
m_count=$(find "$MOBILE_DIR"  -name "frame_*.${FORMAT}" | wc -l | tr -d ' ')
[ "$d_count" -gt 0 ] || { echo "no frames produced" >&2; exit 1; }

read d_w d_h < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height \
  -of csv=s=x:p=0 "$DESKTOP_DIR/frame_0001.${FORMAT}" | tr 'x' ' ')
read m_w m_h < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height \
  -of csv=s=x:p=0 "$MOBILE_DIR/frame_0001.${FORMAT}" | tr 'x' ' ')

mkdir -p "$(dirname "$MANIFEST")"
cat > "$MANIFEST" <<JSON
{
  "desktop": {
    "totalFrames": ${d_count},
    "basePath": "/hero-frames",
    "prefix": "frame_",
    "ext": "${FORMAT}",
    "pad": 4,
    "width": ${d_w},
    "height": ${d_h}
  },
  "mobile": {
    "totalFrames": ${m_count},
    "basePath": "/hero-frames-mobile",
    "prefix": "frame_",
    "ext": "${FORMAT}",
    "pad": 4,
    "width": ${m_w},
    "height": ${m_h}
  }
}
JSON

echo
echo "desktop: ${d_count} frames @ ${d_w}×${d_h}  ($(du -sh "$DESKTOP_DIR" | cut -f1))"
echo "mobile : ${m_count} frames @ ${m_w}×${m_h}  ($(du -sh "$MOBILE_DIR" | cut -f1))"
echo "manifest: $MANIFEST"
