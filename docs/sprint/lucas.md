# Lucas - AI Tuning & Data + Auth

## Completed

### AI & Data
- [x] Import Nashville CSV into `curated_tasks` — `scripts/import_nashville_csv.py`, 45 tasks live in DB
- [x] System prompt tuned in `app/services/ai_service.py` (time budgeting, vibe matching, creative titles)
- [x] Documented final `vibe_tags` and `categories` in `docs/sprint/csv.md`

### Auth
- [x] Build auth endpoints (register, login, JWT tokens) — `app/api/routes/auth.py`
- [x] Add auth middleware to protect all existing endpoints — `app/core/auth.py`, `Depends(get_current_user)`
- [x] Replace placeholder user in `app/api/routes/generate.py` with real auth
- [x] Wire auth into check-ins — `app/api/routes/checkins.py`, `app/schemas/checkins.py`

### XP System
- [x] XP formula and assignment script — `scripts/assign_xp.py`
- [x] `xp` column on tasks, `total_xp` + `level` on users
- [x] Award XP on successful check-in — `checkins.py` increments `user.total_xp`
- [x] `xp_to_level()` helper in `app/models/user.py`
- [x] `xp_earned`, `total_xp`, `level` returned in `CheckInResponse`

### Leaderboard
- [x] `GET /api/check-ins/leaderboard` — global XP leaderboard with rank, username, total_xp, level

### Tests
- [x] Auth tests — `tests/test_auth_api.py` (register, login, token validation)
- [x] Check-in tests — `tests/test_checkins_api.py` (16 tests: GPS/photo success, duplicate, wrong user, verification failures, progress, ownership)

### Cleanup
- [x] Updated README — removed stale TODOs, updated auth discussion section

---

## Key Files
- `app/api/routes/auth.py`
- `app/core/auth.py`
- `app/api/routes/checkins.py`
- `app/schemas/checkins.py`
- `app/models/user.py`
- `scripts/import_nashville_csv.py`
- `scripts/assign_xp.py`
- `tests/test_auth_api.py`
- `tests/test_checkins_api.py`
