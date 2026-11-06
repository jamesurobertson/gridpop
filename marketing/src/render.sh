#!/bin/sh
# Renders every marketing image at its exact pixel size with headless Chrome.
# Usage: sh marketing/src/render.sh   (from anywhere)
set -e
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SRC="$(cd "$(dirname "$0")" && pwd)"
OUT="$(dirname "$SRC")"

# name, page, CSS width, CSS height, device scale
render() {
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
    --force-device-scale-factor="$5" --window-size="$3,$4" --virtual-time-budget=3000 \
    --default-background-color=00000000 \
    --screenshot="$OUT/$1" "file://$SRC/$2" 2>/dev/null
  echo "$1: $(sips -g pixelWidth -g pixelHeight "$OUT/$1" | awk '/pixel/ {printf "%s ", $2}')"
}

# Fails loudly if any page fell back from Fredoka or Nunito.
check_fonts() {
  "$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=3000 \
    --dump-dom "file://$SRC/$1" 2>/dev/null | grep -o 'data-fonts="[^"]*"' | sed "s|^|$1: |"
}

render icon.png icon.html 300 300 1
render icon@2x.png icon.html 300 300 2
render banner-desktop.png banner-desktop.html 1072 128 1
render banner-desktop@2x.png banner-desktop.html 1072 128 2
render banner-mobile.png banner-mobile.html 1080 128 1
render banner-mobile@2x.png banner-mobile.html 1080 128 2
render share.png share.html 1200 630 1

for page in icon.html banner-desktop.html banner-mobile.html share.html; do check_fonts "$page"; done
