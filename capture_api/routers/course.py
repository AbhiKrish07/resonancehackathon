from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List, Dict
import uuid

from services.ai_pipeline import generate_course_tree, generate_canvas_graph
from services.embeddings import chunk_and_embed_text
from services.db import get_db

router = APIRouter(prefix="/api/course", tags=["Course Generation"])

class CourseGenerationRequest(BaseModel):
    content: str
    level: str = "intermediate"
    time_budget: str = "30min/day"

@router.post("/generate")
async def generate_course(req: CourseGenerationRequest):
    """
    Accepts raw text (or OCR'd text from a PDF) and generates a structured course tree.
    """
    db = get_db()
    
    # 1. Chunk and embed the content
    # For a real implementation, we would extract text from PDF, chunk it, and embed it.
    chunks = chunk_and_embed_text(req.content)
    
    course_id = str(uuid.uuid4())
    
    # 2. Call AI pipeline to generate the course tree based on personalization
    course_tree = await generate_course_tree(req.content, req.level, req.time_budget)
    
    # 3. Generate the spatial canvas graph (nodes and edges)
    # This now utilizes open_notebook's LangGraph advanced workflows internally.
    canvas_graph = await generate_canvas_graph(course_tree)
    
    # Mock storing it in DB (for MVP, we might just return it to the client for local caching)
    db.spaces[course_id] = {
        "id": course_id,
        "tree": course_tree,
        "graph": canvas_graph,
        "chunks": chunks
    }
    
    return {
        "status": "success",
        "course_id": course_id,
        "course_tree": course_tree,
        "canvas_graph": canvas_graph,
        "chunks_count": len(chunks)
    }
