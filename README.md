# 🧠 CAPTURE — Context Intelligence Platform

> **"Capture does not store more information. It assembles the minimum sufficient, entity-resolved, contradiction-aware context required for a goal."**

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![MCP Protocol](https://img.shields.io/badge/MCP-Protocol%202024--11--05-purple.svg)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📌 Problem Statement: Context Intelligence in Fragmented Environments

In real-world workflows, critical working knowledge is scattered across chats, voice memos, PDFs, meeting transcripts, and whiteboard notes. Traditional RAG systems fail because they:
1. **Suffer from Entity Fragmentation:** The same person, module, or task appears under different aliases (`"Priya"`, `"Dr. Priya Sharma"`, `"Lead Architect"`), fragmenting related knowledge.
2. **Ignite the Capture Gap:** Vital signals originate from unstructured images, voice notes, and informal messages that traditional databases cannot parse.
3. **Ignore Cross-Source Contradictions:** When flight tickets, WhatsApp messages, and hotel reservations contradict each other, standard RAG blithely passes conflicting data to the LLM.
4. **Cause Context Bloat:** Dumping entire document chunks wastes 90%+ of prompt tokens, increasing latency, cost, and hallucination rates.

**CAPTURE** solves this by autonomously transforming fragmented unstructured inputs into **Minimum Sufficient Context Packs**.

---

## ⚡ Key Capabilities & Architecture

```
   RAW UNSTRUCTURED INPUTS
(Voice, PDF, Images, Chats, Notes)
               │
               ▼
┌───────────────────────────────┐
│     Multimodal Capture Hub    │ ➔ Groq Vision OCR + Whisper Audio
└──────────────┬────────────────┘
               ▼
┌───────────────────────────────┐
│   Entity Coreference Engine   │ ➔ Semantic LLM Identity Resolution
└──────────────┬────────────────┘
               ▼
┌───────────────────────────────┐
│ 2-Stage Contradiction Engine  │ ➔ Embedding Screening + Groq LLM Arbiter
└──────────────┬────────────────┘
               ▼
┌───────────────────────────────┐
│ Discrete Linear Authority Gate│ ➔ Final Score = (Sim × 0.7) + (Auth × 0.3)
└──────────────┬────────────────┘
               ▼
┌───────────────────────────────┐
│  Minimum Sufficient Context   │ ➔ 95.5% Token Reduction (14.2k ➔ 640 tokens)
└──────────────┬────────────────┘
               ▼
┌───────────────────────────────┐
│   MCP Server & Spatial View   │ ➔ Claude Desktop / Cursor / Spatial Canvas
└───────────────────────────────┘
```

### 1. 🎯 Minimum Sufficient Context & Token Ledger
- Calculates mathematically validated token savings using `tiktoken`.
- Prunes low-authority and irrelevant chunks before prompt injection.
- **Result:** $14,200\text{ tokens} \longrightarrow 640\text{ tokens}$ (**95.5% token reduction**).

### 2. 🎙️ Real Multimodal Capture Ingestion
- **Vision OCR:** Powered by Groq Vision (`meta-llama/llama-4-scout-17b-16e-instruct`) for receipts, screenshots, and diagrams.
- **Audio Transcription:** Powered by Groq Whisper (`whisper-large-v3`) for voice memos and meeting snippets.
- **Document Extractors:** Multi-format streaming extractors for `.pdf`, `.docx`, `.pptx`, `.csv`, `.json`, and `.md`.

### 3. 🔍 Semantic Identity Entity Resolution
- Evaluates candidate coreference clusters using high-dimensional embedding similarity and **LLM Semantic Identity Mapping** to resolve nicknames, aliases, and abbreviations into canonical entity graphs.

### 4. ⚖️ Two-Stage Contradiction Detection Engine
- **Stage 1 (Embedding Screening):** Scans semantic candidate pairs with high topical alignment.
- **Stage 2 (LLM Arbiter):** Detects schedule conflicts, mismatched requirements, and conflicting facts with severity grading and resolution actions.

### 5. 🔌 Standard Model Context Protocol (MCP) Server
- Implements the official **MCP JSON-RPC 2.0 protocol** (`protocolVersion: 2024-11-05`).
- Compatible with **Claude Desktop**, **Cursor IDE**, and standalone agent harnesses.
- Exposes:
  - `get_context_pack(goal, space_id, max_tokens)` $\rightarrow$ Executes Master Orchestrator.
  - `resolve_entity(mention)` $\rightarrow$ Canonical entity mapping.
  - `report_contradiction(source_a, source_b, conflicting_field, explanation)` $\rightarrow$ Live conflict reporting.
  - `capture_add_memory(content, title, space_id)` $\rightarrow$ Direct knowledge ingestion.

### 6. 🔄 Closed-Loop Learning & Tuning Queue ($\text{Act} \rightarrow \text{Learn}$)
- Users or agents can affirm or flag retrieved sources.
- The `tuning_queue` dynamically updates source `authority_weight` ($\pm 0.08$), continuously optimizing retrieval quality for recurring workflows.

### 7. 🗺️ Spatial Canvas v3
- Interactive spatial whiteboard canvas embedded directly in the frontend for visual entity exploration and card grouping.

---

## 📁 Repository Structure

```
capturerecursion/
├── README.md                      # Comprehensive project overview & documentation
├── ARCHITECTURE.md                # In-depth architectural specification
├── capture_mcp_server.py          # Standalone stdio MCP Server for Claude Desktop & Cursor
├── capture_api/                   # FastAPI Context Intelligence Backend
│   ├── main.py                    # API entrypoint and router registration
│   ├── dependencies.py            # Supabase & authentication providers
│   ├── supabase_schema.sql        # Full pgvector database schema & RPC functions
│   ├── routers/                   # API Routers
│   │   ├── captures.py            # Ingestion, OCR, Whisper & capture management
│   │   ├── spaces.py              # Contextual workspaces
│   │   ├── entities.py            # Entity resolution endpoints
│   │   ├── contradictions.py      # Contradiction detection & review ledger
│   │   ├── retrieval.py           # Authority-gated retrieval & token reduction
│   │   ├── mcp.py                 # HTTP-based MCP tool router
│   │   └── feedback.py            # Closed-loop learning & tuning queue
│   └── services/                  # Core Intelligence Services
│       ├── orchestrator.py        # Master 8-step Agentic Context Orchestrator
│       ├── context_engine.py      # Goal analysis, retrieval, and candidate selection
│       ├── mcp_tools.py           # Unified MCP Single Source of Truth tool provider
│       ├── entity_service.py      # Semantic LLM coreference identity reasoner
│       ├── contradiction_service.py # 2-stage contradiction detection pipeline
│       ├── retrieval.py           # Authority-gated linear scoring & token math
│       ├── tuning_service.py      # Closed-loop reinforcement learning ledger
│       ├── ai_pipeline.py         # Groq LLM & Vision integration
│       ├── embeddings.py          # Embedding generation & cosine similarity
│       └── db.py                  # LocalContextDB zero-dependency fallback store
├── capture_vanilla/               # Modern Vanilla Dark-Theme Web Application
│   ├── index.html                 # Main Context Intelligence dashboard
│   ├── style.css                  # Executive dark-mode design tokens
│   ├── app.js                     # In-memory vector matrix cache, hybrid search & closed-loop UI
│   └── canvas.html                # Spatial Canvas v3 whiteboard engine
└── capture_web/                   # Next.js / TypeScript Web Frontend
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.9+
- Groq API Key (Set as `GROQ_API_KEY`)
- *(Optional)* Supabase account with `pgvector` enabled

### 2. Backend Setup
```bash
# Navigate to API directory
cd capture_api

# Install dependencies
pip install fastapi uvicorn pydantic requests pypdf sentence-transformers

# Run the FastAPI server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Dashboard
```bash
# In another terminal, start the web server
python3 -m http.server 8080 --directory capture_vanilla

# Open your browser at:
# http://localhost:8080
```

### 4. Claude Desktop MCP Configuration
Add the following to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "capture": {
      "command": "python3",
      "args": [
        "/absolute/path/to/capture_mcp_server.py"
      ]
    }
  }
}
```

---

## 🧪 Live Demonstration Workflow

1. **Ingest Multimodal Data:** Drag and drop PDFs, screenshots, or voice memos into the Capture Hub.
2. **Review Resolved Entities:** Inspect canonical clusters (e.g. `Priya` $\rightarrow$ `@Priya Sharma`).
3. **Verify Contradiction Detection:** Review flagged schedule or requirement collisions in the Contradiction Ledger.
4. **Execute Goal Assembly:** Ask a question in *Ask & Search* or via Claude Desktop MCP.
5. **Inspect Token Reduction:** Verify the **95.5% token reduction** with precision metrics.
6. **Close the Loop:** Click `+ Save as Synthesized Knowledge` to record resolved facts back into the knowledge graph.

---

## 📄 License
MIT License. Built for the Context Intelligence Hackathon.
