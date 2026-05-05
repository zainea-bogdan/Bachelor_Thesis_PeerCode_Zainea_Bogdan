import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.PdfParsingService import PdfParsingService
import streamlit as st
import tempfile
import fitz

st.set_page_config(
    page_title="PDF Parsing — test harness",
    layout="wide",
    initial_sidebar_state="expanded"
)



service = PdfParsingService()

# ── sidebar ──
st.sidebar.title("PDF parsing harness")
st.sidebar.markdown("---")
uploaded_pdf = st.sidebar.file_uploader("Upload a PDF", type=["pdf"])
st.sidebar.markdown("---")
st.sidebar.markdown("**Display options**")
show_raw_text = st.sidebar.checkbox("Show full chunk text", value=False)
words_per_chunk_threshold = st.sidebar.slider(
    "Flag chunks below (words)",
    min_value=0,
    max_value=200,
    value=20,
    help="Chunks below this word count are highlighted as potentially sparse"
)

# ── main ──
st.title("PDF parsing — test harness")

if not uploaded_pdf:
    st.info("Upload a PDF from the sidebar to begin.")

    col1, col2 = st.columns(2)
    with col1:
        st.markdown("### What this tests")
        st.markdown("""
        - Every non-empty page → one chunk
        - Blank and image-only pages → skipped
        - `chunk_index` = original page number
        - Strategy: `page_chunking` (fixed, no thresholds needed)
        """)
    with col2:
        st.markdown("### What to look for")
        st.markdown("""
        - Total chunks ≈ total pages (small gap = skipped pages)
        - No suspiciously short chunks (image-heavy pages)
        - Text reads coherently per chunk
        - chunk_index matches expected page numbers
        """)
    st.stop()

# ── save uploaded file ──
with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
    tmp.write(uploaded_pdf.read())
    tmp_path = tmp.name

# ── document preview ──
try:
    raw_doc = fitz.open(tmp_path)
    total_pages = len(raw_doc)
    raw_doc.close()
except Exception as e:
    st.error(f"Failed to open PDF: {e}")
    os.unlink(tmp_path)
    st.stop()

st.subheader("Document overview")
m1, m2, m3 = st.columns(3)
m1.metric("Total pages", total_pages)
m2.metric("Filename", uploaded_pdf.name)
m3.metric("File size", f"{round(uploaded_pdf.size / 1024, 1)} KB")

st.markdown("---")

# ── run parsing ──
run_col, _ = st.columns([1, 4])
with run_col:
    run = st.button("Run parsing", type="primary", use_container_width=True)

if not run:
    st.stop()

with st.spinner("Parsing document..."):
    try:
        chunks = service.parse_pdf(tmp_path)
    except Exception as e:
        st.error(f"Parsing failed: {e}")
        os.unlink(tmp_path)
        st.stop()

if not chunks:
    st.error("No chunks produced — document may be image-only or empty.")
    os.unlink(tmp_path)
    st.stop()

# ── summary metrics ──
st.subheader("Parsing results")

word_counts = [len(c["text"].split()) for c in chunks]
total_words = sum(word_counts)
avg_words = round(total_words / len(chunks), 1)
skipped_pages = total_pages - len(chunks)
sparse_chunks = [c for c in chunks if len(c["text"].split()) < words_per_chunk_threshold]

m1, m2, m3, m4, m5 = st.columns(5)
m1.metric("Chunks produced", len(chunks))
m2.metric("Pages skipped", skipped_pages)
m3.metric("Total words", total_words)
m4.metric("Avg words/chunk", avg_words)
m5.metric(
    "Sparse chunks",
    len(sparse_chunks),
    delta=f"below {words_per_chunk_threshold} words",
    delta_color="inverse" if sparse_chunks else "off"
)

st.markdown("---")

# ── word count distribution ──
st.subheader("Word count distribution")

dist_col1, dist_col2 = st.columns([2, 1])

with dist_col1:
    buckets = {
        "< 50 words": 0,
        "50–100 words": 0,
        "100–200 words": 0,
        "200–400 words": 0,
        "400–600 words": 0,
        "> 600 words": 0
    }
    for wc in word_counts:
        if wc < 50:
            buckets["< 50 words"] += 1
        elif wc < 100:
            buckets["50–100 words"] += 1
        elif wc < 200:
            buckets["100–200 words"] += 1
        elif wc < 400:
            buckets["200–400 words"] += 1
        elif wc < 600:
            buckets["400–600 words"] += 1
        else:
            buckets["> 600 words"] += 1

    max_count = max(buckets.values()) if buckets.values() else 1
    for label, count in buckets.items():
        bar_width = int((count / max_count) * 100) if max_count > 0 else 0
        col_label, col_bar, col_count = st.columns([2, 5, 1])
        with col_label:
            st.markdown(f"<small>{label}</small>", unsafe_allow_html=True)
        with col_bar:
            if count > 0:
                st.markdown(
                    f'<div style="background: #2E75B6; height: 20px; width: {bar_width}%; border-radius: 3px; margin-top: 4px;"></div>',
                    unsafe_allow_html=True
                )
            else:
                st.markdown(
                    f'<div style="background: #444; height: 20px; width: 4px; border-radius: 3px; margin-top: 4px;"></div>',
                    unsafe_allow_html=True
                )
        with col_count:
            st.markdown(f"<small>**{count}**</small>", unsafe_allow_html=True)

with dist_col2:
    st.markdown("**Quick stats**")
    st.markdown(f"Min: `{min(word_counts)}` words")
    st.markdown(f"Max: `{max(word_counts)}` words")
    st.markdown(f"Median: `{sorted(word_counts)[len(word_counts)//2]}` words")
    if skipped_pages > 0:
        st.warning(f"{skipped_pages} page(s) skipped — likely blank or image-only")
    else:
        st.success("No pages skipped")

st.markdown("---")

# ── sparse chunk warning ──
if sparse_chunks:
    with st.expander(f"⚠ {len(sparse_chunks)} sparse chunk(s) detected — click to review"):
        for c in sparse_chunks:
            st.markdown(f"**Page {c['metadata']['chunk_index']}** — {len(c['text'].split())} words")
            st.code(c["text"][:300])
            st.markdown("---")

# ── chunk inspector ──
st.subheader("Chunk inspector")

search_term = st.text_input("Search chunks by text content", placeholder="type to filter chunks...")

filtered_chunks = chunks
if search_term:
    filtered_chunks = [
        c for c in chunks
        if search_term.lower() in c["text"].lower()
    ]
    st.caption(f"{len(filtered_chunks)} of {len(chunks)} chunks match '{search_term}'")

if not filtered_chunks:
    st.warning("No chunks match your search.")
else:
    for i, chunk in enumerate(filtered_chunks):
        word_count = len(chunk["text"].split())
        page_num = chunk["metadata"]["chunk_index"]
        is_sparse = word_count < words_per_chunk_threshold

        label = f"Page {page_num} → Chunk {i} — {word_count} words"
        if is_sparse:
            label = f"⚠ " + label + " (sparse)"

        with st.expander(label, expanded=False):
            text_tab, meta_tab = st.tabs(["Text", "Metadata"])

            with text_tab:
                text_to_show = chunk["text"] if show_raw_text else chunk["text"][:600]
                if not show_raw_text and len(chunk["text"]) > 600:
                    text_to_show += f"\n\n... [{len(chunk['text']) - 600} more characters — enable 'Show full chunk text' in sidebar]"
                st.text(text_to_show)

                if search_term:
                    occurrences = chunk["text"].lower().count(search_term.lower())
                    st.caption(f"'{search_term}' appears {occurrences} time(s) in this chunk")

            with meta_tab:
                st.json(chunk["metadata"])

os.unlink(tmp_path)