# Running the iOS simulator

Reflect mobile is the iOS target of `apps/desktop`, so the simulator dev loop
builds the Tauri iOS scheme and installs it with `simctl`.

From the repo root:

```bash
# Prefer a full Xcode install (stable or beta) over Command Line Tools only
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
# or: export DEVELOPER_DIR=/Applications/Xcode-beta.app/Contents/Developer

pnpm tauri:ios:dev "iPhone 17 Pro"
```

`tauri:ios:dev` runs `apps/desktop/scripts/ios-sim-dev.sh`, which:

- sources `ios-build-env.sh` so Homebrew, rustup, and `node` are on `PATH`
  (Xcode's Build Rust phase only has `/usr/bin:/bin` by default — without
  `node`, `pnpm` dies with `env: node: No such file or directory`)
- injects a `swift` shim that rewrites SPM `swift build --arch` into
  `--triple …-ios…` — required on Xcode 27 / Swift 6.4, which otherwise
  mixes a macOS sysroot into iOS-simulator compiles and fails module scan
- sets `IPHONEOS_DEPLOYMENT_TARGET=15.0` (current Simulator SDKs reject 14.0)
- builds with `xcodebuild -sdk iphonesimulator` and installs via `simctl`
  (see **Why not plain `tauri ios dev`?** below)
- starts Vite on `http://localhost:1420` for WebView HMR (the simulator
  shares the host's loopback)
- forces `--host 127.0.0.1` so the URL baked into the native binary is
  `http://127.0.0.1:1420`, not the Mac's LAN IP (LAN triggers iOS Local
  Network permission errors and often has no Vite listener; tauri's
  `--host` only accepts an IP, not the hostname `localhost`)

On a physical device, run `pnpm tauri:ios:dev --host` instead (stock
`tauri ios dev`; requires a valid Apple ID + development profiles for
`app.reflect.ios.dev` and its extensions).

The script applies the dev flavor via `tauri.ios.dev.conf.json` / the Xcode
debug configuration: installs as **Reflect Dev** (`app.reflect.ios.dev`, own
icon, own `group.app.reflect.dev` App Group, no iCloud), so it coexists with
the TestFlight/App Store app. Plain `tauri ios dev` without the conf overlay
builds the dev bundle id but tries to launch `app.reflect.ios`.

To see simulator names:

```bash
xcrun simctl list devices available
```

The first run can be quiet for a while because Xcode is compiling the Rust
crate, the Swift keyboard plugin, and native dependencies for
`aarch64-apple-ios-sim`. A healthy launch eventually prints the Plan 19 probe
lines from `spike_mobile.rs`:

```text
[plan19-spike] PASS: keychain round-trip
[plan19-spike] PASS: sqlite fts5
[plan19-spike] PASS: documents file io
[plan19-spike] PASS: libgit2 init+commit
```

## Why not plain `tauri ios dev`?

On Xcode 26+/27, `xcrun devicectl list devices` includes **booted simulators**
(`Reality = simulated`). cargo-mobile2 (inside `@tauri-apps/cli`) treats every
devicectl row as a physical `DeviceCtlDevice`, so `tauri ios dev` picks the
simulator as if it were a real phone, targets `aarch64-apple-ios`, and runs
`xcodebuild archive` — which needs provisioning profiles and a logged-in
Apple ID. That fails with:

```text
** BUILD SUCCEEDED **
Archiving app...
No profiles for 'app.reflect.ios.dev' were found
** ARCHIVE FAILED **
```

`ios-sim-dev.sh` keeps the working build path and deploys with `simctl`
instead of archive/export. Pass `--host` or `--open` to fall back to stock
Tauri when you intentionally target a physical device or want Xcode open.

## The software keyboard

The simulator hides the software keyboard whenever "Connect Hardware
Keyboard" is enabled (I/O → Keyboard, ⇧⌘K) — focusing the editor then
types through the Mac keyboard with no on-screen keyboard and no
`keyboardChange` events, which looks like a keyboard bug but isn't. Turn
that setting off (or press ⌘K with the app focused) to exercise the real
keyboard-avoidance path.

## WebKit.WebContent / `dyld_sim` SIGBUS (macOS 26+/27 beta)

On macOS Tahoe / Xcode 26–27 betas, the simulator can enter a degraded
state where **any** process that needs the dyld shared cache (including
`com.apple.WebKit.WebContent`) crashes before `main`:

```text
Exception Type: EXC_BAD_ACCESS (SIGBUS)
DyldSharedCache::getUUID … far: 0x180000058
dyld_process_snapshot_get_shared_cache failed
```

This is a **host/runtime** bug (shared-region map fails; `dyld_sim` still
reads the unmapped header), not Reflect app code. Workarounds:

1. Prefer an **iOS 18.x** simulator when developing on beta hosts:
   `pnpm tauri:ios:dev "iPhone 16 Pro"` (iOS 18.6), not only iOS 26.x
   “iPhone 17 Pro”.
2. Reset a bad device:
   `xcrun simctl shutdown all && xcrun simctl erase <udid>`
   then restart CoreSimulator if needed:
   `launchctl kickstart -k "gui/$(id -u)/com.apple.CoreSimulator.CoreSimulatorService"`.
3. `ios-sim-dev.sh` launches with `SIMCTL_CHILD_DYLD_SHARED_REGION=avoid`
   (Apple Developer Forums workaround for the degraded shared region).

If the **build** fails with `failed to build WebSocket client` /
`Connection refused` on `tauri ios xcode-script`, free ports **1420/1421**
first (stale Vite). The script clears those ports before `tauri ios dev`.

`tauri ios dev` may normalize generated files under
`apps/desktop/src-tauri/gen/apple/`, including `project.pbxproj` quoting and
merged `Info.plist` usage descriptions. Inspect those diffs before committing;
when the generated output is intentionally refreshed, update the source
template in `apps/desktop/src-tauri/ios.project.yml` or
`apps/desktop/src-tauri/Info.plist` first.
