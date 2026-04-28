from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from models import Institution, InstitutionCreate, InstitutionUpdate, User
from routes.auth import get_current_admin
from database import engine

router = APIRouter(prefix="/institutions", tags=["Institutions"])

def get_session():
    with Session(engine) as session:
        yield session


@router.get("/", response_model=List[Institution])
def get_all_institutions(
    current_admin: User = Depends(get_current_admin),
    session: Session = Depends(get_session), 
):
    statement = select(Institution).order_by(Institution.name)
    results = session.exec(statement).all()
    
    return results


@router.post("/register", status_code=status.HTTP_201_CREATED)
def create_institution(data: InstitutionCreate, current_admin: User = Depends(get_current_admin), session: Session = Depends(get_session)):
    try:
        new_inst = Institution(
            name=data.name,
            name_short=data.name_short,
            domain=data.domain,
            logo_url=data.logo_url,
            idp_metadata_url=data.idp_metadata_url,
            is_active=True
        )
        session.add(new_inst)
        session.commit()
        session.refresh(new_inst)
        
        return {"message": "Institucija uspješno kreirana", "institution": new_inst}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri kreiranju institucije: {str(e)}")


@router.patch("/{institution_id}")
def update_institution(institution_id: uuid.UUID, data: InstitutionUpdate, current_admin: User = Depends(get_current_admin), session: Session = Depends(get_session)):
    target_inst = session.get(Institution, institution_id)
    if not target_inst:
        raise HTTPException(status_code=404, detail="Institucija nije pronađena.")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(target_inst, key, value)

    session.add(target_inst)
    session.commit()
    session.refresh(target_inst)

    return {"message": "Podaci institucije su uspješno ažurirani.", "institution": target_inst}


# --- 3. DEAKTIVACIJA INSTITUCIJE ---
@router.post("/{institution_id}/deactivate")
def deactivate_institution(
    institution_id: uuid.UUID,
    current_admin: User = Depends(get_current_admin),
    session: Session = Depends(get_session)
):
    target_inst = session.get(Institution, institution_id)
    if not target_inst:
        raise HTTPException(status_code=404, detail="Institucija nije pronađena.")
    
    if not target_inst.is_active:
        raise HTTPException(status_code=400, detail="Institucija je već deaktivirana.")

    target_inst.is_active = False
    session.add(target_inst)
    session.commit()

    return {"message": f"Institucija '{target_inst.name}' je uspješno deaktivirana."}


# --- 4. REAKTIVACIJA INSTITUCIJE ---
@router.post("/{institution_id}/reactivate")
def reactivate_institution(
    institution_id: uuid.UUID,
    current_admin: User = Depends(get_current_admin),
    session: Session = Depends(get_session)
):
    target_inst = session.get(Institution, institution_id)
    if not target_inst:
        raise HTTPException(status_code=404, detail="Institucija nije pronađena.")
    
    if target_inst.is_active:
        raise HTTPException(status_code=400, detail="Institucija je već aktivna.")

    target_inst.is_active = True
    session.add(target_inst)
    session.commit()

    return {"message": f"Institucija '{target_inst.name}' je ponovno aktivirana."}


# --- 5. BRISANJE INSTITUCIJE ---
@router.delete("/{institution_id}")
def delete_institution(
    institution_id: uuid.UUID,
    current_admin: User = Depends(get_current_admin),
    session: Session = Depends(get_session)
):
    target_inst = session.get(Institution, institution_id)
    if not target_inst:
        raise HTTPException(status_code=404, detail="Institucija nije pronađena.")

    try:
        session.delete(target_inst)
        session.commit()
        return {"message": f"Institucija '{target_inst.name}' je trajno obrisana."}
    except Exception as e:
        session.rollback()
        # Hvatanje greške npr. ako institucija ima vezane korisnike, a kaskadno brisanje nije riješeno
        raise HTTPException(status_code=500, detail=f"Greška pri brisanju institucije: {str(e)}")