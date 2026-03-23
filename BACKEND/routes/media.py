import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlmodel import Session
from database import engine
from models import Media

router = APIRouter(prefix="/media", tags=["Media"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_session():
    with Session(engine) as session:
        yield session

@router.post("/upload")
async def upload_media(file: UploadFile = File(...), session: Session = Depends(get_session)):
    try:
        file_extension = file.filename.split(".")[-1] if "." in file.filename else ""
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        db_media = Media(
            title=file.filename[:50],
            file_path=file_path,
            file_type=file.content_type[:20] if file.content_type else None,
            metadata_data={"original_name": file.filename, "size_bytes": file.size}
        )
        session.add(db_media)
        session.commit()
        session.refresh(db_media)

        return {
            "status": "success", 
            "media_id": str(db_media.id), 
            "file_path": file_path,
            "title": file.filename
        }

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri prijenosu datoteke: {str(e)}")