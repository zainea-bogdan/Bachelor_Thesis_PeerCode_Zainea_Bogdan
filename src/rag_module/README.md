# RAG Module

This readme is the main documentation for the standalone **RAG Module**. It covers the full API structure, endpoint roles, parameters, and how to run the service via Docker.

---

# Overview

The main role of this service is to ingest course materials uploaded by teachers (PDF, DOCX, PPTX), embed them into a vector database, and generate project blueprints grounded in those materials using a RAG pipeline backed by Google Gemini. The module exposes two layers: an ingestion layer that parses, chunks, embeds and stores documents into ChromaDB, and a retrieval layer that embeds a teacher's context, retrieves the most relevant chunks via cosine similarity, re-ranks them with a cross-encoder, and passes the result to Gemini to generate structured project blueprints.

## Technical Limitations

- **Embedding model** — uses `BAAI/bge-m3` (~420MB) loaded from the HuggingFace cache at startup. The HF cache folder must be bind-mounted into the container or the model will be downloaded on every start.
- **Re-ranker model** — uses `cross-encoder/ms-marco-MiniLM-L-6-v2` (~80MB) also loaded from the HF cache.
- **ChromaDB** — vector data is persisted to a local folder. The chromadb folder must be bind-mounted into the container or all ingested data is lost on restart.
- **PDF parsing** — PDF files are forwarded to the PDF Parser service running on port 8001. DOCX and PPTX are parsed internally and do not require the PDF Parser to be running.
- **Gemini API key** — a valid `GEMINI_API_KEY` must be set in `.env`. Without it the service starts but all `/generate` calls will fail.

---

# Running with Docker

Fill in the volume paths in `.env` before running:

```env
HF_CACHE_PATH=<path to your local HuggingFace hub cache>
CHROMADB_HOST_PATH=<path to the chromadb folder in this module>
```

```bash
# Build the image
docker build -t rag_module:latest .

# Run — all config and paths are read from .env, nothing is hardcoded
./docker-run.ps1
```

Base URL: `http://localhost:8002`

---

# API Endpoints

---

## Ingestion

### `POST /ingest`
Parses an uploaded document into chunks, embeds each chunk, and stores them in ChromaDB.
- **Role:** Teacher uploads a course material file with the RAG indexing option enabled.
- **Form parameters:**
  - `file` — the document to ingest (PDF, DOCX, or PPTX)
  - `course_id` — identifier for the course this material belongs to
  - `teacher_id` — identifier for the teacher uploading the material
  - `university_year` — academic year (e.g. `2024-2025`)
- **Returns:** ingestion summary with chunk count and source metadata.
- **Parsing strategy per type:**
  - `DOCX` — paragraph-based chunking, minimum 50 words per chunk, 750-word window
  - `PPTX` — slide-based chunking with sparse slide buffering
  - `PDF` — forwarded to the PDF Parser service on port 8001

---

### `DELETE /ingest/clear`
Deletes all chunks stored in ChromaDB.
- **Role:** Teacher or admin clears the vector store to start fresh.
- **Returns:** count of deleted chunks.

---

## Retrieval and Generation

### `POST /generate`
Retrieves the most relevant course material chunks for a given teacher context and generates structured project blueprints using Gemini.
- **Role:** Core generation endpoint — teacher fills the blueprint form, this returns ready-to-use project blueprints grounded in their uploaded materials.
- **Request body:**
```json
{
    "course_id": "CS101",
    "course_name": "Web Technologies Semester 2",
    "teacher_id": "T001",
    "context": "Focus on REST API design and ORM usage with relational databases",
    "domain": "finance",
    "projects_count": 2,
    "difficulty_per_slot": ["easy", "hard"],
    "start_date": "2024-10-01",
    "deadline": "2024-12-15"
}
```
- **Pipeline steps:**
  1. Embed the teacher's context using `BAAI/bge-m3`
  2. Retrieve top-15 chunks from ChromaDB via cosine similarity, filtered by `course_id` and `teacher_id`
  3. Re-rank with `cross-encoder/ms-marco-MiniLM-L-6-v2` — chunks scoring below 0 are discarded
  4. Pass top-5 re-ranked chunks into a structured Gemini prompt
  5. Parse and return the JSON blueprints with full chunk traceability
- **Returns:** array of blueprints and the source chunks used (with re-ranking scores and previews).
- **Blueprint structure per project:**

| Field | Description |
|---|---|
| `title` | Project title grounded in course materials |
| `context_description` | Short description of what the project covers |
| `minimum_specs` | Concrete, measurable requirements adjusted to difficulty |
| `expected_folder_structure` | Minimal realistic folder layout for a student project |
| `commit_conventions` | Fixed conventions: `DONE`, `FIX`, `WIP` |
| `domain` | Application domain (from teacher input or inferred from materials) |
| `difficulty` | Difficulty level as specified in the request |
| `start_date` | Project start date |
| `deadline` | Project deadline |