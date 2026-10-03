#!/bin/sh
# build.sh — invitation.conf 를 읽어 src/ 를 dist/ 로 변환합니다.
#
#   ./build.sh                          기본: invitation.conf → dist/
#   ./build.sh --conf 다른파일.conf     다른 설정 파일 사용
#   ./build.sh --out 출력폴더           출력 위치 변경
#   ./build.sh --set KEY=VALUE          conf 값을 한 번만 덮어쓰기 (여러 번 가능)
#
# 하는 일
#   1) src/ 를 dist/ 로 복사하고, DEFAULT_VERSION 의 사본을 index.html 로 둡니다
#   2) HTML 안의 {{TOKEN}} 을 conf 값으로 치환 (HTML 이스케이프 적용)
#   3) dist/js/data.js 생성: window.__WEDDING__ (일반 정보), window.__GIFT__ (난독화한 계좌)
#
# POSIX sh 로 작성되어 macOS, Linux, Git Bash, Alpine(busybox)에서 그대로 동작합니다.

set -eu

HERE=$(cd "$(dirname "$0")" && pwd)
CONF="$HERE/invitation.conf"
OUT="$HERE/dist"
SRC="$HERE/src"
SETS=""

while [ $# -gt 0 ]; do
  case "$1" in
    --conf) CONF="$2"; shift 2 ;;
    --out)  OUT="$2"; shift 2 ;;
    --set)  SETS="$SETS
$2"; shift 2 ;;
    -h|--help) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "알 수 없는 옵션: $1" >&2; exit 2 ;;
  esac
done

if [ ! -f "$CONF" ]; then
  echo "설정 파일이 없습니다: $CONF" >&2
  echo "  cp invitation.conf.example invitation.conf  로 만든 뒤 값을 채워 주세요." >&2
  exit 1
fi

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT INT TERM
mkdir "$TMP/v"
SOH=$(printf '\001')

# ---------- 1. conf 읽기: KEY="value" → $TMP/v/KEY ----------
while IFS= read -r line || [ -n "$line" ]; do
  line=${line%"$(printf '\r')"}
  case "$line" in ''|'#'*|' '*|'	'*) continue ;; esac
  case "$line" in [A-Z]*=*) ;; *) continue ;; esac
  key=${line%%=*}
  val=${line#*=}
  case "$val" in \"*) val=${val#\"} ;; esac
  case "$val" in *\") val=${val%\"} ;; esac
  printf '%s' "$val" > "$TMP/v/$key"
done < "$CONF"

# --set KEY=VALUE 덮어쓰기
old_ifs=$IFS
IFS='
'
for kv in $SETS; do
  [ -n "$kv" ] || continue
  printf '%s' "${kv#*=}" > "$TMP/v/${kv%%=*}"
done
IFS=$old_ifs

get() { if [ -f "$TMP/v/$1" ]; then cat "$TMP/v/$1"; fi; }

# ---------- 2. 파생 값 ----------
PHOTO_OG=$(get PHOTO_OG)
[ -n "$PHOTO_OG" ] || PHOTO_OG=$(get PHOTO_COVER)
printf '%s' "$PHOTO_OG" > "$TMP/v/PHOTO_OG"

html_esc() { printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' -e 's/"/\&quot;/g'; }
json_esc() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/	/\\t/g'; }
repl_esc() { printf '%s' "$1" | sed -e 's/[\\&]/\\&/g'; }

# 공유 미리보기 이미지 태그 (SITE_ORIGIN 과 사진이 둘 다 있을 때만)
ORIGIN=$(get SITE_ORIGIN); ORIGIN=${ORIGIN%/}
OG_IMAGE_TAG=""
if [ -n "$ORIGIN" ] && [ -n "$PHOTO_OG" ]; then
  OG_IMAGE_TAG="<meta property=\"og:image\" content=\"$(html_esc "$ORIGIN/photos/$PHOTO_OG")\">"
fi

# ---------- 3. 복사 ----------
[ -d "$SRC" ] || { echo "src/ 폴더를 찾을 수 없습니다: $SRC" >&2; exit 1; }
rm -rf "$OUT"
mkdir -p "$OUT"
cp -R "$SRC"/. "$OUT"/
rm -f "$OUT"/photos/.gitkeep
# DEFAULT_VERSION(main 또는 developer)의 사본이 index.html 이 됩니다. 세 페이지는 언제나 함께 만들어집니다.
DEF=$(get DEFAULT_VERSION)
case "$DEF" in main|developer) ;; '') DEF=main ;; *) echo "경고: DEFAULT_VERSION='$DEF' 은 main 또는 developer 여야 합니다. main 으로 둡니다." >&2; DEF=main ;; esac
cp "$OUT/$DEF.html" "$OUT/index.html"

# ---------- 4. {{TOKEN}} 치환 (HTML 파일) ----------
SUBST="$TMP/subst.sed"
: > "$SUBST"
for f in "$TMP"/v/*; do
  key=${f##*/}
  case "$key" in *_ACCOUNTS) continue ;; esac   # 계좌는 HTML 에 넣지 않습니다
  v=$(repl_esc "$(html_esc "$(cat "$f")")")
  printf 's%s{{%s}}%s%s%sg\n' "$SOH" "$key" "$SOH" "$v" "$SOH" >> "$SUBST"
done
printf 's%s{{OG_IMAGE_TAG}}%s%s%sg\n' "$SOH" "$SOH" "$(repl_esc "$OG_IMAGE_TAG")" "$SOH" >> "$SUBST"

for html in "$OUT"/*.html; do
  [ -f "$html" ] || continue
  sed -f "$SUBST" "$html" > "$html.tmp" && mv "$html.tmp" "$html"
  if grep -q '{{[A-Z_]*}}' "$html"; then
    echo "경고: $(basename "$html") 에 치환되지 않은 토큰이 있습니다:" >&2
    grep -o '{{[A-Z_]*}}' "$html" | sort -u | sed 's/^/  /' >&2
  fi
done

# ---------- 5. dist/js/data.js ----------
mkdir -p "$OUT/js"
DATA="$OUT/js/data.js"
{
  echo "// build.sh 가 invitation.conf 에서 만든 파일입니다. 직접 고치지 마세요."
  echo "window.__WEDDING__ = {"
  first=1
  for f in "$TMP"/v/*; do
    key=${f##*/}
    case "$key" in *_ACCOUNTS) continue ;; esac
    [ $first -eq 1 ] || echo ","
    first=0
    printf '  "%s": "%s"' "$key" "$(json_esc "$(cat "$f")")"
  done
  echo ""
  echo "};"
  # 계좌: 줄 단위로 합친 뒤 base64 → 문자열 뒤집기. (암호화가 아니라 단순 난독화)
  blob=$(printf 'G:%s\nB:%s\n' "$(get GROOM_ACCOUNTS)" "$(get BRIDE_ACCOUNTS)" | base64 | tr -d '\n\r' | rev)
  echo "window.__GIFT__ = \"$blob\";"
} > "$DATA"

echo "완료: $OUT"
echo "  미리보기: ./startup.sh   (Windows: .\\startup.ps1)"
