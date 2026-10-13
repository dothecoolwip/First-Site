# BUHURT: Steel & Tape — "The Realm" plan
> Release update, 13 Oct 2026: Patch 4.3 promotes private playtest version 52 (`572b8904a0138ad66ca1bbde0d831b34190a5163`, build `steel-tape-auth-56e90ed91fab`) with Google-return/cloud-save recovery, saved-team preservation, current world/appearance fixes, and local renderer/font assets for offline startup. Existing combat difficulty milestones remain. Desktop and phone startup checks passed with no page or game-loop errors; earlier auth verification used mocked accounts. Real Android Google return remains for device validation. Release notes go to BuhurtOS's Steel & Tape category #patch-notes and Red Deer Reavers #buhurt-steel-and-tape.
> **Status, 11 Oct 2026: all eight steps shipped** (Patch 3.0 to 3.5, live at buhurt-steel-and-tape.vercel.app, notes posted to Discord).
> Differences from the plan: no thrust direction (it would break online play's move encoding), so directions are left / right / overhead; the driftwood club is a hand item, not a weapon skin; the smugglers' tunnel is a grate you peek through rather than a walkable tunnel; win rates of about 60 / 45 / 35% are what the AI tiers aim for, but they haven't been measured with real players; the three Drive packs (HighLands buildings, Modular Weapons and Dungeon, Fantasy Ambient) still need trimmed re-uploads.


Written 11 Oct 2026. Covers: inventory, reagents spread out, no teleporting, a map 10× bigger with planned districts, tiered vendors and tiered access (fairground → outer bailey → king's court), hidden areas with free cosmetics, much better fighting, BuhurtOS teams and fighters with glows, arenas on the map that show real fights, six arenas you can watch as a spectator, and the new packs.

Difficulty brief from the owner: "a mediocre challenge" — not easy, not a grind wall.

---

## 0. Ground rules and budget

- **Size.** The game is 12.3 MB today; the Claude artifact copy caps at 16 MB, the website doesn't. The realm will not fit in 16 MB. So: split into `index.html` (engine, UI, fight, 1 district's worth of models, ~11 MB) plus `realm-*.bin` chunk files fetched on demand per district and cached by the service worker. The artifact keeps a "fairground only" build. This is phase 1 work and everything else depends on it.
- **No agents.** Built directly, in the same file layout (`src/js/NN_name.js`), tested with the Playwright suite (desktop + phone), shipped to Vercel, patch note to Discord after each phase.
- **Nothing fantasy as gameplay.** Costumes, cosmetic weapon looks, Halloween decoration: yes. Monsters, magic, dragons: no.
- **Packs used** (all stored in `/home/claude/assets/group1` and `group2`): Fantasy Props MegaKit, Ultimate RPG Items, Nature Crops, Farm Buildings, Ultimate Animated Animals, Posed Background Characters, Universal Base Characters, UAL v3 + UAL2, KayKit Forest Nature, KayKit Adventurers, Kenney Retro Medieval, Kenney Impact Sounds + RPG Audio, Kevin Iglesias crafting animations (licence PDF to read first; not CC0). Three more packs sit on Google Drive (HighLands Fantasy Buildings, Modular Weapons and Dungeon, Fantasy Ambient Pack); see §8 for what they're for and how to get them in.

---

## 1. The realm: a map 10× bigger, properly planned

**Target:** an ellipse about 600 × 640 m (today 184 × 196 m; that's ~10× the area). Built from a hand-written district plan, not scattered randomly.

### Districts (north is the castle, as now)

| Area | Where | What's there | Who may enter |
|---|---|---|---|
| **Fairground** (the festival) | centre-south, where the town is now, enlarged | festival gate, market square, fountain, **the original list inside a wooden dome** (open-sided round pavilion with a thatched roof and stands), food stalls, tavern, bard, Tier‑1 vendors, wardrobe, club camp | everyone |
| **The village** | south-west | homes, your house, farm (Farm Buildings pack: barns, coop, silo), cornfield, pond, mill, **Peasants' arena** (a muddy roped list between the barns) | everyone |
| **The woods** | west and north-west, much deeper | marked trees, quarry moved deeper in, charcoal burners, hunter's lodge, **Forest arena** (a glade ringed by logs and torches) | everyone; some nodes need skill |
| **The lakeshore** | east | a lake with a sandy shore, fishing jetties (UAL2 fishing), boathouse, reeds, **Beach arena** (a sand list with driftwood fence) | everyone |
| **The outer bailey** | north, inside the first curtain wall | armourer's hall, master smith, guild hall, training yard with pells and archery, stables, chapel, Tier‑2 vendors, **Castle arena** (a stone-flagged courtyard list with wooden stands) | **Bailey writ** (see §3) |
| **The inner ward / king's court** | inside the keep's wall | great hall, king's armourer, royal tailor, the Artificer's workshop moved here, treasury, Tier‑3 vendors, **Great Hall arena** (indoor, torch-lit, banners, the king on his dais) | **Royal writ** |
| **Hidden areas** (6) | tucked in all of the above | see §5 | found, not gated |

### Getting around without teleporting
- **Map "Go" is removed.** The map still shows everything; tapping a marker drops a waypoint and a trail of markers on the ground leads you there.
- **Roads and signposts** between districts, lamp posts at night.
- **Horses.** Ultimate Animated Animals has a horse: rent one at the fairground stables ($) or own one (Land agent). Riding is 2.5× walking speed. No fast travel, ever.
- **Sprint stamina** in town so running isn't free (small, refills in a few seconds).
- Walking speed itself goes up a little (3.2 m/s) and the camera pulls back on the open road.
- Autowalk to a waypoint on touch (hold the waypoint button): the avatar jogs the road itself. That's still walking, not teleporting.

### Reagents spread out
- Each district has its own tier of nodes: copper/ash/herbs near the fairground; iron, coal, oak, flax, hides in the village and woods; silver, hickory, crystal deep in the woods and on the far lakeshore cliffs; gold and the best crystal only in the bailey's mine shaft and a hidden cave.
- Roughly 90 nodes across the realm (today 35), never two of the same kind within 40 m, so a run for materials is a trip.
- Respawn 2–6 minutes depending on tier.

### Files
- New `14i_realm.js` (district plan, roads, signposts, waypoints), `14j_mounts.js`, chunked model loading in `build.py` + `sw.js`. Festival code moves into the fairground district. Node sites move to a per-district table.

---

## 2. Inventory

One **Inventory** screen (Your fighter → Inventory, and the backpack button in the town HUD) replacing the satchel:
- **Bag** with slots (30, upgradeable to 50 at the Land agent): materials stack to 99, consumables (potions, drinks, tape rolls) stack, tools and horse tack sit in equipment slots.
- **Equipment** panel: weapon skin, outfit, hat, cape, hand item, pet, pickaxe/axe/sickle, horse.
- **Loot**: hidden areas and tourney wins drop items into the bag (cosmetics, materials, "writ" documents).
- Use / equip / drop from the slot; a full bag stops gathering with a clear message.
- Multiplayer: other players see your equipped stuff (already carried in presence).
- File: `11j_inventory.js`; `tradeState().inv` becomes the bag's material stacks so nothing breaks.

---

## 3. Tiers: vendors and access

Gates use **renown level** plus one deed each, so a decent player earns it rather than grinds it ("mediocre challenge"):

| Tier | Area | Needs | Vendors sell |
|---|---|---|---|
| 1 | Fairground + village + woods + lakeshore | nothing | weapon/armour quality to tier 2, kit upgrades to 5, common and rare skins, peasant outfits, basic tools, copper/iron recipes |
| 2 | Outer bailey | **level 15** + beat the **gate sergeant** in a duel (a fair, fixed-difficulty 1v1) → Bailey writ | quality to tier 4, kit to 8, epic skins, ranger outfits, steel tools, silver recipes, the mine shaft |
| 3 | Inner ward | **level 40** + win a **Castle arena 5v5** against the king's guard (bots a notch above you) → Royal writ | tier 5 Legendary quality, kit to 10, legendary skins, noble outfits, gold recipes, royal cosmetics |

- The writs are items in the bag; losing the duel just means walking back later. Guards at each gate explain what you need.
- Tier‑1 vendors keep selling the low tiers so new players still have things to buy. Prices in tier 3 are higher; the trades route gets more attractive.
- Online players of any tier can still be seen through the gates (no splitting the server by area).

---

## 4. Arenas and spectating

Six arenas, all on the map, each with its own bout rotation and crowd:
1. **The Dome** (original list, inside a wooden dome at the fairground)
2. **Peasants' arena** (village, mud, hay bales, pigs watching)
3. **Forest arena** (glade, log fence, torches, Forest Nature pack)
4. **Beach arena** (lakeshore sand, driftwood)
5. **Castle arena** (bailey courtyard, stone, stands)
6. **Great Hall** (inside the keep, indoor)

- Every arena is a **venue** you can also fight in (venue picker gets them; the mode you start picks a sensible one; the Rumble final is in the Great Hall).
- **Spectating:** walk up to any arena and sit in the stands or stand at the rope. A spectator camera (orbit, follow a fighter, broadcast angles), a scoreboard, crowd noise from Kenney audio, cheering when a fighter goes down. Leave by walking away or pressing Back.
- Only **one arena simulates at full rate** (the one you're near); the others tick cheaply so there's always a result on the board when you arrive.
- Posed Background Characters fill the stands cheaply (static), UAL spectators in the front rows.

---

## 5. Hidden areas with free cosmetics

Six, each with a small puzzle or just good hiding, each giving one free cosmetic (and a little loot) once:
1. **The hermit's cave** behind the quarry waterfall → "Hermit's hood" + gold ore.
2. **The old chapel crypt** under the bailey chapel (lever behind the altar) → ghostly "Crypt knight" helm skin.
3. **The treetop lookout** reachable by a hidden ladder in the woods → "Ranger's cloak".
4. **The sunken boat** at the far end of the lake (walk the sandbar at the right spot) → "Driftwood club" weapon skin.
5. **The king's wine cellar** (through the kitchen in the inner ward) → "Royal goblet" hand item + "Courtier's doublet".
6. **The smugglers' tunnel** from the village mill to the bailey wall → lets you peek into the bailey early and gives "Smuggler's mask".
Found spots show on the map afterwards. Nothing in them affects fighting.

---

## 6. Fighting 2.0 (significantly improved mechanics)

Keeps the buhurt rules (down = out, cards, rounds) and the first/third-person control scheme, adds:
- **Directional attacks**: swing from the side you move the stick (left/right/overhead/thrust); the AI reads and blocks directions, so mixing them up matters.
- **Timed parry and shield bash**: guard pressed in the last 150 ms before a hit is a parry (attacker staggers, you get a free step); shield + shove = bash that opens a guard.
- **Feints**: tap-release swing to feint; AI commits to blocks on feints at low difficulty, less at high.
- **Weight and momentum**: hits from a running fighter carry more; heavy weapons wind up longer but push harder; being hit while swinging interrupts the swing (hit stun) unless you're braced.
- **Balance meter** visible under the stamina bar; trips and hooks work against balance, not random chance.
- **Grapple chains**: clinch → hip throw / hook / drag to the rope; counters by timing.
- **Team play**: proper pair pressure (two on one), shield-wall order, AI that peels a teammate who's doubled.
- **Hit feedback**: hit stop, armour sparks already there; add helmet-ring blur, controller rumble patterns per zone, and marshal calls for clean hits.
- **AI tiers** by area: fairground bots are forgiving, bailey bots parry and feint, the king's guard mixes everything. The "mediocre challenge" target: a new player wins about 60% at the fairground, 45% in the bailey, 35% in the inner ward until their kit and skills catch up.
- Files: `06_fighter.js`, `08_ai.js`, `09_input.js`, `10c_feel.js`; a new `08b_tactics.js` for team AI.

---

## 7. BuhurtOS: real teams and fighters

The BuhurtOS database has **21 teams** and **219 fighters** (`teams`, `fighters`, `fighter_accounts` links fighters to logins) plus live fight state (`lyst_field_current`, `match_live_scores`, `matches`).
- **Import**: a small public edge function `steeltape-roster` returns teams (name, colours, crest initial) and fighters (display name, team, category) with no private fields. The game caches it for a day and falls back to the built-in clubs offline.
- **Bots named after real fighters**: BuhurtOS fighters fill rosters first, sorted so a club's own fighters are on that club. Any gaps use a **200-name pool** (100 first names × 100 surnames, Canadian/prairie flavour) picked randomly, never repeating within a match.
- **Glow**: a fighter whose name comes from BuhurtOS gets a **soft rim glow** in their club colour (tabard edge light, name tag badge). When the **real person is online in the game and in this match** (their BuhurtOS login matches `fighter_accounts`), they get the **big glow**: bright rim, floating banner over the helm with their name and team crest, a crowd roar when they take someone down.
- **Real fights on the map**: when `lyst_field_current` has an open match at a live event, the matching arena on the map shows a "LIVE" flag; walk in and the bout is a **mirror of the real fight**: the real names and teams, bots acting it out, and the score/phase from `match_live_scores` driving round ends. Results post to the arena board when `matches` finalises.
- Privacy: display names and team names only; nothing from private tables; fighters who opted out of the card game (`cards.game_use`) are skipped.

---

## 8. New packs: what goes where

| Pack | Used for |
|---|---|
| Fantasy Props MegaKit | market stalls, anvils, workbench, whetstone, banners, torches, chests, dummy, tavern tables, great hall furniture |
| Ultimate RPG Items | treasury, king's court props, hidden-area loot props, more weapon skins (sword/axe/hammer/shield variants as cosmetics) |
| Nature Crops | fields around the village, lakeshore reeds, forage nodes (wheat, berries, flowers, mushrooms) |
| Farm Buildings | the village farm (barns, coop, silo, fences, water tower → well) |
| Ultimate Animated Animals | horses (mounts), cows, sheep, pigs, dogs around the farm; a stag in the deep woods |
| Posed Background Characters | cheap arena crowds and market loiterers |
| Universal Base Characters | hairstyles, beards, eyebrows for your avatar and NPCs (wardrobe: free) |
| UAL v3 + UAL2 | mount/dismount, fishing, farming, cheering, clapping, sitting, new combat clips for Fighting 2.0 |
| KayKit Forest Nature | the deep woods and forest arena |
| KayKit Adventurers | weapons/shields as cosmetic skins (bone-renamed to our rig); characters not used |
| Kenney Retro Medieval | distant background: outer farmsteads, a ruined tower by the lake |
| Kenney Impact + RPG audio | hits, armour, coins, footsteps, crowd |
| Kevin Iglesias crafting | mining/hammering/farming clips **only if the licence PDF allows embedding** |
| **HighLands Fantasy Buildings** (Drive, 788 MB) | village houses, bailey halls, the chapel, the king's keep interior; the ruined tower by the lake. **Needs a trimmed re-upload**: model folder (FBX/glTF) + one base-colour texture per building + licence |
| **Modular Weapons and Dungeon** (Drive, .unitypackage, 612 MB) | modular sword/axe/mace parts as weapon skins at the Artificer; dungeon pieces for the chapel crypt, smugglers' tunnel and wine cellar. **Needs the FBX folder dug out of the package and re-uploaded** (a .unitypackage is a gzip tar) |
| **Fantasy Ambient Pack** (Drive, 1.57 GB) | ambience: lakeshore, deep woods, great hall, crypt. If it's audio: pick ~12 loops, re-encode to mono OGG (~0.5 MB each). If it's 3D with 4K PBR textures: only the meshes, baked to vertex colour. **Needs a trimmed re-upload** |

The three Drive packs can't be pulled in from here (the Drive connection hands files over inline and the workspace can't download from Google), so each needs a small re-zip from a computer: models + one colour texture each + licence, uploaded to the chat. They slot into step 2 (buildings), step 4/5 (dungeon pieces for arenas and hidden areas) and step 8 (ambience) when they arrive; nothing waits on them.

---

## 9. Order of work (each step ships and gets a patch note)

1. **Realm foundation**: chunked loading, the 600 m map with all districts laid out (greyboxed), roads, signposts, waypoints, no teleport, horses, nodes spread. (biggest step)
2. **Districts dressed**: village, woods, lakeshore, bailey, inner ward with the new packs; crowds; animals.
3. **Tiers and writs**: gates, guards, gate duel and castle 5v5, tiered vendors, Tier‑3 goods.
4. **Arenas and spectating**: six venues, bout rotation per arena, spectator camera and stands.
5. **Inventory and hidden areas**: bag, equipment, loot, six hidden spots.
6. **Fighting 2.0**: directional attacks, parry, feints, momentum, balance, grapple chains, team AI, AI tiers, difficulty pass.
7. **BuhurtOS**: roster import, name pool, glows, live fight mirroring, arena boards.
8. **Polish**: phone performance pass (low-detail mode per district), controller, accessibility, achievements for all of the above, credits.

Tests: a Playwright spec per step (realm navigation, gates, arenas, inventory, fight mechanics, roster import with a fake BuhurtOS response). Full suite before every ship.
