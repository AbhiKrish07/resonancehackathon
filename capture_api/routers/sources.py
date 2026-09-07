from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from models.schemas import User
from dependencies import get_supabase_client, get_current_user
from services.db import get_db

router = APIRouter(prefix="/sources", tags=["sources"])

class SourceCreate(BaseModel):
    name: str
    source_type: str
    config: Optional[Dict[str, Any]] = None

@router.get("")
async def list_sources(
    current_user: User = Depends(get_current_user),
    supabase = Depends(get_supabase_client),
):
    db = get_db()
    if supabase:
        try:
            res = supabase.table("sources").select("*").execute()
            if res.data:
                return {"sources": res.data}
        except Exception:
            pass

    # Local default sources
    return {
        "sources": [
            {
                "id": "src-manual",
                "name": "Universal Capture Input",
                "source_type": "manual",
                "capture_count": len(db.captures),
                "last_synced_at": "Just now",
                "status": "connected"
            },
            {
                "id": "src-files",
                "name": "Local Files & PDFs",
                "source_type": "document",
                "capture_count": len([c for c in db.captures.values() if c.get("capture_type") in ["pdf", "document"]]),
                "last_synced_at": "Just now",
                "status": "connected"
            },
            {
                "id": "src-chat",
                "name": "Chat & Messaging (WhatsApp/Slack)",
                "source_type": "chat",
                "capture_count": len([c for c in db.captures.values() if c.get("capture_type") in ["screenshot", "image"]]),
                "last_synced_at": "Just now",
                "status": "connected"
            },
            {
                "id": "src-audio",
                "name": "Voice Memos & Audio",
                "source_type": "voice",
                "capture_count": len([c for c in db.captures.values() if c.get("capture_type") in ["voice", "audio"]]),
                "last_synced_at": "Just now",
                "status": "connected"
            }
        ]
    }
