from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from models import LLMConfig, LLMProvider, ProviderCreate
from database import engine

router = APIRouter(prefix="/llm", tags=["LLM"])

def get_session():
    with Session(engine) as session:
        yield session

class LLMConfigUpdate(BaseModel):
    provider_name: str
    model_name: str
    api_key: str
    base_url: str = ""


@router.get("/llm-config")
async def read_llm_config(session: Session = Depends(get_session)):
    statement = select(LLMConfig).where(LLMConfig.is_active == True)
    config = session.exec(statement).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Aktivna konfiguracija nije pronađena.")
    return config


@router.post("/llm-config")
async def update_llm_config(data: LLMConfigUpdate, session: Session = Depends(get_session)):
    statement = select(LLMConfig).where(LLMConfig.is_active == True)
    config = session.exec(statement).first()
    
    if config:
        config.provider_name = data.provider_name
        config.model_name = data.model_name
        config.api_key = data.api_key
        config.base_url = data.base_url
        session.add(config)
    else:
        new_config = LLMConfig(
            provider_name=data.provider_name,
            model_name=data.model_name,
            api_key=data.api_key,
            base_url=data.base_url,
            is_active=True
        )
        session.add(new_config)
        
    session.commit()
    return {"status": "success", "message": "Konfiguracija ažurirana"}


@router.get("/llm-providers")
async def get_providers(session: Session = Depends(get_session)):
    """ Dohvaća sve dostupne providere iz baze. """

    statement = select(LLMProvider).order_by(LLMProvider.name)
    providers = session.exec(statement).all()
    return providers

@router.post("/llm-providers")
async def add_provider(data: ProviderCreate, session: Session = Depends(get_session)):
    """ Dodaje novog providera u bazu. """

    existing = session.exec(select(LLMProvider).where(LLMProvider.prefix == data.prefix)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Provider s ovim prefiksom već postoji!")
        
    new_provider = LLMProvider(name=data.name, prefix=data.prefix)
    session.add(new_provider)
    session.commit()
    session.refresh(new_provider)
    
    return {"status": "success", "message": "Novi provider uspješno dodan!", "provider": new_provider}