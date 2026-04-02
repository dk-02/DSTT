from typing import List
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
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

@router.post("/", response_model=CategoryRead)
def create_category(category: Category, session: Session = Depends(get_session)):
    if category.parent_id:
        parent = session.get(Category, category.parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent category not found")
            
    session.add(category)
    session.commit()
    session.refresh(category)
    return category