#!/usr/bin/env bash
# IFSE Open installer (Linux / macOS). Asks where the site and the dashboard
# listen, writes .env, then builds and starts the containers.
#   ./install.sh            ask
#   ./install.sh --defaults take every default without asking
set -euo pipefail
cd "$(dirname "$0")"

ASK=1
[ "${1:-}" = "--defaults" ] && ASK=0

say()  { printf '%s\n' "$*"; }
ask()  {   # ask VAR "question" default
    local var=$1 q=$2 def=$3 ans=""
    if [ $ASK = 1 ]; then read -r -p "$q [$def]: " ans || true; fi
    printf -v "$var" '%s' "${ans:-$def}"
}
pick() {   # pick VAR "question" default "1=value|label" ...
    local var=$1 q=$2 def=$3; shift 3
    say ""; say "$q"
    local opt
    for opt in "$@"; do say "  ${opt%%=*}) ${opt#*|}"; done
    local n; ask n "Choose" "$def"
    for opt in "$@"; do
        if [ "${opt%%=*}" = "$n" ]; then local v=${opt#*=}; printf -v "$var" '%s' "${v%%|*}"; return; fi
    done
    say "Unknown choice '$n', using $def."
    pick "$var" "$q" "$def" "$@" < /dev/null
}
valid_port() { [[ $1 =~ ^[0-9]+$ ]] && [ "$1" -ge 1 ] && [ "$1" -le 65535 ]; }

command -v docker >/dev/null || { say "Docker is not installed: https://docs.docker.com/get-docker/"; exit 1; }
docker compose version >/dev/null 2>&1 || { say "Docker Compose v2 is needed (docker compose …)."; exit 1; }

if [ -f .env ] && [ $ASK = 1 ]; then
    read -r -p ".env already exists. Replace it? [y/N]: " r || true
    case "$r" in y|Y) ;; *) say "Keeping .env. Starting with it."; docker compose up -d --build; exit 0;; esac
fi

say "IFSE Open — setup"

pick SEARCH_BIND "Who can open the search site?" 1 \
    "1=0.0.0.0|Everyone who can reach this machine (LAN, server, internet) — 0.0.0.0" \
    "2=127.0.0.1|Only this machine — localhost"
ask SEARCH_PORT "Search site port" 5000
until valid_port "$SEARCH_PORT"; do ask SEARCH_PORT "Port 1-65535" 5000; done

pick INDEXER_BIND "Who can open the indexer dashboard (controls the index)?" 1 \
    "1=127.0.0.1|Only this machine — localhost (recommended)" \
    "2=0.0.0.0|Every network — 0.0.0.0 (protect it with a firewall or VPN)"
ask INDEXER_PORT "Dashboard port" 5101
until valid_port "$INDEXER_PORT" && [ "$INDEXER_PORT" != "$SEARCH_PORT" ]; do ask INDEXER_PORT "Another port 1-65535" 5102; done

ask SEARCH_URL "Public address of the site, if it has a domain (empty = none)" ""

TOKEN=$(head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32)

umask 077
cat > .env <<EOF
# written by install.sh — edit and run: docker compose up -d
SEARCH_BIND=$SEARCH_BIND
SEARCH_PORT=$SEARCH_PORT
INDEXER_BIND=$INDEXER_BIND
INDEXER_PORT=$INDEXER_PORT
SEARCH_URL=$SEARCH_URL
IFSE_ADMIN_TOKEN=$TOKEN
IFSE_RATE_PER_MIN=120
EOF

say ""; say "Building and starting…"
docker compose up -d --build

addr() {   # where people reach a service bound to $1 on port $2
    if [ "$1" = "127.0.0.1" ]; then say "    http://localhost:$2"; return; fi
    say "    http://localhost:$2"
    local ip ips="" shown=0
    if command -v ip >/dev/null 2>&1; then          # Linux
        ips=$(ip -4 -o addr show scope global 2>/dev/null | awk '{print $4}' | cut -d/ -f1)
    elif [ "$(uname)" = "Darwin" ]; then
        ips=$(ipconfig getifaddr en0 2>/dev/null; ipconfig getifaddr en1 2>/dev/null)
    fi
    for ip in $ips; do
        [[ $ip =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || continue
        case $ip in 127.*|169.254.*|172.1[7-9].*|172.2*|172.3[01].*) ;; *) say "    http://$ip:$2"; shown=1;; esac
    done
    [ $shown = 1 ] || say "    http://<this machine's IP>:$2"
}

say ""
say "IFSE Open is running."
say "  Search site:";        addr "$SEARCH_BIND" "$SEARCH_PORT"
say "  Indexer dashboard:";  addr "$INDEXER_BIND" "$INDEXER_PORT"
say "  Customize the site:   <search site>/owner"
say "  Admin token:          $TOKEN   (also in .env)"
[ "$SEARCH_BIND" = "0.0.0.0" ] && say "  If other devices cannot connect, open port $SEARCH_PORT in this machine's firewall."
