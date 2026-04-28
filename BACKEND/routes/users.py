import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from database import engine
from models import User, UserEdit, UserRole, Role
from routes.auth import get_current_admin 

router = APIRouter(prefix="/users", tags=["Users"])

def get_session():
    with Session(engine) as session:
        yield session

@router.get("/", response_model=List[dict])
def get_all_users(
    session: Session = Depends(get_session),
    current_admin: User = Depends(get_current_admin)
):
    """
    Dohvaća popis svih korisnika iz baze zajedno s njihovim ulogama.
    Dostupno samo administratorima.
    """

    users = session.exec(select(User)).all()
    
    result = []
    
    for user in users:
        roles_statement = (
            select(Role.name)
            .join(UserRole)
            .where(UserRole.user_id == user.id)
        )
        user_roles = session.exec(roles_statement).all()
        
        result.append({
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "is_active": user.is_active,
            "roles": user_roles
        })
        
    return result

@router.patch("/edit/{user_id}")
def edit_user(user_id: uuid.UUID, user_data: UserEdit, current_admin: User = Depends(get_current_admin), session: Session = Depends(get_session)):
    existing_user = session.get(User, user_id)
    
    if not existing_user:
        raise HTTPException(
            status_code=400, 
            detail="Korisnik nije pronađen"
        )

    try:
        update_data = user_data.model_dump(exclude_unset=True)

        for key, value in update_data.items():
            setattr(existing_user, key, value)

        session.add(existing_user)
        session.commit()
        session.refresh(existing_user)

        return {
            "status": "success", 
            "message": "Uspješno uređeni podatci."
        }

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri uređivanju: {str(e)}")
    

@router.delete("/delete/{user_id}")
def delete_user(
    user_id: uuid.UUID, 
    current_admin: User = Depends(get_current_admin), 
    session: Session = Depends(get_session)
):
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Korisnik nije pronađen")

    if target_user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Ne možete obrisati vlastiti račun")

    try:
        roles_statement = select(UserRole).where(UserRole.user_id == user_id)
        user_roles = session.exec(roles_statement).all()
        for role in user_roles:
            session.delete(role)
        
        session.delete(target_user)
        session.commit()
        
        return {"message": f"Korisnik {target_user.email} je uspješno obrisan."}
        
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri brisanju: {str(e)}")