# Living Medieval Realm — Codex and Claude expansion specification

Specification version: 1.0  
Prepared: 27 October 2026  
Status: Ready for goal activation. This document does not claim implementation has begun.  
Release boundary: PRIVATE BETA ONLY.

## 1. The outcome

Transform BUHURT: Steel & Tape's Open World RPG into a living medieval realm with a substantial, complete adventure. Build on the existing world, its combat identity, its characters and its established medieval appearance. Give exploration purpose through people, places, mysteries and decisions that connect.

The result should feel like a deliberate expansion: players can discover a compelling starting situation, meet people with motives, pursue several approaches, see consequences, finish a satisfying central story and return to a world that remembers their actions.

Imagination is encouraged. The magical secret can be ambitious and surprising, but ordinary medieval life should ground the experience. Avoid filling every location with unrelated spectacle or overwhelming effects.

This is an implementation contract for a future activated goal. Preparing or publishing this specification alone must not launch development, deploy anything or create an active goal.

## 2. Who does what

Codex leads creative direction: worldbuilding, story structure, character motives, dialogue, branching quest design, secrets, environmental storytelling, pacing and the overall player experience. Codex writes concrete creative material rather than providing only broad suggestions. Codex also integrates changes, evaluates technical choices, tests gameplay and resolves release evidence.

Claude Code leads most production coding: NPC behaviour, quest state, interactions, dialogue presentation, journal and map integration, persistence, activity systems and technical fixes. Claude challenges designs that would be confusing, brittle or too expensive, proposes practical alternatives and independently tests and reviews the result.

Both contribute throughout design, implementation, testing and fixes. Codex may code integration and focused corrections; Claude may improve creative ideas. The intended balance is Codex-led creative design and Claude-led implementation, not a token consultation followed by Codex writing everything.

Use the existing local Codex/Claude collaboration helper. Create a fresh task and explicit Claude session for this expansion. Read the helper documentation, retain structured task records and use the existing subscription authentication. Do not substitute Codex subagents for real Claude or silently switch to separately billed APIs.

The owner should never relay messages. Give Claude concrete assignments, receive implementation and criticism, evaluate them and send follow-ups automatically. Only one assistant writes the same shared checkout at a time; use isolated checkouts when appropriate and integrate deliberately.

Record actual contributions and actual executed tests. Do not promise equal time, line counts or artificial percentages.

## 3. Establish the real starting point

Before changing runtime, world data or hosted state:

- Read current project instructions and the most recent completion and release receipts.
- Capture actual current public and private serving identities, source authority, complete deployment artifact, saved world, publication, history, preferences, access roster, conflicts and active edits.
- Inspect existing quests, dialogue, NPCs, activities, journal, map, save codecs, combat, mounts and child/Fight Only paths.
- Reuse the established implementation where it fits. Explain any necessary replacement and migrate existing state safely.
- Inventory existing secrets and stories so this expansion complements them rather than duplicating or erasing them.
- Save a baseline with repeatable functional, visual and performance scenarios.

At drafting time, project records identify private Beta 0.2.10 and public Live 0.2.9. These are historical reference labels, not permission to assume future serving state. Fresh checks decide the actual baseline.

Public Git is not the authoritative private runtime. Do not upload private source, generated private packages, world history, credentials, diagnostic access or secret walkthroughs to the public repository.

## 4. Define a cohesive scope before coding

Codex proposes a creative treatment; Claude evaluates feasibility against the actual code. Produce a scope document containing:

- A named expansion, central conflict, themes and intended player experience.
- A compact relationship map and a route through existing locations.
- Main-story beats, branch points, consequences and endings.
- Exact essential content and explicit stretch ideas.
- An implementation map identifying existing systems to extend.
- A requirement-to-test matrix and a staged integration plan.
- An estimated runtime and population budget based on measurements.

Use the following minimum content floor. If inspection exposes a genuine incompatibility, document the evidence and a concrete equivalent; do not quietly shrink the scope.

| Essential content | Minimum completion condition |
| --- | --- |
| Central adventure | One complete storyline with at least 6 substantive playable stages across at least 3 existing areas |
| Player decisions | At least 2 consequential decisions and 2 distinct, coherent resolutions |
| Connected side adventures | At least 3 complete side adventures that enrich the central people, places or conflict |
| Memorable characters | At least 6 named, differentiated characters; at least 4 exhibit visible purposeful routines |
| Hidden magical discovery | A complete multi-stage secret with at least 3 discoverable clues, interpretation and a payoff |
| Exploration activities | At least 3 distinct activity types, including a noncombat activity |
| Persistent consequences | At least 3 observable reactions or state changes tied to decisions or completion |

A substantive stage requires player action or investigation; merely clicking the next line of dialogue is not a stage. Branches must change something visible: an ally, access, objective, encounter, later conversation, location state or resolution. Ending text alone is insufficient.

Complete the essential adventure before adding stretch content. No new continent, wholesale engine rewrite, full economic simulation or unrelated multiplayer redesign is required.

## 5. Living settlements

Give important NPCs understandable work, destinations, relationships and reactions. Routines may use existing time or lightweight local schedules: work, rest, conversation, inspection, training, trading or tending a place.

Show purpose through placement, movement, animation and short dialogue. Avoid making every NPC wander randomly. Characters should have distinct voices and understandable motives, including at least one sympathetic disagreement where neither choice is simply obvious.

NPC scheduling must never make the main adventure impossible. Provide a sensible way to find or wait for a character. Handle unload/reload, blocked paths, player interruption and quest overrides. Keep essential characters reachable; avoid escort softlocks and permanent failure from incidental physics.

Simulate only the necessary nearby detail. Distant characters may retain abstract state. Bound update work, spawn counts and retained resources; avoid a separate costly timer per decorative NPC.

## 6. The central adventure and side stories

Build an understandable opening that a normal player can discover without reading a walkthrough. Establish the stakes and next lead through play.

Mix investigation, social decisions, travel, environmental clues and combat using existing mechanics. Give objectives more variety than repeated delivery tasks. At least one meaningful objective should support a noncombat approach.

Side adventures should reveal motives, change preparation or offer useful context. They should not become mandatory busywork disguised as optional content. State when a side objective becomes unavailable and avoid surprising players with irreversible loss.

Write finished dialogue, not placeholder prose. Keep individual exchanges readable on mobile, with clear speaker identity and choices. Offer concise reminders when returning after time away. Avoid flooding the screen with simultaneous prompts.

Rewards should fit the existing progression and economy. Do not create an exploitable money loop, overpower existing gear or require new paid cosmetics. Essential clues and completion cannot depend on purchasing cosmetics.

Failure must lead to recovery or a clearly communicated alternate outcome. Death, leaving an area, closing a menu, reloading, abandoning a conversation or moving while mounted must not silently corrupt the adventure.

## 7. The hidden magical discovery

Create an original mysterious character, presence or phenomenon connected to the setting. Build a sequence of clues players can observe and reason about, rather than an arbitrary unmarked coordinate or impossible waiting requirement.

The secret should have an introduction, development and payoff. The payoff should do something memorable: alter an interaction, reveal a meaningful place, create a bounded challenge or change how the player understands an earlier event.

Provide enough redundancy that a missed clue or temporary NPC absence does not permanently block discovery. Define retry behaviour and persistence. Prevent repeated rewards through reload, duplicate interactions or rapid input.

Keep visual effects readable during combat. Avoid the intrusive beam-of-light problem previously reported. Use restrained light, sound and environmental changes where they better support the mystery.

Keep actual solutions, reveal dialogue, secret coordinates and ending details in a separate local/private walkthrough. This public specification intentionally sets requirements without publishing the solution.

## 8. Activities and the world around them

Make travel worthwhile through a coherent selection of activities such as a local dispute, investigation, training challenge, small ambush, tracking task or discovery. Choose activities that fit existing systems and the expansion's story.

Use existing locations first. Inspect the buildings, floors, roofs, walls, ramps, towers, paths and entrances needed for the adventure. Repair relevant gaps, missing surfaces, awkward transitions and collisions. Do not cover architectural problems with inaccessible decorative barriers.

Verify the actual routes players use, including approaching and leaving each objective on foot and horseback where appropriate. Keep roads clear and readable. Essential interactions must remain reachable after dismounting.

Preserve existing roads, world authoring identity and unrelated player work. If world edits are needed, use reviewed, append-only authoring operations with fresh guards and bounded changes. Do not reuse a stale pinned publisher or restore an old world snapshot.

Measure actual geometry and representative traversal. Report tested locations and limits; do not claim universal zero collisions from sparse samples.

## 9. Map, journal and navigation

Keep the realm map and quest journal separate. The map shows geography, useful destinations and player-selected quest leads without exposing every secret. The journal explains current objectives, known clues, decisions and completed outcomes.

Use stable objective identifiers and clear active/completed/failed or alternate-result states. Do not leave stale markers after resolution. Support reopening the journal after save/reload, switching tracked quests and returning to an interrupted conversation.

Respect existing bottom navigation and safe areas. Menus should use the available panel space and preserve the dock where intended. Test nested Back, Exit and Escape, internal scrolling, portrait and narrow landscape. Prevent mount and test tools controls from overlapping.

Character appearance editing remains tied to the barber. Do not reintroduce unrestricted fighter appearance editing through new quest or profile UI.

## 10. Persistence and mode boundaries

Preserve current saves and shared Live/Beta progress. Tests use authorized test identities or isolated fixtures, never the owner's or ordinary players' saves.

New state must be additive, versioned where necessary, size-bounded and backward-compatible. Old saves without expansion fields must load correctly. Test how the current Live codec handles a Beta-updated save; prevent loss of unrelated fields or progress.

Define first entry, partial completion, alternate branch, completed story and repeat visit behaviour. Reward application and important state transitions must be idempotent. Validate malformed or unknown fields without wiping the player's existing progress.

Fight Only remains independent of RPG levels, talents, quests and rewards. No RPG progression gate may leak into it.

Preserve the simpler child experience and age-appropriate matchmaking. Explicitly define how this expansion behaves in child mode: a restrained suitable subset or absence of the complex content, with safe navigation and no adult-content leakage. Do not assume adult and child quest states can be mixed.

## 11. Performance and stability contract

Protect the recent road-loading and resource-lifetime improvements. Capture baseline and candidate with the same viewport, camera, actor population, route, warmup, assets and timing method.

Measure fresh entry, repeated entry/exit, NPC counts, resource retention and representative gameplay. Include a busy settlement, travel route, mounted session, adventure interaction and combat transition.

Investigate the previously unresolved desktop walking frame-time tail. Distinguish possible causes from demonstrated causes and retain slow samples. Do not make fixing every inherited tail a reason to leave the expansion unfinished indefinitely; document the investigation and remaining evidence.

Before implementation, define justified budgets for nearby actors and per-frame routine work. Default performance acceptance targets:

- No reproducible new loading-time regression above 10% in comparable median entry measurements.
- No reproducible representative rendered p95 regression above 10% under matched workload.
- After 20 entry/exit cycles, warmed retained heap and renderer resource counts remain within 5% unless a documented bounded intentional cache explains the difference.
- No progressive actor duplication, stale callback spawning, lost mount, accumulating listeners or unbounded quest-state growth.

A threshold exceedance requires investigation and a fix, or an explicit failed acceptance item. Never quietly redefine the scenario, reduce visual quality or report an unmet threshold as passed. If added intended population differs, report both equal-workload overhead and the real intended scene separately.

Use valid native elapsed timing, adequate warmup and alternating/counterbalanced order. Report hardware and sample counts. Emulated touch is not physical-phone evidence; renderer submission time is not GPU completion or displayed FPS.

## 12. Implementation stages

1. Inspect and capture baseline; create the collaboration task and scope.
2. Build one complete vertical slice: meet a character, accept an objective, perform an action, resolve a choice, save/reload and see the journal update.
3. Extend the slice into the complete main adventure, side stories and secret.
4. Integrate routines, location repairs and navigation.
5. Run independent adversarial tests, performance comparisons and regression checks.
6. Freeze a complete candidate, conduct formal review, repair findings within the review budget and verify deployment.
7. Publish the finished private Beta and final evidence.

Keep concise checkpoint records so another session can continue without repeating work. Report progress using completed milestones and remaining blockers; do not invent a percentage from elapsed time.

## 13. Both assistants must actually test

Claude must execute independent checks and review integrated code and behaviour. Codex must independently verify integration and player flows. A test written by one assistant and executed only by the other must be credited precisely.

The acceptance matrix includes:

- Every main-story resolution and consequential branch.
- Side adventures before, during and after the central story where applicable.
- Hidden clues discovered in different orders, interrupted and resumed.
- Old save, new save, partial state, completion, reload and return through Live/Beta compatibility.
- Rapid repeated interaction, repeated reward attempts and reopening resolved dialogue.
- Area exit during dialogue, unloading during scheduled work, blocked NPC routes and recovery.
- Mount/dismount near objectives and a world rebuild with an arrived or pending horse.
- Combat loss, retry, spectator look/seat/leave and return to the adventure.
- Existing map/journal/menu/dock behaviour on desktop, portrait and narrow landscape.
- Child-mode boundaries and Fight Only independence.
- Relevant building floors, ramps, entrances, roof obstructions and actual travel routes.
- Resource lifecycle and the performance cases above.

Run appropriate existing tests without rewriting assertions merely to make failures disappear. Use negative controls for high-risk persistence, reward and lifecycle protections. Keep failed attempts and distinguish product defects from harness or transport failures.

Run at least one uninterrupted 20-minute representative gameplay soak on desktop and one on an emulated mobile layout. Report the actual exposure, transitions and errors. Do not claim physical-device validation unless performed.

Use a maximum of three formal review/fix cycles. Routine development checks do not count as formal reviews. Reserve formal reviews for integrated candidates. If blocking defects remain after the third cycle, report the goal incomplete with evidence and a concrete next step; do not deploy a known-blocking candidate or mark it complete.

## 14. Private release and rollback

The authorized destination is PRIVATE BETA only. Keep public Live game, wiki and announcements unchanged. Do not send Discord messages, promote publicly, change automatic deployments or touch frozen v59 under this goal.

Follow current project release instructions and use the latest complete combined artifact. Preserve public files and private access controls; do not deploy raw output, a partial overlay or public Git alone.

Before activation, bind the reviewed source, generated runtime, complete candidate and immutable manifest. Preserve a complete frontend rollback artifact and rehearse the applicable rollback locally. Distinguish local rehearsal from actual hosted or database rollback.

If world authoring is required, separately prove fresh guards, append-only history and any transactional rehearsal. Never restore player saves as a rollback strategy.

Verify the hosted private build through the canonical tester-only same-tab Test Server path. Check version, payload parts/protocol, assets, saved world and public preservation. Update/reload old Beta tabs.

Temporary testing access must be narrowly scoped, recorded without credentials and removed exactly when finished. Independently verify the original access roster, expired/removed session behaviour and disposal of diagnostic contexts.

## 15. Deliverables and completion audit

Provide locally/private, with clear links:

1. Spoiler-free owner overview and concise tester starting instructions.
2. Separate secrets and complete walkthrough guide, including branches and recovery paths.
3. Creative treatment, final scope and content inventory.
4. Requirement-to-evidence completion audit with every item passed, failed or blocked.
5. Actual Codex and Claude contributions, including coding, design, tests executed, findings and fixes.
6. Test results, retained failures and known limitations.
7. Baseline/candidate performance report with misses, uncertainty and sample counts.
8. Selected before/after views and relevant route checks.
9. Source/candidate/release identities, preservation proofs, deployment receipt and rollback instructions.
10. Updated local project handoff reflecting the actual final state.

The goal is complete only when the essential adventure is fully playable and reviewed, required preservation checks pass, the exact accepted build is hosted on private Beta, temporary access is cleaned up and the final audit accurately reflects the evidence.

A safe incomplete report is preferable to a false completion claim. A list of ideas, partially wired systems or screenshots without playable outcomes does not satisfy this contract.
