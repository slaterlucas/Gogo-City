"""Cities endpoints."""
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import City

router = APIRouter()


class CityResponse(BaseModel):
    id: UUID
    name: str
    state: str | None
    country: str
    
    class Config:
        from_attributes = True


@router.get("/", response_model=list[CityResponse])
def list_cities(db: Session = Depends(get_db)):
    """List all available cities."""
    cities = db.query(City).order_by(City.name).all()
    return cities


@router.get("/{city_id}", response_model=CityResponse)
def get_city(city_id: UUID, db: Session = Depends(get_db)):
    """Get a single city by ID."""
    city = db.query(City).filter(City.id == city_id).first()
    if not city:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="City not found")
    return city
