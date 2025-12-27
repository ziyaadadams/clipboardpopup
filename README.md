# Clipboard Popup — GNOME Shell

Windows 11–inspired clipboard history with keyboard-first flow and shell-native styling.

Supports GNOME Shell 45–49. Default shortcut: Super+V.

<details>
<summary><strong>✨ Highlights</strong></summary>

- History of text and images (PNG, size-capped) with thumbnails and source metadata
- Pinned items, inline pin/unpin, delete, and clear-unpinned with confirmation
- Keyboard friendly: Enter to copy, Shift+Enter plain, Ctrl+P pin, Delete remove, Esc close
- Emoji, kaomoji, symbols, and GIF picker (Tenor) with search; picks are added to history
- Rich text aware: stores HTML/RTF when available; can force plain text
- Pause/resume capture with badge + QS toggle; secure-context skip list
- Position options: near focused window (default) or near mouse cursor
- Wayland-friendly (no auto-paste); optional auto-paste on X11 via xdotool

</details>

<details>
<summary><strong>🚀 Install / Update</strong></summary>

1) Compile schemas (required after edits):
   ```sh
   glib-compile-schemas schemas/
   ```
2) Install locally:
   ```sh
   EXT_DIR="$HOME/.local/share/gnome-shell/extensions/clipboardpopup@local"
   mkdir -p "$EXT_DIR"
   cp -r * "$EXT_DIR"
   ```
   or install the zip: `gnome-extensions install --force dist/clipboardpopup@local.zip`
3) Restart GNOME Shell (Alt+F2 → r on X11, or log out/in on Wayland).
4) Enable via `gnome-extensions enable clipboardpopup@local` or the Extensions app.

</details>

<details>
<summary><strong>🎛️ Usage</strong></summary>

- Super+V opens the popup
- Up/Down to move, Enter to copy, Shift+Enter for plain text, Esc to close
- Right-click an item to copy plain text
- Ctrl+P pin/unpin, Delete removes
- Header tabs (icons) switch: History / Emoji / Kaomoji / Symbols / GIF
- GIF tab: type to search; click to copy URL

</details>

<details>
<summary><strong>🎨 Look & Feel</strong></summary>

- Shell-themed surfaces and buttons
- Icon-only header tabs; close button on the right
- History toolbar (clear, unpin-all, pause) shown only in the History tab
- Compact kaomoji buttons (smaller font, fewer per row) to avoid clipping
- GIF tiles load previews from Tenor

</details>

<details>
<summary><strong>⚙️ Preferences</strong></summary>

- Popup position: near focused window (default) or near mouse cursor
- History size, persistence, polling interval
- Track PRIMARY selection (X11), pause capture, secure-context heuristics, skip list
- Paste behavior: always plain text, or rich when available; auto-paste on X11 with xdotool
- Shortcut text entry (e.g., `<Super>v`, `<Alt>v`)

</details>

<details>
<summary><strong>🔧 Settings (gschema)</strong></summary>

- `history-size` (int): max entries (pinned always kept)
- `poll-interval-ms` (int): polling interval
- `shortcut` (strv): keybinding(s)
- `persist-history` (bool): save to disk
- `track-primary` (bool): capture PRIMARY (X11)
- `auto-paste` (bool): simulate paste after selection (X11 + xdotool)
- `paste-as-plain-text` (bool): strip formatting
- `pause-capture` (bool): pause recording
- `enable-secure-heuristics` (bool): skip likely secure windows
- `skip-wm-classes` (strv): classes to always skip
- `max-rich-bytes` (int): cap stored HTML/RTF
- `emoji-recents` (strv): recent emoji list
- `popup-position` (string): `window` or `mouse`

</details>

<details>
<summary><strong>ℹ️ Notes</strong></summary>

- Wayland blocks synthetic paste: auto-paste is X11-only; copying still works, press Ctrl+V manually
- Clipboard data is local only; no cloud sync
- Restart GNOME Shell after installing/upgrading

</details>

<details>
<summary><strong>📦 Build / Validate</strong></summary>

- Build zip: `./build.sh`
- Validate and package: `./check.sh` (runs schema compile + zip; validation requires `gnome-extensions`)

</details>
