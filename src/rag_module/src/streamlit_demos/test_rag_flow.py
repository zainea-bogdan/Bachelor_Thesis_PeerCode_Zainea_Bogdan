import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import streamlit as st
import requests
import json
import tempfile


st.set_page_config(
    page_title="RAG Pipeline — test harness",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ── config ────────────────────────────────────────────────────
BASE_URL = "http://127.0.0.1:8001"

# ── sidebar ───────────────────────────────────────────────────
st.sidebar.title("RAG test harness")
st.sidebar.caption("Simulates Node.js + teacher frontend inputs")
st.sidebar.markdown("---")

st.sidebar.markdown("**Simulated metadata**")
course_id = st.sidebar.text_input("course_id", value="CS101")
course_name = st.sidebar.text_input("course_name", value="Web Technologies Semester 2")
teacher_id = st.sidebar.text_input("teacher_id", value="T001")
university_year = st.sidebar.selectbox(
    "university_year",
    ["2023-2024", "2024-2025", "2025-2026"],
    index=1
)

st.sidebar.markdown("---")

# ── server status check ───────────────────────────────────────
try:
    requests.get(f"{BASE_URL}/docs", timeout=2)
    st.sidebar.success("FastAPI server running")
except Exception:
    st.sidebar.error("FastAPI server not running — start uvicorn first")

# ── main tabs ─────────────────────────────────────────────────
st.title("RAG Pipeline — test harness")

tab_ingest, tab_generate, tab_chroma = st.tabs([
    "Pipeline 1 — Ingest document",
    "Pipeline 2 — Generate blueprints",
    "ChromaDB — manage collection"
])

# ══════════════════════════════════════════════════════════════
# TAB 1 — INGEST
# ══════════════════════════════════════════════════════════════
with tab_ingest:
    st.subheader("Upload and index a document")
    st.caption("Simulates teacher uploading course material with index toggle enabled")

    uploaded_file = st.file_uploader(
        "Select document",
        type=["pdf", "docx", "pptx"]
    )

    if uploaded_file:
        col1, col2, col3 = st.columns(3)
        col1.metric("Filename", uploaded_file.name)
        col2.metric("Type", uploaded_file.name.split(".")[-1].upper())
        col3.metric("Size", f"{round(uploaded_file.size / 1024, 1)} KB")

        st.markdown("---")

        if st.button("Ingest document", type="primary"):
            with st.spinner("Parsing, embedding and storing in ChromaDB..."):
                try:
                    files = {
                        "file": (
                            uploaded_file.name,
                            uploaded_file.getvalue(),
                            "application/octet-stream"
                        )
                    }
                    data = {
                        "course_id": course_id,
                        "teacher_id": teacher_id,
                        "university_year": university_year
                    }
                    response = requests.post(
                        f"{BASE_URL}/ingest",
                        files=files,
                        data=data,
                        timeout=120
                    )

                    if response.status_code == 200:
                        result = response.json()
                        st.success(f"Successfully stored {result['chunks_stored']} chunks in ChromaDB")
                        st.json(result)
                    else:
                        st.error(f"Ingestion failed: {response.json().get('detail', 'unknown error')}")

                except requests.exceptions.ConnectionError:
                    st.error("Cannot connect to FastAPI server. Make sure uvicorn is running on port 8001.")
                except Exception as e:
                    st.error(f"Unexpected error: {str(e)}")
    else:
        st.info("Upload a PDF, DOCX, or PPTX file to begin ingestion.")
        st.markdown("""
        **What happens when you ingest:**
        - Document is parsed into chunks
        - Each chunk is embedded with `all-mpnet-base-v2`
        - Chunks are stored in ChromaDB with course and teacher metadata
        - Duplicate chunks are safely overwritten via upsert
        """)

# ══════════════════════════════════════════════════════════════
# TAB 2 — GENERATE
# ══════════════════════════════════════════════════════════════
with tab_generate:
    st.subheader("Generate project blueprints")
    st.caption("Simulates teacher filling the blueprint generation form")

    col1, col2 = st.columns(2)

    with col1:
        context = st.text_area(
            "Teacher context (required, min 50 chars)",
            placeholder="Describe what you want the projects to focus on. Include key topics, expected student level, and any specific requirements...",
            height=150
        )

        domain = st.text_input(
            "Application domain (optional)",
            placeholder="e.g. finance, logistics, healthcare, e-commerce"
        )

        projects_count = st.selectbox(
            "Number of projects to generate",
            [1, 2, 3],
            index=1
        )

    with col2:
        st.markdown("**Difficulty per project slot**")
        st.caption("Each slot must have a unique difficulty level")

        difficulty_options = ["easy", "medium", "hard"]
        difficulty_per_slot = []

        used_difficulties = []
        valid = True

        for i in range(projects_count):
            available = [d for d in difficulty_options if d not in used_difficulties]
            if not available:
                st.error(f"No difficulty levels left for Project {i + 1}")
                valid = False
                break
            selected = st.selectbox(
                f"Project {i + 1} difficulty",
                available,
                key=f"difficulty_{i}"
            )
            difficulty_per_slot.append(selected)
            used_difficulties.append(selected)

        st.markdown("---")
        start_date = st.date_input("Start date")
        deadline = st.date_input("Deadline")

    st.markdown("---")

    if len(context.strip()) < 50:
        st.warning(f"Context must be at least 50 characters. Current: {len(context.strip())}")

    can_generate = len(context.strip()) >= 50 and valid and deadline > start_date

    if not deadline > start_date:
        st.error("Deadline must be after start date.")

    if st.button("Generate blueprints", type="primary", disabled=not can_generate):
        with st.spinner("Retrieving chunks, assembling prompt, calling Gemini..."):
            try:
                payload = {
                    "course_id": course_id,
                    "course_name": course_name,
                    "teacher_id": teacher_id,
                    "context": context,
                    "domain": domain,
                    "projects_count": projects_count,
                    "difficulty_per_slot": difficulty_per_slot,
                    "start_date": str(start_date),
                    "deadline": str(deadline)
                }

                response = requests.post(
                    f"{BASE_URL}/generate",
                    json=payload,
                    timeout=120
                )

                if response.status_code == 200:
                    result = response.json()
                    blueprints = result.get("blueprints", [])
                    chunks_used = result.get("chunks_used", [])

                    st.success(f"Generated {len(blueprints)} blueprint(s) successfully")

                    # ── display blueprints ────────────────────────
                    for i in range(len(blueprints)):
                        blueprint = blueprints[i]
                        st.markdown("---")
                        st.markdown(f"### Project {i + 1} — {blueprint.get('title', 'Untitled')}")

                        col_a, col_b, col_c = st.columns(3)
                        col_a.metric("Difficulty", blueprint.get("difficulty", "N/A"))
                        col_b.metric("Domain", blueprint.get("domain", "N/A"))
                        col_c.metric("Deadline", blueprint.get("deadline", "N/A"))

                        st.markdown("**Context description:**")
                        st.write(blueprint.get("context_description", ""))

                        st.markdown("**Minimum specifications:**")
                        specs = blueprint.get("minimum_specs", [])
                        for spec in specs:
                            st.write(f"- {spec}")

                        col_left, col_right = st.columns(2)

                        with col_left:
                            st.markdown("**Expected folder structure:**")
                            folder_structure = blueprint.get("expected_folder_structure", {})
                            for path in folder_structure:
                                st.code(f"{path}  →  {folder_structure[path]}")

                        with col_right:
                            st.markdown("**Commit conventions:**")
                            conventions = blueprint.get("commit_conventions", {})
                            for convention in conventions:
                                st.write(f"`{convention}` — {conventions[convention]}")

                        with st.expander("View raw JSON"):
                            st.json(blueprint)

                    # ── chunk traceability ────────────────────────
                    st.markdown("---")
                    with st.expander(f"Source chunks used ({len(chunks_used)} chunks retrieved from ChromaDB)"):
                        st.caption("These are the course material chunks that informed the blueprint generation")
                        for i in range(len(chunks_used)):
                            chunk = chunks_used[i]
                            st.markdown(f"**Chunk {i + 1}** — `{chunk['source_filename']}` — `{chunk['strategy_used']}`")
                            st.text(chunk.get("preview", ""))
                            st.markdown("---")

                    # ── download option ───────────────────────────
                    st.download_button(
                        label="Download blueprints as JSON",
                        data=json.dumps(blueprints, indent=2),
                        file_name=f"blueprints_{course_id}.json",
                        mime="application/json"
                    )

                else:
                    st.error(f"Generation failed: {response.json().get('detail', 'unknown error')}")

            except requests.exceptions.ConnectionError:
                st.error("Cannot connect to FastAPI server. Make sure uvicorn is running on port 8001.")
            except Exception as e:
                st.error(f"Unexpected error: {str(e)}")

# ══════════════════════════════════════════════════════════════
# TAB 3 — CHROMADB MANAGEMENT
# ══════════════════════════════════════════════════════════════
with tab_chroma:
    st.subheader("ChromaDB collection management")
    st.caption("View and manage what is stored in ChromaDB")

    col1, col2 = st.columns(2)

    with col1:
        if st.button("Check collection count"):
            try:
                sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
                from src.services.database_client.ChromaDBClient import ChromaDBClient
                client = ChromaDBClient()
                count = client.collection.count()
                st.metric("Total chunks in ChromaDB", count)

                if count > 0:
                    results = client.collection.peek(limit=3)
                    st.markdown("**Sample metadata from stored chunks:**")
                    for i in range(len(results["ids"])):
                        st.json({
                            "id": results["ids"][i][:16] + "...",
                            "metadata": results["metadatas"][i]
                        })
            except Exception as e:
                st.error(f"Could not connect to ChromaDB: {str(e)}")

    with col2:
        st.markdown("**Clear entire collection**")
        st.warning("This will delete ALL chunks from ChromaDB. You will need to re-ingest all documents.")

        confirm = st.checkbox("I understand this is irreversible")

        if st.button("Clear ChromaDB", type="primary", disabled=not confirm):
            try:
                response = requests.delete(
                    f"{BASE_URL}/ingest/clear",
                    timeout=30
                )
                if response.status_code == 200:
                    result = response.json()
                    st.success(f"Cleared {result.get('deleted', 0)} chunks from ChromaDB")
                else:
                    st.error(f"Clear failed: {response.json().get('detail', 'unknown error')}")
            except requests.exceptions.ConnectionError:
                st.error("Cannot connect to FastAPI server.")
            except Exception as e:
                st.error(f"Unexpected error: {str(e)}")