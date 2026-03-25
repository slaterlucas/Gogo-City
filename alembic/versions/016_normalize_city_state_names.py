"""Normalize city state names to abbreviations and country to USA.

Revision ID: 016
Revises: 015
Create Date: 2026-03-25

"""
from typing import Sequence, Union

from alembic import op

revision: str = "016"
down_revision: Union[str, None] = "015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


STATE_FIXES = {
    "Tennessee": "TN",
    "Illinois": "IL",
}


def upgrade() -> None:
    for full, abbr in STATE_FIXES.items():
        op.execute(f"UPDATE cities SET state = '{abbr}' WHERE state = '{full}'")
    op.execute("UPDATE cities SET country = 'USA' WHERE country = 'US'")


def downgrade() -> None:
    pass
