"""Check-in endpoints for task verification."""
import traceback
from uuid import UUID

import cloudinary
import cloudinary.uploader
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.auth import get_current_user
from app.db.session import get_db
from app.models.checkin import CheckIn
from app.models.route import InstanceTask, RouteInstance
from app.models.user import User, xp_to_level
from app.core.config import get_settings
from app.schemas.checkins import CheckInRequest, CheckInResponse
from app.services.verification_service import VerificationService

router = APIRouter()

# Configure Cloudinary explicitly on module load
_settings = get_settings()
if _settings.cloudinary_url:
    _c = urlparse(_settings.cloudinary_url)
    cloudinary.config(cloud_name=_c.hostname, api_key=_c.username, api_secret=_c.password)


@router.post("/", response_model=CheckInResponse)
def create_check_in(
    request: CheckInRequest,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user),
):
    """Attempt to check in to an instance task. Runs verification based on the task type."""

    task = (
        db.query(InstanceTask)
        .options(joinedload(InstanceTask.check_in))
        .filter(InstanceTask.id == request.instance_task_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Instance task not found")

    if task.check_in is not None:
        raise HTTPException(status_code=409, detail="Already checked in to this task")

    instance = db.query(RouteInstance).filter(RouteInstance.id == task.instance_id).first()
    if not instance:
        raise HTTPException(status_code=404, detail="Route instance not found")
    if instance.user_id != user_id:
        raise HTTPException(status_code=403, detail="This is not your route instance")

    verification = VerificationService()
    result = verification.verify(
        verification_type=task.verification_type,
        task_name=task.name,
        task_description=task.task_description,
        task_lat=task.lat,
        task_lng=task.lng,
        user_lat=request.user_lat,
        user_lng=request.user_lng,
        accuracy_meters=request.accuracy_meters,
        photo_base64=request.photo_base64,
    )

    if not result.passed:
        raise HTTPException(
            status_code=422,
            detail={
                "verified": False,
                "method": result.method,
                "reason": result.reason,
            },
        )

    photo_url = None
    if request.photo_base64:
        try:
            upload_result = cloudinary.uploader.upload(
                request.photo_base64,
                folder="gogocity/checkins",
                public_id=str(request.instance_task_id),
                overwrite=True,
            )
            photo_url = upload_result["secure_url"]
        except Exception as e:
            print(f"Cloudinary upload failed (non-fatal): {e}")

    try:
        check_in = CheckIn(
            instance_task_id=task.id,
            user_id=user_id,
            verified_by=result.method,
            lat=request.user_lat,
            lng=request.user_lng,
            photo_url=photo_url,
            notes=request.notes,
            rating=request.rating,
        )
        db.add(check_in)

        xp_earned = task.xp
        user = db.query(User).filter(User.id == user_id).first()
        if user and xp_earned > 0:
            user.total_xp += xp_earned

        db.commit()
        db.refresh(check_in)

        _check_auto_complete(db, instance)

        new_total = user.total_xp if user else 0
        return CheckInResponse(
            id=check_in.id,
            instance_task_id=check_in.instance_task_id,
            verified=True,
            verified_by=result.method,
            reason=result.reason,
            lat=check_in.lat,
            lng=check_in.lng,
            task_name=task.name,
            xp_earned=xp_earned,
            total_xp=new_total,
            level=xp_to_level(new_total),
        )
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create check-in: {str(e)}")


@router.get("/instance/{instance_id}", response_model=list[CheckInResponse])
def get_instance_check_ins(
    instance_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user),
):
    """Get all check-ins for a route instance."""
    instance = db.query(RouteInstance).filter(RouteInstance.id == instance_id).first()
    if not instance:
        raise HTTPException(status_code=404, detail="Route instance not found")
    if instance.user_id != user_id:
        raise HTTPException(status_code=403, detail="This is not your route instance")

    check_ins = (
        db.query(CheckIn)
        .join(InstanceTask)
        .filter(InstanceTask.instance_id == instance_id)
        .all()
    )
    return [
        CheckInResponse(
            id=ci.id,
            instance_task_id=ci.instance_task_id,
            verified=True,
            verified_by=ci.verified_by or "unknown",
            reason="Previously verified",
            lat=ci.lat,
            lng=ci.lng,
            task_name=ci.instance_task.name if ci.instance_task else "Unknown",
        )
        for ci in check_ins
    ]


@router.get("/instance/{instance_id}/progress")
def get_instance_progress(
    instance_id: UUID,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user),
):
    """Get progress for a route instance (completed vs total tasks)."""
    instance = (
        db.query(RouteInstance)
        .options(joinedload(RouteInstance.tasks).joinedload(InstanceTask.check_in))
        .filter(RouteInstance.id == instance_id)
        .first()
    )
    if not instance:
        raise HTTPException(status_code=404, detail="Route instance not found")
    if instance.user_id != user_id:
        raise HTTPException(status_code=403, detail="This is not your route instance")

    total = len(instance.tasks)
    completed = sum(1 for t in instance.tasks if t.check_in is not None)

    xp_earned = sum(t.xp for t in instance.tasks if t.check_in is not None)
    xp_possible = sum(t.xp for t in instance.tasks)

    tasks_detail = [
        {
            "task_id": str(t.id),
            "name": t.name,
            "verification_type": t.verification_type,
            "xp": t.xp,
            "completed": t.check_in is not None,
            "verified_by": t.check_in.verified_by if t.check_in else None,
            "photo_url": t.check_in.photo_url if t.check_in else None,
            "checked_in_at": t.check_in.checked_in_at.isoformat() if t.check_in else None,
        }
        for t in instance.tasks
    ]

    return {
        "instance_id": str(instance_id),
        "status": instance.status,
        "completed": completed,
        "total": total,
        "progress_pct": round(completed / total * 100) if total > 0 else 0,
        "xp_earned": xp_earned,
        "xp_possible": xp_possible,
        "tasks": tasks_detail,
    }


@router.get("/leaderboard")
def get_leaderboard(
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """Global XP leaderboard."""
    users = (
        db.query(User)
        .filter(User.total_xp > 0)
        .order_by(User.total_xp.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "rank": i + 1,
            "user_id": str(u.id),
            "username": u.username,
            "display_name": u.display_name or u.username,
            "total_xp": u.total_xp,
            "level": xp_to_level(u.total_xp),
        }
        for i, u in enumerate(users)
    ]


def _check_auto_complete(db: Session, instance: RouteInstance):
    """Auto-complete the route instance if all tasks are checked in."""
    db.refresh(instance, ["tasks"])
    for task in instance.tasks:
        db.refresh(task, ["check_in"])

    if instance.is_complete and instance.status == "active":
        instance.status = "completed"
        from datetime import datetime, timezone
        instance.completed_at = datetime.now(timezone.utc)
        db.commit()
