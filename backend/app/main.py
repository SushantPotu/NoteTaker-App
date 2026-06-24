from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import logging

from app.image_proc import process_drawing_pipeline, process_photo_pipeline
from app.ocr_engine import ocr_engine
from app.database import (
    init_db, save_scan_result,
    create_notebook, get_all_notebooks, get_notebook,
    rename_notebook, update_notebook_color, delete_notebook,
    create_page, get_page, update_page, delete_page,
)

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


# ---------- Pydantic Models ----------

class NotebookCreate(BaseModel):
    name: str
    color: str = "#673AB7"

class NotebookUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

class PageUpdate(BaseModel):
    image_data: Optional[str] = None
    extracted_text: Optional[str] = None


# ---------- Startup ----------

@app.on_event("startup")
async def startup_event():
    init_db()


# ---------- Scan (Original + Enhanced) ----------

@app.post("/scan")
async def scan_note(
    file: UploadFile = File(...),
    page_id: Optional[int] = Query(None, description="Page ID to auto-save extracted text to")
):
    logger.info(f"Received file: {file.filename}")

    try:
        raw_bytes = await file.read()

        if file.filename.endswith('.txt'):
            logger.info("Importing text file directly")
            text = raw_bytes.decode('utf-8', errors='ignore')
        elif file.filename.endswith('.pdf'):
            logger.info("Importing PDF document")
            import pypdfium2 as pdfium
            import cv2
            import numpy as np
            
            pdf = pdfium.PdfDocument(raw_bytes)
            text_parts = []
            
            for i in range(len(pdf)):
                page = pdf[i]
                textpage = page.get_textpage()
                extracted = textpage.get_text_range()
                
                if extracted and extracted.strip():
                    text_parts.append(extracted.strip())
                else:
                    logger.info(f"Page {i+1} has no digital text. Running OCR...")
                    bitmap = page.render(scale=2)
                    pil_img = bitmap.to_pil()
                    cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
                    page_text = ocr_engine.extract_text(cv_img, min_confidence=0.6)
                    if page_text:
                        text_parts.append(page_text)
            
            text = "\n\n".join(text_parts)
        elif file.filename.endswith('png') or "drawing" in file.filename:
            logger.info("Digital drawing mode (Low Threshold 0.3)")
            image = process_drawing_pipeline(raw_bytes)
            text = ocr_engine.extract_text(image, min_confidence=0.3)
        else:
            logger.info("Camera Photo mode (High Threshold 0.6)")
            image = process_photo_pipeline(raw_bytes)
            text = ocr_engine.extract_text(image, min_confidence=0.6)

        logger.info(f"Extracted: {text}")

        # Legacy: save to scan_history
        save_scan_result(file.filename, text)

        # New: if page_id provided, also save to that page
        if page_id is not None:
            update_page(page_id, extracted_text=text)
            logger.info(f"Auto-saved text to page #{page_id}")

        return {
            "success": True,
            "filename": file.filename,
            "extracted_text": text
        }

    except Exception as e:
        logger.error(f"API Error: {e}")
        return {"error": str(e)}


# ---------- Notebooks Endpoints ----------

@app.get("/notebooks")
async def list_notebooks():
    notebooks = get_all_notebooks()
    return {"notebooks": notebooks}


@app.post("/notebooks")
async def create_notebook_endpoint(body: NotebookCreate):
    notebook_id = create_notebook(body.name, body.color)
    return {"id": notebook_id, "name": body.name, "color": body.color}


@app.get("/notebooks/{notebook_id}")
async def get_notebook_endpoint(notebook_id: int):
    notebook = get_notebook(notebook_id)
    if not notebook:
        return {"error": "Notebook not found"}, 404
    return notebook


@app.put("/notebooks/{notebook_id}")
async def update_notebook_endpoint(notebook_id: int, body: NotebookUpdate):
    updated = False
    if body.name is not None:
        updated = rename_notebook(notebook_id, body.name) or updated
    if body.color is not None:
        updated = update_notebook_color(notebook_id, body.color) or updated
    if not updated:
        return {"error": "Notebook not found or no changes"}
    return {"success": True}


@app.delete("/notebooks/{notebook_id}")
async def delete_notebook_endpoint(notebook_id: int):
    deleted = delete_notebook(notebook_id)
    if not deleted:
        return {"error": "Notebook not found"}
    return {"success": True}


# ---------- Pages Endpoints ----------

@app.post("/notebooks/{notebook_id}/pages")
async def create_page_endpoint(notebook_id: int):
    result = create_page(notebook_id)
    return result


@app.get("/pages/{page_id}")
async def get_page_endpoint(page_id: int):
    page = get_page(page_id)
    if not page:
        return {"error": "Page not found"}
    return page


@app.put("/pages/{page_id}")
async def update_page_endpoint(page_id: int, body: PageUpdate):
    updated = update_page(page_id, body.image_data, body.extracted_text)
    if not updated:
        return {"error": "Page not found or no changes"}
    return {"success": True}


@app.delete("/pages/{page_id}")
async def delete_page_endpoint(page_id: int):
    deleted = delete_page(page_id)
    if not deleted:
        return {"error": "Page not found"}
    return {"success": True}