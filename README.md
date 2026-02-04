# GoGoCity

A mobile app that generates personalized city routes (quests) based on user preferences.

---

## Quickstart

### 1. Install Docker

Download and install Docker Desktop:
- **Mac**: https://www.docker.com/products/docker-desktop/
- Click "Download for Mac" and run the installer
- Open Docker Desktop after installing (wait for it to say "Running")

### 2. Install uv (Python package manager)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Then restart your terminal.

### 3. Clone the repo

```bash
git clone https://github.com/cwreller/Gogo-City.git
cd Gogo-City
```

### 4. Run it

```bash
# Start the database
docker-compose up -d

# Install dependencies
uv sync

# Set up the database tables
uv run alembic upgrade head
```

### 5. Set up environment

```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 6. Run the server

```bash
uv run uvicorn app.main:app --reload
```

Open http://localhost:8000/docs to see the API.

---

## Useful Commands

```bash
# Stop the database
docker-compose down

# Add a new Python package
uv add <package-name>

# Run any Python command
uv run <command>
```

---

## Temp Files (delete before production)

These files are for development/demo only:

- `scripts/demo.py` - Demo script for class presentation
- `scripts/seed_test_data.py` - Seeds test data for Nashville
- `inspection/db-viewer.html` - Simple DB viewer (open in browser)

## TODO before launch

- [ ] Wipe `curated_tasks` table - current data is test/seed data, need hand-picked tasks
- [ ] Add real authentication (currently using placeholder user)
- [ ] Delete temp files listed above

---

## Team Discussions

### 1. Preferences Form - What fields do we need?

Current fields sent to AI:
- `city_id` (dropdown)
- `time_available_hours` (number)
- `budget` (low/medium/high/any)
- `vibe_tags` (multi-select)
- `dietary_restrictions` (multi-select)
- `group_size` (number)

**Questions:**
- What vibe tags do we want? (foodie, adventurous, chill, cultural, nightlife, romantic, outdoors, etc.)
- What dietary options? (vegetarian, vegan, gluten-free, halal, kosher, etc.)
- Any other preferences? (accessibility, kid-friendly, pet-friendly, walking distance only?)
- Should time be a slider or preset options (2hr, 4hr, full day)?

### 2. XP / Gamification System

Do we even want to use XP if so we need to consider: 

**Option A:** Assign XP when creating curated tasks
- Each task has a fixed XP value in the database
- Pro: Simple, consistent
- Con: Less flexibility

**Option B:** AI assigns XP during route generation
- AI decides XP based on difficulty/time/uniqueness
- Pro: Dynamic, contextual
- Con: Less predictable, more tokens

**Questions:**
- Do we want leaderboards? (daily, weekly, all-time?)
- Badges/achievements?
- Streaks for completing routes?

### 3. Authentication

- Email/password? Social login (Google/Apple)? Both?
- Do we need usernames or just display names?
- Account deletion / data export (GDPR)?

### 4. Route Task Ordering

Currently: Tasks are unordered (user does them in any order)
- Should AI order tasks geographically (minimize travel)?
- Should AI order by time-of-day (brunch spot first, bar last)?
- Or keep it flexible and let users choose?

### 5. Editing Generated Routes

- Can users edit a route after AI generates it? (add/remove/reorder tasks)
- If yes, do we need a route editor UI?
- Or is it "generate and go" only for MVP?

### 6. AI Cost at Scale

- Current model: gpt-4o (~$5-15 per 1M tokens)
- At scale with 1000s of users, costs add up
- Do we cache similar preference combos?
- Switch to cheaper model (gpt-4o-mini) for some users?
