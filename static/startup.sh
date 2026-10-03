#!/bin/sh
# startup.sh — dist/ 를 내 컴퓨터에서 미리 봅니다.   ./startup.sh [포트]
# 먼저 ./build.sh 로 dist/ 를 만들어야 합니다. (dist/index.html 을 더블클릭해서 열면 일부 기능이 막힙니다)
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
PORT=${1:-8080}
[ -f "$HERE/dist/index.html" ] || { echo "dist/ 가 없습니다. 먼저 ./build.sh 를 실행하세요." >&2; exit 1; }
cd "$HERE/dist"
echo "미리보기: http://localhost:$PORT   (끄려면 Ctrl+C)"
if command -v python3 >/dev/null 2>&1; then exec python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then exec python -m http.server "$PORT"
elif command -v npx >/dev/null 2>&1; then exec npx --yes serve -l "$PORT" .
else echo "python3 또는 node(npx)가 필요합니다." >&2; exit 1; fi
