"""Route generation endpoints."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.session import get_db
from app.schemas.route_generation import GenerateRouteRequest, GenerateRouteResponse
from app.services.route_service import RouteService

router = APIRouter()


@router.post("/generate", response_model=GenerateRouteResponse)
def generate_route(
    request: GenerateRouteRequest,
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user),
):
    """Generate a personalized route based on user preferences.

    Takes user preferences (city, budget, time, vibe tags, etc.) and uses AI
    to select the best matching tasks from our curated list.

    Returns a new route template with the selected tasks.
    """
    try:
        service = RouteService(db)
        return service.generate_route(request, user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        print(f"Error generating route: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate route: {str(e)}")
