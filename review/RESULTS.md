# Candidate verification

Build: `steel-tape-auth-aeab0a4c693b`. Base source: `73d56c04b79d59224442e9880edf1bbfcdf9bd92`. Core: `crooked-crown-1-61d2d73a58dd`.

- Build syntax and ESLint passed; Deno Edge Function type-check passed.
- 26 focused tests passed: shared geometry/replay, actual PostgreSQL migration and permissions, eligibility, reservations, transfers and retries, plus twelve authentication regressions.
- The final browser report has 4 passing cases, 0 unexpected failures. The separate regression log records desktop and emulated-phone checks for manual head aim, explicit fullscreen, three simulated minutes of civilian routing, and castle collision.
- Equipment calibration: 153/1280 complete fights won (11.95%), 64 weapon pairings, twenty seeds each. Wilson 95% interval: 10.29%–13.85%. This is one reproducible bot policy, not human evidence. Individual matchups vary; inspect `tests/equipment-calibration.json`.
- Sword-versus-sword benchmark: 43/1000 wins (4.30%); this narrower result must not be presented as the overall human difficulty.
- Protected authentication, player-save, HACSA identity/roster, squire, ordinary fighter/marshal/AI and input modules match the base source. Frozen v59 remains at `steel-tape-auth-14edf9973749`.

Not performed: physical Android testing, human crown playtests, real staging-account authentication/save checks, or real multi-connection PostgreSQL contention. PGlite serializes database connections; browser crown requests use replaying fixtures. No remote database mutation, deployment, publication or forced update occurred.

See `IMPLEMENTATION.md` and `HANDOVER.md` for operation, source locations and staging checks. The local editor is available at http://127.0.0.1:8848/map-editor/ while its server is running.

Production confirmed READY: dpl_Gw66NjihSbFxCJucc9Bidj7ibDvr; GitHub main 9bf62a9ce3e0b06e55738abf02ae3d12b4ff0e4a; build steel-tape-auth-6956385a377a. Live game bytes match the staged release. Editor HTML, scripts, preview and chunks deny unauthenticated callers (401); direct private and encoded asset paths return 404; invalid session tokens return 401. Server admin/crown endpoints reject missing and invalid tokens. Both current crown holder tuples remain unchanged. New crown tables have RLS with intentional deny-all/no-policy behavior and no anon/authenticated write or RPC execution grants. Supabase security advisor reports only informational no-policy findings on those two new tables.

Discord v28 sent Patch 4.9 to BuhurtOS category #patch-notes (1558642158095835229; request772) and Red Deer Reavers #buhurt-steel-and-tape (request773), both HTTP200 with no failures. Current note is saved beside this record. Private frozen index SHA256 remains 9febc28a92bb24e885540d3c5265130201f442c4211be0f4be24179eb00834e0. Owner interactive login on production has not been exercised with real credentials; hosted positive authorization is covered by dependency-injected real-handler browser tests, while production rejection routes were exercised live.
