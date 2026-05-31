#!/usr/bin/env bash
set -euo pipefail

# Reboot only as a last resort when the host has lost network access.
# Intended for small Linux boxes/VPS/Raspberry Pi style hosts.

LOG_TAG="${LOG_TAG:-wifi-watchdog}"
STATE_DIR="${STATE_DIR:-/var/lib/shlimazlbot-watchdog}"
COOLDOWN_SECONDS="${COOLDOWN_SECONDS:-1200}"
PING_COUNT="${PING_COUNT:-2}"
PING_TIMEOUT="${PING_TIMEOUT:-3}"
TARGETS=(${WATCHDOG_TARGETS:-"1.1.1.1 8.8.8.8"})

mkdir -p "$STATE_DIR"

log() {
  logger -t "$LOG_TAG" "$*"
  echo "[$LOG_TAG] $*"
}

can_ping() {
  local target="$1"
  ping -c "$PING_COUNT" -W "$PING_TIMEOUT" "$target" >/dev/null 2>&1
}

network_ok() {
  local target
  for target in "${TARGETS[@]}"; do
    if can_ping "$target"; then
      return 0
    fi
  done
  return 1
}

restart_network_stack() {
  if command -v nmcli >/dev/null 2>&1; then
    log "Network seems down. Asking NetworkManager to reconnect."
    nmcli networking off >/dev/null 2>&1 || true
    sleep 5
    nmcli networking on >/dev/null 2>&1 || true
    sleep 20
    return
  fi

  if systemctl list-unit-files systemd-networkd.service >/dev/null 2>&1; then
    log "Network seems down. Restarting systemd-networkd."
    systemctl restart systemd-networkd.service >/dev/null 2>&1 || true
    sleep 20
    return
  fi

  log "Network seems down. No known network manager found; skipping network restart."
}

cooldown_active() {
  local stamp="$STATE_DIR/last-reboot"
  [[ -f "$stamp" ]] || return 1
  local now last
  now="$(date +%s)"
  last="$(cat "$stamp" 2>/dev/null || echo 0)"
  [[ $((now - last)) -lt "$COOLDOWN_SECONDS" ]]
}

mark_reboot() {
  date +%s > "$STATE_DIR/last-reboot"
}

if network_ok; then
  log "Network is healthy."
  exit 0
fi

restart_network_stack

if network_ok; then
  log "Network recovered after restart attempt."
  exit 0
fi

if cooldown_active; then
  log "Network still down, but reboot cooldown is active. Skipping reboot."
  exit 0
fi

log "Network still down after recovery attempt. Rebooting host."
mark_reboot
systemctl reboot
