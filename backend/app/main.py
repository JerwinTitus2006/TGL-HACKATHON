from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
import requests
from sqlalchemy import text
from backend.app.database import SessionLocal, engine, Base, is_sqlite
from backend.app.routers import auth, documents, profiles, talent_check, skill_match

# Create database tables automatically if not present
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="Production-grade skills extraction, candidate profiling, and matching engine.",
    version="1.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Standardized Error Envelope Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Determine status code
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    message = str(exc)
    details = None
    
    if hasattr(exc, "status_code"):
        status_code = exc.status_code
    if hasattr(exc, "detail"):
        if isinstance(exc.detail, dict):
            message = exc.detail.get("message", message)
            details = exc.detail.get("details", None)
        else:
            message = exc.detail

    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": status_code,
                "message": message,
                "details": details
            }
        }
    )

# Include Routers
app.include_router(auth.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(profiles.router, prefix="/api")
app.include_router(talent_check.router, prefix="/api")
app.include_router(skill_match.router, prefix="/api")

@app.get("/health", tags=["health"])
def health_check():
    # 1. Verify DB
    db_status = "connected"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception as e:
        db_status = f"error: {str(e)}"
        
    # 2. Verify Ollama & Models
    ollama_status = "connected"
    available_models = []
    try:
        response = requests.get(f"{settings.OLLAMA_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            tags = response.json()
            available_models = [m["name"] for m in tags.get("models", [])]
            
            missing = []
            # Check for extraction model
            ext_found = False
            for m in available_models:
                if settings.OLLAMA_MODEL in m or m in settings.OLLAMA_MODEL:
                    ext_found = True
                    break
            if not ext_found:
                missing.append(settings.OLLAMA_MODEL)
                
            # Check for embedding model
            emb_found = False
            for m in available_models:
                if settings.OLLAMA_EMBED_MODEL in m or m in settings.OLLAMA_EMBED_MODEL:
                    emb_found = True
                    break
            if not emb_found:
                missing.append(settings.OLLAMA_EMBED_MODEL)
                
            if missing:
                ollama_status = f"warning: missing model(s) {', '.join(missing)}"
        else:
            ollama_status = f"unhealthy: status code {response.status_code}"
    except Exception as e:
        ollama_status = f"disconnected: {str(e)}"
        
    overall_status = "healthy"
    if "error" in db_status or "disconnected" in ollama_status:
        overall_status = "unhealthy"
        
    return {
        "status": overall_status,
        "database": db_status,
        "ollama": ollama_status,
        "ollama_models": available_models
    }
