from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status


BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
POSTS_UPLOADS_DIR = UPLOADS_DIR / "posts"
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


def save_uploaded_file(file: UploadFile) -> str:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPG, PNG, WEBP, and GIF files are allowed",
        )

    POSTS_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    suffix = ALLOWED_IMAGE_TYPES[file.content_type]
    filename = f"{uuid4().hex}{suffix}"
    file_path = POSTS_UPLOADS_DIR / filename

    with file_path.open("wb") as output_file:
        output_file.write(file.file.read())

    return f"/uploads/posts/{filename}"