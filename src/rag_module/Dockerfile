FROM python:3.11-slim

WORKDIR /app

# Build tools needed for C extensions (chromadb's hnswlib)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install CPU-only PyTorch first — prevents sentence-transformers from pulling
# the CUDA variant (~3GB) when it resolves its torch dependency
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

COPY main.py .
COPY src/ ./src/

# ChromaDB stores vectors here — bind-mount your host folder to this path at runtime
ENV CHROMA_PATH=/app/src/chromadb

# HuggingFace model cache — bind-mount C:\Users\bodoz\.cache\huggingface\hub here
# so bge-m3 and the cross-encoder are found instantly without re-downloading
ENV HF_HOME=/root/.cache/huggingface
ENV HUGGINGFACE_HUB_CACHE=/root/.cache/huggingface/hub

ENV PYTHONUNBUFFERED=1

EXPOSE 8002

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]