# TBH HUD

A **read-only** companion dashboard for the Steam game *TBH: Task Bar Hero*. It decrypts your local save
and shows gold, party (by class), inventory by rarity, trophies, a live loot log with timestamps,
gold/hr, and lifetime stats. It **never writes to or modifies the game** — it only reads your save file.

Unofficial fan tool. Not affiliated with Tesseract Studio / Nugem Studio.

## Two ways to use it

### 1. Browser (no install)
Open `dashboard.html` in **Chrome or Edge**, click **Connect save**, and pick:
`%USERPROFILE%\AppData\LocalLow\TesseractStudio\TaskbarHero\SaveFile_Live.es3`
It updates live every few seconds while you play. (Hosting it on GitHub Pages gives your friends a link — nothing to install.)

### 2. Desktop app / installer (Windows)
A one-click `Setup.exe` your friends just run. It auto-finds the save, watches it, and updates live.

## Develop & test locally
Requires [Node.js](https://nodejs.org) (LTS).
```
npm install
npm start
```
This launches the desktop app pointed at your live save.

## Build the installer
```
npm run dist
```
Produces `dist\TBH-HUD-Setup-<version>.exe`. Hand that file to your friends.

> The installer is **not code-signed**, so Windows SmartScreen shows a blue warning the first time.
> Click **More info -> Run anyway**. (Code-signing requires a paid certificate; can be added later.)

## Safety
Read-only by design: never writes to the game, never injects code, never modifies files or saves.
Your save is decrypted and read locally — nothing is uploaded anywhere.
