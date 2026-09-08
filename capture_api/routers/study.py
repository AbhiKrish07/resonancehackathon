from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import json

from services.db import get_db
from services.ai_pipeline import get_groq_client
from dependencies import get_current_user

router = APIRouter(prefix="/study", tags=["Study & Lessons"])

class LessonGenerateRequest(BaseModel):
    lesson_id: int
    learning_objectives: List[dict]
    source_text: str

class LessonGenerateResponse(BaseModel):
    blocks: List[dict]

@router.post("/lesson/generate", response_model=LessonGenerateResponse)
async def generate_lesson(req: LessonGenerateRequest, current_user = Depends(get_current_user)):
    """
    Dynamically generates a Duolingo-style micro-lesson block list based on learning objectives.
    """
    client = get_groq_client()
    if not client:
        raise HTTPException(status_code=500, detail="LLM not configured")

    # Construct prompt
    lo_texts = [lo.get("text", "") for lo in req.learning_objectives]
    lo_prompt = "\n".join(f"- {t}" for t in lo_texts)
    
    prompt = f"""
    You are an expert AI tutor building an interactive micro-lesson.
    
    Source Material:
    {req.source_text[:15000]}
    
    Learning Objectives for this lesson:
    {lo_prompt}
    
    Create a highly engaging, Duolingo-style lesson. The lesson should consist of 2 to 4 "blocks".
    Each block must have a "type" (either "concept" or "quiz").
    
    For "concept":
    Provide a "title" and "content" (markdown text explaining the concept simply and engagingly).
    
    For "quiz":
    Provide a "question", an array of "options", and the "correctIndex" (0-indexed integer of the correct option). Also provide a "feedback" string for when they get it right or wrong.
    
    Return the response as a JSON object with a single key "blocks" containing the array of blocks. Example format:
    {{
      "blocks": [
        {{
          "type": "concept",
          "title": "Understanding X",
          "content": "X is like a..."
        }},
        {{
          "type": "quiz",
          "question": "What is X?",
          "options": ["A", "B", "C"],
          "correctIndex": 0,
          "feedback": "Exactly! X is A because..."
        }}
      ]
    }}
    """

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You output strictly valid JSON containing the lesson blocks."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7
        )
        content = response.choices[0].message.content
        
        try:
            parsed = json.loads(content)
            blocks = parsed.get("blocks", []) if isinstance(parsed, dict) else []
        except Exception as e:
            blocks = []
            
        return LessonGenerateResponse(blocks=blocks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
