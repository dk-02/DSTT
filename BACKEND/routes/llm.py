# import os
# from fastapi import APIRouter
# import json
# import requests
# from fastapi import Depends, HTTPException
# from sqlmodel import Session, select
# from database import engine
# from models import Case, DiagnosticUnit, ChatRequest, DiagnosisRequest, Media


# OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# router = APIRouter(prefix="/llm", tags=["LLM"])

# def get_session():
#     with Session(engine) as session:
#         yield session

# @router.post("/ask")
# async def ask_llm(request: ChatRequest, session: Session = Depends(get_session)):
#     # Fetch all DUs for current case
#     statement = select(DiagnosticUnit).where(DiagnosticUnit.case_id == request.case_id)
#     dus = session.exec(statement).all()
    
#     # Prepare DU list for LLM
#     du_list = [{"id": d.id, "label": d.label, "name": d.name} for d in dus]

#     # print(request.message)
#     # print(ddu_list)
    
#     # OpenRouter request 
#     system_prompt = f"""
#     You are the assistant in this diagnostics case. The student writes what he wants to check. You need to check for similarities of student's request with given label and name of a diagnostic unit. Select the ID of the most appropriate (most similar to the request) DU from the list: {du_list}. Answer with the ID only. If nothing matches, answer 'NONE'.
#     """

#     combined_content = f"INSTRUCTION: {system_prompt}\n\nUSER QUESTION: {request.message}"

#     response = requests.post(
#         url="https://openrouter.ai/api/v1/chat/completions",
#         headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
#         data=json.dumps({
#             "model": "google/gemma-3n-e2b-it:free",
#             "messages": [
#                 {"role": "user", "content": combined_content}
#             ]
#         })
#     )    

#     du_id = response.json()['choices'][0]['message']['content'].strip()

#     # Fetch requested DU
#     if du_id != "NONE":
#         selected_du = session.get(DiagnosticUnit, du_id)
        
#         if selected_du:
#             media_statement = select(Media).where(Media.du_id == selected_du.id)
#             du_media = session.exec(media_statement).all()

#             media_list = [{"file_path": m.file_path, "file_type": m.file_type, "title": m.title} for m in du_media]

#             return {
#                 "du_id": selected_du.id, 
#                 "result": selected_du.result_text,
#                 "level": selected_du.level,
#                 "media": media_list
#             }
    
#     return {"du_id": None, "result": "Unfortunately, i don't understand your request."}


# @router.post("/verifyDiagnosis")
# def verify_diagnosis(request: DiagnosisRequest, session: Session = Depends(get_session)):
#     case = session.get(Case, request.case_id)

#     if not case:
#         raise HTTPException(status_code=404, detail="Case not found")
    
#     system_prompt = f"""
#     You are an expert instructor. 
#     Correct diagnosis: {case.correct_diagnosis}
#     Student's answer: {request.student_diagnosis}
    
#     Compare them. If the student correctly identified the main issues, respond with 'CORRECT.' and a short feedback paragraph. 
#     If they are wrong or missed key parts, respond with 'INCORRECT.' and a short explanation why. 
#     If they are partially correct, respond with 'PARTIAL.' and a short explanation why.
#     """

#     response = requests.post(
#         url="https://openrouter.ai/api/v1/chat/completions",
#         headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
#         data=json.dumps({
#             "model": "google/gemma-3n-e2b-it:free",
#             "messages": [{"role": "user", "content": system_prompt}]
#         })
#     )

#     llm_judgement = response.json()['choices'][0]['message']['content']

#     feedback = llm_judgement

#     print(feedback)

#     verdict = ""

#     if "INCORRECT" in llm_judgement.upper():
#         verdict = "INCORRECT"
#         feedback = feedback.replace("INCORRECT.", "").strip()
#     elif "CORRECT" in llm_judgement.upper():
#         verdict = "CORRECT"
#         feedback = feedback.replace("CORRECT.", "").strip()
#     elif "PARTIAL" in llm_judgement.upper():
#         verdict = "PARTIAL"
#         feedback = feedback.replace("PARTIAL.", "").strip()
    
#     return {
#         "verdict": verdict,
#         "feedback": feedback
#     }