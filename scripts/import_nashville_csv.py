"""Import enriched Nashville CSV into curated_tasks table.

Run with: uv run python scripts/import_nashville_csv.py
"""
import csv
import sys
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, ".")

from sqlalchemy import select
from app.db.session import SessionLocal
from app.models import City, CuratedTask

CSV_PATH = Path("Gogo - nashville_template_tasks.csv")


def parse_duration(value: str) -> int | None:
    """Convert range like '45-60' to midpoint integer (52)."""
    if not value or not value.strip():
        return None
    value = value.strip()
    if "-" in value:
        parts = value.split("-")
        try:
            low, high = int(parts[0]), int(parts[1])
            return (low + high) // 2
        except (ValueError, IndexError):
            return None
    try:
        return int(value)
    except ValueError:
        return None


def parse_vibe_tags(value: str) -> list[str]:
    """Parse comma-separated vibe tags, stripping whitespace."""
    if not value or not value.strip():
        return []
    return [tag.strip() for tag in value.split(",") if tag.strip()]


def parse_lat_lng(lat_str: str, lng_str: str, name: str) -> tuple[Decimal | None, Decimal | None]:
    """Parse lat/lng, handling missing values and known data issues."""
    lat = None
    lng = None

    if lat_str and lat_str.strip():
        lat = Decimal(lat_str.strip())

    if lng_str and lng_str.strip():
        lng_val = Decimal(lng_str.strip())
        # Nashville is ~86.7W - if lng is positive it's a data entry error
        if lng_val > 0:
            print(f"  WARNING: '{name}' has positive lng={lng_val}, auto-correcting to -{lng_val}")
            lng_val = -lng_val
        lng = lng_val

    return lat, lng


def parse_price_level(value: str) -> int | None:
    if not value or not value.strip():
        return None
    try:
        return int(value.strip())
    except ValueError:
        return None


def main():
    if not CSV_PATH.exists():
        print(f"ERROR: CSV not found at {CSV_PATH}")
        sys.exit(1)

    db = SessionLocal()

    try:
        # Get Nashville city ID
        city = db.execute(
            select(City).where(City.name == "Nashville")
        ).scalars().first()

        if not city:
            print("ERROR: Nashville not found in cities table.")
            print("Run the seed script first: uv run python scripts/seed_test_data.py")
            sys.exit(1)

        print(f"Found city: {city.name} ({city.id})")

        # Clear existing curated tasks for Nashville
        existing = db.execute(
            select(CuratedTask).where(CuratedTask.city_id == city.id)
        ).scalars().all()

        if existing:
            print(f"Deleting {len(existing)} existing curated tasks for Nashville...")
            for task in existing:
                db.delete(task)
            db.flush()

        # Import from CSV
        with open(CSV_PATH, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            tasks_imported = 0

            for row in reader:
                name = row["name"].strip()
                lat, lng = parse_lat_lng(row.get("lat", ""), row.get("lng", ""), name)

                task = CuratedTask(
                    city_id=city.id,
                    name=name,
                    description=row["description"].strip() or None,
                    category=row["category"].strip(),
                    address=None,
                    lat=lat,
                    lng=lng,
                    task_description=row["description"].strip() or None,
                    verification_type=row["verification_type"].strip(),
                    vibe_tags=parse_vibe_tags(row.get("vibe_tags", "")),
                    dietary_tags=[],
                    price_level=parse_price_level(row.get("price_level", "")),
                    avg_duration_minutes=parse_duration(row.get("avg_duration_minutes", "")),
                    is_active=True,
                )
                db.add(task)
                tasks_imported += 1
                print(f"  + {name} | {task.category} | vibe: {task.vibe_tags} | {task.avg_duration_minutes}min")

        db.commit()
        print(f"\nDone! Imported {tasks_imported} curated tasks for Nashville.")

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
