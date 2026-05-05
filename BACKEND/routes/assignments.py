from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_
from sqlmodel import Session, select
from models import Assignment, AssignmentCase, AssignmentCasePreview, AssignmentCreate, AssignmentSettings, AssignmentUpdate, Case, CaseCategory, Category, Group, GroupAssignment, GroupAssignmentLink, GroupMember, RandomCasePickerSettings, Role, User, UserRole
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
        stmt = select(Assignment).where(Assignment.teacher_id == current_user.id)
        results = session.exec(stmt).all()

        return results
    
    if is_examinee:
        stmt = (
            select(Assignment, Group.name.label("group_name"), GroupAssignment.available_until)
            .join(GroupAssignment, Assignment.id == GroupAssignment.assignment_id)
            .join(Group, Group.id == GroupAssignment.group_id)
            .join(GroupMember, GroupMember.group_id == Group.id)
            .where(GroupMember.student_id == current_user.id)
        )

        results = session.exec(stmt).all()

        return [
            {
                "assignment": r.Assignment,
                "group_name": r.group_name,
                "available_until": r.available_until
            } for r in results
        ]

    raise HTTPException(status_code=403, detail="Nemate ovlasti za ovu akciju.")
    


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
            topic_name=row.topic_name
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
        assignment.settings = update_data["settings"]

    for key, value in update_data.items():
        if key != "settings":
            setattr(assignment, key, value)

    try:
        session.add(assignment)
        session.commit()
        session.refresh(assignment)
        return assignment
    
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri ažuriranju zadaće: {str(e)}")


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
@router.post("/{assignment_id}/cases/{case_id}")
def add_case_to_assignment(assignment_id: uuid.UUID, case_id: uuid.UUID, current_user: User = Depends(get_current_teacher), session: Session = Depends(get_session)):
    assignment = session.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Zadaća nije pronađena.")

    if assignment.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Možete mijenjati samo svoje zadaće."
        )
    
    visibility_filter = or_(
        Case.is_public == True,
        (Case.is_public == False) & (Case.created_by == current_user.id)
    )

    case = session.exec(select(Case).where(Case.id == case_id).where(visibility_filter)).first()

    if not case:
        raise HTTPException(status_code=404, detail="Željeni slučaj nije pronađen ili niste vlasnik.")
    

    if assignment.type in ["practice", "practice_exam"] and case.type != "practice":
        raise HTTPException(status_code=400, detail="U vježbu možete dodati samo slučajeve namijenjene vježbama.")
    
    if assignment.type == "exam" and case.type != "exam":
        raise HTTPException(status_code=400, detail="U ispit možete dodati samo slučajeve namijenjene ispitima.")
    

    existing_link = session.exec(
        select(AssignmentCase).where(
            AssignmentCase.assignment_id == assignment_id, 
            AssignmentCase.case_id == case_id
        )
    ).first()
    
    if existing_link:
        raise HTTPException(status_code=400, detail="Ovaj slučaj je već dodan u zadaću.")
    
    max_seq = session.exec(
        select(func.max(AssignmentCase.sequence_no))
        .where(AssignmentCase.assignment_id == assignment_id)
    ).first() or 0

    new_link = AssignmentCase(
        assignment_id=assignment_id, 
        case_id=case_id, 
        sequence_no=max_seq + 1
    )

    try:
        session.add(new_link)
        session.commit()
        return {"message": "Slučaj uspješno dodan u zadaću."}
    
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri dodavanju slučaja u zadaću: {str(e)}")


@router.delete("/{assignment_id}/cases/{case_id}")
def remove_case_from_assignment(assignment_id: uuid.UUID, case_id: uuid.UUID, current_user: User = Depends(get_current_teacher), session: Session = Depends(get_session)):
    assignment = session.get(Assignment, assignment_id)

    if not assignment:
        raise HTTPException(status_code=404, detail="Zadaća nije pronađena.")
    if assignment.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nemate ovlasti za izmjenu ove zadaće.")

    statement = select(AssignmentCase).where(
        AssignmentCase.assignment_id == assignment_id, 
        AssignmentCase.case_id == case_id
    )
    link_to_delete = session.exec(statement).first()

    if not link_to_delete:
        raise HTTPException(status_code=404, detail="Slučaj nije pronađen u ovoj zadaći.")

    removed_sequence = link_to_delete.sequence_no

    try:
        session.delete(link_to_delete)

        update_statement = (
            select(AssignmentCase)
            .where(AssignmentCase.assignment_id == assignment_id)
            .where(AssignmentCase.sequence_no > removed_sequence)
        )
        subsequent_cases = session.exec(update_statement).all()
        
        for case in subsequent_cases:
            case.sequence_no -= 1
            session.add(case)

        session.commit()
        return {"message": "Slučaj uklonjen iz zadaće."}
    
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri uklanjanju slučaja iz zadaće: {str(e)}")


# --- ASSIGNING TO GROUPS ---

@router.post("/{assignment_id}/groups/{group_id}")
def assign_assignment_to_group(assignment_id: uuid.UUID, group_id: uuid.UUID, data: GroupAssignmentLink, current_user: User = Depends(get_current_teacher), session: Session = Depends(get_session)):
    assignment = session.get(Assignment, assignment_id)

    if not assignment:
        raise HTTPException(status_code=404, detail="Zadaća nije pronađena.")
    if assignment.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Možete dodjeljivati samo svoje zadaće.")
    
    group = session.get(Group, group_id)

    if not group:
        raise HTTPException(status_code=404, detail="Grupa nije pronađena.")
    if group.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Možete dodjeljivati zadaće samo svojim grupama.")

    existing = session.exec(
        select(GroupAssignment).where(
            GroupAssignment.assignment_id == assignment_id, 
            GroupAssignment.group_id == group_id
        )
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Zadatak je već dodijeljen ovoj grupi.")

    try:
        new_link = GroupAssignment(
            assignment_id=assignment_id, 
            group_id=group_id,
            available_until=data.available_until
        )

        session.add(new_link)
        session.commit()
        return {"message": "Zadatak uspješno dodijeljen grupi."}
    
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri dodjeli zadaće grupi: {str(e)}")


@router.delete("/{assignment_id}/groups/{group_id}")
def remove_assignment_from_group(assignment_id: uuid.UUID, group_id: uuid.UUID, current_user: User = Depends(get_current_teacher), session: Session = Depends(get_session)):
    assignment = session.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Zadaća nije pronađena.")
    
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupa nije pronađena.")
    
    if assignment.teacher_id != current_user.id or group.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nemate ovlasti za uklanjanje ove zadaće iz ove grupe.")

    statement = select(GroupAssignment).where(
        GroupAssignment.assignment_id == assignment_id, 
        GroupAssignment.group_id == group_id
    )
    link = session.exec(statement).first()

    if not link:
        raise HTTPException(status_code=404, detail="Ova zadaća nije dodijeljena navedenoj grupi.")
    
    try:
        session.delete(link)
        session.commit()
        return {"message": "Zadatak uspješno uklonjen iz grupe."}
    
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri uklanjanju zadaće iz grupe: {str(e)}")