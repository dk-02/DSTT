import os
import json
from typing import Optional
import requests
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from routes.auth import get_current_active_user
from database import engine
from models import Assignment, AttemptLog, Case, ChatRequest, DiagnosisRequest, DiagnosisSubmission, DiagnosticUnit, Hint, Media, SolveAttempt, User

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

router = APIRouter(prefix="/attempts", tags=["Attempts"])

def get_session():
    with Session(engine) as session:
        yield session


class AttemptStart(BaseModel):
    case_id: uuid.UUID
    assignment_id: Optional[uuid.UUID] = None
    is_free_practice: bool = True


@router.get("/{attempt_id}")
async def get_attempt_details(attempt_id: uuid.UUID, session: Session = Depends(get_session)):
    attempt = session.get(SolveAttempt, attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return attempt


@router.post("/start")
async def start_attempt(data: AttemptStart, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    existing_attempt_stmt = select(SolveAttempt).where(
        SolveAttempt.user_id == current_user.id,
        SolveAttempt.case_id == data.case_id,
        SolveAttempt.status == "in_progress"
    )
    existing_attempt = session.exec(existing_attempt_stmt).first()

    if existing_attempt:
        return { 
            "attempt_id": existing_attempt.id, 
            "settings": existing_attempt.settings, 
            "started_at": existing_attempt.started_at,
            "message": "Nastavak postojećeg rješavanja."
        }
    
    case = session.get(Case, data.case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    if case.type == "EXAM" and (not data.assignment_id or data.is_free_practice == True):
        raise HTTPException(
            status_code=403, 
            detail="Ovaj slučaj je rezerviran za ispite i ne može se pokrenuti kao vježba."
        )

    final_settings = case.default_settings.copy()

    # 2. LOGIKA NADJAČAVANJA
    if data.assignment_id:
        # SCENARIJ A: Unutar assignmenta (Ispit/Zadaća)
        assignment = session.get(Assignment, data.assignment_id)
        if assignment:
            # if assignment_cases.assignment_id == assignment.id and assignment_cases.case_id != data.case_id:
            #     raise HTTPException(status_code=400, detail="Assignment ne odgovara odabranom slučaju.")
            final_settings.update(assignment.settings)
    else:
        # SCENARIJ B: Izvan assignmenta (Slobodni rad)
        if not data.is_free_practice:
            # Vježba koja simulira ispit
            simulation_overrides = {
                "enable_hints": False,
                "ignore_hint_cost": False,
                "enable_undo": False,
                "enable_LLM_mentor": False,
                "ignore_terminating_consequences": False,
                "show_result_immediately": True
            }
            final_settings.update(simulation_overrides)

        # Inače je slobodna vježba - ostaju defaultne postavke (sve True)
 
    new_attempt = SolveAttempt(
        case_id=data.case_id,
        user_id=current_user.id,
        assignment_id=None, # data.assignment_id
        is_free_practice=data.is_free_practice,
        status="in_progress",
        settings=final_settings,
        started_at=datetime.now(),
        score=100.0
    )
    
    session.add(new_attempt)
    session.commit()
    session.refresh(new_attempt) # Sinkronizacija s bazom
    
    return { "attempt_id": new_attempt.id, "settings": new_attempt.settings, "started_at": new_attempt.started_at }


@router.post("/{attempt_id}/getDU")
async def get_DU(attempt_id: uuid.UUID, request: ChatRequest, session: Session = Depends(get_session)):
    attempt = session.get(SolveAttempt, attempt_id)
    if not attempt or attempt.status != "in_progress":
        raise HTTPException(status_code=400, detail="Attempt not active")

    statement = select(DiagnosticUnit).where(DiagnosticUnit.case_id == attempt.case_id)
    dus = session.exec(statement).all()

    du_list = [{"id": str(du.id), "label": du.label, "name": du.name} for du in dus]

    system_prompt = f"""
    You are the assistant in this diagnostics case. The student writes what he wants to check. You need to check for similarities of student's request with given label and name of a diagnostic unit. Select the ID of the most appropriate (most similar to the request) DU from the list: {du_list}. Answer with the ID only. If nothing matches, answer 'NONE'.
    """

    combined_content = f"INSTRUCTION: {system_prompt}\n\nUSER QUESTION: {request.message}"

    response = requests.post(
        url="https://openrouter.ai/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
        data=json.dumps({
            "model": "google/gemma-3n-e2b-it:free",
            "messages": [
                {"role": "user", "content": combined_content}
            ]
        })
    )
    
    du_id = response.json()['choices'][0]['message']['content'].strip()

    # Obrada rezultata i LOGIRANJE
    selected_du = None
    media_list = []
    result_text = "Unfortunately, i don't understand your request."

    if du_id != "NONE":
        selected_du = session.get(DiagnosticUnit, du_id)
        
        if selected_du:
            result_text = selected_du.result_text

            media_statement = select(Media).where(Media.du_id == selected_du.id)
            media_list = [{"file_path": m.file_path, "file_type": m.file_type, "title": m.title} for m in session.exec(media_statement).all()]

            attempt.total_cost_money += selected_du.resources.get("money", 0)

            unit = selected_du.resources.get("time_unit")
            time = selected_du.resources.get("time", 0)
            if unit == "days":
                time *= 86400
            elif unit == "hours":
                time *= 3600
            elif unit == "minutes":
                time *= 60

            attempt.total_cost_time += time

    # Spremi u attempt_logs
    new_log = AttemptLog(
        attempt_id=attempt_id,
        event_type="du_request",
        diagnostic_unit_id=selected_du.id if selected_du else None,
        event_result_data={
            "student_question": request.message,
            "llm_response": result_text,
            "found_du": True if selected_du else False
        },
        status="no_mistake", # DODATI POMOĆNU FUNKCIJU ZA PROVJERU LOGIČKIH INDIKATORA 
        # consequence={}  # AKO JE STATUS consequence_mistake
    )
    
    session.add(new_log)

    session.commit()

    return {
        "du_id": selected_du.id if selected_du else None, 
        "result": result_text,
        "media": media_list
    }



@router.post("/{attempt_id}/submit")
async def submit_diagnosis(attempt_id: uuid.UUID, data: DiagnosisRequest, session: Session = Depends(get_session)
):
    attempt = session.get(SolveAttempt, attempt_id)
    if not attempt or attempt.status != "in_progress":
        raise HTTPException(status_code=400, detail="Attempt doesn't exist or is not active")

    case = session.get(Case, attempt.case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if attempt.is_free_practice:
        system_prompt = f"""
        You are an expert instructor. 
        Correct diagnosis: {case.correct_diagnosis}
        Student's answer: {data.student_diagnosis}
        
        Compare them. If the student correctly identified the issue, respond with 'CORRECT.' and a short feedback paragraph (note that the student's answer MUST contain keywords from the correct diagnosis, it should not be too vague, e.g. student says 'sensor' and the correct diagnosis is 'faulty crankshaft sensor (coil break)' your verdict should not be 'CORRECT'). 
        If they are wrong or missed key parts, respond with 'INCORRECT.' and a short explanation why. 
        If they are partially correct, respond with 'PARTIAL.' and a short explanation why.
        """
    else:
        system_prompt = f"""
        You are an expert instructor.
        Correct diagnosis: {case.correct_diagnosis}
        Student's answer: {data.student_diagnosis}
        
        Compare them. Be strict but fair. If the student correctly identified the issue, respond with 'CORRECT.' and a short feedback paragraph (note that the student's answer MUST contain keywords from the correct diagnosis, it should not be too vague, e.g. student says 'sensor' and the correct diagnosis is 'faulty crankshaft sensor (coil break)' your verdict should not be 'CORRECT'). 
        If they are wrong or missed key parts, respond with 'INCORRECT.'. 
        If they are partially correct, respond with 'PARTIAL.'.
        """

    response = requests.post(
        url="https://openrouter.ai/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
        data=json.dumps({
            "model": "google/gemma-3n-e2b-it:free",
            "messages": [{"role": "user", "content": system_prompt}]
        })
    )

    llm_judgement = response.json()['choices'][0]['message']['content']
    
    verdict = "incorrect"
    feedback = llm_judgement
    
    if "INCORRECT" in llm_judgement.upper():
        verdict = "incorrect"
        feedback = feedback.replace("INCORRECT.", "").strip()
    elif "CORRECT" in llm_judgement.upper():
        verdict = "correct"
        feedback = feedback.replace("CORRECT.", "").strip()
    elif "PARTIAL" in llm_judgement.upper():
        verdict = "partial"
        feedback = feedback.replace("PARTIAL.", "").strip()

    # Spremi u bazu (diagnosis_submissions)
    submission = DiagnosisSubmission(
        attempt_id=attempt_id,
        diagnosis_text=data.student_diagnosis,
        verdict=verdict,
        feedback_given=feedback
    )
    session.add(submission)

    # AŽURIRANJE SOLVE_ATTEMPT-a
    if verdict == "correct":
        attempt.status = "completed"
        attempt.finished_at = datetime.now()
        attempt.student_diagnosis = data.student_diagnosis
        # attempt.score =  # DODATI POMOĆNU FUNKCIJU ZA RAČUNANNJE SCORE-a

    else:
        ignore_terminating_consequences = attempt.settings.get("ignore_terminating_consequences")

        if not ignore_terminating_consequences:
            if case.if_incorrect == "terminate":
                attempt.status = "terminated"
                attempt.finished_at = datetime.now()
                attempt.student_diagnosis = data.student_diagnosis

            elif case.if_incorrect == "penalize":
                attempt.score = max(0, attempt.score - 5) # PROMIJENI NA DINAMIČKO RAČUNANJE KAD SE DODAJU DRUGE VRSTE POSLJEDICA

            elif case.if_incorrect == "continue":
                pass

        else:
            if case.if_incorrect == "penalize":
                attempt.score = max(0, attempt.score - 5) # PROMIJENI NA DINAMIČKO RAČUNANJE KAD SE DODAJU DRUGE VRSTE POSLJEDICA
            else:
                pass

    
    session.commit()
    
    return {
        "verdict": verdict,
        "feedback": feedback,
        "status": attempt.status
    }


@router.post("/{attempt_id}/cancel")
async def cancel_attempt(attempt_id: uuid.UUID, session: Session = Depends(get_session)):
    attempt = session.get(SolveAttempt, attempt_id)
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
        
    if attempt.status != "in_progress":
        raise HTTPException(status_code=400, detail="Moguće je otkazati samo aktivna rješavanja.")

    attempt.status = "cancelled"
    attempt.finished_at = datetime.now()
    
    session.commit()
    
    return {"status": "success", "message": "Rješavanje je otkazano."}


@router.get("/{attempt_id}/hint")
def get_hint(attempt_id: uuid.UUID, sequence_no: int, session: Session = Depends(get_session)):
    attempt = session.get(SolveAttempt, attempt_id)

    if not attempt or attempt.status != "in_progress":
        raise HTTPException(status_code=400, detail="Attempt not active")
    
    if not attempt.settings.get("enable_hints", True):
        raise HTTPException(status_code=403, detail="Pomoć je isključena za ovaj pokušaj.")

    case_id = attempt.case_id
    case = session.get(Case, case_id)

    if not case:
        raise HTTPException(status_code=404, detail="Slučaj nije pronađen")
    
    statement = select(Hint).where(Hint.case_id == case_id, Hint.sequence_no == sequence_no + 1)
    hint = session.exec(statement).first()

    if not hint:
        raise HTTPException(status_code=404, detail="Nema dostupnih hintova")
    
    ignore_cost = attempt.settings.get("ignore_hint_cost", False)

    if not ignore_cost:
        attempt.score = max(0, attempt.score - hint.cost)


    new_log = AttemptLog(
        attempt_id=attempt_id,
        event_type="hint_request",
        event_result_data={"hint_id": str(hint.id), "penalty": 0 if ignore_cost else hint.cost},
        status="no_mistake"
    )
    session.add(new_log)
    session.commit()
    
    return {
        "text": hint.text,
        "sequence_no": hint.sequence_no,
        "new_score": attempt.score
    }


@router.post("/{attempt_id}/undo")
async def undo_last_action(attempt_id: uuid.UUID, session: Session = Depends(get_session)):
    attempt = session.get(SolveAttempt, attempt_id)
    
    if not attempt or attempt.status != "in_progress":
        raise HTTPException(status_code=400, detail="Pokušaj nije aktivan.")

    if not attempt.settings.get("enable_undo", True):
        raise HTTPException(status_code=403, detail="Poništavanje radnji je onemogućeno za ovaj pokušaj.")

    statement = select(AttemptLog).where(
        AttemptLog.attempt_id == attempt_id,
        AttemptLog.event_type == "du_request"
    ).order_by(AttemptLog.id.desc())
    
    last_log = session.exec(statement).first()

    if not last_log:
        raise HTTPException(status_code=404, detail="Nema radnji koje se mogu poništiti.")

    if last_log.diagnostic_unit_id:
        du = session.get(DiagnosticUnit, last_log.diagnostic_unit_id)
        if du:
            attempt.total_cost_money -= du.resources.get("money", 0)
            
            unit = du.resources.get("time_unit")
            time = du.resources.get("time", 0)
            if unit == "days": time *= 86400
            elif unit == "hours": time *= 3600
            elif unit == "minutes": time *= 60
            
            attempt.total_cost_time -= time

    undo_log = AttemptLog(
        attempt_id=attempt_id,
        event_type="undo_request",
        event_result_data={
            "undone_log_id": str(last_log.id),
            "undone_du_id": str(last_log.diagnostic_unit_id) if last_log.diagnostic_unit_id else None
        },
        status="no_mistake"
    )
    session.add(undo_log)

    last_log.status = "undone" 
    
    session.commit()
    session.refresh(attempt)

    return {
        "message": "Zadnja radnja je poništena.",
        "total_cost_money": attempt.total_cost_money,
        "total_cost_time": attempt.total_cost_time
    }