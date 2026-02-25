# GoGoCity API Reference

Base URL: `http://localhost:8000/api`

All authenticated endpoints require: `Authorization: Bearer <token>`

---

## Auth

### POST /auth/register
Create a new account.

**Request:**
```json
{
  "email": "user@example.com",
  "username": "explorer1",
  "password": "securepass123",
  "display_name": "Jane Explorer"  // optional
}
```

**Response (201):**
```json
{
  "access_token": "eyJhbG...",
  "token_type": "bearer"
}
```

### POST /auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepass123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbG...",
  "token_type": "bearer"
}
```

---

## Cities

### GET /cities/
List all available cities.

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Nashville",
    "state": "TN",
    "country": "US"
  }
]
```

### GET /cities/{city_id}
Get a single city by ID.

---

## Route Generation

### POST /routes/generate *(auth required)*
Generate an AI-powered route from user preferences.

**Request:**
```json
{
  "city_id": "uuid",
  "time_available_hours": 4.0,
  "budget": "medium",
  "vibe_tags": ["foodie", "cultural"],
  "dietary_restrictions": [],
  "group_size": 2,
  "custom_title": null
}
```

`budget` options: `"low"`, `"medium"`, `"high"`, `"any"`

**Response (200):**
```json
{
  "template_id": "uuid",
  "title": "Dive Bars & Downtown Legends",
  "description": "A personalized route through Nashville",
  "city_id": "uuid",
  "city_name": "Nashville",
  "tasks": [
    {
      "id": "uuid",
      "name": "Prince's Hot Chicken",
      "description": "...",
      "address": "123 Ewing Dr",
      "lat": 36.1745,
      "lng": -86.7678,
      "task_description": "Order at least medium spice",
      "verification_type": "photo",
      "verification_hint": "Photo of your plate",
      "category": "food",
      "price_level": 3,
      "avg_duration_minutes": 45
    }
  ],
  "total_tasks": 5,
  "estimated_duration_minutes": 240
}
```

---

## Templates

### GET /templates/
List all route templates.

**Response (200):** Array of template objects with id, title, description, share_code, is_public, vibe_tags, estimated_duration_minutes.

### DELETE /templates/{template_id}
Delete a route template.

### PATCH /templates/{template_id}
Toggle template public status. Body: `{ "is_public": true }`

---

## Instances

### POST /instances/ *(auth required)*
Create a personal instance from a template.

**Request:**
```json
{
  "template_id": "uuid"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "title": "Dive Bars & Downtown Legends",
  "description": "...",
  "status": "active",
  "source_template_id": "uuid",
  "created_at": "2026-02-25T...",
  "progress": {
    "completed_tasks": 0,
    "total_tasks": 5,
    "percent": 0.0,
    "is_complete": false
  },
  "tasks": [
    {
      "id": "uuid",
      "name": "Prince's Hot Chicken",
      "address": "123 Ewing Dr",
      "lat": 36.1745,
      "lng": -86.7678,
      "task_description": "Order at least medium spice",
      "verification_type": "photo",
      "verification_hint": "Photo of your plate",
      "notes": null,
      "is_completed": false
    }
  ]
}
```

### GET /instances/ *(auth required)*
List all instances for the authenticated user.

**Response (200):** Array of instance summary objects (same as above but without full task list, includes progress).

### GET /instances/{instance_id} *(auth required)*
Get a single instance with all tasks.

### DELETE /instances/{instance_id} *(auth required)*
Delete a route instance.

### PATCH /instances/{instance_id} *(auth required)*
Update instance status.

**Request:**
```json
{
  "status": "archived"
}
```

### PATCH /instances/{instance_id}/tasks/{task_id} *(auth required)*
Update task notes.

**Request:**
```json
{
  "notes": "This was amazing!"
}
```

### DELETE /instances/{instance_id}/tasks/{task_id} *(auth required)*
Remove a task from an instance.

---

## Check-ins

### POST /check-ins/ *(auth required)*
Check in to an instance task. Runs verification based on task type.

**Request:**
```json
{
  "instance_task_id": "uuid",
  "user_lat": 36.1032,
  "user_lng": -86.8173,
  "accuracy_meters": 10,
  "photo_base64": "iVBORw0KGgo...",
  "notes": "Loved it!",
  "rating": 5
}
```

Fields needed by verification type:
- `gps`: user_lat, user_lng, accuracy_meters
- `photo`: photo_base64
- `both`: all of the above

**Response (200) - success:**
```json
{
  "id": "uuid",
  "instance_task_id": "uuid",
  "verified": true,
  "verified_by": "gps",
  "reason": "Within range (14m away, limit is 150m)",
  "lat": 36.1032,
  "lng": -86.8173,
  "task_name": "The Bluebird Cafe",
  "xp_earned": 100,
  "total_xp": 350,
  "level": 2
}
```

**Response (422) - verification failed:**
```json
{
  "detail": {
    "verified": false,
    "method": "gps",
    "reason": "Too far away (7155m, need to be within 150m)"
  }
}
```

**Response (409):** `"Already checked in to this task"`

### GET /check-ins/instance/{instance_id} *(auth required)*
List all check-ins for a route instance.

### GET /check-ins/instance/{instance_id}/progress *(auth required)*
Get detailed progress with XP info.

**Response (200):**
```json
{
  "instance_id": "uuid",
  "status": "active",
  "completed": 3,
  "total": 5,
  "progress_pct": 60,
  "xp_earned": 280,
  "xp_possible": 550,
  "tasks": [
    {
      "task_id": "uuid",
      "name": "Prince's Hot Chicken",
      "verification_type": "photo",
      "xp": 130,
      "completed": true,
      "verified_by": "photo"
    }
  ]
}
```

### GET /check-ins/leaderboard
Global XP leaderboard. No auth required.

**Query params:** `limit` (default 20)

**Response (200):**
```json
[
  {
    "rank": 1,
    "user_id": "uuid",
    "username": "explorer1",
    "display_name": "Jane Explorer",
    "total_xp": 1250,
    "level": 4
  }
]
```

---

## Sharing

### GET /routes/share/{share_code}
Preview a shared route (no auth required).

**Response (200):**
```json
{
  "id": "uuid",
  "title": "...",
  "description": "...",
  "share_code": "abc123",
  "estimated_duration_minutes": 240,
  "vibe_tags": ["foodie", "cultural"],
  "tasks": [...]
}
```

### POST /routes/import/{share_code} *(auth required)*
Import a shared route into a personal instance.

---

## Health

### GET /health
Health check. Returns `{ "status": "ok" }`.
