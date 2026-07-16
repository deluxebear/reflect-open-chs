#!/usr/bin/env bash
# Build Reflect Dev and run it on the iOS Simulator.
#
# Why this exists: on Xcode 26+/27, `xcrun devicectl list devices` includes
# *booted simulators* (Reality=simulated). cargo-mobile2 / `tauri ios dev`
# treats every devicectl entry as a physical DeviceCtlDevice, so after a
# successful `xcodebuild build` it runs `xcodebuild archive` and dies with
# missing provisioning profiles for app.reflect.ios.dev*.
#
# The Build Rust Code phase also needs the parent `tauri ios dev` process
# (WebSocket for CLI options) — a bare `xcodebuild` is not enough.
#
# Dev URL: when tauri misclassifies the sim as a device it rewrites
# `build.devUrl` to the Mac's LAN IP. The simulator should load loopback
# (`http://127.0.0.1:1420`), not the LAN IP (Local Network permission + Vite
# often not bound there). `--host` requires a real IP, so we pass
# `127.0.0.1` (not the hostname `localhost`).
#
# Flow:
#   1. Run stock `tauri ios dev --host 127.0.0.1` (Vite + xcode-script).
#   2. If it fails after BUILD SUCCEEDED (typical: ARCHIVE FAILED), install
#      the already-built Reflect.app with simctl and ensure Vite on loopback.
#
# Usage (from apps/desktop, or via `pnpm tauri:ios:dev`):
#   ./scripts/ios-sim-dev.sh ["iPhone 17 Pro"]
#   ./scripts/ios-sim-dev.sh --host [IP]   # physical device → stock tauri
#   ./scripts/ios-sim-dev.sh --open        # open Xcode → stock tauri
set -euo pipefail

_pkg_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$_pkg_dir"

# shellcheck source=/dev/null
source "${_pkg_dir}/scripts/ios-build-env.sh"

# Physical device / open-Xcode paths use stock tauri only.
_physical=0
_forward_args=()
for _arg in "$@"; do
  case "$_arg" in
    --open)
      _physical=1
      _forward_args+=("$_arg")
      ;;
    --host|--host=*)
      _physical=1
      _forward_args+=("$_arg")
      ;;
    *)
      _forward_args+=("$_arg")
      ;;
  esac
done

if ((_physical)); then
  exec tauri ios dev --config src-tauri/tauri.ios.dev.conf.json "${_forward_args[@]}"
fi

DEVICE_NAME="${1:-iPhone 17 Pro}"
BUNDLE_ID="app.reflect.ios.dev"
LOG_FILE="${TMPDIR:-/tmp}/reflect-ios-sim-dev.log"
# IPv4 loopback — tauri --host rejects the hostname "localhost".
DEV_HOST="127.0.0.1"
DEV_URL="http://${DEV_HOST}:1420"
export TAURI_DEV_HOST="$DEV_HOST"

resolve_udid() {
  local name="$1"
  local line
  line="$(
    xcrun simctl list devices available \
      | grep -F "$name" \
      | grep -F '(Booted)' \
      | tail -1
  )"
  if [[ -z "$line" ]]; then
    line="$(
      xcrun simctl list devices available \
        | grep -F "$name" \
        | grep -E '\(Shutdown\)' \
        | tail -1
    )"
  fi
  if [[ -z "$line" ]]; then
    return 1
  fi
  echo "$line" | sed -n 's/.*(\([0-9A-Fa-f-]\{36\}\)).*/\1/p' | head -1
}

find_app() {
  find "${HOME}/Library/Developer/Xcode/DerivedData" \
    -path '*/Build/Products/debug-iphonesimulator/Reflect.app' \
    -type d 2>/dev/null \
    | head -1
}

app_dev_url_blob() {
  local app="$1"
  for candidate in "$app/Reflect.debug.dylib" "$app/Reflect"; do
    if [[ -f "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

# True if the binary embeds loopback:1420 (and not a LAN-only old build).
app_has_loopback_url() {
  local app="$1"
  local blob urls
  blob="$(app_dev_url_blob "$app")" || return 1
  urls="$(strings "$blob" 2>/dev/null | grep -oE 'http://[0-9a-zA-Z.:]+:1420/?' | sort -u || true)"
  if [[ -z "$urls" ]]; then
    return 1
  fi
  # Prefer loopback. Allow residual LAN strings only if loopback is also present
  # (older debug sections can leave stale substrings).
  if printf '%s\n' "$urls" | grep -qE 'http://(127\.0\.0\.1|localhost):1420'; then
    return 0
  fi
  return 1
}

vite_ready() {
  curl -sf --connect-timeout 1 "$DEV_URL" >/dev/null 2>&1 \
    || curl -sf --connect-timeout 1 "http://localhost:1420" >/dev/null 2>&1
}

# Tauri's beforeDevCommand always starts Vite; a leftover process on 1420/1421
# makes `pnpm dev` exit non-zero, then `tauri ios xcode-script` cannot reach the
# parent CLI WebSocket (Connection refused) and the Xcode build fails.
free_dev_ports() {
  local port pids
  for port in 1420 1421; do
    pids="$(lsof -t -iTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -z "${pids}" ]]; then
      continue
    fi
    echo "Freeing port ${port} (stale listener pid: ${pids//$'\n'/ })…"
    # shellcheck disable=SC2086
    kill ${pids} 2>/dev/null || true
    sleep 0.4
    pids="$(lsof -t -iTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "${pids}" ]]; then
      # shellcheck disable=SC2086
      kill -9 ${pids} 2>/dev/null || true
      sleep 0.2
    fi
  done
  if lsof -t -iTCP:1420 -sTCP:LISTEN >/dev/null 2>&1 \
    || lsof -t -iTCP:1421 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "error: ports 1420/1421 still in use after free attempt:" >&2
    lsof -nP -iTCP:1420 -sTCP:LISTEN 2>/dev/null >&2 || true
    lsof -nP -iTCP:1421 -sTCP:LISTEN 2>/dev/null >&2 || true
    return 1
  fi
}

ensure_vite() {
  # Bind Vite to the same host the native app will request.
  export TAURI_DEV_HOST="$DEV_HOST"
  export TAURI_ENV_PLATFORM=ios
  if vite_ready; then
    echo "Vite already on ${DEV_URL}"
    return 0
  fi
  echo "Starting Vite on ${DEV_URL} …"
  local vite_log="${TMPDIR:-/tmp}/reflect-ios-vite.log"
  (
    cd "$_pkg_dir"
    export TAURI_DEV_HOST="$DEV_HOST"
    export TAURI_ENV_PLATFORM=ios
    pnpm sidecar
    exec pnpm dev
  ) >"$vite_log" 2>&1 &
  local vite_pid=$!
  for _ in $(seq 1 60); do
    if vite_ready; then
      echo "Vite ready (pid ${vite_pid})"
      return 0
    fi
    if ! kill -0 "$vite_pid" 2>/dev/null; then
      echo "error: Vite exited early; log: $vite_log" >&2
      tail -40 "$vite_log" >&2 || true
      return 1
    fi
    sleep 0.5
  done
  echo "error: Vite did not become ready; log: $vite_log" >&2
  tail -40 "$vite_log" >&2 || true
  return 1
}

install_and_launch() {
  local udid="$1"
  local app_path
  app_path="$(find_app)"
  if [[ -z "${app_path:-}" || ! -d "$app_path" ]]; then
    echo "error: Reflect.app not found under DerivedData" >&2
    return 1
  fi
  if ! app_has_loopback_url "$app_path"; then
    echo "error: Reflect.app still embeds a LAN (or missing) devUrl." >&2
    echo "  Expected: ${DEV_URL}" >&2
    echo "  app: $app_path" >&2
    local blob
    blob="$(app_dev_url_blob "$app_path" || true)"
    if [[ -n "${blob:-}" ]]; then
      strings "$blob" 2>/dev/null | grep -oE 'http://[0-9a-zA-Z.:]+:1420/?' | sort -u | head -10 >&2 || true
    fi
    return 1
  fi
  echo "Installing ${BUNDLE_ID} from:"
  echo "  ${app_path}"
  xcrun simctl bootstatus "$udid" -b >/dev/null 2>&1 || true
  xcrun simctl uninstall "$udid" "$BUNDLE_ID" 2>/dev/null || true
  xcrun simctl install "$udid" "$app_path"
  echo "Launching…"
  # macOS 26+/27 beta: when the sim dyld shared region fails to map, WebKit's
  # WebContent process crashes in dyld_sim at DyldSharedCache::getUUID (SIGBUS
  # at 0x180000058). Prefer iOS 18.x runtimes when possible; DYLD_SHARED_REGION=
  # avoid is the Apple-forum workaround for a degraded sim. SIMCTL_CHILD_* is
  # forwarded into the launched app environment by simctl.
  SIMCTL_CHILD_DYLD_SHARED_REGION="${SIMCTL_CHILD_DYLD_SHARED_REGION:-avoid}" \
    xcrun simctl launch --terminate-running-process "$udid" "$BUNDLE_ID"
  # Best-effort UI (Xcode-beta layout; plain `open -a Simulator` often fails).
  local sim_app
  sim_app="$(xcode-select -p 2>/dev/null)/Applications/Simulator.app"
  if [[ -d "$sim_app" ]]; then
    open -a "$sim_app" --args -CurrentDeviceUDID "$udid" 2>/dev/null || true
  fi
  echo ""
  echo "Reflect Dev is running on ${DEVICE_NAME} (${udid})."
  echo "  Vite HMR: ${DEV_URL}"
  echo "  Tip: disable I/O → Keyboard → Connect Hardware Keyboard to test the software keyboard."
  echo "  Tip: if WebContent keeps crashing (blank WKWebView), erase the sim or use iOS 18.x:"
  echo "    xcrun simctl shutdown all && xcrun simctl erase <udid>"
  echo "    # prefer: pnpm tauri:ios:dev \"iPhone 16 Pro\"  # on iOS 18.6"
}

UDID="$(resolve_udid "$DEVICE_NAME" || true)"
if [[ -z "${UDID:-}" ]]; then
  echo "error: no iOS Simulator matching \"${DEVICE_NAME}\"" >&2
  echo "Available:" >&2
  xcrun simctl list devices available | grep -E "iPhone|iPad" | head -40 >&2 || true
  exit 1
fi

echo "Using simulator: ${DEVICE_NAME} (${UDID})"
echo "Dev server URL (forced for simulator): ${DEV_URL}"
xcrun simctl bootstatus "$UDID" -b >/dev/null 2>&1 || true

# Clear leftover Vite so beforeDevCommand can bind 1420/1421; otherwise the
# parent CLI dies before its options WebSocket is usable by xcode-script.
free_dev_ports

# Stock tauri: builds Rust via xcode-script (needs this parent process).
# --host 127.0.0.1 keeps the baked-in webview URL on loopback even when tauri
# mislabels the sim as a physical device. On Xcode 26+ archive usually fails
# after BUILD SUCCEEDED.
set +e
tauri ios dev \
  --host "$DEV_HOST" \
  --config src-tauri/tauri.ios.dev.conf.json \
  --config "{\"build\":{\"devUrl\":\"${DEV_URL}\"}}" \
  "$DEVICE_NAME" 2>&1 | tee "$LOG_FILE"
TAURI_STATUS=${PIPESTATUS[0]}
set -e

if [[ "$TAURI_STATUS" -eq 0 ]]; then
  exit 0
fi

# Only deploy when this run actually built — not an old LAN-URL binary.
if grep -q 'BUILD SUCCEEDED' "$LOG_FILE"; then
  echo ""
  echo "tauri ios dev exited ${TAURI_STATUS} (expected when archive/provisioning fails)."
  echo "Deploying the simulator build with simctl instead…"
  ensure_vite
  install_and_launch "$UDID"
  echo ""
  echo "Streaming simulator logs (Ctrl-C to stop; Vite keeps running if already up)…"
  xcrun simctl spawn "$UDID" log stream \
    --predicate 'processImagePath CONTAINS "Reflect" OR subsystem CONTAINS "app.reflect"' \
    --level info 2>/dev/null || sleep infinity
  exit 0
fi

if grep -qE 'Port 1420 is already in use|Port 1421 is already in use' "$LOG_FILE"; then
  echo "error: Vite ports still busy — free 1420/1421 and retry." >&2
  lsof -nP -iTCP:1420 -sTCP:LISTEN 2>/dev/null >&2 || true
  lsof -nP -iTCP:1421 -sTCP:LISTEN 2>/dev/null >&2 || true
fi
if grep -q 'failed to build WebSocket client' "$LOG_FILE"; then
  echo "error: xcode-script could not reach parent tauri CLI (WebSocket)." >&2
  echo "  Usually means beforeDevCommand (Vite) failed first, or the parent exited early." >&2
fi

echo "error: tauri ios dev failed without BUILD SUCCEEDED" >&2
echo "  log: $LOG_FILE" >&2
exit "$TAURI_STATUS"
