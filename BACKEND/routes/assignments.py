from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_
from sqlmodel import Session, select, delete
from models import AddCasesToAssignment, AssignToGroupsData, Assignment, AssignmentCase, AssignmentCasePreview, AssignmentCreate, AssignmentSettings, AssignmentUpdate, Case, CaseCategory, Category, Group, GroupAssignment, GroupAssignmentLink, GroupMember, RandomCasePickerSettings, RemoveCasesFromAssignment, Role, SolveAttempt, UnassignFromGroupsData, User, UserRole
from routes.auth import get_current_active_user, get_current_teacher
from database import engine

router = APIRouter(prefix="/assignments", tags=["Assignments"])

def get_session():
    with Session(engine) as session:
        yield session


def get_default_settings(assignment_type: str) -> AssignmentSettings:
    if assignment_type == "practice":
        return AssignmentSettings()
    
    elif assignment_type == "practice_exam":
        return AssignmentSettings(
            show_result_immediately=True
        )
    
    elif assignment_type == "exam":
        return AssignmentSettings(
            enable_hints=False,
            ignore_hint_cost=False,
            enable_undo=False,
            enable_LLM_mentor=False,
            show_result_immediately=False
        )
    
    return AssignmentSettings()


@router.get("/dashboard")
def get_my_assignments(session: Session = Depends(get_session), current_user: User = Depends(get_current_active_user)):
    user_roles = session.exec(select(Role.name).join(UserRole).where(UserRole.user_id == current_user.id)).all()

    is_teacher = "teacher" in user_roles
    is_examinee = "examinee" in user_roles

    if is_teacher:
        assignments = session.exec(
            select(Assignment)
            .where(Assignment.teacher_id == current_user.id)
            .where(Assignment.status != "archived")
            ).all()

        teacher_response = []
        for a in assignments:
            case_count = len(a.cases) if hasattr(a, "cases") else 0
            
            teacher_response.append({
                "id": a.id,
                "title": a.title,
                "type": a.type,
                "case_count": case_count
            })

        return teacher_response
    
    if is_examinee:
        stmt = (
            select(Assignment, Group.name.label("group_name"), GroupAssignment.available_until)
            .join(GroupAssignment, Assignment.id == GroupAssignment.assignment_id)
            .join(Group, Group.id == GroupAssignment.group_id)
            .join(GroupMember, GroupMember.group_id == Group.id)
            .where(GroupMember.student_id == current_user.id)
            .where(Assignment.status != "archived")
        )

        results = session.exec(stmt).all()

        return [
            {
                "id": r.Assignment.id,
                "title": r.Assignment.title,
                "type": r.Assignment.type,
                "instructions": r.Assignment.instructions,
                "group_name": r.group_name,
                "available_until": r.available_until
            } for r in results
        ]

    raise HTTPException(status_code=403, detail="Nemate ovlasti za ovu akciju.")


@router.get("/dashboard/archive")
def get_my_archived_assignments(session: Session = Depends(get_session), current_user: User = Depends(get_current_teacher)):
    assignments = session.exec(
        select(Assignment)
        .where(Assignment.teacher_id == current_user.id)
        .where(Assignment.status == "archived")
        ).all()

    response = []
    for a in assignments:
        case_count = len(a.cases) if hasattr(a, "cases") else 0
        
        response.append({
            "id": a.id,
            "title": a.title,
            "type": a.type,
            "case_count": case_count
        })

    return response


@router.post("/preview-random-cases", response_model=List[AssignmentCasePreview])
def preview_random_cases(settings: RandomCasePickerSettings, assignment_type: str, session: Session = Depends(get_session), current_user: User = Depends(get_current_active_user)):
    visibility_filter = or_(
        Case.is_public == True,
        (Case.is_public == False) & (Case.created_by == current_user.id)
    )

    case_query = (
        select(Case, Category.name.label("topic_name"))
        .join(CaseCategory, Case.id == CaseCategory.case_id)
        .join(Category, CaseCategory.category_id == Category.id)
        .where(visibility_filter)
    )

    if assignment_type in ["practice", "practice_exam"]:
        case_query = case_query.where(Case.type == "practice")
    elif assignment_type == "exam":
        case_query = case_query.where(Case.type == "exam")

    if settings.topic:
        case_query = case_query.where(CaseCategory.category_id == uuid.UUID(settings.topic))
    
    if settings.case_level:
        case_query = case_query.where(Case.level == settings.case_level)

    case_query = case_query.order_by(func.random()).limit(settings.no_of_cases)    
    selected_cases = session.exec(case_query).all()

    if len(selected_cases) < settings.no_of_cases:
        raise HTTPException(
            status_code=400, 
            detail=f"Nema dovoljno slučajeva koji zadovoljavaju tražene kriterije (traženo: {settings.no_of_cases}, pronađeno: {len(selected_cases)})."
        )

    return [
        AssignmentCasePreview(
            id=row.Case.id, 
            title=row.Case.title, 
            level=row.Case.level, 
            topic_name=row.topic_name,
            correct_diagnosis=row.Case.correct_diagnosis
        ) for row in selected_cases
    ]


@router.post("/", status_code=201)
def create_assignment(data: AssignmentCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_teacher)):
    final_settings = data.settings
    if not final_settings:
        final_settings = get_default_settings(data.type)

    if final_settings.randomly_choose_cases == True and not data.selected_case_ids:
        raise HTTPException(status_code=400, detail="Potrebno je prvo pokrenuti odabir slučajeva.")
    
    new_assignment = Assignment(
        title=data.title,
        instructions=data.instructions,
        type=data.type,
        settings=final_settings.model_dump(),
        teacher_id=current_user.id
    )    
    
    try:
        session.add(new_assignment)
        session.flush()

        if data.selected_case_ids:
            for item in data.selected_case_ids:
                link = AssignmentCase(
                    assignment_id=new_assignment.id,
                    case_id=item.case_id,
                    sequence_no=item.sequence_no
                )
                session.add(link)

        session.commit()
        session.refresh(new_assignment)
        return new_assignment

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri kreiranju zadaće: {str(e)}")


@router.patch("/{assignment_id}")
def update_assignment(assignment_id: uuid.UUID, data: AssignmentUpdate, session: Session = Depends(get_session), current_user: User = Depends(get_current_teacher)):
    assignment = session.get(Assignment, assignment_id)
    if not assignment: 
        raise HTTPException(404, "Zadaća nije pronađena.")
    
    update_data = data.model_dump(exclude_unset=True)
    
    if "settings" in update_data:
        existing_settings = assignment.settings or {}
        new_settings = update_data["settings"]
        
        if "randomly_choose_cases" in existing_settings:
            new_settings["randomly_choose_cases"] = existing_settings["randomly_choose_cases"]

        if "random_case_picker_settings" in existing_settings:
            new_settings["random_case_picker_settings"] = existing_settings["random_case_picker_settings"]
            
        assignment.settings = new_settings

    if "case_sequence" in update_data:
        new_order = update_data["case_sequence"]

        current_links = session.exec(
            select(AssignmentCase).where(AssignmentCase.assignment_id == assignment_id)
        ).all()

        current_case_ids = {link.case_id for link in current_links}

        if set(new_order) != current_case_ids:
            raise HTTPException(status_code=400, detail="Popis za promjenu redoslijeda mora sadržavati točno one slučajeve koji su trenutno u zadaći.")
        
        link_map = {link.case_id: link for link in current_links}

        for idx, case_id in enumerate(new_order, start=1):
            link = link_map.get(case_id)
            if link: 
                link.sequence_no = idx
                session.add(link)


    for key, value in update_data.items():
        if key not in ["settings", "case_sequence"]:
            setattr(assignment, key, value)

    try:
        session.add(assignment)
        session.commit()
        session.refresh(assignment)
        return assignment
    
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri ažuriranju zadaće: {str(e)}")


@router.patch("/{assignment_id}/archive")
def archive_assignment(assignment_id: uuid.UUID, session: Session = Depends(get_session), current_user: User = Depends(get_current_teacher)):
    assignment = session.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Zadaća nije pronađena.")
    
    if assignment.teacher_id != current_user.id:
        raise HTTPException(
            status_code=403, 
            detail="Možete arhivirati samo svoje zadaće."
        )

    try:
        assignment.status = "archived"
        
        session.add(assignment)
        session.commit()
        return {"message": "Zadaća je uspješno arhivirana."}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri arhiviranju: {str(e)}")
    

@router.patch("/{assignment_id}/unarchive")
def unarchive_assignment(assignment_id: uuid.UUID, session: Session = Depends(get_session), current_user: User = Depends(get_current_teacher)):
    assignment = session.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Zadaća nije pronađena.")
    
    if assignment.teacher_id != current_user.id:
        raise HTTPException(
            status_code=403, 
            detail="Možete vratiti samo svoje zadaće."
        )

    try:
        assignment.status = "active"
        
        session.add(assignment)
        session.commit()
        return {"message": "Zadaća je uspješno vraćena."}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri arhiviranju: {str(e)}")


@router.delete("/{assignment_id}")
def delete_assignment(assignment_id: uuid.UUID, session: Session = Depends(get_session), current_user: User = Depends(get_current_teacher)):
    assignment = session.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Zadaća nije pronađena.")
    
    if assignment.teacher_id != current_user.id:
        raise HTTPException(
            status_code=403, 
            detail="Možete obrisati samo svoje zadaće."
        )

    try:
        session.delete(assignment)
        session.commit()
        return {"message": "Zadaća je trajno obrisana."}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri brisanju: {str(e)}")
    

# --- CASES ---
@router.get("/{assignment_id}/preview-cases")
def preview_cases_for_adding(assignment_id: uuid.UUID, current_user: User = Depends(get_current_teacher), session: Session = Depends(get_session)):
    assignment = session.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Zadaća nije pronađena.")

    visibility_filter = or_(
        Case.is_public == True,
        (Case.is_public == False) & (Case.created_by == current_user.id)
    )

    existing_cases_subquery = select(AssignmentCase.case_id).where(AssignmentCase.assignment_id == assignment_id)

    case_query = (
        select(Case, Category.name.label("topic_name"))
        .outerjoin(CaseCategory, Case.id == CaseCategory.case_id)
        .outerjoin(Category, CaseCategory.category_id == Category.id)
        .where(visibility_filter)
        .where(Case.status == "published")
        .where(Case.id.not_in(existing_cases_subquery))
    )

    if assignment.type in ["practice", "practice_exam"]:
        case_query = case_query.where(Case.type == "practice")
    elif assignment.type == "exam":
        case_query = case_query.where(Case.type == "exam")
    
    cases = session.exec(case_query).all()

    return [
        AssignmentCasePreview(
            id=row.Case.id, 
            title=row.Case.title, 
            level=row.Case.level, 
            topic_name=row.topic_name,
            correct_diagnosis=row.Case.correct_diagnosis
        ) for row in cases
    ]

@router.post("/{assignment_id}/cases")
def add_case_to_assignment(assignment_id: uuid.UUID, data: AddCasesToAssignment, current_user: User = Depends(get_current_teacher), session: Session = Depends(get_session)):
    assignment = session.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Zadaća nije pronađena.")

    if assignment.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Možete mijenjati samo svoje zadaće.")
    
    visibility_filter = or_(
        Case.is_public == True,
        (Case.is_public == False) & (Case.created_by == current_user.id)
    )

    cases_to_add = session.exec(
        select(Case)
        .where(Case.id.in_(data.case_ids))
        .where(visibility_filter)
    ).all()

    if not cases_to_add:
        raise HTTPException(status_code=404, detail="Nijedan od odabranih slučajeva nije pronađen ili nemate pravo pristupa.")
    
    for case in cases_to_add:
        if assignment.type in ["practice", "practice-exam"] and case.type != "practice":
            raise HTTPException(status_code=400, detail=f"Slučaj '{case.title}' ne može se dodati u vježbu (može samo u ispit).")
        if assignment.type == "exam" and case.type != "exam":
            raise HTTPException(status_code=400, detail=f"Slučaj '{case.title}' ne može se dodati u ispit (može samo u vježbu).")

    existing_links = session.exec(
        select(AssignmentCase.case_id)
        .where(AssignmentCase.assignment_id == assignment_id)
        .where(AssignmentCase.case_id.in_(data.case_ids))
    ).all()
    
    new_cases = [c for c in cases_to_add if c.id not in existing_links]

    if not new_cases:
        return {"message": "Svi odabrani slučajevi se već nalaze u zadaći."}
    
    max_seq = session.exec(
        select(func.max(AssignmentCase.sequence_no))
        .where(AssignmentCase.assignment_id == assignment_id)
    ).first() or 0

    try:
        for case in new_cases:
            max_seq += 1
            new_link = AssignmentCase(
                assignment_id=assignment_id,
                case_id=case.id,
                sequence_no=max_seq
            )
            session.add(new_link)

        session.commit()
        return {"message": f"Uspješno dodano {len(new_cases)} slučajeva u zadaću."}
    
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri dodavanju slučajeva u zadaću: {str(e)}")


@router.delete("/{assignment_id}/cases")
def remove_case_from_assignment(assignment_id: uuid.UUID, data: RemoveCasesFromAssignment, current_user: User = Depends(get_current_teacher), session: Session = Depends(get_session)):
    assignment = session.get(Assignment, assignment_id)

    if not assignment:
        raise HTTPException(status_code=404, detail="Zadaća nije pronađena.")
    if assignment.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nemate ovlasti za izmjenu ove zadaće.")
    
    try:
        delete_stmt = delete(AssignmentCase).where(
            AssignmentCase.assignment_id == assignment_id, 
            AssignmentCase.case_id.in_(data.case_ids)
        )
        session.exec(delete_stmt)

        update_statement = (
            select(AssignmentCase)
            .where(AssignmentCase.assignment_id == assignment_id)
            .order_by(AssignmentCase.sequence_no)
        )
        remaining_cases = session.exec(update_statement).all()
        
        for idx, link in enumerate(remaining_cases, start=1):
            link.sequence_no = idx
            session.add(link)

        session.commit()
        return {"message": f"Uspješno obrisano slučajeva: {len(data.case_ids)}."}
    
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri uklanjanju slučajeva iz zadaće: {str(e)}")


# --- ASSIGNING TO GROUPS ---
@router.post("/{assignment_id}/groups")
def assign_assignment_to_group(assignment_id: uuid.UUID, data: AssignToGroupsData, current_user: User = Depends(get_current_teacher), session: Session = Depends(get_session)):
    assignment = session.get(Assignment, assignment_id)

    if not assignment:
        raise HTTPException(status_code=404, detail="Zadaća nije pronađena.")
    if assignment.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Možete dodjeljivati samo svoje zadaće.")
    
    group_ids = [item.group_id for item in data.groups]

    groups_in_db = session.exec(
        select(Group).where(Group.id.in_(group_ids))
    ).all()

    if not groups_in_db:
        raise HTTPException(status_code=404, detail="Nijedna od odabranih grupa nije pronađena.")
    
    for group in groups_in_db:
        if group.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail=f"Nemate ovlasti za grupu '{group.name}'.")

    existing_links = session.exec(
        select(GroupAssignment.group_id)
        .where(GroupAssignment.assignment_id == assignment_id)
        .where(GroupAssignment.group_id.in_(group_ids))
    ).all()

    items_to_add = [item for item in data.groups if item.group_id not in existing_links]
    
    if not items_to_add:
        return {"message": "Zadaća je već dodijeljena svim odabranim grupama."}

    try:
        for item in items_to_add:
            new_link = GroupAssignment(
                assignment_id=assignment_id, 
                group_id=item.group_id,
                available_until=item.available_until
            )
            session.add(new_link)

        session.commit()
        return {"message": f"Zadatak uspješno dodijeljen grupama ({len(items_to_add)})."}
    
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri dodjeli zadaće: {str(e)}")


@router.delete("/{assignment_id}/groups")
def remove_assignment_from_group(assignment_id: uuid.UUID, data: UnassignFromGroupsData, current_user: User = Depends(get_current_teacher), session: Session = Depends(get_session)):
    assignment = session.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Zadaća nije pronađena.")
    
    if assignment.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nemate ovlasti za uklanjanje ove zadaće.")
    
    existing_attempts_stmt = (
        select(SolveAttempt.id)
        .join(GroupMember, GroupMember.student_id == SolveAttempt.user_id)
        .where(SolveAttempt.assignment_id == assignment_id)
        .where(GroupMember.group_id.in_(data.group_ids))
    )

    if session.exec(existing_attempts_stmt).first():
        raise HTTPException(
            status_code=400, 
            detail="Ne možete ukloniti zadaću jer su je neki studenti iz odabranih grupa već počeli rješavati. Umjesto toga, možete promijeniti rok."
        )

    try:
        delete_stmt = delete(GroupAssignment).where(
            GroupAssignment.assignment_id == assignment_id, 
            GroupAssignment.group_id.in_(data.group_ids)
        )
        
        session.exec(delete_stmt)
        session.commit()

        return {"message": "Zadaća uspješno uklonjena iz odabranih grupa."}
    
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri uklanjanju zadaće iz grupa: {str(e)}")
    


@router.get("/{assignment_id}")
def get_assignment_details(assignment_id: uuid.UUID, session: Session = Depends(get_session), current_user: User = Depends(get_current_active_user)):
    user_roles = session.exec(
        select(Role.name)
        .join(UserRole)
        .where(UserRole.user_id == current_user.id)
    ).all()

    if not ("teacher" in user_roles) and not ("examinee" in user_roles):
        raise HTTPException(status_code=403, detail="Nemate ovlasti za pristup podatcima ove zadaće.")

    stmt_assignment = (
        select(Assignment, User.first_name, User.last_name)
        .join(User, Assignment.teacher_id == User.id)
        .where(Assignment.id == assignment_id)
    )
    result = session.exec(stmt_assignment).first()

    if not result:
        raise HTTPException(status_code=404, detail="Zadaća nije pronađena.")

    assignment, first_name, last_name = result
    teacher_full_name = f"{first_name} {last_name}"

    latest_attempts_sq = (
        select(SolveAttempt.case_id, SolveAttempt.status)
        .where(
            (SolveAttempt.user_id == current_user.id) &
            (SolveAttempt.assignment_id == assignment_id)
        )
        .distinct(SolveAttempt.case_id) # Postgres DISTINCT ON
        .order_by(SolveAttempt.case_id, SolveAttempt.started_at.desc())
    ).subquery()

    stmt_cases = (
        select(AssignmentCase.sequence_no, Case, Category.name.label("topic_name"), latest_attempts_sq.c.status.label("attempt_status"))
        .join(Case, AssignmentCase.case_id == Case.id)
        .outerjoin(CaseCategory, Case.id == CaseCategory.case_id)
        .outerjoin(Category, CaseCategory.category_id == Category.id)
        .outerjoin(latest_attempts_sq, latest_attempts_sq.c.case_id == Case.id)
        .where(AssignmentCase.assignment_id == assignment_id)
        .order_by(AssignmentCase.sequence_no)
    )    
    cases_data = session.exec(stmt_cases).all()
    
    cases_response = [
        {
            "id": row.Case.id,
            "title": row.Case.title,
            "version": row.Case.version,
            "level": row.Case.level,
            "topic_name": row.topic_name,
            "sequence_no": row.sequence_no,
            "status": row.attempt_status or None
        } for row in cases_data
    ]

    response_data = {
        "id": assignment.id,
        "title": assignment.title,
        "type": assignment.type,
        "instructions": assignment.instructions,
        "cases": cases_response
    }

    if "examinee" in user_roles:
        response_data["teacher_name"] = teacher_full_name
    
    if "teacher" in user_roles:
        stmt_groups = (
            select(Group.id, Group.name, GroupAssignment.available_until)
            .join(GroupAssignment, GroupAssignment.group_id == Group.id)
            .where(GroupAssignment.assignment_id == assignment_id)
        )
        group_results = session.exec(stmt_groups).all()
        
        assigned_groups = [
            {
                "group_id": r.id or None,
                "group_name": r.name or None,
                "available_until": r.available_until or None
            } for r in group_results
        ]

        res_settings = assignment.settings.copy() if assignment.settings else {}
        random_settings = res_settings.get("random_case_picker_settings")

        if random_settings and "topic" in random_settings:
            topic_id = random_settings["topic"]

            stmt_topic = select(Category.name).where(Category.id == topic_id)
            topic = session.exec(stmt_topic).first()

            res_settings["random_case_picker_settings"]["topic"] = topic

        response_data["assigned_groups"] = assigned_groups
        response_data["settings"] = res_settings

        return response_data

    return response_data