"""Verification service for check-ins: GPS, photo AI, and both."""
import base64
import json
from decimal import Decimal
from math import atan2, cos, radians, sin, sqrt
from typing import Optional

from openai import OpenAI

from app.core.config import get_settings

GPS_RADIUS_STRICT = 150      # meters - for gps-only tasks
GPS_RADIUS_LENIENT = 350     # meters - for "both" tasks
MIN_ACCURACY_METERS = 500    # reject if GPS accuracy is worse than this


class VerificationResult:
    """Result of a verification check."""
    
    def __init__(self, passed: bool, method: str, reason: str):
        self.passed = passed
        self.method = method   # "gps", "photo", "both"
        self.reason = reason


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distance in meters between two lat/lng points."""
    R = 6371000
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


class VerificationService:
    """Handles GPS and photo verification for check-ins."""
    
    def __init__(self):
        settings = get_settings()
        self.client = OpenAI(api_key=settings.openai_api_key)
    
    def verify(
        self,
        verification_type: str,
        task_name: str,
        task_description: Optional[str],
        task_lat: Optional[Decimal],
        task_lng: Optional[Decimal],
        user_lat: Optional[float],
        user_lng: Optional[float],
        accuracy_meters: Optional[float],
        photo_base64: Optional[str],
    ) -> VerificationResult:
        """Run verification based on the task's verification_type.
        
        Returns a VerificationResult with passed/failed and reason.
        """
        if verification_type == "gps":
            return self._verify_gps(
                task_lat, task_lng, user_lat, user_lng,
                accuracy_meters, GPS_RADIUS_STRICT,
            )
        
        elif verification_type == "photo":
            return self._verify_photo(task_name, task_description, photo_base64)
        
        elif verification_type == "both":
            gps_result = self._verify_gps(
                task_lat, task_lng, user_lat, user_lng,
                accuracy_meters, GPS_RADIUS_LENIENT,
            )
            if not gps_result.passed:
                return VerificationResult(
                    passed=False, method="both",
                    reason=f"GPS check failed: {gps_result.reason}",
                )
            
            photo_result = self._verify_photo(task_name, task_description, photo_base64)
            if not photo_result.passed:
                return VerificationResult(
                    passed=False, method="both",
                    reason=f"Photo check failed: {photo_result.reason}",
                )
            
            return VerificationResult(
                passed=True, method="both",
                reason="GPS and photo verification passed",
            )
        
        else:
            return VerificationResult(
                passed=False, method=verification_type,
                reason=f"Unknown verification type: {verification_type}",
            )
    
    def _verify_gps(
        self,
        task_lat: Optional[Decimal],
        task_lng: Optional[Decimal],
        user_lat: Optional[float],
        user_lng: Optional[float],
        accuracy_meters: Optional[float],
        radius: int,
    ) -> VerificationResult:
        """Check if user is within radius of the task location."""
        if task_lat is None or task_lng is None:
            return VerificationResult(
                passed=True, method="gps",
                reason="Task has no fixed location, GPS check skipped",
            )
        
        if user_lat is None or user_lng is None:
            return VerificationResult(
                passed=False, method="gps",
                reason="No GPS coordinates provided",
            )
        
        if accuracy_meters and accuracy_meters > MIN_ACCURACY_METERS:
            return VerificationResult(
                passed=False, method="gps",
                reason=f"GPS signal too weak (accuracy: {accuracy_meters:.0f}m). Move somewhere with better signal.",
            )
        
        distance = haversine_distance(
            user_lat, user_lng, float(task_lat), float(task_lng),
        )
        
        if distance <= radius:
            return VerificationResult(
                passed=True, method="gps",
                reason=f"Within range ({distance:.0f}m away, limit is {radius}m)",
            )
        
        return VerificationResult(
            passed=False, method="gps",
            reason=f"Too far away ({distance:.0f}m, need to be within {radius}m)",
        )
    
    def _verify_photo(
        self,
        task_name: str,
        task_description: Optional[str],
        photo_base64: Optional[str],
    ) -> VerificationResult:
        """Use OpenAI Vision to verify a photo matches the task."""
        if not photo_base64:
            return VerificationResult(
                passed=False, method="photo",
                reason="No photo provided",
            )
        
        # Strip data URL prefix if present
        if "," in photo_base64:
            photo_base64 = photo_base64.split(",", 1)[1]
        
        desc = task_description or task_name
        prompt = (
            f"A user is completing a city exploration task and submitted this photo as proof.\n\n"
            f"Task: \"{task_name}\"\n"
            f"Description: \"{desc}\"\n\n"
            f"Rules:\n"
            f"- The photo MUST clearly show real, recognizable content related to the task.\n"
            f"- Reject blank images, solid colors, abstract shapes, or images with no discernible subject.\n"
            f"- Reject if the image is too blurry, dark, or small to identify anything meaningful.\n"
            f"- The photo should contain visible evidence: the place, the food, the activity, a sign, a landmark, etc.\n"
            f"- You don't need a perfect photo, but you need SOMETHING identifiable that connects to the task.\n"
            f"- When in doubt, reject. The user can always retake the photo.\n\n"
            f"Respond with JSON: {{\"verified\": true/false, \"reason\": \"brief reason\"}}"
        )
        
        try:
            # TODO: Consider switching detail from "low" to "auto" or "high" if
            # verification accuracy is too loose. "low" uses fewer tokens but
            # may miss fine details in photos. Trade-off is cost per check-in.
            response = self.client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{photo_base64}",
                                "detail": "low",
                            },
                        },
                    ],
                }],
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            
            result = json.loads(response.choices[0].message.content)
            verified = result.get("verified", False)
            reason = result.get("reason", "No reason provided")
            
            return VerificationResult(
                passed=verified, method="photo", reason=reason,
            )
        
        except Exception as e:
            return VerificationResult(
                passed=False, method="photo",
                reason=f"Photo verification failed: {str(e)}",
            )
