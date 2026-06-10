Pick up TBH HUD — a READ-ONLY companion for the Steam game "TBH: Task Bar Hero". Work autonomously 2–3h, no stopping; don't ask unless truly blocked. Commit + push continuously; keep local = remote.

ORIENT: Repo root D:\Task Bar Hero - Github MOD\Task Bar Hero Github (TBH-Github). READ CLAUDE.md + docs/PRD.md in full, skim git log. GitHub revenantcabal-rgb/taskbarheroburat (authed). Live save %USERPROFILE%\AppData\LocalLow\TesseractStudio\TaskbarHero\SaveFile_Live.es3. Game tables dumped in scripts/_gamedata_raw/*.txt; en-US in src/engine/localization.min.json; DB src/engine/gamedata.min.json (rebuild via scripts/build_gamedata.py). Preview: server root = repo, http://127.0.0.1:8778/dashboard.html (?demo). Engine check: node scripts/verify_save.js. Refresh test/ (gitignored) from the live folder for headless checks.

GOLDEN RULE (non-negotiable): an additional helper, never game-breaking. Read-only always — never write/inject game/save/memory ([ACTk] CodeStage anti-cheat). NO fabricated data — every label calibrated from the game's own tables/localization; honest fallback or omit otherwise. Verify EVERY change vs the LIVE save (Node + headless browser, all 7 tabs, 0 console errors). QoL only.

MISSION — do BOTH, alternate so the app stays shippable:

#2 FULL "WHO'S CARRYING" SOURCE BREAKDOWN (save-only, no ban risk). Per deployed hero, split power by source and show each contribution:
- Base: HeroInfoData (per HeroKey: AttackDamage/AttackSpeed/CastSpeed/CriticalChance/CriticalDamage/MaxHp/Armor/CooldownReduction/MovementSpeed + HeroName_/MainWeaponGearType).
- Tree: AttributeInfoData (AttributeKey,HeroKey,GroupKey,ATTRIBUTETYPE,Value,RequiredPoint,MaxLevel) JOINED to the save's attributeSaveDatas (per-hero levels) + unlockedAttributeGroupKeys; + PassiveSkillInfoData (PassiveSkillKey,SkillNameKey,STATTYPE,MODTYPE,Value).
- Gear: DB.gear inherent stats + item enchants (already built).
- Runes (DB.runes) + Pet: PetInfoData (PetKey→PetName_/effect) via save ArrangedPetKey.
Add hero/attribute/passive/pet maps to build_gamedata.py; rebuild; mirror in saveEngine.js + the inline engine. Render a per-hero breakdown (e.g. "Priest: base / gear / tree / runes / pet"). LABEL it gear/build-based power, NOT live DPS. NOTE: tables have NO hero XP/level curve → do NOT promise XP-to-next-level/ETA; the hero-card "xp bar" is a level/20 proxy → relabel honestly or drop it.

#3 LOOT & LIFETIME DEPTH (save+log only, safe):
- Rare-drop alerts: highlight Legendary+ in the loot timeline + optional opt-in desktop Notification (no sound by default).
- Active pet card: resolve save ArrangedPetKey → PetInfoData name+effect (parsed, unused).
- Decode more aggregateSaveDatas: Type 0 subkeys (10011, 10021-10023, 10031, 10041-10053, 20011-20091 = likely per-monster/per-item-category), Type 4/5/7 sub 0-4, Type 10/15. CALIBRATE each against a known delta before labeling; if meaning is unconfirmed, show an honest "counter #N", never a guess. Surface confirmed ones on Lifetime.

DO NOT BUILD (golden rule — leave a note, not a guess): live DPS/combat memory reading; per-act gold/hr (needs memory); Steam Market value (service throttled/empty this build); 12-min blue-chest timer (no 720s in DropCooldown); stage-box drop contents (ItemGroup names are Korean).

LOOP: pick next → implement (calibrated, read-only) → verify vs LIVE save (node scripts/verify_save.js + headless browser) → fix → commit → push → update CLAUDE.md + docs/PROGRESS.md + docs/CHANGELOG.md → repeat. Full regression every ~45min.

DONE = #2 + #3 shipped, every label calibrated + verified vs live save, provably read-only; no console errors vs live + demo across all tabs; all committed + pushed; PROGRESS.md + CHANGELOG.md + CLAUDE.md current; end summary (shipped, calibration evidence, coverage %, confidence 1–10, next step). Read-only. Never bannable. Never fabricate. Verify against the real game.
