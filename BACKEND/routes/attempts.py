import os
import json
from typing import Any, Dict
import requests
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from routes.auth import get_current_active_user
from database import engine
from models import Assignment, AssignmentCase, AttemptLog, AttemptStart, Case, ChatRequest, DiagnosisRequest, DiagnosisSubmission, DiagnosticUnit, GroupAssignment, GroupMember, Hint, SolveAttempt, User

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL")

router = APIRouter(prefix="/attempts", tags=["Attempts"])

def get_session():
    with Session(engine) as session:
        yield session


# HELPER FUNCTIONS
def check_redundancy(session: Session, attempt_id: uuid.UUID, requested_du: DiagnosticUnit) -> bool:
    """ Provjerava je li ispitanik već dobio informacije koje pruža traženi DU. """

    if not requested_du.provides:
        return False

    past_logs = session.exec(
        select(AttemptLog).where(
            AttemptLog.attempt_id == attempt_id,
            AttemptLog.event_type == "du_request",
            AttemptLog.status != "undone"
        )
    ).all()

    past_du_ids = [log.diagnostic_unit_id for log in past_logs if log.diagnostic_unit_id]

    if not past_du_ids:
        return False

    past_dus = session.exec(select(DiagnosticUnit).where(DiagnosticUnit.id.in_(past_du_ids))).all()
    provided_so_far = set()

    for du in past_dus:
        if du.provides:
            provided_so_far.update(du.provides)

    # Provjera donosi li traženi DU išta novo
    # Ako su sve njegove 'provides' oznake već u skupu onoga što student zna => redundantni podatak
    requested_provides = set(requested_du.provides)
    if requested_provides and requested_provides.issubset(provided_so_far):
        return True

    return False


def check_logical_indicators(session: Session, attempt_id: uuid.UUID, requested_du: DiagnosticUnit):
    """ Provjerava jesu li zadovoljeni preduvjeti i vraća (status_greške, objekt_posljedice). """

    if not requested_du.required_units:
        return "no_mistake", None

    past_logs = session.exec(
        select(AttemptLog).where(
            AttemptLog.attempt_id == attempt_id,
            AttemptLog.event_type == "du_request",
            AttemptLog.status != "undone"
        )
    ).all()
    past_du_ids = {log.diagnostic_unit_id for log in past_logs if log.diagnostic_unit_id}

    missing_units = [req_du.id for req_du in requested_du.required_units if req_du.id not in past_du_ids]

    if not missing_units:
        return "no_mistake", None

    # Posljedica (consequence) za prvi preduvjet koji nedostaje
    consequence_to_apply = None
    for cons in requested_du.consequences:
        req_id_str = cons.get("required_id")
        if req_id_str and uuid.UUID(req_id_str) in missing_units:
            consequence_to_apply = cons
            # TERMINATE ima prioritet
            if cons.get("type", "").lower() == "terminate":
                break

    # Ako kreator slučaja nije dobro definirao posljedicu
    if not consequence_to_apply:
        consequence_to_apply = {"type": "WARNING", "value": "Nedostaje logički preduvjet za provođenje ove radnje."}

    c_type = consequence_to_apply.get("type", "").lower()
    if c_type == "terminate":
        return "fatal_mistake", consequence_to_apply
    else:
        return "consequence_mistake", consequence_to_apply


def generate_evaluation_report(attempt_id: uuid.UUID, session: Session) -> Dict[str, Any]:
    """ Prolazi kroz povijest pokušaja, izračunava metriku na 4 osi i sprema konačni JSON izvještaj u SolveAttempt tablicu. """

    attempt = session.get(SolveAttempt, attempt_id)
    if not attempt:
        return {"Greška": "Pokušaj rješavanja nije pronađen."}
    
    case = session.get(Case, attempt.case_id)

    # DOHVAT PODATAKA
    submissions = session.exec(
        select(DiagnosisSubmission)
        .where(DiagnosisSubmission.attempt_id == attempt_id)
        .order_by(DiagnosisSubmission.submitted_at.asc())
    ).all()

    valid_logs = session.exec(
        select(AttemptLog)
        .where(AttemptLog.attempt_id == attempt_id, AttemptLog.status != "undone")
    ).all()

    # (1) TOČNOST (accuracy) - dijagnoza
    last_submission = submissions[-1] if submissions else None

    if attempt.status == "terminated":
        accuracy_verdict = "failed_due_to_fatal_mistake"
        accuracy_feedback = "Rješavanje je prekinuto zbog izvršavanja radnje s fatalnim posljedicama."
    elif last_submission:
        accuracy_verdict = last_submission.verdict
        accuracy_feedback = last_submission.feedback_given
    else:
        accuracy_verdict = "unknown"
        accuracy_feedback = "Nema zabilježenih pokušaja dijagnoze."

    # (2) EFIKASNOST (efficiency) - resursi
    total_money = attempt.total_cost_money
    total_time_seconds = attempt.total_cost_time

    hours = total_time_seconds // 3600
    minutes = (total_time_seconds % 3600) // 60
    readable_time = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"

    budget_money = case.default_settings.get("budget_money") if case else None
    budget_exceeded = False
    if budget_money and total_money > budget_money:
        budget_exceeded = True

    # (3) METODIČNOST (methodology) - slijed koraka, pogreške
    redundant_count = sum(1 for log in valid_logs if log.status == "redundant")
    indicator_warnings = sum(1 for log in valid_logs if log.status == "consequence_mistake")
    fatal_mistakes = sum(1 for log in valid_logs if log.status == "fatal_mistake")

    wrong_diagnosis_count = sum(1 for sub in submissions if sub.verdict in ["incorrect", "partial"])

    methodology_score = 100
    methodology_score -= (redundant_count * 10)          # -10% za svaki redundantni upit
    methodology_score -= (indicator_warnings * 15)       # -15% za ignoriranje preduvjeta
    methodology_score -= (wrong_diagnosis_count * 15)    # -15% za svaki netočan pokušaj dijagnoze
    if fatal_mistakes > 0:
        methodology_score = 0                            # 0% ako je bilo fatalnih pogreški
        
    methodology_score = max(0, methodology_score)        

    # (4) SAMOSTALNOST (independence) - hintovi, upiti LLM mentoru
    hint_requests = [log for log in valid_logs if log.event_type == "hint_request"]
    penalized_hints = sum(1 for h in hint_requests if h.event_result_data.get("is_penalized") is True)

    mentor_requests_count = sum(1 for log in valid_logs if log.event_type == "mentor_request")

    independence_score = 100 - (penalized_hints * 20)
    independence_score = max(0, independence_score)

    # PROVJERA KAŠNJENJA S PREDAJOM
    late_by_seconds = 0
    is_late = False

    if attempt.assignment_id and attempt.finished_at:
        deadline_stmt = (
            select(GroupAssignment.available_until)
            .join(GroupMember, GroupMember.group_id == GroupAssignment.group_id)
            .where(GroupMember.student_id == attempt.user_id)
            .where(GroupAssignment.assignment_id == attempt.assignment_id)
        )
        deadline = session.exec(deadline_stmt).first()
        
        if deadline and attempt.finished_at > deadline:
            is_late = True
            late_by_seconds = int((attempt.finished_at - deadline).total_seconds())

    late_minutes = late_by_seconds // 60
    late_seconds_remainder = late_by_seconds % 60

    start = attempt.started_at.replace(tzinfo=None)
    finish = attempt.finished_at.replace(tzinfo=None)
    time_spent = finish - start

    action_history = []

    for log in valid_logs:
        action_history.append({
            "type": log.event_type,
            "status": log.status,
            "description": log.event_result_data.get("student_question", "Korišten hint") 
                           if log.event_type != "hint_request" else "Zatražen hint",
            "feedback": log.event_result_data.get("llm_response", "")
        })

    for sub in submissions:
        action_history.append({
            "type": "diagnosis_submission",
            "status": sub.verdict,
            "description": f"Pokušaj dijagnoze: {sub.diagnosis_text}",
            "feedback": sub.feedback_given
        })

    report = {
        "generated_at": datetime.now().isoformat(),
        "attempt_status": attempt.status,
        "action_history": action_history,
        "time_spent": int(time_spent.total_seconds()),
        "is_late": is_late,
        "late_by_seconds": late_by_seconds,
        "late_readable": f"{late_minutes}m {late_seconds_remainder}s" if is_late else "Na vrijeme",
        "metrics": {
            "accuracy": {
                "verdict": accuracy_verdict,
                "feedback": accuracy_feedback
            },
            "efficiency": {
                "total_cost_money": total_money,
                "total_cost_time_seconds": total_time_seconds,
                "readable_time": readable_time,
                "budget_money_limit": budget_money,
                "budget_exceeded": budget_exceeded
            },
            "methodology": {
                "score_percentage": methodology_score,
                "redundant_queries_count": redundant_count,
                "ignored_indicators_count": indicator_warnings,
                "wrong_diagnosis_attempts": wrong_diagnosis_count,
                "fatal_mistakes_count": fatal_mistakes
            },
            "independence": {
                "score_percentage": independence_score,
                "total_hints_used": len(hint_requests),
                "penalized_hints_used": penalized_hints,
                "mentor_queries_count": mentor_requests_count
            }
        }
    }

    attempt.evaluation_report = report
    session.add(attempt)

    return report



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
        SolveAttempt.assignment_id == data.assignment_id,
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
        raise HTTPException(status_code=404, detail="Slučaj nije pronađen.")
    
    if case.status == "draft":
        if current_user.id != case.created_by:
            raise HTTPException(
                status_code=403, 
                detail="Skice mogu prije objave isprobati samo autori slučaja."
            )
    
    if case.type == "exam" and (not data.assignment_id or data.is_practice == True):
        raise HTTPException(
            status_code=403, 
            detail="Ovaj slučaj je rezerviran za ispite i ne može se pokrenuti kao vježba."
        )

    final_settings = case.default_settings.copy()

    if data.assignment_id:
        assignment = session.get(Assignment, data.assignment_id)
        if not assignment:
            raise HTTPException(status_code=404, detail="Zadaća nije pronađena.")
        
        if not existing_attempt:
            deadline_stmt = (
                select(GroupAssignment.available_until)
                .join(GroupMember, GroupMember.group_id == GroupAssignment.group_id)
                .where(GroupMember.student_id == current_user.id)
                .where(GroupAssignment.assignment_id == data.assignment_id)
            )
            deadline = session.exec(deadline_stmt).first()

            if deadline and datetime.now() >= deadline:
                raise HTTPException(
                    status_code=403, 
                    detail="Rok za rješavanje ove zadaće je istekao. Ne možete započeti novo rješavanje."
                )

        if assignment.type == "exam":
            any_past_attempt = session.exec(
                select(SolveAttempt).where(
                    SolveAttempt.user_id == current_user.id,
                    SolveAttempt.case_id == data.case_id,
                    SolveAttempt.assignment_id == data.assignment_id
                )
            ).first()

            if any_past_attempt:
                raise HTTPException(
                    status_code=403, 
                    detail="Iskoristili ste svoj jedini pokušaj za ovaj ispitni slučaj."
                )
        
        if assignment.settings.get("case_sequence_lock"):
            # Redni broj (sequence_no) trenutnog slučaja u ovoj zadaći
            current_assignment_case = session.exec(
                select(AssignmentCase).where(
                    AssignmentCase.assignment_id == data.assignment_id,
                    AssignmentCase.case_id == data.case_id
                )
            ).first()

            if current_assignment_case and current_assignment_case.sequence_no > 1:
                # Svi slučajevi koji moraju biti riješeni prije ovoga
                preceding_cases_stmt = select(AssignmentCase.case_id).where(
                    AssignmentCase.assignment_id == data.assignment_id,
                    AssignmentCase.sequence_no < current_assignment_case.sequence_no
                )
                preceding_case_ids = session.exec(preceding_cases_stmt).all()

                # Jesu li svi ti slučajevi završeni?
                for prev_case_id in preceding_case_ids:
                    finished_attempt = session.exec(
                        select(SolveAttempt).where(
                            SolveAttempt.user_id == current_user.id,
                            SolveAttempt.assignment_id == data.assignment_id,
                            SolveAttempt.case_id == prev_case_id,
                            SolveAttempt.status.in_(["completed", "terminated"])
                        )
                    ).first()

                    if not finished_attempt:
                        raise HTTPException(
                            status_code=403, 
                            detail="Morate završiti prethodne slučajeve u zadaći prije pokretanja ovog slučaja."
                        )

        is_practice = assignment.type != "exam"
        final_settings.update(assignment.settings)

    else:
        is_practice = True
        
        if data.is_exam_simulation:
            simulation_overrides = {
                "enable_hints": False,
                "ignore_hint_penalty": False,
                "enable_undo": False,
                "enable_LLM_mentor": False,
                "ignore_terminating_consequences": False,
                "show_result_immediately": True,
                "allow_diagnosis_retry": False,
                "penalize_wrong_diagnosis": True
            }
            final_settings.update(simulation_overrides)

 
    new_attempt = SolveAttempt(
        case_id=data.case_id,
        user_id=current_user.id,
        assignment_id=data.assignment_id,
        is_practice=is_practice,
        status="in_progress",
        settings=final_settings,
        started_at=datetime.now()
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
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}", 
            "Content-Type": "application/json"
        },
        data=json.dumps({
            "model": OPENROUTER_MODEL,
            "messages": [
                {
                    "role": "user", 
                    "content": combined_content
                }
            ]
        })
    )
    
    du_id = response.json()['choices'][0]['message']['content'].strip()

    # Obrada rezultata i LOGIRANJE
    selected_du = None
    media_list = []
    result_text = "Unfortunately, i don't understand your request."
    log_status = "no_mistake"
    applied_consequence = {}

    if du_id != "NONE":
        selected_du = session.get(DiagnosticUnit, du_id)
        
        if selected_du:
            indicator_status, consequence = check_logical_indicators(session, attempt_id, selected_du)

            if indicator_status == "fatal_mistake":
                attempt.status = "terminated"
                attempt.finished_at = datetime.now()
                log_status = "fatal_mistake"
                applied_consequence = consequence
                result_text = consequence.get("value", "Fatalna pogreška! Rješavanje slučaja je prekinuto.")

                generate_evaluation_report(attempt_id, session)

            elif indicator_status == "consequence_mistake":
                log_status = "consequence_mistake"
                applied_consequence = consequence
                result_text = consequence.get("value", "Nedostaje logički preduvjet.")

            else:
                is_redundant = check_redundancy(session, attempt_id, selected_du)

                if is_redundant:
                    log_status = "redundant"

                result_text = selected_du.result_text

                media_list = [{"file_path": m.file_path, "file_type": m.file_type, "title": m.title} for m in selected_du.media]

                attempt.total_cost_money += selected_du.resources.get("money", 0)

                unit = selected_du.resources.get("time_unit")
                time = selected_du.resources.get("time", 0)

                if unit == "days": time *= 86400
                elif unit == "hours": time *= 3600
                elif unit == "minutes": time *= 60

                attempt.total_cost_time += time

    new_log = AttemptLog(
        attempt_id=attempt_id,
        event_type="du_request",
        diagnostic_unit_id=selected_du.id if selected_du else None,
        event_result_data={
            "student_question": request.message,
            "llm_response": result_text,
            "found_du": True if selected_du else False
        },
        status=log_status, 
        consequence=applied_consequence 
    )
    
    session.add(new_log)
    session.add(attempt)
    session.commit()

    return {
        "du_id": selected_du.id if selected_du else None, 
        "result": result_text,
        "media": media_list,
        "attempt_status": attempt.status
    }


@router.post("/{attempt_id}/submit")
async def submit_diagnosis(attempt_id: uuid.UUID, data: DiagnosisRequest, session: Session = Depends(get_session)
):
    attempt = session.get(SolveAttempt, attempt_id)
    if not attempt or attempt.status != "in_progress":
        raise HTTPException(status_code=400, detail="Pokušaj rješavanja ne postoji ili nije aktivan.")

    case = session.get(Case, attempt.case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Slučaj nije pronađen.")

    if attempt.is_practice:
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
            "model": OPENROUTER_MODEL,
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
        session.add(attempt)

        generate_evaluation_report(attempt_id, session)

    else:
        if attempt.settings.get("allow_diagnosis_retry", True):
            pass

        else:
            attempt.status = "completed"
            attempt.finished_at = datetime.now()
            attempt.student_diagnosis = data.student_diagnosis
            session.add(attempt)

            generate_evaluation_report(attempt_id, session)
    
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
        raise HTTPException(status_code=404, detail="Pokušaj rješavanja nije pronađen.")
        
    if attempt.status != "in_progress":
        raise HTTPException(status_code=400, detail="Moguće je otkazati samo aktivna rješavanja.")

    attempt.status = "cancelled"
    attempt.finished_at = datetime.now()

    session.add(attempt)    
    session.commit()
    
    return {"status": "success", "message": "Rješavanje je otkazano."}


@router.get("/{attempt_id}/hint")
def get_hint(attempt_id: uuid.UUID, sequence_no: int, session: Session = Depends(get_session)):
    attempt = session.get(SolveAttempt, attempt_id)

    if not attempt or attempt.status != "in_progress":
        raise HTTPException(status_code=400, detail="Pokušaj rješavanja nije aktivan.")
    
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
    
    ignore_penalty = attempt.settings.get("ignore_hint_penalty", False)

    new_log = AttemptLog(
        attempt_id=attempt_id,
        event_type="hint_request",
        event_result_data={
            "hint_id": str(hint.id), 
            "is_penalized": not ignore_penalty
        },
        status="no_mistake"
    )
    session.add(new_log)
    session.commit()
    
    return {
        "text": hint.text,
        "sequence_no": hint.sequence_no
    }


@router.post("/{attempt_id}/ask-llm-mentor")
async def ask_llm_mentor(data: ChatRequest, attempt_id: uuid.UUID, session: Session = Depends(get_session)):
    attempt = session.get(SolveAttempt, attempt_id)
    
    if not attempt:
        raise HTTPException(status_code=404, detail="Pokušaj rješavanja nije pronađen.")
        
    if attempt.status != "in_progress":
        raise HTTPException(status_code=400, detail="Pokušaj rješavanja nije aktivan.")
    
    if not attempt.settings.get("enable_LLM_mentor", True):
        raise HTTPException(status_code=403, detail="LLM mentor je onemogućen za ovaj pokušaj.")

    case = session.get(Case, attempt.case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Slučaj nije pronađen.")

    message = data.message    

    prompt = f"Ti si mentor studentu koji dijagnosticira slučaj: {case.initial_info}. Točna dijagnoza je {case.correct_diagnosis}. Student te pita: '{message}'. Daj mu pedagoški savjet, ali mu NIKAKO ne smiješ otkriti konačno rješenje. Uputi ga na pravi put."
  
    response = requests.post(
        url="https://openrouter.ai/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
        data=json.dumps({
            "model": OPENROUTER_MODEL,
            "messages": [{"role": "user", "content": prompt}]
        })
    )

    mentor_response = response.json()['choices'][0]['message']['content']

    new_log = AttemptLog(
        attempt_id=attempt_id,
        event_type="mentor_request",
        event_result_data={
            "student_question": message,
            "llm_response": mentor_response
        },
        status="no_mistake"
    )
    session.add(new_log)
    session.commit()
    
    return {"status": "success", "result": mentor_response}


@router.post("/{attempt_id}/undo")
async def undo_last_action(attempt_id: uuid.UUID, session: Session = Depends(get_session)):
    attempt = session.get(SolveAttempt, attempt_id)
    
    if not attempt or attempt.status != "in_progress":
        raise HTTPException(status_code=400, detail="Pokušaj rješavanja nije aktivan.")

    if not attempt.settings.get("enable_undo", True):
        raise HTTPException(status_code=403, detail="Poništavanje radnji je onemogućeno za ovaj pokušaj.")

    statement = select(AttemptLog).where(
        AttemptLog.attempt_id == attempt_id,
        AttemptLog.event_type == "du_request",
        AttemptLog.status != "undone"
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
