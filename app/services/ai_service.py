"""OpenAI integration for route generation.

NOTE: Current approach sends ALL curated tasks for a city to the AI in one prompt.
This works well for ~100 tasks per city but token costs scale linearly.

FUTURE OPTIMIZATION: Switch to an agent with tools approach where AI can:
- search_tasks(city, category, tags) -> query DB directly
- get_task_details(task_id) -> fetch specific task

This would reduce token usage significantly for cities with 500+ tasks,
as AI would only fetch what it needs rather than receiving everything upfront.
Tradeoff: More API round-trips but lower total token cost.
"""
import json
from typing import Any
from uuid import UUID

from openai import OpenAI

from app.core.config import get_settings


class AIService:
    """Service for AI-powered route generation."""
    
    def __init__(self):
        settings = get_settings()
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model
    
    def select_tasks_for_route(
        self,
        preferences: dict[str, Any],
        available_tasks: list[dict[str, Any]],
    ) -> list[UUID]:
        """Use AI to select the best tasks based on user preferences.
        
        Args:
            preferences: User preferences (budget, vibe_tags, time, etc.)
            available_tasks: List of curated tasks for the city
            
        Returns:
            List of task IDs selected by the AI, in recommended order
        """
        system_prompt = self._build_system_prompt()
        user_message = self._build_user_message(preferences, available_tasks)
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,  # Some creativity but not too random
        )
        
        # Parse the response
        content = response.choices[0].message.content
        result = json.loads(content)
        
        # Extract task IDs from response
        selected_ids = result.get("selected_task_ids", [])
        
        # Convert to UUIDs and validate they exist in available tasks
        valid_task_ids = {str(task["id"]) for task in available_tasks}
        validated_ids = [
            UUID(task_id) 
            for task_id in selected_ids 
            if task_id in valid_task_ids
        ]
        
        # Return both task IDs and the AI-generated title
        ai_title = result.get("route_title", "").strip() or None
        return validated_ids, ai_title
    
    def _build_system_prompt(self) -> str:
        """Build the system prompt for task selection."""
        return """You are a city route planner for GoGoCity, an app that creates personalized city exploration routes.

Your job is to select tasks from a curated list that best match the user's preferences.

Guidelines:
- Select tasks that fit within the user's available time (consider avg_duration_minutes)
- Account for ~15 minutes of travel time between each task when calculating total time
- Match the user's vibe/mood preferences using the task's vibe_tags
- Respect budget constraints using price_level (1=cheap, 4=expensive)
- Respect dietary restrictions using dietary_tags
- Create a balanced, enjoyable route with variety
- Order tasks in a logical flow (but don't worry about physical distance)

For route_title: write a specific, creative, evocative name for this exact route.
Do NOT use generic names like "Nashville Adventure" or "[Vibe] Nashville".
Examples of good titles: "Dive Bars & Downtown Legends", "Hot Chicken & Hidden Gems", "Sunrise to Skyline"

You MUST respond with valid JSON in this exact format:
{
    "selected_task_ids": ["uuid1", "uuid2", "uuid3", ...],
    "route_title": "A specific, creative title for this route"
}

Select enough tasks to fill the available time after accounting for travel. If the user has 4 hours, aim for 4-5 tasks.
Do NOT include any explanation, just the JSON response."""
    
    def _build_user_message(
        self,
        preferences: dict[str, Any],
        available_tasks: list[dict[str, Any]],
    ) -> str:
        """Build the user message with preferences and available tasks."""
        # Format tasks for the AI (only include relevant fields)
        formatted_tasks = []
        for task in available_tasks:
            formatted_task = {
                "id": str(task["id"]),
                "name": task["name"],
                "description": task.get("description"),
                "category": task["category"],
                "vibe_tags": task.get("vibe_tags", []),
                "dietary_tags": task.get("dietary_tags", []),
                "price_level": task.get("price_level"),
                "avg_duration_minutes": task.get("avg_duration_minutes"),
                "task_description": task.get("task_description"),
                "has_location": task.get("lat") is not None,
            }
            formatted_tasks.append(formatted_task)
        
        message = {
            "preferences": {
                "time_available_hours": preferences["time_available_hours"],
                "budget": preferences["budget"],
                "vibe_tags": preferences.get("vibe_tags", []),
                "dietary_restrictions": preferences.get("dietary_restrictions", []),
                "group_size": preferences.get("group_size", 1),
            },
            "available_tasks": formatted_tasks,
        }
        
        return json.dumps(message, indent=2)
    
    def generate_route_title(self, city_name: str, vibe_tags: list[str]) -> str:
        """Generate a catchy title for a route (fallback if AI doesn't provide one)."""
        if vibe_tags:
            primary_vibe = vibe_tags[0].title()
            return f"{primary_vibe} {city_name} Adventure"
        return f"Explore {city_name}"
