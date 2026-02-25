"""Route generation service - orchestrates AI + database operations."""
import secrets
import string
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import City, CuratedTask, RouteTemplate, TemplateTask
from app.schemas.route_generation import GenerateRouteRequest, GenerateRouteResponse, TaskInRoute
from app.services.ai_service import AIService


class RouteService:
    """Service for generating and managing routes."""
    
    def __init__(self, db: Session):
        self.db = db
        self.ai_service = AIService()
    
    def generate_route(
        self,
        request: GenerateRouteRequest,
        user_id: UUID,
    ) -> GenerateRouteResponse:
        """Generate a personalized route based on user preferences.
        
        Args:
            request: User's preferences for the route
            user_id: ID of the user generating the route
            
        Returns:
            Generated route template with selected tasks
        """
        # 1. Fetch city
        city = self._get_city(request.city_id)
        if not city:
            raise ValueError(f"City not found: {request.city_id}")
        
        # 2. Fetch all active curated tasks for this city
        available_tasks = self._get_curated_tasks(request.city_id)
        if not available_tasks:
            raise ValueError(f"No curated tasks found for city: {city.name}")
        
        # 3. Convert tasks to dict format for AI
        tasks_for_ai = [self._task_to_dict(task) for task in available_tasks]
        
        # 4. Build preferences dict
        preferences = {
            "time_available_hours": request.time_available_hours,
            "budget": request.budget.value,
            "vibe_tags": request.vibe_tags,
            "dietary_restrictions": request.dietary_restrictions,
            "group_size": request.group_size,
        }
        
        # 5. Call AI to select tasks
        selected_task_ids, ai_title = self.ai_service.select_tasks_for_route(
            preferences=preferences,
            available_tasks=tasks_for_ai,
        )
        
        if not selected_task_ids:
            raise ValueError("AI did not select any tasks")
        
        # 6. Get the selected task objects in order
        task_map = {task.id: task for task in available_tasks}
        selected_tasks = [task_map[tid] for tid in selected_task_ids if tid in task_map]
        
        # 7. Use AI title, then custom title, then fallback double check we're not always hitting fallback
        title = request.custom_title or ai_title or self.ai_service.generate_route_title(
            city.name, request.vibe_tags
        )
        
        # 8. Create route template
        template = self._create_route_template(
            user_id=user_id,
            city=city,
            title=title,
            selected_tasks=selected_tasks,
            vibe_tags=request.vibe_tags,
        )
        
        # 9. Build response
        return self._build_response(template, city, selected_tasks)
    
    def _get_city(self, city_id: UUID) -> Optional[City]:
        """Fetch a city by ID."""
        return self.db.get(City, city_id)
    
    def _get_curated_tasks(self, city_id: UUID) -> list[CuratedTask]:
        """Fetch all active curated tasks for a city."""
        stmt = (
            select(CuratedTask)
            .where(CuratedTask.city_id == city_id)
            .where(CuratedTask.is_active == True)
        )
        return list(self.db.scalars(stmt).all())
    
    def _task_to_dict(self, task: CuratedTask) -> dict:
        """Convert a CuratedTask to a dict for AI processing."""
        return {
            "id": task.id,
            "name": task.name,
            "description": task.description,
            "category": task.category,
            "vibe_tags": task.vibe_tags or [],
            "dietary_tags": task.dietary_tags or [],
            "price_level": task.price_level,
            "avg_duration_minutes": task.avg_duration_minutes,
            "task_description": task.task_description,
            "lat": float(task.lat) if task.lat else None,
            "lng": float(task.lng) if task.lng else None,
        }
    
    def _generate_share_code(self, length: int = 8) -> str:
        """Generate a unique share code."""
        chars = string.ascii_uppercase + string.digits
        return "".join(secrets.choice(chars) for _ in range(length))
    
    def _create_route_template(
        self,
        user_id: UUID,
        city: City,
        title: str,
        selected_tasks: list[CuratedTask],
        vibe_tags: list[str],
    ) -> RouteTemplate:
        """Create a route template with its tasks."""
        # Calculate estimated duration with 15min travel buffer between tasks
        task_time = sum(task.avg_duration_minutes or 30 for task in selected_tasks)
        travel_time = 15 * (len(selected_tasks) - 1)
        raw_duration = task_time + travel_time
        # Round to nearest 5 minutes
        total_duration = round(raw_duration / 5) * 5
        
        # Create template
        template = RouteTemplate(
            author_id=user_id,
            city_id=city.id,
            title=title,
            description=f"A personalized route through {city.name}",
            share_code=self._generate_share_code(),
            is_public=False,
            estimated_duration_minutes=total_duration,
            vibe_tags=vibe_tags,
        )
        self.db.add(template)
        self.db.flush()  # Get template ID
        
        # Create template tasks (snapshot from curated tasks)
        for curated_task in selected_tasks:
            template_task = TemplateTask(
                template_id=template.id,
                place_id=curated_task.google_place_id,
                provider="google" if curated_task.google_place_id else "manual",
                name=curated_task.name,
                address=curated_task.address,
                lat=curated_task.lat,
                lng=curated_task.lng,
                place_types=[curated_task.category],
                task_description=curated_task.task_description,
                verification_hint=curated_task.verification_hint,
                verification_type=curated_task.verification_type,
            )
            self.db.add(template_task)
        
        self.db.commit()
        self.db.refresh(template)
        
        return template
    
    def _build_response(
        self,
        template: RouteTemplate,
        city: City,
        selected_tasks: list[CuratedTask],
    ) -> GenerateRouteResponse:
        """Build the API response from created template."""
        task_responses = [
            TaskInRoute(
                id=task.id,
                name=task.name,
                description=task.description,
                address=task.address,
                lat=task.lat,
                lng=task.lng,
                task_description=task.task_description,
                verification_type=task.verification_type,
                verification_hint=task.verification_hint,
                category=task.category,
                price_level=task.price_level,
                avg_duration_minutes=task.avg_duration_minutes,
            )
            for task in selected_tasks
        ]
        
        return GenerateRouteResponse(
            template_id=template.id,
            title=template.title,
            description=template.description,
            city_id=city.id,
            city_name=city.name,
            tasks=task_responses,
            total_tasks=len(selected_tasks),
            estimated_duration_minutes=template.estimated_duration_minutes or 0,
        )
