from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from models.schemas import Contradiction, ContradictionResolveRequest
from services.db import get_db
from services.contradiction_service import resolve_contradiction_workflow
from dependencies import get_current_user

router = APIRouter(tags=["Contradictions"])

@router.get("/spaces/{id}/contradictions", response_model=List[Contradiction])
async def get_space_contradictions(
    id: UUID,
    status: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """
    Retrieves all contradictions identified within a Space,
    including conflicting sources, fields, values, and severity.
    """
    db = get_db()
    return db.list_contradictions(space_id=str(id), status=status)


@router.post("/contradictions/{id}/resolve")
async def resolve_contradiction(
    id: UUID,
    payload: ContradictionResolveRequest,
    current_user = Depends(get_current_user)
):
    """
    Executes user decision on a contradiction:
    - mark_a_correct
    - mark_b_correct
    - keep_both
    - dismiss
    """
    res = resolve_contradiction_workflow(
        contradiction_id=str(id),
        action=payload.resolution_action,
        notes=payload.notes
    )
    if not res:
        raise HTTPException(status_code=404, detail="Contradiction not found")
    return {"status": "success", "contradiction": res}


@router.post("/contradictions/{id}/dismiss")
async def dismiss_contradiction(
    id: UUID,
    current_user = Depends(get_current_user)
):
    res = resolve_contradiction_workflow(
        contradiction_id=str(id),
        action="dismiss",
        notes="Dismissed by user"
    )
    if not res:
        raise HTTPException(status_code=404, detail="Contradiction not found")
    return {"status": "dismissed", "contradiction": res}
