from typing import List, Optional
from sqlmodel import SQLModel, Field, Relationship

class Case(SQLModel, table=True):
    __tablename__ = "cases"
    id: str = Field(primary_key=True)
    title: str
    initial_info: str
    correct_diagnosis: str
    
    ddus: List["DDUDefinition"] = Relationship(back_populates="case")


class DDUDefinition(SQLModel, table=True):
    __tablename__ = "ddus"
    id: str = Field(primary_key=True)
    name: str
    result_text: str
    level: str = "L1"
    case_id: Optional[str] = Field(default=None, foreign_key="cases.id")
    
    case: Optional[Case] = Relationship(back_populates="ddus")


class ChatRequest(SQLModel):
    case_id: str
    message: str

class DiagnosisRequest(SQLModel):
    case_id: str
    student_diagnosis: str