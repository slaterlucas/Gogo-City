"""Shared test fixtures for GoGoCity tests."""
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.core.auth import create_access_token, get_current_user
from app.db.session import get_db
from app.main import app

# Fixed user for tests that just need a valid authenticated user.
TEST_USER_ID = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")


@pytest.fixture
def mock_db():
    """Return a MagicMock that acts as a SQLAlchemy Session."""
    return MagicMock()


@pytest.fixture
def client(mock_db):
    """FastAPI test client with DB and auth dependencies overridden.

    All protected endpoints receive TEST_USER_ID as the authenticated user.
    """
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
    yield TestClient(app)
    app.dependency_overrides.clear()


def auth_headers(user_id: uuid.UUID | None = None) -> dict:
    """Return Authorization headers with a real JWT for the given user (or TEST_USER_ID)."""
    token = create_access_token(user_id or TEST_USER_ID)
    return {"Authorization": f"Bearer {token}"}


# ── Fake model helpers ───────────────────────────────────────────────

def make_template_task(*, template_id=None, **overrides):
    task = MagicMock()
    task.id = overrides.get("id", uuid.uuid4())
    task.template_id = template_id or uuid.uuid4()
    task.place_id = overrides.get("place_id", "ChIJ123")
    task.provider = overrides.get("provider", "google")
    task.name = overrides.get("name", "Visit the Parthenon")
    task.address = overrides.get("address", "123 Main St")
    task.lat = overrides.get("lat", Decimal("36.1448"))
    task.lng = overrides.get("lng", Decimal("-86.8024"))
    task.place_types = overrides.get("place_types", ["attraction"])
    task.task_description = overrides.get("task_description", "Take a selfie")
    task.verification_hint = overrides.get("verification_hint", "Photo of you there")
    task.verification_type = overrides.get("verification_type", "photo")
    task.notes = overrides.get("notes", None)
    task.created_at = overrides.get("created_at", datetime.now(timezone.utc))
    task.has_location = task.lat is not None and task.lng is not None
    task.has_task_action = task.task_description is not None
    return task


def make_template(*, num_tasks=2, **overrides):
    t = MagicMock()
    t.id = overrides.get("id", uuid.uuid4())
    t.author_id = overrides.get("author_id", uuid.uuid4())
    t.city_id = overrides.get("city_id", uuid.uuid4())
    t.title = overrides.get("title", "Nashville Highlights")
    t.description = overrides.get("description", "A fun day in Nashville")
    t.share_code = overrides.get("share_code", "ABC12345")
    t.is_public = overrides.get("is_public", False)
    t.estimated_duration_minutes = overrides.get("estimated_duration_minutes", 180)
    t.estimated_budget_cents = overrides.get("estimated_budget_cents", None)
    t.vibe_tags = overrides.get("vibe_tags", ["foodie", "cultural"])
    t.created_at = overrides.get("created_at", datetime.now(timezone.utc))
    t.updated_at = overrides.get("updated_at", datetime.now(timezone.utc))
    t.tasks = [make_template_task(template_id=t.id) for _ in range(num_tasks)]
    t.instances = []
    return t


def make_instance_task(*, instance_id=None, completed=False, **overrides):
    task = MagicMock()
    task.id = overrides.get("id", uuid.uuid4())
    task.instance_id = instance_id or uuid.uuid4()
    task.source_template_task_id = overrides.get("source_template_task_id", uuid.uuid4())
    task.place_id = overrides.get("place_id", "ChIJ123")
    task.provider = overrides.get("provider", "google")
    task.name = overrides.get("name", "Visit the Parthenon")
    task.address = overrides.get("address", "123 Main St")
    task.lat = overrides.get("lat", Decimal("36.1448"))
    task.lng = overrides.get("lng", Decimal("-86.8024"))
    task.place_types = overrides.get("place_types", ["attraction"])
    task.task_description = overrides.get("task_description", "Take a selfie")
    task.verification_hint = overrides.get("verification_hint", "Photo of you there")
    task.verification_type = overrides.get("verification_type", "photo")
    task.notes = overrides.get("notes", None)
    task.created_at = overrides.get("created_at", datetime.now(timezone.utc))
    task.check_in = MagicMock() if completed else None
    return task


def make_instance(*, num_tasks=2, completed_tasks=0, **overrides):
    inst = MagicMock()
    inst.id = overrides.get("id", uuid.uuid4())
    inst.user_id = overrides.get("user_id", uuid.uuid4())
    inst.source_template_id = overrides.get("source_template_id", uuid.uuid4())
    inst.title = overrides.get("title", "Nashville Highlights")
    inst.description = overrides.get("description", "A fun day in Nashville")
    inst.status = overrides.get("status", "active")
    inst.started_at = overrides.get("started_at", None)
    inst.completed_at = overrides.get("completed_at", None)
    inst.created_at = overrides.get("created_at", datetime.now(timezone.utc))
    inst.updated_at = overrides.get("updated_at", datetime.now(timezone.utc))

    tasks = []
    for i in range(num_tasks):
        tasks.append(
            make_instance_task(
                instance_id=inst.id,
                completed=(i < completed_tasks),
            )
        )
    inst.tasks = tasks

    total = len(tasks)
    completed = sum(1 for t in tasks if t.check_in is not None)
    inst.progress = (completed, total)
    inst.is_complete = completed == total and total > 0
    return inst
