from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
from sqlmodel import SQLModel
from database import engine
from fastapi.middleware.cors import CORSMiddleware
from routes import cases, llm, media, templates, categories, auth
from config import UPLOAD_DIR


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    SQLModel.metadata.create_all(engine)
    yield
    # Shutdown

app = FastAPI(lifespan=lifespan)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://dstt-front.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ROUTES
app.include_router(cases.router)
app.include_router(llm.router)
app.include_router(media.router)
app.include_router(templates.router)
app.include_router(categories.router)
app.include_router(auth.router)
