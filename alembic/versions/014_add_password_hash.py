"""Add password_hash to users table.

Revision ID: 014
Revises: 013
Create Date: 2026-02-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "014"
down_revision: Union[str, None] = "a23f7159c8ba"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Nullable first so existing rows don't violate the constraint, then
    # set a placeholder so we can make it NOT NULL.
    op.add_column("users", sa.Column("password_hash", sa.Text(), nullable=True))
    op.execute("UPDATE users SET password_hash = 'LEGACY_NO_PASSWORD' WHERE password_hash IS NULL")
    op.alter_column("users", "password_hash", nullable=False)


def downgrade() -> None:
    op.drop_column("users", "password_hash")
