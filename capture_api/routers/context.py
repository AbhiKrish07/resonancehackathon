from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from typing import Optional
from uuid import UUID
from models.schemas import User
from dependencies import get_supabase_client, get_current_user
from services.context_service import ContextService

router = APIRouter(prefix="/context", tags=["context"])

@router.post("/pack")
async def create_context_pack(
    goal_id: UUID,
    query: str,
    space_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Assemble the Minimum Sufficient Context Pack for a specific goal.
    This is the core 'SCTM' pipeline.
    """
    try:
        context_service = ContextService(supabase)
        result = await context_service.create_context_pack(
            user_id=current_user.id,
            goal_id=goal_id,
            query=query,
            space_id=space_id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics")
async def get_reduction_metrics(
    current_user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get the history of context reduction ratios to prove system efficiency.
    """
    try:
        res = supabase.table("retrieval_logs").select("*").eq("user_id", str(current_user.id)).order("created_at", desc=True).limit(50).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
