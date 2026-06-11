"""PDF extraction and text chunking service.

PDF Analysis (NVIDIA-2025-Annual-Report-compressed.pdf):
  - 181 pages, ~665K extractable characters
  - 180 text-rich pages, ~0 image-only pages
  - Estimated ~900-1000 chunks at size=800, overlap=80
  - Contains: Annual Review, Proxy Statement, Form 10-K financials
  - Note: compressed PDF has some unicode replacement chars (needs cleaning)
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import List

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)


@dataclass
class TextChunk:
    """Represents a single text chunk extracted from the PDF."""
    chunk_id: str
    text: str
    page: int
    source: str = "nvidia_financial_2025"
    metadata: dict = field(default_factory=dict)


class PDFProcessor:
    """
    Extracts text from a PDF and splits it into overlapping chunks.

    Strategy:
        1. Extract text page-by-page using PyMuPDF (fast, accurate).
        2. Skip pages yielding only whitespace / near-blank pages.
        3. Clean unicode artifacts (replacement chars from compressed PDFs).
        4. Slide a window of `chunk_size` chars with `overlap` within each page.
        5. Each chunk carries page provenance for source citations.
    """

    def __init__(self, chunk_size: int = 800, overlap: int = 80):
        if overlap >= chunk_size:
            raise ValueError("overlap must be smaller than chunk_size")
        self.chunk_size = chunk_size
        self.overlap = overlap

    # ── Public API ────────────────────────────────────────────────────────────

    def process(self, pdf_path: str) -> List[TextChunk]:
        """Extract text from PDF and return a list of TextChunk objects."""
        logger.info("Processing PDF: %s", pdf_path)
        raw_pages = self._extract_pages(pdf_path)
        chunks = self._chunk_pages(raw_pages, pdf_path)
        logger.info("Total chunks produced: %d", len(chunks))
        return chunks

    # ── Private Helpers ───────────────────────────────────────────────────────

    def _extract_pages(self, pdf_path: str) -> List[dict]:
        """Return list of {page, text} dicts, skipping near-blank pages."""
        pages: List[dict] = []
        with fitz.open(pdf_path) as doc:
            total = len(doc)
            logger.info("PDF has %d pages", total)
            for page_num, page in enumerate(doc, start=1):
                text = page.get_text("text")
                cleaned = self._clean_text(text)
                if len(cleaned) < 30:   # skip near-empty / image-only pages
                    continue
                pages.append({"page": page_num, "text": cleaned})
        logger.info("Extractable pages: %d / %d", len(pages), total)
        return pages

    @staticmethod
    def _clean_text(text: str) -> str:
        """
        Normalise whitespace and remove artifacts from compressed PDFs.
        Handles:
          - Unicode replacement characters (\\ufffd) from compressed PDFs
          - Non-printable control characters
          - Multiple consecutive whitespace → single space
          - Curly quotes → straight quotes for clean tokenisation
        """
        # Remove unicode replacement chars (common in compressed PDFs)
        text = text.replace("\ufffd", "'")

        # Normalise curly quotes and special dashes
        text = text.replace("\u2018", "'").replace("\u2019", "'")
        text = text.replace("\u201c", '"').replace("\u201d", '"')
        text = text.replace("\u2013", "-").replace("\u2014", "-")
        text = text.replace("\u2022", "*")   # bullet

        # Keep printable ASCII + common unicode letters; remove control chars
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

        # Collapse multiple whitespace into single space
        text = re.sub(r"[ \t]+", " ", text)

        # Collapse more than 2 consecutive newlines into 2
        text = re.sub(r"\n{3,}", "\n\n", text)

        # Final strip
        return text.strip()

    def _chunk_pages(self, pages: List[dict], pdf_path: str) -> List[TextChunk]:
        """
        Slide a window across each page's text with overlap.
        Chunks stay within page boundaries to preserve citation accuracy.
        """
        chunks: List[TextChunk] = []
        source_name = pdf_path.replace("\\", "/").split("/")[-1]

        for page_data in pages:
            page_num = page_data["page"]
            text = page_data["text"]

            if len(text) <= self.chunk_size:
                # Entire page fits in one chunk — no splitting needed
                chunk_id = f"p{page_num}_c0"
                chunks.append(
                    TextChunk(
                        chunk_id=chunk_id,
                        text=text,
                        page=page_num,
                        source=source_name,
                        metadata={"page": page_num, "chunk_index": 0},
                    )
                )
                continue

            # Sliding window within page
            start = 0
            chunk_idx = 0
            while start < len(text):
                end = min(start + self.chunk_size, len(text))
                chunk_text = text[start:end].strip()

                if len(chunk_text) >= 50:   # skip trivially short tails
                    chunk_id = f"p{page_num}_c{chunk_idx}"
                    chunks.append(
                        TextChunk(
                            chunk_id=chunk_id,
                            text=chunk_text,
                            page=page_num,
                            source=source_name,
                            metadata={"page": page_num, "chunk_index": chunk_idx},
                        )
                    )
                    chunk_idx += 1

                if end == len(text):
                    break
                start += self.chunk_size - self.overlap

        return chunks
