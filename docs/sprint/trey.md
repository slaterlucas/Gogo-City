# Trey - Route Instances & Sharing

## Sprint 1 (DONE)

- [x] Build POST `/api/instances` - import a template into a personal route instance
- [x] Build GET `/api/instances` - list my route instances
- [x] Build GET `/api/instances/{id}` - get a single instance with tasks and progress
- [x] Instance snapshotting logic (copy template tasks into instance tasks on import)
- [x] Progress tracking (calculate completed vs total tasks)
- [x] Build GET `/api/routes/share/{share_code}` - preview a shared route
- [x] Build POST `/api/routes/import/{share_code}` - import a shared route into your account
- [x] Tests for all of the above

### Known Issue
- `user_id` is currently passed in the request body - this will need to change once Lucas adds auth (user_id will come from JWT token instead). Don't worry about it for now.

---

## Sprint 2

### Route Management
- [ ] Build DELETE `/api/instances/{id}` - let users delete/archive a route instance
- [ ] Build PATCH `/api/instances/{id}` - update status (active → completed, active → archived)
- [ ] Auto-mark instance as "completed" when all tasks are checked in

### Route Editing
- [ ] Build PATCH `/api/instances/{id}/tasks/{task_id}` - let users reorder or add notes to tasks
- [ ] Build DELETE `/api/instances/{id}/tasks/{task_id}` - remove a task from an instance

### Template Discovery (may or may not use this in the end depend)
- [ ] Build GET `/api/templates/public` - list all public templates (for a "browse routes" page)
- [ ] Build PATCH `/api/templates/{id}` - let author toggle `is_public` on their templates
- [ ] Add filtering/search to public templates (by city, vibe tags)

## Key Files
- `app/api/routes/instances.py`
- `app/api/routes/sharing.py`
- `app/services/instance_service.py`
- `app/schemas/instances.py`

## Setup

### 1. Pull latest main
```bash
cd Gogo-City
git checkout main
git pull origin main
```

### 2. Create your new branch
```bash
git checkout -b trey/sprint-2
```

### 3. Run
```bash
docker-compose up -d
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

### 4. When you're ready to push
```bash
git add .
git commit -m "description of what you did"
git push -u origin trey/sprint-2
```
Then open a Pull Request on GitHub to merge into `main`.
