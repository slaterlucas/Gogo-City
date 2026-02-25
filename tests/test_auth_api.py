"""Tests for POST /auth/register and POST /auth/login, plus token validation."""
import uuid
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.auth import create_access_token, hash_password
from app.db.session import get_db
from app.main import app
from tests.conftest import TEST_USER_ID, auth_headers


# ── Helpers ──────────────────────────────────────────────────────────

def _mock_user(user_id=None, email="test@example.com", username="testuser", password="secret123"):
    user = MagicMock()
    user.id = user_id or TEST_USER_ID
    user.email = email
    user.username = username
    user.password_hash = hash_password(password)
    return user


def _no_auth_client(mock_db) -> TestClient:
    """Client with DB overridden but NO auth override — tests real token validation."""
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides.pop("get_current_user", None)
    return TestClient(app, raise_server_exceptions=False)


# ── Register ─────────────────────────────────────────────────────────

class TestRegister:
    def test_register_success(self, mock_db):
        """New user gets a 201 with an access token."""
        mock_db.query.return_value.filter.return_value.first.return_value = None
        new_user = _mock_user()
        mock_db.refresh.side_effect = lambda u: setattr(u, "id", new_user.id)

        app.dependency_overrides[get_db] = lambda: mock_db
        client = TestClient(app)

        resp = client.post("/api/auth/register", json={
            "email": "new@example.com",
            "username": "newuser",
            "password": "password123",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        app.dependency_overrides.clear()

    def test_register_duplicate_email(self, mock_db):
        """409 when the email is already taken."""
        existing = _mock_user()
        mock_db.query.return_value.filter.return_value.first.return_value = existing

        app.dependency_overrides[get_db] = lambda: mock_db
        client = TestClient(app)

        resp = client.post("/api/auth/register", json={
            "email": "test@example.com",
            "username": "different",
            "password": "password123",
        })
        assert resp.status_code == 409
        assert "Email already registered" in resp.json()["detail"]
        app.dependency_overrides.clear()

    def test_register_duplicate_username(self, mock_db):
        """409 when the username is already taken."""
        # First query (email check) returns None, second (username check) returns user.
        mock_db.query.return_value.filter.return_value.first.side_effect = [None, _mock_user()]

        app.dependency_overrides[get_db] = lambda: mock_db
        client = TestClient(app)

        resp = client.post("/api/auth/register", json={
            "email": "unique@example.com",
            "username": "testuser",
            "password": "password123",
        })
        assert resp.status_code == 409
        assert "Username already taken" in resp.json()["detail"]
        app.dependency_overrides.clear()

    def test_register_password_too_short(self, mock_db):
        """422 from Pydantic validation when password < 8 chars."""
        app.dependency_overrides[get_db] = lambda: mock_db
        client = TestClient(app)

        resp = client.post("/api/auth/register", json={
            "email": "new@example.com",
            "username": "newuser",
            "password": "short",
        })
        assert resp.status_code == 422
        app.dependency_overrides.clear()

    def test_register_invalid_email(self, mock_db):
        """422 when email is not a valid address."""
        app.dependency_overrides[get_db] = lambda: mock_db
        client = TestClient(app)

        resp = client.post("/api/auth/register", json={
            "email": "not-an-email",
            "username": "newuser",
            "password": "password123",
        })
        assert resp.status_code == 422
        app.dependency_overrides.clear()


# ── Login ─────────────────────────────────────────────────────────────

class TestLogin:
    def test_login_success(self, mock_db):
        """Valid credentials return 200 with an access token."""
        user = _mock_user(password="mypassword")
        mock_db.query.return_value.filter.return_value.first.return_value = user

        app.dependency_overrides[get_db] = lambda: mock_db
        client = TestClient(app)

        resp = client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "mypassword",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        app.dependency_overrides.clear()

    def test_login_wrong_password(self, mock_db):
        """401 when the password doesn't match."""
        user = _mock_user(password="correct_password")
        mock_db.query.return_value.filter.return_value.first.return_value = user

        app.dependency_overrides[get_db] = lambda: mock_db
        client = TestClient(app)

        resp = client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "wrong_password",
        })
        assert resp.status_code == 401
        assert "Invalid email or password" in resp.json()["detail"]
        app.dependency_overrides.clear()

    def test_login_unknown_email(self, mock_db):
        """401 when no account exists for the email (same message as wrong password)."""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        app.dependency_overrides[get_db] = lambda: mock_db
        client = TestClient(app)

        resp = client.post("/api/auth/login", json={
            "email": "ghost@example.com",
            "password": "password123",
        })
        assert resp.status_code == 401
        assert "Invalid email or password" in resp.json()["detail"]
        app.dependency_overrides.clear()


# ── Token validation on protected endpoints ───────────────────────────

class TestTokenValidation:
    """Verify that protected endpoints enforce the Bearer token requirement."""

    @pytest.fixture
    def raw_client(self, mock_db):
        """Client with only the DB overridden — real token validation runs."""
        app.dependency_overrides[get_db] = lambda: mock_db
        client = TestClient(app, raise_server_exceptions=False)
        yield client
        app.dependency_overrides.clear()

    def test_no_token_returns_401(self, raw_client):
        resp = raw_client.get("/api/instances/")
        assert resp.status_code == 401

    def test_invalid_token_returns_401(self, raw_client):
        resp = raw_client.get(
            "/api/instances/",
            headers={"Authorization": "Bearer this.is.garbage"},
        )
        assert resp.status_code == 401

    def test_malformed_header_returns_4xx(self, raw_client):
        """Token without 'Bearer' prefix should be rejected (403 or 401 depending on FastAPI version)."""
        token = create_access_token(TEST_USER_ID)
        resp = raw_client.get(
            "/api/instances/",
            headers={"Authorization": token},
        )
        assert resp.status_code in (401, 403)

    def test_valid_token_is_accepted(self, mock_db, raw_client):
        """A real JWT for TEST_USER_ID gets through to the service layer."""
        mock_db.execute.return_value.scalars.return_value.all.return_value = []
        # Use the select-based path that instance service uses
        from unittest.mock import patch as _patch
        with _patch("app.api.routes.instances.InstanceService") as MockSvc:
            MockSvc.return_value.list_instances.return_value = []
            resp = raw_client.get(
                "/api/instances/",
                headers=auth_headers(TEST_USER_ID),
            )
        assert resp.status_code == 200

    def test_token_carries_correct_user_id(self, mock_db, raw_client):
        """The user_id decoded from the token is passed to the service."""
        custom_user_id = uuid.uuid4()
        with patch("app.api.routes.instances.InstanceService") as MockSvc:
            MockSvc.return_value.list_instances.return_value = []
            raw_client.get(
                "/api/instances/",
                headers=auth_headers(custom_user_id),
            )
            MockSvc.return_value.list_instances.assert_called_once_with(custom_user_id)
