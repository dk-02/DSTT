from datetime import datetime, timezone
import uuid
from typing import List, Literal, Optional, Dict, Any
from pydantic import BaseModel, field_validator
from sqlmodel import JSON, SQLModel, Field, Relationship
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import Column as SAColumn, UniqueConstraint


# --------- MEDIA ------------

class CaseMediaFile(SQLModel, table=True):
    __tablename__ = "case_media_files"

    case_id: uuid.UUID = Field(foreign_key="cases.id", primary_key=True)
    media_id: uuid.UUID = Field(foreign_key="media.id", primary_key=True)

class DUMediaFile(SQLModel, table=True):
    __tablename__ = "du_media_files"

    du_id: uuid.UUID = Field(foreign_key="diagnostic_units.id", primary_key=True)
    media_id: uuid.UUID = Field(foreign_key="media.id", primary_key=True)
    

class Media(SQLModel, table=True):
    __tablename__ = "media"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str = Field(max_length=50)
    file_path: str
    file_type: str = Field(max_length=20)
    metadata_data: Dict[str, Any] = Field(default={}, sa_column=SAColumn("metadata", JSONB))

    cases: List["Case"] = Relationship(back_populates="media", link_model=CaseMediaFile)
    diagnostic_units: List["DiagnosticUnit"] = Relationship(back_populates="media", link_model=DUMediaFile)


class MediaRead(BaseModel):
    file_path: str
    file_type: str
    title: Optional[str] = None

class CaseReadWithMedia(BaseModel):
    id: uuid.UUID
    title: str
    initial_info: str
    media: List[MediaRead]


# --------------- CASES ---------------

class Case(SQLModel, table=True):
    __tablename__ = "cases"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    original_case_id: Optional[uuid.UUID] = Field(default=None, foreign_key="cases.id")
    version: int = Field(default=1)
    status: str = Field(default="published") # ili draft ili archived
    title: str = Field(max_length=150)
    level: str = Field(max_length=50)
    type: str = Field(max_length=50)
    is_public: bool = Field(default=False)
    initial_info: str
    correct_diagnosis: str = Field(max_length=150)
    if_incorrect: str = Field(max_length=50)
    default_settings: Dict[str, Any] = Field(default={}, sa_column=SAColumn(JSONB))     
    created_by: uuid.UUID = Field(default=None, foreign_key="users.id")    

    media: List["Media"] = Relationship(back_populates="cases", link_model=CaseMediaFile)
    hints: List["Hint"] = Relationship(back_populates="case", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
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

    __table_args__ = (
        UniqueConstraint("case_id", "label", name="unique_label_per_case"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    label: str = Field(max_length=150)
    name: str = Field(max_length=150)
    type: str = Field(max_length=20)
    level: int
    result_text: str
    provides: List[str] = Field(default=[], sa_column=SAColumn(JSONB))
    resources: Dict[str, Any] = Field(default={}, sa_column=SAColumn(JSONB))
    consequences: List[Dict[str, Any]] = Field(default=[], sa_column=SAColumn(JSONB))
    case_id: uuid.UUID = Field(foreign_key="cases.id") 

    media: Optional[List["Media"]] = Relationship(back_populates="diagnostic_units", link_model=DUMediaFile)
    case: Case = Relationship(back_populates="diagnostic_units")
    required_units: List["DiagnosticUnit"] = Relationship(
        link_model=UnitDependency,
        sa_relationship_kwargs={
            "primaryjoin": "DiagnosticUnit.id==UnitDependency.unit_id",
            "secondaryjoin": "DiagnosticUnit.id==UnitDependency.required_unit_id",
        }
    )


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

class HintReadCreate(BaseModel):
    sequence_no: int
    cost: float
    text: str

class CaseCreate(BaseModel):
    title: str
    level: str
    type: str
    status: Literal["draft", "published", "archived"] = "published"
    is_public: bool
    initial_info: str
    correct_diagnosis: str
    if_incorrect: str
    category_id: str
    hints: List[HintReadCreate] = []
    diagnostic_units: List[DUCreate] = []
    media_ids: List[str] = []

class CaseEditRequest(CaseCreate):
    change_log: Optional[str] = None
    status: Literal["draft", "published", "archived"] = "published"


# --------------- CASE SOLVING ---------------

class ChatRequest(SQLModel):
    message: str

class DiagnosisRequest(SQLModel):
    student_diagnosis: str


class SolveAttempt(SQLModel, table=True):
    __tablename__ = "solve_attempts"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    settings: Dict[str, Any] = Field(default={}, sa_column=SAColumn(JSONB))
    status: str = Field(default="in_progress") # completed, terminated ili cancelled
    is_practice: bool = Field(default=True)
    student_diagnosis: Optional[str] = None
    total_cost_money: float = Field(default=0.0)
    total_cost_time: int = Field(default=0)
    started_at: datetime = Field(default_factory=datetime.now)
    finished_at: Optional[datetime] = None
    score: float = Field(default=100.0)
    
    case_id: uuid.UUID = Field(foreign_key="cases.id")
    user_id: uuid.UUID = Field(foreign_key="users.id")
    assignment_id: Optional[uuid.UUID] = Field(default=None, foreign_key="assignments.id", nullable=True)


class AttemptLog(SQLModel, table=True):
    __tablename__ = "attempt_logs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    status: str = Field(default="no_mistake") # no_mistake, consequence_mistake, fatal_mistake
    event_type: str # du_request, undo_request, hint_request
    event_result_data: Dict = Field(default={}, sa_type=JSON)
    consequence: Dict = Field(default={}, sa_type=JSON)
    event_timestamp: datetime = Field(default_factory=datetime.now)
    
    attempt_id: uuid.UUID = Field(foreign_key="solve_attempts.id")
    diagnostic_unit_id: Optional[uuid.UUID] = Field(default=None, foreign_key="diagnostic_units.id")


class DiagnosisSubmission(SQLModel, table=True):
    __tablename__ = "diagnosis_submissions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    diagnosis_text: str
    verdict: str # correct, partial, incorrect
    feedback_given: Optional[str] = None
    submitted_at: datetime = Field(default_factory=datetime.now)
    
    attempt_id: uuid.UUID = Field(foreign_key="solve_attempts.id")


# --------- INSTITUTIONS --------------

class Institution(SQLModel, table=True):
    __tablename__ = "institutions"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(max_length=150)
    name_short: Optional[str] = Field(default=None, max_length=50)
    domain: Optional[str] = Field(default=None, max_length=50, unique=True)
    logo_url: Optional[str] = None
    idp_metadata_url: Optional[str] = None
    is_active: bool = Field(default=True)
    registered_at: datetime = Field(default_factory=datetime.now)

    users: List["User"] = Relationship(back_populates="institution")
    groups: List["Group"] = Relationship(back_populates="institution")


class InstitutionCreate(BaseModel):
    name: str
    name_short: Optional[str] = None
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    idp_metadata_url: Optional[str] = None

class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    name_short: Optional[str] = None
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    idp_metadata_url: Optional[str] = None


# ------------ GROUPS --------------

class GroupMember(SQLModel, table=True):
    __tablename__ = "group_members"
    
    student_id: uuid.UUID = Field(foreign_key="users.id", primary_key=True)
    group_id: uuid.UUID = Field(foreign_key="groups.id", primary_key=True)
    joined_at: datetime = Field(default_factory=datetime.now)


class GroupAssignmentLink(BaseModel):
    group_id: uuid.UUID
    available_until: Optional[datetime] = None

    @field_validator("available_until")
    @classmethod
    def prevent_past_date(cls, v: Optional[datetime]):
        if v:
            now = datetime.now(timezone.utc)
            
            if v.tzinfo is None:
                v = v.replace(tzinfo=timezone.utc)
                
            if v < now:
                raise ValueError("Rok (available_until) ne može biti u prošlosti.")
        return v

class GroupAssignment(SQLModel, table=True):
    __tablename__ = "group_assignments"

    group_id: uuid.UUID = Field(foreign_key="groups.id", primary_key=True)
    assignment_id: uuid.UUID = Field(foreign_key="assignments.id", primary_key=True)
    
    assigned_at: datetime = Field(default_factory=datetime.now)
    available_until: Optional[datetime] = None


class Group(SQLModel, table=True):
    __tablename__ = "groups"

    __table_args__ = (
        UniqueConstraint("name", "teacher_id", "academic_year", name="uq_group_name_teacher_year"),
    )
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(max_length=100)
    academic_year: str = Field(max_length=20)
    teacher_id: uuid.UUID = Field(foreign_key="users.id")
    institution_id: uuid.UUID = Field(foreign_key="institutions.id")

    institution: Institution = Relationship(back_populates="groups")
    assignments: List["Assignment"] = Relationship(back_populates="group", link_model=GroupAssignment)

    teacher: "User" = Relationship(back_populates="managed_groups")
    students: List["User"] = Relationship(back_populates="groups", link_model=GroupMember)


class GroupResponse(BaseModel):
    id: uuid.UUID
    name: str
    academic_year: str
    teacher_name: str
    institution_name: Optional[str] = "Nepoznata ustanova"
    student_count: int = 0

class GroupCreate(BaseModel):
    name: str
    teacher_id: Optional[uuid.UUID] = None
    academic_year: Optional[str] = None

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    teacher_id: Optional[uuid.UUID] = None
    academic_year: Optional[str] = None

class AddStudentToGroup(BaseModel):
    student_ids: List[uuid.UUID]

class RemoveStudentFromGroup(BaseModel):
    student_ids: List[uuid.UUID]


class StudentBasicInfo(BaseModel):
    id: uuid.UUID
    first_name: Optional[str]
    last_name: Optional[str]
    email: str
    expertise_level: Optional[str]
    xp_points: Optional[int]

# Za admina
class StudentAdminInfo(StudentBasicInfo):
    is_active: bool
    institution_id: Optional[uuid.UUID]


# --------------- USERS ---------------

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool = Field(default=True)
    expertise_level: Optional[str] = Field(default=None)
    xp_points: Optional[int] = Field(default=None)

    institution_id: Optional[uuid.UUID] = Field(default=None, foreign_key="institutions.id")

    institution: Optional["Institution"] = Relationship(back_populates="users")
    
    managed_groups: List["Group"] = Relationship(back_populates="teacher")
    groups: List["Group"] = Relationship(back_populates="students", link_model=GroupMember)

    # aai_edu_uid: str - DODATI KAD SE OSPOSOBI AAI_EDU


class Role(SQLModel, table=True):
    __tablename__ = "roles"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)


class UserRole(SQLModel, table=True):
    __tablename__ = "user_roles"

    user_id: uuid.UUID = Field(foreign_key="users.id", primary_key=True)
    role_id: int = Field(foreign_key="roles.id", primary_key=True)


class AdminUserRegister(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    roles: List[str]
    institution_id: Optional[uuid.UUID] = None

class UserRegister(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str

class UserEdit(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    roles: Optional[List[str]] = None
    institution_id: Optional[uuid.UUID] = None

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class PasswordChangeAdmin(BaseModel):
    user_id: uuid.UUID
    new_password: str


# ------------ ASSIGNMENTS --------------

class RandomCasePickerSettings(BaseModel):
    no_of_cases: int = 1
    topic: Optional[str] = None
    case_level: Optional[str] = None

class AssignmentSettings(BaseModel):
    enable_hints: bool = True
    ignore_hint_cost: bool = True
    enable_undo: bool = True
    enable_LLM_mentor: bool = True
    ignore_terminating_consequences: bool = False
    randomly_choose_cases: bool = False
    random_case_picker_settings: Optional[RandomCasePickerSettings] = None
    show_result_immediately: bool = True
    case_sequence_lock: bool = False


class AssignmentCase(SQLModel, table=True):
    __tablename__ = "assignment_cases"
    
    assignment_id: uuid.UUID = Field(foreign_key="assignments.id", primary_key=True)
    case_id: uuid.UUID = Field(foreign_key="cases.id", primary_key=True)
    sequence_no: int = Field(default=1)


class Assignment(SQLModel, table=True):
    __tablename__ = "assignments"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str = Field(max_length=100)
    instructions: Optional[str] = None
    type: str = Field(max_length=20) # 'practice', 'practice-exam', 'exam'
    status: str = Field(max_length=20, default="active") # active ili archived
    
    settings: AssignmentSettings = Field(default={}, sa_column=SAColumn(JSONB))
    
    teacher_id: uuid.UUID = Field(foreign_key="users.id")

    group: List["Group"] = Relationship(back_populates="assignments", link_model=GroupAssignment)
    cases: List["Case"] = Relationship(link_model=AssignmentCase)


class CaseWithSequence(BaseModel):
    case_id: uuid.UUID
    sequence_no: int

class AssignmentCreate(BaseModel):
    title: str
    instructions: Optional[str] = None
    type: str
    settings: Optional[AssignmentSettings] = None
    selected_case_ids: Optional[List[CaseWithSequence]] = None

class AssignmentCasePreview(BaseModel):
    id: uuid.UUID
    version: Optional[int] = None
    title: str
    level: str
    topic_name: Optional[str] = None
    attempt_status: Optional[str] = None
    correct_diagnosis: Optional[str] = None

class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    instructions: Optional[str] = None
    settings: Optional[AssignmentSettings] = None
    case_sequence: Optional[List[uuid.UUID]] = None

class AddCasesToAssignment(BaseModel):
    case_ids: List[uuid.UUID]

class RemoveCasesFromAssignment(BaseModel):
    case_ids: List[uuid.UUID]

class AssignToGroupsData(BaseModel):
    groups: List[GroupAssignmentLink]

class UnassignFromGroupsData(BaseModel):
    group_ids: List[uuid.UUID]


# ----------- UPDATES & NOTIFICATIONS -------------

class CaseUpdate(SQLModel, table=True):
    __tablename__ = "case_updates"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    change_log: str
    new_version: int
    created_at: datetime = Field(default_factory=datetime.now)
    
    previous_case_id: uuid.UUID = Field(foreign_key="cases.id")
    new_case_id: uuid.UUID = Field(foreign_key="cases.id")


class UpdateNotification(SQLModel, table=True):
    __tablename__ = "update_notifications"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    update_id: uuid.UUID = Field(foreign_key="case_updates.id")
    user_id: uuid.UUID = Field(foreign_key="users.id")
    status: str = Field(default="decision_pending") # 'decision_pending', 'accepted', 'declined'
    decision_at: Optional[datetime] = None