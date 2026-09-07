from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.tuning_service import TuningService

router = APIRouter(prefix="/feedback", tags=["Closed-Loop Learning"])

class ContextFeedbackRequest(BaseModel):
    goal: str
    capture_id: str
    was_helpful: bool
    notes: Optional[str] = None

@router.post("/record")
async def record_feedback(req: ContextFeedbackRequest):
    service = TuningService.get_instance()
    return service.record_feedback(
        goal=req.goal,
        capture_id=req.capture_id,
        was_helpful=req.was_helpful,
        notes=req.notes
    )

@router.get("/metrics")
async def get_tuning_metrics():
    service = TuningService.get_instance()
    return service.get_tuning_metrics()
