#!/usr/bin/env bash
# Shared environment for Tauri iOS builds (CLI + Xcode "Build Rust Code" phase).
#
# - Puts Homebrew + rustup on PATH (Xcode's shell has neither).
# - Puts this package's `scripts/` first so the `swift` shim is used.
# - Forces iOS 15+ deployment (Xcode 27 rejects 14.0).
# - Prefers Xcode.app / Xcode-beta.app over bare Command Line Tools.

_ios_scripts_dir="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"

# Prefer a full Xcode install when DEVELOPER_DIR is unset.
if [[ -z "${DEVELOPER_DIR:-}" ]]; then
  if [[ -d /Applications/Xcode.app/Contents/Developer ]]; then
    export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
  elif [[ -d /Applications/Xcode-beta.app/Contents/Developer ]]; then
    export DEVELOPER_DIR=/Applications/Xcode-beta.app/Contents/Developer
  fi
fi

# Xcode's script phase PATH is minimal (/usr/bin:/bin/…). pnpm needs `node` on
# PATH (shebang is `#!/usr/bin/env node`); cargo needs rustup. Also put this
# package's `scripts/` first so the `swift` shim is used for SPM iOS builds.
_extra_path=""
for _candidate in \
  "${HOME}/.local/bin" \
  "${HOME}/.hermes/node/bin" \
  "${HOME}/.fnm/current/bin" \
  "${HOME}/.volta/bin" \
  /usr/local/bin
do
  [[ -d "$_candidate" ]] || continue
  _extra_path="${_extra_path}:${_candidate}"
done
# nvm installs versioned dirs; pick the highest version if present.
if [[ -d "${HOME}/.nvm/versions/node" ]]; then
  _nvm_latest="$(ls -1 "${HOME}/.nvm/versions/node" 2>/dev/null | sort -V | tail -1 || true)"
  if [[ -n "$_nvm_latest" && -d "${HOME}/.nvm/versions/node/${_nvm_latest}/bin" ]]; then
    _extra_path="${_extra_path}:${HOME}/.nvm/versions/node/${_nvm_latest}/bin"
  fi
  unset _nvm_latest
fi
unset _candidate

export PATH="${_ios_scripts_dir}:/opt/homebrew/opt/rustup/bin:${HOME}/.cargo/bin:/opt/homebrew/bin${_extra_path}:/usr/bin:/bin:${PATH:-}"
unset _extra_path
export IPHONEOS_DEPLOYMENT_TARGET="${IPHONEOS_DEPLOYMENT_TARGET:-15.0}"
export MACOSX_DEPLOYMENT_TARGET="${MACOSX_DEPLOYMENT_TARGET:-11.0}"

# Drop a host SDKROOT so swift-rs / xcrun pick the iOS simulator/device SDK
# from --sdk flags instead of inheriting macOS from the ambient environment.
# Callers that need Xcode's SDK (the Build Rust phase) must capture SDKROOT
# *before* sourcing this file and pass it via --sdk-root.
unset SDKROOT
