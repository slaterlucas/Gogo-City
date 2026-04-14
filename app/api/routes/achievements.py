"""Achievements endpoint — computed on the fly from existing data."""
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import func, distinct
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.session import get_db
from app.models.checkin import CheckIn
from app.models.route import RouteInstance, RouteTemplate
from app.models.user import User, xp_to_level

router = APIRouter()

ACHIEVEMENTS = [
    # ── Check-in milestones ──
    {
        "id": "first_steps",
        "name": "First Steps",
        "description": "Complete your first check-in",
        "icon": "👣",
        "category": "checkins",
        "threshold": 1,
    },
    {
        "id": "getting_started",
        "name": "Getting Started",
        "description": "Complete 5 check-ins",
        "icon": "🚶",
        "category": "checkins",
        "threshold": 5,
    },
    {
        "id": "explorer",
        "name": "Explorer",
        "description": "Complete 10 check-ins",
        "icon": "🧭",
        "category": "checkins",
        "threshold": 10,
    },
    {
        "id": "adventurer",
        "name": "Adventurer",
        "description": "Complete 25 check-ins",
        "icon": "🏔️",
        "category": "checkins",
        "threshold": 25,
    },
    {
        "id": "pathfinder",
        "name": "Pathfinder",
        "description": "Complete 50 check-ins",
        "icon": "🗺️",
        "category": "checkins",
        "threshold": 50,
    },
    {
        "id": "legend",
        "name": "Legend",
        "description": "Complete 100 check-ins",
        "icon": "⭐",
        "category": "checkins",
        "threshold": 100,
    },
    # ── Quest completion ──
    {
        "id": "quest_rookie",
        "name": "Quest Rookie",
        "description": "Complete your first quest",
        "icon": "🏁",
        "category": "quests",
        "threshold": 1,
    },
    {
        "id": "quest_pro",
        "name": "Quest Pro",
        "description": "Complete 3 quests",
        "icon": "🎯",
        "category": "quests",
        "threshold": 3,
    },
    {
        "id": "quest_master",
        "name": "Quest Master",
        "description": "Complete 10 quests",
        "icon": "👑",
        "category": "quests",
        "threshold": 10,
    },
    # ── XP / Level milestones ──
    {
        "id": "xp_newcomer",
        "name": "Rising Star",
        "description": "Reach Level 2",
        "icon": "🌱",
        "category": "xp",
        "threshold": 2,
    },
    {
        "id": "xp_rising",
        "name": "On Fire",
        "description": "Reach Level 5",
        "icon": "🔥",
        "category": "xp",
        "threshold": 5,
    },
    {
        "id": "xp_elite",
        "name": "Elite",
        "description": "Reach Level 8",
        "icon": "💎",
        "category": "xp",
        "threshold": 8,
    },
    {
        "id": "xp_legend",
        "name": "Max Level",
        "description": "Reach Level 10",
        "icon": "🏆",
        "category": "xp",
        "threshold": 10,
    },
    # ── Photo verification ──
    {
        "id": "shutterbug",
        "name": "Shutterbug",
        "description": "Complete 5 photo-verified check-ins",
        "icon": "📸",
        "category": "photos",
        "threshold": 5,
    },
    {
        "id": "paparazzi",
        "name": "Paparazzi",
        "description": "Complete 20 photo-verified check-ins",
        "icon": "🎥",
        "category": "photos",
        "threshold": 20,
    },
    # ── Multi-city ──
    {
        "id": "city_hopper",
        "name": "City Hopper",
        "description": "Complete quests in 2 different cities",
        "icon": "✈️",
        "category": "cities",
        "threshold": 2,
    },
    {
        "id": "globetrotter",
        "name": "Globetrotter",
        "description": "Complete quests in 5 different cities",
        "icon": "🌍",
        "category": "cities",
        "threshold": 5,
    },
    # ── Special ──
    {
        "id": "critic",
        "name": "Critic",
        "description": "Rate 10 tasks",
        "icon": "📝",
        "category": "special",
        "threshold": 10,
    },
    {
        "id": "speed_runner",
        "name": "Speed Runner",
        "description": "Complete a quest within 4 hours of starting",
        "icon": "⚡",
        "category": "special",
        "threshold": 1,
    },
]


def _compute_stats(db: Session, user_id: UUID) -> dict:
    """Gather all stats needed to evaluate achievements in minimal queries."""
    checkin_count = (
        db.query(func.count(CheckIn.id))
        .filter(CheckIn.user_id == user_id)
        .scalar()
    ) or 0

    completed_quests = (
        db.query(func.count(RouteInstance.id))
        .filter(RouteInstance.user_id == user_id, RouteInstance.status == "completed")
        .scalar()
    ) or 0

    user = db.query(User).filter(User.id == user_id).first()
    total_xp = user.total_xp if user else 0
    level = xp_to_level(total_xp)

    photo_checkins = (
        db.query(func.count(CheckIn.id))
        .filter(
            CheckIn.user_id == user_id,
            CheckIn.verified_by.in_(["photo", "both"]),
        )
        .scalar()
    ) or 0

    distinct_cities = (
        db.query(func.count(distinct(RouteTemplate.city_id)))
        .join(RouteInstance, RouteInstance.source_template_id == RouteTemplate.id)
        .filter(
            RouteInstance.user_id == user_id,
            RouteInstance.status == "completed",
            RouteTemplate.city_id.isnot(None),
        )
        .scalar()
    ) or 0

    rated_checkins = (
        db.query(func.count(CheckIn.id))
        .filter(CheckIn.user_id == user_id, CheckIn.rating.isnot(None))
        .scalar()
    ) or 0

    speed_runs = (
        db.query(func.count(RouteInstance.id))
        .filter(
            RouteInstance.user_id == user_id,
            RouteInstance.status == "completed",
            RouteInstance.started_at.isnot(None),
            RouteInstance.completed_at.isnot(None),
            func.extract("epoch", RouteInstance.completed_at - RouteInstance.started_at) <= 4 * 3600,
        )
        .scalar()
    ) or 0

    return {
        "checkins": checkin_count,
        "quests": completed_quests,
        "level": level,
        "photo_checkins": photo_checkins,
        "cities": distinct_cities,
        "rated_checkins": rated_checkins,
        "speed_runs": speed_runs,
    }


def _stat_key_for(category: str) -> str:
    return {
        "checkins": "checkins",
        "quests": "quests",
        "xp": "level",
        "photos": "photo_checkins",
        "cities": "cities",
        "special": None,
    }.get(category, category)


@router.get("/")
def get_achievements(
    db: Session = Depends(get_db),
    user_id: UUID = Depends(get_current_user),
):
    stats = _compute_stats(db, user_id)

    result = []
    for ach in ACHIEVEMENTS:
        cat = ach["category"]
        threshold = ach["threshold"]

        if ach["id"] == "speed_runner":
            current = stats["speed_runs"]
        elif ach["id"] == "critic":
            current = stats["rated_checkins"]
        else:
            key = _stat_key_for(cat)
            current = stats.get(key, 0) if key else 0

        unlocked = current >= threshold
        progress = min(current, threshold)

        result.append({
            "id": ach["id"],
            "name": ach["name"],
            "description": ach["description"],
            "icon": ach["icon"],
            "category": cat,
            "unlocked": unlocked,
            "progress": progress,
            "threshold": threshold,
        })

    unlocked_count = sum(1 for a in result if a["unlocked"])

    return {
        "achievements": result,
        "unlocked": unlocked_count,
        "total": len(result),
    }
