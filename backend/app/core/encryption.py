"""Fernet symmetric encryption for storing org DB credentials securely."""
from cryptography.fernet import Fernet
from app.config import get_settings

settings = get_settings()

_fernet = Fernet(settings.fernet_key.encode())


def encrypt(plaintext: str) -> str:
    """Encrypt a plaintext string; returns a URL-safe base64 ciphertext string."""
    return _fernet.encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    """Decrypt a ciphertext string produced by encrypt()."""
    return _fernet.decrypt(ciphertext.encode()).decode()
