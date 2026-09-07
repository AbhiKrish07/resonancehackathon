import os
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
from services.db import get_db
from services.embeddings import generate_embedding
from services.ai_pipeline import cleanse_and_normalize_text, extract_entities_from_text
from services.entity_resolution_service import resolve_space_entities
from services.contradiction_service import run_contradiction_check
from services.summary_service import update_space_summary_if_needed

class IngestionService:
    @staticmethod
    async def process_capture_pipeline(capture_id: str):
        """
        Complete Asynchronous Intelligence Pipeline:
        1. Normalization Job
        2. Embedding Job
        3. Entity Extraction Job
        4. Entity Resolution Job
        5. Contradiction Check Job
        6. Summary Update Job
        """
        db = get_db()
        capture = db.get_capture(capture_id)
        if not capture:
            return

        # Mark status as processing
        db.update_capture(capture_id, {"processing_status": "processing"})

        try:
            raw_content = capture.get("original_content", "")
            capture_type = capture.get("capture_type", "text")

            # 1. Normalization
            normalized_content = await cleanse_and_normalize_text(raw_content)
            
            # 2. Embedding (384 dimensions)
            embedding = generate_embedding(normalized_content or raw_content)

            db.update_capture(capture_id, {
                "normalized_content": normalized_content,
                "embedding": embedding,
                "processed_at": datetime.utcnow().isoformat()
            })

            # 3. Entity Extraction
            extracted_entities = await extract_entities_from_text(normalized_content or raw_content)
            for ent in extracted_entities:
                ent_emb = generate_embedding(ent.canonical_name)
                db.add_capture_entity(
                    capture_id=capture_id,
                    entity_text=ent.canonical_name,
                    normalized_name=ent.canonical_name.strip(),
                    entity_type=ent.entity_type,
                    embedding=ent_emb,
                    confidence=ent.confidence
                )

            # 4. Entity Resolution in associated spaces
            space_ids = capture.get("space_ids", [])
            for space_id in space_ids:
                await resolve_space_entities(space_id)

            # 5. Contradiction Check in associated spaces
            for space_id in space_ids:
                await run_contradiction_check(capture_id, space_id)

            # 6. Summary Update
            for space_id in space_ids:
                await update_space_summary_if_needed(space_id)

            # Mark ready
            db.update_capture(capture_id, {"processing_status": "ready"})

        except Exception as e:
            print(f"Error in ingestion pipeline for capture {capture_id}: {e}")
            db.update_capture(capture_id, {"processing_status": "failed"})

    @staticmethod
    def enqueue_processing(capture_id: str):
        """Dispatches processing to background async task."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(IngestionService.process_capture_pipeline(capture_id))
            else:
                loop.run_until_complete(IngestionService.process_capture_pipeline(capture_id))
        except Exception as e:
            print(f"Failed to enqueue processing: {e}")
