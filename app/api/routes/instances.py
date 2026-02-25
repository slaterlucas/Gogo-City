"""Route instance endpoints: CRUD for instances and their tasks."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.session import get_db
from app.schemas.instances import (
    ImportTemplateRequest,
    InstanceListItem,
    InstanceResponse,
    InstanceTaskResponse,
    ProgressResponse,
    UpdateInstanceStatusRequest,
    UpdateTaskRequest,
)
from app.services.instance_service import InstanceService

router = APIRouter()


def _progress(instance) -> ProgressResponse:
    completed, total = instance.progress
    return ProgressResponse(
        completed_tasks=completed,
        total_tasks=total,
        percent=round(completed / total * 100, 1) if total else 0.0,
        is_complete=instance.is_complete,
    )


def _task_response(task) -> InstanceTaskResponse:
    return InstanceTaskResponse(
        id=task.id,
        name=task.name,
        address=task.address,
        lat=task.lat,
        lng=task.lng,
        task_description=task.task_description,
        verification_type=task.verification_type,
        verification_hint=task.verification_hint,
        notes=task.notes,
        is_completed=task.check_in is not None,
    )


def _instance_response(instance) -> InstanceResponse:
    return InstanceResponse(
        id=instance.id,
        title=instance.title,
        description=instance.description,
        status=instance.status,
        source_template_id=instance.source_template_id,
        created_at=instance.created_at.isoformat(),
        progress=_progress(instance),
        tasks=[_task_response(t) for t in instance.tasks],
    )


@router.post("/", response_model=InstanceResponse, status_code=201)
def create_instance(
    body: ImportTemplateRequest,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user),
):
    """Import a template into a personal route instance."""
    svc = InstanceService(db)
    try:
        instance = svc.import_template(body.template_id, user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return _instance_response(instance)


@router.get("/", response_model=list[InstanceListItem])
def list_instances(
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user),
):
    """List all route instances for the authenticated user."""
    svc = InstanceService(db)
    instances = svc.list_instances(user_id)
    return [
        InstanceListItem(
            id=inst.id,
            title=inst.title,
            description=inst.description,
            status=inst.status,
            source_template_id=inst.source_template_id,
            created_at=inst.created_at.isoformat(),
            progress=_progress(inst),
        )
        for inst in instances
    ]


@router.get("/{instance_id}", response_model=InstanceResponse)
def get_instance(
    instance_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user),
):
    """Get a single route instance with tasks and progress."""
    svc = InstanceService(db)
    instance = svc.get_instance(instance_id, user_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    return _instance_response(instance)


@router.delete("/{instance_id}")
def delete_instance(
    instance_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user),
):
    """Delete a route instance."""
    svc = InstanceService(db)
    if not svc.delete_instance(instance_id, user_id):
        raise HTTPException(status_code=404, detail="Instance not found")
    return {"status": "deleted"}


@router.patch("/{instance_id}", response_model=InstanceResponse)
def update_instance_status(
    instance_id: UUID,
    body: UpdateInstanceStatusRequest,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user),
):
    """Update an instance's status (active, completed, archived)."""
    svc = InstanceService(db)
    try:
        instance = svc.update_status(instance_id, user_id, body.status)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    return _instance_response(instance)


# ── Task-level endpoints ────────────────────────────────────────────

@router.patch("/{instance_id}/tasks/{task_id}", response_model=InstanceTaskResponse)
def update_task(
    instance_id: UUID,
    task_id: UUID,
    body: UpdateTaskRequest,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user),
):
    """Update notes on an instance task."""
    svc = InstanceService(db)
    task = svc.update_task(instance_id, task_id, user_id, notes=body.notes)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _task_response(task)


@router.delete("/{instance_id}/tasks/{task_id}")
def delete_task(
    instance_id: UUID,
    task_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user),
):
    """Remove a task from an instance."""
    svc = InstanceService(db)
    if not svc.delete_task(instance_id, task_id, user_id):
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "deleted"}
