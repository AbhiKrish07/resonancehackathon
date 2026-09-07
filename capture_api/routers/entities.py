from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from models.schemas import ResolvedEntity, EntityResolutionConfirm, EntityResolutionSeparate
from services.db import get_db
from dependencies import get_current_user

router = APIRouter(tags=["Entities"])

@router.get("/spaces/{id}/entities")
async def get_space_entities(
    id: UUID,
    current_user = Depends(get_current_user)
):
    """
    Returns space-scoped resolved entities with all grouped member mentions,
    similarity confidence scores, and source occurrence counts.
    """
    db = get_db()
    return db.list_resolved_entities(str(id))


@router.post("/entities/{id}/confirm")
async def confirm_entity_resolution(
    id: UUID,
    payload: EntityResolutionConfirm,
    current_user = Depends(get_current_user)
):
    """
    Allows user to confirm or rename a canonical resolved entity.
    """
    db = get_db()
    eid = str(id)
    re = db.resolved_entities.get(eid)
    if not re:
        raise HTTPException(status_code=404, detail="Resolved entity not found")
    
    if payload.confirmed_canonical_name:
        re["canonical_name"] = payload.confirmed_canonical_name
    re["confidence"] = 1.0
    return {"status": "confirmed", "entity": re}


@router.post("/entities/{id}/separate")
async def separate_entity_member(
    id: UUID,
    payload: EntityResolutionSeparate,
    current_user = Depends(get_current_user)
):
    """
    Allows user to separate an incorrectly clustered member entity into its own canonical identity.
    """
    db = get_db()
    old_rid = str(id)
    re_old = db.resolved_entities.get(old_rid)
    if not re_old:
        raise HTTPException(status_code=404, detail="Parent resolved entity not found")

    mem_cid = str(payload.member_capture_entity_id)
    # Remove member from old resolved entity
    db.entity_members = [
        em for em in db.entity_members
        if not (em["resolved_entity_id"] == old_rid and em["capture_entity_id"] == mem_cid)
    ]

    # Create new resolved entity
    new_re = db.create_resolved_entity(
        space_id=re_old["space_id"],
        canonical_name=payload.new_canonical_name,
        entity_type=re_old.get("entity_type", "other"),
        source_count=1
    )
    db.link_entity_member(new_re["id"], mem_cid, similarity_score=1.0)

    return {
        "status": "separated",
        "new_resolved_entity": new_re,
        "previous_entity_id": old_rid
    }
