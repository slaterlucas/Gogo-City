"""Check-in endpoints for task verification."""
import traceback
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models.checkin import CheckIn
from app.models.route import InstanceTask, RouteInstance
from app.schemas.checkins import CheckInRequest, CheckInResponse
from app.services.verification_service import VerificationService

router = APIRouter()


@router.post("/", response_model=CheckInResponse)
def create_check_in(request: CheckInRequest, db: Session = Depends(get_db)):
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
    if instance.user_id != request.user_id:
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
    
    try:
        check_in = CheckIn(
            instance_task_id=task.id,
            user_id=request.user_id,
            verified_by=result.method,
            lat=request.user_lat,
            lng=request.user_lng,
            photo_url=None,  # TODO: upload photo to S3/Cloudinary and store URL
            notes=request.notes,
            rating=request.rating,
        )
        db.add(check_in)
        db.commit()
        db.refresh(check_in)
        
        _check_auto_complete(db, instance)
        
        return CheckInResponse(
            id=check_in.id,
            instance_task_id=check_in.instance_task_id,
            verified=True,
            verified_by=result.method,
            reason=result.reason,
            lat=check_in.lat,
            lng=check_in.lng,
            task_name=task.name,
        )
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create check-in: {str(e)}")


@router.get("/instance/{instance_id}", response_model=list[CheckInResponse])
def get_instance_check_ins(instance_id: UUID, db: Session = Depends(get_db)):
    """Get all check-ins for a route instance."""
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
def get_instance_progress(instance_id: UUID, db: Session = Depends(get_db)):
    """Get progress for a route instance (completed vs total tasks)."""
    instance = (
        db.query(RouteInstance)
        .options(joinedload(RouteInstance.tasks).joinedload(InstanceTask.check_in))
        .filter(RouteInstance.id == instance_id)
        .first()
    )
    if not instance:
        raise HTTPException(status_code=404, detail="Route instance not found")
    
    total = len(instance.tasks)
    completed = sum(1 for t in instance.tasks if t.check_in is not None)
    
    tasks_detail = [
        {
            "task_id": str(t.id),
            "name": t.name,
            "verification_type": t.verification_type,
            "completed": t.check_in is not None,
            "verified_by": t.check_in.verified_by if t.check_in else None,
        }
        for t in instance.tasks
    ]
    
    return {
        "instance_id": str(instance_id),
        "status": instance.status,
        "completed": completed,
        "total": total,
        "progress_pct": round(completed / total * 100) if total > 0 else 0,
        "tasks": tasks_detail,
    }


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
