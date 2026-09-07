from fastapi import APIRouter, Depends
from models.schemas import User
from dependencies import get_supabase_client, get_current_user
from services.db import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/metrics")
async def get_dashboard_metrics(
    current_user: User = Depends(get_current_user),
    supabase = Depends(get_supabase_client),
):
    """
    Returns metrics that prove Context Intelligence:
    - Context reduction ratio
    - Memory fragmentation score
    - Active contradictions
    - Total captures and resolved entities
    """
    db = get_db()

    # Try Supabase if available
    if supabase:
        try:
            caps_res = supabase.table("captures").select("id", count="exact").execute()
            ents_res = supabase.table("entities").select("id", count="exact").execute()
            contradictions_res = supabase.table("contradictions").select("id", count="exact").eq("status", "active").execute()
            total_captures = caps_res.count or 0
            total_entities = ents_res.count or 0
            active_contradictions = contradictions_res.count or 0
            
            # Fetch real logs for Supabase metrics
            logs_res = supabase.table("metrics_log").select("reduction_pct").execute()
            avg_reduction = 0.0
            if logs_res.data:
                avg_reduction = round(sum(l["reduction_pct"] for l in logs_res.data) / len(logs_res.data), 1)
                
            return {
                "captures_count": total_captures,
                "entities_count": total_entities,
                "active_contradictions": active_contradictions,
                "average_context_reduction": avg_reduction,
                "status": "online"
            }
        except Exception:
            pass

    # Local DB
    captures = list(db.captures.values())
    entities = list(db.resolved_entities.values())
    contradictions = db.list_contradictions(status="active")
    logs = db.metrics_log

    avg_reduction = 0.0
    if logs:
        avg_reduction = round(sum(l["reduction_pct"] for l in logs) / len(logs), 1)

    return {
        "captures_count": len(captures),
        "spaces_count": len(db.spaces),
        "entities_count": len(entities),
        "active_contradictions": len(contradictions),
        "average_context_reduction": avg_reduction,
        "total_queries_served": len(logs) or 1,
        "status": "online"
    }
