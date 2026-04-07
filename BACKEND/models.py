import uuid
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import Column as SAColumn


# --------------- CASES ---------------

class Case(SQLModel, table=True):
    __tablename__ = "cases"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    original_case_id: Optional[uuid.UUID] = Field(default=None, foreign_key="cases.id")
    version: int = Field(default=1)
    title: str = Field(max_length=150)
    level: str = Field(max_length=50)
    type: str = Field(max_length=50)
    is_public: bool = Field(default=False)
    initial_info: str
    correct_diagnosis: str = Field(max_length=150)
    if_incorrect: str = Field(max_length=50)
    default_settings: Dict[str, Any] = Field(default={}, sa_column=SAColumn(JSONB))    

    hints: List["Hint"] = Relationship(back_populates="case", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    media: List["Media"] = Relationship(back_populates="case", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    diagnostic_units: List["DiagnosticUnit"] = Relationship(back_populates="case", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class Category(SQLModel, table=True):
    __tablename__= "categories"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(index=True)
    
    parent_id: Optional[uuid.UUID] = Field(default=None, foreign_key="categories.id")
    
    parent: Optional["Category"] = Relationship(
        back_populates="children", 
        sa_relationship_kwargs={"remote_side": "Category.id"}
    )
    children: List["Category"] = Relationship(back_populates="parent")

class CategoryRead(SQLModel):
    id: uuid.UUID
    name: str
    parent_id: Optional[uuid.UUID]

class CaseCategory(SQLModel, table=True):
    __tablename__ = "case_categories"

    case_id: uuid.UUID = Field(foreign_key="cases.id", primary_key=True, ondelete="CASCADE")
    category_id: uuid.UUID = Field(foreign_key="categories.id", primary_key=True, ondelete="CASCADE")


class Hint(SQLModel, table=True):
    __tablename__ = "hints"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    sequence_no: int
    cost: float = Field(default=0.0)
    text: str    
    case_id: uuid.UUID = Field(foreign_key="cases.id")

    case: Optional[Case] = Relationship(back_populates="hints") 


class UnitDependency(SQLModel, table=True):
    __tablename__ = "unit_dependencies"
    unit_id: uuid.UUID = Field(foreign_key="diagnostic_units.id", primary_key=True)
    required_unit_id: uuid.UUID = Field(foreign_key="diagnostic_units.id", primary_key=True)


class DiagnosticUnit(SQLModel, table=True):
    __tablename__ = "diagnostic_units"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    label: str = Field(unique=True, max_length=150)
    name: str = Field(max_length=150)
    type: str = Field(max_length=20)
    level: int
    result_text: str
    provides: List[str] = Field(default=[], sa_column=SAColumn(JSONB))
    resources: Dict[str, Any] = Field(default={}, sa_column=SAColumn(JSONB))
    consequences: List[Dict[str, Any]] = Field(default=[], sa_column=SAColumn(JSONB))
    case_id: uuid.UUID = Field(foreign_key="cases.id") 

    media: List["Media"] = Relationship(back_populates="diagnostic_unit")
    case: Optional[Case] = Relationship(back_populates="diagnostic_units")
    required_units: List["DiagnosticUnit"] = Relationship(
        link_model=UnitDependency,
        sa_relationship_kwargs={
            "primaryjoin": "DiagnosticUnit.id==UnitDependency.unit_id",
            "secondaryjoin": "DiagnosticUnit.id==UnitDependency.required_unit_id",
        }
    )
    

class Media(SQLModel, table=True):
    __tablename__ = "media"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str = Field(max_length=50)
    file_path: str
    file_type: str = Field(max_length=20)
    metadata_data: Dict[str, Any] = Field(default={}, sa_column=SAColumn("metadata", JSONB))    
    case_id: Optional[uuid.UUID] = Field(default=None, foreign_key="cases.id")
    du_id: Optional[uuid.UUID] = Field(default=None, foreign_key="diagnostic_units.id")

    case: Optional["Case"] = Relationship(back_populates="media")
    diagnostic_unit: Optional["DiagnosticUnit"] = Relationship(back_populates="media")


# --------------- CASE SOLVING ---------------

class ChatRequest(SQLModel):
    case_id: str
    message: str

class DiagnosisRequest(SQLModel):
    case_id: str
    student_diagnosis: str


# --------------- USERS ---------------

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool = Field(default=True)
    expertise_level: str = Field(default="novice")
    xp_points: int = Field(default=0)

    # aai_edu_uid: str - DODATI
    # institution_id - relationship - DODATI

class Role(SQLModel, table=True):
    __tablename__ = "roles"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)


class UserRole(SQLModel, table=True):
    __tablename__ = "user_roles"

    user_id: uuid.UUID = Field(foreign_key="users.id", primary_key=True)
    role_id: int = Field(foreign_key="roles.id", primary_key=True)


class UserRegister(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str

class UserLogin(BaseModel):
    email: str
    password: str