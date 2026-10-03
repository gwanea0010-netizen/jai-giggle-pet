# Giggles Pet 🔺

**Cyborg ERP dev buddy. Developed by [Jai Panwar](https://github.com/jai9997)**

An animated desktop pet that keeps you company while you code. It types along while your AI coding assistant works, throws a party when the task is done, and taps you on the shoulder when your input is needed.

## ⬇️ Install

**One line (PowerShell):**

```powershell
irm https://raw.githubusercontent.com/gwanea0010-netizen/jai-giggle-pet/main/install.ps1 | iex
```

**Or download:** [**Giggles-Pet-Setup.exe**](https://github.com/gwanea0010-netizen/jai-giggle-pet/releases/latest/download/Giggles-Pet-Setup.exe), then double-click it. If Windows says "protected your PC", click **More info → Run anyway**.

The pet appears, connects itself and asks your name. Restart Claude Code once. No Node.js or anything else is needed.

**Updates are automatic.** The pet checks for new versions, downloads them and updates itself quietly when you're idle.

Uninstall from Windows "Installed apps".

## What it does

| When… | The pet… |
|---|---|
| The assistant is working | types on a laptop with the Cyborg ERP logo; the bubble shows "Editing code…", "Running a command…" |
| **The task finishes** | **jumps, confetti, sparkles, chime + giggle: "All done, Jai! 🎉"** |
| Your permission is needed | hops, waves, "!" badge, yellow bubble |
| You play music / YouTube / Spotify | puts on headphones 🎧 and grooves to it, showing the song name |
| You're on a call / using the mic | wears a headset with mic 🎙️ and goes quiet |
| You open Chrome / Edge | thinks out loud: "🤔 What are we searching, Jai?" |
| You finish 5/10/20… tasks in a day | trophy message 🏆 |
| Nothing happens for 4 min | falls asleep 💤 |

**Interactions:** click = tickle 😆 · rub back and forth = pat 💕 · click 6× fast = dizzy 😵 · double-click = celebrate · drag = move · right-click = menu

**🎯 Slingshot:** press and hold the pet for half a second, pull back and let go. It flies like an angry bird, bounces off screen edges and can land on your other monitor, then gives you a motivational quote 💪.

**Fun menu:** feed a snack 🍪 · dance party 💃 · dev jokes 😂 · tips 💡 · motivate me 💪 · walk around 🚶

**Pets:** Giggles Cat · Cyborg Bot · Bunny · Panda · Dino · Fox · Koala

## Wardrobe 👕

Every finished task counts. Outfits unlock automatically and the pet puts each new one on with a party:

| Tasks | Unlock |
|---|---|
| 3 | 🤓 Nerd glasses |
| 8 | 🎀 Bow tie |
| 12 | 👕 Cyborg ERP tee |
| 15 | 🥳 Party hat |
| 25 | 😎 Cool shades |
| 35 | 🌸 Flower |
| 50 | 🧢 Cyborg ERP cap |
| 75 | 👑 Crown |
| 100 | 🦸 Hero cape |

**Festival collectibles:** keep the pet running during a festival and it collects that festival's outfit for good, and greets you ("Happy Diwali, Jai! 🪔"):

| Festival | Items |
|---|---|
| 🪔 Diwali | Festive kurta + Diya |
| 🎨 Holi | Holi colours |
| 🎄 Christmas | Santa hat + Gift box |
| 🎆 New Year | Star glasses |
| 🇮🇳 15 August / 26 January | Tiranga |

Right-click → **Wardrobe** to swap items. Click a locked item to preview it.

## Team leaderboard 🏆

1. Right-click → **Team leaderboard** → **Choose team folder**
2. Pick a folder everyone can reach: shared network drive, synced OneDrive / SharePoint / Teams folder, or Google Drive
3. Every teammate picks the same folder

Shows today / all-time rankings with everyone's pet in its outfit. Only names, pet looks and task counts are shared.

## Settings

Right-click the pet → **Settings**: your name and the pet's name, pet type, size (Tiny → XL), sounds, music/call/browser reactions, walking, notifications, start with Windows, tips, updates.

Settings are saved in `%APPDATA%\Giggles Pet\settings.json`.

---

## For developers

```bash
npm install
```

```bash
npm start
```

Test without the assistant: `npm run test-done`, `test-working`, `test-attention`, `test-music`, `test-snack`.

### Releasing a new version

Commit your changes, then:

```bash
npm run release -- patch --notes "New outfits"
```

This bumps the version, tags it and pushes. The GitHub workflow (`.github/workflows/release.yml`) builds the installer on Windows and publishes it with `latest.json` (SHA-512 checksum) as a release. Every installed pet picks it up within a few hours. Use `minor` for bigger releases. Settings → ⚙️ → Updates → **Publish** does the same.

No GitHub? Publish to a shared folder instead with `npm run release -- --folder "\\server\share\giggles-updates"` and set that folder as the update source in Settings.

### How it works

```
Claude Code ──hook──▶ pet-hook (.js / .exe) ──POST 127.0.0.1:47321/event──▶ main.js ──IPC──▶ renderer/pet.js
system/monitor.ps1 (audio level, mic in use, foreground window) ──stdout──▶ main.js ──▶ renderer/pet.js
```

- `main.js`: transparent always-on-top pet window, settings window, local event server (localhost only), settings, updates
- `hooks/pet-hook.js` / `build/pet-hook.cs`: forward only the event name, session id, project folder, tool name and notification text. They never forward prompts or code.
- `system/monitor.ps1`: speaker level (Core Audio), mic usage (Windows privacy registry), foreground window title. Everything stays on the machine.
- `lib/team.js`: shared-folder leaderboard. `lib/updater.js`: update check, download, checksum, silent install.
- `renderer/`: SVG pets (`pet-svg.js`), animations (`pet.css`), behaviour (`pet.js`), sounds (`sound.js`), wardrobe (`accessories.js`), settings UI

### Options (environment variables)

- `GIGGLES_PORT`: local port (default `47321`)
- `GIGGLES_AUTOLAUNCH=0`: don't let hooks start the pet automatically
- `GIGGLES_DEBUG=1`: log renderer console output

---

© 2026 Jai Panwar
