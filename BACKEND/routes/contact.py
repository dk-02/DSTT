import os
import resend
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

resend.api_key = os.getenv("RESEND_API_KEY")

router = APIRouter(prefix="/contact", tags=["Contact"])

class ContactRequest(BaseModel):
    name: str
    email: str
    subject: str
    message: str


@router.post("/")
async def send_contact_email(request: ContactRequest):
    try:
        params = {
            "from": "onboarding@resend.dev",
            "to": ["dsttproject@outlook.com"],
            "subject": f"DSTT Upit: {request.subject}",
            "html": f"""
                <p><strong>Od:</strong> {request.name} ({request.email})</p>
                <p><strong>Poruka:</strong></p>
                <p>{request.message}</p>
            """,
        }

        email = resend.Emails.send(params)
        return {"status": "success", "id": email["id"]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))