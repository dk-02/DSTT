import datetime
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
import uuid
from routes.auth import get_current_teacher
from database import engine
from models import Assignment, AssignmentCase, Case, CaseUpdate, UpdateNotification, User

router = APIRouter(prefix="/updates", tags=["Updates"])

def get_session():
    with Session(engine) as session:
        yield session

class DecisionRequest(BaseModel):
    decision: Literal["accepted", "declined"]

@router.post("/notifications/{notification_id}/decision")
def resolve_notification(
    notification_id: uuid.UUID,
    data: DecisionRequest, # Očekujemo { "decision": "accepted" | "declined" }
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_teacher)
):
    # 1. Dohvaćanje obavijesti i update loga
    statement = select(UpdateNotification, CaseUpdate).join(
        CaseUpdate, UpdateNotification.update_id == CaseUpdate.id
    ).where(UpdateNotification.id == notification_id)
    
    result = session.exec(statement).first()
    if not result:
        raise HTTPException(status_code=404, detail="Obavijest nije pronađena.")
        
    notification, update_info = result

    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nemate pristup.")

    try:
        # 2. Ako je prihvaćeno, prebacujemo sve zadaće ovog nastavnika na novi slučaj
        if data.decision == "accepted":
            # Tražimo sve AssignmentCase linkove gdje je:
            # - Slučaj stari (previous_case_id)
            # - Zadaća pripada ovom nastavniku
            assignments_to_update = session.exec(
                select(AssignmentCase)
                .join(Assignment, AssignmentCase.assignment_id == Assignment.id)
                .where(AssignmentCase.case_id == update_info.previous_case_id)
                .where(Assignment.teacher_id == current_user.id)
            ).all()

            # Prebacujemo ih na novu verziju slučaja
            for link in assignments_to_update:
                link.case_id = update_info.new_case_id
                session.add(link)

        # 3. Ažuriramo status obavijesti
        notification.status = data.decision
        notification.decision_at = datetime.now()
        session.add(notification)
        
        session.commit()
        return {"message": f"Odluka spremljena. Slučajevi ažurirani: {data.decision == 'accepted'}"}

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    


@router.get("/notifications")
def get_my_notifications(
    session: Session = Depends(get_session), 
    current_user: User = Depends(get_current_teacher)
):
    # Dohvaćamo sve obavijesti za ulogiranog nastavnika s podacima o updateu i starom slučaju
    statement = (
        select(UpdateNotification, CaseUpdate, Case)
        .join(CaseUpdate, UpdateNotification.update_id == CaseUpdate.id)
        .join(Case, CaseUpdate.case_id == Case.id)
        .where(UpdateNotification.user_id == current_user.id)
        .where(UpdateNotification.status == "decision_pending")
        .order_by(UpdateNotification.id.desc())
    )
    
    results = session.exec(statement).all()
    
    # Mapiramo podatke da frontend dobije lijep JSON
    return [
        {
            "notification_id": notif.UpdateNotification.id,
            "case_id": notif.Case.id,
            "case_title": notif.Case.title,
            "change_log": notif.CaseUpdate.change_log,
            "new_version": notif.CaseUpdate.new_version,
            "status": notif.UpdateNotification.status
        }
        for notif in results
    ]



@router.post("/notifications/{notification_id}/decision")
def resolve_notification(
    notification_id: uuid.UUID,
    data: DecisionRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_teacher)
):
    if data.decision not in ["accepted", "declined"]:
        raise HTTPException(status_code=400, detail="Odluka mora biti 'accepted' ili 'declined'.")

    notification = session.get(UpdateNotification, notification_id)
    
    if not notification:
        raise HTTPException(status_code=404, detail="Obavijest nije pronađena.")
        
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Ova obavijest ne pripada vama.")

    try:
        notification.status = data.decision
        notification.decision_at = datetime.now()
        
        session.add(notification)
        
        # OVDJE IDE TVOJA POSLOVNA LOGIKA: 
        # Što se bazično događa ako je prihvaćeno, a što ako je odbijeno?
        
        session.commit()
        return {"message": f"Odluka '{data.decision}' uspješno spremljena."}

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))