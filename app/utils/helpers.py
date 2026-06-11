"""Utility helpers."""
from __future__ import annotations

import os
import uuid


def generate_session_id() -> str:
    """Generate a unique session identifier."""
    return str(uuid.uuid4())


def allowed_file(filename: str, allowed_extensions: set = frozenset({"pdf"})) -> bool:
    """Check if the uploaded file has an allowed extension."""
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in allowed_extensions
    )


def safe_filename(filename: str) -> str:
    """Return a sanitised filename to prevent path traversal attacks."""
    # Use werkzeug's secure_filename
    from werkzeug.utils import secure_filename
    return secure_filename(filename)
