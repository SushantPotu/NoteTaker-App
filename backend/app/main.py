from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.image_proc import process_drawing_pipeline, process_photo_pipeline
from app.ocr_engine import ocr_engine
from app.database import init_db, save_scan_result

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    init_db()

@app.post("/scan")
async def scan_note(file: UploadFile = File(...)):
    logger.info(f"Received file: {file.filename}")
    
    try:
        raw_bytes = await file.read()
        
        if file.filename.endswith('png') or "drawing" in file.filename:
            logger.info("Digital drawing mode (Low Threshold 0.3)")
            image = process_drawing_pipeline(raw_bytes)
            
            text = ocr_engine.extract_text(image, min_confidence=0.3)
            
        else:
            logger.info("Camera Photo mode (High Threshold 0.6)")
            image = process_photo_pipeline(raw_bytes)
            
            text = ocr_engine.extract_text(image, min_confidence=0.6)
            
        logger.info(f"Extracted: {text}")
        
        save_scan_result(file.filename, text)

        return {
            "success": True,
            "filename": file.filename,
            "extracted_text": text
        }

    except Exception as e:
        logger.error(f"API Error: {e}")
        return {"error": str(e)}