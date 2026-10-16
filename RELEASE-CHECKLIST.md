# Standing live deployment checklist

Owner authorization: wiki maintenance and full patch notes are automatic parts of every BUHURT: Steel & Tape release. This applies to hotfixes, content, balance, compatibility and wiki-only releases. It is an agent-executed release workflow, not a polling schedule. Do not mark the job complete after shipping only the game.

## 1. Capture and compare

- Read the current `sites/buhurtos-wiki/DEPLOY-LIVE-PROMPT.txt`, `README.md`, `PATCH-NOTES.md` and `content-policy.json` in full. Their canonical Vercel workflow supersedes the archived Sites-preview instructions.
- Discover actual production deployment/commit/build and latest `dothecoolwip/First-Site` main each time. Capture previous production files, public values, catalogue and release archive before replacing anything. Treat old release checkouts as evidence, never as a newer production baseline.
- Compare all changed game modules, assets, configuration and backends with the exact candidate. Preserve newer remote changes; use an expected-head lease and normal fast-forward update. If main or production changes, reconcile and repeat affected review/checks. Keep saves and frozen private v59 unchanged.

## 2. Review wiki and full notes

- Run `node scripts/sync-live.cjs` in the wiki authoring folder against actual production. Review changed/removed existing entries and every `pending-review.json` entry individually. Approve only verified public IDs. Keep ambiguous entries quarantined. Never use `--initial-review` again or substitute stale local source. For candidate additions, extend the narrow projection and article views, review the exact candidate, and repeat the live extraction after deployment.
- Expand affected public systems: quests/prerequisites/objectives/public rewards, people/services, places/directions, equipment, gathering/materials, crafting, progression, skills, combat, modes, travel, housing, cosmetics and companions. Do not invent facts or publish placeholder coverage.
- Write `releases/RELEASE-ID.json` with stable ID, release time, previous/current builds, evidence, affected conditions/modes, interactions/edge cases, known issues and actual verification. Cover relevant additions/removals, balance, mechanics/formulas/caps, fixes, AI/online behavior, world/navigation, quests/progression, crafting/equipment, controls/accessibility/UI, compatibility/save migrations and performance. Explicitly distinguish measured results from source constants; never invent a measured improvement.
- For every changed public number record old/new values, unit, absolute difference and relative change `(new-old)/abs(old)*100`. Distinguish percentage points from relative percentages: 20% to 25% = +5 percentage points and +25% relative. A zero baseline has undefined relative change. If an old value is unknown, say so in prose; omit fabricated metrics. Review formulas, probabilities, ranges, timings, cooldowns, yields, XP and costs where affected.
- Review every public sentence, metric, link and evidence item for secrets. Exclude hidden places/interactions/triggers/rewards, discovery clues, spoilers, credentials, private player data, admin/debug tools and raw source/secret tables. Public rewards are allowed only when verified ordinary player-facing content.
- Run `node scripts/release-notes.cjs releases/RELEASE-ID.json`. Never overwrite previous release IDs/history; use a new record for a factual correction that identifies the earlier error. Permanent URLs must remain valid. Keep the full archive append-only.

## 3. Validate, export and deploy

- Run game build/lint/relevant regressions and wiki `node --check dist/app.js`, `node --check dist/patch-notes.js`, `node scripts/check.cjs`, `node scripts/check-release.cjs`.
- Follow the current README's public-model workflow: extract only individually reviewed models from the exact candidate, review model/material changes, regenerate static previews and preserve renderer licenses/attribution. Run `node scripts/check-models.cjs dist ABSOLUTE-CANDIDATE/index.html` and `node scripts/check-armory.cjs`; keep model, renderer, preview and game-source hashes aligned. Repeat extraction against actual production after publication.
- Run `node --check dist/experience.js`, `node --check dist/vendor/fuse.min.js` and `node scripts/check-experience.cjs` against the owned preview. Preserve the explicit public vendor/UI/model asset allowlist. Run `node scripts/check-home-layout.cjs GAME-CHECKOUT`; keep the existing main-menu Wiki link and home layout intact.
- Start your own wiki preview (`node scripts/preview.cjs`, port8891); run `node scripts/browser-check.cjs`; inspect desktop/phone screenshots, search, quest order/prerequisites/objectives, people/place links, gathering requirements, recipes and all changed article types. Stop only your own preview process.
- Export only allowlisted public wiki files using `node scripts/export-live.cjs ABSOLUTE-LATEST-GAME-CHECKOUT`. Run `node scripts/check-hosted.cjs GAME-CHECKOUT` for the `/wiki/` subfolder, full-note links, arithmetic display and network-only service-worker behavior. Run `node scripts/release-gate.cjs GAME-CHECKOUT RELEASE-ID PREVIOUS-PRODUCTION-CHECKOUT` and retain its build/hash manifest.
- Preserve existing game/API routes and assets, wiki trailing-slash redirects/cache headers, and root service worker wiki network-only bypass. Never copy private authoring files, pending reviews, source bundles, Sites identity or secret tables into `wiki/`. Use existing Vercel project/team only; never replace canonical hosting with the legacy Sites preview.
- Deploy the exact verified game/wiki/notes together. Confirm Vercel READY, actual public responses, exact game hashes/version, desktop/phone rendering, search and permanent release deep link. Re-run live extraction and compare its build/content with the deployed catalogue; do not publish stale data if extraction fails. If a gameplay publication succeeds but wiki verification fails, explicitly report separate game/wiki statuses and preserve the last verified wiki; repair before calling the whole release complete.
- Repeat the experience browser check against `https://buhurt-steel-and-tape.vercel.app/wiki/`. Verify the public model/static-preview fallback and exact release deep link on production. Preserve the existing project and audience; record actual outcomes and any untested device or account conditions.

## 4. Announce and record

- Only after production, wiki and exact notes URL are verified, use the existing Discord dispatcher. Preserve destinations (BuhurtOS Steel & Tape category `#patch-notes` and Red Deer Reavers `#buhurt-steel-and-tape`), human credits/tags, safe mention rules and first-line duplicate protection. No unrelated messages or duplicate posts.
- Every concise announcement MUST include these lines with the real verified ID:

  Full patch notes: https://buhurt-steel-and-tape.vercel.app/wiki/patch-notes/#patch/RELEASE-ID
  Wiki: https://buhurt-steel-and-tape.vercel.app/wiki/
  Play: https://buhurt-steel-and-tape.vercel.app/

- Confirm actual delivery responses for BOTH channels. Record deployment ID, production commit/build, previous build, hashes, reviewed catalogue delta, archive ID/URL, test results/limits and delivery results. Update handover/source checklist. Final summary includes game/wiki/full-notes URLs and matching build; report wiki or Discord failures separately. Never claim an unverified deployment, device/account test or delivery succeeded.
