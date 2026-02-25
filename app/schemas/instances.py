"""Pydantic schemas for route instances and sharing."""
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Request schemas ──────────────────────────────────────────────────

class ImportTemplateRequest(BaseModel):
    template_id: UUID = Field(..., description="ID of the template to import")


class ImportSharedRouteRequest(BaseModel):
    pass


class UpdateInstanceStatusRequest(BaseModel):
    status: str = Field(..., description="New status: active, completed, or archived")


class UpdateTaskRequest(BaseModel):
    notes: Optional[str] = Field(None, description="User notes for this task")


class TogglePublicRequest(BaseModel):
    is_public: bool = Field(..., description="Whether the template should be public")


# ── Response schemas ─────────────────────────────────────────────────

class InstanceTaskResponse(BaseModel):
    id: UUID
    name: str
    address: str | None = None
    lat: Decimal | None = None
    lng: Decimal | None = None
    task_description: str | None = None
    verification_type: str
    verification_hint: str | None = None
    notes: str | None = None
    is_completed: bool = False

    class Config:
        from_attributes = True


class ProgressResponse(BaseModel):
    completed_tasks: int
    total_tasks: int
    percent: float
    is_complete: bool


class InstanceResponse(BaseModel):
    id: UUID
    title: str
    description: str | None = None
    status: str
    source_template_id: UUID | None = None
    created_at: str
    progress: ProgressResponse
    tasks: list[InstanceTaskResponse]

    class Config:
        from_attributes = True


class InstanceListItem(BaseModel):
    id: UUID
    title: str
    description: str | None = None
    status: str
    source_template_id: UUID | None = None
    created_at: str
    progress: ProgressResponse

    class Config:
        from_attributes = True


class SharedRoutePreview(BaseModel):
    id: UUID
    title: str
    description: str | None = None
    share_code: str | None = None
    estimated_duration_minutes: int | None = None
    vibe_tags: list[str] = []
    tasks: list[InstanceTaskResponse]

    class Config:
        from_attributes = True
