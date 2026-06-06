import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, delete
from typing import List
from models import AddStudentToGroup, Assignment, Group, GroupAssignment, GroupCreate, GroupResponse, GroupUpdate, GroupMember, Institution, RemoveStudentFromGroup, Role, StudentAdminInfo, StudentBasicInfo, User, UserRole
from sqlalchemy.exc import IntegrityError
from routes.auth import get_current_active_user
from database import engine

router = APIRouter(prefix="/groups", tags=["Groups"])

def get_session():
    with Session(engine) as session:
        yield session


def get_current_academic_year():
    now = datetime.now()
    current_year = now.year
    if now.month >= 9:
        return f"{current_year}/{current_year + 1}"
    else:
        return f"{current_year - 1}/{current_year}"


@router.get("/", response_model=List[GroupResponse])
def get_groups(session: Session = Depends(get_session), current_user: User = Depends(get_current_active_user)):
    user_roles = session.exec(select(Role.name).join(UserRole).where(UserRole.user_id == current_user.id)).all()

    is_examinee = "examinee" in user_roles
    is_teacher = "teacher" in user_roles
    is_admin = "admin" in user_roles

    raw_groups = []
    if is_teacher:
        raw_groups = current_user.managed_groups
    elif is_examinee:
        raw_groups = current_user.groups
    elif is_admin:
        raw_groups = session.exec(select(Group)).all()    
    else:
        raise HTTPException(status_code=403, detail="Nemate ovlasti za ovu akciju.")
    
    frontend_groups = []
    for g in raw_groups:
        t_name = f"{g.teacher.first_name} {g.teacher.last_name}" if g.teacher else "Nepoznat nastavnik"
        
        inst_name = g.institution.name if g.institution else "Nepoznata ustanova"
        
        s_count = len(g.students) if hasattr(g, "students") else 0

        frontend_groups.append({
            "id": g.id,
            "name": g.name,
            "academic_year": g.academic_year,
            "teacher_name": t_name,
            "institution_name": inst_name,
            "student_count": s_count
        })

    return frontend_groups


@router.get("/{group_id}/members")
def get_group_members(group_id: uuid.UUID, session: Session = Depends(get_session), current_user: User = Depends(get_current_active_user)):
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupa nije pronađena")
    
    user_roles = session.exec(select(Role.name).join(UserRole).where(UserRole.user_id == current_user.id)).all()

    is_admin = "admin" in user_roles
    is_teacher = "teacher" in user_roles

    if not is_teacher and not is_admin:
        raise HTTPException(
            status_code=403, detail="Nemate ovlasti za ovu akciju (potrebna je uloga nastavnika ili administratora).")
    
    if is_teacher and group.teacher_id != current_user.id and not is_admin:
        raise HTTPException(status_code=403, detail="Niste vlasnik ove grupe.")
    
    if is_admin:
        return [
            StudentAdminInfo(
                id=student.id,
                first_name=student.first_name,
                last_name=student.last_name,
                email=student.email,
                expertise_level=student.expertise_level,
                xp_points=student.xp_points,
                is_active=student.is_active,
                institution_id=student.institution_id
            ) for student in group.students
        ]

    return [
        StudentBasicInfo(
            id=student.id,
            first_name=student.first_name,
            last_name=student.last_name,
            email=student.email,
            expertise_level=student.expertise_level,
            xp_points=student.xp_points
        ) for student in group.students
    ]


@router.get("/{group_id}/available-students", response_model=List[StudentBasicInfo])
def get_available_students_for_group(group_id: uuid.UUID, session: Session = Depends(get_session), current_user: User = Depends(get_current_active_user)):
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupa nije pronađena.")

    user_roles = session.exec(select(Role.name).join(UserRole).where(UserRole.user_id == current_user.id)).all()
    is_admin = "admin" in user_roles
    is_teacher = "teacher" in user_roles
    
    if not is_admin and group.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nemate ovlasti. Niste vlasnik ove grupe.")

    existing_members_sq = select(GroupMember.student_id).where(GroupMember.group_id == group_id)

    stmt = (
        select(User)
        .join(UserRole, UserRole.user_id == User.id)
        .join(Role, Role.id == UserRole.role_id)
        .where(Role.name == "examinee")
        .where(User.is_active == True)
        .where(~User.id.in_(existing_members_sq))
    )

    if is_teacher:
        if not current_user.institution_id:
            raise HTTPException(status_code=400, detail="Niste dodijeljeni nijednoj ustanovi.")
        stmt = stmt.where(User.institution_id == current_user.institution_id)

    stmt = stmt.order_by(User.last_name, User.first_name)
    available_students = session.exec(stmt).all()

    return [
        StudentBasicInfo(
            id=student.id,
            first_name=student.first_name,
            last_name=student.last_name,
            email=student.email,
            expertise_level=student.expertise_level,
            xp_points=student.xp_points
        ) for student in available_students
    ]


@router.get("/{group_id}/assignments")
def get_assignments_by_group(group_id: uuid.UUID, session: Session = Depends(get_session), current_user: User = Depends(get_current_active_user)):
    user_roles = session.exec(select(Role.name).join(UserRole).where(UserRole.user_id == current_user.id)).all()

    is_examinee = "examinee" in user_roles
    is_teacher = "teacher" in user_roles

    if is_examinee:
        stmt = select(GroupMember).where(GroupMember.group_id == group_id, GroupMember.student_id == current_user.id)
        membership = session.exec(stmt).first()

        if not membership:
            raise HTTPException(status_code=403, detail="Niste član ove grupe.")

    elif is_teacher:
        group = session.get(Group, group_id)

        if not group or (group.teacher_id != current_user.id):
            raise HTTPException(status_code=403, detail="Niste vlasnik ove grupe.")
        
    else:
        raise HTTPException(status_code=403, detail="Nemate ovlasti za ovu akciju.")
        
    stmt = (
        select(Assignment, GroupAssignment.available_until)
        .join(GroupAssignment, GroupAssignment.assignment_id == Assignment.id)
        .where(GroupAssignment.group_id == group_id)
    )

    results = session.exec(stmt).all()

    frontend_assignments = []
    for assignment, available_until in results:
        assignment_data = {
            "id": assignment.id,
            "title": assignment.title,
            "type": assignment.type,
            "instructions": assignment.instructions,
            "available_until": available_until
        }
        
        if is_teacher:
            assignment_data["settings"] = assignment.settings
            assignment_data["case_count"] = len(assignment.cases) if hasattr(assignment, "cases") else 0
            
        frontend_assignments.append(assignment_data)

    return frontend_assignments


@router.post("/")
def create_group(data: GroupCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_active_user)):
    user_roles = session.exec(select(Role.name).join(UserRole).where(UserRole.user_id == current_user.id)).all()

    is_admin = "admin" in user_roles
    is_teacher = "teacher" in user_roles

    if not is_teacher and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nemate ovlasti za ovu akciju."
        )

    if is_admin and data.teacher_id:
        target_teacher = session.get(User, data.teacher_id)
        if not target_teacher:
            raise HTTPException(status_code=404, detail="Odabrani nastavnik ne postoji")
        
        assigned_teacher_id = target_teacher.id
        assigned_inst_id = target_teacher.institution_id
        teacher_name = f"{target_teacher.first_name} {target_teacher.last_name}"

    elif is_teacher:
        assigned_teacher_id = current_user.id
        assigned_inst_id = current_user.institution_id
        teacher_name = f"{current_user.first_name} {current_user.last_name}"   

    else:
        raise HTTPException(status_code=403, detail="Greška pri kreiranju grupe: nije dozvoljeno kreiranje grupe kojom upravlja administrator.")       

    ac_year = data.academic_year or get_current_academic_year()

    new_group = Group(
        name=data.name,
        teacher_id=assigned_teacher_id,
        institution_id=assigned_inst_id,
        academic_year=ac_year
    )

    try:
        session.add(new_group)
        session.commit()
        session.refresh(new_group)

        institution = session.get(Institution, assigned_inst_id)
        inst_name = institution.name if institution else "Nepoznata institucija"

        return {
            "id": str(new_group.id),
            "name": new_group.name,
            "academic_year": new_group.academic_year,
            "teacher_name": teacher_name,
            "institution_name": inst_name,
            "student_count": 0
        }
    
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=400, 
            detail=f"Grupa '{data.name}' već postoji za ovog nastavnika u godini {ac_year}."
        )

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri kreiranju grupe: {str(e)}")


@router.patch("/{group_id}")
def update_group(group_id: uuid.UUID, data: GroupUpdate, session: Session = Depends(get_session), current_user: User = Depends(get_current_active_user)):
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupa nije pronađena")
    
    user_roles = session.exec(select(Role.name).join(UserRole).where(UserRole.user_id == current_user.id)).all()

    is_admin = "admin" in user_roles
    is_teacher = "teacher" in user_roles

    if not is_teacher and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nemate ovlasti za ovu akciju (potrebna je uloga nastavnika ili administratora)."
        )
    
    if is_teacher and not is_admin and group.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Možete uređivati samo svoje grupe.")

    try:
        update_data = data.model_dump(exclude_unset=True)

        if is_admin:
            if "teacher_id" in update_data:
                new_teacher = session.get(User, update_data["teacher_id"])
                if not new_teacher:
                    raise HTTPException(status_code=404, detail="Novi nastavnik nije pronađen")
                
                group.institution_id = new_teacher.institution_id

        else:
            update_data.pop("teacher_id", None)
            update_data.pop("institution_id", None)

        for key, value in update_data.items():
            setattr(group, key, value)
    
        session.add(group)
        session.commit()
        session.refresh(group)

        return group

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri ažuriranju grupe: {str(e)}")


@router.delete("/{group_id}")
def delete_group(group_id: uuid.UUID, session: Session = Depends(get_session), current_user: User = Depends(get_current_active_user)):
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupa nije pronađena")
    
    user_roles = session.exec(select(Role.name).join(UserRole).where(UserRole.user_id == current_user.id)).all()
    is_admin = "admin" in user_roles
    is_teacher = "teacher" in user_roles

    if not is_teacher and not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Nemate ovlasti za ovu akciju."
        )

    if not is_admin and group.teacher_id != current_user.id:
        raise HTTPException(
            status_code=403, 
            detail="Nemate ovlasti za brisanje ove grupe jer niste njezin vlasnik."
        )

    try:
        session.exec(delete(GroupMember).where(GroupMember.group_id == group_id))
        session.exec(delete(GroupAssignment).where(GroupAssignment.group_id == group_id))
        session.delete(group)
        session.commit()
        return {"message": "Grupa je uspješno obrisana"}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri brisanju: {str(e)}")


@router.post("/{group_id}/members")
def add_students_to_group(group_id: uuid.UUID, data: AddStudentToGroup, session: Session = Depends(get_session), current_user: User = Depends(get_current_active_user)):
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupa ne postoji")
    
    user_roles = session.exec(select(Role.name).join(UserRole).where(UserRole.user_id == current_user.id)).all()
    is_admin = "admin" in user_roles
    is_teacher = "teacher" in user_roles

    if not is_teacher and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nemate ovlasti za ovu akciju (potrebna je uloga nastavnika ili administratora)."
        )

    if not is_admin and group.teacher_id != current_user.id:
        raise HTTPException(
            status_code=403, 
            detail="Nemate ovlasti za upravljanje ovom grupom jer niste njezin vlasnik."
        )
    

    statement = select(GroupMember.student_id).where(GroupMember.group_id == group_id)
    existing_members = session.exec(statement).all()
    
    new_members = []
    added_count = 0

    for student_id in data.student_ids:
        if student_id not in existing_members:
            new_members.append(GroupMember(group_id=group_id, student_id=student_id))
            added_count += 1

    if not new_members:
        return {"message": "Odabrani studenti su već članovi ove grupe.", "added_count": 0}

    try:
        session.add_all(new_members)
        session.commit()

        if added_count == 1:
            msg = "Student uspješno dodan u grupu"
        else:
            msg = f"Uspješno dodano {added_count} studenata u grupu."

            return {"message": msg}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri dodavanju studenata: {str(e)}")



@router.delete("/{group_id}/members")
def remove_students_from_group(group_id: uuid.UUID, data: RemoveStudentFromGroup, session: Session = Depends(get_session), current_user: User = Depends(get_current_active_user)):
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Grupa ne postoji")
    
    user_roles = session.exec(select(Role.name).join(UserRole).where(UserRole.user_id == current_user.id)).all()
    is_admin = "admin" in user_roles
    is_teacher = "teacher" in user_roles

    if not is_teacher and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nemate ovlasti za ovu akciju (potrebna je uloga nastavnika ili administratora)."
        )

    if not is_admin and group.teacher_id != current_user.id:
        raise HTTPException(
            status_code=403, 
            detail="Nemate ovlasti za upravljanje ovom grupom jer niste njezin vlasnik."
        )
    
    try:
        statement = delete(GroupMember).where(
            GroupMember.group_id == group_id, 
            GroupMember.student_id.in_(data.student_ids)
        )

        res = session.exec(statement)
        session.commit()

        deleted_count = res.rowcount

        if deleted_count == 0:
            return {"message": "Nijedan od odabranih studenata nije pronađen u grupi."}

        if deleted_count == 1:
            return {"message": "1 student uspješno uklonjen iz grupe."}
        
        return {"message": f"Uspješno uklonjeno {deleted_count} studenata iz grupe."}

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri uklanjanju studenata iz grupe: {str(e)}")
