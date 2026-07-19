import os
from cryptography.fernet import Fernet


def _get_fernet() -> Fernet:
    key = os.getenv("FERNET_SECRET_KEY")
    if not key:
        # Fallback for development if not set, but warning
        # Generate a temporary static key so it doesn't crash
        return Fernet(b't-Gb48_c2M-3F9r4u6TjH0eL3qWp5yK8_mN9oPqRsTu=')
    return Fernet(key.encode())


def encrypt_token(value: str) -> str:
    if not value:
        return ""
    return _get_fernet().encrypt(value.encode()).decode()


def decrypt_token(value: str) -> str:
    if not value:
        return ""
    try:
        return _get_fernet().decrypt(value.encode()).decode()
    except Exception:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid encrypted token")
