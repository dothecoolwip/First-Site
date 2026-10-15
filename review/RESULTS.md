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
