import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, func, or_
from sqlmodel import Session, select
from typing import List, Dict, Any
from pydantic import BaseModel
import uuid
from routes.auth import get_current_active_user, get_current_teacher
from database import engine
from models import Assignment, AssignmentCase, AssignmentCasePreview, Case, CaseCategory, CaseCreate, CaseEditRequest, CaseMediaFile, CaseReadWithMedia, CaseUpdate, Category, DUMediaFile, Hint, DiagnosticUnit, Media, Role, SolveAttempt, UnitDependency, UpdateNotification, User, HintReadCreate, UserRole

router = APIRouter(prefix="/cases", tags=["Cases"])

def get_session():
    with Session(engine) as session:
        yield session


def create_update_notifications(session: Session, case_id: uuid.UUID, update_id: uuid.UUID, author_id: uuid.UUID):
    # Tražimo jedinstvene ID-ove nastavnika koji koriste ovaj slučaj u svojim zadaćama
    statement = (
        select(Assignment.teacher_id)
        .join(AssignmentCase, AssignmentCase.assignment_id == Assignment.id)
        .where(AssignmentCase.case_id == case_id)
        .where(Assignment.teacher_id != author_id) # Ne šalji obavijest autoru
        .distinct()
    )
    
    affected_teachers = session.exec(statement).all()

    for teacher_id in affected_teachers:
        notification = UpdateNotification(
            update_id=update_id,
            user_id=teacher_id,
            status="decision_pending"
        )
        session.add(notification)


def clear_case_content(session: Session, case_id: uuid.UUID):
    """Briše sve hinteve, DU-ove, ovisnosti i medijske linkove vezane uz case_id."""
    # Dohvaćanje ID-ova DU-ova za brisanje ovisnosti i medija
    du_ids = session.exec(select(DiagnosticUnit.id).where(DiagnosticUnit.case_id == case_id)).all()
    
    if du_ids:
        session.exec(delete(UnitDependency).where(UnitDependency.unit_id.in_(du_ids)))
        session.exec(delete(DUMediaFile).where(DUMediaFile.du_id.in_(du_ids)))
        session.exec(delete(DiagnosticUnit).where(DiagnosticUnit.case_id == case_id))
    
    # Brisanje hintova i linkova medija samog slučaja
    session.exec(delete(Hint).where(Hint.case_id == case_id))
    session.exec(delete(CaseMediaFile).where(CaseMediaFile.case_id == case_id))
    session.exec(delete(CaseCategory).where(CaseCategory.case_id == case_id))
    

def populate_case_content(session: Session, case_id: uuid.UUID, case_data: CaseCreate, force_new_ids: bool = False):
    """Puni hinteve, medije, DU-ove i ovisnosti za zadani case_id."""
    if case_data.category_id:
        session.add(CaseCategory(case_id=case_id, category_id=uuid.UUID(case_data.category_id)))

    for m_id in case_data.media_ids:
        session.add(CaseMediaFile(case_id=case_id, media_id=uuid.UUID(m_id)))

    id_map = {}

    for du in case_data.diagnostic_units:
        old_id_str = str(du.id)
        new_id = uuid.uuid4() if (force_new_ids or not du.id) else uuid.UUID(du.id)
        id_map[old_id_str] = new_id

        db_du = DiagnosticUnit(
            id=new_id,
            case_id=case_id,
            label=du.label,
            name=du.name,
            type=du.type,
            level=int(du.level),
            result_text=du.result_text,
            provides=du.provides,
            resources=du.resources,
            consequences=du.consequences
        )
        session.add(db_du)

    session.flush()

    for du in case_data.diagnostic_units:
        current_new_id = id_map[str(du.id)]

        for m_id in du.media_ids:
            session.add(DUMediaFile(du_id=current_new_id, media_id=uuid.UUID(m_id)))

        for old_req_id in du.required_units:
            new_req_id = id_map.get(str(old_req_id))
            if new_req_id:
                session.add(UnitDependency(
                    unit_id=uuid.UUID(du.id), 
                    required_unit_id=new_req_id
                ))

    for hint in case_data.hints:
        session.add(Hint(case_id=case_id, **hint.model_dump()))


def get_default_settings(case_data: CaseCreate):
    if case_data.type.lower() == "practice":
        computed_defaults = {
            "enable_hints": True,
            "ignore_hint_cost": True,
            "enable_undo": True,
            "enable_LLM_mentor": True,
            "ignore_terminating_consequences": True,
            "show_result_immediately": True
        }
    elif case_data.type.lower() == "exam":
        computed_defaults = {
            "enable_hints": False,
            "ignore_hint_cost": False,
            "enable_undo": False,
            "enable_LLM_mentor": False,
            "ignore_terminating_consequences": False,
            "show_result_immediately": False
        }

    return computed_defaults



@router.post("/")
def create_case(case_data: CaseCreate, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    try:
        computed_defaults = get_default_settings(case_data)
        
        new_case_id = uuid.uuid4()
        db_case = Case(
            id=new_case_id,
            **case_data.model_dump(exclude={"hints", "diagnostic_units", "media_ids", "category_id", "status"}),
            default_settings=computed_defaults,
            created_by=current_user.id,
            version=1,
            status=case_data.status
        )
        session.add(db_case)        
        session.flush()

        populate_case_content(session, new_case_id, case_data)

        session.commit()
        return {"status": "success", "case_id": str(new_case_id)}

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(e))



# --- SVI DOSTUPNI CASEOVI - loše rješenje ---
@router.get("/", response_model=List[Case])
def get_all_cases(session: Session = Depends(get_session)):
    statement = select(Case)
    cases = session.exec(statement).all()

    case_list = [{"id": c.id, "title": c.title, "version": c.version} for c in cases]

    return case_list


# --- SVI CASEOVI DOSTUPNI SVIM KORISNICIMA (practice) ---
@router.get("/available", response_model=List[AssignmentCasePreview])
def get_available_cases(session: Session = Depends(get_session), current_user: User = Depends(get_current_active_user)):
    visibility_filter = or_(
        Case.is_public == True,
        (Case.is_public == False) & (Case.created_by == current_user.id)
    )

    latest_versions_subquery = (
        select(
            func.coalesce(Case.original_case_id, Case.id).label("group_id"),
            func.max(Case.version).label("max_version")
        )
        .where(Case.status == "published")
        .group_by("group_id")
    ).subquery()

    latest_free_attempts_sq = (
        select(SolveAttempt.case_id, SolveAttempt.status)
        .where(
            (SolveAttempt.user_id == current_user.id) &
            (SolveAttempt.assignment_id.is_(None))
        )
        .distinct(SolveAttempt.case_id)
        .order_by(SolveAttempt.case_id, SolveAttempt.started_at.desc())
    ).subquery()

    stmt = (
        select(Case, Category.name.label("topic_name"), latest_free_attempts_sq.c.status.label("attempt_status"))
        .join(CaseCategory, Case.id == CaseCategory.case_id)
        .join(Category, CaseCategory.category_id == Category.id)
        .join(latest_versions_subquery, (func.coalesce(Case.original_case_id, Case.id) == latest_versions_subquery.c.group_id))
        .outerjoin(latest_free_attempts_sq, latest_free_attempts_sq.c.case_id == Case.id)
        .where(visibility_filter)
        .where(Case.type == "practice")
        .where(Case.status == "published")
        .where(Case.version == latest_versions_subquery.c.max_version)
    )

    results = session.exec(stmt).all()

    return [
        AssignmentCasePreview(
            id=row.Case.id,
            version=row.Case.version,
            title=row.Case.title,
            level=row.Case.level,
            topic_name=row.topic_name,
            status=row.attempt_status or None
        ) for row in results
    ]


# ---- KOD KREIRANJA ZADAĆE - preview za nastavnike pri biranju slučajeva ----
@router.get("/picker", response_model=List[AssignmentCasePreview])
def get_cases_for_picker(session: Session = Depends(get_session), current_user: User = Depends(get_current_active_user)):
    visibility_filter = or_(
        Case.is_public == True,
        (Case.is_public == False) & (Case.created_by == current_user.id)
    )

    latest_versions_subquery = (
        select(
            func.coalesce(Case.original_case_id, Case.id).label("group_id"),
            func.max(Case.version).label("max_version")
        )
        .where(Case.status == "published")
        .group_by("group_id")
    ).subquery()

    used_cases_subquery = (
        select(AssignmentCase.case_id)
        .join(Assignment, AssignmentCase.assignment_id == Assignment.id)
        .where(Assignment.teacher_id == current_user.id)
    )

    statement = (
        select(Case, Category.name.label("topic_name"))
        .join(CaseCategory, Case.id == CaseCategory.case_id)
        .join(Category, CaseCategory.category_id == Category.id)
        .join(
            latest_versions_subquery,
            (func.coalesce(Case.original_case_id, Case.id) == latest_versions_subquery.c.group_id)
        )
        .where(visibility_filter)
        .where(Case.status == "published")
        .where(
            or_(
                # Uvjet A: To je najnovija verzija u svom nizu
                Case.version == latest_versions_subquery.c.max_version,
                # Uvjet B: Nastavnik je koristi u nekoj svojoj zadaći
                Case.id.in_(used_cases_subquery)
            )
        )
        .order_by(Case.title, Case.version.desc())
    )

    results = session.exec(statement).all()

    return [
        AssignmentCasePreview(
            id=row.Case.id,
            title=f"{row.Case.title} (v{row.Case.version})",
            level=row.Case.level,
            topic_name=row.topic_name
        ) for row in results
    ]


@router.get("/{case_id}", response_model=CaseReadWithMedia)
def get_case_details(case_id: str, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Slučaj nije pronađen.")

    media_list = [{
            "file_path": m.file_path.replace("\\", "/"), 
            "file_type": m.file_type, 
            "title": m.title
        } for m in case.media
    ]
    
    return {
        "id": case.id, 
        "title": case.title, 
        "initial_info": case.initial_info, 
        "media": media_list
    }


@router.get("/{case_id}/full")
def get_full_case_details(case_id: uuid.UUID, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Slučaj nije pronađen.")
    
    if case.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Nemate ovlasti za uređivanje ovog slučaja.")

    category_link = session.exec(
        select(CaseCategory).where(CaseCategory.case_id == case_id)
    ).first()
    category_id = str(category_link.category_id) if category_link else ""

    case_media_ids = [str(m.id) for m in case.media]

    hints_data = [
        {
            "sequence_no": h.sequence_no,
            "cost": h.cost,
            "text": h.text
        } for h in sorted(case.hints, key=lambda x: x.sequence_no)
    ]

    du_data = []
    for du in case.diagnostic_units:
        du_data.append({
            "id": str(du.id),
            "label": du.label,
            "name": du.name,
            "type": du.type,
            "level": du.level,
            "result_text": du.result_text,
            "provides": du.provides,
            "resources": du.resources,
            "consequences": du.consequences,
            "required_units": [str(req.id) for req in du.required_units],
            "media_ids": [str(m.id) for m in du.media]
        })

    return {
        "id": str(case.id),
        "title": case.title,
        "level": case.level,
        "type": case.type,
        "is_public": case.is_public,
        "initial_info": case.initial_info,
        "correct_diagnosis": case.correct_diagnosis,
        "if_incorrect": case.if_incorrect,
        "category_id": category_id,
        "status": case.status,
        "version": case.version,
        "media_ids": case_media_ids,
        "hints": hints_data,
        "diagnostic_units": du_data
    }


@router.patch("/{case_id}/archive")
def archive_case(case_id: uuid.UUID, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    db_case = session.get(Case, case_id)
    if not db_case:
        raise HTTPException(status_code=404, detail="Slučaj nije pronađen")
    
    if db_case.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Nemate ovlasti.")
    
    db_case.status = "archived"
    session.add(db_case)
    session.commit()
    
    return {"status": "success", "message": "Slučaj je uspješno arhiviran."}


@router.patch("/{case_id}/restore")
def restore_case(case_id: uuid.UUID, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    db_case = session.get(Case, case_id)
    if not db_case:
        raise HTTPException(status_code=404, detail="Slučaj nije pronađen")
    
    if db_case.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Nemate ovlasti.")
    
    db_case.status = "draft" 
    session.add(db_case)
    session.commit()
    
    return {"status": "success", "message": "Slučaj je vraćen u skice."}


@router.delete("/{case_id}")
def delete_case(case_id: uuid.UUID, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    db_case = session.get(Case, case_id)
    if not db_case:
        raise HTTPException(status_code=404, detail="Slučaj nije pronađen")
    
    if not db_case.created_by == current_user.id:
        raise HTTPException(status_code=403, detail="Ne možete brisati tuđe slučajeve.")
    
    try:
        media_records = db_case.media

        for media in media_records:
            other_usage_case = session.exec(select(CaseMediaFile).where(CaseMediaFile.media_id == media.id, CaseMediaFile.case_id != case_id)).first()
            other_usage_du = session.exec(select(DUMediaFile).where(DUMediaFile.media_id == media.id)).first()

            if not other_usage_case and not other_usage_du:
                if os.path.exists(media.file_path):
                    os.remove(media.file_path)
                session.delete(media)


        session.delete(db_case)        
        session.commit()
        return {"status": "success", "message": f"Slučaj {case_id} je uspješno obrisan"}
        
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri brisanju: {str(e)}")


# -------- EDIT ---------

@router.put("/{case_id}")
def edit_case(case_id: uuid.UUID, case_data: CaseEditRequest, current_user: User = Depends(get_current_teacher), session: Session = Depends(get_session)):
    old_case = session.get(Case, case_id)
    if not old_case or old_case.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Nemate ovlasti.")

    try:
        target_id = case_id

        if old_case.status == "draft":
            for key, value in case_data.model_dump(exclude={"hints", "diagnostic_units", "media_ids", "change_log", "status", "category_id"}).items():
                setattr(old_case, key, value)

            old_case.status = case_data.status
            
            clear_case_content(session, case_id)
            populate_case_content(session, case_id, case_data, force_new_ids=False)
            target_id = case_id

        elif case_data.status == "published":
            new_case_id = uuid.uuid4()
            new_case = Case(
                id=new_case_id,
                version=old_case.version + 1,
                original_case_id=old_case.original_case_id or old_case.id,
                created_by=current_user.id,
                default_settings=old_case.default_settings,
                status="published",
                **case_data.model_dump(exclude={"hints", "diagnostic_units", "media_ids", "change_log", "status", "category_id"})
            )
            session.add(new_case)
            session.flush()
            
            populate_case_content(session, new_case_id, case_data, force_new_ids=True)
            
            update_log = CaseUpdate(
                previous_case_id=case_id, 
                new_case_id=new_case_id, 
                change_log=case_data.change_log, 
                new_version=new_case.version
            )

            session.add(update_log)
            session.flush()
            create_update_notifications(session, case_id, update_log.id, current_user.id)
            target_id = new_case_id

        else:
            raise HTTPException(status_code=400, detail="Nije moguće vratiti objavljeni slučaj u status skice.")

        session.commit()
        return {"status": "success", "case_id": str(target_id)}

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=f"Greška pri ažuriranju: {str(e)}")
    


# @router.post("/")
# def create_case(case_data: CaseCreate, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
#     try:
#         new_case_id = uuid.uuid4()

#         if case_data.type.lower() == "practice":
#             computed_defaults = {
#                 "enable_hints": True,
#                 "ignore_hint_cost": True,
#                 "enable_undo": True,
#                 "enable_LLM_mentor": True,
#                 "ignore_terminating_consequences": True,
#                 "show_result_immediately": True
#             }
#         elif case_data.type.lower() == "exam":
#             computed_defaults = {
#                 "enable_hints": False,
#                 "ignore_hint_cost": False,
#                 "enable_undo": False,
#                 "enable_LLM_mentor": False,
#                 "ignore_terminating_consequences": False,
#                 "show_result_immediately": False
#             }
        
#         db_case = Case(
#             id=new_case_id,
#             title=case_data.title,
#             level=case_data.level,
#             type=case_data.type,
#             is_public=case_data.is_public,
#             initial_info=case_data.initial_info,
#             correct_diagnosis=case_data.correct_diagnosis,
#             if_incorrect=case_data.if_incorrect,
#             default_settings=computed_defaults,
#             created_by=current_user.id
#         )
#         session.add(db_case)

#         if case_data.category_id:
#             db_case_cat = CaseCategory(
#                 case_id=new_case_id,
#                 category_id=uuid.UUID(case_data.category_id)
#             )
#             session.add(db_case_cat)

#         session.flush()

#         for m_id in case_data.media_ids:
#             media_item = session.get(Media, m_id)
#             if media_item:
#                 media_item.case_id = new_case_id
#                 session.add(media_item)

#         for hint in case_data.hints:
#             db_hint = Hint(
#                 id=uuid.uuid4(),
#                 case_id=new_case_id,
#                 sequence_no=hint.sequence_no,
#                 cost=hint.cost,
#                 text=hint.text
#             )
#             session.add(db_hint)

#         for du in case_data.diagnostic_units:            
#             db_du = DiagnosticUnit(
#                 id=du.id,
#                 case_id=new_case_id,
#                 label=du.label,
#                 name=du.name,
#                 type=du.type,
#                 level=int(du.level),
#                 result_text=du.result_text,
#                 provides=du.provides,
#                 resources=du.resources,
#                 consequences=du.consequences
#             )
#             session.add(db_du)
        
#         session.flush()

#         for du in case_data.diagnostic_units:
#             for req_id in du.required_units:
#                 db_dep = UnitDependency(
#                     unit_id=du.id,
#                     required_unit_id=req_id
#                 )
#                 session.add(db_dep)

#             for m_id in du.media_ids:
#                 media_item = session.get(Media, m_id)
#                 if media_item:
#                     media_item.du_id = du.id
#                     media_item.case_id = new_case_id
#                     session.add(media_item)

#         session.commit()
        
#         return {"status": "success", "case_id": str(new_case_id)}

#     except Exception as e:
#         session.rollback()
#         raise HTTPException(status_code=400, detail=str(e))