#!/usr/bin/env bash
set -euo pipefail

# scripts/fetch-alibaba-fonts.sh
# 下载字体到 public/fonts/ 并在可用时把 ttf/otf 转为 woff2
# 用法:
#   1) 传入 URL 列表:
#      ./scripts/fetch-alibaba-fonts.sh "https://example.com/font1.ttf" "https://example.com/font2.otf"
#   2) 或者通过环境变量 FONT_URLS 和可选 FONT_NAMES (空格分隔, 与 URL 顺序对应):
#      FONT_URLS="url1 url2" FONT_NAMES="AlibabaPuHuiTi-Regular.woff2 AlibabaPuHuiTi-Bold.woff2" ./scripts/fetch-alibaba-fonts.sh
# 注意: 本脚本不会把字体提交到仓库；你运行脚本后需要把 public/fonts/*.woff2 手动 git add/commit 推送。

OUT_DIR="public/fonts"
mkdir -p "$OUT_DIR"

# 读取输入 URL 列表
URLS=()
if [ $# -gt 0 ]; then
  for u in "$@"; do URLS+=("$u"); done
elif [ -n "${FONT_URLS-}" ]; then
  # 允许通过环境变量传入空格分隔 URL 列表
  # 注意：若 URL 中包含空格或特殊字符，请使用脚本参数模式
  read -r -a URLS <<< "$FONT_URLS"
else
  echo "Usage: $0 <url1> <url2> ..." >&2
  echo "Or set FONT_URLS env var and optionally FONT_NAMES." >&2
  exit 1
fi

# 读取可选目标文件名列表
NAMES=()
if [ -n "${FONT_NAMES-}" ]; then
  read -r -a NAMES <<< "$FONT_NAMES"
fi

# helper to get basename from URL
basename_from_url() {
  local url="$1"
  # remove query
  url="${url%%\?*}"
  echo "${url##*/}"
}

for i in "${!URLS[@]}"; do
  url="${URLS[$i]}"
  # determine filename
  if [ ${#NAMES[@]} -gt $i ] && [ -n "${NAMES[$i]}" ]; then
    filename="${NAMES[$i]}"
  else
    filename=$(basename_from_url "$url")
    if [ -z "$filename" ]; then
      filename="font-$i"
    fi
  fi

  tmpfile="/tmp/fetch-font-$$-$i"
  echo "Downloading: $url -> $tmpfile" 
  # allow curl or wget
  if command -v curl >/dev/null 2>&1; then
    curl -L --fail --progress-bar -o "$tmpfile" "$url"
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O "$tmpfile" "$url"
  else
    echo "Error: need curl or wget to download files." >&2
    exit 1
  fi

  # determine mime/extension
  ext="${filename##*.}"
  ext_lc="$(echo "$ext" | tr '[:upper:]' '[:lower:]')"

  case "$ext_lc" in
    woff2)
      mv "$tmpfile" "$OUT_DIR/$filename"
      echo "Saved woff2 -> $OUT_DIR/$filename"
      ;;
    woff)
      mv "$tmpfile" "$OUT_DIR/$filename"
      echo "Saved woff -> $OUT_DIR/$filename"
      ;;
    ttf|otf)
      # try to convert to woff2 if tools available
      if command -v woff2_compress >/dev/null 2>&1; then
        # woff2_compress creates .woff2 next to file
        workfile="/tmp/font-convert-$$-$i.$ext_lc"
        mv "$tmpfile" "$workfile"
        echo "Converting $workfile -> woff2 using woff2_compress"
        woff2_compress "$workfile"
        woff2name="${workfile%.*}.woff2"
        outname="$OUT_DIR/${filename%.*}.woff2"
        mv "$woff2name" "$outname"
        rm -f "$workfile"
        echo "Saved woff2 -> $outname"
      elif python -c "import sys" >/dev/null 2>&1 && command -v pyftsubset >/dev/null 2>&1; then
        # pyftsubset (fonttools) available
        workfile="/tmp/font-convert-$$-$i.$ext_lc"
        mv "$tmpfile" "$workfile"
        outname="$OUT_DIR/${filename%.*}.woff2"
        echo "Converting $workfile -> woff2 using pyftsubset (full font, no subsetting)"
        pyftsubset "$workfile" --output-file="$outname" --flavor=woff2
        rm -f "$workfile"
        echo "Saved woff2 -> $outname"
      else
        # no converter available, keep original and warn
        outname="$OUT_DIR/$filename"
        mv "$tmpfile" "$outname"
        echo "Warning: downloaded a TTF/OTF but no converter found. Saved original -> $outname"
        echo "To convert to woff2, install 'woff2' (woff2_compress) or python fonttools (pyftsubset)." 
      fi
      ;;
    *)
      # unknown extension - try to detect by file command, but save as-is
      mv "$tmpfile" "$OUT_DIR/$filename"
      echo "Saved file (unknown ext) -> $OUT_DIR/$filename"
      ;;
  esac

done

echo "Done. Fonts are in $OUT_DIR/"

echo "Next steps: git add public/fonts/* && git commit -m 'chore: add fonts' && git push"
