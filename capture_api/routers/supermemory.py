from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from services.db import get_db

router = APIRouter(prefix="/supermemory", tags=["supermemory"])

class SupermemoryQuery(BaseModel):
    query: str
    container_tag: Optional[str] = None
    limit: int = 10

@router.post("/query")
async def query_supermemory_bridge(req: SupermemoryQuery):
    """
    Bridge router for Supermemory integration:
    Allows querying Capture context formatted as Supermemory documents & memory graphs.
    """
    db = get_db()
    captures = list(db.captures.values())
    
    memories = []
    for c in captures:
        memories.append({
            "id": c["id"],
            "title": c.get("title", "Capture"),
            "content": c.get("normalized_content") or c.get("original_content", ""),
            "metadata": {
                "source": c.get("capture_type", "text"),
                "status": c.get("processing_status", "ready"),
                "space_ids": c.get("space_ids", [])
            }
        })

    return {
        "results": memories[:req.limit],
        "total": len(memories),
        "status": "connected"
    }

@router.get("/status")
async def get_supermemory_status():
    return {
        "bridge_active": True,
        "mode": "Context Intelligence Provider",
        "supported_tools": ["recall", "embed", "graph", "resolve"]
    }
