# TBH HUD

A **read-only** companion dashboard for the Steam game *TBH: Task Bar Hero*. It decrypts your local save
(and reads the game's `Player.log` + rolling backups) entirely on your machine and presents a premium dashboard.
It **never writes to, modifies, or injects into the game** — it only reads files on disk.

Unofficial fan tool. Not affiliated with Tesseract Studio / Nugem Studio.

## What it shows (9 tabs)
- **Overview** — gold, current & max stage (shown as **"Act X-Y" + the real stage name**, never a raw key), total
  kills, runes, session gold/hr & kills/hr, an **offline-rewards card** (live idle timer + last collection rate + cap
  learned from your own logs), deployed party, active pet, a plain-language **"who's carrying"** gear-strength ranking
  (labeled bar + tooltips, no jargon), and your best trophies.
- **Party** — every hero with level, **real XP-to-next-level progress** (calibrated from the game's level curve),
  a **"time to next level"** estimate (XP remaining ÷ the XP/hour you're *actually* gaining this session — your real
  pace, never a guessed number), equipped gear (hover for stats), equipped skill names, and a **full "who's carrying"
  source breakdown**: each deployed
  hero's stats attributed to Base / Gear / Tree, plus account-wide runes & pet.
- **Inventory** — every owned item with its real name, rarity (color-framed), real icon, level, enchants, **inherent
  gear stats and unique-mod effects** (hover tooltip). Filter by rarity / materials.
- **Loot** — Steam boxes held, offline-reward gold, and a **"new items" timeline** (each entry timestamped in **both
  your local time and UTC**) with **Legendary+ rare-item alerts** (optional, opt-in silent desktop notification).
  New gear is shown whether it dropped or was crafted/synthesized in the Cube — the game records no origin, so the
  tool honestly doesn't guess which.
- **Runes** — the 197-node rune tree with real names/effects, leveled status, and cheapest-next-upgrade recommendations.
- **Lifetime** — total kills, gold earned, max stage (as "Act X-Y"), owned-by-rarity, and a calibrated
  **kills-by-monster** breakdown (the per-monster counts sum exactly to total kills). Only counters whose meaning is
  calibrated are shown — uncalibrated save aggregates are omitted rather than guessed (so nothing claims progress your
  save doesn't support).
- **Trends** — gold/kills/stage progression and gold-per-hour over time, charted from the game's own rolling save backups.
- **Codex** — a browsable, virtualized grid of the game's **entire catalog** (5,944 items + 197 runes + 36 skills),
  independent of ownership (owned marked ✓). Filter by type / rarity / gear type, search by name or ID, sort, owned-only.
  Click any entry for full detail: description, inherent stats + unique mod, material socket effects, rune per-level
  table, **what a stage box can contain**, **where an item drops from**, and marketable/Steam flags.
- **Tips** — **personalized suggestions** built live from your save (unspent ability points, empty gear slots, the
  cheapest rune upgrade you can afford, a nearly-full stash, bench heroes falling behind, farming stagnation) plus
  **game tips** worth knowing. Every suggestion is calibrated from your save; it never invents "do X for +Y" numbers
  that would require reading the running game (which it doesn't).

Every label (item names, rarity, stats, skills, runes, monsters, drop sources, level curve) is **calibrated from the
game's own data tables** — nothing is guessed; if something can't be resolved authoritatively it shows an honest fallback.

The UI is **fully responsive** — it works on phone, tablet, and desktop (no horizontal scrolling; wide tables scroll in place).

## Two ways to use it

### 1. Browser (no install) — Chrome / Edge
**Live:** **https://revenantcabal-rgb.github.io/taskbarheroburat/** (GitHub Pages, HTTPS). Then either:
- **Connect folder** (recommended) → pick `%USERPROFILE%\AppData\LocalLow\TesseractStudio\TaskbarHero\`.
  This reads your live save **plus** the rolling backups and `Player.log`, so you get History/Trends and the loot
  timeline. It updates live as you play.
- **Connect file** → pick just `SaveFile_Live.es3` (everything except Trends).

The connect screen walks you through it step-by-step (with a one-click button to copy the exact folder path), and a
**Disconnect / Change folder** button in the header lets you clear the loaded save and switch to a different one at any time.

No save handy? Click **Preview sample** for a demo, or **Browse the full item catalog** to explore the Codex with no save.
(`?demo` and `?codex` also work as URL shortcuts.) The repo is also **Vercel-ready** (`vercel.json` + `index.html`) — import
it at vercel.com for a one-click second deployment.

### 2. Desktop app / installer (Windows)
Download the latest **`TBH-HUD-Setup-<version>.exe`** from the
[Releases page](https://github.com/revenantcabal-rgb/taskbarheroburat/releases) and run it. It auto-finds the save,
watches it (+ backups + log), updates live, and **auto-updates itself** from future GitHub releases — when a new
release is published it downloads in the background and shows an **"Update ready — Restart to update"** banner (and
applies it on next quit even if you don't click). The installer is the standard wizard: it makes Start-Menu / desktop
shortcuts and **registers in Windows "Add or remove programs," so you can uninstall it cleanly any time.**

## FAQ

**Can other people use it too, or just me?** Anyone can. It's just a web page (or a small desktop app) that reads
*your* save on *your* own device — there's **no account, no sign-in, and no server** that stores anything. You and a
friend can each open the same link and connect your own saves completely independently; neither of you can see the
other's data. (Hosting it on GitHub Pages or Vercel only decides *where the page lives* — end users never "log in" to
anything.)

**Does the installer come with an uninstaller?** Yes. It shows up in Windows **Settings → Apps → "Add or remove
programs"** as *TBH HUD* — click **Uninstall** like any other app. (It installs per-user and never touches the game.)

**It says "this folder contains system files" and won't let me pick the folder.** That's your *browser* blocking the
folder for safety (Chrome/Edge restrict `AppData`), not a bug. Any of these works instead: (1) click **Connect file**
and pick just `SaveFile_Live.es3`; (2) **drag-and-drop** your `SaveFile_Live.es3` anywhere onto the page (this always
works); or (3) use the **desktop app**, which reads the folder directly with no browser restrictions. The connect
screen has a **"Trouble connecting?"** helper with these steps.

**It boots me back to the connect screen when I refresh.** Fixed — the browser version now remembers your folder and
re-attaches on reload (it'll either reconnect automatically or show a one-click **Reconnect** button). Use
**Disconnect** if you want to forget it.

**Where's the DPS counter — who in my party deals the most damage?** There isn't a live DPS meter, on purpose:
measuring real-time damage would mean reading the running game's memory, which this tool never does (it would risk a
CodeStage anti-cheat ban). The honest stand-in is the **"Who's carrying"** ranking on the Overview (by equipped gear
power) — and the **Flex card** gives you shareable bragging rights (furthest stage, top hero, best gear, kills,
lifetime gold) with a one-click **Copy to share with friends**.

**Will it auto-update when you ship changes?** Yes, two ways: the **browser version is always current** (it's served
from the host, so a refresh gets the latest), and the **desktop app auto-updates** — on launch it checks GitHub
releases, downloads any newer version in the background, and offers a one-click **Restart to update** (or applies it on
next quit). Publishing a new release is all it takes to push an update to everyone.

## Develop & test locally
Requires [Node.js](https://nodejs.org) (LTS) and (to rebuild the game DB) Python + UnityPy + Pillow.
```
npm install
npm start            # launches the desktop app pointed at your live save
node scripts/verify_save.js   # read-only: decrypt+parse the live save, print a calibrated snapshot
```
The calibrated game DB (`src/engine/gamedata.min.json`) is rebuilt from the game's own tables by
`python scripts/build_gamedata.py`. See `CLAUDE.md`, `docs/PRD.md`, and `docs/PROGRESS.md` for the full design,
roadmap, and current status.

## Build the installer
```
npm run dist
```
Produces `dist\TBH-HUD-Setup-<version>.exe`. Hand that file to your friends.

> The installer is **not code-signed**, so Windows SmartScreen shows a blue warning the first time.
> Click **More info -> Run anyway**. (Code-signing requires a paid certificate; can be added later.)

## Safety
Read-only by design: never writes to the game, never injects code, never modifies files or saves. The game uses
CodeStage anti-cheat — reading files on disk is safe; this tool never touches the running game process. Your save is
decrypted and read locally — nothing is uploaded anywhere.
