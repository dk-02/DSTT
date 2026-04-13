from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List

from database import engine
from models import User, UserRole, Role
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