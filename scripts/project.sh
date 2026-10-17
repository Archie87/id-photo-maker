#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
if ! command -v node >/dev/null 2>&1 || ! command -v pnpm >/dev/null 2>&1; then
  idpm_runtime="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies"
  if [ -x "$idpm_runtime/node/bin/node" ] && [ -x "$idpm_runtime/bin/fallback/pnpm" ]; then
    PATH="$idpm_runtime/node/bin:$idpm_runtime/bin/fallback:$PATH"
    export PATH
  else
    echo '需要 Node.js 22.13+ 和 pnpm 11.19.0。请安装后重新运行。' >&2
    exit 1
  fi
fi
exec pnpm "$@"
