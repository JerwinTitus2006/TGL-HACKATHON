import os
import hashlib
import shutil
from fastapi import UploadFile
from backend.app.config import settings

def compute_hash(file_bytes: bytes) -> str:
    """Compute SHA-256 hash of file contents."""
    return hashlib.sha256(file_bytes).hexdigest()

def save_uploaded_file(file: UploadFile, file_hash: str) -> str:
    """Save an uploaded file to storage using its hash as name to avoid duplication."""
    _, ext = os.path.splitext(file.filename)
    filename = f"{file_hash}{ext}"
    dest_path = os.path.join(settings.STORAGE_DIR, filename)
    
    # Check if file already exists in storage
    if not os.path.exists(dest_path):
        # Reset file cursor and copy to destination
        file.file.seek(0)
        with open(dest_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
            
    return dest_path

def get_file_path(storage_ref: str) -> str:
    """Resolve storage reference to actual file path."""
    if os.path.isabs(storage_ref):
        return storage_ref
    return os.path.join(settings.STORAGE_DIR, storage_ref)
