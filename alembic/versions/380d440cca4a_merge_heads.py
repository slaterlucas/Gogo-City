"""merge_heads

Revision ID: 380d440cca4a
Revises: 014, a23f7159c8ba
Create Date: 2026-02-25 11:19:40.709725

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '380d440cca4a'
down_revision: Union[str, None] = ('014', 'a23f7159c8ba')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
