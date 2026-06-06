from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
import uuid
from routes.auth import get_current_teacher
from database import engine
from models import Assignment, AssignmentCase, Case, CaseUpdate, DecisionRequest, UpdateNotification, User

router = APIRouter(prefix="/updates", tags=["Updates"])

def get_session():
    with Session(engine) as session:
        yield session    


@router.get("/notifications")
def get_my_notifications(session: Session = Depends(get_session), current_user: User = Depends(get_current_teacher)):
    statement = (
        select(UpdateNotification)
        .where(UpdateNotification.user_id == current_user.id)
        .where(UpdateNotification.status == "decision_pending")
        .order_by(UpdateNotification.id.desc())
    )
    
    notifications = session.exec(statement).all()

    response = []

    for notif in notifications:
        if notif.type == "version_update" and notif.update_id:
            # Ako je nova verzija => log i detalji slučaja
            update_log = session.get(CaseUpdate, notif.update_id)
            if update_log:
                case = session.get(Case, update_log.new_case_id)
                response.append({
                    "notification_id": notif.id,
                    "type": "version_update",
                    "case_id": case.id if case else None,
                    "case_title": case.title if case else "Nepoznat slučaj",
                    "change_log": update_log.change_log,
                    "new_version": update_log.new_version,
                    "status": notif.status
                })

        elif notif.type == "revoked":
            case = session.get(Case, notif.case_id) if notif.case_id else None
            case_title = case.title if case else "Nepoznat slučaj"

            response.append({
                "notification_id": notif.id,
                "type": "revoked",
                "message": f"Slučaj '{case_title}' u vašim zadaćama više nije dostupan jer ga je autor povukao iz javne upotrebe. Slučaj je zadržan u vašim postojećim zadaćama, ali ga nećete moći dodavati u nove zadaće.",
                "status": notif.status
            })

    return response


@router.post("/notifications/{notification_id}/decision")
def resolve_notification(notification_id: uuid.UUID, data: DecisionRequest, session: Session = Depends(get_session), current_user: User = Depends(get_current_teacher)):
    if data.decision not in ["accepted", "declined", "read"]:
        raise HTTPException(status_code=400, detail="Odluka mora biti 'accepted', 'declined' ili 'read'.")

    notification = session.get(UpdateNotification, notification_id)
    
    if not notification:
        raise HTTPException(status_code=404, detail="Obavijest nije pronađena.")
        
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Ova obavijest ne pripada vama.")

    try:
        if notification.type == "version_update":
            if data.decision == "accepted":

                if not notification.update_id:
                    raise HTTPException(status_code=400, detail="Nedostaju podaci o ažuriranju.")
                
                update_info = session.get(CaseUpdate, notification.update_id)
                if not update_info:
                    raise HTTPException(status_code=404, detail="Podaci o novoj verziji nisu pronađeni.")
                
                assignments_to_update = session.exec(
                    select(AssignmentCase)
                    .join(Assignment, AssignmentCase.assignment_id == Assignment.id)
                    .where(AssignmentCase.case_id == update_info.previous_case_id)
                    .where(Assignment.teacher_id == current_user.id)
                ).all()

                for old_link in assignments_to_update:
                    new_link = AssignmentCase(
                        assignment_id=old_link.assignment_id,
                        case_id=update_info.new_case_id,
                        sequence_no=old_link.sequence_no
                    )
                    session.delete(old_link)
                    session.add(new_link)
        
        elif notification.type == "revoked":
            if data.decision != "read":
                raise HTTPException(status_code=400, detail="Za povučene slučajeve jedina akcija je 'read'.")


        notification.status = data.decision
        notification.decision_at = datetime.now()
        
        session.add(notification)        
        session.commit()

        return {"message": f"Odluka '{data.decision}' uspješno spremljena."}

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))