#!/usr/bin/env bash
set -euo pipefail

# scripts/fetch-fonts-from-list.sh
# 从 base URL + 文件名列表中下载字体（自动 URL 编码中文文件名），保存到 public/fonts/
# 适用于类似: https://apt.25mao.com/ "派-星星纸船.ttf" ...
#
# 用法:
#   ./scripts/fetch-fonts-from-list.sh "https://apt.25mao.com" "fonts.txt"
#   或：
#   BASE_URL=https://apt.25mao.com ./scripts/fetch-fonts-from-list.sh fonts.txt
#
# 说明:
# - 脚本会自动把中文/特殊字符文件名做 URL 编码
# - 仅下载到 public/fonts/，不会自动提交到 git
# - 如果字体是 ttf/otf 且本机已装 woff2/pyftsubset，可自动转 woff2

OUT_DIR="public/fonts"
mkdir -p "$OUT_DIR"

BASE_URL="${BASE_URL:-${1:-}}"
LIST_FILE="${2:-${LIST_FILE:-}}"

if [ -z "$BASE_URL" ] || [ -z "$LIST_FILE" ]; then
  echo "Usage: BASE_URL=https://apt.25mao.com ./scripts/fetch-fonts-from-list.sh fonts.txt" >&2
  echo "       ./scripts/fetch-fonts-from-list.sh 'https://apt.25mao.com' 'fonts.txt'" >&2
  exit 1
fi

# url_encode function (bash-safe enough for common UTF-8 chars)
url_encode() {
  python3 - "$1" <<'PY'
import sys, urllib.parse
print(urllib.parse.quote(sys.argv[1], safe=''))
PY
}

# check dependencies
if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 is required for URL encoding" >&2
  exit 1
fi

while IFS= read -r line || [ -n "$line" ]; do
  line="${line%%#*}"
  line="${line%$'\r'}"
  if [ -z "${line//[[:space:]]/}" ]; then
    continue
  fi

  # keep original file name if line contains a path, strip leading ./ and spaces
  raw_name="${line##*/}"
  name="${raw_name#./}"
  name="${name//[[:space:]]/}"
  if [ -z "$name" ]; then
    continue
  fi

  encoded_name=$(url_encode "$name")
  url="$BASE_URL/${encoded_name}"

  tmp="/tmp/font-fetch-$$-$(echo "$name" | tr -cs 'A-Za-z0-9' '_')"
  echo "Downloading: $url"

  if command -v curl >/dev/null 2>&1; then
    curl -L --fail --progress-bar -o "$tmp" "$url"
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O "$tmp" "$url"
  else
    echo "Error: need curl or wget" >&2
    exit 1
  fi

  ext="${name##*.}"
  ext_lc="$(echo "$ext" | tr '[:upper:]' '[:lower:]')"

  case "$ext_lc" in
    woff2|woff|ttf|otf)
      if [ "$ext_lc" = "ttf" ] || [ "$ext_lc" = "otf" ]; then
        if command -v woff2_compress >/dev/null 2>&1; then
          output_name="$OUT_DIR/${name%.*}.woff2"
          woff2_compress "$tmp"
          mv "${tmp}.woff2" "$output_name"
          echo "Converted to $output_name"
        elif command -v pyftsubset >/dev/null 2>&1; then
          output_name="$OUT_DIR/${name%.*}.woff2"
          pyftsubset "$tmp" --output-file="$output_name" --flavor=woff2
          echo "Converted to $output_name"
        else
          output_name="$OUT_DIR/$name"
          mv "$tmp" "$output_name"
          echo "Saved original (converter not found): $output_name"
        fi
      else
        output_name="$OUT_DIR/$name"
        mv "$tmp" "$output_name"
        echo "Saved font: $output_name"
      fi
      ;;
    *)
      output_name="$OUT_DIR/$name"
      mv "$tmp" "$output_name"
      echo "Saved file: $output_name"
      ;;
  esac

done < "$LIST_FILE"

echo "Done. Files downloaded to $OUT_DIR/"
