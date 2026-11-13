import os
import json
import tempfile
from pathlib import Path
from threading import Lock

import torch
import whisperx
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

APP_DIR = Path("/tmp/ahad_transcriber")
APP_DIR.mkdir(parents=True, exist_ok=True)

MODEL_NAME = os.getenv("WHISPER_MODEL", "base")
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "25"))
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "*")

app = FastAPI(title="AHAD Audio Transcriber API")

origins = ["*"] if ALLOWED_ORIGIN == "*" else [x.strip() for x in ALLOWED_ORIGIN.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

model = None
model_lock = Lock()

def get_model():
    global model
    with model_lock:
        if model is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
            compute_type = "float16" if device == "cuda" else "int8"
            model = whisperx.load_model(
                MODEL_NAME,
                device,
                compute_type=compute_type,
                language=None
            )
    return model

@app.get("/")
def home():
    return {
        "name": "AHAD Audio Transcriber API",
        "status": "online",
        "model": MODEL_NAME,
        "max_upload_mb": MAX_UPLOAD_MB
    }

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: str = Form("")
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected.")

    suffix = Path(file.filename).suffix or ".audio"
    temp_path = None
    try:
        data = await file.read()
        if not data:
            raise HTTPException(status_code=400, detail="The uploaded file is empty.")
        if len(data) > MAX_UPLOAD_MB * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {MAX_UPLOAD_MB} MB."
            )

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=APP_DIR) as tmp:
            tmp.write(data)
            temp_path = tmp.name

        audio = whisperx.load_audio(temp_path)
        selected_language = language.strip() or None

        result = get_model().transcribe(
            audio,
            batch_size=2,
            language=selected_language
        )

        segments = []
        for item in result.get("segments", []):
            text = (item.get("text") or "").strip()
            if not text:
                continue
            segments.append({
                "start": round(float(item.get("start", 0)), 2),
                "end": round(float(item.get("end", 0)), 2),
                "text": text
            })

        return JSONResponse({
            "language": result.get("language", selected_language or "unknown"),
            "model": MODEL_NAME,
            "timestamp_type": "whisperx_segment",
            "segments": segments
        })
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(exc)[:500]}")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
