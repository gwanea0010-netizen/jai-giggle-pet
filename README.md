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

**Starts by itself:** with Windows, after every update, and whenever you use Claude Code. To restart it manually, right-click the pet → **Restart pet 🔄** (or Quit, then open "Giggles Pet" from the desktop / Start menu).

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

**Pets:** Giggles Cat · 🤖 **Cyborg AI** (official Cyborg ERP bot with banner and flag) · Cyborg Bot · Bunny · Panda · Dino · Fox · Koala

## Code & SQL helper 🔍

Open Visual Studio, SSMS, VS Code or Azure Data Studio and the pet notices ("🗄️ SQL time on CyborgDB!"). Copy a query or some code (Ctrl+C) and it reviews it on the spot:

- ⚠️ `UPDATE` / `DELETE` without `WHERE`, `TRUNCATE`, `= NULL`, open transactions
- 🔐 SQL injection: dynamic SQL glued with `+`, C# SQL strings built with `+` or `$"{}"`, hard-coded passwords
- 🐢 Performance: functions on columns in `WHERE`, leading `%` in `LIKE`, `NOT IN (SELECT…)`, `COUNT(*) > 0`, cursors, `TOP` without `ORDER BY`, `NOLOCK`
- 🎯 Style: `SELECT *`, comma joins, `INSERT` without a column list, missing `SET NOCOUNT ON`
- C#: `.Result` / `.Wait()`, empty `catch`, `async void`, `SqlConnection` without `using`, `new HttpClient()` per call

Everything runs locally and nothing is sent anywhere. Turn it off in Settings → Code & SQL helper.

## Password vault 🔐

Right-click the pet → **Password vault** (or Settings → Open vault) to keep passwords and secure notes:

- Encrypted with **AES-256-GCM**; the key comes from your master password via **scrypt**. The master password is never stored.
- Saved only on this PC (`%APPDATA%\Giggles Pet\vault.json`). Never synced to the team folder, GitHub or the share zip.
- Auto-locks after 5 minutes idle, when you close the window, lock Windows (Win+L) or the PC sleeps. Repeated wrong tries add a wait.
- Copy username / password with one click. Copied passwords are wiped from the clipboard after 20 seconds.
- Strong password generator, search, secure notes, change master password.

⚠️ If you forget the master password, the data can't be recovered.

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

The leaderboard lives on **Supabase**. Everyone's pet, outfit, badges and task counts show up for the whole team; nothing else is shared.

**For teammates:** right-click the pet → **Team leaderboard** → enter the **team code** → **Join team**.

**One-time setup (team lead):**
1. Supabase dashboard → **SQL Editor** → New query → paste [`supabase/setup.sql`](supabase/setup.sql) → **Run**
2. Pick a long team code and create the team (same SQL editor):
   ```sql
   insert into public.pet_teams (name, code_hash)
   values ('Cyborg ERP', encode(sha256(convert_to('YOUR-TEAM-CODE', 'UTF8')), 'hex'));
   ```
3. Share the team code with the developers

The pets use the project's **anon** key (built in via `package.json` → `teamCloud`). The tables aren't exposed; the pets can only call two database functions, and only with a valid team code. Never put the `service_role` key in the app.

No Supabase? Pick **📁 Shared folder** in the Team tab (network drive / OneDrive / Google Drive) instead.

### 💬 Team chat

Right-click the pet → **Message a teammate** (or the 💬 next to a name on the leaderboard). Your teammate's pet hops and shows the message in a bubble with **↩ Reply** and **👍** buttons. Quick replies: ☕ Chai? · 🍽️ Lunch? · 🔍 Review please · 📞 Call me · 🎉 Great job!

- Messages are encrypted with a key derived from the team code (AES-256-GCM), so they're unreadable in the Supabase table / shared folder
- Offline teammates get them when their pet starts (messages wait up to 24 hours)
- **Chats disappear after 24 hours**, both on the server and in the local history (`%APPDATA%\Giggles Pet\messages.json`, this PC only)

### 🪑 Visit a teammate's screen

In the Team tab, pick who sits on your **left** and **right**. Then slingshot your pet hard off that side of your screen: it flies out, lands on your neighbor's screen and says hi ("👋 Hi Rahul! I'm KITTY, Jai's pet"). They can tickle it (you'll hear about it) or double-click to send it back; otherwise it flies home by itself after 30 seconds ("🏠 I'm back! Rahul says hi"). If your neighbor's pet is offline, yours just bounces off the edge.

Works with the Supabase team (messages go through the `pet_send` / `pet_inbox` functions, guarded by the team code and a flood limit) or the shared-folder team.

## Badges 🏅

19 badges, such as First Steps, Busy Bee (10 tasks in a day), Week Warrior (7-day streak), Night Owl, Early Bird, Juggler (3 projects in a day), Frequent Flyer (slingshot), Foodie, Query Guardian and Festive Spirit. The pet throws a party when you earn one, and teammates see your badges on the leaderboard.

## Weather & time of day 🌦️

- **Day & night:** moon and stars at night (and a sleepier pet), chai ☕ in the morning
- **Weather:** enter your city in Settings → the pet carries an umbrella in rain, wears a scarf when it's cold, shows the sun on hot days, and gets a storm cloud with lightning in thunderstorms. Weather comes from [Open-Meteo](https://open-meteo.com) (free, no key); only the city name is sent.

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
