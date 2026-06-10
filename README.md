# TBH HUD

A **read-only** companion dashboard for the Steam game *TBH: Task Bar Hero*. It decrypts your local save
(and reads the game's `Player.log` + rolling backups) entirely on your machine and presents a premium dashboard.
It **never writes to, modifies, or injects into the game** — it only reads files on disk.

Unofficial fan tool. Not affiliated with Tesseract Studio / Nugem Studio.

## What it shows (11 tabs)
- **Overview** — gold, current & max stage (shown as **"Act X-Y" + the real stage name**, never a raw key), total
  kills, runes, session gold/hr & kills/hr, your **best measured farming stage** (from your own save history), an
  **offline-rewards card** (live idle timer + last collection rate + cap
  learned from your own logs), deployed party, active pet, a plain-language **"who's carrying"** gear-strength ranking
  (labeled bar + tooltips, no jargon), and your best trophies.
- **Party** — every hero with level, **real XP-to-next-level progress** (calibrated from the game's level curve),
  a **"time to next level"** estimate (XP remaining ÷ the XP/hour you're *actually* gaining this session — your real
  pace, never a guessed number), equipped gear (hover for stats), equipped skill names, and a **full "who's carrying"
  source breakdown**: each deployed
  hero's stats attributed to Base / Gear / Tree **plus a summed Total row**, and account-wide runes & pet.
- **Inventory** — every owned item with its real name, rarity (color-framed), real icon, level, enchants, **inherent
  gear stats and unique-mod effects** (hover tooltip). Filter by rarity / materials.
- **Loot** — Steam boxes held, offline-reward gold, and a **"new items" timeline** (each entry timestamped in **both
  your local time and UTC**) with **Legendary+ rare-item alerts** (optional, opt-in silent desktop notification).
  New gear is shown whether it dropped or was crafted/synthesized in the Cube — the game records no origin, so the
  tool honestly doesn't guess which.
- **Runes** — the 197-node rune tree with real names/effects, leveled status, and cheapest-next-upgrade recommendations.
- **Advisor** — provable, save-derived build advice. **Gear upgrades you already own:** for every equipped item it
  finds an *unequipped* item of the *same gear type* that is strictly better (higher rarity, or same rarity at a higher
  level) — sidegrades and judgement calls are never suggested. **Rune plan:** a cheapest-first upgrade path priced from
  the game's own per-level cost tables against your current gold (plus a "save for" target). **Open enchant slots:**
  every equipped item on your deployed party with free enchant headroom (it shows the slots, never predicts RNG outcomes).
- **Lifetime** — total kills, gold earned, max stage (as "Act X-Y"), a **gold-by-source split** (sum-validated:
  *from combat* vs *other — offline, Cube, misc*), owned-by-rarity, a calibrated **kills-by-monster** breakdown
  with each monster's **base gold/XP per kill** (the per-monster counts sum exactly to total kills), and your
  **best farming stage — measured** from your own save history (see Trends below). Only counters
  whose meaning is calibrated are shown — uncalibrated save aggregates are omitted rather than guessed.
- **Trends** — gold/kills/stage progression and gold-per-hour over time — **and a per-stage farming ranking**
  (real gold/hr & kills/hr for each stage you've farmed). Sources: the game's rolling save backups **plus the HUD's
  own snapshot history** — it records a tiny snapshot on every save change (locally, in your browser/app), so your
  history keeps growing past the game's ~6 rolling backups. Per-stage rates use the save's calibrated *combat-gold*
  counter over single-stage intervals, so offline gold is excluded by construction and nothing is guessed.
- **Codex** — a browsable, virtualized grid of the game's **entire catalog** (5,944 items + 197 runes + 36 skills),
  independent of ownership (owned marked ✓). Filter by type / rarity / gear type, search by name or ID, sort, owned-only.
  Click any entry for full detail: description, inherent stats + unique mod, material socket effects, rune per-level
  table, **what a stage box can contain**, **where an item drops from**, and marketable/Steam flags.
- **Crew** — an **optional, opt-in private leaderboard** for you and your friends. Agree on any shared **crew code**
  (like a private room name), pick a display name, and everyone who opts in sees one live board: rank by max stage /
  lifetime gold / kills / top hero / runes, each member's latest brag-stats, their **latest achievement** (derived from
  their own snapshots — new max stage, new Legendary+, a hero level-up, a rune milestone), and your gap to them.
  **Off by default; nothing is uploaded unless you flip "Share my progress" ON — and even then only the small
  brag-stats payload shown on the tab, never your save file.** See the FAQ below.
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
**⬇ [Download TBH-HUD-Setup-1.0.6.exe](https://github.com/revenantcabal-rgb/taskbarheroburat/releases/download/v1.0.6/TBH-HUD-Setup-1.0.6.exe)** (direct, ~79 MB) — or grab whatever's newest from the
**[latest release](https://github.com/revenantcabal-rgb/taskbarheroburat/releases/latest)** ([all releases](https://github.com/revenantcabal-rgb/taskbarheroburat/releases)) — then run it. It auto-finds the save,
watches it (+ backups + log), updates live, and **auto-updates itself** from future GitHub releases — when a new
release is published it downloads in the background and shows an **"Update ready — Restart to update"** banner (and
applies it on next quit even if you don't click). The installer is the standard wizard: it makes Start-Menu / desktop
shortcuts and **registers in Windows "Add or remove programs," so you can uninstall it cleanly any time.**

## FAQ

**Can other people use it too, or just me?** Anyone can. It's just a web page (or a small desktop app) that reads
*your* save on *your* own device — there's **no account, no sign-in, and no server** that stores anything. You and a
friend can each open the same link and connect your own saves completely independently; neither of you can see the
other's data. (Hosting it on GitHub Pages or Vercel only decides *where the page lives* — end users never "log in" to
anything.) The one **opt-in** exception is the Crew leaderboard below.

**How do I set up a Crew leaderboard with my friends?** Open the **Crew** tab. (1) Agree on any shared **crew code**
— e.g. `dads-of-tbh` (3–32 letters/numbers/dashes; treat it like a private room name, anyone who knows it can join).
(2) Each friend enters the same code + their own display name and clicks **Join crew**. (3) Flip **"Share my
progress" ON** to appear on the board — it updates as you play and refreshes every ~30 seconds. The **📋 Copy invite
code** button makes inviting easy. You can watch a board without sharing; sharing is per-device and instant to turn off.

**What exactly does the Crew feature upload?** Only if you opt in, and only these brag-stats: display name, max stage,
lifetime gold, total kills, gold balance, your top-3 hero levels, runes leveled, Legendary+ count, and play hours.
**Never your save file, never your items, never anything else.** With sharing OFF (the default), nothing is uploaded
at all — exactly as before. The board lives behind your crew code on a small serverless API (Vercel + Neon Postgres).

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

**Will it auto-update when you ship changes?** The **browser version is always current** (it's served from the host,
so a refresh gets the latest). The **desktop app auto-updates from v1.0.6 onward**: it checks GitHub releases on
launch **and every few hours while running**, downloads any newer version in the background, and offers a one-click
**Restart to update** (or applies it on next quit even if you don't click). There's also a **"↻ Check for updates"**
button in the app header — it tells you "checking… / downloading / you're on the latest / couldn't reach GitHub" so
you always know where you stand.

> ⚠️ **If you installed v1.0.5 or older:** those builds shipped with a packaging bug that silently disabled the
> updater (the update module wasn't bundled), so they will never offer an update on their own. **Reinstall once**
> from the download link above — settings and history are kept, and from v1.0.6 on updates really are automatic.

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
decrypted and read locally — nothing is uploaded anywhere, unless you explicitly opt in to the Crew leaderboard
(which then shares only the small brag-stats listed in the FAQ, never the save).
