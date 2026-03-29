import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/templates", tags=["Templates"])

TEMPLATES_DIR = os.path.join(os.getcwd(), "templates")

@router.get("/download/{filename}")
async def download_template(filename: str):
    file_path = os.path.join(TEMPLATES_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Template not found")
    
    return FileResponse(
        path=file_path, 
        filename=filename,
        media_type='application/octet-stream'
    )