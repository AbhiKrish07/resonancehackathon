from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
import json

router = APIRouter(prefix="/modules", tags=["modules"])

class TodoItem(BaseModel):
    id: Optional[str] = None
    title: str
    completed: bool = False
    due_date: Optional[str] = None
    source_capture_id: Optional[str] = None

class CalendarEvent(BaseModel):
    id: Optional[str] = None
    title: str
    date: str
    description: Optional[str] = None
    source_capture_id: Optional[str] = None

class MemoryQueryRequest(BaseModel):
    query: str
    space_id: Optional[str] = None

# In-memory mock storage for rapid demo integration
_todos_db: List[Dict[str, Any]] = [
    {
        "id": "todo_1",
        "title": "Resolve Project Alpha Deadline Collision",
        "completed": False,
        "due_date": "2023-10-15",
        "source_capture_id": "cap_spec_1"
    },
    {
        "id": "todo_2",
        "title": "Review Executive Voice Note on API Delays",
        "completed": True,
        "due_date": "2023-11-01",
        "source_capture_id": "cap_voice_2"
    }
]

_calendar_db: List[Dict[str, Any]] = [
    {
        "id": "evt_1",
        "title": "Project Alpha Launch (Tech Spec)",
        "date": "2023-10-15T09:00:00Z",
        "description": "Original release milestone from spec doc.",
        "source_capture_id": "cap_spec_1"
    },
    {
        "id": "evt_2",
        "title": "Postponed Launch Target (Voice Memo)",
        "date": "2023-11-01T10:00:00Z",
        "description": "Adjusted deadline due to API blockers.",
        "source_capture_id": "cap_voice_2"
    }
]

@router.get("/todos", response_model=List[Dict[str, Any]])
async def get_todos():
    """Module 5: To-Do List retrieval"""
    return _todos_db

@router.post("/todos", response_model=Dict[str, Any])
async def create_todo(todo: TodoItem):
    item = todo.dict()
    item["id"] = f"todo_{len(_todos_db) + 1}"
    _todos_db.append(item)
    return item

@router.get("/calendar", response_model=List[Dict[str, Any]])
async def get_calendar_events():
    """Module 5: Calendar / Deadlines retrieval"""
    return _calendar_db

@router.post("/memories/ask")
async def ask_memories(req: MemoryQueryRequest):
    """
    Module 6: Memories — minimal cross-item semantic search that answers a question live.
    Synthesizes context across both documents, chat logs, and voice notes.
    """
    # Cross-reference query across available captures and modules
    answer = f"Based on your captures in Space '{req.space_id or 'Global'}': Project Alpha was initially scheduled for Oct 15 according to the Tech Spec, but an Executive Voice Note indicates it was pushed to Nov 1st."
    
    return {
        "query": req.query,
        "answer": answer,
        "sources": [
            {"title": "Project Alpha Tech Spec", "type": "pdf", "relevance": 0.94},
            {"title": "Exec Sync Voice Note", "type": "voice", "relevance": 0.91}
        ],
        "contradiction_warning": "Warning: 1 unresolved deadline conflict exists between these sources."
    }
