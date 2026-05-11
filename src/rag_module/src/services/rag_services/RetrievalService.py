import os
import json
from dotenv import load_dotenv
from google import genai
from src.services.database_client.ChromaDBClient import ChromaDBClient
from src.services.rag_services.EmbeddingModel import EmbeddingModel
from src.services.rag_services.ReRankerModel import ReRankerModel

load_dotenv()


class RetrievalService:

    # number of chunks to retrieve from ChromaDB via cosine similarity
    # higher K = more candidates for re-ranker to score
    TOP_K = 15

    # number of top chunks to keep after re-ranking
    # only these go into the Gemini prompt
    TOP_N_AFTER_RERANK = 5

    def __init__(self):
        # step 1 — load shared embedding model — Singleton
        print("Loading embedding model for retrieval...")
        self.embedding_model = EmbeddingModel.get_instance()
        print("Embedding model loaded.")

        # step 2 — load shared re-ranker model — Singleton
        self.reranker = ReRankerModel.get_instance()

        # step 3 — initialise ChromaDB client
        self.chroma = ChromaDBClient()

        # step 4 — initialise Gemini client
        api_key = os.getenv("GEMINI_API_KEY")
        gemini_model = os.getenv("GEMINI_MODEL")

        if not api_key:
            raise Exception("GEMINI_API_KEY not found in .env")
        if not gemini_model:
            raise Exception("GEMINI_MODEL not found in .env")

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
        print("Embedding teacher context...")
        context_embedding = self.embedding_model.encode(context)
        context_embedding_list = context_embedding.tolist()

        # step 2 — check total chunks available
        total_count = self.chroma.collection.count()
        print(f"Total chunks in ChromaDB: {total_count}")

        if total_count == 0:
            raise Exception(
                "ChromaDB is empty. Upload course materials first via /ingest."
            )

        k = min(self.TOP_K, total_count)

        # step 3 — retrieve top-K chunks via cosine similarity
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

        retrieved_documents = query_results["documents"][0]
        retrieved_metadatas = query_results["metadatas"][0]
        retrieved_ids = query_results["ids"][0]

        if len(retrieved_documents) == 0:
            raise Exception(
                f"No chunks found for course_id={course_id} and "
                f"teacher_id={teacher_id}. "
                f"Make sure documents were uploaded with matching metadata."
            )

        print(f"Retrieved {len(retrieved_documents)} chunks from ChromaDB.")

        # step 4 — re-rank retrieved chunks using cross-encoder
        # cross-encoder reads query + chunk together — more precise than cosine
        # scores each of the 15 candidates against the teacher context
        print(f"Re-ranking {len(retrieved_documents)} chunks...")

        # build pairs of [query, chunk] for the cross-encoder
        rerank_pairs = []
        for doc in retrieved_documents:
            rerank_pairs.append([context, doc])

        # score all pairs — higher score = more relevant
        rerank_scores = self.reranker.predict(rerank_pairs)

        # zip chunks with their scores for sorting
        scored_chunks = []
        for i in range(len(retrieved_documents)):
            scored_chunks.append({
                "document": retrieved_documents[i],
                "metadata": retrieved_metadatas[i],
                "id": retrieved_ids[i],
                "score": float(rerank_scores[i])
            })

        # sort by score descending — most relevant first
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)

        # keep only top N after re-ranking
        top_chunks = scored_chunks[:self.TOP_N_AFTER_RERANK]

        print(f"Re-ranking complete. Kept top {len(top_chunks)} chunks.")
        print(f"Top chunk scores: {[round(c['score'], 3) for c in top_chunks]}")

        # step 5 — assemble context block from re-ranked chunks
        context_block = ""
        for index in range(len(top_chunks)):
            context_block = context_block + f"\n--- Chunk {index + 1} ---\n"
            context_block = context_block + top_chunks[index]["document"]
            context_block = context_block + "\n"

        # step 6 — build few-shot example
        few_shot_example = """
{
    "title": "Student Grade Management System",
    "context_description": "A backend application for managing student grades using ORM and relational database design.",
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
        ".env.example": "template with all required environment variables"
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

        # step 7 — build prompt
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

COURSE MATERIALS (retrieved and re-ranked from uploaded documents):
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

        # step 9 — parse JSON response
        cleaned_response = raw_response.strip()
        if cleaned_response.startswith("```"):
            lines = cleaned_response.split("\n")
            cleaned_response = "\n".join(lines[1:-1])

        try:
            blueprints = json.loads(cleaned_response)
        except json.JSONDecodeError as e:
            raise Exception(
                f"Gemini returned invalid JSON: {str(e)}. "
                f"Raw response preview: {raw_response[:500]}"
            )

        # step 10 — build chunk sources for traceability
        # shows teacher which chunks were used after re-ranking
        chunks_used = []
        for index in range(len(top_chunks)):
            chunk_source = {
                "chunk_id": top_chunks[index]["id"],
                "source_filename": top_chunks[index]["metadata"].get("source_filename", "unknown"),
                "document_type": top_chunks[index]["metadata"].get("document_type", "unknown"),
                "strategy_used": top_chunks[index]["metadata"].get("strategy_used", "unknown"),
                "rerank_score": round(top_chunks[index]["score"], 3),
                "preview": top_chunks[index]["document"][:150] + "..."
            }
            chunks_used.append(chunk_source)

        # step 11 — return final response
        return {
            "blueprints": blueprints,
            "chunks_used": chunks_used
        }