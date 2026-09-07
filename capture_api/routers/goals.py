from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from models.schemas import User
from dependencies import get_supabase_client, get_current_user
from services.db import get_db
from services.retrieval_service import RetrievalService
from services.embeddings import generate_embedding

router = APIRouter(prefix="/goals", tags=["goals"])

class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None

class ContextPackRequest(BaseModel):
    goal_text: str
    space_id: Optional[str] = None
    max_tokens: int = 10000

class AskRequest(BaseModel):
    question: str
    space_id: Optional[str] = None

@router.post("")
async def create_goal(
    request: GoalCreate,
    current_user: User = Depends(get_current_user),
    supabase = Depends(get_supabase_client),
):
    db = get_db()
    if supabase:
        try:
            emb = generate_embedding(f"{request.title} {request.description or ''}")
            res = supabase.table("goals").insert({
                "user_id": str(current_user.id),
                "title": request.title,
                "description": request.description,
                "embedding": emb,
            }).execute()
            if res.data:
                return res.data[0]
        except Exception:
            pass

    return {
        "id": "goal-1",
        "title": request.title,
        "description": request.description,
        "status": "active"
    }

@router.get("")
async def list_goals(
    current_user: User = Depends(get_current_user),
    supabase = Depends(get_supabase_client),
):
    return {
        "goals": [
            {
                "id": "goal-goa",
                "title": "Coordinate Goa Vacation Plan & Resolve Departure Conflicts",
                "description": "Determine confirmed departure flight dates, hotel bookings at Sea Breeze Resort, and budget limits.",
                "status": "active",
                "created_at": "2026-09-03T18:00:00Z"
            }
        ]
    }

@router.post("/context-pack")
async def get_context_pack(
    request: ContextPackRequest,
    current_user: User = Depends(get_current_user),
    supabase = Depends(get_supabase_client),
):
    """
    Given a goal, assembles the minimum sufficient context.
    Returns the context pack with reduction metrics.
    """
    pack = await RetrievalService.build_context_pack(
        goal=request.goal_text,
        space_id=request.space_id,
        max_tokens=request.max_tokens
    )
    return {
        "goal_text": pack.goal,
        "summary": pack.summary,
        "assembled_context": pack.assembled_context,
        "selected_captures": [s.model_dump() for s in pack.sources],
        "metrics": pack.metrics.model_dump(),
        "reduction_percentage": pack.metrics.context_reduction_percentage,
        "contradictions_found": pack.contradictions
    }

@router.post("/ask")
async def ask_context_question(
    request: AskRequest,
    current_user: User = Depends(get_current_user),
    supabase = Depends(get_supabase_client),
):
    """
    Asks a question against the contextual memory.
    """
    res = await RetrievalService.ask_capture(
        query=request.question,
        space_id=request.space_id,
        top_k=4
    )
    return {
        "answer": res.answer,
        "sources": [s.model_dump() for s in res.sources],
        "metrics": res.metrics.model_dump(),
        "why_sources": res.why_sources,
        "contradictions": res.contradictions_noted
    }
