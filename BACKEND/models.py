from sqlmodel import SQLModel, Field

class TextItem(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    original_text: str
    processed_text: str