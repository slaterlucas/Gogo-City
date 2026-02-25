"""Schemas for check-in endpoints."""
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CheckInRequest(BaseModel):
    """Request to check in to an instance task."""
    
    instance_task_id: UUID = Field(..., description="ID of the instance task to check in to")
    user_id: UUID = Field(..., description="ID of the user (will come from auth later)")
    
    # GPS data (required for gps and both tasks)
    user_lat: Optional[float] = Field(None, description="User's current latitude")
    user_lng: Optional[float] = Field(None, description="User's current longitude")
    accuracy_meters: Optional[float] = Field(None, description="GPS accuracy in meters")
    
    # Photo data (required for photo and both tasks)
    photo_base64: Optional[str] = Field(None, description="Base64-encoded photo for verification")
    
    # Optional user input
    notes: Optional[str] = Field(None, max_length=1000)
    rating: Optional[int] = Field(None, ge=1, le=5, description="1-5 star rating")


class CheckInResponse(BaseModel):
    """Response after a check-in attempt."""
    
    id: UUID
    instance_task_id: UUID
    verified: bool
    verified_by: str
    reason: str
    
    # Location at check-in
    lat: Optional[Decimal] = None
    lng: Optional[Decimal] = None
    
    # Task info
    task_name: str
    
    class Config:
        from_attributes = True
