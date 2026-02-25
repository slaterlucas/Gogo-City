"""Route template endpoints."""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.session import get_db
from app.models import RouteTemplate, TemplateTask
from app.schemas.instances import TogglePublicRequest
from app.services.instance_service import InstanceService

router = APIRouter()


class TaskResponse(BaseModel):
    id: UUID
    name: str
    address: str | None
    task_description: str | None
    verification_type: str

    class Config:
        from_attributes = True


class TemplateResponse(BaseModel):
    id: UUID
    title: str
    description: str | None
    share_code: str | None
    is_public: bool = False
    estimated_duration_minutes: int | None
    vibe_tags: list[str]
    created_at: str
    tasks: list[TaskResponse]

    class Config:
        from_attributes = True


def _template_response(t) -> TemplateResponse:
    return TemplateResponse(
        id=t.id,
        title=t.title,
        description=t.description,
        share_code=t.share_code,
        is_public=t.is_public,
        estimated_duration_minutes=t.estimated_duration_minutes,
        vibe_tags=t.vibe_tags or [],
        created_at=t.created_at.isoformat(),
        tasks=[
            TaskResponse(
                id=task.id,
                name=task.name,
                address=task.address,
                task_description=task.task_description,
                verification_type=task.verification_type,
            )
            for task in t.tasks
        ],
    )


@router.get("/", response_model=list[TemplateResponse])
def list_templates(db: Session = Depends(get_db)):
    """List all route templates."""
    templates = db.query(RouteTemplate).order_by(RouteTemplate.created_at.desc()).all()
    return [_template_response(t) for t in templates]


@router.get("/public", response_model=list[TemplateResponse])
def list_public_templates(
    city_id: Optional[UUID] = None,
    vibe_tags: Optional[list[str]] = Query(None),
    db: Session = Depends(get_db),
):
    """List all public templates, with optional filtering by city and vibe tags."""
    svc = InstanceService(db)
    templates = svc.list_public_templates(city_id=city_id, vibe_tags=vibe_tags)
    return [_template_response(t) for t in templates]


@router.patch("/{template_id}", response_model=TemplateResponse)
def toggle_template_public(
    template_id: UUID,
    body: TogglePublicRequest,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user),
):
    """Toggle is_public on a template (author only)."""
    svc = InstanceService(db)
    template = svc.toggle_public(template_id, user_id, body.is_public)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found or not authorized")
    return _template_response(template)


@router.delete("/{template_id}")
def delete_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user),
):
    """Delete a route template (author only)."""
    template = (
        db.query(RouteTemplate)
        .filter(RouteTemplate.id == template_id, RouteTemplate.author_id == user_id)
        .first()
    )
    if template:
        db.delete(template)
        db.commit()
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Template not found or not authorized")
