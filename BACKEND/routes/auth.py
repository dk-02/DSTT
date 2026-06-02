import os
from datetime import datetime, timedelta, timezone
from typing import Dict
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt
from passlib.context import CryptContext
from sqlmodel import Session, select
from database import engine
from models import AdminUserRegister, Institution, PasswordChange, PasswordChangeAdmin, User, UserRole, Role, UserRegister
from slowapi import Limiter
from slowapi.util import get_remote_address
import resend

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 sata

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/auth", tags=["Auth"])
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_session():
    with Session(engine) as session:
        yield session


async def get_current_user(
    token: str = Depends(oauth2_scheme), 
    session: Session = Depends(get_session)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Nije moguće potvrditi identitet",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
        
    user = session.get(User, uuid.UUID(user_id))
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Korisnički račun nije aktivan")
    return current_user


async def get_current_admin(current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    admin_role = session.exec(
        select(UserRole).join(Role).where(UserRole.user_id == current_user.id, Role.name == "admin")
    ).first()
    
    if not admin_role:
        raise HTTPException(status_code=403, detail="Pristup dopušten samo administratorima.")
    return current_user


async def get_current_teacher(current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    teacher_role = session.exec(
        select(UserRole).join(Role).where(UserRole.user_id == current_user.id, Role.name == "teacher")
    ).first()
    
    if not teacher_role:
        raise HTTPException(status_code=403, detail="Pristup dopušten samo nastavnicima.")
    return current_user


def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_reset_token(data: dict, expires_delta: int):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_delta)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/register")
def register(user_data: UserRegister, session: Session = Depends(get_session)):
    statement = select(User).where(User.email == user_data.email)
    existing_user = session.exec(statement).first()
    if existing_user:
        raise HTTPException(
            status_code=400, 
            detail="Korisnik s ovim emailom već postoji"
        )
    
    domain = user_data.email.split("@")[-1].lower()

    inst_stmt = select(Institution).where(Institution.domain == domain)
    inst = session.exec(inst_stmt).first()

    try:
        new_user = User(
            email=user_data.email,
            password_hash=hash_password(user_data.password),
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            is_active=True,
            expertise_level="novice",
            xp_points=0,
            institution_id=inst.id if inst else None
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


@router.post("/admin-register")
def admin_register(user_data: AdminUserRegister, current_admin: User = Depends(get_current_admin), session: Session = Depends(get_session)):
    statement = select(User).where(User.email == user_data.email)
    existing_user = session.exec(statement).first()
    if existing_user:
        raise HTTPException(
            status_code=400, 
            detail="Korisnik s ovim emailom već postoji"
        )

    try:
        is_examinee = "examinee" in user_data.roles

        new_user = User(
            email=user_data.email,
            password_hash=hash_password(user_data.password),
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            is_active=True,
            expertise_level="novice" if is_examinee else None,
            xp_points=0 if is_examinee else None,
            institution_id=user_data.institution_id
        )
        session.add(new_user)
        session.flush()

        for role_name in user_data.roles:
            role = session.exec(select(Role).where(Role.name == role_name)).first()
            if role:
                new_user_role = UserRole(user_id=new_user.id, role_id=role.id)
                session.add(new_user_role)

        session.commit()
        return {"status": "success", "message": "Korisnik uspješno kreiran s ulogama"}

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri kreiranju korisnika: {str(e)}")


@router.post("/login")
def login(request: Request, user_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    statement = select(User).where(User.email == user_data.username) #OAuth zbog Swagger testiranja; username = email
    user = session.exec(statement).first()

    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Pogrešan email ili lozinka",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Korisnički račun je deaktiviran")
    
    user_roles = session.exec(select(Role.name).join(UserRole).where(UserRole.user_id == user.id)).all()

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email, "roles": user_roles})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            # "expertise_level": user.expertise_level,
            # "xp_points": user.xp_points
        }
    }


@router.post("/deactivate")
async def deactivate_user(user_id: uuid.UUID = None, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    if user_id and user_id != current_user.id:
        await get_current_admin(current_user, session)

        target_user = session.get(User, user_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="Korisnik nije pronađen.")
        
    else:
        target_user = current_user

    target_user.is_active = False
    session.add(current_user)
    session.commit()

    return {"message": "Profil je uspješno deaktiviran."}

@router.post("/reactivate/{user_id}")
def reactivate_user(user_id: uuid.UUID, current_admin: User = Depends(get_current_admin), session: Session = Depends(get_session)):
    target_user = session.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Korisnik nije pronađen.")
    
    target_user.is_active = True
    session.add(target_user)
    session.commit()

    return {"message": f"Korisnik {target_user.email} je ponovno aktiviran."}


@router.post("/change-password")
def change_password(data: PasswordChange, current_user: User = Depends(get_current_active_user), session: Session = Depends(get_session)):
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=400, 
            detail="Trenutna lozinka nije ispravna."
        )

    current_user.password_hash = hash_password(data.new_password)
    session.add(current_user)
    session.commit()

    return {"message": "Lozinka uspješno promijenjena."}


@router.post("/change-password-admin")
def change_password_admin(data: PasswordChangeAdmin, current_user: User = Depends(get_current_admin), session: Session = Depends(get_session)):
    user = session.get(User, data.user_id)

    if not user:
        raise HTTPException(status_code=404, detail="Korisnik nije pronađen.")

    user.password_hash = hash_password(data.new_password)
    session.add(user)
    session.commit()

    return {"message": f"Lozinka korisnika {user.email} uspješno promijenjena."}


@router.post("/forgot-password")
async def forgot_password(email_data: Dict[str, str], session: Session = Depends(get_session)):
    email = email_data.get("email")
    user = session.exec(select(User).where(User.email == email)).first()
    
    if not user:
        return {"message": "Ako račun postoji, upute su poslane na mail."}

    reset_token = create_reset_token(
        data={"sub": str(user.id), "type": "password_reset"}, 
        expires_delta=15
    )

    reset_link = f"http://localhost:5173/reset-password?token={reset_token}"

    try:
        resend.api_key = os.getenv("RESEND_API_KEY")
        resend.Emails.send({
            "from": "onboarding@resend.dev",
            "to": [user.email],
            "subject": "Resetiranje lozinke - DSTT",
            "html": f"<p>Kliknite na link za promjenu lozinke: <a href='{reset_link}'>Resetiraj lozinku</a></p>"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Greška pri slanju maila {e}")

    return {"message": "Upute su poslane na mail."}


@router.post("/reset-password-confirm")
def reset_password_confirm(data: Dict[str, str], session: Session = Depends(get_session)):
    token = data.get("token")
    new_password = data.get("new_password")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "password_reset":
            raise HTTPException(status_code=400, detail="Neispravan tip tokena")
        
        user_id = payload.get("sub")
        user = session.get(User, uuid.UUID(user_id))
        
        if not user:
            raise HTTPException(status_code=404, detail="Korisnik nije pronađen")

        user.password_hash = hash_password(new_password)
        session.add(user)
        session.commit()
        
        return {"message": "Lozinka uspješno promijenjena."}
    except Exception:
        raise HTTPException(status_code=400, detail="Link je istekao ili je nevaljan.")