import os
import hashlib
from sentence_transformers import SentenceTransformer

from src.services.ChromaDBClient import ChromaDBClient
from src.services.DOCXParsingService import DocxParsingService
from src.services.PdfParsingService import PdfParsingService
from src.services.PPTXParsingService import PptxParsingService


class IngestionService:

    # embedding model name
    # same model must be used at ingestion AND retrieval time
    # changing this invalidates all stored vectors in ChromaDB
    EMBEDDING_MODEL = "all-mpnet-base-v2"

    def __init__(self):

        # step 1 — load the embedding model once at startup
        # first run downloads ~420MB from HuggingFace cache
        # every subsequent run loads from local disk — no internet needed
        print(f"Loading embedding model: {self.EMBEDDING_MODEL}")
        self.embedding_model = SentenceTransformer(self.EMBEDDING_MODEL)
        print("Embedding model loaded successfully.")

        # step 2 — initialise ChromaDB client
        # connects to persistent storage at CHROMA_PATH from .env
        self.chroma = ChromaDBClient()

        # step 3 — initialise all three parsers
        # each parser handles one file type
        self.docx_parser = DocxParsingService()
        self.pdf_parser = PdfParsingService()
        self.pptx_parser = PptxParsingService()

    def ingest_document(
        self,
        file_path: str,
        course_id: str,
        teacher_id: str,
        university_year: str
    ) -> dict:

        # step 1 — detect file type from extension
        file_extension = os.path.splitext(file_path)[1].lower()

        # step 2 — route to the correct parser
        # each parser returns list[dict] with text + metadata
        if file_extension == ".docx":
            print(f"Parsing DOCX: {file_path}")
            chunks = self.docx_parser.parse_docx(file_path)

        elif file_extension == ".pdf":
            print(f"Parsing PDF: {file_path}")
            chunks = self.pdf_parser.parse_pdf(file_path)

        elif file_extension == ".pptx":
            print(f"Parsing PPTX: {file_path}")
            chunks = self.pptx_parser.parse_pptx(file_path)

        else:
            raise Exception(
                f"Unsupported file type: {file_extension}. "
                f"Supported types: .docx .pdf .pptx"
            )

        # step 3 — validate we got chunks back
        if len(chunks) == 0:
            raise Exception(
                f"No chunks produced from {os.path.basename(file_path)}. "
                f"Document may be empty or image-only."
            )

        print(f"Parsed {len(chunks)} chunks from {os.path.basename(file_path)}")

        # step 4 — collect all chunk texts into one list
        # we embed them in one batch — faster than one by one
        chunk_texts = []
        for chunk in chunks:
            chunk_texts.append(chunk["text"])

        # step 5 — embed all chunks in one batch call
        # returns a numpy array of shape (num_chunks, 768)
        print(f"Embedding {len(chunk_texts)} chunks...")
        embeddings = self.embedding_model.encode(
            chunk_texts,
            show_progress_bar=False
        )
        print("Embedding complete.")

        # step 6 — prepare four parallel lists for ChromaDB
        # ChromaDB upsert expects: ids, documents, metadatas, embeddings
        ids = []
        documents = []
        metadatas = []
        embeddings_list = []

        for index in range(len(chunks)):

            chunk = chunks[index]
            embedding = embeddings[index]

            # build a deterministic unique ID for this chunk
            # same file + same position = same ID every time
            # this prevents duplicate chunks if teacher re-uploads
            chunk_id = self._build_chunk_id(
                course_id=course_id,
                filename=chunk["metadata"]["source_filename"],
                chunk_index=chunk["metadata"]["chunk_index"]
            )

            # enrich the parser metadata with course and teacher context
            # this is the full metadata stored in ChromaDB per chunk
            enriched_metadata = {
                "source_filename": chunk["metadata"]["source_filename"],
                "document_type": chunk["metadata"]["document_type"],
                "chunk_index": chunk["metadata"]["chunk_index"],
                "strategy_used": chunk["metadata"]["strategy_used"],
                "course_id": course_id,
                "teacher_id": teacher_id,
                "university_year": university_year
            }

            # convert embedding from numpy array to plain python list
            # ChromaDB requires plain python lists, not numpy arrays
            embedding_as_list = embedding.tolist()

            # add to the four parallel lists
            ids.append(chunk_id)
            documents.append(chunk["text"])
            metadatas.append(enriched_metadata)
            embeddings_list.append(embedding_as_list)

        # step 7 — store everything in ChromaDB
        # upsert = insert if new, update if ID already exists
        # this means re-uploading a file is always safe
        print(f"Storing {len(ids)} chunks in ChromaDB...")
        self.chroma.collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
            embeddings=embeddings_list
        )
        print("Storage complete.")

        # step 8 — return a summary to the router
        return {
            "status": "success",
            "filename": os.path.basename(file_path),
            "chunks_stored": len(chunks),
            "course_id": course_id,
            "teacher_id": teacher_id,
            "university_year": university_year
        }

    def _build_chunk_id(
        self,
        course_id: str,
        filename: str,
        chunk_index: int
    ) -> str:

        # combine course_id + filename + chunk_index into one string
        raw_string = f"{course_id}_{filename}_{chunk_index}"

        # hash it with MD5 to get a fixed-length unique ID
        # MD5 produces a 32-character hex string
        # example: "a3f2b1c4d5e6..." 
        chunk_id = hashlib.md5(raw_string.encode()).hexdigest()

        return chunk_id