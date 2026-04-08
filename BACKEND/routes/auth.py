import os
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt
from passlib.context import CryptContext
from sqlmodel import Session, select
from database import engine
from models import User, UserRole, Role, UserRegister, UserLogin

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 sata

router = APIRouter(prefix="/auth", tags=["Auth"])
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def get_session():
    with Session(engine) as session:
        yield session

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/register")
def register(user_data: UserRegister, session: Session = Depends(get_session)):

    print(user_data)

    statement = select(User).where(User.email == user_data.email)
    existing_user = session.exec(statement).first()
    if existing_user:
        raise HTTPException(
            status_code=400, 
            detail="Korisnik s ovim emailom već postoji"
        )

    try:
        new_user = User(
            email=user_data.email,
            password_hash=hash_password(user_data.password),
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            is_active=True,
            expertise_level="novice",
            xp_points=0
        )
        session.add(new_user)
        session.flush() # generira se ID bez commit-a

        role = session.exec(select(Role).where(Role.name == "examinee")).first()

        if role:
            new_user_role = UserRole(user_id=new_user.id, role_id=role.id)
            session.add(new_user_role)

        session.commit()
        return {"status": "success", "message": "Registracija uspješna"}

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri registraciji: {str(e)}")


@router.post("/login")
def login(user_data: UserLogin, session: Session = Depends(get_session)):
    statement = select(User).where(User.email == user_data.email)
    user = session.exec(statement).first()

    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Pogrešan email ili lozinka",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Korisnički račun je deaktiviran")

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "expertise_level": user.expertise_level,
            "xp_points": user.xp_points
        }
    }