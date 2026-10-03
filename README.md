# Giggles Pet 🔺: Cyborg ERP dev buddy

An animated desktop pet that lives on your screen and reacts to Claude Code. It works while Claude works, celebrates when the task is done, and pings you when Claude needs you.

## Quick install (for teammates)

**Installer (recommended, nothing else needed):**

1. Double-click **`Giggles-Pet-Setup-3.1.0.exe`**. If Windows says "protected your PC", click **More info → Run anyway**
2. The pet appears and is already connected to Claude Code. Enter your name in the Settings window that opens
3. Restart Claude Code once

Uninstall from Windows "Installed apps". This also removes the Claude Code hooks.

**Zip (developers with Node.js 18+):** unzip `Giggles-Pet.zip` and double-click `Install-Giggles.bat`.

## Wardrobe 👕

Every Claude task you finish counts. Outfits unlock automatically, and the pet puts the new one on with a party:

| Tasks | Unlock |
|---|---|
| 3 | 🤓 Nerd glasses |
| 8 | 🎀 Bow tie |
| 15 | 🥳 Party hat |
| 25 | 😎 Cool shades |
| 35 | 🌸 Flower |
| 50 | 🧢 Cyborg ERP cap |
| 75 | 👑 Crown |
| 100 | 🦸 Hero cape |

Right-click → **Wardrobe** to swap items (one per head / face / neck slot). Click a locked item to preview it on your pet.

**Outfit slot:** 👕 Cyborg ERP tee unlocks at 12 tasks.

**Festival collectibles:** keep the pet running during a festival and it collects that festival's outfit for good and greets you ("Happy Diwali, Jai! 🪔"):

| Festival | Items |
|---|---|
| 🪔 Diwali | Festive kurta + Diya |
| 🎨 Holi | Holi colours |
| 🎄 Christmas | Santa hat + Gift box |
| 🎆 New Year | Star glasses |
| 🇮🇳 15 August / 26 January | Tiranga |

Diwali and Holi dates are listed in `renderer/accessories.js` up to 2029. Add more years there.

**Pets:** Giggles Cat · Cyborg Bot · Bunny · Panda · Dino · Fox · Koala

## Auto-update 🔄

Installed pets update themselves from a release folder. By default this is `<team folder>\giggles-updates`. You can also set a custom folder or an `https://` URL in Settings → Updates.

To publish a new version (from this source folder):

```bash
npm run release -- patch --notes "New outfits"
```

Or use Settings → ⚙️ → Updates → **Publish**. This bumps the version, builds the installer and copies it plus `latest.json` (with a SHA-512 checksum) into the release folder. Pets check every 3 hours, download and verify the installer, then install it silently once Claude has been idle for a few minutes and come back on their own. Teammates who are still on 3.0.0 need to install 3.1.0 once by hand; after that, updates are automatic.

## Team leaderboard 🏆

1. Right-click → **Team leaderboard** → **Choose team folder**
2. Pick a folder everyone can reach: shared network drive, a synced OneDrive / SharePoint / Teams folder, or Google Drive
3. Every teammate picks the same folder

Each pet writes one small file (`giggles-team/<id>.json`) with name, pet look and task counts. The board shows today / all-time rankings with everyone's pet in its outfit. Your pet tells you when you take #1 ("🏆 You're #1 on the team today!") or when someone passes you.

## Building the installer

```bash
npm run dist
```

Output: `dist/Giggles-Pet-Setup-<version>.exe`. You can also use Settings → ⚙️ → **Build installer**. The build compiles `build/pet-hook.cs` into a small native hook with the C# compiler that ships with Windows, so installed machines don't need Node.js. The installer is unsigned, so Windows SmartScreen shows a warning on first run.

## What it does

| When… | The pet… |
|---|---|
| Claude is working | types on a laptop with the Cyborg ERP logo; the bubble shows "Editing code…", "Running a command…" |
| **Claude finishes** | **jumps, confetti, sparkles, chime + giggle: "All done, Jai! 🎉"** |
| Claude needs permission | hops, waves, "!" badge, yellow bubble |
| You play music / YouTube / Spotify | puts on headphones 🎧 and grooves to it, showing the song name |
| You're on a call / using the mic | wears a headset with mic 🎙️ and goes quiet (no sounds) |
| You open Chrome / Edge | thinks out loud: "🤔 What are we searching, Jai?" |
| You finish 5/10/20… tasks in a day | trophy message 🏆 |
| Nothing happens for 4 min | falls asleep 💤 |

**Interactions:** click = tickle 😆 · rub back and forth = pat (hearts + purr) 💕 · click 6× fast = dizzy 😵 · double-click = celebrate · drag = move · right-click = menu

**Fun menu:** feed a snack 🍪 · dance party 💃 · dev jokes 😂 · tips 💡 · walk around mode 🚶

**Pets:** Giggles Cat · Cyborg Bot · Bunny · Panda · Dino

## Settings

Right-click the pet → **Settings** (or the menu shortcuts):

- Your name and the pet's name
- Pet type, with live previews
- Size: Tiny → XL, or the slider (45%–150%)
- Sounds and volume, music/call/browser reactions, walking, Windows notifications, start with Windows
- Wellness & coding tips every 15/30/60 minutes
- Connect / disconnect Claude Code
- Today's and all-time finished-task count
- **Create share package**: builds `dist/Giggles-Pet.zip` for teammates

Settings are saved per user in `%APPDATA%\Giggles Pet\settings.json`.

## Commands

```bash
npm install
```

```bash
npm start
```

```bash
npm run install-hooks
```

```bash
npm run uninstall-hooks
```

```bash
npm run share
```

Test without Claude: `npm run test-done`, `test-working`, `test-attention`, `test-music`, `test-snack`.

## How it works

```
Claude Code ──hook──▶ hooks/pet-hook.js ──POST 127.0.0.1:47321/event──▶ main.js ──IPC──▶ renderer/pet.js
system/monitor.ps1 (audio level, mic in use, foreground window) ──stdout──▶ main.js ──▶ renderer/pet.js
```

- `main.js`: transparent always-on-top pet window, settings window, local event server (localhost only), settings storage
- `hooks/pet-hook.js`: forwards only the event name, session id, project folder, tool name and notification text. It never forwards prompts or code. It is silent and always exits 0.
- `system/monitor.ps1`: reads the speaker peak level (Core Audio), mic usage (Windows privacy registry) and the foreground window title. All of this stays on the machine.
- `renderer/`: SVG pets (`pet-svg.js`), CSS animations (`pet.css`), behaviour (`pet.js`), WebAudio sounds (`sound.js`), settings UI
- The installer backs up `~/.claude/settings.json` before adding hooks

## Options (environment variables)

- `GIGGLES_PORT`: local port (default `47321`)
- `GIGGLES_AUTOLAUNCH=0`: don't let hooks start the pet automatically
- `GIGGLES_DEBUG=1`: log renderer console output
