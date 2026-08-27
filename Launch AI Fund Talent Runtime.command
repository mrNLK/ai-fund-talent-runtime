#!/bin/zsh
set -e

project_dir="$(cd "$(dirname "$0")" && pwd)"
export PATH="/opt/homebrew/opt/node@20/bin:/opt/homebrew/bin:/Users/aifund/.local/bin:$PATH"
export AI_FUND_TALENT_PROJECT="$project_dir"
export AI_FUND_TALENT_HOME="/Users/aifund/AI Fund Talent Runtime"
export AI_FUND_TALENT_MODE="1"

cd "$project_dir"

if [[ ! -x node_modules/.bin/electron-vite ]]; then
  npm install
fi

exec npm run talent:launch
