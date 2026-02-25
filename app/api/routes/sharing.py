"""Sharing endpoints: preview a shared route and import it."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.session import get_db
from app.schemas.instances import (
    InstanceResponse,
    InstanceTaskResponse,
    ProgressResponse,
    SharedRoutePreview,
)
from app.services.instance_service import InstanceService

router = APIRouter()


@router.get("/share/{share_code}", response_model=SharedRoutePreview)
def preview_shared_route(share_code: str, db: Session = Depends(get_db)):
    """Preview a shared route by its share code (no auth required)."""
    svc = InstanceService(db)
    template = svc.preview_shared_route(share_code)
    if not template:
        raise HTTPException(status_code=404, detail="Shared route not found")

    return SharedRoutePreview(
        id=template.id,
        title=template.title,
        description=template.description,
        share_code=template.share_code,
        estimated_duration_minutes=template.estimated_duration_minutes,
        vibe_tags=template.vibe_tags or [],
        tasks=[
            InstanceTaskResponse(
                id=t.id,
                name=t.name,
                address=t.address,
                lat=t.lat,
                lng=t.lng,
                task_description=t.task_description,
                verification_type=t.verification_type,
                verification_hint=t.verification_hint,
                notes=t.notes,
                is_completed=False,
            )
            for t in template.tasks
        ],
    )


@router.post("/import/{share_code}", response_model=InstanceResponse, status_code=201)
def import_shared_route(
    share_code: str,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user),
):
    """Import a shared route into the authenticated user's account."""
    svc = InstanceService(db)
    try:
        instance = svc.import_shared_route(share_code, user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    completed, total = instance.progress
    return InstanceResponse(
        id=instance.id,
        title=instance.title,
        description=instance.description,
        status=instance.status,
        source_template_id=instance.source_template_id,
        created_at=instance.created_at.isoformat(),
        progress=ProgressResponse(
            completed_tasks=completed,
            total_tasks=total,
            percent=round(completed / total * 100, 1) if total else 0.0,
            is_complete=instance.is_complete,
        ),
        tasks=[
            InstanceTaskResponse(
                id=t.id,
                name=t.name,
                address=t.address,
                lat=t.lat,
                lng=t.lng,
                task_description=t.task_description,
                verification_type=t.verification_type,
                verification_hint=t.verification_hint,
                notes=t.notes,
                is_completed=t.check_in is not None,
            )
            for t in instance.tasks
        ],
    )
