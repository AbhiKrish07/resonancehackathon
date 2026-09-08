import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import (
    captures, spaces, retrieval, metrics, course, srs, audio, scorm, assessment, curriculum, artifacts, study, profile
)
from services.db import get_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize demo data on startup if database is fresh
    db = get_db()
    # (Demo seeding logic simplified for the hackathon MVP)
    yield

app = FastAPI(
    title="Darwinity — Source-Grounded Study Companion",
    description="Turns your textbook into a course, arranges it like a mind map, and keeps quizzing you offline.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Flutter, Web UI, Extensions, and local clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all Context Intelligence routers
app.include_router(captures.router)
app.include_router(spaces.router)
app.include_router(retrieval.router)
app.include_router(metrics.router)
app.include_router(course.router)
app.include_router(srs.router)
app.include_router(audio.router)
app.include_router(scorm.router)
app.include_router(assessment.router)
app.include_router(curriculum.router)
app.include_router(artifacts.router)
app.include_router(study.router)
app.include_router(profile.router)



@app.get("/api/info")
async def api_info():
    db = get_db()
    return {
        "name": "Darwinity — AI-Powered Study Hub",
        "tagline": "Your learning companion that turns chaos into courses.",
        "version": "2.0.0",
        "status": "online",
        "stats": {
            "spaces_count": len(db.spaces),
            "captures_count": len(db.captures),
            "resolved_entities_count": len(db.resolved_entities),
            "active_contradictions_count": len(db.list_contradictions(status="active")),
        }
    }


@app.get("/health")
async def health():
    return {"status": "ok", "service": "darwinity-study-hub"}


# Mount frontend vanilla UI at root so everything runs seamlessly on port 8080
vanilla_static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "capture_vanilla")
if os.path.exists(vanilla_static_dir):
    app.mount("/vanilla", StaticFiles(directory=vanilla_static_dir, html=True), name="static_vanilla")

uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir)
app.mount("/files", StaticFiles(directory=uploads_dir), name="files")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)

