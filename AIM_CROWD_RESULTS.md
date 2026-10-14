# Aiming, fullscreen and town crowd repairs

Implemented in canonical `First-Site-live-merge/steeltape/src`; rebuilt local version **steel-tape-21654451b7**. No deployment or publication performed. Existing unrelated working-tree changes were retained.

## Confirmed causes and changes

- Target-lock pitch correction damped FP.pitch toward a torso preset after input paused. Touch and mouse lacked the controller's temporary pitchHold; controller pitch also reset after expiry. Removed that correction entirely. Vertical aim remains player-owned, while FP/TP smoothing, posture, breathing and deliberate round initialization remain separate. Removed the controller yaw clamp that could overwrite look input. D-pad vertical aim now marks manual look activity.
- Added Controls → Aim assist strength, 0–100%, percentage and explanation. The Target lock switch still gates assistance; sensitivity stays separate. Horizontal tracking uses exponential time-based damping and angular speed caps. Local-player action-start auto-facing also respects strength and manual input. At 0%, automatic look/facing pull is disabled; explicit grappling movement remains gameplay behavior.
- Persisted `assistStrength` (0–1) in existing settings3. Legacy enabled assistance migrates to 100%, disabled to 0%; new settings default to 50%. Numeric values clamp safely and malformed values fall back. No player-save format or authentication changes.
- Touch beginFight called fullscreen automatically; FS.tried limited it to once per document, rather than eliminating automatic entry. Removed the automatic call. The Controls button explicitly enters/exits fullscreen, follows browser state, and preserves active fullscreen through internal transitions. Browser exits do not cause re-entry. The Android notice may still appear after explicit entry because it is browser UI.
- Vendor tents used approximate circles; arena benches lacked footprints; SAT rectangles rotated opposite to THREE. Added transformed asset-bound footprints, open tent entrances, furnishings, bench rows and shared player/civilian collision. Added a spatial broad phase and corrected the rotation convention.
- Civilians now follow clearance-checked waypoint routes, checked movement substeps and bounded recovery/replanning. Unreachable goals release reservations. Search advances in shared 128-visit slices with rotating fairness. Seated spectators choose a clear aisle and use valid walking routes. Bench rows are 2.2 m apart, leaving a 1.0 m gap for NPCs and the player. Return seats avoid circular prop obstacles.
- Busy-festival populations target 28 mobile and 48 desktop roamers, with varied existing outfits, visitors, walkers, fans and activities across districts. Spawn/browse positions reserve interaction space. Distance culling, staggered distant simulation, spatial separation and 44/80 ambient render/animation budgets limit work. Sustained slow frames reduce roaming limits toward 12/20; healthy frames restore density with hysteresis. HACSA bot filtering is unchanged; ambient civilians are separate.

## Validation

- build.py: passed, including bundled JavaScript syntax checking. ESLint: passed.
- Expanded desktop/phone/controller run: **16 passed**, covering touch/mouse release, FP/TP input-mode matrices at 0/50/100% and 30/60/120 FPS, action-start manual priority, settings migration/persistence, explicit fullscreen/browser exit, crowd routes/recovery/limits, standard and EasySMX controller integration, shared collision and Barber scroll retention.
- After the final player-aisle geometry adjustment: **6 passed** on the exact final build, covering slider persistence/layout (phone landscape and portrait), three-minute seeded crowd/seat simulation, player aisle access and world collision/physics.
- Authentication/HACSA unit checks: **15 passed**, including persisted-session/save restoration, OAuth failure recovery, eligibility and test-group exclusions. Earlier broader menu checks also passed for Barber colours/body persistence, portrait, Help, Profile editor and town launch navigation.
- Desktop and phone-portrait settings screenshots inspected. Reports: `steeltape/test/results-aim-crowd-verified-report.json` and `results-aim-crowd-final-clearance-report.json`.
- Regression expansion exposed obstructed seat aisles and delayed adaptive-density recovery; both were corrected before the passing runs.

Final crowd simulations use seed 20261013 and advance 180 simulated seconds. Rendering is disabled for simulation assertions, so these timings are **not** device FPS measurements.

| Project | Roaming civilians | Roaming samples | Seat walking samples | Civilian penetrations | Seat penetrations | Moved >2 m | Player aisle |
|---|---:|---:|---:|---:|---:|---:|---|
| desktop | 48 | 38918 | 13129 | 0 | 0 | 43 | clear |
| phone | 28 | 17509 | 8368 | 0 | 0 | 26 | clear |

## Remaining device acceptance

Physical Android Chrome was unavailable (no ADB tool on this host). Phone projects use Chromium emulation and mocked fullscreen state; they cannot confirm browser-owned notice rendering or physical phone frame rates. Live authentication/player-save services were not exercised. Validate head aim release, explicit fullscreen entry/exit across several fights, and multi-minute crowded-town frame times on physical Android in landscape/portrait and a normal desktop renderer. Keep existing browser storage for save-persistence checks.

The current published private/public sites have not received this local repair.

Source and bundled game.js match exactly. SHA-256: `86e1f2930d1e9c30a584e8c2845c348933495af57cdb97ee4b4f139ccb971bd9`.
