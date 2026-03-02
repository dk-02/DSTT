from fastapi import FastAPI
from contextlib import asynccontextmanager
from sqlmodel import SQLModel, Session
from database import engine
from models import TextItem
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware


# Lifespan handler (zamjena za on_event)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup dio
    SQLModel.metadata.create_all(engine)
    yield
    # Shutdown dio (trenutno nam ne treba ništa)


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Schema za input
class TextInput(BaseModel):
    text: str


@app.post("/process")
def process_text(data: TextInput):
    processed = data.text + "-01"

    item = TextItem(
        original_text=data.text,
        processed_text=processed
    )

    with Session(engine) as session:
        session.add(item)
        session.commit()
        session.refresh(item)

    return item