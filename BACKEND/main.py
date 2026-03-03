import os
import requests
from fastapi import FastAPI, Depends
from contextlib import asynccontextmanager
from sqlmodel import SQLModel, Session, select
from database import engine
from models import DDUDefinition, ChatRequest
from fastapi.middleware.cors import CORSMiddleware
import json

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    SQLModel.metadata.create_all(engine)
    yield
    # Shutdown


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DB session helper function (Dependency Injection)
def get_session():
    with Session(engine) as session:
        yield session

@app.post("/ask")
async def ask_llm(request: ChatRequest, session: Session = Depends(get_session)):
    # Fetch all DDUs
    statement = select(DDUDefinition)
    ddus = session.exec(statement).all()
    
    # Prepare DDU list for LLM
    ddu_list = [{"id": d.id, "name": d.name} for d in ddus]

    print(request.message)
    print(ddu_list)
    
    # HARDCODED FOR NOW - OpenRouter request 
    system_prompt = f"""
    You are the assistant in the auto-diagnostics. The student writes what he wants to check.
    Select the ID of the most appropriate DDU from the list: {ddu_list}
    Answer with the ID only. If nothing matches, answer 'NONE'.
    """

    combined_content = f"INSTRUCTION: {system_prompt}\n\nUSER QUESTION: {request.message}"

    response = requests.post(
        url="https://openrouter.ai/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
        data=json.dumps({
            "model": "google/gemma-3n-e2b-it:free",
            "messages": [
                {"role": "user", "content": combined_content}
            ]
        })
    )
    

    ddu_id = response.json()['choices'][0]['message']['content'].strip()

    print(ddu_id)

    # Fetch requested DDU
    if ddu_id != "NONE":
        selected_ddu = session.get(DDUDefinition, ddu_id)
        
        if selected_ddu:
            return {
                "ddu_id": selected_ddu.id, 
                "result": selected_ddu.result_text,
                "level": selected_ddu.level
            }
    
    return {"ddu_id": None, "result": "Unfortunately, i don't understand your request."}