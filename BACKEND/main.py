import os
from typing import List
import requests
from fastapi import FastAPI, Depends, HTTPException
from contextlib import asynccontextmanager
from sqlmodel import SQLModel, Session, select
from database import engine
from models import Case, DDUDefinition, ChatRequest, DiagnosisRequest
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
    allow_origins=["http://localhost:5173", "https://dstt-front.onrender.com"],
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
    # Fetch all DDUs for current case
    statement = select(DDUDefinition).where(DDUDefinition.case_id == request.case_id)
    ddus = session.exec(statement).all()
    
    # Prepare DDU list for LLM
    ddu_list = [{"id": d.id, "name": d.name} for d in ddus]

    # print(request.message)
    # print(ddu_list)
    
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

    # print(ddu_id)

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


@app.get("/cases", response_model=List[Case])
def get_all_cases(session: Session = Depends(get_session)):
    statement = select(Case)
    cases = session.exec(statement).all()

    case_list = [{"id": c.id, "title": c.title} for c in cases]

    return case_list

@app.get("/cases/{case_id}", response_model=Case)
def get_case_details(case_id: str, session: Session = Depends(get_session)):
    case = session.get(Case, case_id)

    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    case_details = {"id": case.id, "title": case.title, "initial_info": case.initial_info}
    
    return case_details

@app.post("/cases/verifyDiagnosis")
def verify_diagnosis(request: DiagnosisRequest, session: Session = Depends(get_session)):
    case = session.get(Case, request.case_id)

    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    system_prompt = f"""
    You are an expert automotive instructor. 
    Correct diagnosis: {case.correct_diagnosis}
    Student's answer: {request.student_diagnosis}
    
    Compare them. If the student correctly identified the main issues, respond with 'CORRECT'. 
    If they are wrong or missed key parts, respond with 'INCORRECT' and a short explanation why. 
    If they are partially correct, respond with 'PARTIAL' and a short explanation why.
    """

    response = requests.post(
        url="https://openrouter.ai/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
        data=json.dumps({
            "model": "google/gemma-3n-e2b-it:free",
            "messages": [{"role": "user", "content": system_prompt}]
        })
    )

    llm_judgement = response.json()['choices'][0]['message']['content']

    feedback = llm_judgement
    verdict = ""

    if "INCORRECT" in llm_judgement.upper():
        verdict = "INCORRECT"
        feedback = feedback.replace("INCORRECT. ", "").strip()
    elif "CORRECT" in llm_judgement.upper():
        verdict = "CORRECT"
        feedback = feedback.replace("CORRECT. ", "").strip()
    elif "PARTIAL" in llm_judgement.upper():
        verdict = "PARTIAL"
        feedback = feedback.replace("PARTIAL. ", "").strip()
    
    return {
        "verdict": verdict,
        "feedback": feedback
    }