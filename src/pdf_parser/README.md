# PDF Parser Microservice

This readme documents the standalone PDF Parser microservice built for the PeerCode platform. Its role is to parse PDF course materials into text chunks that are then embedded and stored in ChromaDB by the RAG module.

---

## Why a Separate Microservice

The main RAG module uses `sentence-transformers 5.8` which requires `transformers >= 5.0`. The Marker PDF parsing library requires `transformers < 5.0`. These two cannot coexist in the same Python environment, so Marker runs in its own isolated Docker container and communicates with the RAG module over HTTP.

---

## How It Works

1. The RAG module sends a PDF file to `POST /parse-pdf` as a multipart upload.
2. Marker converts the PDF to structured markdown using layout detection models.
3. The markdown is split into text chunks using a paragraph buffer strategy (50 to 750 words per chunk).
4. The service returns a `list[dict]` where each dict contains the chunk text and its metadata.
5. The RAG module receives the chunks and proceeds with embedding and storage as normal.

The contract with the RAG module is identical to the other parsers (DOCX, PPTX) — same output format, same metadata fields.

---

## Chunking Strategy

Marker preserves document structure (headings, paragraphs, code blocks, tables) as markdown. The chunking applies the same buffer logic used by the DOCX parser:

- Blocks below 50 words are buffered and merged with the next block.
- Blocks between 50 and 750 words are flushed as a chunk.
- Blocks above 750 words cause the buffer to flush first, then the oversized block starts a fresh buffer.

Markdown symbols (`#`, `*`, backticks) are stripped before chunking so the embedded text is clean.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/parse-pdf` | Accepts a PDF file, returns parsed chunks |

Response format:
```json
{
  "chunks": [
    {
      "text": "chunk content here",
      "metadata": {
        "source_filename": "lecture.pdf",
        "document_type": "pdf",
        "chunk_index": 0,
        "strategy_used": "marker_paragraph_chunking"
      }
    }
  ]
}
```

---

## Running the Service

Build the image from inside `src/pdf_parser/`:

```
docker build -t pdf-parser .
```

Run the container:

```
docker run -d `
  --name pdf-parser `
  -e TORCH_DEVICE=cpu `
  -e HF_HUB_OFFLINE=1 `
  -p 8001:8001 `
  -v "<absolute-path-to>/src/pdf_parser/marker_model_cache:/root/.cache" `
  pdf-parser
```

> Replace `<absolute-path-to>` with the absolute path to the root of this repository on your machine.
> Example: `"W:\test_folder\project_name_saved_after_clone\src\pdf_parser\marker_model_cache:/root/.cache"`

`TORCH_DEVICE=cpu` explicitly sets inference to CPU. `HF_HUB_OFFLINE=1` prevents the container from attempting to check for model updates on startup, which avoids SSL errors on restricted networks.

On first startup, Marker downloads its layout detection and OCR models into `marker_model_cache/`. Subsequent restarts load from cache and are significantly faster.

The RAG module reads the service URL from the `PDF_PARSER_URL` environment variable. Default value is `http://localhost:8001`. Inside a Docker network set it to `http://pdf-parser:8001`.

---

## GPU Acceleration

An attempt was made to enable GPU acceleration using a GTX 1650 (4GB VRAM) with CUDA 12.8 inside Docker via the NVIDIA Container Toolkit on WSL2.

GPU passthrough was successfully configured and `torch.cuda.is_available()` returned `True` inside the container. However, benchmarking showed CPU was consistently faster than GPU for documents up to 21 pages:

| Test Case | Pages | CPU Time | GPU Time | Winner |
|-----------|-------|----------|----------|--------|
| Cold Start | 8 | 3:08 | 3:04 | GPU (+4s) |
| Warm Run | 8 | 3:07 | 3:15 | CPU (-8s) |
| Medium Doc | 9 | 3:05 | 3:38 | CPU (-33s) |
| Large Doc | 21 | 6:50 | 8:27 | CPU (-1:37) |

The root cause is VRAM pressure. Marker's models consume approximately 3.8GB of the available 4GB, leaving insufficient headroom for inference. This causes memory thrashing which makes GPU inference slower than CPU inference on available system RAM (32GB).

The service defaults to CPU. GPU acceleration becomes effective on cards with 8GB VRAM or more. To enable it, run the container with `--gpus all` and replace `TORCH_DEVICE=cpu` with `TORCH_DEVICE=cuda`.

---

## Known Limitations

- Processing time scales with document layout complexity, not just page count. Documents with dense tables, code blocks, and multi-column layouts take longer than plain text documents of the same length.
- Marker loads OCR models by default. Since all course materials are expected to be text-based PDFs, OCR is never triggered. A leaner configuration excluding OCR processors is feasible but out of scope.
- GPU acceleration requires a minimum of 8GB VRAM for Marker's model set.
- Multi-topic teacher contexts that span multiple uploaded documents produce weaker retrieval results due to single-vector embedding limitations. This is a retrieval architecture limitation, not a parsing limitation.
