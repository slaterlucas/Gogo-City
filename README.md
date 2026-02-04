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

Done! The database is running and ready.

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
