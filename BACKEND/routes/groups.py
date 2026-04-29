from datetime import datetime
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from models import AddStudentToGroup, Group, GroupCreate, GroupUpdate, GroupMember, Role, User, Institution, UserRole
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


@router.get("/{group_id}/members", response_model=List[User])
def get_group_members(group_id: uuid.UUID, session: Session = Depends(get_session), current_user: User = Depends(get_current_active_user)):
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

    return group.students


@router.post("/")
def create_group(data: GroupCreate, session: Session = Depends(get_session), current_user: User = Depends(get_current_active_user)):
    try:
        user_roles = session.exec(select(Role.name).join(UserRole).where(UserRole.user_id == current_user.id)).all()

        is_admin = "admin" in user_roles
        is_teacher = "teacher" in user_roles

        if not is_teacher and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Nemate ovlasti za ovu akciju (potrebna je uloga nastavnika ili administratora)."
            )

        if is_admin and data.teacher_id:
            target_teacher = session.get(User, data.teacher_id)
            if not target_teacher:
                raise HTTPException(status_code=404, detail="Odabrani nastavnik ne postoji")
            
            assigned_teacher_id = target_teacher.id
            assigned_inst_id = target_teacher.institution_id

        elif is_teacher:
            assigned_teacher_id = current_user.id
            assigned_inst_id = current_user.institution_id     

        else:
            raise HTTPException(status_code=403, detail="Greška pri kreiranju grupe: nije dozvoljeno kreiranje grupe kojom upravlja administrator.")       

        ac_year = data.academic_year or get_current_academic_year()

        new_group = Group(
            name=data.name,
            teacher_id=assigned_teacher_id,
            institution_id=assigned_inst_id,
            academic_year=ac_year
        )

        session.add(new_group)
        session.commit()
        session.refresh(new_group)

        return new_group
    
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
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nemate ovlasti za ovu akciju (potrebna je uloga nastavnika ili administratora)."
        )

    if not is_admin and group.teacher_id != current_user.id:
        raise HTTPException(
            status_code=403, 
            detail="Nemate ovlasti za brisanje ove grupe jer niste njezin vlasnik."
        )

    try:
        session.delete(group)
        session.commit()
        return {"message": "Grupa je uspješno obrisana"}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri brisanju: {str(e)}")


@router.post("/{group_id}/members")
def add_student_to_group(group_id: uuid.UUID, data: AddStudentToGroup, session: Session = Depends(get_session), current_user: User = Depends(get_current_active_user)):
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
    
    statement = select(GroupMember).where(
        GroupMember.group_id == group_id, 
        GroupMember.student_id == data.student_id
    )
    existing_member = session.exec(statement).first()
    if existing_member:
        raise HTTPException(status_code=400, detail="Student je već član ove grupe")

    new_member = GroupMember(group_id=group_id, student_id=data.student_id)

    try:
        session.add(new_member)
        session.commit()
        return {"message": "Student uspješno dodan u grupu"}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri dodavanju studenta: {str(e)}")



@router.delete("/{group_id}/members/{student_id}")
def remove_student_from_group(group_id: uuid.UUID, student_id: uuid.UUID, session: Session = Depends(get_session), current_user: User = Depends(get_current_active_user)):
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
    
    statement = select(GroupMember).where(
        GroupMember.group_id == group_id, 
        GroupMember.student_id == student_id
    )
    member = session.exec(statement).first()
    if not member:
        raise HTTPException(status_code=404, detail="Student nije pronađen.")

    try:
        session.delete(member)
        session.commit()
        return {"message": "Student uspješno uklonjen iz grupe."}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri uklanjanju studenta iz grupe: {str(e)}")
