from fastapi import APIRouter
from services.demo_seeder import seed_goa_demo_data
from services.db import get_db

router = APIRouter(prefix="/demo", tags=["Demo"])

@router.post("/seed")
async def seed_demo():
    """
    Seeds the standard Context Intelligence demonstration:
    Space: "Trip to Goa"
    - 4 multimodal captures (PDF ticket, WhatsApp screenshot, Voice memo, Budget note)
    - Resolved entities: Priya Sharma (from Priya / Priya S.), Goa, Sea Breeze Resort, Air India AI-872
    - Active contradiction: Flight departure date Oct 12 vs Oct 13
    - Pre-computed embeddings and Space intelligence summary
    """
    space_id = await seed_goa_demo_data()
    db = get_db()
    return {
        "status": "success",
        "message": "Trip to Goa demo dataset successfully loaded.",
        "space_id": space_id,
        "space": db.get_space(space_id),
        "captures_count": len(db.list_captures(space_id=space_id)),
        "entities_count": len(db.list_resolved_entities(space_id)),
        "contradictions_count": len(db.list_contradictions(space_id=space_id, status="active"))
    }


@router.post("/reset")
async def reset_demo():
    """Resets the in-memory database and re-seeds the demo dataset."""
    db = get_db()
    db.spaces.clear()
    db.captures.clear()
    db.space_captures.clear()
    db.capture_entities.clear()
    db.resolved_entities.clear()
    db.entity_members.clear()
    db.contradictions.clear()
    db.metrics_log.clear()

    space_id = await seed_goa_demo_data()
    return {
        "status": "reset_and_seeded",
        "space_id": space_id
    }
