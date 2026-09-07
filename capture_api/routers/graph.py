from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from models.schemas import User
from dependencies import get_supabase_client, get_current_user
from services.db import get_db

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("")
async def get_context_graph(
    space_id: Optional[str] = None,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    supabase = Depends(get_supabase_client),
):
    """
    Returns the entity-relationship graph for visual canvas and node exploration.
    Nodes = resolved entities / captures, Edges = relationships and members.
    """
    db = get_db()
    
    # Try Supabase if available
    if supabase:
        try:
            ent_query = supabase.table("entities")\
                .select("id, canonical_name, entity_type, aliases, metadata")\
                .eq("user_id", str(current_user.id))
            ent_res = ent_query.limit(limit).execute()
            entities = ent_res.data or []

            rel_query = supabase.table("entity_relations")\
                .select("id, entity_id_a, entity_id_b, relation_type, confidence, co_occurrence_count")\
                .eq("user_id", str(current_user.id))
            rel_res = rel_query.limit(limit * 2).execute()
            relations = rel_res.data or []

            nodes = [{
                "id": e["id"],
                "name": e["canonical_name"],
                "type": e["entity_type"],
                "aliases": e.get("aliases", []),
                "metadata": e.get("metadata", {}),
            } for e in entities]

            edges = [{
                "id": r["id"],
                "source": r["entity_id_a"],
                "target": r["entity_id_b"],
                "relation": r["relation_type"],
                "weight": r.get("confidence", 1.0),
                "co_occurrence": r.get("co_occurrence_count", 1),
            } for r in relations]

            return {
                "nodes": nodes,
                "edges": edges,
                "stats": {
                    "node_count": len(nodes),
                    "edge_count": len(edges),
                    "entity_types": _count_types(entities),
                },
            }
        except Exception:
            pass

    # Local DB fallback
    target_space_id = space_id or (list(db.spaces.keys())[0] if db.spaces else None)
    resolved_entities = db.list_resolved_entities(target_space_id) if target_space_id else list(db.resolved_entities.values())
    captures = db.list_captures(space_id=target_space_id) if target_space_id else list(db.captures.values())

    nodes = []
    edges = []

    # Entity nodes
    for e in resolved_entities:
        nodes.append({
            "id": e["id"],
            "name": e["canonical_name"],
            "type": e.get("entity_type", "entity"),
            "category": "entity",
            "aliases": [m.get("entity_text") for m in e.get("members", [])],
            "source_count": e.get("source_count", 1),
        })

    # Capture nodes & edges
    for c in captures:
        c_node_id = f"cap_{c['id']}"
        nodes.append({
            "id": c_node_id,
            "name": c.get("title", "Capture"),
            "type": c.get("capture_type", "text"),
            "category": "capture",
            "status": c.get("processing_status", "ready"),
        })

        # Link captures to their resolved entities
        cap_entities = db.get_capture_entities(c["id"])
        for ce in cap_entities:
            # find corresponding resolved entity
            for re in resolved_entities:
                for mem in re.get("members", []):
                    if mem.get("capture_entity_id") == ce["id"]:
                        edges.append({
                            "id": f"edge_{c['id']}_{re['id']}",
                            "source": c_node_id,
                            "target": re["id"],
                            "relation": "mentions",
                            "weight": mem.get("similarity_score", 1.0),
                        })

    return {
        "nodes": nodes,
        "edges": edges,
        "stats": {
            "node_count": len(nodes),
            "edge_count": len(edges),
            "entity_types": _count_types(resolved_entities),
            "captures_count": len(captures),
        },
    }


@router.get("/entity/{entity_id}")
async def get_entity_detail(
    entity_id: str,
    current_user: User = Depends(get_current_user),
    supabase = Depends(get_supabase_client),
):
    db = get_db()
    
    # Try Supabase
    if supabase:
        try:
            ent_res = supabase.table("entities").select("*").eq("id", entity_id).execute()
            if ent_res.data:
                return {"entity": ent_res.data[0]}
        except Exception:
            pass

    # Local DB
    re = db.resolved_entities.get(entity_id)
    if not re:
        raise HTTPException(status_code=404, detail="Entity not found")

    members = [em for em in db.entity_members if em["resolved_entity_id"] == entity_id]
    linked_captures = []
    for m in members:
        ce = db.capture_entities.get(m["capture_entity_id"])
        if ce:
            cap = db.captures.get(ce["capture_id"])
            if cap:
                linked_captures.append({
                    "capture_id": cap["id"],
                    "title": cap.get("title"),
                    "type": cap.get("capture_type"),
                    "preview": (cap.get("normalized_content") or cap.get("original_content", ""))[:120],
                    "matched_text": ce.get("entity_text"),
                    "confidence": ce.get("confidence", 1.0),
                })

    return {
        "entity": re,
        "linked_captures": linked_captures,
        "stats": {
            "total_mentions": len(linked_captures),
            "source_count": re.get("source_count", len(linked_captures)),
        },
    }


def _count_types(entities):
    types = {}
    for e in entities:
        t = e.get("entity_type", "other")
        types[t] = types.get(t, 0) + 1
    return types
