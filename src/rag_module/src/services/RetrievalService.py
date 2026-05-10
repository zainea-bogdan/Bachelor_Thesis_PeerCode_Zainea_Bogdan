import os
import json
from dotenv import load_dotenv
from google import genai
from sentence_transformers import SentenceTransformer

from src.services.ChromaDBClient import ChromaDBClient

load_dotenv()


class RetrievalService:

    # number of chunks to retrieve per query
    # higher K = more context but more noise risk
    TOP_K = 15

    # same embedding model as ingestion
    # MUST match — different model = invalid similarity scores
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL")
    

    # commit conventions — fixed platform standard
    # same for every blueprint regardless of course
    COMMIT_CONVENTIONS = {
        "DONE": "used for completed working features pushed at end of session",
        "FIX": "used for bug fixes or broken code corrections pushed",
        "WIP": "work in progress — not yet functional, pushed for backup only"
    }

    def __init__(self):
        # step 1 — load embedding model
        # must be the same instance/model used at ingestion time
        print("Loading embedding model for retrieval...")
        self.embedding_model = SentenceTransformer(self.EMBEDDING_MODEL)
        print("Embedding model loaded.")

        # step 2 — initialise ChromaDB client
        self.chroma = ChromaDBClient()

        # step 3 — initialise Gemini client
        api_key = os.getenv("GEMINI_API_KEY")
        gemini_model = os.getenv("GEMINI_MODEL")

        if not api_key:
            raise Exception("GEMINI_API_KEY not found in .env")

        self.gemini_client = genai.Client(api_key=api_key)
        self.gemini_model = gemini_model

    def generate_blueprints(
        self,
        course_id: str,
        course_name: str,
        teacher_id: str,
        context: str,
        domain: str,
        projects_count: int,
        difficulty_per_slot: list[str],
        start_date: str,
        deadline: str
    ) -> dict:

        # step 1 — embed the teacher's context text
        # this produces a 768-dim vector representing
        # the semantic meaning of what the teacher wants
        print("Embedding teacher context...")
        context_embedding = self.embedding_model.encode(context)
        context_embedding_list = context_embedding.tolist()

        # step 2 — check total chunks available in ChromaDB
        # prevents querying more chunks than exist
        total_count = self.chroma.collection.count()
        print(f"Total chunks in ChromaDB: {total_count}")

        if total_count == 0:
            raise Exception(
                "ChromaDB is empty. Upload course materials first via /ingest."
            )

        # use minimum of TOP_K and available chunks
        # avoids ChromaDB error when n_results > total documents
        k = min(self.TOP_K, total_count)

        # step 3 — query ChromaDB for top-K similar chunks
        # filtered to this specific course and teacher only
        # this ensures we only retrieve relevant course materials
        print(f"Querying ChromaDB for top {k} chunks...")

        query_results = self.chroma.collection.query(
            query_embeddings=[context_embedding_list],
            n_results=k,
            where={
                "$and": [
                    {"course_id": {"$eq": course_id}},
                    {"teacher_id": {"$eq": teacher_id}}
                ]
            }
        )

        # step 4 — extract the retrieved chunks
        retrieved_documents = query_results["documents"][0]
        retrieved_metadatas = query_results["metadatas"][0]
        retrieved_ids = query_results["ids"][0]

        # check we got any results at all
        if len(retrieved_documents) == 0:
            raise Exception(
                f"No chunks found for course_id={course_id} and "
                f"teacher_id={teacher_id}. "
                f"Make sure documents were uploaded with matching course_id and teacher_id."
            )

        print(f"Retrieved {len(retrieved_documents)} chunks from ChromaDB.")

        # step 5 — assemble the context block from retrieved chunks
        # each chunk is numbered so the LLM can reference them
        context_block = ""
        for index in range(len(retrieved_documents)):
            context_block = context_block + f"\n--- Chunk {index + 1} ---\n"
            context_block = context_block + retrieved_documents[index]
            context_block = context_block + "\n"

        # step 6 — build the few-shot example
        # this shows Gemini exactly what JSON structure we expect
        # one complete example is enough to guide the model
        few_shot_example = """
{
    "title": "Student Grade Management System",
    "context_description": "A backend application for managing student grades using ORM and relational database design. Students will practice entity relationships, CRUD operations, and API design.",
    "minimum_specs": [
        "Implement at least 3 related database entities with proper relationships",
        "Use an ORM library for all database interactions",
        "Build a REST API with full CRUD operations",
        "Include input validation on all endpoints",
        "Write at least 5 unit tests"
    ],
    "expected_folder_structure": {
        "src/": "application source code",
        "src/models/": "ORM entity definitions",
        "src/routes/": "API route handlers",
        "src/controllers/": "business logic layer",
        "tests/": "unit and integration tests",
        ".gitignore": "must exclude node_modules, .env, dist/",
        ".env.example": "template with all required environment variables — no real values"
    },
    "commit_conventions": {
        "DONE": "used for completed working features pushed at end of session",
        "FIX": "used for bug fixes or broken code corrections",
        "WIP": "work in progress — not yet functional, pushed for backup only"
    },
    "domain": "finance",
    "difficulty": "medium",
    "start_date": "2024-10-01",
    "deadline": "2024-12-15"
}
"""

        # step 7 — build the full prompt
        # includes: course context, retrieved chunks,
        # teacher inputs, few-shot example, strict instructions
        domain_line = (
            f"Application domain: {domain}"
            if domain
            else "Application domain: infer from course materials"
        )

        difficulties_line = ""
        for i in range(len(difficulty_per_slot)):
            difficulties_line = difficulties_line + f"Project {i + 1}: {difficulty_per_slot[i]}\n"

        prompt = f"""
You are an academic project blueprint generator for university courses.
You must generate exactly {projects_count} project blueprint(s) based on the course materials provided.

COURSE INFORMATION:
Course name: {course_name}
Course ID: {course_id}
{domain_line}

TEACHER CONTEXT:
{context}

PROJECT REQUIREMENTS:
Number of projects to generate: {projects_count}
Difficulty levels:
{difficulties_line}
Start date: {start_date}
Deadline: {deadline}

COURSE MATERIALS (retrieved from uploaded documents):
{context_block}

INSTRUCTIONS:
1. Generate exactly {projects_count} blueprint(s) — one per difficulty level specified above.
2. Each blueprint must be directly grounded in the course materials provided above.
3. Do NOT invent topics that are not present in the course materials.
4. If the course materials do not contain enough information for a field, write "insufficient course material" for that field.
5. The expected_folder_structure must be minimal and realistic for a student project.
6. The commit_conventions must always be exactly as shown in the example — do not change them.
7. minimum_specs must be concrete and measurable — avoid vague requirements.
8. Adjust complexity of minimum_specs according to the difficulty level of each project.

RESPONSE FORMAT:
Respond with ONLY a valid JSON array. No explanation, no markdown, no code blocks.
Each element in the array must follow this exact structure:

{few_shot_example}

Generate {projects_count} blueprint(s) now:
"""

        # step 8 — call Gemini
        print(f"Calling Gemini model: {self.gemini_model}...")
        response = self.gemini_client.models.generate_content(
            model=self.gemini_model,
            contents=prompt
        )
        raw_response = response.text
        print("Gemini response received.")

        # step 9 — parse the JSON response
        # clean any potential markdown fences Gemini might add
        cleaned_response = raw_response.strip()

        if cleaned_response.startswith("```"):
            lines = cleaned_response.split("\n")
            # remove first line (```json or ```) and last line (```)
            cleaned_response = "\n".join(lines[1:-1])

        try:
            blueprints = json.loads(cleaned_response)
        except json.JSONDecodeError as e:
            raise Exception(
                f"Gemini returned invalid JSON: {str(e)}. "
                f"Raw response preview: {raw_response[:500]}"
            )

        # step 10 — build chunk sources for teacher traceability
        # teacher sees which chunks were used to generate the blueprints
        chunks_used = []
        for index in range(len(retrieved_ids)):
            chunk_source = {
                "chunk_id": retrieved_ids[index],
                "source_filename": retrieved_metadatas[index].get("source_filename", "unknown"),
                "document_type": retrieved_metadatas[index].get("document_type", "unknown"),
                "strategy_used": retrieved_metadatas[index].get("strategy_used", "unknown"),
                "preview": retrieved_documents[index][:150] + "..."
            }
            chunks_used.append(chunk_source)

        # step 11 — return final response
        return {
            "blueprints": blueprints,
            "chunks_used": chunks_used
        }