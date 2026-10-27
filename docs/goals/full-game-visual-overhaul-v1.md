# Codex and Claude: Full-game visual overhaul
Version 1 · 27 October 2026 · Implementation target: PRIVATE BETA

## Goal

Transform BUHURT: Steel & Tape into a striking, cohesive medieval game. Make the entire game look deliberately art-directed: convincing places, memorable silhouettes, readable action, attractive interfaces and details that reward looking closely.

This is a major visual production pass across the existing game, not a small scenery touch-up. Inspect every visual asset and account for every placed world instance. Keep, improve, replace, remove or add whatever the experience needs. Every element should serve navigation, gameplay, atmosphere, storytelling or composition. Empty space can be purposeful; more objects, polygons and glow do not automatically make a better scene.

Preserve the established medieval identity and approachable stylized, low-poly language. Push its quality substantially through better shapes, proportions, materials, lighting, animation, composition and consistency. Give settlements and landmarks distinctive identities within one coherent world. The owner judges the final aesthetic; technical checks alone cannot prove that a scene looks incredible.

Publishing this specification prepares the goal. Implementation starts when the owner activates it. This document authorizes private Beta delivery during that implementation, not public Live promotion.

## Collaboration and ownership

- **Codex leads creative direction:** art bible, visual hierarchy, regional identity, landmark composition, character personality, environmental storytelling, interface direction and the overall player experience. Codex makes concrete design decisions, integrates work, performs visual and gameplay checks and evaluates Claude's implementation.
- **Claude leads most production coding:** asset construction and integration, rendering and material systems, animation and attachments, interface implementation, world presentation, lifecycle management, optimization and technical fixes. Claude must challenge weak designs, suggest practical visual improvements, test independently and review the integrated result.
- Both assistants contribute throughout design, implementation, testing and fixes. Use the existing local Codex/Claude collaboration helper and explicit Claude session IDs. The owner never forwards messages. Use the existing subscription authentication; no silent separately billed API fallback.
- Serialize writes to a shared checkout. Give each assignment explicit files, tool permissions and acceptance criteria. Keep the helper's 20-minute invocation timeout and a maximum of three formal integrated review/fix cycles. Routine development checks precede formal review.
- Record what each assistant actually designed, coded, executed, discovered and fixed. Distinguish writing a validator from running it and reviewing evidence. Do not claim equal contributions from line counts or label another Codex agent as Claude.
- Report login, usage, tool and deployment blockers honestly. Do not present work as jointly completed if Claude could not participate.

## 1. Establish the real baseline before changing the game

Read current AGENTS.md and accepted handoff receipts. Capture actual current serving builds, publication metadata, source bindings, saved world, editor history, preferences, active edits and access state. Reconcile drift before implementation. Never use an empty seed, stale world snapshot or old pinned publisher as current authority.

At implementation start, identify the latest accepted private Beta build and its matching receipts. Historical labels are not permission to overwrite newer work. Carry forward its adventure content, decisions, secrets, recent road improvements and performance work. Keep private release details in the local handoff.

Preserve complete accepted deployment and frontend rollback artifacts, source manifests and relevant capture evidence. Work in an isolated checkout. Do not overwrite another chat's active work. Preserve current player/world state through any rollback; never restore historical player saves to undo a visual release.

Capture a reproducible before gallery and performance baseline using recorded builds, world, camera positions, settings, hardware/browser environment and viewport. Include busy settlements, castle routes, countryside, water, combat, mounts, spectators, major menus and the title screen.

## 2. Inventory every asset and placement

Create a machine-readable census from both source references and actual runtime scenes. Cover procedural meshes, imported models, textures, materials, sprites, icons, fonts, animations, shaders, effects, environment geometry and UI visual components. Include dynamically loaded assets and every supported mode, not just assets visible on first entry.

Define the census unit explicitly: source/generator identity plus meaningful parameter signature and normalized geometry/material identity. Enumerate a declared matrix of runtime states, variants, loading paths and supported environments. Every rendered object in each captured state must map to a ledger entry; publish the coverage limits. For potentially combinatorial costumes or procedural outputs, audit every distinct asset/variant and use a documented risk-based combination matrix rather than claiming every possible generated scene was viewed.

Maintain two linked ledgers:

1. **Asset ledger:** stable identity, source or generator, dependencies, provenance/license, usage locations and modes, dimensions, materials, texture sizes, geometry/resource cost, visual problems, purpose, keep/refine/replace/remove/add decision, rationale, responsible assistant and evidence.
2. **Placement ledger:** stable instance identity or reproducible generator key, region/scene, transform, asset reference, function, grounding/support, clearance, overlap classification, route impact, review status and disposition.

Keep a separate private ledger for quest- and secret-bearing visual cues. Verify that replacements preserve discoverability and intended subtlety. Screen galleries before any public sharing; the working census, private source locations, hidden cues and diagnostic evidence remain local/private.

Every unique asset family and materially distinct variant needs visual review at gameplay distance and an appropriate closer view. Repeated identical copies may share a mesh review, but every placed instance remains in the census and receives placement checks. Inspect flagged placements visually and systematically tour every playable region, arena and interior.

Automated checks must cover the full captured instance set; sampled screenshots do not prove full coverage. Record unsupported or uninspectable cases explicitly. Completion requires no unclassified asset or placement in the agreed runtime inventory. Retire genuinely unused items only after checking dynamic references, shared uses, variants and fallback paths.

## 3. Create and apply an art bible

Before mass changes, write concrete standards with examples:

- A clear palette, value hierarchy and restrained accent colors for navigation, services, threats, rewards and magic.
- Consistent scale for fighters, doors, stairs, railings, weapons, props and buildings.
- Strong readable silhouettes, intentional shape language and enough detail to feel crafted without random geometric noise.
- Material families for stone, plaster, timber, metal, cloth, leather, vegetation, earth and water. Establish compatible roughness, saturation, texture density and UV scale.
- Architectural rules for foundations, joints, roof edges, openings, floors, supports, ramps and defensible medieval structures.
- Regional differences in construction, vegetation, props and lighting that retain a shared identity.
- Animation and effects standards, interface icon language, typography, spacing and accessible contrast.
- Quality settings and resource budgets that preserve composition and gameplay clues on lower settings.
- An explicit shading policy, numeric palette/value ranges and per-class triangle/material budgets. Test silhouettes as grayscale thumbnails at gameplay distance, including fighter/team/weapon recognition.

Creative pillars: believable hand-built medieval places; vivid tournament spectacle with clear fighters; countryside with readable paths and distinct landmarks; intimate, purposeful details rather than filler. Identify signature views in every region and arena, while improving the ordinary routes between them.

Do not copy another game's proprietary art, trademarks or interface wholesale. Use original work, existing approved assets or appropriately licensed sources. Record provenance and modification history. Do not purchase assets, subscribe to services or switch to paid generation without authorization.

Prove the direction with a polished representative slice containing outdoor terrain, a building and interior, a character and mount, equipment, an arena/action view and a major menu. Codex evaluates the visual result and Claude evaluates feasibility and cost. Then apply the standard across the game; a beautiful showcase scene is not completion.

## 4. Rebuild the visual quality across the whole game

### Terrain, roads and natural areas

Improve ground transitions, texture scale, road edges, shoulders, junctions, slopes, shorelines and water. Keep roads visibly readable and usable on foot and horseback. Blend terrain deliberately without muddying all surfaces into the same color. Resolve fields, fencing, vegetation or props crossing travel routes. Make rocks, trees, crops and ground cover belong to the terrain through scale, grouping, support and sensible biome placement.

Give water, banks and distant scenery coherent treatment. Prevent seams, floating ground patches, z-fighting and visibly repeated stamps. Preserve authored terrain intent and walkable heights unless a reviewed change requires correction.

### Settlements, castles and interiors

Inspect every building type and placed building, including walls, floors, roofs, ramps, stairs, towers, gates, bridges, windows, doors and foundations. Repair missing faces/floors, unintended gaps, unsupported overhangs, poor joins, floating flags, wrong scale, awkward entrances and visible collision mismatches.

Make places feel constructed and inhabited through purposeful furnishings, storage, work areas, signage and restrained wear. Use sightlines, silhouettes and landmarks to support orientation. Preserve breathable streets and usable service entrances. Complete accessible interiors and any exterior-visible shell; distant inaccessible structures need convincing silhouettes and complete visible surfaces, not unnecessary simulated interiors.

### Fighters, NPCs, mounts and equipment

Review all existing character families, adult/child variants, important NPCs, armor, clothing, hair, faces, weapons, shields, accessories and mount variants. Improve proportions, silhouette, material consistency and personality while retaining identity and purchased/unlocked cosmetics.

Check rigs, idle/walk/run/combat/mount animations, feet, hands, weapon grips, reins and saddle/rider attachments. Repair visible clipping, detached equipment, incorrect orientation, skating and broken transitions within the agreed poses/actions. Avoid making all equipment look identical; readable distinction matters in combat and menus.

### Arenas, fighting and spectator presentation

Review every arena and supported fight configuration, including Fight Only. Improve grounds, barriers, stands, banners, spectators and focal composition. Protect fighter contrast and spatial readability. Check close and distant cameras, crowd density, team identification, target markers and damage/interaction feedback.

Effects should communicate events clearly. Replace intrusive beams, excessive bloom, opaque particles or noisy indicators that hide combat. Magic can be remarkable through timing, shape and restraint. Preserve combat rules and timing; this goal does not authorize a balance rewrite. Check apparent weapon length against actual reach, team readability and retained attack/grapple/block/disarm cues. Record and compare protected combat constants, hitboxes and save-codec bindings. Any necessary visual/collider repair needs an explicit scoped change and regression evidence; do not demand unchanged defective colliders while claiming collision fixes.

### Lighting, atmosphere and technical rendering

Unify lighting, shadows, fog, sky, exposure and color treatment across actual supported environments. Check interiors, shaded armor, bright ground and transitions. Add or refine atmospheric effects only when they improve a specific place and fit the budget. Do not invent a costly day/night or weather simulation merely to satisfy a visual checklist.

Investigate popping, incorrect culling, transparent sorting, shadow acne, stretched textures, missing normals, broken material reuse and excessive shader variation. Prefer shared materials, instancing, bounded effects and deliberate detail levels where they maintain appearance. Low settings must retain functional clues and landmarks.

### Menus, HUD and visual communication

Review the title, character creation, Fight Only setup, inventory/equipment previews, barber, profile, skills, achievements, town/service panels, map, quest journal, minimap, prompts, loading/update screens and spectator controls, plus other actual existing screens found by the inventory.

Create a consistent original icon, typography, spacing and panel system. Menus must use available space, scroll internally when needed and retain appropriate navigation. Keep Map and Journal separate. Preserve the bottom-right landscape dock, safe areas, working Back/Exit/Escape behavior and clear mount access without Test Tools overlap.

Check desktop, portrait phone and short landscape layouts, long labels, empty/full lists and loading/error states. Avoid decorative frames consuming the usable screen. Use at least 44 CSS-pixel touch targets for primary controls, WCAG AA text contrast, and no unintended clipping/overflow at 320, 390 and 1440 CSS-pixel widths plus short landscape and installed-app emulations. Record any justified compact-secondary-control exception. Maintain legibility and restrained motion. Appearance editing remains at the barber after creation; child/adult selection and mode boundaries remain intact.

## 5. Purposeful additions and removals

Both assistants have freedom to redesign weak assets, remove redundant clutter, reposition props and add visual storytelling where a place needs it. Each substantive addition should have a purpose: orient the player, explain a location, support an activity, establish identity or improve composition.

Do not remove a quest clue, interaction, service, collision boundary, cosmetic entitlement or editor identity simply because its current visual is poor. Replace it with a tested equivalent and preserve its stable behavior/state binding. Protect secret discoveries; keep solutions and coordinates out of public documentation.

Maintain append-only authoring history when world edits are necessary. Capture fresh guards for each publication, reject conflicting active edits and use newly reviewed task-specific changes. Never loosen an old publisher's pinned guards to force a visual update. Prefer asset replacement keyed to stable existing identities when it achieves the design; use guarded authoring changes when layout itself needs repair. Verify packaged editor/runtime model parity. Any changed footprint re-triggers the full current derived-road-surface, route, service-approach and static-contact checks; do not rely on authored road widths alone.

## 6. Performance is part of the visual quality

Set explicit budgets after the baseline and before broad production: payload/network bytes, texture memory, draw calls, visible triangles, materials, render frame-time distributions, loading/entry time and retained resources. Separate ceilings by supported quality profile and representative scene. Do not choose budgets after seeing the final measurements to conceal regressions.

Compare old and new builds under equivalent world, camera, population, viewport, settings and environment. Use rendered gameplay for rendering claims; CPU-only simulation, suppressed drawing or zero-clock tests cannot prove FPS/GPU gains. Report cold/warm loading separately and keep intended richer-population measurements separate from matched comparisons.

Investigate the inherited desktop rendering tail using bounded profiling, retain evidence and fix identified causes where practical. Do not claim it resolved without evidence or stall the entire project indefinitely on an unidentified inherited issue.

Default regression gate: investigate and correct a repeatable increase above 10% in median loading/entry time or p95 rendered frame time in a matched representative profile. Use repeated samples and document variance. Any essential exception must be explicitly justified and remain a known limitation; a material unresolved regression blocks a claim of complete acceptance. No hidden quality reduction to manufacture faster results.

Run at least 20 measured entry/exit cycles after warmup and a 20-minute active session on desktop and emulated touch profiles. Check resource disposal, memory trends, effects accumulation, repeated NPC/mount rebuilds and quality transitions. Aim to keep post-warmup retained resources within 5% of comparable baseline and investigate sustained growth rather than one heap peak. Record numeric final budgets and both failures and passes. State actual hardware/browser and emulation limits. Physical-device or universal performance claims require corresponding evidence.

## 7. Protect the game while improving it

Preserve existing saves, shared progress, currencies, inventory, cosmetics, achievements, quests and existing adventure decisions/secrets. Keep new visual configuration backward-compatible. Do not casually rewrite persistence to deliver new art.

Preserve combat behavior, adult/child separation and age-appropriate matchmaking. Fight Only stays independent of RPG levels, talents and progression. Preserve tester-only access, account permissions, world editing, publication history and existing service interactions.

Use the designated automated test account, never the owner's or another real player's save. Follow the private handoff's existing save-sync precautions and do not claim inherited persistence limitations are fixed by a visual release. Any unrelated defect discovered is logged and triaged; essential regressions caused by this work are fixed.

Frozen v59, public production and unrelated projects remain outside implementation authority. Public GitHub receives only approved documentation, never private runtime/source bundles, credentials, hidden solutions or diagnostic access data.

## 8. Production milestones and evidence

Work through complete deliverables:

1. Fresh state capture, rollback preservation, full inventory, issue map and baseline gallery/performance.
2. Art bible, prioritized production plan, resource budgets and polished representative slice.
3. Systematic architecture, terrain and environment pass across every region and arena.
4. Character, mount, equipment, animation, effects and lighting pass.
5. Interface consistency and desktop/mobile presentation pass.
6. Whole-game integration, independent visual/gameplay testing, repairs and private Beta delivery.

Stages may overlap by serialized assignments, but each finishes with named assets/areas and evidence. Maintain an essential checklist and a separate stretch list. All core categories above are essential; optional embellishments, new weather/time systems, elaborate cinematic sequences and unrelated gameplay systems are stretch work. Do not substitute many unfinished experiments for a complete game-wide pass.

Report progress by accepted milestones and verified inventory coverage. Distinguish inventoried, designed, implemented, tested, reviewed and deployed. Do not invent percentages or call 100% asset enumeration 100% visual completion.

## 9. Test and review the actual experience

Both assistants must execute checks and exchange findings. Use source/unit checks where meaningful, actual runtime census, geometry/route tests and browser-driven gameplay, plus visual review of final screenshots and motion.

Cover:

- Every region, arena, accessible interior and building family; all road routes on foot and horseback; service approaches, stairs, ramps, gates and camera movement.
- Grounding, open floors/walls, joints, clipping, occlusion, shadow/material defects and visual/collider agreement. Document intentional structural joins separately from errors.
- Character/equipment variants, representative animation transitions, mounted travel/dismount, crowded fighting and spectator looking/seat controls.
- RPG, Fight Only, adult/child flows, character creation/barber, existing quest paths and secrets, interactions, menus, save/reload and repeated entry.
- Desktop, touch landscape and portrait layouts; safe edges, bottom dock, menu scrolling, icon meaning, long content and overlay conflicts.
- Lower/higher supported quality settings, asynchronous asset arrival, missing/failing asset recovery, reload/update behavior and resource cleanup.

Use a coverage matrix with build IDs, actual assertions, screenshots/captures, failures and retest results. Finite road samples or bounding-box checks do not establish universal continuous collision freedom. Confirm support/walkability and player-camera behavior, not merely nonintersecting AABBs.

Allow at most three formal integrated Claude/Codex review/fix cycles. Keep rejected attempts and unresolved findings. If blockers remain after that limit, deliver an accurate unfinished status and next actions rather than looping or declaring success.

## 10. Release and completion criteria

Deploy the finished, reviewed expansion to **PRIVATE BETA ONLY** using the standing full-artifact release workflow. Capture current state again before activation. Use a complete sealed candidate and its matching source/world compatibility evidence, not raw generated output, a partial overlay or public Git alone.

Verify the actual serving version/build fingerprint and package parts, native deployment status, canonical tester-only entrance, access protection, unchanged public bytes and protected world/history/preferences/progress. Rehearse the complete frontend rollback locally and distinguish this from a hosted or database rollback. Remove only task-owned temporary access and revoke shares; independently verify cleanup.

Completion requires:

- A complete asset/placement census with no unclassified entries, reviewed unique families/variants and completed region/mode coverage.
- Deliberate decisions and applied standards across every essential category, with substantial visible improvements demonstrated by matched before/after evidence.
- No unresolved work-caused blocking visual, gameplay, access, persistence or performance regression.
- Both assistants' actual tests, bounded formal review acceptance and an honest limitations report.
- A verified private Beta release with clear entry/version instructions and a complete rollback artifact.

The owner may request additional aesthetic revisions after testing. Do not equate automated acceptance with the owner's subjective approval.

Public Live promotion, public release announcements, wiki promotion and Discord messages require separate authorization. If later authorized, follow the standing reviewed wiki, numerical release notes, append-only history and both Discord delivery requirements. This goal does not create a polling schedule or a new shared chat application.

## Deliverables

- A concise spoiler-free owner overview and a clear list of major visible changes.
- Art bible, full asset/placement decision ledgers, region/mode coverage matrix and retained issue history.
- A browsable before/after gallery with matched cameras and recorded settings, plus motion examples where still images conceal defects.
- Accurate Codex and Claude design/code/test/fix contributions.
- Test results, comparable performance measurements, budget exceptions and known limitations.
- Private release receipt, current source/candidate bindings, rollback instructions and exact Beta entry/build verification instructions.
- A separate private technical handoff; keep secrets, credentials, private source/assets and diagnostic details out of the public GitHub specification.

## Specification preparation

Codex authored this goal and its art/coverage direction. Actual Claude Code supplied a read-only feasibility critique through the local helper; Codex incorporated asset identity, private cue tracking, editor parity, combat-visual agreement and measurable interface recommendations. This is planning participation, not a claim that implementation or game testing has started. The owner has explicitly requested publication of this specification; this documentation-only authorization does not permit publishing private game assets.

Do the creative work boldly. Make every place and asset feel intentional, complete the whole visual pass, and be precise about what was actually verified.

