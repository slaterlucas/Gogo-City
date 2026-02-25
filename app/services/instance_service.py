"""Service for route instance management: importing, snapshotting, progress, sharing."""
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import RouteInstance, RouteTemplate, InstanceTask, TemplateTask

VALID_STATUSES = {"active", "completed", "archived"}


class InstanceService:
    def __init__(self, db: Session):
        self.db = db

    # ── Instance CRUD ────────────────────────────────────────────────

    def import_template(self, template_id: UUID, user_id: UUID) -> RouteInstance:
        """Import a template into a personal route instance with snapshotted tasks."""
        template = (
            self.db.query(RouteTemplate)
            .options(joinedload(RouteTemplate.tasks))
            .filter(RouteTemplate.id == template_id)
            .first()
        )
        if not template:
            raise ValueError(f"Template not found: {template_id}")

        instance = RouteInstance(
            user_id=user_id,
            source_template_id=template.id,
            title=template.title,
            description=template.description,
            status="active",
        )
        self.db.add(instance)
        self.db.flush()

        for tt in template.tasks:
            self._snapshot_task(instance.id, tt)

        self.db.commit()
        self.db.refresh(instance)
        return instance

    def list_instances(self, user_id: UUID) -> list[RouteInstance]:
        """List all route instances for a user, newest first."""
        stmt = (
            select(RouteInstance)
            .options(joinedload(RouteInstance.tasks))
            .where(RouteInstance.user_id == user_id)
            .order_by(RouteInstance.created_at.desc())
        )
        return list(self.db.execute(stmt).scalars().unique().all())

    def get_instance(self, instance_id: UUID, user_id: UUID) -> RouteInstance | None:
        """Get a single instance with tasks, scoped to the owning user."""
        stmt = (
            select(RouteInstance)
            .options(
                joinedload(RouteInstance.tasks).joinedload(InstanceTask.check_in)
            )
            .where(RouteInstance.id == instance_id, RouteInstance.user_id == user_id)
        )
        return self.db.execute(stmt).scalars().unique().first()

    def delete_instance(self, instance_id: UUID, user_id: UUID) -> bool:
        """Delete a route instance. Returns True if deleted, False if not found."""
        instance = self.get_instance(instance_id, user_id)
        if not instance:
            return False
        self.db.delete(instance)
        self.db.commit()
        return True

    def update_status(self, instance_id: UUID, user_id: UUID, new_status: str) -> RouteInstance | None:
        """Update instance status (active/completed/archived). Returns None if not found."""
        if new_status not in VALID_STATUSES:
            raise ValueError(f"Invalid status: {new_status}. Must be one of {VALID_STATUSES}")
        instance = self.get_instance(instance_id, user_id)
        if not instance:
            return None
        instance.status = new_status
        if new_status == "completed":
            instance.completed_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(instance)
        return instance

    def check_auto_complete(self, instance: RouteInstance) -> RouteInstance:
        """If all tasks are checked in, auto-mark instance as completed."""
        if instance.is_complete and instance.status == "active":
            instance.status = "completed"
            instance.completed_at = datetime.now(timezone.utc)
            self.db.commit()
            self.db.refresh(instance)
        return instance

    def get_progress(self, instance: RouteInstance) -> dict:
        """Return progress stats for an instance."""
        completed, total = instance.progress
        return {
            "completed_tasks": completed,
            "total_tasks": total,
            "percent": round(completed / total * 100, 1) if total else 0.0,
            "is_complete": instance.is_complete,
        }

    # ── Task editing ─────────────────────────────────────────────────

    def get_instance_task(
        self, instance_id: UUID, task_id: UUID, user_id: UUID
    ) -> InstanceTask | None:
        """Fetch a single task, verifying instance ownership."""
        instance = self.get_instance(instance_id, user_id)
        if not instance:
            return None
        for task in instance.tasks:
            if task.id == task_id:
                return task
        return None

    def update_task(
        self,
        instance_id: UUID,
        task_id: UUID,
        user_id: UUID,
        *,
        notes: Optional[str] = ...,
        sort_order: Optional[int] = None,
    ) -> InstanceTask | None:
        """Update notes or sort_order on an instance task. Returns None if not found."""
        task = self.get_instance_task(instance_id, task_id, user_id)
        if not task:
            return None
        if notes is not ...:
            task.notes = notes
        self.db.commit()
        self.db.refresh(task)
        return task

    def delete_task(self, instance_id: UUID, task_id: UUID, user_id: UUID) -> bool:
        """Remove a task from an instance. Returns True if deleted."""
        task = self.get_instance_task(instance_id, task_id, user_id)
        if not task:
            return False
        self.db.delete(task)
        self.db.commit()
        return True

    # ── Sharing ──────────────────────────────────────────────────────

    def preview_shared_route(self, share_code: str) -> RouteTemplate | None:
        """Look up a template by share_code for preview (read-only)."""
        stmt = (
            select(RouteTemplate)
            .options(joinedload(RouteTemplate.tasks))
            .where(RouteTemplate.share_code == share_code)
        )
        return self.db.execute(stmt).scalars().unique().first()

    def import_shared_route(self, share_code: str, user_id: UUID) -> RouteInstance:
        """Import a shared route into the user's account as an independent instance."""
        template = self.preview_shared_route(share_code)
        if not template:
            raise ValueError(f"No route found for share code: {share_code}")
        return self.import_template(template.id, user_id)

    # ── Template discovery ───────────────────────────────────────────

    def list_public_templates(
        self,
        *,
        city_id: Optional[UUID] = None,
        vibe_tags: Optional[list[str]] = None,
    ) -> list[RouteTemplate]:
        """List public templates with optional filtering by city and vibe tags."""
        stmt = (
            select(RouteTemplate)
            .options(joinedload(RouteTemplate.tasks))
            .where(RouteTemplate.is_public == True)  # noqa: E712
        )
        if city_id is not None:
            stmt = stmt.where(RouteTemplate.city_id == city_id)
        if vibe_tags:
            for tag in vibe_tags:
                stmt = stmt.where(RouteTemplate.vibe_tags.any(tag))
        stmt = stmt.order_by(RouteTemplate.created_at.desc())
        return list(self.db.execute(stmt).scalars().unique().all())

    def toggle_public(self, template_id: UUID, user_id: UUID, is_public: bool) -> RouteTemplate | None:
        """Toggle is_public on a template, scoped to the author."""
        template = (
            self.db.query(RouteTemplate)
            .filter(RouteTemplate.id == template_id, RouteTemplate.author_id == user_id)
            .first()
        )
        if not template:
            return None
        template.is_public = is_public
        self.db.commit()
        self.db.refresh(template)
        return template

    # ── Private helpers ──────────────────────────────────────────────

    def _snapshot_task(self, instance_id: UUID, tt: TemplateTask) -> InstanceTask:
        """Copy a template task into an instance task (snapshot)."""
        it = InstanceTask(
            instance_id=instance_id,
            source_template_task_id=tt.id,
            place_id=tt.place_id,
            provider=tt.provider,
            name=tt.name,
            address=tt.address,
            lat=tt.lat,
            lng=tt.lng,
            place_types=list(tt.place_types) if tt.place_types else [],
            task_description=tt.task_description,
            verification_hint=tt.verification_hint,
            verification_type=tt.verification_type,
            xp=tt.xp,
            notes=tt.notes,
        )
        self.db.add(it)
        return it
