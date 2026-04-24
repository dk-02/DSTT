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

@router.put("/edit/{user_id}")
def register(user_id: uuid.UUID, user_data: UserEdit, current_admin: User = Depends(get_current_admin), session: Session = Depends(get_session)):
    existing_user = session.get(User, user_id)
    
    if not existing_user:
        raise HTTPException(
            status_code=400, 
            detail="Korisnik nije pronađen"
        )

    try:
        existing_user.email = user_data.email
        existing_user.first_name = user_data.first_name
        existing_user.last_name = user_data.last_name

        session.add(existing_user)
        session.commit()
        session.refresh(existing_user)

        return {"status": "success", "message": "Uspješno uređeni podatci."}

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri uređivanju: {str(e)}")