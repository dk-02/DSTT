import os
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Dict, Any
from pydantic import BaseModel
import uuid
from database import engine
from models import Case, CaseCategory, CaseReadWithMedia, Hint, DiagnosticUnit, Media, UnitDependency

router = APIRouter(prefix="/cases", tags=["Cases"])

def get_session():
    with Session(engine) as session:
        yield session

# --- PYDANTIC SCHEMES FOR FRONTEND JSON ---
class HintReadCreate(BaseModel):
    sequence_no: int
    cost: float
    text: str

class DUCreate(BaseModel):
    id: str
    label: str
    name: str
    type: str
    level: int
    result_text: str
    provides: List[str] = []
    resources: Dict[str, Any] = {}
    required_units: List[str] = []
    consequences: List[Dict[str, Any]] = []
    media_ids: List[str] = []

class CaseCreate(BaseModel):
    title: str
    level: str
    type: str
    is_public: bool
    initial_info: str
    correct_diagnosis: str
    if_incorrect: str
    category: str
    hints: List[HintReadCreate] = []
    diagnostic_units: List[DUCreate] = []
    media_ids: List[str] = []


@router.post("/")
def create_case(case_data: CaseCreate, session: Session = Depends(get_session)):
    try:
        new_case_id = uuid.uuid4()
        
        db_case = Case(
            id=new_case_id,
            title=case_data.title,
            level=case_data.level,
            type=case_data.type,
            is_public=case_data.is_public,
            initial_info=case_data.initial_info,
            correct_diagnosis=case_data.correct_diagnosis,
            if_incorrect=case_data.if_incorrect
        )
        session.add(db_case)

        if case_data.category:
            db_case_cat = CaseCategory(
                case_id=new_case_id,
                category_id=uuid.UUID(case_data.category)
            )
            session.add(db_case_cat)

        session.flush()

        for m_id in case_data.media_ids:
            media_item = session.get(Media, m_id)
            if media_item:
                media_item.case_id = new_case_id
                session.add(media_item)

        for hint in case_data.hints:
            db_hint = Hint(
                id=uuid.uuid4(),
                case_id=new_case_id,
                sequence_no=hint.sequence_no,
                cost=hint.cost,
                text=hint.text
            )
            session.add(db_hint)

        for du in case_data.diagnostic_units:            
            db_du = DiagnosticUnit(
                id=du.id,
                case_id=new_case_id,
                label=du.label,
                name=du.name,
                type=du.type,
                level=int(du.level),
                result_text=du.result_text,
                provides=du.provides,
                resources=du.resources,
                consequences=du.consequences
            )
            session.add(db_du)
        
        session.flush()

        for du in case_data.diagnostic_units:
            for req_id in du.required_units:
                db_dep = UnitDependency(
                    unit_id=du.id,
                    required_unit_id=req_id
                )
                session.add(db_dep)

            for m_id in du.media_ids:
                media_item = session.get(Media, m_id)
                if media_item:
                    media_item.du_id = du.id
                    media_item.case_id = new_case_id
                    session.add(media_item)

        session.commit()
        
        return {"status": "success", "case_id": str(new_case_id)}

    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    

@router.get("/", response_model=List[Case])
def get_all_cases(session: Session = Depends(get_session)):
    statement = select(Case)
    cases = session.exec(statement).all()

    case_list = [{"id": c.id, "title": c.title, "version": c.version} for c in cases]

    return case_list


@router.get("/{case_id}", response_model=CaseReadWithMedia)
def get_case_details(case_id: str, session: Session = Depends(get_session)):
    case = session.get(Case, case_id)

    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    statement = select(Media).where(Media.case_id == case_id)
    media_files = session.exec(statement).all()

    media_list = [{"file_path": m.file_path.replace("\\", "/"), "file_type": m.file_type, "title": m.title} for m in media_files]

    case_details = {"id": case.id, "title": case.title, "initial_info": case.initial_info, "media": media_list}
    
    return case_details


@router.delete("/{case_id}")
def delete_case(case_id: uuid.UUID, session: Session = Depends(get_session)):
    db_case = session.get(Case, case_id)
    if not db_case:
        raise HTTPException(status_code=404, detail="Slučaj nije pronađen")
    
    try:
        statement = select(Media).where(Media.case_id == case_id)
        media_records = session.exec(statement).all()

        for media in media_records:
            if media.file_path:
                file_full_path = os.path.normpath(media.file_path) 
                
                try:
                    os.remove(file_full_path)
                    print(f"Uspješno obrisana datoteka: {file_full_path}")
                except Exception as e:
                    print(f"Greška pri fizičkom brisanju datoteke: {e}")
            else:
                print(f"Datoteka nije pronađena na putanji: {file_full_path}")

        session.delete(db_case)
        
        session.commit()
        return {"status": "success", "message": f"Slučaj {case_id} je uspješno obrisan"}
        
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Greška pri brisanju: {str(e)}")
    

@router.get("/{case_id}/hint", response_model=HintReadCreate)
def get_hint(case_id: str, sequence_no: int, session: Session = Depends(get_session)):
    case = session.get(Case, case_id)

    if not case:
        raise HTTPException(status_code=404, detail="Slučaj nije pronađen")
    
    statement = select(Hint).where(Hint.case_id == case_id, Hint.sequence_no == sequence_no + 1)
    hint = session.exec(statement).first()

    if not hint:
        raise HTTPException(status_code=404, detail="Nema više dostupnih hintova")
    
    return hint