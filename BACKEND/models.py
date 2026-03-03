from sqlmodel import SQLModel, Field

class DDUDefinition(SQLModel, table=True):
    __tablename__ = "ddus"
    id: str = Field(primary_key=True)
    name: str
    result_text: str
    level: str = "L1"

class ChatRequest(SQLModel):
    message: str