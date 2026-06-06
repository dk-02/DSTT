from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import engine
from models import CategoryRead, Category

router = APIRouter(prefix="/categories", tags=["Categories"])

def get_session():
    with Session(engine) as session:
        yield session

@router.get("/", response_model=List[CategoryRead])
def get_categories(session: Session = Depends(get_session)):
    categories = session.exec(select(Category)).all()
    return categories

@router.get("/{category_id}", response_model=CategoryRead)
def get_categories(category_id: uuid.UUID, session: Session = Depends(get_session)):
    category = session.get(Category, category_id)
    
    return category

@router.post("/", response_model=CategoryRead)
def create_category(category: Category, session: Session = Depends(get_session)):
    existing_category = session.exec(
        select(Category).where(Category.name == category.name)
    ).first()
    
    if existing_category:
        raise HTTPException(
            status_code=400, 
            detail=f"Kategorija s imenom '{category.name}' već postoji."
        )

    if category.parent_id:
        parent = session.get(Category, category.parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Roditeljska kategorija nije pronađena.")
            
    session.add(category)
    session.commit()
    session.refresh(category)
    
    return category