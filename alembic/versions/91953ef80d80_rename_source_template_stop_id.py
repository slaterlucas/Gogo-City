"""rename_source_template_stop_id

Revision ID: 91953ef80d80
Revises: 380d440cca4a
Create Date: 2026-02-25 11:20:17.637067

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '91953ef80d80'
down_revision: Union[str, None] = '380d440cca4a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('instance_tasks', 'source_template_stop_id',
                    new_column_name='source_template_task_id')


def downgrade() -> None:
    op.alter_column('instance_tasks', 'source_template_task_id',
                    new_column_name='source_template_stop_id')
